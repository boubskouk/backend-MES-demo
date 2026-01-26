# Changements à Déployer - Version [REMPLIR LA DATE]

> **INSTRUCTIONS** : Listez TOUS les changements que vous avez faits depuis le dernier déploiement.
> Soyez exhaustif - mieux vaut trop d'infos que pas assez.
> Une fois rempli, renommez-le en `CHANGELOG-DEPLOY.md` et partagez-le avec Claude.

---

## RÉSUMÉ EXÉCUTIF

**Nombre de fichiers modifiés** : `_______`
**Nombre de fichiers supprimés** : `_______`
**Nombre de fichiers ajoutés** : `_______`
**Changements de base de données** : Oui / Non
**Niveau de risque** : Faible / Moyen / Élevé

**Commande pour voir vos changements** :
```bash
git status
git diff main
```

---

## NOUVELLES FONCTIONNALITÉS

**Listez toutes les nouvelles fonctionnalités ajoutées** :

### 1. [NOM DE LA FONCTIONNALITÉ]
- **Description** : _______________________
- **Fichiers concernés** : _______________________
- **Changements DB nécessaires** : Oui / Non
- **Testé en local** : Oui / Non
- **Risques** : _______________________

### 2. [NOM DE LA FONCTIONNALITÉ]
- **Description** : _______________________
- **Fichiers concernés** : _______________________
- **Changements DB nécessaires** : Oui / Non
- **Testé en local** : Oui / Non
- **Risques** : _______________________

### 3. [AJOUTEZ D'AUTRES SI NÉCESSAIRE]

**Exemples basés sur votre git status** :
- Système de logs de sécurité avancé
- Gestion des profils utilisateurs
- Dashboard super-admin amélioré
- Page de gestion des sessions
- Page des logs de changements de profil

---

## CORRECTIONS DE BUGS

**Listez les bugs corrigés** :

### Bug 1 : [DESCRIPTION DU BUG]
- **Impact** : _______________________
- **Solution** : _______________________
- **Fichiers modifiés** : _______________________

### Bug 2 : [DESCRIPTION]
- **Impact** : _______________________
- **Solution** : _______________________
- **Fichiers modifiés** : _______________________

**Si aucun bug corrigé** : [ ] Pas de corrections de bugs dans cette version

---

## CHANGEMENTS DE BASE DE DONNÉES

### Nouvelles tables créées

**Pour vérifier, exécutez** :
```bash
sqlite3 users.db "SELECT name FROM sqlite_master WHERE type='table';"
```

**Comparez avec la production pour voir les nouvelles** :

- [ ] security_logs
  - **Colonnes** : _______________________
  - **Objectif** : _______________________
  - **Script de création** : Existe / À créer

- [ ] profile_changes_logs
  - **Colonnes** : _______________________
  - **Objectif** : _______________________
  - **Script de création** : Existe / À créer

- [ ] _______________________
  - **Colonnes** : _______________________
  - **Objectif** : _______________________
  - **Script de création** : Existe / À créer

### Nouvelles colonnes ajoutées

**Dans la table `users`** :
- [ ] `department` (type : TEXT)
  - **Valeur par défaut** : _______________________
  - **Peut être NULL** : Oui / Non
  - **Impact** : _______________________

- [ ] `avatar_url` (type : TEXT)
  - **Valeur par défaut** : _______________________
  - **Peut être NULL** : Oui / Non
  - **Impact** : _______________________

- [ ] _______________________ (type : _______)
  - **Valeur par défaut** : _______________________
  - **Peut être NULL** : Oui / Non
  - **Impact** : _______________________

**Dans d'autres tables** :
- [ ] Table `_______`, colonne `_______` (type : _______)
- [ ] Table `_______`, colonne `_______` (type : _______)

### Index ou contraintes ajoutés

- [ ] Index sur `_______________________`
- [ ] Contrainte UNIQUE sur `_______________________`
- [ ] Contrainte FOREIGN KEY sur `_______________________`
- [ ] Aucun

### Tables ou colonnes supprimées

**⚠️ ATTENTION : Suppression = risque de perte de données**

- [ ] Aucune table supprimée ✅
- [ ] Table `_______` supprimée
  - **Raison** : _______________________
  - **Données sauvegardées avant suppression** : Oui / Non

- [ ] Colonne `_______` dans table `_______` supprimée
  - **Raison** : _______________________
  - **Impact** : _______________________

---

## FICHIERS MODIFIÉS

**Pour obtenir la liste complète** :
```bash
git status > changements-fichiers.txt
```

### Fichiers backend (serveur)

**Fichiers JavaScript/Node.js** :
- [ ] `server.js`
  - **Nature des changements** : _______________________
  - **Lignes modifiées** : _______ (approx)
  - **Risque de régression** : Faible / Moyen / Élevé

- [ ] `security-config.js`
  - **Nature des changements** : _______________________
  - **Lignes modifiées** : _______ (approx)
  - **Risque de régression** : Faible / Moyen / Élevé

- [ ] `routes-profile.js` (nouveau)
  - **Nature** : Nouveau fichier
  - **Objectif** : _______________________
  - **Dépendances** : _______________________

- [ ] _______________________
  - **Nature des changements** : _______________________
  - **Risque** : Faible / Moyen / Élevé

### Fichiers frontend (client)

**Fichiers HTML** :
- [ ] `public/index.html`
  - **Changements** : _______________________
- [ ] `public/super-admin.html`
  - **Changements** : _______________________
- [ ] `public/new-dashboard.html` (nouveau)
  - **Objectif** : _______________________
- [ ] `public/login.html` (nouveau)
  - **Objectif** : _______________________
- [ ] `public/sessions-management.html` (nouveau)
  - **Objectif** : _______________________
- [ ] `public/security-logs.html` (nouveau)
  - **Objectif** : _______________________
- [ ] `public/profile-changes-logs.html` (nouveau)
  - **Objectif** : _______________________

**Fichiers CSS** :
- [ ] `public/css/new-dashboard.css` (nouveau)
  - **Objectif** : _______________________

**Fichiers JavaScript** :
- [ ] `public/js/app.js`
  - **Changements** : _______________________
  - **Fonctions ajoutées/modifiées** : _______________________
- [ ] `public/js/super-admin-dashboard.js`
  - **Changements** : _______________________
- [ ] `public/js/new-dashboard.js` (nouveau)
  - **Objectif** : _______________________
- [ ] `public/js/profile-functions.js` (nouveau)
  - **Objectif** : _______________________

### Fichiers de configuration

- [ ] `package.json`
  - **Nouvelles dépendances** : _______________________
  - **Dépendances supprimées** : _______________________
- [ ] `.env.example`
  - **Nouvelles variables** : _______________________
- [ ] `.gitignore`
  - **Changements** : _______________________

---

## FICHIERS SUPPRIMÉS

**D'après votre git status, plusieurs scripts ont été supprimés** :

### Scripts de debug supprimés
- [ ] `scripts/check-audit-actions.js`
  - **Raison** : Nettoyage / Plus utilisé
- [ ] `scripts/check-niveau1-departments.js`
  - **Raison** : _______________________
- [ ] `scripts/check-online-status-production.js`
  - **Raison** : _______________________
- [ ] `scripts/check-online-status.js`
  - **Raison** : _______________________
- [ ] `scripts/check-unauthorized-niveau0.js`
  - **Raison** : _______________________
- [ ] `scripts/check-user-connections.js`
  - **Raison** : _______________________
- [ ] `scripts/compare-databases.js`
  - **Raison** : _______________________
- [ ] `scripts/create-user-test2.js`
  - **Raison** : _______________________
- [ ] `scripts/debug-user-role.js`
  - **Raison** : _______________________
- [ ] `scripts/delete-user-test2.js`
  - **Raison** : _______________________
- [ ] `scripts/reset-boubs-password.js`
  - **Raison** : _______________________
- [ ] `scripts/test-niveau1-complet.js`
  - **Raison** : _______________________
- [ ] `scripts/test-niveau1-user-management.js`
  - **Raison** : _______________________

**Impact de ces suppressions** :
- [ ] Aucun impact (scripts de dev/debug uniquement) ✅
- [ ] Impact possible : _______________________

### Autres fichiers supprimés
- [ ] _______________________

---

## NOUVELLES DÉPENDANCES

**Pour vérifier** :
```bash
npm list --depth=0
```

**Comparez avec package.json de production**

### Dépendances ajoutées
- [ ] `_______` (version _______)
  - **Objectif** : _______________________
  - **Taille** : _______ Ko
  - **Licences** : _______________________

- [ ] Aucune nouvelle dépendance ✅

### Dépendances mises à jour
- [ ] `_______` (de version _____ à _____)
  - **Raison** : Sécurité / Fonctionnalité / Bug fix
  - **Breaking changes** : Oui / Non

- [ ] Aucune mise à jour

### Dépendances supprimées
- [ ] `_______`
  - **Raison** : _______________________

- [ ] Aucune suppression ✅

---

## VARIABLES D'ENVIRONNEMENT

### Nouvelles variables requises

**Dans `.env` production** :

- [ ] `NOUVELLE_VARIABLE=valeur`
  - **Objectif** : _______________________
  - **Valeur par défaut** : _______________________
  - **Critique** : Oui (app ne démarre pas sans) / Non

- [ ] Aucune nouvelle variable ✅

### Variables obsolètes

- [ ] `ANCIENNE_VARIABLE` (peut être supprimée)
- [ ] Aucune

---

## COMPATIBILITÉ ET DÉPENDANCES

### Versions Node.js

**Votre version locale** :
```bash
node --version
# Résultat : v_______
```

**Version production** :
```bash
# Sur le serveur, exécuter :
node --version
# Résultat attendu : v_______
```

- [ ] Versions compatibles ✅
- [ ] ⚠️ Versions différentes (risque de problème)

### Compatibilité navigateurs

**Nouvelles fonctionnalités JavaScript utilisées** :
- [ ] Async/await
- [ ] Fetch API
- [ ] ES6 modules
- [ ] [Autres]

**Support minimum requis** :
- [ ] Chrome/Edge 90+
- [ ] Firefox 88+
- [ ] Safari 14+
- [ ] Pas de changement ✅

---

## TESTS EFFECTUÉS EN LOCAL

### Tests fonctionnels

**Fonctionnalités testées manuellement** :

- [ ] Login/Logout
  - **Résultat** : ✅ OK / ❌ Problème : _______
- [ ] Gestion des utilisateurs
  - **Résultat** : ✅ OK / ❌ Problème : _______
- [ ] Upload de documents
  - **Résultat** : ✅ OK / ❌ Problème : _______
- [ ] Système de logs de sécurité
  - **Résultat** : ✅ OK / ❌ Problème : _______
- [ ] Nouveaux dashboards
  - **Résultat** : ✅ OK / ❌ Problème : _______
- [ ] Gestion des profils
  - **Résultat** : ✅ OK / ❌ Problème : _______
- [ ] _______________________
  - **Résultat** : ✅ OK / ❌ Problème : _______

### Tests de permissions

- [ ] Niveau0 : Peut voir uniquement ses documents ✅ / ❌
- [ ] Niveau1 : Peut gérer son département ✅ / ❌
- [ ] Super-admin : Accès complet ✅ / ❌

### Tests de régression

**Anciennes fonctionnalités toujours opérationnelles ?**

- [ ] Recherche de documents ✅ / ❌
- [ ] Filtrage ✅ / ❌
- [ ] Export ✅ / ❌
- [ ] _______________________

### Tests automatiques

- [ ] `npm test` exécuté avec succès
- [ ] Tous les tests passent
- [ ] ❌ Pas de tests automatiques (à créer)

---

## RISQUES IDENTIFIÉS

### Risques CRITIQUES (❌ Bloquants)

**Cochez si l'un de ces risques s'applique** :

- [ ] **Incompatibilité DB** : Le code LOCAL référence des tables/colonnes absentes en PROD
  - Tables/colonnes concernées : _______________________
  - **ACTION REQUISE** : Migration DB obligatoire

- [ ] **Breaking change** : Changement qui casse la rétrocompatibilité
  - Nature : _______________________
  - **ACTION REQUISE** : _______________________

- [ ] **Dépendance manquante** : npm install n'a pas été fait en production
  - Dépendances : _______________________
  - **ACTION REQUISE** : npm install en prod

- [ ] **Variable d'environnement manquante** : App ne démarrera pas
  - Variables : _______________________
  - **ACTION REQUISE** : Configurer .env en prod

### Risques IMPORTANTS (⚠️ Peut causer des bugs)

- [ ] **Modification du comportement** : Fonctionnalité change de comportement
  - Impact utilisateur : _______________________
  - **PLAN** : _______________________

- [ ] **Performance** : Code potentiellement plus lent
  - Fonctionnalité concernée : _______________________
  - **PLAN** : Monitorer après déploiement

- [ ] **Sécurité** : Changement touchant la sécurité
  - Nature : _______________________
  - **VALIDATION** : Testé ? Oui / Non

### Risques MINEURS (✅ Acceptable)

- [ ] **UI/UX** : Changements visuels mineurs
- [ ] **Logs** : Nouvelles entrées de logs
- [ ] **Nettoyage** : Suppression de code mort

---

## PLAN DE ROLLBACK

### En cas de problème, que faire ?

**Scénario 1 : L'app ne démarre pas**
- **Cause probable** : _______________________
- **Solution** : _______________________
- **Temps estimé** : _______ minutes

**Scénario 2 : Erreurs dans les logs**
- **Cause probable** : _______________________
- **Solution** : _______________________
- **Temps estimé** : _______ minutes

**Scénario 3 : Problème DB**
- **Solution** : Restaurer le backup
- **Commande** :
  ```bash
  cp users.db.backup-[DATE] users.db
  pm2 restart app
  ```

### Backup existant

- [ ] Backup manuel fait : Oui
  - Localisation : _______________________
  - Date : _______________________

---

## CHECKLIST PRÉ-DÉPLOIEMENT

**Avant de dire à Claude "je suis prêt pour le déploiement"** :

### Code
- [ ] Tous les fichiers sont commités
- [ ] Aucun fichier sensible (.env, secrets) committé
- [ ] git status est propre

### Tests
- [ ] Testé en local : toutes les fonctionnalités marchent
- [ ] Testé les permissions (niveau0, niveau1, admin)
- [ ] Aucune erreur dans la console du navigateur
- [ ] Aucune erreur dans les logs serveur

### Base de données
- [ ] db-status.md rempli et partagé avec Claude
- [ ] Différences DB documentées
- [ ] Stratégie de migration choisie (A ou B)
- [ ] Backup production fait et vérifié

### Configuration
- [ ] .env de production vérifié
- [ ] Nouvelles variables d'env documentées
- [ ] Accès SSH au serveur testé

### Documentation
- [ ] Ce fichier CHANGELOG-DEPLOY.md rempli complètement
- [ ] Guide CI/CD lu et compris
- [ ] db-status.md rempli

---

## TIMELINE DE DÉPLOIEMENT

### Moment prévu

**Quand voulez-vous déployer ?**
- Date : _______________________
- Heure : _______________________
- Durée estimée : _______ minutes

**Trafic utilisateur à ce moment** :
- [ ] Heures creuses (recommandé) - peu/pas d'utilisateurs
- [ ] ⚠️ Heures pleines - utilisateurs actifs

### Rollback prévu

**En cas de problème, à quelle heure maximum annuler ?**
- Deadline rollback : _______ h _______

---

## COMMUNICATION

### Qui prévenir ?

**Avant le déploiement** :
- [ ] Utilisateurs (prévoir une maintenance)
- [ ] Équipe technique
- [ ] Personne (déploiement transparent)

**Après le déploiement** :
- [ ] Notifier les utilisateurs des nouvelles fonctionnalités
- [ ] Envoyer un changelog
- [ ] Rien

---

## PRÊT POUR LA PHASE 2

**Une fois ce fichier rempli** :

1. Renommer en `CHANGELOG-DEPLOY.md`
2. S'assurer que `db-status.md` est aussi rempli
3. Dire à Claude :
   ```
   "J'ai terminé la Phase 1 de préparation.
   Voici mes fichiers db-status.md et CHANGELOG-DEPLOY.md.
   J'ai choisi l'option [A ou B] pour la migration.
   Peux-tu créer les scripts de la Phase 2 ?"
   ```

---

**Date de remplissage** : ___________________________
**Rempli par** : ___________________________
**Temps passé** : _______ heures
**Niveau de confiance** : Faible / Moyen / Élevé
