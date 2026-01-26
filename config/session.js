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
    return MongoStore.create({
        mongoUrl: constants.MONGO_URI,
        dbName: constants.DB_NAME,
        collectionName: constants.COLLECTIONS.SESSIONS,
        touchAfter: constants.SECURITY.SESSION_TOUCH_AFTER,
        crypto: {
            secret: constants.SECURITY.SESSION_CRYPTO_SECRET
        }
    });
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
