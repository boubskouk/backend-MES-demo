# 🎓 VALIDATION DOMAINES UNIVERSITAIRES + PREMIÈRE CONNEXION

## 📋 TABLE DES MATIÈRES

1. [Vue d'ensemble](#vue-densemble)
2. [Validation des domaines universitaires](#validation-des-domaines-universitaires)
3. [Notification par email](#notification-par-email)
4. [Première connexion et changement de mot de passe](#première-connexion-et-changement-de-mot-de-passe)
5. [Intégration frontend](#intégration-frontend)
6. [Tests](#tests)

---

## 🎯 VUE D'ENSEMBLE

**Date d'implémentation :** 15 novembre 2025

### Nouvelles fonctionnalités

✅ **Restriction aux universités sénégalaises**
- Liste blanche de domaines universitaires autorisés
- Suggestions automatiques en cas de faute de frappe
- Support des sous-domaines (ex: rh.ucad.sn)

✅ **Notification email automatique**
- Email de bienvenue envoyé lors de la création de compte
- Transmission sécurisée des identifiants
- Design professionnel avec HTML/CSS

✅ **Détection de première connexion**
- Message de bienvenue à la première connexion
- Invitation au changement de mot de passe
- Marquage automatique après première connexion

✅ **Changement de mot de passe sécurisé**
- Route dédiée avec vérification de l'ancien mot de passe
- Validation stricte du nouveau mot de passe
- Traçabilité (date de changement)

---

## 🏛️ VALIDATION DES DOMAINES UNIVERSITAIRES

### Domaines autorisés

```javascript
// Université Cheikh Anta Diop de Dakar (UCAD)
'ucad.sn', 'ucad.edu.sn', 'fastef.ucad.sn', 'esp.sn', 'ucad-esp.sn'

// Université Gaston Berger de Saint-Louis (UGB)
'ugb.sn', 'ugb.edu.sn'

// Université Alioune Diop de Bambey (UADB)
'uadb.edu.sn', 'uadb.sn'

// Université Sine Saloum El Hadji Ibrahima Niass (USSEIN)
'ussein.sn', 'ussein.edu.sn'

// Université Iba Der Thiam de Thiès (UIDT)
'uidt.sn', 'uidt.edu.sn', 'univ-thies.sn'

// Université Assane Seck de Ziguinchor (UASZ)
'uasz.sn', 'uasz.edu.sn'
```

### Fonctionnement

#### 1. Validation exacte
```javascript
amadou.diop@ucad.sn ✅ → Accepté
fatou@ugb.sn ✅ → Accepté
```

#### 2. Support des sous-domaines
```javascript
marie@rh.ucad.sn ✅ → Accepté (sous-domaine de ucad.sn)
admin@direction.ugb.sn ✅ → Accepté (sous-domaine de ugb.sn)
```

#### 3. Suggestions automatiques
```javascript
test@ucad.com ❌ → Rejeté avec suggestion: "Vouliez-vous dire: ucad.sn?"
test@ugb.org ❌ → Rejeté avec suggestion: "Vouliez-vous dire: ugb.sn?"
```

#### 4. Rejet des domaines non autorisés
```javascript
test@gmail.com ❌ → "Cette plateforme est réservée aux universités sénégalaises"
test@yahoo.fr ❌ → "Cette plateforme est réservée aux universités sénégalaises"
```

### Réponses API

**Cas 1: Email valide**
```json
{
  "success": true
}
```

**Cas 2: Domaine non autorisé sans suggestion**
```json
{
  "success": false,
  "message": "Cette plateforme est réservée aux universités sénégalaises",
  "errors": [...]
}
```

**Cas 3: Domaine non autorisé avec suggestion**
```json
{
  "success": false,
  "message": "Cette plateforme est réservée aux universités sénégalaises. Vouliez-vous dire: ucad.sn?",
  "errors": [...]
}
```

---

## 📧 NOTIFICATION PAR EMAIL

### Configuration SMTP

**Fichier `.env` :**
```env
# Configuration SMTP
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=votre.email@gmail.com
SMTP_PASS=votre_mot_de_passe_application

# Expéditeur
SMTP_FROM_NAME=GED CERER
SMTP_FROM_EMAIL=noreply@cerer.sn

# URL frontend
FRONTEND_URL=http://localhost:4000
```

### Pour Gmail

1. Aller sur https://myaccount.google.com/apppasswords
2. Créer un mot de passe d'application pour "Autre (nom personnalisé)"
3. Copier le mot de passe généré dans `SMTP_PASS`

### Contenu de l'email

**Sujet :** 🎓 Bienvenue sur la plateforme GED CERER - Vos identifiants

**Contenu :**
- Message de bienvenue personnalisé avec nom complet
- Nom de l'université reconnue
- Identifiants de connexion (email, username, mot de passe)
- Avertissement pour changer le mot de passe
- Lien vers la plateforme
- Guide des premiers pas

**Design :**
- Email HTML responsive
- Version texte brut (fallback)
- Couleurs GED CERER (bleu/vert)
- Icons et mise en forme professionnelle

### Comportement

**Si SMTP configuré :**
```
✅ Email envoyé à amadou.diop@ucad.sn
```

**Si SMTP non configuré :**
```
⚠️  Email non envoyé à amadou.diop@ucad.sn: Configuration SMTP manquante
   L'utilisateur a été créé, mais sans notification par email
```

**Important :** L'utilisateur est créé même si l'email échoue (pas de blocage).

---

## 🎉 PREMIÈRE CONNEXION ET CHANGEMENT DE MOT DE PASSE

### Détection de première connexion

#### Flux complet

1. **Création de compte**
```javascript
// Lors de l'inscription
{
  username: "amadou_diop",
  password: "motdepasse123", // Hashé dans la DB
  firstLogin: true ✅ // Marqueur ajouté automatiquement
}
```

2. **Première connexion**
```javascript
// POST /api/login
{
  username: "amadou_diop",
  password: "motdepasse123"
}

// Réponse
{
  "success": true,
  "username": "amadou_diop",
  "firstLogin": true, ✅ // Frontend doit afficher modal de bienvenue
  "user": {
    "username": "amadou_diop",
    "nom": "Amadou Diop",
    "email": "amadou.diop@ucad.sn",
    "role": "tertiaire",
    "niveau": 3,
    "departement": "Direction"
  }
}
```

3. **Après première connexion**
```javascript
// Automatiquement marqué en base:
{
  firstLogin: false,
  datePremiereConnexion: "2025-11-15T01:20:00.000Z"
}
```

4. **Connexions suivantes**
```javascript
// Réponse normale
{
  "success": true,
  "username": "amadou_diop",
  "firstLogin": false, ✅ // Pas de modal
  "user": { ... }
}
```

### Route de changement de mot de passe

**Endpoint :** `POST /api/users/:username/change-password`

**Paramètres :**
```json
{
  "currentPassword": "ancien_mot_de_passe",
  "newPassword": "nouveau_mot_de_passe"
}
```

**Validation :**
- `currentPassword` : requis
- `newPassword` : minimum 4 caractères

**Réponses :**

✅ **Succès**
```json
{
  "success": true,
  "message": "Mot de passe changé avec succès"
}
```

❌ **Ancien mot de passe incorrect**
```json
{
  "success": false,
  "message": "Mot de passe actuel incorrect"
}
```

❌ **Nouveau mot de passe invalide**
```json
{
  "success": false,
  "message": "Le nouveau mot de passe doit contenir au moins 4 caractères"
}
```

---

## 💻 INTÉGRATION FRONTEND

### 1. Lors de l'inscription

```javascript
async function register(formData) {
    try {
        const response = await fetch('/api/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                username: formData.username,
                password: formData.password,
                nom: formData.nom,
                email: formData.email // Ex: amadou@ucad.sn
            })
        });

        const result = await response.json();

        if (!result.success) {
            // Vérifier si c'est une erreur de domaine
            if (result.message.includes('Vouliez-vous dire')) {
                // Afficher la suggestion
                showSuggestion(result.message);
            } else {
                showError(result.message);
            }
            return;
        }

        // Succès
        showMessage('Compte créé avec succès ! Vérifiez votre email pour vos identifiants.');
        redirectToLogin();

    } catch (error) {
        showError('Erreur lors de l\'inscription');
    }
}
```

### 2. Lors de la connexion

```javascript
async function login(username, password) {
    try {
        const response = await fetch('/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });

        const result = await response.json();

        if (!result.success) {
            showError(result.message);
            return;
        }

        // ✅ NOUVEAU: Vérifier si c'est la première connexion
        if (result.firstLogin) {
            // Afficher modal de bienvenue avec invitation changement MDP
            showWelcomeModal({
                nom: result.user.nom,
                email: result.user.email,
                university: result.user.departement,
                username: result.username
            });
        } else {
            // Redirection normale vers le tableau de bord
            redirectToDashboard(result);
        }

    } catch (error) {
        showError('Erreur de connexion');
    }
}
```

### 3. Modal de bienvenue (exemple Vue.js)

```vue
<template>
  <div v-if="showModal" class="modal-overlay">
    <div class="modal-content">
      <!-- En-tête -->
      <div class="modal-header">
        <h2>🎉 Bienvenue {{ nom }} !</h2>
        <p>Première connexion à la plateforme GED CERER</p>
      </div>

      <!-- Corps -->
      <div class="modal-body">
        <div class="info-box">
          <p><strong>✓ Université reconnue :</strong> {{ university }}</p>
          <p><strong>📧 Email :</strong> {{ email }}</p>
          <p><strong>👤 Username :</strong> {{ username }}</p>
        </div>

        <div class="warning-box">
          <p>⚠️ <strong>Important :</strong> Pour votre sécurité, nous vous recommandons fortement de changer votre mot de passe maintenant.</p>
        </div>

        <!-- Formulaire changement mot de passe -->
        <form @submit.prevent="changePassword">
          <div class="form-group">
            <label>Mot de passe actuel</label>
            <input
              type="password"
              v-model="currentPassword"
              required
              placeholder="Mot de passe reçu par email"
            />
          </div>

          <div class="form-group">
            <label>Nouveau mot de passe</label>
            <input
              type="password"
              v-model="newPassword"
              minlength="4"
              required
              placeholder="Minimum 4 caractères"
            />
          </div>

          <div class="form-group">
            <label>Confirmer le nouveau mot de passe</label>
            <input
              type="password"
              v-model="confirmPassword"
              minlength="4"
              required
              placeholder="Retapez le nouveau mot de passe"
            />
          </div>

          <div class="error-message" v-if="errorMessage">
            {{ errorMessage }}
          </div>

          <div class="modal-actions">
            <button type="submit" class="btn-primary">
              🔒 Changer mon mot de passe
            </button>
            <button type="button" @click="skipChangePassword" class="btn-secondary">
              Plus tard
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  data() {
    return {
      showModal: false,
      nom: '',
      email: '',
      university: '',
      username: '',
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
      errorMessage: ''
    };
  },

  methods: {
    async changePassword() {
      // Vérifier que les mots de passe correspondent
      if (this.newPassword !== this.confirmPassword) {
        this.errorMessage = 'Les mots de passe ne correspondent pas';
        return;
      }

      // Vérifier la longueur
      if (this.newPassword.length < 4) {
        this.errorMessage = 'Le mot de passe doit contenir au moins 4 caractères';
        return;
      }

      try {
        const response = await fetch(`/api/users/${this.username}/change-password`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            currentPassword: this.currentPassword,
            newPassword: this.newPassword
          })
        });

        const result = await response.json();

        if (!result.success) {
          this.errorMessage = result.message;
          return;
        }

        // Succès
        this.showModal = false;
        this.$emit('password-changed');
        this.redirectToDashboard();

      } catch (error) {
        this.errorMessage = 'Erreur lors du changement de mot de passe';
      }
    },

    skipChangePassword() {
      // L'utilisateur choisit de changer plus tard
      this.showModal = false;
      this.redirectToDashboard();
    },

    redirectToDashboard() {
      window.location.href = '/dashboard.html';
    }
  }
};
</script>
```

---

## 🧪 TESTS

### 1. Tester la validation des domaines

**Script de test :** `test-domaine-universitaire.js`

```bash
node test-domaine-universitaire.js
```

**Tests couverts :**
- ✅ Email UCAD valide
- ✅ Email UGB valide
- ✅ Sous-domaine UCAD valide
- ❌ Email Gmail (rejeté)
- ❌ Faute de frappe ucad.com → suggestion ucad.sn
- ✅ Email ESP valide
- ✅ Email UADB valide

### 2. Tester la première connexion

**Scénario manuel :**

1. Créer un nouvel utilisateur
```bash
curl -X POST http://localhost:4000/api/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "test_user",
    "password": "1234",
    "nom": "Test User",
    "email": "test@ucad.sn"
  }'
```

2. Se connecter pour la première fois
```bash
curl -X POST http://localhost:4000/api/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "test_user",
    "password": "1234"
  }'
```

**Résultat attendu :**
```json
{
  "success": true,
  "username": "test_user",
  "firstLogin": true, ✅
  "user": { ... }
}
```

3. Se reconnecter
```bash
# Même requête qu'au point 2
```

**Résultat attendu :**
```json
{
  "success": true,
  "username": "test_user",
  "firstLogin": false, ✅
  "user": { ... }
}
```

### 3. Tester le changement de mot de passe

```bash
curl -X POST http://localhost:4000/api/users/test_user/change-password \
  -H "Content-Type: application/json" \
  -d '{
    "currentPassword": "1234",
    "newPassword": "nouveau_mdp_2024"
  }'
```

**Résultat attendu :**
```json
{
  "success": true,
  "message": "Mot de passe changé avec succès"
}
```

### 4. Vérifier les logs serveur

```bash
# Logs de création de compte
🎓 Nouvel utilisateur créé: test_user
📧 Email de bienvenue envoyé à test@ucad.sn

# Logs de première connexion
🎉 Première connexion de test_user

# Logs de changement de mot de passe
🔑 Mot de passe changé pour: test_user
```

---

## 📊 RÉSUMÉ DES MODIFICATIONS

### Fichiers créés

1. **`config/allowedDomains.js`** - Validation domaines universitaires
2. **`services/emailService.js`** - Envoi d'emails avec Nodemailer
3. **`test-domaine-universitaire.js`** - Script de test automatisé
4. **`PREMIERE-CONNEXION-ET-DOMAINES.md`** - Cette documentation

### Fichiers modifiés

**`server.js`**
- Ligne 25-26 : Import modules validation et email
- Ligne 588-613 : Validation email avec domaines universitaires
- Ligne 501-511 : Détection première connexion
- Ligne 692 : Flag `firstLogin: true` lors de création utilisateur
- Ligne 893-957 : Route `/api/users/:username/change-password`

**`.env`**
- Ajout configuration SMTP (lignes 32-50)

**`package.json`**
- Ajout dépendance `nodemailer`

---

## ✅ CHECKLIST D'IMPLÉMENTATION FRONTEND

- [ ] Ajouter champ email dans formulaire d'inscription
- [ ] Afficher suggestions de domaines en cas d'erreur
- [ ] Détecter `firstLogin: true` dans réponse de login
- [ ] Créer modal de bienvenue pour première connexion
- [ ] Implémenter formulaire de changement de mot de passe
- [ ] Ajouter bouton "Changer plus tard" dans le modal
- [ ] Tester le flux complet avec un nouvel utilisateur
- [ ] Vérifier réception des emails (si SMTP configuré)

---

## 🛡️ SÉCURITÉ

**Mesures implémentées :**

✅ Validation stricte des domaines côté serveur (impossible à contourner)
✅ Mots de passe hashés avec bcrypt (10 rounds)
✅ Vérification de l'ancien mot de passe avant changement
✅ Email envoyé de manière asynchrone (pas de blocage si échec)
✅ Logs détaillés de tous les événements importants
✅ Flag `firstLogin` automatiquement mis à false après première connexion
✅ Traçabilité : `datePremiereConnexion`, `passwordChangedAt`

---

**Date de dernière mise à jour :** 15 novembre 2025
**Testé et validé :** ✅
