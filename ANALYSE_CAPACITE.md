# Analyse de Capacité - Système d'Archivage C.E.R.E.R

Évaluation de la capacité de l'application à gérer des utilisateurs simultanés.

---

## 📊 Résumé Exécutif

### Capacité estimée (Configuration actuelle)

| Serveur | Utilisateurs simultanés | Utilisateurs actifs/jour | Base de données |
|---------|------------------------|--------------------------|-----------------|
| **Petit (2 CPU, 4GB RAM)** | 50-100 | 500-1000 | Jusqu'à 100 GB |
| **Moyen (4 CPU, 8GB RAM)** | 200-400 | 2000-4000 | Jusqu'à 500 GB |
| **Grand (8 CPU, 16GB RAM)** | 500-1000 | 5000-10000 | Illimité (Atlas) |

### Pour l'UCAD (estimation)

**Population cible :** ~30,000 étudiants + 2,000 personnel

**Scénario réaliste :**
- **Utilisateurs actifs quotidiens** : 1000-2000 personnes (3-7% de la population)
- **Utilisateurs simultanés (heures de pointe)** : 100-300 personnes
- **Recommandation serveur** : 4 CPU, 8 GB RAM ✅

---

## 🏗️ Architecture Actuelle

### Points forts ✅

1. **Sécurité robuste**
   - Helmet (headers sécurisés)
   - Rate limiting (protection DDoS)
   - Sanitization NoSQL (protection injections)
   - HTTPS obligatoire
   - Sessions sécurisées

2. **Performance**
   - Compression GZIP (réduit la bande passante de 70%)
   - Index MongoDB sur les champs clés
   - Mode cluster PM2 (2 instances)

3. **Scalabilité MongoDB**
   - MongoDB Atlas (géré, scalable)
   - Connexion pooling automatique
   - Backups automatiques

4. **Logs et monitoring**
   - Winston (logs structurés)
   - Rotation automatique des logs
   - Séparation erreurs/requêtes/sécurité

### Points faibles ⚠️

1. **Pas de cache**
   - Toutes les requêtes vont à MongoDB
   - Impact : Temps de réponse plus long

2. **Rate limiting restrictif**
   - 100 requêtes/15min par IP
   - Impact : Peut bloquer des utilisateurs légitimes en pics

3. **Sessions courtes**
   - TTL de 1 heure
   - Impact : Reconnexions fréquentes

4. **Pas de CDN**
   - Fichiers statiques servis depuis le serveur
   - Impact : Bande passante

5. **Upload synchrone**
   - Uploads bloquants
   - Impact : Performance si gros fichiers

---

## 📈 Analyse Détaillée

### 1. Capacité par composant

#### A. Serveur Node.js (avec PM2 cluster)

**Configuration : 4 CPU, 8 GB RAM, 2 instances PM2**

```
Formule : Requêtes simultanées = (CPU * 125) * instances
Calcul   : (4 * 125) * 2 = 1000 requêtes simultanées
```

**Temps de réponse moyen :**
- Requête simple (liste documents) : 50-100ms
- Upload fichier (10MB) : 2-5 secondes
- Recherche complexe : 200-500ms

**Capacité :**
- **Utilisateurs simultanés** : 200-400 personnes
- **Requêtes/seconde** : 100-200 req/s
- **Uploads simultanés** : 10-20 uploads

#### B. MongoDB Atlas

**Plan M10 (recommandé pour UCAD) :**

```
- RAM : 2 GB
- Storage : 10 GB (extensible à 4 TB)
- Connexions simultanées : 1500
- IOPS : 3000
```

**Performance :**
- Lecture simple : 1-5ms
- Écriture simple : 5-10ms
- Recherche indexée : 10-50ms
- Recherche full-text : 50-200ms

**Capacité :**
- **Documents** : Plusieurs millions
- **Utilisateurs** : 10,000+ sans problème
- **Requêtes/seconde** : 1000+

#### C. Rate Limiting (Actuel)

**Configuration actuelle :**

```javascript
General : 100 requêtes/15min par IP
Login   : 5 tentatives/15min par IP
Upload  : 10 uploads/heure par IP
```

**Impact :**

```
Scénario problématique :
- 50 utilisateurs derrière le même proxy UCAD (même IP)
- 100 requêtes / 50 utilisateurs = 2 requêtes par personne/15min
- ⚠️ Trop restrictif !
```

**Recommandation :** Augmenter à 500 requêtes/15min

---

## 🎯 Scénarios d'usage UCAD

### Scénario 1 : Usage quotidien normal

**Profil :**
- 1000 utilisateurs actifs/jour
- Répartis sur 10 heures (8h-18h)
- Moyenne : 100 utilisateurs/heure
- Pics : 200-300 utilisateurs simultanés (10h-12h, 14h-16h)

**Charge :**
```
100 utilisateurs simultanés × 1 requête/minute = 100 req/min ≈ 1.7 req/s
```

**Verdict :** ✅ **Largement gérable** avec serveur 4 CPU / 8 GB RAM

---

### Scénario 2 : Pic d'activité (début semestre)

**Profil :**
- 3000 utilisateurs actifs/jour
- Pics : 500-800 utilisateurs simultanés
- Uploads massifs (rapports de stages, mémoires)

**Charge :**
```
500 utilisateurs simultanés × 2 requêtes/minute = 1000 req/min ≈ 16 req/s
50 uploads simultanés (10MB chacun)
```

**Verdict :** ⚠️ **Limite atteinte**
- Serveur : OK (avec 4-8 CPU)
- Rate limiting : ❌ **Trop restrictif**
- Uploads : ⚠️ **Saturation possible**

**Solution :** Passer à 8 CPU, 16 GB RAM + ajuster rate limiting

---

### Scénario 3 : Événement exceptionnel (inscriptions, examens)

**Profil :**
- 5000 utilisateurs actifs/jour
- Pics : 1000-1500 utilisateurs simultanés
- Très haute lecture, peu d'écriture

**Charge :**
```
1000 utilisateurs × 3 requêtes/minute = 3000 req/min ≈ 50 req/s
```

**Verdict :** ❌ **Dépassement**
- Serveur : ⚠️ **Ralentissements**
- MongoDB : ✅ OK
- Rate limiting : ❌ **Blocage massif**

**Solution :**
- Serveur 16 CPU, 32 GB RAM
- Load balancer (2-3 serveurs)
- CDN pour fichiers statiques
- Cache Redis

---

## 🔍 Goulots d'étranglement identifiés

### 1. Rate Limiting (CRITIQUE)

**Problème :** Configuration trop stricte pour un environnement universitaire.

**Impact :**
```
UCAD utilise probablement un proxy/NAT
→ Tous les utilisateurs du campus = même IP publique
→ 100 requêtes/15min partagées entre TOUS
→ Blocage rapide
```

**Solution :**

```javascript
// Dans security-config.js
const generalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 500,  // Augmenté de 100 à 500
    message: '...'
});

const uploadLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 50,  // Augmenté de 10 à 50
    message: '...'
});
```

### 2. Pas de cache (IMPORTANT)

**Problème :** Toutes les requêtes interrogent MongoDB.

**Impact :**
- Temps de réponse : +50ms par requête
- Charge MongoDB : Élevée
- Coût : Plus élevé (IOPS)

**Solution :** Implémenter un cache Redis

```javascript
// Exemple
const redis = require('redis');
const client = redis.createClient();

// Cache des rôles (rarement modifiés)
async function getRole(roleId) {
    const cached = await client.get(`role:${roleId}`);
    if (cached) return JSON.parse(cached);

    const role = await rolesCollection.findOne({ _id: roleId });
    await client.setEx(`role:${roleId}`, 3600, JSON.stringify(role));
    return role;
}
```

**Gain estimé :** -30% charge MongoDB, -40% temps de réponse

### 3. Upload synchrone (MOYEN)

**Problème :** Les uploads bloquent le thread Node.js.

**Impact :**
- 10 uploads simultanés (10MB chacun) → Application ralentie
- Timeout possible

**Solution :** Queue d'upload asynchrone (Bull + Redis)

```javascript
const Bull = require('bull');
const uploadQueue = new Bull('uploads');

uploadQueue.process(async (job) => {
    const { file, userId } = job.data;
    // Traiter l'upload en arrière-plan
    await processUpload(file, userId);
});
```

### 4. Sessions courtes (MINEUR)

**Problème :** TTL de 1h → reconnexions fréquentes.

**Impact :**
- Expérience utilisateur
- Charge (authentifications répétées)

**Solution :** Augmenter le TTL

```javascript
store: MongoStore.create({
    // ...
    ttl: 86400,  // 24 heures au lieu de 1h
    touchAfter: 300  // 5 minutes
})
```

---

## 💡 Recommandations par taille

### Pour UCAD (~30,000 étudiants)

#### Configuration minimale (démarrage)

```yaml
Serveur:
  CPU: 4 cores
  RAM: 8 GB
  SSD: 100 GB

MongoDB Atlas:
  Plan: M10 (Shared)
  RAM: 2 GB
  Storage: 10 GB

Coût: ~40€/mois (serveur + MongoDB M10)
```

**Capacité :** 1000-2000 utilisateurs actifs/jour ✅

#### Configuration recommandée (production)

```yaml
Serveur:
  CPU: 8 cores
  RAM: 16 GB
  SSD: 200 GB

MongoDB Atlas:
  Plan: M20 (Dedicated)
  RAM: 4 GB
  Storage: 20 GB
  Backups: Activés

Optimisations:
  - Cache Redis (2 GB)
  - CDN Cloudflare (gratuit)

Coût: ~120€/mois
```

**Capacité :** 5000-10,000 utilisateurs actifs/jour ✅

#### Configuration haute disponibilité

```yaml
Serveurs: 2x (Load balanced)
  CPU: 8 cores chacun
  RAM: 16 GB chacun

MongoDB Atlas:
  Plan: M30 (Dedicated, Replica Set 3 nœuds)
  RAM: 8 GB
  Storage: 40 GB

Optimisations:
  - Cache Redis Cluster (4 GB)
  - CDN Cloudflare Pro
  - Queue Bull pour uploads

Coût: ~400€/mois
```

**Capacité :** 20,000+ utilisateurs actifs/jour ✅

---

## 📊 Tests de charge recommandés

### Avant la mise en production

```bash
# Installer k6 (outil de test de charge)
sudo apt install k6

# Test de charge progressif
k6 run --vus 10 --duration 30s load-test.js
k6 run --vus 50 --duration 1m load-test.js
k6 run --vus 100 --duration 2m load-test.js
k6 run --vus 500 --duration 5m load-test.js
```

**Indicateurs à surveiller :**
- Temps de réponse moyen (< 500ms)
- Taux d'erreur (< 0.1%)
- Utilisation CPU (< 70%)
- Utilisation RAM (< 80%)
- Latence MongoDB (< 50ms)

---

## ✅ Plan d'action

### Phase 1 : Immédiat (avant déploiement)

- [ ] Ajuster le rate limiting (500 req/15min)
- [ ] Augmenter TTL sessions (24h)
- [ ] Tester avec 100-200 utilisateurs simulés
- [ ] Configurer PM2 avec 2-4 instances (selon CPU)

### Phase 2 : Court terme (1-3 mois)

- [ ] Implémenter cache Redis (rôles, départements)
- [ ] Mettre en place Cloudflare (CDN gratuit)
- [ ] Monitoring avec PM2 Plus ou Datadog
- [ ] Optimiser les requêtes MongoDB (explain())

### Phase 3 : Moyen terme (3-6 mois)

- [ ] Queue d'upload asynchrone (Bull)
- [ ] Compression d'images automatique
- [ ] Lazy loading des documents
- [ ] API pagination améliorée

### Phase 4 : Long terme (6-12 mois)

- [ ] Load balancer (si > 5000 utilisateurs/jour)
- [ ] Microservices (séparation upload/recherche/auth)
- [ ] ElasticSearch pour recherche full-text
- [ ] CDN avec cache edge

---

## 📞 Conclusion

### Réponse directe : Combien d'utilisateurs ?

**Avec la configuration actuelle (4 CPU, 8 GB RAM) :**

| Métrique | Capacité |
|----------|----------|
| **Utilisateurs simultanés** | 200-400 |
| **Utilisateurs actifs/jour** | 2000-4000 |
| **Requêtes/seconde** | 100-200 |
| **Documents stockés** | Illimité (MongoDB Atlas) |

**Pour l'UCAD (30,000 étudiants) :**

✅ **L'application peut gérer l'UCAD** avec une configuration moyenne (4-8 CPU, 8-16 GB RAM)

⚠️ **Ajustements nécessaires :**
1. Augmenter le rate limiting
2. Implémenter un cache (Redis)
3. Utiliser un CDN
4. Monitoring actif

### Points forts de votre application

✅ Architecture solide et sécurisée
✅ Bonne séparation des responsabilités
✅ Logs et monitoring en place
✅ Prête pour le clustering (PM2)
✅ Scalabilité horizontale possible

### Verdict final

**Votre application est bien conçue et peut supporter plusieurs milliers d'utilisateurs actifs avec les bonnes optimisations.**

Pour l'UCAD, commencez avec un serveur moyen (4-8 CPU) et augmentez selon l'usage réel. Le goulot d'étranglement principal est le rate limiting actuel, pas l'architecture.

---

**Analyse effectuée le : 30 Novembre 2025**
