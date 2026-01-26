// ============================================
// SCRIPT DE SYNCHRONISATION DES BASES DE DONNÉES
// Local ↔ Production (MongoDB Atlas)
// ============================================

const { MongoClient } = require('mongodb');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

// ============================================
// CONFIGURATION
// ============================================

// URI de la base de données LOCALE
const LOCAL_URI = 'mongodb://localhost:27017';

// URI de la base de données PRODUCTION (MongoDB Atlas)
// À récupérer depuis votre fichier .env ou à saisir ici
const PRODUCTION_URI = process.env.MONGODB_ATLAS_URI ||
    'mongodb+srv://jacquesboubacarkoukoui_db_user:um6pz5uhsXkNGdOe@cluster0.eq69ixv.mongodb.net/cerer_archivage?retryWrites=true&w=majority';

// Nom de la base de données
const DB_NAME = 'cerer_archivage';

// Collections à synchroniser
const COLLECTIONS = [
    'users',
    'documents',
    'categories',
    'roles',
    'departements',
    'deletionRequests',
    'messages',
    'messageDeletionRequests',
    'shareHistory'
];

// Dossier pour les backups
const BACKUP_DIR = path.join(__dirname, 'backups');

// ============================================
// UTILITAIRES
// ============================================

// Créer le dossier de backup s'il n'existe pas
if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

// Interface pour poser des questions à l'utilisateur
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

function question(query) {
    return new Promise(resolve => rl.question(query, resolve));
}

// Formater la date pour les noms de fichiers
function getTimestamp() {
    const now = new Date();
    return now.toISOString().replace(/[:.]/g, '-').slice(0, -5);
}

// ============================================
// FONCTIONS DE BACKUP
// ============================================

async function backupCollection(db, collectionName, prefix) {
    try {
        const collection = db.collection(collectionName);
        const documents = await collection.find({}).toArray();

        const timestamp = getTimestamp();
        const filename = `${prefix}_${collectionName}_${timestamp}.json`;
        const filepath = path.join(BACKUP_DIR, filename);

        fs.writeFileSync(filepath, JSON.stringify(documents, null, 2));

        console.log(`   ✅ Backup: ${filename} (${documents.length} documents)`);
        return filepath;
    } catch (error) {
        console.error(`   ❌ Erreur backup ${collectionName}:`, error.message);
        return null;
    }
}

async function backupDatabase(client, dbName, prefix) {
    console.log(`\n📦 Backup de la base ${prefix}...`);
    const db = client.db(dbName);
    const backups = [];

    for (const collectionName of COLLECTIONS) {
        const filepath = await backupCollection(db, collectionName, prefix);
        if (filepath) backups.push(filepath);
    }

    console.log(`✅ Backup terminé: ${backups.length} collections sauvegardées\n`);
    return backups;
}

// ============================================
// FONCTIONS DE COMPARAISON
// ============================================

async function compareCollections(localDb, prodDb, collectionName) {
    const localCol = localDb.collection(collectionName);
    const prodCol = prodDb.collection(collectionName);

    const [localCount, prodCount] = await Promise.all([
        localCol.countDocuments(),
        prodCol.countDocuments()
    ]);

    return {
        collection: collectionName,
        local: localCount,
        production: prodCount,
        difference: localCount - prodCount
    };
}

async function compareAllCollections(localClient, prodClient) {
    console.log('\n📊 COMPARAISON DES BASES DE DONNÉES');
    console.log('='.repeat(70));

    const localDb = localClient.db(DB_NAME);
    const prodDb = prodClient.db(DB_NAME);

    const comparisons = [];

    for (const collectionName of COLLECTIONS) {
        const comparison = await compareCollections(localDb, prodDb, collectionName);
        comparisons.push(comparison);

        const diffIndicator = comparison.difference > 0 ? '📈' :
                             comparison.difference < 0 ? '📉' : '✅';

        console.log(`${diffIndicator} ${collectionName.padEnd(30)} Local: ${String(comparison.local).padStart(5)} | Prod: ${String(comparison.production).padStart(5)} | Diff: ${comparison.difference > 0 ? '+' : ''}${comparison.difference}`);
    }

    console.log('='.repeat(70));

    const totalLocal = comparisons.reduce((sum, c) => sum + c.local, 0);
    const totalProd = comparisons.reduce((sum, c) => sum + c.production, 0);

    console.log(`📊 TOTAL:                         Local: ${String(totalLocal).padStart(5)} | Prod: ${String(totalProd).padStart(5)} | Diff: ${totalLocal > totalProd ? '+' : ''}${totalLocal - totalProd}`);
    console.log('='.repeat(70) + '\n');

    return comparisons;
}

// ============================================
// FONCTIONS DE SYNCHRONISATION
// ============================================

async function syncCollection(sourceDb, targetDb, collectionName, options = {}) {
    const { dryRun = false, mergeStrategy = 'replace' } = options;

    const sourceCol = sourceDb.collection(collectionName);
    const targetCol = targetDb.collection(collectionName);

    // Récupérer tous les documents de la source
    const sourceDocuments = await sourceCol.find({}).toArray();

    if (sourceDocuments.length === 0) {
        console.log(`   ⚠️  ${collectionName}: Aucun document à synchroniser`);
        return { inserted: 0, updated: 0, deleted: 0 };
    }

    let inserted = 0;
    let updated = 0;
    let deleted = 0;

    if (dryRun) {
        console.log(`   🔍 [DRY RUN] ${collectionName}: ${sourceDocuments.length} documents à synchroniser`);
        return { inserted: sourceDocuments.length, updated: 0, deleted: 0 };
    }

    if (mergeStrategy === 'replace') {
        // Stratégie REPLACE: Vider la collection cible et tout copier
        await targetCol.deleteMany({});
        deleted = await targetCol.countDocuments();

        if (sourceDocuments.length > 0) {
            await targetCol.insertMany(sourceDocuments);
            inserted = sourceDocuments.length;
        }

        console.log(`   ✅ ${collectionName}: ${inserted} documents insérés (mode REPLACE)`);
    } else if (mergeStrategy === 'merge') {
        // Stratégie MERGE: Fusionner intelligemment
        for (const doc of sourceDocuments) {
            const existing = await targetCol.findOne({ _id: doc._id });

            if (existing) {
                // Document existe: mise à jour
                await targetCol.replaceOne({ _id: doc._id }, doc);
                updated++;
            } else {
                // Nouveau document: insertion
                await targetCol.insertOne(doc);
                inserted++;
            }
        }

        console.log(`   ✅ ${collectionName}: ${inserted} insérés, ${updated} mis à jour (mode MERGE)`);
    }

    return { inserted, updated, deleted };
}

async function syncAllCollections(sourceClient, targetClient, direction, options = {}) {
    const sourceDb = sourceClient.db(DB_NAME);
    const targetDb = targetClient.db(DB_NAME);

    console.log(`\n🔄 SYNCHRONISATION: ${direction}`);
    console.log('='.repeat(70));

    const stats = {
        totalInserted: 0,
        totalUpdated: 0,
        totalDeleted: 0
    };

    for (const collectionName of COLLECTIONS) {
        const result = await syncCollection(sourceDb, targetDb, collectionName, options);
        stats.totalInserted += result.inserted;
        stats.totalUpdated += result.updated;
        stats.totalDeleted += result.deleted;
    }

    console.log('='.repeat(70));
    console.log(`✅ TOTAL: ${stats.totalInserted} insérés, ${stats.totalUpdated} mis à jour, ${stats.totalDeleted} supprimés`);
    console.log('='.repeat(70) + '\n');

    return stats;
}

// ============================================
// MENU PRINCIPAL
// ============================================

async function showMenu() {
    console.clear();
    console.log('='.repeat(70));
    console.log('  🔄 SYNCHRONISATION DES BASES DE DONNÉES - C.E.R.E.R');
    console.log('='.repeat(70));
    console.log('\nOptions disponibles:\n');
    console.log('  1. 📊 Comparer Local ↔ Production');
    console.log('  2. 📤 Synchroniser Local → Production (REPLACE)');
    console.log('  3. 📥 Synchroniser Production → Local (REPLACE)');
    console.log('  4. 🔀 Synchroniser Local → Production (MERGE)');
    console.log('  5. 🔀 Synchroniser Production → Local (MERGE)');
    console.log('  6. 💾 Backup Local uniquement');
    console.log('  7. 💾 Backup Production uniquement');
    console.log('  8. 💾 Backup Local + Production');
    console.log('  9. 🔍 Test de connexion');
    console.log('  0. ❌ Quitter\n');
    console.log('='.repeat(70));

    const choice = await question('\n👉 Votre choix: ');
    return choice.trim();
}

// ============================================
// EXÉCUTION PRINCIPALE
// ============================================

async function main() {
    let localClient = null;
    let prodClient = null;

    try {
        while (true) {
            const choice = await showMenu();

            if (choice === '0') {
                console.log('\n👋 Au revoir!\n');
                break;
            }

            // Pour toutes les options sauf 0, on a besoin de connexions
            if (!localClient || !prodClient) {
                console.log('\n🔌 Connexion aux bases de données...\n');

                try {
                    console.log('📍 Connexion à MongoDB LOCAL...');
                    localClient = await MongoClient.connect(LOCAL_URI);
                    console.log('   ✅ Connecté à la base LOCALE\n');

                    console.log('📍 Connexion à MongoDB PRODUCTION (Atlas)...');
                    prodClient = await MongoClient.connect(PRODUCTION_URI);
                    console.log('   ✅ Connecté à la base PRODUCTION\n');
                } catch (error) {
                    console.error('❌ Erreur de connexion:', error.message);
                    console.log('\n💡 Vérifiez:');
                    console.log('   - MongoDB local est démarré (mongod)');
                    console.log('   - L\'URI de production est correct');
                    console.log('   - Votre IP est autorisée sur MongoDB Atlas\n');
                    await question('Appuyez sur Entrée pour continuer...');
                    continue;
                }
            }

            switch (choice) {
                case '1':
                    // Comparer
                    await compareAllCollections(localClient, prodClient);
                    await question('Appuyez sur Entrée pour continuer...');
                    break;

                case '2':
                    // Local → Production (REPLACE)
                    console.log('\n⚠️  ATTENTION: Cette opération va REMPLACER toutes les données de PRODUCTION par celles de LOCAL!\n');
                    const confirm2 = await question('Êtes-vous sûr? (tapez "OUI" pour confiruer): ');
                    if (confirm2 === 'OUI') {
                        await backupDatabase(prodClient, DB_NAME, 'production');
                        await syncAllCollections(localClient, prodClient, 'Local → Production', { mergeStrategy: 'replace' });
                    } else {
                        console.log('❌ Opération annulée\n');
                    }
                    await question('Appuyez sur Entrée pour continuer...');
                    break;

                case '3':
                    // Production → Local (REPLACE)
                    console.log('\n⚠️  ATTENTION: Cette opération va REMPLACER toutes les données de LOCAL par celles de PRODUCTION!\n');
                    const confirm3 = await question('Êtes-vous sûr? (tapez "OUI" pour confirmer): ');
                    if (confirm3 === 'OUI') {
                        await backupDatabase(localClient, DB_NAME, 'local');
                        await syncAllCollections(prodClient, localClient, 'Production → Local', { mergeStrategy: 'replace' });
                    } else {
                        console.log('❌ Opération annulée\n');
                    }
                    await question('Appuyez sur Entrée pour continuer...');
                    break;

                case '4':
                    // Local → Production (MERGE)
                    console.log('\n🔀 Fusion intelligente: Local → Production (conserve les données existantes)\n');
                    const confirm4 = await question('Continuer? (O/N): ');
                    if (confirm4.toUpperCase() === 'O') {
                        await backupDatabase(prodClient, DB_NAME, 'production');
                        await syncAllCollections(localClient, prodClient, 'Local → Production', { mergeStrategy: 'merge' });
                    } else {
                        console.log('❌ Opération annulée\n');
                    }
                    await question('Appuyez sur Entrée pour continuer...');
                    break;

                case '5':
                    // Production → Local (MERGE)
                    console.log('\n🔀 Fusion intelligente: Production → Local (conserve les données existantes)\n');
                    const confirm5 = await question('Continuer? (O/N): ');
                    if (confirm5.toUpperCase() === 'O') {
                        await backupDatabase(localClient, DB_NAME, 'local');
                        await syncAllCollections(prodClient, localClient, 'Production → Local', { mergeStrategy: 'merge' });
                    } else {
                        console.log('❌ Opération annulée\n');
                    }
                    await question('Appuyez sur Entrée pour continuer...');
                    break;

                case '6':
                    // Backup Local
                    await backupDatabase(localClient, DB_NAME, 'local');
                    await question('Appuyez sur Entrée pour continuer...');
                    break;

                case '7':
                    // Backup Production
                    await backupDatabase(prodClient, DB_NAME, 'production');
                    await question('Appuyez sur Entrée pour continuer...');
                    break;

                case '8':
                    // Backup Les deux
                    await backupDatabase(localClient, DB_NAME, 'local');
                    await backupDatabase(prodClient, DB_NAME, 'production');
                    await question('Appuyez sur Entrée pour continuer...');
                    break;

                case '9':
                    // Test de connexion
                    console.log('\n🔍 Test des connexions...\n');
                    try {
                        const localDb = localClient.db(DB_NAME);
                        const prodDb = prodClient.db(DB_NAME);

                        const [localCollections, prodCollections] = await Promise.all([
                            localDb.listCollections().toArray(),
                            prodDb.listCollections().toArray()
                        ]);

                        console.log(`✅ Local: ${localCollections.length} collections trouvées`);
                        console.log(`✅ Production: ${prodCollections.length} collections trouvées\n`);
                    } catch (error) {
                        console.error('❌ Erreur:', error.message);
                    }
                    await question('Appuyez sur Entrée pour continuer...');
                    break;

                default:
                    console.log('\n❌ Choix invalide\n');
                    await question('Appuyez sur Entrée pour continuer...');
            }
        }

    } catch (error) {
        console.error('\n❌ ERREUR:', error);
    } finally {
        // Fermer les connexions
        if (localClient) {
            await localClient.close();
            console.log('🔌 Déconnexion de la base LOCALE');
        }
        if (prodClient) {
            await prodClient.close();
            console.log('🔌 Déconnexion de la base PRODUCTION');
        }
        rl.close();
    }
}

// Lancer le script
console.log('\n🚀 Démarrage du script de synchronisation...\n');
main().catch(console.error);
