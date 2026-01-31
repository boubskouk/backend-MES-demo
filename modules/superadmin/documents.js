/**
 * ============================================
 * MODULE SUPER ADMIN - GESTION DES DOCUMENTS
 * ============================================
 *
 * Fournit les fonctionnalités de supervision et statistiques
 * sur les documents pour le dashboard Super Admin
 */

// Collections MongoDB
let documentsCollection;
let dossiersCollection;  // Nouvelle collection dossiers
let auditLogsCollection;
let departementsCollection;
let usersCollection;
let shareHistoryCollection;
let rolesCollection;

/**
 * Initialiser le module avec les collections MongoDB
 */
function init(collections) {
    documentsCollection = collections.documents;
    dossiersCollection = collections.dossiers;  // Collection dossiers
    auditLogsCollection = collections.auditLogs;
    departementsCollection = collections.departements;
    usersCollection = collections.users;
    shareHistoryCollection = collections.shareHistory;
    rolesCollection = collections.roles;

    console.log('✅ Module Documents (Super Admin) initialisé');
}

/**
 * Helper : Calculer le filtre de dates basé sur la période
 * @param {string} period - Type de période ('today', '7days', '30days', 'all', 'custom')
 * @param {Date} customStart - Date de début pour période personnalisée
 * @param {Date} customEnd - Date de fin pour période personnalisée
 * @param {string} fieldName - Nom du champ de date à filtrer (par défaut 'createdAt')
 * @returns {Object} Filtre MongoDB
 */
function getPeriodFilter(period, customStart, customEnd, fieldName = 'createdAt') {
    const now = new Date();
    let startDate, endDate;

    switch (period) {
        case 'today':
            startDate = new Date(now.setHours(0, 0, 0, 0));
            endDate = new Date();
            break;
        case '7days':
            startDate = new Date();
            startDate.setDate(startDate.getDate() - 7);
            endDate = new Date();
            break;
        case '30days':
            startDate = new Date();
            startDate.setDate(startDate.getDate() - 30);
            endDate = new Date();
            break;
        case 'all':
            return {}; // Pas de filtre
        case 'custom':
            startDate = customStart;
            endDate = customEnd;
            break;
        default:
            return {};
    }

    const filter = {};
    if (startDate) filter.$gte = startDate;
    if (endDate) filter.$lte = endDate;

    return Object.keys(filter).length > 0 ? { [fieldName]: filter } : {};
}

/**
 * A. Obtenir les statistiques globales des documents
 */
async function getDocumentsStats(filters = {}) {
    try {
        const { period, startDate, endDate } = filters;
        const dateFilter = getPeriodFilter(period, startDate, endDate);

        // Filtre pour exclure les documents/dossiers supprimés
        const baseFilter = {
            ...dateFilter,
            $or: [
                { deleted: { $exists: false } },
                { deleted: false }
            ]
        };

        // ===== NOUVEAU SYSTÈME: Stats depuis les DOSSIERS =====
        let totalDossiers = 0;
        let totalDocumentsInDossiers = 0;
        let lockedDocuments = 0;
        let sharedDossiers = 0;
        let byDepartmentFromDossiers = [];

        if (dossiersCollection) {
            // Compter les dossiers
            totalDossiers = await dossiersCollection.countDocuments(baseFilter);

            // Stats des documents dans les dossiers (via aggregation)
            // Supporte les deux formats: documents[] et fichiers[]
            const dossierStats = await dossiersCollection.aggregate([
                { $match: baseFilter },
                { $project: {
                    nombreDocuments: {
                        $add: [
                            { $size: { $ifNull: ["$documents", []] } },
                            { $size: { $ifNull: ["$fichiers", []] } }
                        ]
                    },
                    locked: 1,
                    sharedWith: 1,
                    idDepartement: 1
                }},
                { $group: {
                    _id: null,
                    totalDocs: { $sum: "$nombreDocuments" },
                    totalShared: { $sum: { $cond: [{ $gt: [{ $size: { $ifNull: ["$sharedWith", []] } }, 0] }, 1, 0] } },
                    totalLocked: { $sum: { $cond: ["$locked", 1, 0] } }
                }}
            ]).toArray();

            if (dossierStats.length > 0) {
                totalDocumentsInDossiers = dossierStats[0].totalDocs || 0;
                sharedDossiers = dossierStats[0].totalShared || 0;
                lockedDocuments = dossierStats[0].totalLocked || 0;
            }

            // Répartition par département depuis les dossiers
            // Supporte les deux formats: documents[] et fichiers[]
            byDepartmentFromDossiers = await dossiersCollection.aggregate([
                { $match: baseFilter },
                { $group: {
                    _id: "$idDepartement",
                    countDossiers: { $sum: 1 },
                    countDocuments: {
                        $sum: {
                            $add: [
                                { $size: { $ifNull: ["$documents", []] } },
                                { $size: { $ifNull: ["$fichiers", []] } }
                            ]
                        }
                    }
                }},
                { $lookup: {
                    from: "departements",
                    localField: "_id",
                    foreignField: "_id",
                    as: "dept"
                }},
                { $unwind: { path: "$dept", preserveNullAndEmptyArrays: true } },
                { $project: {
                    departement: { $ifNull: ["$dept.nom", "Sans département"] },
                    countDossiers: 1,
                    countDocuments: 1
                }},
                { $sort: { countDossiers: -1 } }
            ]).toArray();
        }

        // ===== ANCIEN SYSTÈME: Stats depuis l'ancienne collection documents =====
        let totalOldDocs = 0;
        let lockedOldDocs = 0;
        let sharedOldDocs = 0;

        if (documentsCollection) {
            totalOldDocs = await documentsCollection.countDocuments(baseFilter);
            lockedOldDocs = await documentsCollection.countDocuments({
                ...baseFilter,
                locked: true
            });
            sharedOldDocs = await documentsCollection.countDocuments({
                ...baseFilter,
                sharedWith: { $exists: true, $ne: [] }
            });
        }

        // Combiner les résultats
        const byDepartment = byDepartmentFromDossiers.map(item => ({
            departement: item.departement,
            count: item.countDossiers,
            documents: item.countDocuments
        }));

        return {
            total: totalDocumentsInDossiers + totalOldDocs,
            totalDossiers: totalDossiers,
            totalDocuments: totalDocumentsInDossiers,
            locked: lockedDocuments + lockedOldDocs,
            shared: sharedDossiers + sharedOldDocs,
            byDepartment
        };

    } catch (error) {
        console.error('❌ Erreur getDocumentsStats:', error);
        throw error;
    }
}

/**
 * B. Obtenir le top 10 des documents les plus partagés
 */
async function getMostSharedDocuments(filters = {}) {
    try {
        const { period, startDate, endDate } = filters;

        // Filtre de date pour shareHistory (utilise le champ 'sharedAt')
        const dateFilter = getPeriodFilter(period, startDate, endDate, 'sharedAt');

        // Récupérer les partages depuis shareHistory
        const shares = await shareHistoryCollection.find(dateFilter).toArray();

        if (shares.length === 0) {
            return [];
        }

        // Grouper par dossierId ou documentId
        const sharesByItem = {};
        for (const share of shares) {
            const key = share.documentId || share.dossierId;
            if (!key) continue;

            if (!sharesByItem[key]) {
                sharesByItem[key] = {
                    id: key,
                    isDocument: !!share.documentId,
                    dossierId: share.dossierId,
                    shares: []
                };
            }
            sharesByItem[key].shares.push({
                sharedBy: share.sharedBy,
                sharedWith: share.sharedWith,
                sharedAt: share.sharedAt
            });
        }

        // Récupérer les infos des dossiers
        const dossierIds = [...new Set(shares.map(s => s.dossierId).filter(Boolean))];
        const dossiers = await dossiersCollection.find({
            idDossier: { $in: dossierIds }
        }).toArray();
        const dossiersMap = new Map(dossiers.map(d => [d.idDossier, d]));

        // Récupérer les noms des utilisateurs
        const allUsernames = new Set();
        shares.forEach(s => {
            if (s.sharedBy) allUsernames.add(s.sharedBy);
            if (s.sharedWith) allUsernames.add(s.sharedWith);
        });
        const users = await usersCollection.find({
            username: { $in: Array.from(allUsernames) }
        }).toArray();
        const usersMap = new Map(users.map(u => [u.username, u.nom || u.username]));

        // Construire le résultat
        const result = Object.values(sharesByItem).map(item => {
            let titre = 'Élément partagé';
            let idDocument = item.id;

            if (item.isDocument && item.dossierId) {
                // C'est un document dans un dossier
                const dossier = dossiersMap.get(item.dossierId);
                if (dossier) {
                    const doc = (dossier.documents || []).find(d => d.idDocument === item.id);
                    titre = doc ? (doc.nomOriginal || doc.nom) : `Document dans ${dossier.titre}`;
                }
            } else {
                // C'est un dossier
                const dossier = dossiersMap.get(item.id);
                titre = dossier ? `📁 ${dossier.titre}` : 'Dossier partagé';
            }

            return {
                documentId: item.id,
                idDocument: idDocument,
                titre: titre,
                nombrePartages: item.shares.length,
                partages: item.shares.map(s => ({
                    sharedBy: s.sharedBy,
                    sharedByName: usersMap.get(s.sharedBy) || s.sharedBy,
                    sharedWith: s.sharedWith,
                    sharedWithName: usersMap.get(s.sharedWith) || s.sharedWith,
                    sharedAt: s.sharedAt
                }))
            };
        });

        // Trier par nombre de partages et limiter à 10
        result.sort((a, b) => b.nombrePartages - a.nombrePartages);
        return result.slice(0, 10);

    } catch (error) {
        console.error('❌ Erreur getMostSharedDocuments:', error);
        throw error;
    }
}

/**
 * C. Obtenir le top 10 des documents les plus téléchargés
 */
async function getMostDownloadedDocuments(filters = {}) {
    try {
        const { period, startDate, endDate } = filters;

        // Utiliser les logs d'audit pour les téléchargements
        const dateFilter = getPeriodFilter(period, startDate, endDate, 'timestamp');
        const matchFilter = {
            action: { $in: ['DOCUMENT_DOWNLOADED', 'DOCUMENT_CONSULTED'] },
            ...dateFilter
        };

        // Récupérer les téléchargements depuis auditLogs
        const downloads = await auditLogsCollection.find(matchFilter).toArray();

        if (downloads.length === 0) {
            return [];
        }

        // Grouper par documentId
        const downloadsByDoc = {};
        for (const dl of downloads) {
            const docId = dl.details?.documentId;
            if (!docId) continue;

            if (!downloadsByDoc[docId]) {
                downloadsByDoc[docId] = {
                    documentId: docId,
                    idDocument: docId,
                    titre: dl.details?.documentNom || 'Document',
                    dossierId: dl.details?.dossierId,
                    dossierTitre: dl.details?.dossierTitre,
                    downloads: []
                };
            }
            downloadsByDoc[docId].downloads.push({
                utilisateur: dl.user,
                date: dl.timestamp,
                action: dl.action
            });
        }

        // Récupérer les noms des utilisateurs
        const allUsernames = [...new Set(downloads.map(d => d.user))];
        const users = await usersCollection.find({ username: { $in: allUsernames } }).toArray();
        const usersMap = new Map(users.map(u => [u.username, u.nom || u.username]));

        // Construire le résultat
        const result = Object.values(downloadsByDoc).map(doc => ({
            documentId: doc.documentId,
            idDocument: doc.idDocument,
            titre: doc.titre,
            dossierId: doc.dossierId,
            dossierTitre: doc.dossierTitre,
            nombreTelechargements: doc.downloads.length,
            telechargements: doc.downloads.map(dl => ({
                utilisateur: dl.utilisateur,
                nomComplet: usersMap.get(dl.utilisateur) || dl.utilisateur,
                date: dl.date,
                action: dl.action === 'DOCUMENT_CONSULTED' ? 'Consultation' : 'Téléchargement'
            }))
        }));

        // Trier par nombre et limiter
        result.sort((a, b) => b.nombreTelechargements - a.nombreTelechargements);
        return result.slice(0, 10);

    } catch (error) {
        console.error('❌ Erreur getMostDownloadedDocuments:', error);
        throw error;
    }
}

/**
 * D. Obtenir la liste des utilisateurs niveau 1 ayant supprimé des documents
 */
async function getLevel1Deletions(filters = {}) {
    try {
        const { period, startDate, endDate } = filters;

        // NOUVEAU SYSTÈME: Utiliser la collection dossiers au lieu de documents
        const periodFilter = getPeriodFilter(period, startDate, endDate, 'deletedAt');

        // Récupérer le rôle niveau 1
        const level1Role = await rolesCollection.findOne({ niveau: 1 });
        if (!level1Role) {
            return [];
        }

        // Récupérer les utilisateurs de niveau 1
        const level1Users = await usersCollection.find({
            idRole: level1Role._id
        }).toArray();

        const level1Usernames = level1Users.map(u => u.username);

        // Créer un mapping username -> infos utilisateur
        const usersMap = {};
        level1Users.forEach(u => {
            usersMap[u.username] = {
                nom: u.nom,
                email: u.email
            };
        });

        const dateFilter = {
            deleted: true,
            deletedBy: { $in: level1Usernames },
            ...periodFilter
        };

        // NOUVEAU: Requête sur la collection dossiers
        const deletions = await dossiersCollection.aggregate([
            { $match: dateFilter },
            { $group: {
                _id: "$deletedBy",
                count: { $sum: 1 },
                deletedDocs: { $push: {
                    documentId: "$idDossier",
                    titre: "$titre",
                    timestamp: "$deletedAt",
                    motif: "$deletionMotif",
                    expiresAt: "$expiresAt"
                }}
            }},
            { $project: {
                username: "$_id",
                nombreSuppressions: "$count",
                documentsSupprimes: "$deletedDocs"
            }},
            { $sort: { nombreSuppressions: -1 } }
        ]).toArray();

        // Enrichir avec les infos utilisateur
        deletions.forEach(del => {
            const userInfo = usersMap[del.username];
            if (userInfo) {
                del.nom = userInfo.nom;
                del.email = userInfo.email;
            }
        });

        return deletions;

    } catch (error) {
        console.error('❌ Erreur getLevel1Deletions:', error);
        throw error;
    }
}

/**
 * D2. Obtenir la liste des utilisateurs niveau 1 ayant verrouillé des documents
 */
async function getLevel1Locks(filters = {}) {
    try {
        const { period, startDate, endDate } = filters;

        // Filtre de période sur la date de verrouillage (lockedAt)
        const periodFilter = getPeriodFilter(period, startDate, endDate, 'lockedAt');

        // Récupérer le rôle niveau 1
        const level1Role = await rolesCollection.findOne({ niveau: 1 });

        if (!level1Role) {
            return []; // Aucun rôle niveau 1 trouvé
        }

        // Récupérer les utilisateurs de niveau 1
        const level1Users = await usersCollection.find({
            idRole: level1Role._id
        }).toArray();

        const level1Usernames = level1Users.map(u => u.username);

        // Créer un mapping username -> infos utilisateur
        const usersMap = {};
        level1Users.forEach(u => {
            usersMap[u.username] = {
                nom: u.nom,
                email: u.email
            };
        });

        // NOUVEAU SYSTÈME: Requête sur la collection dossiers
        const dateFilter = {
            locked: true,
            lockedBy: { $in: level1Usernames },
            deleted: { $ne: true },
            ...periodFilter
        };

        const locks = await dossiersCollection.aggregate([
            { $match: dateFilter },
            { $lookup: {
                from: "departements",
                localField: "idDepartement",
                foreignField: "_id",
                as: "dept"
            }},
            { $unwind: { path: "$dept", preserveNullAndEmptyArrays: true } },
            { $group: {
                _id: "$lockedBy",
                count: { $sum: 1 },
                lockedDocs: { $push: {
                    documentId: "$idDossier",
                    titre: "$titre",
                    timestamp: "$lockedAt",
                    categorie: "$categorie",
                    departement: "$dept.nom"
                }}
            }},
            { $project: {
                username: "$_id",
                count: "$count",
                documentsVerrouilles: "$lockedDocs"
            }},
            { $sort: { count: -1 } }
        ]).toArray();

        // Enrichir avec les infos utilisateur
        locks.forEach(lock => {
            const userInfo = usersMap[lock.username];
            if (userInfo) {
                lock.nom = userInfo.nom;
                lock.email = userInfo.email;
            }
        });

        return locks;

    } catch (error) {
        console.error('❌ Erreur getLevel1Locks:', error);
        throw error;
    }
}

/**
 * E. Obtenir la liste des documents supprimés (paginée)
 */
async function getDeletedDocuments(filters = {}) {
    try {
        const { period, startDate, endDate, page = 1, limit = 20, username } = filters;

        // NOUVEAU: Récupérer les documents depuis les dossiers supprimés
        const periodFilter = getPeriodFilter(period, startDate, endDate, 'deletedAt');
        const dateFilter = {
            deleted: true,
            ...periodFilter
        };

        // Ajouter filtre par username si fourni
        if (username) {
            dateFilter.deletedBy = username;
        }

        // Récupérer les dossiers supprimés
        const deletedDossiers = await dossiersCollection.find(dateFilter).toArray();

        // Extraire tous les documents des dossiers supprimés
        let allDeletedDocs = [];
        for (const dossier of deletedDossiers) {
            const documents = dossier.documents || dossier.fichiers || [];
            for (const doc of documents) {
                allDeletedDocs.push({
                    _id: doc.idDocument || doc.id,
                    documentId: doc.idDocument || doc.id,
                    titre: doc.nomOriginal || doc.nom,
                    dossierTitre: dossier.titre,
                    dossierId: dossier.idDossier,
                    supprimePar: dossier.deletedBy,
                    dateSuppression: dossier.deletedAt,
                    motif: dossier.deletionMotif,
                    departement: dossier.departementArchivage,
                    categorie: dossier.categorie,
                    expiresAt: dossier.expiresAt,
                    isRecoverable: dossier.expiresAt ? new Date(dossier.expiresAt) > new Date() : false,
                    daysUntilExpiration: dossier.expiresAt ?
                        Math.ceil((new Date(dossier.expiresAt) - new Date()) / 86400000) : 0
                });
            }
        }

        // Récupérer les noms des utilisateurs
        const usernames = [...new Set(allDeletedDocs.map(d => d.supprimePar).filter(Boolean))];
        const users = await usersCollection.find({ username: { $in: usernames } }).toArray();
        const usersMap = new Map(users.map(u => [u.username, { nom: u.nom, email: u.email }]));

        // Enrichir avec les noms
        allDeletedDocs = allDeletedDocs.map(doc => ({
            ...doc,
            nomComplet: usersMap.get(doc.supprimePar)?.nom || doc.supprimePar,
            email: usersMap.get(doc.supprimePar)?.email
        }));

        // Trier par date de suppression
        allDeletedDocs.sort((a, b) => new Date(b.dateSuppression) - new Date(a.dateSuppression));

        // Pagination
        const total = allDeletedDocs.length;
        const startIndex = (page - 1) * limit;
        const deletions = allDeletedDocs.slice(startIndex, startIndex + limit);

        return {
            deletions,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit)
            }
        };

    } catch (error) {
        console.error('❌ Erreur getDeletedDocuments:', error);
        throw error;
    }
}

/**
 * F. Obtenir la liste des documents verrouillés (paginée)
 */
async function getLockedDocuments(filters = {}) {
    try {
        const { period, startDate, endDate, page = 1, limit = 20, username } = filters;

        // NOUVEAU: Récupérer les documents depuis les dossiers verrouillés
        const dateFilter = getPeriodFilter(period, startDate, endDate, 'lockedAt');
        const matchFilter = {
            locked: true,
            deleted: { $ne: true },
            ...dateFilter
        };

        // Ajouter filtre par username si fourni
        if (username) {
            matchFilter.lockedBy = username;
        }

        // Récupérer les dossiers verrouillés
        const lockedDossiers = await dossiersCollection.find(matchFilter).toArray();

        // Extraire tous les documents des dossiers verrouillés
        let allLockedDocs = [];
        for (const dossier of lockedDossiers) {
            const documents = dossier.documents || dossier.fichiers || [];
            for (const doc of documents) {
                allLockedDocs.push({
                    idDocument: doc.idDocument || doc.id,
                    titre: doc.nomOriginal || doc.nom,
                    dossierTitre: dossier.titre,
                    dossierId: dossier.idDossier,
                    categorie: dossier.categorie,
                    departement: dossier.departementArchivage,
                    verrouilléPar: dossier.lockedBy,
                    dateVerrouillage: dossier.lockedAt,
                    createdAt: doc.dateAjout || dossier.createdAt
                });
            }
        }

        // Récupérer les noms des utilisateurs
        const usernames = [...new Set(allLockedDocs.map(d => d.verrouilléPar).filter(Boolean))];
        const users = await usersCollection.find({ username: { $in: usernames } }).toArray();
        const usersMap = new Map(users.map(u => [u.username, u.nom || u.username]));

        // Enrichir avec les noms
        allLockedDocs = allLockedDocs.map(doc => ({
            ...doc,
            verrouilleurNom: usersMap.get(doc.verrouilléPar) || doc.verrouilléPar
        }));

        // Trier par date de verrouillage
        allLockedDocs.sort((a, b) => new Date(b.dateVerrouillage) - new Date(a.dateVerrouillage));

        // Pagination
        const total = allLockedDocs.length;
        const startIndex = (page - 1) * limit;
        const locked = allLockedDocs.slice(startIndex, startIndex + limit);

        return {
            locked,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit)
            }
        };

    } catch (error) {
        console.error('❌ Erreur getLockedDocuments:', error);
        throw error;
    }
}

/**
 * G. Obtenir l'activité globale sur les dossiers et documents
 * Utilise le nouveau système de dossiers
 */
async function getDocumentsActivity(filters = {}) {
    try {
        const { period, startDate, endDate } = filters;

        // Filtre de date pour auditLogs (utilise le champ 'timestamp')
        const dateFilter = getPeriodFilter(period, startDate, endDate, 'timestamp');

        // Compter les actions - NOUVEAU SYSTÈME DOSSIERS
        // Dossiers créés
        const created = await auditLogsCollection.countDocuments({
            action: 'DOSSIER_CREATED',
            ...dateFilter
        });

        // Dossiers supprimés
        const deleted = await auditLogsCollection.countDocuments({
            action: { $in: ['DOSSIER_DELETED', 'DOSSIER_PERMANENT_DELETE'] },
            ...dateFilter
        });

        // Documents téléchargés
        const downloaded = await auditLogsCollection.countDocuments({
            action: { $in: ['DOCUMENT_DOWNLOADED', 'DOSSIER_DOWNLOADED'] },
            ...dateFilter
        });

        // Documents consultés (prévisualisés)
        const consulted = await auditLogsCollection.countDocuments({
            action: 'DOCUMENT_CONSULTED',
            ...dateFilter
        });

        // Documents ajoutés à des dossiers
        const documentsAdded = await auditLogsCollection.countDocuments({
            action: 'DOCUMENT_ADDED',
            ...dateFilter
        });

        // Dossiers partagés
        const shared = await auditLogsCollection.countDocuments({
            action: 'DOSSIER_SHARED',
            ...dateFilter
        });

        return {
            created,
            deleted,
            downloaded,
            consulted,
            documentsAdded,
            shared
        };

    } catch (error) {
        console.error('❌ Erreur getDocumentsActivity:', error);
        throw error;
    }
}

/**
 * H. Obtenir la timeline des actions sur documents (pour graphiques)
 */
async function getDocumentTimeline(filters = {}) {
    try {
        const { period, startDate, endDate } = filters;

        // Filtre de date pour auditLogs (utilise le champ 'timestamp')
        const periodFilter = getPeriodFilter(period, startDate, endDate, 'timestamp');
        const dateFilter = {
            action: { $in: ['DOCUMENT_ARCHIVED', 'DOCUMENT_DELETED', 'DOCUMENT_DOWNLOADED', 'DOCUMENT_SHARED'] },
            ...periodFilter
        };

        const timeline = await auditLogsCollection.aggregate([
            { $match: dateFilter },
            { $project: {
                date: { $dateToString: { format: "%Y-%m-%d", date: "$timestamp" } },
                action: 1
            }},
            { $group: {
                _id: { date: "$date", action: "$action" },
                count: { $sum: 1 }
            }},
            { $project: {
                date: "$_id.date",
                action: "$_id.action",
                count: 1,
                _id: 0
            }},
            { $sort: { date: 1 } }
        ]).toArray();

        return timeline;

    } catch (error) {
        console.error('❌ Erreur getDocumentTimeline:', error);
        throw error;
    }
}

/**
 * I. Obtenir tous les documents avec pagination
 */
async function getAllDocuments(filters = {}) {
    try {
        const { period, startDate, endDate, page = 1, limit = 20, search = '' } = filters;
        const dateFilter = getPeriodFilter(period, startDate, endDate);

        // NOUVEAU: Extraire les documents depuis les DOSSIERS (pas l'ancienne collection)
        const matchFilter = {
            ...dateFilter,
            $or: [
                { deleted: { $exists: false } },
                { deleted: false }
            ]
        };

        // Récupérer tous les dossiers non supprimés
        const dossiers = await dossiersCollection.find(matchFilter).toArray();

        // Récupérer tous les utilisateurs pour enrichir les données (nom complet du verrouilleur)
        const users = await usersCollection.find({}).toArray();
        const userMap = {};
        users.forEach(u => {
            userMap[u.username] = u.nom || u.username;
        });

        // Extraire tous les documents de tous les dossiers
        let allDocuments = [];
        for (const dossier of dossiers) {
            const documents = dossier.documents || dossier.fichiers || [];
            for (const doc of documents) {
                // Obtenir le nom complet du verrouilleur
                const lockerName = doc.lockedBy ? (userMap[doc.lockedBy] || doc.lockedBy) : null;

                allDocuments.push({
                    idDocument: doc.idDocument || doc.id,
                    titre: doc.nomOriginal || doc.nom,
                    taille: doc.taille,
                    type: doc.type,
                    categorie: dossier.categorie,
                    departement: dossier.departementArchivage,
                    service: dossier.serviceArchivage,
                    dossierTitre: dossier.titre,
                    dossierId: dossier.idDossier,
                    creatorName: doc.archivePar?.nomComplet || dossier.archivePar?.nomComplet || dossier.idUtilisateur,
                    creatorUsername: doc.archivePar?.utilisateur || dossier.idUtilisateur,
                    createdAt: doc.dateAjout || dossier.createdAt,
                    locked: doc.locked || false,
                    lockedBy: doc.lockedBy,
                    lockerName: lockerName,
                    sharedWith: doc.sharedWith || [],
                    historiqueTelechargements: doc.historiqueTelechargements || [],
                    downloadCount: (doc.historiqueTelechargements || []).length,
                    shareCount: (doc.sharedWith || []).length
                });
            }
        }

        // Filtrer par recherche si présente
        if (search) {
            const searchLower = search.toLowerCase();
            allDocuments = allDocuments.filter(doc =>
                (doc.titre && doc.titre.toLowerCase().includes(searchLower)) ||
                (doc.idDocument && doc.idDocument.toLowerCase().includes(searchLower)) ||
                (doc.categorie && doc.categorie.toLowerCase().includes(searchLower)) ||
                (doc.dossierTitre && doc.dossierTitre.toLowerCase().includes(searchLower))
            );
        }

        // Trier par date de création décroissante
        allDocuments.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        // Pagination
        const total = allDocuments.length;
        const startIndex = (page - 1) * limit;
        const paginatedDocs = allDocuments.slice(startIndex, startIndex + limit);

        return {
            documents: paginatedDocs,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                totalPages: Math.ceil(total / limit)
            }
        };

    } catch (error) {
        console.error('❌ Erreur getAllDocuments:', error);
        throw error;
    }
}

// ============================================
// NOUVELLES FONCTIONS - TRAÇABILITÉ TOUS NIVEAUX
// ============================================

/**
 * Obtenir les suppressions par TOUS les utilisateurs (niveaux 1, 2, 3)
 * Groupé par niveau puis par utilisateur
 */
async function getUsersDeletions(filters = {}) {
    try {
        const { period, startDate, endDate } = filters;

        // Format réel: deletedBy = username, deletedAt = date, deletionMotif = motif
        const periodFilter = getPeriodFilter(period, startDate, endDate, 'deletedAt');
        const dateFilter = {
            deleted: true,
            ...periodFilter
        };

        // Récupérer tous les rôles pour mapper les niveaux
        const roles = await rolesCollection.find({}).toArray();
        const roleMap = {};
        roles.forEach(r => {
            roleMap[r._id.toString()] = r.niveau;
        });

        // Récupérer tous les utilisateurs pour enrichir les données
        const users = await usersCollection.find({}).toArray();
        const userMap = {};
        users.forEach(u => {
            userMap[u.username] = {
                nom: u.nom,
                email: u.email,
                niveau: roleMap[u.idRole?.toString()] || 0
            };
        });

        const deletions = await documentsCollection.aggregate([
            { $match: dateFilter },
            { $group: {
                _id: "$deletedBy",
                count: { $sum: 1 },
                deletedDocs: { $push: {
                    documentId: "$idDocument",
                    titre: "$titre",
                    timestamp: "$deletedAt",
                    motif: "$deletionMotif",
                    expiresAt: "$expiresAt"
                }}
            }},
            { $project: {
                username: "$_id",
                nombreSuppressions: "$count",
                documentsSupprimes: "$deletedDocs"
            }},
            { $sort: { nombreSuppressions: -1 } }
        ]).toArray();

        // Enrichir avec les données utilisateur
        deletions.forEach(del => {
            const userInfo = userMap[del.username];
            if (userInfo) {
                del.nom = userInfo.nom;
                del.email = userInfo.email;
                del.niveau = userInfo.niveau;
            } else {
                del.niveau = 0;
            }
        });

        // Grouper par niveau
        const byLevel = {
            niveau1: deletions.filter(d => d.niveau === 1),
            niveau2: deletions.filter(d => d.niveau === 2),
            niveau3: deletions.filter(d => d.niveau === 3)
        };

        return byLevel;

    } catch (error) {
        console.error('❌ Erreur getUsersDeletions:', error);
        throw error;
    }
}

/**
 * Obtenir les verrouillages par TOUS les utilisateurs (niveaux 1, 2, 3)
 * Groupé par niveau puis par utilisateur
 */
async function getUsersLocks(filters = {}) {
    try {
        const { period, startDate, endDate } = filters;

        // Format actuel: lockedBy = username (string), lockedAt = date
        const periodFilter = getPeriodFilter(period, startDate, endDate, 'lockedAt');

        // Récupérer tous les rôles pour mapper les niveaux
        const roles = await rolesCollection.find({}).toArray();
        const roleMap = {};
        roles.forEach(r => {
            roleMap[r._id.toString()] = r.niveau;
        });

        // Récupérer tous les utilisateurs pour enrichir les données
        const users = await usersCollection.find({}).toArray();
        const userMap = {};
        users.forEach(u => {
            userMap[u.username] = {
                nom: u.nom,
                email: u.email,
                niveau: roleMap[u.idRole?.toString()] || 0,
                departement: u.idDepartement
            };
        });

        const dateFilter = {
            locked: true,
            ...periodFilter
        };

        const locks = await documentsCollection.aggregate([
            { $match: dateFilter },
            { $lookup: {
                from: "departements",
                localField: "idDepartement",
                foreignField: "_id",
                as: "dept"
            }},
            { $unwind: { path: "$dept", preserveNullAndEmptyArrays: true } },
            { $group: {
                _id: "$lockedBy",
                count: { $sum: 1 },
                lockedDocs: { $push: {
                    documentId: "$idDocument",
                    titre: "$titre",
                    timestamp: "$lockedAt",
                    categorie: "$categorie",
                    departement: "$dept.nom"
                }}
            }},
            { $project: {
                username: "$_id",
                count: "$count",
                documentsVerrouilles: "$lockedDocs"
            }},
            { $sort: { count: -1 } }
        ]).toArray();

        // Enrichir avec les données utilisateur
        locks.forEach(lock => {
            const userInfo = userMap[lock.username];
            if (userInfo) {
                lock.nom = userInfo.nom;
                lock.email = userInfo.email;
                lock.niveau = userInfo.niveau;
            } else {
                lock.niveau = 0; // Inconnu
            }
        });

        // Grouper par niveau
        const byLevel = {
            niveau1: locks.filter(l => l.niveau === 1),
            niveau2: locks.filter(l => l.niveau === 2),
            niveau3: locks.filter(l => l.niveau === 3)
        };

        return byLevel;

    } catch (error) {
        console.error('❌ Erreur getUsersLocks:', error);
        throw error;
    }
}

/**
 * Obtenir les téléchargements par TOUS les utilisateurs (niveaux 1, 2, 3)
 * Groupé par niveau puis par utilisateur
 */
async function getUsersDownloads(filters = {}) {
    try {
        const { period, startDate, endDate } = filters;

        // Récupérer tous les rôles pour mapper les niveaux
        const roles = await rolesCollection.find({}).toArray();
        const roleMap = {};
        roles.forEach(r => {
            roleMap[r._id.toString()] = r.niveau;
        });

        // Récupérer tous les utilisateurs pour enrichir les données
        const users = await usersCollection.find({}).toArray();
        const userMap = {};
        users.forEach(u => {
            userMap[u.username] = {
                nom: u.nom,
                email: u.email,
                niveau: roleMap[u.idRole?.toString()] || 0
            };
        });

        // Extraire les dates de début et fin de la période
        let periodStart = new Date(0);
        let periodEnd = new Date();

        if (period !== 'all') {
            const now = new Date();
            switch (period) {
                case 'today':
                    periodStart = new Date(now.setHours(0, 0, 0, 0));
                    periodEnd = new Date();
                    break;
                case '7days':
                    periodStart = new Date();
                    periodStart.setDate(periodStart.getDate() - 7);
                    periodEnd = new Date();
                    break;
                case '30days':
                    periodStart = new Date();
                    periodStart.setDate(periodStart.getDate() - 30);
                    periodEnd = new Date();
                    break;
                case 'custom':
                    periodStart = startDate ? new Date(startDate) : new Date(0);
                    periodEnd = endDate ? new Date(endDate) : new Date();
                    break;
            }
        }

        // Récupérer tous les documents avec historique de téléchargements
        const documents = await documentsCollection.find({
            historiqueTelechargements: { $exists: true, $ne: [] }
        }).toArray();

        // Agréger les téléchargements par utilisateur
        const downloadsByUser = {};

        documents.forEach(doc => {
            if (doc.historiqueTelechargements && Array.isArray(doc.historiqueTelechargements)) {
                doc.historiqueTelechargements.forEach(dl => {
                    const dlDate = new Date(dl.date);
                    if (dlDate >= periodStart && dlDate <= periodEnd) {
                        const username = dl.utilisateur;
                        if (!downloadsByUser[username]) {
                            downloadsByUser[username] = {
                                username,
                                nom: dl.nomComplet || username,
                                count: 0,
                                downloads: []
                            };
                        }
                        downloadsByUser[username].count++;
                        downloadsByUser[username].downloads.push({
                            documentId: doc.idDocument,
                            titre: doc.titre,
                            date: dl.date,
                            categorie: doc.categorie
                        });
                    }
                });
            }
        });

        // Convertir en array et enrichir avec niveau
        const downloadsArray = Object.values(downloadsByUser);
        downloadsArray.forEach(dl => {
            const userInfo = userMap[dl.username];
            if (userInfo) {
                dl.nom = dl.nom || userInfo.nom;
                dl.email = userInfo.email;
                dl.niveau = userInfo.niveau;
            } else {
                dl.niveau = 0;
            }
        });

        // Trier par nombre de téléchargements
        downloadsArray.sort((a, b) => b.count - a.count);

        // Grouper par niveau
        const byLevel = {
            niveau1: downloadsArray.filter(d => d.niveau === 1),
            niveau2: downloadsArray.filter(d => d.niveau === 2),
            niveau3: downloadsArray.filter(d => d.niveau === 3)
        };

        return byLevel;

    } catch (error) {
        console.error('❌ Erreur getUsersDownloads:', error);
        throw error;
    }
}

// ============================================
// EXPORTS
// ============================================

module.exports = {
    init,
    getDocumentsStats,
    getMostSharedDocuments,
    getMostDownloadedDocuments,
    getLevel1Deletions,
    getLevel1Locks,
    getDeletedDocuments,
    getLockedDocuments,
    getDocumentsActivity,
    getDocumentTimeline,
    getAllDocuments,
    // Nouvelles fonctions traçabilité tous niveaux
    getUsersDeletions,
    getUsersLocks,
    getUsersDownloads
};
