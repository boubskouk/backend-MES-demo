/**
 * Script pour forcer la déconnexion d'un utilisateur
 * Usage: node scripts/force-logout-user.js <username>
 */

const { MongoClient } = require('mongodb');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017';
const DB_NAME = 'cerer_archivage';

const username = process.argv[2];

if (!username) {
    console.error('❌ Usage: node scripts/force-logout-user.js <username>');
    console.error('   Exemple: node scripts/force-logout-user.js test2');
    process.exit(1);
}

async function forceLogout() {
    const client = new MongoClient(MONGODB_URI);

    try {
        await client.connect();
        console.log('✅ Connecté à MongoDB');

        const db = client.db(DB_NAME);
        const usersCollection = db.collection('users');

        // Vérifier que l'utilisateur existe
        const user = await usersCollection.findOne({ username });
        if (!user) {
            console.error(`❌ Utilisateur "${username}" non trouvé`);
            process.exit(1);
        }

        console.log(`👤 Utilisateur trouvé: ${user.nom} (@${username})`);
        console.log(`   État actuel: isOnline = ${user.isOnline || false}`);

        // Forcer la déconnexion
        const result = await usersCollection.updateOne(
            { username },
            {
                $set: {
                    isOnline: false,
                    lastActivity: new Date()
                }
            }
        );

        if (result.modifiedCount > 0) {
            console.log(`✅ ${username} a été déconnecté de force`);
            console.log(`   isOnline mis à false`);
        } else {
            console.log(`ℹ️  Aucune modification nécessaire (déjà déconnecté)`);
        }

    } catch (error) {
        console.error('❌ Erreur:', error);
    } finally {
        await client.close();
        console.log('\n👋 Déconnecté de MongoDB');
    }
}

forceLogout();
