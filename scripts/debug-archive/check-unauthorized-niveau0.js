const { MongoClient } = require('mongodb');

const MONGO_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/cerer_archivage?retryWrites=true&w=majority";
const DB_NAME = process.env.MONGODB_DB_NAME || 'cerer_archivage';

async function checkUnauthorizedNiveau0() {
    console.log('\n🔍 ========================================');
    console.log('   VÉRIFICATION DES SUPER ADMINS');
    console.log('   ========================================\n');

    let client;

    try {
        // Connexion à la base de données
        console.log('🔄 Connexion à la base de données...');
        client = await MongoClient.connect(MONGO_URI);
        const db = client.db(DB_NAME);
        const usersCollection = db.collection('users');
        const rolesCollection = db.collection('roles');

        console.log('✅ Connecté à la base de données\n');

        // Trouver le rôle de niveau 0
        const superAdminRole = await rolesCollection.findOne({ niveau: 0 });
        if (!superAdminRole) {
            console.log('❌ ERREUR : Aucun rôle de niveau 0 trouvé dans la base de données !');
            return;
        }

        // Lister tous les Super Admins
        const superAdmins = await usersCollection.find({ idRole: superAdminRole._id }).toArray();

        if (superAdmins.length === 0) {
            console.log('❌ Aucun Super Admin trouvé dans la base de données.\n');
            return;
        }

        console.log('📋 ========================================');
        console.log(`   SUPER ADMINS TROUVÉS (${superAdmins.length})`);
        console.log('   ========================================\n');

        superAdmins.forEach((admin, index) => {
            const createdAt = admin.dateCreation ? new Date(admin.dateCreation).toLocaleString('fr-FR') : 'Date inconnue';
            console.log(`   ${index + 1}. Username : ${admin.username}`);
            console.log(`      Nom      : ${admin.nom}`);
            console.log(`      Email    : ${admin.email}`);
            console.log(`      ID       : ${admin._id}`);
            console.log(`      Créé le  : ${createdAt}`);
            console.log('');
        });

        console.log('   ========================================\n');

        if (superAdmins.length > 1) {
            console.log('⚠️  ATTENTION : Plusieurs Super Admins détectés !');
            console.log('   Si certains ont été créés via l\'interface web (et non via script),');
            console.log('   vous devriez les supprimer avec la commande :');
            console.log('   → npm run delete-superadmin\n');
        } else {
            console.log('✅ Un seul Super Admin trouvé. C\'est normal.\n');
        }

    } catch (error) {
        console.error('\n❌ ERREUR :', error.message);
        console.error(error);
    } finally {
        if (client) {
            await client.close();
            console.log('🔌 Connexion fermée\n');
        }
    }
}

// Lancer le script
checkUnauthorizedNiveau0().catch(console.error);
