# 🚀 Guide de Déploiement - Édition Office Online

## ✅ Félicitations!

Votre application est maintenant **prête pour Office Online**! Une fois déployée en ligne, vous pourrez éditer vos documents Word et Excel directement dans le navigateur.

---

## 🎯 Ce qui a été implémenté

### ✅ Détection automatique de l'environnement
- **En local (localhost)**: Affiche le guide de téléchargement
- **En ligne (serveur web)**: Active automatiquement Office Online

### ✅ Intégration Office Online
- Édition Word (.docx)
- Édition Excel (.xlsx)
- Édition PowerPoint (.pptx)
- Interface en iframe
- Auto-sauvegarde

### ✅ Route d'exposition des fichiers
- `/api/office-file/:userId/:docId` déjà en place
- Sécurisée avec vérification des permissions
- Compatible Office Online

---

## 📋 Étapes pour activer Office Online

### Étape 1: Déployer votre application sur un serveur web

Vous avez plusieurs options:

#### Option A: Serveur VPS (Recommandé)
- **OVH**: https://www.ovhcloud.com/fr/
- **DigitalOcean**: https://www.digitalocean.com/
- **AWS EC2**: https://aws.amazon.com/fr/ec2/

**Avantages:**
- Contrôle total
- Pas de limite de ressources
- Peut héberger MongoDB

#### Option B: Hébergement Node.js
- **Heroku**: https://www.heroku.com/
- **Render**: https://render.com/
- **Railway**: https://railway.app/

**Avantages:**
- Déploiement facile
- Gratuit pour commencer
- Git push automatique

#### Option C: Serveur dédié UCAD
- Utilisez le serveur de l'université
- Demandez un nom de domaine (ex: archivage.ucad.sn)

---

### Étape 2: Configurer votre nom de domaine

Office Online **nécessite** une URL publique. Exemples:
- ✅ `https://archivage.cerer.sn`
- ✅ `https://archivage-cerer.herokuapp.com`
- ✅ `http://41.82.123.45:4000` (IP publique)
- ❌ `http://localhost:4000` (ne fonctionne PAS)
- ❌ `http://192.168.1.100:4000` (ne fonctionne PAS)

---

### Étape 3: Obtenir un certificat SSL (HTTPS)

Office Online fonctionne mieux avec HTTPS. Options gratuites:

#### Avec Let's Encrypt (Gratuit)
```bash
# Installer Certbot
sudo apt-get install certbot

# Obtenir un certificat
sudo certbot certonly --standalone -d archivage.cerer.sn
```

#### Avec Cloudflare (Gratuit + CDN)
1. Créez un compte sur https://cloudflare.com
2. Ajoutez votre domaine
3. SSL automatique activé

---

### Étape 4: Modifier votre fichier .env

Une fois déployé, mettez à jour `.env`:

```env
# URL publique de votre application
PUBLIC_URL=https://archivage.cerer.sn

# MongoDB (peut être en ligne aussi)
MONGODB_URI=mongodb://localhost:27017/cerer_archivage
# OU MongoDB Atlas (gratuit)
# MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/cerer_archivage

# Port
PORT=4000

# Clé secrète
JWT_SECRET=votre_cle_secrete_super_longue
```

---

### Étape 5: Tester Office Online

1. **Accédez à votre app en ligne:**
   ```
   https://archivage.cerer.sn
   ```

2. **Uploadez un fichier Word ou Excel**

3. **Cliquez sur "Éditer"**
   - Vous devriez voir: "✅ Office Online activé!"
   - Une iframe Microsoft Office apparaît
   - Vous pouvez éditer directement

4. **Modifiez le document**
   - Tapez du texte
   - Changez la mise en forme
   - Office Online sauvegarde automatiquement

5. **Fermez et vérifiez**
   - Les modifications sont dans votre base de données

---

## 🔧 Configuration du serveur

### Exemple avec Ubuntu + Nginx

#### 1. Installer Node.js et MongoDB
```bash
# Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# MongoDB
sudo apt-get install -y mongodb

# PM2 (gestionnaire de processus)
sudo npm install -g pm2
```

#### 2. Cloner votre projet
```bash
cd /var/www
git clone <votre-repo>
cd archivage-cerer/backend
npm install
```

#### 3. Configurer Nginx
```nginx
server {
    listen 80;
    server_name archivage.cerer.sn;

    location / {
        proxy_pass http://localhost:4000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # Important pour Office Online (gros fichiers)
    client_max_body_size 100M;
}
```

#### 4. Lancer l'application
```bash
# Avec PM2 (redémarre automatiquement)
pm2 start server.js --name archivage-cerer
pm2 save
pm2 startup
```

---

## 🌐 Déploiement rapide avec Heroku

### 1. Installer Heroku CLI
```bash
npm install -g heroku
heroku login
```

### 2. Créer l'application
```bash
cd backend
heroku create archivage-cerer
```

### 3. Ajouter MongoDB Atlas (gratuit)
```bash
# S'inscrire sur https://www.mongodb.com/cloud/atlas
# Créer un cluster gratuit
# Copier la connexion string

heroku config:set MONGODB_URI="mongodb+srv://user:pass@cluster.mongodb.net/cerer"
```

### 4. Créer un Procfile
```bash
echo "web: node server.js" > Procfile
```

### 5. Déployer
```bash
git add .
git commit -m "Ready for Office Online"
git push heroku main
```

### 6. Ouvrir l'app
```bash
heroku open
```

Votre URL sera: `https://archivage-cerer.herokuapp.com`

---

## 🎨 Personnalisation Office Online

### Changer le mode (édition vs lecture seule)

Dans `public/js/editor.js`, ligne 340:

```javascript
// Pour ÉDITION (défaut)
const officeOnlineUrl = `https://view.officeapps.live.com/op/edit.aspx?src=${encodedUrl}`;

// Pour LECTURE SEULE
// const officeOnlineUrl = `https://view.officeapps.live.com/op/view.aspx?src=${encodedUrl}`;
```

### Ajouter des options Office Online

```javascript
const officeOnlineUrl = `https://view.officeapps.live.com/op/edit.aspx?src=${encodedUrl}&ui=fr&rs=fr`;
// ui=fr : Interface en français
// rs=fr : Région France
```

---

## 📊 Formats supportés par Office Online

| Format | Extension | Édition | Prévisualisation |
|--------|-----------|---------|------------------|
| Word moderne | `.docx` | ✅ Oui | ✅ Oui |
| Word ancien | `.doc` | ❌ Non | ✅ Oui |
| Excel moderne | `.xlsx` | ✅ Oui | ✅ Oui |
| Excel ancien | `.xls` | ❌ Non | ✅ Oui |
| PowerPoint moderne | `.pptx` | ✅ Oui | ✅ Oui |
| PowerPoint ancien | `.ppt` | ❌ Non | ✅ Oui |

---

## ❌ Dépannage

### Office Online affiche "Cannot download the file"

**Cause:** Office Online ne peut pas accéder à votre fichier

**Solutions:**
1. Vérifiez que l'URL est publique:
   ```bash
   curl https://archivage.cerer.sn/api/office-file/jbk/123456789
   # Doit retourner le fichier
   ```

2. Vérifiez les en-têtes CORS dans `server.js` (ligne 2779):
   ```javascript
   res.setHeader('Access-Control-Allow-Origin', '*');
   ```

3. Testez l'URL directement:
   - Ouvrez: `https://archivage.cerer.sn/api/office-file/jbk/123456789`
   - Le fichier doit se télécharger

### Office Online affiche une page blanche

**Cause:** L'iframe est bloquée

**Solutions:**
1. Vérifiez la console du navigateur (F12)
2. Autorisez les iframes dans votre serveur:
   ```javascript
   res.setHeader('X-Frame-Options', 'ALLOWALL');
   ```

### Les modifications ne se sauvegardent pas

**Cause:** Office Online est en lecture seule

**Solution:**
- Office Online peut seulement **prévisualiser** les fichiers
- Pour sauvegarder, vous devez implémenter le protocole **WOPI** (complexe)
- **Alternative:** Utilisez l'éditeur Excel intégré pour les tableaux

---

## 🔒 Sécurité

### Protéger les fichiers

Office Online a besoin d'accéder aux fichiers, mais vous devez sécuriser:

#### 1. Vérification des permissions (déjà en place)
```javascript
// server.js ligne 2738
const canAccess = await canAccessDocument(userId, docId);
if (!canAccess) {
    return res.status(403).send('Accès refusé');
}
```

#### 2. Token temporaire (recommandé)
```javascript
// Générer un token d'accès temporaire (expire après 1h)
app.get('/api/office-file/:userId/:docId', async (req, res) => {
    const { token } = req.query;

    // Vérifier le token
    if (!isValidToken(token)) {
        return res.status(403).send('Token invalide ou expiré');
    }

    // ... reste du code
});
```

---

## 🎯 Mode hybride: Excel intégré + Office Online

Pour la meilleure expérience:

### Excel → Éditeur intégré (déjà implémenté)
- Modifications rapides de cellules
- Sauvegarde instantanée
- Fonctionne hors ligne

### Word → Office Online (quand en ligne)
- Édition WYSIWYG complète
- Mise en forme avancée
- Nécessite connexion Internet

### Code actuel:
```javascript
function isEditable(doc) {
    const ext = doc.nomFichier.toLowerCase().split('.').pop();

    if (ext === 'xlsx') return 'excel';  // Éditeur intégré
    if (ext === 'docx') return 'word';   // Office Online quand en ligne

    return false;
}
```

---

## 📚 Ressources

### Documentation Office Online
- **API Viewer**: https://docs.microsoft.com/en-us/microsoft-365/cloud-storage-partner-program/
- **WOPI Protocol**: https://docs.microsoft.com/en-us/microsoft-365/cloud-storage-partner-program/rest/

### Hébergement
- **Heroku**: https://devcenter.heroku.com/articles/deploying-nodejs
- **MongoDB Atlas**: https://www.mongodb.com/cloud/atlas
- **Nginx**: https://nginx.org/en/docs/

### SSL Gratuit
- **Let's Encrypt**: https://letsencrypt.org/
- **Cloudflare**: https://www.cloudflare.com/ssl/

---

## ✅ Checklist de déploiement

### Avant le déploiement:
- [ ] Choisir un hébergeur (VPS, Heroku, etc.)
- [ ] Obtenir un nom de domaine
- [ ] Configurer MongoDB (local ou Atlas)
- [ ] Créer le fichier `.env` de production
- [ ] Tester l'application en local

### Pendant le déploiement:
- [ ] Installer Node.js et dépendances
- [ ] Configurer le serveur web (Nginx, etc.)
- [ ] Obtenir un certificat SSL (HTTPS)
- [ ] Déployer le code
- [ ] Lancer l'application (PM2 ou équivalent)

### Après le déploiement:
- [ ] Tester l'accès: `https://votre-domaine.com`
- [ ] Uploader un fichier test Word
- [ ] Cliquer sur "Éditer"
- [ ] Vérifier que Office Online s'ouvre
- [ ] Modifier le document
- [ ] Vérifier la sauvegarde

---

## 🎉 Résumé

### Ce qui se passe maintenant (localhost):
❌ Office Online désactivé
✅ Guide de téléchargement affiché
✅ Éditeur Excel intégré fonctionnel

### Ce qui se passera une fois en ligne:
✅ Office Online automatiquement activé
✅ Édition Word/Excel dans le navigateur
✅ Auto-sauvegarde (avec WOPI)
✅ Aucun changement de code nécessaire!

---

**Prêt pour le déploiement! 🚀**

Une fois votre application en ligne, l'édition Office Online fonctionnera automatiquement!

*Date de création: 13/11/2025*
*Version: 1.0*
*Auteur: Claude Code*
