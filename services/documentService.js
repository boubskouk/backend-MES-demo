// ============================================
// SERVICE DE GESTION DES DOCUMENTS
// Logique métier pure pour les documents
// ============================================

const { ObjectId } = require('mongodb');
const { getCollections, getSecurityLogger } = require('../config/database');
const { getAccessibleDocuments } = require('./permissionsService');
const { generateDocumentId } = require('../utils/idGenerator');
const fileStorage = require('./fileStorageService');

// Mode de stockage: 'file' (optimisé) ou 'database' (ancien)
const STORAGE_MODE = process.env.STORAGE_MODE || 'file';

/**
 * Créer un nouveau document
 */
async function createDocument(documentData, userId) {
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

    // Déterminer archivage (service ou département)
    const isNiveau123 = role && (role.niveau == 1 || role.niveau == 2 || role.niveau == 3);
    const idArchivage = documentData.departementArchivage || user.idDepartement;

    let serviceArchivage = null;
    let idServiceArchivage = null;
    let deptArchivage = null;
    let idDeptArchivage = null;

    if (isNiveau123 && idArchivage) {
        // Chercher dans les services
        try {
            const service = await collections.services.findOne({ _id: new ObjectId(idArchivage) });
            if (service) {
                serviceArchivage = service.nom;
                idServiceArchivage = idArchivage;
            }
        } catch (error) {
            console.error('Erreur recherche service:', error.message);
        }
    } else if (idArchivage) {
        // Chercher dans les départements
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

    // Générer ID unique
    const idDocument = await generateDocumentId(collections.documents);

    // ✅ STOCKAGE OPTIMISÉ: Sauvegarder le fichier sur disque
    let filePath = null;
    let fileSize = null;
    let contenuToStore = null;

    if (documentData.contenu) {
        if (STORAGE_MODE === 'file') {
            // Mode optimisé: fichier sur disque
            const saved = fileStorage.saveFileContent(documentData.contenu, documentData.nomFichier);
            filePath = saved.filePath;
            fileSize = saved.fileSize;
            console.log(`💾 Fichier stocké sur disque: ${filePath} (${(fileSize/1024).toFixed(2)} KB)`);
        } else {
            // Mode ancien: base64 dans MongoDB
            contenuToStore = documentData.contenu;
        }
    }

    // Créer le document
    const document = {
        idDocument,
        idUtilisateur: userId,
        titre: documentData.titre,
        categorie: documentData.categorie,
        date: documentData.date || new Date(),
        description: documentData.description,
        tags: documentData.tags,
        nomFichier: documentData.nomFichier,
        taille: documentData.taille,
        type: documentData.type,
        // Stockage optimisé: filePath OU contenu (pas les deux)
        ...(filePath ? { filePath, fileSize } : { contenu: contenuToStore }),
        idDepartement: user.idDepartement,
        createdAt: new Date(),
        departementArchivage: deptArchivage,
        idDepartementArchivage: idDeptArchivage,
        serviceArchivage: serviceArchivage,
        idService: idServiceArchivage ? new ObjectId(idServiceArchivage) : null,
        archivePar: {
            utilisateur: userId,
            nomComplet: user.nom,
            email: user.email,
            niveau: role ? role.niveau : null,
            role: role ? role.libelle : null,
            departement: departement ? departement.nom : null,
            dateArchivage: new Date()
        },
        locked: documentData.locked || false,
        deleted: false,  // ✅ CORRECTION: Initialiser à false pour que le document soit visible
        sharedWith: [],
        accessLog: [],
        downloadCount: 0
    };

    // Utiliser writeConcern pour garantir la durabilité de l'écriture
    const result = await collections.documents.insertOne(document, { writeConcern: { w: 'majority' } });

    console.log(`✅ Document créé: ${idDocument} par ${userId}`);

    return {
        success: true,
        documentId: idDocument,
        _id: result.insertedId
    };
}

/**
 * Récupérer un document spécifique - VERSION OPTIMISÉE
 */
async function getDocument(userId, docId) {
    const collections = getCollections();
    const { ObjectId } = require('mongodb');
    const startTime = Date.now();

    // ✅ OPTIMISATION 1: Vérifier l'accès directement sans charger tous les documents
    const user = await collections.users.findOne({ username: userId });
    if (!user) throw new Error('Utilisateur non trouvé');

    const userRole = await collections.roles.findOne({ _id: user.idRole });
    if (!userRole) throw new Error('Rôle non trouvé');

    // Convertir docId en ObjectId si nécessaire
    let docObjectId;
    try {
        docObjectId = new ObjectId(docId);
    } catch (e) {
        docObjectId = null;
    }

    // Récupérer le document
    const fullDocument = await collections.documents.findOne({
        $or: [
            { _id: docObjectId },
            { idDocument: docId }
        ],
        deleted: false
    });

    if (!fullDocument) {
        throw new Error('Document non trouvé ou accès refusé');
    }

    // Vérifier l'accès selon le niveau (sans recharger tous les documents)
    const hasAccess = await checkDocumentAccess(user, userRole, fullDocument, collections);
    if (!hasAccess) {
        throw new Error('Document non trouvé ou accès refusé');
    }

    // ✅ VÉRIFICATION VERROUILLAGE: Les niveaux inférieurs ne peuvent pas ouvrir un document verrouillé
    if (fullDocument.locked && userRole.niveau > 1) {
        const error = new Error('Ce document est verrouillé par un administrateur');
        error.locked = true;
        error.lockedBy = fullDocument.lockedBy || 'un administrateur';
        throw error;
    }

    // ✅ OPTIMISATION 2: Collecter tous les usernames nécessaires pour l'enrichissement
    const allUsernames = new Set();

    if (fullDocument.historiqueConsultations) {
        fullDocument.historiqueConsultations.forEach(c => allUsernames.add(c.utilisateur));
    }
    if (fullDocument.historiqueTelechargements) {
        fullDocument.historiqueTelechargements.forEach(t => allUsernames.add(t.utilisateur));
    }

    // Récupérer l'historique des partages
    const shareHistory = await collections.shareHistory.find({
        documentId: fullDocument.idDocument
    }).toArray();

    if (shareHistory) {
        shareHistory.forEach(p => {
            allUsernames.add(p.sharedBy);
            allUsernames.add(p.sharedWith);
        });
    }

    // ✅ OPTIMISATION 3: Une seule requête pour tous les utilisateurs
    const usersArray = await collections.users.find({
        username: { $in: Array.from(allUsernames) }
    }).toArray();
    const usersMap = new Map(usersArray.map(u => [u.username, u]));

    // Une seule requête pour tous les rôles
    const roleIds = [...new Set(usersArray.map(u => u.idRole).filter(Boolean))];
    const rolesArray = await collections.roles.find({
        _id: { $in: roleIds }
    }).toArray();
    const rolesMap = new Map(rolesArray.map(r => [r._id.toString(), r]));

    // Une seule requête pour tous les départements
    const deptIds = [...new Set(usersArray.map(u => u.idDepartement).filter(Boolean))];
    const deptsArray = await collections.departements.find({
        _id: { $in: deptIds }
    }).toArray();
    const deptsMap = new Map(deptsArray.map(d => [d._id.toString(), d]));

    // Fonction helper pour enrichir un utilisateur
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
    if (fullDocument.historiqueConsultations && fullDocument.historiqueConsultations.length > 0) {
        fullDocument.historiqueConsultations = fullDocument.historiqueConsultations.map(consultation => ({
            ...consultation,
            ...enrichUser(consultation.utilisateur)
        }));
    }

    // Enrichir historiqueTelechargements
    if (fullDocument.historiqueTelechargements && fullDocument.historiqueTelechargements.length > 0) {
        fullDocument.historiqueTelechargements = fullDocument.historiqueTelechargements.map(telechargement => ({
            ...telechargement,
            ...enrichUser(telechargement.utilisateur)
        }));
    }

    // Enrichir historique des partages
    if (shareHistory && shareHistory.length > 0) {
        const enrichedBy = enrichUser;
        fullDocument.historiquePartages = shareHistory.map(partage => {
            const byInfo = enrichedBy(partage.sharedBy);
            const withInfo = enrichedBy(partage.sharedWith);
            return {
                sharedBy: partage.sharedBy,
                sharedByName: byInfo.nomComplet,
                sharedByRole: byInfo.role,
                sharedByNiveau: byInfo.niveau,
                sharedByDepartement: byInfo.departement,
                sharedWith: partage.sharedWith,
                sharedWithName: withInfo.nomComplet,
                sharedWithRole: withInfo.role,
                sharedWithNiveau: withInfo.niveau,
                sharedWithDepartement: withInfo.departement,
                sharedAt: partage.sharedAt || partage.date
            };
        });
    } else {
        fullDocument.historiquePartages = [];
    }

    // ✅ STOCKAGE OPTIMISÉ: Charger le contenu depuis le fichier si nécessaire
    if (fullDocument.filePath && !fullDocument.contenu) {
        try {
            fullDocument.contenu = fileStorage.loadFileContent(fullDocument.filePath, fullDocument.type);
            console.log(`📂 Contenu chargé depuis fichier: ${fullDocument.filePath}`);
        } catch (error) {
            console.error(`❌ Erreur chargement fichier ${fullDocument.filePath}:`, error.message);
            // Ne pas bloquer si le fichier n'existe pas
        }
    }

    console.log(`⏱️ getDocument optimisé: ${Date.now() - startTime}ms`);
    return fullDocument;
}

/**
 * Vérifier l'accès à un document sans charger tous les documents
 */
async function checkDocumentAccess(user, userRole, document, collections) {
    const constants = require('../utils/constants');
    const { ObjectId } = require('mongodb');

    // Super Admin voit tout
    if (userRole.niveau == constants.PERMISSIONS.SUPER_ADMIN) {
        return true;
    }

    const userDeptId = user.idDepartement?.toString();
    const docDeptId = document.idDepartement?.toString();

    // Niveau 1: Documents de son département et services
    if (userRole.niveau == constants.PERMISSIONS.PRIMAIRE) {
        if (docDeptId === userDeptId) return true;
        // Vérifier si le document est dans un service du département
        if (document.idService) {
            const service = await collections.services.findOne({ _id: document.idService });
            if (service && service.idDepartement?.toString() === userDeptId) return true;
        }
        return false;
    }

    // Niveau 2: Documents de son département + partagés avec lui
    if (userRole.niveau == constants.PERMISSIONS.SECONDAIRE) {
        if (docDeptId === userDeptId) return true;
        if (document.sharedWith && document.sharedWith.includes(user.username)) return true;
        return false;
    }

    // Niveau 3: Ses documents + niveau 3 du département + partagés
    if (userRole.niveau == constants.PERMISSIONS.TERTIAIRE) {
        if (document.sharedWith && document.sharedWith.includes(user.username)) return true;
        if (docDeptId === userDeptId) {
            // Vérifier si le créateur est niveau 3
            const creator = await collections.users.findOne({ username: document.idUtilisateur });
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
 * Supprimer un document (soft delete)
 */
async function deleteDocument(userId, docId, motif) {
    const collections = getCollections();

    // Vérifier l'accès
    const document = await getDocument(userId, docId);

    // Mettre à jour le document (soft delete) avec writeConcern
    await collections.documents.updateOne(
        { _id: document._id },
        {
            $set: {
                deleted: true,
                deletedAt: new Date(),
                deletedBy: userId,
                deletionMotif: motif,
                expiresAt: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000) // 60 jours
            }
        },
        { writeConcern: { w: 'majority' } }
    );

    // Logger
    await collections.auditLogs.insertOne({
        timestamp: new Date(),
        user: userId,
        action: 'DOCUMENT_DELETED',
        details: {
            documentId: document.idDocument,
            titre: document.titre,
            motif
        }
    });

    console.log(`🗑️ Document supprimé (soft delete): ${document.idDocument}`);

    return { success: true };
}

/**
 * Partager un document
 */
async function shareDocument(userId, docId, usersToShare) {
    const collections = getCollections();

    // Vérifier l'accès
    const document = await getDocument(userId, docId);

    // Ajouter les utilisateurs au partage
    await collections.documents.updateOne(
        { _id: document._id },
        {
            $addToSet: { sharedWith: { $each: usersToShare } }
        },
        { writeConcern: { w: 'majority' } }
    );

    // Historique de partage - Créer une entrée par utilisateur partagé
    const shareDate = new Date();
    const shareHistoryEntries = usersToShare.map(user => ({
        documentId: document.idDocument,
        sharedBy: userId,
        sharedWith: user,
        sharedAt: shareDate
    }));

    if (shareHistoryEntries.length > 0) {
        await collections.shareHistory.insertMany(shareHistoryEntries);
    }

    console.log(`📤 Document partagé: ${document.idDocument} avec ${usersToShare.join(', ')}`);

    return { success: true };
}

/**
 * Retirer le partage
 */
async function unshareDocument(userId, docId, userToRemove) {
    const collections = getCollections();

    // Vérifier l'accès
    const document = await getDocument(userId, docId);

    await collections.documents.updateOne(
        { _id: document._id },
        {
            $pull: { sharedWith: userToRemove }
        },
        { writeConcern: { w: 'majority' } }
    );

    console.log(`📥 Partage retiré: ${document.idDocument} pour ${userToRemove}`);

    return { success: true };
}

/**
 * Verrouiller/Déverrouiller un document (niveau 1 uniquement)
 */
async function toggleLock(userId, docId) {
    const collections = getCollections();

    // Vérifier niveau 1
    const user = await collections.users.findOne({ username: userId });
    const userRole = await collections.roles.findOne({ _id: user.idRole });

    if (userRole.niveau !== 1) {
        throw new Error('Seuls les utilisateurs niveau 1 peuvent verrouiller des documents');
    }

    // Vérifier l'accès
    const document = await getDocument(userId, docId);

    const newLockedState = !document.locked;

    await collections.documents.updateOne(
        { _id: document._id },
        {
            $set: {
                locked: newLockedState,
                lockedBy: newLockedState ? userId : null,
                lockedAt: newLockedState ? new Date() : null
            }
        },
        { writeConcern: { w: 'majority' } }
    );

    console.log(`🔒 Document ${newLockedState ? 'verrouillé' : 'déverrouillé'}: ${document.idDocument}`);

    return {
        success: true,
        locked: newLockedState
    };
}

/**
 * Enregistrer un téléchargement
 */
async function recordDownload(userId, docId) {
    const collections = getCollections();

    // Vérifier l'accès
    const document = await getDocument(userId, docId);

    const downloadDate = new Date();

    await collections.documents.updateOne(
        { _id: document._id },
        {
            $inc: { downloadCount: 1 },
            $push: {
                // ✅ Ajouter à accessLog (pour compatibilité)
                accessLog: {
                    user: userId,
                    action: 'download',
                    date: downloadDate
                },
                // ✅ CORRECTION: Ajouter aussi à historiqueTelechargements
                // C'est ce champ qui est utilisé par l'aperçu et le Super Admin
                historiqueTelechargements: {
                    utilisateur: userId,
                    date: downloadDate
                }
            }
        }
    );

    console.log(`📥 Téléchargement enregistré: ${document.idDocument} par ${userId}`);

    return { success: true };
}

/**
 * Restaurer un document depuis la corbeille
 */
async function restoreDocument(userId, docId) {
    const collections = getCollections();

    const document = await collections.documents.findOne({
        $or: [
            { _id: new ObjectId(docId) },
            { idDocument: docId }
        ]
    });

    if (!document) {
        throw new Error('Document non trouvé');
    }

    await collections.documents.updateOne(
        { _id: document._id },
        {
            $unset: {
                deleted: "",
                deletedAt: "",
                deletedBy: "",
                deletionMotif: "",
                expiresAt: ""
            }
        },
        { writeConcern: { w: 'majority' } }
    );

    console.log(`♻️ Document restauré: ${document.idDocument}`);

    return { success: true };
}

/**
 * Suppression définitive
 */
async function permanentDelete(userId, docId) {
    const collections = getCollections();

    const document = await collections.documents.findOne({
        $or: [
            { _id: new ObjectId(docId) },
            { idDocument: docId }
        ]
    });

    if (!document) {
        throw new Error('Document non trouvé');
    }

    await collections.documents.deleteOne(
        { _id: document._id },
        { writeConcern: { w: 'majority' } }
    );

    await collections.auditLogs.insertOne({
        timestamp: new Date(),
        user: userId,
        action: 'DOCUMENT_PERMANENT_DELETE',
        details: {
            documentId: document.idDocument,
            titre: document.titre
        }
    });

    console.log(`💀 Document supprimé définitivement: ${document.idDocument}`);

    return { success: true };
}

/**
 * Supprimer tous les documents accessibles
 */
async function deleteAll(userId, motif) {
    const collections = getCollections();
    const securityLogger = getSecurityLogger();

    // Récupérer les infos de l'utilisateur pour le log
    const user = await collections.users.findOne({ username: userId });
    const userRole = user ? await collections.roles.findOne({ _id: user.idRole }) : null;
    const departement = user && user.idDepartement
        ? await collections.departements.findOne({ _id: user.idDepartement })
        : null;

    const accessibleDocs = await getAccessibleDocuments(userId);

    if (accessibleDocs.length === 0) {
        return {
            success: true,
            count: 0,
            deletedCount: 0
        };
    }

    // Liste des IDs des documents pour le log
    const docIds = accessibleDocs.map(doc => doc.idDocument || doc._id.toString());

    const updatePromises = accessibleDocs.map(doc =>
        collections.documents.updateOne(
            { _id: doc._id },
            {
                $set: {
                    deleted: true,
                    deletedAt: new Date(),
                    deletedBy: userId,
                    deletionMotif: motif,
                    expiresAt: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000)
                }
            }
        )
    );

    await Promise.all(updatePromises);

    // 🔴 LOG CRITIQUE - Suppression en masse
    if (securityLogger) {
        await securityLogger.log({
            level: 'CRITICAL',
            action: 'BULK_DELETE_DOCUMENTS',
            userId: userId,
            userLevel: userRole ? userRole.niveau : 'unknown',
            departement: departement ? departement.nom : 'unknown',
            details: {
                count: accessibleDocs.length,
                motif: motif,
                documentIds: docIds,
                message: `⚠️ SUPPRESSION EN MASSE: ${accessibleDocs.length} documents supprimés par ${userId} (niveau ${userRole?.niveau || '?'}) du département ${departement?.nom || '?'}`
            },
            timestamp: new Date()
        });
    }

    console.log(`🔴 [CRITIQUE] 🗑️ ${accessibleDocs.length} documents supprimés par ${userId} (${departement?.nom || 'N/A'}) - Motif: ${motif}`);

    return {
        success: true,
        count: accessibleDocs.length,
        deletedCount: accessibleDocs.length
    };
}

module.exports = {
    createDocument,
    getDocument,
    deleteDocument,
    shareDocument,
    unshareDocument,
    toggleLock,
    recordDownload,
    restoreDocument,
    permanentDelete,
    deleteAll
};
