// ============================================
// CONFIGURATION CORS - ARCHIVAGE C.E.R.E.R
// ============================================

const { securityLogger } = require('./security-config');

// ============================================
// DOMAINES AUTORISÉS
// ============================================

// Récupérer les domaines autorisés depuis .env
const allowedOriginsEnv = process.env.ALLOWED_ORIGINS || '';
const allowedOrigins = allowedOriginsEnv
    .split(',')
    .map(origin => origin.trim())
    .filter(origin => origin.length > 0);

// Domaines par défaut en développement
const defaultOrigins = [
    'http://localhost:4000',
    'http://127.0.0.1:4000',
    'http://localhost:3000',
    'http://127.0.0.1:3000'
];

// Liste finale des domaines
const finalAllowedOrigins = allowedOrigins.length > 0
    ? allowedOrigins
    : defaultOrigins;

// ============================================
// OPTIONS CORS
// ============================================

const corsOptions = {
    origin: function (origin, callback) {
        // Permettre les requêtes sans origin (mobile apps, Postman, etc.)
        if (!origin) {
            return callback(null, true);
        }

        // Vérifier si l'origin est autorisée
        if (finalAllowedOrigins.indexOf(origin) !== -1) {
            securityLogger.info({
                event: 'CORS_ALLOWED',
                origin: origin,
                timestamp: new Date()
            });
            callback(null, true);
        } else {
            securityLogger.warn({
                event: 'CORS_BLOCKED',
                origin: origin,
                allowedOrigins: finalAllowedOrigins,
                timestamp: new Date()
            });

            callback(new Error(`Origin ${origin} non autorisée par CORS`));
        }
    },

    // Méthodes HTTP autorisées
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],

    // Headers autorisés
    allowedHeaders: [
        'Content-Type',
        'Authorization',
        'X-Requested-With',
        'Accept',
        'Origin'
    ],

    // Headers exposés au client
    exposedHeaders: [
        'X-Total-Count',
        'X-Page-Count',
        'X-Current-Page'
    ],

    // Permettre l'envoi de cookies
    credentials: true,

    // Temps de cache pour les requêtes preflight (OPTIONS)
    maxAge: 86400, // 24 heures

    // Status code pour les requêtes preflight réussies
    optionsSuccessStatus: 204
};

// ============================================
// CORS MODE STRICT (Production)
// ============================================

const strictCorsOptions = {
    origin: function (origin, callback) {
        // En mode strict, TOUJOURS vérifier l'origin
        if (!origin) {
            securityLogger.warn({
                event: 'CORS_NO_ORIGIN',
                message: 'Requête sans origin bloquée en mode strict',
                timestamp: new Date()
            });
            return callback(new Error('Origin requise en mode strict'));
        }

        if (finalAllowedOrigins.indexOf(origin) !== -1) {
            callback(null, true);
        } else {
            securityLogger.error({
                event: 'CORS_BLOCKED_STRICT',
                origin: origin,
                allowedOrigins: finalAllowedOrigins,
                timestamp: new Date()
            });

            callback(new Error(`Origin ${origin} non autorisée`));
        }
    },

    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    exposedHeaders: [],
    credentials: true,
    maxAge: 86400,
    optionsSuccessStatus: 204
};

// ============================================
// SÉLECTION DU MODE CORS
// ============================================

// Utiliser le mode strict en production
const isProduction = process.env.NODE_ENV === 'production';
const activeCorsOptions = isProduction ? strictCorsOptions : corsOptions;

// Logger la configuration CORS au démarrage
console.log('🔒 Configuration CORS:');
console.log(`   Mode: ${isProduction ? 'STRICT (Production)' : 'NORMAL (Développement)'}`);
console.log(`   Origins autorisées: ${finalAllowedOrigins.join(', ')}`);
console.log(`   Credentials: ${activeCorsOptions.credentials}`);

// ============================================
// MIDDLEWARE DE VÉRIFICATION ORIGIN
// ============================================

/**
 * Middleware pour vérifier l'origin de toutes les requêtes
 * Ajoute des headers de sécurité supplémentaires
 */
function verifyOrigin(req, res, next) {
    const origin = req.get('origin');

    // Logger toutes les requêtes avec origin
    if (origin) {
        securityLogger.debug({
            event: 'REQUEST_WITH_ORIGIN',
            origin: origin,
            method: req.method,
            path: req.path,
            ip: req.ip
        });
    }

    // Headers de sécurité supplémentaires
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

    // En production, ajouter Strict-Transport-Security (HSTS)
    if (isProduction) {
        res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
    }

    next();
}

// ============================================
// UTILITAIRES
// ============================================

/**
 * Vérifie si une origin est autorisée
 * @param {String} origin - Origin à vérifier
 * @returns {Boolean}
 */
function isOriginAllowed(origin) {
    return finalAllowedOrigins.indexOf(origin) !== -1;
}

/**
 * Ajoute une origin à la liste des autorisées (runtime)
 * @param {String} origin - Origin à ajouter
 */
function addAllowedOrigin(origin) {
    if (!finalAllowedOrigins.includes(origin)) {
        finalAllowedOrigins.push(origin);
        securityLogger.info({
            event: 'ORIGIN_ADDED',
            origin: origin,
            timestamp: new Date()
        });
    }
}

/**
 * Retire une origin de la liste (runtime)
 * @param {String} origin - Origin à retirer
 */
function removeAllowedOrigin(origin) {
    const index = finalAllowedOrigins.indexOf(origin);
    if (index > -1) {
        finalAllowedOrigins.splice(index, 1);
        securityLogger.info({
            event: 'ORIGIN_REMOVED',
            origin: origin,
            timestamp: new Date()
        });
    }
}

/**
 * Obtient la liste des origins autorisées
 * @returns {Array<String>}
 */
function getAllowedOrigins() {
    return [...finalAllowedOrigins];
}

// ============================================
// EXPORTS
// ============================================

module.exports = {
    // Options CORS
    corsOptions: activeCorsOptions,

    // Middlewares
    verifyOrigin,

    // Utilitaires
    isOriginAllowed,
    addAllowedOrigin,
    removeAllowedOrigin,
    getAllowedOrigins,

    // Constantes (pour tests)
    isProduction
};
