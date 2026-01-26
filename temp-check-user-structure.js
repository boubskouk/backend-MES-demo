const { MongoClient } = require('mongodb');

async function checkUserStructure() {
    const client = await MongoClient.connect('mongodb://127.0.0.1:27017');
    const db = client.db('archivage');

    // Trouver un utilisateur de niveau 2
    const niveau2User = await db.collection('users').findOne({
        idRole: { $exists: true }
    });

    if (niveau2User) {
        console.log('=== Exemple utilisateur ===');
        console.log(JSON.stringify(niveau2User, null, 2));

        // Récupérer son rôle
        const role = await db.collection('roles').findOne({ _id: niveau2User.idRole });
        console.log('\n=== Rôle ===');
        console.log(JSON.stringify(role, null, 2));

        // Si l'utilisateur a un idService, récupérer le service
        if (niveau2User.idService) {
            const service = await db.collection('services').findOne({ _id: niveau2User.idService });
            console.log('\n=== Service ===');
            console.log(JSON.stringify(service, null, 2));
        }
    }

    await client.close();
}

checkUserStructure().catch(console.error);
