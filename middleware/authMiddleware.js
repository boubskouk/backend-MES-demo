// ============================================
// MIDDLEWARE D'AUTHENTIFICATION
// ============================================

const { getCollections } = require('../config/database');

/**
 * Vérifier si l'utilisateur est authentifié
 */
function isAuthenticated(req, res, next) {
    if (!req.session || !req.session.userId) {
        return res.status(401).json({
            success: false,
            message: 'Non authentifié. Veuillez vous connecter.'
        });
    }
    next();
}

/**
 * Middleware unifié pour vérifier isOnline et blocked en une seule requête
 * OPTIMISATION: Fusionné pour éviter 2 requêtes MongoDB par requête API
 */
async function checkUserStatus(req, res, next) {
    // Ignorer pour les routes publiques
    const publicRoutes = ['/api/login', '/api/logout', '/api/check-session-status', '/api/register', '/api/verify-session', '/api/admin-login'];
    if (publicRoutes.includes(req.path) || !req.path.startsWith('/api/')) {
        return next();
    }

    // Vérifier uniquement si l'utilisateur est connecté
    if (!req.session || !req.session.userId) {
        return next();
    }

    try {
        const collections = getCollections();
        // ⚡ UNE SEULE REQUÊTE pour vérifier à la fois isOnline et blocked
        const user = await collections.users.findOne({ username: req.session.userId });

        if (!user) {
            // Utilisateur n'existe plus - détruire la session
            req.session.destroy();
            return res.status(401).json({
                success: false,
                message: 'Session invalide',
                forceLogout: true
            });
        }

        // 🔒 SÉCURITÉ: Si bloqué, refuser l'accès
        if (user.blocked) {
            console.log(`🔒 Accès refusé: ${req.session.userId} (compte bloqué)`);
            req.session.destroy();
            return res.status(403).json({
                success: false,
                message: user.blockedReason || 'Votre compte a été bloqué',
                blocked: true
            });
        }

        // 🔒 SÉCURITÉ: Si isOnline est false, vérifier si c'est une déconnexion forcée récente
        if (user.isOnline === false) {
            // Si l'utilisateur a été déconnecté il y a moins de 5 minutes, c'est une déconnexion forcée
            const now = new Date();
            const lastActivity = user.lastActivity ? new Date(user.lastActivity) : null;
            const timeSinceLastActivity = lastActivity ? (now - lastActivity) / 1000 / 60 : 999; // en minutes

            if (timeSinceLastActivity < 10) {
                // Déconnexion forcée récente par un admin - refuser l'accès
                console.log(`🔒 Déconnexion forcée: ${req.session.userId} (isOnline = false, dernière activité il y a ${Math.round(timeSinceLastActivity)} min)`);
                req.session.destroy();
                return res.status(401).json({
                    success: false,
                    message: 'Votre session a été fermée par un administrateur',
                    forceLogout: true
                });
            } else {
                // isOnline est false mais pas de déconnexion récente - probablement un problème de synchronisation
                // Remettre isOnline à true et laisser continuer
                console.log(`⚠️ isOnline était false pour ${req.session.userId}, remise à true automatique`);
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
        }

        // Tout est OK, continuer
        next();

    } catch (error) {
        console.error('❌ Erreur checkUserStatus:', error);
        next(); // Continuer même en cas d'erreur pour ne pas bloquer l'application
    }
}

/**
 * @deprecated Utilisez checkUserStatus à la place
 * Conservé pour compatibilité
 */
async function checkIsOnline(req, res, next) {
    return checkUserStatus(req, res, next);
}

/**
 * @deprecated Utilisez checkUserStatus à la place
 * Conservé pour compatibilité
 */
async function checkIfBlocked(req, res, next) {
    return checkUserStatus(req, res, next);
}

module.exports = {
    isAuthenticated,
    checkUserStatus,  // ⚡ Nouveau middleware optimisé
    checkIsOnline,    // Pour compatibilité (appelle checkUserStatus)
    checkIfBlocked    // Pour compatibilité (appelle checkUserStatus)
};
