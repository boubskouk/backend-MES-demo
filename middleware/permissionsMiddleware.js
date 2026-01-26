// ============================================
// MIDDLEWARE DE VÉRIFICATION DES PERMISSIONS
// ============================================

const { getCollections } = require('../config/database');
const constants = require('../utils/constants');

/**
 * Vérifier que l'utilisateur est Super Admin (niveau 0)
 */
async function requireSuperAdmin(req, res, next) {
    try {
        if (!req.session || !req.session.userId) {
            return res.status(401).json({
                success: false,
                message: 'Non authentifié'
            });
        }

        const collections = getCollections();
        const user = await collections.users.findOne({ username: req.session.userId });

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'Utilisateur non trouvé'
            });
        }

        const userRole = await collections.roles.findOne({ _id: user.idRole });

        if (!userRole || userRole.niveau !== constants.PERMISSIONS.SUPER_ADMIN) {
            return res.status(403).json({
                success: false,
                message: 'Accès refusé - Réservé aux Super Administrateurs'
            });
        }

        // Ajouter les infos utilisateur à req pour utilisation ultérieure
        req.user = user;
        req.userRole = userRole;

        next();
    } catch (error) {
        console.error('❌ Erreur requireSuperAdmin:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur serveur'
        });
    }
}

/**
 * Vérifier que l'utilisateur est au moins niveau 1 (Primaire)
 */
async function requireLevel1OrAbove(req, res, next) {
    try {
        if (!req.session || !req.session.userId) {
            return res.status(401).json({
                success: false,
                message: 'Non authentifié'
            });
        }

        const collections = getCollections();
        const user = await collections.users.findOne({ username: req.session.userId });

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'Utilisateur non trouvé'
            });
        }

        const userRole = await collections.roles.findOne({ _id: user.idRole });

        if (!userRole || userRole.niveau > constants.PERMISSIONS.PRIMAIRE) {
            return res.status(403).json({
                success: false,
                message: 'Accès refusé - Permission niveau 1 requise'
            });
        }

        req.user = user;
        req.userRole = userRole;

        next();
    } catch (error) {
        console.error('❌ Erreur requireLevel1OrAbove:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur serveur'
        });
    }
}

/**
 * Vérifier un niveau spécifique ou supérieur
 */
function requireLevel(maxLevel) {
    return async (req, res, next) => {
        try {
            if (!req.session || !req.session.userId) {
                return res.status(401).json({
                    success: false,
                    message: 'Non authentifié'
                });
            }

            const collections = getCollections();
            const user = await collections.users.findOne({ username: req.session.userId });

            if (!user) {
                return res.status(404).json({
                    success: false,
                    message: 'Utilisateur non trouvé'
                });
            }

            const userRole = await collections.roles.findOne({ _id: user.idRole });

            if (!userRole || userRole.niveau > maxLevel) {
                return res.status(403).json({
                    success: false,
                    message: `Accès refusé - Permission niveau ${maxLevel} ou supérieur requise`
                });
            }

            req.user = user;
            req.userRole = userRole;

            next();
        } catch (error) {
            console.error('❌ Erreur requireLevel:', error);
            res.status(500).json({
                success: false,
                message: 'Erreur serveur'
            });
        }
    };
}

module.exports = {
    requireSuperAdmin,
    requireLevel1OrAbove,
    requireLevel
};
