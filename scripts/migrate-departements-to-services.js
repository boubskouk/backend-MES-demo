/**
 * ============================================
 * SCRIPT DE MIGRATION : DÉPARTEMENTS → SERVICES
 * ============================================
 *
 * Ce script sépare les départements et services en deux collections distinctes :
 * - departements : entrées avec parentDepartement = null
 * - services : entrées avec parentDepartement != null
 *
 * Exécution : node scripts/migrate-departements-to-services.js
 */

require('dotenv').config();
const { MongoClient, ObjectId } = require('mongodb');

const MONGO_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/cerer_archivage?retryWrites=true&w=majority";
const DB_NAME = process.env.MONGODB_DB_NAME || 'cerer_archivage';

async function migrate() {
    console.log('\n🚀 Début de la migration départements → services\n');

    const client = await MongoClient.connect(MONGO_URI, {
        serverSelectionTimeoutMS: 10000
    });

    const db = client.db(DB_NAME);

    try {
        // ============================================
        // ÉTAPE 1 : Analyser les données existantes
        // ============================================
        console.log('📊 ÉTAPE 1 : Analyse des données...\n');

        const totalDepartements = await db.collection('departements').countDocuments({});
        const departementsOnly = await db.collection('departements').countDocuments({ parentDepartement: null });
        const servicesOnly = await db.collection('departements').countDocuments({ parentDepartement: { $ne: null } });

        console.log(`Total d'entrées dans 'departements' : ${totalDepartements}`);
        console.log(`  - Départements principaux : ${departementsOnly}`);
        console.log(`  - Services (avec parent) : ${servicesOnly}\n`);

        if (servicesOnly === 0) {
            console.log('✅ Aucun service à migrer. Migration annulée.');
            await client.close();
            return;
        }

        // ============================================
        // ÉTAPE 2 : Créer la collection 'services'
        // ============================================
        console.log('🏗️  ÉTAPE 2 : Création de la collection "services"...\n');

        const services = await db.collection('departements').find({
            parentDepartement: { $ne: null }
        }).toArray();

        console.log(`📋 ${services.length} services trouvés\n`);

        let migratedCount = 0;
        for (const service of services) {
            const newService = {
                _id: service._id,
                nom: service.nom,
                code: service.code,
                description: service.description || '',
                idDepartement: service.parentDepartement,  // parentDepartement → idDepartement
                dateCreation: service.dateCreation,
                createdBy: service.createdBy || 'system',
                lastModified: service.lastModified || null,
                lastModifiedBy: service.lastModifiedBy || null
            };

            await db.collection('services').insertOne(newService);
            migratedCount++;
            console.log(`  ✓ Migré : ${service.nom} (${service.code})`);
        }

        console.log(`\n✅ ${migratedCount} services migrés vers la collection 'services'\n`);

        // ============================================
        // ÉTAPE 3 : Nettoyer la collection 'departements'
        // ============================================
        console.log('🧹 ÉTAPE 3 : Nettoyage de la collection "departements"...\n');

        const deleteResult = await db.collection('departements').deleteMany({
            parentDepartement: { $ne: null }
        });

        console.log(`✅ ${deleteResult.deletedCount} services supprimés de 'departements'\n`);

        // Supprimer le champ parentDepartement des départements restants (optionnel)
        const updateResult = await db.collection('departements').updateMany(
            {},
            { $unset: { parentDepartement: "" } }
        );

        console.log(`✅ Champ 'parentDepartement' supprimé de ${updateResult.modifiedCount} départements\n`);

        // ============================================
        // ÉTAPE 4 : Mettre à jour les utilisateurs
        // ============================================
        console.log('👥 ÉTAPE 4 : Mise à jour des utilisateurs...\n');

        const users = await db.collection('users').find({}).toArray();
        let usersUpdated = 0;

        for (const user of users) {
            if (!user.idDepartement) continue;

            // Vérifier si idDepartement pointe vers un service
            const isService = await db.collection('services').findOne({ _id: user.idDepartement });

            if (isService) {
                // Migrer vers idService
                await db.collection('users').updateOne(
                    { _id: user._id },
                    {
                        $set: { idService: user.idDepartement },
                        $unset: { idDepartement: "" }
                    }
                );
                usersUpdated++;
                console.log(`  ✓ Utilisateur ${user.username} : département → service`);
            }
        }

        console.log(`\n✅ ${usersUpdated} utilisateurs mis à jour\n`);

        // ============================================
        // ÉTAPE 5 : Mettre à jour les documents
        // ============================================
        console.log('📄 ÉTAPE 5 : Mise à jour des documents...\n');

        const documents = await db.collection('documents').find({}).toArray();
        let docsUpdated = 0;

        for (const doc of documents) {
            if (!doc.idDepartement) continue;

            const isService = await db.collection('services').findOne({ _id: doc.idDepartement });

            if (isService) {
                await db.collection('documents').updateOne(
                    { _id: doc._id },
                    {
                        $set: { idService: doc.idDepartement },
                        $unset: { idDepartement: "" }
                    }
                );
                docsUpdated++;
            }
        }

        console.log(`✅ ${docsUpdated} documents mis à jour\n`);

        // ============================================
        // ÉTAPE 6 : Vérification finale
        // ============================================
        console.log('🔍 ÉTAPE 6 : Vérification finale...\n');

        const finalDepartements = await db.collection('departements').countDocuments({});
        const finalServices = await db.collection('services').countDocuments({});
        const usersWithDept = await db.collection('users').countDocuments({ idDepartement: { $exists: true, $ne: null } });
        const usersWithService = await db.collection('users').countDocuments({ idService: { $exists: true, $ne: null } });
        const docsWithDept = await db.collection('documents').countDocuments({ idDepartement: { $exists: true, $ne: null } });
        const docsWithService = await db.collection('documents').countDocuments({ idService: { $exists: true, $ne: null } });

        console.log('📊 Résultat final :');
        console.log(`  - Départements : ${finalDepartements}`);
        console.log(`  - Services : ${finalServices}`);
        console.log(`  - Utilisateurs avec département : ${usersWithDept}`);
        console.log(`  - Utilisateurs avec service : ${usersWithService}`);
        console.log(`  - Documents avec département : ${docsWithDept}`);
        console.log(`  - Documents avec service : ${docsWithService}`);

        console.log('\n✅ Migration terminée avec succès ! ✨\n');

    } catch (error) {
        console.error('❌ Erreur lors de la migration :', error);
        throw error;
    } finally {
        await client.close();
    }
}

// Exécuter la migration
if (require.main === module) {
    migrate()
        .then(() => process.exit(0))
        .catch(err => {
            console.error(err);
            process.exit(1);
        });
}

module.exports = { migrate };
