# 🔍 Guide de Diagnostic - Visualisation des Fichiers Office

Ce guide explique comment utiliser les scripts de diagnostic pour identifier les problèmes de visualisation des fichiers Office (Word, Excel, PowerPoint) dans votre application.

## 📋 Table des matières

1. [Scripts disponibles](#scripts-disponibles)
2. [Diagnostic Backend](#diagnostic-backend)
3. [Diagnostic Frontend](#diagnostic-frontend)
4. [Problèmes courants et solutions](#problèmes-courants-et-solutions)

---

## Scripts disponibles

### 1. `diagnostic-office-preview.js` (Backend)
Script Node.js qui teste la base de données et les routes backend.

### 2. `public/diagnostic-office-frontend.html` (Frontend)
Page HTML qui teste les librairies JavaScript et la prévisualisation dans le navigateur.

---

## Diagnostic Backend

### Comment lancer

```bash
node diagnostic-office-preview.js
```

### Ce qu'il teste

✅ **Connexion à MongoDB**
- Vérifie que la base de données est accessible
- Utilise la connexion définie dans `.env` ou `MONGODB_URI`

✅ **Documents Office dans la base**
- Compte le nombre total de documents
- Identifie les documents Office (.doc, .docx, .xls, .xlsx, .ppt, .pptx)
- Affiche les détails des 10 premiers documents

✅ **Intégrité des fichiers**
- Vérifie que le contenu existe
- Valide le format data URL
- Vérifie l'encodage Base64
- Teste les "magic bytes" (signatures de fichiers)
- Détecte les fichiers corrompus

✅ **Routes Backend**
- Teste la route `/api/office-file/:userId/:docId`
- Vérifie les mappings Content-Type
- Simule la conversion en Buffer

### Résultats

Le script affiche :
- ✅ Vert : Test réussi
- ❌ Rouge : Test échoué (problème critique)
- ⚠️  Jaune : Avertissement (à surveiller)

À la fin, vous obtenez :
- **Score de santé** : Pourcentage de tests réussis
- **Recommandations** : Solutions aux problèmes détectés

---

## Diagnostic Frontend

### Comment lancer

1. **Démarrez le serveur** :
```bash
node server.js
```

2. **Ouvrez dans votre navigateur** :
```
http://localhost:3000/diagnostic-office-frontend.html
```

### Ce qu'il teste

✅ **Librairies JavaScript**
- PDF.js (pour les PDFs)
- Mammoth.js (pour les fichiers Word)
- SheetJS/XLSX (pour les fichiers Excel)

✅ **Connexion API**
- Vérifie que le backend répond

✅ **Fonctions de conversion**
- Base64 → ArrayBuffer
- Data URL → Blob

✅ **Prévisualisation en temps réel**
- Vous pouvez uploader un fichier Office
- Le script le prévisualise et affiche les erreurs éventuelles

### Console de diagnostic

La page affiche une console en temps réel avec :
- Toutes les étapes de traitement
- Les erreurs détaillées
- Les avertissements

---

## Problèmes courants et solutions

### ❌ "Aucun document trouvé dans la base de données"

**Causes possibles :**
- La base de données est vide
- Vous êtes connecté à la mauvaise base de données
- Les documents sont dans une autre collection

**Solutions :**
1. Vérifiez votre connexion MongoDB dans `.env`
2. Uploadez des fichiers Office dans l'application
3. Vérifiez le nom de la base de données : `archivage_cerer`

---

### ❌ "Signature de fichier invalide"

**Cause :**
Les fichiers Office ont été corrompus lors de l'upload, probablement par la fonction `compressImage()`.

**Solution :**
La fonction `compressImage()` dans `public/js/app.js` doit être modifiée pour ne PAS compresser les fichiers Office.

```javascript
async function compressImage(file) {
    // Si c'est un fichier Office, ne pas compresser
    const officeTypes = [
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-powerpoint',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation'
    ];

    if (officeTypes.includes(file.type) || /\.(doc|docx|xls|xlsx|ppt|pptx)$/i.test(file.name)) {
        // Ne pas compresser, juste convertir en data URL
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }

    // Sinon, compression normale pour les images
    // ... code existant
}
```

---

### ❌ "Mammoth.js n'est pas chargé"

**Cause :**
La librairie Mammoth.js n'a pas pu être chargée depuis le CDN.

**Solutions :**
1. Vérifiez votre connexion internet
2. Vérifiez dans `public/index.html` que la ligne suivante existe :
```html
<script src="https://cdnjs.cloudflare.com/ajax/libs/mammoth/1.6.0/mammoth.browser.min.js"></script>
```
3. Ouvrez la console du navigateur (F12) et tapez : `typeof mammoth`
   - Si c'est "undefined", la librairie n'est pas chargée

---

### ❌ "SheetJS n'est pas chargé"

**Cause :**
La librairie SheetJS (XLSX) n'a pas pu être chargée.

**Solutions :**
1. Vérifiez dans `public/index.html` :
```html
<script src="https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js"></script>
```
2. Dans la console : `typeof XLSX` devrait retourner "object"

---

### ❌ "PDF.js n'est pas chargé"

**Cause :**
La librairie PDF.js n'a pas pu être chargée.

**Solutions :**
1. Vérifiez dans `public/index.html` :
```html
<script src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js"></script>
<script>
    if (typeof pdfjsLib !== 'undefined') {
        pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
    }
</script>
```
2. Dans la console : `typeof pdfjsLib` devrait retourner "object"

---

### ⚠️ "Incohérence de type MIME"

**Cause :**
Le type MIME stocké dans le document ne correspond pas au type MIME dans la data URL.

**Solution :**
Ce n'est généralement pas critique, mais pour corriger :
1. Lors de l'upload, assurez-vous que le bon type MIME est capturé
2. Vérifiez la fonction `handleFileUpload()` dans `documents.js`

---

### ❌ "Erreur lors de la conversion du document Word"

**Causes possibles :**
1. Le fichier est au format `.doc` (ancien) au lieu de `.docx`
2. Le fichier est corrompu
3. Le fichier n'est pas vraiment un document Word

**Solutions :**
1. Convertissez les fichiers `.doc` en `.docx` avec Microsoft Word
2. Vérifiez que le fichier s'ouvre correctement dans Word
3. Utilisez le diagnostic backend pour voir les "magic bytes"

---

### ❌ "Erreur 404 sur /api/office-file/..."

**Cause :**
La route backend n'existe pas ou le serveur n'est pas démarré.

**Solutions :**
1. Vérifiez que le serveur est lancé : `node server.js`
2. Cherchez dans `server.js` la route :
```javascript
app.get('/api/office-file/:userId/:docId', async (req, res) => {
    // ...
});
```
3. Vérifiez que l'URL est correcte

---

## 🎯 Workflow de diagnostic recommandé

### Étape 1 : Diagnostic Backend
```bash
node diagnostic-office-preview.js
```
- Lisez attentivement les résultats
- Notez les erreurs critiques (❌)
- Notez le score de santé

### Étape 2 : Diagnostic Frontend
1. Lancez le serveur : `node server.js`
2. Ouvrez : `http://localhost:3000/diagnostic-office-frontend.html`
3. Vérifiez que toutes les librairies sont chargées (✅)
4. Uploadez un fichier Office pour tester

### Étape 3 : Test en situation réelle
1. Ouvrez l'application principale : `http://localhost:3000`
2. Ouvrez la console du navigateur (F12)
3. Uploadez un fichier Office
4. Essayez de le prévisualiser
5. Notez les erreurs dans la console

### Étape 4 : Analyse et correction
- Comparez les erreurs entre les diagnostics backend et frontend
- Appliquez les solutions recommandées
- Relancez les diagnostics pour vérifier les corrections

---

## 📝 Checklist de vérification

### Backend ✓
- [ ] MongoDB est accessible
- [ ] Les documents Office sont dans la base de données
- [ ] Le contenu est au format data URL valide
- [ ] L'encodage Base64 est correct
- [ ] Les signatures de fichiers sont valides
- [ ] La route `/api/office-file/` fonctionne

### Frontend ✓
- [ ] PDF.js est chargé (`typeof pdfjsLib !== 'undefined'`)
- [ ] Mammoth.js est chargé (`typeof mammoth !== 'undefined'`)
- [ ] SheetJS est chargé (`typeof XLSX !== 'undefined'`)
- [ ] L'API backend répond
- [ ] Les fonctions de conversion fonctionnent
- [ ] La prévisualisation s'affiche sans erreur

### Upload ✓
- [ ] La fonction `compressImage()` ne modifie pas les fichiers Office
- [ ] Le type MIME est correctement détecté
- [ ] Le fichier est correctement encodé en Base64
- [ ] Le document est sauvegardé avec le bon format

---

## 🆘 Support

Si les problèmes persistent après avoir suivi ce guide :

1. **Collectez les informations** :
   - Résultats du diagnostic backend (copie complète)
   - Résultats du diagnostic frontend (screenshots)
   - Erreurs dans la console du navigateur
   - Version de Node.js : `node --version`
   - Version de MongoDB : `mongod --version`

2. **Vérifiez les logs** :
   - Logs du serveur backend
   - Console du navigateur (onglet Console)
   - Onglet Réseau (Network) dans les DevTools

3. **Tests additionnels** :
   - Essayez avec différents fichiers Office
   - Testez sur un autre navigateur
   - Vérifiez que les fichiers s'ouvrent correctement dans Office

---

## ✨ Formats supportés

| Format | Extension | Prévisualisation | Notes |
|--------|-----------|------------------|-------|
| Word moderne | .docx | ✅ Oui | Via Mammoth.js |
| Word ancien | .doc | ⚠️ Limité | Support partiel |
| Excel moderne | .xlsx | ✅ Oui | Via SheetJS |
| Excel ancien | .xls | ✅ Oui | Via SheetJS |
| PowerPoint moderne | .pptx | ❌ Non | Pas de support |
| PowerPoint ancien | .ppt | ❌ Non | Pas de support |
| PDF | .pdf | ✅ Oui | Via PDF.js |

---

## 🔧 Dépannage rapide

### Le diagnostic backend ne démarre pas
```bash
# Réinstallez les dépendances
npm install

# Vérifiez que mongoose est installé
npm list mongoose

# Si manquant
npm install mongoose
```

### Le diagnostic frontend affiche une page blanche
1. Vérifiez que le serveur est lancé
2. Ouvrez la console (F12) pour voir les erreurs
3. Vérifiez l'URL : `http://localhost:3000/diagnostic-office-frontend.html`

### Les tests échouent tous
1. Vérifiez que MongoDB est en cours d'exécution
2. Vérifiez votre fichier `.env`
3. Essayez de vous connecter manuellement à MongoDB

---

**Date de création :** $(date)
**Version :** 1.0
