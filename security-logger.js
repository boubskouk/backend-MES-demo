// ============================================
// SYSTÈME DE LOGS DE SÉCURITÉ - GED CERER
// ============================================

// Niveaux de gravité
const SEVERITY = {
    INFO: 'INFO',           // Vert - Actions normales, erreurs mineures
    WARNING: 'WARNING',     // Orange - Comportement suspect
    CRITICAL: 'CRITICAL'    // Rouge - Menace sécurité, violations graves
};

// Types d'événements de sécurité pour GED
const EVENT_TYPES = {
    // Authentification
    LOGIN_FAILED: 'LOGIN_FAILED',
    LOGIN_FAILED_REPEATED: 'LOGIN_FAILED_REPEATED', // 3+ tentatives
    LOGIN_SUCCESS: 'LOGIN_SUCCESS',
    LOGOUT: 'LOGOUT',

    // Session
    SESSION_VIOLATION: 'SESSION_VIOLATION', // Multi-session détectée
    SESSION_EXPIRED: 'SESSION_EXPIRED',
    SESSION_HIJACKING_ATTEMPT: 'SESSION_HIJACKING_ATTEMPT',

    // Accès
    UNAUTHORIZED_ACCESS: 'UNAUTHORIZED_ACCESS',
    ACCESS_DENIED: 'ACCESS_DENIED',
    ADMIN_PAGE_ACCESS_BLOCKED: 'ADMIN_PAGE_ACCESS_BLOCKED',

    // Super Admin
    ADMIN_LOGIN_BLOCKED: 'ADMIN_LOGIN_BLOCKED', // Niveau 0 via page normale
    ADMIN_DELETE_ATTEMPT: 'ADMIN_DELETE_ATTEMPT', // Tentative suppression admin

    // Modifications suspectes
    UNAUTHORIZED_MODIFICATION: 'UNAUTHORIZED_MODIFICATION',
    UNAUTHORIZED_DELETION: 'UNAUTHORIZED_DELETION',
    BULK_DELETION: 'BULK_DELETION', // Suppression massive

    // Fichiers/Dossiers
    FILE_ACCESS_DENIED: 'FILE_ACCESS_DENIED',
    FILE_DOWNLOAD_SUSPICIOUS: 'FILE_DOWNLOAD_SUSPICIOUS',
    BULK_DOWNLOAD: 'BULK_DOWNLOAD', // Téléchargement massif

    // Privilèges
    PRIVILEGE_ESCALATION: 'PRIVILEGE_ESCALATION',
    ROLE_MODIFICATION_ATTEMPT: 'ROLE_MODIFICATION_ATTEMPT',

    // Activité suspecte
    SUSPICIOUS_ACTIVITY: 'SUSPICIOUS_ACTIVITY',
    RAPID_REQUESTS: 'RAPID_REQUESTS', // Trop de requêtes
    SQL_INJECTION_ATTEMPT: 'SQL_INJECTION_ATTEMPT',
    XSS_ATTEMPT: 'XSS_ATTEMPT',

    // Données
    DATA_BREACH_ATTEMPT: 'DATA_BREACH_ATTEMPT',
    SENSITIVE_DATA_ACCESS: 'SENSITIVE_DATA_ACCESS'
};

// Mapping type → gravité par défaut
const EVENT_SEVERITY_MAP = {
    // INFO (Vert)
    [EVENT_TYPES.LOGIN_SUCCESS]: SEVERITY.INFO,
    [EVENT_TYPES.LOGOUT]: SEVERITY.INFO,
    [EVENT_TYPES.SESSION_EXPIRED]: SEVERITY.INFO,
    [EVENT_TYPES.ACCESS_DENIED]: SEVERITY.INFO,

    // WARNING (Orange)
    [EVENT_TYPES.LOGIN_FAILED]: SEVERITY.WARNING,
    [EVENT_TYPES.UNAUTHORIZED_ACCESS]: SEVERITY.WARNING,
    [EVENT_TYPES.FILE_ACCESS_DENIED]: SEVERITY.WARNING,
    [EVENT_TYPES.UNAUTHORIZED_MODIFICATION]: SEVERITY.WARNING,
    [EVENT_TYPES.FILE_DOWNLOAD_SUSPICIOUS]: SEVERITY.WARNING,

    // CRITICAL (Rouge)
    [EVENT_TYPES.LOGIN_FAILED_REPEATED]: SEVERITY.CRITICAL,
    [EVENT_TYPES.SESSION_VIOLATION]: SEVERITY.CRITICAL,
    [EVENT_TYPES.SESSION_HIJACKING_ATTEMPT]: SEVERITY.CRITICAL,
    [EVENT_TYPES.ADMIN_LOGIN_BLOCKED]: SEVERITY.CRITICAL,
    [EVENT_TYPES.ADMIN_DELETE_ATTEMPT]: SEVERITY.CRITICAL,
    [EVENT_TYPES.ADMIN_PAGE_ACCESS_BLOCKED]: SEVERITY.CRITICAL,
    [EVENT_TYPES.UNAUTHORIZED_DELETION]: SEVERITY.CRITICAL,
    [EVENT_TYPES.BULK_DELETION]: SEVERITY.CRITICAL,
    [EVENT_TYPES.BULK_DOWNLOAD]: SEVERITY.CRITICAL,
    [EVENT_TYPES.PRIVILEGE_ESCALATION]: SEVERITY.CRITICAL,
    [EVENT_TYPES.ROLE_MODIFICATION_ATTEMPT]: SEVERITY.CRITICAL,
    [EVENT_TYPES.SUSPICIOUS_ACTIVITY]: SEVERITY.CRITICAL,
    [EVENT_TYPES.RAPID_REQUESTS]: SEVERITY.CRITICAL,
    [EVENT_TYPES.SQL_INJECTION_ATTEMPT]: SEVERITY.CRITICAL,
    [EVENT_TYPES.XSS_ATTEMPT]: SEVERITY.CRITICAL,
    [EVENT_TYPES.DATA_BREACH_ATTEMPT]: SEVERITY.CRITICAL,
    [EVENT_TYPES.SENSITIVE_DATA_ACCESS]: SEVERITY.CRITICAL
};

// Messages utilisateur-friendly pour chaque type avec explications détaillées
const EVENT_MESSAGES = {
    // Authentification
    [EVENT_TYPES.LOGIN_FAILED]: 'Échec de connexion - Mot de passe incorrect ou nom d\'utilisateur invalide',
    [EVENT_TYPES.LOGIN_FAILED_REPEATED]: 'ALERTE: 3+ tentatives de connexion échouées en 15 minutes - Possible attaque par force brute',
    [EVENT_TYPES.LOGIN_SUCCESS]: 'Connexion réussie - L\'utilisateur s\'est authentifié avec succès',
    [EVENT_TYPES.LOGOUT]: 'Déconnexion - L\'utilisateur a terminé sa session',

    // Session
    [EVENT_TYPES.SESSION_VIOLATION]: 'VIOLATION: Multi-session détectée - Un autre utilisateur s\'est connecté alors qu\'une session était active',
    [EVENT_TYPES.SESSION_EXPIRED]: 'Session expirée - La session a atteint sa durée maximale d\'inactivité',
    [EVENT_TYPES.SESSION_HIJACKING_ATTEMPT]: 'ALERTE: Tentative de piratage de session - L\'ID de session a été utilisé depuis une autre IP',

    // Accès
    [EVENT_TYPES.UNAUTHORIZED_ACCESS]: 'Accès refusé - L\'utilisateur a tenté d\'accéder à une ressource sans autorisation',
    [EVENT_TYPES.ACCESS_DENIED]: 'Accès bloqué - Permissions insuffisantes pour accéder à cette ressource',
    [EVENT_TYPES.ADMIN_PAGE_ACCESS_BLOCKED]: 'CRITIQUE: Accès page admin bloqué - Utilisateur non-admin a tenté d\'accéder à l\'interface d\'administration',

    // Super Admin
    [EVENT_TYPES.ADMIN_LOGIN_BLOCKED]: 'CRITIQUE: Super Admin bloqué - Tentative de connexion via la page de login standard (doit utiliser /super-admin)',
    [EVENT_TYPES.ADMIN_DELETE_ATTEMPT]: 'CRITIQUE: Tentative de suppression d\'admin - Un utilisateur a tenté de supprimer un compte Super Administrateur',

    // Modifications
    [EVENT_TYPES.UNAUTHORIZED_MODIFICATION]: 'Modification non autorisée - Tentative de modifier des données sans les permissions nécessaires',
    [EVENT_TYPES.UNAUTHORIZED_DELETION]: 'Suppression non autorisée - Tentative de supprimer des données sans les droits requis',
    [EVENT_TYPES.BULK_DELETION]: 'ALERTE: Suppression massive - Un grand nombre d\'éléments ont été supprimés en peu de temps',

    // Fichiers
    [EVENT_TYPES.FILE_ACCESS_DENIED]: 'Accès fichier refusé - L\'utilisateur n\'a pas les droits pour consulter ce document',
    [EVENT_TYPES.FILE_DOWNLOAD_SUSPICIOUS]: 'Téléchargement suspect - Pattern de téléchargement inhabituel détecté',
    [EVENT_TYPES.BULK_DOWNLOAD]: 'ALERTE: Téléchargement massif - Volume anormal de fichiers téléchargés',

    // Privilèges
    [EVENT_TYPES.PRIVILEGE_ESCALATION]: 'CRITIQUE: Élévation de privilèges - Tentative d\'obtenir des droits supérieurs de manière non autorisée',
    [EVENT_TYPES.ROLE_MODIFICATION_ATTEMPT]: 'CRITIQUE: Modification de rôle - Tentative de changer le niveau d\'accès d\'un utilisateur sans permission',

    // Activité suspecte
    [EVENT_TYPES.SUSPICIOUS_ACTIVITY]: 'ALERTE: Activité suspecte - Comportement inhabituel détecté (requêtes anormales, patterns suspects)',
    [EVENT_TYPES.RAPID_REQUESTS]: 'ALERTE: Trafic anormal - Nombre excessif de requêtes en peu de temps (possible bot ou attaque DDoS)',
    [EVENT_TYPES.SQL_INJECTION_ATTEMPT]: 'CRITIQUE: Tentative d\'injection SQL - Détection de caractères SQL malveillants dans les paramètres',
    [EVENT_TYPES.XSS_ATTEMPT]: 'CRITIQUE: Tentative d\'attaque XSS - Détection de scripts malveillants dans les données soumises',

    // Données
    [EVENT_TYPES.DATA_BREACH_ATTEMPT]: 'CRITIQUE: Tentative de fuite de données - Accès ou extraction massive de données sensibles',
    [EVENT_TYPES.SENSITIVE_DATA_ACCESS]: 'CRITIQUE: Accès données sensibles - Consultation de données confidentielles (mots de passe, tokens, etc.)'
};

// Explications détaillées pour chaque type d'événement (utilisées dans les détails)
const EVENT_EXPLANATIONS = {
    // Authentification
    [EVENT_TYPES.LOGIN_FAILED]: 'L\'utilisateur a tenté de se connecter avec des identifiants incorrects. Cela peut être une erreur de frappe ou une tentative d\'accès non autorisé.',
    [EVENT_TYPES.LOGIN_FAILED_REPEATED]: 'Plusieurs tentatives de connexion échouées détectées en peu de temps. Cela peut indiquer une attaque par force brute où un attaquant essaie de deviner le mot de passe. Action recommandée: Vérifier l\'IP source et envisager un blocage temporaire.',
    [EVENT_TYPES.LOGIN_SUCCESS]: 'Authentification réussie. L\'utilisateur a fourni des identifiants valides et une session a été créée.',
    [EVENT_TYPES.LOGOUT]: 'L\'utilisateur a volontairement terminé sa session ou a été déconnecté automatiquement par le système.',

    // Session
    [EVENT_TYPES.SESSION_VIOLATION]: 'Une nouvelle connexion a été détectée alors qu\'une session active existait déjà pour cet utilisateur. Causes possibles: (1) L\'utilisateur s\'est connecté depuis un autre appareil, (2) Partage de compte, (3) Vol de session. La première session a été automatiquement terminée.',
    [EVENT_TYPES.SESSION_EXPIRED]: 'La session a expiré suite à une période d\'inactivité prolongée. C\'est un mécanisme de sécurité normal pour protéger les comptes inactifs.',
    [EVENT_TYPES.SESSION_HIJACKING_ATTEMPT]: 'L\'ID de session a été utilisé depuis une adresse IP différente de celle d\'origine. Cela peut indiquer un vol de cookie de session ou une attaque man-in-the-middle. Action recommandée: Révoquer immédiatement la session et notifier l\'utilisateur.',

    // Accès
    [EVENT_TYPES.UNAUTHORIZED_ACCESS]: 'L\'utilisateur a tenté d\'accéder à une ressource pour laquelle il n\'a pas les permissions nécessaires. Vérifier si c\'est une erreur de navigation ou une tentative intentionnelle.',
    [EVENT_TYPES.ACCESS_DENIED]: 'Accès refusé par le système de contrôle d\'accès basé sur les rôles (RBAC). L\'utilisateur n\'a pas le niveau de permission requis.',
    [EVENT_TYPES.ADMIN_PAGE_ACCESS_BLOCKED]: 'Un utilisateur non-administrateur a tenté d\'accéder aux pages d\'administration. Cela peut indiquer une tentative de reconnaissance ou d\'escalade de privilèges. Surveiller cet utilisateur.',

    // Super Admin
    [EVENT_TYPES.ADMIN_LOGIN_BLOCKED]: 'Un compte Super Admin a tenté de se connecter via la page de login standard au lieu de la page dédiée /super-admin. Pour des raisons de sécurité, les Super Admins doivent utiliser leur page de connexion sécurisée.',
    [EVENT_TYPES.ADMIN_DELETE_ATTEMPT]: 'Tentative critique de suppression d\'un compte Super Administrateur. Cette action est bloquée par le système pour éviter la suppression accidentelle ou malveillante des comptes privilégiés. Enquête immédiate requise.',

    // Modifications
    [EVENT_TYPES.UNAUTHORIZED_MODIFICATION]: 'Tentative de modifier des données (document, utilisateur, configuration) sans avoir les droits nécessaires. Peut indiquer une tentative de manipulation ou un problème de droits d\'accès.',
    [EVENT_TYPES.UNAUTHORIZED_DELETION]: 'Tentative de supprimer des données sans autorisation. Le système a bloqué l\'action. Vérifier si l\'utilisateur a besoin de droits supplémentaires ou s\'il s\'agit d\'une tentative malveillante.',
    [EVENT_TYPES.BULK_DELETION]: 'Un nombre anormalement élevé d\'éléments ont été supprimés en peu de temps. Peut être légitime (nettoyage de masse) ou malveillant (sabotage, destruction de données). Vérification manuelle recommandée.',

    // Fichiers
    [EVENT_TYPES.FILE_ACCESS_DENIED]: 'L\'utilisateur a tenté d\'accéder à un document pour lequel il n\'a pas les permissions. Causes: (1) Document d\'un autre département, (2) Niveau d\'accès insuffisant, (3) Document verrouillé.',
    [EVENT_TYPES.FILE_DOWNLOAD_SUSPICIOUS]: 'Pattern de téléchargement inhabituel détecté: horaires anormaux, fichiers sensibles, ou comportement différent des habitudes de l\'utilisateur.',
    [EVENT_TYPES.BULK_DOWNLOAD]: 'Volume massif de téléchargements en peu de temps. Peut indiquer une tentative d\'exfiltration de données. Vérifier l\'identité de l\'utilisateur et la légitimité de l\'action.',

    // Privilèges
    [EVENT_TYPES.PRIVILEGE_ESCALATION]: 'Tentative d\'obtenir des droits supérieurs sans autorisation. Exemples: modification de l\'ID de rôle, manipulation de tokens, exploitation de vulnérabilités. Action immédiate requise.',
    [EVENT_TYPES.ROLE_MODIFICATION_ATTEMPT]: 'Tentative de modifier le rôle ou les permissions d\'un utilisateur sans avoir les droits d\'administrateur. Peut indiquer une tentative d\'escalade de privilèges.',

    // Activité suspecte
    [EVENT_TYPES.SUSPICIOUS_ACTIVITY]: 'Comportement anormal détecté dans les actions de l\'utilisateur: requêtes inhabituelles, tentatives d\'accès à des endpoints cachés, patterns d\'attaque connus.',
    [EVENT_TYPES.RAPID_REQUESTS]: 'Nombre anormalement élevé de requêtes HTTP en peu de temps. Causes possibles: (1) Bot ou script automatisé, (2) Attaque DDoS, (3) Scraping de données. Envisager un rate limiting.',
    [EVENT_TYPES.SQL_INJECTION_ATTEMPT]: 'Détection de caractères ou commandes SQL dans les paramètres de requête. Attaque visant à manipuler la base de données. Le système a bloqué la requête. IP à bannir immédiatement.',
    [EVENT_TYPES.XSS_ATTEMPT]: 'Détection de code JavaScript malveillant dans les données soumises. Tentative d\'injection de scripts pour voler des sessions ou rediriger les utilisateurs. Requête bloquée.',

    // Données
    [EVENT_TYPES.DATA_BREACH_ATTEMPT]: 'Tentative d\'accès ou d\'extraction massive de données sensibles. Peut inclure: dump de base de données, accès API massif, ou exportation non autorisée. Enquête urgente requise.',
    [EVENT_TYPES.SENSITIVE_DATA_ACCESS]: 'Accès à des données particulièrement sensibles (mots de passe hashés, tokens d\'API, clés de chiffrement, informations personnelles). Vérifier la légitimité de l\'accès.'
};

/**
 * Classe SecurityLogger pour gérer les logs de sécurité
 */
class SecurityLogger {
    constructor(db) {
        this.db = db;
        this.collection = db.collection('securityLogs');

        // Créer index pour optimiser les requêtes
        this.createIndexes();
    }

    async createIndexes() {
        try {
            await this.collection.createIndex({ timestamp: -1 });
            await this.collection.createIndex({ severity: 1 });
            await this.collection.createIndex({ eventType: 1 });
            await this.collection.createIndex({ username: 1 });
            await this.collection.createIndex({ ip: 1 });
        } catch (error) {
            console.error('Erreur création index securityLogs:', error);
        }
    }

    /**
     * Logger un événement de sécurité
     */
    async log(eventType, username, details = {}, req = null) {
        const severity = EVENT_SEVERITY_MAP[eventType] || SEVERITY.WARNING;
        const message = EVENT_MESSAGES[eventType] || eventType;
        const explanation = EVENT_EXPLANATIONS[eventType] || 'Aucune explication détaillée disponible.';

        const logEntry = {
            timestamp: new Date(),
            eventType,
            severity,
            message,
            explanation,
            username: username || 'unknown',
            ip: req?.ip || details.ip || 'unknown',
            userAgent: req?.headers?.['user-agent'] || details.userAgent || 'unknown',
            details: {
                ...details,
                url: req?.originalUrl,
                method: req?.method
            }
        };

        try {
            await this.collection.insertOne(logEntry);

            // Console log avec couleur selon gravité
            const emoji = severity === SEVERITY.CRITICAL ? '🔴' :
                         severity === SEVERITY.WARNING ? '🟠' : '🟢';
            console.log(`${emoji} [${severity}] ${eventType}: ${username} - ${message}`);

            return logEntry;
        } catch (error) {
            console.error('Erreur logging sécurité:', error);
        }
    }

    /**
     * Détecter tentatives répétées (3+ échecs en 15 min)
     */
    async checkRepeatedFailures(username, ip) {
        const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);

        const failureCount = await this.collection.countDocuments({
            eventType: EVENT_TYPES.LOGIN_FAILED,
            username,
            ip,
            timestamp: { $gte: fifteenMinutesAgo }
        });

        if (failureCount >= 3) {
            await this.log(EVENT_TYPES.LOGIN_FAILED_REPEATED, username, {
                failureCount,
                timeWindow: '15 minutes',
                ip
            });
            return true;
        }

        return false;
    }

    /**
     * Récupérer les logs avec filtres
     */
    async getLogs(filters = {}) {
        const query = {};

        if (filters.severity) {
            query.severity = filters.severity;
        }

        if (filters.eventType) {
            query.eventType = filters.eventType;
        }

        if (filters.username) {
            query.username = new RegExp(filters.username, 'i');
        }

        if (filters.ip) {
            query.ip = filters.ip;
        }

        if (filters.startDate || filters.endDate) {
            query.timestamp = {};
            if (filters.startDate) {
                query.timestamp.$gte = new Date(filters.startDate);
            }
            if (filters.endDate) {
                query.timestamp.$lte = new Date(filters.endDate);
            }
        }

        const logs = await this.collection
            .find(query)
            .sort({ timestamp: -1 })
            .limit(filters.limit || 100)
            .toArray();

        return logs;
    }

    /**
     * Obtenir statistiques des logs
     */
    async getStats(days = 7) {
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);

        const stats = await this.collection.aggregate([
            { $match: { timestamp: { $gte: startDate } } },
            {
                $group: {
                    _id: '$severity',
                    count: { $sum: 1 }
                }
            }
        ]).toArray();

        const result = {
            [SEVERITY.INFO]: 0,
            [SEVERITY.WARNING]: 0,
            [SEVERITY.CRITICAL]: 0
        };

        stats.forEach(stat => {
            result[stat._id] = stat.count;
        });

        return result;
    }
}

module.exports = {
    SecurityLogger,
    SEVERITY,
    EVENT_TYPES,
    EVENT_MESSAGES,
    EVENT_EXPLANATIONS
};
