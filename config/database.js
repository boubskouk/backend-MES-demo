// ============================================
// CONFIGURATION BASE DE DONNÉES MONGODB
// ============================================

const { MongoClient } = require('mongodb');
const { SecurityLogger } = require('../security-logger');
const constants = require('../utils/constants');

let db;
let collections = {};
let securityLogger;

/**
 * Connexion à MongoDB et initialisation des collections
 */
async function connectDB(retryCount = 0) {
    const maxRetries = 2;
    const retryDelay = 3000;

    try {
        console.log('🔄 Connexion à MongoDB...');
        if (retryCount > 0) {
            console.log(`🔄 Tentative ${retryCount + 1}/${maxRetries + 1}`);
        }

        // Masquer le mot de passe dans les logs
        const safeUri = constants.MONGO_URI.replace(/\/\/([^:]+):([^@]+)@/, '//***:***@');
        console.log(`📍 URI: ${safeUri}`);

        // Options de connexion
        const connectionOptions = {
            serverSelectionTimeoutMS: 10000,
            connectTimeoutMS: 10000,
            socketTimeoutMS: 180000, // 3 minutes (augmenté de 45s à 180s)
            maxPoolSize: 10,
            minPoolSize: 2
        };

        // Connexion
        const client = await MongoClient.connect(constants.MONGO_URI, connectionOptions);
        db = client.db(constants.DB_NAME);

        // Initialiser toutes les collections
        collections.users = db.collection(constants.COLLECTIONS.USERS);
        collections.documents = db.collection(constants.COLLECTIONS.DOCUMENTS);
        collections.categories = db.collection(constants.COLLECTIONS.CATEGORIES);
        collections.roles = db.collection(constants.COLLECTIONS.ROLES);
        collections.departements = db.collection(constants.COLLECTIONS.DEPARTEMENTS);
        collections.services = db.collection(constants.COLLECTIONS.SERVICES);
        collections.messages = db.collection(constants.COLLECTIONS.MESSAGES);
        collections.messageDeletionRequests = db.collection(constants.COLLECTIONS.MESSAGE_DELETION_REQUESTS);
        collections.shareHistory = db.collection(constants.COLLECTIONS.SHARE_HISTORY);
        collections.auditLogs = db.collection(constants.COLLECTIONS.AUDIT_LOGS);
        collections.ipRules = db.collection(constants.COLLECTIONS.IP_RULES);
        collections.systemSettings = db.collection(constants.COLLECTIONS.SYSTEM_SETTINGS);
        collections.profileChanges = db.collection(constants.COLLECTIONS.PROFILE_CHANGES);
        collections.dossiers = db.collection(constants.COLLECTIONS.DOSSIERS);

        // Initialiser le SecurityLogger
        securityLogger = new SecurityLogger(db);
        console.log('✅ SecurityLogger initialisé');

        // Créer les index
        await createIndexes();

        console.log('✅ Connexion à MongoDB réussie');
        console.log(`📊 Base de données: ${constants.DB_NAME}`);

        return { db, collections, securityLogger };

    } catch (error) {
        console.error('❌ Erreur connexion MongoDB:', error.message);

        if (retryCount < maxRetries) {
            console.log(`⏳ Nouvelle tentative dans ${retryDelay / 1000}s...`);
            await new Promise(resolve => setTimeout(resolve, retryDelay));
            return connectDB(retryCount + 1);
        } else {
            console.error('💀 Échec connexion MongoDB après plusieurs tentatives');
            process.exit(1);
        }
    }
}

/**
 * Créer les index sur les collections
 */
async function createIndexes() {
    try {
        console.log('🔧 Création des index MongoDB...');

        // Index documents - OPTIMISÉS pour les requêtes fréquentes
        console.log('📄 Index documents...');
        await collections.documents.createIndex({ idDepartement: 1, deleted: 1 }); // CRITIQUE pour niveau 1,2,3
        await collections.documents.createIndex({ idUtilisateur: 1, dateAjout: -1 });
        await collections.documents.createIndex({ idService: 1, deleted: 1 }); // Pour niveau 1
        await collections.documents.createIndex({ deleted: 1 }); // Pour Super Admin
        await collections.documents.createIndex({ sharedWith: 1, deleted: 1 }); // CRITIQUE pour partages niveau 2,3
        await collections.documents.createIndex({ idDocument: 1 }); // Pour recherche par idDocument
        console.log('✅ Index documents créés');

        // Index shareHistory - Pour l'historique des partages
        console.log('🔗 Index shareHistory...');
        if (collections.shareHistory) {
            await collections.shareHistory.createIndex({ documentId: 1 });
            await collections.shareHistory.createIndex({ sharedBy: 1 });
            await collections.shareHistory.createIndex({ sharedWith: 1 });
            await collections.shareHistory.createIndex({ sharedAt: -1 });
            console.log('✅ Index shareHistory créés');
        }

        // Index users
        console.log('👤 Index users...');
        await collections.users.createIndex({ username: 1 }, { unique: true, background: true });
        await collections.users.createIndex({ idDepartement: 1, idRole: 1 }); // Pour recherches niveau 3
        console.log('✅ Index users créés');

        // Index services
        console.log('🔧 Index services...');
        await collections.services.createIndex({ idDepartement: 1 });
        console.log('✅ Index services créés');

        // Index categories - AJOUTÉ pour optimisation aggregation
        console.log('📁 Index categories...');
        await collections.categories.createIndex({ idService: 1 });
        await collections.categories.createIndex({ idDepartement: 1 });
        console.log('✅ Index categories créés');

        // Index profileChanges - Pour traçabilité des changements de profil
        console.log('📝 Index profileChanges...');
        await collections.profileChanges.createIndex({ username: 1, date: -1 });
        await collections.profileChanges.createIndex({ date: -1 });
        await collections.profileChanges.createIndex({ modifiedBy: 1 });
        console.log('✅ Index profileChanges créés');

        // Index dossiers - OPTIMISÉS pour le nouveau système multi-fichiers
        console.log('📁 Index dossiers...');
        await collections.dossiers.createIndex({ idDepartement: 1, deleted: 1 }); // CRITIQUE pour niveau 1,2,3
        await collections.dossiers.createIndex({ idService: 1, deleted: 1 }); // Pour niveau 1
        await collections.dossiers.createIndex({ idUtilisateur: 1, createdAt: -1 }); // Pour recherche par créateur
        await collections.dossiers.createIndex({ deleted: 1 }); // Pour Super Admin
        await collections.dossiers.createIndex({ sharedWith: 1, deleted: 1 }); // CRITIQUE pour partages niveau 2,3
        await collections.dossiers.createIndex({ idDossier: 1 }, { unique: true }); // Pour recherche par idDossier
        await collections.dossiers.createIndex({ locked: 1 }); // Pour filtrer les dossiers verrouillés
        await collections.dossiers.createIndex({ titre: 1, idDepartement: 1, deleted: 1 }); // Index composé pour unicité titre par département
        console.log('✅ Index dossiers créés');

        console.log('✅ Tous les index MongoDB créés avec succès !');
    } catch (error) {
        console.error('❌ Erreur création index:', error.message);
        console.error('Stack:', error.stack);
    }
}

/**
 * Obtenir la base de données
 */
function getDB() {
    if (!db) {
        throw new Error('Base de données non initialisée. Appelez connectDB() d\'abord.');
    }
    return db;
}

/**
 * Obtenir toutes les collections
 */
function getCollections() {
    if (!collections.users) {
        throw new Error('Collections non initialisées. Appelez connectDB() d\'abord.');
    }
    return collections;
}

/**
 * Obtenir le SecurityLogger
 */
function getSecurityLogger() {
    if (!securityLogger) {
        throw new Error('SecurityLogger non initialisé. Appelez connectDB() d\'abord.');
    }
    return securityLogger;
}

/**
 * Fermer la connexion à la base de données
 */
async function closeDB() {
    if (client) {
        await client.close();
        console.log('🔌 Connexion MongoDB fermée');
    }
}

module.exports = {
    connectDB,
    closeDB,
    getDB,
    getCollections,
    getSecurityLogger
};
