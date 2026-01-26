const { MongoClient } = require('mongodb');

const MONGO_URI = "mongodb://localhost:27017/cerer_archivage?retryWrites=true&w=majority";

async function listServices() {
    console.log('🔄 Connexion à la base de données...');

    const client = await MongoClient.connect(MONGO_URI);

    try {
        const db = client.db('cerer_archivage');
        const servicesCollection = db.collection('services');

        console.log('\n📋 Liste des services :\n');

        const services = await servicesCollection.find({}).toArray();

        if (services.length === 0) {
            console.log('❌ Aucun service trouvé');
            return;
        }

        services.forEach((service, index) => {
            console.log(`${index + 1}. NOM: "${service.nom}"`);
            console.log(`   CODE: "${service.code}"`);
            console.log(`   ID DÉPARTEMENT: ${service.idDepartement}`);
            console.log(`   DATE CRÉATION: ${service.dateCreation}`);
            console.log(`   ID: ${service._id}`);
            console.log('');
        });

        console.log(`Total: ${services.length} service(s)`);

    } catch (error) {
        console.error('❌ Erreur:', error);
    } finally {
        await client.close();
        console.log('\n🔌 Connexion fermée');
    }
}

// Exécuter le script
listServices().catch(console.error);
