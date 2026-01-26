// Script pour activer firstLogin sur n'importe quel utilisateur
const { MongoClient } = require('mongodb');

const MONGO_URI = 'mongodb://localhost:27017';
const DB_NAME = 'cerer_archivage';

// ⚠️ MODIFIER CE USERNAME
const USERNAME = process.argv[2]; // Récupérer depuis la ligne de commande

async function setFirstLogin() {
    if (!USERNAME) {
        console.log('\n❌ Usage: node set-firstlogin-any-user.js <username>\n');
        console.log('Exemple: node set-firstlogin-any-user.js jbk\n');
        process.exit(1);
    }

    const client = await MongoClient.connect(MONGO_URI);
    const db = client.db(DB_NAME);
    const users = db.collection('users');

    // Vérifier si l'utilisateur existe
    const user = await users.findOne({ username: USERNAME });

    if (!user) {
        console.log(`\n❌ Utilisateur "${USERNAME}" non trouvé\n`);

        // Afficher quelques utilisateurs disponibles
        const allUsers = await users.find({}, { projection: { username: 1, nom: 1 } }).limit(10).toArray();
        console.log('Utilisateurs disponibles:');
        allUsers.forEach(u => console.log(`  - ${u.username} (${u.nom || 'N/A'})`));
        console.log('');

        await client.close();
        process.exit(1);
    }

    // Activer firstLogin
    await users.updateOne(
        { username: USERNAME },
        {
            $set: {
                firstLogin: true,
                mustChangePassword: true
            }
        }
    );

    console.log(`\n✅ Flags activés pour "${USERNAME}"`);
    console.log('   - firstLogin: true');
    console.log('   - mustChangePassword: true');
    console.log(`\n👉 Vous pouvez maintenant vous connecter avec ${USERNAME} et le mot de passe actuel\n`);

    await client.close();
}

setFirstLogin().catch(console.error);
