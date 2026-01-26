const { MongoClient } = require('mongodb');
require('dotenv').config();

async function deleteAllDossiers() {
    const uri = process.env.MONGODB_URI || "mongodb://localhost:27017/mes_archivage";
    const dbName = process.env.MONGODB_DB_NAME || 'mes_archivage';

    const client = await MongoClient.connect(uri);
    const db = client.db(dbName);

    console.log('🧹 Nettoyage de la base de données...\n');

    // Supprimer tous les dossiers
    const resultDossiers = await db.collection('dossiers').deleteMany({});
    console.log('🗑️ Dossiers supprimés:', resultDossiers.deletedCount);

    // Supprimer l'historique de partage associé
    const resultShare = await db.collection('shareHistory').deleteMany({});
    console.log('🗑️ Historique partages supprimé:', resultShare.deletedCount);

    // Supprimer les logs d'audit liés aux dossiers
    const resultAudit = await db.collection('auditLogs').deleteMany({
        action: { $in: ['DOSSIER_CREATED', 'DOSSIER_DELETED', 'DOSSIER_SHARED', 'DOCUMENT_ADDED', 'DOCUMENT_DOWNLOADED', 'DOCUMENT_CONSULTED', 'DOCUMENT_SHARED'] }
    });
    console.log('🗑️ Logs audit dossiers supprimés:', resultAudit.deletedCount);

    // Supprimer les messages de notification de partage
    const resultMessages = await db.collection('messages').deleteMany({
        type: 'share_notification'
    });
    console.log('🗑️ Messages notifications supprimés:', resultMessages.deletedCount);

    await client.close();
    console.log('\n✅ Base nettoyée - prêt pour les tests!');
}

deleteAllDossiers().catch(console.error);
