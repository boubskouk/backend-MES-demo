// ============================================
// Script: Lister tous les utilisateurs en ligne
// ============================================

const { MongoClient } = require('mongodb');

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const DB_NAME = 'archivage_cerer';

async function listOnlineUsers() {
    const client = new MongoClient(MONGO_URI);

    try {
        console.log('🔄 Connexion à MongoDB...');
        await client.connect();
        console.log('✅ Connecté à MongoDB\n');

        const db = client.db(DB_NAME);
        const usersCollection = db.collection('users');

        // 1. Lister tous les utilisateurs marqués en ligne
        console.log('📋 Utilisateurs marqués isOnline=true:\n');
        const onlineUsers = await usersCollection.find({ isOnline: true }).toArray();

        if (onlineUsers.length === 0) {
            console.log('✅ Aucun utilisateur marqué en ligne');
        } else {
            console.log(`📊 ${onlineUsers.length} utilisateur(s) en ligne:\n`);
            onlineUsers.forEach((user, index) => {
                console.log(`${index + 1}. Username: ${user.username}`);
                console.log(`   Nom: ${user.nom}`);
                console.log(`   Email: ${user.email}`);
                console.log(`   isOnline: ${user.isOnline}`);
                console.log(`   lastActivity: ${user.lastActivity}`);
                console.log(`   sessionID: ${user.sessionID || 'Aucun'}`);
                console.log('');
            });
        }

        // 2. Chercher spécifiquement des utilisateurs contenant "aba"
        console.log('\n🔍 Recherche d\'utilisateurs contenant "aba":\n');
        const abaUsers = await usersCollection.find({
            username: { $regex: /aba/i }
        }).toArray();

        if (abaUsers.length === 0) {
            console.log('❌ Aucun utilisateur trouvé contenant "aba"');
        } else {
            console.log(`📊 ${abaUsers.length} utilisateur(s) trouvé(s):\n`);
            abaUsers.forEach((user, index) => {
                console.log(`${index + 1}. Username: ${user.username}`);
                console.log(`   Nom: ${user.nom}`);
                console.log(`   isOnline: ${user.isOnline}`);
                console.log('');
            });
        }

    } catch (error) {
        console.error('❌ Erreur:', error);
    } finally {
        await client.close();
        console.log('👋 Déconnexion de MongoDB');
    }
}

// Exécuter le script
listOnlineUsers();
