# 🚀 Guide de Migration vers Serveurs UCAD

**Application**: Système d'Archivage C.E.R.E.R
**Objectif**: Déploiement professionnel conforme aux normes

---

## 📋 RÉSUMÉ EXÉCUTIF

### Ce qui fonctionne DÉJÀ ✅
Votre application a une **base solide**:
- ✅ MCD bien conçu avec rôles et départements
- ✅ Contrôle d'accès hiérarchique fonctionnel
- ✅ Interface utilisateur moderne et intuitive
- ✅ Gestion des catégories et métadonnées
- ✅ Upload/Download de documents
- ✅ Filtrage et recherche
- ✅ Prévisualisation PDF et images

### Ce qui DOIT être ajouté ⚠️
Pour un hébergement professionnel:
1. **Sécurité renforcée** (CRITIQUE)
2. **Traçabilité complète** (IMPORTANTE)
3. **Système de backup** (IMPORTANTE)
4. **Optimisation performance** (RECOMMANDÉE)

---

## 🔐 PARTIE 1: SÉCURITÉ (PRIORITÉ CRITIQUE)

### A. Hachage des Mots de Passe

**❌ ACTUEL** (DANGEREUX):
```javascript
// server.js - ligne 200
const user = {
    username,
    password,  // ⚠️ Mot de passe en CLAIR dans la base
    nom,
    email
};
```

**✅ À FAIRE** (SÉCURISÉ):

#### 1. Installer bcrypt
```bash
npm install bcrypt
```

#### 2. Modifier server.js
```javascript
const bcrypt = require('bcrypt');

// INSCRIPTION (ligne 200)
app.post('/api/register', async (req, res) => {
    try {
        const { username, password, nom, email, idRole, idDepartement } = req.body;

        // Vérifier si l'utilisateur existe
        const existing = await usersCollection.findOne({ username });
        if (existing) {
            return res.status(400).json({
                success: false,
                message: 'Nom d\'utilisateur déjà pris'
            });
        }

        // HACHER LE MOT DE PASSE ⭐
        const hashedPassword = await bcrypt.hash(password, 10);

        const newUser = {
            username,
            password: hashedPassword,  // ✅ Stocké haché
            nom,
            email,
            idRole,
            idDepartement,
            createdAt: new Date()
        };

        await usersCollection.insertOne(newUser);

        res.json({
            success: true,
            message: 'Utilisateur créé'
        });
    } catch (error) {
        console.error('Erreur inscription:', error);
        res.status(500).json({ success: false, message: 'Erreur serveur' });
    }
});

// CONNEXION (ligne 185)
app.post('/api/login', async (req, res) => {
    try {
        const { username, password } = req.body;

        const user = await usersCollection.findOne({ username });

        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'Identifiants incorrects'
            });
        }

        // COMPARER AVEC LE HASH ⭐
        const isValidPassword = await bcrypt.compare(password, user.password);

        if (!isValidPassword) {
            return res.status(401).json({
                success: false,
                message: 'Identifiants incorrects'
            });
        }

        res.json({
            success: true,
            user: {
                username: user.username,
                nom: user.nom,
                email: user.email
            }
        });
    } catch (error) {
        console.error('Erreur connexion:', error);
        res.status(500).json({ success: false, message: 'Erreur serveur' });
    }
});
```

---

### B. Sessions Sécurisées avec JWT

#### 1. Installer JWT
```bash
npm install jsonwebtoken dotenv
```

#### 2. Créer fichier .env
```bash
# C:\Users\HP\Desktop\Nouveau dossier (6)\config_fichier\backend\.env
JWT_SECRET=votre_cle_secrete_tres_longue_et_aleatoire_64_caracteres_minimum
NODE_ENV=production
PORT=3000
MONGODB_URI=mongodb://localhost:27017
```

#### 3. Modifier server.js
```javascript
require('dotenv').config();
const jwt = require('jsonwebtoken');

// Middleware d'authentification
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({
            success: false,
            message: 'Token manquant'
        });
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({
                success: false,
                message: 'Token invalide ou expiré'
            });
        }
        req.user = user;
        next();
    });
}

// LOGIN - Générer un token
app.post('/api/login', async (req, res) => {
    try {
        const { username, password } = req.body;

        const user = await usersCollection.findOne({ username });
        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'Identifiants incorrects'
            });
        }

        const isValidPassword = await bcrypt.compare(password, user.password);
        if (!isValidPassword) {
            return res.status(401).json({
                success: false,
                message: 'Identifiants incorrects'
            });
        }

        // GÉNÉRER TOKEN JWT ⭐
        const token = jwt.sign(
            {
                username: user.username,
                idRole: user.idRole,
                idDepartement: user.idDepartement
            },
            process.env.JWT_SECRET,
            { expiresIn: '8h' }  // Expire après 8 heures
        );

        res.json({
            success: true,
            token: token,  // ✅ Envoyer le token
            user: {
                username: user.username,
                nom: user.nom,
                email: user.email
            }
        });
    } catch (error) {
        console.error('Erreur connexion:', error);
        res.status(500).json({ success: false, message: 'Erreur serveur' });
    }
});

// PROTÉGER TOUTES LES ROUTES SENSIBLES ⭐
app.get('/api/documents/:userId', authenticateToken, async (req, res) => {
    // Route protégée
    // req.user contient les infos du token
});

app.post('/api/documents', authenticateToken, async (req, res) => {
    // Route protégée
});

app.delete('/api/documents/:userId/:id', authenticateToken, async (req, res) => {
    // Route protégée
});
```

#### 4. Modifier api.js (Frontend)
```javascript
// Stocker le token
let authToken = null;

async function login(username, password) {
    try {
        const result = await apiCall('/login', 'POST', { username, password });
        if (result.success) {
            authToken = result.token;  // ✅ Stocker le token
            localStorage.setItem('authToken', result.token);
            state.currentUser = username;
            state.isAuthenticated = true;
            await loadData();
            showNotification(`✅ Bienvenue ${username}!`);
            return true;
        }
    } catch (error) {
        return false;
    }
}

// Modifier apiCall pour envoyer le token
async function apiCall(endpoint, method = 'GET', data = null) {
    state.loading = true;
    render();
    try {
        const options = {
            method,
            headers: {
                'Content-Type': 'application/json'
            }
        };

        // AJOUTER LE TOKEN ⭐
        if (authToken) {
            options.headers['Authorization'] = `Bearer ${authToken}`;
        }

        if (data) options.body = JSON.stringify(data);

        const response = await fetch(`${API_URL}${endpoint}`, options);
        const result = await response.json();

        if (!response.ok) {
            // Token expiré
            if (response.status === 401 || response.status === 403) {
                authToken = null;
                localStorage.removeItem('authToken');
                state.isAuthenticated = false;
                render();
                showNotification('Session expirée, veuillez vous reconnecter', 'error');
            }
            throw new Error(result.message || 'Erreur');
        }

        return result;
    } catch (error) {
        showNotification(error.message, 'error');
        throw error;
    } finally {
        state.loading = false;
        render();
    }
}

// Charger le token au démarrage
window.addEventListener('DOMContentLoaded', () => {
    authToken = localStorage.getItem('authToken');
    if (authToken) {
        // Vérifier si le token est valide
        // Si oui, restaurer la session
    }
});
```

---

## 📝 PARTIE 2: TRAÇABILITÉ

### A. Collection Audit Logs

#### 1. Créer la collection
```javascript
// server.js - Au démarrage
const auditLogsCollection = db.collection('audit_logs');

// Créer des index pour performance
await auditLogsCollection.createIndex({ timestamp: -1 });
await auditLogsCollection.createIndex({ utilisateur: 1 });
await auditLogsCollection.createIndex({ action: 1 });
```

#### 2. Fonction de logging
```javascript
async function logAuditAction(req, action, ressource, details, resultat = 'SUCCESS') {
    try {
        await auditLogsCollection.insertOne({
            timestamp: new Date(),
            utilisateur: req.user?.username || 'anonymous',
            action: action,
            ressource: ressource,
            details: details,
            ip: req.ip || req.connection.remoteAddress,
            userAgent: req.headers['user-agent'],
            resultat: resultat,
            departement: req.user?.idDepartement
        });
    } catch (error) {
        console.error('Erreur log audit:', error);
        // Ne pas bloquer l'opération si le log échoue
    }
}
```

#### 3. Utiliser dans les routes
```javascript
// Upload document
app.post('/api/documents', authenticateToken, async (req, res) => {
    try {
        const { userId, titre, categorie, nomFichier, taille } = req.body;

        // ... validation et upload ...

        const result = await documentsCollection.insertOne(document);

        // LOG L'ACTION ⭐
        await logAuditAction(req, 'UPLOAD_DOCUMENT', result.insertedId, {
            titre: titre,
            nomFichier: nomFichier,
            taille: taille,
            categorie: categorie
        });

        res.json({
            success: true,
            document: { ...document, _id: result.insertedId }
        });
    } catch (error) {
        await logAuditAction(req, 'UPLOAD_DOCUMENT', null, { error: error.message }, 'FAILURE');
        res.status(500).json({ success: false, message: 'Erreur serveur' });
    }
});

// Téléchargement
app.get('/api/documents/:userId/:id', authenticateToken, async (req, res) => {
    try {
        const doc = await documentsCollection.findOne({
            _id: new ObjectId(req.params.id)
        });

        // LOG LE TÉLÉCHARGEMENT ⭐
        await logAuditAction(req, 'DOWNLOAD_DOCUMENT', req.params.id, {
            titre: doc.titre,
            nomFichier: doc.nomFichier
        });

        res.json(doc);
    } catch (error) {
        res.status(500).json({ success: false, message: 'Erreur' });
    }
});

// Suppression
app.delete('/api/documents/:userId/:id', authenticateToken, async (req, res) => {
    try {
        const doc = await documentsCollection.findOne({
            _id: new ObjectId(req.params.id)
        });

        await documentsCollection.deleteOne({
            _id: new ObjectId(req.params.id)
        });

        // LOG LA SUPPRESSION ⭐
        await logAuditAction(req, 'DELETE_DOCUMENT', req.params.id, {
            titre: doc.titre,
            nomFichier: doc.nomFichier
        });

        res.json({ success: true });
    } catch (error) {
        await logAuditAction(req, 'DELETE_DOCUMENT', req.params.id, { error: error.message }, 'FAILURE');
        res.status(500).json({ success: false, message: 'Erreur' });
    }
});
```

#### 4. Route pour consulter les logs (Admin uniquement)
```javascript
app.get('/api/audit-logs', authenticateToken, async (req, res) => {
    try {
        // Vérifier que l'utilisateur est admin (rôle primaire)
        const user = await usersCollection.findOne({ username: req.user.username });
        const role = await rolesCollection.findOne({ _id: user.idRole });

        if (role.niveau !== 1) {
            return res.status(403).json({
                success: false,
                message: 'Accès refusé: Réservé aux administrateurs'
            });
        }

        const { page = 1, limit = 50, utilisateur, action } = req.query;

        const filter = {};
        if (utilisateur) filter.utilisateur = utilisateur;
        if (action) filter.action = action;

        const logs = await auditLogsCollection
            .find(filter)
            .sort({ timestamp: -1 })
            .skip((page - 1) * limit)
            .limit(parseInt(limit))
            .toArray();

        const total = await auditLogsCollection.countDocuments(filter);

        res.json({
            success: true,
            logs: logs,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total: total,
                pages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        console.error('Erreur récupération logs:', error);
        res.status(500).json({ success: false, message: 'Erreur serveur' });
    }
});
```

---

### B. Hash d'Intégrité des Fichiers

```javascript
const crypto = require('crypto');

function calculateFileHash(content) {
    // Retirer le préfixe data:image/png;base64,
    const base64Data = content.split(',')[1] || content;
    const buffer = Buffer.from(base64Data, 'base64');

    return crypto
        .createHash('sha256')
        .update(buffer)
        .digest('hex');
}

// Ajouter le hash lors de l'upload
app.post('/api/documents', authenticateToken, async (req, res) => {
    try {
        const { contenu } = req.body;

        const document = {
            // ... autres champs ...
            contenu: contenu,
            hash: calculateFileHash(contenu),  // ✅ Calculer le hash
            createdAt: new Date()
        };

        await documentsCollection.insertOne(document);

        res.json({ success: true, document });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Erreur' });
    }
});

// Vérifier l'intégrité lors du téléchargement
app.get('/api/documents/:userId/:id/verify', authenticateToken, async (req, res) => {
    try {
        const doc = await documentsCollection.findOne({
            _id: new ObjectId(req.params.id)
        });

        const currentHash = calculateFileHash(doc.contenu);
        const isValid = currentHash === doc.hash;

        res.json({
            success: true,
            integrity: {
                isValid: isValid,
                originalHash: doc.hash,
                currentHash: currentHash,
                message: isValid
                    ? 'Le document n\'a pas été modifié'
                    : '⚠️ ALERTE: Le document a été altéré!'
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Erreur' });
    }
});
```

---

## 💾 PARTIE 3: BACKUP AUTOMATIQUE

### Script de Backup

#### Créer `backup.sh`
```bash
#!/bin/bash

# Configuration
BACKUP_DIR="/opt/backups/cerer-archivage"
DATE=$(date +%Y-%m-%d-%H%M%S)
MONGODB_URI="mongodb://localhost:27017"
DB_NAME="cerer_archivage"

# Créer le dossier de backup
mkdir -p "$BACKUP_DIR/$DATE"

# Backup MongoDB
echo "🔄 Backup de la base de données..."
mongodump --uri="$MONGODB_URI" --db="$DB_NAME" --out="$BACKUP_DIR/$DATE/mongodb"

# Compresser
echo "📦 Compression..."
cd "$BACKUP_DIR"
tar -czf "$DATE.tar.gz" "$DATE"
rm -rf "$DATE"

# Supprimer les backups de plus de 30 jours
echo "🗑️  Nettoyage des anciens backups..."
find "$BACKUP_DIR" -name "*.tar.gz" -mtime +30 -delete

# Stats
SIZE=$(du -sh "$BACKUP_DIR/$DATE.tar.gz" | cut -f1)
echo "✅ Backup terminé: $DATE.tar.gz ($SIZE)"

# Log
echo "$(date) - Backup réussi: $DATE.tar.gz ($SIZE)" >> "$BACKUP_DIR/backup.log"
```

#### Rendre exécutable
```bash
chmod +x backup.sh
```

#### Automatiser avec Cron (tous les jours à 2h du matin)
```bash
crontab -e

# Ajouter cette ligne:
0 2 * * * /opt/cerer-archivage/backup.sh
```

---

## 🚀 PARTIE 4: DÉPLOIEMENT UCAD

### A. Configuration Nginx

#### Créer `/etc/nginx/sites-available/cerer-archivage`
```nginx
server {
    listen 80;
    server_name archivage.cerer.ucad.sn;

    # Rediriger HTTP vers HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name archivage.cerer.ucad.sn;

    # Certificat SSL (Let's Encrypt)
    ssl_certificate /etc/letsencrypt/live/archivage.cerer.ucad.sn/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/archivage.cerer.ucad.sn/privkey.pem;

    # Sécurité SSL
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    # Taille max des uploads
    client_max_body_size 50M;

    # Proxy vers Node.js
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

    # Logs
    access_log /var/log/nginx/cerer-archivage-access.log;
    error_log /var/log/nginx/cerer-archivage-error.log;
}
```

#### Activer le site
```bash
ln -s /etc/nginx/sites-available/cerer-archivage /etc/nginx/sites-enabled/
nginx -t
systemctl reload nginx
```

---

### B. Service Systemd

#### Créer `/etc/systemd/system/cerer-archivage.service`
```ini
[Unit]
Description=Système d'Archivage C.E.R.E.R
Documentation=https://github.com/cerer/archivage
After=network.target mongodb.service

[Service]
Type=simple
User=cerer
Group=cerer
WorkingDirectory=/opt/cerer-archivage
ExecStart=/usr/bin/node server.js
Restart=always
RestartSec=10

# Logs
StandardOutput=journal
StandardError=journal
SyslogIdentifier=cerer-archivage

# Variables d'environnement
Environment=NODE_ENV=production
EnvironmentFile=/opt/cerer-archivage/.env

# Limites
LimitNOFILE=65536

[Install]
WantedBy=multi-user.target
```

#### Activer et démarrer
```bash
systemctl daemon-reload
systemctl enable cerer-archivage
systemctl start cerer-archivage
systemctl status cerer-archivage
```

---

## 📊 MONITORING

### A. Logs Applicatifs

#### Configurer Winston pour les logs
```bash
npm install winston
```

```javascript
const winston = require('winston');

const logger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
    ),
    transports: [
        new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
        new winston.transports.File({ filename: 'logs/combined.log' }),
        new winston.transports.Console({
            format: winston.format.simple()
        })
    ]
});

// Utiliser
logger.info('Utilisateur connecté', { username: 'fatima' });
logger.error('Erreur upload', { error: error.message });
```

---

### B. Monitoring Système

#### PM2 (Alternative à systemd)
```bash
npm install -g pm2

# Démarrer
pm2 start server.js --name cerer-archivage

# Monitoring en temps réel
pm2 monit

# Logs
pm2 logs cerer-archivage

# Auto-restart au reboot
pm2 startup
pm2 save
```

---

## ✅ CHECKLIST FINALE

### Avant la Migration
- [ ] Tests complets en local
- [ ] Backup de toutes les données
- [ ] Documentation à jour
- [ ] Formation des utilisateurs

### Configuration Serveur UCAD
- [ ] Node.js installé (v18+)
- [ ] MongoDB installé et configuré
- [ ] Nginx installé
- [ ] Certificat SSL (Let's Encrypt)
- [ ] Firewall configuré (ports 80, 443, 3000)

### Sécurité
- [ ] Mots de passe hachés (bcrypt)
- [ ] JWT implémenté
- [ ] HTTPS activé
- [ ] Variables d'environnement sécurisées

### Traçabilité
- [ ] Audit logs fonctionnels
- [ ] Hash des fichiers
- [ ] Interface admin pour consulter les logs

### Backup
- [ ] Script backup automatique
- [ ] Cron configuré
- [ ] Test de restauration effectué

### Monitoring
- [ ] Logs applicatifs (Winston)
- [ ] Service systemd actif
- [ ] Monitoring système (PM2 ou autre)

---

## 📞 SUPPORT

Questions ou problèmes lors de la migration:
- **Email**: informatique@cerer.sn
- **Documentation**: Voir EXIGENCES-ARCHIVAGE-PROFESSIONNEL.md

**Bon courage pour la migration! 🚀**
