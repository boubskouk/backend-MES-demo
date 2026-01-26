// ============================================
// SYSTÈME D'AUDIT LOGS - ARCHIVAGE C.E.R.E.R
// ============================================

const winston = require('winston');
const path = require('path');
const fs = require('fs');

// ============================================
// CONFIGURATION DOSSIERS
// ============================================

const logsDir = path.join(__dirname, 'logs');
const auditDir = path.join(logsDir, 'audit');

// Créer les dossiers s'ils n'existent pas
[logsDir, auditDir].forEach(dir => {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
});

// ============================================
// LOGGER D'AUDIT
// ============================================

const auditLogger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(
        winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        winston.format.json()
    ),
    defaultMeta: { service: 'cerer-archivage' },
    transports: [
        // Tous les événements d'audit
        new winston.transports.File({
            filename: path.join(auditDir, 'audit-all.log'),
            maxsize: 10485760, // 10MB
            maxFiles: 10,
            tailable: true
        }),

        // Événements de sécurité critiques
        new winston.transports.File({
            filename: path.join(auditDir, 'audit-security.log'),
            level: 'warn',
            maxsize: 10485760,
            maxFiles: 10
        }),

        // Accès aux documents
        new winston.transports.File({
            filename: path.join(auditDir, 'audit-documents.log'),
            maxsize: 10485760,
            maxFiles: 5
        }),

        // Actions utilisateurs
        new winston.transports.File({
            filename: path.join(auditDir, 'audit-users.log'),
            maxsize: 10485760,
            maxFiles: 5
        })
    ]
});

// Console en développement
if (process.env.NODE_ENV !== 'production') {
    auditLogger.add(new winston.transports.Console({
        format: winston.format.combine(
            winston.format.colorize(),
            winston.format.printf(info => {
                return `[AUDIT] ${info.timestamp} ${info.level}: ${info.event} - ${JSON.stringify(info.details || {})}`;
            })
        )
    }));
}

// ============================================
// TYPES D'ÉVÉNEMENTS D'AUDIT
// ============================================

const AuditEventTypes = {
    // Authentification
    LOGIN_SUCCESS: 'LOGIN_SUCCESS',
    LOGIN_FAILED: 'LOGIN_FAILED',
    LOGOUT: 'LOGOUT',
    PASSWORD_CHANGED: 'PASSWORD_CHANGED',
    TOKEN_REFRESHED: 'TOKEN_REFRESHED',
    UNAUTHORIZED_ACCESS: 'UNAUTHORIZED_ACCESS',

    // Utilisateurs
    USER_CREATED: 'USER_CREATED',
    USER_UPDATED: 'USER_UPDATED',
    USER_DELETED: 'USER_DELETED',
    USER_ROLE_CHANGED: 'USER_ROLE_CHANGED',

    // Documents
    DOCUMENT_UPLOADED: 'DOCUMENT_UPLOADED',
    DOCUMENT_VIEWED: 'DOCUMENT_VIEWED',
    DOCUMENT_DOWNLOADED: 'DOCUMENT_DOWNLOADED',
    DOCUMENT_UPDATED: 'DOCUMENT_UPDATED',
    DOCUMENT_DELETED: 'DOCUMENT_DELETED',
    DOCUMENT_SHARED: 'DOCUMENT_SHARED',
    DOCUMENT_UNSHARED: 'DOCUMENT_UNSHARED',

    // Demandes de suppression
    DELETION_REQUESTED: 'DELETION_REQUESTED',
    DELETION_APPROVED: 'DELETION_APPROVED',
    DELETION_REJECTED: 'DELETION_REJECTED',

    // Sécurité
    RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
    NOSQL_INJECTION_ATTEMPT: 'NOSQL_INJECTION_ATTEMPT',
    CORS_VIOLATION: 'CORS_VIOLATION',
    INVALID_TOKEN: 'INVALID_TOKEN',
    EXPIRED_TOKEN: 'EXPIRED_TOKEN',

    // Système
    SERVER_STARTED: 'SERVER_STARTED',
    SERVER_STOPPED: 'SERVER_STOPPED',
    DATABASE_CONNECTED: 'DATABASE_CONNECTED',
    DATABASE_ERROR: 'DATABASE_ERROR',
    CONFIG_CHANGED: 'CONFIG_CHANGED'
};

// ============================================
// FONCTIONS D'AUDIT
// ============================================

/**
 * Enregistre un événement d'audit
 * @param {String} eventType - Type d'événement (depuis AuditEventTypes)
 * @param {Object} details - Détails de l'événement
 * @param {String} level - Niveau de log (info, warn, error)
 */
function logAuditEvent(eventType, details = {}, level = 'info') {
    const logEntry = {
        event: eventType,
        timestamp: new Date().toISOString(),
        details: details
    };

    auditLogger.log(level, logEntry);
}

// ============================================
// LOGS AUTHENTIFICATION
// ============================================

function logLoginSuccess(username, userId, ip, userAgent) {
    logAuditEvent(AuditEventTypes.LOGIN_SUCCESS, {
        username,
        userId,
        ip,
        userAgent,
        method: 'JWT'
    });
}

function logLoginFailed(username, ip, userAgent, reason) {
    logAuditEvent(AuditEventTypes.LOGIN_FAILED, {
        username,
        ip,
        userAgent,
        reason
    }, 'warn');
}

function logLogout(username, userId, ip) {
    logAuditEvent(AuditEventTypes.LOGOUT, {
        username,
        userId,
        ip
    });
}

function logPasswordChanged(username, userId, changedBy, ip) {
    logAuditEvent(AuditEventTypes.PASSWORD_CHANGED, {
        username,
        userId,
        changedBy,
        ip
    }, 'warn');
}

function logTokenRefreshed(username, userId, ip) {
    logAuditEvent(AuditEventTypes.TOKEN_REFRESHED, {
        username,
        userId,
        ip
    });
}

function logUnauthorizedAccess(username, userId, resource, ip, userAgent) {
    logAuditEvent(AuditEventTypes.UNAUTHORIZED_ACCESS, {
        username,
        userId,
        resource,
        ip,
        userAgent
    }, 'warn');
}

// ============================================
// LOGS UTILISATEURS
// ============================================

function logUserCreated(newUser, createdBy, ip) {
    logAuditEvent(AuditEventTypes.USER_CREATED, {
        newUserId: newUser._id,
        newUsername: newUser.username,
        newUserEmail: newUser.email,
        newUserLevel: newUser.niveau,
        newUserDepartment: newUser.departement,
        createdBy: createdBy.username,
        createdById: createdBy.userId,
        ip
    });
}

function logUserUpdated(userId, username, updatedFields, updatedBy, ip) {
    logAuditEvent(AuditEventTypes.USER_UPDATED, {
        userId,
        username,
        updatedFields: Object.keys(updatedFields),
        updatedBy: updatedBy.username,
        updatedById: updatedBy.userId,
        ip
    });
}

function logUserDeleted(userId, username, deletedBy, ip) {
    logAuditEvent(AuditEventTypes.USER_DELETED, {
        userId,
        username,
        deletedBy: deletedBy.username,
        deletedById: deletedBy.userId,
        ip
    }, 'warn');
}

function logUserRoleChanged(userId, username, oldRole, newRole, changedBy, ip) {
    logAuditEvent(AuditEventTypes.USER_ROLE_CHANGED, {
        userId,
        username,
        oldRole,
        newRole,
        changedBy: changedBy.username,
        changedById: changedBy.userId,
        ip
    }, 'warn');
}

// ============================================
// LOGS DOCUMENTS
// ============================================

function logDocumentUploaded(documentId, documentName, uploadedBy, fileSize, category) {
    logAuditEvent(AuditEventTypes.DOCUMENT_UPLOADED, {
        documentId,
        documentName,
        uploadedBy: uploadedBy.username,
        uploadedById: uploadedBy.userId,
        fileSize,
        category
    });
}

function logDocumentViewed(documentId, documentName, viewedBy, ip) {
    logAuditEvent(AuditEventTypes.DOCUMENT_VIEWED, {
        documentId,
        documentName,
        viewedBy: viewedBy.username,
        viewedById: viewedBy.userId,
        ip
    });
}

function logDocumentDownloaded(documentId, documentName, downloadedBy, ip) {
    logAuditEvent(AuditEventTypes.DOCUMENT_DOWNLOADED, {
        documentId,
        documentName,
        downloadedBy: downloadedBy.username,
        downloadedById: downloadedBy.userId,
        ip
    });
}

function logDocumentUpdated(documentId, documentName, updatedFields, updatedBy, ip) {
    logAuditEvent(AuditEventTypes.DOCUMENT_UPDATED, {
        documentId,
        documentName,
        updatedFields: Object.keys(updatedFields),
        updatedBy: updatedBy.username,
        updatedById: updatedBy.userId,
        ip
    });
}

function logDocumentDeleted(documentId, documentName, deletedBy, ip, reason = null) {
    logAuditEvent(AuditEventTypes.DOCUMENT_DELETED, {
        documentId,
        documentName,
        deletedBy: deletedBy.username,
        deletedById: deletedBy.userId,
        ip,
        reason
    }, 'warn');
}

function logDocumentShared(documentId, documentName, sharedBy, sharedWith, ip) {
    logAuditEvent(AuditEventTypes.DOCUMENT_SHARED, {
        documentId,
        documentName,
        sharedBy: sharedBy.username,
        sharedById: sharedBy.userId,
        sharedWith: sharedWith.map(u => u.username || u),
        ip
    });
}

function logDocumentUnshared(documentId, documentName, unsharedBy, unsharedFrom, ip) {
    logAuditEvent(AuditEventTypes.DOCUMENT_UNSHARED, {
        documentId,
        documentName,
        unsharedBy: unsharedBy.username,
        unsharedById: unsharedBy.userId,
        unsharedFrom: unsharedFrom.map(u => u.username || u),
        ip
    });
}

// ============================================
// LOGS DEMANDES DE SUPPRESSION
// ============================================

function logDeletionRequested(documentId, documentName, requestedBy, ip) {
    logAuditEvent(AuditEventTypes.DELETION_REQUESTED, {
        documentId,
        documentName,
        requestedBy: requestedBy.username,
        requestedById: requestedBy.userId,
        ip
    });
}

function logDeletionApproved(documentId, documentName, requestedBy, approvedBy, ip) {
    logAuditEvent(AuditEventTypes.DELETION_APPROVED, {
        documentId,
        documentName,
        requestedBy: requestedBy.username,
        approvedBy: approvedBy.username,
        approvedById: approvedBy.userId,
        ip
    });
}

function logDeletionRejected(documentId, documentName, requestedBy, rejectedBy, ip, reason) {
    logAuditEvent(AuditEventTypes.DELETION_REJECTED, {
        documentId,
        documentName,
        requestedBy: requestedBy.username,
        rejectedBy: rejectedBy.username,
        rejectedById: rejectedBy.userId,
        ip,
        reason
    });
}

// ============================================
// LOGS SÉCURITÉ
// ============================================

function logRateLimitExceeded(ip, path, userAgent) {
    logAuditEvent(AuditEventTypes.RATE_LIMIT_EXCEEDED, {
        ip,
        path,
        userAgent
    }, 'warn');
}

function logNoSQLInjectionAttempt(ip, path, key, userAgent) {
    logAuditEvent(AuditEventTypes.NOSQL_INJECTION_ATTEMPT, {
        ip,
        path,
        key,
        userAgent
    }, 'error');
}

function logCORSViolation(origin, ip, path) {
    logAuditEvent(AuditEventTypes.CORS_VIOLATION, {
        origin,
        ip,
        path
    }, 'warn');
}

function logInvalidToken(ip, path, userAgent) {
    logAuditEvent(AuditEventTypes.INVALID_TOKEN, {
        ip,
        path,
        userAgent
    }, 'warn');
}

function logExpiredToken(ip, path, username) {
    logAuditEvent(AuditEventTypes.EXPIRED_TOKEN, {
        ip,
        path,
        username
    }, 'warn');
}

// ============================================
// LOGS SYSTÈME
// ============================================

function logServerStarted(port, environment) {
    logAuditEvent(AuditEventTypes.SERVER_STARTED, {
        port,
        environment,
        nodeVersion: process.version,
        platform: process.platform
    });
}

function logServerStopped(reason = 'normal') {
    logAuditEvent(AuditEventTypes.SERVER_STOPPED, {
        reason,
        uptime: process.uptime()
    }, 'warn');
}

function logDatabaseConnected(dbName, uri) {
    const sanitizedUri = uri.replace(/\/\/.*:.*@/, '//***:***@');
    logAuditEvent(AuditEventTypes.DATABASE_CONNECTED, {
        dbName,
        uri: sanitizedUri
    });
}

function logDatabaseError(error, operation) {
    logAuditEvent(AuditEventTypes.DATABASE_ERROR, {
        error: error.message,
        operation
    }, 'error');
}

function logConfigChanged(configKey, changedBy, ip) {
    logAuditEvent(AuditEventTypes.CONFIG_CHANGED, {
        configKey,
        changedBy: changedBy?.username,
        changedById: changedBy?.userId,
        ip
    }, 'warn');
}

// ============================================
// MIDDLEWARE D'AUDIT
// ============================================

/**
 * Middleware pour enregistrer automatiquement les requêtes sensibles
 */
function auditMiddleware(req, res, next) {
    // Capturer les informations de la requête
    const startTime = Date.now();

    // Intercepter la réponse
    const originalSend = res.send;
    res.send = function (data) {
        const duration = Date.now() - startTime;

        // Logger selon le type de requête
        if (req.method !== 'GET' && res.statusCode < 400) {
            logAuditEvent('API_REQUEST', {
                method: req.method,
                path: req.path,
                user: req.user?.username,
                userId: req.user?.userId,
                ip: req.ip,
                duration,
                statusCode: res.statusCode
            });
        }

        return originalSend.call(this, data);
    };

    next();
}

// ============================================
// EXPORTS
// ============================================

module.exports = {
    // Types d'événements
    AuditEventTypes,

    // Fonction générique
    logAuditEvent,

    // Authentification
    logLoginSuccess,
    logLoginFailed,
    logLogout,
    logPasswordChanged,
    logTokenRefreshed,
    logUnauthorizedAccess,

    // Utilisateurs
    logUserCreated,
    logUserUpdated,
    logUserDeleted,
    logUserRoleChanged,

    // Documents
    logDocumentUploaded,
    logDocumentViewed,
    logDocumentDownloaded,
    logDocumentUpdated,
    logDocumentDeleted,
    logDocumentShared,
    logDocumentUnshared,

    // Demandes de suppression
    logDeletionRequested,
    logDeletionApproved,
    logDeletionRejected,

    // Sécurité
    logRateLimitExceeded,
    logNoSQLInjectionAttempt,
    logCORSViolation,
    logInvalidToken,
    logExpiredToken,

    // Système
    logServerStarted,
    logServerStopped,
    logDatabaseConnected,
    logDatabaseError,
    logConfigChanged,

    // Middleware
    auditMiddleware,

    // Logger brut (pour cas spéciaux)
    auditLogger
};
