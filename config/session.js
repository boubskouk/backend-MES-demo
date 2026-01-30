// ============================================
// CONFIGURATION DES SESSIONS EXPRESS
// ============================================

const session = require('express-session');
const MongoStore = require('connect-mongo');
const constants = require('../utils/constants');

/**
 * Créer et configurer le session store MongoDB
 */
function createSessionStore() {
    // Configuration de base sans chiffrement pour éviter les erreurs
    const storeOptions = {
        mongoUrl: constants.MONGO_URI,
        dbName: constants.DB_NAME,
        collectionName: constants.COLLECTIONS.SESSIONS,
        touchAfter: constants.SECURITY.SESSION_TOUCH_AFTER,
        crypto: false  // Désactiver explicitement le chiffrement
    };

    console.log('✅ MongoStore configuré (DB:', constants.DB_NAME, ')');

    return MongoStore.create(storeOptions);
}

/**
 * Configurer le middleware de session
 */
function configureSession(sessionStore) {
    return session({
        store: sessionStore,
        secret: constants.SECURITY.SESSION_SECRET,
        resave: false,
        saveUninitialized: false,
        cookie: {
            secure: process.env.NODE_ENV === 'production',
            httpOnly: true,
            maxAge: constants.SECURITY.SESSION_COOKIE_MAX_AGE,
            sameSite: 'lax'
        },
        name: 'sessionId'
    });
}

module.exports = {
    createSessionStore,
    configureSession
};
