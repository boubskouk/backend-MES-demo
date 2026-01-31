const { MongoClient } = require('mongodb');
const bcrypt = require('bcrypt');

const MONGO_URI = 'mongodb://localhost:27017';
const DB_NAME = 'mes_archivage';

async function checkAba11Password() {
    const client = await MongoClient.connect(MONGO_URI);
    const db = client.db(DB_NAME);

    const user = await db.collection('users').findOne({ username: 'aba11' });

    if (!user) {
        console.log('❌ Utilisateur aba11 non trouvé');
        await client.close();
        return;
    }

    console.log('\n👤 Utilisateur: aba11');
    console.log('Nom:', user.nom);
    console.log('Email:', user.email);
    console.log('');

    // Vérifier si le mot de passe est hashé
    const isBcrypt = /^\$2[aby]\$/.test(user.password);
    console.log('Format mot de passe:', isBcrypt ? 'Hashé (bcrypt)' : 'Plain text ou autre');

    if (isBcrypt) {
        // Tester plusieurs mots de passe communs
        const testPasswords = ['1234', '0811', 'aba11', 'admin', 'password'];

        console.log('\n🔍 Test des mots de passe courants:');
        for (const pwd of testPasswords) {
            const match = await bcrypt.compare(pwd, user.password);
            console.log(`   "${pwd}": ${match ? '✅ VALIDE' : '❌'}`);
        }
    } else {
        console.log('Mot de passe stocké:', user.password);
    }

    console.log('');
    await client.close();
}

checkAba11Password().catch(console.error);
