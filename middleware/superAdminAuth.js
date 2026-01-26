/**
 * ============================================
 * MIDDLEWARE D'AUTHENTIFICATION SUPER ADMIN
 * ============================================
 *
 * Vérifie que l'utilisateur est authentifié ET a le niveau 0
 * Toutes les routes /api/superadmin/* nécessitent ce middleware
 */

const { ObjectId } = require('mongodb');

// Collections (initialisées depuis server.js)
let usersCollection;
let rolesCollection;
let auditLogsCollection;

/**
 * Initialiser les collections
 */
function init(collections) {
    usersCollection = collections.users;
    rolesCollection = collections.roles;
    auditLogsCollection = collections.auditLogs;

    console.log('✅ Middleware Super Admin initialisé');
}

/**
 * Middleware principal - Vérification niveau 0
 */
async function requireSuperAdmin(req, res, next) {
    try {
        // 1. Vérifier la session
        if (!req.session.userId) {
            return res.status(401).json({
                success: false,
                message: "Non authentifié. Veuillez vous connecter."
            });
        }

        // 2. Récupérer l'utilisateur
        const user = await usersCollection.findOne({
            username: req.session.userId
        });

        if (!user) {
            return res.status(401).json({
                success: false,
                message: "Utilisateur non trouvé"
            });
        }

        // 3. Vérifier le rôle/niveau
        const role = await rolesCollection.findOne({
            _id: user.idRole
        });

        if (!role || role.niveau !== 0) {
            // 🔒 SÉCURITÉ : Logger la tentative d'accès non autorisée
            await logUnauthorizedAccess(req, user, role);

            return res.status(403).json({
                success: false,
                message: "Accès interdit. Cette fonctionnalité est réservée aux Super Administrateurs."
            });
        }

        // 4. Ajouter les infos utilisateur à la requête
        req.superAdmin = {
            user: user,
            role: role,
            username: user.username
        };

        // Continuer vers la route
        next();

    } catch (error) {
        console.error('❌ Erreur middleware Super Admin:', error);
        res.status(500).json({
            success: false,
            message: "Erreur serveur lors de la vérification des permissions"
        });
    }
}

/**
 * Logger les tentatives d'accès non autorisées
 */
async function logUnauthorizedAccess(req, user, role) {
    try {
        await auditLogsCollection.insertOne({
            timestamp: new Date(),
            user: user.username,
            userLevel: role?.niveau || -1,
            action: "UNAUTHORIZED_SUPERADMIN_ACCESS",
            target: {
                route: req.path,
                method: req.method
            },
            details: {
                userRole: role?.nom || "Inconnu",
                attemptedAccess: "Super Admin Dashboard"
            },
            ip: req.ip,
            userAgent: req.headers['user-agent'],
            result: "blocked"
        });

        console.warn(`⚠️  Tentative accès Super Admin bloquée: ${user.username} (niveau ${role?.niveau || -1})`);
    } catch (error) {
        console.error('❌ Erreur log unauthorized access:', error);
    }
}

/**
 * Logger une action Super Admin (helper)
 */
async function logAction(userId, action, target, details, req) {
    try {
        await auditLogsCollection.insertOne({
            timestamp: new Date(),
            user: userId,
            userLevel: 0,
            action: action,
            target: target || {},
            details: details || {},
            ip: req.ip,
            userAgent: req.headers['user-agent'],
            result: details.result || "success"
        });

        console.log(`📝 Action Super Admin loggée: ${userId} - ${action}`);
    } catch (error) {
        console.error('❌ Erreur log action:', error);
    }
}

module.exports = {
    init,
    requireSuperAdmin,
    logAction
};
