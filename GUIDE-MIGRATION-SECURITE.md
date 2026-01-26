# 🚀 GUIDE DE MIGRATION - SÉCURITÉ AVANCÉE

**Objectif:** Migrer de l'authentification par sessions vers JWT avec sécurité complète
**Temps estimé:** 30 minutes à 2 heures selon configuration
**Niveau:** Intermédiaire

---

## ⚡ MIGRATION EXPRESS (30 minutes)

### Étape 1: Générer les secrets (2 min)

```bash
cd backend
node scripts/generate-secrets.js
```

**Résultat attendu:**
```
🔐 GÉNÉRATEUR DE SECRETS SÉCURISÉS
═══════════════════════════════════════════════════════

Secrets générés avec succès:
─────────────────────────────────────────────────────

JWT_SECRET=
<64 caractères hexadécimaux>

JWT_REFRESH_SECRET=
<64 caractères hexadécimaux différents>

SESSION_SECRET=
<32 caractères hexadécimaux>

✅ Fichier .env créé avec succès
```

### Étape 2: Vérifier .env (2 min)

```bash
# Vérifier que le fichier existe
dir .env

# OU sur Linux/Mac
ls -la .env
```

Votre `.env` doit contenir au minimum:

```env
MONGODB_URI=mongodb://localhost:27017/cerer_archivage?retryWrites=true&w=majority
PORT=4000
NODE_ENV=development

JWT_SECRET=<généré_automatiquement>
JWT_REFRESH_SECRET=<généré_automatiquement>
SESSION_SECRET=<généré_automatiquement>

JWT_EXPIRY=2h
JWT_REFRESH_EXPIRY=7d

ALLOWED_ORIGINS=http://localhost:4000
```

### Étape 3: Tester la sécurité (5 min)

```bash
node scripts/test-security.js
```

**Si tout est OK, vous verrez:**
```
🎉 TOUS LES TESTS SONT PASSÉS! Sécurité opérationnelle.
```

**Si des tests échouent:**
- Vérifiez que toutes les dépendances sont installées: `npm install`
- Vérifiez que .env contient les bonnes variables
- Consultez les messages d'erreur détaillés

### Étape 4: Démarrer le serveur (1 min)

```bash
npm start
```

**Logs attendus:**
```
🔒 Configuration CORS:
   Mode: NORMAL (Développement)
   Origins autorisées: http://localhost:4000

✅ MongoDB connecté: cerer_archivage
🌐 Serveur HTTP (non sécurisé)
⚠️  Pour activer HTTPS, configurez SSL_ENABLED=true dans .env

✅ Serveur démarré sur http://localhost:4000
```

### Étape 5: Tester l'API (5 min)

**Test 1: Login avec JWT**

Ouvrez Postman ou utilisez curl:

```bash
# Connexion
curl -X POST http://localhost:4000/api/login \
  -H "Content-Type: application/json" \
  -d '{"username":"fatima","password":"1234"}'
```

**Réponse attendue:**
```json
{
  "success": true,
  "message": "Connexion réussie",
  "user": {
    "username": "fatima",
    "email": "fatima@ucad.edu.sn",
    "niveau": 1,
    "departement": "Direction"
  },
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Test 2: Accès avec token**

```bash
# Remplacez <TOKEN> par l'accessToken reçu
curl http://localhost:4000/api/documents \
  -H "Authorization: Bearer <TOKEN>"
```

### ✅ Migration Express terminée!

Si tous les tests passent, votre système est sécurisé et fonctionnel en développement.

---

## 🔧 MIGRATION COMPLÈTE (2 heures)

Pour un déploiement en production, suivez ces étapes supplémentaires.

### Étape 6: Configuration MongoDB Atlas (30 min)

#### 6.1 Créer un cluster

1. Allez sur https://cloud.mongodb.com
2. Créez un compte ou connectez-vous
3. Créez un nouveau cluster (Free tier M0)
4. Attendez que le cluster soit créé (3-5 min)

#### 6.2 Créer un utilisateur de base de données

1. Database Access → Add New Database User
2. Username: `cerer_admin`
3. Password: Générer un mot de passe fort (copier-le!)
4. Database User Privileges: Read and write to any database

#### 6.3 Autoriser l'accès réseau

1. Network Access → Add IP Address
2. Pour les tests: Allow Access from Anywhere (0.0.0.0/0)
3. Pour la production: IP de votre serveur uniquement

#### 6.4 Obtenir l'URI de connexion

1. Database → Connect → Connect your application
2. Driver: Node.js
3. Version: 4.1 or later
4. **Copiez l'URI STANDARD (mongodb://, PAS mongodb+srv://)**

Format:
```
mongodb://cerer_admin:PASSWORD@cluster0-shard-00-00.xxxxx.mongodb.net:27017,cluster0-shard-00-01.xxxxx.mongodb.net:27017,cluster0-shard-00-02.xxxxx.mongodb.net:27017/cerer_archivage?ssl=true&replicaSet=atlas-xxxxx-shard-0&authSource=admin&retryWrites=true&w=majority
```

#### 6.5 Mettre à jour .env

```env
MONGODB_URI=mongodb://cerer_admin:PASSWORD@cluster0-shard-00-00.xxxxx.mongodb.net:27017,cluster0-shard-00-01.xxxxx.mongodb.net:27017,cluster0-shard-00-02.xxxxx.mongodb.net:27017/cerer_archivage?ssl=true&replicaSet=atlas-xxxxx-shard-0&authSource=admin&retryWrites=true&w=majority
```

#### 6.6 Tester la connexion

```bash
node -e "
const mongoose = require('mongoose');
require('dotenv').config();
mongoose.connect(process.env.MONGODB_URI).then(() => {
  console.log('✅ MongoDB Atlas connecté!');
  process.exit(0);
}).catch(err => {
  console.error('❌ Erreur:', err.message);
  process.exit(1);
});
"
```

### Étape 7: Configuration HTTPS/SSL (30 min)

#### Option A: Let's Encrypt (Production - Gratuit)

**Prérequis:** Un nom de domaine pointant vers votre serveur

```bash
# Sur Ubuntu/Debian
sudo apt update
sudo apt install certbot

# Obtenir le certificat
sudo certbot certonly --standalone -d archivage.cerer.sn

# Les certificats seront dans:
# /etc/letsencrypt/live/archivage.cerer.sn/fullchain.pem
# /etc/letsencrypt/live/archivage.cerer.sn/privkey.pem
```

**Configurer dans .env:**
```env
SSL_ENABLED=true
SSL_CERT_PATH=/etc/letsencrypt/live/archivage.cerer.sn/fullchain.pem
SSL_KEY_PATH=/etc/letsencrypt/live/archivage.cerer.sn/privkey.pem
```

#### Option B: Certificats auto-signés (Développement)

```bash
# Créer le dossier SSL
mkdir ssl

# Générer les certificats
openssl req -x509 -newkey rsa:4096 \
  -keyout ssl/key.pem \
  -out ssl/cert.pem \
  -days 365 -nodes \
  -subj "/C=SN/ST=Dakar/L=Dakar/O=CERER/CN=localhost"
```

**Configurer dans .env:**
```env
SSL_ENABLED=true
SSL_CERT_PATH=./ssl/cert.pem
SSL_KEY_PATH=./ssl/key.pem
```

⚠️ **Note:** Les navigateurs afficheront un avertissement avec les certificats auto-signés.

### Étape 8: Configuration Email SMTP (15 min)

#### Option A: Gmail (Développement)

1. **Activer 2FA sur votre compte Gmail:**
   - https://myaccount.google.com/security
   - Validation en deux étapes → Activer

2. **Créer un mot de passe d'application:**
   - https://myaccount.google.com/apppasswords
   - Sélectionner l'application: Mail
   - Sélectionner l'appareil: Autre (donner un nom)
   - Copier le mot de passe généré (16 caractères)

3. **Configurer dans .env:**
```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=votre.email@gmail.com
SMTP_PASS=abcd efgh ijkl mnop
```

#### Option B: SendGrid (Production - Gratuit jusqu'à 100 emails/jour)

1. Créer un compte sur https://sendgrid.com
2. Settings → API Keys → Create API Key
3. Copier la clé API

```env
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=apikey
SMTP_PASS=<votre_clé_api_sendgrid>
```

#### Tester l'envoi d'email

```bash
node -e "
const nodemailer = require('nodemailer');
require('dotenv').config();

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

transporter.sendMail({
  from: process.env.SMTP_USER,
  to: 'votre.email@test.com',
  subject: 'Test SMTP CERER',
  text: 'Email de test envoyé avec succès!'
}).then(() => {
  console.log('✅ Email envoyé!');
  process.exit(0);
}).catch(err => {
  console.error('❌ Erreur:', err.message);
  process.exit(1);
});
"
```

### Étape 9: Configuration CORS Production (10 min)

```env
# Remplacer par vos vrais domaines
ALLOWED_ORIGINS=https://archivage.cerer.sn,https://www.cerer.sn
```

**Important:**
- Ne pas inclure les chemins (`/dashboard`, etc.)
- Utiliser HTTPS en production
- Séparer par des virgules sans espaces

### Étape 10: Variables de production (5 min)

**Fichier .env de production:**

```env
# Base
NODE_ENV=production
PORT=4000

# MongoDB Atlas
MONGODB_URI=mongodb://user:pass@cluster...

# JWT (RÉGÉNÉRER POUR LA PRODUCTION!)
JWT_SECRET=<nouveau_secret_64_caractères>
JWT_REFRESH_SECRET=<nouveau_secret_64_caractères>
JWT_EXPIRY=2h
JWT_REFRESH_EXPIRY=7d

# HTTPS
SSL_ENABLED=true
SSL_CERT_PATH=/etc/letsencrypt/live/votre-domaine.com/fullchain.pem
SSL_KEY_PATH=/etc/letsencrypt/live/votre-domaine.com/privkey.pem

# CORS
ALLOWED_ORIGINS=https://archivage.cerer.sn,https://www.cerer.sn

# Email
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASS=<clé_api_sendgrid>
```

**Générer de nouveaux secrets pour la production:**
```bash
node scripts/generate-secrets.js --force
```

---

## 🌐 DÉPLOIEMENT SUR RENDER.COM (15 min)

### 1. Préparer le repository

```bash
# Vérifier que .env est dans .gitignore
echo ".env" >> .gitignore

# Commit et push
git add .
git commit -m "feat: Ajout sécurité avancée (JWT, HTTPS, CORS, Audit)"
git push origin main
```

### 2. Créer le service sur Render

1. Allez sur https://render.com
2. Connectez votre compte GitHub
3. New → Web Service
4. Sélectionnez votre repository
5. Configurez:
   - **Name:** archivage-cerer
   - **Region:** Frankfurt (le plus proche du Sénégal)
   - **Branch:** main
   - **Root Directory:** backend
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Plan:** Free

### 3. Configurer les variables d'environnement

Dans l'onglet "Environment":

```
NODE_ENV=production
PORT=4000
MONGODB_URI=mongodb://user:pass@cluster...
JWT_SECRET=<votre_secret_production>
JWT_REFRESH_SECRET=<votre_secret_production>
JWT_EXPIRY=2h
JWT_REFRESH_EXPIRY=7d
SSL_ENABLED=false
ALLOWED_ORIGINS=https://archivage-cerer.onrender.com
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASS=<clé_sendgrid>
```

**Note:** `SSL_ENABLED=false` car Render gère SSL automatiquement.

### 4. Déployer

- Cliquez sur "Create Web Service"
- Attendez le déploiement (5-10 min)
- Votre app sera disponible sur: `https://archivage-cerer.onrender.com`

### 5. Tester en production

```bash
curl https://archivage-cerer.onrender.com/api/health
```

---

## 📊 CHECKLIST DE VÉRIFICATION

### Développement
- [ ] `node scripts/generate-secrets.js` exécuté
- [ ] Fichier `.env` créé avec toutes les variables
- [ ] `node scripts/test-security.js` → tous les tests passent
- [ ] `npm start` → serveur démarre sans erreur
- [ ] Login fonctionne et retourne des tokens JWT
- [ ] Logs générés dans `logs/audit/`

### Production
- [ ] Nouveaux secrets JWT générés pour la production
- [ ] `NODE_ENV=production` configuré
- [ ] MongoDB Atlas connecté et testé
- [ ] SSL/HTTPS activé (Let's Encrypt ou via plateforme)
- [ ] CORS configuré avec vrais domaines
- [ ] SMTP production configuré et testé
- [ ] `.env` dans `.gitignore`
- [ ] Variables d'environnement configurées sur la plateforme
- [ ] Déploiement réussi
- [ ] Tests API en production réussis
- [ ] Backups MongoDB configurés
- [ ] Monitoring logs activé

---

## 🆘 DÉPANNAGE

### Erreur: "JWT_SECRET is required"

**Solution:**
```bash
node scripts/generate-secrets.js --force
```

### Erreur: "querySrv ENOTFOUND _mongodb._tcp..."

**Solution:** Utilisez l'URI standard (mongodb://) au lieu de SRV (mongodb+srv://)

```env
# ❌ NE PAS UTILISER
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/...

# ✅ UTILISER
MONGODB_URI=mongodb://user:pass@cluster-shard-00-00.mongodb.net:27017,...
```

### Erreur: "Origin not allowed by CORS"

**Solution:** Vérifiez `ALLOWED_ORIGINS` dans .env

```env
# Développement
ALLOWED_ORIGINS=http://localhost:4000

# Production
ALLOWED_ORIGINS=https://votre-domaine.com,https://www.votre-domaine.com
```

### Logs non créés

**Solution:**
```bash
mkdir -p logs/audit
chmod 755 logs
chmod 755 logs/audit
```

### "Cannot find module './auth-jwt'"

**Solution:**
```bash
# Vérifier que tous les fichiers sont présents
ls auth-jwt.js cors-config.js audit-logger.js https-config.js

# Si manquants, réinstaller
npm install
```

---

## 📞 SUPPORT

### En cas de problème

1. **Exécuter le diagnostic:**
   ```bash
   node scripts/test-security.js
   ```

2. **Consulter les logs:**
   ```bash
   tail -f logs/audit/audit-all.log
   ```

3. **Vérifier la configuration:**
   ```bash
   node -e "require('dotenv').config(); console.log(process.env)"
   ```

4. **Documentation complète:**
   - `SECURITE-AVANCEE.md` - Guide complet
   - `README.md` - Documentation générale

---

## ✅ CONCLUSION

Après cette migration, votre système dispose de:

- ✅ **JWT** pour authentification sécurisée
- ✅ **HTTPS/SSL** pour chiffrement des communications
- ✅ **CORS strict** pour protection contre requêtes non autorisées
- ✅ **Audit logs** pour traçabilité complète
- ✅ **Rate limiting** contre attaques brute force
- ✅ **Headers de sécurité** (Helmet)
- ✅ **Protection NoSQL injection**
- ✅ **Mots de passe hashés** (Bcrypt)

**🎉 Votre système est prêt pour la production!**

---

**Développé par le Service Informatique du C.E.R.E.R**
**Version:** 3.0
**Date:** Novembre 2025
