/**
 * SERVICE DE STOCKAGE CLOUD (S3/MinIO)
 * Alternative au stockage local pour serveurs de production
 *
 * MinIO = S3 compatible, peut être auto-hébergé sur le serveur UCAD
 *
 * Installation MinIO:
 *   wget https://dl.min.io/server/minio/release/linux-amd64/minio
 *   chmod +x minio
 *   ./minio server /data/archivage
 */

const { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const crypto = require('crypto');
const path = require('path');

// Configuration - À adapter pour UCAD
const CONFIG = {
    // Pour MinIO auto-hébergé sur le serveur UCAD
    endpoint: process.env.S3_ENDPOINT || 'http://localhost:9000',
    region: process.env.S3_REGION || 'us-east-1',
    credentials: {
        accessKeyId: process.env.S3_ACCESS_KEY || 'minioadmin',
        secretAccessKey: process.env.S3_SECRET_KEY || 'minioadmin'
    },
    bucket: process.env.S3_BUCKET || 'archivage-cerer'
};

// Client S3
const s3Client = new S3Client({
    endpoint: CONFIG.endpoint,
    region: CONFIG.region,
    credentials: CONFIG.credentials,
    forcePathStyle: true // Nécessaire pour MinIO
});

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
 * Sauvegarder un fichier dans S3/MinIO
 */
async function saveFileContent(dataUrl, originalFileName) {
    if (!dataUrl || typeof dataUrl !== 'string') {
        throw new Error('Contenu du fichier invalide');
    }

    // Extraire le contenu base64
    let base64Data;
    let mimeType = 'application/octet-stream';

    if (dataUrl.startsWith('data:')) {
        const matches = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
        if (matches) {
            mimeType = matches[1];
            base64Data = matches[2];
        } else {
            base64Data = dataUrl.split(',')[1];
        }
    } else {
        base64Data = dataUrl;
    }

    const buffer = Buffer.from(base64Data, 'base64');
    const uniqueFileName = generateUniqueFileName(originalFileName);

    // Upload vers S3/MinIO
    await s3Client.send(new PutObjectCommand({
        Bucket: CONFIG.bucket,
        Key: uniqueFileName,
        Body: buffer,
        ContentType: mimeType
    }));

    console.log(`☁️ Fichier uploadé vers cloud: ${uniqueFileName} (${(buffer.length / 1024).toFixed(2)} KB)`);

    return {
        filePath: uniqueFileName,
        fileSize: buffer.length
    };
}

/**
 * Charger un fichier depuis S3/MinIO
 */
async function loadFileContent(filePath, mimeType) {
    const response = await s3Client.send(new GetObjectCommand({
        Bucket: CONFIG.bucket,
        Key: filePath
    }));

    // Convertir le stream en buffer
    const chunks = [];
    for await (const chunk of response.Body) {
        chunks.push(chunk);
    }
    const buffer = Buffer.concat(chunks);
    const base64 = buffer.toString('base64');

    console.log(`☁️ Fichier téléchargé depuis cloud: ${filePath}`);

    return `data:${mimeType || 'application/octet-stream'};base64,${base64}`;
}

/**
 * Charger le buffer brut
 */
async function loadFileBuffer(filePath) {
    const response = await s3Client.send(new GetObjectCommand({
        Bucket: CONFIG.bucket,
        Key: filePath
    }));

    const chunks = [];
    for await (const chunk of response.Body) {
        chunks.push(chunk);
    }
    return Buffer.concat(chunks);
}

/**
 * Supprimer un fichier
 */
async function deleteFile(filePath) {
    if (!filePath) return;

    await s3Client.send(new DeleteObjectCommand({
        Bucket: CONFIG.bucket,
        Key: filePath
    }));

    console.log(`☁️ Fichier supprimé du cloud: ${filePath}`);
}

/**
 * Vérifier si un fichier existe
 */
async function fileExists(filePath) {
    if (!filePath) return false;

    try {
        await s3Client.send(new GetObjectCommand({
            Bucket: CONFIG.bucket,
            Key: filePath
        }));
        return true;
    } catch (error) {
        return false;
    }
}

module.exports = {
    saveFileContent,
    loadFileContent,
    loadFileBuffer,
    deleteFile,
    fileExists
};
