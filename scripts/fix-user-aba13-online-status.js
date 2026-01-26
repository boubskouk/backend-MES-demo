// ============================================
// Script: Corriger le statut en ligne de aba13
// ============================================

const { MongoClient } = require('mongodb');

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const DB_NAME = 'archivage_cerer';

async function fixAba13OnlineStatus() {
    const client = new MongoClient(MONGO_URI);

    try {
        console.log('🔄 Connexion à MongoDB...');
        await client.connect();
        console.log('✅ Connecté à MongoDB');

        const db = client.db(DB_NAME);
        const usersCollection = db.collection('users');

        // 1. Vérifier le statut actuel de aba13
        console.log('\n📋 Vérification du statut de aba13...');
        const user = await usersCollection.findOne({ username: 'aba13' });

        if (!user) {
            console.log('❌ Utilisateur aba13 non trouvé');
            return;
        }

        console.log('📊 Statut actuel de aba13:');
        console.log(`   - Nom: ${user.nom}`);
        console.log(`   - Email: ${user.email}`);
        console.log(`   - isOnline: ${user.isOnline}`);
        console.log(`   - lastActivity: ${user.lastActivity}`);
        console.log(`   - sessionID: ${user.sessionID || 'Aucun'}`);

        // 2. Mettre à jour isOnline à false
        if (user.isOnline === true) {
            console.log('\n🔧 Mise à jour de isOnline à false...');

            const result = await usersCollection.updateOne(
                { username: 'aba13' },
                {
                    $set: { isOnline: false },
                    $unset: { sessionID: "" }
                }
            );

            if (result.modifiedCount > 0) {
                console.log('✅ Statut corrigé avec succès!');
                console.log(`   - isOnline: false`);
                console.log(`   - sessionID: supprimé`);
            } else {
                console.log('⚠️ Aucune modification effectuée (peut-être déjà à jour)');
            }
        } else {
            console.log('✅ L\'utilisateur aba13 est déjà marqué comme hors ligne');
        }

    } catch (error) {
        console.error('❌ Erreur:', error);
    } finally {
        await client.close();
        console.log('\n👋 Déconnexion de MongoDB');
    }
}

// Exécuter le script
fixAba13OnlineStatus();
