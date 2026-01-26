const { MongoClient } = require('mongodb');

const MONGO_URI = "mongodb://localhost:27017/cerer_archivage?retryWrites=true&w=majority";

async function deleteUserTest2() {
    console.log('🔄 Connexion à la base de données...');

    const client = await MongoClient.connect(MONGO_URI);

    try {
        const db = client.db('cerer_archivage');
        const usersCollection = db.collection('users');

        console.log('\n🔍 Recherche de l\'utilisateur test2...');

        // Trouver l'utilisateur test2
        const user = await usersCollection.findOne({ username: 'test2' });

        if (!user) {
            console.log('❌ Utilisateur test2 non trouvé !');
            return;
        }

        console.log('\n📋 Utilisateur trouvé :');
        console.log('   USERNAME:', user.username);
        console.log('   EMAIL:', user.email);
        console.log('   NOM:', user.nom);
        console.log('   ID DÉPARTEMENT:', user.idDepartement || 'UNDEFINED ❌');
        console.log('   ID ROLE:', user.idRole);
        console.log('   ID:', user._id);

        // Supprimer l'utilisateur
        console.log('\n🗑️ Suppression de l\'utilisateur test2...');
        const result = await usersCollection.deleteOne({ _id: user._id });

        if (result.deletedCount === 1) {
            console.log('✅ Utilisateur "test2" supprimé avec succès !');
            console.log('   Vous pouvez maintenant le recréer avec un département valide.');
        } else {
            console.log('❌ Échec de la suppression');
        }

    } catch (error) {
        console.error('❌ Erreur:', error);
    } finally {
        await client.close();
        console.log('\n🔌 Connexion fermée');
    }
}

// Exécuter le script
deleteUserTest2().catch(console.error);
