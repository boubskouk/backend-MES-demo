/**
 * Script de vérification des connexions utilisateurs
 * Vérifie les logs d'audit pour voir qui s'est connecté
 */

const { MongoClient } = require('mongodb');

const ATLAS_URI = 'mongodb+srv://jacquesboubacarkoukoui_db_user:um6pz5uhsXkNGdOe@cluster0.eq69ixv.mongodb.net/cerer_archivage?retryWrites=true&w=majority';

async function checkUserConnections() {
    let client;

    try {
        console.log('🔍 Connexion à MongoDB Atlas...\n');

        client = await MongoClient.connect(ATLAS_URI, {
            serverSelectionTimeoutMS: 5000
        });

        console.log('✅ Connexion réussie!\n');

        const db = client.db('cerer_archivage');

        // Vérifier les logs d'audit pour les connexions
        console.log('📊 DERNIÈRES CONNEXIONS (Logs d\'audit):\n');
        console.log('Date & Heure'.padEnd(25), '| Utilisateur'.padEnd(20), '| Résultat');
        console.log('-'.repeat(75));

        const auditLogs = db.collection('auditLogs');
        const loginLogs = await auditLogs
            .find({ action: 'LOGIN' })
            .sort({ timestamp: -1 })
            .limit(20)
            .toArray();

        if (loginLogs.length === 0) {
            console.log('❌ Aucune connexion enregistrée dans les logs d\'audit\n');
        } else {
            for (const log of loginLogs) {
                const date = new Date(log.timestamp);
                const dateStr = date.toLocaleString('fr-FR', {
                    timeZone: 'Africa/Dakar',
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit'
                });
                const username = log.user || log.details?.username || 'Inconnu';
                const success = log.details?.success ? '✅ Succès' : '❌ Échec';

                console.log(
                    dateStr.padEnd(25),
                    '|',
                    username.padEnd(20),
                    '|',
                    success
                );
            }
        }

        console.log('-'.repeat(75));
        console.log('\n');

        // Vérifier les utilisateurs avec leur dernière activité
        console.log('👥 ÉTAT DES UTILISATEURS:\n');
        console.log('Username'.padEnd(20), '| Nom'.padEnd(25), '| Dernière activité');
        console.log('-'.repeat(80));

        const users = await db.collection('users').find({}).toArray();

        for (const user of users) {
            // Chercher la dernière connexion de cet utilisateur
            const lastLogin = await auditLogs
                .findOne({
                    action: 'LOGIN',
                    user: user.username,
                    'details.success': true
                }, {
                    sort: { timestamp: -1 }
                });

            let lastActivity = 'Jamais connecté';
            if (lastLogin) {
                const date = new Date(lastLogin.timestamp);
                lastActivity = date.toLocaleString('fr-FR', {
                    timeZone: 'Africa/Dakar',
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit'
                });
            }

            console.log(
                user.username.padEnd(20),
                '|',
                (user.nom || 'Nom inconnu').padEnd(25),
                '|',
                lastActivity
            );
        }

        console.log('-'.repeat(80));
        console.log('\n');

        // Statistiques globales
        console.log('📈 STATISTIQUES GLOBALES:\n');

        const totalUsers = users.length;
        const totalLogins = loginLogs.length;
        const successfulLogins = loginLogs.filter(l => l.details?.success).length;
        const failedLogins = totalLogins - successfulLogins;

        // Connexions dans les dernières 24h
        const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const last24h = await auditLogs.countDocuments({
            action: 'LOGIN',
            timestamp: { $gte: yesterday },
            'details.success': true
        });

        // Connexions dans les 7 derniers jours
        const lastWeek = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        const last7days = await auditLogs.countDocuments({
            action: 'LOGIN',
            timestamp: { $gte: lastWeek },
            'details.success': true
        });

        console.log(`   Total d'utilisateurs : ${totalUsers}`);
        console.log(`   Total de connexions (20 dernières) : ${totalLogins}`);
        console.log(`   Connexions réussies : ${successfulLogins} ✅`);
        console.log(`   Connexions échouées : ${failedLogins} ❌`);
        console.log(`   Connexions dernières 24h : ${last24h}`);
        console.log(`   Connexions derniers 7 jours : ${last7days}`);

        console.log('\n' + '='.repeat(80));

        // Utilisateurs les plus actifs
        console.log('\n🏆 TOP 5 UTILISATEURS LES PLUS ACTIFS:\n');

        const loginCounts = await auditLogs.aggregate([
            {
                $match: {
                    action: 'LOGIN',
                    'details.success': true
                }
            },
            {
                $group: {
                    _id: '$user',
                    count: { $sum: 1 },
                    lastLogin: { $max: '$timestamp' }
                }
            },
            {
                $sort: { count: -1 }
            },
            {
                $limit: 5
            }
        ]).toArray();

        for (let i = 0; i < loginCounts.length; i++) {
            const userLogin = loginCounts[i];
            const user = users.find(u => u.username === userLogin._id);
            const lastDate = new Date(userLogin.lastLogin).toLocaleString('fr-FR', {
                timeZone: 'Africa/Dakar'
            });

            console.log(`   ${i + 1}. ${userLogin._id} (${user?.nom || 'Nom inconnu'})`);
            console.log(`      → ${userLogin.count} connexions | Dernière: ${lastDate}`);
        }

        console.log('\n' + '='.repeat(80));

    } catch (error) {
        console.error('❌ Erreur:', error.message);
    } finally {
        if (client) {
            await client.close();
            console.log('\n🔌 Connexion fermée');
        }
    }
}

// Exécuter
checkUserConnections().catch(console.error);
