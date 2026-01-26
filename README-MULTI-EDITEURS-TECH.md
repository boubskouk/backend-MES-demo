# 🔧 Système Multi-Éditeurs - Documentation Technique

## Modifications apportées

### Nouveaux fichiers créés

#### 1. `public/js/multi-editor.js` (nouveau)
Gestionnaire centralisé des éditeurs multiples.

**Fonctionnalités** :
- Détection automatique de la disponibilité d'OnlyOffice
- Menu de sélection d'éditeur avec 5 options
- Gestion des éditeurs : OnlyOffice, Office Online, Google Viewer, Éditeur Local, Zoho Office
- Fallback automatique si un éditeur échoue

**API Publique** :
```javascript
// Afficher le sélecteur d'éditeur
showEditorSelector(doc)

// Ouvrir directement avec un éditeur spécifique
openWithEditor(doc, editorId)

// Vérifier la disponibilité d'OnlyOffice
checkOnlyOfficeAvailability()

// Obtenir les éditeurs compatibles pour un fichier
getCompatibleEditors(fileName)
```

**Configuration des éditeurs** :
```javascript
const EditorConfig = {
    onlyoffice: { ... },
    office365: { ... },
    google: { ... },
    local: { ... },
    zoho: { ... }
}
```

---

### Fichiers modifiés

#### 2. `public/index.html`
**Ligne 39** : Ajout du script `multi-editor.js`
```html
<script src="/js/multi-editor.js"></script>
```

#### 3. `public/js/app.js`

**Ajout fonction `isOfficeDocument` (lignes 747-752)** :
```javascript
function isOfficeDocument(fileName) {
    if (!fileName) return false;
    const ext = fileName.toLowerCase().split('.').pop();
    const officeExtensions = ['doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'odt', 'ods', 'odp'];
    return officeExtensions.includes(ext);
}
```

**Modification du bouton Éditer (lignes 2779-2785)** :
- Avant : Bouton "Éditer Excel" uniquement pour .xls/.xlsx
- Après : Bouton "Éditer" pour tous fichiers Office (Word, Excel, PowerPoint)
- Appelle `openEditor(doc)` qui ouvre le sélecteur multi-éditeurs

#### 4. `public/js/preview.js`

**Fonction `dataURLToArrayBuffer` (lignes 47-80)** :
Ajout de validations robustes :
```javascript
function dataURLToArrayBuffer(dataURL) {
    try {
        // Vérifications multiples
        if (!dataURL || typeof dataURL !== 'string') {
            throw new Error('DataURL invalide ou manquant');
        }
        if (!dataURL.startsWith('data:')) {
            throw new Error('Le contenu doit commencer par "data:"');
        }
        // ... validation du format
        // ... décodage base64
        return bytes.buffer;
    } catch (error) {
        console.error('Erreur conversion dataURL:', error);
        throw new Error(`Impossible de convertir le data URL: ${error.message}`);
    }
}
```

**Fonction `previewExcel` (lignes 306-315)** :
Ajout de validations avant conversion :
```javascript
// Vérifier que le dataURL est valide avant de continuer
if (!dataURL || typeof dataURL !== 'string') {
    throw new Error('Contenu du fichier manquant ou invalide');
}
if (!dataURL.startsWith('data:')) {
    throw new Error('Format de contenu incorrect (data URL attendu)');
}
```

#### 5. `public/js/onlyoffice-editor.js`

**Fonction `loadOnlyOfficeAPI` (lignes 265-308)** :
Améliorations :
- Ajout d'un timeout de 10 secondes
- Vérification que `DocsAPI` est bien défini après chargement
- Messages d'erreur plus explicites
- Suggestions de solutions alternatives

**Fonction `openOnlyOfficeEditor` (lignes 127-150)** :
Ajout de gestion d'erreur avec fallback automatique :
```javascript
catch (error) {
    console.error('Erreur ouverture OnlyOffice:', error);

    // Fallback automatique selon le type de fichier
    const ext = doc.nomFichier.toLowerCase().split('.').pop();

    closeOnlyOfficeEditor();

    if (ext === 'xlsx' || ext === 'xls') {
        // Utiliser l'éditeur local pour Excel
        openExcelEditor(doc);
    } else {
        // Télécharger le fichier
        downloadDoc(doc);
    }
}
```

---

## Architecture du système

### Flux de fonctionnement

```
Utilisateur clique "Éditer"
         ↓
    openEditor(doc)
         ↓
checkOnlyOfficeAvailability()
         ↓
getCompatibleEditors(doc.fileName)
         ↓
showEditorSelector(doc)
         ↓
Utilisateur choisit un éditeur
         ↓
openWithEditor(doc, editorId)
         ↓
    ┌─────────┴─────────┬──────────┬──────────┬──────────┐
    ↓                   ↓          ↓          ↓          ↓
OnlyOffice        Office365   Google    Local      Zoho
Editor            Viewer      Viewer    Editor    Viewer
```

### Priorité des éditeurs

1. **OnlyOffice** (si disponible) - Édition complète
2. **Office Online** - Visualisation fidèle Microsoft
3. **Google Viewer** - Visualisation universelle
4. **Éditeur Local** - Édition Excel rapide
5. **Zoho Office** - Alternative visualisation

---

## Configuration

### OnlyOffice

Fichier : `public/js/onlyoffice-editor.js`

```javascript
const OnlyOfficeConfig = {
    // Changer cette URL pour votre serveur OnlyOffice
    documentServerUrl: 'https://documentserver.onlyoffice.com',

    supportedFormats: {
        word: ['docx', 'doc', 'odt', 'rtf', 'txt'],
        cell: ['xlsx', 'xls', 'ods', 'csv'],
        slide: ['pptx', 'ppt', 'odp']
    }
};
```

### Personnalisation des éditeurs

Fichier : `public/js/multi-editor.js`

Pour ajouter/retirer un éditeur, modifier `EditorConfig` :

```javascript
const EditorConfig = {
    newEditor: {
        name: 'Mon Éditeur',
        icon: '📝',
        description: 'Description de mon éditeur',
        supports: ['docx', 'xlsx'],
        color: 'blue',
        available: true,
        priority: 6
    }
};
```

Puis implémenter la fonction :
```javascript
function openNewEditor(doc) {
    // Votre implémentation
}
```

---

## Tests

### Test manuel

1. **Tester la prévisualisation** :
   - Cliquer sur un document
   - Cliquer "👁️ Prévisualiser"
   - Vérifier que le document s'affiche

2. **Tester l'édition multi-éditeurs** :
   - Cliquer sur un document Office
   - Cliquer "✏️ Éditer"
   - Le menu de sélection devrait apparaître
   - Tester chaque éditeur

3. **Tester le fallback OnlyOffice** :
   - Si OnlyOffice n'est pas disponible
   - Essayer d'ouvrir un fichier Excel
   - Devrait basculer automatiquement sur l'éditeur local

### Tests automatisés (à implémenter)

```javascript
describe('Multi-Éditeurs', () => {
    it('devrait détecter les fichiers Office', () => {
        expect(isOfficeDocument('test.docx')).toBe(true);
        expect(isOfficeDocument('test.xlsx')).toBe(true);
        expect(isOfficeDocument('test.pdf')).toBe(false);
    });

    it('devrait retourner les éditeurs compatibles', () => {
        const editors = getCompatibleEditors('test.xlsx');
        expect(editors.length).toBeGreaterThan(0);
    });

    it('devrait valider les data URLs', () => {
        expect(() => dataURLToArrayBuffer('invalid')).toThrow();
        expect(() => dataURLToArrayBuffer('data:text/plain;base64,SGVsbG8=')).not.toThrow();
    });
});
```

---

## Dépendances

### Bibliothèques externes utilisées

- **PDF.js** : Prévisualisation PDF
- **Mammoth.js** : Conversion Word vers HTML
- **SheetJS (XLSX)** : Manipulation Excel
- **Tailwind CSS** : Styles UI

### APIs externes

- **OnlyOffice Document Server** (optionnel)
- **Microsoft Office Online Viewer**
- **Google Docs Viewer**
- **Zoho Office Viewer**

---

## Sécurité

### Validations ajoutées

1. **Validation des data URLs** :
   - Vérification du format
   - Vérification de la présence du contenu base64
   - Gestion des erreurs de décodage

2. **Timeout sur OnlyOffice** :
   - Évite les attentes infinies
   - Fallback automatique après 10s

3. **Sanitization** :
   - Tous les contenus HTML sont échappés
   - Pas d'exécution de code arbitraire

### Recommandations

- **En production** : Utiliser un serveur OnlyOffice local
- **Documents sensibles** : Privilégier l'éditeur local (pas de données externes)
- **HTTPS requis** : Pour les éditeurs externes (Office Online, Google)

---

## Performance

### Optimisations

1. **Chargement conditionnel** :
   - OnlyOffice chargé uniquement si nécessaire
   - Timeout pour éviter les blocages

2. **Éditeur local** :
   - Pas de chargement externe
   - Traitement côté client uniquement
   - Le plus rapide pour Excel

3. **Cache navigateur** :
   - Les bibliothèques externes sont mises en cache
   - Les iframes sont réutilisées quand possible

### Métriques (approximatives)

| Éditeur | Temps de chargement | Bande passante |
|---------|---------------------|----------------|
| Éditeur Local | < 100ms | 0 KB |
| OnlyOffice | 2-5s | 1-3 MB |
| Office Online | 3-7s | 500 KB - 2 MB |
| Google Viewer | 2-4s | 300 KB - 1 MB |
| Zoho Office | 3-6s | 500 KB - 2 MB |

---

## Maintenance

### Logs importants

```javascript
// Console du navigateur
✅ Module OnlyOffice chargé
✅ Gestionnaire multi-éditeurs chargé
📝 Éditeurs disponibles: onlyoffice, office365, google, local, zoho
❌ Impossible de charger OnlyOffice API
💡 Le serveur OnlyOffice de démonstration n'est plus accessible
```

### Points de surveillance

1. **Disponibilité d'OnlyOffice** :
   - Vérifier régulièrement que le serveur répond
   - Logs dans la console navigateur

2. **Compatibilité navigateurs** :
   - Tester sur Chrome, Firefox, Safari, Edge
   - Vérifier les iframes (certains navigateurs bloquent)

3. **Taille des fichiers** :
   - Limiter les uploads volumineux (> 10 MB)
   - Timeout plus long pour gros fichiers

---

## Roadmap

### Fonctionnalités futures possibles

- [ ] Éditeur collaboratif temps réel
- [ ] Historique des versions
- [ ] Commentaires et annotations
- [ ] Conversion de formats
- [ ] Signature électronique
- [ ] Mode hors ligne (Progressive Web App)
- [ ] Éditeur de PDF intégré
- [ ] Reconnaissance OCR pour images

---

## Support

### En cas de problème

1. **Vérifier la console du navigateur** (F12)
2. **Vérifier les logs serveur**
3. **Tester avec un autre navigateur**
4. **Vérifier la disponibilité d'OnlyOffice**
5. **Essayer un autre éditeur**

### Contacts

- Documentation utilisateur : `MULTI-EDITEURS-GUIDE.md`
- Issues GitHub : [Créer une issue](https://github.com/votre-repo/issues)

---

**Date de création** : Novembre 2025
**Version** : 1.0.0
**Auteur** : Système C.E.R.E.R
