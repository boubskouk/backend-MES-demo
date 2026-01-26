const { MongoClient } = require('mongodb');

const MONGO_URI = "mongodb://localhost:27017/cerer_archivage?retryWrites=true&w=majority";

async function deleteUser() {
    console.log('🔄 Connexion à la base de données...');

    const client = await MongoClient.connect(MONGO_URI, {
        useUnifiedTopology: true,
        serverSelectionTimeoutMS: 5000
    });

    try {
        const db = client.db('cerer_archivage');
        const usersCollection = db.collection('utilisateurs');

        console.log('\n🔍 Recherche de l\'utilisateur ddd (boubskoukou@gmail.com)...');

        // Trouver l'utilisateur
        const user = await usersCollection.findOne({
            $or: [
                { username: 'ddd' },
                { email: 'boubskoukou@gmail.com' }
            ]
        });

        if (!user) {
            console.log('❌ Utilisateur non trouvé !');
            return;
        }

        console.log('\n📋 Utilisateur trouvé :');
        console.log('   Username:', user.username);
        console.log('   Email:', user.email);
        console.log('   Nom:', user.nom);
        console.log('   ID:', user._id);

        // Supprimer l'utilisateur
        console.log('\n🗑️ Suppression de l\'utilisateur...');
        const result = await usersCollection.deleteOne({ _id: user._id });

        if (result.deletedCount === 1) {
            console.log('✅ Utilisateur supprimé avec succès !');
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
deleteUser().catch(console.error);
