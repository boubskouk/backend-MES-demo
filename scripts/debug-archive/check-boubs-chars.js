const MongoClient = require('mongodb').MongoClient;

const url = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const dbName = 'archivage_cerer';

(async () => {
    const client = await MongoClient.connect(url);

    try {
        const db = client.db(dbName);
        const user = await db.collection('users').findOne({ username: 'boubs' });

        console.log('🔍 ANALYSE DÉTAILLÉE DU USERNAME:');
        console.log('   Valeur:', user.username);
        console.log('   Longueur:', user.username.length);
        console.log('   Caractères (codes):', user.username.split('').map(c => c + ' (' + c.charCodeAt(0) + ')').join(', '));
        console.log('');
        console.log('✅ Username attendu: "boubs" (5 caractères)');
        console.log('   Comparaison:', user.username === 'boubs' ? '✅ IDENTIQUE' : '❌ DIFFÉRENT');

    } finally {
        await client.close();
    }
})();
