// ============================================
// SCRIPT DE VÉRIFICATION PRÉ-MIGRATION
// À exécuter AVANT toute migration de données
// ============================================

require('dotenv').config();
const { MongoClient } = require('mongodb');

const CRITICAL_ACCOUNTS = ['jbk', 'boubs', 'test34', 'superadmin'];

async function preMigrationCheck() {
    console.log('🔍 VÉRIFICATION PRÉ-MIGRATION\n');
    console.log('============================================================');

    let localClient, prodClient;

    try {
        // Connexion local
        console.log('📍 Connexion à LOCAL (localhost)...');
        localClient = await MongoClient.connect('mongodb://localhost:27017');
        const localDB = localClient.db('cerer_archivage');
        console.log('✅ Connecté à LOCAL\n');

        // Connexion production (variable d'environnement)
        console.log('📍 Connexion à PRODUCTION (Atlas)...');
        prodClient = await MongoClient.connect(process.env.MONGODB_URI);
        const prodDB = prodClient.db('cerer_archivage');
        console.log('✅ Connecté à PRODUCTION\n');

        console.log('============================================================');
        console.log('📊 COMPARAISON DES DONNÉES\n');

        // Comparer les collections
        const collections = ['users', 'documents', 'categories', 'roles', 'departements', 'services'];

        for (const collName of collections) {
            const localCount = await localDB.collection(collName).countDocuments({});
            const prodCount = await prodDB.collection(collName).countDocuments({});

            const diff = localCount - prodCount;
            const status = diff === 0 ? '✅' : '⚠️';

            console.log(`${status} ${collName}:`);
            console.log(`   Local: ${localCount}`);
            console.log(`   Prod:  ${prodCount}`);
            if (diff !== 0) {
                console.log(`   Différence: ${diff > 0 ? '+' : ''}${diff}\n`);
            } else {
                console.log('');
            }
        }

        console.log('============================================================');
        console.log('👥 VÉRIFICATION DES COMPTES CRITIQUES\n');

        const localUsers = await localDB.collection('users').find({}).toArray();
        const prodUsers = await prodDB.collection('users').find({}).toArray();

        const localUsernames = localUsers.map(u => u.username);
        const prodUsernames = prodUsers.map(u => u.username);

        // Comptes en local mais pas en prod
        const onlyLocal = localUsernames.filter(u => !prodUsernames.includes(u));
        if (onlyLocal.length > 0) {
            console.log('⚠️  Comptes UNIQUEMENT en LOCAL:');
            onlyLocal.forEach(u => console.log(`   - ${u}`));
            console.log('');
        }

        // Comptes en prod mais pas en local
        const onlyProd = prodUsernames.filter(u => !localUsernames.includes(u));
        if (onlyProd.length > 0) {
            console.log('⚠️  Comptes UNIQUEMENT en PRODUCTION:');
            onlyProd.forEach(u => console.log(`   - ${u}`));
            console.log('');
        }

        // Vérifier les comptes critiques
        console.log('🔑 Comptes critiques:');
        CRITICAL_ACCOUNTS.forEach(username => {
            const inLocal = localUsernames.includes(username);
            const inProd = prodUsernames.includes(username);

            if (inLocal && inProd) {
                console.log(`   ✅ ${username}: LOCAL + PRODUCTION`);
            } else if (inLocal && !inProd) {
                console.log(`   ⚠️  ${username}: LOCAL uniquement (sera perdu à la migration!)`);
            } else if (!inLocal && inProd) {
                console.log(`   ℹ️  ${username}: PRODUCTION uniquement`);
            } else {
                console.log(`   ❌ ${username}: ABSENT partout`);
            }
        });

        console.log('\n============================================================');
        console.log('💡 RECOMMANDATIONS\n');

        if (onlyLocal.length > 0) {
            console.log('⚠️  ATTENTION: Des comptes existent uniquement en LOCAL');
            console.log('   → Si vous migrez, ces comptes seront PERDUS');
            console.log('   → Options:');
            console.log('     1. Les créer manuellement en production AVANT migration');
            console.log('     2. Utiliser un script pour les copier vers production');
            console.log('     3. Accepter de les perdre si ce sont juste des tests\n');
        }

        if (onlyLocal.length === 0 && onlyProd.length === 0) {
            console.log('✅ LOCAL et PRODUCTION sont synchronisés');
            console.log('   → Migration peut se faire en toute sécurité\n');
        }

        console.log('============================================================\n');

    } catch (error) {
        console.error('❌ Erreur:', error.message);
    } finally {
        if (localClient) await localClient.close();
        if (prodClient) await prodClient.close();
    }
}

// Exécuter
preMigrationCheck().catch(console.error);
