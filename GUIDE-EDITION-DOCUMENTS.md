# 📝 Guide d'Édition de Documents - Archivage C.E.R.E.R

## 🎯 Fonctionnalité Implémentée

Votre système d'archivage dispose maintenant d'un **éditeur de documents intégré** qui vous permet de modifier directement vos fichiers Excel sans les télécharger!

---

## ✅ Ce qui fonctionne

### Fichiers Excel (.xlsx)
- ✅ **Édition complète** des cellules
- ✅ **Modification en temps réel** avec prévisualisation
- ✅ **Sauvegarde automatique** dans la base de données
- ✅ **Indicateur visuel** des modifications (cellules surlignées en jaune)
- ✅ **Compteur de modifications** pour suivre vos changements

### Fichiers Word (.docx)
- ⚠️ **Édition limitée** (templates uniquement)
- 💡 **Guide intégré** pour télécharger → éditer → re-téléverser

---

## 🚀 Comment utiliser l'éditeur

### Étape 1: Ouvrir un document
1. Connectez-vous à l'application: **http://localhost:4000**
2. Cliquez sur un document dans votre liste
3. La **fenêtre de prévisualisation** s'ouvre

### Étape 2: Passer en mode édition
- Si le document est **éditable** (fichier Excel), vous verrez un bouton **"Éditer"** vert
- Cliquez sur **"Éditer"** pour ouvrir l'éditeur

### Étape 3: Modifier les cellules (Excel)
1. **Cliquez sur une cellule** pour la sélectionner
2. **Tapez votre modification** directement dans la cellule
3. La cellule devient **jaune** pour indiquer qu'elle a été modifiée
4. Le **compteur en bas** affiche le nombre de modifications

### Étape 4: Enregistrer
1. Cliquez sur le bouton **"Enregistrer"** (vert) en haut
2. Vos modifications sont **immédiatement sauvegardées** dans la base de données
3. Un message de confirmation s'affiche
4. L'éditeur se ferme automatiquement

---

## 📊 Interface de l'Éditeur Excel

### En-tête
```
┌─────────────────────────────────────────────────────┐
│ 📝 Édition: Nom du document                         │
│ fichier.xlsx • 15 lignes                            │
│                                    [Enregistrer] [✕] │
└─────────────────────────────────────────────────────┘
```

### Zone d'instructions
```
┌─────────────────────────────────────────────────────┐
│ 💡 Instructions: Cliquez sur une cellule pour la   │
│    modifier. Les cellules modifiées sont           │
│    surlignées en jaune.                             │
└─────────────────────────────────────────────────────┘
```

### Tableau éditable
```
┌──────┬──────┬──────┬──────┐
│  A1  │  B1  │  C1  │  D1  │  ← En-têtes (fond bleu)
├──────┼──────┼──────┼──────┤
│  A2  │  B2  │  C2  │  D2  │  ← Cellules éditables
├──────┼──────┼──────┼──────┤
│  A3  │  B3  │  C3  │  D3  │  ← Cliquez pour éditer
└──────┴──────┴──────┴──────┘
```

### Pied de page
```
┌─────────────────────────────────────────────────────┐
│ 3 cellules modifiées                                │
│                    Cliquez sur "Enregistrer" pour   │
│                    appliquer les modifications      │
└─────────────────────────────────────────────────────┘
```

---

## 🎨 Indicateurs visuels

| Couleur | Signification |
|---------|---------------|
| 🟦 Bleu | Première ligne (en-têtes) |
| ⬜ Blanc | Cellule normale (non modifiée) |
| 🟨 Jaune | Cellule modifiée (pas encore sauvegardée) |
| 🔵 Contour bleu | Cellule actuellement sélectionnée |

---

## 💡 Astuces et raccourcis

### Navigation
- **Clic** sur une cellule = Sélectionner et éditer
- **Tab** = Passer à la cellule suivante
- **Enter** = Descendre à la ligne suivante
- **Échap** = Fermer l'éditeur (avec confirmation si modifications)

### Édition
- **Double-clic** = Sélectionner tout le texte de la cellule
- **Focus sur cellule** = Le texte est automatiquement sélectionné
- Les modifications sont **instantanées** (pas besoin de valider chaque cellule)

### Sécurité
- Si vous essayez de fermer avec des modifications non sauvegardées, une **confirmation** s'affiche
- Les modifications ne sont appliquées qu'après avoir cliqué sur **"Enregistrer"**

---

## 📋 Exemple d'utilisation

### Scénario: Modifier un rapport de dépenses

1. **Ouvrir le document**
   - Cliquez sur "Rapport Dépenses Janvier.xlsx"
   - La prévisualisation s'ouvre
   - Cliquez sur **"Éditer"**

2. **Modifier les montants**
   - Cellule B2 (Montant): Changez `15000` → `18000`
   - Cellule B3 (Montant): Changez `8000` → `9500`
   - Cellule C2 (Catégorie): Changez `Transport` → `Déplacement`

3. **Vérifier les modifications**
   - 3 cellules sont surlignées en jaune
   - Le compteur affiche: "3 cellules modifiées"

4. **Enregistrer**
   - Cliquez sur **"Enregistrer"**
   - Message: "✅ 3 cellules mises à jour!"
   - L'éditeur se ferme automatiquement

5. **Vérification**
   - Rouvrez le document pour vérifier les modifications
   - Les changements sont bien sauvegardés

---

## ⚙️ API Technique (pour les développeurs)

### Route utilisée
```
POST /api/office/edit-excel/:docId
```

### Corps de la requête
```json
{
  "cellUpdates": {
    "A1": "Nouveau titre",
    "B2": 12345,
    "C3": "=SUM(B1:B10)",
    "D4": "Texte"
  }
}
```

### Réponse
```json
{
  "success": true,
  "message": "Document Excel modifié avec succès"
}
```

---

## 🔧 Formats supportés

| Type | Extension | Édition | Prévisualisation |
|------|-----------|---------|------------------|
| Excel moderne | `.xlsx` | ✅ Oui | ✅ Oui |
| Excel ancien | `.xls` | ❌ Non | ✅ Oui |
| Word moderne | `.docx` | ⚠️ Limitée | ✅ Oui |
| Word ancien | `.doc` | ❌ Non | ⚠️ Limitée |
| PDF | `.pdf` | ❌ Non | ✅ Oui |

---

## 📝 Édition de fichiers Word

### Pourquoi l'édition Word est limitée?

L'édition de documents Word est plus complexe que celle d'Excel car:
- Les documents Word ont une **structure complexe** (styles, images, tableaux)
- Il n'existe pas de bibliothèque JavaScript simple pour l'édition WYSIWYG
- L'API actuelle supporte uniquement les **templates avec variables**

### Solution recommandée pour Word

L'interface affiche automatiquement un **guide en 3 étapes**:

```
┌─────────────────────────────────────────┐
│ 1. Télécharger le document              │
│         ↓                                │
│ 2. Éditer avec Word/LibreOffice         │
│         ↓                                │
│ 3. Re-téléverser le document modifié    │
└─────────────────────────────────────────┘
```

### Utiliser des templates Word (avancé)

Si vous créez des documents avec des **variables**, l'API peut les modifier:

**Template Word:**
```
Nom: {{nom}}
Date: {{date}}
Montant: {{montant}}
```

**Code pour éditer:**
```javascript
// Cette fonctionnalité nécessite un développement supplémentaire
// L'API backend est prête (office-editor.js)
```

---

## ❌ Dépannage

### Le bouton "Éditer" n'apparaît pas

**Causes possibles:**
- Le fichier n'est pas un `.xlsx`
- Le fichier est corrompu
- Le navigateur n'a pas chargé `editor.js`

**Solution:**
1. Vérifiez que le fichier est bien un `.xlsx`
2. Rechargez la page (F5)
3. Ouvrez la console (F12) et vérifiez les erreurs

### Les modifications ne se sauvegardent pas

**Causes possibles:**
- Le serveur n'est pas démarré
- Problème de connexion MongoDB
- Le fichier est trop volumineux

**Solution:**
1. Vérifiez que le serveur tourne: `node server.js`
2. Vérifiez MongoDB: `net start MongoDB` (Windows)
3. Consultez les logs du serveur
4. Essayez avec un fichier plus petit

### L'éditeur est lent

**Causes possibles:**
- Fichier Excel trop volumineux (> 1000 lignes)
- Trop de cellules modifiées en même temps

**Solution:**
1. Travaillez sur des fichiers plus petits
2. Enregistrez régulièrement (par blocs de 20-30 cellules)
3. Fermez les autres onglets du navigateur

### Erreur "Document non trouvé"

**Causes possibles:**
- Le document a été supprimé
- ID de document invalide
- Problème de synchronisation

**Solution:**
1. Rechargez la liste des documents
2. Vérifiez que le document existe toujours
3. Reconnectez-vous à l'application

---

## 🚀 Fonctionnalités futures (à venir)

### Améliorations prévues:
- 📊 **Formules Excel** - Validation et prévisualisation des formules
- 🎨 **Mise en forme** - Changer les couleurs, polices, bordures
- 📑 **Feuilles multiples** - Éditer toutes les feuilles d'un classeur
- 🔄 **Annuler/Refaire** - Revenir en arrière sur les modifications
- 👥 **Édition collaborative** - Plusieurs utilisateurs en même temps
- 📝 **Édition Word complète** - Éditeur WYSIWYG pour Word

### Pour les demander:
Contactez l'équipe de développement ou créez une issue sur le dépôt GitHub.

---

## 📚 Fichiers modifiés

Cette fonctionnalité a été implémentée en modifiant:

| Fichier | Rôle |
|---------|------|
| `public/js/editor.js` | **Nouveau** - Interface d'édition complète |
| `public/js/preview.js` | Ajout du bouton "Éditer" |
| `public/index.html` | Chargement du script `editor.js` |
| `server.js` | APIs déjà en place (`/api/office/edit-excel`) |
| `office-editor.js` | Module backend pour édition Excel |

---

## ✅ Résumé

### Ce qui a changé:
✅ Vous pouvez maintenant **éditer directement** les fichiers Excel
✅ Interface **intuitive** avec indicateurs visuels
✅ **Sauvegarde automatique** dans la base de données
✅ Bouton "Éditer" visible uniquement pour les fichiers compatibles
✅ Guide intégré pour les fichiers Word

### Ce qui reste pareil:
✅ La **prévisualisation** fonctionne toujours
✅ Le **téléchargement** fonctionne toujours
✅ Tous vos **documents existants** sont compatibles

---

## 🎓 Pour commencer

1. **Uploadez un fichier Excel** dans l'application
2. **Cliquez sur le document** pour l'ouvrir
3. **Cliquez sur "Éditer"** (bouton vert)
4. **Modifiez les cellules** directement
5. **Cliquez sur "Enregistrer"**
6. **C'est tout!** Vos modifications sont sauvegardées

---

**Bon travail avec l'éditeur de documents! 🚀**

*Date de création: 13/11/2025*
*Version: 1.0*
*Auteur: Claude Code*
