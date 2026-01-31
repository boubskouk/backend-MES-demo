const { MongoClient } = require('mongodb');

const MONGO_URI = 'mongodb://localhost:27017';
const DB_NAME = 'mes_archivage';

async function listLevel1Users() {
    const client = await MongoClient.connect(MONGO_URI);
    const db = client.db(DB_NAME);

    const roles = await db.collection('roles').find({}).toArray();
    const niveau1Role = roles.find(r => r.niveau === 1);

    if (!niveau1Role) {
        console.log('❌ Rôle niveau 1 non trouvé');
        await client.close();
        return;
    }

    const users = await db.collection('users').find({
        idRole: niveau1Role._id
    }).toArray();

    console.log('\n📋 Utilisateurs de niveau 1:\n');
    users.forEach(u => {
        console.log(`  - ${u.username} (${u.nom || 'N/A'})`);
    });
    console.log('');

    await client.close();
}

listLevel1Users().catch(console.error);
