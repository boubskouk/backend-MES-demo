# 🛡️ GUIDE DE GESTION DES SUPER ADMINISTRATEURS

> **Guide complet pour créer et supprimer des Super Admins (Niveau 0)**

---

## 📌 IMPORTANT : Pourquoi ces scripts ?

### 🔒 Sécurité maximale

Les Super Administrateurs (niveau 0) ont **TOUS les pouvoirs** sur le système :
- Créer des départements principaux
- Créer des utilisateurs de niveau 1, 2 et 3
- Gérer tous les documents et paramètres
- Accès complet à toutes les fonctionnalités

**Pour cette raison :**
- ❌ Ils **NE PEUVENT PAS** être créés via l'interface web
- ❌ Ils **NE PEUVENT PAS** être créés via l'API
- ✅ Ils **NE PEUVENT** être créés **QUE** via des scripts dédiés

---

## 📋 TABLE DES MATIÈRES

1. [Créer un Super Admin](#1-créer-un-super-admin)
2. [Supprimer un Super Admin](#2-supprimer-un-super-admin-compte-compromis)
3. [Questions fréquentes (FAQ)](#3-questions-fréquentes-faq)
4. [Bonnes pratiques](#4-bonnes-pratiques)

---

# 1. 🆕 CRÉER UN SUPER ADMIN

## Quand l'utiliser ?

- ✅ Créer le **premier** Super Admin du système
- ✅ Ajouter un **deuxième** Super Admin pour redondance
- ✅ Remplacer un Super Admin qui a quitté l'organisation
- ✅ Créer un Super Admin de secours

## Comment l'utiliser ?

### Étape 1 : Ouvrir le terminal

```bash
cd "E:\site et apps\archivage cerer\backend"
```

### Étape 2 : Lancer le script

```bash
npm run create-superadmin
```

### Étape 3 : Suivre les instructions

Le script va vous demander :

#### 📝 1. Nom d'utilisateur (username)

```
📝 Nom d'utilisateur (username) : _
```

**Règles :**
- Minimum **3 caractères**
- Uniquement lettres, chiffres, tirets (-) et underscores (_)
- **Doit être unique** (pas de doublon)
- Exemples valides : `admin`, `superadmin`, `admin_principal`
- Exemples invalides : `ad` (trop court), `ad min` (contient un espace)

#### 👤 2. Nom complet

```
👤 Nom complet : _
```

**Règles :**
- Minimum **2 caractères**
- Peut contenir espaces et accents
- Exemples : `Jean Dupont`, `Marie-Claire Sène`

#### 📧 3. Email

```
📧 Email : _
```

**Règles :**
- Format email valide (exemple@domaine.com)
- **Doit être unique** (pas de doublon)
- Sera converti en minuscules automatiquement
- Exemples : `admin@cerer.sn`, `superadmin@example.com`

#### 🔐 4. Mot de passe

```
🔐 Mot de passe (minimum 6 caractères) : ******
```

**Règles :**
- Minimum **6 caractères**
- Caractères masqués (affichés comme ***)
- **Recommandé** : 12+ caractères avec majuscules, chiffres et symboles
- Exemple : `Admin@2024!Secure`

#### 🔐 5. Confirmation du mot de passe

```
🔐 Confirmer le mot de passe : ******
```

**Important :**
- Doit être **identique** au mot de passe saisi précédemment
- Si différent, vous devrez ressaisir les deux

### Étape 4 : Vérifier le résumé

```
📋 ========================================
   RÉSUMÉ DES INFORMATIONS
   ========================================
   Username  : admin_principal
   Nom       : Jean Dupont
   Email     : admin@cerer.sn
   Rôle      : Super Admin (Niveau 0)
   ========================================

✅ Confirmer la création de ce Super Admin ? (oui/non) : _
```

- Tapez **`oui`** pour confirmer
- Tapez **`non`** pour annuler

### Étape 5 : Succès !

```
✅ ========================================
   SUPER ADMIN CRÉÉ AVEC SUCCÈS ! 🎉
   ========================================
   ID        : 507f1f77bcf86cd799439011
   Username  : admin_principal
   Email     : admin@cerer.sn
   ========================================

   🔐 Vous pouvez maintenant vous connecter avec ces identifiants.
   🌐 URL : http://localhost:4000/super-admin-login.html
```

## 📊 Si des Super Admins existent déjà

Le script affichera d'abord la liste :

```
📋 ========================================
   SUPER ADMINS EXISTANTS (2)
   ========================================
   1. Username : admin
      Nom      : Admin Principal
      Email    : admin@cerer.sn

   2. Username : admin2
      Nom      : Admin Secondaire
      Email    : admin2@cerer.sn

   ========================================

ℹ️  Vous pouvez créer un Super Admin supplémentaire.
```

Vous pouvez ensuite créer un Super Admin supplémentaire normalement.

---

# 2. 🗑️ SUPPRIMER UN SUPER ADMIN (Compte compromis)

## Quand l'utiliser ?

- ⚠️ Un Super Admin a été **compromis** (mot de passe volé)
- ⚠️ Un Super Admin a **quitté** l'organisation
- ⚠️ Un compte Super Admin est **inutilisé** et doit être supprimé
- ⚠️ Besoin de **révoquer** les accès d'un Super Admin

## ⚠️ ATTENTION

> **Cette action est IRRÉVERSIBLE !**
>
> Une fois supprimé, le compte ne peut PAS être récupéré.
> Assurez-vous d'avoir au moins UN autre Super Admin avant de supprimer.

## Comment l'utiliser ?

### Étape 1 : Ouvrir le terminal

```bash
cd "E:\site et apps\archivage cerer\backend"
```

### Étape 2 : Lancer le script

```bash
npm run delete-superadmin
```

### Étape 3 : Sélectionner le Super Admin à supprimer

Le script affiche la liste de tous les Super Admins :

```
📋 ========================================
   SUPER ADMINS ACTUELS (3)
   ========================================

   1. Username : admin
      Nom      : Admin Principal
      Email    : admin@cerer.sn
      ID       : 507f1f77bcf86cd799439011

   2. Username : admin2
      Nom      : Admin Secondaire
      Email    : admin2@cerer.sn
      ID       : 507f1f77bcf86cd799439012

   3. Username : admin_compromis
      Nom      : Admin Compromis
      Email    : compromis@cerer.sn
      ID       : 507f1f77bcf86cd799439013

   ========================================

📝 Entrez le numéro du Super Admin à supprimer (1-3) ou 'annuler' : _
```

- Tapez le **numéro** (1, 2, ou 3) du Super Admin à supprimer
- Tapez **`annuler`** pour annuler l'opération

### Étape 4 : Résumé du compte à supprimer

```
🗑️  ========================================
   SUPER ADMIN À SUPPRIMER
   ========================================
   Username : admin_compromis
   Nom      : Admin Compromis
   Email    : compromis@cerer.sn
   ID       : 507f1f77bcf86cd799439013
   ========================================

⚠️  AVERTISSEMENT : Cette action est IRRÉVERSIBLE !
   Le compte sera DÉFINITIVEMENT supprimé de la base de données.
```

### Étape 5 : Triple confirmation (Sécurité)

#### 🔐 Confirmation 1 : Êtes-vous sûr ?

```
✋ Êtes-vous SÛR de vouloir supprimer ce Super Admin ? (oui/non) : _
```

Tapez **`oui`** pour continuer.

#### 🔐 Confirmation 2 : Taper le username

```
🔐 Pour confirmer, tapez le username du Super Admin : "admin_compromis" : _
```

Tapez **exactement** le username affiché (sensible à la casse).

#### 🔐 Confirmation 3 : Taper "SUPPRIMER"

```
⚠️  DERNIÈRE CONFIRMATION
❗ Tapez "SUPPRIMER" en MAJUSCULES pour confirmer : _
```

Tapez exactement **`SUPPRIMER`** en MAJUSCULES.

### Étape 6 : Suppression effectuée

```
✅ ========================================
   SUPER ADMIN SUPPRIMÉ AVEC SUCCÈS !
   ========================================
   Username : admin_compromis
   Nom      : Admin Compromis
   ========================================

📊 Super Admins restants : 2
```

## ⚠️ Cas spécial : Dernier Super Admin

Si vous essayez de supprimer le **dernier** Super Admin, le script affichera :

```
⚠️  ATTENTION : C'est le SEUL Super Admin du système !
   Si vous le supprimez, vous ne pourrez plus administrer le système.
   Assurez-vous d'avoir créé un nouveau Super Admin AVANT de supprimer celui-ci.
```

Vous pouvez toujours continuer, mais vous devrez ensuite recréer un Super Admin avec le script de création.

---

# 3. ❓ QUESTIONS FRÉQUENTES (FAQ)

## Q1 : Combien de Super Admins peut-on créer ?

**R :** Aucune limite ! Vous pouvez créer autant de Super Admins que nécessaire via le script.

**Recommandation :** Avoir au moins **2 Super Admins** pour la redondance.

---

## Q2 : Que se passe-t-il si je supprime tous les Super Admins ?

**R :** Vous ne pourrez plus administrer le système via l'interface web.

**Solution :** Utiliser le script `npm run create-superadmin` pour recréer un Super Admin.

---

## Q3 : Puis-je créer un Super Admin via l'interface web ?

**R :** **NON**. C'est impossible par mesure de sécurité.

Même un Super Admin connecté ne peut pas créer un autre Super Admin via l'interface.

---

## Q4 : Comment puis-je savoir combien de Super Admins existent ?

**R :** Lancez le script `npm run create-superadmin` ou `npm run delete-superadmin`.

Les deux scripts affichent la liste complète des Super Admins existants.

---

## Q5 : Que faire si j'ai oublié le mot de passe d'un Super Admin ?

**R :** Deux options :

**Option 1 (Recommandée) :** Supprimer l'ancien et créer un nouveau Super Admin
```bash
npm run delete-superadmin
npm run create-superadmin
```

**Option 2 :** Utiliser un autre Super Admin pour accéder au système (si vous en avez plusieurs).

---

## Q6 : Un Super Admin peut-il se supprimer lui-même ?

**R :** **NON**. Les Super Admins ne peuvent pas se supprimer via l'interface.

La suppression ne peut se faire QUE via le script `npm run delete-superadmin`.

---

## Q7 : Les scripts fonctionnent-ils en production ?

**R :** **OUI**. Les scripts fonctionnent en local ET en production.

Si vous utilisez MongoDB Atlas (base en ligne), définissez la variable `MONGODB_URI` :
```bash
set MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/database
npm run create-superadmin
```

---

# 4. ✅ BONNES PRATIQUES

## 🔐 Sécurité

1. **Mots de passe forts**
   - Minimum 12 caractères
   - Mélange de majuscules, minuscules, chiffres et symboles
   - Exemples : `Super@Admin2024!`, `C3r3r#Adm1n!2024`

2. **Emails professionnels**
   - Utilisez des emails de domaine professionnel (@cerer.sn)
   - Évitez les emails personnels (@gmail.com, @yahoo.fr)

3. **Noms d'utilisateur uniques**
   - Utilisez des noms descriptifs : `admin_principal`, `superadmin_backup`
   - Évitez les noms génériques : `admin`, `root`, `user`

## 🔄 Redondance

1. **Minimum 2 Super Admins**
   - Créez toujours un Super Admin de secours
   - En cas de problème avec un compte, l'autre reste accessible

2. **Documentation**
   - Notez les usernames créés dans un endroit sûr
   - Conservez une trace des Super Admins actifs

3. **Rotation des comptes**
   - Changez les mots de passe régulièrement (tous les 3-6 mois)
   - Supprimez les comptes inutilisés

## 🚨 En cas d'incident

### Scénario 1 : Compte compromis

```bash
# 1. Supprimer immédiatement le compte compromis
npm run delete-superadmin

# 2. Créer un nouveau Super Admin avec de nouveaux identifiants
npm run create-superadmin

# 3. Vérifier les logs pour détecter toute activité suspecte
```

### Scénario 2 : Tous les Super Admins perdus

```bash
# Recréer un Super Admin depuis zéro
npm run create-superadmin
```

### Scénario 3 : Super Admin a quitté l'organisation

```bash
# 1. Créer d'abord un nouveau Super Admin
npm run create-superadmin

# 2. Ensuite supprimer l'ancien
npm run delete-superadmin
```

---

# 📞 SUPPORT

Si vous rencontrez des problèmes avec ces scripts :

1. Vérifiez que MongoDB est accessible
2. Vérifiez que Node.js est installé (`node --version`)
3. Vérifiez que vous êtes dans le bon dossier (`backend`)
4. Consultez les logs d'erreur affichés par le script

---

# 📝 RÉSUMÉ DES COMMANDES

| Action | Commande |
|--------|----------|
| **Créer un Super Admin** | `npm run create-superadmin` |
| **Supprimer un Super Admin** | `npm run delete-superadmin` |
| **Lister les utilisateurs** | `node scripts/list-users-correct.js` |

---

**🛡️ La sécurité de votre système dépend de la gestion prudente des Super Admins !**

*Document créé le : 2024*
*Dernière mise à jour : 2024*
