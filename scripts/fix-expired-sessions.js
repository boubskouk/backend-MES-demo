// ============================================
// Script: Corriger les sessions expirées
// ============================================

const { MongoClient } = require('mongodb');

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/cerer_archivage?retryWrites=true&w=majority';
const DB_NAME = process.env.MONGODB_DB_NAME || 'cerer_archivage';

async function fixExpiredSessions() {
    const client = new MongoClient(MONGO_URI);

    try {
        console.log('🔄 Connexion à MongoDB...');
        await client.connect();
        console.log('✅ Connecté à MongoDB\n');

        const db = client.db(DB_NAME);
        const usersCollection = db.collection('users');

        // 1. Récupérer tous les utilisateurs marqués en ligne
        const onlineUsers = await usersCollection.find({ isOnline: true }).toArray();
        console.log(`📊 ${onlineUsers.length} utilisateur(s) marqué(s) en ligne\n`);

        if (onlineUsers.length === 0) {
            console.log('✅ Aucun utilisateur à corriger');
            return;
        }

        // 2. Vérifier si chaque utilisateur a une session active
        const sessionStore = require('connect-mongo').create({
            mongoUrl: MONGO_URI,
            dbName: DB_NAME
        });

        const activeSessions = new Set();

        // Récupérer toutes les sessions actives
        const getAllSessions = () => {
            return new Promise((resolve, reject) => {
                sessionStore.all((err, sessions) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve(sessions || []);
                    }
                });
            });
        };

        const sessions = await getAllSessions();
        console.log(`🔍 ${sessions.length} session(s) active(s) dans le store\n`);

        sessions.forEach(session => {
            if (session.userId) {
                activeSessions.add(session.userId);
            }
        });

        console.log(`📋 Usernames avec session active:`, Array.from(activeSessions));
        console.log('');

        // 3. Identifier et corriger les faux positifs
        const usersToFix = [];

        for (const user of onlineUsers) {
            const hasSession = activeSessions.has(user.username);

            if (!hasSession) {
                usersToFix.push(user.username);
                console.log(`⚠️  ${user.username.padEnd(20)} - Marqué en ligne SANS session active (depuis ${new Date(user.lastActivity).toLocaleString('fr-FR')})`);
            } else {
                console.log(`✅ ${user.username.padEnd(20)} - Vraiment en ligne`);
            }
        }

        if (usersToFix.length === 0) {
            console.log('\n✅ Aucune incohérence détectée');
            return;
        }

        // 4. Demander confirmation et corriger
        console.log(`\n🔧 ${usersToFix.length} utilisateur(s) à corriger: ${usersToFix.join(', ')}`);
        console.log('⚡ Correction automatique en cours...\n');

        const result = await usersCollection.updateMany(
            {
                username: { $in: usersToFix }
            },
            {
                $set: { isOnline: false },
                $unset: { sessionID: "" }
            }
        );

        console.log(`✅ ${result.modifiedCount} utilisateur(s) corrigé(s)`);
        console.log('   - isOnline mis à false');
        console.log('   - sessionID supprimé');

        // 5. Vérification finale
        console.log('\n📊 Vérification finale...');
        const stillOnline = await usersCollection.countDocuments({ isOnline: true });
        console.log(`   - Utilisateurs encore marqués en ligne: ${stillOnline}`);

    } catch (error) {
        console.error('❌ Erreur:', error);
    } finally {
        await client.close();
        console.log('\n👋 Déconnexion de MongoDB');
    }
}

// Exécuter le script
fixExpiredSessions();
