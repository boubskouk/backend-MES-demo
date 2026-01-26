const MongoClient = require('mongodb').MongoClient;

const url = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const dbName = 'archivage_cerer';

(async () => {
    const client = await MongoClient.connect(url);

    try {
        const db = client.db(dbName);
        
        // Chercher TOUS les utilisateurs nommés "boubs"
        const allBoubs = await db.collection('users').find({ username: 'boubs' }).toArray();

        console.log('🔍 Nombre d\'utilisateurs "boubs":', allBoubs.length);
        console.log('');

        allBoubs.forEach((user, index) => {
            console.log(`--- Boubs #${index + 1} ---`);
            console.log('   _id:', user._id);
            console.log('   username:', user.username);
            console.log('   email:', user.email);
            console.log('   idRole:', user.idRole);
            console.log('   blocked:', user.blocked ? '🔒 OUI' : '✅ Non');
            console.log('   password hash:', user.password ? user.password.substring(0, 20) + '...' : 'AUCUN');
            console.log('');
        });

    } finally {
        await client.close();
    }
})();
