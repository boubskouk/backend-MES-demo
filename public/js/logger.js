// ============================================
// SYSTÈME DE LOGGING CENTRALISÉ
// ============================================

/**
 * Système de logging avec niveaux configurables
 * Permet de contrôler la verbosité des logs selon l'environnement
 */

const Logger = (function() {
    'use strict';

    // Niveaux de log disponibles
    const LogLevel = {
        DEBUG: 0,   // Informations de débogage détaillées
        INFO: 1,    // Informations générales importantes
        WARN: 2,    // Avertissements
        ERROR: 3,   // Erreurs
        NONE: 4     // Aucun log
    };

    // Configuration du logger
    const config = {
        // Niveau minimum de log à afficher
        // En production, mettre INFO ou WARN pour réduire le bruit
        minLevel: LogLevel.DEBUG,

        // Activer/désactiver les logs complètement
        enabled: true,

        // Préfixes et styles pour chaque niveau
        styles: {
            DEBUG: { prefix: '🔍', color: '#6B7280', bgColor: '#F3F4F6' },
            INFO:  { prefix: '✅', color: '#3B82F6', bgColor: '#EFF6FF' },
            WARN:  { prefix: '⚠️', color: '#F59E0B', bgColor: '#FEF3C7' },
            ERROR: { prefix: '❌', color: '#EF4444', bgColor: '#FEE2E2' }
        }
    };

    /**
     * Détecter automatiquement l'environnement
     * @returns {string} 'development' ou 'production'
     */
    function detectEnvironment() {
        // Méthodes de détection (ordre de priorité)

        // 1. Variable d'environnement explicite
        if (window.APP_ENV) {
            return window.APP_ENV;
        }

        // 2. Détection par hostname
        const hostname = window.location.hostname;
        if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname.startsWith('192.168.')) {
            return 'development';
        }

        // 3. Détection par port (ports de dev courants)
        const port = window.location.port;
        if (port && ['3000', '4000', '5000', '8000', '8080'].includes(port)) {
            return 'development';
        }

        // 4. Par défaut: production
        return 'production';
    }

    /**
     * Configurer automatiquement le logger selon l'environnement
     */
    function autoConfig() {
        const env = detectEnvironment();

        if (env === 'production') {
            // En production: seulement WARN et ERROR
            config.minLevel = LogLevel.WARN;
        } else {
            // En développement: tous les logs
            config.minLevel = LogLevel.DEBUG;
        }

        return env;
    }

    /**
     * Logger un message avec un niveau spécifique
     * @param {number} level - Niveau de log
     * @param {string} levelName - Nom du niveau
     * @param {Array} args - Arguments à logger
     */
    function log(level, levelName, ...args) {
        // Vérifier si les logs sont activés
        if (!config.enabled) return;

        // Vérifier le niveau minimum
        if (level < config.minLevel) return;

        const style = config.styles[levelName];
        const timestamp = new Date().toLocaleTimeString('fr-FR');

        // Formater le message
        const prefix = `${style.prefix} [${timestamp}]`;

        // Logger selon le niveau
        switch (level) {
            case LogLevel.DEBUG:
                console.log(prefix, ...args);
                break;
            case LogLevel.INFO:
                console.info(prefix, ...args);
                break;
            case LogLevel.WARN:
                console.warn(prefix, ...args);
                break;
            case LogLevel.ERROR:
                console.error(prefix, ...args);
                break;
        }
    }

    /**
     * Grouper des logs ensemble
     * @param {string} title - Titre du groupe
     * @param {Function} callback - Fonction contenant les logs à grouper
     */
    function group(title, callback) {
        if (!config.enabled || config.minLevel >= LogLevel.NONE) return;

        console.group(title);
        callback();
        console.groupEnd();
    }

    // Auto-configuration au chargement
    const environment = autoConfig();

    // API publique
    return {
        /**
         * Log de niveau DEBUG
         * Pour informations de débogage détaillées
         */
        debug: (...args) => log(LogLevel.DEBUG, 'DEBUG', ...args),

        /**
         * Log de niveau INFO
         * Pour informations importantes sur le fonctionnement normal
         */
        info: (...args) => log(LogLevel.INFO, 'INFO', ...args),

        /**
         * Log de niveau WARN
         * Pour avertissements et situations anormales non critiques
         */
        warn: (...args) => log(LogLevel.WARN, 'WARN', ...args),

        /**
         * Log de niveau ERROR
         * Pour erreurs et problèmes critiques
         */
        error: (...args) => log(LogLevel.ERROR, 'ERROR', ...args),

        /**
         * Grouper des logs
         */
        group: group,

        /**
         * Configurer le logger
         * @param {Object} options - Options de configuration
         */
        configure: (options) => {
            if (options.minLevel !== undefined) {
                config.minLevel = options.minLevel;
            }
            if (options.enabled !== undefined) {
                config.enabled = options.enabled;
            }
        },

        /**
         * Obtenir la configuration actuelle
         */
        getConfig: () => ({
            ...config,
            environment,
            currentLevel: Object.keys(LogLevel).find(key => LogLevel[key] === config.minLevel)
        }),

        /**
         * Niveaux de log disponibles (pour configuration)
         */
        Level: LogLevel
    };
})();

// Exposer globalement
window.Logger = Logger;

// Log d'initialisation
Logger.info(`Système de logging initialisé - Environnement: ${Logger.getConfig().environment} - Niveau: ${Logger.getConfig().currentLevel}`);
