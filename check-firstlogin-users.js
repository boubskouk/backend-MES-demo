const { MongoClient } = require('mongodb');
const bcrypt = require('bcrypt');

const MONGO_URI = 'mongodb://localhost:27017';
const DB_NAME = 'mes_archivage';

async function checkFirstLoginUsers() {
    const client = await MongoClient.connect(MONGO_URI);
    const db = client.db(DB_NAME);
    const users = db.collection('users');

    console.log('\n🔍 Utilisateurs avec firstLogin=true:\n');

    const firstLoginUsers = await users.find({
        firstLogin: true
    }).toArray();

    if (firstLoginUsers.length === 0) {
        console.log('❌ Aucun utilisateur trouvé avec firstLogin=true\n');
    } else {
        for (const user of firstLoginUsers) {
            console.log(`👤 Username: ${user.username}`);
            console.log(`   Nom: ${user.nom || 'N/A'}`);
            console.log(`   Email: ${user.email || 'N/A'}`);
            console.log(`   firstLogin: ${user.firstLogin}`);
            console.log(`   mustChangePassword: ${user.mustChangePassword || false}`);

            // Vérifier le format du mot de passe
            const isBcrypt = /^\$2[aby]\$/.test(user.password);
            console.log(`   Mot de passe: ${isBcrypt ? 'Hashé (bcrypt)' : 'Plain text ou autre'}`);

            if (isBcrypt) {
                // Tester avec 1234
                const match1234 = await bcrypt.compare('1234', user.password);
                console.log(`   Test mot de passe "1234": ${match1234 ? '✅ VALIDE' : '❌ INVALIDE'}`);
            } else {
                console.log(`   Mot de passe stocké: ${user.password}`);
            }
            console.log('');
        }
    }

    await client.close();
}

checkFirstLoginUsers().catch(console.error);
