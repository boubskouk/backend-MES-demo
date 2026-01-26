# NOUVELLES FONCTIONNALITÉS - PARTAGE ET VALIDATION DE SUPPRESSION

## Date: 2025-10-31

## 📋 Résumé des changements

Implémentation de trois nouvelles fonctionnalités majeures pour le système d'archivage C.E.R.E.R :

1. **Partage horizontal** : Accès aux documents entre utilisateurs du même niveau
2. **Partage interdépartemental niveau 1** : Partage entre tous les utilisateurs de niveau 1
3. **Validation de suppression** : Autorisation obligatoire de niveau 1 pour les suppressions niveau 2/3

---

## 🔄 1. PARTAGE HORIZONTAL (Même niveau, même département)

### Comportement précédent
- Les utilisateurs voyaient uniquement leurs propres documents
- Un niveau 1 voyait tous les documents de son département
- Un niveau 2 voyait ses documents + documents niveau 3
- Un niveau 3 voyait uniquement ses propres documents

### Nouveau comportement
✅ **Les utilisateurs d'un même niveau dans un même département peuvent maintenant voir les documents de leurs collègues du même niveau.**

#### Exemples
- **Niveau 1** : Fatima (Direction) peut voir les documents de Awa (Direction) et JBK (Comptabilité - partage interdépartemental)
- **Niveau 2** : Alice (Compta) peut voir les documents de Bob (Compta) s'ils sont tous deux niveau 2
- **Niveau 3** : Carlos (RH) peut voir les documents de Diana (RH) s'ils sont tous deux niveau 3

### Modification du code
**Fichier** : `server.js`

**Fonction modifiée** : `canAccessDocument()` (lignes 40-77)
```javascript
// ✅ NOUVEAU: Partage horizontal - même niveau, même département
if (userRole.niveau === docCreatorRole.niveau) {
    console.log(`🤝 Partage horizontal niveau ${userRole.niveau}: ${userId} accède au document de ${document.idUtilisateur}`);
    return true;
}
```

**Fonction modifiée** : `getAccessibleDocuments()` (lignes 79-157)
```javascript
// ✅ NOUVEAU: Partage horizontal - même niveau
if (userRole.niveau === docCreatorRole.niveau) {
    accessibleDocs.push(doc);
    continue;
}
```

---

## 🌐 2. PARTAGE INTERDÉPARTEMENTAL NIVEAU 1

### Comportement
✅ **Tous les utilisateurs de niveau 1 (Primaire) peuvent maintenant voir les documents des autres utilisateurs niveau 1, peu importe le département.**

### Cas d'usage
- Fatima (Direction, niveau 1) peut voir les documents de JBK (Comptabilité, niveau 1)
- JBK (Comptabilité, niveau 1) peut voir les documents de Fatima (Direction, niveau 1)

### Avantages
- Meilleure collaboration entre directeurs
- Visibilité transversale pour les décideurs
- Facilite le suivi interdépartemental

### Modification du code
**Fichier** : `server.js`

**Dans** `canAccessDocument()` :
```javascript
// ✅ NOUVEAU: Partage interdépartemental pour niveau 1
// Les utilisateurs de niveau 1 peuvent voir les documents des autres niveau 1
if (userRole.niveau === 1 && docCreatorRole.niveau === 1) {
    console.log(`🔄 Partage interdépartemental niveau 1: ${userId} accède au document de ${document.idUtilisateur}`);
    return true;
}
```

**Dans** `getAccessibleDocuments()` :
```javascript
// Si niveau 1, ajouter les documents des autres niveau 1
if (userRole.niveau === 1) {
    const niveau1Users = await usersCollection.find({
        idRole: { $in: (await rolesCollection.find({ niveau: 1 }).toArray()).map(r => r._id) }
    }).toArray();

    const niveau1Usernames = niveau1Users.map(u => u.username);
    query.$or.push({ idUtilisateur: { $in: niveau1Usernames } });
}
```

---

## ✅ 3. SYSTÈME DE VALIDATION DE SUPPRESSION

### Comportement
✅ **Les utilisateurs de niveau 2 et 3 doivent obtenir l'autorisation d'un niveau 1 pour supprimer un document.**

### Workflow de suppression

#### Pour niveau 1 (Primaire)
1. Clique sur "Supprimer"
2. ✅ Document supprimé immédiatement
3. Aucune demande créée

#### Pour niveau 2/3 (Secondaire/Tertiaire)
1. Clique sur "Supprimer"
2. 📝 **Demande de suppression créée** (statut: "en_attente")
3. ⏳ Notification : "Un niveau 1 doit approuver"
4. Attente de validation d'un utilisateur niveau 1

#### Pour niveau 1 (Approbateur)
1. Consulte la liste des demandes : `GET /api/deletion-requests/:userId`
2. Voit les demandes en attente de son département
3. Peut **approuver** ou **rejeter** la demande
4. Si approuvée ✅ → Document supprimé
5. Si rejetée ❌ → Document conservé

### Nouvelles routes API

#### 1. Récupérer les demandes de suppression (Niveau 1 uniquement)
```http
GET /api/deletion-requests/:userId
```

**Réponse** :
```json
{
  "success": true,
  "requests": [
    {
      "_id": "67234abc...",
      "idDocument": "67123def...",
      "documentTitre": "Facture 2025",
      "idDemandeur": "deguene",
      "nomDemandeur": "Deguene",
      "idDepartement": "ObjectId(...)",
      "dateCreation": "2025-10-31T10:30:00Z",
      "statut": "en_attente",
      "motif": "Document obsolète"
    }
  ]
}
```

#### 2. Approuver une demande (Niveau 1 uniquement)
```http
POST /api/deletion-requests/:requestId/approve
Content-Type: application/json

{
  "userId": "fatima"
}
```

**Réponse** :
```json
{
  "success": true,
  "message": "Document supprimé avec succès"
}
```

#### 3. Rejeter une demande (Niveau 1 uniquement)
```http
POST /api/deletion-requests/:requestId/reject
Content-Type: application/json

{
  "userId": "fatima",
  "motifRejet": "Document encore nécessaire"
}
```

**Réponse** :
```json
{
  "success": true,
  "message": "Demande de suppression rejetée"
}
```

#### 4. Consulter l'historique des demandes
```http
GET /api/deletion-requests/:userId/history
```

**Pour niveau 1** : Toutes les demandes traitées du département (50 dernières)
**Pour niveau 2/3** : Uniquement leurs propres demandes

### Modification de la route DELETE
**Fichier** : `server.js` (lignes 764-848)

**Ancienne route** :
```javascript
app.delete('/api/documents/:userId/:docId', async (req, res) => {
    // Suppression directe pour tous
    await documentsCollection.deleteOne({ _id: new ObjectId(docId) });
});
```

**Nouvelle route** :
```javascript
app.delete('/api/documents/:userId/:docId', async (req, res) => {
    // Si niveau 2 ou 3 → Créer demande
    if (userRole.niveau === 2 || userRole.niveau === 3) {
        const request = await deletionRequestsCollection.insertOne({
            idDocument: new ObjectId(docId),
            documentTitre: document.titre,
            idDemandeur: userId,
            nomDemandeur: user.nom,
            idDepartement: user.idDepartement,
            dateCreation: new Date(),
            statut: 'en_attente',
            motif: req.body.motif || 'Non spécifié'
        });

        return res.json({
            success: false,
            requiresApproval: true,
            message: 'Demande de suppression créée. Un utilisateur de niveau 1 doit l\'approuver.',
            requestId: request.insertedId
        });
    }

    // Niveau 1 → Suppression directe
    await documentsCollection.deleteOne({ _id: new ObjectId(docId) });
});
```

### Nouvelle collection MongoDB

**Collection** : `deletionRequests`

**Structure** :
```javascript
{
  _id: ObjectId("..."),
  idDocument: ObjectId("..."),       // Document à supprimer
  documentTitre: "Facture 2025",     // Titre pour affichage
  idDemandeur: "deguene",            // Qui demande
  nomDemandeur: "Deguene",           // Nom complet
  idDepartement: ObjectId("..."),    // Département
  dateCreation: ISODate("..."),      // Date demande
  statut: "en_attente",              // en_attente | approuvee | rejetee
  motif: "Document obsolète",        // Raison demandeur

  // Rempli lors du traitement
  idApprobateur: "fatima",           // Qui traite
  nomApprobateur: "Fatima",          // Nom complet
  dateTraitement: ISODate("..."),    // Date traitement
  motifRejet: "Encore nécessaire"    // Si rejetée
}
```

---

## 📊 Résumé des modifications dans `server.js`

| Ligne(s) | Modification | Type |
|----------|-------------|------|
| 26 | Ajout `deletionRequestsCollection` | Nouvelle collection |
| 134 | Initialisation collection dans MongoDB | Configuration |
| 40-77 | Modification `canAccessDocument()` | Partage horizontal + interdépartemental |
| 79-157 | Modification `getAccessibleDocuments()` | Partage horizontal + interdépartemental |
| 764-848 | Modification route `DELETE /api/documents/:userId/:docId` | Système de validation |
| 938-1192 | Nouvelles routes demandes de suppression | 4 nouvelles routes API |

---

## 🧪 TESTS À EFFECTUER

### Test 1 : Partage horizontal même niveau
1. Créer 2 utilisateurs niveau 2 dans le même département
2. Utilisateur A crée un document
3. Se connecter avec utilisateur B
4. ✅ Vérifier que B voit le document de A

### Test 2 : Partage interdépartemental niveau 1
1. Connecter utilisateur niveau 1 département A (ex: Fatima)
2. ✅ Vérifier qu'elle voit les documents de JBK (niveau 1, département B)

### Test 3 : Demande de suppression niveau 2/3
1. Se connecter avec utilisateur niveau 3 (ex: deguene)
2. Tenter de supprimer un document
3. ✅ Vérifier qu'une demande est créée (pas de suppression immédiate)
4. ✅ Vérifier le message : "Un niveau 1 doit approuver"

### Test 4 : Approbation de suppression
1. Se connecter avec niveau 1 (ex: fatima)
2. Appeler `GET /api/deletion-requests/fatima`
3. ✅ Voir la demande de deguene
4. Approuver : `POST /api/deletion-requests/:id/approve`
5. ✅ Vérifier que le document est supprimé

### Test 5 : Rejet de suppression
1. Niveau 3 crée une demande de suppression
2. Niveau 1 appelle `POST /api/deletion-requests/:id/reject`
3. ✅ Vérifier que le document n'est PAS supprimé
4. ✅ Vérifier que la demande a statut "rejetee"

### Test 6 : Suppression directe niveau 1
1. Se connecter avec niveau 1
2. Supprimer un document
3. ✅ Vérifier suppression immédiate (pas de demande créée)

---

## 🔒 SÉCURITÉ

### Vérifications implémentées
✅ Seuls les niveau 1 peuvent approuver/rejeter les demandes
✅ Un niveau 1 ne peut traiter que les demandes de son département
✅ Impossible de traiter une demande déjà traitée
✅ Vérification d'existence du document avant suppression
✅ Logs détaillés pour traçabilité

### Permissions par niveau

| Niveau | Voir documents | Supprimer directement | Créer demande | Approuver demande |
|--------|---------------|----------------------|---------------|-------------------|
| **1 - Primaire** | Département + Autres niveau 1 | ✅ Oui | N/A | ✅ Oui |
| **2 - Secondaire** | Département + Même niveau | ❌ Non | ✅ Oui | ❌ Non |
| **3 - Tertiaire** | Ses docs + Même niveau | ❌ Non | ✅ Oui | ❌ Non |

---

## 🎯 PROCHAINES ÉTAPES (Frontend)

Pour compléter l'implémentation, il faudra modifier le frontend :

### 1. Modification de `app.js`
- Détecter la réponse `requiresApproval: true` lors de la suppression
- Afficher un message approprié à l'utilisateur
- Ajouter un badge "En attente" sur les documents avec demandes

### 2. Nouvelle section "Demandes de suppression" (Niveau 1)
- Afficher la liste des demandes en attente
- Boutons "Approuver" et "Rejeter"
- Affichage des informations du demandeur

### 3. Section "Mes demandes" (Niveau 2/3)
- Afficher l'état de leurs demandes
- Statut : En attente / Approuvée / Rejetée
- Afficher le motif de rejet si applicable

### 4. Indicateurs visuels
- Badge "Document partagé" pour documents d'autres utilisateurs
- Badge "Niveau 1" pour documents interdépartementaux
- Badge "Demande en attente" pour documents avec demande

---

## 📝 LOGS ET TRAÇABILITÉ

Le système génère des logs détaillés :

```
🤝 Partage horizontal niveau 2: alice accède au document de bob
🔄 Partage interdépartemental niveau 1: fatima accède au document de jbk
📝 Demande de suppression créée: 67234... par deguene pour document 67123...
✅ Demande approuvée: 67234... par fatima - Document 67123... supprimé
❌ Demande rejetée: 67234... par fatima
🗑️ Document supprimé directement par niveau 1: fatima
```

---

## ✅ COMPATIBILITÉ

- ✅ Rétrocompatibilité totale avec les documents existants
- ✅ Aucune migration de données requise
- ✅ Les anciennes routes fonctionnent toujours
- ✅ Les permissions hiérarchiques existantes sont conservées

---

## 📞 SUPPORT

Pour toute question ou problème :
- Consulter ce document
- Vérifier les logs du serveur (console)
- Tester avec les utilisateurs par défaut :
  - `fatima` (Niveau 1, Direction)
  - `awa` (Niveau 1, Direction)
  - `jbk` (Niveau 1, Comptabilité)
  - `deguene` (Niveau 3, Comptabilité)

---

**Développé par le Service Informatique du C.E.R.E.R**
**Date : 2025-10-31**
