// ============================================
// SERVICE DE LIENS TEMPORAIRES POUR DOCUMENTS
// Permet de créer des URLs temporaires pour Office Online Viewer
// ============================================

const crypto = require('crypto');

/**
 * Stockage en mémoire des tokens temporaires
 * Structure: { token: { documentData, expiresAt, userId } }
 */
const tempLinks = new Map();

/**
 * Configuration
 */
const CONFIG = {
    TOKEN_LENGTH: 32,           // Longueur du token en caractères
    EXPIRATION_TIME: 10 * 60 * 1000, // 10 minutes en millisecondes
    CLEANUP_INTERVAL: 5 * 60 * 1000  // Nettoyage toutes les 5 minutes
};

/**
 * Générer un token aléatoire sécurisé
 */
function generateToken() {
    return crypto.randomBytes(CONFIG.TOKEN_LENGTH).toString('hex');
}

/**
 * Créer un lien temporaire pour un document
 * @param {Object} documentData - Données du document (contenu, nomFichier, type, etc.)
 * @param {string} userId - ID de l'utilisateur propriétaire
 * @returns {string} - Token généré
 */
function createTempLink(documentData, userId) {
    const token = generateToken();
    const expiresAt = Date.now() + CONFIG.EXPIRATION_TIME;

    tempLinks.set(token, {
        documentData,
        userId,
        expiresAt,
        createdAt: new Date()
    });

    console.log(`🔗 Lien temporaire créé: ${token} (expire dans ${CONFIG.EXPIRATION_TIME / 1000}s)`);

    return token;
}

/**
 * Récupérer un document via son token
 * @param {string} token - Token du lien temporaire
 * @returns {Object|null} - Données du document ou null si invalide/expiré
 */
function getTempLink(token) {
    const link = tempLinks.get(token);

    if (!link) {
        console.log(`⚠️ Token introuvable: ${token}`);
        return null;
    }

    // Vérifier l'expiration
    if (Date.now() > link.expiresAt) {
        console.log(`⏰ Token expiré: ${token}`);
        tempLinks.delete(token);
        return null;
    }

    console.log(`✅ Token valide: ${token}`);
    return link;
}

/**
 * Supprimer un token manuellement
 * @param {string} token - Token à supprimer
 */
function deleteTempLink(token) {
    const deleted = tempLinks.delete(token);
    if (deleted) {
        console.log(`🗑️ Token supprimé: ${token}`);
    }
    return deleted;
}

/**
 * Nettoyer les tokens expirés
 */
function cleanupExpiredLinks() {
    const now = Date.now();
    let cleaned = 0;

    for (const [token, link] of tempLinks.entries()) {
        if (now > link.expiresAt) {
            tempLinks.delete(token);
            cleaned++;
        }
    }

    if (cleaned > 0) {
        console.log(`🧹 Nettoyage: ${cleaned} token(s) expiré(s) supprimé(s)`);
    }
}

/**
 * Obtenir les statistiques
 */
function getStats() {
    return {
        activeLinks: tempLinks.size,
        expirationTime: CONFIG.EXPIRATION_TIME / 1000, // en secondes
    };
}

// ============================================
// DÉMARRAGE DU NETTOYAGE AUTOMATIQUE
// ============================================
const cleanupInterval = setInterval(cleanupExpiredLinks, CONFIG.CLEANUP_INTERVAL);

// Empêcher le processus de rester ouvert à cause de l'interval
cleanupInterval.unref();

console.log('🔗 Service de liens temporaires initialisé');
console.log(`⏰ Expiration: ${CONFIG.EXPIRATION_TIME / 1000}s | Nettoyage: ${CONFIG.CLEANUP_INTERVAL / 1000}s`);

module.exports = {
    createTempLink,
    getTempLink,
    deleteTempLink,
    getStats
};
