/**
 * Script de diagnostic - Vérifier l'utilisateur admin en production
 */

const mongoose = require('mongoose');

const MONGODB_URI = 'mongodb+srv://cerer_user:JCIsME2FEYTOXLpX@cluster0.jodtq6h.mongodb.net/base_MES?retryWrites=true&w=majority&appName=Cluster0';

async function checkAdmin() {
    try {
        console.log('🔄 Connexion à MongoDB Atlas...');
        await mongoose.connect(MONGODB_URI);
        console.log('✅ Connecté\n');

        const User = mongoose.model('User', new mongoose.Schema({}, { strict: false, collection: 'users' }));
        const Role = mongoose.model('Role', new mongoose.Schema({}, { strict: false, collection: 'roles' }));

        // Vérifier l'utilisateur
        console.log('=== UTILISATEUR ===');
        const user = await User.findOne({ username: 'boubs' });
        if (user) {
            console.log('Username:', user.username);
            console.log('Password hash:', user.password?.substring(0, 20) + '...');
            console.log('idRole:', user.idRole);
            console.log('Statut:', user.statut);
            console.log('metadata:', JSON.stringify(user.metadata, null, 2));
        } else {
            console.log('❌ Utilisateur non trouvé!');
        }

        // Vérifier le rôle
        console.log('\n=== RÔLE ASSOCIÉ ===');
        if (user && user.idRole) {
            const role = await Role.findOne({ _id: user.idRole });
            if (role) {
                console.log('Role ID:', role._id);
                console.log('Nom:', role.nom);
                console.log('Libelle:', role.libelle);
                console.log('Niveau:', role.niveau);
            } else {
                console.log('❌ Rôle non trouvé!');
            }
        }

        // Lister tous les rôles
        console.log('\n=== TOUS LES RÔLES ===');
        const allRoles = await Role.find({});
        allRoles.forEach(r => {
            console.log(`- ${r.nom || r.libelle} (niveau: ${r.niveau}, id: ${r._id})`);
        });

        // Lister tous les utilisateurs
        console.log('\n=== TOUS LES UTILISATEURS ===');
        const allUsers = await User.find({});
        for (const u of allUsers) {
            const uRole = await Role.findOne({ _id: u.idRole });
            console.log(`- ${u.username} (niveau: ${uRole?.niveau ?? 'N/A'}, role: ${uRole?.nom || uRole?.libelle || 'N/A'})`);
        }

        await mongoose.disconnect();
        console.log('\n✅ Déconnecté');

    } catch (error) {
        console.error('❌ Erreur:', error.message);
        await mongoose.disconnect().catch(() => {});
    }
}

checkAdmin();
