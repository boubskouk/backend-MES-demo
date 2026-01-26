#!/usr/bin/env node

/**
 * ============================================
 * SCRIPT CRÉATION SUPER ADMIN POUR BASE EN LIGNE
 * ============================================
 *
 * Crée le compte Super Admin "boubs" directement
 * sur la base de données en ligne (MongoDB Atlas)
 *
 * Usage:
 *   node scripts/create-super-admin-online.js
 */

require('dotenv').config();
const { MongoClient } = require('mongodb');
const bcrypt = require('bcrypt');

// Configuration - utilise les variables d'environnement
const MONGO_URI = process.env.MONGODB_URI || "mongodb://localhost:27017";
const DB_NAME = process.env.MONGODB_DB_NAME || 'cerer_archivage';

// Informations du Super Admin à créer
const SUPER_ADMIN = {
    nom: "BOUBS",
    prenom: "Admin",
    email: "boubs@cerer.sn",
    username: "boubs",
    password: "Boubs@2024"  // ⚠️ Changez ce mot de passe après la première connexion !
};

/**
 * Fonction principale
 */
async function createSuperAdmin() {
    let client;

    try {
        console.log('');
        console.log('╔════════════════════════════════════════════════════════╗');
        console.log('║  CRÉATION SUPER ADMIN POUR BASE EN LIGNE              ║');
        console.log('╚════════════════════════════════════════════════════════╝');
        console.log('');

        // Afficher les infos de connexion
        console.log('🔗 Configuration:');
        console.log(`   URI: ${MONGO_URI.substring(0, 50)}...`);
        console.log(`   Base de données: ${DB_NAME}`);
        console.log('');

        // Connexion MongoDB
        console.log('🔄 Connexion à MongoDB...');
        client = await MongoClient.connect(MONGO_URI);
        const db = client.db(DB_NAME);
        console.log('✅ Connecté à MongoDB\n');

        const rolesCollection = db.collection('roles');
        const usersCollection = db.collection('users');

        // 1. Créer ou vérifier le rôle niveau 0
        console.log('📝 Vérification du rôle Super Administrateur (Niveau 0)...');
        let superAdminRole = await rolesCollection.findOne({ niveau: 0 });

        if (!superAdminRole) {
            console.log('   → Création du rôle...');
            const roleResult = await rolesCollection.insertOne({
                nom: "Super Administrateur",
                niveau: 0,
                description: "Supervision et administration complète du système",
                permissions: [
                    "FULL_READ_ACCESS",
                    "SYSTEM_ADMINISTRATION",
                    "USER_MANAGEMENT",
                    "SECURITY_MONITORING",
                    "AUDIT_ACCESS",
                    "SYSTEM_CONFIGURATION",
                    "PERFORMANCE_MONITORING"
                ],
                restrictions: [
                    "NO_DOCUMENT_ARCHIVING",
                    "READ_ONLY_DOCUMENTS"
                ],
                createdAt: new Date()
            });

            superAdminRole = {
                _id: roleResult.insertedId,
                niveau: 0,
                nom: "Super Administrateur"
            };

            console.log('   ✅ Rôle créé');
        } else {
            console.log('   ✅ Rôle existe déjà');
        }
        console.log('');

        // 2. Vérifier si l'utilisateur existe déjà
        console.log(`📝 Vérification de l'utilisateur "${SUPER_ADMIN.username}"...`);
        const existingUser = await usersCollection.findOne({
            username: SUPER_ADMIN.username
        });

        if (existingUser) {
            console.log(`   ⚠️  L'utilisateur "${SUPER_ADMIN.username}" existe déjà !`);
            console.log(`   Email: ${existingUser.email}`);
            console.log('');

            // Mettre à jour le mot de passe et s'assurer qu'il est Super Admin
            console.log('   🔄 Mise à jour du mot de passe et du rôle...');
            const hashedPassword = await bcrypt.hash(SUPER_ADMIN.password, 10);

            await usersCollection.updateOne(
                { username: SUPER_ADMIN.username },
                {
                    $set: {
                        password: hashedPassword,
                        idRole: superAdminRole._id,
                        email: SUPER_ADMIN.email,
                        nom: SUPER_ADMIN.nom,
                        prenom: SUPER_ADMIN.prenom,
                        blocked: false,
                        statut: "actif",
                        metadata: {
                            isSuperAdmin: true,
                            canArchive: false,
                            purpose: "system_supervision"
                        }
                    }
                }
            );

            console.log('   ✅ Utilisateur mis à jour avec succès !');
            console.log('');
            console.log('╔════════════════════════════════════════════════════════╗');
            console.log('║  ✅  SUPER ADMIN MIS À JOUR !                         ║');
            console.log('╚════════════════════════════════════════════════════════╝');

        } else {
            // 3. Créer le nouvel utilisateur
            console.log('   → Création du compte...');
            console.log('   🔐 Chiffrement du mot de passe...');
            const hashedPassword = await bcrypt.hash(SUPER_ADMIN.password, 10);

            const userResult = await usersCollection.insertOne({
                nom: SUPER_ADMIN.nom,
                prenom: SUPER_ADMIN.prenom,
                email: SUPER_ADMIN.email,
                username: SUPER_ADMIN.username,
                password: hashedPassword,
                idRole: superAdminRole._id,
                idDepartement: null,
                dateCreation: new Date(),
                derniereConnexion: null,
                statut: "actif",
                blocked: false,
                metadata: {
                    isSuperAdmin: true,
                    canArchive: false,
                    purpose: "system_supervision"
                },
                createdBy: 'system'
            });

            console.log('   ✅ Compte créé !');
            console.log('');

            // 4. Créer les index d'audit
            console.log('📝 Initialisation des collections d\'audit...');
            const auditLogsCollection = db.collection('auditLogs');
            await auditLogsCollection.createIndex({ timestamp: -1 });
            await auditLogsCollection.createIndex({ user: 1 });
            await auditLogsCollection.createIndex({ action: 1 });

            // Logger la création
            await auditLogsCollection.insertOne({
                timestamp: new Date(),
                user: 'system',
                userLevel: -1,
                action: 'SUPERADMIN_ACCOUNT_CREATED',
                target: {
                    userId: userResult.insertedId,
                    username: SUPER_ADMIN.username
                },
                details: {
                    createdBy: 'create-super-admin-online.js',
                    nom: SUPER_ADMIN.nom,
                    prenom: SUPER_ADMIN.prenom,
                    email: SUPER_ADMIN.email
                },
                ip: 'localhost',
                userAgent: 'Node.js Script',
                result: 'success'
            });

            console.log('   ✅ Collections initialisées');
            console.log('');
            console.log('╔════════════════════════════════════════════════════════╗');
            console.log('║  ✅  SUPER ADMIN CRÉÉ AVEC SUCCÈS !                   ║');
            console.log('╚════════════════════════════════════════════════════════╝');
        }

        // 5. Afficher les informations de connexion
        console.log('');
        console.log('🔐 INFORMATIONS DE CONNEXION:');
        console.log('   ════════════════════════════════════════════');
        console.log(`   Username: ${SUPER_ADMIN.username}`);
        console.log(`   Password: ${SUPER_ADMIN.password}`);
        console.log('   ════════════════════════════════════════════');
        console.log('');
        console.log('🌐 URL d\'accès:');
        console.log('   https://votre-domaine.com/super-admin-login.html');
        console.log('   ou');
        console.log('   https://votre-domaine.com/super-admin.html');
        console.log('');
        console.log('⚠️  IMPORTANT: Changez ce mot de passe après votre première connexion !');
        console.log('');

        await client.close();
        console.log('✅ Terminé !\n');

    } catch (error) {
        console.error('\n❌ ERREUR lors de la création du Super Admin:');
        console.error('   ', error.message);
        console.error('');

        if (error.message.includes('connect') || error.message.includes('ECONNREFUSED')) {
            console.error('💡 Vérifiez:');
            console.error('   1. Que votre fichier .env contient le bon MONGODB_URI');
            console.error('   2. Que votre IP est autorisée dans MongoDB Atlas (Network Access)');
            console.error('   3. Que vos identifiants MongoDB sont corrects');
            console.error('');
            console.error(`   URI actuel: ${MONGO_URI.substring(0, 50)}...`);
        }

        if (client) await client.close();
        process.exit(1);
    }
}

// Exécution
console.log('\n🚀 Démarrage du script...\n');
createSuperAdmin();
