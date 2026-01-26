#!/usr/bin/env node

/**
 * ============================================
 * SCRIPT DE RÉINITIALISATION AUTOMATIQUE DES MOTS DE PASSE
 * ============================================
 */

require('dotenv').config();
const { MongoClient } = require('mongodb');
const bcrypt = require('bcrypt');

const MONGO_URI = process.env.MONGODB_URI || "mongodb://localhost:27017";
const DB_NAME = process.env.MONGODB_DB_NAME || 'cerer_archivage';

async function autoResetPasswords() {
    let client;

    try {
        console.log('');
        console.log('╔════════════════════════════════════════════════════════╗');
        console.log('║  RÉINITIALISATION AUTOMATIQUE DES MOTS DE PASSE      ║');
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
            await client.close();
            return;
        }

        // Trouver tous les Super Admins
        const superAdmins = await usersCollection.find({
            idRole: superAdminRole._id
        }).toArray();

        if (superAdmins.length === 0) {
            console.log('❌ Erreur: Aucun compte Super Admin trouvé');
            await client.close();
            return;
        }

        console.log(`📋 ${superAdmins.length} compte(s) Super Admin trouvé(s)\n`);

        // Définir les nouveaux mots de passe
        const passwords = {
            'boubs': 'SuperAdmin2025!',
            'ddd': 'SuperAdmin2025!'
        };

        // Réinitialiser chaque compte
        for (const admin of superAdmins) {
            const newPassword = passwords[admin.username] || 'SuperAdmin2025!';

            console.log(`🔄 Réinitialisation pour: ${admin.username} (${admin.email})`);

            // Hasher le nouveau mot de passe
            const hashedPassword = await bcrypt.hash(newPassword, 10);

            // Mettre à jour le mot de passe
            await usersCollection.updateOne(
                { _id: admin._id },
                { $set: { password: hashedPassword } }
            );

            console.log(`   ✅ Mot de passe réinitialisé\n`);
        }

        console.log('');
        console.log('╔════════════════════════════════════════════════════════╗');
        console.log('║  ✅  TOUS LES MOTS DE PASSE RÉINITIALISÉS !           ║');
        console.log('╚════════════════════════════════════════════════════════╝');
        console.log('');
        console.log('🔐 IDENTIFIANTS DE CONNEXION:');
        console.log('');
        console.log(`   URL: http://localhost:${process.env.PORT || 4000}/super-admin-login.html`);
        console.log('');

        for (const admin of superAdmins) {
            const newPassword = passwords[admin.username] || 'SuperAdmin2025!';
            console.log(`   ┌─ Compte: ${admin.username}`);
            console.log(`   │  Email: ${admin.email}`);
            console.log(`   │  Mot de passe: ${newPassword}`);
            console.log(`   └─ Statut: ${admin.isSuperAdmin ? '✅ Super Admin' : '⚠️ Configuration à vérifier'}`);
            console.log('');
        }

        console.log('⚠️  IMPORTANT: Notez bien ces informations !');
        console.log('');
        console.log('💡 Compte recommandé: boubs (correctement configuré)');
        console.log('');

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

        if (client) await client.close();
        process.exit(1);
    }
}

autoResetPasswords();
