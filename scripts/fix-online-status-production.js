/**
 * Script pour corriger les incohérences de statut isOnline sur MongoDB Atlas (PRODUCTION)
 *
 * Ce script:
 * 1. Vérifie tous les utilisateurs avec isOnline=true
 * 2. Pour chaque utilisateur, vérifie si sa session existe vraiment dans MongoDB
 * 3. Si la session n'existe pas ou est expirée, met isOnline=false et supprime sessionID
 */

const { MongoClient } = require('mongodb');
require('dotenv').config();

// ✅ URI MongoDB Atlas (Production)
const MONGODB_URI_PRODUCTION = 'mongodb+srv://jacquesboubacarkoukoui_db_user:um6pz5uhsXkNGdOe@cluster0.eq69ixv.mongodb.net/cerer_archivage?retryWrites=true&w=majority';
const DB_NAME = 'cerer_archivage';

async function fixOnlineStatusProduction() {
    const client = new MongoClient(MONGODB_URI_PRODUCTION);

    try {
        console.log('🔄 Connexion à MongoDB Atlas (PRODUCTION)...');
        await client.connect();
        console.log('✅ Connecté à MongoDB Atlas (PRODUCTION)\n');

        const db = client.db(DB_NAME);
        const usersCollection = db.collection('users');
        const sessionsCollection = db.collection('sessions');

        // 1. Récupérer tous les utilisateurs marqués comme connectés
        const onlineUsers = await usersCollection
            .find({ isOnline: true })
            .project({ username: 1, nom: 1, sessionID: 1 })
            .toArray();

        console.log(`📊 ${onlineUsers.length} utilisateur(s) marqué(s) comme connecté(s)\n`);

        let fixedCount = 0;
        let validCount = 0;

        for (const user of onlineUsers) {
            console.log(`🔍 Vérification: ${user.nom} (@${user.username})`);
            console.log(`   SessionID: ${user.sessionID || 'AUCUN'}`);

            let shouldDisconnect = false;
            let reason = '';

            if (!user.sessionID) {
                // Utilisateur sans sessionID mais isOnline=true
                shouldDisconnect = true;
                reason = 'Pas de sessionID';
            } else {
                // Vérifier si la session existe dans MongoDB
                const session = await sessionsCollection.findOne({ _id: user.sessionID });

                if (!session) {
                    shouldDisconnect = true;
                    reason = 'Session introuvable dans MongoDB';
                } else {
                    // Vérifier si la session a expiré
                    if (session.expires) {
                        const expiresAt = new Date(session.expires);
                        const now = new Date();

                        if (expiresAt < now) {
                            shouldDisconnect = true;
                            reason = `Session expirée (${expiresAt.toLocaleString('fr-FR')})`;
                        } else {
                            console.log(`   ✅ Session valide (expire le ${expiresAt.toLocaleString('fr-FR')})`);
                            validCount++;
                        }
                    } else {
                        console.log(`   ✅ Session valide (pas d'expiration)`);
                        validCount++;
                    }
                }
            }

            if (shouldDisconnect) {
                console.log(`   ⚠️ ${reason} - Mise à jour isOnline=false...`);

                // Mettre à jour l'utilisateur
                const updateResult = await usersCollection.updateOne(
                    { username: user.username },
                    {
                        $set: {
                            isOnline: false,
                            lastActivity: new Date()
                        },
                        $unset: {
                            sessionID: ""
                        }
                    }
                );

                if (updateResult.modifiedCount > 0) {
                    console.log(`   ✅ Statut corrigé`);
                    fixedCount++;
                } else {
                    console.log(`   ❌ Échec de la mise à jour`);
                }
            }

            console.log('');
        }

        // 2. Nettoyer les sessions orphelines (optionnel)
        console.log('\n🧹 NETTOYAGE DES SESSIONS ORPHELINES:');
        const allSessions = await sessionsCollection.find({}).toArray();
        let deletedSessions = 0;

        for (const session of allSessions) {
            // Vérifier si la session est expirée
            if (session.expires) {
                const expiresAt = new Date(session.expires);
                const now = new Date();

                if (expiresAt < now) {
                    console.log(`🗑️ Suppression session expirée: ${session._id} (expirée le ${expiresAt.toLocaleString('fr-FR')})`);
                    await sessionsCollection.deleteOne({ _id: session._id });
                    deletedSessions++;
                }
            }
        }

        // 3. Résumé final
        console.log('\n\n📊 RÉSUMÉ DES CORRECTIONS:');
        console.log(`   - Utilisateurs avec statut valide: ${validCount}`);
        console.log(`   - Utilisateurs avec statut corrigé: ${fixedCount}`);
        console.log(`   - Sessions expirées supprimées: ${deletedSessions}`);

        if (fixedCount > 0 || deletedSessions > 0) {
            console.log('\n✅ Nettoyage terminé avec succès!');
        } else {
            console.log('\n✅ Aucune correction nécessaire - Le système est cohérent!');
        }

    } catch (error) {
        console.error('❌ Erreur:', error.message);
        console.error(error);
    } finally {
        await client.close();
        console.log('\n👋 Déconnecté de MongoDB Atlas');
    }
}

fixOnlineStatusProduction();
