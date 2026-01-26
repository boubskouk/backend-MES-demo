# Gestion complète Niveau 1 - Documentation

## 📋 Vue d'ensemble

Cette documentation décrit la gestion complète des administrateurs de Niveau 1 dans le système d'archivage.

### Hiérarchie des niveaux

```
Niveau 0 (Super Admin)
    └── Crée des Niveau 1 (Admins départementaux)
            └── Crée des Niveau 2 et 3 (Utilisateurs)
```

---

## 🎯 Règles de gestion pour Niveau 1

### 1. Création d'utilisateurs

| Qui peut créer | Peut créer quels niveaux |
|----------------|--------------------------|
| **Niveau 0** (Super Admin) | Niveau 0, 1, 2, 3 (tous) |
| **Niveau 1** (Admin départemental) | Niveau 2, 3 uniquement |

**Restrictions pour Niveau 1** :
- ✅ Peut créer des utilisateurs Niveau 2 et 3
- ❌ Ne peut PAS créer de Niveau 0 (Super Admin)
- ❌ Ne peut PAS créer de Niveau 1 (autres admins départementaux)
- ✅ Les utilisateurs créés appartiennent automatiquement au département du Niveau 1
- ✅ Ne voit QUE les utilisateurs qu'il a créés

### 2. Gestion des départements

Chaque Niveau 1 gère ses propres départements de manière indépendante.

**Permissions** :
- ✅ Voir son département d'affectation + les départements qu'il a créés
- ✅ Créer de nouveaux départements (sous-départements)
- ✅ Renommer ses départements comme il le désire
- ✅ Modifier ses départements
- ✅ Supprimer ses départements (sauf son département d'affectation)
- ❌ Ne peut PAS voir les départements des autres Niveau 1
- ❌ Ne peut PAS modifier les départements d'autres Niveau 1

**Exemple** :
```
Niveau 1 : Jean (Département: Informatique)
  ├── Peut voir: "Informatique" (son département d'affectation)
  ├── Peut créer: "Développement", "Support", "Infrastructure"
  ├── Peut renommer: "Développement" → "Dev Web", "Support" → "Assistance"
  └── Ne peut PAS voir: Départements créés par Marie (autre Niveau 1)
```

### 3. Gestion des articles/documents

- ✅ Voit tous les documents de son département
- ✅ Peut créer, modifier, supprimer des documents
- ✅ Peut verrouiller/déverrouiller des documents
- ✅ Peut partager des documents

### 4. Messagerie

- ✅ **Communication interdépartementale** : Peut voir et contacter TOUS les utilisateurs du système
- ✅ Permet la collaboration entre différents départements

---

## 🔧 Modifications techniques

### 1. Utilisateurs - Ajout du champ `createdBy`

**Fichier** : `server.js` (ligne 1235-1240)

```javascript
// Ajouter le créateur de l'utilisateur
if (req.session && req.session.userId) {
    newUser.createdBy = req.session.userId;
} else {
    newUser.createdBy = null;
}
```

### 2. Utilisateurs - Filtrage de la liste

**Fichier** : `server.js` (ligne 2197-2239)

**Route** : `GET /api/users`

```javascript
// Filtrage pour utilisateurs Niveau 1
let query = {};

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
```

### 3. Rôles - Filtrage pour Niveau 1

**Fichiers** :
- `public/js/app.js` (ligne 2102-2109)
- `public/js/admin-management.js` (ligne 395-408, 296-309)

```javascript
${state.roles
    .filter(role => {
        // Si un niveau 1 est connecté, montrer uniquement niveau 2 et 3
        if (state.currentUserInfo && state.currentUserInfo.niveau === 1) {
            return role.niveau === 2 || role.niveau === 3;
        }
        return true;
    })
    .map(role => `...`).join('')}
```

### 4. Départements - Ajout du champ `createdBy`

**Fichier** : `server.js` (ligne 3226-3231)

```javascript
// Ajouter le créateur du département (Niveau 0 ou Niveau 1)
if (req.session && req.session.userId) {
    nouveauDepartement.createdBy = req.session.userId;
} else {
    nouveauDepartement.createdBy = null;
}
```

### 5. Départements - Filtrage de la liste

**Fichier** : `server.js` (ligne 3179-3208)

**Route** : `GET /api/departements`

```javascript
// Filtrage pour utilisateurs Niveau 1
let query = {};

if (req.session && req.session.userId) {
    const currentUser = await usersCollection.findOne({ username: req.session.userId });
    if (currentUser) {
        const currentUserRole = await rolesCollection.findOne({ _id: currentUser.idRole });

        // Si niveau 1, filtrer pour ne montrer que les départements qu'il gère
        if (currentUserRole && currentUserRole.niveau === 1) {
            query = {
                $or: [
                    { createdBy: req.session.userId },
                    { _id: currentUser.idDepartement }
                ]
            };
        }
    }
}
```

### 6. Départements - Sécurisation de la modification

**Fichier** : `server.js` (ligne 3242-3286)

**Route** : `PUT /api/departements/:id`

```javascript
// Si niveau 1, vérifier qu'il modifie un département qu'il a créé
if (currentUserRole && currentUserRole.niveau === 1) {
    const departement = await departementsCollection.findOne({ _id: new ObjectId(id) });
    if (!departement) {
        return res.status(404).json({ message: 'Département non trouvé' });
    }
    if (departement.createdBy !== req.session.userId &&
        departement._id.toString() !== currentUser.idDepartement?.toString()) {
        return res.status(403).json({
            message: 'Vous ne pouvez modifier que les départements que vous avez créés ou votre département d\'affectation'
        });
    }
}
```

### 7. Départements - Sécurisation de la suppression

**Fichier** : `server.js` (ligne 3289-3332)

**Route** : `DELETE /api/departements/:id`

```javascript
// Si niveau 1, vérifier qu'il supprime un département qu'il a créé
if (currentUserRole && currentUserRole.niveau === 1) {
    const departement = await departementsCollection.findOne({ _id: new ObjectId(id) });

    // Un Niveau 1 ne peut pas supprimer son département d'affectation
    if (departement._id.toString() === currentUser.idDepartement?.toString()) {
        return res.status(403).json({
            message: 'Vous ne pouvez pas supprimer votre département d\'affectation'
        });
    }

    // Vérifier qu'il a créé ce département
    if (departement.createdBy !== req.session.userId) {
        return res.status(403).json({
            message: 'Vous ne pouvez supprimer que les départements que vous avez créés'
        });
    }
}
```

---

## 📊 Tableau récapitulatif des permissions

### Niveau 0 (Super Admin)

| Fonctionnalité | Permission |
|----------------|------------|
| Créer Niveau 0 | ✅ Oui |
| Créer Niveau 1 | ✅ Oui |
| Créer Niveau 2 et 3 | ✅ Oui |
| Voir tous les utilisateurs | ✅ Oui |
| Voir tous les départements | ✅ Oui |
| Modifier tous les départements | ✅ Oui |
| Supprimer tous les départements | ✅ Oui |
| Messagerie interdépartementale | ✅ Oui |

### Niveau 1 (Admin départemental)

| Fonctionnalité | Permission |
|----------------|------------|
| Créer Niveau 0 | ❌ Non |
| Créer Niveau 1 | ❌ Non |
| Créer Niveau 2 et 3 | ✅ Oui (dans son département) |
| Voir tous les utilisateurs | ❌ Non (seulement ceux créés par lui) |
| Voir tous les départements | ❌ Non (seulement les siens) |
| Créer des départements | ✅ Oui |
| Renommer ses départements | ✅ Oui (comme il le désire) |
| Modifier ses départements | ✅ Oui |
| Supprimer ses départements | ✅ Oui (sauf son département d'affectation) |
| Messagerie interdépartementale | ✅ Oui |

### Niveau 2 et 3 (Utilisateurs)

| Fonctionnalité | Permission |
|----------------|------------|
| Créer des utilisateurs | ❌ Non |
| Voir les départements | ❌ Non (gestion réservée aux admins) |
| Gérer les documents | ✅ Oui (selon leur niveau) |
| Messagerie | ✅ Oui |

---

## 🔄 Flux de création

### Création d'un Niveau 1 par le Niveau 0

```
1. Niveau 0 se connecte
2. Va dans "Gérer les utilisateurs"
3. Clique sur "Créer un utilisateur"
4. Remplit le formulaire :
   - Username
   - Nom complet
   - Email
   - Rôle: Sélectionne un rôle Niveau 1
   - Département: Choisit le département d'affectation
5. L'utilisateur Niveau 1 est créé avec :
   - createdBy: username du Niveau 0
   - idDepartement: département choisi
```

### Création d'un Niveau 2/3 par un Niveau 1

```
1. Niveau 1 se connecte
2. Va dans "Gérer les utilisateurs"
3. Clique sur "Créer un utilisateur"
4. Remplit le formulaire :
   - Username
   - Nom complet
   - Email
   - Rôle: Ne voit que les rôles Niveau 2 et 3
   - Département: Automatiquement celui du Niveau 1 (pas de choix)
5. L'utilisateur Niveau 2/3 est créé avec :
   - createdBy: username du Niveau 1
   - idDepartement: département du Niveau 1
```

### Gestion des départements par un Niveau 1

```
1. Niveau 1 se connecte
2. Va dans "Gérer les départements"
3. Voit :
   - Son département d'affectation (créé par Niveau 0)
   - Les départements qu'il a créés
4. Peut :
   - Créer de nouveaux départements
   - Renommer ses départements
   - Modifier ses départements
   - Supprimer ses départements (sauf celui d'affectation)
5. Chaque département créé a :
   - createdBy: username du Niveau 1
```

---

## 🧪 Tests recommandés

### Test 1 : Création de Niveau 1 (par Niveau 0)

1. Se connecter avec un compte Niveau 0
2. Créer un utilisateur Niveau 1
3. Vérifier que l'utilisateur est créé avec le bon département
4. Se connecter avec le nouveau compte Niveau 1

### Test 2 : Restrictions de création (Niveau 1)

1. Se connecter avec un compte Niveau 1
2. Aller dans "Créer un utilisateur"
3. Vérifier que seuls les rôles Niveau 2 et 3 sont visibles
4. Vérifier que le département est fixé (pas de sélection)
5. Créer un utilisateur Niveau 2 ou 3
6. Vérifier dans la liste que seul cet utilisateur est visible

### Test 3 : Gestion des départements (Niveau 1)

1. Se connecter avec un compte Niveau 1
2. Aller dans "Gérer les départements"
3. Vérifier que seul son département d'affectation est visible
4. Créer un nouveau département
5. Renommer le département créé
6. Vérifier qu'on ne peut pas supprimer le département d'affectation
7. Supprimer le département créé (doit fonctionner)

### Test 4 : Messagerie interdépartementale

1. Se connecter avec un compte Niveau 1
2. Ouvrir la messagerie
3. Vérifier que tous les utilisateurs sont visibles (pas seulement ceux du département)
4. Envoyer un message à un utilisateur d'un autre département
5. Vérifier que le message est bien reçu

---

## 📝 Notes importantes

### Pour les données existantes

Les départements et utilisateurs créés avant cette mise à jour n'auront pas de champ `createdBy`.

**Recommandations** :
1. Exécuter un script de migration pour attribuer les utilisateurs/départements existants
2. Ou les recréer avec les nouvelles règles

### Indépendance des départements

Chaque Niveau 1 est **totalement indépendant** dans la gestion de ses départements. Ils peuvent :
- Utiliser les mêmes noms
- Avoir des structures différentes
- Renommer comme ils le souhaitent

**Exemple** :
```
Niveau 1 "Jean" (Informatique) :
  - Dev Web
  - Support
  - Infrastructure

Niveau 1 "Marie" (RH) :
  - Recrutement
  - Formation
  - Paie
```

### Protection en profondeur

Les restrictions sont appliquées à **3 niveaux** :
1. **Interface (Frontend)** : Masquage des options non autorisées
2. **API (Backend)** : Validation des permissions avant chaque action
3. **Base de données** : Filtrage des requêtes selon le niveau

---

## 🚀 Déploiement

### Fichiers modifiés

- ✅ `server.js`
- ✅ `public/js/app.js`
- ✅ `public/js/admin-management.js`

### Étapes de déploiement

1. **Sauvegarder la base de données**
   ```bash
   mongodump --uri="MONGO_URI" --out=backup_$(date +%Y%m%d)
   ```

2. **Redémarrer le serveur**
   ```bash
   # Arrêter le serveur actuel
   # Puis redémarrer
   node server.js
   ```

3. **Tester les fonctionnalités**
   - Créer un Niveau 1 avec le Niveau 0
   - Se connecter avec le Niveau 1
   - Créer un Niveau 2/3
   - Gérer les départements
   - Tester la messagerie

4. **Vérifier les logs**
   - Vérifier qu'il n'y a pas d'erreurs
   - Vérifier que les permissions fonctionnent

---

**Date de création** : 24 décembre 2025
**Auteur** : Claude Code
**Version** : 1.0
