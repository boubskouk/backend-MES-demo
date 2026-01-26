# 📝 Formulaire d'Inscription Amélioré

**Date**: 30 Octobre 2025
**Fonctionnalité**: Sélection de rôle et département lors de l'inscription

---

## 🎯 Objectif

Permettre à l'administrateur de choisir le **rôle** et le **département** d'un nouvel utilisateur lors de la création de son compte.

---

## ✨ Nouveaux Champs du Formulaire

Le formulaire d'inscription contient maintenant **8 champs** au lieu de 3 :

| Champ | Type | Description | Obligatoire |
|-------|------|-------------|-------------|
| **Nom complet** | Text | Nom et prénom de l'utilisateur | ✅ Oui |
| **Email** | Email | Adresse email | ✅ Oui |
| **Username** | Text | Nom d'utilisateur (3+ caractères) | ✅ Oui |
| **Mot de passe** | Password | Mot de passe (4+ caractères) | ✅ Oui |
| **Confirmer mot de passe** | Password | Confirmation | ✅ Oui |
| **Rôle** | Select | Primaire / Secondaire / Tertiaire | ✅ Oui |
| **Département** | Select | Direction / Compta / RH / Technique | ✅ Oui |
| **Mot de passe admin** | Password | Code admin (0811) | ✅ Oui |

---

## 🔧 Modifications Techniques

### Fichiers Modifiés

#### 1. **public/js/api.js**

**Ajouts** :
```javascript
// Fonction d'inscription modifiée
async function registerUser(username, password, nom, email, idRole, idDepartement) {
    return await apiCall('/register', 'POST', {
        username, password, nom, email, idRole, idDepartement
    });
}

// Nouvelles fonctions
async function getRoles() {
    return await apiCall('/roles');
}

async function getDepartements() {
    return await apiCall('/departements');
}

async function getUserInfo(username) {
    return await apiCall(`/users/${username}`);
}
```

---

#### 2. **public/js/app.js**

**State étendu** :
```javascript
const state = {
    // ... champs existants ...
    roles: [],           // NOUVEAU : Liste des rôles
    departements: []     // NOUVEAU : Liste des départements
};
```

**Nouvelle fonction** :
```javascript
async function loadRolesAndDepartements() {
    try {
        const roles = await apiCall('/roles');
        state.roles = roles;
        const departements = await apiCall('/departements');
        state.departements = departements;
        render();
    } catch (error) {
        console.error('Erreur chargement rôles/départements:', error);
    }
}
```

**Initialisation** :
```javascript
// À la fin de app.js
render();
loadRolesAndDepartements(); // Charger au démarrage
```

**Formulaire d'inscription modifié** :
```javascript
${state.showRegister ? `
    <div class="space-y-3">
        <h2>Créer un compte</h2>

        <input id="reg_nom" type="text" placeholder="Nom complet">
        <input id="reg_email" type="email" placeholder="Email">
        <input id="reg_username" type="text" placeholder="Username">
        <input id="reg_password" type="password" placeholder="Mot de passe">
        <input id="reg_password_confirm" type="password" placeholder="Confirmer">

        <select id="reg_role">
            <option value="">-- Choisir un rôle --</option>
            ${state.roles.map(role => `
                <option value="${role._id}">
                    ${role.libelle} - ${role.description}
                </option>
            `).join('')}
        </select>

        <select id="reg_departement">
            <option value="">-- Choisir un département --</option>
            ${state.departements.map(dept => `
                <option value="${dept._id}">
                    ${dept.nom}
                </option>
            `).join('')}
        </select>

        <input id="reg_admin_password" type="password" placeholder="Mot de passe admin">
        <button onclick="handleRegister()">Créer le compte</button>
    </div>
` : `...`}
```

**Fonction handleRegister() modifiée** :
```javascript
async function handleRegister() {
    const nom = document.getElementById('reg_nom').value.trim();
    const email = document.getElementById('reg_email').value.trim();
    const username = document.getElementById('reg_username').value.trim();
    const password = document.getElementById('reg_password').value;
    const passwordConfirm = document.getElementById('reg_password_confirm').value;
    const idRole = document.getElementById('reg_role').value;
    const idDepartement = document.getElementById('reg_departement').value;
    const adminPassword = document.getElementById('reg_admin_password').value;

    // Validation de tous les champs
    if (!nom || !email || !username || !password || !passwordConfirm ||
        !idRole || !idDepartement || !adminPassword) {
        return showNotification('Veuillez remplir tous les champs', 'error');
    }

    // ... validations existantes ...

    const success = await register(username, password, nom, email,
                                  idRole, idDepartement, adminPassword);
    if (success) {
        state.showRegister = false;
        render();
    }
}
```

---

#### 3. **public/js/auth.js**

**Fonction register() modifiée** :
```javascript
async function register(username, password, nom, email, idRole, idDepartement, adminPassword) {
    if (adminPassword !== '0811') {
        showNotification('Mot de passe admin incorrect', 'error');
        return false;
    }

    try {
        const result = await registerUser(username, password, nom, email,
                                        idRole, idDepartement);

        if (result.success) {
            showNotification('✅ Compte créé avec succès!');
            return true;
        }
    } catch (error) {
        return false;
    }
}
```

**Fonction handleRegister() modifiée** :
```javascript
async function handleRegister() {
    const nom = document.getElementById('reg_nom').value.trim();
    const email = document.getElementById('reg_email').value.trim();
    const username = document.getElementById('reg_username').value.trim();
    const password = document.getElementById('reg_password').value;
    const passwordConfirm = document.getElementById('reg_password_confirm').value;
    const idRole = document.getElementById('reg_role').value;
    const idDepartement = document.getElementById('reg_departement').value;
    const adminPassword = document.getElementById('reg_admin_password').value;

    if (!nom || !email || !username || !password || !passwordConfirm ||
        !idRole || !idDepartement || !adminPassword) {
        showNotification('Veuillez remplir tous les champs', 'error');
        return;
    }

    // ... validations ...

    const success = await register(username, password, nom, email,
                                  idRole, idDepartement, adminPassword);
    if (success) {
        state.showRegister = false;
        render();
    }
}
```

---

## 🎨 Aperçu du Formulaire

```
╔═══════════════════════════════════════════════╗
║          CRÉER UN NOUVEAU COMPTE              ║
╠═══════════════════════════════════════════════╣
║                                               ║
║  Nom complet: [_______________________]       ║
║                                               ║
║  Email:       [_______________________]       ║
║                                               ║
║  Username:    [_______________________]       ║
║                                               ║
║  Mot de passe: [______________________]       ║
║                                               ║
║  Confirmer:   [_______________________]       ║
║                                               ║
║  Rôle:        [▼ Choisir un rôle     ]        ║
║                • Primaire - Accès complet     ║
║                • Secondaire - Accès limité    ║
║                • Tertiaire - Ses documents    ║
║                                               ║
║  Département: [▼ Choisir département ]        ║
║                • Direction                    ║
║                • Comptabilité                 ║
║                • Ressources Humaines          ║
║                • Technique                    ║
║                                               ║
║  Mot de passe admin: [_____________]          ║
║                                               ║
║         [     Créer le compte     ]           ║
║                                               ║
║         ←  Retour à la connexion              ║
║                                               ║
╚═══════════════════════════════════════════════╝
```

---

## 🔍 Validation

### Validations Frontend

1. ✅ Tous les champs sont obligatoires
2. ✅ Username : minimum 3 caractères
3. ✅ Password : minimum 4 caractères
4. ✅ Les mots de passe doivent correspondre
5. ✅ Un rôle doit être sélectionné
6. ✅ Un département doit être sélectionné
7. ✅ Le mot de passe admin doit être correct (0811)

### Validations Backend

Le serveur MCD valide également :
- Unicité du username
- Présence de tous les champs requis
- Assignation automatique si rôle/département manquant (par défaut: Tertiaire + Direction)

---

## 📊 Flux de Création

```
┌─────────────┐
│   ADMIN     │
│ clique sur  │
│ "Créer un   │
│  compte"    │
└──────┬──────┘
       │
       ▼
┌─────────────────────┐
│ Formulaire affiché  │
│ avec rôles et       │
│ départements        │
│ (chargés via API)   │
└──────┬──────────────┘
       │
       ▼
┌─────────────────────┐
│ Admin remplit       │
│ tous les champs     │
└──────┬──────────────┘
       │
       ▼
┌─────────────────────┐
│ Validation frontend │
│ • Tous champs OK?   │
│ • Mots de passe =?  │
│ • Admin pwd OK?     │
└──────┬──────────────┘
       │
       ▼
┌─────────────────────┐
│ Envoi API POST      │
│ /api/register       │
│ avec toutes infos   │
└──────┬──────────────┘
       │
       ▼
┌─────────────────────┐
│ Serveur crée user   │
│ avec rôle et dept   │
│ assignés            │
└──────┬──────────────┘
       │
       ▼
┌─────────────────────┐
│ ✅ Compte créé!     │
│ Notification        │
│ + Retour login      │
└─────────────────────┘
```

---

## 🧪 Tests

### Test 1 : Créer un utilisateur Primaire

1. Cliquer sur "Créer un compte"
2. Remplir :
   - Nom : "Test Primaire"
   - Email : "test@cerer.sn"
   - Username : "testpri"
   - Password : "1234"
   - Confirmer : "1234"
   - Rôle : **Primaire**
   - Département : **Direction**
   - Admin pwd : "0811"
3. Cliquer "Créer le compte"
4. ✅ Vérifier : Compte créé
5. Se connecter avec "testpri" / "1234"
6. ✅ Vérifier : Voit tous les documents de Direction

---

### Test 2 : Créer un utilisateur Tertiaire

1. Même processus avec :
   - Rôle : **Tertiaire**
   - Département : **Comptabilité**
2. ✅ Vérifier : Voit uniquement ses propres documents

---

### Test 3 : Validation des champs

1. Essayer de soumettre sans remplir "Rôle"
2. ✅ Vérifier : Message d'erreur "Veuillez remplir tous les champs"
3. Essayer avec un mot de passe différent dans confirmation
4. ✅ Vérifier : Message "Les mots de passe ne correspondent pas"

---

## 🎓 Utilisation

### Pour l'administrateur

Lorsque vous créez un nouveau compte :

1. **Nom complet** : Le nom réel de la personne (ex: "Fatima Sall")
2. **Email** : Son email professionnel
3. **Username** : Son identifiant de connexion (court et unique)
4. **Rôle** :
   - **Primaire** si c'est un chef de département
   - **Secondaire** si c'est un responsable d'équipe
   - **Tertiaire** si c'est un employé standard
5. **Département** : Le service auquel il appartient
6. **Mot de passe admin** : Toujours **0811** (protection)

---

## 📝 Notes Importantes

1. **Les rôles et départements** sont chargés automatiquement au démarrage de l'application
2. **Le mot de passe admin (0811)** est requis pour créer un compte
3. **Tous les champs** sont obligatoires
4. **Le serveur MCD** doit être utilisé pour que cette fonctionnalité fonctionne
5. **La sélection du rôle** détermine les permissions de l'utilisateur

---

## ✅ Résumé

Cette amélioration permet de :

- ✅ Créer des utilisateurs avec des rôles spécifiques
- ✅ Assigner directement un département
- ✅ Renseigner les informations complètes (nom, email)
- ✅ Contrôler précisément les permissions dès la création
- ✅ Éviter les assignations par défaut non souhaitées

**Le formulaire est prêt à l'emploi !** 🚀
