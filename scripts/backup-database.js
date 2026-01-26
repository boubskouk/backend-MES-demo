#!/usr/bin/env node

/**
 * ============================================
 * SCRIPT DE SAUVEGARDE MONGODB - PRODUCTION
 * ============================================
 *
 * Ce script effectue une sauvegarde complète de la base MongoDB
 * et nettoie automatiquement les anciennes sauvegardes.
 *
 * Utilisation:
 *   node scripts/backup-database.js
 *
 * Configuration:
 *   - MONGODB_URI: URI de connexion MongoDB (depuis .env)
 *   - BACKUP_DIR: Dossier de stockage des sauvegardes
 *   - RETENTION_DAYS: Nombre de sauvegardes à conserver (7 par défaut)
 */

require('dotenv').config();
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const util = require('util');

const execPromise = util.promisify(exec);

// ============================================
// CONFIGURATION
// ============================================

const MONGODB_URI = process.env.MONGODB_URI;
const DB_NAME = process.env.MONGODB_DB_NAME || 'cerer_archivage';
const BACKUP_DIR = process.env.BACKUP_DIR || path.join(__dirname, '../backups');
const RETENTION_COUNT = parseInt(process.env.BACKUP_RETENTION_COUNT || '7', 10);

// ============================================
// FONCTIONS UTILITAIRES
// ============================================

/**
 * Formatte la date pour le nom de fichier
 * Format: YYYY-MM-DD_HH-MM-SS
 */
function getFormattedDate() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');

    return `${year}-${month}-${day}_${hours}-${minutes}-${seconds}`;
}

/**
 * Crée le dossier de sauvegarde s'il n'existe pas
 */
function ensureBackupDirectory() {
    if (!fs.existsSync(BACKUP_DIR)) {
        fs.mkdirSync(BACKUP_DIR, { recursive: true });
        console.log(`✅ Dossier de sauvegarde créé: ${BACKUP_DIR}`);
    }
}

/**
 * Nettoie les anciennes sauvegardes
 * Conserve uniquement les N dernières sauvegardes
 */
async function cleanOldBackups() {
    try {
        const files = fs.readdirSync(BACKUP_DIR);

        // Filtrer uniquement les dossiers de sauvegarde
        const backupFolders = files
            .filter(file => {
                const fullPath = path.join(BACKUP_DIR, file);
                return fs.statSync(fullPath).isDirectory();
            })
            .map(folder => ({
                name: folder,
                path: path.join(BACKUP_DIR, folder),
                time: fs.statSync(path.join(BACKUP_DIR, folder)).mtime.getTime()
            }))
            .sort((a, b) => b.time - a.time); // Tri par date décroissante

        // Supprimer les sauvegardes au-delà de la limite de rétention
        if (backupFolders.length > RETENTION_COUNT) {
            const foldersToDelete = backupFolders.slice(RETENTION_COUNT);

            console.log(`\n🧹 Nettoyage des anciennes sauvegardes...`);
            console.log(`   Sauvegardes à conserver: ${RETENTION_COUNT}`);
            console.log(`   Sauvegardes à supprimer: ${foldersToDelete.length}`);

            for (const folder of foldersToDelete) {
                fs.rmSync(folder.path, { recursive: true, force: true });
                console.log(`   ❌ Supprimé: ${folder.name}`);
            }

            console.log(`✅ Nettoyage terminé\n`);
        } else {
            console.log(`\n✅ Nombre de sauvegardes: ${backupFolders.length}/${RETENTION_COUNT} (aucun nettoyage nécessaire)\n`);
        }
    } catch (error) {
        console.error('❌ Erreur lors du nettoyage des anciennes sauvegardes:', error.message);
    }
}

/**
 * Effectue la sauvegarde MongoDB
 */
async function backupDatabase() {
    try {
        console.log('============================================');
        console.log('SAUVEGARDE MONGODB - DÉMARRAGE');
        console.log('============================================\n');

        // Vérifications préliminaires
        if (!MONGODB_URI) {
            throw new Error('MONGODB_URI non défini dans le fichier .env');
        }

        console.log(`📅 Date: ${new Date().toLocaleString('fr-FR')}`);
        console.log(`🗄️  Base de données: ${DB_NAME}`);
        console.log(`📁 Dossier de sauvegarde: ${BACKUP_DIR}\n`);

        // Créer le dossier de sauvegarde
        ensureBackupDirectory();

        // Nom du dossier de sauvegarde avec timestamp
        const timestamp = getFormattedDate();
        const backupFolder = path.join(BACKUP_DIR, `backup_${timestamp}`);

        console.log('🔄 Sauvegarde en cours...');

        // Commande mongodump
        const command = `mongodump --uri="${MONGODB_URI}" --db="${DB_NAME}" --out="${backupFolder}"`;

        // Exécuter la sauvegarde
        const { stdout, stderr } = await execPromise(command);

        if (stderr && !stderr.includes('writing')) {
            console.warn('⚠️  Avertissement:', stderr);
        }

        // Vérifier que la sauvegarde a été créée
        if (fs.existsSync(backupFolder)) {
            const stats = fs.statSync(backupFolder);
            console.log(`\n✅ Sauvegarde réussie !`);
            console.log(`   📁 Dossier: ${backupFolder}`);
            console.log(`   📊 Créé le: ${stats.mtime.toLocaleString('fr-FR')}`);

            // Afficher la taille du backup
            const size = getFolderSize(backupFolder);
            console.log(`   💾 Taille: ${formatBytes(size)}`);
        } else {
            throw new Error('Le dossier de sauvegarde n\'a pas été créé');
        }

        // Nettoyer les anciennes sauvegardes
        await cleanOldBackups();

        console.log('============================================');
        console.log('SAUVEGARDE TERMINÉE AVEC SUCCÈS');
        console.log('============================================\n');

        return true;
    } catch (error) {
        console.error('\n============================================');
        console.error('❌ ERREUR LORS DE LA SAUVEGARDE');
        console.error('============================================');
        console.error('Détails:', error.message);

        if (error.message.includes('mongodump')) {
            console.error('\n💡 Assurez-vous que MongoDB Database Tools est installé:');
            console.error('   https://www.mongodb.com/try/download/database-tools');
        }

        console.error('');
        process.exit(1);
    }
}

/**
 * Calcule la taille d'un dossier de manière récursive
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

// ============================================
// EXÉCUTION
// ============================================

if (require.main === module) {
    backupDatabase()
        .then(() => {
            console.log('✅ Script terminé avec succès');
            process.exit(0);
        })
        .catch(error => {
            console.error('❌ Erreur fatale:', error);
            process.exit(1);
        });
}

module.exports = { backupDatabase };
