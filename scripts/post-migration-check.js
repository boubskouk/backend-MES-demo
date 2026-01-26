// ============================================
// SCRIPT DE VÉRIFICATION POST-MIGRATION
// À exécuter APRÈS toute migration de données
// ============================================

require('dotenv').config();
const { MongoClient } = require('mongodb');

const EXPECTED_COLLECTIONS = [
    'users',
    'documents',
    'categories',
    'roles',
    'departements',
    'services',
    'messages',
    'messageDeletionRequests',
    'shareHistory',
    'auditLogs',
    'ipRules',
    'systemSettings'
];

const CRITICAL_ACCOUNTS = ['jbk', 'boubs'];
const MIN_EXPECTED_USERS = 5;
const MIN_EXPECTED_DOCS = 1;

async function postMigrationCheck() {
    console.log('✅ VÉRIFICATION POST-MIGRATION\n');
    console.log('============================================================');

    let client;
    let allChecksPass = true;

    try {
        // Connexion production
        console.log('📍 Connexion à PRODUCTION (Atlas)...');
        client = await MongoClient.connect(process.env.MONGODB_URI);
        const db = client.db('cerer_archivage');
        console.log('✅ Connecté à PRODUCTION\n');

        console.log('============================================================');
        console.log('📊 VÉRIFICATION DES COLLECTIONS\n');

        // Vérifier chaque collection
        const results = {};

        for (const collName of EXPECTED_COLLECTIONS) {
            try {
                const count = await db.collection(collName).countDocuments({});
                results[collName] = count;

                if (count > 0) {
                    console.log(`✅ ${collName}: ${count} document(s)`);
                } else {
                    console.log(`⚠️  ${collName}: VIDE`);
                }
            } catch (error) {
                console.log(`❌ ${collName}: ERREUR (${error.message})`);
                allChecksPass = false;
            }
        }

        console.log('\n============================================================');
        console.log('👥 VÉRIFICATION DES UTILISATEURS\n');

        // Vérifier nombre d'utilisateurs
        if (results.users < MIN_EXPECTED_USERS) {
            console.log(`❌ Trop peu d'utilisateurs: ${results.users} (attendu: >${MIN_EXPECTED_USERS})`);
            allChecksPass = false;
        } else {
            console.log(`✅ Nombre d'utilisateurs: ${results.users}`);
        }

        // Vérifier comptes critiques
        const users = await db.collection('users').find({}).toArray();
        const usernames = users.map(u => u.username);

        console.log('\n🔑 Comptes critiques:');
        CRITICAL_ACCOUNTS.forEach(username => {
            if (usernames.includes(username)) {
                console.log(`   ✅ ${username}: PRÉSENT`);
            } else {
                console.log(`   ❌ ${username}: MANQUANT`);
                allChecksPass = false;
            }
        });

        // Lister tous les utilisateurs
        console.log('\n📋 Liste complète des utilisateurs:');
        users.forEach((user, i) => {
            console.log(`   ${i+1}. ${user.username} (${user.nom || 'N/A'})`);
        });

        console.log('\n============================================================');
        console.log('📄 VÉRIFICATION DES DOCUMENTS\n');

        if (results.documents < MIN_EXPECTED_DOCS) {
            console.log(`❌ Pas assez de documents: ${results.documents}`);
            allChecksPass = false;
        } else {
            console.log(`✅ Nombre de documents: ${results.documents}`);
        }

        // Vérifier champ deleted
        const withoutDeleted = await db.collection('documents').countDocuments({ deleted: { $exists: false } });
        if (withoutDeleted > 0) {
            console.log(`⚠️  ${withoutDeleted} documents sans champ "deleted"`);
            console.log('   → Exécuter: node fix-deleted-field.js');
            allChecksPass = false;
        } else {
            console.log('✅ Tous les documents ont le champ "deleted"');
        }

        console.log('\n============================================================');
        console.log('🔧 VÉRIFICATION DES INDEX\n');

        // Vérifier les index documents
        const indexes = await db.collection('documents').indexes();
        const indexNames = indexes.map(idx => idx.name);

        const requiredIndexes = [
            'idDepartement_1_deleted_1',
            'idService_1_deleted_1',
            'idUtilisateur_1_dateAjout_-1'
        ];

        requiredIndexes.forEach(indexName => {
            if (indexNames.includes(indexName)) {
                console.log(`✅ Index "${indexName}" présent`);
            } else {
                console.log(`⚠️  Index "${indexName}" manquant`);
                // Note: Les index seront créés au démarrage du serveur
            }
        });

        console.log('\n============================================================');
        console.log('🎯 RÉSULTAT FINAL\n');

        if (allChecksPass) {
            console.log('✅✅✅ MIGRATION RÉUSSIE ✅✅✅');
            console.log('\nTous les checks sont passés!');
            console.log('Vous pouvez utiliser la nouvelle base de données.\n');
        } else {
            console.log('❌❌❌ PROBLÈMES DÉTECTÉS ❌❌❌');
            console.log('\nCertains checks ont échoué.');
            console.log('Veuillez corriger les problèmes avant d\'utiliser en production.\n');
        }

        console.log('============================================================\n');

    } catch (error) {
        console.error('❌ Erreur fatale:', error.message);
        console.error(error.stack);
    } finally {
        if (client) await client.close();
    }
}

// Exécuter
postMigrationCheck().catch(console.error);
