/**
 * SCRIPT DE MIGRATION - Stockage optimisé
 *
 * Migre les documents de l'ancien format (contenu base64 dans MongoDB)
 * vers le nouveau format (fichiers sur disque + référence dans MongoDB)
 *
 * Usage: node scripts/migrate-to-file-storage.js
 *
 * IMPORTANT: Faire une sauvegarde de la base de données avant !
 */

const { connectDB, getCollections, closeDB } = require('../config/database');
const fileStorage = require('../services/fileStorageService');

async function migrate() {
    console.log('\n' + '='.repeat(60));
    console.log('🚀 MIGRATION VERS STOCKAGE FICHIERS OPTIMISÉ');
    console.log('='.repeat(60) + '\n');

    try {
        // Connexion à la base de données
        console.log('📡 Connexion à MongoDB...');
        await connectDB();
        const collections = getCollections();

        // Compter les documents à migrer
        const totalDocs = await collections.documents.countDocuments({
            contenu: { $exists: true, $ne: null },
            filePath: { $exists: false }
        });

        console.log(`📊 Documents à migrer: ${totalDocs}`);

        if (totalDocs === 0) {
            console.log('✅ Aucun document à migrer (déjà migré ou base vide)');
            return;
        }

        // Statistiques
        let migrated = 0;
        let failed = 0;
        let totalSizeBefore = 0;
        let totalSizeAfter = 0;
        const startTime = Date.now();

        // Récupérer les documents par lots de 50 pour éviter les problèmes de mémoire
        const batchSize = 50;
        let processed = 0;

        while (processed < totalDocs) {
            const documents = await collections.documents.find({
                contenu: { $exists: true, $ne: null },
                filePath: { $exists: false }
            }).limit(batchSize).toArray();

            if (documents.length === 0) break;

            for (const doc of documents) {
                try {
                    // Calculer la taille du contenu base64
                    const contentSize = doc.contenu ? doc.contenu.length : 0;
                    totalSizeBefore += contentSize;

                    // Sauvegarder le fichier sur disque
                    const { filePath, fileSize } = fileStorage.saveFileContent(
                        doc.contenu,
                        doc.nomFichier || 'document.bin'
                    );

                    totalSizeAfter += fileSize;

                    // Mettre à jour le document MongoDB
                    await collections.documents.updateOne(
                        { _id: doc._id },
                        {
                            $set: {
                                filePath: filePath,
                                fileSize: fileSize,
                                migratedAt: new Date()
                            },
                            $unset: { contenu: "" } // Supprimer le contenu base64
                        }
                    );

                    migrated++;
                    processed++;

                    // Afficher la progression
                    if (migrated % 10 === 0 || migrated === totalDocs) {
                        const percent = ((migrated / totalDocs) * 100).toFixed(1);
                        const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
                        console.log(`⏳ Migration: ${migrated}/${totalDocs} (${percent}%) - ${elapsed}s`);
                    }

                } catch (error) {
                    console.error(`❌ Erreur migration doc ${doc._id}:`, error.message);
                    failed++;
                    processed++;
                }
            }
        }

        // Résumé
        const totalTime = ((Date.now() - startTime) / 1000).toFixed(2);
        const sizeSavedMB = ((totalSizeBefore - totalSizeAfter) / (1024 * 1024)).toFixed(2);
        const compressionRatio = totalSizeBefore > 0
            ? ((1 - totalSizeAfter / totalSizeBefore) * 100).toFixed(1)
            : 0;

        console.log('\n' + '='.repeat(60));
        console.log('✅ MIGRATION TERMINÉE');
        console.log('='.repeat(60));
        console.log(`📄 Documents migrés: ${migrated}`);
        console.log(`❌ Échecs: ${failed}`);
        console.log(`⏱️  Temps total: ${totalTime}s`);
        console.log(`📦 Taille base64 avant: ${(totalSizeBefore / (1024 * 1024)).toFixed(2)} MB`);
        console.log(`📦 Taille fichiers après: ${(totalSizeAfter / (1024 * 1024)).toFixed(2)} MB`);
        console.log(`💾 Économie (base64→binaire): ~${sizeSavedMB} MB (${compressionRatio}%)`);
        console.log('='.repeat(60) + '\n');

        // Statistiques du stockage
        const stats = fileStorage.getStorageStats();
        console.log('📊 Statistiques stockage fichiers:');
        console.log(`   - Fichiers: ${stats.totalFiles}`);
        console.log(`   - Taille totale: ${stats.totalSizeMB} MB`);
        console.log(`   - Emplacement: ${stats.storagePath}`);

    } catch (error) {
        console.error('❌ Erreur migration:', error);
        throw error;
    } finally {
        await closeDB();
    }
}

// Exécuter la migration
migrate().catch(err => {
    console.error('Migration échouée:', err);
    process.exit(1);
});
