/**
 * Réinitialisation directe du mot de passe Super Admin
 */

require('dotenv').config();
const { MongoClient } = require('mongodb');
const bcrypt = require('bcrypt');

const MONGO_URI = process.env.MONGODB_URI || "mongodb://localhost:27017";
const DB_NAME = process.env.MONGODB_DB_NAME || 'cerer_archivage';

async function resetPassword() {
    const username = process.argv[2];
    const newPassword = process.argv[3];

    if (!username || !newPassword) {
        console.log('❌ Usage: node reset-password-direct.js <username> <nouveau_mot_de_passe>');
        process.exit(1);
    }

    let client;

    try {
        console.log('🔄 Connexion à MongoDB...');
        client = await MongoClient.connect(MONGO_URI);
        const db = client.db(DB_NAME);
        const usersCollection = db.collection('users');
        const rolesCollection = db.collection('roles');

        // Trouver le rôle niveau 0
        const superAdminRole = await rolesCollection.findOne({ niveau: 0 });
        if (!superAdminRole) {
            console.log('❌ Rôle Super Admin (niveau 0) non trouvé');
            await client.close();
            process.exit(1);
        }

        // Trouver l'utilisateur
        const user = await usersCollection.findOne({
            username: username,
            idRole: superAdminRole._id
        });

        if (!user) {
            console.log(`❌ Utilisateur Super Admin "${username}" non trouvé`);
            await client.close();
            process.exit(1);
        }

        // Hasher le nouveau mot de passe
        const hashedPassword = await bcrypt.hash(newPassword, 10);

        // Mettre à jour le mot de passe
        await usersCollection.updateOne(
            { _id: user._id },
            { $set: { password: hashedPassword } }
        );

        console.log('\n╔════════════════════════════════════════════════════════╗');
        console.log('║  ✅  MOT DE PASSE RÉINITIALISÉ AVEC SUCCÈS !          ║');
        console.log('╚════════════════════════════════════════════════════════╝\n');
        console.log(`📋 Compte: ${user.prenom} ${user.nom}`);
        console.log(`📧 Email: ${user.email}`);
        console.log(`👤 Username: ${username}`);
        console.log(`🔑 Nouveau mot de passe: ${newPassword}`);
        console.log(`\n🌐 Connexion: http://localhost:4000/super-admin-login.html\n`);

        await client.close();

    } catch (error) {
        console.error('❌ Erreur:', error);
        if (client) await client.close();
        process.exit(1);
    }
}

resetPassword();
