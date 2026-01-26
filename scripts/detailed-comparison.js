const { MongoClient } = require('mongodb');
require('dotenv').config();

const LOCAL_URI = 'mongodb://localhost:27017';
const PRODUCTION_URI = 'mongodb+srv://jacquesboubacarkoukoui_db_user:um6pz5uhsXkNGdOe@cluster0.eq69ixv.mongodb.net/cerer_archivage?retryWrites=true&w=majority';
const DB_NAME = 'cerer_archivage';

async function getCollectionDetails(db, collectionName, limit = 5) {
  const collection = db.collection(collectionName);
  const count = await collection.countDocuments();
  const samples = await collection.find({}).limit(limit).toArray();

  // Obtenir quelques IDs pour la comparaison
  const ids = samples.map(doc => doc._id?.toString() || doc.id || 'N/A');

  return {
    count,
    samples,
    ids,
    sampleTitles: samples.map(doc =>
      doc.name || doc.title || doc.nom || doc.username || doc.description || 'Sans titre'
    ).slice(0, 5)
  };
}

async function findMissingDocuments(localDb, prodDb, collectionName) {
  try {
    const localDocs = await localDb.collection(collectionName).find({}).toArray();
    const prodDocs = await prodDb.collection(collectionName).find({}).toArray();

    // Créer des sets d'IDs pour comparaison
    const localIds = new Set(localDocs.map(d => d._id?.toString()));
    const prodIds = new Set(prodDocs.map(d => d._id?.toString()));

    const onlyInLocal = localDocs.filter(d => !prodIds.has(d._id?.toString()));
    const onlyInProd = prodDocs.filter(d => !localIds.has(d._id?.toString()));

    return {
      onlyInLocal,
      onlyInProd,
      localTotal: localDocs.length,
      prodTotal: prodDocs.length
    };
  } catch (error) {
    return { error: error.message };
  }
}

function formatDocument(doc, collectionName) {
  const id = doc._id?.toString().slice(-6) || 'N/A';

  switch(collectionName) {
    case 'users':
      return `  [${id}] ${doc.username || doc.email} - ${doc.prenom} ${doc.nom} (${doc.role})`;
    case 'documents':
      return `  [${id}] ${doc.titre} - Type: ${doc.type} - Auteur: ${doc.auteur}`;
    case 'categories':
      return `  [${id}] ${doc.nom} (Parent: ${doc.parent || 'Racine'})`;
    case 'departements':
      return `  [${id}] ${doc.nom} - ${doc.description || 'Pas de description'}`;
    case 'messages':
      return `  [${id}] De: ${doc.expediteur} → À: ${doc.destinataire} - "${doc.contenu?.substring(0, 50)}..."`;
    case 'roles':
      return `  [${id}] ${doc.nom} - ${doc.description || 'Pas de description'}`;
    case 'deletionRequests':
      return `  [${id}] Doc: ${doc.documentId} - Demandé par: ${doc.requestedBy} - Statut: ${doc.statut}`;
    case 'shareHistory':
      return `  [${id}] Doc: ${doc.documentId} - Partagé avec: ${doc.sharedWith}`;
    default:
      return `  [${id}] ${JSON.stringify(doc).substring(0, 80)}...`;
  }
}

async function detailedComparison() {
  let localClient, prodClient;

  try {
    console.log('🔄 Connexion aux bases de données...\n');

    localClient = new MongoClient(LOCAL_URI);
    await localClient.connect();
    const localDb = localClient.db(DB_NAME);
    console.log('✅ Connecté à la base locale');

    prodClient = new MongoClient(PRODUCTION_URI);
    await prodClient.connect();
    const prodDb = prodClient.db(DB_NAME);
    console.log('✅ Connecté à la base de production\n');

    const localCollections = await localDb.listCollections().toArray();
    const collections = localCollections.map(c => c.name).sort();

    console.log('═'.repeat(100));
    console.log('                           RAPPORT DÉTAILLÉ DES DIFFÉRENCES');
    console.log('═'.repeat(100));
    console.log('');

    for (const collectionName of collections) {
      console.log(`\n${'▶'.repeat(50)}`);
      console.log(`📁 COLLECTION: ${collectionName.toUpperCase()}`);
      console.log(`${'▶'.repeat(50)}\n`);

      const missing = await findMissingDocuments(localDb, prodDb, collectionName);

      if (missing.error) {
        console.log(`❌ Erreur: ${missing.error}\n`);
        continue;
      }

      console.log(`📊 Statistiques:`);
      console.log(`   Local: ${missing.localTotal} documents`);
      console.log(`   Production: ${missing.prodTotal} documents`);
      console.log(`   Différence: ${missing.localTotal - missing.prodTotal}\n`);

      if (missing.onlyInLocal.length > 0) {
        console.log(`⬆️  Documents UNIQUEMENT en LOCAL (${missing.onlyInLocal.length}) :`);
        missing.onlyInLocal.slice(0, 10).forEach(doc => {
          console.log(formatDocument(doc, collectionName));
        });
        if (missing.onlyInLocal.length > 10) {
          console.log(`   ... et ${missing.onlyInLocal.length - 10} autres`);
        }
        console.log('');
      }

      if (missing.onlyInProd.length > 0) {
        console.log(`⬇️  Documents UNIQUEMENT en PRODUCTION (${missing.onlyInProd.length}) :`);
        missing.onlyInProd.slice(0, 10).forEach(doc => {
          console.log(formatDocument(doc, collectionName));
        });
        if (missing.onlyInProd.length > 10) {
          console.log(`   ... et ${missing.onlyInProd.length - 10} autres`);
        }
        console.log('');
      }

      if (missing.onlyInLocal.length === 0 && missing.onlyInProd.length === 0 && missing.localTotal === missing.prodTotal) {
        console.log(`✅ Cette collection est SYNCHRONE !\n`);
      }
    }

    console.log('\n' + '═'.repeat(100));
    console.log('                                   RÉSUMÉ GLOBAL');
    console.log('═'.repeat(100));
    console.log('');

    let totalOnlyLocal = 0;
    let totalOnlyProd = 0;

    for (const collectionName of collections) {
      const missing = await findMissingDocuments(localDb, prodDb, collectionName);
      if (!missing.error) {
        totalOnlyLocal += missing.onlyInLocal.length;
        totalOnlyProd += missing.onlyInProd.length;
      }
    }

    console.log(`📌 Total de documents UNIQUEMENT en LOCAL: ${totalOnlyLocal}`);
    console.log(`📌 Total de documents UNIQUEMENT en PRODUCTION: ${totalOnlyProd}`);
    console.log('');

    if (totalOnlyLocal > totalOnlyProd) {
      console.log('💡 RECOMMANDATION: Votre base LOCALE contient plus de données.');
      console.log('   Si vous travaillez principalement en local, synchronisez Local → Production');
    } else if (totalOnlyProd > totalOnlyLocal) {
      console.log('💡 RECOMMANDATION: Votre base PRODUCTION contient plus de données.');
      console.log('   Si la production est votre référence, synchronisez Production → Local');
    } else {
      console.log('💡 Les bases ont autant de documents uniques. Vérifiez manuellement.');
    }

  } catch (error) {
    console.error('\n❌ ERREUR:', error.message);
  } finally {
    if (localClient) await localClient.close();
    if (prodClient) await prodClient.close();
    console.log('\n🔌 Connexions fermées.');
  }
}

console.log('═'.repeat(100));
console.log('               ANALYSE DÉTAILLÉE DES BASES DE DONNÉES - LOCAL vs PRODUCTION');
console.log('═'.repeat(100));
console.log('');

detailedComparison()
  .then(() => {
    console.log('\n✅ Analyse terminée.');
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Erreur fatale:', error);
    process.exit(1);
  });
