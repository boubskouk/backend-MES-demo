/**
 * Script pour vérifier le statut des utilisateurs connectés sur MongoDB Atlas (PRODUCTION)
 * Ce script se connecte à Atlas pour voir les utilisateurs marqués comme connectés
 */

const { MongoClient } = require('mongodb');
require('dotenv').config();

// ✅ URI MongoDB Atlas (Production)
const MONGODB_URI_PRODUCTION = 'mongodb+srv://jacquesboubacarkoukoui_db_user:um6pz5uhsXkNGdOe@cluster0.eq69ixv.mongodb.net/cerer_archivage?retryWrites=true&w=majority';
const DB_NAME = 'cerer_archivage';

async function checkProductionOnlineStatus() {
    const client = new MongoClient(MONGODB_URI_PRODUCTION);

    try {
        console.log('🔄 Connexion à MongoDB Atlas (PRODUCTION)...');
        await client.connect();
        console.log('✅ Connecté à MongoDB Atlas (PRODUCTION)\n');

        const db = client.db(DB_NAME);
        const usersCollection = db.collection('users');
        const sessionsCollection = db.collection('sessions');

        // 1. Statistiques générales
        const totalUsers = await usersCollection.countDocuments({});
        const onlineUsers = await usersCollection.countDocuments({ isOnline: true });
        const offlineUsers = await usersCollection.countDocuments({ isOnline: false });
        const usersWithSession = await usersCollection.countDocuments({ sessionID: { $exists: true } });

        console.log('📊 STATISTIQUES GLOBALES:');
        console.log(`   - Total utilisateurs: ${totalUsers}`);
        console.log(`   - Utilisateurs en ligne (isOnline=true): ${onlineUsers}`);
        console.log(`   - Utilisateurs hors ligne (isOnline=false): ${offlineUsers}`);
        console.log(`   - Utilisateurs avec sessionID: ${usersWithSession}`);

        // 2. Compter les sessions actives dans la collection sessions
        const activeSessions = await sessionsCollection.countDocuments({});
        console.log(`   - Sessions actives dans MongoDB: ${activeSessions}\n`);

        // 3. Lister les utilisateurs marqués comme connectés
        if (onlineUsers > 0) {
            console.log('🟢 UTILISATEURS MARQUÉS COMME CONNECTÉS:');
            const onlineUsersList = await usersCollection
                .find({ isOnline: true })
                .project({ username: 1, nom: 1, lastActivity: 1, sessionID: 1, 'role.nom': 1, 'role.niveau': 1 })
                .toArray();

            for (const user of onlineUsersList) {
                console.log(`\n   👤 ${user.nom} (@${user.username})`);
                console.log(`      Rôle: ${user.role?.nom || 'N/A'} (niveau ${user.role?.niveau ?? 'N/A'})`);
                console.log(`      Dernière activité: ${user.lastActivity ? new Date(user.lastActivity).toLocaleString('fr-FR') : 'N/A'}`);
                console.log(`      SessionID: ${user.sessionID || 'AUCUN'}`);

                // Vérifier si la session existe vraiment dans MongoDB
                if (user.sessionID) {
                    const sessionExists = await sessionsCollection.findOne({ _id: user.sessionID });
                    if (sessionExists) {
                        console.log(`      ✅ Session valide dans MongoDB`);
                        // Afficher l'expiration de la session
                        if (sessionExists.expires) {
                            const expiresAt = new Date(sessionExists.expires);
                            const now = new Date();
                            const isExpired = expiresAt < now;
                            console.log(`      Expire le: ${expiresAt.toLocaleString('fr-FR')} ${isExpired ? '⚠️ EXPIRÉE' : '✅ VALIDE'}`);
                        }
                    } else {
                        console.log(`      ❌ Session INTROUVABLE dans MongoDB (incohérence!)`);
                    }
                } else {
                    console.log(`      ⚠️ Pas de sessionID mais isOnline=true (incohérence!)`);
                }
            }
        } else {
            console.log('✅ Aucun utilisateur actuellement marqué comme connecté');
        }

        // 4. Vérifier les incohérences
        console.log('\n\n🔍 VÉRIFICATION DES INCOHÉRENCES:');

        // Utilisateurs avec sessionID mais isOnline=false
        const inconsistent1 = await usersCollection
            .find({
                sessionID: { $exists: true },
                isOnline: false
            })
            .project({ username: 1, nom: 1 })
            .toArray();

        if (inconsistent1.length > 0) {
            console.log(`\n⚠️ ${inconsistent1.length} utilisateur(s) avec sessionID mais isOnline=false:`);
            inconsistent1.forEach(u => console.log(`   - ${u.nom} (@${u.username})`));
        }

        // Utilisateurs avec isOnline=true mais sans sessionID
        const inconsistent2 = await usersCollection
            .find({
                isOnline: true,
                sessionID: { $exists: false }
            })
            .project({ username: 1, nom: 1 })
            .toArray();

        if (inconsistent2.length > 0) {
            console.log(`\n⚠️ ${inconsistent2.length} utilisateur(s) avec isOnline=true mais sans sessionID:`);
            inconsistent2.forEach(u => console.log(`   - ${u.nom} (@${u.username})`));
        }

        // Sessions orphelines (sessions dans MongoDB mais pas d'utilisateur correspondant)
        const allSessions = await sessionsCollection.find({}).toArray();
        let orphanedSessions = 0;
        let validSessions = 0;

        for (const session of allSessions) {
            try {
                // Parser la session pour extraire le userId
                const sessionData = JSON.parse(session.session);
                const userId = sessionData.userId;

                if (userId) {
                    const user = await usersCollection.findOne({ username: userId });
                    if (!user) {
                        orphanedSessions++;
                        console.log(`\n⚠️ Session orpheline détectée: sessionID=${session._id}, userId=${userId} (utilisateur n'existe plus)`);
                    } else if (user.sessionID !== session._id) {
                        console.log(`\n⚠️ Session incohérente: sessionID=${session._id}, userId=${userId} (sessionID utilisateur = ${user.sessionID || 'AUCUN'})`);
                    } else {
                        validSessions++;
                    }
                }
            } catch (err) {
                console.log(`\n❌ Erreur parsing session ${session._id}:`, err.message);
            }
        }

        console.log(`\n📊 Résumé des sessions:`);
        console.log(`   - Sessions valides: ${validSessions}`);
        console.log(`   - Sessions orphelines ou incohérentes: ${orphanedSessions}`);

        if (inconsistent1.length === 0 && inconsistent2.length === 0 && orphanedSessions === 0) {
            console.log('\n✅ Aucune incohérence détectée - Le système fonctionne correctement!');
        } else {
            console.log('\n⚠️ Des incohérences ont été détectées - Voir ci-dessus');
        }

    } catch (error) {
        console.error('❌ Erreur:', error.message);
        console.error(error);
    } finally {
        await client.close();
        console.log('\n👋 Déconnecté de MongoDB Atlas');
    }
}

checkProductionOnlineStatus();
