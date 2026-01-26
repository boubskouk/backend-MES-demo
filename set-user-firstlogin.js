// Script pour forcer firstLogin sur un utilisateur (pour test)
const { MongoClient } = require('mongodb');

const MONGO_URI = 'mongodb://localhost:27017';
const DB_NAME = 'archivage-cerer';

// MODIFIER CE USERNAME
const USERNAME_TO_UPDATE = 'babs'; // <-- Changez ici

async function setFirstLogin() {
    const client = await MongoClient.connect(MONGO_URI);
    const db = client.db(DB_NAME);
    const users = db.collection('users');

    const result = await users.updateOne(
        { username: USERNAME_TO_UPDATE },
        {
            $set: {
                firstLogin: true,
                mustChangePassword: true
            }
        }
    );

    if (result.matchedCount === 0) {
        console.log(`❌ Utilisateur "${USERNAME_TO_UPDATE}" non trouvé`);
    } else {
        console.log(`✅ Flags définis pour "${USERNAME_TO_UPDATE}"`);
        console.log('   - firstLogin: true');
        console.log('   - mustChangePassword: true');
    }

    await client.close();
}

setFirstLogin().catch(console.error);
