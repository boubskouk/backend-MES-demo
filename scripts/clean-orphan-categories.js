/**
 * Script de nettoyage des catégories orphelines
 * Supprime les catégories créées par des utilisateurs qui n'existent plus
 *
 * Usage: node scripts/clean-orphan-categories.js
 */

const { MongoClient } = require('mongodb');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const DB_NAME = 'cerer_archivage';

async function cleanOrphanCategories() {
    const client = new MongoClient(MONGODB_URI);

    try {
        await client.connect();
        console.log('✅ Connecté à MongoDB');

        const db = client.db(DB_NAME);
        const categoriesCollection = db.collection('categories');
        const usersCollection = db.collection('users');

        // 1. Trouver toutes les catégories sans département
        const categoriesWithoutDept = await categoriesCollection.find({
            idDepartement: { $exists: false }
        }).toArray();

        console.log(`\n📊 ${categoriesWithoutDept.length} catégorie(s) sans département trouvée(s)`);

        if (categoriesWithoutDept.length === 0) {
            console.log('✅ Toutes les catégories ont un département');
            return;
        }

        let orphanCount = 0;
        let deletedCount = 0;
        let keptCount = 0;

        for (const category of categoriesWithoutDept) {
            if (!category.idUtilisateur) {
                console.log(`⚠️ Catégorie sans utilisateur: ${category.nom}`);
                continue;
            }

            // Vérifier si l'utilisateur existe
            const user = await usersCollection.findOne({ username: category.idUtilisateur });

            if (!user) {
                orphanCount++;
                console.log(`🗑️ Suppression: ${category.nom} (utilisateur "${category.idUtilisateur}" n'existe plus)`);

                await categoriesCollection.deleteOne({ _id: category._id });
                deletedCount++;
            } else {
                console.log(`✅ Conservation: ${category.nom} (utilisateur "${category.idUtilisateur}" existe)`);
                keptCount++;
            }
        }

        console.log(`\n\n=== RÉSUMÉ NETTOYAGE ===`);
        console.log(`🗑️ Catégories orphelines trouvées: ${orphanCount}`);
        console.log(`✅ Catégories supprimées: ${deletedCount}`);
        console.log(`📦 Catégories conservées: ${keptCount}`);

        // Vérification finale
        const remaining = await categoriesCollection.countDocuments({
            idDepartement: { $exists: false }
        });

        console.log(`\n📊 Catégories restantes sans département: ${remaining}`);

        if (remaining > 0) {
            const remainingCats = await categoriesCollection.find({
                idDepartement: { $exists: false }
            }).toArray();

            console.log('\n📋 Catégories restantes (utilisateurs existants sans département):');
            remainingCats.forEach(cat => {
                console.log(`   - ${cat.nom} (${cat.id}) - Utilisateur: ${cat.idUtilisateur || 'aucun'}`);
            });
        } else {
            console.log('✅ Toutes les catégories orphelines ont été supprimées !');
        }

    } catch (error) {
        console.error('❌ Erreur:', error);
    } finally {
        await client.close();
        console.log('\n👋 Déconnecté de MongoDB');
    }
}

cleanOrphanCategories();
