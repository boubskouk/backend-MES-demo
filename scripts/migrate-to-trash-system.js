/**
 * Script de migration vers le système de corbeille
 *
 * Objectif :
 * - Ajouter champ deleted: false à tous les documents existants
 * - Créer les index nécessaires
 */

require('dotenv').config();
const { MongoClient } = require('mongodb');

const MONGO_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/cerer_archivage";
const DB_NAME = process.env.MONGODB_DB_NAME || 'cerer_archivage';

async function migrate() {
    console.log('📊 Migration vers système de corbeille...\n');

    const client = await MongoClient.connect(MONGO_URI);
    const db = client.db(DB_NAME);

    try {
        // ÉTAPE 1: Ajouter champ deleted: false à tous les documents actifs
        console.log('📝 Étape 1: Ajout champ deleted aux documents existants...');

        const result1 = await db.collection('documents').updateMany(
            { deleted: { $exists: false } },  // Documents sans le champ
            { $set: { deleted: false } }
        );

        console.log(`   ✅ ${result1.modifiedCount} document(s) mis à jour\n`);

        // ÉTAPE 2: Créer index pour performance
        console.log('📝 Étape 2: Création des index...');

        await db.collection('documents').createIndex({ deleted: 1 });
        console.log('   ✅ Index { deleted: 1 } créé');

        await db.collection('documents').createIndex(
            { 'deletionInfo.expiresAt': 1 },
            { sparse: true }  // Index partiel (seulement documents avec deletionInfo)
        );
        console.log('   ✅ Index { deletionInfo.expiresAt: 1 } créé (sparse)\n');

        // ÉTAPE 3: Statistiques finales
        console.log('📊 STATISTIQUES FINALES:');
        const totalDocs = await db.collection('documents').countDocuments({});
        const activeDocs = await db.collection('documents').countDocuments({ deleted: false });
        const trashedDocs = await db.collection('documents').countDocuments({ deleted: true });

        console.log(`   📄 Total documents: ${totalDocs}`);
        console.log(`   ✅ Documents actifs: ${activeDocs}`);
        console.log(`   🗑️  Documents en corbeille: ${trashedDocs}`);

        console.log('\n✅ Migration terminée avec succès !');
        console.log('\n📝 Prochaines étapes :');
        console.log('   1. Redémarrer le serveur Node.js');
        console.log('   2. Tester la suppression d\'un document');
        console.log('   3. Vérifier le dashboard Super Admin (section Suppressions)');

    } catch (error) {
        console.error('❌ Erreur migration:', error);
        process.exit(1);
    } finally {
        await client.close();
    }
}

// Exécution
migrate().catch(console.error);
