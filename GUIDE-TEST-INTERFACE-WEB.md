# 🧪 GUIDE DE TEST - INTERFACE WEB
## Nouvelles Fonctionnalités: Partage & Validation de Suppression

Date: 2025-10-31

---

## 🚀 DÉMARRAGE

### 1. Démarrer le serveur

```bash
cd "C:\Users\HP\Desktop\Nouveau dossier (6)\config_fichier\backend"
node server.js
```

**Résultat attendu :**
```
✅ SERVEUR ARCHIVAGE C.E.R.E.R DÉMARRÉ (MCD)
🔡 http://localhost:4000
```

### 2. Ouvrir le navigateur

Ouvrir **Google Chrome** ou **Firefox** et aller sur :
```
http://localhost:4000
```

---

## 📋 TESTS À EFFECTUER

---

## ✅ TEST 1 : PARTAGE INTERDÉPARTEMENTAL NIVEAU 1

**Objectif :** Vérifier que les utilisateurs niveau 1 peuvent voir les documents des autres niveau 1.

### Étape 1 : Se connecter avec Fatima (Niveau 1, Direction)

1. Sur la page d'accueil, entrer :
   - **Username:** `fatima`
   - **Password:** `1234`

2. Cliquer sur **"Se connecter"**

3. ✅ **Vérifier** : Message de bienvenue "Bienvenue Fatima!"

### Étape 2 : Créer un document test

1. Cliquer sur **"Ajouter un document"** ou **"➕"**

2. Remplir le formulaire :
   - **Titre:** `Document Test Direction - Fatima`
   - **Catégorie:** `Autre`
   - **Description:** `Test partage interdépartemental`
   - **Fichier:** Choisir n'importe quel fichier PDF ou image

3. Cliquer sur **"Enregistrer"**

4. ✅ **Vérifier** : Document créé avec succès

### Étape 3 : Se déconnecter

1. Cliquer sur **"Déconnexion"** ou **"🚪"**

### Étape 4 : Se connecter avec JBK (Niveau 1, Comptabilité)

1. Se connecter avec :
   - **Username:** `jbk`
   - **Password:** `0811`

2. ✅ **VÉRIFIER :** JBK peut voir le document de Fatima !

3. **Chercher le document** : "Document Test Direction - Fatima"

4. ✅ **RÉSULTAT ATTENDU :**
   - Le document apparaît dans la liste
   - Il porte un badge **"🔄 Interdépartemental"** ou **"🔄 Niveau 1"**
   - Indication : "Archivé par : Fatima"

**📸 Capture d'écran attendue :**
```
┌─────────────────────────────────────────┐
│ 📄 Document Test Direction - Fatima    │
│ 🔄 Niveau 1   📅 31/10/2025           │
│ Archivé par: Fatima (Direction)        │
│ Catégorie: Autre                        │
└─────────────────────────────────────────┘
```

**✅ TEST RÉUSSI SI :**
- JBK voit le document de Fatima
- Le badge "🔄" est affiché
- JBK peut télécharger le document

---

## ✅ TEST 2 : PARTAGE HORIZONTAL (Même niveau, même département)

**Objectif :** Vérifier que les utilisateurs du même niveau peuvent partager leurs documents.

### Étape 1 : Créer deux utilisateurs niveau 2

**Malheureusement, l'interface d'inscription nécessite un mot de passe admin.**

**Solution :** Utiliser les utilisateurs de test créés automatiquement :
- `test_niveau2_a` (Niveau 2, Comptabilité)
- `test_niveau2_b` (Niveau 2, Comptabilité)

**OU** créer via la console Node.js (voir section bonus)

### Étape 2 : Se connecter avec test_niveau2_a

1. Se connecter :
   - **Username:** `test_niveau2_a`
   - **Password:** N'a pas de mot de passe pour l'instant

**ATTENDEZ ! Il faut d'abord créer ces utilisateurs avec des mots de passe.**

---

## 🔧 CRÉATION D'UTILISATEURS DE TEST

Ouvrir une nouvelle fenêtre de terminal et exécuter :

```bash
node -e "
const { MongoClient } = require('mongodb');
const bcrypt = require('bcrypt');

async function createTestUsers() {
    const client = await MongoClient.connect('mongodb://localhost:27017');
    const db = client.db('cerer_archivage');
    const users = db.collection('users');
    const roles = db.collection('roles');
    const depts = db.collection('departements');

    const niveau2Role = await roles.findOne({ niveau: 2 });
    const comptaDept = await depts.findOne({ nom: 'Comptabilité' });

    // Utilisateur A
    const userA = await users.findOne({ username: 'alice' });
    if (!userA) {
        await users.insertOne({
            username: 'alice',
            password: await bcrypt.hash('1111', 10),
            nom: 'Alice Dupont',
            email: 'alice@cerer.sn',
            idRole: niveau2Role._id,
            idDepartement: comptaDept._id,
            dateCreation: new Date()
        });
        console.log('✅ Alice créée (niveau 2, Comptabilité)');
    }

    // Utilisateur B
    const userB = await users.findOne({ username: 'bob' });
    if (!userB) {
        await users.insertOne({
            username: 'bob',
            password: await bcrypt.hash('2222', 10),
            nom: 'Bob Martin',
            email: 'bob@cerer.sn',
            idRole: niveau2Role._id,
            idDepartement: comptaDept._id,
            dateCreation: new Date()
        });
        console.log('✅ Bob créé (niveau 2, Comptabilité)');
    }

    await client.close();
}

createTestUsers();
"
```

### Maintenant, tester le partage horizontal

1. **Se connecter avec Alice :**
   - Username: `alice`
   - Password: `1111`

2. **Créer un document :**
   - Titre: `Facture Test - Alice`
   - Catégorie: Factures
   - Ajouter un fichier

3. **Se déconnecter**

4. **Se connecter avec Bob :**
   - Username: `bob`
   - Password: `2222`

5. ✅ **VÉRIFIER :** Bob voit le document d'Alice !
   - Badge **"🤝 Partagé"** ou **"🤝 Collègue"**
   - Indication : "Archivé par : Alice Dupont"

**✅ TEST RÉUSSI SI :**
- Bob voit le document d'Alice
- Le badge de partage est affiché
- Les deux sont niveau 2 dans le même département

---

## ✅ TEST 3 : DEMANDE DE SUPPRESSION (Niveau 2/3)

**Objectif :** Vérifier que les niveaux 2/3 doivent demander l'autorisation pour supprimer.

### Étape 1 : Se connecter avec Deguene (Niveau 3)

1. Se connecter :
   - **Username:** `deguene`
   - **Password:** `3576`

### Étape 2 : Créer un document à supprimer

1. Créer un document :
   - Titre: `Document à supprimer - Test`
   - Catégorie: Autre
   - Ajouter un fichier

2. ✅ **Vérifier :** Document créé

### Étape 3 : Tenter de supprimer le document

1. Cliquer sur le document créé

2. Cliquer sur le bouton **"Supprimer"** ou **"🗑️"**

3. Confirmer la suppression

4. ✅ **VÉRIFIER :** Un message apparaît :
   ```
   📝 Demande de suppression créée.
   Un utilisateur de niveau 1 doit l'approuver.
   ```

5. ✅ **VÉRIFIER :** Le document est TOUJOURS dans la liste (pas supprimé)

**✅ TEST RÉUSSI SI :**
- Message de demande créée
- Document non supprimé
- Pas d'erreur

---

## ✅ TEST 4 : APPROBATION DE DEMANDE (Niveau 1)

**Objectif :** Vérifier qu'un niveau 1 peut approuver les demandes.

### Étape 1 : Se déconnecter de Deguene

1. Cliquer sur **"Déconnexion"**

### Étape 2 : Se connecter avec JBK (Niveau 1, Comptabilité)

1. Se connecter :
   - **Username:** `jbk`
   - **Password:** `0811`

### Étape 3 : Ouvrir la page des demandes

**Option A : Si vous avez modifié l'interface principale**
1. Chercher un bouton **"📝 Demandes"** dans le menu
2. Cliquer dessus

**Option B : Utiliser la page de démonstration**
1. Ouvrir : `http://localhost:4000/demo-deletion-requests.html`
2. Se connecter avec JBK

### Étape 4 : Voir les demandes

✅ **VÉRIFIER :**
```
┌────────────────────────────────────────────┐
│ 📝 Demandes de suppression            [1] │
├────────────────────────────────────────────┤
│ 📄 Document à supprimer - Test            │
│ Demandé par: Deguene                      │
│ Date: 31/10/2025 12:30                    │
│ Motif: Non spécifié                       │
│                                            │
│ [✅ Approuver]  [❌ Rejeter]              │
└────────────────────────────────────────────┘
```

### Étape 5 : Approuver la demande

1. Cliquer sur **"✅ Approuver"**

2. Confirmer

3. ✅ **VÉRIFIER :**
   - Message : "✅ Document supprimé avec succès"
   - La demande disparaît de la liste
   - Le document est supprimé

### Étape 6 : Vérifier que le document est supprimé

1. Aller dans **"📄 Documents"**

2. ✅ **VÉRIFIER :** "Document à supprimer - Test" n'est plus dans la liste

**✅ TEST RÉUSSI SI :**
- JBK voit la demande de Deguene
- JBK peut approuver
- Le document est supprimé
- Notification de succès

---

## ✅ TEST 5 : REJET DE DEMANDE (Niveau 1)

**Objectif :** Vérifier qu'un niveau 1 peut rejeter les demandes.

### Étape 1 : Deguene crée une nouvelle demande

1. Se connecter avec **Deguene** (`deguene` / `3576`)

2. Créer un document :
   - Titre: `Document important - NE PAS SUPPRIMER`

3. Tenter de le supprimer

4. ✅ **Vérifier :** Demande créée

### Étape 2 : JBK rejette la demande

1. Se connecter avec **JBK** (`jbk` / `0811`)

2. Aller dans **"📝 Demandes"** ou `demo-deletion-requests.html`

3. Cliquer sur **"❌ Rejeter"**

4. Entrer un motif : `Document encore nécessaire pour l'audit`

5. Confirmer

6. ✅ **VÉRIFIER :**
   - Message : "❌ Demande de suppression rejetée"
   - La demande disparaît de la liste

### Étape 3 : Vérifier que le document existe toujours

1. Se déconnecter et se reconnecter avec **Deguene**

2. ✅ **VÉRIFIER :** Le document "Document important" est toujours là

**✅ TEST RÉUSSI SI :**
- JBK peut rejeter
- Le document n'est PAS supprimé
- Notification de rejet

---

## ✅ TEST 6 : SUPPRESSION DIRECTE NIVEAU 1

**Objectif :** Vérifier qu'un niveau 1 peut supprimer directement sans demande.

### Étape 1 : Se connecter avec Fatima (Niveau 1)

1. Se connecter : `fatima` / `1234`

### Étape 2 : Créer un document

1. Créer : "Document Test Suppression Directe"

### Étape 3 : Supprimer immédiatement

1. Cliquer sur le document

2. Cliquer sur **"Supprimer"**

3. Confirmer

4. ✅ **VÉRIFIER :**
   - Message : "✅ Document supprimé avec succès"
   - Le document disparaît IMMÉDIATEMENT
   - AUCUNE demande créée

**✅ TEST RÉUSSI SI :**
- Suppression instantanée
- Pas de message "demande créée"
- Document effacé

---

## 📊 TABLEAU RÉCAPITULATIF DES TESTS

| Test | Objectif | Utilisateurs | Résultat attendu | Statut |
|------|----------|--------------|------------------|--------|
| 1 | Partage interdépartemental | Fatima + JBK | JBK voit docs Fatima | ⏳ |
| 2 | Partage horizontal | Alice + Bob | Bob voit docs Alice | ⏳ |
| 3 | Demande de suppression | Deguene | Demande créée, doc non supprimé | ⏳ |
| 4 | Approbation | JBK | Document supprimé | ⏳ |
| 5 | Rejet | JBK | Document conservé | ⏳ |
| 6 | Suppression directe | Fatima | Suppression immédiate | ⏳ |

---

## 🐛 DÉPANNAGE

### Problème : "Erreur de connexion"

**Solution :**
```bash
# Vérifier que le serveur tourne
# Dans le terminal, vous devez voir :
✅ SERVEUR ARCHIVAGE C.E.R.E.R DÉMARRÉ
```

### Problème : "Les demandes ne s'affichent pas"

**Solution :**
1. Utiliser la page de démo : `http://localhost:4000/demo-deletion-requests.html`
2. Vérifier la console du navigateur (F12)

### Problème : "Document non supprimé après approbation"

**Solution :**
1. Rafraîchir la page (F5)
2. Vérifier les logs du serveur
3. Se reconnecter

---

## 📝 NOTES IMPORTANTES

### Utilisateurs disponibles par défaut :

| Username | Password | Niveau | Département | Utilisation |
|----------|----------|--------|-------------|-------------|
| fatima | 1234 | 1 (Primaire) | Direction | Tests niveau 1 |
| awa | 5746 | 1 (Primaire) | Direction | Tests niveau 1 |
| jbk | 0811 | 1 (Primaire) | Comptabilité | Tests niveau 1 + approbations |
| deguene | 3576 | 3 (Tertiaire) | Comptabilité | Tests demandes |
| alice | 1111 | 2 (Secondaire) | Comptabilité | Tests partage horizontal |
| bob | 2222 | 2 (Secondaire) | Comptabilité | Tests partage horizontal |

---

## ✅ CHECKLIST FINALE

Après avoir effectué tous les tests :

- [ ] Partage interdépartemental niveau 1 fonctionne
- [ ] Partage horizontal même niveau fonctionne
- [ ] Niveau 2/3 créent des demandes (pas de suppression directe)
- [ ] Niveau 1 voit les demandes
- [ ] Niveau 1 peut approuver les demandes
- [ ] Niveau 1 peut rejeter les demandes
- [ ] Niveau 1 peut supprimer directement
- [ ] Les badges s'affichent correctement
- [ ] Les notifications fonctionnent

---

## 🎉 FÉLICITATIONS !

Si tous les tests sont ✅, votre système de partage et de validation est **parfaitement opérationnel** !

---

**Développé par le Service Informatique du C.E.R.E.R**
**Date : 2025-10-31**
