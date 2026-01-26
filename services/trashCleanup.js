/**
 * ============================================
 * SERVICE DE NETTOYAGE AUTOMATIQUE CORBEILLE
 * ============================================
 *
 * Supprime automatiquement les documents expirés (> 2 mois)
 * S'exécute tous les jours à 2h du matin
 */

const cron = require('node-cron');
const { ObjectId } = require('mongodb');

let documentsCollection;
let auditLogsCollection;
let trashCleanupLogsCollection;

/**
 * Initialiser le service
 */
function init(collections) {
    documentsCollection = collections.documents;
    auditLogsCollection = collections.auditLogs;
    trashCleanupLogsCollection = collections.db.collection('trashCleanupLogs');

    console.log('✅ Service nettoyage corbeille initialisé');
}

/**
 * Nettoyer les documents expirés
 */
async function cleanupExpiredDocuments() {
    const startTime = Date.now();
    const now = new Date();

    console.log(`🧹 [${now.toISOString()}] Démarrage nettoyage corbeille...`);

    try {
        // Trouver tous les documents expirés
        const expiredDocs = await documentsCollection.find({
            deleted: true,
            'deletionInfo.expiresAt': { $lte: now }
        }).toArray();

        if (expiredDocs.length === 0) {
            console.log('✅ Aucun document à nettoyer');

            // Logger même si rien à faire
            await trashCleanupLogsCollection.insertOne({
                timestamp: now,
                action: 'AUTO_CLEANUP',
                documentsDeleted: 0,
                documents: [],
                duration: Date.now() - startTime,
                status: 'success'
            });

            return {
                success: true,
                deleted: 0
            };
        }

        console.log(`📝 ${expiredDocs.length} document(s) expiré(s) trouvé(s)`);

        // Supprimer définitivement chaque document
        const deletedDocuments = [];
        let successCount = 0;
        let errorCount = 0;

        for (const doc of expiredDocs) {
            try {
                // Suppression définitive
                const result = await documentsCollection.deleteOne({
                    _id: doc._id
                });

                if (result.deletedCount > 0) {
                    successCount++;

                    // Logger dans auditLogs
                    await auditLogsCollection.insertOne({
                        timestamp: now,
                        user: 'system',
                        action: 'DOCUMENT_PERMANENTLY_DELETED',
                        details: {
                            documentId: doc.idDocument,
                            titre: doc.titre,
                            deletedAt: doc.deletionInfo?.deletedAt,
                            expiresAt: doc.deletionInfo?.expiresAt,
                            reason: 'Auto-cleanup after 2 months'
                        },
                        documentId: doc.idDocument,
                        ip: 'system',
                        userAgent: 'node-cron'
                    });

                    deletedDocuments.push({
                        documentId: doc.idDocument,
                        titre: doc.titre,
                        deletedAt: doc.deletionInfo?.deletedAt,
                        expiresAt: doc.deletionInfo?.expiresAt
                    });

                    console.log(`   ✓ Supprimé: ${doc.idDocument} - ${doc.titre}`);
                }
            } catch (error) {
                errorCount++;
                console.error(`   ✗ Erreur suppression ${doc.idDocument}:`, error);
            }
        }

        const duration = Date.now() - startTime;

        // Logger le nettoyage global
        await trashCleanupLogsCollection.insertOne({
            timestamp: now,
            action: 'AUTO_CLEANUP',
            documentsDeleted: successCount,
            documentsErrored: errorCount,
            documents: deletedDocuments,
            duration: duration,
            status: errorCount > 0 ? 'partial' : 'success'
        });

        console.log(`✅ Nettoyage terminé en ${duration}ms`);
        console.log(`   📊 Supprimés: ${successCount}, Erreurs: ${errorCount}`);

        return {
            success: true,
            deleted: successCount,
            errors: errorCount,
            duration
        };

    } catch (error) {
        const duration = Date.now() - startTime;
        console.error('❌ Erreur nettoyage corbeille:', error);

        // Logger l'échec
        await trashCleanupLogsCollection.insertOne({
            timestamp: now,
            action: 'AUTO_CLEANUP',
            documentsDeleted: 0,
            error: error.message,
            duration: duration,
            status: 'failed'
        });

        return {
            success: false,
            error: error.message
        };
    }
}

/**
 * Démarrer le cron job
 * S'exécute tous les jours à 2h du matin (heure serveur)
 */
function startCronJob() {
    // Cron expression: '0 2 * * *' = tous les jours à 2h
    // Format: minute heure jour mois jour_semaine

    const schedule = '0 2 * * *';  // 2h du matin

    cron.schedule(schedule, async () => {
        console.log('⏰ Cron job déclenché: nettoyage corbeille');
        await cleanupExpiredDocuments();
    }, {
        timezone: "Africa/Dakar"  // Fuseau horaire du serveur
    });

    console.log(`⏰ Cron job programmé: nettoyage corbeille tous les jours à 2h (Africa/Dakar)`);
}

/**
 * Exécuter le nettoyage manuellement (pour tests ou appel API)
 */
async function runManualCleanup() {
    console.log('🧹 Nettoyage manuel déclenché');
    return await cleanupExpiredDocuments();
}

module.exports = {
    init,
    startCronJob,
    runManualCleanup,
    cleanupExpiredDocuments
};
