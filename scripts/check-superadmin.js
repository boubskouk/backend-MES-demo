#!/usr/bin/env node

/**
 * Script de vérification du compte Super Admin
 */

require('dotenv').config();
const { MongoClient } = require('mongodb');

const MONGO_URI = process.env.MONGODB_URI || "mongodb://localhost:27017";
const DB_NAME = process.env.MONGODB_DB_NAME || 'cerer_archivage';

async function checkSuperAdmin() {
    let client;

    try {
        console.log('\n╔════════════════════════════════════════════════════════╗');
        console.log('║  VÉRIFICATION DU SUPER ADMIN                          ║');
        console.log('╚════════════════════════════════════════════════════════╝\n');

        // Connexion MongoDB
        console.log('🔄 Connexion à MongoDB...');
        client = await MongoClient.connect(MONGO_URI);
        const db = client.db(DB_NAME);
        console.log('✅ Connecté à MongoDB\n');

        const rolesCollection = db.collection('roles');
        const usersCollection = db.collection('users');

        // 1. Vérifier le rôle niveau 0
        console.log('📝 Vérification du rôle "Super Administrateur" (Niveau 0)...\n');

        const superAdminRole = await rolesCollection.findOne({ niveau: 0 });

        if (!superAdminRole) {
            console.log('❌ ERREUR: Le rôle "Super Administrateur" (niveau 0) n\'existe pas !');
            console.log('   Exécutez: node scripts/init-superadmin.js\n');
            await client.close();
            return;
        }

        console.log('✅ Rôle trouvé:');
        console.log(`   ID: ${superAdminRole._id}`);
        console.log(`   Nom: ${superAdminRole.nom || 'N/A'}`);
        console.log(`   Niveau: ${superAdminRole.niveau}`);
        console.log(`   Description: ${superAdminRole.description || 'N/A'}`);
        console.log(`   Permissions: ${superAdminRole.permissions ? superAdminRole.permissions.join(', ') : '⚠️ Aucune permission définie'}`);
        console.log(`   Restrictions: ${superAdminRole.restrictions ? superAdminRole.restrictions.join(', ') : '⚠️ Aucune restriction définie'}`);
        console.log('');

        // 2. Chercher tous les Super Admins
        console.log('👥 Recherche des comptes Super Admin...\n');

        const superAdmins = await usersCollection.find({
            idRole: superAdminRole._id
        }).toArray();

        if (superAdmins.length === 0) {
            console.log('❌ ERREUR: Aucun compte Super Admin trouvé !');
            console.log('   Exécutez: node scripts/init-superadmin.js\n');
            await client.close();
            return;
        }

        console.log(`✅ ${superAdmins.length} compte(s) Super Admin trouvé(s):\n`);

        // 3. Afficher les détails de chaque Super Admin
        for (let i = 0; i < superAdmins.length; i++) {
            const admin = superAdmins[i];

            console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
            console.log(`Compte Super Admin #${i + 1}`);
            console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
            console.log('');
            console.log('📋 Informations générales:');
            console.log(`   ID: ${admin._id}`);
            console.log(`   Username: ${admin.username}`);
            console.log(`   Nom: ${admin.nom}`);
            console.log(`   Prénom: ${admin.prenom || 'N/A'}`);
            console.log(`   Email: ${admin.email}`);
            console.log('');

            console.log('🔐 Authentification:');
            console.log(`   Mot de passe hashé: ${admin.password.substring(0, 20)}...`);
            console.log(`   Type de hash: ${admin.password.startsWith('$2') ? 'bcrypt ✅' : 'Ancien format ⚠️'}`);
            console.log('');

            console.log('👤 Rôle et permissions:');
            console.log(`   Rôle ID: ${admin.idRole}`);
            console.log(`   Département: ${admin.idDepartement || 'Aucun (Super Admin) ✅'}`);
            console.log(`   Statut: ${admin.statut || 'actif'}`);
            console.log('');

            console.log('🛡️ Métadonnées Super Admin:');
            if (admin.metadata) {
                console.log(`   isSuperAdmin: ${admin.metadata.isSuperAdmin ? '✅ Oui' : '❌ Non'}`);
                console.log(`   canArchive: ${admin.metadata.canArchive ? '❌ Oui (PROBLÈME!)' : '✅ Non'}`);
                console.log(`   purpose: ${admin.metadata.purpose || 'N/A'}`);
            } else {
                console.log('   ⚠️ Aucune métadonnée trouvée');
            }
            console.log('');

            console.log('📅 Dates:');
            console.log(`   Créé le: ${admin.dateCreation ? new Date(admin.dateCreation).toLocaleString('fr-FR') : 'N/A'}`);
            console.log(`   Dernière connexion: ${admin.derniereConnexion ? new Date(admin.derniereConnexion).toLocaleString('fr-FR') : 'Jamais'}`);
            console.log('');

            // Vérifications
            const checks = [];

            // Vérif 1: Pas de département
            if (admin.idDepartement === null || admin.idDepartement === undefined) {
                checks.push('✅ Pas de département (correct)');
            } else {
                checks.push('❌ A un département (incorrect pour Super Admin)');
            }

            // Vérif 2: Métadonnées correctes
            if (admin.metadata && admin.metadata.isSuperAdmin === true) {
                checks.push('✅ Marqué comme Super Admin');
            } else {
                checks.push('⚠️ Pas marqué comme Super Admin');
            }

            // Vérif 3: Ne peut pas archiver
            if (admin.metadata && admin.metadata.canArchive === false) {
                checks.push('✅ Ne peut PAS archiver (correct)');
            } else {
                checks.push('❌ Peut archiver (incorrect pour Super Admin)');
            }

            // Vérif 4: Mot de passe hashé
            if (admin.password.startsWith('$2')) {
                checks.push('✅ Mot de passe sécurisé avec bcrypt');
            } else {
                checks.push('⚠️ Mot de passe non hashé');
            }

            console.log('🔍 Vérifications:');
            checks.forEach(check => console.log(`   ${check}`));
            console.log('');
        }

        console.log('╔════════════════════════════════════════════════════════╗');
        console.log('║  ✅ VÉRIFICATION TERMINÉE                             ║');
        console.log('╚════════════════════════════════════════════════════════╝\n');

        await client.close();

    } catch (error) {
        console.error('\n❌ Erreur lors de la vérification:');
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

// Exécution
checkSuperAdmin();
