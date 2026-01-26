const MongoClient = require('mongodb').MongoClient;
const bcrypt = require('bcrypt');

const url = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const dbName = 'archivage_cerer';

(async () => {
    const client = await MongoClient.connect(url);

    try {
        const db = client.db(dbName);
        
        // Trouver le rôle niveau 0
        const role = await db.collection('roles').findOne({ niveau: 0 });
        
        // Créer un compte test
        const hashedPassword = await bcrypt.hash('Test@2024', 10);
        
        await db.collection('users').insertOne({
            username: 'testadmin',
            password: hashedPassword,
            nom: 'Test Admin',
            email: 'test@admin.com',
            idRole: role._id,
            idDepartement: null,
            idService: null,
            dateCreation: new Date(),
            isOnline: false
        });

        console.log('✅ Compte TEST créé !');
        console.log('   Username: testadmin');
        console.log('   Password: Test@2024');
        console.log('');
        console.log('🧪 Essayez de vous connecter avec ce compte');

    } finally {
        await client.close();
    }
})();
