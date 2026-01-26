// ============================================
// GÉNÉRATEUR D'ID UNIQUE POUR LES DOCUMENTS
// ============================================

/**
 * Génère un ID UNIQUE avec HMST (Heure-Minute-Seconde-Tierce)
 * Format: DOC-YYYYMMDD-HHMMSSTTT-RRRR
 * - YYYYMMDD: Date complète
 * - HH: Heures (00-23)
 * - MM: Minutes (00-59)
 * - SS: Secondes (00-59)
 * - TTT: Millisecondes (000-999) - "Tierce"
 * - RRRR: Identifiant aléatoire sur 4 chiffres pour garantir l'unicité absolue
 *
 * @param {Collection} documentsCollection - Collection MongoDB des documents
 * @returns {Promise<string>} - ID unique généré
 */
async function generateDocumentId(documentsCollection) {
    let attempts = 0;
    const maxAttempts = 10;

    while (attempts < maxAttempts) {
        const now = new Date();

        // Date: YYYYMMDD
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const datePrefix = `${year}${month}${day}`;

        // Heure: HHMMSSTTT (Heure-Minute-Seconde-Tierce/Millisecondes)
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        const seconds = String(now.getSeconds()).padStart(2, '0');
        const milliseconds = String(now.getMilliseconds()).padStart(3, '0');
        const hmst = `${hours}${minutes}${seconds}${milliseconds}`;

        // Identifiant aléatoire pour garantir l'unicité absolue
        const randomId = String(Math.floor(Math.random() * 10000)).padStart(4, '0');

        const documentId = `DOC-${datePrefix}-${hmst}-${randomId}`;

        // Vérifier que cet ID n'existe pas déjà dans la base
        const existingDoc = await documentsCollection.findOne({ idDocument: documentId });

        if (!existingDoc) {
            console.log(`✅ ID unique généré: ${documentId}`);
            return documentId;
        }

        // Si collision (très rare), réessayer
        attempts++;
        console.log(`⚠️ Collision ID document (tentative ${attempts}/${maxAttempts})`);

        // Petite pause pour éviter les collisions en rafale
        await new Promise(resolve => setTimeout(resolve, 10));
    }

    // Si après 10 tentatives on n'a pas trouvé d'ID unique, utiliser timestamp + UUID partiel
    const timestamp = Date.now();
    const uuid = Math.random().toString(36).substring(2, 8).toUpperCase();
    const fallbackId = `DOC-${timestamp}-${uuid}`;
    console.log(`⚠️ Utilisation ID de secours: ${fallbackId}`);
    return fallbackId;
}

/**
 * Génère un ID UNIQUE pour les dossiers avec HMST (Heure-Minute-Seconde-Tierce)
 * Format: DOS-YYYYMMDD-HHMMSSTTT-RRRR
 * - DOS: Préfixe pour Dossier
 * - YYYYMMDD: Date complète
 * - HH: Heures (00-23)
 * - MM: Minutes (00-59)
 * - SS: Secondes (00-59)
 * - TTT: Millisecondes (000-999) - "Tierce"
 * - RRRR: Identifiant aléatoire sur 4 chiffres pour garantir l'unicité absolue
 *
 * @param {Collection} dossiersCollection - Collection MongoDB des dossiers
 * @returns {Promise<string>} - ID unique généré
 */
async function generateDossierId(dossiersCollection) {
    let attempts = 0;
    const maxAttempts = 10;

    while (attempts < maxAttempts) {
        const now = new Date();

        // Date: YYYYMMDD
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const datePrefix = `${year}${month}${day}`;

        // Heure: HHMMSSTTT (Heure-Minute-Seconde-Tierce/Millisecondes)
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        const seconds = String(now.getSeconds()).padStart(2, '0');
        const milliseconds = String(now.getMilliseconds()).padStart(3, '0');
        const hmst = `${hours}${minutes}${seconds}${milliseconds}`;

        // Identifiant aléatoire pour garantir l'unicité absolue
        const randomId = String(Math.floor(Math.random() * 10000)).padStart(4, '0');

        const dossierId = `DOS-${datePrefix}-${hmst}-${randomId}`;

        // Vérifier que cet ID n'existe pas déjà dans la base
        const existingDossier = await dossiersCollection.findOne({ idDossier: dossierId });

        if (!existingDossier) {
            console.log(`✅ ID dossier unique généré: ${dossierId}`);
            return dossierId;
        }

        // Si collision (très rare), réessayer
        attempts++;
        console.log(`⚠️ Collision ID dossier (tentative ${attempts}/${maxAttempts})`);

        // Petite pause pour éviter les collisions en rafale
        await new Promise(resolve => setTimeout(resolve, 10));
    }

    // Si après 10 tentatives on n'a pas trouvé d'ID unique, utiliser timestamp + UUID partiel
    const timestamp = Date.now();
    const uuid = Math.random().toString(36).substring(2, 8).toUpperCase();
    const fallbackId = `DOS-${timestamp}-${uuid}`;
    console.log(`⚠️ Utilisation ID de secours: ${fallbackId}`);
    return fallbackId;
}

/**
 * Génère un ID unique pour un fichier dans un dossier (ancien format)
 * Format: F-XXXX (4 caractères alphanumériques)
 * @returns {string} - ID unique du fichier
 * @deprecated Utiliser generateDocumentIdInDossier pour les nouveaux documents
 */
function generateFichierId() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let id = 'F-';
    for (let i = 0; i < 4; i++) {
        id += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return id;
}

/**
 * Génère un ID UNIQUE pour un document dans un dossier avec liaison
 * Format: DOC-YYYYMMDD-HHMMSSTTT-RRRR.DXXXX
 * - DOC: Préfixe pour Document
 * - YYYYMMDD: Date d'archivage du document
 * - HHMMSSTTT: Heure-Minute-Seconde-Tierce (millisecondes)
 * - RRRR: Identifiant aléatoire sur 4 chiffres
 * - .DXXXX: Liaison au dossier (4 derniers chiffres de l'ID dossier)
 *
 * @param {string} dossierId - ID complet du dossier parent (ex: DOS-20260124-143052789-4521)
 * @returns {string} - ID unique du document avec liaison au dossier
 */
function generateDocumentIdInDossier(dossierId) {
    const now = new Date();

    // Date: YYYYMMDD
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const datePrefix = `${year}${month}${day}`;

    // Heure: HHMMSSTTT (Heure-Minute-Seconde-Tierce/Millisecondes)
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    const milliseconds = String(now.getMilliseconds()).padStart(3, '0');
    const hmst = `${hours}${minutes}${seconds}${milliseconds}`;

    // Identifiant aléatoire pour garantir l'unicité absolue
    const randomId = String(Math.floor(Math.random() * 10000)).padStart(4, '0');

    // Extraire les 4 derniers chiffres de l'ID dossier
    const dossierSuffix = extractDossierSuffix(dossierId);

    const documentId = `DOC-${datePrefix}-${hmst}-${randomId}.D${dossierSuffix}`;

    console.log(`✅ ID document généré: ${documentId} (lié au dossier ...${dossierSuffix})`);
    return documentId;
}

/**
 * Extraire les 4 derniers chiffres d'un ID dossier
 * @param {string} dossierId - ID complet du dossier (ex: DOS-20260124-143052789-4521)
 * @returns {string} - Les 4 derniers chiffres (ex: 4521)
 */
function extractDossierSuffix(dossierId) {
    // Format: DOS-YYYYMMDD-HHMMSSTTT-RRRR
    // On extrait RRRR (les 4 derniers chiffres)
    const match = dossierId.match(/-(\d{4})$/);
    if (match) {
        return match[1];
    }
    // Fallback: prendre les 4 derniers caractères
    return dossierId.slice(-4);
}

/**
 * Extraire la date de création depuis un ID document
 * @param {string} documentId - ID du document (ex: DOC-20260127-091530456-1234.D4521)
 * @returns {string|null} - La date au format YYYYMMDD ou null
 */
function extractDocumentDate(documentId) {
    const match = documentId.match(/DOC-(\d{8})-/);
    return match ? match[1] : null;
}

/**
 * Extraire le suffixe du dossier depuis un ID document
 * @param {string} documentId - ID du document (ex: DOC-20260127-091530456-1234.D4521)
 * @returns {string|null} - Le suffixe du dossier (ex: 4521) ou null
 */
function extractDossierSuffixFromDocumentId(documentId) {
    const match = documentId.match(/\.D(\d{4})$/);
    return match ? match[1] : null;
}

/**
 * Formater une date YYYYMMDD en format lisible
 * @param {string} dateStr - Date au format YYYYMMDD
 * @returns {string} - Date formatée (ex: 27/01/2026)
 */
function formatDateFromId(dateStr) {
    if (!dateStr || dateStr.length !== 8) return dateStr;
    const year = dateStr.substring(0, 4);
    const month = dateStr.substring(4, 6);
    const day = dateStr.substring(6, 8);
    return `${day}/${month}/${year}`;
}

module.exports = {
    generateDocumentId,
    generateDossierId,
    generateFichierId,
    generateDocumentIdInDossier,
    extractDossierSuffix,
    extractDocumentDate,
    extractDossierSuffixFromDocumentId,
    formatDateFromId
};
