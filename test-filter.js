const { MongoClient } = require('mongodb');

(async () => {
    const client = await MongoClient.connect('mongodb://localhost:27017');
    const db = client.db('cerer_archivage');

    console.log('\n=== TEST FILTRE ACTIONS JBK ===\n');

    // Test 1: Actions avec le filtre complet
    const actions = await db.collection('auditLogs').find({
        user: 'jbk',
        action: {
            $in: [
                'DOCUMENT_ARCHIVED',
                'DOCUMENT_DELETED',
                'DOCUMENT_SHARED',
                'DOCUMENT_DOWNLOADED',
                'DOCUMENT_VIEWED',
                'DOCUMENT_VERROUILLE',
                'DOCUMENT_DEVERROUILLE'
            ]
        }
    }).sort({ timestamp: -1 }).toArray();

    console.log('Actions filtrées pour jbk:', actions.length);
    actions.forEach(a => {
        console.log('-', a.action, '|', new Date(a.timestamp).toLocaleString('fr-FR'));
        console.log('  documentId:', a.documentId);
        console.log('  titre:', a.details?.titre);
    });

    // Test 2: Vérifier les LOGIN_SUCCESS
    console.log('\n=== CONNEXIONS JBK ===\n');
    const logins = await db.collection('auditLogs').find({
        user: 'jbk',
        action: 'LOGIN_SUCCESS'
    }).sort({ timestamp: -1 }).toArray();

    console.log('Connexions réussies pour jbk:', logins.length);
    logins.forEach(l => {
        console.log('-', new Date(l.timestamp).toLocaleString('fr-FR'));
    });

    // Test 3: Vérifier les actions de partage (SHARED)
    console.log('\n=== PARTAGES (TOUS UTILISATEURS) ===\n');
    const shares = await db.collection('auditLogs').find({
        action: 'DOCUMENT_SHARED'
    }).sort({ timestamp: -1 }).limit(5).toArray();

    console.log('Actions de partage:', shares.length);
    shares.forEach(s => {
        console.log('-', s.user, '|', new Date(s.timestamp).toLocaleString('fr-FR'));
    });

    await client.close();
})();
