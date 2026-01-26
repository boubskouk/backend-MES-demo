const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');

const MONGODB_URI = 'mongodb://localhost:27017/cerer_archivage';

async function createSuperAdmin() {
    try {
        await mongoose.connect(MONGODB_URI);
        console.log('✅ Connecté à MongoDB');

        const User = mongoose.model('User', new mongoose.Schema({}, { strict: false }));

        // Supprimer l'ancien utilisateur s'il existe
        console.log('🗑️ Suppression de l\'ancien utilisateur...');
        await User.deleteMany({ username: "boubs" });
        console.log('✅ Ancien utilisateur supprimé');

        const password = 'passer@123';
        const hashedPassword = await bcrypt.hash(password, 10);

        const newUser = await User.create({
            nom: "koukoui",
            prenom: "boubacar",
            email: "jacquessboubacar.koukoui@ucad.edu.sn",
            username: "boubs",
            password: hashedPassword,
            idRole: new mongoose.Types.ObjectId("6906ba2f428e88da300bb8ac"),
            idDepartement: null,
            dateCreation: new Date(),
            derniereConnexion: null,
            statut: "actif",
            metadata: {
                isSuperAdmin: true,
                canArchive: false,
                purpose: "system_supervision"
            }
        });

        console.log('✅ Super Admin créé avec succès !');
        console.log('   Username: boubs');
        console.log('   Password:', password);
        console.log('   ID:', newUser._id);
        
        await mongoose.disconnect();
        console.log('✅ Déconnecté de MongoDB');
        
    } catch (error) {
        console.error('❌ Erreur:', error);
        await mongoose.disconnect();
        process.exit(1);
    }
}

createSuperAdmin();