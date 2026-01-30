/**
 * SERVICE DE STOCKAGE DE FICHIERS OPTIMISÉ
 *
 * En PRODUCTION (Render): Stocke les fichiers dans MongoDB (système de fichiers éphémère)
 * En DÉVELOPPEMENT: Stocke sur le système de fichiers local
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Détecter si on est en production (Render a un système de fichiers éphémère)
const IS_PRODUCTION = process.env.NODE_ENV === 'production';

// Dossier de stockage des fichiers (utilisé seulement en développement)
const STORAGE_DIR = path.join(__dirname, '..', 'storage', 'files');

// Cache MongoDB pour les fichiers en production
let fileCollection = null;

// Initialiser la collection MongoDB pour le stockage de fichiers
async function initMongoStorage() {
    if (IS_PRODUCTION && !fileCollection) {
        try {
            const { getCollections } = require('../config/database');
            const collections = getCollections();
            // Utiliser une collection dédiée pour les fichiers binaires
            const { getDB } = require('../config/database');
            const db = getDB();
            fileCollection = db.collection('file_storage');
            console.log('✅ Stockage fichiers MongoDB initialisé (PRODUCTION)');
        } catch (error) {
            console.error('⚠️ MongoDB non prêt pour le stockage fichiers:', error.message);
        }
    }
}

// Créer le dossier de stockage s'il n'existe pas (développement uniquement)
function ensureStorageDir() {
    if (!IS_PRODUCTION && !fs.existsSync(STORAGE_DIR)) {
        fs.mkdirSync(STORAGE_DIR, { recursive: true });
        console.log('📁 Dossier de stockage créé:', STORAGE_DIR);
    }
}

// Initialisation
if (!IS_PRODUCTION) {
    ensureStorageDir();
}
console.log(`📦 Mode stockage: ${IS_PRODUCTION ? 'MongoDB (Production)' : 'Fichiers locaux (Dev)'}`);


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
 * @returns {Object} - { filePath, fileSize, storageType }
 */
async function saveFileContent(dataUrl, originalFileName) {
    if (!dataUrl || typeof dataUrl !== 'string') {
        throw new Error('Contenu du fichier invalide');
    }

    // Extraire le contenu base64 et le type MIME
    let base64Data;
    let mimeType = 'application/octet-stream';

    if (dataUrl.startsWith('data:')) {
        const parts = dataUrl.split(',');
        if (parts.length !== 2) {
            throw new Error('Format data URL invalide');
        }
        // Extraire le type MIME: data:image/png;base64
        const mimeMatch = parts[0].match(/data:([^;]+)/);
        if (mimeMatch) {
            mimeType = mimeMatch[1];
        }
        base64Data = parts[1];
    } else {
        base64Data = dataUrl;
    }

    // Décoder le base64 en buffer binaire
    const buffer = Buffer.from(base64Data, 'base64');

    // Générer un nom unique
    const uniqueFileName = generateUniqueFileName(originalFileName);

    if (IS_PRODUCTION) {
        // PRODUCTION: Stocker dans MongoDB
        await initMongoStorage();

        if (fileCollection) {
            await fileCollection.insertOne({
                fileName: uniqueFileName,
                originalName: originalFileName,
                mimeType: mimeType,
                content: base64Data, // Stocker en base64
                size: buffer.length,
                createdAt: new Date()
            });

            console.log(`💾 [MongoDB] Fichier sauvegardé: ${uniqueFileName} (${(buffer.length / 1024).toFixed(2)} KB)`);

            return {
                filePath: uniqueFileName,
                fileSize: buffer.length,
                storageType: 'mongodb'
            };
        } else {
            // Fallback: stocker le contenu complet (moins optimal)
            console.log(`⚠️ MongoDB non disponible, retour contenu inline`);
            return {
                filePath: null,
                fileSize: buffer.length,
                storageType: 'inline',
                inlineContent: dataUrl
            };
        }
    } else {
        // DÉVELOPPEMENT: Stocker sur le système de fichiers
        ensureStorageDir();

        const filePath = path.join(STORAGE_DIR, uniqueFileName);
        fs.writeFileSync(filePath, buffer);

        console.log(`💾 [FS] Fichier sauvegardé: ${uniqueFileName} (${(buffer.length / 1024).toFixed(2)} KB)`);

        return {
            filePath: uniqueFileName,
            fileSize: buffer.length,
            storageType: 'filesystem'
        };
    }
}

/**
 * Charger le contenu d'un fichier et le retourner en data URL
 * @param {string} filePath - Chemin relatif du fichier
 * @param {string} mimeType - Type MIME du fichier
 * @returns {string} - Data URL (data:mime;base64,...)
 */
async function loadFileContent(filePath, mimeType) {
    if (!filePath) {
        throw new Error('Chemin de fichier non spécifié');
    }

    if (IS_PRODUCTION) {
        // PRODUCTION: Charger depuis MongoDB
        await initMongoStorage();

        if (fileCollection) {
            const file = await fileCollection.findOne({ fileName: filePath });
            if (!file) {
                throw new Error(`Fichier non trouvé: ${filePath}`);
            }
            return `data:${file.mimeType || mimeType || 'application/octet-stream'};base64,${file.content}`;
        } else {
            throw new Error(`Stockage MongoDB non disponible`);
        }
    } else {
        // DÉVELOPPEMENT: Charger depuis le système de fichiers
        const fullPath = path.join(STORAGE_DIR, filePath);

        if (!fs.existsSync(fullPath)) {
            throw new Error(`Fichier non trouvé: ${filePath}`);
        }

        const buffer = fs.readFileSync(fullPath);
        const base64 = buffer.toString('base64');

        return `data:${mimeType || 'application/octet-stream'};base64,${base64}`;
    }
}

/**
 * Charger le contenu brut (buffer) pour streaming
 * @param {string} filePath - Chemin relatif du fichier
 * @returns {Buffer}
 */
async function loadFileBuffer(filePath) {
    if (!filePath) {
        throw new Error('Chemin de fichier non spécifié');
    }

    if (IS_PRODUCTION) {
        // PRODUCTION: Charger depuis MongoDB
        await initMongoStorage();

        if (fileCollection) {
            const file = await fileCollection.findOne({ fileName: filePath });
            if (!file) {
                throw new Error(`Fichier non trouvé: ${filePath}`);
            }
            return Buffer.from(file.content, 'base64');
        } else {
            throw new Error(`Stockage MongoDB non disponible`);
        }
    } else {
        // DÉVELOPPEMENT: Charger depuis le système de fichiers
        const fullPath = path.join(STORAGE_DIR, filePath);

        if (!fs.existsSync(fullPath)) {
            throw new Error(`Fichier non trouvé: ${filePath}`);
        }

        return fs.readFileSync(fullPath);
    }
}

/**
 * Supprimer un fichier
 * @param {string} filePath - Chemin relatif du fichier
 */
async function deleteFile(filePath) {
    if (!filePath) return;

    if (IS_PRODUCTION) {
        await initMongoStorage();
        if (fileCollection) {
            await fileCollection.deleteOne({ fileName: filePath });
            console.log(`🗑️ [MongoDB] Fichier supprimé: ${filePath}`);
        }
    } else {
        const fullPath = path.join(STORAGE_DIR, filePath);
        if (fs.existsSync(fullPath)) {
            fs.unlinkSync(fullPath);
            console.log(`🗑️ [FS] Fichier supprimé: ${filePath}`);
        }
    }
}

/**
 * Vérifier si un fichier existe
 * @param {string} filePath - Chemin relatif du fichier
 * @returns {boolean}
 */
async function fileExists(filePath) {
    if (!filePath) return false;

    if (IS_PRODUCTION) {
        await initMongoStorage();
        if (fileCollection) {
            const file = await fileCollection.findOne({ fileName: filePath });
            return !!file;
        }
        return false;
    } else {
        const fullPath = path.join(STORAGE_DIR, filePath);
        return fs.existsSync(fullPath);
    }
}

/**
 * Obtenir la taille d'un fichier
 * @param {string} filePath - Chemin relatif du fichier
 * @returns {number} - Taille en octets
 */
async function getFileSize(filePath) {
    if (!filePath) return 0;

    if (IS_PRODUCTION) {
        await initMongoStorage();
        if (fileCollection) {
            const file = await fileCollection.findOne({ fileName: filePath });
            return file ? file.size : 0;
        }
        return 0;
    } else {
        const fullPath = path.join(STORAGE_DIR, filePath);
        if (!fs.existsSync(fullPath)) return 0;
        return fs.statSync(fullPath).size;
    }
}

/**
 * Obtenir les statistiques du stockage
 * @returns {Object} - { totalFiles, totalSizeBytes, totalSizeMB }
 */
async function getStorageStats() {
    if (IS_PRODUCTION) {
        await initMongoStorage();
        if (fileCollection) {
            const stats = await fileCollection.aggregate([
                { $group: { _id: null, totalSize: { $sum: '$size' }, count: { $sum: 1 } } }
            ]).toArray();

            const result = stats[0] || { totalSize: 0, count: 0 };
            return {
                totalFiles: result.count,
                totalSizeBytes: result.totalSize,
                totalSizeMB: (result.totalSize / (1024 * 1024)).toFixed(2),
                storageType: 'mongodb'
            };
        }
        return { totalFiles: 0, totalSizeBytes: 0, totalSizeMB: '0', storageType: 'mongodb' };
    } else {
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
            storagePath: STORAGE_DIR,
            storageType: 'filesystem'
        };
    }
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
