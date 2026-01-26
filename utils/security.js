// ============================================
// UTILITAIRES DE SÉCURITÉ
// Fonctions réutilisables pour prévenir les vulnérabilités
// ============================================

const { ObjectId } = require('mongodb');

/**
 * Échapper les caractères HTML pour prévenir XSS
 * @param {string} str - Chaîne à échapper
 * @returns {string} - Chaîne échappée
 */
function escapeHtml(str) {
    if (typeof str !== 'string') {
        return str;
    }

    const htmlEscapes = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#x27;',
        '/': '&#x2F;'
    };

    return str.replace(/[&<>"'\/]/g, char => htmlEscapes[char]);
}

/**
 * Valider un ObjectId MongoDB
 * @param {string} id - ID à valider
 * @returns {boolean} - true si valide
 */
function isValidObjectId(id) {
    if (!id) return false;

    // Vérifier le format hexadécimal 24 caractères
    if (!/^[0-9a-fA-F]{24}$/.test(id)) {
        return false;
    }

    // Vérifier avec MongoDB ObjectId
    try {
        return ObjectId.isValid(id);
    } catch (error) {
        return false;
    }
}

/**
 * Échapper les caractères spéciaux pour regex (prévention ReDoS)
 * @param {string} str - Chaîne à échapper
 * @returns {string} - Chaîne échappée pour regex
 */
function escapeRegex(str) {
    if (typeof str !== 'string') {
        return '';
    }

    // Échapper tous les caractères spéciaux regex
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Valider et sanitizer un nom de fichier
 * @param {string} filename - Nom du fichier
 * @returns {string|null} - Nom sanitizé ou null si invalide
 */
function sanitizeFilename(filename) {
    if (!filename || typeof filename !== 'string') {
        return null;
    }

    // Supprimer les caractères dangereux
    let sanitized = filename
        .replace(/[<>:"|?*\x00-\x1f]/g, '') // Caractères Windows interdits
        .replace(/\.\./g, '') // Path traversal
        .replace(/^\.+/, '') // Fichiers cachés
        .trim();

    // Limiter la longueur
    if (sanitized.length > 255) {
        sanitized = sanitized.substring(0, 255);
    }

    // Vérifier qu'il reste quelque chose
    if (sanitized.length === 0) {
        return null;
    }

    return sanitized;
}

/**
 * Valider une adresse email
 * @param {string} email - Email à valider
 * @returns {boolean} - true si valide
 */
function isValidEmail(email) {
    if (!email || typeof email !== 'string') {
        return false;
    }

    // Regex RFC 5322 simplifié
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(email)) {
        return false;
    }

    // Longueur maximale
    if (email.length > 254) {
        return false;
    }

    // Domaines jetables blacklistés (exemple)
    const disposableDomains = [
        'tempmail.com', 'guerrillamail.com', '10minutemail.com',
        'throwaway.email', 'mailinator.com'
    ];

    const domain = email.split('@')[1].toLowerCase();
    if (disposableDomains.includes(domain)) {
        return false;
    }

    return true;
}

/**
 * Limiter la longueur d'une chaîne pour éviter les attaques DoS
 * @param {string} str - Chaîne à limiter
 * @param {number} maxLength - Longueur maximale
 * @returns {string} - Chaîne tronquée
 */
function limitStringLength(str, maxLength = 1000) {
    if (typeof str !== 'string') {
        return '';
    }

    if (str.length > maxLength) {
        return str.substring(0, maxLength);
    }

    return str;
}

/**
 * Valider un username (alphanumérique + underscore)
 * @param {string} username - Username à valider
 * @returns {boolean} - true si valide
 */
function isValidUsername(username) {
    if (!username || typeof username !== 'string') {
        return false;
    }

    // 3-50 caractères, alphanumérique + underscore uniquement
    const usernameRegex = /^[a-zA-Z0-9_]{3,50}$/;

    return usernameRegex.test(username);
}

/**
 * Créer un regex sécurisé pour recherche
 * @param {string} searchTerm - Terme de recherche
 * @param {string} options - Options regex (ex: 'i' pour insensible à la casse)
 * @returns {RegExp} - Regex sécurisé
 */
function createSafeRegex(searchTerm, options = 'i') {
    if (!searchTerm || typeof searchTerm !== 'string') {
        return new RegExp('', options);
    }

    // Limiter la longueur pour éviter ReDoS
    const limitedTerm = limitStringLength(searchTerm, 100);

    // Échapper les caractères spéciaux
    const escapedTerm = escapeRegex(limitedTerm);

    try {
        return new RegExp(escapedTerm, options);
    } catch (error) {
        console.error('❌ Erreur création regex:', error);
        return new RegExp('', options);
    }
}

/**
 * Valider et convertir en ObjectId sécurisé
 * @param {string} id - ID à convertir
 * @returns {ObjectId|null} - ObjectId ou null si invalide
 */
function toSafeObjectId(id) {
    if (!isValidObjectId(id)) {
        return null;
    }

    try {
        return new ObjectId(id);
    } catch (error) {
        return null;
    }
}

module.exports = {
    escapeHtml,
    isValidObjectId,
    escapeRegex,
    sanitizeFilename,
    isValidEmail,
    limitStringLength,
    isValidUsername,
    createSafeRegex,
    toSafeObjectId
};
