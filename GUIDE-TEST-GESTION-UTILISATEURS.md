# 🔍 Guide de Test - Gestion des Utilisateurs

## Objectif
Ce guide vous aide à identifier pourquoi les boutons de la fenêtre "Gestion des utilisateurs" ne fonctionnent pas.

## 📋 Étapes de Test

### Étape 1: Démarrer le serveur
```bash
node server.js
```

### Étape 2: Ouvrir l'application
1. Ouvrez votre navigateur
2. Accédez à `http://localhost:3000`
3. Connectez-vous avec un compte administrateur (niveau 1)

### Étape 3: Ouvrir la Console Développeur
- **Windows/Linux**: Appuyez sur `F12`
- **Mac**: Appuyez sur `Cmd + Option + I`
- Allez dans l'onglet **Console**

### Étape 4: Vérifier les Tests Automatiques
Dès l'ouverture de la page, vous devriez voir dans la console:

```
🔍 DEBUT DES TESTS - GESTION DES UTILISATEURS
============================================================
```

Suivi d'une série de tests numérotés de 1 à 10.

## ✅ Analyse des Résultats

### Test 1: Script chargé
- ✅ **Succès**: Le message apparaît
- ❌ **Échec**: Aucun message → Le script n'est pas chargé

### Test 2: Fonctions globales
Vérifiez que toutes les fonctions affichent `✅ Disponible`:
- `deleteUser`
- `startEditUser`
- `cancelEditUser`
- `saveEditUser`
- `resetUserPassword`
- `addRole`
- etc.

**Si une fonction affiche `❌ NON DISPONIBLE`:**
- Le fichier `admin-management.js` n'est pas chargé correctement
- Vérifiez la console pour des erreurs de chargement

### Test 3: État de l'application
Vérifiez que:
- `state existe` affiche ✅
- `state.allUsersForManagement` contient un nombre > 0
- `state.currentUser` affiche votre nom d'utilisateur

**Si `state` n'existe pas:**
- Le fichier `app.js` n'est pas chargé
- Ou il y a une erreur avant la déclaration de `state`

### Test 4-9: Autres vérifications
Vérifiez les résultats de chaque test

## 🖱️ Tests Manuels

### Test Manuel 1: Tracer les clics
1. Dans la console, exécutez:
   ```javascript
   window.testButtonClick()
   ```
2. Ouvrez la fenêtre "Gérer utilisateurs"
3. Cliquez sur n'importe quel bouton
4. Observez la console - elle doit afficher les informations du bouton cliqué

### Test Manuel 2: Tester une fonction directement
Dans la console, exécutez:
```javascript
window.debugUserManagement()
```

Cela affichera l'état complet de la gestion des utilisateurs.

### Test Manuel 3: Appeler une fonction manuellement
Essayez d'appeler une fonction directement:
```javascript
window.startEditUser("test")
```

**Résultats possibles:**
- ✅ Une erreur s'affiche mais la fonction existe
- ❌ "undefined is not a function" → La fonction n'existe pas

## 🔧 Solutions aux Problèmes Courants

### Problème 1: Fonctions non disponibles
**Symptôme**: Tests 2 montrent des ❌

**Solution**:
1. Vérifiez que `admin-management.js` est bien chargé
2. Regardez la console pour des erreurs JavaScript
3. Vérifiez l'ordre de chargement des scripts dans `index.html`

### Problème 2: state n'existe pas
**Symptôme**: Test 3 montre ❌

**Solution**:
1. Vérifiez que `app.js` est bien chargé
2. Regardez s'il y a des erreurs avant la déclaration de `state`
3. Rechargez la page avec `Ctrl + F5` (cache vidé)

### Problème 3: Boutons ne répondent pas
**Symptôme**: onclick ne fait rien

**Solution**:
1. Vérifiez dans la console les erreurs lors du clic
2. Utilisez `window.testButtonClick()` pour tracer les clics
3. Vérifiez que l'attribut `onclick` est bien présent sur le bouton

### Problème 4: Erreur "Cannot read property of undefined"
**Symptôme**: Erreur lors du clic sur un bouton

**Solution**:
1. Le problème est probablement dans la fonction appelée
2. Vérifiez que `state.allUsersForManagement` contient des données
3. Ouvrez d'abord la gestion des utilisateurs via le menu

## 📊 Commandes Utiles

Copiez-collez ces commandes dans la console pour débugger:

```javascript
// Afficher l'état complet
window.debugUserManagement()

// Tracer les clics sur les boutons
window.testButtonClick()

// Ouvrir/fermer la gestion des utilisateurs
toggleUsersManagement()

// Tester directement une fonction
window.startEditUser("nom_utilisateur")

// Voir tous les utilisateurs chargés
console.log(state.allUsersForManagement)

// Voir si la fenêtre est ouverte
console.log(state.showUsersManagement)
```

## 📝 Rapport de Bug

Si après tous ces tests le problème persiste, notez:

1. ✅ ou ❌ pour chaque test (1-10)
2. Les messages d'erreur exacts dans la console
3. Le résultat de `window.debugUserManagement()`
4. Ce qui se passe quand vous cliquez sur un bouton avec `window.testButtonClick()` actif

## 🆘 Besoin d'Aide?

Si vous ne comprenez pas les résultats:
1. Faites une capture d'écran de la console avec tous les tests
2. Notez les ❌ que vous voyez
3. Essayez les commandes utiles et notez les résultats

---

**Note**: Ce script de test s'exécute automatiquement au chargement de la page.
Ouvrez simplement la console pour voir les résultats!
