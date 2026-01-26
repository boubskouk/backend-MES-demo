/**
 * Script pour vérifier et initialiser le statut isOnline de tous les utilisateurs
 */

const { MongoClient } = require('mongodb');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017';
const DB_NAME = process.env.DB_NAME || 'cerer_archivage'; // ✅ CORRIGÉ: Nom correct de la base

async function checkAndInitializeOnlineStatus() {
    const client = new MongoClient(MONGODB_URI);

    try {
        await client.connect();
        console.log('✅ Connecté à MongoDB');

        const db = client.db(DB_NAME);
        const usersCollection = db.collection('users');

        // 1. Compter les utilisateurs sans champ isOnline
        const usersWithoutStatus = await usersCollection.countDocuments({
            isOnline: { $exists: false }
        });

        console.log(`\n📊 Statistiques:`);
        console.log(`   - Utilisateurs sans champ isOnline: ${usersWithoutStatus}`);

        // 2. Compter les utilisateurs avec isOnline = true
        const onlineUsers = await usersCollection.countDocuments({ isOnline: true });
        console.log(`   - Utilisateurs en ligne (isOnline=true): ${onlineUsers}`);

        // 3. Lister les utilisateurs en ligne
        if (onlineUsers > 0) {
            const onlineUsersList = await usersCollection
                .find({ isOnline: true })
                .project({ username: 1, nom: 1, lastActivity: 1 })
                .toArray();

            console.log(`\n🟢 Utilisateurs actuellement en ligne:`);
            onlineUsersList.forEach(user => {
                console.log(`   - ${user.nom} (@${user.username})`);
                console.log(`     Dernière activité: ${user.lastActivity ? user.lastActivity.toLocaleString('fr-FR') : 'N/A'}`);
            });
        }

        // 4. Initialiser isOnline=false pour tous les utilisateurs qui n'ont pas ce champ
        if (usersWithoutStatus > 0) {
            console.log(`\n🔧 Initialisation du champ isOnline pour ${usersWithoutStatus} utilisateur(s)...`);

            const result = await usersCollection.updateMany(
                { isOnline: { $exists: false } },
                {
                    $set: {
                        isOnline: false,
                        lastActivity: new Date()
                    }
                }
            );

            console.log(`✅ ${result.modifiedCount} utilisateur(s) mis à jour`);
        }

        // 5. Afficher le résultat final
        const totalUsers = await usersCollection.countDocuments({});
        const finalOnline = await usersCollection.countDocuments({ isOnline: true });
        const finalOffline = await usersCollection.countDocuments({ isOnline: false });

        console.log(`\n📈 Résultat final:`);
        console.log(`   - Total utilisateurs: ${totalUsers}`);
        console.log(`   - En ligne: ${finalOnline}`);
        console.log(`   - Hors ligne: ${finalOffline}`);

    } catch (error) {
        console.error('❌ Erreur:', error);
    } finally {
        await client.close();
        console.log('\n👋 Déconnecté de MongoDB');
    }
}

checkAndInitializeOnlineStatus();
