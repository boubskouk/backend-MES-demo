// ============================================
// SCRIPT DE VÉRIFICATION COHÉRENCE SESSIONS
// ============================================

const { MongoClient } = require('mongodb');
const constants = require('./utils/constants');

async function checkSessionCoherence() {
    console.log('🔍 Vérification de la cohérence des sessions...\n');

    let client;
    try {
        // Connexion MongoDB
        client = await MongoClient.connect(constants.MONGO_URI, {
            serverSelectionTimeoutMS: 10000
        });
        const db = client.db(constants.DB_NAME);
        const usersCollection = db.collection('users');

        // 1. Utilisateurs marqués en ligne
        const usersMarkedOnline = await usersCollection.find({
            isOnline: true
        }).toArray();

        // 2. Utilisateurs avec sessionID
        const usersWithSession = await usersCollection.find({
            sessionID: { $exists: true, $ne: null }
        }).toArray();

        // 3. Incohérences : isOnline=true MAIS PAS de sessionID
        const falsePositives = usersMarkedOnline.filter(user => !user.sessionID);

        // 4. Incohérences : sessionID présent MAIS isOnline=false
        const falseNegatives = usersWithSession.filter(user => !user.isOnline);

        // 5. Utilisateurs bloqués mais marqués en ligne
        const blockedButOnline = await usersCollection.find({
            blocked: true,
            isOnline: true
        }).toArray();

        // Affichage des résultats
        console.log('📊 RÉSULTATS DE L\'ANALYSE');
        console.log('═══════════════════════════════════════════════════');
        console.log(`👥 Utilisateurs marqués en ligne (isOnline=true): ${usersMarkedOnline.length}`);
        console.log(`🔑 Utilisateurs avec sessionID: ${usersWithSession.length}`);
        console.log(`❌ Faux positifs (en ligne SANS session): ${falsePositives.length}`);
        console.log(`⚠️  Faux négatifs (session SANS être en ligne): ${falseNegatives.length}`);
        console.log(`🔒 Bloqués mais marqués en ligne: ${blockedButOnline.length}`);
        console.log('═══════════════════════════════════════════════════\n');

        // Détails des incohérences
        if (falsePositives.length > 0) {
            console.log('❌ FAUX POSITIFS (isOnline=true sans sessionID):');
            falsePositives.forEach(user => {
                console.log(`   - ${user.username} (${user.nom}) - Niveau ${user.role?.niveau || '?'}`);
                console.log(`     Dernière activité: ${user.lastActivity || 'Inconnue'}`);
            });
            console.log('');
        }

        if (falseNegatives.length > 0) {
            console.log('⚠️  FAUX NÉGATIFS (sessionID présent mais isOnline=false):');
            falseNegatives.forEach(user => {
                console.log(`   - ${user.username} (${user.nom}) - SessionID: ${user.sessionID}`);
            });
            console.log('');
        }

        if (blockedButOnline.length > 0) {
            console.log('🔒 UTILISATEURS BLOQUÉS MAIS MARQUÉS EN LIGNE:');
            blockedButOnline.forEach(user => {
                console.log(`   - ${user.username} (${user.nom}) - Raison: ${user.blockedReason || 'N/A'}`);
            });
            console.log('');
        }

        // Recommandation
        console.log('💡 RECOMMANDATIONS');
        console.log('═══════════════════════════════════════════════════');

        const totalIssues = falsePositives.length + falseNegatives.length + blockedButOnline.length;

        if (totalIssues === 0) {
            console.log('✅ Aucune incohérence détectée. Les sessions sont cohérentes.');
        } else {
            console.log(`⚠️  ${totalIssues} incohérence(s) détectée(s).`);
            console.log('\nActions recommandées:');

            if (falsePositives.length > 0) {
                console.log(`\n1️⃣  Corriger ${falsePositives.length} faux positif(s):`);
                console.log('   Mettre isOnline=false pour les utilisateurs sans sessionID');
                console.log('   Commande: node check-sessions-coherence.js --fix-false-positives');
            }

            if (falseNegatives.length > 0) {
                console.log(`\n2️⃣  Corriger ${falseNegatives.length} faux négatif(s):`);
                console.log('   Supprimer le sessionID obsolète');
                console.log('   Commande: node check-sessions-coherence.js --fix-false-negatives');
            }

            if (blockedButOnline.length > 0) {
                console.log(`\n3️⃣  Corriger ${blockedButOnline.length} utilisateur(s) bloqué(s):`);
                console.log('   Forcer isOnline=false et supprimer sessionID');
                console.log('   Commande: node check-sessions-coherence.js --fix-blocked');
            }

            console.log('\n🔧 Tout corriger d\'un coup:');
            console.log('   Commande: node check-sessions-coherence.js --fix-all');
        }
        console.log('═══════════════════════════════════════════════════\n');

        // Corrections automatiques si demandé
        const args = process.argv.slice(2);

        if (args.includes('--fix-false-positives') || args.includes('--fix-all')) {
            if (falsePositives.length > 0) {
                console.log('🔧 Correction des faux positifs...');
                const result = await usersCollection.updateMany(
                    {
                        _id: { $in: falsePositives.map(u => u._id) }
                    },
                    {
                        $set: { isOnline: false, lastActivity: new Date() }
                    }
                );
                console.log(`✅ ${result.modifiedCount} utilisateur(s) corrigé(s)\n`);
            }
        }

        if (args.includes('--fix-false-negatives') || args.includes('--fix-all')) {
            if (falseNegatives.length > 0) {
                console.log('🔧 Correction des faux négatifs...');
                const result = await usersCollection.updateMany(
                    {
                        _id: { $in: falseNegatives.map(u => u._id) }
                    },
                    {
                        $unset: { sessionID: "" }
                    }
                );
                console.log(`✅ ${result.modifiedCount} sessionID(s) supprimé(s)\n`);
            }
        }

        if (args.includes('--fix-blocked') || args.includes('--fix-all')) {
            if (blockedButOnline.length > 0) {
                console.log('🔧 Correction des utilisateurs bloqués...');
                const result = await usersCollection.updateMany(
                    {
                        _id: { $in: blockedButOnline.map(u => u._id) }
                    },
                    {
                        $set: { isOnline: false, lastActivity: new Date() },
                        $unset: { sessionID: "" }
                    }
                );
                console.log(`✅ ${result.modifiedCount} utilisateur(s) bloqué(s) corrigé(s)\n`);
            }
        }

        if (args.length > 0 && !args.some(arg => arg.startsWith('--fix'))) {
            console.log('❌ Option inconnue. Options disponibles:');
            console.log('   --fix-false-positives');
            console.log('   --fix-false-negatives');
            console.log('   --fix-blocked');
            console.log('   --fix-all\n');
        }

        // Statistiques finales
        const totalUsers = await usersCollection.countDocuments();
        const onlineUsers = await usersCollection.countDocuments({ isOnline: true });
        const offlineUsers = totalUsers - onlineUsers;

        console.log('📈 STATISTIQUES GLOBALES');
        console.log('═══════════════════════════════════════════════════');
        console.log(`👥 Total utilisateurs: ${totalUsers}`);
        console.log(`🟢 En ligne: ${onlineUsers}`);
        console.log(`⚪ Hors ligne: ${offlineUsers}`);
        console.log('═══════════════════════════════════════════════════\n');

    } catch (error) {
        console.error('❌ Erreur lors de la vérification:', error);
        process.exit(1);
    } finally {
        if (client) {
            await client.close();
            console.log('🔌 Connexion MongoDB fermée');
        }
    }
}

// Lancer la vérification
checkSessionCoherence()
    .then(() => {
        console.log('✅ Vérification terminée');
        process.exit(0);
    })
    .catch((error) => {
        console.error('❌ Erreur fatale:', error);
        process.exit(1);
    });
