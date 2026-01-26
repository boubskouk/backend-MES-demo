/**
 * ============================================
 * MODULE 2 : GESTION DES UTILISATEURS (SUPER ADMIN)
 * ============================================
 *
 * Fonctions pour gérer les utilisateurs depuis le dashboard Super Admin
 * - Liste complète avec enrichissement (dernière connexion, actions)
 * - Historique des actions utilisateur
 * - Blocage/déblocage
 * - Suppression
 * - Création d'utilisateurs
 */

const bcrypt = require('bcrypt');
const { ObjectId } = require('mongodb');

// Collections MongoDB
let usersCollection;
let rolesCollection;
let departementsCollection;
let auditLogsCollection;
let systemSettingsCollection;
let categoriesCollection;
let documentsCollection;

/**
 * Initialiser le module avec les collections MongoDB
 */
function init(collections) {
    usersCollection = collections.users;
    rolesCollection = collections.roles;
    departementsCollection = collections.departements;
    auditLogsCollection = collections.auditLogs;
    systemSettingsCollection = collections.systemSettings;
    categoriesCollection = collections.categories;
    documentsCollection = collections.documents;

    console.log('✅ Module Users (Super Admin) initialisé');
}

/**
 * Récupérer tous les utilisateurs avec enrichissement
 */
async function getAllUsers(filters = {}) {
    try {
        const { search = '', role = 'all', status = 'all', page = 1, limit = 20, period = 'all', startDate = null, endDate = null } = filters;

        // Vérifier le mode maintenance et récupérer la whitelist
        const maintenanceSettings = await systemSettingsCollection.findOne({ _id: 'maintenance' });
        const maintenanceMode = maintenanceSettings?.enabled || false;
        const whitelist = maintenanceSettings?.whitelist || [];

        // Calculer la période de filtrage
        let periodFilter = null;
        if (period !== 'all') {
            const now = new Date();
            let start = null;

            switch (period) {
                case 'today':
                    start = new Date(now.setHours(0, 0, 0, 0));
                    break;
                case '7days':
                    start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                    break;
                case '30days':
                    start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
                    break;
                case 'custom':
                    if (startDate && endDate) {
                        start = new Date(startDate);
                        const end = new Date(endDate);
                        end.setHours(23, 59, 59, 999);
                        periodFilter = { $gte: start, $lte: end };
                    }
                    break;
            }

            if (start && !periodFilter) {
                periodFilter = { $gte: start };
            }
        }

        // Construction du pipeline d'agrégation
        const pipeline = [];

        // 1. Lookup rôles
        pipeline.push({
            $lookup: {
                from: 'roles',
                localField: 'idRole',
                foreignField: '_id',
                as: 'roleData'
            }
        });

        pipeline.push({
            $unwind: {
                path: '$roleData',
                preserveNullAndEmptyArrays: true
            }
        });

        // 2. Lookup départements
        pipeline.push({
            $lookup: {
                from: 'departements',
                localField: 'idDepartement',
                foreignField: '_id',
                as: 'departementData'
            }
        });

        pipeline.push({
            $unwind: {
                path: '$departementData',
                preserveNullAndEmptyArrays: true
            }
        });

        // 3. Filtres
        const matchConditions = {};

        // Filtre de recherche (nom, email, username)
        if (search && search.trim() !== '') {
            matchConditions.$or = [
                { nom: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } },
                { username: { $regex: search, $options: 'i' } }
            ];
        }

        // Filtre par rôle
        if (role && role !== 'all') {
            matchConditions.idRole = new ObjectId(role);
        }

        // Filtre par statut
        if (status && status !== 'all') {
            console.log(`🔍 Backend - Filtre status reçu: "${status}"`);
            if (status === 'blocked') {
                matchConditions.blocked = true;
            } else if (status === 'active') {
                matchConditions.$or = [
                    { blocked: { $exists: false } },
                    { blocked: false }
                ];
            } else if (status === 'online') {
                // ✅ NOUVEAU: Filtrer uniquement les utilisateurs connectés
                matchConditions.isOnline = true;
                console.log('✅ Backend - Ajout du filtre isOnline: true');
            }
        }

        if (Object.keys(matchConditions).length > 0) {
            console.log('🔍 Backend - matchConditions finale:', JSON.stringify(matchConditions));
            pipeline.push({ $match: matchConditions });
        }

        // 4. Projection des champs
        pipeline.push({
            $project: {
                username: 1,
                nom: 1,
                email: 1,
                idRole: 1,
                idDepartement: 1,
                blocked: 1,
                blockedAt: 1,
                blockedBy: 1,
                blockedReason: 1,
                createdAt: 1,
                createdBy: 1,  // ✅ Qui a créé l'utilisateur
                isOnline: 1,  // ✅ Statut de connexion
                lastActivity: 1,  // ✅ Dernière activité
                lastDisconnection: 1,  // ✅ Date de déconnexion forcée
                disconnectedBy: 1,  // ✅ Qui a déconnecté l'utilisateur
                role: {
                    _id: '$roleData._id',
                    nom: '$roleData.nom',
                    niveau: '$roleData.niveau'
                },
                departement: {
                    _id: '$departementData._id',
                    nom: '$departementData.nom'
                }
            }
        });

        // 5. Tri par nom
        pipeline.push({ $sort: { nom: 1 } });

        // Exécuter la requête pour obtenir tous les résultats (pour stats)
        const allUsers = await usersCollection.aggregate(pipeline).toArray();
        console.log(`📊 Backend - Résultats de l'agrégation: ${allUsers.length} utilisateur(s) trouvé(s)`);

        // Calculer les statistiques
        const stats = {
            total: allUsers.length,
            active: allUsers.filter(u => !u.blocked).length,
            blocked: allUsers.filter(u => u.blocked === true).length
        };

        // 6. Pagination
        const skip = (page - 1) * limit;
        const paginatedUsers = allUsers.slice(skip, skip + limit);

        // 7. Enrichir chaque utilisateur avec les données d'audit
        const enrichedUsers = await Promise.all(
            paginatedUsers.map(async (user) => {
                // Construire le filtre de base pour cet utilisateur
                const userFilter = { user: user.username };

                // Ajouter le filtre de période si nécessaire
                const loginFilter = { ...userFilter, action: 'LOGIN_SUCCESS' };
                if (periodFilter) {
                    loginFilter.timestamp = periodFilter;
                }

                // Dernière connexion réussie (filtrée par période si nécessaire)
                const lastLogin = await auditLogsCollection.findOne(
                    loginFilter,
                    { sort: { timestamp: -1 } }
                );

                // Dernière déconnexion (filtrée par période si nécessaire)
                const logoutFilter = { ...userFilter, action: 'LOGOUT' };
                if (periodFilter) {
                    logoutFilter.timestamp = periodFilter;
                }
                const lastLogout = await auditLogsCollection.findOne(
                    logoutFilter,
                    { sort: { timestamp: -1 } }
                );

                // Nombre de connexions (filtrées par période si nécessaire)
                const loginCount = await auditLogsCollection.countDocuments(loginFilter);

                // Filtre pour les actions sur documents
                const actionsFilter = {
                    user: user.username,
                    action: {
                        $in: [
                            'DOCUMENT_ARCHIVED',       // Archivage
                            'DOCUMENT_DELETED',        // Suppression
                            'DOCUMENT_SHARED',         // Partage
                            'DOCUMENT_DOWNLOADED',     // Téléchargement
                            'DOCUMENT_VIEWED',         // Prévisualisation
                            'DOCUMENT_VERROUILLE',     // Verrouillage
                            'DOCUMENT_DEVERROUILLE'    // Déverrouillage
                        ]
                    }
                };

                if (periodFilter) {
                    actionsFilter.timestamp = periodFilter;
                }

                // Nombre total d'actions (filtrées par période)
                const actionsCount = await auditLogsCollection.countDocuments(actionsFilter);

                // 20 dernières actions (filtrées par période)
                const lastActions = await auditLogsCollection
                    .find(actionsFilter)
                    .sort({ timestamp: -1 })
                    .limit(20)
                    .toArray();

                return {
                    ...user,
                    lastLogin: lastLogin ? lastLogin.timestamp : null,
                    lastLogout: lastLogout ? lastLogout.timestamp : null,
                    loginCount,
                    actionsCount,
                    lastActions: lastActions.map(action => ({
                        action: action.action,
                        timestamp: action.timestamp,
                        ip: action.ip,
                        documentId: action.details?.documentId || action.documentId || null,
                        documentTitle: action.details?.titre || action.details?.title || null,
                        sharedWith: action.details?.sharedWith || null  // Pour l'action DOCUMENT_SHARED
                    })),
                    status: user.blocked ? 'blocked' : 'active',
                    hasActivityInPeriod: periodFilter ? (loginCount > 0 || actionsCount > 0) : true,
                    inMaintenanceWhitelist: maintenanceMode ? whitelist.includes(user.username) : false
                };
            })
        );

        // Si un filtre de période est actif, ne garder que les utilisateurs avec activité
        const finalUsers = periodFilter
            ? enrichedUsers.filter(u => u.hasActivityInPeriod)
            : enrichedUsers;

        // 8. Calcul de la pagination
        const totalPages = Math.ceil((periodFilter ? finalUsers.length : allUsers.length) / limit);

        // Recalculer les stats si un filtre de période est actif OU si mode maintenance actif
        const finalStats = (periodFilter || maintenanceMode) ? {
            total: finalUsers.length,
            active: maintenanceMode
                ? finalUsers.filter(u => u.inMaintenanceWhitelist).length
                : finalUsers.filter(u => !u.blocked).length,
            blocked: maintenanceMode
                ? finalUsers.filter(u => !u.inMaintenanceWhitelist).length
                : finalUsers.filter(u => u.blocked === true).length
        } : stats;

        return {
            users: finalUsers,
            stats: finalStats,
            pagination: {
                page,
                totalPages,
                totalUsers: periodFilter ? finalUsers.length : allUsers.length,
                limit
            },
            periodApplied: periodFilter !== null
        };

    } catch (error) {
        console.error('❌ Erreur getAllUsers:', error);
        throw error;
    }
}

/**
 * Récupérer l'historique complet d'un utilisateur
 */
async function getUserHistory(username, options = {}) {
    try {
        const { page = 1, limit = 50 } = options;

        // Actions utilisateurs uniquement (LOGIN, LOGOUT, PASSWORD_CHANGED)
        const allowedActions = [
            'LOGIN_SUCCESS',
            'LOGIN_FAILED',
            'LOGOUT',
            'PASSWORD_CHANGED'
        ];

        const query = {
            user: username,
            action: { $in: allowedActions }
        };

        // Total des actions
        const totalActions = await auditLogsCollection.countDocuments(query);

        // Pagination
        const skip = (page - 1) * limit;

        // Récupérer l'historique
        const history = await auditLogsCollection
            .find(query)
            .sort({ timestamp: -1 })
            .skip(skip)
            .limit(limit)
            .toArray();

        const totalPages = Math.ceil(totalActions / limit);

        return {
            history: history.map(entry => ({
                action: entry.action,
                timestamp: entry.timestamp,
                ip: entry.ip,
                userAgent: entry.userAgent,
                details: entry.details
            })),
            pagination: {
                page,
                totalPages,
                totalActions,
                limit
            }
        };

    } catch (error) {
        console.error('❌ Erreur getUserHistory:', error);
        throw error;
    }
}

/**
 * Bloquer un utilisateur
 */
async function blockUser(username, blockedBy, reason) {
    try {
        // 1. Vérifier que l'utilisateur existe
        const user = await usersCollection.findOne({ username });

        if (!user) {
            throw new Error(`Utilisateur "${username}" introuvable`);
        }

        // 2. Récupérer le rôle de l'utilisateur
        const role = await rolesCollection.findOne({ _id: user.idRole });

        // 3. PROTECTION : Ne jamais bloquer un niveau 0
        if (role && role.niveau === 0) {
            throw new Error('Impossible de bloquer un Super Administrateur (Niveau 0)');
        }

        // 4. PROTECTION : Ne pas se bloquer soi-même
        if (username === blockedBy) {
            throw new Error('Vous ne pouvez pas vous bloquer vous-même');
        }

        // 5. Mettre à jour l'utilisateur
        const result = await usersCollection.updateOne(
            { username },
            {
                $set: {
                    blocked: true,
                    blockedAt: new Date(),
                    blockedBy,
                    blockedReason: reason
                }
            }
        );

        if (result.modifiedCount === 0) {
            throw new Error('Échec du blocage de l\'utilisateur');
        }

        // 6. Si le mode maintenance est actif, retirer de la whitelist
        const maintenanceSettings = await systemSettingsCollection.findOne({ _id: 'maintenance' });
        if (maintenanceSettings && maintenanceSettings.enabled === true) {
            await systemSettingsCollection.updateOne(
                { _id: 'maintenance' },
                { $pull: { whitelist: username } }
            );
            console.log(`🔧 Utilisateur "${username}" retiré de la whitelist de maintenance`);
        }

        // 7. Logger l'action
        await auditLogsCollection.insertOne({
            timestamp: new Date(),
            user: blockedBy,
            action: 'USER_BLOCKED',
            details: {
                targetUser: username,
                reason
            },
            ip: null,
            userAgent: null
        });

        console.log(`✅ Utilisateur "${username}" bloqué par "${blockedBy}"`);

        return { success: true };

    } catch (error) {
        console.error('❌ Erreur blockUser:', error);
        throw error;
    }
}

/**
 * Débloquer un utilisateur
 */
async function unblockUser(username, unblockedBy) {
    try {
        // 1. Vérifier que l'utilisateur existe
        const user = await usersCollection.findOne({ username });

        if (!user) {
            throw new Error(`Utilisateur "${username}" introuvable`);
        }

        // 2. Mettre à jour l'utilisateur
        const result = await usersCollection.updateOne(
            { username },
            {
                $set: {
                    blocked: false,
                    unblockedAt: new Date(),
                    unblockedBy
                },
                $unset: {
                    blockedReason: ''
                }
            }
        );

        if (result.modifiedCount === 0) {
            throw new Error('Échec du déblocage de l\'utilisateur');
        }

        // 3. Si le mode maintenance est actif, ajouter à la whitelist
        const maintenanceSettings = await systemSettingsCollection.findOne({ _id: 'maintenance' });
        if (maintenanceSettings && maintenanceSettings.enabled === true) {
            await systemSettingsCollection.updateOne(
                { _id: 'maintenance' },
                {
                    $addToSet: { whitelist: username } // $addToSet évite les doublons
                }
            );
            console.log(`🔧 Utilisateur "${username}" ajouté à la whitelist de maintenance`);
        }

        // 4. Logger l'action
        await auditLogsCollection.insertOne({
            timestamp: new Date(),
            user: unblockedBy,
            action: 'USER_UNBLOCKED',
            details: {
                targetUser: username
            },
            ip: null,
            userAgent: null
        });

        console.log(`✅ Utilisateur "${username}" débloqué par "${unblockedBy}"`);

        return { success: true };

    } catch (error) {
        console.error('❌ Erreur unblockUser:', error);
        throw error;
    }
}

/**
 * Supprimer un utilisateur
 */
async function deleteUser(username, deletedBy) {
    try {
        // 1. Vérifier que l'utilisateur existe
        const user = await usersCollection.findOne({ username });

        if (!user) {
            throw new Error(`Utilisateur "${username}" introuvable`);
        }

        // 2. Récupérer le rôle de l'utilisateur
        const role = await rolesCollection.findOne({ _id: user.idRole });

        // 3. PROTECTION : Ne jamais supprimer un niveau 0
        if (role && role.niveau === 0) {
            throw new Error('Impossible de supprimer un Super Administrateur (Niveau 0)');
        }

        // 4. PROTECTION : Ne pas se supprimer soi-même
        if (username === deletedBy) {
            throw new Error('Vous ne pouvez pas vous supprimer vous-même');
        }

        // 5. Supprimer les documents de l'utilisateur
        await documentsCollection.deleteMany({ idUtilisateur: username });

        // 6. Supprimer les catégories PERSONNELLES de l'utilisateur
        // ✅ Les catégories du département persistent même après suppression
        await categoriesCollection.deleteMany({
            idUtilisateur: username,
            idDepartement: { $exists: false } // Seulement les catégories sans département
        });

        // 7. Supprimer l'utilisateur
        const result = await usersCollection.deleteOne({ username });

        if (result.deletedCount === 0) {
            throw new Error('Échec de la suppression de l\'utilisateur');
        }

        // 8. Logger l'action
        await auditLogsCollection.insertOne({
            timestamp: new Date(),
            user: deletedBy,
            action: 'USER_DELETED_BY_SUPERADMIN',
            details: {
                targetUser: username,
                deletedUserData: {
                    nom: user.nom,
                    email: user.email,
                    role: role ? role.nom : 'Inconnu'
                }
            },
            ip: null,
            userAgent: null
        });

        console.log(`✅ Utilisateur "${username}" supprimé par "${deletedBy}"`);

        return { success: true };

    } catch (error) {
        console.error('❌ Erreur deleteUser:', error);
        throw error;
    }
}

/**
 * Créer un nouvel utilisateur
 */
async function createUser(userData, createdBy) {
    try {
        const { username, nom, email, idRole, idDepartement } = userData;

        // 1. Validation des données
        if (!username || !nom || !email || !idRole) {
            throw new Error('Tous les champs sont requis (username, nom, email, idRole)');
        }

        // 2. Vérifier unicité username
        const existingUsername = await usersCollection.findOne({ username });
        if (existingUsername) {
            throw new Error(`Le nom d'utilisateur "${username}" existe déjà`);
        }

        // 3. Vérifier unicité email
        const existingEmail = await usersCollection.findOne({ email });
        if (existingEmail) {
            throw new Error(`L'email "${email}" est déjà utilisé`);
        }

        // 4. Vérifier que le rôle existe
        const role = await rolesCollection.findOne({ _id: new ObjectId(idRole) });
        if (!role) {
            throw new Error('Rôle invalide');
        }

        // 5. Vérifier que le département existe (si fourni)
        if (idDepartement) {
            const dept = await departementsCollection.findOne({ _id: new ObjectId(idDepartement) });
            if (!dept) {
                throw new Error('Département invalide');
            }
        }

        // 6. Hasher le mot de passe par défaut "1234"
        const hashedPassword = await bcrypt.hash('1234', 10);

        // 7. Créer l'utilisateur
        const newUser = {
            username,
            nom,
            email,
            password: hashedPassword,
            idRole: new ObjectId(idRole),
            idDepartement: idDepartement ? new ObjectId(idDepartement) : null,
            firstLogin: true,
            mustChangePassword: true,
            blocked: false,
            createdAt: new Date(),
            createdBy
        };

        const result = await usersCollection.insertOne(newUser);

        if (!result.insertedId) {
            throw new Error('Échec de la création de l\'utilisateur');
        }

        // 8. Logger l'action
        await auditLogsCollection.insertOne({
            timestamp: new Date(),
            user: createdBy,
            action: 'USER_CREATED_BY_SUPERADMIN',
            details: {
                newUser: username,
                nom,
                email,
                role: role.nom
            },
            ip: null,
            userAgent: null
        });

        console.log(`✅ Utilisateur "${username}" créé par "${createdBy}"`);

        return {
            ...newUser,
            _id: result.insertedId,
            role,
            defaultPassword: '1234'
        };

    } catch (error) {
        console.error('❌ Erreur createUser:', error);
        throw error;
    }
}

module.exports = {
    init,
    getAllUsers,
    getUserHistory,
    blockUser,
    unblockUser,
    deleteUser,
    createUser
};
