/**
 * SERVICE DE STOCKAGE DE FICHIERS OPTIMISÉ
 * Sépare les métadonnées (MongoDB) du contenu binaire (système de fichiers)
 *
 * Avantages:
 * - MongoDB reste léger (~2KB par document au lieu de 100KB-5MB)
 * - Requêtes de liste ultra-rapides
 * - Contenu chargé uniquement à la demande (téléchargement/prévisualisation)
 * - Possibilité de migrer vers S3/Azure plus tard
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Dossier de stockage des fichiers
const STORAGE_DIR = path.join(__dirname, '..', 'storage', 'files');

// Créer le dossier de stockage s'il n'existe pas
function ensureStorageDir() {
    if (!fs.existsSync(STORAGE_DIR)) {
        fs.mkdirSync(STORAGE_DIR, { recursive: true });
        console.log('📁 Dossier de stockage créé:', STORAGE_DIR);
    }
}

// Initialisation
ensureStorageDir();

/**
 * Générer un nom de fichier unique
 */
function generateUniqueFileName(originalName) {
    const timestamp = Date.now();
    const random = crypto.randomBytes(8).toString('hex');
    const ext = path.extname(originalName) || '.bin';
    return `${timestamp}_${random}${ext}`;
}

/**
 * Sauvegarder le contenu d'un fichier (depuis base64 data URL)
 * @param {string} dataUrl - Le contenu en format data:mime;base64,...
 * @param {string} originalFileName - Nom original du fichier
 * @returns {Object} - { filePath, fileSize }
 */
function saveFileContent(dataUrl, originalFileName) {
    ensureStorageDir();

    if (!dataUrl || typeof dataUrl !== 'string') {
        throw new Error('Contenu du fichier invalide');
    }

    // Extraire le contenu base64
    let base64Data;
    if (dataUrl.startsWith('data:')) {
        const parts = dataUrl.split(',');
        if (parts.length !== 2) {
            throw new Error('Format data URL invalide');
        }
        base64Data = parts[1];
    } else {
        // C'est peut-être déjà du base64 pur
        base64Data = dataUrl;
    }

    // Décoder le base64 en buffer binaire
    const buffer = Buffer.from(base64Data, 'base64');

    // Générer un nom unique
    const uniqueFileName = generateUniqueFileName(originalFileName);
    const filePath = path.join(STORAGE_DIR, uniqueFileName);

    // Écrire le fichier
    fs.writeFileSync(filePath, buffer);

    console.log(`💾 Fichier sauvegardé: ${uniqueFileName} (${(buffer.length / 1024).toFixed(2)} KB)`);

    return {
        filePath: uniqueFileName, // Chemin relatif au dossier storage
        fileSize: buffer.length
    };
}

/**
 * Charger le contenu d'un fichier et le retourner en data URL
 * @param {string} filePath - Chemin relatif du fichier
 * @param {string} mimeType - Type MIME du fichier
 * @returns {string} - Data URL (data:mime;base64,...)
 */
function loadFileContent(filePath, mimeType) {
    const fullPath = path.join(STORAGE_DIR, filePath);

    if (!fs.existsSync(fullPath)) {
        throw new Error(`Fichier non trouvé: ${filePath}`);
    }

    const buffer = fs.readFileSync(fullPath);
    const base64 = buffer.toString('base64');

    return `data:${mimeType || 'application/octet-stream'};base64,${base64}`;
}

/**
 * Charger le contenu brut (buffer) pour streaming
 * @param {string} filePath - Chemin relatif du fichier
 * @returns {Buffer}
 */
function loadFileBuffer(filePath) {
    const fullPath = path.join(STORAGE_DIR, filePath);

    if (!fs.existsSync(fullPath)) {
        throw new Error(`Fichier non trouvé: ${filePath}`);
    }

    return fs.readFileSync(fullPath);
}

/**
 * Supprimer un fichier
 * @param {string} filePath - Chemin relatif du fichier
 */
function deleteFile(filePath) {
    if (!filePath) return;

    const fullPath = path.join(STORAGE_DIR, filePath);

    if (fs.existsSync(fullPath)) {
        fs.unlinkSync(fullPath);
        console.log(`🗑️ Fichier supprimé: ${filePath}`);
    }
}

/**
 * Vérifier si un fichier existe
 * @param {string} filePath - Chemin relatif du fichier
 * @returns {boolean}
 */
function fileExists(filePath) {
    if (!filePath) return false;
    const fullPath = path.join(STORAGE_DIR, filePath);
    return fs.existsSync(fullPath);
}

/**
 * Obtenir la taille d'un fichier
 * @param {string} filePath - Chemin relatif du fichier
 * @returns {number} - Taille en octets
 */
function getFileSize(filePath) {
    const fullPath = path.join(STORAGE_DIR, filePath);
    if (!fs.existsSync(fullPath)) return 0;
    return fs.statSync(fullPath).size;
}

/**
 * Obtenir les statistiques du stockage
 * @returns {Object} - { totalFiles, totalSizeBytes, totalSizeMB }
 */
function getStorageStats() {
    ensureStorageDir();

    const files = fs.readdirSync(STORAGE_DIR);
    let totalSize = 0;

    files.forEach(file => {
        const filePath = path.join(STORAGE_DIR, file);
        const stats = fs.statSync(filePath);
        if (stats.isFile()) {
            totalSize += stats.size;
        }
    });

    return {
        totalFiles: files.length,
        totalSizeBytes: totalSize,
        totalSizeMB: (totalSize / (1024 * 1024)).toFixed(2),
        storagePath: STORAGE_DIR
    };
}

module.exports = {
    saveFileContent,
    loadFileContent,
    loadFileBuffer,
    deleteFile,
    fileExists,
    getFileSize,
    getStorageStats,
    STORAGE_DIR
};
