// ============================================
// Script: Corriger simplement aba13 et les sessions expirées
// ============================================

const { MongoClient } = require('mongodb');

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/cerer_archivage?retryWrites=true&w=majority';
const DB_NAME = process.env.MONGODB_DB_NAME || 'cerer_archivage';

async function fixAba13() {
    const client = new MongoClient(MONGO_URI);

    try {
        console.log('🔄 Connexion à MongoDB...');
        await client.connect();
        console.log('✅ Connecté à MongoDB\n');

        const db = client.db(DB_NAME);
        const usersCollection = db.collection('users');
        const sessionsCollection = db.collection('sessions');

        // 1. Lire toutes les sessions actives directement depuis MongoDB
        console.log('🔍 Lecture des sessions actives...');
        const activeSessions = await sessionsCollection.find({}).toArray();
        console.log(`📊 ${activeSessions.length} session(s) trouvée(s) dans la collection\n`);

        // Extraire les usernames depuis les sessions
        const activeUsernames = new Set();
        for (const session of activeSessions) {
            try {
                // Les sessions sont stockées avec un champ "session" qui contient les données JSON
                if (session.session) {
                    // Essayer de parser le JSON
                    let sessionData;
                    if (typeof session.session === 'string') {
                        sessionData = JSON.parse(session.session);
                    } else {
                        sessionData = session.session;
                    }

                    if (sessionData.userId) {
                        activeUsernames.add(sessionData.userId);
                    }
                }
            } catch (e) {
                // Ignorer les sessions invalides
                console.log(`⚠️  Session invalide ignorée: ${session._id}`);
            }
        }

        console.log(`📋 ${activeUsernames.size} username(s) actif(s):`, Array.from(activeUsernames));
        console.log('');

        // 2. Lister tous les utilisateurs marqués en ligne
        const onlineUsers = await usersCollection.find({ isOnline: true }).toArray();
        console.log(`📊 ${onlineUsers.length} utilisateur(s) marqué(s) isOnline=true\n`);

        if (onlineUsers.length === 0) {
            console.log('✅ Aucun utilisateur marqué en ligne');
            return;
        }

        // 3. Identifier les faux positifs
        const usersToFix = [];
        for (const user of onlineUsers) {
            const hasActiveSession = activeUsernames.has(user.username);

            if (hasActiveSession) {
                console.log(`✅ ${user.username.padEnd(20)} - Vraiment en ligne (session active)`);
            } else {
                console.log(`⚠️  ${user.username.padEnd(20)} - FAUX POSITIF (pas de session active depuis ${new Date(user.lastActivity).toLocaleString('fr-FR')})`);
                usersToFix.push(user.username);
            }
        }

        console.log('');

        if (usersToFix.length === 0) {
            console.log('✅ Aucune incohérence détectée');
            return;
        }

        // 4. Corriger les faux positifs
        console.log(`🔧 Correction de ${usersToFix.length} utilisateur(s): ${usersToFix.join(', ')}\n`);

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
        console.log('   - isOnline: false');
        console.log('   - sessionID: supprimé\n');

        // 5. Vérification finale
        const finalOnline = await usersCollection.countDocuments({ isOnline: true });
        console.log(`📊 Vérification finale: ${finalOnline} utilisateur(s) encore marqués en ligne`);

    } catch (error) {
        console.error('❌ Erreur:', error);
    } finally {
        await client.close();
        console.log('\n👋 Déconnexion de MongoDB');
    }
}

// Exécuter le script
fixAba13();
