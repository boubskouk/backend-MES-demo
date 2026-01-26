# 🔧 MODIFICATIONS ARCHITECTURE NIVEAU 1 - OPTION B

**Date** : 24 décembre 2025
**Objectif** : Transformer le Niveau 1 d'un "Admin Global" en "Admin Départemental strict"

---

## 📋 RÉSUMÉ DES MODIFICATIONS

### Avant (Option A - Admin Global)
```
Niveau 1 = Super-utilisateur avec accès global
- Voit TOUS les documents de TOUS les départements
- Peut modifier/supprimer dans n'importe quel département
- Partage interdépartemental automatique
```

### Après (Option B - Admin Départemental)
```
Niveau 1 = Responsable strict de SON département
- Voit UNIQUEMENT les documents de SON département
- Peut modifier/supprimer UNIQUEMENT dans son département
- PAS d'accès aux autres départements
- Le département est obligatoire pour le niveau 1
```

---

## 🛠️ FICHIERS MODIFIÉS

### 1. `server.js` - Fonction `getAccessibleDocuments()`

**Ligne** : 192-208

**AVANT** :
```javascript
// ✅ NIVEAU 1 : Voit TOUS les documents de TOUS les départements
if (userRole.niveau === 1) {
    const allDocs = await documentsCollection.find({}).toArray();
    accessibleDocs = allDocs;
    console.log(`✅ NIVEAU 1: Accès à TOUS les documents (${accessibleDocs.length})`);
    return accessibleDocs;
}
```

**APRÈS** :
```javascript
// ✅ NIVEAU 1 : Voit UNIQUEMENT les documents de SON département (Admin départemental)
if (userRole.niveau === 1) {
    // Vérifier que l'utilisateur a un département
    if (!user.idDepartement) {
        console.log(`⚠️ Utilisateur niveau 1 sans département: Aucun document accessible`);
        return [];
    }

    // Tous les documents du même département uniquement
    const deptDocs = await documentsCollection.find({
        idDepartement: user.idDepartement
    }).toArray();

    accessibleDocs = deptDocs;
    console.log(`✅ NIVEAU 1: Accès aux documents de SON département uniquement (${accessibleDocs.length})`);
    return accessibleDocs;
}
```

**Impact** :
- ✅ Le niveau 1 ne voit plus que les documents de son département
- ✅ Si pas de département assigné → Aucun document accessible
- ✅ Logs mis à jour pour refléter la nouvelle logique

---

### 2. `server.js` - Fonction `delete-all`

**Ligne** : 2269-2272

**AVANT** :
```javascript
if (userRole.niveau === 1) {
    // ✅ NIVEAU 1 : Supprimer TOUS les documents de TOUS les départements
    query = {};  // Pas de filtre = tous les documents
    console.log('📋 Suppression niveau 1 (ADMIN) - TOUS les documents du système');
}
```

**APRÈS** :
```javascript
if (userRole.niveau === 1) {
    // ✅ NIVEAU 1 : Supprimer TOUS les documents de SON département uniquement
    query = { idDepartement: user.idDepartement };
    console.log('📋 Suppression niveau 1 (ADMIN) - TOUS les documents de SON département');
}
```

**Impact** :
- ✅ La suppression en masse est limitée au département de l'utilisateur
- ✅ Protection contre la suppression accidentelle de documents d'autres départements

---

### 3. `server.js` - Logique de partage de documents

**Ligne** : 1890-1896

**AVANT** :
```javascript
// Vérifier le rôle de l'utilisateur pour voir si c'est un niveau 1
const userRole = await rolesCollection.findOne({ _id: user.idRole });
const isNiveau1 = userRole && userRole.niveau === 1;

// Admin niveau 1 a accès à tout
const sameDepartment = isNiveau1 || (
    documentOwner &&
    user.idDepartement &&
    documentOwner.idDepartement &&
    documentOwner.idDepartement.toString() === user.idDepartement.toString()
);
```

**APRÈS** :
```javascript
// Vérifier que l'utilisateur est du même département que le document
const sameDepartment = (
    documentOwner &&
    user.idDepartement &&
    documentOwner.idDepartement &&
    documentOwner.idDepartement.toString() === user.idDepartement.toString()
);
```

**Impact** :
- ✅ Le niveau 1 ne peut plus partager des documents d'autres départements
- ✅ Respect strict du périmètre départemental

---

## 🎯 NOUVELLE ARCHITECTURE DES PERMISSIONS

### Niveau 0 (Super Admin)
```
✅ Département : AUCUN (global)
✅ Voir : TOUS les documents (supervision)
✅ Modifier : TOUS les documents
✅ Supprimer : TOUS les documents
❌ Approuver demandes : Non (rôle de supervision)
```

### Niveau 1 (Admin Départemental) - ⭐ MODIFIÉ
```
✅ Département : OBLIGATOIRE
✅ Voir : Documents de SON département UNIQUEMENT
✅ Modifier : Documents de son département UNIQUEMENT
✅ Supprimer : Documents de son département directement
✅ Approuver demandes : Demandes de son département
✅ Partager : Documents de son département uniquement
```

### Niveau 2 (Gestionnaire Départemental)
```
✅ Département : OBLIGATOIRE
✅ Voir : Documents de son département
✅ Modifier : Documents de son département
❌ Supprimer directement : Non (demande requise)
✅ Créer demandes : Oui
```

### Niveau 3 (Utilisateur Standard)
```
✅ Département : OBLIGATOIRE
✅ Voir : Ses documents + documents niveau 3 du département
✅ Modifier : Ses documents uniquement
❌ Supprimer directement : Non (demande requise)
✅ Créer demandes : Oui
```

---

## 📊 RÉPARTITION ACTUELLE DES UTILISATEURS

### Niveau 1 - TOUS ont un département maintenant ✅
- **JBK** (@jbk) → INFORMATIQUE
- **papy** (@papy) → DIRECTION
- **babs** (@babs) → DIRECTION

### Départements
- **DIRECTION** : 6 utilisateurs (2 niveau 1, 4 autres niveaux)
- **INFORMATIQUE** : 8 utilisateurs (1 niveau 1, 7 autres niveaux)

---

## ✅ AVANTAGES DE L'OPTION B

1. **Sécurité renforcée** : Principe du moindre privilège respecté
2. **Responsabilité claire** : Chaque département a son responsable identifié
3. **Séparation des responsabilités** : Pas d'interférence entre départements
4. **Audit facilité** : Traçabilité claire par département
5. **Conformité** : Respect des périmètres organisationnels
6. **Hiérarchie logique** :
   ```
   Niveau 0 → Vue globale (supervision système)
   Niveau 1 → Vue départementale (responsable département)
   Niveau 2 → Vue partielle département (gestionnaire)
   Niveau 3 → Vue limitée (utilisateur)
   ```

---

## ⚠️ CHANGEMENTS DE COMPORTEMENT

### Ce qui NE marche PLUS :

❌ **JBK (INFORMATIQUE) ne peut plus** :
- Voir les documents de DIRECTION
- Modifier les documents de DIRECTION
- Supprimer les documents de DIRECTION
- Partager des documents de DIRECTION

❌ **papy (DIRECTION) ne peut plus** :
- Voir les documents de INFORMATIQUE
- Modifier les documents de INFORMATIQUE
- Supprimer les documents de INFORMATIQUE
- Partager des documents de INFORMATIQUE

### Ce qui marche TOUJOURS :

✅ **JBK (INFORMATIQUE) peut** :
- Voir TOUS les documents de INFORMATIQUE
- Modifier TOUS les documents de INFORMATIQUE
- Supprimer directement les documents de INFORMATIQUE
- Approuver les demandes de suppression de INFORMATIQUE
- Partager des documents au sein de INFORMATIQUE

✅ **papy et babs (DIRECTION) peuvent** :
- Voir TOUS les documents de DIRECTION
- Modifier TOUS les documents de DIRECTION
- Supprimer directement les documents de DIRECTION
- Approuver les demandes de suppression de DIRECTION
- Partager des documents au sein de DIRECTION

---

## 🔄 MIGRATION

### Étapes effectuées :

1. ✅ Assignation de départements à tous les niveau 1
   - Script : `scripts/fix-niveau1-departments.js`
   - Résultat : 100% des niveau 1 ont un département

2. ✅ Retrait des départements des Super Admins (niveau 0)
   - Script : `scripts/fix-superadmin-departments.js`
   - Résultat : 100% des niveau 0 n'ont pas de département

3. ✅ Modification du code pour limiter les accès niveau 1
   - Fichier : `server.js`
   - Fonctions modifiées : `getAccessibleDocuments()`, `delete-all`, logique de partage

---

## 🧪 TESTS RECOMMANDÉS

### Test 1 : Accès aux documents
1. Se connecter avec JBK (INFORMATIQUE)
2. Vérifier qu'il voit UNIQUEMENT les documents de INFORMATIQUE
3. Vérifier qu'il NE voit PAS les documents de DIRECTION

### Test 2 : Partage de documents
1. Se connecter avec papy (DIRECTION)
2. Tenter de partager un document de DIRECTION avec JBK
3. ✅ Devrait fonctionner (même si départements différents, le partage explicite est autorisé)

### Test 3 : Suppression
1. Se connecter avec JBK (INFORMATIQUE)
2. Tenter de supprimer un document de INFORMATIQUE
3. ✅ Devrait fonctionner (suppression directe)
4. Vérifier que seuls les documents de INFORMATIQUE sont supprimés

### Test 4 : Approbation de demandes
1. Se connecter avec un niveau 2/3 de DIRECTION
2. Créer une demande de suppression
3. Se connecter avec papy (DIRECTION)
4. ✅ Devrait voir la demande et pouvoir l'approuver
5. Se connecter avec JBK (INFORMATIQUE)
6. ❌ Ne devrait PAS voir la demande (département différent)

---

## 📝 NOTES IMPORTANTES

1. **Redémarrage requis** : Le serveur doit être redémarré pour que les modifications prennent effet

2. **Base de données** : Les données sont déjà corrigées (départements assignés)

3. **Compatibilité** : Cette modification est compatible avec le reste du système

4. **Réversibilité** : Pour revenir à l'Option A, il suffit de restaurer les 3 sections de code modifiées

5. **Documentation** : Mettre à jour la documentation utilisateur pour refléter les nouvelles permissions

---

## 🚀 DÉPLOIEMENT

### Commandes :

```bash
# 1. Vérifier que tous les niveau 1 ont un département
node scripts/analyze-roles-departments.js

# 2. Redémarrer le serveur pour appliquer les modifications
# (Ctrl+C puis relancer)
npm start

# 3. Tester avec les utilisateurs niveau 1
# Se connecter avec jbk, papy, babs et vérifier les accès
```

---

## 📞 SUPPORT

En cas de problème :
1. Vérifier les logs du serveur
2. Vérifier que tous les niveau 1 ont bien un département assigné
3. Vérifier que les modifications de code sont bien appliquées

---

**Modification effectuée par** : Claude Code Assistant
**Date** : 24 décembre 2025
**Statut** : ✅ Prêt pour déploiement
