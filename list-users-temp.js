const { MongoClient } = require('mongodb');

const MONGO_URI = 'mongodb://localhost:27017';
const DB_NAME = 'cerer_archivage';

async function listUsers() {
    const client = await MongoClient.connect(MONGO_URI);
    const db = client.db(DB_NAME);
    const users = db.collection('users');

    const allUsers = await users.find({}, {
        projection: { username: 1, nom: 1, firstLogin: 1, mustChangePassword: 1 }
    }).toArray();

    console.log('\n📋 Utilisateurs disponibles:\n');
    allUsers.forEach(u => {
        console.log(`  - ${u.username} (${u.nom || 'N/A'}) - firstLogin: ${u.firstLogin || false}`);
    });
    console.log(`\nTotal: ${allUsers.length} utilisateurs\n`);

    await client.close();
}

listUsers().catch(console.error);
