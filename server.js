// ============================================
// SERVEUR NODE.JS + MONGODB - ARCHIVAGE C.E.R.E.R
// Architecture MVC Professionnelle
// ============================================

require('dotenv').config();

const express = require('express');
const cors = require('cors');
const path = require('path');

// Configuration
const constants = require('./utils/constants');
const { connectDB } = require('./config/database');
const { createSessionStore, configureSession } = require('./config/session');
const security = require('./security-config');

// Middleware
const { checkUserStatus } = require('./middleware/authMiddleware');

// Routes
const authRoutes = require('./routes/auth.routes');
const authController = require('./controllers/auth.controller');
const rolesController = require('./controllers/roles.controller');

// Services
const trashCleanup = require('./services/trashCleanup');

// ============================================
// INITIALISATION APPLICATION
// ============================================

const app = express();

// Configuration trust proxy
app.set('trust proxy', 1);

// ============================================
// MIDDLEWARE GLOBAUX
// ============================================

// Sécurité
app.use(security.helmetConfig);
app.use(security.compressionConfig);

// CORS (🔒 SÉCURITÉ: Mode strict en production)
const isProduction = process.env.NODE_ENV === 'production';

app.use(cors({
    origin: function (origin, callback) {
        // Autoriser les requêtes sans origin (mobile apps, curl, etc.)
        if (!origin) {
            return callback(null, true);
        }

        // En production: strict
        if (isProduction) {
            if (constants.CORS.ALLOWED_ORIGINS.includes(origin)) {
                callback(null, true);
            } else {
                console.warn(`🔒 CORS bloqué: ${origin}`);
                callback(new Error('Non autorisé par CORS'));
            }
        } else {
            // En développement: permissif mais avec log
            console.log(`⚠️ CORS dev: ${origin}`);
            callback(null, true);
        }
    },
    credentials: true,
    methods: constants.CORS.METHODS,
    allowedHeaders: constants.CORS.HEADERS
}));

// Parsing
app.use(express.json({ limit: constants.LIMITS.JSON_SIZE }));
app.use(express.urlencoded({ limit: constants.LIMITS.URL_ENCODED_SIZE, extended: true }));

// 🔒 SÉCURITÉ CRITIQUE: Sanitization NoSQL pour prévenir les injections
app.use(security.sanitizeConfig);
console.log('🔒 Sanitization NoSQL activée');

// Sessions
const sessionStore = createSessionStore();
console.log('✅ Sessions configurées (MongoStore - PRODUCTION)');

app.use(configureSession(sessionStore));

// Fichiers statiques
app.use(express.static('public'));

// ⚡ OPTIMISATION: Middleware unifié pour vérifier isOnline et blocked (1 seule requête MongoDB au lieu de 2)
app.use(checkUserStatus);

// ============================================
// ROUTES
// ============================================

// Routes d'authentification
app.use('/api/auth', authRoutes);

// Routes de compatibilité avec l'ancien frontend
app.post('/api/login', security.loginLimiter, authController.login);
app.post('/api/admin-login', security.loginLimiter, authController.adminLogin);
app.post('/api/logout', authController.logout);
app.get('/api/session-check', authController.checkSession);
app.get('/api/user-info', authController.getUserInfo);
app.post('/api/verify-session', authController.verifySession);
app.get('/api/roles', rolesController.getAllRoles);

// ============================================
// ROUTES PUBLIQUES - INSCRIPTION
// ============================================

// GET /api/departments-list - Liste publique des départements (pour formulaire d'inscription)
app.get('/api/departments-list', async (req, res) => {
    try {
        const { getCollections } = require('./config/database');
        const collections = getCollections();

        const departments = await collections.departements.find({}).toArray();

        res.json({
            success: true,
            departments: departments.map(dept => ({
                _id: dept._id,
                nom: dept.nom
            }))
        });
    } catch (error) {
        console.error('❌ Erreur /departments-list:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur serveur'
        });
    }
});

// POST /api/register - Inscription publique (redirige vers /api/users/register)
const usersController = require('./controllers/users.controller');
app.post('/api/register', security.loginLimiter,
    require('express-validator').body('username').trim().notEmpty().isLength({ min: 3, max: 50 }),
    require('express-validator').body('password').isLength({ min: 6 }),
    require('express-validator').body('nom').trim().notEmpty(),
    usersController.register
);

// ============================================
// ROUTE PUBLIQUE - LIENS TEMPORAIRES
// Pour Office Online Viewer (pas d'authentification requise)
// ============================================
const tempLinkService = require('./services/tempLinkService');

app.get('/temp/:token', async (req, res) => {
    try {
        const { token } = req.params;
        console.log(`🔗 Demande de fichier temporaire: ${token}`);

        // Récupérer le lien temporaire
        const link = tempLinkService.getTempLink(token);

        if (!link) {
            console.log(`❌ Token invalide ou expiré: ${token}`);
            return res.status(404).send(`
                <!DOCTYPE html>
                <html>
                <head>
                    <title>Lien expiré</title>
                    <style>
                        body { font-family: Arial, sans-serif; text-align: center; padding: 50px; background: #f5f5f5; }
                        .container { background: white; padding: 40px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); max-width: 500px; margin: 0 auto; }
                        h1 { color: #ef4444; font-size: 48px; margin: 0; }
                        p { color: #666; font-size: 18px; margin-top: 20px; }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <h1>⏰</h1>
                        <p><strong>Ce lien a expiré</strong></p>
                        <p>Les liens temporaires expirent après 10 minutes pour des raisons de sécurité.</p>
                    </div>
                </body>
                </html>
            `);
        }

        const { documentData } = link;

        // Extraire les données du fichier depuis le data URI
        const dataUri = documentData.contenu;
        const fileName = documentData.nomFichier || 'document';

        if (!dataUri || !dataUri.startsWith('data:')) {
            throw new Error('Format de document invalide');
        }

        // Parser le data URI: data:application/pdf;base64,JVBERi0x...
        const matches = dataUri.match(/^data:([^;]+);base64,(.+)$/);
        if (!matches) {
            throw new Error('Format data URI invalide');
        }

        const mimeType = matches[1];
        const base64Data = matches[2];

        // Convertir base64 en Buffer
        const fileBuffer = Buffer.from(base64Data, 'base64');

        console.log(`✅ Envoi fichier: ${fileName} (${mimeType}, ${fileBuffer.length} bytes)`);

        // Définir les headers pour le téléchargement
        res.setHeader('Content-Type', mimeType);
        res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(fileName)}"`);
        res.setHeader('Content-Length', fileBuffer.length);
        res.setHeader('Cache-Control', 'private, no-cache, no-store, must-revalidate');
        res.setHeader('Access-Control-Allow-Origin', '*'); // Permettre à Office Online Viewer d'accéder

        // Envoyer le fichier
        res.send(fileBuffer);

    } catch (error) {
        console.error('❌ Erreur serveur fichier temporaire:', error);
        res.status(500).send('Erreur serveur');
    }
});

// Routes documents
const documentsRoutes = require('./routes/documents.routes');
app.use('/api/documents', documentsRoutes);

// Routes dossiers (nouveau système multi-fichiers)
const dossiersRoutes = require('./routes/dossiers.routes');
app.use('/api/dossiers', dossiersRoutes);

// ============================================
// ROUTES DOCUMENTS PARTAGÉS
// ============================================

// GET /api/shared-documents/:userId - Récupérer les documents partagés avec l'utilisateur
app.get('/api/shared-documents/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const currentUser = req.session?.userId;

        if (!currentUser) {
            return res.status(401).json({
                success: false,
                message: 'Non authentifié'
            });
        }

        const securityUtils = require('./utils/security');

        // 🔒 SÉCURITÉ: Valider le userId (alphanumérique uniquement)
        if (!securityUtils.isValidUsername(userId)) {
            return res.status(400).json({
                success: false,
                message: 'ID utilisateur invalide'
            });
        }

        // Vérifier que l'utilisateur demande ses propres documents partagés
        if (currentUser !== userId) {
            return res.status(403).json({
                success: false,
                message: 'Accès non autorisé'
            });
        }

        const { getCollections } = require('./config/database');
        const collections = getCollections();

        // Récupérer les documents partagés avec cet utilisateur
        const sharedDocs = await collections.documents.find({
            partageAvec: userId,
            deleted: { $ne: true }
        }).sort({ createdAt: -1 }).toArray();

        res.json({
            success: true,
            documents: sharedDocs,
            total: sharedDocs.length
        });

    } catch (error) {
        console.error('❌ Erreur /shared-documents:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur serveur'
        });
    }
});

// DELETE /api/shared-documents/bulk/:userId - Supprimer tous les documents partagés
app.delete('/api/shared-documents/bulk/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const currentUser = req.session?.userId;

        if (!currentUser) {
            return res.status(401).json({
                success: false,
                message: 'Non authentifié'
            });
        }

        const securityUtils = require('./utils/security');

        // 🔒 SÉCURITÉ: Valider le userId
        if (!securityUtils.isValidUsername(userId)) {
            return res.status(400).json({
                success: false,
                message: 'ID utilisateur invalide'
            });
        }

        // Vérifier que l'utilisateur demande la suppression de ses propres documents partagés
        if (currentUser !== userId) {
            return res.status(403).json({
                success: false,
                message: 'Accès non autorisé'
            });
        }

        const { getCollections } = require('./config/database');
        const collections = getCollections();

        // Retirer l'utilisateur de tous les partages
        const result = await collections.documents.updateMany(
            { partageAvec: userId },
            { $pull: { partageAvec: userId } }
        );

        console.log(`🗑️ ${result.modifiedCount} partages supprimés pour ${userId}`);

        res.json({
            success: true,
            message: 'Tous les documents partagés ont été supprimés',
            count: result.modifiedCount
        });

    } catch (error) {
        console.error('❌ Erreur /shared-documents/bulk:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur serveur'
        });
    }
});

// Routes users
const usersRoutes = require('./routes/users.routes');
app.use('/api/users', usersRoutes);

// Routes messages
const messagesRoutes = require('./routes/messages.routes');
app.use('/api/messages', messagesRoutes);

// Routes categories
const categoriesRoutes = require('./routes/categories.routes');
app.use('/api/categories', categoriesRoutes);

// Routes services
const servicesRoutes = require('./routes/services.routes');
app.use('/api/services', servicesRoutes);

// Routes departements
const departementsRoutes = require('./routes/departements.routes');
app.use('/api/departements', departementsRoutes);

// Route de recherche globale
app.get('/api/search', async (req, res) => {
    try {
        const { q } = req.query;
        const userId = req.session?.userId;

        if (!userId) {
            return res.status(401).json({
                success: false,
                message: 'Non authentifié'
            });
        }

        if (!q || q.trim().length === 0) {
            return res.json({
                success: true,
                services: [],
                categories: [],
                documents: [],
                total: 0
            });
        }

        const { getCollections } = require('./config/database');
        const collections = getCollections();
        const securityUtils = require('./utils/security');

        // 🔒 SÉCURITÉ: Créer un regex sécurisé pour éviter ReDoS
        const searchTerm = q.trim();
        const searchRegex = securityUtils.createSafeRegex(searchTerm, 'i');

        // Récupérer l'utilisateur pour connaître son département
        const user = await collections.users.findOne({ username: userId });
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'Utilisateur non trouvé'
            });
        }

        // Rechercher dans les services
        const services = await collections.services.find({
            idDepartement: user.idDepartement,
            nom: searchRegex
        }).limit(20).toArray();

        // Rechercher dans les catégories
        const categories = await collections.categories.find({
            idDepartement: user.idDepartement,
            nom: searchRegex
        }).limit(20).toArray();

        // Rechercher dans les documents
        const documents = await collections.documents.find({
            $or: [
                { titre: searchRegex },
                { description: searchRegex },
                { idDocument: searchRegex }
            ],
            deleted: { $ne: true }
        }).limit(50).toArray();

        res.json({
            success: true,
            services: services.map(s => ({ id: s._id, nom: s.nom })),
            categories: categories.map(c => ({ id: c._id, nom: c.nom })),
            documents: documents.map(d => ({
                _id: d._id,
                idDocument: d.idDocument,
                titre: d.titre,
                description: d.description,
                categorie: d.categorie,
                dateAjout: d.dateAjout
            })),
            total: services.length + categories.length + documents.length
        });

    } catch (error) {
        console.error('❌ Erreur recherche:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur serveur'
        });
    }
});

// Route keep-alive pour maintenir la session active
app.post('/api/keep-alive', async (req, res) => {
    try {
        // Simple ping pour réinitialiser le timeout de session
        if (req.session && req.session.userId) {
            req.session.touch(); // Réinitialise l'expiration de la session

            // Mettre à jour isOnline et lastActivity dans la base de données
            const { getCollections } = require('./config/database');
            const collections = getCollections();

            await collections.users.updateOne(
                { username: req.session.userId },
                {
                    $set: {
                        isOnline: true,
                        lastActivity: new Date()
                    }
                }
            );
        }
        res.json({ success: true });
    } catch (error) {
        console.error('❌ Erreur keep-alive:', error);
        // Retourner succès quand même pour ne pas alerter le client
        res.json({ success: true });
    }
});

// Route de test de latence MongoDB (temporaire pour debug)
app.get('/api/test-latency', async (req, res) => {
    try {
        const { getDB } = require('./config/database');
        const db = getDB();

        const results = {
            timestamp: new Date().toISOString(),
            tests: []
        };

        // Test 1: Ping simple
        const start1 = Date.now();
        await db.admin().ping();
        const latency1 = Date.now() - start1;
        results.tests.push({ name: 'Ping', latency: latency1 + 'ms' });

        // Test 2: Query simple
        const start2 = Date.now();
        const { getCollections } = require('./config/database');
        const collections = getCollections();
        await collections.users.findOne({});
        const latency2 = Date.now() - start2;
        results.tests.push({ name: 'Query simple (1 user)', latency: latency2 + 'ms' });

        // Test 3: Query documents avec filtre
        const start3 = Date.now();
        const docs = await collections.documents.find({ deleted: { $ne: true } }).limit(10).toArray();
        const latency3 = Date.now() - start3;
        results.tests.push({ name: `Query documents (${docs.length} docs)`, latency: latency3 + 'ms' });

        // Test 4: Info serveur (optionnel)
        try {
            const serverStatus = await db.admin().serverStatus();
            results.server = {
                host: serverStatus.host,
                version: serverStatus.version
            };
        } catch (error) {
            results.server = {
                note: 'ServerStatus non disponible (permissions limitées)',
                error: error.message
            };
        }

        // Diagnostic
        const avgLatency = (latency1 + latency2 + latency3) / 3;
        if (avgLatency > 200) {
            results.diagnostic = '🚨 LATENCE ÉLEVÉE - MongoDB probablement dans une région différente de Render (Frankfurt)';
            results.recommendation = 'Migrer MongoDB vers eu-central-1 (Frankfurt)';
        } else if (avgLatency > 100) {
            results.diagnostic = '⚠️ Latence modérée - Peut être optimisé';
        } else {
            results.diagnostic = '✅ Latence normale - MongoDB dans la même région';
        }

        res.json(results);

    } catch (error) {
        res.status(500).json({
            error: error.message,
            stack: error.stack
        });
    }
});

// Route pour vérifier le statut de session (utilisée par le polling client)
app.get('/api/check-session-status', async (req, res) => {
    try {
        const { getCollections } = require('./config/database');
        const collections = getCollections();

        // Vérifier si l'utilisateur a une session active
        if (!req.session || !req.session.userId) {
            return res.status(401).json({
                success: false,
                message: 'Aucune session active',
                forceLogout: true
            });
        }

        // Vérifier si l'utilisateur existe toujours et est en ligne
        const user = await collections.users.findOne({
            username: req.session.userId
        });

        if (!user) {
            // L'utilisateur a été supprimé
            return res.status(401).json({
                success: false,
                message: 'Utilisateur non trouvé',
                forceLogout: true
            });
        }

        // Vérifier isOnline
        if (user.isOnline === false) {
            return res.status(401).json({
                success: false,
                message: 'Session terminée par un administrateur',
                forceLogout: true
            });
        }

        // Session valide
        res.json({
            success: true,
            isOnline: true
        });

    } catch (error) {
        console.error('❌ Erreur check-session-status:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur serveur'
        });
    }
});

// Route pour récupérer les logs de sécurité (Super Admin uniquement)
app.get('/api/security-logs', async (req, res) => {
    try {
        // Vérifier l'authentification
        if (!req.session || !req.session.userId) {
            return res.status(401).json({
                success: false,
                message: 'Non authentifié'
            });
        }

        const { getCollections } = require('./config/database');
        const collections = getCollections();

        // Vérifier que l'utilisateur est Super Admin (niveau 0)
        const user = await collections.users.findOne({ username: req.session.userId });
        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'Utilisateur non trouvé'
            });
        }

        // Récupérer le rôle de l'utilisateur
        const role = await collections.roles.findOne({ _id: user.idRole });
        if (!role || role.niveau !== 0) {
            return res.status(403).json({
                success: false,
                message: 'Accès refusé - Niveau Super Admin requis'
            });
        }

        const { limit = 200, skip = 0, action, user: userFilter, startDate, endDate } = req.query;

        // Construire le filtre
        const filter = {};
        if (action) {
            filter.action = action;
        }
        if (userFilter) {
            filter.user = userFilter;
        }
        if (startDate || endDate) {
            filter.timestamp = {};
            if (startDate) {
                filter.timestamp.$gte = new Date(startDate);
            }
            if (endDate) {
                filter.timestamp.$lte = new Date(endDate);
            }
        }

        // Récupérer les logs avec pagination
        const logs = await collections.auditLogs
            .find(filter)
            .sort({ timestamp: -1 })
            .skip(parseInt(skip))
            .limit(parseInt(limit))
            .toArray();

        // Compter le total
        const total = await collections.auditLogs.countDocuments(filter);

        // Calculer les statistiques par niveau de sévérité
        const stats = {
            INFO: 0,
            WARNING: 0,
            CRITICAL: 0
        };

        // Classifier les actions par niveau de sévérité
        const criticalActions = ['FORCE_LOGOUT_ALL_USERS', 'DOCUMENT_PERMANENTLY_DELETED', 'USER_DELETED',
                                  'MAINTENANCE_MODE_ENABLED', 'UNAUTHORIZED_SUPERADMIN_ACCESS', 'LOGIN_FAILED',
                                  'ALL_SECURITY_LOGS_DELETED', 'USER_DISCONNECTED'];
        const warningActions = ['DOCUMENT_DELETED', 'USER_BLOCKED', 'DOCUMENT_RESTORED', 'LOGOUT'];

        // Fonction pour obtenir une explication en français clair
        const getLogExplanation = (action) => {
            const explanations = {
                'LOGIN': 'Un utilisateur s\'est connecté au système. Cette action permet de suivre qui accède à la plateforme.',
                'LOGOUT': 'Un utilisateur s\'est déconnecté normalement du système.',
                'LOGIN_FAILED': 'Tentative de connexion échouée. Cela peut indiquer un oubli de mot de passe ou une tentative d\'accès non autorisée.',
                'DOCUMENT_CREATED': 'Un nouveau document a été ajouté dans le système d\'archivage.',
                'DOCUMENT_UPDATED': 'Les informations d\'un document existant ont été modifiées.',
                'DOCUMENT_DELETED': 'Un document a été placé dans la corbeille. Il peut encore être restauré.',
                'DOCUMENT_PERMANENTLY_DELETED': 'Un document a été définitivement supprimé de la corbeille. Cette action est irréversible.',
                'DOCUMENT_RESTORED': 'Un document précédemment supprimé a été restauré depuis la corbeille.',
                'DOCUMENT_DOWNLOADED': 'Un utilisateur a téléchargé un document. Cela permet de tracer qui consulte quels documents.',
                'DOCUMENT_SHARED': 'Un document a été partagé avec d\'autres utilisateurs ou départements.',
                'DOCUMENT_LOCKED': 'Un document a été verrouillé pour empêcher sa modification ou suppression.',
                'DOCUMENT_UNLOCKED': 'Un document précédemment verrouillé a été déverrouillé.',
                'USER_CREATED': 'Un nouveau compte utilisateur a été créé dans le système.',
                'USER_UPDATED': 'Les informations d\'un utilisateur ont été modifiées (nom, email, rôle, etc.).',
                'USER_DELETED': 'Un compte utilisateur a été supprimé du système.',
                'USER_BLOCKED': 'Un utilisateur a été bloqué et ne peut plus accéder au système.',
                'USER_UNBLOCKED': 'Un utilisateur précédemment bloqué a été débloqué et peut à nouveau se connecter.',
                'USER_DISCONNECTED': 'Un administrateur a forcé la déconnexion d\'un utilisateur. Cela peut être fait pour des raisons de sécurité.',
                'MAINTENANCE_MODE_ENABLED': 'Le mode maintenance a été activé. Les utilisateurs normaux ne peuvent plus accéder au système.',
                'MAINTENANCE_MODE_DISABLED': 'Le mode maintenance a été désactivé. Tous les utilisateurs peuvent à nouveau accéder au système.',
                'FORCE_LOGOUT_ALL_USERS': 'Tous les utilisateurs ont été déconnectés en même temps par un administrateur.',
                'WHITELIST_UPDATED': 'La liste des utilisateurs autorisés en mode maintenance a été modifiée.',
                'UNAUTHORIZED_SUPERADMIN_ACCESS': 'Quelqu\'un a tenté d\'accéder à l\'espace Super Admin sans autorisation. ATTENTION : action suspecte !',
                'ALL_SECURITY_LOGS_DELETED': 'Tous les journaux de sécurité ont été supprimés. Cette action efface l\'historique des événements.',
                'PROFILE_UPDATED': 'Un utilisateur a modifié les informations de son profil personnel.'
            };

            return explanations[action] || 'Action système enregistrée pour des raisons de traçabilité.';
        };

        const enrichedLogs = logs.map(log => {
            // Créer une copie enrichie du log
            const enrichedLog = { ...log };

            // Ajouter l'explication en français
            if (log.action) {
                enrichedLog.explanation = getLogExplanation(log.action);

                // Ajouter le type d'événement lisible
                enrichedLog.eventType = log.action.replace(/_/g, ' ').toLowerCase()
                    .replace(/\b\w/g, l => l.toUpperCase());
            } else {
                enrichedLog.explanation = 'Action système enregistrée.';
                enrichedLog.eventType = 'Action inconnue';
            }

            // Classifier par sévérité
            if (log.action && criticalActions.includes(log.action)) {
                stats.CRITICAL++;
                enrichedLog.severity = 'CRITICAL';
            } else if (log.action && warningActions.includes(log.action)) {
                stats.WARNING++;
                enrichedLog.severity = 'WARNING';
            } else {
                stats.INFO++;
                enrichedLog.severity = 'INFO';
            }

            return enrichedLog;
        });

        res.json({
            success: true,
            logs: enrichedLogs,
            stats,
            total,
            limit: parseInt(limit),
            skip: parseInt(skip)
        });

    } catch (error) {
        console.error('❌ Erreur /api/security-logs:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur serveur'
        });
    }
});

// Route pour supprimer TOUS les logs de sécurité (Super Admin uniquement)
app.delete('/api/security-logs/all', async (req, res) => {
    try {
        // Vérifier l'authentification
        if (!req.session || !req.session.userId) {
            return res.status(401).json({
                success: false,
                message: 'Non authentifié'
            });
        }

        const { getCollections } = require('./config/database');
        const collections = getCollections();

        // Vérifier que l'utilisateur est Super Admin (niveau 0)
        const user = await collections.users.findOne({ username: req.session.userId });
        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'Utilisateur non trouvé'
            });
        }

        // Récupérer le rôle de l'utilisateur
        const role = await collections.roles.findOne({ _id: user.idRole });
        if (!role || role.niveau !== 0) {
            return res.status(403).json({
                success: false,
                message: 'Accès refusé - Niveau Super Admin requis'
            });
        }

        // Supprimer tous les logs
        const result = await collections.auditLogs.deleteMany({});

        // Enregistrer cette action critique dans les logs
        await collections.auditLogs.insertOne({
            action: 'ALL_SECURITY_LOGS_DELETED',
            userId: req.session.userId,
            details: `Suppression totale de tous les logs de sécurité (${result.deletedCount} logs supprimés)`,
            ip: req.ip || req.connection.remoteAddress,
            timestamp: new Date(),
            severity: 'CRITICAL'
        });

        res.json({
            success: true,
            deletedCount: result.deletedCount,
            message: `${result.deletedCount} log(s) supprimé(s) avec succès`
        });

    } catch (error) {
        console.error('❌ Erreur /api/security-logs/all DELETE:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur serveur'
        });
    }
});

// TODO: Ajouter les autres routes ici
// app.use('/api/superadmin', superadminRoutes);

// ⚠️ Route catch-all déplacée après startServer() pour ne pas intercepter les routes API
// app.get('*', (req, res) => {
//     res.sendFile(path.join(__dirname, 'public', 'index.html'));
// });

// ============================================
// DÉMARRAGE SERVEUR
// ============================================

async function startServer() {
    try {
        console.log('📡 Démarrage du serveur...');
        // Connexion MongoDB
        const { db, collections, securityLogger } = await connectDB();
        console.log('✅ Retour de connectDB reçu');

        // Initialiser le service de nettoyage de la corbeille
        trashCleanup.init({
            documents: collections.documents,
            auditLogs: collections.auditLogs,
            db
        });

        // Démarrer le cron job (uniquement instance principale)
        if (process.env.NODE_APP_INSTANCE === '0' || !process.env.NODE_APP_INSTANCE) {
            trashCleanup.startCronJob();
            console.log('✅ Cron job nettoyage corbeille actif (instance principale)');
        }

        // TODO: Initialiser les données par défaut
        // await initializeDefaultData();

        // Charger les modules Super Admin
        const superAdminAuth = require('./middleware/superAdminAuth');
        const superAdminRoutes = require('./routes/superadmin');

        superAdminAuth.init({
            users: collections.users,
            roles: collections.roles,
            auditLogs: collections.auditLogs
        });

        superAdminRoutes.init(db, {
            users: collections.users,
            documents: collections.documents,
            dossiers: collections.dossiers,  // Collection dossiers pour le module Super Admin
            categories: collections.categories,
            roles: collections.roles,
            departements: collections.departements,
            services: collections.services,
            auditLogs: collections.auditLogs,
            systemSettings: collections.systemSettings,
            shareHistory: collections.shareHistory,
            messages: collections.messages,
            profileChanges: collections.profileChanges
        });

        app.use('/api/superadmin', superAdminRoutes.router);
        console.log('✅ Routes Super Admin (Niveau 0) chargées');

        // Charger les routes de profil
        const profileRoutes = require('./routes-profile');
        profileRoutes(app, collections);

        console.log('✅ Routes d\'authentification avec session configurées');
        console.log('✅ Route catch-all configurée');

        // Démarrer le serveur
        app.listen(constants.PORT, () => {
            console.log('');
            console.log('============================================================');
            console.log('✅ SERVEUR ARCHIVAGE C.E.R.E.R DÉMARRÉ (MVC)');
            console.log('============================================================');
            console.log('');
            console.log(`🔡 http://localhost:${constants.PORT}`);
            console.log('');
            console.log('============================================================');
        });

    } catch (error) {
        console.error('💀 Erreur fatale au démarrage:', error);
        process.exit(1);
    }
}

// Démarrer l'application
console.log('🚀 Lancement de l\'application...');
startServer().catch(err => {
    console.error('💀 Erreur critique au lancement:', err);
    process.exit(1);
});
