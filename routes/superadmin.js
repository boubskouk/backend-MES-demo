/**
 * ============================================
 * ROUTES API SUPER ADMIN
 * ============================================
 *
 * Toutes les routes nécessitent le niveau 0 (middleware requireSuperAdmin)
 */

const express = require('express');
const router = express.Router();

// Middleware
const { requireSuperAdmin, logAction } = require('../middleware/superAdminAuth');

// Modules
const dashboardModule = require('../modules/superadmin/dashboard');
const usersModule = require('../modules/superadmin/users');
const documentsModule = require('../modules/superadmin/documents');
const dossiersModule = require('../modules/superadmin/dossiers');
const departmentsModule = require('../modules/superadmin/departments');

// Collections (injectées depuis server.js)
let db;
let collections;

/**
 * Initialiser les routes avec les collections
 */
function init(database, cols) {
    db = database;
    collections = cols;

    // Initialiser les modules
    dashboardModule.init(collections);
    usersModule.init(collections);
    documentsModule.init(collections);
    dossiersModule.init(collections);
    departmentsModule.init(collections);

    console.log('Routes Super Admin initialisees');
}

// ============================================
// ROUTES GÉNÉRALES
// ============================================

/**
 * GET /api/superadmin/current-user
 * Obtenir l'utilisateur connecté
 */
router.get('/current-user', requireSuperAdmin, async (req, res) => {
    try {
        res.json({
            success: true,
            username: req.superAdmin.username,
            nom: req.superAdmin.nom,
            email: req.superAdmin.email
        });
    } catch (error) {
        console.error('❌ Erreur current-user:', error);
        res.status(500).json({ success: false, message: "Erreur serveur" });
    }
});

// ============================================
// ROUTES DASHBOARD
// ============================================

/**
 * GET /api/superadmin/dashboard/stats
 * Obtenir les statistiques globales du système
 */
router.get('/dashboard/stats', requireSuperAdmin, async (req, res) => {
    try {
        console.log(`📊 Récupération stats dashboard pour: ${req.session.userId}`);

        const stats = await dashboardModule.getGlobalStats();

        res.json({
            success: true,
            data: stats
        });

    } catch (error) {
        console.error('❌ Erreur dashboard/stats:', error);
        res.status(500).json({
            success: false,
            message: "Erreur lors de la récupération des statistiques",
            error: process.env.NODE_ENV === 'production' ? undefined : error.message
        });
    }
});

/**
 * GET /api/superadmin/dashboard/trends
 * Obtenir les tendances pour les graphiques
 */
router.get('/dashboard/trends', requireSuperAdmin, async (req, res) => {
    try {
        const { type, period } = req.query;

        if (!type) {
            return res.status(400).json({
                success: false,
                message: "Le paramètre 'type' est requis (users, documents)"
            });
        }

        console.log(`📈 Récupération trends: type=${type}, period=${period}`);

        const trends = await dashboardModule.getTrends(type, period || '24h');

        res.json({
            success: true,
            data: trends
        });

    } catch (error) {
        console.error('❌ Erreur dashboard/trends:', error);
        res.status(500).json({
            success: false,
            message: "Erreur lors de la récupération des tendances",
            error: process.env.NODE_ENV === 'production' ? undefined : error.message
        });
    }
});

// ============================================
// MODULE 2 : GESTION DES UTILISATEURS
// ============================================

/**
 * GET /api/superadmin/users
 * Liste tous les utilisateurs avec données enrichies
 */
router.get('/users', requireSuperAdmin, async (req, res) => {
    try {
        const { search, role, status, page = 1, period = 'all', startDate, endDate } = req.query;

        const filters = {
            search,
            role,
            status,
            page: parseInt(page),
            limit: 15,
            period,
            startDate,
            endDate
        };

        const result = await usersModule.getAllUsers(filters);

        // Logger l'accès
        await logAction(req.superAdmin.username, 'SUPERADMIN_VIEW_USERS_LIST',
            { filters }, {}, req);

        res.json({
            success: true,
            data: result
        });

    } catch (error) {
        console.error('❌ Erreur /users:', error);
        res.status(500).json({
            success: false,
            message: "Erreur lors de la récupération des utilisateurs"
        });
    }
});

/**
 * GET /api/superadmin/users/:username/history
 * Historique complet des actions d'un utilisateur
 */
router.get('/users/:username/history', requireSuperAdmin, async (req, res) => {
    try {
        const { username } = req.params;
        const { page = 1, limit = 50 } = req.query;

        const result = await usersModule.getUserHistory(username, {
            page: parseInt(page),
            limit: parseInt(limit)
        });

        await logAction(req.superAdmin.username, 'SUPERADMIN_VIEW_USER_HISTORY',
            { targetUser: username }, {}, req);

        res.json({
            success: true,
            data: result
        });

    } catch (error) {
        console.error('❌ Erreur /users/:username/history:', error);
        res.status(500).json({
            success: false,
            message: "Erreur lors de la récupération de l'historique"
        });
    }
});

/**
 * POST /api/superadmin/users/:username/block
 * Bloquer un utilisateur
 */
router.post('/users/:username/block', requireSuperAdmin, async (req, res) => {
    try {
        const { username } = req.params;
        const { reason } = req.body;

        if (!reason) {
            return res.status(400).json({
                success: false,
                message: "La raison du blocage est requise"
            });
        }

        await usersModule.blockUser(username, req.superAdmin.username, reason);

        res.json({
            success: true,
            message: `Utilisateur ${username} bloqué avec succès`
        });

    } catch (error) {
        console.error('❌ Erreur block user:', error);
        res.status(403).json({
            success: false,
            message: error.message || "Erreur lors du blocage"
        });
    }
});

/**
 * POST /api/superadmin/users/:username/unblock
 * Débloquer un utilisateur
 */
router.post('/users/:username/unblock', requireSuperAdmin, async (req, res) => {
    try {
        const { username } = req.params;

        await usersModule.unblockUser(username, req.superAdmin.username);

        res.json({
            success: true,
            message: `Utilisateur ${username} débloqué avec succès`
        });

    } catch (error) {
        console.error('❌ Erreur unblock user:', error);
        res.status(500).json({
            success: false,
            message: "Erreur lors du déblocage"
        });
    }
});

/**
 * POST /api/superadmin/users/:username/disconnect
 * Déconnecter un utilisateur individuellement
 */
router.post('/users/:username/disconnect', requireSuperAdmin, async (req, res) => {
    try {
        const { username } = req.params;

        // Récupérer l'utilisateur pour obtenir son sessionID
        const user = await collections.users.findOne({ username });

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "Utilisateur non trouvé"
            });
        }

        // Mettre à jour l'utilisateur : offline + supprimer sessionID + enregistrer la déconnexion
        const disconnectionDate = new Date();
        await collections.users.updateOne(
            { username },
            {
                $set: {
                    isOnline: false,
                    lastActivity: disconnectionDate,
                    lastDisconnection: disconnectionDate,
                    disconnectedBy: req.superAdmin.username
                },
                $unset: { sessionID: "" }
            }
        );

        // Détruire la session MongoDB si elle existe
        if (user.sessionID) {
            const db = getDB();
            const sessionsCollection = db.collection('sessions');
            await sessionsCollection.deleteOne({ _id: user.sessionID });
        }

        // Enregistrer dans les logs d'audit
        await collections.auditLogs.insertOne({
            action: 'USER_DISCONNECTED',
            userId: req.superAdmin.username,
            targetUser: username,
            targetUserName: user.nom,
            details: `Déconnexion forcée de ${user.nom} (@${username})`,
            ip: req.ip || req.connection.remoteAddress,
            timestamp: disconnectionDate,
            severity: 'WARNING'
        });

        res.json({
            success: true,
            message: `Utilisateur ${username} déconnecté avec succès`
        });

    } catch (error) {
        console.error('❌ Erreur disconnect user:', error);
        res.status(500).json({
            success: false,
            message: "Erreur lors de la déconnexion"
        });
    }
});

/**
 * DELETE /api/superadmin/users/:username
 * Supprimer un utilisateur
 */
router.delete('/users/:username', requireSuperAdmin, async (req, res) => {
    try {
        const { username } = req.params;

        await usersModule.deleteUser(username, req.superAdmin.username);

        res.json({
            success: true,
            message: `Utilisateur ${username} supprimé avec succès`
        });

    } catch (error) {
        console.error('❌ Erreur delete user:', error);
        res.status(403).json({
            success: false,
            message: error.message || "Erreur lors de la suppression"
        });
    }
});

/**
 * POST /api/superadmin/users
 * Créer un nouvel utilisateur
 */
router.post('/users', requireSuperAdmin, async (req, res) => {
    try {
        const { username, nom, email, idRole, idDepartement } = req.body;

        // Validation
        if (!username || !nom || !email || !idRole || !idDepartement) {
            return res.status(400).json({
                success: false,
                message: "Tous les champs sont requis (username, nom, email, idRole, idDepartement)"
            });
        }

        const newUser = await usersModule.createUser({
            username,
            nom,
            email,
            idRole,
            idDepartement
        }, req.superAdmin.username);

        res.json({
            success: true,
            message: "Utilisateur créé avec succès",
            data: {
                user: newUser,
                defaultPassword: "1234"
            }
        });

    } catch (error) {
        console.error('❌ Erreur create user:', error);
        res.status(400).json({
            success: false,
            message: error.message || "Erreur lors de la création"
        });
    }
});

/**
 * GET /api/superadmin/test
 * Route de test pour vérifier l'authentification
 */
router.get('/test', requireSuperAdmin, async (req, res) => {
    try {
        res.json({
            success: true,
            message: "Authentification Super Admin réussie !",
            user: {
                username: req.superAdmin.username,
                niveau: req.superAdmin.role.niveau,
                role: req.superAdmin.role.nom
            }
        });
    } catch (error) {
        console.error('❌ Erreur test:', error);
        res.status(500).json({
            success: false,
            message: "Erreur serveur"
        });
    }
});

/**
 * GET /api/superadmin/analyze-sessions
 * Analyser les sessions actives et détecter les incohérences
 */
router.get('/analyze-sessions', requireSuperAdmin, async (req, res) => {
    try {
        // Récupérer toutes les sessions actives depuis le store
        const allSessions = await new Promise((resolve, reject) => {
            req.sessionStore.all((err, sessions) => {
                if (err) reject(err);
                else resolve(sessions || []);
            });
        });

        // Extraire les userIds des sessions actives
        const activeUserIds = allSessions
            .filter(s => s && s.userId)
            .map(s => s.userId);

        // Récupérer tous les utilisateurs marqués comme en ligne
        const usersMarkedOnline = await collections.users.find({
            isOnline: true
        }).toArray();

        // Récupérer les utilisateurs vraiment en ligne (qui ont une session active)
        const reallyOnlineUsers = await collections.users.find({
            sessionID: { $exists: true, $ne: null }
        }).toArray();

        // Détecter les faux positifs (isOnline = true mais pas de session active)
        const falsePositives = usersMarkedOnline.filter(user => {
            return !activeUserIds.includes(user.username) && !user.sessionID;
        });

        const analysis = {
            totalSessionsInDB: allSessions.length,
            usersMarkedOnline: usersMarkedOnline.length,
            reallyOnline: reallyOnlineUsers.length,
            falsePositives: falsePositives.length
        };

        const recommendation = falsePositives.length > 0
            ? `⚠️ ${falsePositives.length} utilisateur(s) marqué(s) en ligne sans session active. Correction recommandée.`
            : '✅ Toutes les sessions sont cohérentes. Aucune action nécessaire.';

        await logAction(req.superAdmin.username, 'ANALYZE_SESSIONS', analysis, {}, req);

        res.json({
            success: true,
            analysis,
            recommendation,
            reallyOnline: reallyOnlineUsers.map(u => ({
                username: u.username,
                nom: u.nom,
                niveau: u.role?.niveau,
                lastActivity: u.lastActivity,
                sessionID: u.sessionID
            })),
            falsePositives: falsePositives.map(u => ({
                username: u.username,
                nom: u.nom,
                niveau: u.role?.niveau,
                lastActivity: u.lastActivity
            }))
        });

    } catch (error) {
        console.error('❌ Erreur analyze-sessions:', error);
        res.status(500).json({
            success: false,
            message: "Erreur lors de l'analyse des sessions"
        });
    }
});

// ============================================
// MODULE MESSAGERIE
// ============================================

/**
 * GET /api/superadmin/messages
 * Récupérer les messages du super admin
 */
router.get('/messages', requireSuperAdmin, async (req, res) => {
    try {
        const username = req.superAdmin.username;

        // Récupérer les messages reçus
        const received = await collections.messages.find({
            to: username
        }).sort({ createdAt: -1 }).limit(100).toArray();

        // Récupérer les messages envoyés
        const sent = await collections.messages.find({
            from: username
        }).sort({ createdAt: -1 }).limit(100).toArray();

        res.json({
            success: true,
            received,
            sent,
            total: received.length + sent.length
        });

    } catch (error) {
        console.error('❌ Erreur /messages:', error);
        res.status(500).json({
            success: false,
            message: "Erreur lors de la récupération des messages"
        });
    }
});

/**
 * POST /api/superadmin/messages/send
 * Envoyer un message en tant que super admin
 */
router.post('/messages/send', requireSuperAdmin, async (req, res) => {
    try {
        const { to, body, subject, type } = req.body;
        const from = req.superAdmin.username;

        if (!to || !body) {
            return res.status(400).json({
                success: false,
                message: "Destinataire et message requis"
            });
        }

        // Vérifier que le destinataire existe
        const recipient = await collections.users.findOne({ username: to });
        if (!recipient) {
            return res.status(404).json({
                success: false,
                message: "Destinataire non trouvé"
            });
        }

        // Créer le message
        const message = {
            from,
            fromName: req.superAdmin.nom || 'Super Admin',
            to,
            toName: recipient.nom,
            subject: subject || '',
            body,
            type: type || 'normal',
            read: false,
            createdAt: new Date()
        };

        await collections.messages.insertOne(message);

        await logAction(from, 'MESSAGE_SENT', { to, type }, {}, req);

        console.log(`📨 Message envoyé par Super Admin: ${from} → ${to}`);

        res.json({
            success: true,
            message: "Message envoyé avec succès"
        });

    } catch (error) {
        console.error('❌ Erreur /messages/send:', error);
        res.status(500).json({
            success: false,
            message: "Erreur lors de l'envoi du message"
        });
    }
});

/**
 * GET /api/superadmin/users-level1
 * Récupérer la liste des utilisateurs niveau 1 pour l'envoi de messages
 */
router.get('/users-level1', requireSuperAdmin, async (req, res) => {
    try {
        // 1. Récupérer le rôle niveau 1
        const level1Role = await collections.roles.findOne({ niveau: 1 });

        if (!level1Role) {
            return res.json({
                success: true,
                users: []
            });
        }

        // 2. Récupérer tous les utilisateurs avec ce rôle
        const level1Users = await collections.users.find({
            idRole: level1Role._id
        }).project({
            username: 1,
            nom: 1,
            email: 1,
            idDepartement: 1
        }).sort({ nom: 1 }).toArray();

        // 3. Enrichir avec les noms de départements
        const usersWithDept = await Promise.all(level1Users.map(async (user) => {
            const dept = await collections.departements.findOne({ _id: user.idDepartement });
            return {
                ...user,
                departementNom: dept?.nom || 'Non défini'
            };
        }));

        res.json({
            success: true,
            users: usersWithDept
        });

    } catch (error) {
        console.error('❌ Erreur /users-level1:', error);
        res.status(500).json({
            success: false,
            message: "Erreur lors de la récupération des utilisateurs"
        });
    }
});

// ============================================
// MODULE MAINTENANCE
// ============================================

/**
 * GET /api/superadmin/maintenance/status
 * Vérifier l'état de la maintenance
 */
router.get('/maintenance/status', requireSuperAdmin, async (req, res) => {
    try {
        const systemSettings = await collections.systemSettings.findOne({ _id: 'maintenance' });

        res.json({
            success: true,
            maintenanceMode: systemSettings?.enabled || false,
            maintenanceBy: systemSettings?.enabledBy || null,
            maintenanceAt: systemSettings?.enabledAt || null
        });
    } catch (error) {
        console.error('❌ Erreur maintenance/status:', error);
        res.status(500).json({
            success: false,
            message: "Erreur lors de la vérification du statut"
        });
    }
});

/**
 * POST /api/superadmin/maintenance/enable
 * Activer le mode maintenance (bloquer tous les utilisateurs sauf Super Admin)
 */
router.post('/maintenance/enable', requireSuperAdmin, async (req, res) => {
    try {
        const username = req.superAdmin.username;

        // Activer le mode maintenance dans systemSettings avec whitelist vide
        await collections.systemSettings.updateOne(
            { _id: 'maintenance' },
            {
                $set: {
                    enabled: true,
                    enabledBy: username,
                    enabledAt: new Date(),
                    whitelist: [] // Initialiser whitelist vide
                }
            },
            { upsert: true }
        );

        // Logger l'action
        await logAction(username, 'MAINTENANCE_MODE_ENABLED', {}, {}, req);

        console.log(`🔒 Mode maintenance activé par ${username} (whitelist initialisée)`);

        res.json({
            success: true,
            message: "Mode maintenance activé. Tous les utilisateurs (sauf Super Admin) sont bloqués."
        });
    } catch (error) {
        console.error('❌ Erreur maintenance/enable:', error);
        res.status(500).json({
            success: false,
            message: "Erreur lors de l'activation de la maintenance"
        });
    }
});

/**
 * POST /api/superadmin/maintenance/disable
 * Désactiver le mode maintenance (débloquer tous les utilisateurs)
 */
router.post('/maintenance/disable', requireSuperAdmin, async (req, res) => {
    try {
        const username = req.superAdmin.username;

        // Désactiver le mode maintenance et vider la whitelist
        await collections.systemSettings.updateOne(
            { _id: 'maintenance' },
            {
                $set: {
                    enabled: false,
                    disabledBy: username,
                    disabledAt: new Date(),
                    whitelist: [] // Vider la whitelist
                }
            },
            { upsert: true }
        );

        // Logger l'action
        await logAction(username, 'MAINTENANCE_MODE_DISABLED', {}, {}, req);

        console.log(`🔓 Mode maintenance désactivé par ${username} (whitelist vidée)`);

        res.json({
            success: true,
            message: "Mode maintenance désactivé. Tous les utilisateurs peuvent se reconnecter."
        });
    } catch (error) {
        console.error('❌ Erreur maintenance/disable:', error);
        res.status(500).json({
            success: false,
            message: "Erreur lors de la désactivation de la maintenance"
        });
    }
});

/**
 * POST /api/superadmin/force-logout-all
 * Déconnecter tous les utilisateurs (sauf Super Admin)
 * VRAIE déconnexion : destruction des sessions Express + isOnline=false
 */
router.post('/force-logout-all', requireSuperAdmin, async (req, res) => {
    try {
        const username = req.superAdmin.username;

        // 1️⃣ Récupérer tous les sessionID des utilisateurs non-admin
        const usersToDisconnect = await collections.users.find(
            {
                'role.niveau': { $ne: 0 }, // Tous sauf niveau 0
                sessionID: { $exists: true } // Qui ont une session active
            }
        ).toArray();

        console.log(`🔴 ${usersToDisconnect.length} utilisateur(s) avec session active à déconnecter`);

        let sessionsDestroyed = 0;

        // 2️⃣ Détruire chaque session Express
        for (const user of usersToDisconnect) {
            if (user.sessionID) {
                try {
                    await new Promise((resolve, reject) => {
                        req.sessionStore.destroy(user.sessionID, (err) => {
                            if (err) {
                                console.error(`❌ Erreur destruction session ${user.username}:`, err);
                                reject(err);
                            } else {
                                console.log(`✅ Session détruite pour: ${user.username}`);
                                sessionsDestroyed++;
                                resolve();
                            }
                        });
                    });
                } catch (error) {
                    console.error(`❌ Erreur lors de la destruction de session pour ${user.username}:`, error);
                }
            }
        }

        // 3️⃣ Mettre à jour MongoDB (isOnline=false + supprimer sessionID)
        const result = await collections.users.updateMany(
            { 'role.niveau': { $ne: 0 } }, // Tous sauf niveau 0
            {
                $set: {
                    isOnline: false,
                    lastActivity: new Date()
                },
                $unset: {
                    sessionID: "" // Supprimer le sessionID
                }
            }
        );

        // Logger l'action
        await logAction(username, 'FORCE_LOGOUT_ALL_USERS',
            {
                usersDisconnected: result.modifiedCount,
                sessionsDestroyed: sessionsDestroyed
            }, {}, req);

        console.log(`🔴 ${username} a déconnecté ${result.modifiedCount} utilisateur(s)`);
        console.log(`💥 ${sessionsDestroyed} session(s) Express détruite(s)`);

        res.json({
            success: true,
            message: `${result.modifiedCount} utilisateur(s) déconnecté(s) avec succès`,
            count: result.modifiedCount,
            sessionsDestroyed: sessionsDestroyed
        });
    } catch (error) {
        console.error('❌ Erreur force-logout-all:', error);
        res.status(500).json({
            success: false,
            message: "Erreur lors de la déconnexion des utilisateurs"
        });
    }
});

// ============================================
// MODULE 3 : GESTION DES DOCUMENTS
// ============================================

/**
 * GET /api/superadmin/documents/stats
 * Statistiques globales des documents
 */
router.get('/documents/stats', requireSuperAdmin, async (req, res) => {
    try {
        const { period, startDate, endDate } = req.query;

        const stats = await documentsModule.getDocumentsStats({
            period: period || 'all',
            startDate: startDate ? new Date(startDate) : null,
            endDate: endDate ? new Date(endDate) : null
        });

        await logAction(req.superAdmin.username, 'SUPERADMIN_VIEW_DOCUMENTS_STATS',
            { period, startDate, endDate }, {}, req);

        res.json({ success: true, data: stats });
    } catch (error) {
        console.error('❌ Erreur documents/stats:', error);
        res.status(500).json({ success: false, message: "Erreur lors de la récupération des statistiques" });
    }
});

/**
 * GET /api/superadmin/documents/most-shared
 * Top 10 documents les plus partagés
 */
router.get('/documents/most-shared', requireSuperAdmin, async (req, res) => {
    try {
        const { period, startDate, endDate } = req.query;

        const result = await documentsModule.getMostSharedDocuments({
            period: period || 'all',
            startDate: startDate ? new Date(startDate) : null,
            endDate: endDate ? new Date(endDate) : null
        });

        res.json({ success: true, data: result });
    } catch (error) {
        console.error('❌ Erreur documents/most-shared:', error);
        res.status(500).json({ success: false, message: "Erreur lors de la récupération" });
    }
});

/**
 * GET /api/superadmin/documents/most-downloaded
 * Top 10 documents les plus téléchargés
 */
router.get('/documents/most-downloaded', requireSuperAdmin, async (req, res) => {
    try {
        const { period, startDate, endDate } = req.query;

        const result = await documentsModule.getMostDownloadedDocuments({
            period: period || 'all',
            startDate: startDate ? new Date(startDate) : null,
            endDate: endDate ? new Date(endDate) : null
        });

        res.json({ success: true, data: result });
    } catch (error) {
        console.error('❌ Erreur documents/most-downloaded:', error);
        res.status(500).json({ success: false, message: "Erreur lors de la récupération" });
    }
});

/**
 * GET /api/superadmin/documents/level1-deletions
 * Utilisateurs niveau 1 ayant supprimé des documents
 */
router.get('/documents/level1-deletions', requireSuperAdmin, async (req, res) => {
    try {
        const { period, startDate, endDate } = req.query;

        const result = await documentsModule.getLevel1Deletions({
            period: period || 'all',
            startDate: startDate ? new Date(startDate) : null,
            endDate: endDate ? new Date(endDate) : null
        });

        res.json({ success: true, data: result });
    } catch (error) {
        console.error('❌ Erreur documents/level1-deletions:', error);
        res.status(500).json({ success: false, message: "Erreur lors de la récupération" });
    }
});

/**
 * GET /api/superadmin/documents/level1-locks
 * Utilisateurs niveau 1 ayant verrouillé des documents
 */
router.get('/documents/level1-locks', requireSuperAdmin, async (req, res) => {
    try {
        const { period, startDate, endDate } = req.query;

        const result = await documentsModule.getLevel1Locks({
            period: period || 'all',
            startDate: startDate ? new Date(startDate) : null,
            endDate: endDate ? new Date(endDate) : null
        });

        res.json({ success: true, data: result });
    } catch (error) {
        console.error('❌ Erreur documents/level1-locks:', error);
        res.status(500).json({ success: false, message: "Erreur lors de la récupération" });
    }
});

/**
 * GET /api/superadmin/documents/deleted
 * Liste des documents supprimés
 */
router.get('/documents/deleted', requireSuperAdmin, async (req, res) => {
    try {
        const { period, startDate, endDate, page = 1, limit = 20, username } = req.query;

        const result = await documentsModule.getDeletedDocuments({
            period: period || 'all',
            startDate: startDate ? new Date(startDate) : null,
            endDate: endDate ? new Date(endDate) : null,
            page: parseInt(page),
            limit: parseInt(limit),
            username: username || null
        });

        res.json({ success: true, data: result });
    } catch (error) {
        console.error('❌ Erreur documents/deleted:', error);
        res.status(500).json({ success: false, message: "Erreur lors de la récupération" });
    }
});

/**
 * GET /api/superadmin/documents/locked
 * Liste des documents verrouillés
 */
router.get('/documents/locked', requireSuperAdmin, async (req, res) => {
    try {
        const { period, startDate, endDate, page = 1, limit = 20, username } = req.query;

        const result = await documentsModule.getLockedDocuments({
            period: period || 'all',
            startDate: startDate ? new Date(startDate) : null,
            endDate: endDate ? new Date(endDate) : null,
            page: parseInt(page),
            limit: parseInt(limit),
            username: username || null
        });

        res.json({ success: true, data: result });
    } catch (error) {
        console.error('❌ Erreur documents/locked:', error);
        res.status(500).json({ success: false, message: "Erreur lors de la récupération" });
    }
});

/**
 * GET /api/superadmin/documents/activity
 * Activité globale (création, suppression, téléchargement, partage)
 */
router.get('/documents/activity', requireSuperAdmin, async (req, res) => {
    try {
        const { period, startDate, endDate } = req.query;

        const result = await documentsModule.getDocumentsActivity({
            period: period || 'all',
            startDate: startDate ? new Date(startDate) : null,
            endDate: endDate ? new Date(endDate) : null
        });

        res.json({ success: true, data: result });
    } catch (error) {
        console.error('❌ Erreur documents/activity:', error);
        res.status(500).json({ success: false, message: "Erreur lors de la récupération" });
    }
});

/**
 * GET /api/superadmin/documents/timeline
 * Timeline des actions sur documents (pour graphique)
 */
router.get('/documents/timeline', requireSuperAdmin, async (req, res) => {
    try {
        const { period, startDate, endDate } = req.query;

        const result = await documentsModule.getDocumentTimeline({
            period: period || 'all',
            startDate: startDate ? new Date(startDate) : null,
            endDate: endDate ? new Date(endDate) : null
        });

        res.json({ success: true, data: result });
    } catch (error) {
        console.error('❌ Erreur documents/timeline:', error);
        res.status(500).json({ success: false, message: "Erreur lors de la récupération" });
    }
});

/**
 * GET /api/superadmin/documents/users-deletions
 * Traçabilité des suppressions par TOUS les niveaux (1, 2, 3)
 */
router.get('/documents/users-deletions', requireSuperAdmin, async (req, res) => {
    try {
        const { period, startDate, endDate } = req.query;

        const result = await documentsModule.getUsersDeletions({
            period: period || 'all',
            startDate: startDate ? new Date(startDate) : null,
            endDate: endDate ? new Date(endDate) : null
        });

        res.json({ success: true, data: result });
    } catch (error) {
        console.error('❌ Erreur documents/users-deletions:', error);
        res.status(500).json({ success: false, message: "Erreur lors de la récupération" });
    }
});

/**
 * GET /api/superadmin/documents/users-locks
 * Traçabilité des verrouillages par TOUS les niveaux (1, 2, 3)
 */
router.get('/documents/users-locks', requireSuperAdmin, async (req, res) => {
    try {
        const { period, startDate, endDate } = req.query;

        const result = await documentsModule.getUsersLocks({
            period: period || 'all',
            startDate: startDate ? new Date(startDate) : null,
            endDate: endDate ? new Date(endDate) : null
        });

        res.json({ success: true, data: result });
    } catch (error) {
        console.error('❌ Erreur documents/users-locks:', error);
        res.status(500).json({ success: false, message: "Erreur lors de la récupération" });
    }
});

/**
 * GET /api/superadmin/documents/users-downloads
 * Traçabilité des téléchargements par TOUS les niveaux (1, 2, 3)
 */
router.get('/documents/users-downloads', requireSuperAdmin, async (req, res) => {
    try {
        const { period, startDate, endDate } = req.query;

        const result = await documentsModule.getUsersDownloads({
            period: period || 'all',
            startDate: startDate ? new Date(startDate) : null,
            endDate: endDate ? new Date(endDate) : null
        });

        res.json({ success: true, data: result });
    } catch (error) {
        console.error('❌ Erreur documents/users-downloads:', error);
        res.status(500).json({ success: false, message: "Erreur lors de la récupération" });
    }
});

/**
 * GET /api/superadmin/documents/all
 * Liste tous les documents avec pagination
 */
router.get('/documents/all', requireSuperAdmin, async (req, res) => {
    try {
        const { period, startDate, endDate, page = 1, limit = 20, search = '' } = req.query;

        const result = await documentsModule.getAllDocuments({
            period: period || 'all',
            startDate: startDate ? new Date(startDate) : null,
            endDate: endDate ? new Date(endDate) : null,
            page: parseInt(page),
            limit: parseInt(limit),
            search
        });

        res.json({ success: true, data: result });
    } catch (error) {
        console.error('❌ Erreur documents/all:', error);
        res.status(500).json({ success: false, message: "Erreur lors de la récupération" });
    }
});

/**
 * POST /api/superadmin/documents/restore-all
 * Restaurer tous les documents de la corbeille (récupérables uniquement)
 * IMPORTANT: Cette route doit être AVANT /documents/:docId/restore
 */
router.post('/documents/restore-all', requireSuperAdmin, async (req, res) => {
    try {
        const now = new Date();

        // Trouver tous les documents récupérables (non expirés)
        // Note: expiresAt est à la racine du document, pas dans deletionInfo
        const recoverableDocuments = await collections.documents.find({
            deleted: true,
            expiresAt: { $gt: now }
        }).toArray();

        if (recoverableDocuments.length === 0) {
            return res.json({
                success: true,
                message: 'Aucun document à restaurer',
                restoredCount: 0
            });
        }

        // Restaurer tous les documents
        const result = await collections.documents.updateMany(
            {
                deleted: true,
                expiresAt: { $gt: now }
            },
            {
                $set: { deleted: false },
                $unset: {
                    deletedAt: "",
                    deletedBy: "",
                    deletionMotif: "",
                    expiresAt: ""
                }
            }
        );

        // Logger l'action
        await logAction(
            req.superAdmin.username,
            'DOCUMENTS_BULK_RESTORED',
            {
                restoredCount: result.modifiedCount,
                documentIds: recoverableDocuments.map(d => d.idDocument)
            },
            {},
            req
        );

        console.log(`♻️ ${result.modifiedCount} documents restaurés en masse par ${req.superAdmin.username}`);

        res.json({
            success: true,
            message: `${result.modifiedCount} document(s) restauré(s) avec succès`,
            restoredCount: result.modifiedCount
        });

    } catch (error) {
        console.error('❌ Erreur documents/restore-all:', error);
        res.status(500).json({
            success: false,
            message: "Erreur lors de la restauration en masse"
        });
    }
});

/**
 * DELETE /api/superadmin/documents/permanent-all
 * Supprimer définitivement tous les documents de la corbeille
 * IMPORTANT: Cette route doit être AVANT /documents/:docId/permanent
 */
router.delete('/documents/permanent-all', requireSuperAdmin, async (req, res) => {
    try {
        // Trouver tous les documents dans la corbeille
        const deletedDocuments = await collections.documents.find({
            deleted: true
        }).toArray();

        if (deletedDocuments.length === 0) {
            return res.json({
                success: true,
                message: 'Aucun document à supprimer',
                deletedCount: 0
            });
        }

        // Supprimer définitivement tous les documents
        const result = await collections.documents.deleteMany({
            deleted: true
        });

        // Logger l'action
        await logAction(
            req.superAdmin.username,
            'DOCUMENTS_BULK_PERMANENTLY_DELETED',
            {
                deletedCount: result.deletedCount,
                documentIds: deletedDocuments.map(d => d.idDocument),
                reason: `Bulk permanent deletion by Super Admin ${req.superAdmin.username}`
            },
            {},
            req
        );

        console.log(`🗑️ ${result.deletedCount} documents supprimés définitivement en masse par ${req.superAdmin.username}`);

        res.json({
            success: true,
            message: `${result.deletedCount} document(s) supprimé(s) définitivement`,
            deletedCount: result.deletedCount
        });

    } catch (error) {
        console.error('❌ Erreur documents/permanent-all:', error);
        res.status(500).json({
            success: false,
            message: "Erreur lors de la suppression définitive en masse"
        });
    }
});

/**
 * POST /api/superadmin/documents/:docId/restore
 * Restaurer un document depuis la corbeille
 */
router.post('/documents/:docId/restore', requireSuperAdmin, async (req, res) => {
    try {
        const { docId } = req.params;
        const { ObjectId } = require('mongodb');

        // Vérifier que le document existe dans la corbeille
        const document = await collections.documents.findOne({
            _id: new ObjectId(docId),
            deleted: true
        });

        if (!document) {
            return res.status(404).json({
                success: false,
                message: 'Document non trouvé dans la corbeille'
            });
        }

        // Vérifier si le document n'a pas expiré (expiresAt est à la racine)
        if (document.expiresAt && document.expiresAt < new Date()) {
            return res.status(400).json({
                success: false,
                message: 'Document expiré, restauration impossible'
            });
        }

        // Restaurer le document
        await collections.documents.updateOne(
            { _id: new ObjectId(docId) },
            {
                $set: { deleted: false },
                $unset: {
                    deletedAt: "",
                    deletedBy: "",
                    deletionMotif: "",
                    expiresAt: ""
                }
            }
        );

        // Logger l'action
        await logAction(
            req.superAdmin.username,
            'DOCUMENT_RESTORED',
            {
                documentId: document.idDocument,
                titre: document.titre,
                deletedAt: document.deletedAt,
                deletedBy: document.deletedBy
            },
            {},
            req
        );

        console.log(`♻️ Document restauré: ${document.idDocument} par ${req.superAdmin.username}`);

        res.json({
            success: true,
            message: 'Document restauré avec succès'
        });

    } catch (error) {
        console.error('❌ Erreur documents/:docId/restore:', error);
        res.status(500).json({
            success: false,
            message: "Erreur lors de la restauration du document"
        });
    }
});

/**
 * DELETE /api/superadmin/documents/:docId/permanent
 * Supprimer définitivement un document de la corbeille
 */
router.delete('/documents/:docId/permanent', requireSuperAdmin, async (req, res) => {
    try {
        const { docId } = req.params;
        const { ObjectId } = require('mongodb');

        // Vérifier que le document existe dans la corbeille
        const document = await collections.documents.findOne({
            _id: new ObjectId(docId),
            deleted: true
        });

        if (!document) {
            return res.status(404).json({
                success: false,
                message: 'Document non trouvé dans la corbeille'
            });
        }

        // Suppression définitive
        await collections.documents.deleteOne({ _id: new ObjectId(docId) });

        // Logger l'action
        await logAction(
            req.superAdmin.username,
            'DOCUMENT_PERMANENTLY_DELETED',
            {
                documentId: document.idDocument,
                titre: document.titre,
                deletedAt: document.deletedAt,
                deletedBy: document.deletedBy,
                reason: `Manual permanent deletion by Super Admin ${req.superAdmin.username}`
            },
            {},
            req
        );

        console.log(`🗑️ Document supprimé définitivement: ${document.idDocument} par ${req.superAdmin.username}`);

        res.json({
            success: true,
            message: 'Document supprimé définitivement'
        });

    } catch (error) {
        console.error('❌ Erreur documents/:docId/permanent:', error);
        res.status(500).json({
            success: false,
            message: "Erreur lors de la suppression définitive"
        });
    }
});

// ============================================
// MODULE 3B : GESTION DES DOSSIERS (Nouveau systeme multi-fichiers)
// ============================================

/**
 * GET /api/superadmin/dossiers/stats
 * Statistiques globales des dossiers
 */
router.get('/dossiers/stats', requireSuperAdmin, async (req, res) => {
    try {
        const { period, startDate, endDate } = req.query;

        const stats = await dossiersModule.getDossiersStats({
            period: period || 'all',
            startDate: startDate ? new Date(startDate) : null,
            endDate: endDate ? new Date(endDate) : null
        });

        await logAction(req.superAdmin.username, 'SUPERADMIN_VIEW_DOSSIERS_STATS',
            { period, startDate, endDate }, {}, req);

        res.json({ success: true, data: stats });
    } catch (error) {
        console.error('Erreur dossiers/stats:', error);
        res.status(500).json({ success: false, message: "Erreur lors de la recuperation des statistiques" });
    }
});

/**
 * GET /api/superadmin/dossiers/all
 * Liste tous les dossiers avec pagination
 */
router.get('/dossiers/all', requireSuperAdmin, async (req, res) => {
    try {
        const { period, startDate, endDate, page = 1, limit = 20, search = '' } = req.query;

        const result = await dossiersModule.getAllDossiers({
            period: period || 'all',
            startDate: startDate ? new Date(startDate) : null,
            endDate: endDate ? new Date(endDate) : null,
            page: parseInt(page),
            limit: parseInt(limit),
            search
        });

        res.json({ success: true, data: result });
    } catch (error) {
        console.error('Erreur dossiers/all:', error);
        res.status(500).json({ success: false, message: "Erreur lors de la recuperation" });
    }
});

/**
 * GET /api/superadmin/dossiers/:dossierId
 * Detail d'un dossier specifique
 */
router.get('/dossiers/:dossierId', requireSuperAdmin, async (req, res) => {
    try {
        const { dossierId } = req.params;

        const dossier = await dossiersModule.getDossierDetail(dossierId);

        if (!dossier) {
            return res.status(404).json({ success: false, message: "Dossier non trouve" });
        }

        res.json({ success: true, data: dossier });
    } catch (error) {
        console.error('Erreur dossiers/:dossierId:', error);
        res.status(500).json({ success: false, message: "Erreur lors de la recuperation" });
    }
});

/**
 * GET /api/superadmin/dossiers/deleted
 * Liste des dossiers supprimes (corbeille)
 */
router.get('/dossiers/deleted', requireSuperAdmin, async (req, res) => {
    try {
        const { period, startDate, endDate, page = 1, limit = 20 } = req.query;

        const result = await dossiersModule.getDeletedDossiers({
            period: period || 'all',
            startDate: startDate ? new Date(startDate) : null,
            endDate: endDate ? new Date(endDate) : null,
            page: parseInt(page),
            limit: parseInt(limit)
        });

        res.json({ success: true, data: result });
    } catch (error) {
        console.error('Erreur dossiers/deleted:', error);
        res.status(500).json({ success: false, message: "Erreur lors de la recuperation" });
    }
});

/**
 * GET /api/superadmin/dossiers/locked
 * Liste des dossiers verrouilles
 */
router.get('/dossiers/locked', requireSuperAdmin, async (req, res) => {
    try {
        const { period, startDate, endDate, page = 1, limit = 20 } = req.query;

        const result = await dossiersModule.getLockedDossiers({
            period: period || 'all',
            startDate: startDate ? new Date(startDate) : null,
            endDate: endDate ? new Date(endDate) : null,
            page: parseInt(page),
            limit: parseInt(limit)
        });

        res.json({ success: true, data: result });
    } catch (error) {
        console.error('Erreur dossiers/locked:', error);
        res.status(500).json({ success: false, message: "Erreur lors de la recuperation" });
    }
});

/**
 * POST /api/superadmin/dossiers/:dossierId/restore
 * Restaurer un dossier depuis la corbeille
 */
router.post('/dossiers/:dossierId/restore', requireSuperAdmin, async (req, res) => {
    try {
        const { dossierId } = req.params;

        const result = await dossiersModule.restoreDossier(dossierId);

        if (result.success) {
            await logAction(req.superAdmin.username, 'DOSSIER_RESTORED',
                { dossierId }, {}, req);
            res.json({ success: true, message: 'Dossier restaure avec succes' });
        } else {
            res.status(400).json({ success: false, message: result.message || 'Erreur restauration' });
        }
    } catch (error) {
        console.error('Erreur dossiers/:dossierId/restore:', error);
        res.status(500).json({ success: false, message: "Erreur lors de la restauration" });
    }
});

/**
 * DELETE /api/superadmin/dossiers/:dossierId/permanent
 * Supprimer definitivement un dossier
 */
router.delete('/dossiers/:dossierId/permanent', requireSuperAdmin, async (req, res) => {
    try {
        const { dossierId } = req.params;

        const result = await dossiersModule.permanentDeleteDossier(dossierId);

        if (result.success) {
            await logAction(req.superAdmin.username, 'DOSSIER_PERMANENTLY_DELETED',
                { dossierId }, {}, req);
            res.json({ success: true, message: 'Dossier supprime definitivement' });
        } else {
            res.status(400).json({ success: false, message: result.message || 'Erreur suppression' });
        }
    } catch (error) {
        console.error('Erreur dossiers/:dossierId/permanent:', error);
        res.status(500).json({ success: false, message: "Erreur lors de la suppression definitive" });
    }
});

/**
 * GET /api/superadmin/dossiers/activity
 * Activite globale sur les dossiers
 */
router.get('/dossiers/activity', requireSuperAdmin, async (req, res) => {
    try {
        const { period, startDate, endDate } = req.query;

        const result = await dossiersModule.getDossiersActivity({
            period: period || 'all',
            startDate: startDate ? new Date(startDate) : null,
            endDate: endDate ? new Date(endDate) : null
        });

        res.json({ success: true, data: result });
    } catch (error) {
        console.error('Erreur dossiers/activity:', error);
        res.status(500).json({ success: false, message: "Erreur lors de la recuperation" });
    }
});

// ============================================
// MODULE 4 : GESTION DES DÉPARTEMENTS
// ============================================

/**
 * GET /api/superadmin/departments
 * Liste tous les départements
 */
router.get('/departments', requireSuperAdmin, async (req, res) => {
    try {
        const { search, type = 'all', page = 1 } = req.query;

        const filters = {
            search,
            type, // 'all', 'main', 'services'
            page: parseInt(page),
            limit: 50
        };

        const result = await departmentsModule.getAllDepartments(filters);

        await logAction(req.superAdmin.username, 'SUPERADMIN_VIEW_DEPARTMENTS',
            { filters }, {}, req);

        res.json({
            success: true,
            data: result
        });

    } catch (error) {
        console.error('❌ Erreur /departments:', error);
        res.status(500).json({
            success: false,
            message: "Erreur lors de la récupération des départements"
        });
    }
});

/**
 * GET /api/superadmin/departments/stats
 * Statistiques des départements
 */
router.get('/departments/stats', requireSuperAdmin, async (req, res) => {
    try {
        const stats = await departmentsModule.getStats();

        res.json({
            success: true,
            data: stats
        });

    } catch (error) {
        console.error('❌ Erreur /departments/stats:', error);
        res.status(500).json({
            success: false,
            message: "Erreur lors de la récupération des statistiques"
        });
    }
});

/**
 * POST /api/superadmin/departments
 * Créer un département principal
 */
router.post('/departments', requireSuperAdmin, async (req, res) => {
    try {
        const { nom, code, description } = req.body;

        if (!nom || !code) {
            return res.status(400).json({
                success: false,
                message: "Nom et code requis"
            });
        }

        const newDepartment = await departmentsModule.createDepartment(
            { nom, code, description },
            req.superAdmin.username
        );

        res.json({
            success: true,
            message: "Département créé avec succès",
            data: newDepartment
        });

    } catch (error) {
        console.error('❌ Erreur POST /departments:', error);
        res.status(400).json({
            success: false,
            message: error.message || "Erreur lors de la création du département"
        });
    }
});

/**
 * PUT /api/superadmin/departments/:id
 * Modifier un département
 */
router.put('/departments/:id', requireSuperAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const { nom, code, description } = req.body;

        if (!nom || !code) {
            return res.status(400).json({
                success: false,
                message: "Nom et code requis"
            });
        }

        const updatedDepartment = await departmentsModule.updateDepartment(
            id,
            { nom, code, description },
            req.superAdmin.username
        );

        res.json({
            success: true,
            message: "Département modifié avec succès",
            data: updatedDepartment
        });

    } catch (error) {
        console.error('❌ Erreur PUT /departments/:id:', error);
        res.status(400).json({
            success: false,
            message: error.message || "Erreur lors de la modification du département"
        });
    }
});

/**
 * DELETE /api/superadmin/departments/:id
 * Supprimer un département
 */
router.delete('/departments/:id', requireSuperAdmin, async (req, res) => {
    try {
        const { id } = req.params;

        await departmentsModule.deleteDepartment(id, req.superAdmin.username);

        res.json({
            success: true,
            message: "Département supprimé avec succès"
        });

    } catch (error) {
        console.error('❌ Erreur DELETE /departments/:id:', error);
        res.status(400).json({
            success: false,
            message: error.message || "Erreur lors de la suppression du département"
        });
    }
});

// ============================================
// ROUTES FUTURES (Commentées pour le POC)
// ============================================

// TODO: Module Audit
// router.get('/audit/logs', requireSuperAdmin, async (req, res) => { ... });
// router.get('/audit/history', requireSuperAdmin, async (req, res) => { ... });

// TODO: Module Sécurité
// router.get('/security/dashboard', requireSuperAdmin, async (req, res) => { ... });

// TODO: Module Performance
// router.get('/performance/metrics', requireSuperAdmin, async (req, res) => { ... });

// ============================================
// ROUTES AUDIT & TRAÇABILITÉ
// ============================================

/**
 * GET /api/superadmin/sessions/diagnostic
 * Diagnostic des sessions utilisateurs
 */
router.get('/sessions/diagnostic', requireSuperAdmin, async (req, res) => {
    try {
        const { getDB } = require('../config/database');
        const db = getDB();

        // 1. Compter les utilisateurs
        const totalUsers = await collections.users.countDocuments({});
        const onlineUsers = await collections.users.countDocuments({ isOnline: true });

        // 2. Compter les sessions MongoDB
        const sessionsCollection = db.collection('sessions');
        const mongodbSessions = await sessionsCollection.countDocuments({});

        // 3. Récupérer les utilisateurs en ligne
        const onlineUsersList = await collections.users.find({ isOnline: true })
            .project({ username: 1, nom: 1, sessionID: 1 })
            .toArray();

        // 4. Vérifier les incohérences
        let issues = 0;
        const problems = [];

        // Utilisateurs en ligne sans sessionID
        const usersWithoutSessionID = onlineUsersList.filter(u => !u.sessionID);
        if (usersWithoutSessionID.length > 0) {
            issues += usersWithoutSessionID.length;
            problems.push(`${usersWithoutSessionID.length} utilisateur(s) marqué(s) en ligne sans sessionID`);
        }

        // Enrichir la liste avec l'info hasSession
        const enrichedOnlineUsers = onlineUsersList.map(user => ({
            ...user,
            hasSession: !!user.sessionID
        }));

        res.json({
            success: true,
            totalUsers,
            onlineUsers,
            mongodbSessions,
            issues,
            problems,
            onlineUsersList: enrichedOnlineUsers
        });

    } catch (error) {
        console.error('❌ Erreur /sessions/diagnostic:', error);
        res.status(500).json({
            success: false,
            message: "Erreur lors du diagnostic"
        });
    }
});

/**
 * POST /api/superadmin/sessions/fix
 * Corriger les incohérences de sessions
 */
router.post('/sessions/fix', requireSuperAdmin, async (req, res) => {
    try {
        // Mettre isOnline=false pour les utilisateurs sans sessionID
        const result = await collections.users.updateMany(
            { isOnline: true, $or: [{ sessionID: null }, { sessionID: { $exists: false } }] },
            { $set: { isOnline: false, lastActivity: new Date() } }
        );

        // Logger l'action
        await logAction(req.superAdmin.username, 'FIX_SESSIONS',
            { usersUpdated: result.modifiedCount }, {}, req);

        console.log(`🔧 Sessions corrigées: ${result.modifiedCount} utilisateur(s) mis à jour par ${req.superAdmin.username}`);

        res.json({
            success: true,
            message: `${result.modifiedCount} session(s) corrigée(s)`,
            usersUpdated: result.modifiedCount,
            fixed: result.modifiedCount // Compatibilité
        });

    } catch (error) {
        console.error('❌ Erreur /sessions/fix:', error);
        res.status(500).json({
            success: false,
            message: "Erreur lors de la correction"
        });
    }
});

/**
 * GET /api/superadmin/profile-changes
 * Historique des changements de profil
 */
router.get('/profile-changes', requireSuperAdmin, async (req, res) => {
    try {
        const { username, type, period, startDate, endDate } = req.query;

        // Construire le filtre
        const filter = {};

        if (username) {
            filter.username = new RegExp(username, 'i'); // Recherche insensible à la casse
        }

        if (type) {
            filter.type = type;
        }

        // Filtre par période
        if (period) {
            const now = new Date();
            let dateFilter = {};

            switch (period) {
                case '24h':
                    dateFilter = { $gte: new Date(now - 24 * 60 * 60 * 1000) };
                    break;
                case '7d':
                    dateFilter = { $gte: new Date(now - 7 * 24 * 60 * 60 * 1000) };
                    break;
                case '30d':
                    dateFilter = { $gte: new Date(now - 30 * 24 * 60 * 60 * 1000) };
                    break;
                case 'custom':
                    if (startDate && endDate) {
                        const start = new Date(startDate);
                        start.setHours(0, 0, 0, 0);
                        const end = new Date(endDate);
                        end.setHours(23, 59, 59, 999);
                        dateFilter = { $gte: start, $lte: end };
                    }
                    break;
            }

            if (Object.keys(dateFilter).length > 0) {
                filter.date = dateFilter;
            }
        }

        // Récupérer les changements avec informations enrichies
        const changes = await collections.profileChanges.aggregate([
            { $match: filter },
            { $sort: { date: -1 } },
            { $limit: 500 }, // Limiter à 500 résultats max
            {
                $lookup: {
                    from: 'users',
                    localField: 'username',
                    foreignField: 'username',
                    as: 'userInfo'
                }
            },
            {
                $lookup: {
                    from: 'users',
                    localField: 'modifiedBy',
                    foreignField: 'username',
                    as: 'modifierInfo'
                }
            },
            {
                $project: {
                    username: 1,
                    type: 1,
                    oldValue: 1,
                    newValue: 1,
                    date: 1,
                    modifiedBy: 1,
                    userName: { $arrayElemAt: ['$userInfo.nom', 0] },
                    userPrenom: { $arrayElemAt: ['$userInfo.prenom', 0] },
                    modifierName: { $arrayElemAt: ['$modifierInfo.nom', 0] },
                    modifierPrenom: { $arrayElemAt: ['$modifierInfo.prenom', 0] }
                }
            }
        ]).toArray();

        console.log(`📝 Récupéré ${changes.length} changements de profil`);

        res.json({
            success: true,
            changes
        });

    } catch (error) {
        console.error('❌ Erreur /profile-changes:', error);
        res.status(500).json({
            success: false,
            message: error.message || "Erreur lors de la récupération"
        });
    }
});

// ============================================
// EXPORT
// ============================================

module.exports = {
    router,
    init
};
