#!/usr/bin/env node

/**
 * ============================================
 * SCRIPT DE RESTAURATION MONGODB - PRODUCTION
 * ============================================
 *
 * Ce script restaure une sauvegarde MongoDB spécifique
 *
 * Utilisation:
 *   node scripts/restore-database.js
 *   node scripts/restore-database.js backup_2025-11-30_14-30-00
 *
 * Configuration:
 *   - MONGODB_URI: URI de connexion MongoDB (depuis .env)
 *   - BACKUP_DIR: Dossier contenant les sauvegardes
 */

require('dotenv').config();
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const util = require('util');
const readline = require('readline');

const execPromise = util.promisify(exec);

// ============================================
// CONFIGURATION
// ============================================

const MONGODB_URI = process.env.MONGODB_URI;
const DB_NAME = process.env.MONGODB_DB_NAME || 'cerer_archivage';
const BACKUP_DIR = process.env.BACKUP_DIR || path.join(__dirname, '../backups');

// ============================================
// FONCTIONS UTILITAIRES
// ============================================

/**
 * Liste toutes les sauvegardes disponibles
 */
function listAvailableBackups() {
    if (!fs.existsSync(BACKUP_DIR)) {
        console.log('❌ Aucun dossier de sauvegarde trouvé');
        return [];
    }

    const files = fs.readdirSync(BACKUP_DIR);
    const backups = files
        .filter(file => {
            const fullPath = path.join(BACKUP_DIR, file);
            return fs.statSync(fullPath).isDirectory() && file.startsWith('backup_');
        })
        .map(folder => {
            const fullPath = path.join(BACKUP_DIR, folder);
            const stats = fs.statSync(fullPath);
            return {
                name: folder,
                path: fullPath,
                date: stats.mtime,
                size: getFolderSize(fullPath)
            };
        })
        .sort((a, b) => b.date - a.date); // Plus récent en premier

    return backups;
}

/**
 * Calcule la taille d'un dossier
 */
function getFolderSize(folderPath) {
    let size = 0;
    const files = fs.readdirSync(folderPath);

    for (const file of files) {
        const filePath = path.join(folderPath, file);
        const stats = fs.statSync(filePath);

        if (stats.isDirectory()) {
            size += getFolderSize(filePath);
        } else {
            size += stats.size;
        }
    }

    return size;
}

/**
 * Formate les octets en format lisible
 */
function formatBytes(bytes) {
    if (bytes === 0) return '0 B';

    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

/**
 * Demande confirmation à l'utilisateur
 */
function askConfirmation(question) {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    return new Promise(resolve => {
        rl.question(question, answer => {
            rl.close();
            resolve(answer.toLowerCase() === 'o' || answer.toLowerCase() === 'y' || answer.toLowerCase() === 'oui' || answer.toLowerCase() === 'yes');
        });
    });
}

/**
 * Restaure une sauvegarde spécifique
 */
async function restoreDatabase(backupName) {
    try {
        console.log('============================================');
        console.log('RESTAURATION MONGODB - DÉMARRAGE');
        console.log('============================================\n');

        // Vérifications préliminaires
        if (!MONGODB_URI) {
            throw new Error('MONGODB_URI non défini dans le fichier .env');
        }

        const backups = listAvailableBackups();

        if (backups.length === 0) {
            console.log('❌ Aucune sauvegarde disponible');
            return false;
        }

        // Si aucun nom de backup spécifié, afficher la liste
        let selectedBackup;

        if (!backupName) {
            console.log('📋 Sauvegardes disponibles:\n');
            backups.forEach((backup, index) => {
                console.log(`  ${index + 1}. ${backup.name}`);
                console.log(`     📅 Date: ${backup.date.toLocaleString('fr-FR')}`);
                console.log(`     💾 Taille: ${formatBytes(backup.size)}\n`);
            });

            // Utiliser la plus récente par défaut
            selectedBackup = backups[0];
            console.log(`✅ Sauvegarde sélectionnée (la plus récente): ${selectedBackup.name}\n`);
        } else {
            // Rechercher le backup spécifié
            selectedBackup = backups.find(b => b.name === backupName);

            if (!selectedBackup) {
                console.log(`❌ Sauvegarde "${backupName}" non trouvée`);
                console.log('\n📋 Sauvegardes disponibles:');
                backups.forEach(backup => console.log(`   - ${backup.name}`));
                return false;
            }

            console.log(`✅ Sauvegarde trouvée: ${selectedBackup.name}`);
            console.log(`   📅 Date: ${selectedBackup.date.toLocaleString('fr-FR')}`);
            console.log(`   💾 Taille: ${formatBytes(selectedBackup.size)}\n`);
        }

        // Demander confirmation
        console.log('⚠️  ATTENTION: Cette opération va REMPLACER toutes les données actuelles de la base !');
        console.log(`   Base de données: ${DB_NAME}`);
        console.log(`   Restauration depuis: ${selectedBackup.name}\n`);

        const confirmed = await askConfirmation('Voulez-vous continuer ? (o/n): ');

        if (!confirmed) {
            console.log('\n❌ Restauration annulée par l\'utilisateur');
            return false;
        }

        console.log('\n🔄 Restauration en cours...');

        // Chemin vers le dossier de la base spécifique dans le backup
        const backupDbPath = path.join(selectedBackup.path, DB_NAME);

        if (!fs.existsSync(backupDbPath)) {
            throw new Error(`Le dossier de sauvegarde de la base "${DB_NAME}" n'existe pas dans ${selectedBackup.name}`);
        }

        // Commande mongorestore avec --drop pour remplacer les données existantes
        const command = `mongorestore --uri="${MONGODB_URI}" --db="${DB_NAME}" --drop "${backupDbPath}"`;

        // Exécuter la restauration
        const { stdout, stderr } = await execPromise(command);

        if (stderr && !stderr.includes('preparing') && !stderr.includes('restoring')) {
            console.warn('⚠️  Avertissement:', stderr);
        }

        console.log('\n✅ Restauration réussie !');
        console.log(`   📁 Source: ${selectedBackup.name}`);
        console.log(`   🗄️  Base: ${DB_NAME}`);
        console.log(`   📅 Date de la sauvegarde: ${selectedBackup.date.toLocaleString('fr-FR')}`);

        console.log('\n============================================');
        console.log('RESTAURATION TERMINÉE AVEC SUCCÈS');
        console.log('============================================\n');

        return true;
    } catch (error) {
        console.error('\n============================================');
        console.error('❌ ERREUR LORS DE LA RESTAURATION');
        console.error('============================================');
        console.error('Détails:', error.message);

        if (error.message.includes('mongorestore')) {
            console.error('\n💡 Assurez-vous que MongoDB Database Tools est installé:');
            console.error('   https://www.mongodb.com/try/download/database-tools');
        }

        console.error('');
        process.exit(1);
    }
}

// ============================================
// EXÉCUTION
// ============================================

if (require.main === module) {
    // Récupérer le nom du backup depuis les arguments
    const backupName = process.argv[2];

    restoreDatabase(backupName)
        .then(success => {
            if (success) {
                console.log('✅ Script terminé avec succès');
                process.exit(0);
            } else {
                process.exit(1);
            }
        })
        .catch(error => {
            console.error('❌ Erreur fatale:', error);
            process.exit(1);
        });
}

module.exports = { restoreDatabase };
