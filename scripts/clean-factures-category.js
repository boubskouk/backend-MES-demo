/**
 * Script de nettoyage : Supprimer la catégorie "factures" des documents
 *
 * Ce script met à jour tous les documents qui ont categorie: 'factures'
 * vers une catégorie vide ou la première catégorie existante de l'utilisateur
 */

const { MongoClient } = require('mongodb');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017';
const DB_NAME = 'gedDB';

async function cleanFacturesCategory() {
    const client = new MongoClient(MONGO_URI);

    try {
        await client.connect();
        console.log('✅ Connexion MongoDB établie');

        const db = client.db(DB_NAME);
        const documentsCollection = db.collection('documents');
        const categoriesCollection = db.collection('categories');

        // 1. Trouver tous les documents avec categorie: 'factures'
        const docsWithFactures = await documentsCollection.find({
            categorie: 'factures'
        }).toArray();

        console.log(`\n📊 Trouvé ${docsWithFactures.length} document(s) avec catégorie "factures"\n`);

        if (docsWithFactures.length === 0) {
            console.log('✅ Aucun document à nettoyer !');
            return;
        }

        let updated = 0;
        let skipped = 0;

        for (const doc of docsWithFactures) {
            // Vérifier si l'utilisateur a une vraie catégorie "factures"
            const realFacturesCategory = await categoriesCollection.findOne({
                idUtilisateur: doc.idUtilisateur,
                nom: 'factures'
            });

            if (realFacturesCategory) {
                // L'utilisateur a vraiment une catégorie "factures", on garde
                console.log(`⏭️  Sauté: ${doc.idDocument} (catégorie "factures" existe vraiment pour cet utilisateur)`);
                skipped++;
                continue;
            }

            // L'utilisateur n'a pas de catégorie "factures", c'est donc un ancien bug
            // Mettre à jour vers une catégorie vide
            await documentsCollection.updateOne(
                { _id: doc._id },
                { $set: { categorie: '' } }
            );

            console.log(`✅ Nettoyé: ${doc.idDocument} - "${doc.titre}" (categorie: "factures" → "")`);
            updated++;
        }

        console.log(`\n📈 RÉSUMÉ:`);
        console.log(`   ✅ ${updated} document(s) nettoyé(s)`);
        console.log(`   ⏭️  ${skipped} document(s) sauté(s) (catégorie légitime)`);
        console.log(`   📊 Total: ${docsWithFactures.length} document(s) traité(s)\n`);

    } catch (error) {
        console.error('❌ Erreur:', error);
    } finally {
        await client.close();
        console.log('🔌 Connexion fermée');
    }
}

// Exécuter le script
cleanFacturesCategory();
