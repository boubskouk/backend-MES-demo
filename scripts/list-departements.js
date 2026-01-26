const { MongoClient } = require('mongodb');

const MONGO_URI = "mongodb://localhost:27017/cerer_archivage?retryWrites=true&w=majority";

async function listDepartements() {
    console.log('🔄 Connexion à la base de données...');

    const client = await MongoClient.connect(MONGO_URI);

    try {
        const db = client.db('cerer_archivage');
        const departementsCollection = db.collection('departements');

        console.log('\n📋 Liste des départements :\n');

        const departements = await departementsCollection.find({}).toArray();

        if (departements.length === 0) {
            console.log('❌ Aucun département trouvé');
            return;
        }

        departements.forEach((dept, index) => {
            console.log(`${index + 1}. NOM: "${dept.nom}"`);
            console.log(`   CODE: "${dept.code}"`);
            console.log(`   ID: ${dept._id}`);
            console.log('');
        });

        console.log(`Total: ${departements.length} département(s)`);

    } catch (error) {
        console.error('❌ Erreur:', error);
    } finally {
        await client.close();
        console.log('\n🔌 Connexion fermée');
    }
}

// Exécuter le script
listDepartements().catch(console.error);
