# Modifications - Gestion des utilisateurs Niveau 1

## 📋 Objectifs

Restreindre les capacités de gestion des utilisateurs pour les administrateurs de Niveau 1 :

1. ✅ Ne voir que les utilisateurs qu'ils ont créés (Niveau 2 et 3)
2. ✅ Ne pouvoir créer que des utilisateurs de Niveau 2 et 3
3. ✅ Pas de choix de département (automatiquement leur département)
4. ✅ La messagerie reste interdépartementale (communication entre tous les utilisateurs)

---

## 🔧 Modifications effectuées

### 1. Ajout du champ `createdBy` lors de la création d'utilisateur

**Fichier modifié** : `server.js` (lignes 1235-1240)

**Description** : Enregistre l'identifiant de l'utilisateur qui a créé chaque nouvel utilisateur.

```javascript
// ✅ NOUVEAU: Ajouter le créateur de l'utilisateur (pour filtrage Niveau 1)
if (req.session && req.session.userId) {
    newUser.createdBy = req.session.userId;
} else {
    newUser.createdBy = null; // Pas de créateur (création initiale ou import)
}
```

**Impact** : Permet de tracer qui a créé chaque utilisateur pour le filtrage ultérieur.

---

### 2. Filtrage de la liste des utilisateurs pour Niveau 1

**Fichier modifié** : `server.js` (lignes 2197-2239)

**Description** : Modifie la route `GET /api/users` pour ne retourner que les utilisateurs créés par l'administrateur Niveau 1.

```javascript
// ✅ NOUVEAU: Filtrage pour utilisateurs Niveau 1
let query = {};

// Vérifier si l'utilisateur connecté est de niveau 1
if (req.session && req.session.userId) {
    const currentUser = await usersCollection.findOne({ username: req.session.userId });
    if (currentUser) {
        const currentUserRole = await rolesCollection.findOne({ _id: currentUser.idRole });

        // Si niveau 1, filtrer pour ne montrer que les utilisateurs qu'il a créés
        if (currentUserRole && currentUserRole.niveau === 1) {
            query = { createdBy: req.session.userId };
        }
    }
}

const allUsers = await usersCollection.find(query).toArray();
```

**Impact** :
- Niveau 1 voit uniquement les utilisateurs qu'il a créés
- Niveau 0 et autres niveaux voient tous les utilisateurs

---

### 3. Filtrage des rôles disponibles (création et édition)

**Fichiers modifiés** :
- `public/js/app.js` (lignes 2102-2109) - Déjà en place
- `public/js/admin-management.js` (lignes 395-408 et 296-309)

**Description** : Filtre les rôles pour ne montrer que Niveau 2 et 3 lors de la création ou édition d'utilisateurs.

```javascript
${state.roles
    .filter(role => {
        // Si un niveau 1 est connecté, montrer uniquement niveau 2 et 3
        if (state.currentUserInfo && state.currentUserInfo.niveau === 1) {
            return role.niveau === 2 || role.niveau === 3;
        }
        // Sinon, montrer tous les rôles
        return true;
    })
    .map(role => `
        <option value="${role._id}" data-niveau="${role.niveau}">
            ${role.nom} (Niveau ${role.niveau})
        </option>
    `).join('')}
```

**Impact** :
- Niveau 1 ne peut créer/modifier que des utilisateurs de Niveau 2 et 3
- Les options Niveau 0 et Niveau 1 sont masquées

---

### 4. Masquage du sélecteur de département pour Niveau 1

**Fichiers modifiés** :
- `public/js/app.js` (lignes 2118-2126) - Déjà en place
- `public/js/admin-management.js` (lignes 411-432)

**Description** : Remplace le sélecteur de département par un champ en lecture seule affichant le département de l'administrateur Niveau 1.

```javascript
${state.currentUserInfo && state.currentUserInfo.niveau === 1 ? `
    <!-- Niveau 1 : Département automatique (celui du créateur) -->
    <div class="w-full px-3 py-2 border-2 rounded-lg bg-gray-100 font-semibold text-gray-700 text-sm">
        🏢 Département : ${state.currentUserInfo.departement || 'Non défini'}
    </div>
    <input type="hidden" id="new_user_dept" value="${state.currentUserInfo.idDepartement || ''}">
    <p class="text-xs text-blue-700 font-semibold mt-1 bg-blue-50 p-2 rounded border-l-4 border-blue-500">
        ℹ️ En tant qu'admin départemental, vous créez des utilisateurs dans VOTRE département uniquement.
    </p>
` : `
    <!-- Autres niveaux : Choix du département -->
    <div id="new_user_dept_container">
        <select id="new_user_dept" class="...">
            ...
        </select>
    </div>
`}
```

**Impact** :
- Niveau 1 ne peut pas choisir le département
- Les utilisateurs créés appartiennent automatiquement au département du Niveau 1
- Message explicatif affiché

---

### 5. Protection côté serveur

**Fichier** : `server.js` (lignes 1183-1197)

**Description** : Validation côté serveur pour s'assurer qu'un Niveau 1 ne peut créer que des Niveau 2 et 3.

```javascript
if (req.session && req.session.userId) {
    const creator = await usersCollection.findOne({ username: req.session.userId });
    if (creator) {
        const creatorRole = await rolesCollection.findOne({ _id: creator.idRole });
        if (creatorRole && creatorRole.niveau === 1) {
            // Un niveau 1 ne peut créer QUE des utilisateurs niveau 2 ou 3
            if (selectedRole.niveau !== 2 && selectedRole.niveau !== 3) {
                return res.status(403).json({
                    success: false,
                    message: 'En tant qu\'administrateur départemental (niveau 1), vous ne pouvez créer que des utilisateurs de niveau 2 ou 3.'
                });
            }
            // Forcer le département à celui du créateur (niveau 1)
            deptId = creator.idDepartement;
        }
    }
}
```

**Impact** : Protection contre les tentatives de contournement côté client.

---

### 6. Messagerie interdépartementale préservée

**Fichier** : `server.js` (ligne 2242)

**Route** : `GET /api/users-for-sharing/:userId`

**Description** : Cette route distincte retourne TOUS les utilisateurs pour la messagerie, sans filtrage par département.

```javascript
// Récupérer tous les utilisateurs disponibles pour le partage
app.get('/api/users-for-sharing/:userId', async (req, res) => {
    const { userId } = req.params;

    // Récupérer tous les utilisateurs sauf l'utilisateur actuel
    const allUsers = await usersCollection.find({
        username: { $ne: userId }
    }).toArray();

    // ...
});
```

**Impact** : La communication interdépartementale fonctionne normalement.

---

## 📊 Résumé des comportements

### Pour un utilisateur Niveau 1 :

| Fonctionnalité | Comportement |
|----------------|--------------|
| **Liste des utilisateurs** | Voit uniquement les utilisateurs qu'il a créés (Niveau 2 et 3) |
| **Création d'utilisateur** | Peut créer uniquement des Niveau 2 et 3 |
| **Choix du rôle** | Voit uniquement les rôles Niveau 2 et 3 |
| **Choix du département** | Pas de choix (automatiquement son département) |
| **Édition d'utilisateur** | Peut modifier uniquement les utilisateurs qu'il a créés |
| **Messagerie** | Peut voir et contacter TOUS les utilisateurs (interdépartementale) ✅ |

### Pour un utilisateur Niveau 0 (Super Admin) :

| Fonctionnalité | Comportement |
|----------------|--------------|
| **Liste des utilisateurs** | Voit TOUS les utilisateurs |
| **Création d'utilisateur** | Peut créer tous les niveaux (0, 1, 2, 3) |
| **Choix du rôle** | Voit tous les rôles |
| **Choix du département** | Peut choisir n'importe quel département |
| **Édition d'utilisateur** | Peut modifier tous les utilisateurs |
| **Messagerie** | Peut voir et contacter TOUS les utilisateurs ✅ |

---

## 🧪 Tests

Un script de test a été créé : `scripts/test-niveau1-user-management.js`

**Pour l'exécuter** :
```bash
node scripts/test-niveau1-user-management.js
```

**Ce qu'il teste** :
- ✅ Présence du champ `createdBy` dans la base de données
- ✅ Filtrage des utilisateurs pour Niveau 1
- ✅ Disponibilité de tous les utilisateurs pour la messagerie
- ✅ Rôles disponibles pour Niveau 1 (uniquement 2 et 3)

---

## 📝 Notes importantes

1. **Utilisateurs existants** : Les utilisateurs créés avant cette mise à jour n'auront pas de champ `createdBy`. Ils ne seront donc visibles par aucun Niveau 1 jusqu'à ce qu'ils soient réassignés.

2. **Département renommable** : Chaque Niveau 1 peut renommer son département selon ses besoins.

3. **Protection double** : Les restrictions sont appliquées à la fois côté client (interface) et côté serveur (API) pour une sécurité maximale.

4. **Messagerie intacte** : La messagerie utilise une route séparée (`/api/users-for-sharing/:userId`) qui n'est pas filtrée, permettant la communication interdépartementale.

---

## ✅ Checklist de déploiement

- [x] Modifier `server.js` pour ajouter `createdBy`
- [x] Modifier `server.js` pour filtrer `/api/users`
- [x] Vérifier le filtrage des rôles dans `app.js`
- [x] Vérifier le masquage du département dans `app.js`
- [x] Modifier `admin-management.js` pour filtrer les rôles (création)
- [x] Modifier `admin-management.js` pour filtrer les rôles (édition)
- [x] Modifier `admin-management.js` pour masquer le département
- [x] Créer le script de test
- [x] Tester sur la base de données en ligne

---

## 🚀 Prochaines étapes

1. Redémarrer le serveur pour appliquer les modifications
2. Tester avec un compte Niveau 1
3. Vérifier que la messagerie fonctionne correctement
4. Créer quelques utilisateurs de test pour valider le comportement

---

**Date de modification** : 24 décembre 2025
**Auteur** : Claude Code
