// ============================================
// CONFIGURATION DES DOMAINES EMAIL AUTORISÉS
// Plateforme GED - Universités Sénégalaises
// ============================================

/**
 * Liste des domaines email autorisés pour l'inscription
 * Format: domaine.extension
 * Les sous-domaines sont automatiquement acceptés (ex: rh.ucad.sn)
 */
const ALLOWED_DOMAINS = [
    // Université Cheikh Anta Diop de Dakar (UCAD)
    'ucad.sn',
    'ucad.edu.sn',
    'fastef.ucad.sn',
    'esp.sn',
    'ucad-esp.sn',

    // Université Gaston Berger de Saint-Louis (UGB)
    'ugb.sn',
    'ugb.edu.sn',

    // Université Alioune Diop de Bambey (UADB)
    'uadb.edu.sn',
    'uadb.sn',

    // Université Sine Saloum El Hadji Ibrahima Niass (USSEIN)
    'ussein.sn',
    'ussein.edu.sn',

    // Université Iba Der Thiam de Thiès (UIDT)
    'uidt.sn',
    'uidt.edu.sn',

    // Université de Thiès
    'univ-thies.sn',

    // Université Assane Seck de Ziguinchor (UASZ)
    'uasz.sn',
    'uasz.edu.sn'
];

/**
 * Noms complets des universités par domaine
 * Utilisé pour afficher le nom de l'université lors de la validation
 */
const UNIVERSITY_NAMES = {
    'ucad.sn': 'Université Cheikh Anta Diop de Dakar',
    'ucad.edu.sn': 'Université Cheikh Anta Diop de Dakar',
    'fastef.ucad.sn': 'FASTEF - UCAD',
    'esp.sn': 'École Supérieure Polytechnique - UCAD',
    'ucad-esp.sn': 'École Supérieure Polytechnique - UCAD',
    'ugb.sn': 'Université Gaston Berger de Saint-Louis',
    'ugb.edu.sn': 'Université Gaston Berger de Saint-Louis',
    'uadb.edu.sn': 'Université Alioune Diop de Bambey',
    'uadb.sn': 'Université Alioune Diop de Bambey',
    'ussein.sn': 'Université Sine Saloum El Hadji Ibrahima Niass',
    'ussein.edu.sn': 'Université Sine Saloum El Hadji Ibrahima Niass',
    'uidt.sn': 'Université Iba Der Thiam de Thiès',
    'uidt.edu.sn': 'Université Iba Der Thiam de Thiès',
    'univ-thies.sn': 'Université de Thiès',
    'uasz.sn': 'Université Assane Seck de Ziguinchor',
    'uasz.edu.sn': 'Université Assane Seck de Ziguinchor'
};

/**
 * Suggère un domaine valide si l'utilisateur a fait une faute de frappe
 * Utilise la distance de Levenshtein pour trouver le domaine le plus proche
 */
function suggestDomain(invalidDomain) {
    // Convertir en minuscules
    const domain = invalidDomain.toLowerCase();

    // Vérifications rapides pour erreurs courantes
    const commonMistakes = {
        'ucad.com': 'ucad.sn',
        'ucad.org': 'ucad.sn',
        'ugb.com': 'ugb.sn',
        'ugb.org': 'ugb.sn',
        'uadb.com': 'uadb.edu.sn',
        'gmail.com': null,
        'yahoo.fr': null,
        'hotmail.com': null,
        'outlook.com': null
    };

    if (commonMistakes[domain] !== undefined) {
        return commonMistakes[domain];
    }

    // Calcul de distance de Levenshtein simplifié
    let closestDomain = null;
    let minDistance = Infinity;

    for (const allowedDomain of ALLOWED_DOMAINS) {
        const distance = levenshteinDistance(domain, allowedDomain);

        // Si la distance est petite (< 3), c'est probablement une faute de frappe
        if (distance < minDistance && distance <= 3) {
            minDistance = distance;
            closestDomain = allowedDomain;
        }
    }

    return closestDomain;
}

/**
 * Calcule la distance de Levenshtein entre deux chaînes
 * (nombre minimum d'éditions pour passer de s1 à s2)
 */
function levenshteinDistance(s1, s2) {
    const len1 = s1.length;
    const len2 = s2.length;
    const matrix = [];

    // Initialisation de la matrice
    for (let i = 0; i <= len1; i++) {
        matrix[i] = [i];
    }
    for (let j = 0; j <= len2; j++) {
        matrix[0][j] = j;
    }

    // Calcul des distances
    for (let i = 1; i <= len1; i++) {
        for (let j = 1; j <= len2; j++) {
            const cost = s1[i - 1] === s2[j - 1] ? 0 : 1;
            matrix[i][j] = Math.min(
                matrix[i - 1][j] + 1,      // Suppression
                matrix[i][j - 1] + 1,      // Insertion
                matrix[i - 1][j - 1] + cost // Substitution
            );
        }
    }

    return matrix[len1][len2];
}

/**
 * Extrait le domaine d'une adresse email
 * Exemples:
 *   amadou.diop@ucad.sn → ucad.sn
 *   fatou@rh.ugb.sn → rh.ugb.sn
 */
function extractDomain(email) {
    if (!email || typeof email !== 'string') {
        return null;
    }

    const parts = email.trim().toLowerCase().split('@');
    if (parts.length !== 2) {
        return null;
    }

    return parts[1];
}

/**
 * Vérifie si un domaine est autorisé
 * Gère les sous-domaines (ex: rh.ucad.sn est valide car ucad.sn est autorisé)
 */
function isDomainAllowed(domain) {
    if (!domain) {
        return false;
    }

    const normalizedDomain = domain.toLowerCase().trim();

    // Vérification exacte
    if (ALLOWED_DOMAINS.includes(normalizedDomain)) {
        return true;
    }

    // Vérification des sous-domaines
    // Ex: rh.ucad.sn → vérifier si se termine par .ucad.sn
    for (const allowedDomain of ALLOWED_DOMAINS) {
        if (normalizedDomain.endsWith('.' + allowedDomain)) {
            return true;
        }
    }

    return false;
}

/**
 * Obtient le nom de l'université à partir du domaine
 */
function getUniversityName(domain) {
    if (!domain) {
        return null;
    }

    const normalizedDomain = domain.toLowerCase().trim();

    // Vérification exacte
    if (UNIVERSITY_NAMES[normalizedDomain]) {
        return UNIVERSITY_NAMES[normalizedDomain];
    }

    // Vérification pour les sous-domaines
    for (const [allowedDomain, universityName] of Object.entries(UNIVERSITY_NAMES)) {
        if (normalizedDomain.endsWith('.' + allowedDomain) || normalizedDomain === allowedDomain) {
            return universityName;
        }
    }

    return null;
}

/**
 * Valide une adresse email complète
 * Retourne un objet avec le résultat de la validation
 */
function validateUniversityEmail(email) {
    // Validation de base
    if (!email || typeof email !== 'string') {
        return {
            valid: false,
            error: 'Email requis',
            code: 'EMAIL_REQUIRED'
        };
    }

    // Extraction du domaine
    const domain = extractDomain(email);
    if (!domain) {
        return {
            valid: false,
            error: 'Format d\'email invalide',
            code: 'INVALID_FORMAT'
        };
    }

    // Vérification du domaine
    if (!isDomainAllowed(domain)) {
        const suggestion = suggestDomain(domain);

        return {
            valid: false,
            error: 'Cette plateforme est réservée aux universités sénégalaises',
            code: 'INVALID_DOMAIN',
            domain: domain,
            allowedDomains: ALLOWED_DOMAINS,
            suggestion: suggestion
        };
    }

    // Email valide
    return {
        valid: true,
        domain: domain,
        university: getUniversityName(domain),
        message: `✓ Université reconnue : ${getUniversityName(domain)}`
    };
}

module.exports = {
    ALLOWED_DOMAINS,
    UNIVERSITY_NAMES,
    extractDomain,
    isDomainAllowed,
    getUniversityName,
    suggestDomain,
    validateUniversityEmail
};
