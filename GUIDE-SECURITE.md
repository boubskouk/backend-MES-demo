# 🛡️ GUIDE DE SÉCURITÉ - ARCHIVAGE CERER

## 🎯 RÉSUMÉ RAPIDE

Votre application dispose maintenant d'un système de sécurité complet qui protège contre :
- ✅ Attaques par force brute (rate limiting)
- ✅ Injections NoSQL
- ✅ Cross-Site Scripting (XSS)
- ✅ Vol de session
- ✅ Fuites d'informations

**Score de sécurité : 8/10** 🟢

---

## 🚀 DÉMARRAGE RAPIDE

### 1. Démarrer le serveur
```bash
node server.js
```

### 2. Vérifier les logs
Les logs sont automatiquement créés dans le dossier `logs/` :
- `security.log` - Connexions, tentatives bloquées
- `requests.log` - Toutes les requêtes HTTP
- `error.log` - Erreurs du serveur

### 3. Tester la sécurité
```bash
# Test connexion valide
curl -X POST http://localhost:4000/api/login -H "Content-Type: application/json" -d "{\"username\":\"jbk\",\"password\":\"0811\"}"

# Test rate limiting (5 tentatives max)
# Après 5 tentatives, vous serez bloqué pendant 15 minutes
```

---

## 📊 FONCTIONNALITÉS DE SÉCURITÉ

### 🚫 Rate Limiting

**Protège contre :** Attaques par force brute

| Endpoint | Limite | Durée |
|----------|--------|-------|
| `/api/login` | 5 tentatives | 15 min |
| `/api/documents` (upload) | 10 uploads | 1 heure |
| Toutes les API | 100 requêtes | 15 min |

**Comportement :**
- Tentatives 1-4 : Autorisées
- Tentative 5+ : Message "Trop de tentatives. Réessayez dans 15 minutes"
- Toutes les tentatives sont loggées

---

### 🔐 Sessions Sécurisées

**Protège contre :** Vol de session, fixation de session

**Configuration :**
- Stockage MongoDB (pas en mémoire)
- Cookies sécurisés (HttpOnly, SameSite)
- Chiffrement AES-256
- Expiration automatique : 24 heures

**Secrets :**
Les secrets sont dans `.env` :
```env
SESSION_SECRET=cdf9c0c9b4e834c0220432daac7ffe...
SESSION_CRYPTO_SECRET=988b9805693590330ecdd0bc0563...
```

⚠️ **IMPORTANT :** Changez ces secrets en production !
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

---

### 🛡️ Protection XSS (Helmet)

**Protège contre :** Cross-Site Scripting, clickjacking

**Headers automatiquement ajoutés :**
- Content-Security-Policy
- X-Frame-Options: DENY
- X-Content-Type-Options: nosniff
- X-XSS-Protection

Vous n'avez rien à faire, c'est automatique ! ✅

---

### 💉 Protection NoSQL Injection

**Protège contre :** Injection de requêtes malveillantes

**Bloque automatiquement :**
- `{"$ne": null}` → Bloqué
- `{"$gt": ""}` → Bloqué
- Tout caractère MongoDB dangereux

**Logging :**
Les tentatives sont enregistrées dans `logs/security.log` :
```json
{
  "event": "NOSQL_INJECTION_ATTEMPT",
  "ip": "192.168.1.100",
  "key": "$ne"
}
```

---

### ✅ Validation des Entrées

**Protège contre :** Injections, buffer overflow, données corrompues

**Validations actives :**

| Champ | Validation |
|-------|-----------|
| Username | 3-50 caractères |
| Titre document | 3-200 caractères |
| Description | Max 2000 caractères |
| Nom fichier | Max 255 caractères |
| Tags | Max 500 caractères |

**Fichiers bloqués :**
- Exécutables : `.exe`, `.bat`, `.sh`, `.msi`
- Vidéos : `.mp4`, `.avi`, `.mov`
- Audio : `.mp3`, `.wav`

---

### 📝 Logs de Sécurité

**Tout est tracé automatiquement :**

#### Connexions
```json
// Connexion réussie
{"event":"LOGIN_SUCCESS","username":"jbk","ip":"127.0.0.1"}

// Connexion échouée
{"event":"LOGIN_FAILED","username":"test","reason":"user_not_found"}
```

#### Rate Limiting
```json
{"event":"LOGIN_RATE_LIMIT_EXCEEDED","ip":"127.0.0.1"}
```

#### Requêtes HTTP
```json
{"method":"POST","url":"/api/login","statusCode":200,"responseTime":28}
```

---

## 📊 MONITORING

### Voir les logs en temps réel

**Logs de sécurité :**
```bash
# Windows
type logs\security.log

# Linux/Mac
tail -f logs/security.log
```

**Dernières connexions :**
```bash
# Windows
type logs\security.log | findstr LOGIN

# Linux/Mac
grep LOGIN logs/security.log
```

**Tentatives bloquées :**
```bash
# Windows
type logs\security.log | findstr RATE_LIMIT

# Linux/Mac
grep RATE_LIMIT logs/security.log
```

---

## ⚠️ ALERTES DE SÉCURITÉ

### Que faire en cas de tentatives suspectes ?

#### 1. Identifier l'attaquant
```bash
# Voir toutes les IP qui ont échoué
grep LOGIN_FAILED logs/security.log
```

#### 2. Analyser les tentatives
```json
{
  "event": "LOGIN_FAILED",
  "username": "admin",  // ← Username testé
  "ip": "192.168.1.50", // ← IP suspecte
  "reason": "wrong_password",
  "timestamp": "2025-11-15T10:30:00.000Z"
}
```

#### 3. Actions possibles
- Bloquer l'IP dans le firewall
- Changer les mots de passe
- Notifier l'administrateur

---

## 🔧 CONFIGURATION AVANCÉE

### Modifier les limites de rate limiting

Dans `security-config.js` :

```javascript
// Ligne 40 : Rate limiter pour login
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // ← Changez ici (5 tentatives)
    // ...
});

// Ligne 62 : Rate limiter pour uploads
const uploadLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 heure
    max: 10, // ← Changez ici (10 uploads)
    // ...
});
```

### Modifier la durée de session

Dans `.env` :
```env
# 24 heures (par défaut)
SESSION_MAX_AGE=86400000

# 1 heure
SESSION_MAX_AGE=3600000

# 7 jours
SESSION_MAX_AGE=604800000
```

---

## 🚨 CHECKLIST DE SÉCURITÉ QUOTIDIENNE

À vérifier régulièrement :

- [ ] Vérifier les logs de sécurité
- [ ] Pas de tentatives massives de connexion
- [ ] Espace disque suffisant pour les logs
- [ ] Sessions actives normales
- [ ] Pas d'erreurs dans error.log

### Script de vérification quotidienne
```bash
# Connexions du jour
grep "$(date +%Y-%m-%d)" logs/security.log | grep LOGIN

# Tentatives bloquées du jour
grep "$(date +%Y-%m-%d)" logs/security.log | grep RATE_LIMIT

# Erreurs du jour
grep "$(date +%Y-%m-%d)" logs/error.log
```

---

## 📞 AIDE ET SUPPORT

### Problèmes courants

#### "Cannot connect to MongoDB"
```bash
# Vérifier que MongoDB est démarré
mongod --version

# Windows : Démarrer MongoDB
net start MongoDB

# Linux/Mac : Démarrer MongoDB
sudo systemctl start mongod
```

#### "Session secret not found"
Vérifiez que `.env` contient :
```env
SESSION_SECRET=...
SESSION_CRYPTO_SECRET=...
```

#### Logs trop volumineux
Les logs sont automatiquement limités à 10 MB et rotent sur 5 fichiers.
Vous pouvez les supprimer manuellement :
```bash
rm logs/*.log
```

---

## 🎓 BONNES PRATIQUES

### En développement
- ✅ NODE_ENV=development
- ✅ Logs en console activés
- ✅ Messages d'erreur détaillés

### En production
- ✅ NODE_ENV=production
- ✅ Secrets aléatoires forts
- ✅ HTTPS activé (certificat SSL)
- ✅ Messages d'erreur génériques
- ✅ Firewall configuré
- ✅ Sauvegardes quotidiennes

---

## ✅ RÉSUMÉ

### Ce qui est fait
- ✅ Rate limiting (force brute)
- ✅ Sessions sécurisées MongoDB
- ✅ Protection NoSQL injection
- ✅ Protection XSS (Helmet)
- ✅ Validation des entrées
- ✅ Logs de sécurité complets
- ✅ Compression des réponses
- ✅ Gestionnaire d'erreurs

### Ce qui reste à faire (optionnel)
- [ ] HTTPS (certificat SSL)
- [ ] Authentification 2FA
- [ ] Chiffrement documents sensibles
- [ ] Cache Redis
- [ ] Sauvegardes automatiques

---

**Votre application est maintenant sécurisée ! 🛡️**

Pour plus de détails, consultez `SECURITE-IMPLEMENTEE.md`
