# REFONTE ARCHITECTURE : SÉPARATION DÉPARTEMENTS ET SERVICES

## 🎯 OBJECTIF

Séparer clairement les concepts de **département** et **service** en utilisant deux collections MongoDB distinctes.

## 📊 ARCHITECTURE ACTUELLE (PROBLÉMATIQUE)

### Collection unique : `departements`
```javascript
{
  _id: ObjectId,
  nom: String,
  code: String,
  parentDepartement: ObjectId | null,  // null = département, non-null = service
  dateCreation: Date,
  createdBy: String
}
```

**Problème** : Confusion entre départements et services car ils partagent la même collection.

---

## ✅ NOUVELLE ARCHITECTURE

### 1. Collection `departements` (créés par Niveau 0)
```javascript
{
  _id: ObjectId,
  nom: String,              // Ex: "Direction Générale"
  code: String,             // Ex: "DG"
  description: String,
  dateCreation: Date,
  createdBy: String,        // Username du Super Admin
  lastModified: Date,
  lastModifiedBy: String
}
```

### 2. Collection `services` (créés par Niveau 1)
```javascript
{
  _id: ObjectId,
  nom: String,              // Ex: "Service Comptabilité"
  code: String,             // Ex: "COMPTA"
  description: String,
  idDepartement: ObjectId,  // Référence au département parent (OBLIGATOIRE)
  dateCreation: Date,
  createdBy: String,        // Username du Niveau 1
  lastModified: Date,
  lastModifiedBy: String
}
```

### 3. Collection `users` (modifiée)
```javascript
{
  _id: ObjectId,
  username: String,
  email: String,
  password: String,
  idRole: ObjectId,

  // NOUVEAU : Distinction département/service
  idDepartement: ObjectId | null,  // Si affecté à un département
  idService: ObjectId | null,       // Si affecté à un service

  // Note: Un utilisateur peut avoir soit idDepartement, soit idService, mais pas les deux

  dateCreation: Date,
  blocked: Boolean
}
```

### 4. Collection `documents` (modifiée)
```javascript
{
  _id: ObjectId,
  titre: String,
  idDocument: String,

  // NOUVEAU : Référence département OU service
  idDepartement: ObjectId | null,
  idService: ObjectId | null,

  idUtilisateur: String,
  dateAjout: Date,
  ...
}
```

---

## 🔧 RÈGLES DE GESTION

### Niveau 0 (Super Admin)
- ✅ Crée, modifie, supprime les **départements**
- ✅ Voit tous les départements
- ✅ Voit tous les services (tous départements confondus)
- ✅ Peut affecter un utilisateur à un département OU à un service
- ❌ Ne crée PAS de services

### Niveau 1 (Admin Départemental)
- ✅ Voit son département
- ✅ Crée, modifie, supprime les **services** de son département uniquement
- ✅ Voit uniquement les services de son département
- ✅ Peut affecter un utilisateur niveau 2 ou 3 à son département ou à un service de son département
- ❌ Ne peut PAS créer de départements
- ❌ Ne peut PAS voir/modifier les services d'autres départements

### Niveau 2 et 3
- ✅ Affectés à un département OU à un service
- ✅ Voient les documents de leur département/service

---

## 📝 MODIFICATIONS À EFFECTUER

### 1. Backend - Création module services

**Fichier** : `modules/superadmin/services.js`

```javascript
/**
 * Module de gestion des services
 * - Un service appartient toujours à un département
 * - Seul le niveau 1 peut créer des services dans son département
 */

async function createService(data, createdBy, userDepartmentId) {
    // Validation : le niveau 1 ne peut créer que dans son département
    if (data.idDepartement !== userDepartmentId) {
        throw new Error('Vous ne pouvez créer des services que dans votre département');
    }

    const newService = {
        _id: new ObjectId(),
        nom: data.nom,
        code: data.code,
        description: data.description || '',
        idDepartement: new ObjectId(data.idDepartement),
        dateCreation: new Date(),
        createdBy
    };

    await servicesCollection.insertOne(newService);
    return newService;
}
```

### 2. Backend - Routes API

**Nouvelles routes** : `/api/services`

```javascript
// Pour niveau 1 : Gérer ses services
GET    /api/services              // Lister les services de son département
POST   /api/services              // Créer un service dans son département
PUT    /api/services/:id          // Modifier un service de son département
DELETE /api/services/:id          // Supprimer un service de son département

// Pour niveau 0 : Vue globale
GET    /api/superadmin/services   // Tous les services (tous départements)
```

### 3. Backend - Modification route /api/departements

**Avant** :
```javascript
GET /api/departements  // Retourne départements + services mélangés
```

**Après** :
```javascript
GET /api/departements  // Retourne UNIQUEMENT les départements (parentDepartement supprimé)
```

### 4. Frontend - Adaptation interface niveau 1

**Avant** : Niveau 1 gère "départements" (en réalité services)
**Après** : Niveau 1 gère explicitement "services"

```javascript
// Interface niveau 1
renderServicesManagement() {
    return `
        <h2>🏢 Gérer mes services</h2>
        <p>Département : ${currentUser.departement}</p>

        <button onclick="createService()">➕ Créer un service</button>

        <table>
            <thead>
                <tr>
                    <th>Code</th>
                    <th>Nom du service</th>
                    <th>Utilisateurs</th>
                    <th>Documents</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>
                ${services.map(service => renderServiceRow(service))}
            </tbody>
        </table>
    `;
}
```

### 5. Frontend - Sélection département/service lors création utilisateur

**Pour niveau 0** :
```html
<select id="assignmentType">
    <option value="departement">Affecter à un département</option>
    <option value="service">Affecter à un service</option>
</select>

<select id="departementSelect" style="display:block">
    <option value="">-- Choisir un département --</option>
    <!-- Liste des départements -->
</select>

<select id="serviceSelect" style="display:none">
    <option value="">-- Choisir un service --</option>
    <!-- Liste des services (tous départements) -->
</select>
```

**Pour niveau 1** :
```html
<select id="assignmentType">
    <option value="departement">Affecter à mon département</option>
    <option value="service">Affecter à un service</option>
</select>

<select id="serviceSelect" style="display:none">
    <option value="">-- Choisir un service --</option>
    <!-- Liste des services de SON département uniquement -->
</select>
```

---

## 🔄 SCRIPT DE MIGRATION

**Fichier** : `scripts/migrate-departements-to-services.js`

```javascript
/**
 * Script de migration : Séparer départements et services
 *
 * - Les entrées avec parentDepartement = null → restent dans 'departements'
 * - Les entrées avec parentDepartement != null → deviennent des 'services'
 */

async function migrate() {
    // 1. Récupérer tous les "sous-départements" (services)
    const services = await db.collection('departements').find({
        parentDepartement: { $ne: null }
    }).toArray();

    console.log(`📋 ${services.length} services à migrer`);

    // 2. Créer la collection 'services'
    for (const service of services) {
        await db.collection('services').insertOne({
            _id: service._id,
            nom: service.nom,
            code: service.code,
            description: service.description || '',
            idDepartement: service.parentDepartement,  // Le parent devient idDepartement
            dateCreation: service.dateCreation,
            createdBy: service.createdBy
        });
    }

    // 3. Supprimer les services de la collection 'departements'
    await db.collection('departements').deleteMany({
        parentDepartement: { $ne: null }
    });

    // 4. Mettre à jour les utilisateurs
    const users = await db.collection('users').find({}).toArray();
    for (const user of users) {
        if (user.idDepartement) {
            // Vérifier si c'est un département ou un service
            const isDept = await db.collection('departements').findOne({ _id: user.idDepartement });
            const isService = await db.collection('services').findOne({ _id: user.idDepartement });

            if (isService) {
                // Migrer vers idService
                await db.collection('users').updateOne(
                    { _id: user._id },
                    {
                        $set: { idService: user.idDepartement },
                        $unset: { idDepartement: "" }
                    }
                );
            }
        }
    }

    // 5. Mettre à jour les documents
    const documents = await db.collection('documents').find({}).toArray();
    for (const doc of documents) {
        if (doc.idDepartement) {
            const isService = await db.collection('services').findOne({ _id: doc.idDepartement });

            if (isService) {
                await db.collection('documents').updateOne(
                    { _id: doc._id },
                    {
                        $set: { idService: doc.idDepartement },
                        $unset: { idDepartement: "" }
                    }
                );
            }
        }
    }

    console.log('✅ Migration terminée');
}
```

---

## 📋 ORDRE D'IMPLÉMENTATION

1. ✅ Créer ce document de spécification
2. ⏳ Créer le module backend `services.js`
3. ⏳ Créer les routes API `/api/services`
4. ⏳ Modifier le modèle User (ajouter `idService`)
5. ⏳ Créer le script de migration
6. ⏳ Exécuter la migration sur la base de données
7. ⏳ Adapter les routes existantes (supprimer `parentDepartement`)
8. ⏳ Modifier le frontend (interface niveau 1, sélecteurs)
9. ⏳ Tester l'ensemble

---

## 🧪 TESTS À EFFECTUER

- [ ] Niveau 0 crée un département → OK
- [ ] Niveau 0 ne peut PAS créer de service → OK
- [ ] Niveau 1 crée un service dans son département → OK
- [ ] Niveau 1 ne peut PAS créer de service dans un autre département → Bloqué
- [ ] Niveau 0 affecte un utilisateur à un département → OK
- [ ] Niveau 0 affecte un utilisateur à un service → OK
- [ ] Niveau 1 affecte un utilisateur à un service de son département → OK
- [ ] Les documents sont correctement rattachés à département OU service → OK
- [ ] La migration ne perd aucune donnée → OK
