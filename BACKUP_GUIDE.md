# Guide de Sauvegarde et Restauration MongoDB

Ce guide explique comment utiliser les scripts de sauvegarde automatique de la base de données MongoDB pour le système d'archivage C.E.R.E.R.

## 📋 Table des matières

1. [Prérequis](#prérequis)
2. [Installation](#installation)
3. [Utilisation manuelle](#utilisation-manuelle)
4. [Configuration automatique](#configuration-automatique)
5. [Restauration](#restauration)
6. [Dépannage](#dépannage)

---

## 🔧 Prérequis

### 1. MongoDB Database Tools

Les scripts utilisent `mongodump` et `mongorestore`, qui font partie des **MongoDB Database Tools**.

#### Installation sur Windows

1. Téléchargez depuis: https://www.mongodb.com/try/download/database-tools
2. Choisissez votre version de Windows
3. Décompressez l'archive
4. Ajoutez le dossier `bin` au PATH système :
   - Ouvrez les "Variables d'environnement"
   - Modifiez la variable `Path`
   - Ajoutez le chemin vers le dossier `bin` (ex: `C:\mongodb-database-tools\bin`)

#### Installation sur Linux/Mac

```bash
# Ubuntu/Debian
sudo apt-get install mongodb-database-tools

# macOS (Homebrew)
brew install mongodb-database-tools
```

#### Vérification de l'installation

```bash
mongodump --version
mongorestore --version
```

### 2. Variables d'environnement

Assurez-vous que votre fichier `.env` contient :

```env
# URI MongoDB (Production)
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/

# Nom de la base de données
MONGODB_DB_NAME=cerer_archivage

# Optionnel: Dossier de sauvegarde personnalisé
# BACKUP_DIR=/chemin/vers/backups

# Optionnel: Nombre de sauvegardes à conserver (défaut: 7)
# BACKUP_RETENTION_COUNT=7
```

---

## 📦 Installation

Les scripts sont déjà créés dans le dossier `scripts/`. Aucune installation supplémentaire n'est nécessaire.

Structure des fichiers :
```
backend/
├── scripts/
│   ├── backup-database.js      # Script de sauvegarde
│   └── restore-database.js     # Script de restauration
├── backups/                    # Dossier créé automatiquement
│   ├── backup_2025-11-30_14-30-00/
│   ├── backup_2025-11-29_14-30-00/
│   └── ...
└── package.json
```

---

## 🚀 Utilisation manuelle

### Sauvegarde

Pour effectuer une sauvegarde manuellement :

```bash
# Méthode 1: Via npm
npm run backup

# Méthode 2: Directement avec Node
node scripts/backup-database.js
```

**Résultat :**
- Crée un dossier `backups/backup_YYYY-MM-DD_HH-MM-SS/`
- Supprime automatiquement les sauvegardes au-delà de 7 jours
- Affiche la taille et les détails de la sauvegarde

**Exemple de sortie :**
```
============================================
SAUVEGARDE MONGODB - DÉMARRAGE
============================================

📅 Date: 30/11/2025 14:30:00
🗄️  Base de données: cerer_archivage
📁 Dossier de sauvegarde: E:\...\backend\backups

🔄 Sauvegarde en cours...

✅ Sauvegarde réussie !
   📁 Dossier: backup_2025-11-30_14-30-00
   📊 Créé le: 30/11/2025 14:30:00
   💾 Taille: 2.5 MB

✅ Nombre de sauvegardes: 5/7 (aucun nettoyage nécessaire)

============================================
SAUVEGARDE TERMINÉE AVEC SUCCÈS
============================================
```

### Restauration

Pour restaurer une sauvegarde :

```bash
# Restaurer la sauvegarde la plus récente (avec confirmation)
npm run restore

# Restaurer une sauvegarde spécifique
npm run restore backup_2025-11-30_14-30-00
```

**Le script vous demandera confirmation avant de restaurer !**

---

## ⏰ Configuration automatique

### Sur Linux (Serveur de production)

Utilisez **cron** pour planifier les sauvegardes quotidiennes.

#### 1. Ouvrir l'éditeur cron

```bash
crontab -e
```

#### 2. Ajouter une tâche quotidienne

**Exemple : Sauvegarde tous les jours à 2h du matin**

```bash
# Sauvegarde quotidienne à 2h00
0 2 * * * cd /chemin/vers/backend && /usr/bin/node scripts/backup-database.js >> /var/log/mongodb-backup.log 2>&1
```

**Exemple : Sauvegarde tous les jours à 3h du matin avec notification**

```bash
# Sauvegarde quotidienne à 3h00
0 3 * * * cd /chemin/vers/backend && /usr/bin/node scripts/backup-database.js && echo "Sauvegarde MongoDB terminée - $(date)" | mail -s "Backup Success" admin@cerer.sn
```

#### 3. Vérifier les tâches cron

```bash
crontab -l
```

#### Syntaxe cron

```
* * * * * commande
│ │ │ │ │
│ │ │ │ └─── Jour de la semaine (0-7, 0 et 7 = dimanche)
│ │ │ └──────  Mois (1-12)
│ │ └───────── Jour du mois (1-31)
│ └────────── Heure (0-23)
└─────────── Minute (0-59)
```

**Exemples courants :**
```bash
0 2 * * *      # Tous les jours à 2h00
0 */6 * * *    # Toutes les 6 heures
0 2 * * 0      # Tous les dimanches à 2h00
0 2 1 * *      # Le 1er de chaque mois à 2h00
```

### Sur Windows

Utilisez le **Planificateur de tâches** Windows.

#### 1. Ouvrir le Planificateur de tâches

- Appuyez sur `Win + R`
- Tapez `taskschd.msc`
- Appuyez sur Entrée

#### 2. Créer une nouvelle tâche

1. Cliquez sur **"Créer une tâche..."** (dans le panneau de droite)
2. **Onglet Général** :
   - Nom : `MongoDB Backup - CERER`
   - Description : `Sauvegarde quotidienne de la base MongoDB`
   - Sélectionnez **"Exécuter même si l'utilisateur n'est pas connecté"**

3. **Onglet Déclencheurs** :
   - Cliquez sur **"Nouveau..."**
   - Choisissez **"Quotidien"**
   - Heure : `02:00:00` (2h du matin)
   - Cliquez sur **"OK"**

4. **Onglet Actions** :
   - Cliquez sur **"Nouveau..."**
   - Action : **"Démarrer un programme"**
   - Programme : `C:\Program Files\nodejs\node.exe`
   - Arguments : `scripts\backup-database.js`
   - Dossier de démarrage : `E:\site et apps\archivage cerer\backend`
   - Cliquez sur **"OK"**

5. **Onglet Conditions** :
   - Décochez **"Démarrer la tâche uniquement si l'ordinateur est relié au secteur"** (si portable)

6. **Onglet Paramètres** :
   - Cochez **"Autoriser l'exécution de la tâche à la demande"**
   - Cochez **"Exécuter la tâche dès que possible après le démarrage manqué"**

7. Cliquez sur **"OK"** pour enregistrer

#### 3. Tester la tâche

- Faites un clic droit sur la tâche créée
- Cliquez sur **"Exécuter"**
- Vérifiez que le dossier `backups/` contient une nouvelle sauvegarde

### Sur un service cloud (ex: Render, Heroku)

Pour les services cloud, vous pouvez utiliser :

#### Option 1 : Cron Job externe (cron-job.org)

1. Créez un endpoint dans votre API :

```javascript
// Dans server.js
app.post('/api/admin/backup', async (req, res) => {
    // Vérifier un token secret
    const { secret } = req.body;
    if (secret !== process.env.BACKUP_SECRET) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
        const { backupDatabase } = require('./scripts/backup-database');
        await backupDatabase();
        res.json({ success: true, message: 'Backup completed' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});
```

2. Configurez un cron job sur https://cron-job.org qui appelle cet endpoint quotidiennement

#### Option 2 : GitHub Actions

Créez `.github/workflows/backup.yml` :

```yaml
name: MongoDB Backup

on:
  schedule:
    - cron: '0 2 * * *'  # Tous les jours à 2h00 UTC
  workflow_dispatch:  # Permet l'exécution manuelle

jobs:
  backup:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      - name: Install dependencies
        run: npm install
      - name: Run backup
        env:
          MONGODB_URI: ${{ secrets.MONGODB_URI }}
        run: npm run backup
```

---

## 🔄 Restauration

### Restaurer la sauvegarde la plus récente

```bash
npm run restore
```

Le script affichera :
- La liste de toutes les sauvegardes disponibles
- Sélectionnera automatiquement la plus récente
- Demandera confirmation avant de restaurer

### Restaurer une sauvegarde spécifique

```bash
npm run restore backup_2025-11-30_14-30-00
```

### ⚠️ Important

**La restauration REMPLACE toutes les données actuelles !**

Assurez-vous de :
1. Faire une sauvegarde de la base actuelle avant de restaurer
2. Vérifier que vous restaurez la bonne sauvegarde
3. Tester la restauration sur un environnement de développement d'abord

---

## 🐛 Dépannage

### Erreur : "mongodump : command not found"

**Problème :** MongoDB Database Tools n'est pas installé ou pas dans le PATH.

**Solution :**
1. Vérifiez l'installation : `mongodump --version`
2. Ajoutez le dossier `bin` au PATH système
3. Redémarrez le terminal

### Erreur : "MONGODB_URI non défini"

**Problème :** Le fichier `.env` n'existe pas ou ne contient pas `MONGODB_URI`.

**Solution :**
1. Copiez `.env.example` vers `.env`
2. Ajoutez votre URI MongoDB : `MONGODB_URI=mongodb+srv://...`

### Erreur : "Authentication failed"

**Problème :** Les identifiants MongoDB sont incorrects.

**Solution :**
1. Vérifiez l'URI dans le fichier `.env`
2. Assurez-vous que l'utilisateur MongoDB a les permissions de lecture
3. Vérifiez que l'IP du serveur est autorisée sur MongoDB Atlas

### Les anciennes sauvegardes ne sont pas supprimées

**Problème :** La variable `BACKUP_RETENTION_COUNT` n'est pas définie.

**Solution :**
Ajoutez dans `.env` :
```env
BACKUP_RETENTION_COUNT=7
```

### Le dossier backups/ est vide

**Problème :** Le script s'exécute mais ne crée pas de sauvegarde.

**Solution :**
1. Exécutez manuellement : `npm run backup`
2. Vérifiez les logs pour voir les erreurs
3. Assurez-vous que le dossier a les permissions d'écriture

---

## 📊 Monitoring et logs

### Vérifier l'exécution des sauvegardes

```bash
# Linux : Vérifier les logs cron
grep CRON /var/log/syslog

# Lister les sauvegardes récentes
ls -lht backups/
```

### Créer un script de monitoring

Créez `scripts/check-backups.js` :

```javascript
const fs = require('fs');
const path = require('path');

const BACKUP_DIR = path.join(__dirname, '../backups');
const MAX_AGE_HOURS = 25; // Alerte si pas de backup depuis 25h

const backups = fs.readdirSync(BACKUP_DIR);
if (backups.length === 0) {
    console.error('❌ ALERTE: Aucune sauvegarde trouvée !');
    process.exit(1);
}

const latestBackup = backups
    .map(b => ({
        name: b,
        time: fs.statSync(path.join(BACKUP_DIR, b)).mtime
    }))
    .sort((a, b) => b.time - a.time)[0];

const ageHours = (Date.now() - latestBackup.time) / (1000 * 60 * 60);

if (ageHours > MAX_AGE_HOURS) {
    console.error(`❌ ALERTE: Dernière sauvegarde il y a ${ageHours.toFixed(1)}h`);
    process.exit(1);
}

console.log(`✅ Dernière sauvegarde: ${latestBackup.name} (il y a ${ageHours.toFixed(1)}h)`);
```

---

## 🔒 Sécurité

### Bonnes pratiques

1. **Ne jamais commiter les sauvegardes sur Git**
   - Ajoutez `backups/` dans `.gitignore`

2. **Protéger les sauvegardes**
   - Sur Linux : `chmod 700 backups/`
   - Limitez l'accès au dossier de sauvegarde

3. **Chiffrer les sauvegardes sensibles**
   ```bash
   # Exemple avec GPG
   tar -czf - backups/ | gpg -e -r admin@cerer.sn > backup.tar.gz.gpg
   ```

4. **Sauvegardes externes**
   - Configurez des copies vers le cloud (AWS S3, Google Cloud Storage)
   - Utilisez `rsync` pour synchroniser vers un serveur distant

---

## 📞 Support

Pour toute question ou problème :
- Email : admin@cerer.sn
- Documentation MongoDB : https://docs.mongodb.com/database-tools/

---

**Dernière mise à jour : 30 Novembre 2025**
