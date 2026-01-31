/**
 * ============================================
 * MODULE DASHBOARD - SUPER ADMIN
 * ============================================
 *
 * Fournit les statistiques et métriques pour le dashboard
 */

const os = require('os');

// Collections
let usersCollection;
let documentsCollection;
let dossiersCollection;
let rolesCollection;
let departementsCollection;
let auditLogsCollection;

/**
 * Initialiser le module
 */
function init(collections) {
    usersCollection = collections.users;
    documentsCollection = collections.documents;
    dossiersCollection = collections.dossiers;
    rolesCollection = collections.roles;
    departementsCollection = collections.departements;
    auditLogsCollection = collections.auditLogs;

    console.log('✅ Module Dashboard initialisé');
}

/**
 * Obtenir les statistiques globales
 */
async function getGlobalStats() {
    try {
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const thisWeekStart = new Date(today);
        thisWeekStart.setDate(today.getDate() - 7);
        const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);

        // Statistiques utilisateurs
        const totalUsers = await usersCollection.countDocuments({});
        const usersByLevel = await usersCollection.aggregate([
            {
                $lookup: {
                    from: 'roles',
                    localField: 'idRole',
                    foreignField: '_id',
                    as: 'role'
                }
            },
            { $unwind: '$role' },
            {
                $group: {
                    _id: '$role.niveau',
                    count: { $sum: 1 }
                }
            }
        ]).toArray();

        const levelCounts = {
            niveau0: 0,
            niveau1: 0,
            niveau2: 0,
            niveau3: 0
        };

        usersByLevel.forEach(item => {
            levelCounts[`niveau${item._id}`] = item.count;
        });

        // Utilisateurs actifs
        const activeToday = await usersCollection.countDocuments({
            derniereConnexion: { $gte: today }
        });

        const activeThisWeek = await usersCollection.countDocuments({
            derniereConnexion: { $gte: thisWeekStart }
        });

        const newThisMonth = await usersCollection.countDocuments({
            dateCreation: { $gte: thisMonthStart }
        });

        // Statistiques documents (depuis les dossiers)
        // Compter les documents dans les tableaux documents[] et fichiers[] des dossiers
        const dossiers = await dossiersCollection.find({
            $or: [
                { deleted: { $exists: false } },
                { deleted: false }
            ]
        }).toArray();

        let totalDocuments = 0;
        let docsCreatedToday = 0;
        let docsCreatedThisWeek = 0;
        let docsCreatedThisMonth = 0;

        for (const dossier of dossiers) {
            const docs = dossier.documents || dossier.fichiers || [];
            totalDocuments += docs.length;

            for (const doc of docs) {
                const docDate = new Date(doc.dateAjout || dossier.createdAt);
                if (docDate >= today) docsCreatedToday++;
                if (docDate >= thisWeekStart) docsCreatedThisWeek++;
                if (docDate >= thisMonthStart) docsCreatedThisMonth++;
            }
        }

        // Documents par département (depuis dossiers)
        const docsByDepartment = await dossiersCollection.aggregate([
            {
                $match: {
                    $or: [
                        { deleted: { $exists: false } },
                        { deleted: false }
                    ]
                }
            },
            {
                $project: {
                    departement: '$departementArchivage',
                    nombreDocuments: {
                        $add: [
                            { $size: { $ifNull: ['$documents', []] } },
                            { $size: { $ifNull: ['$fichiers', []] } }
                        ]
                    }
                }
            },
            {
                $group: {
                    _id: '$departement',
                    count: { $sum: '$nombreDocuments' }
                }
            },
            { $sort: { count: -1 } },
            { $limit: 10 }
        ]).toArray();

        // Documents par catégorie (depuis dossiers)
        const docsByCategory = await dossiersCollection.aggregate([
            {
                $match: {
                    $or: [
                        { deleted: { $exists: false } },
                        { deleted: false }
                    ]
                }
            },
            {
                $project: {
                    categorie: 1,
                    nombreDocuments: {
                        $add: [
                            { $size: { $ifNull: ['$documents', []] } },
                            { $size: { $ifNull: ['$fichiers', []] } }
                        ]
                    }
                }
            },
            {
                $group: {
                    _id: '$categorie',
                    count: { $sum: '$nombreDocuments' }
                }
            },
            { $sort: { count: -1 } },
            { $limit: 10 }
        ]).toArray();

        // Ressources système
        const systemResources = getSystemResources();

        // Activité système (depuis audit logs si disponible)
        let systemActivity = {
            requestsToday: 0,
            uploadsToday: 0,
            downloadsToday: 0,
            errorsToday: 0
        };

        // Compter les actions d'aujourd'hui dans audit logs
        const actionsToday = await auditLogsCollection.find({
            timestamp: { $gte: today }
        }).toArray();

        systemActivity.requestsToday = actionsToday.length;
        systemActivity.uploadsToday = actionsToday.filter(a => a.action === 'UPLOAD' || a.action === 'CREATE_DOCUMENT').length;
        systemActivity.downloadsToday = actionsToday.filter(a => a.action === 'DOWNLOAD' || a.action === 'DOWNLOAD_DOCUMENT').length;
        systemActivity.errorsToday = actionsToday.filter(a => a.result === 'error' || a.result === 'failure').length;

        // Événements de sécurité récents
        const securityEvents = await auditLogsCollection.aggregate([
            {
                $match: {
                    timestamp: { $gte: today },
                    action: {
                        $in: [
                            'UNAUTHORIZED_SUPERADMIN_ACCESS',
                            'LOGIN_FAILED',
                            'RATE_LIMIT_EXCEEDED'
                        ]
                    }
                }
            },
            {
                $group: {
                    _id: '$action',
                    count: { $sum: 1 },
                    lastOccurrence: { $max: '$timestamp' }
                }
            }
        ]).toArray();

        return {
            users: {
                total: totalUsers,
                activeToday: activeToday,
                activeThisWeek: activeThisWeek,
                newThisMonth: newThisMonth,
                byLevel: levelCounts
            },
            documents: {
                total: totalDocuments,
                createdToday: docsCreatedToday,
                createdThisWeek: docsCreatedThisWeek,
                createdThisMonth: docsCreatedThisMonth,
                byDepartment: docsByDepartment.reduce((acc, item) => {
                    acc[item._id || 'Sans département'] = item.count;
                    return acc;
                }, {}),
                byCategory: docsByCategory.reduce((acc, item) => {
                    acc[item._id || 'Sans catégorie'] = item.count;
                    return acc;
                }, {})
            },
            system: {
                resources: systemResources,
                activity: systemActivity
            },
            security: {
                events: securityEvents.map(e => ({
                    type: e._id,
                    count: e.count,
                    lastOccurrence: e.lastOccurrence
                })),
                activeAlerts: securityEvents.length
            },
            timestamp: new Date()
        };

    } catch (error) {
        console.error('❌ Erreur getGlobalStats:', error);
        throw error;
    }
}

/**
 * Obtenir les ressources système
 */
function getSystemResources() {
    try {
        const totalMem = os.totalmem();
        const freeMem = os.freemem();
        const usedMem = totalMem - freeMem;

        const cpus = os.cpus();
        const loadAvg = os.loadavg();

        // Calculer l'utilisation CPU (approximation)
        const cpuUsage = Math.min(100, Math.round((loadAvg[0] / cpus.length) * 100));

        return {
            cpu: {
                usage: cpuUsage,
                cores: cpus.length,
                model: cpus[0].model,
                loadAverage: loadAvg.map(l => Math.round(l * 100) / 100)
            },
            memory: {
                total: formatBytes(totalMem),
                used: formatBytes(usedMem),
                free: formatBytes(freeMem),
                percentage: Math.round((usedMem / totalMem) * 100)
            },
            uptime: {
                system: Math.floor(os.uptime()),
                process: Math.floor(process.uptime())
            }
        };
    } catch (error) {
        console.error('❌ Erreur getSystemResources:', error);
        return null;
    }
}

/**
 * Obtenir les tendances (graphiques)
 */
async function getTrends(type, period) {
    try {
        const now = new Date();
        let startDate;
        let groupBy;

        // Déterminer la période
        switch(period) {
            case '7d':
                startDate = new Date(now);
                startDate.setDate(now.getDate() - 7);
                groupBy = { $dayOfYear: '$timestamp' };
                break;
            case '30d':
                startDate = new Date(now);
                startDate.setDate(now.getDate() - 30);
                groupBy = { $dayOfYear: '$timestamp' };
                break;
            case '24h':
            default:
                startDate = new Date(now);
                startDate.setHours(now.getHours() - 24);
                groupBy = { $hour: '$timestamp' };
                break;
        }

        if (type === 'users') {
            // Activité utilisateurs
            const activity = await auditLogsCollection.aggregate([
                {
                    $match: {
                        timestamp: { $gte: startDate },
                        action: { $in: ['LOGIN', 'LOGIN_SUCCESS'] }
                    }
                },
                {
                    $group: {
                        _id: groupBy,
                        count: { $sum: 1 },
                        users: { $addToSet: '$user' }
                    }
                },
                { $sort: { _id: 1 } }
            ]).toArray();

            return activity.map(item => ({
                period: item._id,
                count: item.users.length
            }));

        } else if (type === 'documents') {
            // Documents créés
            const docs = await documentsCollection.aggregate([
                {
                    $match: {
                        dateCreation: { $gte: startDate }
                    }
                },
                {
                    $group: {
                        _id: groupBy,
                        count: { $sum: 1 }
                    }
                },
                { $sort: { _id: 1 } }
            ]).toArray();

            return docs.map(item => ({
                period: item._id,
                count: item.count
            }));
        }

        return [];

    } catch (error) {
        console.error('❌ Erreur getTrends:', error);
        throw error;
    }
}

/**
 * Formater les bytes
 */
function formatBytes(bytes) {
    if (bytes === 0) return '0 B';

    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

module.exports = {
    init,
    getGlobalStats,
    getTrends
};
