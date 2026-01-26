// ============================================
// SCRIPT DE DIAGNOSTIC DES DÉCONNEXIONS
// ============================================

const { MongoClient } = require('mongodb');
const constants = require('./utils/constants');

async function diagnoseDisconnections() {
    console.log('🔍 Diagnostic des déconnexions utilisateurs...\n');

    let client;
    try {
        // Connexion MongoDB
        client = await MongoClient.connect(constants.MONGO_URI, {
            serverSelectionTimeoutMS: 10000
        });
        const db = client.db(constants.DB_NAME);
        const usersCollection = db.collection('users');
        const sessionsCollection = db.collection('sessions');

        console.log('═══════════════════════════════════════════════════');
        console.log('📊 ANALYSE DES SESSIONS');
        console.log('═══════════════════════════════════════════════════\n');

        // 1. Sessions actives dans MongoDB
        const allSessions = await sessionsCollection.find({}).toArray();
        console.log(`🔑 Sessions dans MongoDB: ${allSessions.length}`);

        if (allSessions.length > 0) {
            console.log('\n   Sessions détaillées:');
            for (const session of allSessions) {
                try {
                    // Le champ session peut être une string JSON ou un objet
                    let sessionData;
                    if (typeof session.session === 'string') {
                        sessionData = JSON.parse(session.session);
                    } else if (session.session && typeof session.session === 'object') {
                        sessionData = session.session;
                    } else {
                        console.log(`   ⚠️ Format de session inconnu pour ${session._id}`);
                        continue;
                    }

                    const userId = sessionData.userId || sessionData.passport?.user || 'Inconnu';
                    const expires = session.expires ? new Date(session.expires).toLocaleString('fr-FR') : 'N/A';
                    const now = new Date();
                    const isExpired = session.expires && new Date(session.expires) < now;

                    console.log(`   - User: ${userId}`);
                    console.log(`     Expire: ${expires} ${isExpired ? '⚠️ EXPIRÉ' : '✅ Valide'}`);
                    console.log(`     ID: ${session._id}`);
                    console.log('');
                } catch (error) {
                    console.log(`   ⚠️ Erreur parsing session ${session._id}: ${error.message}`);
                }
            }
        }

        // 2. Utilisateurs marqués en ligne
        const onlineUsers = await usersCollection.find({ isOnline: true }).toArray();
        console.log(`\n👥 Utilisateurs marqués isOnline=true: ${onlineUsers.length}`);

        if (onlineUsers.length > 0) {
            console.log('\n   Utilisateurs en ligne:');
            for (const user of onlineUsers) {
                const hasSession = allSessions.some(s => {
                    try {
                        let sessionData;
                        if (typeof s.session === 'string') {
                            sessionData = JSON.parse(s.session);
                        } else if (s.session && typeof s.session === 'object') {
                            sessionData = s.session;
                        } else {
                            return false;
                        }
                        const userId = sessionData.userId || sessionData.passport?.user;
                        return userId === user.username;
                    } catch {
                        return false;
                    }
                });

                console.log(`   - ${user.username} (${user.nom})`);
                console.log(`     Session MongoDB: ${hasSession ? '✅ OUI' : '❌ NON (INCOHÉRENCE!)'}`);
                console.log(`     SessionID stocké: ${user.sessionID || 'Aucun'}`);
                console.log(`     Dernière activité: ${user.lastActivity ? new Date(user.lastActivity).toLocaleString('fr-FR') : 'Inconnue'}`);
                console.log('');
            }
        }

        // 3. Détection des incohérences
        console.log('\n═══════════════════════════════════════════════════');
        console.log('⚠️  DÉTECTION DES PROBLÈMES');
        console.log('═══════════════════════════════════════════════════\n');

        const issues = [];

        // Problème 1: Utilisateurs en ligne sans session
        const usersOnlineWithoutSession = onlineUsers.filter(user => {
            return !allSessions.some(s => {
                try {
                    let sessionData;
                    if (typeof s.session === 'string') {
                        sessionData = JSON.parse(s.session);
                    } else if (s.session && typeof s.session === 'object') {
                        sessionData = s.session;
                    } else {
                        return false;
                    }
                    const userId = sessionData.userId || sessionData.passport?.user;
                    return userId === user.username;
                } catch {
                    return false;
                }
            });
        });

        if (usersOnlineWithoutSession.length > 0) {
            issues.push({
                type: 'ONLINE_WITHOUT_SESSION',
                count: usersOnlineWithoutSession.length,
                users: usersOnlineWithoutSession.map(u => u.username)
            });
        }

        // Problème 2: Sessions expirées
        const expiredSessions = allSessions.filter(s => {
            return s.expires && new Date(s.expires) < new Date();
        });

        if (expiredSessions.length > 0) {
            issues.push({
                type: 'EXPIRED_SESSIONS',
                count: expiredSessions.length,
                sessions: expiredSessions.map(s => {
                    try {
                        let sessionData;
                        if (typeof s.session === 'string') {
                            sessionData = JSON.parse(s.session);
                        } else if (s.session && typeof s.session === 'object') {
                            sessionData = s.session;
                        } else {
                            return { userId: 'Format inconnu', expires: s.expires };
                        }
                        const userId = sessionData.userId || sessionData.passport?.user || 'Inconnu';
                        return {
                            userId,
                            expires: s.expires
                        };
                    } catch {
                        return { userId: 'Erreur parsing', expires: s.expires };
                    }
                })
            });
        }

        // Affichage des problèmes
        if (issues.length === 0) {
            console.log('✅ Aucun problème détecté\n');
        } else {
            console.log(`❌ ${issues.length} problème(s) détecté(s):\n`);

            issues.forEach((issue, index) => {
                console.log(`${index + 1}. ${issue.type}`);
                console.log(`   Nombre: ${issue.count}`);

                if (issue.type === 'ONLINE_WITHOUT_SESSION') {
                    console.log(`   Utilisateurs: ${issue.users.join(', ')}`);
                    console.log(`   ⚠️ Ces utilisateurs vont être déconnectés au prochain appel API`);
                } else if (issue.type === 'EXPIRED_SESSIONS') {
                    console.log(`   Sessions expirées:`);
                    issue.sessions.forEach(s => {
                        console.log(`     - ${s.userId} (expiré le ${new Date(s.expires).toLocaleString('fr-FR')})`);
                    });
                }
                console.log('');
            });
        }

        // 4. Configuration actuelle
        console.log('═══════════════════════════════════════════════════');
        console.log('⚙️  CONFIGURATION ACTUELLE');
        console.log('═══════════════════════════════════════════════════\n');

        console.log(`SESSION_COOKIE_MAX_AGE: ${constants.SECURITY.SESSION_COOKIE_MAX_AGE / 1000 / 60 / 60} heures`);
        console.log(`SESSION_TOUCH_AFTER: ${constants.SECURITY.SESSION_TOUCH_AFTER / 60} minutes`);
        console.log(`Keep-alive client: 5 minutes (auto-logout.js)`);
        console.log('');

        // 5. Recommandations
        console.log('═══════════════════════════════════════════════════');
        console.log('💡 RECOMMANDATIONS');
        console.log('═══════════════════════════════════════════════════\n');

        if (issues.length > 0) {
            console.log('Actions recommandées:');
            console.log('1. Exécuter: node check-sessions-coherence.js --fix-all');
            console.log('2. Redémarrer le serveur pour appliquer la nouvelle config SESSION_TOUCH_AFTER');
            console.log('3. Demander aux utilisateurs de se reconnecter');
        } else {
            console.log('✅ Tout fonctionne correctement');
            console.log('✅ SESSION_TOUCH_AFTER est maintenant synchronisé avec le keep-alive');
            console.log('✅ Les déconnexions intempestives devraient être résolues');
        }
        console.log('\n═══════════════════════════════════════════════════\n');

    } catch (error) {
        console.error('❌ Erreur lors du diagnostic:', error);
        process.exit(1);
    } finally {
        if (client) {
            await client.close();
            console.log('🔌 Connexion MongoDB fermée');
        }
    }
}

// Lancer le diagnostic
diagnoseDisconnections()
    .then(() => {
        console.log('✅ Diagnostic terminé');
        process.exit(0);
    })
    .catch((error) => {
        console.error('❌ Erreur fatale:', error);
        process.exit(1);
    });
