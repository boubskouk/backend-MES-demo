# Guide de Déploiement CI/CD - Application d'Archivage CERER

**Date de création** : 27 décembre 2025
**Objectif** : Mettre en place un système CI/CD pour éviter les problèmes de synchronisation entre les bases de données locale et production

---

## TABLE DES MATIÈRES

1. [Vue d'ensemble](#vue-densemble)
2. [Prérequis](#prérequis)
3. [Phase 1 : Préparation (VOUS - Manuel)](#phase-1--préparation-vous---manuel)
4. [Phase 2 : Scripts de Migration (CLAUDE - Automatisé)](#phase-2--scripts-de-migration-claude---automatisé)
5. [Phase 3 : Configuration CI/CD (CLAUDE - Automatisé)](#phase-3--configuration-cicd-claude---automatisé)
6. [Phase 4 : Premier Déploiement (VOUS + CLAUDE)](#phase-4--premier-déploiement-vous--claude)
7. [Phase 5 : Validation (VOUS - Manuel)](#phase-5--validation-vous---manuel)
8. [Workflow Futur](#workflow-futur)
9. [Résolution de Problèmes](#résolution-de-problèmes)

---

## VUE D'ENSEMBLE

### Le Problème Actuel
- ❌ Base de données locale ≠ Base de données production
- ❌ Déploiements manuels avec erreurs fréquentes
- ❌ Pas de backup automatique avant déploiement
- ❌ Difficile de faire un rollback en cas de problème

### La Solution CI/CD
- ✅ Vérification automatique de compatibilité DB avant déploiement
- ✅ Backup automatique de la DB production
- ✅ Migrations de base de données versionnées
- ✅ Déploiement automatique si tous les tests passent
- ✅ Rollback automatique en cas d'erreur

### Architecture Proposée

```
┌─────────────────────────────────────────────────────────────┐
│  DÉVELOPPEMENT LOCAL                                         │
│  - Coder les nouvelles fonctionnalités                      │
│  - Tester en local                                          │
│  - Créer fichiers de migration DB si nécessaire             │
└─────────────────────────────────────────────────────────────┘
                            ↓
                      git commit
                      git push origin main
                            ↓
┌─────────────────────────────────────────────────────────────┐
│  CI - CONTINUOUS INTEGRATION (GitHub Actions)                │
│  ✅ Checkout du code                                         │
│  ✅ Installation des dépendances (npm install)               │
│  ✅ Lancement des tests (npm test)                           │
│  ✅ Vérification du code (npm run lint - optionnel)          │
│  ✅ Vérification compatibilité DB                            │
│  ❌ Si échec → STOP (ne déploie pas)                         │
└─────────────────────────────────────────────────────────────┘
                            ↓
                   Tous les tests passent
                            ↓
┌─────────────────────────────────────────────────────────────┐
│  CD - CONTINUOUS DEPLOYMENT (GitHub Actions)                 │
│  1. Backup de la DB production                               │
│  2. Connexion SSH au serveur de production                   │
│  3. git pull (récupération du nouveau code)                  │
│  4. npm install (mise à jour des dépendances)                │
│  5. Application des migrations DB                            │
│  6. Redémarrage du serveur (pm2 restart)                     │
│  7. Test de santé (vérif que /health répond)                 │
│  ✅ Si succès → Notification                                 │
│  ❌ Si échec → Rollback automatique + Alerte                 │
└─────────────────────────────────────────────────────────────┘
                            ↓
                Application déployée en production
```

---

## PRÉREQUIS

### Vérifications à faire AVANT de commencer :

#### 1. Votre Code est sur GitHub/GitLab ?
- [ ] ✅ Oui, mon code est sur GitHub
- [ ] ✅ Oui, mon code est sur GitLab
- [ ] ❌ Non → **ACTION** : Créer un repo et pousser votre code

**Comment vérifier** :
```bash
git remote -v
```
Vous devriez voir quelque chose comme :
```
origin  https://github.com/votre-username/archivage-cerer.git (fetch)
origin  https://github.com/votre-username/archivage-cerer.git (push)
```

#### 2. Vous avez accès SSH au serveur de production ?
- [ ] ✅ Oui, je peux me connecter en SSH
- [ ] ❌ Non → **ACTION** : Configurer l'accès SSH

**Comment vérifier** :
```bash
ssh votre-user@votre-serveur-ip
```

#### 3. Votre serveur utilise quel gestionnaire de processus ?
- [ ] pm2 (recommandé)
- [ ] forever
- [ ] systemd
- [ ] node directement (pas recommandé)

**Comment vérifier** :
```bash
# Sur le serveur de production
pm2 list
# OU
forever list
# OU
systemctl status votre-app
```

#### 4. Vous avez un fichier .env avec vos secrets ?
- [ ] ✅ Oui, et il n'est PAS committé dans git
- [ ] ❌ Non → **ACTION** : Créer un .env et l'ajouter au .gitignore

**Vérification** :
```bash
# Vérifier que .env est dans .gitignore
cat .gitignore | grep .env
```

#### 5. Structure de votre base de données
- [ ] J'utilise SQLite (fichier .db)
- [ ] J'utilise PostgreSQL
- [ ] J'utilise MySQL/MariaDB

**Localisation de la DB** :
- Local : `_____________________` (ex: ./data/users.db)
- Production : `_____________________` (ex: /var/www/app/data/users.db)

---

## PHASE 1 : PRÉPARATION (VOUS - Manuel)

### Étape 1.1 : Créer une branche de travail

**IMPORTANT** : Ne travaillez JAMAIS directement sur `main` pendant la mise en place du CI/CD.

```bash
# Créer une nouvelle branche
git checkout -b setup-ci-cd

# Vérifier que vous êtes bien sur la branche
git branch
```

### Étape 1.2 : Documenter l'état actuel de votre DB

Vous devez savoir **exactement** ce qui diffère entre local et production.

**Créez un fichier** `db-status.md` avec :

```markdown
# État des Bases de Données - [DATE DU JOUR]

## Base de données LOCALE

### Tables existantes :
- users (colonnes : id, username, password, role, ...)
- sessions (colonnes : ...)
- documents (colonnes : ...)
- audit_logs (colonnes : ...)
- [autres tables...]

### Données importantes :
- Nombre d'utilisateurs : X
- Super-admin existe : Oui/Non
- Dernière modification : [date]

## Base de données PRODUCTION

### Tables existantes :
- [Lister les tables]

### Différences identifiées :
❌ Table `audit_logs` manquante en production
❌ Colonne `department` manquante dans `users` en production
✅ Table `sessions` identique
[etc...]

### Données importantes :
- Nombre d'utilisateurs : X
- Super-admin : [username]
- Dernière modification : [date]
```

**Comment obtenir ces infos** :

**En LOCAL** :
```bash
# Si SQLite
sqlite3 users.db ".schema"
sqlite3 users.db "SELECT name FROM sqlite_master WHERE type='table';"
```

**En PRODUCTION** :
```bash
# Connectez-vous en SSH puis
sqlite3 /chemin/vers/production/users.db ".schema"
```

### Étape 1.3 : Sauvegarder MANUELLEMENT la DB production

**AVANT TOUT**, faites un backup manuel de sécurité :

```bash
# Sur le serveur de production
cd /chemin/vers/votre/app
cp users.db users.db.backup-2025-12-28-avant-ci-cd

# Télécharger le backup localement (depuis votre machine locale)
scp votre-user@serveur-ip:/chemin/vers/users.db.backup-2025-12-28-avant-ci-cd ./backups/
```

**Vérification** :
- [ ] Le fichier backup existe sur le serveur
- [ ] Le fichier backup est téléchargé en local
- [ ] Le backup fait au moins 1 Ko (pas vide)

### Étape 1.4 : Vérifier les variables d'environnement

**En LOCAL**, créez/vérifiez votre `.env` :

```env
# .env (LOCAL)
NODE_ENV=development
PORT=4000
SESSION_SECRET=votre-secret-local-super-long
DATABASE_PATH=./users.db
```

**En PRODUCTION**, vérifiez le `.env` :

```bash
# Sur le serveur
cat /chemin/vers/votre/app/.env
```

```env
# .env (PRODUCTION)
NODE_ENV=production
PORT=4000
SESSION_SECRET=votre-secret-production-DIFFERENT-du-local
DATABASE_PATH=/chemin/absolu/vers/users.db
```

**Ajoutez au `.gitignore`** :
```bash
# Vérifier que .env est ignoré
echo ".env" >> .gitignore
git add .gitignore
git commit -m "Ensure .env is ignored"
```

### Étape 1.5 : Lister vos changements actuels non déployés

Vous avez dit avoir "beaucoup de changements" dans la nouvelle version.

**Listez-les dans un fichier** `CHANGELOG-DEPLOY.md` :

```markdown
# Changements à déployer - Version [DATE]

## Nouvelles fonctionnalités
- [ ] Système de logs de sécurité avancé
- [ ] Gestion des profils utilisateurs
- [ ] Dashboard super-admin amélioré
- [ ] [autres...]

## Changements de base de données
- [ ] Nouvelle table : `profile_changes_logs`
- [ ] Nouvelle table : `security_logs`
- [ ] Nouvelle colonne dans `users` : `department`
- [ ] [autres...]

## Fichiers modifiés
- server.js
- public/js/app.js
- public/super-admin.html
- [voir git status pour la liste complète]

## Scripts supprimés
- scripts/check-audit-actions.js (nettoyage)
- scripts/compare-databases.js (nettoyage)
- [autres...]

## Risques identifiés
❗ La table `profile_changes_logs` n'existe pas en production
❗ Le code référence des colonnes qui peuvent ne pas exister
❗ [autres risques...]
```

**Comment générer cette liste** :
```bash
git status > changes.txt
git diff main > detailed-changes.diff
```

### Étape 1.6 : Décider de la stratégie de migration DB

**Vous avez 2 options** :

#### Option A : Migration Destructive (RESET complet)
- ✅ Simple
- ✅ Garantit que local = production
- ❌ **PERD TOUTES LES DONNÉES** de production
- 👉 À utiliser SI : Pas encore de vraies données utilisateur en production

#### Option B : Migration Incrémentale (ADD uniquement)
- ✅ Conserve les données production
- ✅ Ajoute seulement ce qui manque
- ⚠️ Plus complexe
- 👉 À utiliser SI : Vous avez des vraies données utilisateur en production

**Votre choix** : [ ] Option A  ou  [ ] Option B

---

## PHASE 2 : SCRIPTS DE MIGRATION (CLAUDE - Automatisé)

### Ce que Claude va créer pour vous :

Une fois la Phase 1 terminée, vous direz à Claude :

```
"Phase 1 terminée. Voici mon fichier db-status.md.
J'ai choisi l'option [A ou B] pour la migration.
Crée les scripts de migration pour moi."
```

**Claude créera** :

#### 2.1 Script de comparaison DB
📁 `scripts/compare-db-schemas.js`
- Compare la structure locale vs production
- Liste les différences (tables, colonnes, index)
- Génère un rapport

#### 2.2 Scripts de migration versionnés
📁 `migrations/001-initial-schema.sql`
📁 `migrations/002-add-audit-logs-table.sql`
📁 `migrations/003-add-department-column.sql`
etc...

#### 2.3 Script d'application des migrations
📁 `scripts/run-migrations.js`
- Lit les migrations dans l'ordre
- Applique uniquement celles non exécutées
- Enregistre l'historique

#### 2.4 Script de backup
📁 `scripts/backup-database.js`
- Crée un backup horodaté de la DB
- Conserve les N derniers backups
- Vérifie que le backup est valide

#### 2.5 Script de rollback
📁 `scripts/rollback-database.js`
- Restaure le dernier backup
- Permet de revenir en arrière

---

## PHASE 3 : CONFIGURATION CI/CD (CLAUDE - Automatisé)

### Ce que Claude va créer pour vous :

**Si vous utilisez GitHub** :

📁 `.github/workflows/deploy.yml`

```yaml
name: Deploy to Production

on:
  push:
    branches: [main]
  workflow_dispatch: # Permet déclenchement manuel

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm install
      - run: npm test # Si vous avez des tests
      - run: node scripts/compare-db-schemas.js # Vérif DB

  deploy:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    steps:
      - name: Deploy to server
        uses: appleboy/ssh-action@master
        with:
          host: ${{ secrets.SERVER_HOST }}
          username: ${{ secrets.SERVER_USER }}
          key: ${{ secrets.SSH_PRIVATE_KEY }}
          script: |
            cd /chemin/vers/app
            node scripts/backup-database.js
            git pull origin main
            npm install --production
            node scripts/run-migrations.js
            pm2 restart archivage-app
            sleep 5
            curl -f http://localhost:4000/health || exit 1
```

**Claude créera aussi** :

📁 `scripts/health-check.js` (endpoint de santé)
📁 `.github/workflows/test-on-pr.yml` (tests sur Pull Requests)

---

## PHASE 4 : PREMIER DÉPLOIEMENT (VOUS + CLAUDE)

### Étape 4.1 : Configuration des Secrets GitHub (VOUS)

**Sur GitHub** :
1. Allez sur votre repo → Settings → Secrets and variables → Actions
2. Cliquez "New repository secret"
3. Ajoutez :

| Nom | Valeur | Description |
|-----|--------|-------------|
| `SERVER_HOST` | `123.45.67.89` | IP de votre serveur |
| `SERVER_USER` | `ubuntu` ou `root` | Utilisateur SSH |
| `SSH_PRIVATE_KEY` | `-----BEGIN OPENSSH...` | Clé SSH privée |
| `SERVER_APP_PATH` | `/var/www/archivage-cerer` | Chemin de l'app |

**Comment obtenir la clé SSH** :
```bash
# Sur votre machine locale
cat ~/.ssh/id_rsa
# Copiez TOUT le contenu (y compris BEGIN et END)
```

Si vous n'avez pas de clé SSH :
```bash
ssh-keygen -t rsa -b 4096 -C "deploy@archivage-cerer"
# Copiez la clé publique sur le serveur
ssh-copy-id votre-user@votre-serveur-ip
```

### Étape 4.2 : Test en Mode Manuel (VOUS)

**AVANT de déclencher le CI/CD automatique**, testez manuellement :

```bash
# 1. Sur votre serveur de production, en SSH
cd /chemin/vers/votre/app

# 2. Backup manuel
node scripts/backup-database.js

# 3. Vérifier que le backup existe
ls -lh backups/

# 4. Tester une migration (sur une COPIE de la DB)
cp users.db users.db.test
DATABASE_PATH=./users.db.test node scripts/run-migrations.js

# 5. Vérifier que ça a marché
sqlite3 users.db.test ".schema"

# 6. Si OK, supprimer le test
rm users.db.test
```

### Étape 4.3 : Premier Push avec CI/CD (VOUS)

**Moment de vérité** !

```bash
# 1. Assurez-vous que tous vos changements sont commités
git add .
git commit -m "Setup CI/CD pipeline with database migrations"

# 2. Pusher sur la branche de test d'abord
git push origin setup-ci-cd

# 3. Créer une Pull Request sur GitHub
# Aller sur GitHub → Pull Requests → New PR
# Comparer : main ← setup-ci-cd

# 4. Observer les tests dans la PR
# GitHub Actions va automatiquement tester

# 5. Si les tests passent → Merge la PR
# Cela déclenchera le déploiement automatique
```

### Étape 4.4 : Surveillance du Déploiement (VOUS)

**Pendant le déploiement** :

1. **Sur GitHub** → Actions → Voir le workflow en cours
2. **En parallèle, en SSH sur le serveur** :
   ```bash
   # Suivre les logs du serveur
   pm2 logs archivage-app --lines 100
   ```

3. **Surveiller les étapes** :
   - ✅ Backup créé ?
   - ✅ Migrations appliquées ?
   - ✅ Serveur redémarré ?
   - ✅ Health check OK ?

### Étape 4.5 : Vérification Post-Déploiement (VOUS)

**Checklist de vérification** :

- [ ] L'application répond : `curl https://votre-domaine.com/`
- [ ] Login fonctionne
- [ ] Les nouvelles fonctionnalités sont visibles
- [ ] Les anciennes données sont toujours là
- [ ] Les logs ne montrent pas d'erreurs
- [ ] La DB a la bonne structure :
  ```bash
  sqlite3 users.db ".schema" | grep "nouvelle_colonne"
  ```

**Si tout est OK** :
```bash
# Localement
git checkout main
git pull origin main
# Vous êtes synchronisé !
```

**Si problème** :
→ Voir [Section Résolution de Problèmes](#résolution-de-problèmes)

---

## PHASE 5 : VALIDATION (VOUS - Manuel)

### Test de bout en bout

**Scénario de test complet** :

1. **Faire un petit changement** :
   ```javascript
   // Dans server.js, ajouter un commentaire
   // Test CI/CD - déploiement automatique
   ```

2. **Commit et push** :
   ```bash
   git add server.js
   git commit -m "Test: Vérification CI/CD fonctionne"
   git push origin main
   ```

3. **Observer** :
   - GitHub Actions se déclenche automatiquement
   - Tests exécutés
   - Déploiement automatique
   - Application redémarre

4. **Vérifier en production** :
   - Le changement est bien déployé
   - Temps écoulé : ~2-5 minutes

**Si ce test fonctionne → Félicitations, votre CI/CD est opérationnel ! 🎉**

---

## WORKFLOW FUTUR

### Développement quotidien

```bash
# 1. Créer une branche pour votre fonctionnalité
git checkout -b feature/nouvelle-fonction

# 2. Coder votre fonctionnalité
# ... éditer les fichiers ...

# 3. Si vous modifiez la DB, créer une migration
# migrations/004-add-new-feature-table.sql

# 4. Tester en local
npm test
node scripts/run-migrations.js

# 5. Commit
git add .
git commit -m "Feature: Ajout de la nouvelle fonction"

# 6. Push
git push origin feature/nouvelle-fonction

# 7. Créer une Pull Request sur GitHub
# Les tests automatiques se déclenchent

# 8. Si tests OK → Merge vers main
# Le déploiement automatique se déclenche

# 9. Vérifier en production après 5 minutes
```

### Changements de base de données

**Toujours créer une migration** :

```sql
-- migrations/005-add-user-avatar.sql
ALTER TABLE users ADD COLUMN avatar_url TEXT;

-- Données par défaut si nécessaire
UPDATE users SET avatar_url = '/images/default-avatar.png'
WHERE avatar_url IS NULL;
```

**Tester en local** :
```bash
node scripts/run-migrations.js
# Vérifier que ça fonctionne
sqlite3 users.db "SELECT avatar_url FROM users LIMIT 1;"
```

**Push** :
```bash
git add migrations/005-add-user-avatar.sql
git commit -m "DB Migration: Add user avatar support"
git push origin main
# Le CI/CD appliquera automatiquement la migration en production
```

### Rollback en cas de problème

**Si le déploiement cause un problème** :

**Option 1 : Rollback automatique (déjà configuré)**
- Le health check détecte le problème
- GitHub Actions fait un rollback auto

**Option 2 : Rollback manuel**
```bash
# Sur le serveur en SSH
cd /chemin/vers/app
node scripts/rollback-database.js
git reset --hard HEAD~1  # Revenir au commit précédent
pm2 restart archivage-app
```

**Option 3 : Déployer un fix rapide**
```bash
# Localement, corriger le bug
git add .
git commit -m "Hotfix: Correction du bug X"
git push origin main
# Le CI/CD redéploie automatiquement
```

---

## RÉSOLUTION DE PROBLÈMES

### Problème 1 : "Migration failed - column already exists"

**Cause** : La migration essaie d'ajouter une colonne qui existe déjà.

**Solution** :
```bash
# Sur le serveur
sqlite3 users.db ".schema users"
# Vérifier si la colonne existe

# Si elle existe, marquer la migration comme appliquée
# Dans scripts/run-migrations.js, ajouter la migration à la table d'historique
```

### Problème 2 : "GitHub Actions : Permission denied (SSH)"

**Cause** : La clé SSH n'est pas correctement configurée.

**Solution** :
1. Vérifier que la clé SSH est correcte dans les secrets GitHub
2. Vérifier que la clé publique est dans `~/.ssh/authorized_keys` sur le serveur
3. Tester manuellement :
   ```bash
   ssh -i ~/.ssh/id_rsa votre-user@serveur-ip
   ```

### Problème 3 : "Database locked"

**Cause** : L'application tourne pendant la migration.

**Solution** :
Modifier le script de déploiement pour arrêter l'app AVANT la migration :
```bash
pm2 stop archivage-app
node scripts/run-migrations.js
pm2 start archivage-app
```

### Problème 4 : "Health check failed"

**Cause** : L'application ne démarre pas correctement.

**Solution** :
```bash
# SSH sur le serveur
pm2 logs archivage-app --lines 50
# Lire les erreurs

# Vérifier que les dépendances sont installées
npm list

# Vérifier les variables d'environnement
cat .env
```

### Problème 5 : "Tests passent en local mais échouent sur GitHub Actions"

**Cause** : Différence d'environnement.

**Solution** :
- Vérifier la version de Node.js (doit être la même)
- Vérifier les variables d'environnement
- Ajouter des logs dans les tests pour débugger

---

## CHECKLIST FINALE

### Avant de commencer demain :

- [ ] J'ai lu et compris ce guide entièrement
- [ ] J'ai vérifié tous les prérequis (Section PRÉREQUIS)
- [ ] J'ai fait un backup manuel de la DB production
- [ ] J'ai documenté les différences DB dans `db-status.md`
- [ ] J'ai listé mes changements dans `CHANGELOG-DEPLOY.md`
- [ ] Je sais quelle option de migration choisir (A ou B)
- [ ] J'ai du temps (prévoir 2-3 heures pour la première mise en place)
- [ ] J'ai accès SSH au serveur
- [ ] Mon code est sur GitHub/GitLab

### Quand je serai prêt :

**Dire à Claude** :
```
"J'ai terminé la Phase 1 de préparation.
Voici mes fichiers db-status.md et CHANGELOG-DEPLOY.md.
J'ai choisi l'option [A/B] pour la migration.
Peux-tu créer les scripts de la Phase 2 ?"
```

**Claude créera alors** :
- Tous les scripts de migration
- La configuration GitHub Actions
- Les scripts de backup/rollback
- Les tests

**Puis vous suivrez les phases 3, 4, 5** avec l'accompagnement de Claude.

---

## QUESTIONS FRÉQUENTES

### Q : Combien de temps prend la mise en place ?
**R** :
- Phase 1 (Préparation) : 1-2 heures (vous)
- Phase 2 (Scripts) : 30 minutes (Claude)
- Phase 3 (CI/CD) : 30 minutes (Claude)
- Phase 4 (Premier déploiement) : 1 heure (vous + Claude)
- **Total : ~3-4 heures pour la première fois**

Ensuite, chaque déploiement prend **2-5 minutes automatiquement**.

### Q : Est-ce que je dois payer pour GitHub Actions ?
**R** : Non, 2000 minutes/mois gratuites. Vous utiliserez ~5 min/déploiement = 400 déploiements gratuits/mois.

### Q : Si je n'ai pas de tests, je peux quand même utiliser CI/CD ?
**R** : Oui ! On peut configurer le CI/CD sans tests. Mais il est recommandé d'en ajouter au moins quelques-uns basiques.

### Q : Puis-je tester sans déployer en production d'abord ?
**R** : Oui ! On peut configurer un environnement de staging (test) d'abord. Recommandé pour la première fois.

### Q : Que faire si j'ai plusieurs serveurs (dev, staging, prod) ?
**R** : On créera plusieurs workflows GitHub Actions, un par environnement.

### Q : SQLite est-il adapté pour la production avec CI/CD ?
**R** : Oui, pour des applications de petite à moyenne taille. Au-delà de 100k requêtes/jour, envisager PostgreSQL.

---

## PROCHAINES ÉTAPES

### Demain, quand vous serez prêt :

1. **Lire ce guide complètement** ✅ (vous êtes ici)
2. **Faire la Phase 1 (Préparation)** - Compter 1-2h
3. **Revenir vers Claude** avec vos fichiers `db-status.md` et `CHANGELOG-DEPLOY.md`
4. **Laisser Claude créer les scripts** (Phase 2-3)
5. **Exécuter le premier déploiement** ensemble (Phase 4-5)

### Pour aller plus loin (après que le CI/CD fonctionne) :

- [ ] Ajouter des tests unitaires
- [ ] Configurer un environnement de staging
- [ ] Ajouter des notifications Slack/Discord sur les déploiements
- [ ] Mettre en place un monitoring (Sentry, LogRocket)
- [ ] Configurer des alertes en cas d'erreur

---

**Bonne chance pour demain ! 🚀**

**N'hésitez pas à revenir vers Claude si vous avez des questions pendant la Phase 1.**

---

*Guide créé par Claude Code - 27 décembre 2025*
