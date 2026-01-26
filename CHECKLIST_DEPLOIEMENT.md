# Checklist de Déploiement - Serveur UCAD

Liste de vérification rapide pour le déploiement du système d'archivage C.E.R.E.R.

---

## 📋 Avant le déploiement

### Préparation

- [ ] Obtenir l'accès SSH au serveur UCAD
- [ ] Obtenir les informations de connexion (IP, utilisateur, mot de passe)
- [ ] Demander la configuration du domaine `archivage.ucad.sn` au service informatique
- [ ] Préparer l'adresse email pour les certificats SSL
- [ ] Créer un compte MongoDB Atlas (ou préparer le serveur MongoDB local)
- [ ] Configurer le serveur SMTP UCAD pour l'envoi d'emails

### Documents nécessaires

- [ ] Identifiants MongoDB Atlas
- [ ] Identifiants serveur SMTP UCAD
- [ ] Clés API MongoDB Atlas (pour vérification backups)
- [ ] Contacts du service informatique UCAD

---

## 🖥️ Installation du serveur (Jour 1)

### Connexion initiale

```bash
ssh admin@serveur.ucad.sn
```

- [ ] Connexion SSH réussie
- [ ] Vérifier la version Ubuntu : `lsb_release -a`
- [ ] Vérifier l'espace disque : `df -h`
- [ ] Vérifier la RAM : `free -h`

### Installation automatique

```bash
# Télécharger le script d'installation
wget https://raw.githubusercontent.com/votre-repo/archivage-cerer/main/backend/scripts/install-server.sh

# Rendre exécutable
chmod +x install-server.sh

# Exécuter
./install-server.sh
```

- [ ] Script d'installation exécuté sans erreurs
- [ ] Node.js installé et fonctionnel
- [ ] Nginx installé et démarré
- [ ] PM2 installé
- [ ] Pare-feu UFW configuré
- [ ] Fail2Ban installé

### Vérifications post-installation

```bash
node --version          # Doit afficher v18.x.x
npm --version           # Doit afficher 9.x.x
nginx -v               # Doit afficher nginx version
pm2 --version          # Doit afficher 5.x.x
sudo ufw status        # Doit montrer les ports 22, 80, 443 ouverts
```

- [ ] Toutes les commandes fonctionnent

---

## 📥 Déploiement de l'application

### Cloner le dépôt

```bash
cd ~/apps
git clone https://github.com/votre-repo/archivage-cerer.git
cd archivage-cerer/backend
```

- [ ] Code source cloné
- [ ] Fichiers présents dans le dossier backend

### Installer les dépendances

```bash
npm install --production
```

- [ ] Dépendances installées sans erreurs
- [ ] Dossier `node_modules` créé

### Configuration de l'environnement

```bash
cp .env.example .env
nano .env
```

**Variables à configurer obligatoirement :**

- [ ] `MONGODB_URI` - URI MongoDB Atlas
- [ ] `MONGODB_DB_NAME` - Nom de la base (cerer_archivage)
- [ ] `PORT` - Port de l'application (4000)
- [ ] `NODE_ENV` - Environnement (production)
- [ ] `SESSION_SECRET` - Généré avec crypto
- [ ] `SESSION_CRYPTO_SECRET` - Généré avec crypto
- [ ] `JWT_SECRET` - Généré avec crypto
- [ ] `JWT_REFRESH_SECRET` - Généré avec crypto
- [ ] `SMTP_HOST` - smtp.ucad.sn
- [ ] `SMTP_USER` - Compte email UCAD
- [ ] `SMTP_PASS` - Mot de passe email
- [ ] `FRONTEND_URL` - https://archivage.ucad.sn

**Générer les secrets :**

```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

- [ ] Tous les secrets générés et configurés
- [ ] Fichier .env sauvegardé
- [ ] Permissions .env configurées : `chmod 600 .env`

---

## 🗄️ Configuration MongoDB

### MongoDB Atlas

- [ ] Se connecter sur https://cloud.mongodb.com
- [ ] Créer un cluster (M0 gratuit ou M10+ production)
- [ ] Créer un utilisateur de base de données
- [ ] Ajouter l'IP du serveur UCAD dans Network Access
- [ ] Tester la connexion :

```bash
mongosh "mongodb+srv://cluster0.xxxxx.mongodb.net" --username votre_user
```

- [ ] Connexion MongoDB réussie
- [ ] URI copiée dans .env

---

## 🌐 Configuration Nginx

### Créer la configuration

```bash
sudo nano /etc/nginx/sites-available/archivage-ucad
```

- [ ] Copier la configuration depuis `GUIDE_DEPLOIEMENT_UCAD.md`
- [ ] Remplacer `archivage.ucad.sn` par le bon domaine
- [ ] Sauvegarder le fichier

### Activer la configuration

```bash
sudo ln -s /etc/nginx/sites-available/archivage-ucad /etc/nginx/sites-enabled/
sudo rm /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl reload nginx
```

- [ ] Configuration Nginx testée (pas d'erreur)
- [ ] Nginx rechargé

---

## 🔒 Configuration SSL/HTTPS

### Obtenir le certificat

```bash
sudo certbot --nginx -d archivage.ucad.sn -d www.archivage.ucad.sn --email admin@ucad.sn
```

- [ ] Certificat SSL obtenu
- [ ] Nginx automatiquement reconfiguré
- [ ] Test du renouvellement automatique : `sudo certbot renew --dry-run`

### Vérifier HTTPS

```bash
curl -I https://archivage.ucad.sn
```

- [ ] Réponse HTTPS fonctionnelle
- [ ] Certificat valide

---

## 🚀 Démarrage de l'application

### Démarrer avec PM2

```bash
cd ~/apps/archivage-cerer/backend
pm2 start ecosystem.config.js --env production
pm2 save
```

- [ ] Application démarrée
- [ ] PM2 configuré pour démarrage automatique

### Vérifications

```bash
pm2 status
pm2 logs archivage-cerer --lines 50
curl http://localhost:4000/health
curl https://archivage.ucad.sn
```

- [ ] Application en statut "online"
- [ ] Pas d'erreurs dans les logs
- [ ] Endpoint /health répond
- [ ] Site accessible via HTTPS

---

## 💾 Configuration des sauvegardes

### Sauvegardes automatiques

```bash
crontab -e
```

**Ajouter :**

```cron
# Sauvegarde quotidienne à 2h
0 2 * * * cd ~/apps/archivage-cerer/backend && node scripts/backup-database.js >> ~/logs/backup.log 2>&1

# Vérification backups hebdomadaire
0 9 * * 0 cd ~/apps/archivage-cerer/backend && node scripts/check-atlas-backups.js >> ~/logs/backup-check.log 2>&1
```

- [ ] Tâches cron configurées
- [ ] Test manuel : `npm run backup`
- [ ] Sauvegarde créée dans le dossier backups/

---

## 📊 Monitoring

### Vérifier les logs

```bash
# Logs application
pm2 logs archivage-cerer

# Logs Nginx
sudo tail -f /var/log/nginx/archivage-ucad-access.log
sudo tail -f /var/log/nginx/archivage-ucad-error.log
```

- [ ] Logs application fonctionnels
- [ ] Logs Nginx configurés

### Configurer les alertes MongoDB Atlas

- [ ] Se connecter à MongoDB Atlas
- [ ] Aller dans Alerts → Create Alert
- [ ] Configurer une alerte pour les sauvegardes
- [ ] Ajouter l'email admin@ucad.sn

---

## ✅ Tests finaux

### Tests fonctionnels

- [ ] Ouvrir https://archivage.ucad.sn dans un navigateur
- [ ] Tester la page de connexion
- [ ] Créer un compte utilisateur de test
- [ ] Se connecter avec le compte
- [ ] Uploader un document de test
- [ ] Télécharger le document
- [ ] Tester la recherche
- [ ] Se déconnecter

### Tests de sécurité

- [ ] Vérifier le certificat SSL (cadenas dans le navigateur)
- [ ] Tester la redirection HTTP → HTTPS
- [ ] Vérifier les headers de sécurité : `curl -I https://archivage.ucad.sn`
- [ ] Vérifier que le port 4000 n'est pas accessible de l'extérieur

### Tests de performance

- [ ] Tester le temps de chargement de la page
- [ ] Tester l'upload d'un gros fichier (> 10 MB)
- [ ] Vérifier l'utilisation de la RAM : `free -h`
- [ ] Vérifier l'utilisation du CPU : `htop`

---

## 📝 Documentation

### Créer la documentation serveur

- [ ] Documenter les accès (SSH, MongoDB, etc.)
- [ ] Documenter les procédures de maintenance
- [ ] Documenter les contacts d'urgence
- [ ] Partager avec l'équipe UCAD

### Remettre les documents

**Documents à remettre au service informatique UCAD :**

- [ ] Guide de déploiement complet
- [ ] Identifiants MongoDB Atlas
- [ ] Procédures de sauvegarde et restauration
- [ ] Procédures de mise à jour
- [ ] Contacts support

---

## 🔄 Post-déploiement (J+1)

### Vérifications le lendemain

- [ ] Application toujours en ligne
- [ ] Pas d'erreurs dans les logs
- [ ] Sauvegarde automatique effectuée (vérifier à 2h30)
- [ ] Monitoring fonctionnel
- [ ] Certificat SSL toujours valide

### Formation utilisateurs

- [ ] Planifier une session de formation pour les utilisateurs
- [ ] Préparer les supports de formation
- [ ] Créer des comptes utilisateurs pour l'équipe

---

## 🆘 Contacts d'urgence

| Contact | Email | Téléphone |
|---------|-------|-----------|
| **Admin C.E.R.E.R** | admin@cerer.sn | +221 XX XXX XX XX |
| **Service Info UCAD** | dsi@ucad.sn | +221 33 824 69 81 |
| **Support MongoDB** | support.mongodb.com | - |

---

## 📈 Suivi

### Statistiques à surveiller

- [ ] Nombre d'utilisateurs actifs
- [ ] Nombre de documents archivés
- [ ] Taille de la base de données
- [ ] Utilisation des ressources serveur
- [ ] Nombre de requêtes par jour

### Maintenance régulière

**Quotidienne :**
- [ ] Vérifier les logs d'erreurs
- [ ] Vérifier le statut de l'application : `pm2 status`

**Hebdomadaire :**
- [ ] Vérifier les sauvegardes
- [ ] Vérifier l'espace disque
- [ ] Consulter les rapports MongoDB Atlas

**Mensuelle :**
- [ ] Mettre à jour les dépendances npm
- [ ] Faire une mise à jour système : `sudo apt update && sudo apt upgrade`
- [ ] Tester une restauration de sauvegarde

---

**Date de déploiement : _______________**

**Déployé par : _______________**

**Validé par (UCAD) : _______________**

---

✅ **Déploiement réussi !**
