#!/usr/bin/env node

/**
 * ============================================
 * VÉRIFICATION DES SAUVEGARDES MONGODB ATLAS
 * ============================================
 *
 * Ce script vérifie l'état des sauvegardes MongoDB Atlas
 * via l'API Atlas.
 *
 * Utilisation:
 *   node scripts/check-atlas-backups.js
 *
 * Configuration requise dans .env:
 *   ATLAS_PUBLIC_KEY=votre_public_key
 *   ATLAS_PRIVATE_KEY=votre_private_key
 *   ATLAS_PROJECT_ID=votre_project_id
 *   ATLAS_CLUSTER_NAME=Cluster0
 */

require('dotenv').config();
const https = require('https');

// ============================================
// CONFIGURATION
// ============================================

const ATLAS_PUBLIC_KEY = process.env.ATLAS_PUBLIC_KEY;
const ATLAS_PRIVATE_KEY = process.env.ATLAS_PRIVATE_KEY;
const ATLAS_PROJECT_ID = process.env.ATLAS_PROJECT_ID;
const ATLAS_CLUSTER_NAME = process.env.ATLAS_CLUSTER_NAME || 'Cluster0';

// ============================================
// FONCTIONS UTILITAIRES
// ============================================

/**
 * Effectue une requête à l'API Atlas
 */
function atlasApiRequest(path) {
    return new Promise((resolve, reject) => {
        if (!ATLAS_PUBLIC_KEY || !ATLAS_PRIVATE_KEY || !ATLAS_PROJECT_ID) {
            reject(new Error('Configuration Atlas incomplète. Vérifiez votre fichier .env'));
            return;
        }

        const auth = Buffer.from(`${ATLAS_PUBLIC_KEY}:${ATLAS_PRIVATE_KEY}`).toString('base64');

        const options = {
            hostname: 'cloud.mongodb.com',
            path: `/api/atlas/v1.0${path}`,
            method: 'GET',
            headers: {
                'Authorization': `Basic ${auth}`,
                'Content-Type': 'application/json'
            }
        };

        const req = https.request(options, (res) => {
            let data = '';

            res.on('data', (chunk) => {
                data += chunk;
            });

            res.on('end', () => {
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    try {
                        resolve(JSON.parse(data));
                    } catch (e) {
                        reject(new Error(`Erreur de parsing JSON: ${e.message}`));
                    }
                } else {
                    reject(new Error(`Erreur API Atlas (${res.statusCode}): ${data}`));
                }
            });
        });

        req.on('error', (error) => {
            reject(new Error(`Erreur de connexion: ${error.message}`));
        });

        req.end();
    });
}

/**
 * Formatte une date
 */
function formatDate(dateString) {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleString('fr-FR', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });
}

/**
 * Formatte la taille en bytes
 */
function formatBytes(bytes) {
    if (bytes === 0 || !bytes) return '0 B';

    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

/**
 * Calcule le temps écoulé depuis une date
 */
function getTimeAgo(dateString) {
    if (!dateString) return 'N/A';

    const now = new Date();
    const date = new Date(dateString);
    const diffMs = now - date;
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffDays > 0) {
        return `il y a ${diffDays} jour${diffDays > 1 ? 's' : ''}`;
    } else if (diffHours > 0) {
        return `il y a ${diffHours} heure${diffHours > 1 ? 's' : ''}`;
    } else {
        const diffMinutes = Math.floor(diffMs / (1000 * 60));
        return `il y a ${diffMinutes} minute${diffMinutes > 1 ? 's' : ''}`;
    }
}

/**
 * Vérifie les informations du cluster
 */
async function checkClusterInfo() {
    try {
        const path = `/groups/${ATLAS_PROJECT_ID}/clusters/${ATLAS_CLUSTER_NAME}`;
        const cluster = await atlasApiRequest(path);

        console.log('📊 Informations du cluster:');
        console.log(`   Nom: ${cluster.name}`);
        console.log(`   Type: ${cluster.clusterType}`);
        console.log(`   Taille: ${cluster.diskSizeGB || 'N/A'} GB`);
        console.log(`   Version MongoDB: ${cluster.mongoDBVersion}`);
        console.log(`   État: ${cluster.stateName}`);

        return cluster;
    } catch (error) {
        throw new Error(`Impossible de récupérer les infos du cluster: ${error.message}`);
    }
}

/**
 * Vérifie les snapshots disponibles
 */
async function checkSnapshots() {
    try {
        const path = `/groups/${ATLAS_PROJECT_ID}/clusters/${ATLAS_CLUSTER_NAME}/backup/snapshots`;
        const response = await atlasApiRequest(path);

        if (!response.results || response.results.length === 0) {
            console.log('\n⚠️  Aucun snapshot disponible');
            console.log('\n💡 Note: Les clusters M0 (gratuits) utilisent le Continuous Backup');
            console.log('   et non les snapshots traditionnels.');
            return [];
        }

        console.log(`\n💾 Snapshots disponibles: ${response.results.length}`);
        console.log('─'.repeat(70));

        // Trier par date décroissante
        const snapshots = response.results.sort((a, b) => {
            return new Date(b.createdAt) - new Date(a.createdAt);
        });

        // Afficher les 5 derniers snapshots
        const limit = Math.min(5, snapshots.length);
        for (let i = 0; i < limit; i++) {
            const snapshot = snapshots[i];
            console.log(`\n${i + 1}. Snapshot ID: ${snapshot.id}`);
            console.log(`   📅 Créé le: ${formatDate(snapshot.createdAt)} (${getTimeAgo(snapshot.createdAt)})`);
            console.log(`   💾 Taille: ${formatBytes(snapshot.storageSizeBytes)}`);
            console.log(`   ✅ Type: ${snapshot.snapshotType || 'N/A'}`);
            console.log(`   📍 Statut: ${snapshot.status || 'completed'}`);
        }

        if (snapshots.length > 5) {
            console.log(`\n   ... et ${snapshots.length - 5} autre(s) snapshot(s)`);
        }

        return snapshots;
    } catch (error) {
        if (error.message.includes('404')) {
            console.log('\n💡 Snapshots non disponibles sur ce cluster');
            console.log('   Les clusters M0 (gratuits) utilisent le Continuous Backup');
            return [];
        }
        throw error;
    }
}

/**
 * Vérifie la configuration de backup
 */
async function checkBackupConfig() {
    try {
        const path = `/groups/${ATLAS_PROJECT_ID}/clusters/${ATLAS_CLUSTER_NAME}/backup/schedule`;
        const schedule = await atlasApiRequest(path);

        console.log('\n⚙️  Configuration du backup:');
        console.log(`   Policy: ${schedule.policies ? schedule.policies.length : 0} politique(s)`);

        if (schedule.policies && schedule.policies.length > 0) {
            schedule.policies.forEach((policy, idx) => {
                console.log(`\n   Politique ${idx + 1}:`);
                if (policy.policyItems) {
                    policy.policyItems.forEach(item => {
                        console.log(`   - Fréquence: ${item.frequencyType}`);
                        console.log(`     Rétention: ${item.retentionValue} ${item.retentionUnit}`);
                    });
                }
            });
        }

        return schedule;
    } catch (error) {
        if (error.message.includes('404') || error.message.includes('403')) {
            console.log('\n💡 Configuration de backup non accessible');
            console.log('   (Normal pour les clusters M0 gratuits)');
            return null;
        }
        throw error;
    }
}

/**
 * Affiche un résumé de la santé des backups
 */
function displayHealthSummary(snapshots) {
    console.log('\n' + '='.repeat(70));
    console.log('RÉSUMÉ DE LA SANTÉ DES BACKUPS');
    console.log('='.repeat(70));

    if (snapshots.length === 0) {
        console.log('\n⚠️  ATTENTION: Aucun snapshot manuel trouvé');
        console.log('\n📋 Pour les clusters M0 (gratuits):');
        console.log('   ✅ Continuous Backup est actif (rétention 24-48h)');
        console.log('   ✅ Accès via: Atlas → Cluster → Backup → Continuous Backup');
        console.log('   ⚠️  Les snapshots manuels ne sont pas disponibles');
        console.log('\n💡 Pour plus de contrôle, envisagez de passer à M2+ ($9/mois)');
    } else {
        const latestSnapshot = snapshots[0];
        const age = new Date() - new Date(latestSnapshot.createdAt);
        const ageHours = age / (1000 * 60 * 60);

        console.log(`\n✅ Dernier snapshot: ${getTimeAgo(latestSnapshot.createdAt)}`);
        console.log(`   Date: ${formatDate(latestSnapshot.createdAt)}`);
        console.log(`   Taille: ${formatBytes(latestSnapshot.storageSizeBytes)}`);

        if (ageHours > 48) {
            console.log(`\n⚠️  ALERTE: Le dernier snapshot date de plus de 48h`);
        } else if (ageHours > 24) {
            console.log(`\n⚠️  Attention: Le dernier snapshot date de plus de 24h`);
        } else {
            console.log(`\n✅ Les backups sont à jour`);
        }

        console.log(`\n📊 Total de snapshots: ${snapshots.length}`);
    }

    console.log('\n' + '='.repeat(70));
}

/**
 * Fonction principale
 */
async function checkBackups() {
    try {
        console.log('============================================');
        console.log('VÉRIFICATION DES SAUVEGARDES MONGODB ATLAS');
        console.log('============================================\n');

        console.log(`🔍 Vérification du cluster: ${ATLAS_CLUSTER_NAME}`);
        console.log(`📁 Projet: ${ATLAS_PROJECT_ID}\n`);

        // 1. Vérifier les infos du cluster
        await checkClusterInfo();

        // 2. Vérifier les snapshots
        const snapshots = await checkSnapshots();

        // 3. Vérifier la configuration de backup
        await checkBackupConfig();

        // 4. Afficher le résumé
        displayHealthSummary(snapshots);

        console.log('\n✅ Vérification terminée avec succès\n');

        console.log('💡 Pour accéder aux backups via l\'interface:');
        console.log('   1. Allez sur https://cloud.mongodb.com');
        console.log('   2. Sélectionnez votre cluster');
        console.log('   3. Cliquez sur l\'onglet "Backup"\n');

        return true;
    } catch (error) {
        console.error('\n============================================');
        console.error('❌ ERREUR LORS DE LA VÉRIFICATION');
        console.error('============================================');
        console.error('Détails:', error.message);

        if (error.message.includes('Configuration Atlas incomplète')) {
            console.error('\n💡 Configuration requise dans .env:');
            console.error('   ATLAS_PUBLIC_KEY=votre_public_key');
            console.error('   ATLAS_PRIVATE_KEY=votre_private_key');
            console.error('   ATLAS_PROJECT_ID=votre_project_id');
            console.error('   ATLAS_CLUSTER_NAME=Cluster0');
            console.error('\n📖 Consultez MONGODB_ATLAS_BACKUP_GUIDE.md pour plus d\'infos');
        } else if (error.message.includes('401') || error.message.includes('Unauthorized')) {
            console.error('\n💡 Vérifiez vos clés API Atlas:');
            console.error('   - Les clés sont-elles correctes ?');
            console.error('   - Ont-elles les permissions nécessaires ?');
        }

        console.error('');
        process.exit(1);
    }
}

// ============================================
// EXÉCUTION
// ============================================

if (require.main === module) {
    checkBackups()
        .then(() => {
            process.exit(0);
        })
        .catch(error => {
            console.error('❌ Erreur fatale:', error);
            process.exit(1);
        });
}

module.exports = { checkBackups };
