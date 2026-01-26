# 🔧 Configuration MongoDB pour Production (Render.com)

## 🚨 Problème actuel

L'erreur `querySrv ENOTFOUND` signifie que le serveur Render ne peut pas résoudre l'URI `mongodb+srv://` via DNS.

## ✅ Solution: Utiliser le format standard `mongodb://`

### Étape 1: Obtenir l'URI standard depuis MongoDB Atlas

1. Connectez-vous à **MongoDB Atlas** (https://cloud.mongodb.com)

2. Cliquez sur **Database** dans le menu de gauche

3. Cliquez sur **Connect** pour votre cluster

4. Choisissez **Connect your application**

5. Sélectionnez :
   - **Driver**: Node.js
   - **Version**: 4.1 or later

6. **IMPORTANT**: Vous verrez deux formats d'URI. Choisissez celui qui commence par `mongodb://` (PAS `mongodb+srv://`)

   L'URI ressemblera à :
   ```
   mongodb://username:password@cluster0-shard-00-00.xxxxx.mongodb.net:27017,cluster0-shard-00-01.xxxxx.mongodb.net:27017,cluster0-shard-00-02.xxxxx.mongodb.net:27017/?replicaSet=atlas-xxxx-shard-0&ssl=true&authSource=admin
   ```

7. **Remplacez** `<username>` et `<password>` par vos vrais identifiants MongoDB

8. **Ajoutez** le nom de la base de données après le dernier `/` et avant le `?` :
   ```
   mongodb://username:password@cluster0-shard-00-00.xxxxx.mongodb.net:27017,cluster0-shard-00-01.xxxxx.mongodb.net:27017,cluster0-shard-00-02.xxxxx.mongodb.net:27017/cerer_archivage?replicaSet=atlas-xxxx-shard-0&ssl=true&authSource=admin
   ```

### Étape 2: Configurer sur Render.com

#### Option A : Remplacer MONGODB_URI (recommandé)

1. Allez dans votre **Dashboard Render**
2. Sélectionnez votre **Web Service**
3. Cliquez sur **Environment** dans le menu de gauche
4. Trouvez la variable `MONGODB_URI`
5. Cliquez sur **Edit**
6. Remplacez l'ancienne valeur (qui commence par `mongodb+srv://`) par la nouvelle URI standard (qui commence par `mongodb://`)
7. Cliquez sur **Save Changes**
8. Render redémarrera automatiquement votre service

#### Option B : Ajouter MONGODB_URI_STANDARD (fallback)

1. Allez dans votre **Dashboard Render**
2. Sélectionnez votre **Web Service**
3. Cliquez sur **Environment** dans le menu de gauche
4. Cliquez sur **Add Environment Variable**
5. Ajoutez :
   - **Key**: `MONGODB_URI_STANDARD`
   - **Value**: Votre URI standard MongoDB
6. Cliquez sur **Save Changes**
7. Render redémarrera automatiquement votre service

### Étape 3: Autoriser les connexions depuis Render

1. Sur **MongoDB Atlas**, allez dans **Network Access**

2. Cliquez sur **Add IP Address**

3. Choisissez **Allow Access from Anywhere** (0.0.0.0/0)

   ⚠️ **Note**: Pour plus de sécurité, vous pouvez ajouter uniquement les IPs de Render, mais "Allow from Anywhere" est plus simple pour commencer.

4. Cliquez sur **Confirm**

### Étape 4: Vérifier la connexion

Après avoir fait les changements, attendez que Render redémarre votre service (1-2 minutes).

Dans les logs, vous devriez voir :
```
🔄 Connexion à MongoDB...
📍 Connexion avec URI Standard...
✅ Connexion à MongoDB réussie
📊 Base de données: cerer_archivage
```

## 📝 Exemple complet d'URI

### ❌ Ancien format (ne fonctionne pas sur Render)
```
mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/cerer_archivage?retryWrites=true&w=majority
```

### ✅ Nouveau format (fonctionne sur Render)
```
mongodb://username:password@cluster0-shard-00-00.xxxxx.mongodb.net:27017,cluster0-shard-00-01.xxxxx.mongodb.net:27017,cluster0-shard-00-02.xxxxx.mongodb.net:27017/cerer_archivage?replicaSet=atlas-xxxx-shard-0&ssl=true&authSource=admin
```

## 🆘 Dépannage

### Erreur: "Authentication failed"
- Vérifiez que le nom d'utilisateur et le mot de passe sont corrects
- Assurez-vous qu'il n'y a pas de caractères spéciaux mal encodés dans le mot de passe

### Erreur: "Server selection timed out"
- Vérifiez que l'IP 0.0.0.0/0 est autorisée dans Network Access
- Attendez quelques minutes que les changements se propagent

### Erreur: "Database not found"
- Le nom de la base de données doit être `cerer_archivage`
- Vérifiez qu'il est bien placé dans l'URI : `.../cerer_archivage?...`

## 📞 Support

Si le problème persiste après ces étapes :
1. Vérifiez les logs Render pour voir l'erreur exacte
2. Vérifiez que tous les caractères spéciaux du mot de passe sont correctement encodés
3. Essayez de créer un nouvel utilisateur MongoDB avec un mot de passe simple (sans caractères spéciaux)
