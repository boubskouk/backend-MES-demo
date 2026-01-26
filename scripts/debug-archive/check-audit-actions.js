/**
 * Vérifier quels types d'actions sont dans les logs d'audit
 */

const { MongoClient } = require('mongodb');

const ATLAS_URI = 'mongodb+srv://jacquesboubacarkoukoui_db_user:um6pz5uhsXkNGdOe@cluster0.eq69ixv.mongodb.net/cerer_archivage?retryWrites=true&w=majority';

async function checkAuditActions() {
    let client;

    try {
        client = await MongoClient.connect(ATLAS_URI, {
            serverSelectionTimeoutMS: 5000
        });

        const db = client.db('cerer_archivage');
        const auditLogs = db.collection('auditLogs');

        console.log('📊 Types d\'actions dans les logs d\'audit:\n');

        // Grouper par action
        const actions = await auditLogs.aggregate([
            {
                $group: {
                    _id: '$action',
                    count: { $sum: 1 },
                    lastOccurrence: { $max: '$timestamp' }
                }
            },
            {
                $sort: { count: -1 }
            }
        ]).toArray();

        console.log('Action'.padEnd(35), '| Nombre | Dernière occurrence');
        console.log('-'.repeat(80));

        for (const action of actions) {
            const date = new Date(action.lastOccurrence).toLocaleString('fr-FR');
            console.log(
                (action._id || 'VIDE').padEnd(35),
                '|',
                String(action.count).padEnd(6),
                '|',
                date
            );
        }

        console.log('-'.repeat(80));
        console.log(`\nTotal: ${actions.length} types d'actions différentes`);

        // Afficher quelques exemples de logs récents
        console.log('\n📋 Exemples de logs récents:\n');

        const recentLogs = await auditLogs.find({})
            .sort({ timestamp: -1 })
            .limit(5)
            .toArray();

        for (let i = 0; i < recentLogs.length; i++) {
            const log = recentLogs[i];
            console.log(`${i + 1}. Action: ${log.action}`);
            console.log(`   User: ${log.user || 'N/A'}`);
            console.log(`   Date: ${new Date(log.timestamp).toLocaleString('fr-FR')}`);
            console.log(`   Détails: ${JSON.stringify(log.details || {})}\n`);
        }

    } catch (error) {
        console.error('❌ Erreur:', error.message);
    } finally {
        if (client) {
            await client.close();
        }
    }
}

checkAuditActions().catch(console.error);
