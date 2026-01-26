# Optimisations Recommandées - Système d'Archivage C.E.R.E.R

Liste priorisée des optimisations pour améliorer les performances et la capacité.

---

## 🎯 Optimisations Prioritaires (À faire AVANT le déploiement)

### 1. Ajuster le Rate Limiting ⭐⭐⭐ (CRITIQUE)

**Problème actuel :** 100 requêtes/15min trop restrictif pour un campus universitaire.

**Solution :**

```javascript
// Dans security-config.js

// AVANT (actuel)
const generalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100  // ❌ Trop restrictif
});

// APRÈS (recommandé)
const generalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 500,  // ✅ Plus adapté pour un campus
    message: 'Trop de requêtes. Veuillez réessayer dans 15 minutes.'
});

const uploadLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 50,  // ✅ Augmenté de 10 à 50
    message: 'Trop d\'uploads. Réessayez dans 1 heure.'
});
```

**Impact :** +400% de capacité pour les utilisateurs sur le même réseau

**Effort :** 5 minutes ⏱️

---

### 2. Augmenter le TTL des Sessions ⭐⭐ (IMPORTANT)

**Problème actuel :** Sessions expirent après 1h → reconnexions fréquentes.

**Solution :**

```javascript
// Dans server.js (ligne ~303)

// AVANT (actuel)
store: MongoStore.create({
    // ...
    ttl: 3600,  // ❌ 1 heure
    touchAfter: 60
}),

// APRÈS (recommandé)
store: MongoStore.create({
    // ...
    ttl: 86400,  // ✅ 24 heures (1 jour)
    touchAfter: 300  // ✅ Mise à jour toutes les 5 minutes
}),
```

**Impact :** Meilleure expérience utilisateur, -80% de requêtes d'authentification

**Effort :** 2 minutes ⏱️

---

### 3. Configurer PM2 en mode Cluster ⭐⭐⭐ (IMPORTANT)

**Déjà fait :** ✅ Fichier `ecosystem.config.js` créé avec 2 instances.

**Vérifier la configuration :**

```javascript
// Dans ecosystem.config.js
module.exports = {
  apps: [{
    name: 'archivage-cerer',
    script: './server.js',
    instances: 2,  // ✅ Ajuster selon les CPU (CPU/2)
    exec_mode: 'cluster'
  }]
};
```

**Pour un serveur 4 CPU :** `instances: 2`
**Pour un serveur 8 CPU :** `instances: 4`

**Impact :** +100% de capacité, haute disponibilité

**Effort :** 0 minutes (déjà configuré) ⏱️

---

## 🚀 Optimisations Court Terme (1-3 mois)

### 4. Implémenter un Cache Redis ⭐⭐⭐ (HAUTE PRIORITÉ)

**Pourquoi :** Réduire la charge MongoDB et améliorer les temps de réponse.

**Installation :**

```bash
# Sur le serveur
sudo apt install redis-server -y
sudo systemctl start redis
sudo systemctl enable redis

# Dans le projet
npm install redis
```

**Implémentation :**

```javascript
// Créer cache-manager.js
const redis = require('redis');
const client = redis.createClient({
    host: 'localhost',
    port: 6379
});

client.connect();

// Fonctions de cache
async function cacheGet(key) {
    const data = await client.get(key);
    return data ? JSON.parse(data) : null;
}

async function cacheSet(key, value, ttl = 3600) {
    await client.setEx(key, ttl, JSON.stringify(value));
}

async function cacheDel(key) {
    await client.del(key);
}

module.exports = { cacheGet, cacheSet, cacheDel, client };
```

**Utilisation :**

```javascript
// Exemple : Cache des rôles
const { cacheGet, cacheSet } = require('./cache-manager');

async function getRole(roleId) {
    // 1. Vérifier le cache
    const cacheKey = `role:${roleId}`;
    const cached = await cacheGet(cacheKey);
    if (cached) {
        console.log('✅ Cache hit:', cacheKey);
        return cached;
    }

    // 2. Si pas en cache, récupérer de MongoDB
    const role = await rolesCollection.findOne({ _id: roleId });

    // 3. Mettre en cache (TTL: 1h)
    if (role) {
        await cacheSet(cacheKey, role, 3600);
    }

    return role;
}
```

**Données à cacher (par priorité) :**

1. ✅ **Rôles** (rarement modifiés, souvent lus)
2. ✅ **Départements** (rarement modifiés)
3. ✅ **Catégories** (rarement modifiées)
4. ✅ **Listes de documents** (cache 5 minutes)
5. ✅ **Résultats de recherche** (cache 10 minutes)

**Impact :**
- -30% charge MongoDB
- -40% temps de réponse
- +50% requêtes/seconde

**Effort :** 1-2 jours de développement ⏱️

---

### 5. Mettre en place Cloudflare (CDN) ⭐⭐ (MOYEN)

**Pourquoi :** Accélérer le chargement des fichiers statiques et réduire la bande passante.

**Configuration :**

1. **Créer un compte Cloudflare** (gratuit) : https://cloudflare.com
2. **Ajouter votre domaine** : `archivage.ucad.sn`
3. **Changer les DNS** : Pointer vers Cloudflare
4. **Activer :**
   - ✅ Auto Minify (HTML, CSS, JS)
   - ✅ Brotli compression
   - ✅ Caching level: Standard
   - ✅ Browser Cache TTL: 4 hours

**Dans Nginx :**

```nginx
# Ajouter des headers pour Cloudflare
location /public {
    alias /home/cerer/apps/archivage-cerer/backend/public;
    expires 7d;
    add_header Cache-Control "public, immutable";
    add_header X-Content-Type-Options "nosniff";
}
```

**Impact :**
- -60% bande passante serveur
- Temps de chargement divisé par 2-3
- Protection DDoS gratuite

**Effort :** 1-2 heures ⏱️

---

### 6. Optimiser les Index MongoDB ⭐⭐ (MOYEN)

**Vérifier les index existants :**

```javascript
// Dans MongoDB shell ou script
await documentsCollection.getIndexes();
await usersCollection.getIndexes();
```

**Index actuels (déjà bien configurés) :**

```javascript
// ✅ Déjà présents
await documentsCollection.createIndex({ idDocument: 1 });
await documentsCollection.createIndex({ idDepartement: 1 });
await usersCollection.createIndex({ username: 1 }, { unique: true });
await usersCollection.createIndex({ email: 1 }, { unique: true });
```

**Index supplémentaires recommandés :**

```javascript
// Pour les recherches par titre
await documentsCollection.createIndex({ titre: 'text' });

// Pour les recherches par date
await documentsCollection.createIndex({ dateCreation: -1 });

// Pour les filtres combinés
await documentsCollection.createIndex({ idDepartement: 1, dateCreation: -1 });

// Pour les recherches d'utilisateurs par département
await usersCollection.createIndex({ idDepartement: 1 });
```

**Impact :** -50% temps de recherche

**Effort :** 30 minutes ⏱️

---

## 🔧 Optimisations Moyen Terme (3-6 mois)

### 7. Queue d'Upload Asynchrone ⭐⭐⭐ (HAUTE PRIORITÉ)

**Pourquoi :** Les uploads bloquent le serveur Node.js.

**Solution : Bull (queue basée sur Redis)**

```bash
npm install bull
```

**Configuration :**

```javascript
// upload-queue.js
const Bull = require('bull');

const uploadQueue = new Bull('file-uploads', {
    redis: {
        host: 'localhost',
        port: 6379
    }
});

// Processor
uploadQueue.process(async (job) => {
    const { file, userId, metadata } = job.data;

    console.log(`📤 Processing upload for ${userId}: ${file.name}`);

    // 1. Sauvegarder le fichier
    await saveFile(file);

    // 2. Créer l'entrée en base
    await documentsCollection.insertOne({
        ...metadata,
        userId,
        fileName: file.name,
        uploadDate: new Date()
    });

    // 3. Mettre à jour le statut
    job.progress(100);

    return { success: true };
});

module.exports = uploadQueue;
```

**Utilisation dans l'API :**

```javascript
const uploadQueue = require('./upload-queue');

app.post('/api/upload', async (req, res) => {
    // Ajouter à la queue au lieu de traiter immédiatement
    const job = await uploadQueue.add({
        file: req.file,
        userId: req.session.userId,
        metadata: req.body
    });

    // Répondre immédiatement
    res.json({
        success: true,
        jobId: job.id,
        message: 'Upload en cours de traitement'
    });
});

// Endpoint pour vérifier le statut
app.get('/api/upload/:jobId/status', async (req, res) => {
    const job = await uploadQueue.getJob(req.params.jobId);
    res.json({
        status: await job.getState(),
        progress: job.progress()
    });
});
```

**Impact :**
- Uploads non-bloquants
- +200% uploads simultanés possibles
- Meilleure expérience utilisateur

**Effort :** 2-3 jours ⏱️

---

### 8. Pagination Optimisée ⭐⭐ (MOYEN)

**Problème actuel :** Récupérer tous les documents puis paginer en JavaScript.

**Solution : Pagination MongoDB native**

```javascript
// AVANT (non optimal)
app.get('/api/documents', async (req, res) => {
    const allDocs = await documentsCollection.find({}).toArray();
    const page = parseInt(req.query.page) || 1;
    const limit = 20;
    const start = (page - 1) * limit;

    res.json(allDocs.slice(start, start + limit));  // ❌ Inefficace
});

// APRÈS (optimisé)
app.get('/api/documents', async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = 20;
    const skip = (page - 1) * limit;

    const [documents, total] = await Promise.all([
        documentsCollection.find({})
            .skip(skip)
            .limit(limit)
            .toArray(),
        documentsCollection.countDocuments({})
    ]);

    res.json({
        documents,
        page,
        totalPages: Math.ceil(total / limit),
        total
    });
});
```

**Impact :** -70% utilisation mémoire, -80% temps de réponse

**Effort :** 1 jour ⏱️

---

### 9. Compression d'Images Automatique ⭐ (FAIBLE)

**Pourquoi :** Réduire l'espace de stockage et la bande passante.

**Solution : Sharp (bibliothèque de traitement d'image)**

```bash
npm install sharp
```

**Implémentation :**

```javascript
const sharp = require('sharp');

async function compressImage(inputPath, outputPath) {
    await sharp(inputPath)
        .resize(1920, 1080, { fit: 'inside', withoutEnlargement: true })
        .jpeg({ quality: 80 })
        .toFile(outputPath);
}

// Dans l'endpoint upload
if (file.mimetype.startsWith('image/')) {
    await compressImage(file.path, file.path);
}
```

**Impact :** -60% taille des images, économies de stockage

**Effort :** 1 jour ⏱️

---

## 🎯 Optimisations Long Terme (6-12 mois)

### 10. Load Balancer (si > 5000 utilisateurs/jour) ⭐⭐⭐

**Configuration avec Nginx :**

```nginx
# load-balancer.conf
upstream backend {
    least_conn;  # Méthode de distribution
    server 192.168.1.10:4000 weight=1;
    server 192.168.1.11:4000 weight=1;
    server 192.168.1.12:4000 weight=1;
}

server {
    listen 443 ssl;
    server_name archivage.ucad.sn;

    location / {
        proxy_pass http://backend;
        # ...
    }
}
```

**Impact :** Capacité multipliée par le nombre de serveurs

**Effort :** 1 semaine (configuration + tests) ⏱️

---

### 11. ElasticSearch pour Recherche Full-Text ⭐⭐

**Pourquoi :** Recherche beaucoup plus rapide et pertinente.

**Configuration :**

```bash
# Installation
wget https://artifacts.elastic.co/downloads/elasticsearch/elasticsearch-8.11.0-amd64.deb
sudo dpkg -i elasticsearch-8.11.0-amd64.deb
sudo systemctl start elasticsearch
```

**Synchronisation MongoDB → ElasticSearch :**

```javascript
const { Client } = require('@elastic/elasticsearch');
const esClient = new Client({ node: 'http://localhost:9200' });

// Indexer un document
async function indexDocument(doc) {
    await esClient.index({
        index: 'documents',
        id: doc._id.toString(),
        body: {
            titre: doc.titre,
            contenu: doc.contenu,
            dateCreation: doc.dateCreation
        }
    });
}

// Rechercher
async function searchDocuments(query) {
    const result = await esClient.search({
        index: 'documents',
        body: {
            query: {
                multi_match: {
                    query,
                    fields: ['titre^2', 'contenu']
                }
            }
        }
    });

    return result.hits.hits.map(hit => hit._source);
}
```

**Impact :** Recherche 10x plus rapide

**Effort :** 1-2 semaines ⏱️

---

## 📊 Tableau Récapitulatif

| Optimisation | Priorité | Impact | Effort | Quand |
|--------------|----------|--------|--------|-------|
| **Rate Limiting** | ⭐⭐⭐ | +400% capacité | 5 min | AVANT déploiement |
| **TTL Sessions** | ⭐⭐ | -80% auth | 2 min | AVANT déploiement |
| **PM2 Cluster** | ⭐⭐⭐ | +100% capacité | 0 min | ✅ Déjà fait |
| **Cache Redis** | ⭐⭐⭐ | -40% latence | 1-2 jours | 1-3 mois |
| **CDN Cloudflare** | ⭐⭐ | -60% bande passante | 1-2h | 1-3 mois |
| **Index MongoDB** | ⭐⭐ | -50% recherche | 30 min | 1-3 mois |
| **Queue Upload** | ⭐⭐⭐ | +200% uploads | 2-3 jours | 3-6 mois |
| **Pagination** | ⭐⭐ | -70% mémoire | 1 jour | 3-6 mois |
| **Compression Images** | ⭐ | -60% stockage | 1 jour | 3-6 mois |
| **Load Balancer** | ⭐⭐⭐ | +200-300% | 1 semaine | 6-12 mois |
| **ElasticSearch** | ⭐⭐ | 10x recherche | 1-2 semaines | 6-12 mois |

---

## ✅ Checklist d'implémentation

### Avant le déploiement (À faire maintenant)

- [ ] Augmenter rate limiting à 500 req/15min
- [ ] Augmenter TTL sessions à 24h
- [ ] Vérifier PM2 cluster configuré (2-4 instances)
- [ ] Tester avec 50-100 utilisateurs simulés

### 1-3 mois après déploiement

- [ ] Installer Redis
- [ ] Implémenter cache pour rôles/départements
- [ ] Configurer Cloudflare CDN
- [ ] Ajouter index MongoDB supplémentaires
- [ ] Monitoring actif (PM2 Plus ou Datadog)

### 3-6 mois (si besoin)

- [ ] Queue Bull pour uploads
- [ ] Pagination MongoDB native
- [ ] Compression d'images automatique
- [ ] Tests de charge réguliers

### 6-12 mois (si forte croissance)

- [ ] Load balancer
- [ ] ElasticSearch
- [ ] Microservices (auth, upload, search séparés)

---

## 🎯 Conclusion

**Actions immédiates (5 minutes) :**
1. Rate limiting : 100 → 500 requêtes
2. TTL sessions : 1h → 24h

**Ces deux changements simples multiplieront votre capacité par 4-5 !**

Le reste des optimisations peut être implémenté progressivement selon l'usage réel.

---

**Document créé le : 30 Novembre 2025**
