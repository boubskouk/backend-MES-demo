// ============================================
// CONFIGURATION JWT - ARCHIVAGE C.E.R.E.R
// ============================================

const jwt = require('jsonwebtoken');
const { securityLogger, logUnauthorizedAccess } = require('./security-config');

// ============================================
// CONFIGURATION
// ============================================

// Secret JWT depuis .env (OBLIGATOIRE en production)
const JWT_SECRET = process.env.JWT_SECRET || 'DEV_SECRET_CHANGE_IN_PRODUCTION_8h3kJ9mN2pQ5rT7vW1xZ4bC6dF0gH8';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'REFRESH_SECRET_CHANGE_IN_PRODUCTION_9kL4mN7pQ2sT5vW8xZ1bC3dF6gH0jK';

// Durées de vie des tokens
const ACCESS_TOKEN_EXPIRY = process.env.JWT_EXPIRY || '2h'; // Token court pour les actions
const REFRESH_TOKEN_EXPIRY = process.env.JWT_REFRESH_EXPIRY || '7d'; // Token long pour renouveler

// ============================================
// GÉNÉRATION DE TOKENS
// ============================================

/**
 * Génère un access token JWT
 * @param {Object} user - Informations utilisateur
 * @returns {String} Token JWT
 */
function generateAccessToken(user) {
    const payload = {
        userId: user._id.toString(),
        username: user.username,
        email: user.email,
        role: user.role,
        niveau: user.niveau,
        departement: user.departement,
        type: 'access'
    };

    return jwt.sign(payload, JWT_SECRET, {
        expiresIn: ACCESS_TOKEN_EXPIRY,
        issuer: 'cerer-archivage',
        audience: 'cerer-users'
    });
}

/**
 * Génère un refresh token JWT
 * @param {Object} user - Informations utilisateur
 * @returns {String} Refresh token JWT
 */
function generateRefreshToken(user) {
    const payload = {
        userId: user._id.toString(),
        username: user.username,
        type: 'refresh'
    };

    return jwt.sign(payload, JWT_REFRESH_SECRET, {
        expiresIn: REFRESH_TOKEN_EXPIRY,
        issuer: 'cerer-archivage',
        audience: 'cerer-users'
    });
}

/**
 * Génère les deux tokens (access + refresh)
 * @param {Object} user - Informations utilisateur
 * @returns {Object} { accessToken, refreshToken }
 */
function generateTokens(user) {
    return {
        accessToken: generateAccessToken(user),
        refreshToken: generateRefreshToken(user)
    };
}

// ============================================
// VÉRIFICATION DE TOKENS
// ============================================

/**
 * Vérifie et décode un access token
 * @param {String} token - Token à vérifier
 * @returns {Object|null} Payload décodé ou null si invalide
 */
function verifyAccessToken(token) {
    try {
        const decoded = jwt.verify(token, JWT_SECRET, {
            issuer: 'cerer-archivage',
            audience: 'cerer-users'
        });

        // Vérifier que c'est bien un access token
        if (decoded.type !== 'access') {
            return null;
        }

        return decoded;
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            securityLogger.warn({
                event: 'TOKEN_EXPIRED',
                message: 'Access token expiré',
                expiredAt: error.expiredAt
            });
        } else if (error.name === 'JsonWebTokenError') {
            securityLogger.warn({
                event: 'TOKEN_INVALID',
                message: 'Token invalide',
                error: error.message
            });
        }
        return null;
    }
}

/**
 * Vérifie et décode un refresh token
 * @param {String} token - Refresh token à vérifier
 * @returns {Object|null} Payload décodé ou null si invalide
 */
function verifyRefreshToken(token) {
    try {
        const decoded = jwt.verify(token, JWT_REFRESH_SECRET, {
            issuer: 'cerer-archivage',
            audience: 'cerer-users'
        });

        // Vérifier que c'est bien un refresh token
        if (decoded.type !== 'refresh') {
            return null;
        }

        return decoded;
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            securityLogger.warn({
                event: 'REFRESH_TOKEN_EXPIRED',
                message: 'Refresh token expiré',
                expiredAt: error.expiredAt
            });
        }
        return null;
    }
}

// ============================================
// MIDDLEWARE D'AUTHENTIFICATION JWT
// ============================================

/**
 * Middleware pour protéger les routes avec JWT
 * Extrait le token du header Authorization ou des cookies
 */
function authenticateToken(req, res, next) {
    // Extraire le token du header Authorization (Bearer token)
    const authHeader = req.headers['authorization'];
    let token = authHeader && authHeader.split(' ')[1]; // Format: "Bearer TOKEN"

    // Si pas dans le header, chercher dans les cookies
    if (!token && req.cookies && req.cookies.accessToken) {
        token = req.cookies.accessToken;
    }

    if (!token) {
        securityLogger.warn({
            event: 'AUTH_TOKEN_MISSING',
            ip: req.ip,
            path: req.path,
            userAgent: req.headers['user-agent']
        });

        return res.status(401).json({
            success: false,
            message: 'Token d\'authentification manquant',
            code: 'TOKEN_MISSING'
        });
    }

    const decoded = verifyAccessToken(token);

    if (!decoded) {
        securityLogger.warn({
            event: 'AUTH_TOKEN_INVALID',
            ip: req.ip,
            path: req.path,
            userAgent: req.headers['user-agent']
        });

        return res.status(403).json({
            success: false,
            message: 'Token invalide ou expiré',
            code: 'TOKEN_INVALID'
        });
    }

    // Ajouter les infos utilisateur à la requête
    req.user = decoded;

    // Logger l'accès réussi
    securityLogger.info({
        event: 'AUTH_SUCCESS',
        userId: decoded.userId,
        username: decoded.username,
        path: req.path,
        method: req.method,
        ip: req.ip
    });

    next();
}

// ============================================
// MIDDLEWARE DE VÉRIFICATION DE RÔLE
// ============================================

/**
 * Middleware pour vérifier le niveau d'accès
 * @param {Array<Number>} allowedLevels - Niveaux autorisés [1, 2, 3]
 */
function requireLevel(...allowedLevels) {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: 'Authentification requise'
            });
        }

        if (!allowedLevels.includes(req.user.niveau)) {
            logUnauthorizedAccess(
                req.user.username,
                req.path,
                req.ip,
                req.headers['user-agent']
            );

            return res.status(403).json({
                success: false,
                message: 'Niveau d\'accès insuffisant',
                requiredLevels: allowedLevels,
                userLevel: req.user.niveau
            });
        }

        next();
    };
}

/**
 * Middleware pour vérifier qu'un utilisateur est admin (niveau 1 ou 2)
 */
function requireAdmin(req, res, next) {
    return requireLevel(1, 2)(req, res, next);
}

/**
 * Middleware pour vérifier qu'un utilisateur est admin principal (niveau 1)
 */
function requirePrincipalAdmin(req, res, next) {
    return requireLevel(1)(req, res, next);
}

// ============================================
// UTILITAIRES
// ============================================

/**
 * Extrait le token sans le vérifier (pour debug)
 * @param {String} token - Token JWT
 * @returns {Object|null} Payload décodé (non vérifié)
 */
function decodeToken(token) {
    try {
        return jwt.decode(token);
    } catch (error) {
        return null;
    }
}

/**
 * Vérifie si un token est expiré
 * @param {String} token - Token JWT
 * @returns {Boolean} true si expiré
 */
function isTokenExpired(token) {
    const decoded = decodeToken(token);
    if (!decoded || !decoded.exp) {
        return true;
    }

    const now = Math.floor(Date.now() / 1000);
    return decoded.exp < now;
}

// ============================================
// EXPORTS
// ============================================

module.exports = {
    // Génération de tokens
    generateAccessToken,
    generateRefreshToken,
    generateTokens,

    // Vérification de tokens
    verifyAccessToken,
    verifyRefreshToken,

    // Middlewares
    authenticateToken,
    requireLevel,
    requireAdmin,
    requirePrincipalAdmin,

    // Utilitaires
    decodeToken,
    isTokenExpired,

    // Constantes (pour tests)
    JWT_SECRET,
    ACCESS_TOKEN_EXPIRY,
    REFRESH_TOKEN_EXPIRY
};
