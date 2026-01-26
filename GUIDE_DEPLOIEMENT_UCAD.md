# Guide de Déploiement - Serveur UCAD

Guide complet pour déployer le système d'archivage C.E.R.E.R sur le serveur de l'**Université Cheikh Anta Diop (UCAD)**.

---

## 📋 Table des matières

1. [Prérequis](#prérequis)
2. [Architecture de déploiement](#architecture-de-déploiement)
3. [Préparation du serveur](#préparation-du-serveur)
4. [Installation des dépendances](#installation-des-dépendances)
5. [Configuration de l'application](#configuration-de-lapplication)
6. [Configuration MongoDB](#configuration-mongodb)
7. [Configuration Nginx (Reverse Proxy)](#configuration-nginx)
8. [Configuration SSL/HTTPS](#configuration-ssl-https)
9. [Démarrage automatique avec PM2](#démarrage-automatique-avec-pm2)
10. [Sécurité et pare-feu](#sécurité-et-pare-feu)
11. [Sauvegardes automatiques](#sauvegardes-automatiques)
12. [Monitoring et logs](#monitoring-et-logs)
13. [Maintenance](#maintenance)
14. [Dépannage](#dépannage)

---

## 🎯 Prérequis

### Serveur

- **OS** : Ubuntu Server 20.04 LTS ou 22.04 LTS (recommandé)
- **CPU** : Minimum 2 cœurs (4 cœurs recommandé)
- **RAM** : Minimum 4 GB (8 GB recommandé)
- **Disque** : Minimum 50 GB SSD
- **Accès** : SSH avec privilèges sudo

### Informations réseau UCAD

- **Nom de domaine** : `archivage.ucad.sn` ou `ged.ucad.sn` (à définir avec le service informatique UCAD)
- **Adresse IP** : Fournie par le service informatique UCAD
- **Port HTTP** : 80 (sera redirigé vers HTTPS)
- **Port HTTPS** : 443
- **Port application** : 4000 (interne, non exposé)

### Accès requis

- ✅ Accès SSH au serveur
- ✅ Droits sudo sur le serveur
- ✅ Accès au DNS UCAD pour configurer le domaine
- ✅ Compte MongoDB Atlas (pour la base de données)
- ✅ Email administrateur pour les certificats SSL

---

## 🏗️ Architecture de déploiement

```
Internet (ucad.sn)
        ↓
    Port 443 (HTTPS)
        ↓
    Nginx (Reverse Proxy)
    ├─ SSL/TLS (Let's Encrypt)
    ├─ Compression GZIP
    ├─ Cache statique
    └─ Rate limiting
        ↓
    Port 4000 (Application Node.js)
    ├─ Express.js
    ├─ Session management
    └─ API REST
        ↓
    MongoDB Atlas (Cloud)
    └─ Base de données
```

---

## 🖥️ Préparation du serveur

### Étape 1 : Connexion au serveur

```bash
# Connexion SSH (remplacer par vos informations)
ssh admin@serveur.ucad.sn

# Ou avec IP
ssh admin@41.X.X.X
```

### Étape 2 : Mise à jour du système

```bash
# Mise à jour de la liste des paquets
sudo apt update

# Mise à jour des paquets installés
sudo apt upgrade -y

# Nettoyage
sudo apt autoremove -y
sudo apt autoclean
```

### Étape 3 : Configuration du pare-feu (UFW)

```bash
# Installer UFW si nécessaire
sudo apt install ufw -y

# Autoriser SSH (IMPORTANT - à faire en premier !)
sudo ufw allow 22/tcp

# Autoriser HTTP et HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Activer le pare-feu
sudo ufw enable

# Vérifier le statut
sudo ufw status verbose
```

### Étape 4 : Créer un utilisateur dédié (sécurité)

```bash
# Créer l'utilisateur 'cerer'
sudo adduser cerer

# Ajouter aux groupes nécessaires
sudo usermod -aG sudo cerer

# Se connecter en tant que cerer
su - cerer
```

---

## 📦 Installation des dépendances

### Étape 1 : Installer Node.js 18.x LTS

```bash
# Télécharger le script d'installation NodeSource
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -

# Installer Node.js
sudo apt install -y nodejs

# Vérifier l'installation
node --version  # Devrait afficher v18.x.x
npm --version   # Devrait afficher 9.x.x ou supérieur
```

### Étape 2 : Installer Git

```bash
sudo apt install git -y

# Vérifier
git --version
```

### Étape 3 : Installer MongoDB Database Tools (pour les sauvegardes)

```bash
# Télécharger MongoDB Database Tools
wget https://fastdl.mongodb.org/tools/db/mongodb-database-tools-ubuntu2004-x86_64-100.9.4.deb

# Installer
sudo dpkg -i mongodb-database-tools-ubuntu2004-x86_64-100.9.4.deb

# Vérifier
mongodump --version
mongorestore --version

# Nettoyer
rm mongodb-database-tools-ubuntu2004-x86_64-100.9.4.deb
```

### Étape 4 : Installer Nginx

```bash
# Installer Nginx
sudo apt install nginx -y

# Démarrer Nginx
sudo systemctl start nginx
sudo systemctl enable nginx

# Vérifier le statut
sudo systemctl status nginx
```

### Étape 5 : Installer Certbot (pour SSL)

```bash
# Installer Certbot et le plugin Nginx
sudo apt install certbot python3-certbot-nginx -y

# Vérifier
certbot --version
```

### Étape 6 : Installer PM2 (Process Manager)

```bash
# Installer PM2 globalement
sudo npm install -g pm2

# Vérifier
pm2 --version

# Configurer PM2 pour démarrer au boot
pm2 startup systemd
# Exécuter la commande affichée (sudo env PATH=...)
```

---

## 📥 Déploiement de l'application

### Étape 1 : Cloner le dépôt

```bash
# Se positionner dans le répertoire home
cd ~

# Créer un dossier pour les applications
mkdir -p /home/cerer/apps
cd /home/cerer/apps

# Cloner votre dépôt Git
git clone https://github.com/votre-repo/archivage-cerer.git
# OU si vous utilisez un autre service Git
# git clone https://gitlab.com/votre-repo/archivage-cerer.git

# Entrer dans le dossier backend
cd archivage-cerer/backend
```

### Étape 2 : Installer les dépendances npm

```bash
# Installer les dépendances de production
npm install --production

# Vérifier qu'il n'y a pas d'erreurs
npm list
```

---

## ⚙️ Configuration de l'application

### Étape 1 : Créer le fichier .env de production

```bash
# Copier l'exemple
cp .env.example .env

# Éditer le fichier .env
nano .env
```

### Étape 2 : Configuration .env pour UCAD

```env
# ============================================
# CONFIGURATION PRODUCTION - UCAD
# ============================================

# MongoDB Atlas (Production)
MONGODB_URI=mongodb+srv://cerer_user:VOTRE_MOT_DE_PASSE@cluster0.xxxxx.mongodb.net/cerer_archivage?retryWrites=true&w=majority
MONGODB_DB_NAME=cerer_archivage

# Port de l'application (interne)
PORT=4000

# Environnement
NODE_ENV=production

# ============================================
# SÉCURITÉ - SECRETS DE SESSION
# ============================================
# ⚠️ GÉNÉRER DE NOUVEAUX SECRETS POUR LA PRODUCTION
# Commande: node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

SESSION_SECRET=GENERER_UN_NOUVEAU_SECRET_ICI
SESSION_CRYPTO_SECRET=GENERER_UN_NOUVEAU_SECRET_ICI

# Durée de session (24 heures)
SESSION_MAX_AGE=86400000

# ============================================
# JWT SECRETS
# ============================================
JWT_SECRET=GENERER_UN_NOUVEAU_SECRET_ICI
JWT_REFRESH_SECRET=GENERER_UN_NOUVEAU_SECRET_ICI

# ============================================
# CONFIGURATION EMAIL (SMTP)
# ============================================
# Utiliser le serveur SMTP de l'UCAD
SMTP_HOST=smtp.ucad.sn
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=ged@ucad.sn
SMTP_PASS=MOT_DE_PASSE_EMAIL

# Expéditeur des emails
SMTP_FROM_NAME=GED C.E.R.E.R - UCAD
SMTP_FROM_EMAIL=ged@ucad.sn

# URL du frontend (domaine UCAD)
FRONTEND_URL=https://archivage.ucad.sn

# ============================================
# SAUVEGARDES
# ============================================
# Dossier de sauvegarde
BACKUP_DIR=/home/cerer/backups
BACKUP_RETENTION_COUNT=30

# MongoDB Atlas API (pour vérification backups)
ATLAS_PUBLIC_KEY=votre_public_key
ATLAS_PRIVATE_KEY=votre_private_key
ATLAS_PROJECT_ID=votre_project_id
ATLAS_CLUSTER_NAME=Cluster0
```

### Étape 3 : Générer les secrets de sécurité

```bash
# Générer un secret SESSION_SECRET
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# Générer un secret SESSION_CRYPTO_SECRET
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# Générer un secret JWT_SECRET
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# Générer un secret JWT_REFRESH_SECRET
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# Copier ces valeurs dans le fichier .env
```

### Étape 4 : Sécuriser le fichier .env

```bash
# Restreindre les permissions (lecture seule pour le propriétaire)
chmod 600 .env

# Vérifier
ls -la .env
# Devrait afficher: -rw------- 1 cerer cerer
```

---

## 🗄️ Configuration MongoDB

### Option 1 : Utiliser MongoDB Atlas (Recommandé)

**Avantages :**
- ✅ Pas de gestion serveur MongoDB
- ✅ Sauvegardes automatiques
- ✅ Haute disponibilité
- ✅ Monitoring intégré

**Configuration :**

1. Allez sur https://cloud.mongodb.com
2. Créez un cluster (M0 gratuit ou M10+ pour production)
3. **Network Access** : Ajoutez l'IP du serveur UCAD
4. **Database Access** : Créez un utilisateur avec permissions read/write
5. Copiez l'URI de connexion dans `.env`

### Option 2 : MongoDB local sur le serveur (Alternative)

**⚠️ Nécessite plus de maintenance**

```bash
# Installer MongoDB Community Edition
wget -qO - https://www.mongodb.org/static/pgp/server-6.0.asc | sudo apt-key add -
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu focal/mongodb-org/6.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-6.0.list
sudo apt update
sudo apt install -y mongodb-org

# Démarrer MongoDB
sudo systemctl start mongod
sudo systemctl enable mongod

# Vérifier
sudo systemctl status mongod

# URI de connexion dans .env
MONGODB_URI=mongodb://localhost:27017
```

---

## 🌐 Configuration Nginx (Reverse Proxy)

### Étape 1 : Créer la configuration Nginx

```bash
# Créer le fichier de configuration
sudo nano /etc/nginx/sites-available/archivage-ucad
```

### Étape 2 : Configuration Nginx complète

```nginx
# Configuration Nginx pour archivage.ucad.sn

# Redirection HTTP -> HTTPS
server {
    listen 80;
    listen [::]:80;
    server_name archivage.ucad.sn www.archivage.ucad.sn;

    # Redirection vers HTTPS
    return 301 https://$server_name$request_uri;
}

# Configuration HTTPS
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name archivage.ucad.sn www.archivage.ucad.sn;

    # Certificats SSL (seront générés par Certbot)
    ssl_certificate /etc/letsencrypt/live/archivage.ucad.sn/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/archivage.ucad.sn/privkey.pem;

    # Configuration SSL sécurisée
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;

    # Headers de sécurité
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # Taille maximale des fichiers (pour les uploads)
    client_max_body_size 100M;

    # Logs
    access_log /var/log/nginx/archivage-ucad-access.log;
    error_log /var/log/nginx/archivage-ucad-error.log;

    # Compression GZIP
    gzip on;
    gzip_vary on;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_types text/plain text/css text/xml text/javascript application/json application/javascript application/xml+rss;

    # Fichiers statiques (si vous avez un dossier public)
    location /public {
        alias /home/cerer/apps/archivage-cerer/backend/public;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }

    # Proxy vers l'application Node.js
    location / {
        proxy_pass http://localhost:4000;
        proxy_http_version 1.1;

        # Headers de proxy
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;

        # Cache bypass
        proxy_cache_bypass $http_upgrade;
    }

    # Health check endpoint (optionnel)
    location /health {
        proxy_pass http://localhost:4000/health;
        access_log off;
    }

    # Bloquer l'accès aux fichiers sensibles
    location ~ /\. {
        deny all;
        access_log off;
        log_not_found off;
    }

    location ~ /(\.env|\.git|node_modules) {
        deny all;
        access_log off;
        log_not_found off;
    }
}
```

### Étape 3 : Activer la configuration

```bash
# Créer un lien symbolique
sudo ln -s /etc/nginx/sites-available/archivage-ucad /etc/nginx/sites-enabled/

# Supprimer la configuration par défaut
sudo rm /etc/nginx/sites-enabled/default

# Tester la configuration
sudo nginx -t

# Si OK, recharger Nginx
sudo systemctl reload nginx
```

---

## 🔒 Configuration SSL/HTTPS

### Étape 1 : Obtenir un certificat SSL avec Let's Encrypt

```bash
# Obtenir le certificat (remplacer par votre email)
sudo certbot --nginx -d archivage.ucad.sn -d www.archivage.ucad.sn --email admin@ucad.sn --agree-tos --no-eff-email

# Le certificat sera automatiquement configuré dans Nginx
```

### Étape 2 : Renouvellement automatique

```bash
# Tester le renouvellement
sudo certbot renew --dry-run

# Le renouvellement automatique est configuré via cron
# Vérifier :
sudo systemctl status certbot.timer
```

### Étape 3 : Vérifier le SSL

```bash
# Tester le site
curl -I https://archivage.ucad.sn

# Devrait afficher: HTTP/2 200
```

---

## 🚀 Démarrage automatique avec PM2

### Étape 1 : Démarrer l'application avec PM2

```bash
# Se positionner dans le dossier de l'application
cd /home/cerer/apps/archivage-cerer/backend

# Démarrer l'application avec PM2
pm2 start server.js --name "archivage-cerer" --env production

# Vérifier le statut
pm2 status

# Voir les logs en temps réel
pm2 logs archivage-cerer
```

### Étape 2 : Configuration PM2 avancée

```bash
# Créer un fichier ecosystem.config.js
nano ecosystem.config.js
```

**Contenu du fichier :**

```javascript
module.exports = {
  apps: [{
    name: 'archivage-cerer',
    script: './server.js',
    instances: 2,  // 2 instances pour haute disponibilité
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 4000
    },
    error_file: '/home/cerer/logs/err.log',
    out_file: '/home/cerer/logs/out.log',
    log_file: '/home/cerer/logs/combined.log',
    time: true,
    max_memory_restart: '1G',
    autorestart: true,
    watch: false,
    ignore_watch: ['node_modules', 'logs', 'backups'],
    max_restarts: 10,
    min_uptime: '10s'
  }]
};
```

### Étape 3 : Utiliser la configuration PM2

```bash
# Créer le dossier logs
mkdir -p /home/cerer/logs

# Arrêter l'application actuelle
pm2 delete archivage-cerer

# Démarrer avec la nouvelle configuration
pm2 start ecosystem.config.js

# Sauvegarder la configuration PM2
pm2 save

# Vérifier
pm2 status
pm2 logs
```

### Étape 4 : Commandes PM2 utiles

```bash
# Voir le statut
pm2 status

# Voir les logs
pm2 logs archivage-cerer

# Voir les logs en continu
pm2 logs archivage-cerer --lines 100

# Redémarrer
pm2 restart archivage-cerer

# Recharger (sans downtime)
pm2 reload archivage-cerer

# Arrêter
pm2 stop archivage-cerer

# Monitoring
pm2 monit
```

---

## 🔐 Sécurité et pare-feu

### Configuration avancée du pare-feu

```bash
# Limiter les tentatives de connexion SSH
sudo ufw limit 22/tcp

# Autoriser uniquement les connexions depuis certaines IPs (optionnel)
# sudo ufw allow from ADRESSE_IP_ADMIN to any port 22

# Bloquer le ping (optionnel)
# sudo nano /etc/ufw/before.rules
# Commenter la ligne: -A ufw-before-input -p icmp --icmp-type echo-request -j ACCEPT

# Recharger UFW
sudo ufw reload
```

### Fail2Ban (Protection contre les attaques brute-force)

```bash
# Installer Fail2Ban
sudo apt install fail2ban -y

# Créer une configuration locale
sudo cp /etc/fail2ban/jail.conf /etc/fail2ban/jail.local

# Éditer la configuration
sudo nano /etc/fail2ban/jail.local
```

**Configuration Fail2Ban :**

```ini
[DEFAULT]
bantime = 3600
findtime = 600
maxretry = 5
destemail = admin@ucad.sn
sendername = Fail2Ban-UCAD

[sshd]
enabled = true
port = 22
logpath = /var/log/auth.log

[nginx-http-auth]
enabled = true
port = http,https
logpath = /var/log/nginx/error.log

[nginx-limit-req]
enabled = true
port = http,https
logpath = /var/log/nginx/error.log
```

```bash
# Démarrer Fail2Ban
sudo systemctl start fail2ban
sudo systemctl enable fail2ban

# Vérifier le statut
sudo fail2ban-client status
sudo fail2ban-client status sshd
```

---

## 💾 Sauvegardes automatiques

### Étape 1 : Créer le dossier de sauvegardes

```bash
# Créer le dossier
mkdir -p /home/cerer/backups

# Donner les permissions
chmod 700 /home/cerer/backups
```

### Étape 2 : Configurer la sauvegarde quotidienne

```bash
# Éditer le crontab
crontab -e
```

**Ajouter ces lignes :**

```bash
# Sauvegarde MongoDB quotidienne à 2h du matin
0 2 * * * cd /home/cerer/apps/archivage-cerer/backend && /usr/bin/node scripts/backup-database.js >> /home/cerer/logs/backup.log 2>&1

# Vérification des backups Atlas hebdomadaire (dimanche à 9h)
0 9 * * 0 cd /home/cerer/apps/archivage-cerer/backend && /usr/bin/node scripts/check-atlas-backups.js >> /home/cerer/logs/backup-check.log 2>&1

# Nettoyage des logs mensuels (1er du mois à 3h)
0 3 1 * * find /home/cerer/logs -name "*.log" -mtime +30 -delete
```

### Étape 3 : Sauvegarde du code source

```bash
# Créer un script de sauvegarde
nano /home/cerer/scripts/backup-code.sh
```

**Contenu :**

```bash
#!/bin/bash

# Sauvegarde du code source
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/home/cerer/backups/code"
APP_DIR="/home/cerer/apps/archivage-cerer"

# Créer le dossier de backup
mkdir -p $BACKUP_DIR

# Créer une archive
tar -czf $BACKUP_DIR/backup_code_$DATE.tar.gz \
    --exclude='node_modules' \
    --exclude='backups' \
    --exclude='logs' \
    --exclude='.git' \
    -C /home/cerer/apps archivage-cerer

# Garder seulement les 10 dernières sauvegardes
ls -t $BACKUP_DIR/backup_code_*.tar.gz | tail -n +11 | xargs -r rm

echo "Sauvegarde du code terminée: backup_code_$DATE.tar.gz"
```

```bash
# Rendre le script exécutable
chmod +x /home/cerer/scripts/backup-code.sh

# Ajouter au crontab (hebdomadaire, dimanche à 1h)
crontab -e
# Ajouter: 0 1 * * 0 /home/cerer/scripts/backup-code.sh >> /home/cerer/logs/code-backup.log 2>&1
```

---

## 📊 Monitoring et logs

### Étape 1 : Configuration des logs

```bash
# Créer le dossier logs
mkdir -p /home/cerer/logs

# Rotation des logs Nginx
sudo nano /etc/logrotate.d/nginx
```

**Configuration :**

```
/var/log/nginx/*.log {
    daily
    missingok
    rotate 14
    compress
    delaycompress
    notifempty
    create 0640 www-data adm
    sharedscripts
    postrotate
        [ -f /var/run/nginx.pid ] && kill -USR1 `cat /var/run/nginx.pid`
    endscript
}
```

### Étape 2 : Monitoring avec PM2

```bash
# Installer PM2 Plus pour monitoring avancé (optionnel)
pm2 install pm2-logrotate

# Configuration de la rotation des logs PM2
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 7
pm2 set pm2-logrotate:compress true
```

### Étape 3 : Créer un script de monitoring

```bash
nano /home/cerer/scripts/health-check.sh
```

**Contenu :**

```bash
#!/bin/bash

# Script de vérification de santé

# Vérifier l'application
if ! curl -f http://localhost:4000/health > /dev/null 2>&1; then
    echo "ALERTE: L'application ne répond pas!"
    # Redémarrer l'application
    pm2 restart archivage-cerer
    # Envoyer un email (optionnel)
    # echo "L'application a été redémarrée" | mail -s "ALERTE UCAD" admin@ucad.sn
fi

# Vérifier Nginx
if ! systemctl is-active --quiet nginx; then
    echo "ALERTE: Nginx est arrêté!"
    sudo systemctl start nginx
fi

# Vérifier l'espace disque
DISK_USAGE=$(df -h / | tail -1 | awk '{print $5}' | sed 's/%//')
if [ $DISK_USAGE -gt 80 ]; then
    echo "ALERTE: Espace disque faible: ${DISK_USAGE}%"
fi
```

```bash
# Rendre exécutable
chmod +x /home/cerer/scripts/health-check.sh

# Ajouter au crontab (toutes les 5 minutes)
crontab -e
# Ajouter: */5 * * * * /home/cerer/scripts/health-check.sh >> /home/cerer/logs/health-check.log 2>&1
```

---

## 🔄 Procédure de mise à jour

### Mise à jour de l'application

```bash
# 1. Se connecter au serveur
ssh cerer@serveur.ucad.sn

# 2. Aller dans le dossier de l'application
cd /home/cerer/apps/archivage-cerer

# 3. Sauvegarder l'état actuel
pm2 save

# 4. Récupérer les dernières modifications
git pull origin main

# 5. Installer les nouvelles dépendances (si nécessaire)
cd backend
npm install --production

# 6. Recharger l'application sans downtime
pm2 reload archivage-cerer

# 7. Vérifier les logs
pm2 logs archivage-cerer --lines 50

# 8. Vérifier que tout fonctionne
curl https://archivage.ucad.sn/health
```

---

## 🐛 Dépannage

### L'application ne démarre pas

```bash
# Vérifier les logs PM2
pm2 logs archivage-cerer

# Vérifier les logs système
journalctl -u pm2-cerer -n 50

# Vérifier le fichier .env
cat .env

# Tester manuellement
cd /home/cerer/apps/archivage-cerer/backend
NODE_ENV=production node server.js
```

### Erreur 502 Bad Gateway

```bash
# Vérifier que l'application tourne
pm2 status

# Vérifier les logs Nginx
sudo tail -f /var/log/nginx/archivage-ucad-error.log

# Vérifier la connexion
curl http://localhost:4000
```

### Problèmes de connexion MongoDB

```bash
# Tester la connexion MongoDB
mongosh "VOTRE_MONGODB_URI"

# Vérifier l'IP dans MongoDB Atlas
# L'IP du serveur UCAD doit être dans la whitelist
```

### Certificat SSL expiré

```bash
# Renouveler manuellement
sudo certbot renew

# Recharger Nginx
sudo systemctl reload nginx
```

---

## 📝 Checklist de déploiement

- [ ] Serveur Ubuntu configuré et à jour
- [ ] Node.js 18.x installé
- [ ] MongoDB Database Tools installé
- [ ] Nginx installé et configuré
- [ ] PM2 installé
- [ ] Pare-feu UFW configuré
- [ ] Fail2Ban installé
- [ ] Code source cloné
- [ ] Dépendances npm installées
- [ ] Fichier .env créé et configuré
- [ ] Secrets de sécurité générés
- [ ] MongoDB Atlas configuré (IP whitelisted)
- [ ] Configuration Nginx créée
- [ ] Certificat SSL obtenu
- [ ] Application démarrée avec PM2
- [ ] Sauvegardes automatiques configurées
- [ ] Monitoring configuré
- [ ] Tests de santé passés
- [ ] Documentation remise à l'équipe UCAD

---

## 📞 Contacts et support

### Équipe technique C.E.R.E.R
- Email : admin@cerer.sn
- Téléphone : +221 XX XXX XX XX

### Service informatique UCAD
- Email : dsi@ucad.sn
- Téléphone : +221 33 824 69 81

### Support MongoDB Atlas
- Documentation : https://docs.atlas.mongodb.com
- Support : https://support.mongodb.com

---

**Guide préparé le : 30 Novembre 2025**
**Version : 1.0**
