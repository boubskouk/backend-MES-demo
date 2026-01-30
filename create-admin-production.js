/**
 * Script de création de compte Super Admin en PRODUCTION
 *
 * Usage: node create-admin-production.js
 *
 * Ce script se connecte au cluster MongoDB Atlas de production
 * et crée un compte super admin.
 */

const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');

// URI MongoDB Atlas - Production (Cluster Paris)
const MONGODB_URI = 'mongodb+srv://cerer_user:JCIsME2FEYTOXLpX@cluster0.jodtq6h.mongodb.net/base_MES?retryWrites=true&w=majority&appName=Cluster0';

// Credentials du Super Admin
const ADMIN_CONFIG = {
    username: 'boubs',
    password: 'passer@123',
    nom: 'koukoui',
    prenom: 'boubacar',
    email: 'jacquessboubacar.koukoui@ucad.edu.sn'
};

async function createSuperAdmin() {
    try {
        console.log('🔄 Connexion à MongoDB Atlas (Production)...');
        console.log('   Cluster: cluster0.jodtq6h.mongodb.net');

        await mongoose.connect(MONGODB_URI, {
            serverSelectionTimeoutMS: 10000,
            connectTimeoutMS: 10000
        });
        console.log('✅ Connecté à MongoDB Atlas');

        // Définir un schéma flexible pour les utilisateurs
        const User = mongoose.model('User', new mongoose.Schema({}, { strict: false, collection: 'users' }));

        // Vérifier si l'utilisateur existe déjà
        const existingUser = await User.findOne({ username: ADMIN_CONFIG.username });
        if (existingUser) {
            console.log('⚠️  L\'utilisateur existe déjà. Mise à jour du mot de passe...');

            const hashedPassword = await bcrypt.hash(ADMIN_CONFIG.password, 10);
            await User.updateOne(
                { username: ADMIN_CONFIG.username },
                {
                    $set: {
                        password: hashedPassword,
                        statut: 'actif',
                        'metadata.isSuperAdmin': true
                    }
                }
            );
            console.log('✅ Mot de passe mis à jour avec succès !');
        } else {
            console.log('🔄 Création du Super Admin...');

            const hashedPassword = await bcrypt.hash(ADMIN_CONFIG.password, 10);

            // Chercher ou créer le rôle primaire (niveau 0 = super admin)
            const Role = mongoose.model('Role', new mongoose.Schema({}, { strict: false, collection: 'roles' }));
            let superAdminRole = await Role.findOne({ niveau: 0 });

            if (!superAdminRole) {
                console.log('🔄 Création du rôle Super Admin...');
                superAdminRole = await Role.create({
                    nom: 'super_admin',
                    niveau: 0,
                    description: 'Super Administrateur - Accès complet au système'
                });
                console.log('✅ Rôle Super Admin créé');
            }

            const newUser = await User.create({
                nom: ADMIN_CONFIG.nom,
                prenom: ADMIN_CONFIG.prenom,
                email: ADMIN_CONFIG.email,
                username: ADMIN_CONFIG.username,
                password: hashedPassword,
                idRole: superAdminRole._id,
                idDepartement: null,
                dateCreation: new Date(),
                derniereConnexion: null,
                statut: 'actif',
                isOnline: false,
                firstLogin: false,
                mustChangePassword: false,
                metadata: {
                    isSuperAdmin: true,
                    canArchive: false,
                    purpose: 'system_supervision'
                }
            });

            console.log('✅ Super Admin créé avec succès !');
            console.log('   ID:', newUser._id);
        }

        console.log('\n========================================');
        console.log('   IDENTIFIANTS DE CONNEXION');
        console.log('========================================');
        console.log('   Username: ' + ADMIN_CONFIG.username);
        console.log('   Password: ' + ADMIN_CONFIG.password);
        console.log('========================================');
        console.log('\n💡 Utilise /api/admin-login pour te connecter en tant que Super Admin');

        await mongoose.disconnect();
        console.log('\n✅ Déconnecté de MongoDB');
        process.exit(0);

    } catch (error) {
        console.error('\n❌ Erreur:', error.message);
        if (error.message.includes('ENOTFOUND') || error.message.includes('getaddrinfo')) {
            console.error('   Vérifiez votre connexion internet');
        }
        if (error.message.includes('authentication failed')) {
            console.error('   Vérifiez les credentials MongoDB Atlas');
        }
        await mongoose.disconnect().catch(() => {});
        process.exit(1);
    }
}

createSuperAdmin();
