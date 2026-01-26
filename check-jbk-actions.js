const { MongoClient } = require('mongodb');

(async () => {
    const client = await MongoClient.connect('mongodb://localhost:27017');
    const db = client.db('cerer_archivage');

    console.log('\n=== VÉRIFICATION ACTIONS UTILISATEUR JBK ===\n');

    // 1. Toutes les actions de jbk
    const allJbkActions = await db.collection('auditLogs')
        .find({ user: 'jbk' })
        .sort({ timestamp: -1 })
        .toArray();

    console.log('Total actions jbk:', allJbkActions.length);
    console.log('\nActions par type:');
    const grouped = {};
    allJbkActions.forEach(log => {
        grouped[log.action] = (grouped[log.action] || 0) + 1;
    });
    console.log(JSON.stringify(grouped, null, 2));

    // 2. Actions documents de jbk
    const documentActions = await db.collection('auditLogs')
        .find({
            user: 'jbk',
            action: {
                $in: [
                    'DOCUMENT_ARCHIVED',
                    'DOCUMENT_DELETED',
                    'DOCUMENT_SHARED',
                    'DOCUMENT_DOWNLOADED',
                    'DOCUMENT_VIEWED'
                ]
            }
        })
        .sort({ timestamp: -1 })
        .limit(5)
        .toArray();

    console.log('\n5 dernières actions documents jbk:', documentActions.length);
    if (documentActions.length > 0) {
        console.log(JSON.stringify(documentActions, null, 2));
    } else {
        console.log('❌ AUCUNE action sur les documents trouvée pour jbk');
    }

    // 3. Exemples d'actions documents (tous utilisateurs)
    console.log('\n=== Exemples d\'actions documents (tous utilisateurs) ===\n');
    const allDocActions = await db.collection('auditLogs')
        .find({
            action: {
                $in: [
                    'DOCUMENT_ARCHIVED',
                    'DOCUMENT_DELETED',
                    'DOCUMENT_SHARED',
                    'DOCUMENT_DOWNLOADED',
                    'DOCUMENT_VIEWED'
                ]
            }
        })
        .sort({ timestamp: -1 })
        .limit(5)
        .toArray();

    console.log('Total actions documents (tous):', allDocActions.length);
    if (allDocActions.length > 0) {
        console.log('\nPremier exemple:');
        console.log(JSON.stringify(allDocActions[0], null, 2));
    }

    await client.close();
})();
