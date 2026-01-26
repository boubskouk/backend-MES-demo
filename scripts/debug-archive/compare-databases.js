const { MongoClient } = require('mongodb');
require('dotenv').config();

// Configuration des connexions
const LOCAL_URI = 'mongodb://localhost:27017';
const PRODUCTION_URI = 'mongodb+srv://jacquesboubacarkoukoui_db_user:um6pz5uhsXkNGdOe@cluster0.eq69ixv.mongodb.net/cerer_archivage?retryWrites=true&w=majority';
const DB_NAME = 'cerer_archivage';

async function compareCollections(localDb, prodDb, collectionName) {
  try {
    const localCount = await localDb.collection(collectionName).countDocuments();
    const prodCount = await prodDb.collection(collectionName).countDocuments();

    const status = localCount === prodCount ? '✅' : '⚠️';
    const diff = localCount - prodCount;

    return {
      collection: collectionName,
      local: localCount,
      production: prodCount,
      difference: diff,
      status: status,
      synced: localCount === prodCount
    };
  } catch (error) {
    return {
      collection: collectionName,
      error: error.message
    };
  }
}

async function compareDatabases() {
  let localClient, prodClient;

  try {
    console.log('🔄 Connexion aux bases de données...\n');

    // Connexion à la base locale
    console.log('📍 Connexion à la base LOCALE...');
    localClient = new MongoClient(LOCAL_URI);
    await localClient.connect();
    const localDb = localClient.db(DB_NAME);
    console.log('✅ Connecté à la base locale\n');

    // Connexion à la base de production
    console.log('☁️  Connexion à la base PRODUCTION (Atlas)...');
    prodClient = new MongoClient(PRODUCTION_URI);
    await prodClient.connect();
    const prodDb = prodClient.db(DB_NAME);
    console.log('✅ Connecté à la base de production\n');

    // Récupérer la liste des collections
    const localCollections = await localDb.listCollections().toArray();
    const prodCollections = await prodDb.listCollections().toArray();

    const localColNames = localCollections.map(c => c.name).sort();
    const prodColNames = prodCollections.map(c => c.name).sort();

    // Vérifier si les collections sont identiques
    console.log('📋 COMPARAISON DES COLLECTIONS\n');
    console.log('Collections en LOCAL:', localColNames.length);
    console.log('Collections en PRODUCTION:', prodColNames.length);
    console.log('─────────────────────────────────────────\n');

    // Collections uniquement en local
    const onlyInLocal = localColNames.filter(c => !prodColNames.includes(c));
    if (onlyInLocal.length > 0) {
      console.log('⚠️  Collections UNIQUEMENT en LOCAL:');
      onlyInLocal.forEach(c => console.log(`   - ${c}`));
      console.log('');
    }

    // Collections uniquement en production
    const onlyInProd = prodColNames.filter(c => !localColNames.includes(c));
    if (onlyInProd.length > 0) {
      console.log('⚠️  Collections UNIQUEMENT en PRODUCTION:');
      onlyInProd.forEach(c => console.log(`   - ${c}`));
      console.log('');
    }

    // Collections communes
    const commonCollections = localColNames.filter(c => prodColNames.includes(c));

    console.log('📊 COMPARAISON DU NOMBRE DE DOCUMENTS\n');
    console.log('Collection'.padEnd(30) + 'Local'.padEnd(12) + 'Production'.padEnd(12) + 'Différence'.padEnd(12) + 'Statut');
    console.log('─'.repeat(80));

    const results = [];
    for (const collectionName of commonCollections) {
      const result = await compareCollections(localDb, prodDb, collectionName);
      results.push(result);

      if (result.error) {
        console.log(`${collectionName.padEnd(30)} ERREUR: ${result.error}`);
      } else {
        const diffStr = result.difference >= 0 ? `+${result.difference}` : `${result.difference}`;
        console.log(
          `${result.collection.padEnd(30)}` +
          `${result.local.toString().padEnd(12)}` +
          `${result.production.toString().padEnd(12)}` +
          `${diffStr.padEnd(12)}` +
          `${result.status}`
        );
      }
    }

    console.log('\n' + '─'.repeat(80));

    // Résumé
    const allSynced = results.every(r => r.synced);
    const totalLocal = results.reduce((sum, r) => sum + (r.local || 0), 0);
    const totalProd = results.reduce((sum, r) => sum + (r.production || 0), 0);

    console.log('\n📈 RÉSUMÉ\n');
    console.log(`Total documents en LOCAL: ${totalLocal}`);
    console.log(`Total documents en PRODUCTION: ${totalProd}`);
    console.log(`Différence totale: ${totalLocal - totalProd}`);
    console.log('');

    if (allSynced && onlyInLocal.length === 0 && onlyInProd.length === 0) {
      console.log('✅ ✅ ✅  LES BASES DE DONNÉES SONT SYNCHRONES ! ✅ ✅ ✅');
    } else {
      console.log('⚠️  ⚠️  ⚠️   LES BASES DE DONNÉES NE SONT PAS SYNCHRONES ! ⚠️  ⚠️  ⚠️');
      console.log('\nDifférences détectées:');
      if (onlyInLocal.length > 0) {
        console.log(`  - ${onlyInLocal.length} collection(s) uniquement en local`);
      }
      if (onlyInProd.length > 0) {
        console.log(`  - ${onlyInProd.length} collection(s) uniquement en production`);
      }
      const unsyncedCollections = results.filter(r => !r.synced);
      if (unsyncedCollections.length > 0) {
        console.log(`  - ${unsyncedCollections.length} collection(s) avec un nombre différent de documents`);
      }
    }

  } catch (error) {
    console.error('\n❌ ERREUR:', error.message);
    if (error.message.includes('ECONNREFUSED')) {
      console.log('\n💡 Assurez-vous que MongoDB local est en cours d\'exécution.');
      console.log('   Commande: mongod');
    }
  } finally {
    // Fermer les connexions
    if (localClient) await localClient.close();
    if (prodClient) await prodClient.close();
    console.log('\n🔌 Connexions fermées.');
  }
}

// Exécuter la comparaison
console.log('═'.repeat(80));
console.log('         COMPARAISON DES BASES DE DONNÉES - LOCAL vs PRODUCTION');
console.log('═'.repeat(80));
console.log('');

compareDatabases()
  .then(() => {
    console.log('\n✅ Comparaison terminée.');
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Erreur fatale:', error);
    process.exit(1);
  });
