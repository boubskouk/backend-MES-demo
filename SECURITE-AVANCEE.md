# 🔐 SÉCURITÉ AVANCÉE - ARCHIVAGE C.E.R.E.R

**Version:** 3.0
**Date:** Novembre 2025
**Statut:** ✅ Implémenté et prêt pour production

---

## 📋 TABLE DES MATIÈRES

1. [Vue d'ensemble](#vue-densemble)
2. [Authentification JWT](#authentification-jwt)
3. [Configuration HTTPS](#configuration-https)
4. [CORS Sécurisé](#cors-sécurisé)
5. [Audit Logs](#audit-logs)
6. [Démarrage Rapide](#démarrage-rapide)
7. [Migration Production](#migration-production)
8. [Troubleshooting](#troubleshooting)

---

## 🎯 VUE D'ENSEMBLE

### Fonctionnalités de sécurité implémentées

✅ **Authentification JWT** - Tokens sécurisés avec expiration
✅ **HTTPS/SSL** - Chiffrement des communications
✅ **CORS Strict** - Protection contre les requêtes non autorisées
✅ **Audit Logs** - Traçabilité complète de toutes les actions
✅ **Rate Limiting** - Protection contre les attaques brute force
✅ **Helmet** - Headers de sécurité HTTP
✅ **NoSQL Injection Protection** - Sanitization des entrées
✅ **Bcrypt** - Hachage sécurisé des mots de passe

### Architecture de sécurité

```
┌─────────────────────────────────────────────────────────┐
│                    CLIENT (Browser)                      │
└─────────────────────────────────────────────────────────┘
                          ↓ HTTPS (SSL/TLS)
┌─────────────────────────────────────────────────────────┐
│                    REVERSE PROXY                         │
│              (Nginx, Apache, Render, etc.)               │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│                   MIDDLEWARES SÉCURITÉ                   │
│  • CORS Validation                                       │
│  • Helmet (Security Headers)                             │
│  • Rate Limiting                                         │
│  • NoSQL Injection Protection                            │
│  • Audit Logger                                          │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│              AUTHENTIFICATION JWT                        │
│  • Vérification Token                                    │
│  • Validation Niveau d'accès                             │
│  • Logs d'audit                                          │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│                  ROUTES API PROTÉGÉES                    │
│  • Documents                                             │
│  • Utilisateurs                                          │
│  • Catégories                                            │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│                   BASE DE DONNÉES                        │
│              MongoDB (Local ou Atlas)                    │
└─────────────────────────────────────────────────────────┘
```

---

## 🔑 AUTHENTIFICATION JWT

### Fonctionnement

Le système utilise **deux types de tokens JWT** :

1. **Access Token** (2h) - Pour les requêtes API
2. **Refresh Token** (7j) - Pour renouveler l'access token

### Fichier: `auth-jwt.js`

#### Génération de tokens

```javascript
const { generateTokens } = require('./auth-jwt');

// Lors de la connexion
const tokens = generateTokens(user);
// Retourne { accessToken: "...", refreshToken: "..." }
```

#### Protection des routes

```javascript
const { authenticateToken, requireLevel, requireAdmin } = require('./auth-jwt');

// Protéger une route (tous niveaux)
app.get('/api/documents', authenticateToken, (req, res) => {
    // req.user contient { userId, username, email, role, niveau, departement }
});

// Protéger une route (niveau 1 uniquement)
app.delete('/api/users/:id', authenticateToken, requireLevel(1), (req, res) => {
    // Seuls les niveau 1 peuvent accéder
});

// Protéger une route (admin seulement - niveaux 1 et 2)
app.post('/api/categories', authenticateToken, requireAdmin, (req, res) => {
    // Niveaux 1 et 2 peuvent accéder
});
```

#### Payload du token

```json
{
  "userId": "507f1f77bcf86cd799439011",
  "username": "fatima",
  "email": "fatima@ucad.edu.sn",
  "role": "Admin Principal",
  "niveau": 1,
  "departement": "Direction",
  "type": "access",
  "iat": 1699564800,
  "exp": 1699572000,
  "iss": "cerer-archivage",
  "aud": "cerer-users"
}
```

### Configuration (.env)

```env
# Secrets JWT (générer avec: node scripts/generate-secrets.js)
JWT_SECRET=<64_caractères_aléatoires>
JWT_REFRESH_SECRET=<64_caractères_différents>

# Durées de vie
JWT_EXPIRY=2h
JWT_REFRESH_EXPIRY=7d
```

### Côté client (JavaScript)

```javascript
// Connexion
const response = await fetch('/api/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password })
});

const { accessToken, refreshToken } = await response.json();

// Stocker les tokens
localStorage.setItem('accessToken', accessToken);
localStorage.setItem('refreshToken', refreshToken);

// Utiliser le token pour les requêtes
const response = await fetch('/api/documents', {
    headers: {
        'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
    }
});
```

---

## 🔒 CONFIGURATION HTTPS

### Fichier: `https-config.js`

### Option 1: Certificats Let's Encrypt (Production - GRATUIT)

#### Installation sur Ubuntu/Debian

```bash
# Installer Certbot
sudo apt update
sudo apt install certbot

# Obtenir un certificat
sudo certbot certonly --standalone -d votre-domaine.com

# Certificats générés dans:
# /etc/letsencrypt/live/votre-domaine.com/fullchain.pem
# /etc/letsencrypt/live/votre-domaine.com/privkey.pem
```

#### Configuration .env

```env
SSL_ENABLED=true
SSL_CERT_PATH=/etc/letsencrypt/live/votre-domaine.com/fullchain.pem
SSL_KEY_PATH=/etc/letsencrypt/live/votre-domaine.com/privkey.pem
```

#### Renouvellement automatique

```bash
# Tester le renouvellement
sudo certbot renew --dry-run

# Ajouter au crontab pour renouveler automatiquement
sudo crontab -e
# Ajouter la ligne:
0 0 1 * * certbot renew --quiet && systemctl reload nginx
```

### Option 2: Certificats auto-signés (Développement)

```bash
# Générer automatiquement
node scripts/generate-self-signed-cert.js

# OU manuellement avec OpenSSL
openssl req -x509 -newkey rsa:4096 \
  -keyout ssl/key.pem \
  -out ssl/cert.pem \
  -days 365 -nodes \
  -subj "/C=SN/ST=Dakar/L=Dakar/O=CERER/CN=localhost"
```

⚠️ **ATTENTION:** Les certificats auto-signés ne doivent être utilisés qu'en développement

### Utilisation dans server.js

```javascript
const httpsConfig = require('./https-config');

// Créer le serveur (HTTP ou HTTPS selon config)
const server = httpsConfig.createServer(app);

// Forcer HTTPS en production
app.use(httpsConfig.forceHTTPS);

// Ajouter HSTS (HTTP Strict Transport Security)
app.use(httpsConfig.hstsMiddleware);

server.listen(PORT, () => {
    console.log(`Serveur démarré sur ${httpsConfig.SSL_ENABLED ? 'https' : 'http'}://localhost:${PORT}`);
});
```

---

## 🌐 CORS SÉCURISÉ

### Fichier: `cors-config.js`

### Configuration

```env
# Domaines autorisés (séparés par virgule)
ALLOWED_ORIGINS=https://archivage.cerer.sn,https://www.cerer.sn,https://admin.cerer.sn
```

### Modes CORS

#### Mode Normal (Développement)

- Accepte les requêtes sans origin (Postman, mobile apps)
- Log des requêtes bloquées
- Headers permissifs

#### Mode Strict (Production)

- **Refuse** les requêtes sans origin
- Vérifie strictement la whitelist
- Headers restrictifs
- Logs d'alerte pour toute violation

### Utilisation

```javascript
const cors = require('cors');
const { corsOptions, verifyOrigin } = require('./cors-config');

// Appliquer CORS
app.use(cors(corsOptions));

// Middleware de vérification supplémentaire
app.use(verifyOrigin);
```

### Gestion dynamique des origins

```javascript
const { addAllowedOrigin, removeAllowedOrigin, getAllowedOrigins } = require('./cors-config');

// Ajouter une origin au runtime (admin seulement)
addAllowedOrigin('https://nouveau-domaine.com');

// Retirer une origin
removeAllowedOrigin('https://ancien-domaine.com');

// Voir toutes les origins
console.log(getAllowedOrigins());
```

---

## 📊 AUDIT LOGS

### Fichier: `audit-logger.js`

### Types d'événements tracés

#### Authentification
- ✅ Connexions réussies/échouées
- ✅ Déconnexions
- ✅ Changements de mot de passe
- ✅ Renouvellement de tokens
- ✅ Accès non autorisés

#### Utilisateurs
- ✅ Création d'utilisateurs
- ✅ Modifications de profil
- ✅ Suppressions
- ✅ Changements de rôle

#### Documents
- ✅ Uploads
- ✅ Consultations
- ✅ Téléchargements
- ✅ Modifications
- ✅ Suppressions
- ✅ Partages

#### Sécurité
- ✅ Rate limiting dépassé
- ✅ Tentatives d'injection NoSQL
- ✅ Violations CORS
- ✅ Tokens invalides/expirés

### Fichiers de logs

```
logs/
├── audit/
│   ├── audit-all.log          # Tous les événements
│   ├── audit-security.log     # Événements de sécurité critiques
│   ├── audit-documents.log    # Actions sur documents
│   └── audit-users.log        # Actions sur utilisateurs
├── security.log               # Logs généraux de sécurité
├── error.log                  # Erreurs
└── requests.log               # Requêtes HTTP
```

### Utilisation

```javascript
const audit = require('./audit-logger');

// Logger une connexion réussie
audit.logLoginSuccess('fatima', userId, req.ip, req.headers['user-agent']);

// Logger un upload de document
audit.logDocumentUploaded(
    documentId,
    'Rapport_Annuel_2025.pdf',
    { username: 'fatima', userId },
    1024000, // taille en bytes
    'Rapports'
);

// Logger un accès non autorisé
audit.logUnauthorizedAccess(
    'deguene',
    userId,
    '/api/admin/users',
    req.ip,
    req.headers['user-agent']
);

// Middleware automatique pour toutes les requêtes sensibles
app.use(audit.auditMiddleware);
```

### Format des logs (JSON)

```json
{
  "timestamp": "2025-11-22 14:30:45",
  "event": "DOCUMENT_DOWNLOADED",
  "level": "info",
  "details": {
    "documentId": "DOC-20251122-143045123-4567",
    "documentName": "Budget_2025.xlsx",
    "downloadedBy": "jbk",
    "downloadedById": "507f1f77bcf86cd799439011",
    "ip": "192.168.1.100"
  },
  "service": "cerer-archivage"
}
```

### Analyse des logs

```bash
# Voir les 50 derniers événements
tail -50 logs/audit/audit-all.log

# Chercher toutes les connexions échouées
grep "LOGIN_FAILED" logs/audit/audit-security.log

# Voir les accès non autorisés aujourd'hui
grep "$(date +%Y-%m-%d)" logs/audit/audit-security.log | grep "UNAUTHORIZED"

# Compter les téléchargements par utilisateur
grep "DOCUMENT_DOWNLOADED" logs/audit/audit-documents.log | jq -r '.details.downloadedBy' | sort | uniq -c
```

---

## 🚀 DÉMARRAGE RAPIDE

### 1. Installer les dépendances

```bash
npm install
```

### 2. Générer les secrets JWT

```bash
node scripts/generate-secrets.js
```

Cela va créer/mettre à jour votre fichier `.env` avec des secrets sécurisés.

### 3. Configurer .env

```env
# MongoDB
MONGODB_URI=mongodb://localhost:27017/cerer_archivage?retryWrites=true&w=majority

# Port
PORT=4000
NODE_ENV=development

# JWT (déjà généré par le script)
JWT_SECRET=<généré_automatiquement>
JWT_REFRESH_SECRET=<généré_automatiquement>

# HTTPS (optionnel en dev)
SSL_ENABLED=false

# CORS
ALLOWED_ORIGINS=http://localhost:4000

# Email
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=votre_email@gmail.com
SMTP_PASS=votre_mot_de_passe_app
```

### 4. Démarrer le serveur

```bash
# Développement
npm run dev

# Production
npm start
```

### 5. Vérifier les logs

```bash
# Vérifier que le serveur démarre correctement
tail -f logs/audit/audit-all.log
```

Vous devriez voir :
```
[AUDIT] 2025-11-22 14:00:00 info: SERVER_STARTED
[AUDIT] 2025-11-22 14:00:01 info: DATABASE_CONNECTED
```

---

## 🌍 MIGRATION PRODUCTION

### Checklist avant déploiement

- [ ] Secrets JWT générés et différents de ceux du dev
- [ ] `NODE_ENV=production` configuré
- [ ] MongoDB Atlas configuré et testé
- [ ] Certificat SSL Let's Encrypt obtenu
- [ ] `SSL_ENABLED=true`
- [ ] CORS configuré avec vos vrais domaines
- [ ] SMTP configuré avec un vrai serveur email
- [ ] `.env` ajouté au `.gitignore`
- [ ] Variables d'environnement configurées sur la plateforme
- [ ] Backups MongoDB configurés
- [ ] Monitoring des logs activé

### Configuration Render.com

1. **Créer le service Web**
   - Repository: Votre repo GitHub
   - Build Command: `npm install`
   - Start Command: `npm start`

2. **Variables d'environnement**

```
NODE_ENV=production
MONGODB_URI=mongodb://user:pass@cluster...mongodb.net:27017/.../cerer_archivage?ssl=true...
PORT=4000
JWT_SECRET=<votre_secret_production>
JWT_REFRESH_SECRET=<votre_secret_production_different>
SSL_ENABLED=true
ALLOWED_ORIGINS=https://votre-domaine.com
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=contact@votre-domaine.com
SMTP_PASS=<mot_de_passe_app>
```

3. **Domaine personnalisé**
   - Settings → Custom Domain
   - Ajouter votre domaine
   - Configurer DNS (Render fournit SSL automatiquement via Let's Encrypt)

### Configuration VPS/Serveur dédié

```bash
# 1. Cloner le repo
git clone https://github.com/votre-repo/archivage-cerer.git
cd archivage-cerer/backend

# 2. Installer Node.js (v18+)
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# 3. Installer MongoDB ou configurer Atlas
# (Voir documentation MongoDB)

# 4. Installer les dépendances
npm install --production

# 5. Générer les secrets
node scripts/generate-secrets.js

# 6. Configurer .env
nano .env
# (Remplir toutes les variables)

# 7. Installer PM2 pour gérer le process
sudo npm install -g pm2

# 8. Démarrer l'application
pm2 start server.js --name archivage-cerer

# 9. Configurer le démarrage automatique
pm2 startup
pm2 save

# 10. Installer Nginx comme reverse proxy
sudo apt install nginx

# 11. Configurer Nginx
sudo nano /etc/nginx/sites-available/archivage-cerer
```

**Configuration Nginx:**

```nginx
server {
    listen 80;
    server_name archivage.cerer.sn;

    # Rediriger HTTP vers HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name archivage.cerer.sn;

    # Certificats SSL Let's Encrypt
    ssl_certificate /etc/letsencrypt/live/archivage.cerer.sn/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/archivage.cerer.sn/privkey.pem;

    # Configuration SSL moderne
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers 'ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256...';
    ssl_prefer_server_ciphers off;

    # HSTS
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;

    # Reverse proxy vers Node.js
    location / {
        proxy_pass http://localhost:4000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Taille max upload
    client_max_body_size 100M;
}
```

```bash
# 12. Activer le site
sudo ln -s /etc/nginx/sites-available/archivage-cerer /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx

# 13. Obtenir le certificat SSL
sudo certbot --nginx -d archivage.cerer.sn
```

---

## 🔧 TROUBLESHOOTING

### "Token invalide ou expiré"

**Cause:** Le token JWT a expiré (après 2h) ou est invalide

**Solution:**
```javascript
// Utiliser le refresh token pour obtenir un nouveau access token
const response = await fetch('/api/refresh-token', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json'
    },
    body: JSON.stringify({
        refreshToken: localStorage.getItem('refreshToken')
    })
});

const { accessToken } = await response.json();
localStorage.setItem('accessToken', accessToken);
```

### "Origin non autorisée par CORS"

**Cause:** Le domaine n'est pas dans la liste `ALLOWED_ORIGINS`

**Solution:**
```env
# Ajouter tous vos domaines dans .env
ALLOWED_ORIGINS=https://archivage.cerer.sn,https://www.cerer.sn,http://localhost:4000
```

### Les logs ne sont pas créés

**Cause:** Permissions insuffisantes sur le dossier `logs/`

**Solution:**
```bash
# Créer le dossier avec les bonnes permissions
mkdir -p logs/audit
chmod 755 logs
chmod 755 logs/audit
```

### Certificat SSL expiré

**Vérifier:**
```bash
node -e "require('./https-config').checkCertificateValidity().then(console.log)"
```

**Renouveler:**
```bash
sudo certbot renew
sudo systemctl reload nginx
```

### Rate limiting trop strict

**Ajuster dans `security-config.js`:**
```javascript
const generalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 200, // Augmenter de 100 à 200
    //...
});
```

---

## 📞 SUPPORT ET MAINTENANCE

### Rotation des secrets JWT

**Tous les 90 jours en production:**

```bash
# 1. Générer de nouveaux secrets
node scripts/generate-secrets.js

# 2. Mettre à jour sur la plateforme de production

# 3. Redémarrer le serveur
pm2 restart archivage-cerer

# 4. Tous les utilisateurs devront se reconnecter
```

### Monitoring des logs

**Avec Logrotate (Linux):**

```bash
sudo nano /etc/logrotate.d/archivage-cerer
```

```
/chemin/vers/backend/logs/*.log
/chemin/vers/backend/logs/audit/*.log {
    daily
    rotate 30
    compress
    delaycompress
    notifempty
    create 0640 www-data www-data
    sharedscripts
    postrotate
        pm2 reloadLogs
    endscript
}
```

### Alertes de sécurité

Configurez des alertes pour :
- Plus de 10 tentatives de connexion échouées en 1h
- Accès non autorisés répétés
- Tokens invalides en masse
- Violations CORS

---

## ✅ CHECKLIST FINALE

### Développement
- [x] JWT configuré et testé
- [x] CORS fonctionne avec localhost
- [x] Logs générés correctement
- [x] .env configuré
- [x] Secrets générés

### Production
- [ ] NODE_ENV=production
- [ ] Secrets JWT uniques pour prod
- [ ] MongoDB Atlas configuré
- [ ] SSL/HTTPS activé
- [ ] CORS avec vrais domaines
- [ ] SMTP production configuré
- [ ] Monitoring logs activé
- [ ] Backups automatiques
- [ ] Alertes configurées
- [ ] Documentation utilisateur

---

**Développé par le Service Informatique du C.E.R.E.R**
**Version:** 3.0
**Contact:** jacquesboubacar.koukoui@gmail.com
