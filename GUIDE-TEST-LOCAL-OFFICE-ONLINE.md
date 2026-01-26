# 🧪 Guide de Test Local - Office Online avec Ngrok

## 🎯 Objectif

Tester **Office Online** sur votre ordinateur local **avant** le déploiement en production, en créant un tunnel public temporaire avec ngrok.

---

## 📋 Prérequis

- ✅ Votre application fonctionne en local (http://localhost:4000)
- ✅ MongoDB est lancé
- ✅ Vous avez uploadé des fichiers Word/Excel

---

## 🚀 Méthode 1: Ngrok (Recommandé - Gratuit)

### Étape 1: Installer ngrok

#### Windows:
1. Téléchargez: https://ngrok.com/download
2. Décompressez `ngrok.exe` dans un dossier (ex: `C:\ngrok\`)
3. Ajoutez au PATH (optionnel) ou utilisez le chemin complet

#### Ou via npm (toutes plateformes):
```bash
npm install -g ngrok
```

### Étape 2: Créer un compte ngrok (gratuit)

1. Allez sur: https://ngrok.com/signup
2. Créez un compte gratuit
3. Copiez votre **authtoken** sur: https://dashboard.ngrok.com/get-started/your-authtoken

### Étape 3: Configurer ngrok

```bash
ngrok authtoken VOTRE_TOKEN_ICI
```

### Étape 4: Lancer votre serveur

```bash
cd "E:\site et apps\archivage cerer\backend"
node server.js
```

Le serveur démarre sur **http://localhost:4000**

### Étape 5: Créer le tunnel ngrok

Ouvrez un **nouveau terminal** et lancez:

```bash
ngrok http 4000
```

Vous verrez quelque chose comme:

```
ngrok

Session Status                online
Account                       VotreNom (Plan: Free)
Version                       3.0.0
Region                        United States (us)
Latency                       45ms
Web Interface                 http://127.0.0.1:4040
Forwarding                    https://a1b2-3c4d.ngrok.io -> http://localhost:4000

Connections                   ttl     opn     rt1     rt5     p50     p90
                              0       0       0.00    0.00    0.00    0.00
```

**Votre URL publique:** `https://a1b2-3c4d.ngrok.io` ✅

### Étape 6: Tester Office Online

1. Ouvrez votre navigateur: `https://a1b2-3c4d.ngrok.io`
2. Connectez-vous à l'application
3. Cliquez sur un fichier Word ou Excel
4. **Cliquez sur "Éditer"**

**Résultat:**
- ✅ L'application détecte automatiquement que vous n'êtes plus sur localhost
- ✅ Office Online s'active automatiquement
- ✅ Vous pouvez éditer vos documents!

### Étape 7: Vérifier que ça fonctionne

Dans l'éditeur, vous devriez voir:
```
✅ Office Online activé!
Éditez votre document directement dans le navigateur.
```

Et une iframe Microsoft Office avec votre document.

---

## 🎨 Interface ngrok Web

Ngrok inclut une interface de monitoring:

```
http://localhost:4040
```

Vous pouvez voir:
- Toutes les requêtes HTTP
- Les réponses du serveur
- Les erreurs éventuelles
- Le trafic en temps réel

---

## ⚙️ Configuration avancée ngrok

### Fixer le sous-domaine (payant)

Avec le plan payant, vous pouvez avoir une URL fixe:

```bash
ngrok http --subdomain=archivage-cerer 4000
```

URL: `https://archivage-cerer.ngrok.io` (toujours la même)

### Utiliser un domaine personnalisé (payant)

```bash
ngrok http --hostname=archivage.cerer.sn 4000
```

### Fichier de configuration

Créez `ngrok.yml`:

```yaml
version: "2"
authtoken: VOTRE_TOKEN
tunnels:
  archivage:
    proto: http
    addr: 4000
    inspect: true
```

Puis lancez:
```bash
ngrok start archivage
```

---

## 🚀 Méthode 2: Localtunnel (Alternative gratuite)

### Installation

```bash
npm install -g localtunnel
```

### Lancer le tunnel

```bash
# Terminal 1: Votre serveur
node server.js

# Terminal 2: Le tunnel
lt --port 4000
```

Vous obtiendrez une URL comme: `https://weird-cat-12.loca.lt`

### Tester

1. Ouvrez l'URL donnée
2. La première fois, cliquez sur "Continue" (verification)
3. Utilisez l'application normalement
4. Office Online fonctionnera!

---

## 🌐 Méthode 3: Serveur local avec IP publique

Si votre fournisseur Internet vous donne une **IP publique**:

### Étape 1: Trouver votre IP publique

```bash
curl ifconfig.me
```

Exemple: `41.82.123.45`

### Étape 2: Rediriger le port sur votre routeur

Dans l'interface de votre routeur (ex: 192.168.1.1):
- Port externe: `4000`
- Port interne: `4000`
- IP locale: `192.168.1.100` (votre PC)

### Étape 3: Accéder avec l'IP publique

```
http://41.82.123.45:4000
```

⚠️ **Attention:** Pas de HTTPS, moins sécurisé, Office Online peut bloquer.

---

## 📊 Comparaison des méthodes

| Méthode | Gratuit | HTTPS | Facile | Recommandé |
|---------|---------|-------|--------|------------|
| **Ngrok** | ✅ Oui | ✅ Oui | ✅ Très | ⭐⭐⭐⭐⭐ |
| **Localtunnel** | ✅ Oui | ✅ Oui | ✅ Oui | ⭐⭐⭐⭐ |
| **IP publique** | ✅ Oui | ❌ Non | ⚠️ Complexe | ⭐⭐ |

---

## 🎯 Scénario de test complet

### 1. Préparer l'environnement

```bash
# Terminal 1: MongoDB
net start MongoDB

# Terminal 2: Serveur Node.js
cd "E:\site et apps\archivage cerer\backend"
node server.js

# Terminal 3: Ngrok
ngrok http 4000
```

### 2. Noter l'URL ngrok

```
Forwarding: https://a1b2-3c4d.ngrok.io
```

### 3. Tester l'application

Ouvrez: `https://a1b2-3c4d.ngrok.io`

#### Test 1: Connexion
- ✅ Page de connexion s'affiche
- ✅ Connexion fonctionne (jbk / 0811)

#### Test 2: Upload Word
- ✅ Uploader un fichier `.docx`
- ✅ Le fichier apparaît dans la liste

#### Test 3: Édition Office Online
- ✅ Cliquer sur le document
- ✅ Cliquer sur "Éditer"
- ✅ Office Online s'ouvre dans l'iframe
- ✅ Modifier le texte
- ✅ Les modifications sont visibles

#### Test 4: Sauvegarde (limitation)
- ⚠️ Office Online en mode **lecture seule** par défaut
- ✅ L'éditeur Excel intégré fonctionne toujours pour `.xlsx`

### 4. Partager avec collègues

Envoyez l'URL ngrok à vos collègues:
```
https://a1b2-3c4d.ngrok.io
```

Ils peuvent:
- ✅ Accéder à l'application depuis leur ordinateur
- ✅ Tester Office Online
- ✅ Donner des retours

---

## ⚠️ Limitations du test local

### 1. URL temporaire

L'URL ngrok change à chaque démarrage (version gratuite):
- Aujourd'hui: `https://a1b2.ngrok.io`
- Demain: `https://z9y8.ngrok.io`

**Solution:** Plan payant pour URL fixe, ou notez la nouvelle URL à chaque fois.

### 2. Vitesse

Le tunnel ajoute de la latence:
- Requête: Navigateur → ngrok → localhost → ngrok → navigateur
- ⏱️ Environ 100-300ms de délai supplémentaire

**En production:** Pas de tunnel, donc beaucoup plus rapide.

### 3. Sauvegarde Office Online

Office Online peut ouvrir les fichiers en **lecture seule** sans WOPI:
- ✅ Vous pouvez **voir** le document
- ❌ Les modifications ne se sauvegardent pas automatiquement

**Solution:**
- Utilisez l'éditeur Excel intégré pour les modifications
- OU implémentez le protocole WOPI (complexe)

---

## 🔧 Dépannage

### Ngrok affiche "ERR_NGROK_108"

**Cause:** Trop de connexions (limite gratuite atteinte)

**Solution:**
- Attendez 1 heure
- Ou utilisez Localtunnel
- Ou prenez le plan payant

### Office Online dit "Cannot download"

**Cause:** Le fichier n'est pas accessible via l'URL publique

**Solutions:**

1. Testez l'URL directement:
   ```
   https://a1b2.ngrok.io/api/office-file/jbk/DOCUMENT_ID
   ```
   Doit télécharger le fichier.

2. Vérifiez les logs serveur:
   ```
   📄 Fichier Office servi: document.docx pour jbk
   ```

3. Vérifiez les en-têtes CORS (déjà configuré):
   ```javascript
   res.setHeader('Access-Control-Allow-Origin', '*');
   ```

### Ngrok affiche "Tunnel not found"

**Cause:** Le serveur Node.js ne tourne pas sur le port 4000

**Solution:**
```bash
# Vérifier que le serveur tourne
netstat -ano | findstr :4000

# Si rien, relancer:
node server.js
```

---

## 💡 Astuces

### 1. Garder ngrok ouvert pendant les tests

Utilisez un gestionnaire de processus:

```bash
# Installer PM2
npm install -g pm2

# Lancer le serveur avec PM2
pm2 start server.js --name archivage

# Dans un autre terminal
ngrok http 4000
```

Le serveur ne redémarre plus, ngrok reste connecté.

### 2. Raccourci pour relancer ngrok

Créez un fichier `start-ngrok.bat`:

```batch
@echo off
cd "E:\site et apps\archivage cerer\backend"
start cmd /k "node server.js"
timeout /t 3
ngrok http 4000
```

Double-cliquez dessus pour tout lancer!

### 3. Tester sur mobile

L'URL ngrok fonctionne aussi sur smartphone:
- Ouvrez `https://a1b2.ngrok.io` sur votre téléphone
- Testez l'application mobile
- Vérifiez l'interface responsive

---

## 📚 Ressources

- **Ngrok**: https://ngrok.com/
- **Localtunnel**: https://theboroer.github.io/localtunnel-www/
- **Office Online**: https://www.microsoft.com/en-us/microsoft-365/office-online/documents-spreadsheets-presentations-office-online

---

## ✅ Checklist de test

### Avant le test:
- [ ] MongoDB lancé
- [ ] Serveur Node.js lancé (port 4000)
- [ ] Ngrok installé et configuré
- [ ] Fichiers Word/Excel uploadés

### Pendant le test:
- [ ] Tunnel ngrok créé
- [ ] URL publique notée
- [ ] Application accessible via URL ngrok
- [ ] Connexion fonctionne
- [ ] Upload fonctionne
- [ ] Prévisualisation fonctionne
- [ ] Bouton "Éditer" visible
- [ ] Office Online s'ouvre
- [ ] Document s'affiche dans l'iframe

### Validation:
- [ ] Office Online détecté automatiquement
- [ ] Pas de message d'erreur
- [ ] Interface fluide
- [ ] Modifications possibles (si WOPI activé)

---

## 🎉 Résumé

### Pour tester Office Online en local:

1. **Installez ngrok:** `npm install -g ngrok`
2. **Configurez:** `ngrok authtoken VOTRE_TOKEN`
3. **Lancez le serveur:** `node server.js`
4. **Créez le tunnel:** `ngrok http 4000`
5. **Testez:** Ouvrez l'URL ngrok dans votre navigateur

**C'est tout!** Office Online fonctionnera exactement comme en production.

---

**Prêt pour vos tests! 🚀**

*Date de création: 13/11/2025*
*Version: 1.0*
*Auteur: Claude Code*
