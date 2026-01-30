/**
 * Corriger le rôle super_admin en production
 */

const mongoose = require('mongoose');

const MONGODB_URI = 'mongodb+srv://cerer_user:JCIsME2FEYTOXLpX@cluster0.jodtq6h.mongodb.net/base_MES?retryWrites=true&w=majority&appName=Cluster0';

async function fixRole() {
    try {
        console.log('🔄 Connexion à MongoDB Atlas...');
        await mongoose.connect(MONGODB_URI);
        console.log('✅ Connecté\n');

        const Role = mongoose.model('Role', new mongoose.Schema({}, { strict: false, collection: 'roles' }));

        // Mettre à jour le rôle super_admin avec tous les champs requis
        const result = await Role.updateOne(
            { niveau: 0 },
            {
                $set: {
                    nom: 'super_admin',
                    libelle: 'Super Administrateur',
                    description: 'Accès complet au système',
                    niveau: 0,
                    permissions: ['*']
                }
            }
        );

        console.log('Rôle mis à jour:', result.modifiedCount > 0 ? '✅' : '(déjà à jour)');

        // Vérifier
        const role = await Role.findOne({ niveau: 0 });
        console.log('\n=== RÔLE SUPER ADMIN ===');
        console.log('ID:', role._id);
        console.log('Nom:', role.nom);
        console.log('Libelle:', role.libelle);
        console.log('Niveau:', role.niveau);

        await mongoose.disconnect();
        console.log('\n✅ Déconnecté');

    } catch (error) {
        console.error('❌ Erreur:', error.message);
        await mongoose.disconnect().catch(() => {});
    }
}

fixRole();
