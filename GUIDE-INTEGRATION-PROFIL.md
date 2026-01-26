# 🎯 GUIDE D'INTÉGRATION - GESTION DU PROFIL UTILISATEUR

## ✅ Fichiers créés :
1. `routes-profile.js` - Routes API (déjà intégré dans server.js)
2. `public/js/profile-functions.js` - Fonctions JavaScript
3. `profile-modal-html.txt` - HTML de la modal

---

## 📋 ÉTAPES D'INTÉGRATION

### 1️⃣ Charger le fichier JavaScript dans index.html

Ajouter AVANT la balise `</body>` dans `public/index.html` :

```html
<script src="/js/profile-functions.js"></script>
<script src="/js/app.js"></script>
```

---

### 2️⃣ Ajouter le bouton "Mon profil" dans le menu utilisateur

Dans `app.js`, chercher la section qui affiche le menu utilisateur (dropdown).
Ajouter ce bouton dans le menu :

```javascript
<div class="user-menu-item" onclick="toggleProfile(); state.showMenu = false;">
    <span>👤</span>
    <span>Mon profil</span>
</div>
```

**Exemple de placement** (chercher le menu avec les options comme "Déconnexion") :

```javascript
// Dans la fonction render(), section du menu utilisateur
${state.showMenu ? `
    <div class="dropdown-menu">
        <div class="user-menu-item" onclick="toggleProfile(); state.showMenu = false;">
            <span>👤</span>
            <span>Mon profil</span>
        </div>
        <div class="user-menu-item" onclick="logout()">
            <span>🚪</span>
            <span>Déconnexion</span>
        </div>
    </div>
` : ''}
```

---

### 3️⃣ Ajouter la modal de profil dans le render()

Dans `app.js`, dans la fonction `render()`, **AVANT** le dernier `</div>` de fermeture,
ajouter le contenu du fichier `profile-modal-html.txt`.

**Où l'ajouter ?** Chercher d'autres modals comme `showRegister`, `showShareModal`, etc.
et ajouter la modal de profil au même endroit.

---

### 4️⃣ (OPTIONNEL) Remplacer l'avatar par défaut

Dans `app.js`, chercher la section qui affiche l'avatar utilisateur (probablement dans render()).

**AVANT :**
```javascript
<div class="user-avatar">${initials}</div>
```

**APRÈS :**
Remplacer par l'appel à `renderUserAvatar()` qui est dans `profile-functions.js`.

Ou simplement utiliser ce code inline :

```javascript
<div class="user-avatar" id="userAvatar">
    <img src="${API_URL}/profile/photo/${state.currentUser}"
         alt="${fullName}"
         onerror="this.style.display='none'; this.nextElementSibling.style.display='flex'"
         style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%;">
    <div style="display: none; width: 100%; height: 100%; align-items: center; justify-content: center;">
        ${initials}
    </div>
</div>
```

---

### 5️⃣ Ajouter la photo dans l'interface Super Admin (optionnel)

Dans la liste des utilisateurs du Super Admin, ajouter l'affichage de la photo :

```javascript
// Pour chaque utilisateur dans la liste
<img src="${API_URL}/profile/photo/${user.username}"
     alt="${user.nom}"
     onerror="this.style.display='none'"
     style="width: 40px; height: 40px; border-radius: 50%; object-fit: cover; margin-right: 12px;">
```

---

## 🧪 TESTER

1. **Redémarrer le serveur** :
   ```bash
   node server.js
   ```

2. **Se connecter** sur http://localhost:4000/

3. **Cliquer sur l'avatar** → Menu déroulant

4. **Cliquer sur "Mon profil"**

5. **Tester** :
   - Upload d'une photo (max 2MB)
   - Modification du nom, prénom
   - Modification du username (vérifier le message "😊 Yaw rek toudou fi nonou" si déjà utilisé)
   - Modification de l'email

6. **Vérifier** que la photo s'affiche :
   - Dans l'avatar en haut à droite
   - Dans la modal de profil
   - (Optionnel) Dans l'interface Super Admin

---

## 🔒 SÉCURITÉ

- ✅ Seul l'utilisateur connecté peut modifier son propre profil
- ✅ Vérification d'unicité du username
- ✅ Validation côté serveur (taille photo, format, etc.)
- ✅ Les logs d'audit enregistrent toutes les modifications

---

## 📝 NOTES

- Les photos sont stockées en base64 dans MongoDB (champ `photo`)
- Taille maximale : 2MB
- Formats acceptés : JPG, PNG, GIF, WEBP
- Si l'utilisateur change son username, il devra se reconnecter

---

## ❓ AIDE

Si vous rencontrez des problèmes :
1. Vérifier la console du navigateur (F12)
2. Vérifier les logs du serveur
3. Vérifier que `routes-profile.js` est bien chargé (message dans les logs serveur)
