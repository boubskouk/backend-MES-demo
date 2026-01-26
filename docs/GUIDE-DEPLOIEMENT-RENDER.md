# GUIDE DE DÉPLOIEMENT - RENDER

## Production avec base vide

---

## PRÉREQUIS

- Compte GitHub (pour héberger le code)
- Carte bancaire (pour MongoDB Atlas, même gratuit)
- 30 minutes de temps

---

## ÉTAPE 1 : Créer la base MongoDB Atlas (Gratuit)

### 1.1 Créer un compte
```
1. Aller sur https://www.mongodb.com/atlas
2. Cliquer "Try Free"
3. S'inscrire (Google, GitHub, ou email)
```

### 1.2 Créer un cluster gratuit
```
1. Cliquer "Build a Database"
2. Choisir "M0 FREE"
3. Provider : AWS
4. Region : eu-west-1 (Paris) ou eu-central-1 (Frankfurt)
5. Cluster name : archivage-prod
6. Cliquer "Create"
7. Attendre 2-3 minutes
```

### 1.3 Créer un utilisateur base de données
```
1. Menu gauche : Security → Database Access
2. Cliquer "Add New Database User"
3. Authentication Method : Password
4. Username : archivage_user
5. Password : Cliquer "Autogenerate Secure Password"
6. ⚠️ NOTER LE MOT DE PASSE quelque part !
7. Database User Privileges : "Read and write to any database"
8. Cliquer "Add User"
```

### 1.4 Autoriser les connexions
```
1. Menu gauche : Security → Network Access
2. Cliquer "Add IP Address"
3. Cliquer "Allow Access from Anywhere"
4. Confirmer "0.0.0.0/0"
5. Cliquer "Confirm"
```

### 1.5 Récupérer l'URI de connexion
```
1. Menu gauche : Database → Clusters
2. Cliquer "Connect" sur votre cluster
3. Choisir "Connect your application"
4. Driver : Node.js, Version : 4.1 or later
5. Copier l'URI qui ressemble à :

mongodb+srv://archivage_user:<password>@archivage-prod.xxxxx.mongodb.net/?retryWrites=true&w=majority

6. Remplacer <password> par votre mot de passe
7. Ajouter le nom de la base après .net/ :

mongodb+srv://archivage_user:VOTRE_MOT_DE_PASSE@archivage-prod.xxxxx.mongodb.net/mes_archivage?retryWrites=true&w=majority
```

### 1.6 Garder l'URI
```
Votre URI final (exemple) :
mongodb+srv://archivage_user:MonMotDePasse123@archivage-prod.abc123.mongodb.net/mes_archivage?retryWrites=true&w=majority

⚠️ GARDER CETTE URI POUR L'ÉTAPE 3
```

---

## ÉTAPE 2 : Préparer le code sur GitHub

### 2.1 Créer un repository GitHub
```
1. Aller sur https://github.com
2. Se connecter ou créer un compte
3. Cliquer "+" → "New repository"
4. Repository name : archivage-mutuelle
5. Private (recommandé)
6. Cliquer "Create repository"
```

### 2.2 Pousser le code (depuis votre PC)
```bash
# Dans le dossier de l'application
cd "E:\site et apps\archivage cerer\backend-MES-demo"

# Initialiser git (si pas déjà fait)
git init

# Ajouter tous les fichiers
git add .

# Premier commit
git commit -m "Initial commit - Application archivage"

# Connecter à GitHub
git remote add origin https://github.com/VOTRE_USERNAME/archivage-mutuelle.git

# Pousser
git branch -M main
git push -u origin main
```

### 2.3 Fichiers à vérifier avant push

**Créer un fichier `.gitignore`** (s'il n'existe pas) :
```
node_modules/
.env
storage/files/
*.log
.DS_Store
```

---

## ÉTAPE 3 : Déployer sur Render

### 3.1 Créer un compte Render
```
1. Aller sur https://render.com
2. Cliquer "Get Started for Free"
3. S'inscrire avec GitHub (recommandé)
```

### 3.2 Créer un Web Service
```
1. Dashboard → "New +" → "Web Service"
2. Connecter votre repository GitHub
3. Sélectionner "archivage-mutuelle"
4. Cliquer "Connect"
```

### 3.3 Configuration du service
```
Name            : archivage-mutuelle
Region          : Frankfurt (EU Central)
Branch          : main
Root Directory  : (laisser vide)
Runtime         : Node
Build Command   : npm install
Start Command   : node server.js
Instance Type   : Free
```

### 3.4 Variables d'environnement

Cliquer "Advanced" → "Add Environment Variable"

| Key | Value |
|-----|-------|
| `NODE_ENV` | `production` |
| `PORT` | `10000` |
| `MONGODB_URI` | `mongodb+srv://archivage_user:PASSWORD@archivage-prod.xxxxx.mongodb.net/mes_archivage?retryWrites=true&w=majority` |
| `SESSION_SECRET` | `votre_chaine_aleatoire_32_caracteres_minimum` |
| `SESSION_CRYPTO_SECRET` | `autre_chaine_aleatoire_32_caracteres` |
| `STORAGE_MODE` | `mongodb` |

**Pour générer des secrets aléatoires :**
```bash
# Dans un terminal
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 3.5 Déployer
```
1. Cliquer "Create Web Service"
2. Attendre le déploiement (5-10 minutes)
3. Voir les logs pour vérifier que tout va bien
```

### 3.6 URL de votre application
```
https://archivage-mutuelle.onrender.com
```

---

## ÉTAPE 4 : Créer le Super Admin

### Option A : Via le Shell Render

```
1. Dashboard → Votre service → "Shell"
2. Exécuter :

node scripts/create-superadmin-production.js admin VotreMotDePasseFort123!

3. Noter les identifiants affichés
```

### Option B : Via MongoDB Atlas (si Shell ne fonctionne pas)

```
1. MongoDB Atlas → Database → Browse Collections
2. Cliquer sur "mes_archivage" → "users"
3. Cliquer "Insert Document"
4. Coller ce JSON :
```

```json
{
  "username": "admin",
  "password": "$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi",
  "nom": "Super",
  "prenom": "Admin",
  "role": "superadmin",
  "niveau": 0,
  "actif": true,
  "mustChangePassword": true,
  "createdAt": { "$date": { "$numberLong": "1705449600000" } }
}
```

**⚠️ Le mot de passe par défaut est : `password`**
**Changez-le immédiatement après connexion !**

Pour générer un hash bcrypt personnalisé :
```bash
node -e "require('bcryptjs').hash('VotreMotDePasse123!', 10).then(console.log)"
```

---

## ÉTAPE 5 : Premier accès

### 5.1 Accéder à l'application
```
https://archivage-mutuelle.onrender.com
```

### 5.2 Connexion Super Admin
```
URL : https://archivage-mutuelle.onrender.com/super-admin-login.html
Username : admin
Password : VotreMotDePasseFort123! (ou "password" si Option B)
```

### 5.3 Changer le mot de passe
```
Profil → Changer mot de passe
```

---

## ÉTAPE 6 : Configurer l'application

### 6.1 Créer les départements
```
Menu → Gestion → Départements → Ajouter

Exemples :
- Administration
- Comptabilité
- Ressources Humaines
- Direction
```

### 6.2 Créer les services
```
Menu → Gestion → Services → Ajouter

Exemples :
- Service Paie (Département: Comptabilité)
- Service Recrutement (Département: RH)
- Secrétariat (Département: Administration)
```

### 6.3 Créer les catégories de documents
```
Menu → Gestion → Catégories → Ajouter

Exemples :
- Contrats
- Factures
- PV Réunions
- Notes de service
- Bulletins de paie
- Rapports
```

### 6.4 Créer les utilisateurs
```
Menu → Gestion → Utilisateurs → Ajouter

Pour chaque utilisateur :
- Username
- Mot de passe temporaire
- Nom, Prénom
- Niveau (1, 2 ou 3)
- Département
- Service
```

---

## ÉTAPE 7 : Tester l'application

### Checklist de test
```
□ Connexion Super Admin OK
□ Création département OK
□ Création service OK
□ Création catégorie OK
□ Création utilisateur niveau 1 OK
□ Connexion utilisateur niveau 1 OK
□ Upload document OK
□ Prévisualisation document OK
□ Téléchargement document OK
□ Partage document OK
□ Recherche document OK
```

---

## COMMANDES UTILES

### Voir les logs
```
Render Dashboard → Votre service → Logs
```

### Redéployer
```
Render Dashboard → Votre service → "Manual Deploy" → "Deploy latest commit"
```

### Accéder au Shell
```
Render Dashboard → Votre service → Shell
```

### Voir la base de données
```
MongoDB Atlas → Database → Browse Collections
```

---

## DÉPANNAGE

### L'application ne démarre pas
```
1. Vérifier les logs Render
2. Vérifier que MONGODB_URI est correct
3. Vérifier que le mot de passe MongoDB n'a pas de caractères spéciaux problématiques
```

### Erreur de connexion MongoDB
```
1. Vérifier Network Access dans Atlas (0.0.0.0/0)
2. Vérifier que l'utilisateur existe dans Database Access
3. Vérifier l'URI (pas d'espaces, bon mot de passe)
```

### Super Admin ne peut pas se connecter
```
1. Vérifier dans MongoDB Atlas → users que l'utilisateur existe
2. Vérifier que le champ "actif" est true
3. Vérifier que le champ "role" est "superadmin"
```

### Application lente au premier accès
```
Normal sur Render gratuit - le serveur "dort" après 15 min d'inactivité
Premier accès = 30 secondes d'attente
Solution : Passer au plan Starter ($7/mois)
```

---

## LIMITATIONS RENDER GRATUIT

| Limitation | Impact |
|------------|--------|
| Sleep après 15 min | 30s d'attente au réveil |
| 512 MB MongoDB Atlas | ~500 documents max |
| CPU partagé | Lenteurs possibles |
| Pas de stockage persistant | Fichiers en base64 |

---

## PROCHAINES ÉTAPES (Optionnel)

### Passer en production sérieuse
```
1. Render Starter : $7/mois (pas de sleep)
2. MongoDB Atlas M2 : $9/mois (2 GB)
3. Ou migrer vers VPS : $7/mois (tout inclus)
```

### Nom de domaine personnalisé
```
1. Acheter un domaine (OVH, Namecheap, etc.)
2. Render → Settings → Custom Domain
3. Ajouter les DNS
```

---

## RÉSUMÉ

```
┌─────────────────────────────────────────────────────┐
│                                                     │
│   PRODUCTION RENDER - CHECKLIST                     │
│                                                     │
│   □ MongoDB Atlas créé                             │
│   □ Code sur GitHub                                │
│   □ Render déployé                                 │
│   □ Variables d'environnement configurées          │
│   □ Super Admin créé                               │
│   □ Connexion testée                               │
│   □ Départements créés                             │
│   □ Services créés                                 │
│   □ Catégories créées                              │
│   □ Utilisateurs créés                             │
│   □ Test upload document OK                        │
│                                                     │
│   ✅ PRODUCTION PRÊTE                              │
│                                                     │
└─────────────────────────────────────────────────────┘
```

---

*Document créé le : Janvier 2025*
*Pour : Déploiement application archivage sur Render*
