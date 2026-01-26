# ⚡ PLAN D'ACTION RAPIDE - Migration UCAD

**Temps estimé**: 7 semaines
**Priorité**: CRITIQUE → IMPORTANTE → RECOMMANDÉE

---

## 🚨 SEMAINE 1-2: SÉCURITÉ (CRITIQUE)

### Jour 1-3: Hachage des mots de passe

```bash
npm install bcrypt
```

**Modifier server.js:**
- Ligne 200: `await bcrypt.hash(password, 10)`
- Ligne 185: `await bcrypt.compare(password, user.password)`

✅ **Test**: Créer un utilisateur, se connecter

---

### Jour 4-7: JWT et Sessions

```bash
npm install jsonwebtoken dotenv
```

**Créer .env:**
```
JWT_SECRET=<générer 64 caractères aléatoires>
```

**Modifier server.js:**
- Ajouter `authenticateToken()` middleware
- Login génère token JWT
- Protéger toutes les routes avec middleware

**Modifier api.js:**
- Stocker token dans `localStorage`
- Envoyer token dans headers `Authorization`

✅ **Test**: Session expire après 8h

---

### Jour 8-10: HTTPS

**Sur le serveur:**
```bash
certbot --nginx -d archivage.cerer.ucad.sn
```

✅ **Test**: Accès uniquement en HTTPS

---

## 📝 SEMAINE 3: TRAÇABILITÉ (IMPORTANTE)

### Jour 11-13: Audit Logs

**Créer collection:**
```javascript
const auditLogsCollection = db.collection('audit_logs');
```

**Ajouter fonction:**
```javascript
async function logAuditAction(req, action, ressource, details) {
    await auditLogsCollection.insertOne({
        timestamp: new Date(),
        utilisateur: req.user.username,
        action: action,
        ressource: ressource,
        details: details,
        ip: req.ip
    });
}
```

**Tracer dans toutes les routes:**
- Upload: `logAuditAction(req, 'UPLOAD_DOCUMENT', ...)`
- Download: `logAuditAction(req, 'DOWNLOAD_DOCUMENT', ...)`
- Delete: `logAuditAction(req, 'DELETE_DOCUMENT', ...)`
- Login: `logAuditAction(req, 'LOGIN', ...)`

✅ **Test**: Vérifier que toutes les actions sont enregistrées

---

### Jour 14-15: Hash des fichiers

**Ajouter crypto:**
```javascript
const crypto = require('crypto');

function calculateFileHash(content) {
    return crypto.createHash('sha256').update(content).digest('hex');
}
```

**Upload:** `document.hash = calculateFileHash(contenu)`

✅ **Test**: Vérifier qu'on peut détecter une modification

---

## 🚀 SEMAINE 4-5: PERFORMANCE (RECOMMANDÉE)

### Jour 16-20: GridFS

```bash
npm install mongodb
```

**Migration vers GridFS** pour fichiers > 16MB

✅ **Test**: Upload fichier 30MB

---

### Jour 21-25: Index MongoDB

```javascript
await documentsCollection.createIndex({ idUtilisateur: 1 });
await documentsCollection.createIndex({ idDepartement: 1 });
await documentsCollection.createIndex({ dateAjout: -1 });
await documentsCollection.createIndex({ titre: "text" });
```

✅ **Test**: Recherche rapide même avec 10000+ documents

---

## 💾 SEMAINE 6: BACKUP (IMPORTANTE)

### Jour 26-28: Script Backup

**Créer backup.sh:**
```bash
#!/bin/bash
DATE=$(date +%Y-%m-%d)
mongodump --db=cerer_archivage --out=/backups/$DATE
tar -czf /backups/$DATE.tar.gz /backups/$DATE
rm -rf /backups/$DATE
find /backups -mtime +30 -delete
```

**Cron:**
```bash
0 2 * * * /opt/cerer-archivage/backup.sh
```

✅ **Test**: Restaurer un backup

---

### Jour 29-30: Test de restauration

```bash
mongorestore --db=cerer_archivage_test /backups/2025-10-30/cerer_archivage
```

✅ **Test**: Données restaurées correctement

---

## 📚 SEMAINE 7: DOCUMENTATION ET DÉPLOIEMENT

### Jour 31-33: Documentation

- [ ] Manuel utilisateur
- [ ] Guide administrateur
- [ ] Documentation API
- [ ] Procédures d'urgence

---

### Jour 34-35: Déploiement UCAD

**Installation serveur:**
```bash
# Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# MongoDB
wget -qO - https://www.mongodb.org/static/pgp/server-6.0.asc | sudo apt-key add -
sudo apt-get install -y mongodb-org

# Nginx
sudo apt-get install nginx

# Certificat SSL
sudo apt-get install certbot python3-certbot-nginx
```

**Déployer application:**
```bash
cd /opt
git clone <repo>
cd cerer-archivage
npm install --production
cp .env.example .env
# Configurer .env

# Systemd service
sudo cp cerer-archivage.service /etc/systemd/system/
sudo systemctl enable cerer-archivage
sudo systemctl start cerer-archivage

# Nginx
sudo cp nginx.conf /etc/nginx/sites-available/cerer-archivage
sudo ln -s /etc/nginx/sites-available/cerer-archivage /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx

# SSL
sudo certbot --nginx -d archivage.cerer.ucad.sn
```

✅ **Test**: Application accessible en HTTPS

---

## ✅ VALIDATION FINALE

### Checklist de mise en production

#### Sécurité
- [ ] Mots de passe hachés avec bcrypt
- [ ] JWT avec expiration 8h
- [ ] HTTPS actif (certificat valide)
- [ ] Pas de secrets dans le code (utilise .env)
- [ ] Firewall configuré

#### Traçabilité
- [ ] Audit logs pour toutes les actions
- [ ] Hash SHA-256 pour tous les fichiers
- [ ] Route `/api/audit-logs` protégée

#### Performance
- [ ] Index MongoDB créés
- [ ] GridFS pour gros fichiers (si applicable)
- [ ] Compression gzip activée

#### Backup
- [ ] Script backup automatique
- [ ] Cron configuré (2h du matin)
- [ ] Test de restauration réussi
- [ ] Backups stockés hors serveur principal

#### Monitoring
- [ ] Logs applicatifs (Winston)
- [ ] Systemd service actif
- [ ] Monitoring CPU/RAM/Disque

#### Documentation
- [ ] Manuel utilisateur complet
- [ ] Guide administrateur
- [ ] Procédures d'urgence
- [ ] Formation utilisateurs effectuée

---

## 🆘 EN CAS DE PROBLÈME

### Rollback

Si problème critique après déploiement:

```bash
# Arrêter le service
sudo systemctl stop cerer-archivage

# Restaurer l'ancienne version
cd /opt/cerer-archivage
git reset --hard <commit_precedent>
npm install

# Restaurer la base de données
mongorestore --drop --db=cerer_archivage /backups/derniere_version/

# Redémarrer
sudo systemctl start cerer-archivage
```

---

### Support d'urgence

- **Logs**: `sudo journalctl -u cerer-archivage -f`
- **Erreurs Nginx**: `sudo tail -f /var/log/nginx/cerer-archivage-error.log`
- **MongoDB**: `sudo tail -f /var/log/mongodb/mongod.log`

---

## 📊 ESTIMATION DES COÛTS

### Développement
- **7 semaines** × 5 jours × 8h = **280 heures**
- Taux: ~15 000 FCFA/h
- **Total: 4 200 000 FCFA**

### Infrastructure UCAD
- Serveur: **Gratuit** (UCAD)
- Stockage: **Gratuit** (UCAD)
- SSL: **Gratuit** (Let's Encrypt)
- Bande passante: **Gratuit** (UCAD)

### Maintenance (par an)
- Support: **500 000 FCFA**
- Mises à jour: Inclus

**TOTAL PROJET: ~4 700 000 FCFA**

---

## 📞 CONTACTS

- **Service Informatique C.E.R.E.R**: informatique@cerer.sn
- **Support UCAD**: support@ucad.sn
- **Urgences**: +221 XX XXX XX XX

---

**DOCUMENTS COMPLÉMENTAIRES:**
1. `EXIGENCES-ARCHIVAGE-PROFESSIONNEL.md` - Liste complète des exigences
2. `GUIDE-MIGRATION-UCAD.md` - Guide détaillé avec code
3. `MCD-GUIDE-MIGRATION.md` - Documentation MCD existante

**Bonne chance pour la migration! 🚀**
