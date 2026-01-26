# GED CERER - Système d'Archivage

Plateforme de Gestion Électronique de Documents pour le C.E.R.E.R (Centre d'Études et de Recherches sur les Énergies Renouvelables).

---

## DEMARRAGE RAPIDE

### Option 1 : Démarrage automatique (RECOMMANDE)

Double-cliquez sur le fichier :
```
start.bat
```

Le serveur démarrera automatiquement sur http://localhost:4000

### Option 2 : Démarrage manuel

```bash
node server.js
```

---

## CONFIGURATION REQUISE

### Logiciels nécessaires

- **Node.js** v14 ou supérieur
- **MongoDB** local ou Atlas
- **Navigateur** moderne (Chrome, Firefox, Edge)

### Configuration

Le fichier `.env` contient toutes les configurations :

```env
# MongoDB
MONGODB_URI=mongodb://localhost:27017
PORT=4000
NODE_ENV=development

# Sessions
SESSION_SECRET=<votre_secret>
SESSION_MAX_AGE=86400000

# Email (SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=<votre_email>
SMTP_PASS=<votre_mot_de_passe_application>
```

---

## UTILISATION

### 1. Créer un utilisateur

**Via l'interface web :**
1. Connectez-vous avec un compte administrateur
2. Allez dans "Gestion des utilisateurs"
3. Cliquez sur "Créer un utilisateur"
4. Remplissez le formulaire
5. L'utilisateur recevra un email avec ses identifiants

**Domaines universitaires acceptés :**
- @ucad.edu.sn
- @ucad.sn
- @ugb.edu.sn
- @uadb.edu.sn
- @uit.sn
- Et autres universités sénégalaises

### 2. Se connecter

1. Allez sur http://localhost:4000
2. Entrez votre nom d'utilisateur et mot de passe
3. À la première connexion, changez votre mot de passe

### 3. Uploader des documents

1. Cliquez sur "Nouveau document"
2. Sélectionnez la catégorie
3. Choisissez le fichier
4. Ajoutez une description
5. Cliquez sur "Envoyer"

### 4. Gérer les documents

- **Consulter** : Cliquez sur "Voir" pour ouvrir le document
- **Télécharger** : Cliquez sur "Télécharger"
- **Partager** : Cliquez sur "Partager" et sélectionnez les utilisateurs
- **Supprimer** : Cliquez sur "Supprimer" (nécessite autorisation)

---

## ROLES ET PERMISSIONS

### Niveau 1 : Admin Principal
- Accès complet à tous les documents
- Gestion des utilisateurs
- Gestion des catégories
- Validation des suppressions

### Niveau 2 : Admin Secondaire
- Accès à tous les documents
- Peut créer des utilisateurs
- Peut créer des catégories
- Demande suppression documents

### Niveau 3 : Utilisateur Tertiaire
- Accès aux documents publics
- Accès aux documents partagés avec lui
- Upload de documents
- Demande suppression documents

---

## FONCTIONNALITES

### Documents
- Upload multi-formats (PDF, DOCX, XLSX, images, etc.)
- Prévisualisation en ligne
- Téléchargement
- Partage avec permissions
- Catégorisation

### Gestion des utilisateurs
- Création avec validation email
- Assignation de rôles
- Départements
- Suivi des connexions

### Sécurité
- Mots de passe hashés (bcrypt)
- Sessions sécurisées
- Validation des emails
- Rate limiting (protection contre brute force)
- CORS configuré

### Notifications
- Email de bienvenue
- Détection première connexion
- Suggestions changement mot de passe

---

## STRUCTURE DU PROJET

```
backend/
├── server.js              # Serveur principal
├── security-config.js     # Configuration sécurité
├── start.bat             # Script de démarrage Windows
├── .env                  # Configuration (NE PAS COMMITER)
├── package.json          # Dépendances
├── public/               # Fichiers frontend
│   ├── index.html
│   ├── dashboard.html
│   ├── css/
│   ├── js/
│   └── uploads/         # Documents uploadés
├── services/
│   └── emailService.js  # Service d'envoi d'emails
└── scripts_archive/     # Scripts de test archivés
```

---

## MAINTENANCE

### Voir les utilisateurs

Les scripts sont dans `scripts_archive/` :

```bash
node scripts_archive/list-all-users.js
```

### Vérifier MongoDB

```bash
node scripts_archive/check-databases.js
```

### Créer un admin

```bash
node scripts_archive/create-admin-principal.js
```

---

## DEPANNAGE

### Le serveur ne démarre pas

1. Vérifiez que MongoDB est en cours d'exécution
2. Vérifiez le port 4000 n'est pas déjà utilisé
3. Vérifiez le fichier `.env`

### Les emails ne s'envoient pas

1. Vérifiez `SMTP_USER` et `SMTP_PASS` dans `.env`
2. Pour Gmail, créez un mot de passe d'application
3. Activez 2FA sur votre compte Gmail
4. Alternative : Utilisez Mailtrap pour les tests

### Erreur de connexion MongoDB

1. Démarrez MongoDB : `mongod`
2. Vérifiez l'URI dans `.env`
3. Testez la connexion :
   ```bash
   node scripts_archive/check-local-mongodb.js
   ```

---

## DEPLOIEMENT EN PRODUCTION

### 1. Préparer l'environnement

- Utilisez MongoDB Atlas (cloud)
- Configurez un vrai serveur SMTP
- Changez `SESSION_SECRET`
- Passez `NODE_ENV=production`

### 2. Plateformes recommandées

- **Render.com** (gratuit pour débuter)
- **Heroku**
- **DigitalOcean**
- **VPS avec Nginx**

### 3. Variables d'environnement

Configurez toutes les variables du fichier `.env` sur votre plateforme :

```
MONGODB_URI=mongodb+srv://...
PORT=4000
SESSION_SECRET=<nouveau_secret_aleatoire>
SMTP_HOST=...
SMTP_USER=...
SMTP_PASS=...
```

---

## SUPPORT

### Documentation complète

Consultez le fichier `SYSTEME-EMAIL-PRET.md` pour :
- Configuration email détaillée
- Test du système
- Troubleshooting

### Scripts archivés

Tous les scripts de test et maintenance sont dans `scripts_archive/`

---

## SECURITE

### Bonnes pratiques appliquées

- Mots de passe hashés avec bcrypt (10 rounds)
- Sessions chiffrées et stockées dans MongoDB
- Validation des entrées utilisateur
- Protection CSRF
- Rate limiting sur les endpoints sensibles
- CORS configuré
- Headers de sécurité (Helmet)

### À ne JAMAIS faire

- Commiter le fichier `.env`
- Partager `SESSION_SECRET`
- Utiliser des mots de passe faibles
- Désactiver la validation d'email
- Exposer les erreurs détaillées en production

---

## LICENCE

Projet privé - C.E.R.E.R
Tous droits réservés

---

**Date de création :** Novembre 2025
**Version :** 1.0
**Contact :** jacquesboubacar.koukoui@gmail.com
