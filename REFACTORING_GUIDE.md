# 🏗️ GUIDE DE REFACTORING MVC

## ✅ Ce qui a été fait

### Architecture créée
```
projet/
├── server.js (154 lignes) ✅
├── config/
│   ├── database.js ✅
│   └── session.js ✅
├── routes/
│   └── auth.routes.js ✅ (EXEMPLE)
├── controllers/
│   └── auth.controller.js ✅ (EXEMPLE)
├── services/
│   ├── authService.js ✅ (EXEMPLE)
│   └── permissionsService.js ✅
├── middleware/
│   ├── authMiddleware.js ✅
│   └── permissionsMiddleware.js ✅
└── utils/
    ├── constants.js ✅
    └── idGenerator.js ✅
```

### Fichiers de référence
- **server.js.backup** : Ancien serveur (7889 lignes) - à décomposer
- **server.js** : Nouveau serveur MVC (154 lignes)

---

## 📋 PATTERN MVC ÉTABLI

### Exemple complet : Authentification

**1. Route** (`routes/auth.routes.js`)
```javascript
const router = express.Router();
const authController = require('../controllers/auth.controller');

router.post('/login', security.loginLimiter, authController.login);
router.post('/logout', authController.logout);

module.exports = router;
```

**2. Controller** (`controllers/auth.controller.js`)
```javascript
async function login(req, res) {
    try {
        const { username, password } = req.body;

        // Validation
        if (!username || !password) {
            return res.status(400).json({ ... });
        }

        // Appeler le service
        const result = await authService.authenticateUser(username, password, metadata);

        // Répondre
        res.json(result);
    } catch (error) {
        res.status(500).json({ success: false, message: 'Erreur serveur' });
    }
}
```

**3. Service** (`services/authService.js`)
```javascript
async function authenticateUser(username, password, metadata) {
    const collections = getCollections();

    // Logique métier pure
    const user = await collections.users.findOne({ username });

    if (!user) {
        return { success: false, message: 'Utilisateur non trouvé' };
    }

    // ... logique d'authentification

    return { success: true, user };
}
```

---

## 🎯 PROCHAINES ÉTAPES

### 1. Routes Documents
**Extraire de** : `server.js.backup` lignes ~3800-4500

**Créer** :
- `routes/documents.routes.js`
- `controllers/documents.controller.js`
- `services/documentService.js`

**Routes à implémenter** :
- `GET /api/documents/:userId` - Liste documents
- `GET /api/documents/:userId/:docId` - Détail document
- `POST /api/documents/:userId` - Créer document
- `PUT /api/documents/:userId/:docId` - Modifier document
- `DELETE /api/documents/:userId/:docId` - Supprimer document
- `POST /api/documents/:userId/:docId/share` - Partager
- `POST /api/documents/:userId/:docId/toggle-lock` - Verrouiller/déverrouiller

### 2. Routes Users
**Extraire de** : `server.js.backup` lignes ~3100-3700

**Créer** :
- `routes/users.routes.js`
- `controllers/users.controller.js`
- `services/userService.js`

**Routes à implémenter** :
- `GET /api/users` - Liste utilisateurs (filtrée par niveau)
- `GET /api/users/:username` - Détail utilisateur
- `POST /api/users` - Créer utilisateur
- `PUT /api/users/:username` - Modifier utilisateur
- `DELETE /api/users/:username` - Supprimer utilisateur
- `POST /api/users/:username/reset-password` - Réinitialiser mot de passe

### 3. Routes Messages
**Extraire de** : `server.js.backup` lignes ~5000-5220

**Créer** :
- `routes/messages.routes.js`
- `controllers/messages.controller.js`
- `services/messageService.js`

**Routes à implémenter** :
- `POST /api/messages/send` - Envoyer message
- `GET /api/messages/my-conversation` - Ma conversation
- `DELETE /api/messages/:messageId` - Supprimer message
- `DELETE /api/messages/delete-all` - Supprimer tous

### 4. Routes Categories
**Extraire de** : `server.js.backup` lignes ~6370-6580

**Créer** :
- `routes/categories.routes.js`
- `controllers/categories.controller.js`
- `services/categoryService.js`

### 5. Routes Services
**Extraire de** : `server.js.backup` lignes ~6580-6870

**Créer** :
- `routes/services.routes.js`
- `controllers/services.controller.js`
- `services/serviceService.js` (ou servicesService.js)

### 6. Routes Departements
**Extraire de** : `server.js.backup` lignes ~6000-6200

**Créer** :
- `routes/departements.routes.js`
- `controllers/departements.controller.js`
- `services/departementService.js`

### 7. Initialisation données
**Extraire** : Fonction `initializeDefaultData()` de `server.js.backup`

**Créer** :
- `config/initData.js` - Initialisation rôles, départements, etc.

---

## 🔧 COMMENT PROCÉDER

### Pour chaque module :

1. **Chercher les routes** dans `server.js.backup`
   ```bash
   grep "app.get\|app.post\|app.put\|app.delete" server.js.backup | grep "/api/documents"
   ```

2. **Créer le service** en premier
   - Copier la logique métier (queries MongoDB, calculs)
   - Retirer req/res, utiliser paramètres
   - Retourner données ou throw Error

3. **Créer le controller**
   - Validation des entrées
   - Appel du service
   - Formatage réponse
   - Gestion erreurs HTTP

4. **Créer les routes**
   - Définir endpoints
   - Appliquer middleware
   - Lier au controller

5. **Ajouter dans server.js**
   ```javascript
   const documentsRoutes = require('./routes/documents.routes');
   app.use('/api/documents', documentsRoutes);
   ```

---

## ⚠️ POINTS D'ATTENTION

### À CONSERVER
- ✅ Système de permissions (niveaux 0/1/2/3)
- ✅ Sessions MongoDB
- ✅ Middleware isOnline
- ✅ Soft delete (corbeille)
- ✅ Verrouillage documents (niveau 1)
- ✅ Partage + historique
- ✅ Génération ID unique (generateDocumentId)
- ✅ Audit logs
- ✅ Security logger

### À MIGRER PROGRESSIVEMENT
- Routes existantes dans `/routes/superadmin.js` (déjà modulaire)
- Routes existantes dans `/routes-profile.js`
- Module `/modules/services.js`

### COMPATIBILITÉ
- Les routes existantes fonctionnent toujours
- Migration progressive possible
- Garder `server.js.backup` comme référence

---

## 🧪 TESTER APRÈS CHAQUE MODULE

```bash
# Démarrer le serveur
npm start

# Tester l'authentification
curl -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"test","password":"test"}'

# Vérifier la session
curl http://localhost:4000/api/auth/session-check \
  --cookie-jar cookies.txt --cookie cookies.txt
```

---

## 📊 PROGRESSION

- [x] Architecture MVC
- [x] Config (database, session)
- [x] Utils (constants, idGenerator)
- [x] Middleware (auth, permissions)
- [x] Services (auth, permissions)
- [x] Routes Auth (EXEMPLE COMPLET)
- [ ] Routes Documents
- [ ] Routes Users
- [ ] Routes Messages
- [ ] Routes Categories
- [ ] Routes Services
- [ ] Routes Departements
- [ ] Routes SuperAdmin (adaptation)
- [ ] Initialisation données
- [ ] Tests complets

---

## 🎓 AVANTAGES DE LA NOUVELLE ARCHITECTURE

1. **Maintenabilité** : Code organisé, responsabilités claires
2. **Testabilité** : Services testables indépendamment
3. **Scalabilité** : Ajout de fonctionnalités facilité
4. **Lisibilité** : Fichiers < 300 lignes
5. **Réutilisabilité** : Services et middleware partagés
6. **Sécurité** : Middleware centralisé

**Ancien** : 7889 lignes dans 1 fichier
**Nouveau** : ~15 fichiers de 50-200 lignes chacun

---

*Bon courage pour la suite du refactoring ! La structure est en place, il suffit de suivre le pattern établi.* 🚀
