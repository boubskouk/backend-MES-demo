const { MongoClient } = require('mongodb');

const MONGO_URI = "mongodb://localhost:27017/cerer_archivage?retryWrites=true&w=majority";

async function listUsers() {
    console.log('🔄 Connexion à la base de données...');

    const client = await MongoClient.connect(MONGO_URI);

    try {
        const db = client.db('cerer_archivage');
        const usersCollection = db.collection('users');

        console.log('\n📋 Liste de TOUS les utilisateurs (collection "users") :\n');

        const users = await usersCollection.find({}).toArray();

        if (users.length === 0) {
            console.log('❌ Aucun utilisateur trouvé');
            return;
        }

        users.forEach((user, index) => {
            console.log(`${index + 1}. USERNAME: "${user.username}"`);
            console.log(`   EMAIL: "${user.email}"`);
            console.log(`   NOM: "${user.nom}"`);
            console.log(`   ID: ${user._id}`);
            if (user.idRole) console.log(`   ROLE ID: ${user.idRole}`);
            if (user.idDepartement) console.log(`   DEPT ID: ${user.idDepartement}`);
            console.log('');
        });

        console.log(`Total: ${users.length} utilisateur(s)`);

    } catch (error) {
        console.error('❌ Erreur:', error);
    } finally {
        await client.close();
        console.log('\n🔌 Connexion fermée');
    }
}

// Exécuter le script
listUsers().catch(console.error);
