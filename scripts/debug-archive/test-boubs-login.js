const MongoClient = require('mongodb').MongoClient;
const bcrypt = require('bcrypt');

const url = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const dbName = 'archivage_cerer';

(async () => {
    const client = await MongoClient.connect(url);

    try {
        const db = client.db(dbName);
        const user = await db.collection('users').findOne({ username: 'boubs' });

        if (!user) {
            console.error('❌ boubs introuvable !');
            return;
        }

        console.log('✅ boubs trouvé');
        console.log('   Hash stocké:', user.password.substring(0, 30) + '...');

        // Test avec le mot de passe
        const password = 'Boubs@2024';
        const match = await bcrypt.compare(password, user.password);

        console.log('');
        console.log('🧪 TEST MOT DE PASSE:', password);
        console.log('   Résultat:', match ? '✅ CORRECT' : '❌ INCORRECT');

        if (!match) {
            console.log('');
            console.log('⚠️  Le mot de passe dans la DB ne correspond pas !');
            console.log('   Essayons avec "1234" aussi...');
            
            const match2 = await bcrypt.compare('1234', user.password);
            console.log('   "1234":', match2 ? '✅ CORRECT' : '❌ INCORRECT');
        }

    } finally {
        await client.close();
    }
})();
