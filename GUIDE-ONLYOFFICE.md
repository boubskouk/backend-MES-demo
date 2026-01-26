# 📝 Guide OnlyOffice - Édition Word/Excel/PowerPoint

## 🎉 Félicitations!

Votre système d'archivage dispose maintenant d'**OnlyOffice** pour éditer les documents Word, Excel et PowerPoint directement dans le navigateur!

---

## ✅ Ce qui a été implémenté

### 1. Module OnlyOffice (`public/js/onlyoffice-editor.js`)

**Fonctionnalités:**
- Éditeur Word complet dans le navigateur
- Éditeur Excel (alternative à l'éditeur intégré)
- Éditeur PowerPoint
- Sauvegarde automatique dans MongoDB
- Interface moderne et intuitive

**Types de fichiers supportés:**
- Word: `.docx`, `.doc`, `.odt`, `.rtf`, `.txt`
- Excel: `.xlsx`, `.xls`, `.ods`, `.csv`
- PowerPoint: `.pptx`, `.ppt`, `.odp`

### 2. Routes backend (`server.js`)

**Route de callback:** `/api/onlyoffice/callback/:docId`

Cette route reçoit les modifications d'OnlyOffice et les sauvegarde automatiquement dans MongoDB.

### 3. Intégration dans l'application

- Bouton "Éditer" pour Word et PowerPoint
- Détection automatique du type de document
- Fallback vers le guide de téléchargement si OnlyOffice n'est pas disponible

---

## 🚀 Configuration requise

### Option A: Serveur de démonstration OnlyOffice (Actuel)

**Configuration par défaut:**
```javascript
documentServerUrl: 'https://documentserver.onlyoffice.com'
```

**Avantages:**
- ✅ Gratuit
- ✅ Aucune installation requise
- ✅ Fonctionne immédiatement

**Limitations:**
- ⚠️ Peut ne pas fonctionner avec `localhost` (uniquement en production)
- ⚠️ Pas adapté pour un usage en production intensif
- ⚠️ Dépend de la disponibilité du serveur OnlyOffice

**Recommandé pour:** Tests et démonstrations

---

### Option B: OnlyOffice Document Server auto-hébergé (Production)

Pour un usage en production, il est **fortement recommandé** d'installer votre propre serveur OnlyOffice.

#### Installation avec Docker (Recommandé)

**Prérequis:**
- Docker installé
- Serveur avec au moins 4 GB RAM
- Port 80 ou 443 disponible

**Installation:**

```bash
# Télécharger l'image OnlyOffice
docker pull onlyoffice/documentserver

# Lancer le serveur OnlyOffice
docker run -i -t -d -p 80:80 \
  --name onlyoffice-documentserver \
  --restart=always \
  -v /app/onlyoffice/DocumentServer/logs:/var/log/onlyoffice \
  -v /app/onlyoffice/DocumentServer/data:/var/www/onlyoffice/Data \
  -v /app/onlyoffice/DocumentServer/lib:/var/lib/onlyoffice \
  onlyoffice/documentserver
```

**Configurer votre application:**

Dans `public/js/onlyoffice-editor.js`, ligne 8:
```javascript
// Remplacer l'URL de démo par votre serveur
documentServerUrl: 'http://votre-serveur-onlyoffice.com'

// Ou si sur le même serveur:
documentServerUrl: window.location.origin
```

---

#### Installation sur Render

Si vous déployez sur Render, vous pouvez:

**Option 1: Service Docker séparé**
1. Créer un nouveau service Docker sur Render
2. Utiliser l'image `onlyoffice/documentserver`
3. Exposer sur un port public (ex: 8080)
4. Configurer l'URL dans `onlyoffice-editor.js`

**Option 2: Utiliser un service cloud OnlyOffice**
- ONLYOFFICE Cloud: https://www.onlyoffice.com/office-for-cloud.aspx
- Plans payants avec serveur géré

---

## 📊 Matrice de compatibilité

| Fichier | Local (sans OnlyOffice) | Local (avec OnlyOffice) | Production (avec OnlyOffice) |
|---------|------------------------|-------------------------|----------------------------|
| **Word (.docx)** | 📥 Téléchargement | ✅ Édition complète | ✅ Édition complète |
| **Excel (.xlsx)** | ✅ Éditeur intégré | ✅ Éditeur intégré ou OnlyOffice | ✅ Éditeur intégré ou OnlyOffice |
| **PowerPoint (.pptx)** | 📥 Téléchargement | ✅ Édition complète | ✅ Édition complète |
| **PDF (.pdf)** | 👁️ Prévisualisation | 👁️ Prévisualisation | 👁️ Prévisualisation |

---

## 🔧 Configuration

### Changer l'URL du serveur OnlyOffice

Dans `public/js/onlyoffice-editor.js`, ligne 8:

```javascript
const OnlyOfficeConfig = {
    // URL du serveur OnlyOffice
    documentServerUrl: 'https://votre-serveur.com',

    // Formats supportés (ne pas modifier sauf besoin spécifique)
    supportedFormats: {
        word: ['docx', 'doc', 'odt', 'rtf', 'txt'],
        cell: ['xlsx', 'xls', 'ods', 'csv'],
        slide: ['pptx', 'ppt', 'odp']
    }
};
```

### Désactiver OnlyOffice (fallback vers téléchargement)

Si OnlyOffice n'est pas disponible, le système affiche automatiquement le guide de téléchargement.

Vous n'avez rien à configurer!

---

## 🎯 Comment utiliser

### En local (sans serveur OnlyOffice)

1. Ouvrez http://localhost:4000
2. Cliquez sur un fichier Word ou PowerPoint
3. Cliquez sur "Éditer"
4. **Résultat:** Guide de téléchargement (OnlyOffice non disponible en localhost)

### En production (avec serveur OnlyOffice)

1. Installez OnlyOffice Document Server (voir ci-dessus)
2. Configurez l'URL dans `onlyoffice-editor.js`
3. Déployez sur Render
4. Cliquez sur un fichier Word/PowerPoint
5. Cliquez sur "Éditer"
6. **Résultat:** OnlyOffice s'ouvre avec édition complète! ✅

---

## 🐛 Dépannage

### OnlyOffice affiche "Document Server non disponible"

**Causes possibles:**
1. Serveur OnlyOffice non installé
2. URL incorrecte dans `onlyoffice-editor.js`
3. Problème de connexion réseau
4. CORS non configuré

**Solutions:**

1. **Vérifier l'URL:**
   ```javascript
   console.log(OnlyOfficeConfig.documentServerUrl);
   ```

2. **Tester l'URL directement:**
   ```
   https://votre-serveur/web-apps/apps/api/documents/api.js
   ```
   Doit retourner un fichier JavaScript.

3. **Vérifier les logs serveur:**
   ```bash
   docker logs onlyoffice-documentserver
   ```

### OnlyOffice fonctionne mais les modifications ne se sauvegardent pas

**Cause:** Le callback OnlyOffice ne peut pas joindre votre serveur.

**Solutions:**

1. **Vérifier que la route callback est accessible:**
   ```
   https://votre-app.onrender.com/api/onlyoffice/callback/TEST_ID
   ```
   Doit retourner `{"error": 0}`

2. **Vérifier les logs serveur:**
   Cherchez: `📝 OnlyOffice callback reçu pour:`

3. **Tester en local:**
   Utilisez ngrok pour exposer votre serveur local

---

## 💡 Alternatives

Si OnlyOffice ne convient pas, voici d'autres options:

### 1. Éditeur Excel intégré (Déjà implémenté)

Pour Excel uniquement:
- ✅ Fonctionne partout (local et production)
- ✅ Pas de serveur externe requis
- ✅ Sauvegarde directe dans MongoDB

### 2. Google Docs Viewer

Pour prévisualisation seulement:
- ✅ Gratuit
- ❌ Lecture seule
- ⚠️ Nécessite upload vers Google

### 3. Microsoft Office Online

Pour Word/Excel/PowerPoint:
- ⚠️ Nécessite protocole WOPI (complexe)
- ⚠️ Limitations sans licence Office 365

---

## 📈 Prochaines étapes

### Court terme (Tests)

1. ✅ Tester en local avec ngrok
2. ✅ Vérifier que le fallback fonctionne
3. ✅ Tester l'éditeur Excel intégré

### Moyen terme (Production)

1. Installer OnlyOffice Document Server
2. Déployer sur Render
3. Configurer l'URL dans `onlyoffice-editor.js`
4. Tester l'édition complète

### Long terme (Optimisations)

1. Configurer HTTPS pour OnlyOffice
2. Activer la collaboration en temps réel
3. Ajouter l'historique des versions
4. Personnaliser l'interface OnlyOffice

---

## ❓ FAQ

### Q: OnlyOffice est-il gratuit?

**R:** Oui! OnlyOffice Community Edition est **100% gratuit** et open-source.

### Q: Puis-je utiliser OnlyOffice en local?

**R:** Le serveur de démonstration OnlyOffice peut bloquer les connexions localhost. Pour tester en local:
1. Installez OnlyOffice avec Docker localement
2. Ou utilisez ngrok pour exposer votre serveur

### Q: Quelle est la différence entre OnlyOffice et l'éditeur Excel intégré?

**R:**
- **Éditeur Excel intégré:** Simple, rapide, fonctionne partout, Excel uniquement
- **OnlyOffice:** Complet, Word/Excel/PowerPoint, nécessite serveur

### Q: Les modifications sont-elles sauvegardées automatiquement?

**R:** Oui! OnlyOffice envoie les modifications au serveur via le callback `/api/onlyoffice/callback/:docId`.

### Q: Combien coûte l'hébergement OnlyOffice?

**R:**
- **Gratuit:** Si vous installez sur votre propre serveur
- **Render Docker:** ~$7/mois (service minimal)
- **OnlyOffice Cloud:** Variable selon le plan

---

## 🎓 Ressources

- **Documentation OnlyOffice:** https://api.onlyoffice.com/
- **Docker Hub:** https://hub.docker.com/r/onlyoffice/documentserver
- **GitHub:** https://github.com/ONLYOFFICE/DocumentServer
- **Forum:** https://forum.onlyoffice.com/

---

## 🎉 Résumé

### Ce que vous avez maintenant:

✅ **Module OnlyOffice complet** - Édition Word/Excel/PowerPoint
✅ **Sauvegarde automatique** - Modifications enregistrées dans MongoDB
✅ **Fallback intelligent** - Guide de téléchargement si OnlyOffice indisponible
✅ **Éditeur Excel intégré** - Continue de fonctionner indépendamment
✅ **Interface moderne** - Modale avec design professionnel

### Pour activer OnlyOffice:

1. Installez OnlyOffice Document Server (Docker)
2. Configurez l'URL dans `onlyoffice-editor.js`
3. Déployez sur Render
4. Testez l'édition!

**OnlyOffice fonctionnera automatiquement une fois le serveur configuré! 🚀**

---

*Date de création: 13/11/2025*
*Version: 1.0*
*Auteur: Claude Code*
