const { MongoClient } = require('mongodb');

const MONGO_URI = "mongodb://localhost:27017/cerer_archivage?retryWrites=true&w=majority";

async function listCollections() {
    console.log('🔄 Connexion à la base de données...');

    const client = await MongoClient.connect(MONGO_URI);

    try {
        const db = client.db('cerer_archivage');

        console.log('\n📋 Liste des collections dans la base de données :\n');

        const collections = await db.listCollections().toArray();

        if (collections.length === 0) {
            console.log('❌ Aucune collection trouvée');
            console.log('\nℹ️ La base de données locale semble vide.');
            console.log('   Vérifiez si vous utilisez une base de données en ligne.');
            return;
        }

        collections.forEach((col, index) => {
            console.log(`${index + 1}. ${col.name}`);
        });

        console.log(`\nTotal: ${collections.length} collection(s)`);

        // Compter les documents dans chaque collection
        console.log('\n📊 Nombre de documents par collection :\n');
        for (const col of collections) {
            const count = await db.collection(col.name).countDocuments();
            console.log(`   ${col.name}: ${count} document(s)`);
        }

    } catch (error) {
        console.error('❌ Erreur:', error);
    } finally {
        await client.close();
        console.log('\n🔌 Connexion fermée');
    }
}

// Exécuter le script
listCollections().catch(console.error);
