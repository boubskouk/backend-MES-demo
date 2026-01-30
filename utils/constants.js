// ============================================
// CONSTANTES GLOBALES
// ============================================

module.exports = {
    // Configuration serveur
    PORT: process.env.PORT || 4000,

    // Configuration MongoDB
    MONGO_URI: process.env.MONGODB_URI || "mongodb://localhost:27017/mes_archivage?retryWrites=true&w=majority",
    DB_NAME: process.env.MONGODB_DB_NAME || 'mes_archivage',

    // Niveaux de permissions
    PERMISSIONS: {
        SUPER_ADMIN: 0,     // Super Admin - accès total
        PRIMAIRE: 1,        // Admin départemental - accès département + services
        SECONDAIRE: 2,      // Accès tous documents du département
        TERTIAIRE: 3        // Accès uniquement ses documents + niveau 3 du département
    },

    // Noms de collections MongoDB
    COLLECTIONS: {
        USERS: 'users',
        DOCUMENTS: 'documents',
        DOSSIERS: 'dossiers',  // Nouveau système multi-fichiers
        CATEGORIES: 'categories',
        ROLES: 'roles',
        DEPARTEMENTS: 'departements',
        SERVICES: 'services',
        MESSAGES: 'messages',
        MESSAGE_DELETION_REQUESTS: 'messageDeletionRequests',
        SHARE_HISTORY: 'shareHistory',
        AUDIT_LOGS: 'auditLogs',
        IP_RULES: 'ipRules',
        SYSTEM_SETTINGS: 'systemSettings',
        SESSIONS: 'sessions',
        PROFILE_CHANGES: 'profileChanges'
    },

    // Configuration sécurité
    SECURITY: {
        BCRYPT_ROUNDS: 10,
        SESSION_SECRET: process.env.SESSION_SECRET || 'changez_ce_secret_en_production',
        SESSION_CRYPTO_SECRET: process.env.SESSION_CRYPTO_SECRET || 'changez_ce_secret_crypto_en_production',
        SESSION_COOKIE_MAX_AGE: 24 * 60 * 60 * 1000, // 24 heures
        SESSION_TOUCH_AFTER: 5 * 60 // ✅ CORRECTION: 5 minutes (synchronisé avec le keep-alive)
    },

    // Configuration corbeille (soft delete)
    TRASH: {
        EXPIRATION_DAYS: 60,
        CLEANUP_CRON: '0 2 * * *' // Tous les jours à 2h du matin
    },

    // Configuration emails
    EMAIL: {
        REGISTRATION_SECRET_CODE: '100480'
    },

    // CORS
    CORS: {
        ALLOWED_ORIGINS: [
            'http://localhost:4000',
            'http://127.0.0.1:4000',
            'https://backend-mes-demo.onrender.com'
        ],
        METHODS: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
        HEADERS: ['Content-Type', 'Authorization']
    },

    // Limits (augmenté pour permettre import en masse)
    LIMITS: {
        JSON_SIZE: '50mb',  // Augmenté pour import bulk
        URL_ENCODED_SIZE: '50mb'
    }
};
