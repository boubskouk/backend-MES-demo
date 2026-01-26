// ============================================
// Script: Vérifier TOUS les utilisateurs
// ============================================

const { MongoClient } = require('mongodb');

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/cerer_archivage?retryWrites=true&w=majority';
const DB_NAME = process.env.MONGODB_DB_NAME || 'cerer_archivage';

async function checkAllUsers() {
    const client = new MongoClient(MONGO_URI);

    try {
        console.log('🔄 Connexion à MongoDB...');
        await client.connect();
        console.log('✅ Connecté à MongoDB\n');

        const db = client.db(DB_NAME);
        const usersCollection = db.collection('users');
        const rolesCollection = db.collection('roles');

        // 1. Compter tous les utilisateurs
        const totalUsers = await usersCollection.countDocuments();
        console.log(`📊 Total utilisateurs dans la base: ${totalUsers}\n`);

        // 2. Lister TOUS les utilisateurs avec leur statut
        const allUsers = await usersCollection.find({}).toArray();

        console.log('📋 Liste de TOUS les utilisateurs:\n');
        console.log('═'.repeat(120));
        console.log(
            'Username'.padEnd(20) +
            'Nom'.padEnd(25) +
            'Email'.padEnd(30) +
            'isOnline'.padEnd(15) +
            'lastActivity'
        );
        console.log('═'.repeat(120));

        for (const user of allUsers) {
            // Récupérer le niveau
            let niveau = 'N/A';
            try {
                const role = await rolesCollection.findOne({ _id: user.idRole });
                if (role) niveau = role.niveau;
            } catch (e) {
                // Ignorer les erreurs de rôle
            }

            const lastActivity = user.lastActivity
                ? new Date(user.lastActivity).toLocaleString('fr-FR')
                : 'Jamais';

            console.log(
                (user.username || 'N/A').padEnd(20) +
                (user.nom || 'N/A').padEnd(25) +
                (user.email || 'N/A').padEnd(30) +
                (`${user.isOnline === true ? '✅ TRUE' : '❌ FALSE'} (Niv ${niveau})`).padEnd(15) +
                lastActivity
            );
        }

        console.log('═'.repeat(120));

        // 3. Statistiques
        const onlineCount = await usersCollection.countDocuments({ isOnline: true });
        const offlineCount = await usersCollection.countDocuments({ isOnline: { $ne: true } });

        console.log('\n📊 Statistiques:');
        console.log(`   - Utilisateurs marqués en ligne (isOnline=true): ${onlineCount}`);
        console.log(`   - Utilisateurs hors ligne: ${offlineCount}`);

        // 4. Utilisateurs spécifiques recherchés
        console.log('\n🔍 Recherche d\'utilisateurs spécifiques:');
        const targetUsers = ['aba13', 'boubs', 'ndiaga'];

        for (const username of targetUsers) {
            const user = await usersCollection.findOne({ username });
            if (user) {
                console.log(`\n   ✅ ${username}:`);
                console.log(`      - Nom: ${user.nom}`);
                console.log(`      - isOnline: ${user.isOnline}`);
                console.log(`      - lastActivity: ${user.lastActivity ? new Date(user.lastActivity).toLocaleString('fr-FR') : 'Jamais'}`);
                console.log(`      - sessionID: ${user.sessionID || 'Aucun'}`);
            } else {
                console.log(`\n   ❌ ${username}: NON TROUVÉ`);
            }
        }

    } catch (error) {
        console.error('❌ Erreur:', error);
    } finally {
        await client.close();
        console.log('\n👋 Déconnexion de MongoDB');
    }
}

// Exécuter le script
checkAllUsers();
