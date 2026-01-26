/**
 * Script de création du Super Admin pour la démo MES
 * Usage: node scripts/create-demo-superadmin.js
 */

const { MongoClient, ObjectId } = require('mongodb');
const bcrypt = require('bcrypt');

// Configuration pour la démo MES
const MONGO_URI = "mongodb://localhost:27017/mes_archivage?retryWrites=true&w=majority";
const DB_NAME = 'mes_archivage';

// Informations du Super Admin de démo
const DEMO_SUPER_ADMIN = {
    username: 'admin_mes',
    password: 'demo2024',  // Mot de passe simple pour la démo
    nom: 'Administrateur MES',
    email: 'admin@mes.sn'
};

async function createDemoSuperAdmin() {
    console.log('\n🏥 ========================================');
    console.log('   CRÉATION SUPER ADMIN - DÉMO MES');
    console.log('   ========================================\n');

    let client;

    try {
        // Connexion à MongoDB
        console.log('🔄 Connexion à MongoDB...');
        client = await MongoClient.connect(MONGO_URI);
        const db = client.db(DB_NAME);

        console.log(`✅ Connecté à la base: ${DB_NAME}\n`);

        // Vérifier/créer la collection roles
        const rolesCollection = db.collection('roles');
        const usersCollection = db.collection('users');

        // Chercher ou créer le rôle Super Admin (niveau 0)
        let superAdminRole = await rolesCollection.findOne({ niveau: 0 });

        if (!superAdminRole) {
            console.log('🔧 Création du rôle Super Admin (niveau 0)...');
            const roleResult = await rolesCollection.insertOne({
                nom: 'Super Administrateur',
                niveau: 0,
                description: 'Accès total au système',
                dateCreation: new Date()
            });
            superAdminRole = { _id: roleResult.insertedId, niveau: 0 };
            console.log('✅ Rôle Super Admin créé\n');
        } else {
            console.log(`✅ Rôle existant: ${superAdminRole.nom} (Niveau ${superAdminRole.niveau})\n`);
        }

        // Vérifier si le super admin existe déjà
        const existingAdmin = await usersCollection.findOne({ username: DEMO_SUPER_ADMIN.username });

        if (existingAdmin) {
            console.log(`⚠️  Le Super Admin "${DEMO_SUPER_ADMIN.username}" existe déjà !`);
            console.log('   Suppression et recréation...\n');
            await usersCollection.deleteOne({ username: DEMO_SUPER_ADMIN.username });
        }

        // Hacher le mot de passe
        console.log('🔐 Hachage du mot de passe...');
        const hashedPassword = await bcrypt.hash(DEMO_SUPER_ADMIN.password, 10);

        // Créer le Super Admin
        console.log('👤 Création du Super Admin...');
        const newUser = {
            username: DEMO_SUPER_ADMIN.username,
            password: hashedPassword,
            nom: DEMO_SUPER_ADMIN.nom,
            email: DEMO_SUPER_ADMIN.email,
            idRole: superAdminRole._id,
            dateCreation: new Date(),
            firstLogin: false,
            isOnline: false,
            blocked: false
        };

        const result = await usersCollection.insertOne(newUser);

        if (result.insertedId) {
            console.log('\n✅ ========================================');
            console.log('   SUPER ADMIN CRÉÉ AVEC SUCCÈS ! 🎉');
            console.log('   ========================================');
            console.log(`   Username  : ${DEMO_SUPER_ADMIN.username}`);
            console.log(`   Password  : ${DEMO_SUPER_ADMIN.password}`);
            console.log(`   Email     : ${DEMO_SUPER_ADMIN.email}`);
            console.log('   ========================================');
            console.log('\n   🌐 URL de connexion :');
            console.log('   http://localhost:4000/super-admin-login.html');
            console.log('   ========================================\n');
        }

    } catch (error) {
        console.error('\n❌ ERREUR:', error.message);

        if (error.message.includes('ECONNREFUSED')) {
            console.log('\n💡 MongoDB n\'est pas démarré !');
            console.log('   Démarrez MongoDB puis relancez ce script.\n');
        }
    } finally {
        if (client) {
            await client.close();
            console.log('🔌 Connexion fermée\n');
        }
    }
}

// Exécuter
createDemoSuperAdmin();
