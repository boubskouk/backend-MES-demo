/**
 * Script de migration des catégories vers le système de départements
 * Ajoute le champ idDepartement aux catégories existantes
 *
 * Usage: node scripts/migrate-categories-to-department.js
 */

const { MongoClient, ObjectId } = require('mongodb');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const DB_NAME = 'cerer_archivage';

async function migrateCategorias() {
    const client = new MongoClient(MONGODB_URI);

    try {
        await client.connect();
        console.log('✅ Connecté à MongoDB');

        const db = client.db(DB_NAME);
        const categoriesCollection = db.collection('categories');
        const usersCollection = db.collection('users');

        // 1. Trouver toutes les catégories sans idDepartement
        const categoriesWithoutDept = await categoriesCollection.find({
            idDepartement: { $exists: false }
        }).toArray();

        console.log(`\n📊 ${categoriesWithoutDept.length} catégorie(s) sans département trouvée(s)`);

        if (categoriesWithoutDept.length === 0) {
            console.log('✅ Toutes les catégories ont déjà un département');
            return;
        }

        // 2. Pour chaque catégorie, récupérer le département de l'utilisateur
        let migrated = 0;
        let failed = 0;
        let skipped = 0;

        for (const category of categoriesWithoutDept) {
            console.log(`\n🔍 Catégorie: ${category.nom} (${category.id})`);
            console.log(`   Créée par: ${category.idUtilisateur || 'inconnu'}`);

            if (!category.idUtilisateur) {
                console.log(`   ⚠️ IGNORÉ: Pas de créateur identifié`);
                skipped++;
                continue;
            }

            // Récupérer l'utilisateur créateur
            const user = await usersCollection.findOne({ username: category.idUtilisateur });

            if (!user) {
                console.log(`   ❌ ERREUR: Utilisateur "${category.idUtilisateur}" non trouvé`);
                failed++;
                continue;
            }

            if (!user.idDepartement) {
                console.log(`   ⚠️ IGNORÉ: L'utilisateur n'a pas de département`);
                skipped++;
                continue;
            }

            // Mettre à jour la catégorie avec le département
            await categoriesCollection.updateOne(
                { _id: category._id },
                {
                    $set: {
                        idDepartement: user.idDepartement,
                        createdBy: category.idUtilisateur,
                        migratedAt: new Date()
                    }
                }
            );

            console.log(`   ✅ Département ${user.idDepartement} assigné`);
            migrated++;
        }

        console.log(`\n\n=== RÉSUMÉ MIGRATION ===`);
        console.log(`✅ Migrées: ${migrated}`);
        console.log(`⚠️ Ignorées: ${skipped}`);
        console.log(`❌ Échouées: ${failed}`);

        // 3. Vérification finale
        const stillMissing = await categoriesCollection.countDocuments({
            idDepartement: { $exists: false }
        });

        console.log(`\n📊 Catégories restantes sans département: ${stillMissing}`);

        if (stillMissing > 0) {
            console.log('\n⚠️ Il reste des catégories sans département (probablement des catégories orphelines)');

            const orphanCategories = await categoriesCollection.find({
                idDepartement: { $exists: false }
            }).toArray();

            console.log('\n📋 Liste des catégories orphelines:');
            orphanCategories.forEach(cat => {
                console.log(`   - ${cat.nom} (${cat.id}) - Utilisateur: ${cat.idUtilisateur || 'aucun'}`);
            });
        } else {
            console.log('✅ Toutes les catégories ont maintenant un département !');
        }

    } catch (error) {
        console.error('❌ Erreur:', error);
    } finally {
        await client.close();
        console.log('\n👋 Déconnecté de MongoDB');
    }
}

migrateCategorias();
