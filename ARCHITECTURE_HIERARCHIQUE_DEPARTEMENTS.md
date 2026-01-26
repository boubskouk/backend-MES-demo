# Architecture Hiérarchique des Départements

## 📋 Vue d'ensemble

Cette documentation décrit la nouvelle architecture hiérarchique des départements avec une séparation claire entre :
- **Départements principaux** : Créés par le Niveau 0 (Super Admin)
- **Sous-départements/Services** : Créés par les Niveau 1 dans leur département

---

## 🏗️ Structure hiérarchique

```
┌─────────────────────────────────────────────────────────────┐
│                    Niveau 0 (Super Admin)                    │
│          Crée les départements principaux du système         │
└─────────────────────────────────────────────────────────────┘
                              │
                              ├── Informatique (dept principal)
                              ├── RH (dept principal)
                              └── Comptabilité (dept principal)
                                        │
                                        │
        ┌───────────────────────────────┴───────────────────────┐
        │                                                       │
┌───────┴────────┐                                    ┌────────┴────────┐
│   Niveau 1     │                                    │   Niveau 1      │
│ Jean (Informatique)                                 │ Marie (RH)       │
│ Crée des sous-départements                          │ Crée des sous-départements
└────────────────┘                                    └─────────────────┘
        │                                                     │
        ├── Informatique/Développement Web                   ├── RH/Recrutement
        ├── Informatique/Support Technique                   ├── RH/Formation
        └── Informatique/Infrastructure                      └── RH/Paie
```

---

## 🎯 Règles de gestion

### 1. Départements principaux (Niveau 0 uniquement)

**Créés par** : Niveau 0 (Super Admin)

**Caractéristiques** :
- `parentDepartement: null` (pas de parent)
- `createdBy: username du Niveau 0`
- Représentent les grandes divisions de l'organisation

**Permissions Niveau 0** :
- ✅ Créer des départements principaux
- ✅ Modifier tous les départements
- ✅ Supprimer tous les départements
- ✅ Voir tous les départements

**Permissions Niveau 1** :
- ❌ Ne peut PAS créer de département principal
- ✅ Peut renommer son département principal
- ❌ Ne peut PAS supprimer son département principal
- ❌ Ne voit PAS les autres départements principaux

### 2. Sous-départements/Services (Niveau 1)

**Créés par** : Niveau 1 (Admin départemental)

**Caractéristiques** :
- `parentDepartement: ObjectId du département parent`
- `createdBy: username du Niveau 1`
- Représentent les services ou équipes dans un département

**Permissions Niveau 1** :
- ✅ Créer des sous-départements dans SON département
- ✅ Modifier ses sous-départements
- ✅ Supprimer ses sous-départements
- ✅ Renommer ses sous-départements comme il le désire
- ❌ Ne peut PAS créer de sous-départements dans d'autres départements
- ❌ Ne peut PAS voir les sous-départements d'autres départements

### 3. Affectation des utilisateurs

**Utilisateurs Niveau 1** :
- Affectés à un département principal par le Niveau 0
- Créent des utilisateurs Niveau 2 et 3 dans leurs sous-départements

**Utilisateurs Niveau 2 et 3** :
- Peuvent être affectés :
  - Au département principal
  - À un sous-département/service

---

## 🔧 Implémentation technique

### 1. Structure de données

**Collection : departements**

```javascript
{
    _id: ObjectId("..."),
    nom: "Développement Web",
    code: "INFO-DEV-WEB",
    parentDepartement: ObjectId("...") ou null,
    createdBy: "username",
    dateCreation: Date
}
```

**Champs** :
- `parentDepartement: null` → Département principal
- `parentDepartement: ObjectId(...)` → Sous-département

### 2. Création de département (POST /api/departements)

**Fichier** : `server.js` (ligne 3211-3263)

```javascript
if (currentUserRole.niveau === 1) {
    // Niveau 1 : Crée un SOUS-DÉPARTEMENT dans son département d'affectation
    if (!currentUser.idDepartement) {
        return res.status(400).json({
            message: 'Vous devez être affecté à un département pour créer des sous-départements'
        });
    }
    nouveauDepartement.parentDepartement = currentUser.idDepartement;
} else if (currentUserRole.niveau === 0) {
    // Niveau 0 : Crée un DÉPARTEMENT PRINCIPAL
    nouveauDepartement.parentDepartement = null;
}
```

**Comportement** :
- Niveau 0 : `parentDepartement = null` (département principal)
- Niveau 1 : `parentDepartement = son département d'affectation` (sous-département)

### 3. Filtrage des départements (GET /api/departements)

**Fichier** : `server.js` (ligne 3179-3210)

```javascript
if (currentUserRole.niveau === 1) {
    query = {
        $or: [
            { _id: currentUser.idDepartement }, // Son département principal
            { parentDepartement: currentUser.idDepartement } // Ses sous-départements
        ]
    };
}
```

**Résultat pour un Niveau 1** :
- Voit son département principal (créé par Niveau 0)
- Voit tous les sous-départements qu'il a créés
- Ne voit PAS les autres départements principaux
- Ne voit PAS les sous-départements des autres Niveau 1

### 4. Modification de département (PUT /api/departements/:id)

**Fichier** : `server.js` (ligne 3267-3321)

```javascript
if (currentUserRole.niveau === 1) {
    const canModify =
        departement._id.toString() === currentUser.idDepartement?.toString() || // Son département principal
        (departement.parentDepartement?.toString() === currentUser.idDepartement?.toString() &&
         departement.createdBy === req.session.userId); // Ses sous-départements

    if (!canModify) {
        return res.status(403).json({
            message: 'Vous ne pouvez modifier que votre département ou les sous-départements que vous avez créés'
        });
    }
}
```

**Permissions Niveau 1** :
- ✅ Peut renommer son département principal
- ✅ Peut modifier ses sous-départements
- ❌ Ne peut PAS modifier les sous-départements d'autres Niveau 1

### 5. Suppression de département (DELETE /api/departements/:id)

**Fichier** : `server.js` (ligne 3323-3378)

```javascript
if (currentUserRole.niveau === 1) {
    // Ne peut PAS supprimer son département principal
    if (departement._id.toString() === currentUser.idDepartement?.toString()) {
        return res.status(403).json({
            message: 'Vous ne pouvez pas supprimer votre département principal'
        });
    }

    // Ne peut PAS supprimer les départements principaux
    if (!departement.parentDepartement) {
        return res.status(403).json({
            message: 'Seul le Super Admin peut supprimer les départements principaux'
        });
    }

    // Peut supprimer uniquement ses sous-départements
    if (departement.createdBy !== req.session.userId ||
        departement.parentDepartement?.toString() !== currentUser.idDepartement?.toString()) {
        return res.status(403).json({
            message: 'Vous ne pouvez supprimer que les sous-départements/services que vous avez créés'
        });
    }
}
```

**Permissions Niveau 1** :
- ✅ Peut supprimer ses sous-départements
- ❌ Ne peut PAS supprimer son département principal
- ❌ Ne peut PAS supprimer les départements principaux
- ❌ Ne peut PAS supprimer les sous-départements d'autres Niveau 1

---

## 📊 Tableau récapitulatif des permissions

### Départements principaux

| Action | Niveau 0 | Niveau 1 |
|--------|----------|----------|
| Créer | ✅ Oui | ❌ Non |
| Voir tous | ✅ Oui | ❌ Non (seulement le sien) |
| Renommer le sien | ✅ Oui | ✅ Oui |
| Renommer les autres | ✅ Oui | ❌ Non |
| Supprimer le sien | ✅ Oui | ❌ Non |
| Supprimer les autres | ✅ Oui | ❌ Non |

### Sous-départements/Services

| Action | Niveau 0 | Niveau 1 |
|--------|----------|----------|
| Créer dans son département | ✅ Oui | ✅ Oui |
| Créer dans d'autres départements | ✅ Oui | ❌ Non |
| Voir les siens | ✅ Oui | ✅ Oui |
| Voir ceux des autres | ✅ Oui | ❌ Non |
| Modifier les siens | ✅ Oui | ✅ Oui |
| Modifier ceux des autres | ✅ Oui | ❌ Non |
| Supprimer les siens | ✅ Oui | ✅ Oui |
| Supprimer ceux des autres | ✅ Oui | ❌ Non |

---

## 🔄 Flux de travail

### Flux 1 : Création d'un département principal (Niveau 0)

```
1. Niveau 0 se connecte
2. Va dans "Gérer les départements"
3. Clique sur "Créer un département"
4. Remplit :
   - Nom : "Informatique"
   - Code : "INFO"
5. Le système crée :
   {
     nom: "Informatique",
     code: "INFO",
     parentDepartement: null,  ← Département principal
     createdBy: "superadmin"
   }
```

### Flux 2 : Création d'un Niveau 1 (Niveau 0)

```
1. Niveau 0 crée un département principal "Informatique"
2. Niveau 0 crée un utilisateur Niveau 1 "Jean"
3. Affecte Jean au département "Informatique"
4. Jean peut maintenant créer des sous-départements dans "Informatique"
```

### Flux 3 : Création d'un sous-département (Niveau 1)

```
1. Jean (Niveau 1, département: Informatique) se connecte
2. Va dans "Gérer les départements"
3. Voit :
   - Informatique (département principal, peut renommer)
4. Clique sur "Créer un sous-département"
5. Remplit :
   - Nom : "Développement Web"
   - Code : "INFO-DEV-WEB"
6. Le système crée :
   {
     nom: "Développement Web",
     code: "INFO-DEV-WEB",
     parentDepartement: ObjectId("Informatique"),  ← Sous-département
     createdBy: "jean"
   }
```

### Flux 4 : Création d'utilisateurs dans un sous-département

```
1. Jean (Niveau 1) a créé le sous-département "Développement Web"
2. Jean crée un utilisateur Niveau 2 "Sophie"
3. Lors de la création :
   - Département : Automatiquement "Informatique" (département de Jean)
   - OU peut choisir "Développement Web" (sous-département créé)
4. Sophie est créée avec idDepartement = "Développement Web"
```

---

## 📝 Exemples concrets

### Exemple 1 : Université avec 3 facultés

**Configuration par Niveau 0** :
```
Départements principaux :
├── Sciences (parentDepartement: null)
├── Lettres (parentDepartement: null)
└── Médecine (parentDepartement: null)

Utilisateurs Niveau 1 créés :
├── Dr. Diop → affecté à "Sciences"
├── Pr. Ndiaye → affecté à "Lettres"
└── Dr. Fall → affecté à "Médecine"
```

**Dr. Diop (Niveau 1, Sciences) crée** :
```
Sous-départements de Sciences :
├── Sciences/Mathématiques (parentDepartement: Sciences)
├── Sciences/Physique (parentDepartement: Sciences)
└── Sciences/Informatique (parentDepartement: Sciences)
```

**Pr. Ndiaye (Niveau 1, Lettres) crée** :
```
Sous-départements de Lettres :
├── Lettres/Français (parentDepartement: Lettres)
├── Lettres/Anglais (parentDepartement: Lettres)
└── Lettres/Histoire (parentDepartement: Lettres)
```

**Isolation** :
- Dr. Diop ne voit PAS les sous-départements de Pr. Ndiaye
- Pr. Ndiaye ne voit PAS les sous-départements de Dr. Diop
- Chacun peut renommer son département principal ("Sciences" → "Faculté des Sciences")

### Exemple 2 : Entreprise avec divisions

**Configuration par Niveau 0** :
```
Départements principaux :
├── IT (parentDepartement: null)
├── RH (parentDepartement: null)
└── Finance (parentDepartement: null)

Utilisateurs Niveau 1 :
├── Jean → IT
├── Marie → RH
└── Paul → Finance
```

**Jean (IT) crée** :
```
IT/
├── Développement
├── Infrastructure
├── Support
└── Sécurité
```

**Marie (RH) crée** :
```
RH/
├── Recrutement
├── Formation
└── Administration du personnel
```

---

## 🧪 Tests recommandés

### Test 1 : Création de départements principaux (Niveau 0)

```
1. Se connecter avec Niveau 0
2. Créer un département "Informatique"
3. Vérifier que parentDepartement = null
4. Vérifier que createdBy = username Niveau 0
```

### Test 2 : Création de sous-départements (Niveau 1)

```
1. Se connecter avec Niveau 1 (affecté à "Informatique")
2. Aller dans "Gérer les départements"
3. Vérifier qu'on voit uniquement "Informatique"
4. Créer un sous-département "Dev Web"
5. Vérifier que parentDepartement = ObjectId("Informatique")
6. Vérifier que createdBy = username Niveau 1
```

### Test 3 : Isolation entre Niveau 1

```
1. Créer deux Niveau 1 : Jean (Informatique) et Marie (RH)
2. Jean crée "Informatique/Dev Web"
3. Marie crée "RH/Recrutement"
4. Vérifier que Jean ne voit PAS "RH/Recrutement"
5. Vérifier que Marie ne voit PAS "Informatique/Dev Web"
```

### Test 4 : Permissions de suppression

```
1. Se connecter avec Niveau 1
2. Essayer de supprimer son département principal
   → Devrait échouer avec message d'erreur
3. Créer un sous-département
4. Supprimer le sous-département créé
   → Devrait réussir
```

---

## 🚀 Migration des données existantes

Pour les départements créés avant cette mise à jour :

### Option 1 : Script de migration automatique

```javascript
// Ajouter parentDepartement: null aux départements existants
await departementsCollection.updateMany(
    { parentDepartement: { $exists: false } },
    { $set: { parentDepartement: null } }
);
```

### Option 2 : Migration manuelle

1. Les départements existants sans `parentDepartement` seront traités comme principaux
2. Ajouter manuellement le champ via l'interface admin

---

## 📋 Avantages de cette architecture

### 1. Séparation claire des responsabilités
- Niveau 0 : Gère la structure globale
- Niveau 1 : Gère l'organisation interne de son département

### 2. Isolation et sécurité
- Chaque Niveau 1 ne voit que son périmètre
- Pas de confusion entre départements

### 3. Flexibilité
- Chaque Niveau 1 organise son département comme il veut
- Peut renommer ses sous-départements selon le contexte (services, équipes, etc.)

### 4. Hiérarchie claire
- Structure en arbre facile à comprendre
- Relations parent-enfant explicites

### 5. Évolutivité
- Peut être étendu à plus de niveaux si nécessaire
- Structure de données prête pour une navigation hiérarchique

---

## 🔒 Sécurité

### Protection à 3 niveaux

1. **Interface (Frontend)** : Affiche uniquement les départements autorisés
2. **API (Backend)** : Vérifie les permissions avant chaque action
3. **Base de données** : Filtrage avec requêtes MongoDB sécurisées

### Règles de sécurité strictes

- ✅ Un Niveau 1 ne peut JAMAIS voir les données d'un autre Niveau 1
- ✅ Un Niveau 1 ne peut JAMAIS modifier les départements principaux (sauf renommer le sien)
- ✅ Un Niveau 1 ne peut JAMAIS supprimer son département principal
- ✅ Toutes les actions sont tracées avec `createdBy`

---

**Date de création** : 24 décembre 2025
**Auteur** : Claude Code
**Version** : 2.0 (Architecture hiérarchique)
