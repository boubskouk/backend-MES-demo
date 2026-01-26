const { MongoClient } = require('mongodb');

const MONGO_URI = "mongodb://localhost:27017/cerer_archivage?retryWrites=true&w=majority";

async function listRoles() {
    console.log('🔄 Connexion à la base de données...');

    const client = await MongoClient.connect(MONGO_URI);

    try {
        const db = client.db('cerer_archivage');
        const rolesCollection = db.collection('roles');

        console.log('\n📋 Liste des rôles :\n');

        const roles = await rolesCollection.find({}).sort({ niveau: 1 }).toArray();

        if (roles.length === 0) {
            console.log('❌ Aucun rôle trouvé');
            return;
        }

        roles.forEach((role, index) => {
            console.log(`${index + 1}. LIBELLE: "${role.libelle}"`);
            console.log(`   NIVEAU: ${role.niveau}`);
            console.log(`   ID: ${role._id}`);
            console.log('');
        });

        console.log(`Total: ${roles.length} rôle(s)`);

    } catch (error) {
        console.error('❌ Erreur:', error);
    } finally {
        await client.close();
        console.log('\n🔌 Connexion fermée');
    }
}

// Exécuter le script
listRoles().catch(console.error);
