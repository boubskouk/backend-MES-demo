const MongoClient = require('mongodb').MongoClient;
const { ObjectId } = require('mongodb');

const url = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const dbName = 'archivage_cerer';

(async () => {
    const client = await MongoClient.connect(url);

    try {
        const db = client.db(dbName);
        
        const user = await db.collection('users').findOne({ username: 'boubs' });
        console.log('👤 Utilisateur boubs:');
        console.log('   idRole:', user.idRole);
        console.log('   Type:', typeof user.idRole);
        
        // Chercher le rôle
        const role = await db.collection('roles').findOne({ _id: user.idRole });
        
        if (role) {
            console.log('');
            console.log('✅ Rôle trouvé:');
            console.log('   _id:', role._id);
            console.log('   nom:', role.nom);
            console.log('   niveau:', role.niveau);
        } else {
            console.log('');
            console.log('❌ RÔLE INTROUVABLE !');
            console.log('   Le idRole de boubs ne correspond à aucun rôle !');
            
            // Lister tous les rôles
            const allRoles = await db.collection('roles').find({}).toArray();
            console.log('');
            console.log('📋 Rôles disponibles:');
            allRoles.forEach(r => {
                console.log(`   - ${r.nom} (niveau ${r.niveau}) - ID: ${r._id}`);
            });
        }

    } finally {
        await client.close();
    }
})();
