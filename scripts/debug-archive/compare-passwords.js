const MongoClient = require('mongodb').MongoClient;
const bcrypt = require('bcrypt');

const url = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const dbName = 'archivage_cerer';

(async () => {
    const client = await MongoClient.connect(url);

    try {
        const db = client.db(dbName);
        
        const aba2 = await db.collection('users').findOne({ username: 'aba2' });
        const boubs = await db.collection('users').findOne({ username: 'boubs' });
        const testadmin = await db.collection('users').findOne({ username: 'testadmin' });

        console.log('📊 COMPARAISON DES MOTS DE PASSE:\n');
        
        console.log('✅ aba2 (FONCTIONNE):');
        console.log('   Hash:', aba2.password);
        console.log('   Longueur:', aba2.password.length);
        console.log('   Format:', aba2.password.substring(0, 7));
        
        console.log('\n❌ boubs (NE FONCTIONNE PAS):');
        console.log('   Hash:', boubs.password);
        console.log('   Longueur:', boubs.password.length);
        console.log('   Format:', boubs.password.substring(0, 7));
        
        console.log('\n❌ testadmin (NE FONCTIONNE PAS):');
        console.log('   Hash:', testadmin.password);
        console.log('   Longueur:', testadmin.password.length);
        console.log('   Format:', testadmin.password.substring(0, 7));

        // Test de vérification avec bcrypt
        console.log('\n🧪 TEST BCRYPT:');
        const test1 = await bcrypt.compare('1243', aba2.password);
        console.log('   aba2 avec "1243":', test1 ? '✅ OK' : '❌ FAIL');
        
        const test2 = await bcrypt.compare('Boubs@2024', boubs.password);
        console.log('   boubs avec "Boubs@2024":', test2 ? '✅ OK' : '❌ FAIL');

    } finally {
        await client.close();
    }
})();
