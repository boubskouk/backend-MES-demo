/**
 * Configuration PM2 pour le système d'archivage C.E.R.E.R
 *
 * Utilisation:
 *   pm2 start ecosystem.config.js
 *   pm2 restart ecosystem.config.js
 *   pm2 reload ecosystem.config.js
 *   pm2 stop ecosystem.config.js
 *
 * Documentation: https://pm2.keymetrics.io/docs/usage/application-declaration/
 */

module.exports = {
  apps: [{
    // Informations de base
    name: 'archivage-cerer',
    script: './server.js',

    // Mode cluster pour haute disponibilité
    instances: 2,  // Nombre d'instances (ajuster selon les CPU disponibles)
    exec_mode: 'cluster',

    // Variables d'environnement
    env: {
      NODE_ENV: 'production',
      PORT: 4000
    },

    // Logs
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true,  // Ajouter des timestamps aux logs
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',

    // Gestion de la mémoire
    max_memory_restart: '1G',  // Redémarrer si l'app utilise plus de 1GB

    // Auto-restart
    autorestart: true,
    max_restarts: 10,
    min_uptime: '10s',  // Considéré comme démarré après 10s

    // Fichiers à ignorer pour le watch (désactivé en production)
    watch: false,
    ignore_watch: [
      'node_modules',
      'logs',
      'backups',
      '.git'
    ],

    // Variables d'environnement pour le développement
    env_development: {
      NODE_ENV: 'development',
      PORT: 4000
    },

    // Variables d'environnement pour la production
    env_production: {
      NODE_ENV: 'production',
      PORT: 4000
    },

    // Gestion des erreurs
    exp_backoff_restart_delay: 100,  // Délai exponentiel entre les redémarrages

    // Hooks de cycle de vie (optionnel)
    post_update: ['npm install', 'echo Application updated'],

    // Paramètres avancés
    merge_logs: true,  // Fusionner les logs de toutes les instances
    listen_timeout: 3000,  // Timeout pour le listen
    kill_timeout: 5000,  // Timeout pour le kill

    // Gestion du signal de rechargement gracieux
    wait_ready: false,

    // Source maps (utile pour le débogage)
    source_map_support: true
  }],

  // Configuration du déploiement (optionnel)
  deploy: {
    production: {
      // Utilisateur sur le serveur distant
      user: 'cerer',

      // Hôte du serveur
      host: 'serveur.ucad.sn',

      // Port SSH
      ssh_options: 'StrictHostKeyChecking=no',

      // Branche Git à déployer
      ref: 'origin/main',

      // Dépôt Git
      repo: 'https://github.com/votre-repo/archivage-cerer.git',

      // Chemin sur le serveur
      path: '/home/cerer/apps/archivage-cerer',

      // Commandes à exécuter après le déploiement
      'post-deploy': 'cd backend && npm install --production && pm2 reload ecosystem.config.js --env production',

      // Variables d'environnement
      env: {
        NODE_ENV: 'production'
      }
    }
  }
};
