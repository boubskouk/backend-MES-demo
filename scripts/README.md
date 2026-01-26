# 🛠️ SCRIPTS UTILITAIRES - ARCHIVAGE C.E.R.E.R

Ce dossier contient des scripts utilitaires pour la gestion et la sécurité du système.

---

## 📋 SCRIPTS DE SÉCURITÉ

### `generate-secrets.js`

**Objectif:** Générer des secrets JWT sécurisés

**Usage:**
```bash
# Première utilisation
node scripts/generate-secrets.js

# Forcer la mise à jour du .env existant
node scripts/generate-secrets.js --force
```

**Ce qu'il fait:**
- Génère 3 secrets cryptographiques forts:
  - `JWT_SECRET` (128 caractères hex)
  - `JWT_REFRESH_SECRET` (128 caractères hex)
  - `SESSION_SECRET` (64 caractères hex)
- Crée ou met à jour le fichier `.env`
- Affiche les secrets générés
- Fournit des instructions de sécurité

**Quand l'utiliser:**
- Première installation du système
- Rotation des secrets (tous les 90 jours en production)
- Après une compromission suspectée
- Lors du passage en production

---

### `test-security.js`

**Objectif:** Valider toutes les fonctionnalités de sécurité

**Usage:**
```bash
node scripts/test-security.js
```

**Ce qu'il teste:**
1. ✅ Modules de sécurité (5 tests)
2. ✅ Configuration JWT (4 tests)
3. ✅ Configuration CORS (2 tests)
4. ✅ Système d'audit logs (5 tests)
5. ✅ Configuration HTTPS (2 tests)
6. ✅ Variables d'environnement (9 tests)
7. ✅ Bcrypt (3 tests)
8. ✅ Rate Limiting (3 tests)
9. ✅ Helmet (1 test)
10. ✅ NoSQL Injection Protection (1 test)

**Total:** 30 tests

**Résultat attendu:**
```
🎉 TOUS LES TESTS SONT PASSÉS! Sécurité opérationnelle.
```

**En cas d'échec:**
- Le script affiche les tests échoués
- Fournit des suggestions de correction
- Retourne un code d'erreur (exit code 1)

**Quand l'utiliser:**
- Après l'installation initiale
- Avant le déploiement en production
- Après toute modification de configuration
- Régulièrement (CI/CD)

---

## 🚀 SCRIPTS DE MIGRATION ET PRÉVENTION

### `pre-migration-check.js` ⭐ NOUVEAU

**Objectif:** Vérifier les différences AVANT une migration

**Usage:**
```bash
node scripts/pre-migration-check.js
```

**Ce qu'il fait:**
- Compare Local ↔ Production (nombre de documents par collection)
- Identifie les comptes uniquement en local (risque de perte)
- Identifie les comptes uniquement en production
- Vérifie les comptes critiques (jbk, boubs, test34, superadmin)
- Fournit des recommandations

**Quand l'utiliser:**
- **TOUJOURS** avant toute migration
- Pour identifier les données à risque
- Avant un déploiement majeur

---

### `post-migration-check.js` ⭐ NOUVEAU

**Objectif:** Valider qu'une migration s'est bien déroulée

**Usage:**
```bash
node scripts/post-migration-check.js
```

**Ce qu'il vérifie:**
- ✅ Toutes les 12 collections sont présentes
- ✅ Nombre minimum d'utilisateurs (>5) et documents (>1)
- ✅ Comptes critiques présents (jbk, boubs)
- ✅ Champ "deleted" présent sur tous les documents
- ✅ Index MongoDB créés correctement

**Résultat:**
```
✅✅✅ MIGRATION RÉUSSIE ✅✅✅
```
ou
```
❌❌❌ PROBLÈMES DÉTECTÉS ❌❌❌
```

**Quand l'utiliser:**
- **TOUJOURS** après toute migration
- Pour valider l'intégrité des données
- Avant de mettre en production

---

### `create-test-data.js` ⭐ NOUVEAU

**Objectif:** Créer automatiquement des comptes de test

**Usage:**
```bash
node scripts/create-test-data.js
```

**Comptes créés:**
- `test_superadmin` - Niveau 0 (Super Admin)
- `test_niveau1` - Niveau 1 (Chef Département)
- `test_niveau2` - Niveau 2 (Chef Service)
- `test_niveau3` - Niveau 3 (Agent)
- `test34` - Niveau 1 (Compte générique)

**Mot de passe:** `test123` ⚠️ À changer en production!

**Ce qu'il fait:**
- Vérifie que les rôles et départements existent
- Crée les comptes avec bcrypt
- Ignore les comptes déjà existants
- Affiche tous les identifiants créés

**Quand l'utiliser:**
- Après une migration (si comptes de test perdus)
- Pour créer un environnement de test
- En développement local

---

## 🔄 SCRIPTS DE BASE DE DONNÉES

### `sync-databases.js`

**Objectif:** Synchroniser les bases de données locale et production

**Usage:**
```bash
node scripts/sync-databases.js
```

**Ce qu'il fait:**
- Compare les données entre local et production
- Synchronise dans les deux sens (Local ↔ Production)
- Crée des backups automatiques avant synchronisation
- Deux modes: REPLACE (remplacement total) et MERGE (fusion intelligente)

**Options du menu:**
1. 📊 Comparer Local ↔ Production
2. 📤 Synchroniser Local → Production (REPLACE)
3. 📥 Synchroniser Production → Local (REPLACE)
4. 🔀 Synchroniser Local → Production (MERGE)
5. 🔀 Synchroniser Production → Local (MERGE)
6. 💾 Backup Local uniquement
7. 💾 Backup Production uniquement
8. 💾 Backup Local + Production
9. 🔍 Test de connexion

**Collections synchronisées:**
- `users` (utilisateurs)
- `documents` (documents archivés)
- `categories` (catégories)
- `roles` (rôles)
- `departements` (départements)
- `deletionRequests` (demandes de suppression)
- `messages` (messagerie interne)
- `messageDeletionRequests` (demandes de suppression de messages)
- `shareHistory` (historique de partage)

**Quand l'utiliser:**
- Avant un déploiement (Local → Production)
- Pour récupérer les données (Production → Local)
- Pour fusionner les données des deux environnements
- Avant une opération risquée (backup)

**Documentation complète:** Voir `GUIDE-SYNCHRONISATION.md`

---

## 🔄 WORKFLOW RECOMMANDÉ

### Installation initiale

```bash
# 1. Installer les dépendances
npm install

# 2. Générer les secrets
node scripts/generate-secrets.js

# 3. Configurer .env (MongoDB, SMTP, etc.)
nano .env

# 4. Tester la sécurité
node scripts/test-security.js

# 5. Démarrer le serveur
npm start
```

### Rotation des secrets (Production)

```bash
# 1. Générer de nouveaux secrets
node scripts/generate-secrets.js --force

# 2. Mettre à jour sur la plateforme de production
# (Render, Heroku, etc.)

# 3. Redémarrer le serveur
pm2 restart archivage-cerer

# 4. Tester
node scripts/test-security.js
```

### Migration vers nouveau cluster MongoDB ⭐ NOUVEAU WORKFLOW

```bash
# ÉTAPE 1: AVANT LA MIGRATION
# Vérifier les différences local/prod
node scripts/pre-migration-check.js
# Lire attentivement le rapport

# Noter les comptes critiques à ne pas perdre

# ÉTAPE 2: MIGRATION
# Exécuter votre script de migration
node migrate-to-new-cluster.js

# ÉTAPE 3: VALIDATION POST-MIGRATION
# Vérifier que tout est OK
node scripts/post-migration-check.js

# Si des comptes de test manquent
node scripts/create-test-data.js

# ÉTAPE 4: MISE EN PRODUCTION
# Mettre à jour MONGODB_URI dans Render/Heroku
# Attendre le redéploiement

# ÉTAPE 5: TEST EN PRODUCTION
# Tester avec chaque niveau de compte:
# - test_superadmin / test123
# - test_niveau1 / test123
# - test_niveau2 / test123
# - test_niveau3 / test123
```

### Déploiement avec synchronisation de base de données

```bash
# 1. Comparer les bases
node scripts/sync-databases.js
# Choisir option 1 (Comparer)

# 2. Faire un backup complet
# Choisir option 8 (Backup Local + Production)

# 3. Synchroniser vers production
# Choisir option 4 (Local → Production MERGE)
# OU option 2 (Local → Production REPLACE) si copie exacte souhaitée

# 4. Vérifier en production
# Choisir option 1 (Comparer) pour confirmer

# 5. Déployer le code
git add .
git commit -m "Déploiement avec synchronisation DB"
git push

# 6. Tester l'application en production
```

### Récupération des données de production

```bash
# 1. Backup de votre base locale
node scripts/sync-databases.js
# Choisir option 6 (Backup Local)

# 2. Récupérer depuis production
# Choisir option 3 (Production → Local REPLACE)
# OU option 5 (Production → Local MERGE) pour conserver vos données locales

# 3. Vérifier
# Choisir option 1 (Comparer)
```

---

## 📝 NOTES IMPORTANTES

### Sécurité

- ⚠️ **NE JAMAIS** commiter le fichier `.env`
- ⚠️ Les secrets donnent accès complet à l'application
- ⚠️ Utilisez des secrets différents pour dev/staging/production
- ⚠️ Régénérez les secrets tous les 90 jours en production

### Backup

Avant de régénérer les secrets en production:
1. Sauvegarder l'ancien `.env`
2. Prévenir les utilisateurs (tous devront se reconnecter)
3. Planifier une fenêtre de maintenance

---

## 🆘 SUPPORT

### En cas de problème

```bash
# Vérifier que Node.js est installé
node --version  # Devrait être >= 18.0.0

# Vérifier que les dépendances sont installées
npm install

# Tester manuellement la génération de secrets
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

### Documentation

- Guide complet: `../SECURITE-AVANCEE.md`
- Guide de migration: `../GUIDE-MIGRATION-SECURITE.md`
- Récapitulatif: `../RECAP-SECURITE-AVANCEE.md`

---

**Développé par le Service Informatique du C.E.R.E.R**
