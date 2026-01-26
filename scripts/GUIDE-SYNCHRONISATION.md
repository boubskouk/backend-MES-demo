# 🔄 GUIDE DE SYNCHRONISATION DES BASES DE DONNÉES

## 📋 Vue d'ensemble

Ce script permet de synchroniser vos bases de données MongoDB **locale** et **production (Atlas)** de manière sécurisée et contrôlée.

## 🎯 Fonctionnalités

### 1. **Comparaison** 📊
Compare le nombre de documents dans chaque collection entre local et production.

### 2. **Synchronisation REPLACE** 🔄
Remplace COMPLÈTEMENT les données de la destination par celles de la source.
- ⚠️ **DESTRUCTIF** : Supprime toutes les données de la destination
- ✅ **Backup automatique** avant synchronisation
- 🎯 **Utilisation** : Quand vous voulez une copie exacte

### 3. **Synchronisation MERGE** 🔀
Fusionne intelligemment les données source et destination.
- ✅ **Non destructif** : Conserve les données existantes
- 🔄 **Met à jour** les documents existants (même `_id`)
- ➕ **Ajoute** les nouveaux documents
- 🎯 **Utilisation** : Quand vous voulez combiner les données

### 4. **Backup** 💾
Sauvegarde les collections au format JSON dans `scripts/backups/`

## 🚀 Comment utiliser

### Étape 1 : Vérifier les prérequis

```bash
# MongoDB local doit être démarré
mongod

# Vérifier que Node.js est installé
node --version
```

### Étape 2 : Configurer l'URI de production

Éditez le fichier `scripts/sync-databases.js` ligne 19-21 :

```javascript
const PRODUCTION_URI = process.env.MONGODB_ATLAS_URI ||
    'mongodb+srv://VOTRE_USER:VOTRE_PASSWORD@cluster0.xxxxx.mongodb.net/cerer_archivage?retryWrites=true&w=majority';
```

**OU** définissez une variable d'environnement :

```bash
# Windows
set MONGODB_ATLAS_URI=mongodb+srv://user:pass@cluster.mongodb.net/cerer_archivage

# Linux/Mac
export MONGODB_ATLAS_URI=mongodb+srv://user:pass@cluster.mongodb.net/cerer_archivage
```

### Étape 3 : Lancer le script

```bash
cd "E:\site et apps\archivage cerer\backend"
node scripts/sync-databases.js
```

### Étape 4 : Choisir une option

Le menu interactif s'affiche :

```
=======================================================================
  🔄 SYNCHRONISATION DES BASES DE DONNÉES - C.E.R.E.R
=======================================================================

Options disponibles:

  1. 📊 Comparer Local ↔ Production
  2. 📤 Synchroniser Local → Production (REPLACE)
  3. 📥 Synchroniser Production → Local (REPLACE)
  4. 🔀 Synchroniser Local → Production (MERGE)
  5. 🔀 Synchroniser Production → Local (MERGE)
  6. 💾 Backup Local uniquement
  7. 💾 Backup Production uniquement
  8. 💾 Backup Local + Production
  9. 🔍 Test de connexion
  0. ❌ Quitter

=======================================================================

👉 Votre choix:
```

## 📖 Scénarios d'utilisation

### Scénario 1 : Je veux voir les différences

```
Choix: 1 (Comparer)

Résultat :
📊 COMPARAISON DES BASES DE DONNÉES
======================================================================
✅ users                          Local:    14 | Prod:     8 | Diff: +6
📈 documents                      Local:     6 | Prod:     0 | Diff: +6
✅ categories                     Local:   153 | Prod:   153 | Diff: 0
...
======================================================================
```

**Interprétation** :
- ✅ = Identique
- 📈 = Local a plus de documents
- 📉 = Production a plus de documents

### Scénario 2 : Pousser ma base locale vers production

**Situation** : Vous avez travaillé en local et voulez déployer en production.

```
Choix: 2 (Local → Production REPLACE)

Confirmation: OUI

Étapes :
1. ✅ Backup automatique de la production
2. 🔄 Suppression des données de production
3. 📤 Copie de toutes les données locales vers production
4. ✅ Terminé
```

**⚠️ ATTENTION** : Cette opération REMPLACE tout en production !

### Scénario 3 : Récupérer les données de production

**Situation** : Nouvelle machine, vous voulez télécharger les données de production.

```
Choix: 3 (Production → Local REPLACE)

Confirmation: OUI

Étapes :
1. ✅ Backup automatique du local
2. 🔄 Suppression des données locales
3. 📥 Copie de toutes les données de production vers local
4. ✅ Terminé
```

### Scénario 4 : Fusionner les nouvelles données

**Situation** : Vous avez ajouté des données localement ET en production, vous voulez tout combiner.

```
Choix: 4 (Local → Production MERGE)

Étapes :
1. ✅ Backup automatique de la production
2. 🔀 Pour chaque document local:
   - Si existe en prod (même _id) → Mise à jour
   - Si nouveau → Insertion
3. ✅ Les documents uniquement en prod sont conservés
```

**✅ Avantage** : Aucune perte de données !

### Scénario 5 : Backup avant une opération risquée

**Situation** : Vous allez faire une grosse modification, vous voulez sauvegarder d'abord.

```
Choix: 8 (Backup Local + Production)

Résultat :
📦 Backup de la base local...
   ✅ Backup: local_users_2025-11-27T14-30-00.json (14 documents)
   ✅ Backup: local_documents_2025-11-27T14-30-00.json (6 documents)
   ...

📦 Backup de la base production...
   ✅ Backup: production_users_2025-11-27T14-30-00.json (8 documents)
   ...
```

**Fichiers** : Sauvegardés dans `scripts/backups/`

## 🛡️ Sécurité

### Protection contre les erreurs

1. **Backup automatique** avant toute synchronisation destructive
2. **Confirmation explicite** pour les opérations REPLACE (tapez "OUI")
3. **Fichiers JSON** : Backup au format lisible et récupérable
4. **Horodatage** : Chaque backup a un timestamp unique

### Restaurer depuis un backup

Si vous voulez restaurer depuis un backup JSON :

```bash
# Exemple : Restaurer la collection users
mongoimport --db cerer_archivage --collection users --file scripts/backups/local_users_2025-11-27T14-30-00.json --jsonArray
```

## 🔧 Comment ça fonctionne ?

### Architecture du script

```
┌─────────────────┐
│  MENU PRINCIPAL │
└────────┬────────┘
         │
    ┌────▼─────────────────────────────┐
    │ Connexion Local + Production     │
    └────┬─────────────────────────────┘
         │
    ┌────▼────────────────────────┐
    │ Option choisie :            │
    │                             │
    │ 1. Comparer                 │──► compareAllCollections()
    │ 2. Sync Local→Prod REPLACE  │──► backupDatabase() → syncAllCollections(replace)
    │ 3. Sync Prod→Local REPLACE  │──► backupDatabase() → syncAllCollections(replace)
    │ 4. Sync Local→Prod MERGE    │──► backupDatabase() → syncAllCollections(merge)
    │ 5. Sync Prod→Local MERGE    │──► backupDatabase() → syncAllCollections(merge)
    │ 6-8. Backups                │──► backupDatabase()
    │ 9. Test connexion           │──► listCollections()
    └─────────────────────────────┘
```

### Mode REPLACE vs MERGE

#### Mode REPLACE

```javascript
// Pseudo-code
1. DELETE * FROM target_collection
2. INSERT INTO target_collection VALUES (all_source_documents)
```

**Résultat** : Target = Source (copie exacte)

#### Mode MERGE

```javascript
// Pseudo-code
FOR EACH document IN source {
    IF EXISTS(document._id IN target) {
        UPDATE target WHERE _id = document._id
    } ELSE {
        INSERT INTO target VALUES (document)
    }
}
```

**Résultat** : Target = Target ∪ Source (union)

### Exemple concret

**Avant synchronisation :**

```
LOCAL (users):
- { _id: "1", nom: "Alice", email: "alice@local.com" }
- { _id: "2", nom: "Bob", email: "bob@local.com" }

PRODUCTION (users):
- { _id: "2", nom: "Bob", email: "bob@prod.com" }
- { _id: "3", nom: "Charlie", email: "charlie@prod.com" }
```

**Après REPLACE (Local → Prod) :**

```
PRODUCTION (users):
- { _id: "1", nom: "Alice", email: "alice@local.com" }
- { _id: "2", nom: "Bob", email: "bob@local.com" }

❌ Charlie a disparu !
```

**Après MERGE (Local → Prod) :**

```
PRODUCTION (users):
- { _id: "1", nom: "Alice", email: "alice@local.com" }   ← Ajouté
- { _id: "2", nom: "Bob", email: "bob@local.com" }       ← Mis à jour
- { _id: "3", nom: "Charlie", email: "charlie@prod.com" } ← Conservé

✅ Personne n'a disparu !
```

## 🎯 Cas d'usage recommandés

| Situation | Option recommandée | Raison |
|-----------|-------------------|--------|
| Nouveau déploiement | 2 (Local → Prod REPLACE) | Copie exacte |
| Nouvelle machine de dev | 3 (Prod → Local REPLACE) | Récupérer les données |
| Ajout de nouveaux users local | 4 (Local → Prod MERGE) | Conserver les deux |
| Récupérer nouveaux docs prod | 5 (Prod → Local MERGE) | Conserver les deux |
| Avant une grosse modif | 8 (Backup complet) | Sécurité |
| Vérifier les différences | 1 (Comparer) | Diagnostic |

## ⚠️ Précautions

### Avant de synchroniser

1. ✅ **Faites un backup** (option 8)
2. ✅ **Comparez** d'abord (option 1)
3. ✅ **Vérifiez** que vous synchronisez dans le bon sens
4. ✅ **Testez** d'abord avec MERGE si vous hésitez

### Erreurs courantes

**Erreur : "connect ECONNREFUSED"**
```
→ Solution : MongoDB local n'est pas démarré
→ Lancer : mongod
```

**Erreur : "Authentication failed"**
```
→ Solution : Mauvais identifiants pour Atlas
→ Vérifier : L'URI de production dans le script
```

**Erreur : "IP not whitelisted"**
```
→ Solution : Votre IP n'est pas autorisée sur Atlas
→ Aller sur : MongoDB Atlas → Network Access → Add IP
```

## 📞 Support

Si vous rencontrez des problèmes :

1. Vérifiez les logs dans la console
2. Consultez les backups dans `scripts/backups/`
3. Testez la connexion (option 9)
4. Vérifiez que MongoDB local est démarré

## 🔄 Workflow recommandé

### Développement quotidien

```
1. Travailler en LOCAL
2. Tester en LOCAL
3. Comparer (option 1)
4. Backup (option 8)
5. Synchroniser Local → Prod MERGE (option 4)
6. Vérifier en production
```

### Récupération après problème

```
1. Aller dans scripts/backups/
2. Trouver le bon fichier de backup
3. Utiliser mongoimport pour restaurer
4. Ou utiliser MERGE depuis le backup
```

---

✅ **Script prêt à l'emploi !**
🔒 **Sécurisé avec backups automatiques**
🎯 **Flexible avec modes REPLACE et MERGE**
