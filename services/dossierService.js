// ============================================
// SERVICE DE GESTION DES DOSSIERS
// Logique métier pour les dossiers multi-fichiers
// ============================================

const { ObjectId } = require('mongodb');
const { getCollections, getSecurityLogger } = require('../config/database');
const { generateDossierId, generateDocumentIdInDossier, extractDossierSuffix } = require('../utils/idGenerator');
const fileStorage = require('./fileStorageService');

// Limites (modifiées pour permettre plus de documents)
const LIMITS = {
    MAX_FILES_PER_DOSSIER: 9999,          // Pratiquement illimité
    MAX_FILE_SIZE: 50 * 1024 * 1024,       // 50 MB par fichier
    MAX_DOSSIER_SIZE: 5 * 1024 * 1024 * 1024 // 5 GB par dossier
};

/**
 * Créer un nouveau dossier avec un premier fichier
 */
async function createDossier(dossierData, userId) {
    const collections = getCollections();

    // Vérifier l'utilisateur
    const user = await collections.users.findOne({ username: userId });
    if (!user) {
        throw new Error('Utilisateur non trouvé');
    }

    // Récupérer le rôle et le département
    const role = await collections.roles.findOne({ _id: user.idRole });
    const departement = user.idDepartement
        ? await collections.departements.findOne({ _id: user.idDepartement })
        : null;

    // Vérifier que l'utilisateur peut créer des dossiers (tous les niveaux 1, 2, 3)
    if (!role || ![1, 2, 3].includes(role.niveau)) {
        throw new Error('Vous devez avoir un rôle valide pour créer des dossiers');
    }

    // Déterminer archivage (service ou département)
    const idArchivage = dossierData.departementArchivage || user.idDepartement;

    let serviceArchivage = null;
    let idServiceArchivage = null;
    let deptArchivage = null;
    let idDeptArchivage = null;

    if (idArchivage) {
        // Chercher dans les services
        try {
            const service = await collections.services.findOne({ _id: new ObjectId(idArchivage) });
            if (service) {
                serviceArchivage = service.nom;
                idServiceArchivage = idArchivage;
                // Récupérer le département du service
                const serviceDept = await collections.departements.findOne({ _id: service.idDepartement });
                if (serviceDept) {
                    deptArchivage = serviceDept.nom;
                    idDeptArchivage = service.idDepartement.toString();
                }
            }
        } catch (error) {
            console.error('Erreur recherche service:', error.message);
        }

        // Si pas trouvé en service, chercher en département
        if (!serviceArchivage && !deptArchivage) {
            try {
                const dept = await collections.departements.findOne({ _id: new ObjectId(idArchivage) });
                if (dept) {
                    deptArchivage = dept.nom;
                    idDeptArchivage = idArchivage;
                }
            } catch (error) {
                console.error('Erreur recherche département:', error.message);
            }
        }
    }

    // Vérifier que le titre du dossier est unique dans le département
    const existingDossier = await collections.dossiers.findOne({
        titre: dossierData.titre.trim(),
        idDepartement: user.idDepartement,
        deleted: { $ne: true }
    });

    if (existingDossier) {
        throw new Error(`Un dossier avec le nom "${dossierData.titre}" existe déjà dans votre département. Veuillez choisir un nom différent.`);
    }

    // Générer ID unique pour le dossier
    const idDossier = await generateDossierId(collections.dossiers);

    // Préparer les infos utilisateur pour la traçabilité des documents
    const userInfo = {
        nomComplet: user.nom,
        departement: departement ? departement.nom : null
    };

    // Traiter le premier document (OBLIGATOIRE)
    let documents = [];
    let tailleTotale = 0;

    if (dossierData.document && dossierData.document.contenu) {
        const document = await processDocument(dossierData.document, userId, idDossier, userInfo);
        documents.push(document);
        tailleTotale = document.taille;
    } else if (dossierData.fichier && dossierData.fichier.contenu) {
        // Rétrocompatibilité avec l'ancien format "fichier"
        const document = await processDocument(dossierData.fichier, userId, idDossier, userInfo);
        documents.push(document);
        tailleTotale = document.taille;
    } else {
        throw new Error('Un dossier doit contenir au moins un document');
    }

    // Créer le dossier
    const dossier = {
        idDossier,
        titre: dossierData.titre,
        categorie: dossierData.categorie,
        description: dossierData.description || '',
        tags: dossierData.tags || [],
        date: dossierData.date || new Date().toISOString().split('T')[0],

        // Documents (anciennement fichiers)
        documents,
        nombreDocuments: documents.length,
        nombreFichiers: documents.length, // Alias pour compatibilité frontend
        tailleTotale,

        // Localisation
        idDepartement: user.idDepartement,
        idService: idServiceArchivage ? new ObjectId(idServiceArchivage) : null,
        serviceArchivage,
        departementArchivage: deptArchivage,
        idDepartementArchivage: idDeptArchivage,

        // Créateur
        idUtilisateur: userId,
        archivePar: {
            utilisateur: userId,
            nomComplet: user.nom,
            email: user.email,
            niveau: role ? role.niveau : null,
            departement: departement ? departement.nom : null,
            dateArchivage: new Date()
        },

        // États du dossier
        locked: dossierData.locked || false,
        lockedBy: null,
        lockedAt: null,
        deleted: false,
        deletedAt: null,
        deletedBy: null,
        deletionMotif: null,
        expiresAt: null,

        // Partage du dossier entier (hérité par tous les documents)
        sharedWith: [],

        // Historiques du dossier
        historiqueConsultations: [],
        historiquePartages: [],

        // Timestamps
        createdAt: new Date(),
        updatedAt: new Date()
    };

    // Insérer dans MongoDB
    const result = await collections.dossiers.insertOne(dossier, { writeConcern: { w: 'majority' } });

    // Enregistrer dans les logs d'audit
    await collections.auditLogs.insertOne({
        timestamp: new Date(),
        user: userId,
        userName: user.nom || userId,
        action: 'DOSSIER_CREATED',
        details: {
            dossierId: idDossier,
            titre: dossierData.titre,
            categorie: dossierData.categorie,
            nombreDocuments: documents.length,
            tailleTotale,
            departement: deptArchivage,
            service: serviceArchivage
        }
    });

    console.log(`✅ Dossier créé: ${idDossier} par ${userId} avec ${documents.length} document(s)`);

    return {
        success: true,
        dossierId: idDossier,
        _id: result.insertedId
    };
}

/**
 * Traiter et sauvegarder un document (fichier) dans un dossier
 * @param {Object} documentData - Données du document
 * @param {string} userId - Utilisateur qui ajoute le document
 * @param {string} dossierId - ID du dossier parent (pour la liaison)
 * @param {Object} userInfo - Informations utilisateur (nom, département, etc.)
 */
async function processDocument(documentData, userId, dossierId, userInfo = {}) {
    // Valider la taille
    if (documentData.taille > LIMITS.MAX_FILE_SIZE) {
        throw new Error(`Le fichier dépasse la taille maximale autorisée (${LIMITS.MAX_FILE_SIZE / 1024 / 1024} MB)`);
    }

    // Sauvegarder le fichier (MongoDB en prod, disque en dev)
    const saved = await fileStorage.saveFileContent(documentData.contenu, documentData.nomFichier);

    // Générer l'ID document avec liaison au dossier
    const idDocument = generateDocumentIdInDossier(dossierId);

    return {
        idDocument,  // Format: DOC-YYYYMMDD-HHMMSSTTT-RRRR.DXXXX
        nom: documentData.nomFichier.replace(/[^a-zA-Z0-9._-]/g, '_'),
        nomOriginal: documentData.nomFichier,
        path: saved.filePath,
        taille: saved.fileSize,
        type: documentData.type || 'application/octet-stream',

        // Traçabilité du document
        archivePar: {
            utilisateur: userId,
            nomComplet: userInfo.nomComplet || userId,
            departement: userInfo.departement || null,
            dateArchivage: new Date()
        },

        // États du document
        locked: false,
        lockedBy: null,
        lockedAt: null,

        // Partage spécifique au document
        sharedWith: [],

        // Historiques du document (traçabilité complète)
        historiqueTelechargements: [],
        historiqueConsultations: [],
        historiquePartages: [],       // Qui a partagé avec qui et quand
        historiqueVerrouillages: [],  // Qui a verrouillé/déverrouillé

        createdAt: new Date(),
        updatedAt: new Date()
    };
}

/**
 * Récupérer un dossier spécifique avec ses fichiers
 */
async function getDossier(userId, dossierId) {
    const collections = getCollections();
    const startTime = Date.now();

    const user = await collections.users.findOne({ username: userId });
    if (!user) throw new Error('Utilisateur non trouvé');

    const userRole = await collections.roles.findOne({ _id: user.idRole });
    if (!userRole) throw new Error('Rôle non trouvé');

    // Convertir dossierId en ObjectId si nécessaire
    let dossierObjectId;
    try {
        dossierObjectId = new ObjectId(dossierId);
    } catch (e) {
        dossierObjectId = null;
    }

    // Récupérer le dossier
    const dossier = await collections.dossiers.findOne({
        $or: [
            { _id: dossierObjectId },
            { idDossier: dossierId }
        ],
        deleted: false
    });

    if (!dossier) {
        throw new Error('Dossier non trouvé ou accès refusé');
    }

    // Vérifier l'accès selon le niveau
    const hasAccess = await checkDossierAccess(user, userRole, dossier, collections);
    if (!hasAccess) {
        throw new Error('Dossier non trouvé ou accès refusé');
    }

    // Vérification verrouillage pour niveaux inférieurs
    if (dossier.locked && userRole.niveau > 1) {
        const error = new Error('Ce dossier est verrouillé par un administrateur');
        error.locked = true;
        error.lockedBy = dossier.lockedBy || 'un administrateur';
        throw error;
    }

    // Enrichir les historiques avec les infos utilisateurs
    await enrichDossierHistoriques(dossier, collections);

    // Enregistrer la consultation
    await recordConsultation(dossier._id, userId, collections);

    // Récupérer les 20 dernières actions sur ce dossier depuis les logs d'audit
    try {
        const recentActions = await collections.auditLogs.find({
            $or: [
                { 'details.dossierId': dossier.idDossier },
                { 'details.dossierId': dossierId }
            ]
        })
        .sort({ timestamp: -1 })
        .limit(20)
        .toArray();

        dossier.dernieresActions = recentActions.map(action => ({
            action: action.action,
            utilisateur: action.userName || action.user,
            date: action.timestamp,
            details: action.details
        }));
    } catch (e) {
        console.error('Erreur récupération actions:', e.message);
        dossier.dernieresActions = [];
    }

    console.log(`⏱️ getDossier: ${Date.now() - startTime}ms`);
    return dossier;
}

/**
 * Enrichir les historiques du dossier avec les infos utilisateurs
 */
async function enrichDossierHistoriques(dossier, collections) {
    const allUsernames = new Set();

    if (dossier.historiqueConsultations) {
        dossier.historiqueConsultations.forEach(c => allUsernames.add(c.utilisateur));
    }
    if (dossier.historiqueTelechargements) {
        dossier.historiqueTelechargements.forEach(t => allUsernames.add(t.utilisateur));
    }

    // Récupérer l'historique des partages
    const shareHistory = await collections.shareHistory.find({
        dossierId: dossier.idDossier
    }).toArray();

    if (shareHistory) {
        shareHistory.forEach(p => {
            allUsernames.add(p.sharedBy);
            allUsernames.add(p.sharedWith);
        });
    }

    // Une seule requête pour tous les utilisateurs
    const usersArray = await collections.users.find({
        username: { $in: Array.from(allUsernames) }
    }).toArray();
    const usersMap = new Map(usersArray.map(u => [u.username, u]));

    // Récupérer les rôles
    const roleIds = [...new Set(usersArray.map(u => u.idRole).filter(Boolean))];
    const rolesArray = await collections.roles.find({
        _id: { $in: roleIds }
    }).toArray();
    const rolesMap = new Map(rolesArray.map(r => [r._id.toString(), r]));

    // Récupérer les départements
    const deptIds = [...new Set(usersArray.map(u => u.idDepartement).filter(Boolean))];
    const deptsArray = await collections.departements.find({
        _id: { $in: deptIds }
    }).toArray();
    const deptsMap = new Map(deptsArray.map(d => [d._id.toString(), d]));

    const enrichUser = (username) => {
        const u = usersMap.get(username);
        if (!u) return { nomComplet: username, role: 'Non défini', niveau: null, departement: 'Aucun' };
        const role = u.idRole ? rolesMap.get(u.idRole.toString()) : null;
        const dept = u.idDepartement ? deptsMap.get(u.idDepartement.toString()) : null;
        return {
            nomComplet: u.nom || username,
            role: role?.libelle || 'Non défini',
            niveau: role?.niveau,
            departement: dept?.nom || 'Aucun'
        };
    };

    // Enrichir historiqueConsultations
    if (dossier.historiqueConsultations && dossier.historiqueConsultations.length > 0) {
        dossier.historiqueConsultations = dossier.historiqueConsultations.map(consultation => ({
            ...consultation,
            ...enrichUser(consultation.utilisateur)
        }));
    }

    // Enrichir historiqueTelechargements
    if (dossier.historiqueTelechargements && dossier.historiqueTelechargements.length > 0) {
        dossier.historiqueTelechargements = dossier.historiqueTelechargements.map(telechargement => ({
            ...telechargement,
            ...enrichUser(telechargement.utilisateur)
        }));
    }

    // Enrichir historique des partages
    if (shareHistory && shareHistory.length > 0) {
        dossier.historiquePartages = shareHistory.map(partage => {
            const byInfo = enrichUser(partage.sharedBy);
            const withInfo = enrichUser(partage.sharedWith);
            return {
                sharedBy: partage.sharedBy,
                sharedByName: byInfo.nomComplet,
                sharedWith: partage.sharedWith,
                sharedWithName: withInfo.nomComplet,
                sharedAt: partage.sharedAt || partage.date
            };
        });
    } else {
        dossier.historiquePartages = [];
    }

    // Enrichir les historiques des documents dans le dossier
    if (dossier.documents && dossier.documents.length > 0) {
        dossier.documents = dossier.documents.map(doc => {
            // Enrichir historiqueTelechargements du document
            if (doc.historiqueTelechargements && doc.historiqueTelechargements.length > 0) {
                doc.historiqueTelechargements = doc.historiqueTelechargements.map(t => ({
                    ...t,
                    ...enrichUser(t.utilisateur)
                }));
            }
            // Enrichir historiqueConsultations du document
            if (doc.historiqueConsultations && doc.historiqueConsultations.length > 0) {
                doc.historiqueConsultations = doc.historiqueConsultations.map(c => ({
                    ...c,
                    ...enrichUser(c.utilisateur)
                }));
            }
            return doc;
        });
    }
}

/**
 * Enregistrer une consultation
 */
async function recordConsultation(dossierId, userId, collections) {
    await collections.dossiers.updateOne(
        { _id: dossierId },
        {
            $push: {
                historiqueConsultations: {
                    $each: [{
                        utilisateur: userId,
                        date: new Date()
                    }],
                    $slice: -50 // Garder les 50 dernières
                }
            }
        }
    );
}

/**
 * Vérifier l'accès à un dossier
 */
async function checkDossierAccess(user, userRole, dossier, collections) {
    const constants = require('../utils/constants');

    // Super Admin voit tout
    if (userRole.niveau == constants.PERMISSIONS.SUPER_ADMIN) {
        return true;
    }

    const userDeptId = user.idDepartement?.toString();
    const dossierDeptId = dossier.idDepartement?.toString();

    // Niveau 1: Dossiers de son département et services
    if (userRole.niveau == constants.PERMISSIONS.PRIMAIRE) {
        if (dossierDeptId === userDeptId) return true;
        // Vérifier si le dossier est dans un service du département
        if (dossier.idService) {
            const service = await collections.services.findOne({ _id: dossier.idService });
            if (service && service.idDepartement?.toString() === userDeptId) return true;
        }
        return false;
    }

    // Niveau 2: Dossiers de son département + partagés avec lui
    if (userRole.niveau == constants.PERMISSIONS.SECONDAIRE) {
        if (dossierDeptId === userDeptId) return true;
        if (dossier.sharedWith && dossier.sharedWith.includes(user.username)) return true;
        return false;
    }

    // Niveau 3: Ses dossiers + niveau 3 du département + partagés
    if (userRole.niveau == constants.PERMISSIONS.TERTIAIRE) {
        if (dossier.sharedWith && dossier.sharedWith.includes(user.username)) return true;
        if (dossierDeptId === userDeptId) {
            const creator = await collections.users.findOne({ username: dossier.idUtilisateur });
            if (creator) {
                const creatorRole = await collections.roles.findOne({ _id: creator.idRole });
                if (creatorRole && creatorRole.niveau == constants.PERMISSIONS.TERTIAIRE) return true;
            }
        }
        return false;
    }

    return false;
}

/**
 * Ajouter un document à un dossier
 */
async function addDocument(userId, dossierId, documentData) {
    const collections = getCollections();

    // Vérifier permissions (tous les niveaux peuvent ajouter des documents)
    const user = await collections.users.findOne({ username: userId });
    const userRole = await collections.roles.findOne({ _id: user.idRole });

    if (!userRole || ![1, 2, 3].includes(userRole.niveau)) {
        throw new Error('Vous devez avoir un rôle valide pour ajouter des documents');
    }

    // Récupérer le dossier
    const dossier = await getDossier(userId, dossierId);

    // Vérifier limite de documents
    const nombreActuel = dossier.nombreDocuments || dossier.nombreFichiers || 0;
    if (nombreActuel >= LIMITS.MAX_FILES_PER_DOSSIER) {
        throw new Error(`Limite atteinte: maximum ${LIMITS.MAX_FILES_PER_DOSSIER} documents par dossier`);
    }

    // Récupérer le département pour la traçabilité
    const departement = user.idDepartement
        ? await collections.departements.findOne({ _id: user.idDepartement })
        : null;

    const userInfo = {
        nomComplet: user.nom,
        departement: departement ? departement.nom : null
    };

    // Traiter le nouveau document
    const document = await processDocument(documentData, userId, dossier.idDossier, userInfo);

    // Vérifier limite de taille totale
    const nouvelleTailleTotale = dossier.tailleTotale + document.taille;
    if (nouvelleTailleTotale > LIMITS.MAX_DOSSIER_SIZE) {
        // Supprimer le fichier déjà sauvegardé
        await fileStorage.deleteFile(document.path);
        throw new Error(`Limite atteinte: taille maximale du dossier ${LIMITS.MAX_DOSSIER_SIZE / 1024 / 1024} MB`);
    }

    // Ajouter le document au dossier
    await collections.dossiers.updateOne(
        { _id: dossier._id },
        {
            $push: { documents: document },
            $inc: { nombreDocuments: 1, nombreFichiers: 1 },
            $set: {
                tailleTotale: nouvelleTailleTotale,
                updatedAt: new Date()
            }
        },
        { writeConcern: { w: 'majority' } }
    );

    // Enregistrer dans les logs d'audit
    await collections.auditLogs.insertOne({
        timestamp: new Date(),
        user: userId,
        userName: user.nom || userId,
        action: 'DOCUMENT_ADDED',
        details: {
            dossierId: dossier.idDossier,
            dossierTitre: dossier.titre,
            documentId: document.idDocument,
            documentNom: document.nomOriginal,
            documentTaille: document.taille
        }
    });

    console.log(`📎 Document ajouté au dossier ${dossierId}: ${document.nomOriginal} (ID: ${document.idDocument})`);

    return {
        success: true,
        document
    };
}

/**
 * Ajouter un fichier à un dossier (alias pour rétrocompatibilité)
 * @deprecated Utiliser addDocument
 */
async function addFichier(userId, dossierId, fichierData) {
    return addDocument(userId, dossierId, fichierData);
}

/**
 * Retirer un document d'un dossier
 */
async function removeDocument(userId, dossierId, documentId) {
    const collections = getCollections();

    // Vérifier permissions (niveau 1 uniquement)
    const user = await collections.users.findOne({ username: userId });
    const userRole = await collections.roles.findOne({ _id: user.idRole });

    if (!userRole || userRole.niveau !== 1) {
        throw new Error('Seuls les utilisateurs niveau 1 peuvent supprimer des documents');
    }

    // Récupérer le dossier
    const dossier = await getDossier(userId, dossierId);

    // Chercher dans les documents (nouveau format) ou fichiers (ancien format)
    const documentsArray = dossier.documents || dossier.fichiers || [];
    const document = documentsArray.find(d => d.idDocument === documentId || d.id === documentId);

    if (!document) {
        throw new Error('Document non trouvé dans le dossier');
    }

    // Vérifier qu'on ne supprime pas le dernier document
    // IMPORTANT: Utiliser la longueur réelle du tableau, pas les compteurs qui peuvent être désynchronisés
    if (documentsArray.length <= 1) {
        throw new Error('Impossible de supprimer le dernier document. Supprimez le dossier entier.');
    }

    // Supprimer le fichier du stockage
    await fileStorage.deleteFile(document.path);

    const now = new Date();

    // Mettre à jour le dossier (supporte les deux formats)
    const updateOp = {
        $inc: { nombreDocuments: -1, nombreFichiers: -1 },
        $set: {
            tailleTotale: dossier.tailleTotale - document.taille,
            updatedAt: now
        }
    };

    // Supprimer du bon tableau
    if (dossier.documents) {
        updateOp.$pull = { documents: { idDocument: documentId } };
    } else {
        updateOp.$pull = { fichiers: { id: documentId } };
    }

    await collections.dossiers.updateOne(
        { _id: dossier._id },
        updateOp,
        { writeConcern: { w: 'majority' } }
    );

    // Enregistrer dans les logs d'audit (traçabilité)
    await collections.auditLogs.insertOne({
        timestamp: now,
        user: userId,
        userName: user.nom || userId,
        action: 'DOCUMENT_DELETED',
        details: {
            dossierId: dossier.idDossier,
            dossierTitre: dossier.titre,
            documentId: document.idDocument || document.id,
            documentNom: document.nomOriginal,
            documentTaille: document.taille,
            documentType: document.type
        }
    });

    console.log(`🗑️ Document retiré du dossier ${dossierId}: ${document.nomOriginal}`);

    return { success: true };
}

/**
 * Retirer un fichier d'un dossier (alias pour rétrocompatibilité)
 * @deprecated Utiliser removeDocument
 */
async function removeFichier(userId, dossierId, fichierId) {
    return removeDocument(userId, dossierId, fichierId);
}

/**
 * Télécharger ou consulter un document spécifique
 * @param {string} userId - ID de l'utilisateur
 * @param {string} dossierId - ID du dossier
 * @param {string} documentId - ID du document
 * @param {Object} options - Options (isPreview: boolean)
 */
async function downloadDocument(userId, dossierId, documentId, options = {}) {
    const collections = getCollections();
    const { isPreview = false } = options;

    // Récupérer le dossier (vérifie les permissions)
    const dossier = await getDossier(userId, dossierId);

    // Chercher dans les documents (nouveau format) ou fichiers (ancien format)
    const documentsArray = dossier.documents || dossier.fichiers || [];
    const document = documentsArray.find(d => d.idDocument === documentId || d.id === documentId);

    if (!document) {
        throw new Error('Document non trouvé dans le dossier');
    }

    // Vérifier si le document est verrouillé
    if (document.locked) {
        const user = await collections.users.findOne({ username: userId });
        const userRole = await collections.roles.findOne({ _id: user.idRole });
        if (userRole.niveau > 1) {
            throw new Error(`Ce document est verrouillé par ${document.lockedBy || 'un administrateur'}`);
        }
    }

    // Charger le contenu (MongoDB en prod, disque en dev)
    const contenu = await fileStorage.loadFileContent(document.path, document.type);

    // Déterminer l'action et le champ d'historique selon le type (consultation vs téléchargement)
    const actionType = isPreview ? 'DOCUMENT_CONSULTED' : 'DOCUMENT_DOWNLOADED';
    const historyField = isPreview ? 'historiqueConsultations' : 'historiqueTelechargements';

    // Enregistrer dans l'historique du document
    const docIdField = document.idDocument ? `documents.$.${historyField}` : `fichiers.$.${historyField}`;
    const findQuery = document.idDocument
        ? { _id: dossier._id, 'documents.idDocument': documentId }
        : { _id: dossier._id, 'fichiers.id': documentId };

    await collections.dossiers.updateOne(
        findQuery,
        {
            $push: {
                [docIdField]: {
                    $each: [{
                        utilisateur: userId,
                        date: new Date()
                    }],
                    $slice: -50
                }
            }
        }
    );

    // Enregistrer dans les logs d'audit
    await collections.auditLogs.insertOne({
        timestamp: new Date(),
        user: userId,
        action: actionType,
        details: {
            dossierId: dossier.idDossier,
            dossierTitre: dossier.titre,
            documentId: document.idDocument || document.id,
            documentNom: document.nomOriginal,
            documentTaille: document.taille
        }
    });

    const actionLabel = isPreview ? 'Consultation' : 'Téléchargement';
    console.log(`📥 ${actionLabel} document: ${document.nomOriginal} (${document.idDocument || document.id}) par ${userId}`);

    return {
        document: {
            ...document,
            contenu
        }
    };
}

/**
 * Télécharger un fichier spécifique (alias pour rétrocompatibilité)
 * @deprecated Utiliser downloadDocument
 */
async function downloadFichier(userId, dossierId, fichierId) {
    const result = await downloadDocument(userId, dossierId, fichierId);
    return { fichier: result.document };
}

/**
 * Télécharger tous les documents en ZIP
 */
async function downloadAllAsZip(userId, dossierId) {
    const archiver = require('archiver');
    const collections = getCollections();

    // Récupérer le dossier (vérifie les permissions)
    const dossier = await getDossier(userId, dossierId);

    const documentsArray = dossier.documents || dossier.fichiers || [];
    if (documentsArray.length === 0) {
        throw new Error('Le dossier est vide');
    }

    // Créer le ZIP
    const archive = archiver('zip', { zlib: { level: 9 } });

    // Ajouter chaque document
    for (const doc of documentsArray) {
        try {
            const buffer = await fileStorage.loadFileBuffer(doc.path);
            archive.append(buffer, { name: doc.nomOriginal });
        } catch (error) {
            console.error(`❌ Erreur lecture document ${doc.path}:`, error.message);
        }
    }

    // Enregistrer le téléchargement
    await collections.dossiers.updateOne(
        { _id: dossier._id },
        {
            $push: {
                historiqueConsultations: {
                    $each: [{
                        utilisateur: userId,
                        action: 'DOWNLOAD_ALL_ZIP',
                        date: new Date()
                    }],
                    $slice: -100
                }
            }
        }
    );

    console.log(`📦 Téléchargement ZIP: ${dossier.idDossier} par ${userId}`);

    return {
        archive,
        dossier
    };
}

/**
 * Supprimer un dossier (soft delete)
 */
async function deleteDossier(userId, dossierId, motif) {
    const collections = getCollections();

    // Vérifier permissions (niveau 1 uniquement)
    const user = await collections.users.findOne({ username: userId });
    const userRole = await collections.roles.findOne({ _id: user.idRole });

    if (!userRole || userRole.niveau !== 1) {
        throw new Error('Seuls les utilisateurs niveau 1 peuvent supprimer des dossiers');
    }

    // Récupérer le dossier
    const dossier = await getDossier(userId, dossierId);

    // Soft delete
    await collections.dossiers.updateOne(
        { _id: dossier._id },
        {
            $set: {
                deleted: true,
                deletedAt: new Date(),
                deletedBy: userId,
                deletionMotif: motif,
                expiresAt: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000), // 60 jours
                updatedAt: new Date()
            }
        },
        { writeConcern: { w: 'majority' } }
    );

    // Logger
    await collections.auditLogs.insertOne({
        timestamp: new Date(),
        user: userId,
        action: 'DOSSIER_DELETED',
        details: {
            dossierId: dossier.idDossier,
            titre: dossier.titre,
            nombreFichiers: dossier.nombreFichiers,
            motif
        }
    });

    console.log(`🗑️ Dossier supprimé (soft delete): ${dossier.idDossier}`);

    return { success: true };
}

/**
 * Renommer un dossier
 */
async function renameDossier(userId, dossierId, nouveauTitre) {
    const collections = getCollections();
    const securityLogger = getSecurityLogger();

    // Vérifier permissions (niveau 1 uniquement)
    const user = await collections.users.findOne({ username: userId });
    const userRole = await collections.roles.findOne({ _id: user.idRole });

    if (!userRole || userRole.niveau !== 1) {
        throw new Error('Seuls les utilisateurs niveau 1 peuvent renommer des dossiers');
    }

    // Récupérer le dossier
    const dossier = await getDossier(userId, dossierId);
    const ancienTitre = dossier.titre;

    // Vérifier que le nouveau titre n'est pas vide
    if (!nouveauTitre || nouveauTitre.trim().length < 2) {
        throw new Error('Le titre doit contenir au moins 2 caractères');
    }

    // Vérifier que le nouveau titre est différent
    if (ancienTitre === nouveauTitre.trim()) {
        throw new Error('Le nouveau titre doit être différent de l\'ancien');
    }

    // Vérifier l'unicité du titre dans le département
    const existingDossier = await collections.dossiers.findOne({
        titre: nouveauTitre.trim(),
        idDepartement: dossier.idDepartement,
        _id: { $ne: dossier._id },
        deleted: { $ne: true }
    });

    if (existingDossier) {
        throw new Error(`Un dossier avec le nom "${nouveauTitre}" existe déjà dans ce département`);
    }

    // Mettre à jour le titre
    await collections.dossiers.updateOne(
        { _id: dossier._id },
        {
            $set: {
                titre: nouveauTitre.trim(),
                updatedAt: new Date()
            }
        },
        { writeConcern: { w: 'majority' } }
    );

    // LOG CRITIQUE pour le Super Admin
    await collections.auditLogs.insertOne({
        timestamp: new Date(),
        user: userId,
        userName: user.nom || userId,
        action: 'DOSSIER_RENAMED',
        severity: 'CRITICAL',
        details: {
            dossierId: dossier.idDossier,
            ancienTitre,
            nouveauTitre: nouveauTitre.trim(),
            departement: dossier.departementArchivage
        }
    });

    // Envoyer notification critique au Super Admin via message
    const superAdmins = await collections.users.find({
        idRole: { $in: await collections.roles.find({ niveau: 0 }).map(r => r._id).toArray() }
    }).toArray();

    // Utiliser une requête plus simple pour les super admins
    const level0Roles = await collections.roles.find({ niveau: 0 }).toArray();
    const level0RoleIds = level0Roles.map(r => r._id);
    const superAdminUsers = await collections.users.find({ idRole: { $in: level0RoleIds } }).toArray();

    for (const admin of superAdminUsers) {
        await collections.messages.insertOne({
            from: 'SYSTEM',
            to: admin.username,
            subject: '⚠️ ALERTE: Dossier renommé',
            body: `L'utilisateur ${user.nom || userId} (Niveau ${userRole.niveau}) a renommé un dossier:\n\nAncien nom: ${ancienTitre}\nNouveau nom: ${nouveauTitre.trim()}\nID Dossier: ${dossier.idDossier}\nDépartement: ${dossier.departementArchivage || 'N/A'}`,
            type: 'system_alert',
            priority: 'high',
            read: false,
            createdAt: new Date(),
            updatedAt: new Date()
        });
    }

    console.log(`✏️ Dossier renommé: "${ancienTitre}" → "${nouveauTitre.trim()}" par ${userId}`);

    return {
        success: true,
        ancienTitre,
        nouveauTitre: nouveauTitre.trim()
    };
}

/**
 * Partager un dossier
 */
async function shareDossier(userId, dossierId, usersToShare) {
    const collections = getCollections();

    // Vérifier permissions (niveau 1 ou 2)
    const user = await collections.users.findOne({ username: userId });
    const userRole = await collections.roles.findOne({ _id: user.idRole });

    if (!userRole || (userRole.niveau !== 1 && userRole.niveau !== 2)) {
        throw new Error('Seuls les utilisateurs niveau 1 ou 2 peuvent partager des dossiers');
    }

    // Récupérer le dossier
    const dossier = await getDossier(userId, dossierId);

    // Si niveau 2, vérifier que le partage est dans le département
    if (userRole.niveau === 2) {
        const targetUsers = await collections.users.find({
            username: { $in: usersToShare }
        }).toArray();

        const invalidUsers = targetUsers.filter(u =>
            u.idDepartement?.toString() !== user.idDepartement?.toString()
        );

        if (invalidUsers.length > 0) {
            throw new Error('Les utilisateurs niveau 2 ne peuvent partager qu\'avec des membres de leur département');
        }
    }

    // Ajouter les utilisateurs au partage
    await collections.dossiers.updateOne(
        { _id: dossier._id },
        {
            $addToSet: { sharedWith: { $each: usersToShare } },
            $set: { updatedAt: new Date() }
        },
        { writeConcern: { w: 'majority' } }
    );

    // Historique de partage
    const shareDate = new Date();
    const shareHistoryEntries = usersToShare.map(u => ({
        dossierId: dossier.idDossier,
        sharedBy: userId,
        sharedWith: u,
        sharedAt: shareDate
    }));

    if (shareHistoryEntries.length > 0) {
        await collections.shareHistory.insertMany(shareHistoryEntries);
    }

    // Enregistrer dans les logs d'audit
    await collections.auditLogs.insertOne({
        timestamp: new Date(),
        user: userId,
        userName: user.nom || userId,
        action: 'DOSSIER_SHARED',
        details: {
            dossierId: dossier.idDossier,
            titre: dossier.titre,
            sharedWith: usersToShare,
            nombreUtilisateurs: usersToShare.length
        }
    });

    // Créer une notification de message pour chaque destinataire
    for (const targetUser of usersToShare) {
        try {
            await collections.messages.insertOne({
                from: userId,
                to: targetUser,
                subject: `📁 Dossier partagé: ${dossier.titre}`,
                body: `${user.nom || userId} a partagé le dossier "${dossier.titre}" (${dossier.idDossier}) avec vous.`,
                type: 'share_notification',
                relatedData: {
                    type: 'dossier',
                    dossierId: dossier.idDossier,
                    dossierTitre: dossier.titre
                },
                read: false,
                createdAt: shareDate,
                updatedAt: shareDate
            });
            console.log(`📧 Notification envoyée à ${targetUser} pour le dossier partagé`);
        } catch (msgError) {
            console.error(`⚠️ Erreur envoi notification à ${targetUser}:`, msgError.message);
        }
    }

    console.log(`📤 Dossier partagé: ${dossier.idDossier} avec ${usersToShare.join(', ')}`);

    return { success: true };
}

/**
 * Verrouiller/Déverrouiller un dossier
 */
async function toggleLock(userId, dossierId) {
    const collections = getCollections();

    // Vérifier niveau 1
    const user = await collections.users.findOne({ username: userId });
    const userRole = await collections.roles.findOne({ _id: user.idRole });

    if (!userRole || userRole.niveau !== 1) {
        throw new Error('Seuls les utilisateurs niveau 1 peuvent verrouiller des dossiers');
    }

    // Récupérer le dossier
    const dossier = await getDossier(userId, dossierId);

    const newLockedState = !dossier.locked;

    await collections.dossiers.updateOne(
        { _id: dossier._id },
        {
            $set: {
                locked: newLockedState,
                lockedBy: newLockedState ? userId : null,
                lockedAt: newLockedState ? new Date() : null,
                updatedAt: new Date()
            }
        },
        { writeConcern: { w: 'majority' } }
    );

    console.log(`🔒 Dossier ${newLockedState ? 'verrouillé' : 'déverrouillé'}: ${dossier.idDossier}`);

    return {
        success: true,
        locked: newLockedState
    };
}

/**
 * Restaurer un dossier depuis la corbeille
 */
async function restoreDossier(userId, dossierId) {
    const collections = getCollections();

    const dossier = await collections.dossiers.findOne({
        $or: [
            { _id: new ObjectId(dossierId) },
            { idDossier: dossierId }
        ]
    });

    if (!dossier) {
        throw new Error('Dossier non trouvé');
    }

    await collections.dossiers.updateOne(
        { _id: dossier._id },
        {
            $set: {
                deleted: false,
                updatedAt: new Date()
            },
            $unset: {
                deletedAt: "",
                deletedBy: "",
                deletionMotif: "",
                expiresAt: ""
            }
        },
        { writeConcern: { w: 'majority' } }
    );

    console.log(`♻️ Dossier restauré: ${dossier.idDossier}`);

    return { success: true };
}

/**
 * Suppression définitive
 */
async function permanentDelete(userId, dossierId) {
    const collections = getCollections();

    const dossier = await collections.dossiers.findOne({
        $or: [
            { _id: new ObjectId(dossierId) },
            { idDossier: dossierId }
        ]
    });

    if (!dossier) {
        throw new Error('Dossier non trouvé');
    }

    // Supprimer tous les fichiers du stockage
    for (const fichier of dossier.fichiers) {
        try {
            await fileStorage.deleteFile(fichier.path);
        } catch (error) {
            console.error(`❌ Erreur suppression fichier ${fichier.path}:`, error.message);
        }
    }

    // Supprimer le dossier
    await collections.dossiers.deleteOne(
        { _id: dossier._id },
        { writeConcern: { w: 'majority' } }
    );

    await collections.auditLogs.insertOne({
        timestamp: new Date(),
        user: userId,
        action: 'DOSSIER_PERMANENT_DELETE',
        details: {
            dossierId: dossier.idDossier,
            titre: dossier.titre,
            nombreFichiers: dossier.nombreFichiers
        }
    });

    console.log(`💀 Dossier supprimé définitivement: ${dossier.idDossier}`);

    return { success: true };
}

/**
 * Retirer le partage d'un dossier
 */
async function unshareDossier(userId, dossierId, userToRemove) {
    const collections = getCollections();

    // Récupérer le dossier
    const dossier = await getDossier(userId, dossierId);

    await collections.dossiers.updateOne(
        { _id: dossier._id },
        {
            $pull: { sharedWith: userToRemove },
            $set: { updatedAt: new Date() }
        },
        { writeConcern: { w: 'majority' } }
    );

    console.log(`📥 Partage retiré: ${dossier.idDossier} pour ${userToRemove}`);

    return { success: true };
}

// ============================================
// ACTIONS AU NIVEAU DU DOCUMENT
// ============================================

/**
 * Partager un document spécifique
 */
async function shareDocument(userId, dossierId, documentId, usersToShare) {
    const collections = getCollections();

    // Vérifier permissions (niveau 1 ou 2)
    const user = await collections.users.findOne({ username: userId });
    const userRole = await collections.roles.findOne({ _id: user.idRole });

    if (!userRole || (userRole.niveau !== 1 && userRole.niveau !== 2)) {
        throw new Error('Seuls les utilisateurs niveau 1 ou 2 peuvent partager des documents');
    }

    // Récupérer le dossier
    const dossier = await getDossier(userId, dossierId);

    // Trouver le document
    const documentsArray = dossier.documents || dossier.fichiers || [];
    const docIndex = documentsArray.findIndex(d => d.idDocument === documentId || d.id === documentId);

    if (docIndex === -1) {
        throw new Error('Document non trouvé dans le dossier');
    }

    // Si niveau 2, vérifier que le partage est dans le département
    if (userRole.niveau === 2) {
        const targetUsers = await collections.users.find({
            username: { $in: usersToShare }
        }).toArray();

        const invalidUsers = targetUsers.filter(u =>
            u.idDepartement?.toString() !== user.idDepartement?.toString()
        );

        if (invalidUsers.length > 0) {
            throw new Error('Les utilisateurs niveau 2 ne peuvent partager qu\'avec des membres de leur département');
        }
    }

    // Mettre à jour le partage du document
    const arrayField = dossier.documents ? 'documents' : 'fichiers';
    const idField = dossier.documents ? 'idDocument' : 'id';

    // Récupérer les infos utilisateur pour la traçabilité
    const shareDate = new Date();
    const partageEntry = {
        action: 'PARTAGE',
        partagePar: userId,
        partageParNom: user.nom || userId,
        partageAvec: usersToShare,
        date: shareDate
    };

    await collections.dossiers.updateOne(
        { _id: dossier._id, [`${arrayField}.${idField}`]: documentId },
        {
            $addToSet: { [`${arrayField}.$.sharedWith`]: { $each: usersToShare } },
            $push: {
                [`${arrayField}.$.historiquePartages`]: {
                    $each: [partageEntry],
                    $slice: -50  // Garder les 50 derniers
                }
            },
            $set: {
                [`${arrayField}.$.updatedAt`]: shareDate,
                updatedAt: shareDate
            }
        },
        { writeConcern: { w: 'majority' } }
    );

    // Historique global de partage (collection shareHistory)
    const shareHistoryEntries = usersToShare.map(u => ({
        dossierId: dossier.idDossier,
        documentId: documentId,
        sharedBy: userId,
        sharedWith: u,
        sharedAt: shareDate
    }));

    if (shareHistoryEntries.length > 0) {
        await collections.shareHistory.insertMany(shareHistoryEntries);
    }

    // Enregistrer dans les logs d'audit
    const document = documentsArray[docIndex];
    await collections.auditLogs.insertOne({
        timestamp: shareDate,
        user: userId,
        userName: user.nom || userId,
        action: 'DOCUMENT_SHARED',
        details: {
            dossierId: dossier.idDossier,
            dossierTitre: dossier.titre,
            documentId: documentId,
            documentNom: document.nomOriginal || document.nom,
            sharedWith: usersToShare,
            nombreUtilisateurs: usersToShare.length
        }
    });

    // Créer une notification de message pour chaque destinataire
    for (const targetUser of usersToShare) {
        try {
            await collections.messages.insertOne({
                from: userId,
                to: targetUser,
                subject: `📄 Document partagé: ${document.nomOriginal || document.nom}`,
                body: `${user.nom || userId} a partagé le document "${document.nomOriginal || document.nom}" du dossier "${dossier.titre}" avec vous.`,
                type: 'share_notification',
                relatedData: {
                    type: 'document',
                    dossierId: dossier.idDossier,
                    dossierTitre: dossier.titre,
                    documentId: documentId,
                    documentNom: document.nomOriginal || document.nom
                },
                read: false,
                createdAt: shareDate,
                updatedAt: shareDate
            });
            console.log(`📧 Notification envoyée à ${targetUser} pour le document partagé`);
        } catch (msgError) {
            console.error(`⚠️ Erreur envoi notification à ${targetUser}:`, msgError.message);
        }
    }

    console.log(`📤 Document partagé: ${documentId} avec ${usersToShare.join(', ')}`);

    return { success: true };
}

/**
 * Retirer le partage d'un document
 */
async function unshareDocument(userId, dossierId, documentId, userToRemove) {
    const collections = getCollections();

    // Récupérer l'utilisateur qui retire le partage
    const user = await collections.users.findOne({ username: userId });

    // Récupérer le dossier
    const dossier = await getDossier(userId, dossierId);

    // Trouver le document
    const documentsArray = dossier.documents || dossier.fichiers || [];
    const docIndex = documentsArray.findIndex(d => d.idDocument === documentId || d.id === documentId);

    if (docIndex === -1) {
        throw new Error('Document non trouvé dans le dossier');
    }

    const arrayField = dossier.documents ? 'documents' : 'fichiers';
    const idField = dossier.documents ? 'idDocument' : 'id';
    const now = new Date();

    // Enregistrer le retrait de partage dans l'historique
    const retraitEntry = {
        action: 'RETRAIT_PARTAGE',
        retirePar: userId,
        retireParNom: user?.nom || userId,
        utilisateurRetire: userToRemove,
        date: now
    };

    await collections.dossiers.updateOne(
        { _id: dossier._id, [`${arrayField}.${idField}`]: documentId },
        {
            $pull: { [`${arrayField}.$.sharedWith`]: userToRemove },
            $push: {
                [`${arrayField}.$.historiquePartages`]: {
                    $each: [retraitEntry],
                    $slice: -50
                }
            },
            $set: {
                [`${arrayField}.$.updatedAt`]: now,
                updatedAt: now
            }
        },
        { writeConcern: { w: 'majority' } }
    );

    console.log(`📥 Partage document retiré: ${documentId} pour ${userToRemove}`);

    return { success: true };
}

/**
 * Verrouiller/Déverrouiller un document
 */
async function toggleDocumentLock(userId, dossierId, documentId) {
    const collections = getCollections();

    // Vérifier niveau 1
    const user = await collections.users.findOne({ username: userId });
    const userRole = await collections.roles.findOne({ _id: user.idRole });

    if (!userRole || userRole.niveau !== 1) {
        throw new Error('Seuls les utilisateurs niveau 1 peuvent verrouiller des documents');
    }

    // Récupérer le dossier
    const dossier = await getDossier(userId, dossierId);

    // Trouver le document
    const documentsArray = dossier.documents || dossier.fichiers || [];
    const document = documentsArray.find(d => d.idDocument === documentId || d.id === documentId);

    if (!document) {
        throw new Error('Document non trouvé dans le dossier');
    }

    const newLockedState = !document.locked;
    const arrayField = dossier.documents ? 'documents' : 'fichiers';
    const idField = dossier.documents ? 'idDocument' : 'id';
    const now = new Date();

    // Enregistrer dans l'historique des verrouillages
    const lockEntry = {
        action: newLockedState ? 'VERROUILLAGE' : 'DEVERROUILLAGE',
        utilisateur: userId,
        nomComplet: user.nom || userId,
        date: now
    };

    await collections.dossiers.updateOne(
        { _id: dossier._id, [`${arrayField}.${idField}`]: documentId },
        {
            $set: {
                [`${arrayField}.$.locked`]: newLockedState,
                [`${arrayField}.$.lockedBy`]: newLockedState ? userId : null,
                [`${arrayField}.$.lockedAt`]: newLockedState ? now : null,
                [`${arrayField}.$.updatedAt`]: now,
                updatedAt: now
            },
            $push: {
                [`${arrayField}.$.historiqueVerrouillages`]: {
                    $each: [lockEntry],
                    $slice: -20  // Garder les 20 derniers
                }
            }
        },
        { writeConcern: { w: 'majority' } }
    );

    console.log(`🔒 Document ${newLockedState ? 'verrouillé' : 'déverrouillé'}: ${documentId}`);

    return {
        success: true,
        locked: newLockedState
    };
}

/**
 * Obtenir un document spécifique avec ses détails
 */
async function getDocument(userId, dossierId, documentId) {
    const collections = getCollections();

    // Récupérer le dossier (vérifie les permissions)
    const dossier = await getDossier(userId, dossierId);

    // Trouver le document
    const documentsArray = dossier.documents || dossier.fichiers || [];
    const document = documentsArray.find(d => d.idDocument === documentId || d.id === documentId);

    if (!document) {
        throw new Error('Document non trouvé dans le dossier');
    }

    // Enregistrer la consultation
    const arrayField = dossier.documents ? 'documents' : 'fichiers';
    const idField = dossier.documents ? 'idDocument' : 'id';

    await collections.dossiers.updateOne(
        { _id: dossier._id, [`${arrayField}.${idField}`]: documentId },
        {
            $push: {
                [`${arrayField}.$.historiqueConsultations`]: {
                    $each: [{
                        utilisateur: userId,
                        date: new Date()
                    }],
                    $slice: -50
                }
            }
        }
    );

    return {
        document,
        dossier: {
            idDossier: dossier.idDossier,
            titre: dossier.titre
        }
    };
}

/**
 * Rechercher des documents dans les dossiers
 */
async function searchDocuments(userId, query, options = {}) {
    const collections = getCollections();
    const { page = 1, limit = 20 } = options;

    // Récupérer l'utilisateur et ses permissions
    const user = await collections.users.findOne({ username: userId });
    if (!user) throw new Error('Utilisateur non trouvé');

    const userRole = await collections.roles.findOne({ _id: user.idRole });
    if (!userRole) throw new Error('Rôle non trouvé');

    // Utiliser permissionsDossierService pour récupérer les dossiers accessibles
    const permissionsDossierService = require('./permissionsDossierService');
    const accessibleDossiers = await permissionsDossierService.getAccessibleDossiers(userId);

    // Si aucun dossier accessible, retourner résultat vide
    if (accessibleDossiers.length === 0) {
        return {
            results: [],
            pagination: { page, limit, total: 0, totalPages: 0 }
        };
    }

    // Normaliser la requête pour la recherche
    const queryLower = query.toLowerCase().trim();

    // Extraire les documents correspondants parmi les dossiers accessibles
    const results = [];
    for (const dossier of accessibleDossiers) {
        const documentsArray = dossier.documents || dossier.fichiers || [];

        // Vérifier si le dossier lui-même correspond (titre, ID, description, tags)
        const dossierMatches =
            (dossier.titre && dossier.titre.toLowerCase().includes(queryLower)) ||
            (dossier.idDossier && dossier.idDossier.toLowerCase().includes(queryLower)) ||
            (dossier.description && dossier.description.toLowerCase().includes(queryLower)) ||
            (dossier.tags && Array.isArray(dossier.tags) && dossier.tags.some(tag => tag.toLowerCase().includes(queryLower)));

        for (const doc of documentsArray) {
            const docName = doc.nomOriginal || '';
            const docId = doc.idDocument || doc.id || '';

            // Si le document ou le dossier correspond à la recherche
            if (docName.toLowerCase().includes(queryLower) ||
                docId.toLowerCase().includes(queryLower) ||
                dossierMatches) {
                results.push({
                    ...doc,
                    dossier: {
                        _id: dossier._id,
                        idDossier: dossier.idDossier,
                        titre: dossier.titre,
                        categorie: dossier.categorie,
                        description: dossier.description,
                        tags: dossier.tags
                    }
                });
            }
        }
    }

    // Pagination côté client (les dossiers sont déjà filtrés par permissions)
    const total = results.length;
    const startIndex = (page - 1) * limit;
    const paginatedResults = results.slice(startIndex, startIndex + limit);

    return {
        results: paginatedResults,
        pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit)
        }
    };
}

module.exports = {
    // Dossiers
    createDossier,
    getDossier,
    deleteDossier,
    renameDossier,
    shareDossier,
    unshareDossier,
    toggleLock,
    restoreDossier,
    permanentDelete,
    downloadAllAsZip,
    checkDossierAccess,

    // Documents (nouveau format)
    addDocument,
    removeDocument,
    downloadDocument,
    shareDocument,
    unshareDocument,
    toggleDocumentLock,
    getDocument,
    searchDocuments,

    // Alias rétrocompatibilité
    addFichier,
    removeFichier,
    downloadFichier,

    // Constantes
    LIMITS
};
