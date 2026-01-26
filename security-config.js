// ============================================
// CONFIGURATION SÉCURITÉ - ARCHIVAGE C.E.R.E.R
// ============================================

const rateLimit = require('express-rate-limit');
const mongoSanitize = require('express-mongo-sanitize');
const helmet = require('helmet');
const winston = require('winston');
const expressWinston = require('express-winston');
const compression = require('compression');

// ============================================
// LOGGER DE SÉCURITÉ
// ============================================

// Créer le dossier logs s'il n'existe pas
const fs = require('fs');
const path = require('path');
const logsDir = path.join(__dirname, 'logs');
if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir);
}

// Logger de sécurité
const securityLogger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
    ),
    transports: [
        new winston.transports.File({
            filename: path.join(logsDir, 'security.log'),
            maxsize: 10485760, // 10MB
            maxFiles: 5
        }),
        new winston.transports.File({
            filename: path.join(logsDir, 'error.log'),
            level: 'error',
            maxsize: 10485760,
            maxFiles: 5
        })
    ]
});

// Logger console en développement
if (process.env.NODE_ENV !== 'production') {
    securityLogger.add(new winston.transports.Console({
        format: winston.format.combine(
            winston.format.colorize(),
            winston.format.simple()
        )
    }));
}

// ============================================
// RATE LIMITING
// ============================================

// Rate limiter général (2000 requêtes par 15 minutes)
// ✅ OPTIMISÉ pour environnement universitaire (20-50 utilisateurs simultanés derrière même IP)
const generalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 2000, // ✅ 2000 requêtes max (adapté pour 20-50 users simultanés)
    message: 'Trop de requêtes depuis cette IP. Veuillez réessayer dans 15 minutes.',
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
        securityLogger.warn({
            event: 'RATE_LIMIT_EXCEEDED',
            ip: req.ip,
            path: req.path,
            userAgent: req.headers['user-agent']
        });
        res.status(429).json({
            success: false,
            message: 'Trop de requêtes. Veuillez réessayer dans 15 minutes.'
        });
    }
});

// Rate limiter strict pour login (15 tentatives par 15 minutes)
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 15, // 15 tentatives max (tolérance pour campus avec plusieurs users/IP)
    skipSuccessfulRequests: true, // Ne pas compter les connexions réussies
    message: 'Trop de tentatives de connexion. Réessayez dans 15 minutes.',
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
        securityLogger.warn({
            event: 'LOGIN_RATE_LIMIT_EXCEEDED',
            ip: req.ip,
            username: req.body?.username,
            userAgent: req.headers['user-agent']
        });
        res.status(429).json({
            success: false,
            message: 'Trop de tentatives de connexion. Réessayez dans 15 minutes.'
        });
    }
});

// Rate limiter pour uploads (100 par heure)
// ✅ OPTIMISÉ pour permettre plus d'uploads simultanés (20-50 users)
const uploadLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 heure
    max: 100, // ✅ 100 uploads max (adapté pour 20-50 users simultanés)
    message: 'Trop d\'uploads. Réessayez dans 1 heure.',
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
        securityLogger.warn({
            event: 'UPLOAD_RATE_LIMIT_EXCEEDED',
            ip: req.ip,
            userAgent: req.headers['user-agent']
        });
        res.status(429).json({
            success: false,
            message: 'Trop d\'uploads. Réessayez dans 1 heure.'
        });
    }
});

// ============================================
// HELMET - HEADERS DE SÉCURITÉ
// ============================================

const helmetConfig = helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: [
                "'self'",
                "'unsafe-inline'",
                "https://cdn.tailwindcss.com",
                "https://cdnjs.cloudflare.com" // ✅ Pour pdf.js, mammoth, xlsx
            ],
            scriptSrcAttr: ["'unsafe-inline'"], // ✅ Permet les onclick, onchange, etc.
            styleSrc: ["'self'", "'unsafe-inline'", "https://cdn.tailwindcss.com"],
            imgSrc: ["'self'", "data:", "https:", "blob:"],
            connectSrc: ["'self'", "blob:"], // ✅ blob: pour pdf.js
            fontSrc: ["'self'", "data:", "https://r2cdn.perplexity.ai"],
            objectSrc: ["'self'", "data:", "blob:"], // ✅ Permet les PDFs avec <object> ou <embed>
            mediaSrc: ["'self'"],
            frameSrc: [
                "'self'",
                "data:",
                "blob:",
                "https://view.officeapps.live.com" // ✅ Microsoft Office Online Viewer
            ],
            workerSrc: ["'self'", "blob:"] // ✅ Pour pdf.js workers
        }
    },
    crossOriginEmbedderPolicy: false, // Permet le chargement de ressources externes
    crossOriginResourcePolicy: { policy: "cross-origin" }
});

// ============================================
// SANITIZATION NOSQL
// ============================================

const sanitizeConfig = mongoSanitize({
    replaceWith: '_',
    onSanitize: ({ req, key }) => {
        securityLogger.warn({
            event: 'NOSQL_INJECTION_ATTEMPT',
            ip: req.ip,
            key,
            path: req.path,
            userAgent: req.headers['user-agent']
        });
    }
});

// ============================================
// COMPRESSION
// ============================================

const compressionConfig = compression({
    level: 6, // Niveau de compression (0-9)
    threshold: 1024, // Compresser si > 1KB
    filter: (req, res) => {
        if (req.headers['x-no-compression']) {
            return false;
        }
        return compression.filter(req, res);
    }
});

// ============================================
// LOGGER DES REQUÊTES HTTP
// ============================================

const requestLogger = expressWinston.logger({
    transports: [
        new winston.transports.File({
            filename: path.join(logsDir, 'requests.log'),
            maxsize: 10485760,
            maxFiles: 5
        })
    ],
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
    ),
    meta: true,
    msg: "HTTP {{req.method}} {{req.url}}",
    expressFormat: true,
    colorize: false,
    ignoreRoute: (req, res) => {
        // Ne pas logger les fichiers statiques
        return req.url.startsWith('/css/') ||
               req.url.startsWith('/js/') ||
               req.url.startsWith('/images/');
    }
});

// ============================================
// LOGGER D'ERREURS HTTP
// ============================================

const errorLogger = expressWinston.errorLogger({
    transports: [
        new winston.transports.File({
            filename: path.join(logsDir, 'error.log'),
            maxsize: 10485760,
            maxFiles: 5
        })
    ],
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
    )
});

// ============================================
// FONCTIONS DE LOGGING
// ============================================

function logSecurityEvent(event, user, details) {
    securityLogger.info({
        timestamp: new Date(),
        event,
        user,
        ...details
    });
}

function logLoginSuccess(username, ip, userAgent) {
    securityLogger.info({
        event: 'LOGIN_SUCCESS',
        username,
        ip,
        userAgent,
        timestamp: new Date()
    });
}

function logLoginFailure(username, ip, userAgent, reason) {
    securityLogger.warn({
        event: 'LOGIN_FAILED',
        username,
        ip,
        userAgent,
        reason,
        timestamp: new Date()
    });
}

function logUnauthorizedAccess(username, resource, ip, userAgent) {
    securityLogger.warn({
        event: 'UNAUTHORIZED_ACCESS',
        username,
        resource,
        ip,
        userAgent,
        timestamp: new Date()
    });
}

// ============================================
// HANDLER D'ERREURS GLOBAL
// ============================================

function errorHandler(err, req, res, next) {
    // Logger l'erreur complète
    securityLogger.error({
        error: err.message,
        stack: err.stack,
        url: req.url,
        method: req.method,
        ip: req.ip,
        userAgent: req.headers['user-agent'],
        timestamp: new Date()
    });

    // Réponse au client
    if (process.env.NODE_ENV === 'production') {
        // En production, message générique
        res.status(err.status || 500).json({
            success: false,
            message: 'Une erreur est survenue. Veuillez réessayer.'
        });
    } else {
        // En développement, donner plus de détails
        res.status(err.status || 500).json({
            success: false,
            message: err.message,
            stack: err.stack
        });
    }
}

// ============================================
// EXPORTS
// ============================================

module.exports = {
    // Limiters
    generalLimiter,
    loginLimiter,
    uploadLimiter,

    // Middlewares de sécurité
    helmetConfig,
    sanitizeConfig,
    compressionConfig,

    // Loggers
    requestLogger,
    errorLogger,
    securityLogger,

    // Fonctions de logging
    logSecurityEvent,
    logLoginSuccess,
    logLoginFailure,
    logUnauthorizedAccess,

    // Handler d'erreurs
    errorHandler
};
