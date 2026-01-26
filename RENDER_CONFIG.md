# 🚀 Configuration Render.com - Guide Rapide

## ✅ Étapes pour corriger l'erreur MongoDB sur Render

### 1️⃣ Obtenir l'URI MongoDB Atlas (format standard)

1. Allez sur **MongoDB Atlas** (https://cloud.mongodb.com)
2. Cliquez sur **Database** → **Connect** (sur votre cluster)
3. Choisissez **Drivers**
4. Sélectionnez **Node.js** comme driver

**🔍 IMPORTANT**: Vous devez obtenir l'URI au format `mongodb://` (PAS `mongodb+srv://`)

#### Comment trouver l'URI standard ?

Sur la page de connexion MongoDB Atlas, cherchez **"Connection String Only"** ou utilisez ce format :

```
mongodb://USERNAME:PASSWORD@cluster0-shard-00-00.eq69ixv.mongodb.net:27017,cluster0-shard-00-01.eq69ixv.mongodb.net:27017,cluster0-shard-00-02.eq69ixv.mongodb.net:27017/cerer_archivage?ssl=true&replicaSet=atlas-hfq5gc-shard-0&authSource=admin&retryWrites=true&w=majority
```

**Remplacez** :
- `USERNAME` par votre nom d'utilisateur MongoDB
- `PASSWORD` par votre mot de passe MongoDB
- `cluster0-shard-00-XX.eq69ixv.mongodb.net` par vos vrais noms de shards
- `atlas-hfq5gc-shard-0` par votre vrai nom de replica set

### 2️⃣ Configurer la variable d'environnement sur Render

1. Allez sur votre **Dashboard Render** (https://dashboard.render.com)
2. Sélectionnez votre **Web Service** (backend)
3. Cliquez sur **Environment** dans le menu de gauche
4. Trouvez la variable `MONGODB_URI`
5. Cliquez sur **Edit** (icône crayon)
6. **Remplacez** l'ancienne valeur par la nouvelle URI standard
7. Cliquez sur **Save Changes**

**🎯 Exemple de configuration** :

| Key | Value |
|-----|-------|
| `MONGODB_URI` | `mongodb://jacquesboubacarkoukoui_db_user:um6pz5uhsXkNGdOe@cluster0-shard-00-00.eq69ixv.mongodb.net:27017,cluster0-shard-00-01.eq69ixv.mongodb.net:27017,cluster0-shard-00-02.eq69ixv.mongodb.net:27017/cerer_archivage?ssl=true&replicaSet=atlas-hfq5gc-shard-0&authSource=admin&retryWrites=true&w=majority` |
| `PORT` | `4000` |
| `NODE_ENV` | `production` |

### 3️⃣ Vérifier Network Access sur MongoDB Atlas

1. Sur **MongoDB Atlas**, allez dans **Network Access**
2. Vérifiez que `0.0.0.0/0` est dans la liste (✅ vous l'avez déjà)
3. Statut doit être **Active**

### 4️⃣ Attendre le redémarrage

1. Render redémarre automatiquement votre service après modification des variables
2. Attendez 1-2 minutes
3. Consultez les **logs** pour vérifier

**✅ Logs de succès** :
```
🔄 Connexion à MongoDB...
📍 URI: mongodb://***:***@cluster0-shard-00-00...
✅ Connexion à MongoDB réussie
📊 Base de données: cerer_archivage
```

**❌ Logs d'erreur à éviter** :
```
❌ Erreur connexion MongoDB: querySrv ENOTFOUND
```

---

## 🔧 Commandes utiles

### Tester en local

```bash
cd backend
npm install
node server.js
```

Vous devriez voir :
```
🔄 Connexion à MongoDB...
✅ Connexion à MongoDB réussie
✅ SERVEUR ARCHIVAGE C.E.R.E.R DÉMARRÉ (MCD)
🔡 http://localhost:4000
```

### Vérifier les variables d'environnement

```bash
node -e "require('dotenv').config(); console.log('URI:', process.env.MONGODB_URI.substring(0, 30) + '...');"
```

---

## 📝 Checklist finale

- [ ] L'URI MongoDB utilise `mongodb://` (PAS `mongodb+srv://`)
- [ ] Le nom de la base de données est `cerer_archivage` (pas `cerer_archive`)
- [ ] L'URI contient les 3 shards (shard-00-00, shard-00-01, shard-00-02)
- [ ] Le nom d'utilisateur et mot de passe sont corrects
- [ ] Network Access sur MongoDB Atlas autorise `0.0.0.0/0`
- [ ] La variable `MONGODB_URI` est configurée sur Render
- [ ] Le service Render a redémarré après la modification

---

## 🆘 Dépannage

### Erreur : "Authentication failed"

Vérifiez que le nom d'utilisateur et le mot de passe dans l'URI sont corrects.

Sur MongoDB Atlas : **Database Access** → vérifiez l'utilisateur `jacquesboubacarkoukoui_db_user`

### Erreur : "Server selection timed out"

1. Vérifiez Network Access sur MongoDB Atlas
2. Assurez-vous que `0.0.0.0/0` est autorisé et actif
3. Attendez quelques minutes que les changements se propagent

### Le service ne démarre pas

1. Consultez les logs Render : **Dashboard** → votre service → **Logs**
2. Vérifiez qu'il n'y a pas d'erreurs de syntaxe dans l'URI
3. Assurez-vous que tous les packages sont installés (`npm install`)

---

## 📞 Support

Si le problème persiste :
1. Copiez les logs d'erreur complets depuis Render
2. Vérifiez que l'URI est exactement au bon format
3. Essayez de vous connecter depuis votre machine locale avec la même URI
