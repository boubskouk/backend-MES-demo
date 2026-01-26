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

        const newPassword = 'Boubs@2024';
        const hashedPassword = await bcrypt.hash(newPassword, 10);

        await db.collection('users').updateOne(
            { username: 'boubs' },
            { $set: { password: hashedPassword } }
        );

        console.log('✅ MOT DE PASSE RÉINITIALISÉ !');
        console.log('   Username: boubs');
        console.log('   Password: Boubs@2024');

    } finally {
        await client.close();
    }
})();
