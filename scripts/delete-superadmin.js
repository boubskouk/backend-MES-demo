const { MongoClient, ObjectId } = require('mongodb');
const readline = require('readline');

const MONGO_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/cerer_archivage?retryWrites=true&w=majority";
const DB_NAME = process.env.MONGODB_DB_NAME || 'cerer_archivage';

// Interface pour lire les entrées utilisateur
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

// Fonction pour poser une question
function question(query) {
    return new Promise(resolve => rl.question(query, resolve));
}

async function deleteSuperAdmin() {
    console.log('\n🗑️  ========================================');
    console.log('   SUPPRESSION D\'UN SUPER ADMINISTRATEUR');
    console.log('   (Niveau 0 - Compte compromis)');
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
        console.log(`   SUPER ADMINS ACTUELS (${superAdmins.length})`);
        console.log('   ========================================\n');

        superAdmins.forEach((admin, index) => {
            console.log(`   ${index + 1}. Username : ${admin.username}`);
            console.log(`      Nom      : ${admin.nom}`);
            console.log(`      Email    : ${admin.email}`);
            console.log(`      ID       : ${admin._id}`);
            console.log('');
        });

        console.log('   ========================================\n');

        // Avertissement si c'est le dernier Super Admin
        if (superAdmins.length === 1) {
            console.log('⚠️  ATTENTION : C\'est le SEUL Super Admin du système !');
            console.log('   Si vous le supprimez, vous ne pourrez plus administrer le système.');
            console.log('   Assurez-vous d\'avoir créé un nouveau Super Admin AVANT de supprimer celui-ci.\n');
        }

        // Demander quel Super Admin supprimer
        let choice;
        while (true) {
            choice = await question(`📝 Entrez le numéro du Super Admin à supprimer (1-${superAdmins.length}) ou 'annuler' : `);
            choice = choice.trim().toLowerCase();

            if (choice === 'annuler' || choice === 'cancel' || choice === 'q' || choice === 'quit') {
                console.log('\n❌ Suppression annulée.\n');
                return;
            }

            const choiceNum = parseInt(choice);
            if (isNaN(choiceNum) || choiceNum < 1 || choiceNum > superAdmins.length) {
                console.log(`❌ Choix invalide. Veuillez entrer un numéro entre 1 et ${superAdmins.length}.\n`);
                continue;
            }

            choice = choiceNum;
            break;
        }

        const adminToDelete = superAdmins[choice - 1];

        // Afficher les informations du Super Admin à supprimer
        console.log('\n🗑️  ========================================');
        console.log('   SUPER ADMIN À SUPPRIMER');
        console.log('   ========================================');
        console.log(`   Username : ${adminToDelete.username}`);
        console.log(`   Nom      : ${adminToDelete.nom}`);
        console.log(`   Email    : ${adminToDelete.email}`);
        console.log(`   ID       : ${adminToDelete._id}`);
        console.log('   ========================================\n');

        // Triple confirmation pour la sécurité
        console.log('⚠️  AVERTISSEMENT : Cette action est IRRÉVERSIBLE !');
        console.log('   Le compte sera DÉFINITIVEMENT supprimé de la base de données.\n');

        // Première confirmation
        const confirm1 = await question('✋ Êtes-vous SÛR de vouloir supprimer ce Super Admin ? (oui/non) : ');
        if (confirm1.toLowerCase() !== 'oui' && confirm1.toLowerCase() !== 'o' && confirm1.toLowerCase() !== 'yes' && confirm1.toLowerCase() !== 'y') {
            console.log('\n❌ Suppression annulée.\n');
            return;
        }

        // Deuxième confirmation avec le username
        const confirm2 = await question(`\n🔐 Pour confirmer, tapez le username du Super Admin : "${adminToDelete.username}" : `);
        if (confirm2.trim() !== adminToDelete.username) {
            console.log('\n❌ Le username ne correspond pas. Suppression annulée.\n');
            return;
        }

        // Troisième confirmation finale
        console.log('\n⚠️  DERNIÈRE CONFIRMATION');
        const confirm3 = await question('❗ Tapez "SUPPRIMER" en MAJUSCULES pour confirmer : ');
        if (confirm3.trim() !== 'SUPPRIMER') {
            console.log('\n❌ Confirmation incorrecte. Suppression annulée.\n');
            return;
        }

        // Supprimer le Super Admin
        console.log('\n🔄 Suppression en cours...');
        const result = await usersCollection.deleteOne({ _id: adminToDelete._id });

        if (result.deletedCount === 1) {
            console.log('\n✅ ========================================');
            console.log('   SUPER ADMIN SUPPRIMÉ AVEC SUCCÈS !');
            console.log('   ========================================');
            console.log(`   Username : ${adminToDelete.username}`);
            console.log(`   Nom      : ${adminToDelete.nom}`);
            console.log('   ========================================\n');

            // Compter les Super Admins restants
            const remainingSuperAdmins = await usersCollection.countDocuments({ idRole: superAdminRole._id });
            console.log(`📊 Super Admins restants : ${remainingSuperAdmins}\n`);

            if (remainingSuperAdmins === 0) {
                console.log('⚠️  ATTENTION : Il n\'y a plus AUCUN Super Admin dans le système !');
                console.log('   Vous devez créer un nouveau Super Admin immédiatement :');
                console.log('   → npm run create-superadmin\n');
            }
        } else {
            console.log('\n❌ Erreur : Le Super Admin n\'a pas pu être supprimé.\n');
        }

    } catch (error) {
        console.error('\n❌ ERREUR :', error.message);
        console.error(error);
    } finally {
        rl.close();
        if (client) {
            await client.close();
            console.log('🔌 Connexion fermée\n');
        }
    }
}

// Lancer le script
deleteSuperAdmin().catch(console.error);
