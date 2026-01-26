# Guide MongoDB Atlas Backup - C.E.R.E.R

MongoDB Atlas inclut des **sauvegardes automatiques gratuites** pour tous les clusters. Ce guide vous explique comment les utiliser.

## 📋 Table des matières

1. [Comprendre les sauvegardes Atlas](#comprendre-les-sauvegardes-atlas)
2. [Vérifier que les sauvegardes sont activées](#vérifier-que-les-sauvegardes-sont-activées)
3. [Accéder aux sauvegardes](#accéder-aux-sauvegardes)
4. [Restaurer une sauvegarde](#restaurer-une-sauvegarde)
5. [Télécharger une sauvegarde](#télécharger-une-sauvegarde)
6. [Automatisation avec l'API Atlas](#automatisation-avec-lapi-atlas)
7. [Bonnes pratiques](#bonnes-pratiques)

---

## 🎯 Comprendre les sauvegardes Atlas

### Types de sauvegardes selon votre plan

| Plan | Type de backup | Rétention | Fréquence |
|------|----------------|-----------|-----------|
| **M0 (Gratuit)** | Cloud Backup | 24-48h | Continue |
| **M2/M5** | Cloud Backup | Configurable | Continue |
| **M10+** | Cloud Backup + Snapshots | 7-365 jours | Configurable |

### Qu'est-ce qui est sauvegardé ?

- ✅ Toutes les collections de votre base de données
- ✅ Tous les index
- ✅ Toutes les données
- ✅ Configuration de la base
- ✅ Point de restauration précis (PITR - Point In Time Recovery)

---

## ✅ Vérifier que les sauvegardes sont activées

### Étape 1 : Se connecter à MongoDB Atlas

1. Allez sur : https://cloud.mongodb.com
2. Connectez-vous avec vos identifiants
3. Sélectionnez votre organisation et projet

### Étape 2 : Accéder à votre cluster

1. Dans le menu de gauche, cliquez sur **"Database"**
2. Vous devriez voir votre cluster (probablement nommé `Cluster0`)

### Étape 3 : Vérifier les sauvegardes

#### Pour les clusters M0 (Gratuit) :

Les sauvegardes sont automatiquement activées mais limitées :
- **Rétention** : 24-48 heures
- **Type** : Sauvegarde continue (Continuous Backup)
- **Pas de configuration nécessaire** - C'est automatique !

#### Pour les clusters M10+ :

1. Cliquez sur votre cluster
2. Cliquez sur l'onglet **"Backup"**
3. Vous devriez voir :
   - **Status** : "Enabled" (vert)
   - Liste des snapshots disponibles
   - Calendrier de rétention

### Étape 4 : Vérifier visuellement

```
┌─────────────────────────────────────────┐
│  Database                               │
│  ┌────────────────────────────────────┐ │
│  │ Cluster0           [Browse]  [...]│ │
│  │ M0 Sandbox - Shared              │ │
│  │ ● Running                         │ │
│  │                                   │ │
│  │ Backup: ✅ Enabled               │ │
│  └────────────────────────────────────┘ │
└─────────────────────────────────────────┘
```

---

## 📂 Accéder aux sauvegardes

### Méthode 1 : Via l'interface Atlas (Recommandé)

1. **Connectez-vous** à https://cloud.mongodb.com
2. **Sélectionnez** votre cluster
3. **Cliquez** sur l'onglet **"Backup"** ou **"Continuous Backup"**

Vous verrez :
```
┌──────────────────────────────────────────────────┐
│ Continuous Backup                                │
│                                                  │
│ 📅 Latest Snapshot: 30/11/2025 14:32:15 GMT    │
│ 💾 Size: 2.5 MB                                 │
│                                                  │
│ Available Recovery Points:                       │
│ ─────────────────────────────────                │
│ • 30/11/2025 14:00:00                           │
│ • 30/11/2025 12:00:00                           │
│ • 30/11/2025 10:00:00                           │
│ • 29/11/2025 22:00:00                           │
│                                                  │
│ [Restore to New Cluster] [Download Snapshot]    │
└──────────────────────────────────────────────────┘
```

### Méthode 2 : Via l'API Atlas (Automatisation)

Voir la section [Automatisation avec l'API Atlas](#automatisation-avec-lapi-atlas) ci-dessous.

---

## 🔄 Restaurer une sauvegarde

### ⚠️ IMPORTANT : Avant de restaurer

**La restauration crée toujours un NOUVEAU cluster**, elle ne modifie pas votre cluster existant. C'est une sécurité pour éviter les pertes de données.

### Procédure de restauration

#### Étape 1 : Sélectionner le point de restauration

1. Allez sur l'onglet **"Backup"** de votre cluster
2. **Choisissez** un snapshot ou un moment précis (Point In Time)
3. Cliquez sur **"Restore"** ou **"Restore to..."**

#### Étape 2 : Choisir la méthode

Vous avez 3 options :

##### Option A : Restaurer vers un nouveau cluster (Recommandé)

```
Avantages :
✅ Ne touche pas au cluster de production
✅ Permet de vérifier les données avant migration
✅ Sécurisé

Inconvénients :
❌ Nécessite de changer l'URI MongoDB temporairement
```

**Procédure :**
1. Sélectionnez **"Restore to a new cluster"**
2. Donnez un nom : `Cluster0-Restored-20251130`
3. Choisissez la même configuration que votre cluster actuel
4. Cliquez sur **"Restore"**
5. Attendez 5-15 minutes (selon la taille)
6. Testez le nouveau cluster
7. Si OK, basculez votre application vers ce cluster

##### Option B : Télécharger le snapshot

```
Avantages :
✅ Vous contrôlez totalement la restauration
✅ Permet de restaurer localement pour tests

Inconvénients :
❌ Nécessite mongorestore en local
❌ Plus manuel
```

**Procédure :**
1. Cliquez sur **"Download"** à côté du snapshot
2. Téléchargez l'archive (.tar.gz ou .zip)
3. Décompressez localement
4. Utilisez `mongorestore` :

```bash
mongorestore --uri="VOTRE_MONGODB_URI" --drop /chemin/vers/backup
```

##### Option C : Restauration automatisée (Clusters M10+)

Pour les clusters payants, vous pouvez :
- Définir des points de restauration
- Restauration à une seconde près
- Restauration programmée

#### Étape 3 : Basculer l'application (si restauration vers nouveau cluster)

1. **Testez** le nouveau cluster :
```bash
# Connectez-vous au cluster restauré
mongosh "mongodb+srv://cluster0-restored.mongodb.net"

# Vérifiez les données
use cerer_archivage
db.documents.countDocuments()
db.users.find().limit(5)
```

2. **Mettez à jour** votre fichier `.env` :
```env
# Ancien cluster (backup)
# MONGODB_URI=mongodb+srv://cluster0.eq69ixv.mongodb.net/...

# Nouveau cluster restauré
MONGODB_URI=mongodb+srv://cluster0-restored.mongodb.net/...
```

3. **Redéployez** l'application sur Render

4. **Vérifiez** que tout fonctionne

5. **Supprimez** l'ancien cluster si tout est OK

---

## 💾 Télécharger une sauvegarde

### Pourquoi télécharger ?

- 📦 Conserver une copie locale
- 🔒 Sécurité supplémentaire
- 🧪 Tests en local
- 📊 Analyse de données

### Comment télécharger

#### Via l'interface Atlas

1. Onglet **"Backup"**
2. Sélectionnez un snapshot
3. Cliquez sur **"..."** → **"Download"**
4. Choisissez le format :
   - **Archive complète** (.tar.gz) - Recommandé
   - **Par collection** - Si vous voulez juste certaines collections

5. Le téléchargement démarre (peut prendre plusieurs minutes selon la taille)

#### Via l'API Atlas

Voir la section suivante.

---

## 🤖 Automatisation avec l'API Atlas

MongoDB Atlas fournit une API REST complète pour gérer les sauvegardes.

### Prérequis

1. **Créer une clé API** :
   - Allez sur https://cloud.mongodb.com
   - **Organization** → **Access Manager** → **API Keys**
   - Cliquez sur **"Create API Key"**
   - Nom : `Backup Automation`
   - Permissions : `Organization Read Only` ou `Project Owner`
   - **Notez** la Public Key et Private Key

2. **Récupérer les IDs** :
   - **Organization ID** : Dans l'URL Atlas
   - **Project ID** : Settings → Project Settings
   - **Cluster Name** : Nom de votre cluster (ex: `Cluster0`)

### Script de vérification des backups

Je vais créer un script qui vérifie automatiquement vos sauvegardes Atlas.

### Configuration

Ajoutez dans votre `.env` :

```env
# MongoDB Atlas API (pour automatisation backups)
ATLAS_PUBLIC_KEY=votre_public_key
ATLAS_PRIVATE_KEY=votre_private_key
ATLAS_PROJECT_ID=votre_project_id
ATLAS_CLUSTER_NAME=Cluster0
```

---

## ✅ Bonnes pratiques

### 1. Vérification régulière

- ✅ Vérifiez **chaque semaine** que les sauvegardes se font bien
- ✅ Testez **une restauration tous les mois** (vers un cluster de test)

### 2. Documentation

- ✅ Documentez la procédure de restauration pour votre équipe
- ✅ Notez les URIs de connexion des clusters

### 3. Alertes

- ✅ Configurez des **alertes Atlas** en cas de problème de backup
  - Atlas → Alerts → Create Alert
  - Type : "Backup"
  - Action : Email

### 4. Sauvegardes multiples (Defense in Depth)

Pour une sécurité maximale, combinez :

1. **MongoDB Atlas Backup** (automatique) ← Principal
2. **Export manuel mensuel** (via `mongodump`) ← Sécurité supplémentaire
3. **Snapshot de données critiques** (export JSON/CSV des tables importantes)

### 5. Plan de reprise d'activité (PRA)

Documentez :
```
1. Qui a accès aux sauvegardes ? → Admin MongoDB Atlas
2. Procédure de restauration d'urgence → Ce guide
3. RTO (Recovery Time Objective) → Temps max acceptable : 2h
4. RPO (Recovery Point Objective) → Perte de données max : 1h
5. Contact d'urgence → admin@cerer.sn
```

---

## 🔐 Sécurité

### Protection des accès

1. **Authentification à deux facteurs (2FA)** sur Atlas
   - Account → Security → Two-Factor Authentication

2. **Limitation des IPs**
   - Network Access → IP Access List
   - Ajoutez uniquement les IPs autorisées

3. **Rotation des clés API**
   - Changez les clés API tous les 6 mois

### Chiffrement

- ✅ Les sauvegardes Atlas sont **chiffrées au repos** (AES-256)
- ✅ Les transferts sont **chiffrés en transit** (TLS/SSL)

---

## 🆘 Dépannage

### "Backup non disponible"

**Cause** : Cluster M0 gratuit avec rétention de 24-48h seulement

**Solution** :
- Les sauvegardes expirent après 48h sur le plan gratuit
- Envisagez de passer à M2/M5 pour plus de rétention

### "Impossible de télécharger le snapshot"

**Cause** : Le snapshot est en cours de création

**Solution** :
- Attendez que le statut passe à "Completed"
- Réessayez dans 5-10 minutes

### "Cluster not found" lors de la restauration

**Cause** : Le cluster a été supprimé ou renommé

**Solution** :
- Vérifiez le nom exact du cluster
- Vérifiez que vous êtes dans le bon projet

---

## 📞 Support

### Documentation officielle MongoDB Atlas

- Guide des sauvegardes : https://docs.atlas.mongodb.com/backup/
- API Atlas : https://docs.atlas.mongodb.com/api/

### Support MongoDB

- Chat en direct : https://cloud.mongodb.com (icône en bas à droite)
- Forum communautaire : https://www.mongodb.com/community/forums/

### Contact C.E.R.E.R

- Email : admin@cerer.sn

---

## 📊 Récapitulatif

| Tâche | Fréquence | Action |
|-------|-----------|--------|
| **Vérifier les backups** | Hebdomadaire | Se connecter à Atlas → Backup |
| **Tester une restauration** | Mensuelle | Restaurer vers cluster de test |
| **Vérifier les alertes** | Quotidienne | Consulter emails Atlas |
| **Export manuel** | Mensuelle | `mongodump` local |
| **Audit de sécurité** | Trimestrielle | Vérifier accès, clés API |

---

**Vous êtes maintenant protégé avec MongoDB Atlas Backup !** 🎉

Les sauvegardes se font automatiquement, vous n'avez rien à faire au quotidien.

**Prochaine étape** : Vérifiez maintenant que vos sauvegardes sont bien présentes en vous connectant à Atlas.

---

**Dernière mise à jour : 30 Novembre 2025**
