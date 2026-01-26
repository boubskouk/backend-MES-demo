// Script de vérification rapide des flags firstLogin/mustChangePassword
const { MongoClient } = require('mongodb');

const MONGO_URI = 'mongodb://localhost:27017';
const DB_NAME = 'archivage-cerer';

async function checkUserFlags() {
    const client = await MongoClient.connect(MONGO_URI);
    const db = client.db(DB_NAME);
    const users = db.collection('users');

    console.log('\n📋 Vérification des utilisateurs avec firstLogin/mustChangePassword:\n');

    const allUsers = await users.find({}).toArray();

    allUsers.forEach(user => {
        const hasFirstLogin = user.firstLogin === true;
        const hasMustChange = user.mustChangePassword === true;

        if (hasFirstLogin || hasMustChange) {
            console.log(`✅ ${user.username}:`);
            console.log(`   - firstLogin: ${user.firstLogin}`);
            console.log(`   - mustChangePassword: ${user.mustChangePassword}`);
            console.log('');
        } else {
            console.log(`❌ ${user.username}: Pas de flags (firstLogin=${user.firstLogin}, mustChangePassword=${user.mustChangePassword})`);
        }
    });

    await client.close();
}

checkUserFlags().catch(console.error);
