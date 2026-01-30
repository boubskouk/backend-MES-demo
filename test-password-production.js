/**
 * Test de vérification du mot de passe en production
 */

const bcrypt = require('bcrypt');  // Même package que le service
const mongoose = require('mongoose');

const MONGODB_URI = 'mongodb+srv://cerer_user:JCIsME2FEYTOXLpX@cluster0.jodtq6h.mongodb.net/base_MES?retryWrites=true&w=majority&appName=Cluster0';

async function testPassword() {
    try {
        console.log('🔄 Connexion à MongoDB Atlas...');
        await mongoose.connect(MONGODB_URI);
        console.log('✅ Connecté\n');

        const User = mongoose.model('User', new mongoose.Schema({}, { strict: false, collection: 'users' }));

        const user = await User.findOne({ username: 'boubs' });

        if (!user) {
            console.log('❌ Utilisateur non trouvé');
            return;
        }

        console.log('Hash stocké:', user.password);
        console.log('');

        // Test avec le mot de passe attendu
        const testPassword = 'passer@123';
        console.log('Test avec:', testPassword);

        const isValid = await bcrypt.compare(testPassword, user.password);
        console.log('Résultat:', isValid ? '✅ VALIDE' : '❌ INVALIDE');

        if (!isValid) {
            // Recréer le hash avec bcrypt (pas bcryptjs)
            console.log('\n🔄 Recréation du hash avec bcrypt...');
            const newHash = await bcrypt.hash(testPassword, 10);
            console.log('Nouveau hash:', newHash);

            await User.updateOne(
                { username: 'boubs' },
                { $set: { password: newHash } }
            );
            console.log('✅ Mot de passe mis à jour!');

            // Vérifier
            const verify = await bcrypt.compare(testPassword, newHash);
            console.log('Vérification:', verify ? '✅ OK' : '❌ ERREUR');
        }

        await mongoose.disconnect();
        console.log('\n✅ Déconnecté');

    } catch (error) {
        console.error('❌ Erreur:', error.message);
        await mongoose.disconnect().catch(() => {});
    }
}

testPassword();
