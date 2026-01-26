# 🔧 Guide Technique - Système d'Archivage CERER

**Documentation complète pour développeurs et administrateurs système**

Version : **3.0.0 Bêta**
Date : Décembre 2025

---

## 📑 Table des Matières

1. [Architecture Système](#architecture-système)
2. [Installation](#installation)
3. [Configuration](#configuration)
4. [Base de Données](#base-de-données)
5. [API Documentation](#api-documentation)
6. [Sécurité](#sécurité)
7. [Déploiement](#déploiement)
8. [Monitoring & Logs](#monitoring--logs)
9. [Scripts d'Administration](#scripts-dadministration)
10. [Troubleshooting](#troubleshooting)

---

## Architecture Système

### Stack Technique

```
Frontend:
├── HTML5 + CSS3
├── JavaScript (Vanilla ES6+)
├── Chart.js (graphiques)
└── Responsive Design

Backend:
├── Node.js >= 18.0.0
├── Express.js 4.18.2
├── MongoDB 6.3.0
└── Session-based Authentication

Sécurité:
├── bcrypt (hachage mots de passe)
├── Helmet (headers sécurité)
├── express-rate-limit (protection brute force)
├── express-mongo-sanitize (protection NoSQL injection)
├── express-validator (validation entrées)
└── CORS configuré

Services:
├── NodeMailer (emails)
├── Winston (logging)
├── node-cron (tâches planifiées)
└── Compression (optimisation)
```

### Architecture MVC Adaptée

```
backend/
├── server.js                    # Point d'entrée
├── security-config.js          # Configuration sécurité
├── security-logger.js          # Logger sécurité
├── cors-config.js              # Configuration CORS
├── office-editor.js            # Éditeur Office
│
├── routes/
│   └── superadmin.js           # Routes Super Admin
│
├── modules/
│   └── services.js             # Logique métier services
│
├── services/
│   ├── emailService.js         # Service d'envoi email
│   └── trashCleanup.js         # Nettoyage automatique corbeille
│
├── config/
│   └── allowedDomains.js       # Domaines email autorisés
│
├── public/
│   ├── index.html              # Dashboard classique
│   ├── new-dashboard.html      # Nouveau dashboard (BETA)
│   ├── super-admin.html        # Dashboard Super Admin
│   ├── security-logs.html      # Logs de sécurité
│   ├── css/                    # Styles
│   ├── js/                     # Scripts frontend
│   └── uploads/                # Documents uploadés (local)
│
└── scripts/
    ├── backup-database.js      # Sauvegarde MongoDB
    ├── restore-database.js     # Restauration MongoDB
    ├── init-superadmin.js      # Créer Super Admin
    └── debug-archive/          # Scripts de debug archivés
```

### Flux de Données

```
Client (Browser)
    ↓ HTTPS
Express Server (Port 4000)
    ↓
Session Middleware (MongoStore)
    ↓
Security Middleware (Helmet, Rate Limit)
    ↓
Routes Handlers
    ↓
MongoDB (Collections)
    ↓
Response (JSON)
```

---

## Installation

### Prérequis

**Système d'exploitation** :
- Windows 10/11, macOS, Linux

**Logiciels requis** :
- **Node.js** >= 18.0.0 ([nodejs.org](https://nodejs.org))
- **MongoDB** >= 6.0
  - Local : [mongodb.com/try/download/community](https://www.mongodb.com/try/download/community)
  - Cloud : MongoDB Atlas (recommandé pour production)
- **Git** (optionnel mais recommandé)

### Installation Locale

#### 1. Cloner le projet

```bash
git clone https://github.com/votre-org/archivage-cerer.git
cd archivage-cerer/backend
```

#### 2. Installer les dépendances

```bash
npm install
```

#### 3. Configurer les variables d'environnement

Copiez le fichier exemple :
```bash
cp .env.example .env
```

Éditez `.env` :
```env
# MongoDB
MONGODB_URI=mongodb://localhost:27017/cerer_archivage
MONGODB_DB_NAME=cerer_archivage

# Serveur
PORT=4000
NODE_ENV=development

# Sessions (⚠️ CHANGEZ EN PRODUCTION)
SESSION_SECRET=changez_ce_secret_en_production_avec_une_chaine_aleatoire_tres_longue
SESSION_MAX_AGE=86400000

# Email SMTP
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=votre.email@gmail.com
SMTP_PASS=votre_mot_de_passe_application
SMTP_FROM=GED CERER <votre.email@gmail.com>
```

#### 4. Démarrer MongoDB

**Windows** :
```bash
mongod --dbpath C:\data\db
```

**macOS/Linux** :
```bash
sudo systemctl start mongod
# ou
mongod --dbpath /var/lib/mongodb
```

#### 5. Créer le Super Administrateur

```bash
node scripts/init-superadmin.js
```

Notez bien les identifiants affichés !

#### 6. Démarrer le serveur

**Mode développement** (avec nodemon) :
```bash
npm run dev
```

**Mode production** :
```bash
npm start
```

Le serveur démarre sur `http://localhost:4000`

### Installation avec Docker (Optionnel)

Créez un `Dockerfile` :

```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .

EXPOSE 4000

CMD ["node", "server.js"]
```

Créez un `docker-compose.yml` :

```yaml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "4000:4000"
    environment:
      - MONGODB_URI=mongodb://mongo:27017/cerer_archivage
      - NODE_ENV=production
    depends_on:
      - mongo
    volumes:
      - ./uploads:/app/public/uploads

  mongo:
    image: mongo:6
    volumes:
      - mongo-data:/data/db
    ports:
      - "27017:27017"

volumes:
  mongo-data:
```

Lancez avec :
```bash
docker-compose up -d
```

---

## Configuration

### Variables d'Environnement

#### MongoDB

```env
# URI de connexion complète
MONGODB_URI=mongodb://localhost:27017/cerer_archivage
# ou pour MongoDB Atlas:
# MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/cerer_archivage

# Nom de la base de données
MONGODB_DB_NAME=cerer_archivage
```

#### Serveur

```env
# Port d'écoute
PORT=4000

# Environnement (development | production)
NODE_ENV=production

# Trust proxy (si derrière Nginx/reverse proxy)
TRUST_PROXY=1
```

#### Sessions

```env
# Secret pour signer les sessions (⚠️ TRÈS IMPORTANT)
# Générez avec: node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
SESSION_SECRET=votre_secret_aleatoire_tres_long_minimum_64_caracteres

# Durée de vie session (millisecondes)
SESSION_MAX_AGE=86400000  # 24 heures

# Nom du cookie
SESSION_NAME=cerer.sid

# Domaine du cookie (production)
SESSION_DOMAIN=.votre-domaine.com
```

#### Email SMTP

**Pour Gmail** :

1. Activer la 2FA sur votre compte Google
2. Générer un mot de passe d'application : https://myaccount.google.com/apppasswords
3. Configurer :

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=votre.email@gmail.com
SMTP_PASS=xxxx xxxx xxxx xxxx  # Mot de passe d'application
SMTP_FROM=GED CERER <votre.email@gmail.com>
```

**Pour autres fournisseurs** :

| Fournisseur | SMTP_HOST | SMTP_PORT | SMTP_SECURE |
|------------|-----------|-----------|-------------|
| Office365 | smtp.office365.com | 587 | false |
| Outlook | smtp-mail.outlook.com | 587 | false |
| Yahoo | smtp.mail.yahoo.com | 465 | true |
| SendGrid | smtp.sendgrid.net | 587 | false |

**Pour tests (Mailtrap)** :

```env
SMTP_HOST=smtp.mailtrap.io
SMTP_PORT=2525
SMTP_USER=votre_username_mailtrap
SMTP_PASS=votre_password_mailtrap
```

### Configuration Sécurité

Dans `security-config.js`, configurez :

#### Rate Limiting

```javascript
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5,                    // 5 tentatives max
    message: 'Trop de tentatives, réessayez dans 15 minutes'
});
```

#### CORS

Dans `cors-config.js` :

```javascript
const allowedOrigins = process.env.NODE_ENV === 'production'
    ? ['https://votre-domaine.com', 'https://www.votre-domaine.com']
    : ['http://localhost:4000', 'http://127.0.0.1:4000'];
```

---

## Base de Données

### Collections MongoDB

#### **users** (Utilisateurs)

```javascript
{
    _id: ObjectId,
    username: String,          // Unique, requis
    password: String,          // Hash bcrypt
    nom: String,
    prenom: String,
    email: String,             // Unique, requis
    niveau: Number,            // 0-3 (0=Super Admin, 3=Utilisateur)
    idDepartement: String,     // ID du département
    departementNom: String,    // Nom du département (cache)
    idService: String,         // ID du service (niveau 2-3)
    serviceNom: String,        // Nom du service (cache)
    isActive: Boolean,         // Compte actif ?
    isOnline: Boolean,         // En ligne ?
    lastLogin: Date,           // Dernière connexion
    createdAt: Date,
    mustChangePassword: Boolean // Forcer changement mdp
}
```

#### **departements** (Départements)

```javascript
{
    _id: ObjectId,
    nom: String,              // Unique, requis
    description: String,
    icon: String,             // Emoji optionnel
    createdBy: String,        // username créateur
    createdAt: Date
}
```

#### **services** (Services)

```javascript
{
    _id: ObjectId,
    nom: String,              // Requis
    description: String,
    icon: String,
    idDepartement: String,    // Lien vers département
    createdBy: String,
    createdAt: Date
}
```

#### **categories** (Catégories)

```javascript
{
    id: String,               // UUID
    nom: String,
    description: String,
    icon: String,
    idDepartement: String,
    idService: String,
    createdBy: String,
    createdAt: Date
}
```

#### **documents** (Documents)

```javascript
{
    _id: ObjectId,
    titre: String,            // Requis
    idUtilisateur: String,    // Propriétaire
    idDepartement: String,
    idService: String,
    categorie: String,        // ID catégorie
    type: String,             // MIME type
    taille: Number,           // Bytes
    contenu: String,          // Base64 (⚠️ Attention à la taille)
    dateAjout: Date,
    locked: Boolean,          // Document verrouillé ?
    lockedBy: String,
    lockedAt: Date,
    deleted: Boolean,         // Dans corbeille ?
    deletedAt: Date,
    partages: [String],       // Usernames avec accès
    favoris: [String],        // Usernames en favori
    downloads: Number,        // Compteur téléchargements
    views: Number             // Compteur vues
}
```

#### **security_logs** (Logs de Sécurité)

```javascript
{
    _id: ObjectId,
    timestamp: Date,
    level: String,            // INFO | WARNING | CRITICAL
    event: String,            // Type d'événement
    userId: String,
    username: String,
    ip: String,
    userAgent: String,
    details: Object,          // Détails spécifiques
    resourceId: String,       // ID ressource affectée
    resourceType: String,     // Type ressource
    success: Boolean,
    errorMessage: String
}
```

#### **sessions** (Sessions Express)

Gérée automatiquement par `connect-mongo`.

```javascript
{
    _id: String,              // Session ID
    expires: Date,
    session: Object           // Données session
}
```

### Index Recommandés

```javascript
// users
db.users.createIndex({ username: 1 }, { unique: true });
db.users.createIndex({ email: 1 }, { unique: true });
db.users.createIndex({ niveau: 1 });
db.users.createIndex({ idDepartement: 1 });
db.users.createIndex({ isOnline: 1 });

// documents
db.documents.createIndex({ idUtilisateur: 1 });
db.documents.createIndex({ idDepartement: 1 });
db.documents.createIndex({ idService: 1 });
db.documents.createIndex({ categorie: 1 });
db.documents.createIndex({ dateAjout: -1 });
db.documents.createIndex({ deleted: 1 });
db.documents.createIndex({ locked: 1 });
db.documents.createIndex({ titre: "text" }); // Recherche texte

// security_logs
db.security_logs.createIndex({ timestamp: -1 });
db.security_logs.createIndex({ userId: 1 });
db.security_logs.createIndex({ level: 1 });
db.security_logs.createIndex({ event: 1 });

// sessions
db.sessions.createIndex({ expires: 1 }, { expireAfterSeconds: 0 });
```

### Sauvegarde et Restauration

#### Sauvegarde

```bash
# Sauvegarde complète
node scripts/backup-database.js

# Ou avec mongodump
mongodump --uri="mongodb://localhost:27017/cerer_archivage" --out=./backups/$(date +%Y%m%d)
```

#### Restauration

```bash
# Restauration depuis script
node scripts/restore-database.js

# Ou avec mongorestore
mongorestore --uri="mongodb://localhost:27017/cerer_archivage" ./backups/20251227
```

#### Sauvegarde Automatique

Configurez un cron job :

```bash
# Tous les jours à 2h du matin
0 2 * * * cd /chemin/vers/backend && node scripts/backup-database.js
```

---

## API Documentation

### Authentification

Toutes les routes (sauf login/register) nécessitent une **session active**.

#### POST `/api/login`

Connexion utilisateur.

**Request** :
```json
{
    "username": "john.doe",
    "password": "motdepasse123"
}
```

**Response** :
```json
{
    "success": true,
    "message": "Connexion réussie",
    "user": {
        "username": "john.doe",
        "nom": "Doe",
        "prenom": "John",
        "email": "john.doe@ucad.edu.sn",
        "niveau": 2,
        "departementNom": "Sciences",
        "serviceNom": "Informatique"
    }
}
```

**Erreurs** :
- `401` : Identifiants invalides
- `403` : Compte désactivé
- `429` : Trop de tentatives (rate limit)

#### POST `/api/register`

Inscription (si activée).

**Request** :
```json
{
    "username": "john.doe",
    "email": "john.doe@ucad.edu.sn",
    "password": "MotDePasse123!",
    "nom": "Doe",
    "prenom": "John"
}
```

#### POST `/api/logout`

Déconnexion.

**Response** :
```json
{
    "success": true,
    "message": "Déconnexion réussie"
}
```

#### GET `/api/session-check`

Vérifier la session active.

**Response** :
```json
{
    "authenticated": true,
    "username": "john.doe"
}
```

### Documents

#### GET `/api/documents/:userId`

Récupérer les documents de l'utilisateur.

**Permissions** :
- Niveau 3 : Ses propres documents
- Niveau 2 : Documents du service
- Niveau 1 : Documents du département
- Niveau 0 : Tous les documents

**Response** :
```json
{
    "success": true,
    "documents": [
        {
            "_id": "507f1f77bcf86cd799439011",
            "titre": "Mémoire M2 2024",
            "type": "application/pdf",
            "taille": 2048576,
            "dateAjout": "2024-12-27T10:00:00Z",
            "categorie": "Mémoires",
            "locked": false,
            "downloads": 5
        }
    ]
}
```

#### POST `/api/documents`

Uploader un document.

**Request** (FormData) :
```
titre: "Mon document"
categorie: "cat-123"
description: "Description optionnelle"
file: (binary)
```

**Response** :
```json
{
    "success": true,
    "message": "Document ajouté avec succès",
    "documentId": "507f1f77bcf86cd799439011"
}
```

**Limites** :
- Taille max : 50 MB
- Formats : PDF, DOCX, XLSX, PPTX

#### GET `/api/documents/:userId/:docId`

Récupérer un document spécifique.

#### POST `/api/documents/:userId/:docId/download`

Télécharger un document.

**Response** : Fichier binaire avec headers appropriés

#### DELETE `/api/documents/:userId/:docId`

Supprimer (mettre à la corbeille).

#### POST `/api/documents/restore/:docId`

Restaurer depuis la corbeille.

#### DELETE `/api/documents/permanent/:docId`

Suppression définitive.

### Recherche

#### GET `/api/search?q=terme`

Recherche globale (services, catégories, documents).

**Response** :
```json
{
    "success": true,
    "services": [...],
    "categories": [...],
    "documents": [...]
}
```

#### GET `/api/documents/my`

Mes documents.

#### GET `/api/documents/recent`

Documents récents.

#### GET `/api/documents/favorites`

Mes favoris.

#### GET `/api/documents/new?days=7`

Nouveaux documents (derniers X jours).

### Administration (Super Admin seulement)

**Base URL** : `/api/superadmin/`

#### GET `/users`

Liste tous les utilisateurs (avec filtres).

#### POST `/users`

Créer un utilisateur.

#### PUT `/users/:username`

Modifier un utilisateur.

#### DELETE `/users/:username`

Supprimer un utilisateur.

#### POST `/users/:username/force-logout`

Forcer la déconnexion.

#### POST `/maintenance/enable`

Activer le mode maintenance.

#### GET `/stats`

Statistiques globales.

### Logs de Sécurité

#### GET `/api/security-logs`

Récupérer les logs de sécurité.

**Query Params** :
- `limit` : Nombre de logs (défaut: 100)
- `level` : Filtrer par niveau (INFO | WARNING | CRITICAL)
- `userId` : Filtrer par utilisateur
- `startDate` : Date début
- `endDate` : Date fin

**Response** :
```json
{
    "success": true,
    "logs": [...],
    "stats": {
        "INFO": 1500,
        "WARNING": 45,
        "CRITICAL": 3
    }
}
```

---

## Sécurité

### Meilleures Pratiques Implémentées

✅ **Authentification** :
- Mots de passe hashés avec bcrypt (10 rounds)
- Sessions sécurisées stockées dans MongoDB
- Rate limiting sur login (5 tentatives / 15 min)
- Détection des tentatives de brute force

✅ **Protection des Données** :
- Validation stricte des entrées (express-validator)
- Protection NoSQL injection (express-mongo-sanitize)
- XSS prevention (échappement HTML)
- CORS configuré strictement

✅ **Headers de Sécurité** (Helmet) :
```javascript
Content-Security-Policy
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
Strict-Transport-Security: max-age=31536000
```

✅ **Sessions** :
- Cookies HTTP-Only
- Cookies Secure (en HTTPS)
- SameSite=Strict
- Expiration automatique

✅ **Logging** :
- Tous les événements de sécurité loggés
- IP et User-Agent trackés
- Détection d'anomalies

### Checklist Sécurité Production

- [ ] **Changez SESSION_SECRET** (générez un secret aléatoire)
- [ ] **HTTPS obligatoire** (Let's Encrypt ou certificat)
- [ ] **Configurez CORS** correctement (domaines autorisés)
- [ ] **MongoDB Atlas** avec authentication
- [ ] **Variables d'environnement** sécurisées (pas de .env committé)
- [ ] **Rate limiting** activé
- [ ] **Logs monitoring** configuré
- [ ] **Sauvegardes automatiques** planifiées
- [ ] **Firewall** configuré (ports 80, 443, MongoDB)
- [ ] **Fail2ban** ou équivalent pour bannir IPs malveillantes

### Audit de Sécurité

```bash
# Scanner vulnérabilités NPM
npm audit

# Corriger automatiquement (avec prudence)
npm audit fix

# Scanner code avec ESLint
npm run lint

# Tests de sécurité
node scripts/test-security.js
```

---

## Déploiement

### Déploiement sur Render.com (Gratuit)

1. **Créer un compte** sur [render.com](https://render.com)

2. **Nouveau Web Service** :
   - Connectez votre repo GitHub
   - Build Command : `npm install`
   - Start Command : `npm start`
   - Environment : `Node`

3. **Variables d'environnement** :
   ```
   MONGODB_URI=mongodb+srv://...
   NODE_ENV=production
   SESSION_SECRET=<généré>
   SMTP_HOST=smtp.gmail.com
   SMTP_USER=...
   SMTP_PASS=...
   ```

4. **Déployez** !

5. **MongoDB Atlas** :
   - Créez un cluster gratuit sur [mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas)
   - Whitelist l'IP de Render (0.0.0.0/0 pour simplicité)
   - Copiez l'URI de connexion

### Déploiement sur VPS (Production)

#### 1. Préparer le serveur (Ubuntu 22.04)

```bash
# Mettre à jour
sudo apt update && sudo apt upgrade -y

# Installer Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Installer MongoDB (optionnel si local)
wget -qO - https://www.mongodb.org/static/pgp/server-6.0.asc | sudo apt-key add -
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/6.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-6.0.list
sudo apt update
sudo apt install -y mongodb-org
sudo systemctl start mongod
sudo systemctl enable mongod

# Installer Nginx
sudo apt install -y nginx

# Installer certbot (SSL gratuit)
sudo apt install -y certbot python3-certbot-nginx
```

#### 2. Configurer Nginx (Reverse Proxy)

Créez `/etc/nginx/sites-available/cerer-archivage` :

```nginx
server {
    listen 80;
    server_name votre-domaine.com www.votre-domaine.com;

    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name votre-domaine.com www.votre-domaine.com;

    # SSL Configuration (certbot le gérera)
    ssl_certificate /etc/letsencrypt/live/votre-domaine.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/votre-domaine.com/privkey.pem;

    # Security Headers
    add_header X-Frame-Options "DENY" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Strict-Transport-Security "max-age=31536000" always;

    # Reverse proxy to Node.js
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

    # Limit upload size
    client_max_body_size 50M;
}
```

Activez :
```bash
sudo ln -s /etc/nginx/sites-available/cerer-archivage /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

#### 3. Obtenir SSL (Let's Encrypt)

```bash
sudo certbot --nginx -d votre-domaine.com -d www.votre-domaine.com
```

#### 4. Configurer PM2 (Process Manager)

```bash
# Installer PM2
sudo npm install -g pm2

# Démarrer l'application
cd /chemin/vers/backend
pm2 start server.js --name cerer-archivage

# Auto-restart au boot
pm2 startup
pm2 save

# Monitoring
pm2 monit

# Logs
pm2 logs cerer-archivage
```

#### 5. Configurer le Firewall

```bash
sudo ufw allow 22    # SSH
sudo ufw allow 80    # HTTP
sudo ufw allow 443   # HTTPS
sudo ufw enable
```

---

## Monitoring & Logs

### Winston Logging

Les logs sont écrits dans :
- **Console** (développement)
- **Fichiers** (production) :
  - `logs/combined.log` : Tous les logs
  - `logs/error.log` : Erreurs uniquement
  - `logs/security.log` : Logs de sécurité

Configuration dans `security-logger.js`.

### Logs de Sécurité

Tous les événements de sécurité sont enregistrés :

```javascript
// Exemple de log
{
    timestamp: "2024-12-27T10:00:00.000Z",
    level: "WARNING",
    event: "LOGIN_FAILED",
    userId: null,
    username: "john.doe",
    ip: "192.168.1.100",
    details: { reason: "Invalid password" }
}
```

### Monitoring avec PM2

```bash
# Dashboard temps réel
pm2 monit

# Logs en temps réel
pm2 logs

# Statistiques
pm2 show cerer-archivage

# Restart si crashé
pm2 resurrect
```

### Monitoring Externe (Optionnel)

Intégrations recommandées :
- **UptimeRobot** : Monitoring disponibilité (gratuit)
- **Sentry** : Tracking erreurs JavaScript
- **LogRocket** : Session replay
- **New Relic** : Performance monitoring

---

## Scripts d'Administration

### Scripts Disponibles

```bash
scripts/
├── backup-database.js           # Sauvegarde MongoDB
├── restore-database.js          # Restauration MongoDB
├── init-superadmin.js          # Créer Super Admin
├── create-superadmin.js        # Créer Super Admin interactif
├── delete-superadmin.js        # Supprimer Super Admin
├── reset-superadmin-password.js # Reset mdp Super Admin
├── list-all-users.js           # Lister tous utilisateurs
├── list-departements.js        # Lister départements
├── list-services.js            # Lister services
├── list-collections.js         # Lister collections MongoDB
├── force-logout-user.js        # Forcer déconnexion utilisateur
├── clean-orphan-categories.js  # Nettoyer catégories orphelines
├── migrate-*.js                # Scripts de migration
└── generate-secrets.js         # Générer secrets aléatoires
```

### Exemples d'Utilisation

#### Créer un Super Admin

```bash
node scripts/init-superadmin.js
```

#### Sauvegarder la base

```bash
node scripts/backup-database.js
```

#### Lister tous les utilisateurs

```bash
node scripts/list-all-users.js
```

#### Forcer la déconnexion d'un utilisateur

```bash
node scripts/force-logout-user.js --username=john.doe
```

#### Générer un SESSION_SECRET sécurisé

```bash
node scripts/generate-secrets.js
```

---

## Troubleshooting

### Problème : Le serveur ne démarre pas

**Erreur** : `Error: listen EADDRINUSE :::4000`

**Solution** :
```bash
# Trouver le process sur le port 4000
lsof -i :4000  # macOS/Linux
netstat -ano | findstr :4000  # Windows

# Tuer le process
kill -9 <PID>  # macOS/Linux
taskkill /PID <PID> /F  # Windows
```

### Problème : Connexion MongoDB échoue

**Erreur** : `MongooseServerSelectionError: connect ECONNREFUSED`

**Solutions** :
1. Vérifiez que MongoDB est démarré :
   ```bash
   sudo systemctl status mongod
   ```

2. Vérifiez l'URI dans `.env`

3. Testez la connexion :
   ```bash
   mongo mongodb://localhost:27017/cerer_archivage
   ```

4. Pour MongoDB Atlas, vérifiez :
   - IP whitelistée
   - Identifiants corrects
   - Cluster actif

### Problème : Emails ne partent pas

**Solutions** :

1. **Gmail** : Vérifiez que vous utilisez un **mot de passe d'application**, pas votre mot de passe Gmail normal

2. **Testez SMTP** :
   ```javascript
   // test-smtp.js
   const nodemailer = require('nodemailer');

   const transporter = nodemailer.createTransport({
       host: process.env.SMTP_HOST,
       port: process.env.SMTP_PORT,
       auth: {
           user: process.env.SMTP_USER,
           pass: process.env.SMTP_PASS
       }
   });

   transporter.verify((error, success) => {
       if (error) console.log('❌', error);
       else console.log('✅ Server ready');
   });
   ```

3. **Utilisez Mailtrap** pour les tests

### Problème : Session déconnecte constamment

**Solutions** :

1. Vérifiez que les cookies sont autorisés dans le navigateur

2. En HTTPS, vérifiez la config session :
   ```javascript
   cookie: {
       secure: process.env.NODE_ENV === 'production', // true en prod
       httpOnly: true,
       sameSite: 'strict'
   }
   ```

3. Videz le cache et les cookies du navigateur

4. Vérifiez que `SESSION_SECRET` n'a pas changé

### Problème : Documents ne s'uploadent pas

**Erreur** : `413 Payload Too Large`

**Solution** : Augmentez la limite dans `server.js` :
```javascript
app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ limit: '100mb', extended: true }));
```

**Erreur** : `File type not supported`

**Solution** : Vérifiez les formats autorisés dans le code d'upload

### Problème : Performance lente

**Solutions** :

1. **Créez les index MongoDB** (voir section Base de Données)

2. **Activez la compression** (déjà fait dans `security-config.js`)

3. **Paginéz les résultats** (déjà implémenté)

4. **Optimisez les queries** :
   - Utilisez `.select()` pour ne récupérer que les champs nécessaires
   - Évitez de charger `contenu` des documents si non nécessaire

5. **Monitoring** :
   ```bash
   # Analyser les requêtes lentes
   db.setProfilingLevel(2)
   db.system.profile.find().sort({ts: -1}).limit(5)
   ```

---

## Support & Contribution

### Rapporter un Bug

1. Vérifiez que le bug n'est pas déjà reporté
2. Fournissez :
   - Version Node.js et MongoDB
   - Environnement (OS, navigateur)
   - Logs pertinents
   - Steps to reproduce

### Contribuer

1. Fork le projet
2. Créez une branche (`git checkout -b feature/AmazingFeature`)
3. Committez (`git commit -m 'Add: AmazingFeature'`)
4. Push (`git push origin feature/AmazingFeature`)
5. Ouvrez une Pull Request

---

## Changelog

### v3.0.0 Bêta (Décembre 2025)

**✨ Nouvelles Fonctionnalités** :
- Nouveau dashboard moderne
- Système de logs de sécurité complet
- Documents verrouillés
- Recherche globale avancée
- Quick access (Mes docs, Récents, Favoris, Nouveaux)

**🔒 Sécurité** :
- Correction 5 vulnérabilités majeures
- Détection changement de session
- Nettoyage automatique du cache
- Rate limiting amélioré

**⚡ Performance** :
- Optimisation queries MongoDB
- Pagination améliorée
- Compression activée
- Cache optimisé

**🐛 Corrections** :
- Fix permissions Niveau 1
- Fix clignotement dashboard
- Fix gestion champs N/A dans logs

---

## Licence

**Projet Privé - C.E.R.E.R**
Tous droits réservés

---

**Documentation mise à jour** : 27 Décembre 2025
**Version** : 3.0.0 Bêta
**Contact Technique** : support@cerer.edu.sn
