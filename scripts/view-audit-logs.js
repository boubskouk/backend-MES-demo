const { MongoClient } = require('mongodb');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const DB_NAME = 'cerer_archivage';

async function viewAuditLogs() {
    const client = new MongoClient(MONGODB_URI);

    try {
        await client.connect();
        console.log('Connecte a MongoDB\n');

        const db = client.db(DB_NAME);
        const auditLogsCollection = db.collection('auditLogs');

        const totalLogs = await auditLogsCollection.countDocuments();
        console.log(`Total de logs d'audit : ${totalLogs}\n`);

        console.log('Les 10 derniers logs d\'audit :\n');
        console.log('='.repeat(100));

        const recentLogs = await auditLogsCollection
            .find({})
            .sort({ timestamp: -1 })
            .limit(10)
            .toArray();

        recentLogs.forEach((log, index) => {
            console.log(`\nLOG #${index + 1}`);
            console.log('-'.repeat(100));
            console.log(`Date/Heure : ${log.timestamp}`);
            console.log(`Utilisateur : ${log.user || 'N/A'}`);
            console.log(`Action      : ${log.action}`);
            console.log(`IP          : ${log.ip || 'N/A'}`);
            console.log(`Détails     :`);
            console.log(JSON.stringify(log.details || {}, null, 2));
        });

        console.log('\n' + '='.repeat(100));

        const yesterday = new Date();
        yesterday.setHours(yesterday.getHours() - 24);

        console.log('\nStatistiques des actions (dernieres 24h) :\n');

        const actionStats = await auditLogsCollection.aggregate([
            { $match: { timestamp: { $gte: yesterday } } },
            { $group: {
                _id: "$action",
                count: { $sum: 1 }
            }},
            { $sort: { count: -1 } },
            { $limit: 10 }
        ]).toArray();

        if (actionStats.length > 0) {
            actionStats.forEach(stat => {
                console.log(`  ${stat._id.padEnd(35)} : ${stat.count} fois`);
            });
        } else {
            console.log('  Aucune activite dans les dernieres 24h');
        }

        console.log('\nTop 5 utilisateurs les plus actifs (dernieres 24h) :\n');

        const userStats = await auditLogsCollection.aggregate([
            { $match: { timestamp: { $gte: yesterday }, user: { $ne: null } } },
            { $group: {
                _id: "$user",
                count: { $sum: 1 }
            }},
            { $sort: { count: -1 } },
            { $limit: 5 }
        ]).toArray();

        if (userStats.length > 0) {
            userStats.forEach((stat, index) => {
                console.log(`  ${index + 1}. ${stat._id.padEnd(20)} : ${stat.count} actions`);
            });
        } else {
            console.log('  Aucune activite utilisateur dans les dernieres 24h');
        }

        console.log('\nTermine !\n');

    } catch (error) {
        console.error('Erreur :', error);
    } finally {
        await client.close();
    }
}

viewAuditLogs();
