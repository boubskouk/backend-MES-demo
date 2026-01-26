/**
 * Rapport détaillé des connexions utilisateurs
 */

const { MongoClient } = require('mongodb');

const ATLAS_URI = 'mongodb+srv://jacquesboubacarkoukoui_db_user:um6pz5uhsXkNGdOe@cluster0.eq69ixv.mongodb.net/cerer_archivage?retryWrites=true&w=majority';

async function detailedConnections() {
    let client;

    try {
        client = await MongoClient.connect(ATLAS_URI);
        const db = client.db('cerer_archivage');
        const auditLogs = db.collection('auditLogs');

        console.log('🔐 RAPPORT DES CONNEXIONS UTILISATEURS\n');
        console.log('='.repeat(80));

        // Toutes les connexions (LOGIN_SUCCESS et SUCCES_CONNEXION_SUPERADMIN)
        const connections = await auditLogs.find({
            $or: [
                { action: 'LOGIN_SUCCESS' },
                { action: 'SUCCES_CONNEXION_SUPERADMIN' }
            ]
        }).sort({ timestamp: -1 }).toArray();

        console.log(`\n📊 Total de connexions réussies : ${connections.length}\n`);

        console.log('Date & Heure              | Utilisateur        | Type de connexion');
        console.log('-'.repeat(80));

        for (const conn of connections) {
            const date = new Date(conn.timestamp).toLocaleString('fr-FR', {
                timeZone: 'Africa/Dakar',
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit'
            });

            const user = conn.user || conn.details?.username || 'Inconnu';
            const type = conn.action === 'SUCCES_CONNEXION_SUPERADMIN' ? '🛡️  Super Admin' : '👤 Normal';

            console.log(date.padEnd(25), '|', user.padEnd(18), '|', type);
        }

        console.log('-'.repeat(80));

        // Statistiques par utilisateur
        console.log('\n\n👥 STATISTIQUES PAR UTILISATEUR:\n');

        const userStats = {};
        for (const conn of connections) {
            const user = conn.user || conn.details?.username || 'Inconnu';
            if (!userStats[user]) {
                userStats[user] = {
                    count: 0,
                    lastLogin: conn.timestamp,
                    firstLogin: conn.timestamp
                };
            }
            userStats[user].count++;
            if (conn.timestamp > userStats[user].lastLogin) {
                userStats[user].lastLogin = conn.timestamp;
            }
            if (conn.timestamp < userStats[user].firstLogin) {
                userStats[user].firstLogin = conn.timestamp;
            }
        }

        const sortedUsers = Object.entries(userStats).sort((a, b) => b[1].count - a[1].count);

        console.log('Utilisateur'.padEnd(20), '| Connexions | Dernière connexion');
        console.log('-'.repeat(80));

        for (const [user, stats] of sortedUsers) {
            const lastDate = new Date(stats.lastLogin).toLocaleString('fr-FR', {
                timeZone: 'Africa/Dakar',
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit'
            });

            console.log(
                user.padEnd(20),
                '|',
                String(stats.count).padStart(10),
                '|',
                lastDate
            );
        }

        console.log('-'.repeat(80));

        // Activité des dernières 24h
        const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const last24h = connections.filter(c => new Date(c.timestamp) >= yesterday);

        console.log('\n\n📅 ACTIVITÉ DES DERNIÈRES 24 HEURES:\n');
        console.log(`   Connexions : ${last24h.length}`);

        if (last24h.length > 0) {
            const uniqueUsers24h = new Set(last24h.map(c => c.user || c.details?.username));
            console.log(`   Utilisateurs différents : ${uniqueUsers24h.size}`);
            console.log(`   Utilisateurs : ${Array.from(uniqueUsers24h).join(', ')}`);
        }

        // Tentatives échouées
        const failedAttempts = await auditLogs.countDocuments({
            action: { $in: ['TENTATIVE_CONNEXION_SUPERADMIN', 'UNAUTHORIZED_SUPERADMIN_ACCESS'] }
        });

        console.log('\n\n⚠️  SÉCURITÉ:\n');
        console.log(`   Tentatives de connexion échouées : ${failedAttempts}`);

        console.log('\n' + '='.repeat(80));

    } catch (error) {
        console.error('❌ Erreur:', error.message);
    } finally {
        if (client) {
            await client.close();
        }
    }
}

detailedConnections().catch(console.error);
