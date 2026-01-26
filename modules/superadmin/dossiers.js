/**
 * ============================================
 * MODULE SUPER ADMIN - GESTION DES DOSSIERS
 * ============================================
 *
 * Fournit les fonctionnalités de supervision et statistiques
 * sur les dossiers pour le dashboard Super Admin
 */

// Collections MongoDB
let dossiersCollection;
let auditLogsCollection;
let departementsCollection;
let usersCollection;
let shareHistoryCollection;
let rolesCollection;

/**
 * Initialiser le module avec les collections MongoDB
 */
function init(collections) {
    dossiersCollection = collections.dossiers;
    auditLogsCollection = collections.auditLogs;
    departementsCollection = collections.departements;
    usersCollection = collections.users;
    shareHistoryCollection = collections.shareHistory;
    rolesCollection = collections.roles;

    console.log('Initialisations Module Dossiers (Super Admin)');
}

/**
 * Helper : Calculer le filtre de dates basé sur la période
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
            return {};
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
 * A. Obtenir les statistiques globales des dossiers
 */
async function getDossiersStats(filters = {}) {
    try {
        const { period, startDate, endDate } = filters;
        const dateFilter = getPeriodFilter(period, startDate, endDate);

        // Filtre pour exclure les dossiers supprimés
        const baseFilter = {
            ...dateFilter,
            $or: [
                { deleted: { $exists: false } },
                { deleted: false }
            ]
        };

        // Stats globales
        const total = await dossiersCollection.countDocuments(baseFilter);
        const locked = await dossiersCollection.countDocuments({
            ...baseFilter,
            locked: true
        });
        const shared = await dossiersCollection.countDocuments({
            ...baseFilter,
            sharedWith: { $exists: true, $ne: [] }
        });

        // Total documents (anciennement fichiers)
        const documentsResult = await dossiersCollection.aggregate([
            { $match: baseFilter },
            { $group: {
                _id: null,
                totalDocuments: {
                    $sum: { $ifNull: ["$nombreDocuments", { $ifNull: ["$nombreFichiers", 0] }] }
                },
                tailleTotale: { $sum: "$tailleTotale" }
            }}
        ]).toArray();

        const totalDocuments = documentsResult[0]?.totalDocuments || 0;
        const tailleTotale = documentsResult[0]?.tailleTotale || 0;

        // Répartition par département
        const byDepartmentRaw = await dossiersCollection.aggregate([
            { $match: baseFilter },
            { $group: {
                _id: "$idDepartement",
                count: { $sum: 1 },
                fichiers: { $sum: "$nombreFichiers" }
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
                count: 1,
                fichiers: 1
            }},
            { $sort: { count: -1 } }
        ]).toArray();

        const byDepartment = byDepartmentRaw.map(item => ({
            departement: item.departement,
            count: item.count,
            documents: item.fichiers
        }));

        return {
            total,
            locked,
            shared,
            totalDocuments,
            totalFichiers: totalDocuments, // Alias pour rétrocompatibilité
            tailleTotale,
            byDepartment
        };

    } catch (error) {
        console.error('Erreur getDossiersStats:', error);
        throw error;
    }
}

/**
 * B. Obtenir tous les dossiers avec pagination
 */
async function getAllDossiers(filters = {}) {
    try {
        const { period, startDate, endDate, page = 1, limit = 20, search = '' } = filters;
        const dateFilter = getPeriodFilter(period, startDate, endDate);

        // Filtre de base : dossiers non supprimés
        const matchFilter = {
            ...dateFilter,
            $or: [
                { deleted: { $exists: false } },
                { deleted: false }
            ]
        };

        // Ajouter recherche si présente
        if (search) {
            matchFilter.$and = [
                { $or: matchFilter.$or },
                { $or: [
                    { titre: { $regex: search, $options: 'i' } },
                    { idDossier: { $regex: search, $options: 'i' } },
                    { categorie: { $regex: search, $options: 'i' } }
                ]}
            ];
            delete matchFilter.$or;
        }

        // Compter le total
        const total = await dossiersCollection.countDocuments(matchFilter);

        // Récupérer les dossiers avec pagination
        const allDossiers = await dossiersCollection.aggregate([
            { $match: matchFilter },
            { $sort: { createdAt: -1 } },
            { $skip: (page - 1) * limit },
            { $limit: limit },
            { $lookup: {
                from: "departements",
                localField: "idDepartement",
                foreignField: "_id",
                as: "dept"
            }},
            { $unwind: { path: "$dept", preserveNullAndEmptyArrays: true } },
            { $lookup: {
                from: "users",
                localField: "idUtilisateur",
                foreignField: "username",
                as: "creator"
            }},
            { $unwind: { path: "$creator", preserveNullAndEmptyArrays: true } },
            { $project: {
                idDossier: 1,
                titre: 1,
                categorie: 1,
                departement: "$dept.nom",
                departementArchivage: 1,
                serviceArchivage: 1,
                nombreFichiers: 1,
                nombreDocuments: 1,
                tailleTotale: 1,
                creatorName: { $ifNull: ["$archivePar.nomComplet", "$creator.nom", "$idUtilisateur"] },
                creatorUsername: "$idUtilisateur",
                createdAt: 1,
                locked: 1,
                lockedBy: 1,
                lockedAt: 1,
                sharedWith: 1,
                shareCount: { $size: { $ifNull: ["$sharedWith", []] } },
                // Calculer le nombre de documents si non présent
                documentCount: { $size: { $ifNull: ["$documents", []] } }
            }}
        ]).toArray();

        return {
            dossiers: allDossiers,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                totalPages: Math.ceil(total / limit)
            }
        };

    } catch (error) {
        console.error('Erreur getAllDossiers:', error);
        throw error;
    }
}

/**
 * C. Obtenir un dossier spécifique avec tous ses détails
 */
async function getDossierDetail(dossierId) {
    try {
        const { ObjectId } = require('mongodb');

        let dossierObjectId;
        try {
            dossierObjectId = new ObjectId(dossierId);
        } catch (e) {
            dossierObjectId = null;
        }

        const dossier = await dossiersCollection.findOne({
            $or: [
                { _id: dossierObjectId },
                { idDossier: dossierId }
            ]
        });

        if (!dossier) {
            return null;
        }

        // Enrichir avec le département
        if (dossier.idDepartement) {
            const dept = await departementsCollection.findOne({ _id: dossier.idDepartement });
            if (dept) {
                dossier.departementNom = dept.nom;
            }
        }

        return dossier;

    } catch (error) {
        console.error('Erreur getDossierDetail:', error);
        throw error;
    }
}

/**
 * D. Obtenir la liste des dossiers supprimés (corbeille)
 */
async function getDeletedDossiers(filters = {}) {
    try {
        const { period, startDate, endDate, page = 1, limit = 20 } = filters;

        const periodFilter = getPeriodFilter(period, startDate, endDate, 'deletedAt');
        const dateFilter = {
            deleted: true,
            ...periodFilter
        };

        // Compter le total
        const total = await dossiersCollection.countDocuments(dateFilter);

        // Récupérer les dossiers supprimés avec pagination
        const deletions = await dossiersCollection.aggregate([
            { $match: dateFilter },
            { $sort: { deletedAt: -1 } },
            { $skip: (page - 1) * limit },
            { $limit: limit },
            { $lookup: {
                from: "users",
                localField: "deletedBy",
                foreignField: "username",
                as: "deleter"
            }},
            { $unwind: { path: "$deleter", preserveNullAndEmptyArrays: true } },
            { $lookup: {
                from: "departements",
                localField: "idDepartement",
                foreignField: "_id",
                as: "dept"
            }},
            { $unwind: { path: "$dept", preserveNullAndEmptyArrays: true } },
            { $project: {
                _id: 1,
                dossierId: "$idDossier",
                titre: 1,
                nombreFichiers: 1,
                tailleTotale: 1,
                supprimePar: "$deletedBy",
                nomComplet: "$deleter.nom",
                dateSuppression: "$deletedAt",
                motif: "$deletionMotif",
                departement: "$dept.nom",
                categorie: 1,
                expiresAt: 1,
                isRecoverable: {
                    $cond: {
                        if: { $gt: ["$expiresAt", new Date()] },
                        then: true,
                        else: false
                    }
                },
                daysUntilExpiration: {
                    $divide: [
                        { $subtract: ["$expiresAt", new Date()] },
                        86400000
                    ]
                }
            }}
        ]).toArray();

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
        console.error('Erreur getDeletedDossiers:', error);
        throw error;
    }
}

/**
 * E. Obtenir la liste des dossiers verrouillés
 */
async function getLockedDossiers(filters = {}) {
    try {
        const { period, startDate, endDate, page = 1, limit = 20 } = filters;
        const dateFilter = getPeriodFilter(period, startDate, endDate, 'lockedAt');

        const matchFilter = { locked: true, ...dateFilter };

        const total = await dossiersCollection.countDocuments(matchFilter);

        const lockedDossiers = await dossiersCollection.aggregate([
            { $match: matchFilter },
            { $sort: { lockedAt: -1 } },
            { $skip: (page - 1) * limit },
            { $limit: limit },
            { $lookup: {
                from: "departements",
                localField: "idDepartement",
                foreignField: "_id",
                as: "dept"
            }},
            { $unwind: { path: "$dept", preserveNullAndEmptyArrays: true } },
            { $lookup: {
                from: "users",
                localField: "lockedBy",
                foreignField: "username",
                as: "locker"
            }},
            { $unwind: { path: "$locker", preserveNullAndEmptyArrays: true } },
            { $project: {
                idDossier: 1,
                titre: 1,
                categorie: 1,
                nombreFichiers: 1,
                departement: "$dept.nom",
                verrouillePar: "$lockedBy",
                verrouilleurNom: "$locker.nom",
                dateVerrouillage: "$lockedAt",
                createdAt: 1
            }}
        ]).toArray();

        return {
            locked: lockedDossiers,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit)
            }
        };

    } catch (error) {
        console.error('Erreur getLockedDossiers:', error);
        throw error;
    }
}

/**
 * F. Restaurer un dossier depuis la corbeille
 */
async function restoreDossier(dossierId) {
    try {
        const { ObjectId } = require('mongodb');

        let dossierObjectId;
        try {
            dossierObjectId = new ObjectId(dossierId);
        } catch (e) {
            dossierObjectId = null;
        }

        const result = await dossiersCollection.updateOne(
            {
                $or: [
                    { _id: dossierObjectId },
                    { idDossier: dossierId }
                ]
            },
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
            }
        );

        return { success: result.modifiedCount > 0 };

    } catch (error) {
        console.error('Erreur restoreDossier:', error);
        throw error;
    }
}

/**
 * G. Supprimer définitivement un dossier
 */
async function permanentDeleteDossier(dossierId) {
    try {
        const { ObjectId } = require('mongodb');
        const fileStorage = require('../../services/fileStorageService');

        let dossierObjectId;
        try {
            dossierObjectId = new ObjectId(dossierId);
        } catch (e) {
            dossierObjectId = null;
        }

        // Récupérer le dossier pour supprimer les fichiers
        const dossier = await dossiersCollection.findOne({
            $or: [
                { _id: dossierObjectId },
                { idDossier: dossierId }
            ]
        });

        if (!dossier) {
            return { success: false, message: 'Dossier non trouvé' };
        }

        // Supprimer tous les fichiers/documents du stockage
        const documentsArray = dossier.documents || dossier.fichiers || [];
        if (documentsArray.length > 0) {
            for (const doc of documentsArray) {
                try {
                    fileStorage.deleteFile(doc.path);
                } catch (error) {
                    console.error(`Erreur suppression document ${doc.path}:`, error.message);
                }
            }
        }

        // Supprimer le dossier de la base
        const result = await dossiersCollection.deleteOne({
            $or: [
                { _id: dossierObjectId },
                { idDossier: dossierId }
            ]
        });

        return { success: result.deletedCount > 0 };

    } catch (error) {
        console.error('Erreur permanentDeleteDossier:', error);
        throw error;
    }
}

/**
 * H. Obtenir les statistiques d'activité sur les dossiers
 */
async function getDossiersActivity(filters = {}) {
    try {
        const { period, startDate, endDate } = filters;
        const dateFilter = getPeriodFilter(period, startDate, endDate, 'timestamp');

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

        // Documents supprimés de dossiers
        const documentsDeleted = await auditLogsCollection.countDocuments({
            action: 'DOCUMENT_DELETED',
            ...dateFilter
        });

        return {
            created,
            deleted,
            downloaded,
            consulted,
            documentsAdded,
            shared,
            documentsDeleted
        };

    } catch (error) {
        console.error('Erreur getDossiersActivity:', error);
        throw error;
    }
}

// ============================================
// EXPORTS
// ============================================

module.exports = {
    init,
    getDossiersStats,
    getAllDossiers,
    getDossierDetail,
    getDeletedDossiers,
    getLockedDossiers,
    restoreDossier,
    permanentDeleteDossier,
    getDossiersActivity
};
