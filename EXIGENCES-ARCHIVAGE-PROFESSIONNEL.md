# 📋 Exigences pour un Système d'Archivage Professionnel

**Date**: 30 Octobre 2025
**Contexte**: Migration vers serveurs UCAD ou hébergement professionnel
**Application**: Système d'Archivage C.E.R.E.R

---

## 🎯 EXIGENCES LÉGALES ET RÉGLEMENTAIRES

### 1. Conservation et Archivage Légal

#### Ce qui est REQUIS:
- ✅ **Durée de conservation**: Configurable par type de document (3, 5, 10 ans, illimité)
- ✅ **Intégrité des documents**: Garantir qu'un document ne peut pas être modifié après archivage
- ✅ **Horodatage**: Date et heure exacte d'archivage (déjà présent: `dateAjout`)
- ✅ **Traçabilité**: Journal de toutes les actions (qui a fait quoi, quand)
- ✅ **Non-répudiation**: Preuve qu'une action a été effectuée

#### Ce qui MANQUE actuellement:
- ❌ Signature numérique des documents
- ❌ Journal d'audit complet
- ❌ Politique de rétention automatique
- ❌ Empreinte (hash) des fichiers pour vérifier l'intégrité

---

## 🔐 SÉCURITÉ

### 2. Authentification et Contrôle d'Accès

#### Ce qui est PRÉSENT:
- ✅ Authentification par username/password
- ✅ Contrôle d'accès par rôles (Primaire, Secondaire, Tertiaire)
- ✅ Isolation par département

#### Ce qui MANQUE:
- ❌ **Authentification forte**: 2FA (Two-Factor Authentication)
- ❌ **HTTPS obligatoire**: Chiffrement SSL/TLS
- ❌ **Mots de passe hachés**: Actuellement stockés en clair (CRITIQUE)
- ❌ **Sessions sécurisées**: JWT avec expiration
- ❌ **Protection CSRF**: Cross-Site Request Forgery
- ❌ **Rate limiting**: Limiter les tentatives de connexion

### 3. Chiffrement

#### Ce qui MANQUE:
- ❌ **Chiffrement en transit**: HTTPS (TLS 1.3)
- ❌ **Chiffrement au repos**: Documents chiffrés dans MongoDB
- ❌ **Gestion des clés**: Système de gestion des clés de chiffrement

---

## 📊 TRAÇABILITÉ ET AUDIT

### 4. Journal d'Audit (Logs)

**Ce qui DOIT être enregistré:**

```javascript
{
  timestamp: "2025-10-30T14:32:15.000Z",
  utilisateur: "fatima",
  action: "UPLOAD_DOCUMENT",
  ressource: "document_id",
  details: {
    nomFichier: "rapport_mensuel.pdf",
    taille: 2048576,
    categorie: "rapports"
  },
  ip: "192.168.1.100",
  userAgent: "Mozilla/5.0...",
  resultat: "SUCCESS",
  departement: "Direction"
}
```

**Actions à tracer:**
- ✅ Connexion/Déconnexion
- ✅ Upload de document
- ✅ Téléchargement de document
- ✅ Suppression de document
- ✅ Modification de métadonnées
- ✅ Consultation de document
- ✅ Création/Modification d'utilisateur
- ✅ Changement de rôle/permissions
- ✅ Export de données

#### État actuel:
- ❌ Aucun journal d'audit
- ❌ Aucune traçabilité des actions

---

## 💾 BACKUP ET RÉCUPÉRATION

### 5. Sauvegarde

#### Ce qui est REQUIS:
- ✅ **Backup automatique quotidien**: MongoDB + Fichiers
- ✅ **Backup incrémental**: Sauvegarder uniquement les changements
- ✅ **Rétention des backups**: 30 jours minimum
- ✅ **Stockage externe**: Backup hors site (autre serveur)
- ✅ **Test de restauration**: Vérifier régulièrement que les backups fonctionnent
- ✅ **Versioning**: Garder plusieurs versions des backups

#### État actuel:
- ❌ Aucun système de backup automatique
- ❌ Dépend de l'utilisateur (export manuel)

---

## 📈 PERFORMANCE ET SCALABILITÉ

### 6. Optimisation

#### Pour un hébergement professionnel:
- ⚠️ **Stockage de fichiers**: Actuellement dans MongoDB (Base64)
  - **Problème**: Limite de 16MB par document MongoDB
  - **Solution**: GridFS ou stockage fichiers séparé (S3, MinIO)

- ⚠️ **Indexation MongoDB**:
  - Ajouter index sur `idUtilisateur`, `idDepartement`, `dateAjout`
  - Index texte sur `titre`, `description`, `tags`

- ⚠️ **Compression**:
  - Comprimer les fichiers avant stockage
  - Utiliser gzip pour les API responses

- ⚠️ **Cache**:
  - Redis pour les sessions
  - Cache des listes de documents

---

## 📜 CONFORMITÉ ET STANDARDS

### 7. Standards d'Archivage Électronique

#### ISO 15489 (Gestion des documents d'archives):
- ✅ Authenticité
- ✅ Intégrité
- ✅ Fiabilité
- ❌ Utilisabilité (recherche avancée limitée)

#### OAIS (Open Archival Information System):
- ❌ Métadonnées de préservation
- ❌ Stratégie de migration de formats

---

## 🔧 MODIFICATIONS NÉCESSAIRES

### PRIORITÉ 1 - CRITIQUE (Sécurité)

#### A. Hachage des mots de passe
```javascript
// Utiliser bcrypt
const bcrypt = require('bcrypt');

// Lors de l'inscription
const hashedPassword = await bcrypt.hash(password, 10);

// Lors de la connexion
const isValid = await bcrypt.compare(password, user.hashedPassword);
```

#### B. HTTPS obligatoire
```javascript
// Rediriger HTTP vers HTTPS
app.use((req, res, next) => {
    if (req.header('x-forwarded-proto') !== 'https' && process.env.NODE_ENV === 'production') {
        res.redirect(`https://${req.header('host')}${req.url}`);
    } else {
        next();
    }
});
```

#### C. Sessions sécurisées avec JWT
```javascript
const jwt = require('jsonwebtoken');

// Générer un token
const token = jwt.sign(
    { userId: user.username, role: user.idRole },
    process.env.JWT_SECRET,
    { expiresIn: '8h' }
);

// Middleware de vérification
function authenticateToken(req, res, next) {
    const token = req.headers['authorization']?.split(' ')[1];
    if (!token) return res.sendStatus(401);

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) return res.sendStatus(403);
        req.user = user;
        next();
    });
}
```

---

### PRIORITÉ 2 - IMPORTANTE (Traçabilité)

#### A. Collection d'audit
```javascript
// Nouvelle collection MongoDB
const auditLogsCollection = db.collection('audit_logs');

// Fonction d'audit
async function logAction(action, userId, details) {
    await auditLogsCollection.insertOne({
        timestamp: new Date(),
        utilisateur: userId,
        action: action,
        details: details,
        ip: req.ip,
        userAgent: req.headers['user-agent']
    });
}

// Utilisation
await logAction('UPLOAD_DOCUMENT', userId, {
    nomFichier: doc.nomFichier,
    taille: doc.taille
});
```

#### B. Hash des fichiers (intégrité)
```javascript
const crypto = require('crypto');

function calculateFileHash(content) {
    return crypto
        .createHash('sha256')
        .update(content)
        .digest('hex');
}

// Ajouter au document
document.hash = calculateFileHash(contenu);

// Vérifier l'intégrité
const isValid = calculateFileHash(doc.contenu) === doc.hash;
```

---

### PRIORITÉ 3 - RECOMMANDÉE (Performance)

#### A. Migration vers GridFS
```javascript
const { GridFSBucket } = require('mongodb');

const bucket = new GridFSBucket(db, {
    bucketName: 'documents'
});

// Upload
const uploadStream = bucket.openUploadStream(filename);
uploadStream.write(buffer);
uploadStream.end();

// Download
const downloadStream = bucket.openDownloadStream(fileId);
```

#### B. Indexation MongoDB
```javascript
// Créer les index
await documentsCollection.createIndex({ idUtilisateur: 1 });
await documentsCollection.createIndex({ idDepartement: 1 });
await documentsCollection.createIndex({ dateAjout: -1 });
await documentsCollection.createIndex({ titre: "text", description: "text", tags: "text" });
```

---

## 📦 DÉPLOIEMENT SUR SERVEURS UCAD

### Configuration Environnement

#### 1. Variables d'environnement (.env)
```bash
# Base de données
MONGODB_URI=mongodb://ucad-server:27017/cerer_archivage
MONGODB_USER=cerer_app
MONGODB_PASSWORD=<password_securise>

# Sécurité
JWT_SECRET=<cle_aleatoire_64_caracteres>
ENCRYPTION_KEY=<cle_chiffrement_32_bytes>
SESSION_SECRET=<cle_session>

# Application
NODE_ENV=production
PORT=3000
DOMAIN=archivage.ucad.sn

# Limites
MAX_FILE_SIZE=50MB
MAX_STORAGE_PER_USER=10GB

# Email (notifications)
SMTP_HOST=smtp.ucad.sn
SMTP_PORT=587
SMTP_USER=noreply@ucad.sn
SMTP_PASSWORD=<password>
```

#### 2. Reverse Proxy (Nginx)
```nginx
server {
    listen 443 ssl http2;
    server_name archivage.ucad.sn;

    ssl_certificate /etc/ssl/certs/ucad.crt;
    ssl_certificate_key /etc/ssl/private/ucad.key;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

#### 3. Systemd Service
```ini
[Unit]
Description=Système d'Archivage C.E.R.E.R
After=network.target mongodb.service

[Service]
Type=simple
User=cerer
WorkingDirectory=/opt/cerer-archivage
ExecStart=/usr/bin/node server.js
Restart=always
RestartSec=10
StandardOutput=syslog
StandardError=syslog
SyslogIdentifier=cerer-archivage

Environment=NODE_ENV=production
EnvironmentFile=/opt/cerer-archivage/.env

[Install]
WantedBy=multi-user.target
```

---

## 📚 DOCUMENTATION REQUISE

### 1. Documentation Technique
- ✅ Architecture système
- ✅ Schéma de base de données (MCD)
- ✅ API endpoints
- ✅ Procédures de backup/restauration
- ✅ Plan de reprise d'activité

### 2. Documentation Utilisateur
- ✅ Manuel d'utilisation
- ✅ Guide d'administration
- ✅ FAQ

### 3. Documentation Légale
- ✅ Politique de confidentialité
- ✅ Conditions d'utilisation
- ✅ Politique de rétention des données
- ✅ Procédure de destruction de documents

---

## ✅ CHECKLIST DE MISE EN CONFORMITÉ

### Sécurité
- [ ] Implémenter hachage bcrypt pour mots de passe
- [ ] Configurer HTTPS avec certificat SSL
- [ ] Implémenter JWT pour sessions
- [ ] Ajouter rate limiting
- [ ] Implémenter protection CSRF
- [ ] Chiffrer les documents sensibles

### Traçabilité
- [ ] Créer collection audit_logs
- [ ] Implémenter fonction logAction()
- [ ] Tracer toutes les actions critiques
- [ ] Ajouter hash SHA-256 aux documents
- [ ] Interface de consultation des logs

### Performance
- [ ] Migrer vers GridFS
- [ ] Créer index MongoDB
- [ ] Implémenter cache Redis
- [ ] Compression gzip

### Backup
- [ ] Script backup automatique (cron)
- [ ] Stockage externe des backups
- [ ] Test de restauration mensuel
- [ ] Monitoring des backups

### Documentation
- [ ] Rédiger documentation technique
- [ ] Rédiger manuel utilisateur
- [ ] Créer documents légaux
- [ ] Plan de formation

---

## 🚀 PLAN DE MIGRATION

### Phase 1 - Sécurité (2 semaines)
1. Implémenter hachage mots de passe
2. Configurer HTTPS
3. JWT + sessions sécurisées

### Phase 2 - Traçabilité (1 semaine)
1. Collection audit_logs
2. Fonction logAction()
3. Hash des fichiers

### Phase 3 - Performance (2 semaines)
1. Migration GridFS
2. Indexation
3. Cache

### Phase 4 - Backup (1 semaine)
1. Scripts automatiques
2. Tests restauration

### Phase 5 - Documentation (1 semaine)
1. Rédaction complète
2. Formation

**TOTAL: 7 semaines**

---

## 💰 COÛT ESTIMÉ

### Développement
- Développeur senior: 7 semaines × 5 jours × 8h = 280h
- Taux horaire: ~15 000 FCFA/h
- **Total développement**: ~4 200 000 FCFA

### Infrastructure (UCAD)
- Serveur dédié: Gratuit (UCAD)
- Certificat SSL: Gratuit (Let's Encrypt)
- Stockage: ~1 TB = Gratuit (UCAD)
- Bande passante: Gratuit (UCAD)

### Maintenance annuelle
- Support technique: ~500 000 FCFA/an
- Monitoring: Gratuit (open source)

---

## 📞 CONTACT ET SUPPORT

Pour questions techniques:
- Service Informatique C.E.R.E.R
- Email: informatique@cerer.sn

---

**Document préparé pour la migration vers hébergement professionnel UCAD**
