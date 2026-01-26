#!/usr/bin/env node

/**
 * ============================================
 * SCRIPT D'INITIALISATION SUPER ADMIN
 * ============================================
 *
 * Crée le premier compte Super Administrateur (Niveau 0)
 * Ce compte est uniquement pour la SUPERVISION du système
 *
 * ⚠️  Le Super Admin ne fait PAS d'archivage !
 * ⚠️  Il supervise uniquement le système
 *
 * Usage:
 *   node scripts/init-superadmin.js
 */

require('dotenv').config();
const { MongoClient, ObjectId } = require('mongodb');
const bcrypt = require('bcrypt');
const readline = require('readline');

// Configuration
const MONGO_URI = process.env.MONGODB_URI || "mongodb://localhost:27017";
const DB_NAME = process.env.MONGODB_DB_NAME || 'cerer_archivage';

// Interface pour les questions
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

function question(query) {
    return new Promise(resolve => {
        rl.question(query, resolve);
    });
}

/**
 * Fonction principale
 */
async function createSuperAdmin() {
    let client;

    try {
        console.log('');
        console.log('╔════════════════════════════════════════════════════════╗');
        console.log('║  CRÉATION DU SUPER ADMINISTRATEUR (NIVEAU 0)          ║');
        console.log('╚════════════════════════════════════════════════════════╝');
        console.log('');
        console.log('⚠️  IMPORTANT: Le Super Admin est uniquement pour la');
        console.log('   SUPERVISION du système, PAS pour l\'archivage !');
        console.log('');

        // Connexion MongoDB
        console.log('🔄 Connexion à MongoDB...');
        client = await MongoClient.connect(MONGO_URI);
        const db = client.db(DB_NAME);
        console.log('✅ Connecté à MongoDB\n');

        const rolesCollection = db.collection('roles');
        const usersCollection = db.collection('users');

        // 1. Créer ou vérifier le rôle niveau 0
        let superAdminRole = await rolesCollection.findOne({ niveau: 0 });

        if (!superAdminRole) {
            console.log('📝 Création du rôle "Super Administrateur" (Niveau 0)...');

            const roleResult = await rolesCollection.insertOne({
                nom: "Super Administrateur",
                niveau: 0,
                description: "Supervision et administration complète du système. Ne fait PAS d'archivage.",
                permissions: [
                    "FULL_READ_ACCESS",         // Lecture totale
                    "SYSTEM_ADMINISTRATION",    // Administration système
                    "USER_MANAGEMENT",          // Gestion utilisateurs
                    "SECURITY_MONITORING",      // Monitoring sécurité
                    "AUDIT_ACCESS",             // Accès aux logs
                    "SYSTEM_CONFIGURATION",     // Configuration système
                    "PERFORMANCE_MONITORING"    // Monitoring performance
                ],
                restrictions: [
                    "NO_DOCUMENT_ARCHIVING",    // PAS d'archivage de documents
                    "READ_ONLY_DOCUMENTS"       // Lecture seule des documents
                ],
                createdAt: new Date()
            });

            superAdminRole = {
                _id: roleResult.insertedId,
                niveau: 0,
                nom: "Super Administrateur"
            };

            console.log('✅ Rôle "Super Administrateur" créé avec succès\n');
        } else {
            console.log('✅ Rôle "Super Administrateur" existe déjà\n');
        }

        // 2. Vérifier s'il existe déjà un super admin
        const existingSuperAdmin = await usersCollection.findOne({
            idRole: superAdminRole._id
        });

        if (existingSuperAdmin) {
            console.log(`⚠️  Un Super Administrateur existe déjà :`);
            console.log(`   Username: ${existingSuperAdmin.username}`);
            console.log(`   Email: ${existingSuperAdmin.email}`);
            console.log('');

            const addAnother = await question('Voulez-vous créer un AUTRE Super Admin ? (o/n): ');

            if (addAnother.toLowerCase() !== 'o' && addAnother.toLowerCase() !== 'oui') {
                console.log('\n❌ Création annulée par l\'utilisateur');
                rl.close();
                await client.close();
                return;
            }
            console.log('');
        }

        // 3. Demander les informations du nouveau Super Admin
        console.log('╔════════════════════════════════════════════════════════╗');
        console.log('║  INFORMATIONS DU SUPER ADMINISTRATEUR                 ║');
        console.log('╚════════════════════════════════════════════════════════╝');
        console.log('');

        const nom = await question('Nom: ');
        const prenom = await question('Prénom: ');
        const email = await question('Email: ');
        const username = await question('Username: ');
        const password = await question('Mot de passe (min. 8 caractères): ');

        // 4. Validations
        if (!nom || !prenom || !email || !username || !password) {
            console.log('\n❌ Erreur: Tous les champs sont obligatoires');
            rl.close();
            await client.close();
            return;
        }

        if (password.length < 8) {
            console.log('\n❌ Erreur: Le mot de passe doit contenir au moins 8 caractères');
            rl.close();
            await client.close();
            return;
        }

        // 5. Vérifier l'unicité du username et email
        const existingUser = await usersCollection.findOne({
            $or: [{ username }, { email }]
        });

        if (existingUser) {
            console.log('\n❌ Erreur: Un utilisateur avec ce username ou cet email existe déjà');
            console.log(`   Username existant: ${existingUser.username}`);
            console.log(`   Email existant: ${existingUser.email}`);
            rl.close();
            await client.close();
            return;
        }

        // 6. Hasher le mot de passe
        console.log('\n🔐 Chiffrement du mot de passe...');
        const hashedPassword = await bcrypt.hash(password, 10);

        // 7. Créer l'utilisateur Super Admin
        console.log('📝 Création du compte Super Admin...');

        const userResult = await usersCollection.insertOne({
            nom: nom,
            prenom: prenom,
            email: email,
            username: username,
            password: hashedPassword,
            idRole: superAdminRole._id,
            idDepartement: null,  // ⚠️  Super Admin n'a PAS de département
            dateCreation: new Date(),
            derniereConnexion: null,
            statut: "actif",
            metadata: {
                isSuperAdmin: true,
                canArchive: false,  // ⚠️  NE PEUT PAS archiver
                purpose: "system_supervision"
            }
        });

        // 8. Créer les collections d'audit si elles n'existent pas
        console.log('📝 Initialisation des collections Super Admin...');

        const auditLogsCollection = db.collection('auditLogs');
        await auditLogsCollection.createIndex({ timestamp: -1 });
        await auditLogsCollection.createIndex({ user: 1 });
        await auditLogsCollection.createIndex({ action: 1 });

        // Logger la création du Super Admin
        await auditLogsCollection.insertOne({
            timestamp: new Date(),
            user: 'system',
            userLevel: -1,
            action: 'SUPERADMIN_ACCOUNT_CREATED',
            target: {
                userId: userResult.insertedId,
                username: username
            },
            details: {
                createdBy: 'init-script',
                nom: nom,
                prenom: prenom,
                email: email
            },
            ip: 'localhost',
            userAgent: 'Node.js Script',
            result: 'success'
        });

        // 9. Afficher le résumé
        console.log('');
        console.log('╔════════════════════════════════════════════════════════╗');
        console.log('║  ✅  SUPER ADMIN CRÉÉ AVEC SUCCÈS !                   ║');
        console.log('╚════════════════════════════════════════════════════════╝');
        console.log('');
        console.log('📋 Détails du compte:');
        console.log(`   ID: ${userResult.insertedId}`);
        console.log(`   Nom complet: ${prenom} ${nom}`);
        console.log(`   Email: ${email}`);
        console.log(`   Username: ${username}`);
        console.log(`   Niveau: 0 (Super Administrateur)`);
        console.log(`   Département: Aucun (supervision uniquement)`);
        console.log(`   Peut archiver: NON ❌`);
        console.log(`   Rôle: Supervision et administration système`);
        console.log('');
        console.log('🔐 Accès:');
        console.log(`   URL: http://localhost:${process.env.PORT || 4000}/super-admin.html`);
        console.log(`   Username: ${username}`);
        console.log(`   Mot de passe: (celui que vous avez entré)`);
        console.log('');
        console.log('⚠️  Rappel: Ce compte est pour la SUPERVISION,');
        console.log('   pas pour l\'archivage de documents !');
        console.log('');

        rl.close();
        await client.close();

        console.log('✅ Terminé !\n');

    } catch (error) {
        console.error('\n❌ Erreur lors de la création du Super Admin:');
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

// Exécution
createSuperAdmin();
