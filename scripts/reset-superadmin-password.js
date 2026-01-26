#!/usr/bin/env node

/**
 * ============================================
 * SCRIPT DE RÉINITIALISATION MOT DE PASSE SUPER ADMIN
 * ============================================
 */

require('dotenv').config();
const { MongoClient } = require('mongodb');
const bcrypt = require('bcrypt');
const readline = require('readline');

const MONGO_URI = process.env.MONGODB_URI || "mongodb://localhost:27017";
const DB_NAME = process.env.MONGODB_DB_NAME || 'cerer_archivage';

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

function question(query) {
    return new Promise(resolve => {
        rl.question(query, resolve);
    });
}

async function resetPassword() {
    let client;

    try {
        console.log('');
        console.log('╔════════════════════════════════════════════════════════╗');
        console.log('║  RÉINITIALISATION MOT DE PASSE SUPER ADMIN           ║');
        console.log('╚════════════════════════════════════════════════════════╝');
        console.log('');

        // Connexion MongoDB
        console.log('🔄 Connexion à MongoDB...');
        client = await MongoClient.connect(MONGO_URI);
        const db = client.db(DB_NAME);
        console.log('✅ Connecté à MongoDB\n');

        const usersCollection = db.collection('users');
        const rolesCollection = db.collection('roles');

        // Trouver le rôle niveau 0
        const superAdminRole = await rolesCollection.findOne({ niveau: 0 });

        if (!superAdminRole) {
            console.log('❌ Erreur: Le rôle Super Administrateur n\'existe pas');
            rl.close();
            await client.close();
            return;
        }

        // Trouver tous les Super Admins
        const superAdmins = await usersCollection.find({
            idRole: superAdminRole._id
        }).toArray();

        if (superAdmins.length === 0) {
            console.log('❌ Erreur: Aucun compte Super Admin trouvé');
            rl.close();
            await client.close();
            return;
        }

        // Afficher la liste
        console.log('📋 Comptes Super Admin disponibles:\n');
        superAdmins.forEach((admin, index) => {
            console.log(`   ${index + 1}. ${admin.username} (${admin.email})`);
        });
        console.log('');

        // Demander quel compte réinitialiser
        let selectedAdmin;
        if (superAdmins.length === 1) {
            selectedAdmin = superAdmins[0];
            console.log(`✅ Réinitialisation pour: ${selectedAdmin.username}\n`);
        } else {
            const choice = await question(`Choisissez le numéro du compte (1-${superAdmins.length}): `);
            const index = parseInt(choice) - 1;

            if (index < 0 || index >= superAdmins.length) {
                console.log('\n❌ Choix invalide');
                rl.close();
                await client.close();
                return;
            }

            selectedAdmin = superAdmins[index];
            console.log('');
        }

        // Demander le nouveau mot de passe
        const newPassword = await question('Nouveau mot de passe (min. 8 caractères): ');

        if (newPassword.length < 8) {
            console.log('\n❌ Erreur: Le mot de passe doit contenir au moins 8 caractères');
            rl.close();
            await client.close();
            return;
        }

        const confirmPassword = await question('Confirmez le mot de passe: ');

        if (newPassword !== confirmPassword) {
            console.log('\n❌ Erreur: Les mots de passe ne correspondent pas');
            rl.close();
            await client.close();
            return;
        }

        // Hasher le nouveau mot de passe
        console.log('\n🔐 Chiffrement du nouveau mot de passe...');
        const hashedPassword = await bcrypt.hash(newPassword, 10);

        // Mettre à jour le mot de passe
        await usersCollection.updateOne(
            { _id: selectedAdmin._id },
            { $set: { password: hashedPassword } }
        );

        console.log('');
        console.log('╔════════════════════════════════════════════════════════╗');
        console.log('║  ✅  MOT DE PASSE RÉINITIALISÉ AVEC SUCCÈS !          ║');
        console.log('╚════════════════════════════════════════════════════════╝');
        console.log('');
        console.log('🔐 Nouveaux identifiants:');
        console.log(`   URL: http://localhost:${process.env.PORT || 4000}/super-admin-login.html`);
        console.log(`   Username: ${selectedAdmin.username}`);
        console.log(`   Email: ${selectedAdmin.email}`);
        console.log(`   Mot de passe: ${newPassword}`);
        console.log('');
        console.log('⚠️  IMPORTANT: Notez bien ces informations !');
        console.log('');

        rl.close();
        await client.close();

        console.log('✅ Terminé !\n');

    } catch (error) {
        console.error('\n❌ Erreur lors de la réinitialisation:');
        console.error(error.message);
        console.error('');

        if (error.message.includes('connect')) {
            console.error('💡 Vérifiez que MongoDB est en cours d\'exécution');
            console.error(`   URI: ${MONGO_URI}`);
        }

        rl.close();
        if (client) await client.close();
        process.exit(1);
    }
}

resetPassword();
