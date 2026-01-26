# SYSTÈME D'ARCHIVAGE NUMÉRIQUE
## Présentation pour la Mutuelle

---

# 1. PRÉSENTATION DE L'APPLICATION

## 1.1 Objectif

Le **Système d'Archivage Numérique** est une application web moderne permettant de :

- **Centraliser** tous les documents de la mutuelle en un seul endroit
- **Sécuriser** l'accès aux documents sensibles selon les rôles
- **Tracer** toutes les actions (consultation, téléchargement, partage)
- **Rechercher** rapidement n'importe quel document
- **Partager** des documents entre collaborateurs de manière contrôlée

## 1.2 Fonctionnalités principales

| Fonctionnalité | Description |
|----------------|-------------|
| **Gestion documentaire** | Upload, organisation par catégories, tags, recherche avancée |
| **Contrôle d'accès** | 4 niveaux de permissions (Super Admin, Niveau 1, 2, 3) |
| **Traçabilité complète** | Historique des consultations, téléchargements et partages |
| **Prévisualisation** | Visualisation PDF, Word, Excel, PowerPoint, images sans téléchargement |
| **Partage sécurisé** | Partage de documents entre utilisateurs avec traçabilité |
| **Multi-départements** | Organisation par départements et services |
| **Messagerie interne** | Communication entre utilisateurs |
| **Tableau de bord** | Statistiques et vue d'ensemble |

## 1.3 Types de fichiers supportés

| Catégorie | Formats |
|-----------|---------|
| Documents | PDF, Word (.doc, .docx), Excel (.xls, .xlsx), PowerPoint (.ppt, .pptx) |
| Texte | TXT, CSV, RTF |
| Images | JPG, PNG, GIF, BMP, SVG |
| Archives | ZIP, RAR |

---

# 2. ARCHITECTURE TECHNIQUE

## 2.1 Technologies utilisées

| Composant | Technologie | Rôle |
|-----------|-------------|------|
| **Backend** | Node.js + Express | Serveur d'application |
| **Base de données** | MongoDB | Stockage des métadonnées |
| **Stockage fichiers** | Système de fichiers | Stockage optimisé des documents |
| **Frontend** | HTML5, CSS3, JavaScript | Interface utilisateur |
| **Sécurité** | Bcrypt, Sessions sécurisées | Authentification et chiffrement |

## 2.2 Architecture optimisée

```
┌─────────────────────────────────────────────────────────────┐
│                     SERVEUR                                  │
│                                                              │
│  ┌─────────────────┐    ┌─────────────────────────────────┐ │
│  │    MongoDB      │    │     Stockage Fichiers           │ │
│  │                 │    │                                 │ │
│  │  - Métadonnées  │    │  - Documents PDF, Word, Excel   │ │
│  │  - Utilisateurs │    │  - Images                       │ │
│  │  - Historiques  │    │  - Fichiers originaux           │ │
│  │  (~2 KB/doc)    │    │  (~500 KB - 5 MB/doc)           │ │
│  └─────────────────┘    └─────────────────────────────────┘ │
│           │                          │                       │
│           └──────────┬───────────────┘                       │
│                      │                                       │
│              ┌───────▼───────┐                               │
│              │   Node.js     │                               │
│              │   Application │                               │
│              └───────┬───────┘                               │
└──────────────────────┼───────────────────────────────────────┘
                       │
                       │ HTTPS (sécurisé)
                       ▼
              ┌─────────────────┐
              │   Navigateurs   │
              │   (Employés)    │
              └─────────────────┘
```

## 2.3 Avantages de cette architecture

| Avantage | Description |
|----------|-------------|
| **Performance** | Requêtes ultra-rapides (métadonnées légères) |
| **Scalabilité** | Peut gérer 100 000+ documents |
| **Sécurité** | Données séparées, accès contrôlé |
| **Sauvegarde** | Facile à sauvegarder (base + fichiers) |
| **Maintenance** | Simple à maintenir et mettre à jour |

---

# 3. NIVEAUX D'ACCÈS ET PERMISSIONS

## 3.1 Hiérarchie des rôles

```
            ┌─────────────────────┐
            │   SUPER ADMIN       │  Niveau 0
            │   (Administrateur)  │  Accès total + Audit
            └──────────┬──────────┘
                       │
            ┌──────────▼──────────┐
            │     NIVEAU 1        │  Responsable département
            │  (Chef de service)  │  Gestion complète
            └──────────┬──────────┘
                       │
            ┌──────────▼──────────┐
            │     NIVEAU 2        │  Employé senior
            │   (Collaborateur)   │  Consultation + Partage
            └──────────┬──────────┘
                       │
            ┌──────────▼──────────┐
            │     NIVEAU 3        │  Employé
            │    (Utilisateur)    │  Consultation limitée
            └─────────────────────┘
```

## 3.2 Matrice des permissions

| Action | Super Admin | Niveau 1 | Niveau 2 | Niveau 3 |
|--------|:-----------:|:--------:|:--------:|:--------:|
| Voir tous les documents | ✅ | ❌ | ❌ | ❌ |
| Gérer les utilisateurs | ✅ | ❌ | ❌ | ❌ |
| Audit complet | ✅ | ❌ | ❌ | ❌ |
| Créer des documents | ❌ | ✅ | ✅ | ✅ |
| Supprimer des documents | ❌ | ✅ | ❌ | ❌ |
| Verrouiller des documents | ❌ | ✅ | ❌ | ❌ |
| Partager des documents | ❌ | ✅ | ✅ | ❌ |
| Télécharger | ❌ | ✅ | ✅ | ✅ |
| Voir son département | ❌ | ✅ | ✅ | ✅ |

---

# 4. SÉCURITÉ ET TRAÇABILITÉ

## 4.1 Mesures de sécurité

| Mesure | Description |
|--------|-------------|
| **Authentification** | Mot de passe chiffré (bcrypt) |
| **Sessions** | Expiration automatique après inactivité |
| **Contrôle d'accès** | Vérification à chaque requête |
| **Audit** | Journalisation de toutes les actions |
| **Sauvegarde** | Données récupérables en cas de problème |

## 4.2 Traçabilité complète

Chaque document conserve l'historique de :

- **Qui** a créé le document
- **Qui** l'a consulté et **quand**
- **Qui** l'a téléchargé et **quand**
- **Qui** l'a partagé avec **qui** et **quand**

Exemple d'historique :
```
📄 Document: Contrat_2024.pdf

📥 Téléchargements:
   - Mamadou DIOP (Comptable) - 15/01/2025 à 10:30
   - Fatou NDIAYE (RH) - 16/01/2025 à 14:15

👥 Partages:
   - Partagé par: Ibrahima BA → Aminata FALL (17/01/2025)
```

---

# 5. OPTIONS DE DÉPLOIEMENT

## 5.1 Option A : Serveur Local (Recommandé pour la Mutuelle)

### Description
Un ordinateur dédié installé dans les locaux de la mutuelle.

### Schéma
```
        LOCAUX DE LA MUTUELLE
┌─────────────────────────────────────────┐
│                                         │
│   ┌─────────────┐                       │
│   │  SERVEUR    │ ◄── PC dédié          │
│   │  LOCAL      │     (toujours allumé) │
│   └──────┬──────┘                       │
│          │                              │
│          │ Réseau local (WiFi/Câble)    │
│          │                              │
│   ┌──────▼──────┐  ┌──────────────┐     │
│   │ PC Employé 1│  │ PC Employé 2 │     │
│   └─────────────┘  └──────────────┘     │
│                                         │
└─────────────────────────────────────────┘
```

### Avantages
| Avantage | Description |
|----------|-------------|
| ✅ **Contrôle total** | Données 100% chez vous |
| ✅ **Confidentialité** | Aucun tiers n'accède aux données |
| ✅ **Indépendance** | Fonctionne même sans internet |
| ✅ **Coût unique** | Pas d'abonnement mensuel |
| ✅ **Rapidité** | Réseau local très rapide |

### Inconvénients
| Inconvénient | Solution |
|--------------|----------|
| ⚠️ Maintenance | Formation d'un responsable IT |
| ⚠️ Pannes | Onduleur + Sauvegardes régulières |
| ⚠️ Accès distant | VPN si nécessaire |

### Configuration matérielle recommandée

| Composant | Minimum | Recommandé |
|-----------|---------|------------|
| Processeur | Intel i3 / Ryzen 3 | Intel i5 / Ryzen 5 |
| RAM | 8 GB | 16 GB |
| Stockage | SSD 256 GB | SSD 500 GB - 1 TB |
| Système | Windows 10/11 Pro | Ubuntu Server 22.04 |

### Estimation des coûts (FCFA)

| Élément | Coût estimé |
|---------|-------------|
| PC (Mini PC ou Tour) | 250 000 - 400 000 |
| Onduleur (protection coupures) | 50 000 - 100 000 |
| Disque externe (sauvegardes) | 40 000 - 80 000 |
| Installation et configuration | 50 000 - 100 000 |
| **TOTAL** | **390 000 - 680 000 FCFA** |

---

## 5.2 Option B : Serveur Cloud / Hébergé

### Description
L'application est hébergée sur un serveur distant (data center, cloud).

### Schéma
```
    CLOUD / DATA CENTER                    MUTUELLE
┌─────────────────────┐              ┌─────────────────┐
│                     │   Internet   │                 │
│   ┌───────────┐     │◄────────────►│  PC Employés    │
│   │  SERVEUR  │     │              │                 │
│   │  DISTANT  │     │              └─────────────────┘
│   └───────────┘     │
│                     │
└─────────────────────┘
```

### Avantages
| Avantage | Description |
|----------|-------------|
| ✅ **Pas de matériel** | Rien à installer sur place |
| ✅ **Maintenance incluse** | Le prestataire gère le serveur |
| ✅ **Accès partout** | Accessible depuis n'importe où |
| ✅ **Haute disponibilité** | Serveurs redondants |

### Inconvénients
| Inconvénient | Impact |
|--------------|--------|
| ❌ **Coût mensuel** | 15 000 - 50 000 FCFA/mois |
| ❌ **Dépendance internet** | Sans internet = pas d'accès |
| ❌ **Données chez un tiers** | Confidentialité réduite |
| ❌ **Dépendance prestataire** | Risque si le prestataire ferme |

### Estimation des coûts (FCFA)

| Élément | Coût mensuel |
|---------|--------------|
| Hébergement VPS | 15 000 - 30 000 |
| Nom de domaine | 1 000 - 2 000 |
| Certificat SSL | Gratuit (Let's Encrypt) |
| Maintenance | 10 000 - 20 000 |
| **TOTAL/mois** | **26 000 - 52 000 FCFA** |
| **TOTAL/an** | **312 000 - 624 000 FCFA** |

---

## 5.3 Option C : Serveur VPS/Dédié Haute Performance (Recommandé pour production intensive)

### Pourquoi un serveur dédié performant ?

Les solutions PaaS gratuites (Render, Heroku) présentent des **limitations critiques** :

| Limitation | Impact sur l'application |
|------------|--------------------------|
| CPU partagé | Lenteurs imprévisibles |
| RAM limitée (512 MB) | Crash avec gros fichiers |
| Stockage éphémère | **Perte de données** à chaque redéploiement |
| Cold start | 30 secondes d'attente après inactivité |
| Pas de contrôle | Impossible d'optimiser |

**L'application est conçue pour gérer des milliers de documents** - elle nécessite un serveur avec des ressources dédiées pour garantir des performances optimales.

### Fournisseurs VPS recommandés

| Fournisseur | Configuration | Prix/mois | Avantages |
|-------------|---------------|-----------|-----------|
| **Contabo** | 4 vCPU, 8 GB RAM, 200 GB SSD | ~4 500 FCFA (~$7) | Meilleur rapport qualité/prix |
| **Hetzner** | 4 vCPU, 8 GB RAM, 160 GB SSD | ~5 200 FCFA (~$8) | Excellent support, fiabilité |
| **OVH** | 4 vCPU, 8 GB RAM, 80 GB SSD | ~7 800 FCFA (~$12) | Data centers en France |
| **DigitalOcean** | 4 vCPU, 8 GB RAM, 160 GB SSD | ~31 000 FCFA (~$48) | Interface simple, documentation |

### Serveurs dédiés (Performance maximale)

Pour une organisation avec beaucoup d'utilisateurs et de documents :

| Fournisseur | Configuration | Prix/mois |
|-------------|---------------|-----------|
| **Hetzner Dedicated** | 8 cœurs, 32 GB RAM, 512 GB NVMe | ~26 000 FCFA (~$40) |
| **Contabo Dedicated** | 8 cœurs, 64 GB RAM, 1 TB SSD | ~32 500 FCFA (~$50) |
| **OVH Dedicated** | 8 cœurs, 32 GB RAM, 500 GB SSD | ~39 000 FCFA (~$60) |

### Architecture serveur production

```
┌─────────────────────────────────────────────────────────────┐
│                 SERVEUR VPS / DÉDIÉ                          │
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐   │
│  │    Nginx     │  │   Node.js    │  │     MongoDB      │   │
│  │   (Reverse   │──│    (App)     │──│    (Local)       │   │
│  │  Proxy +SSL) │  │     PM2      │  │                  │   │
│  └──────────────┘  └──────────────┘  └──────────────────┘   │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │           Stockage SSD (Documents)                    │   │
│  │           /var/www/app/storage/files                  │   │
│  │           Persistant et rapide                        │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
└──────────────────────────────────────────────────────────────┘
                          │
                          │ HTTPS (Let's Encrypt)
                          ▼
                 ┌─────────────────┐
                 │   Utilisateurs  │
                 │   (Navigateur)  │
                 └─────────────────┘
```

### Stack technique recommandée

| Composant | Technologie | Rôle |
|-----------|-------------|------|
| **Système** | Ubuntu 22.04 LTS | Système stable et sécurisé |
| **Reverse Proxy** | Nginx | Gestion SSL, compression, cache |
| **Application** | Node.js 18/20 LTS | Serveur applicatif |
| **Process Manager** | PM2 | Redémarrage auto, monitoring |
| **Base de données** | MongoDB 6.0+ | Stockage métadonnées |
| **Certificat SSL** | Let's Encrypt (Certbot) | HTTPS gratuit |

### Spécifications selon l'usage

| Taille organisation | CPU | RAM | Stockage | Utilisateurs | Documents |
|---------------------|-----|-----|----------|--------------|-----------|
| **Petite** | 2 vCPU | 4 GB | 100 GB SSD | < 50 | < 10 000 |
| **Moyenne** | 4 vCPU | 8 GB | 250 GB SSD | 50-200 | 10 000 - 50 000 |
| **Grande** | 8 vCPU | 16 GB | 500 GB SSD | 200+ | 50 000+ |

### Avantages du serveur dédié VPS

| Avantage | Description |
|----------|-------------|
| ✅ **Ressources dédiées** | Pas de partage avec d'autres clients |
| ✅ **Stockage persistant** | Les fichiers ne sont jamais perdus |
| ✅ **MongoDB local** | Pas de latence réseau, requêtes ultra-rapides |
| ✅ **Contrôle total** | Configuration personnalisée, optimisations |
| ✅ **Scalable** | Augmenter les ressources facilement |
| ✅ **SSL gratuit** | Certificat Let's Encrypt inclus |
| ✅ **Trafic illimité** | Pas de limite de bande passante |

### Comparatif performances

| Critère | PaaS Gratuit (Render) | VPS Contabo | Serveur Dédié |
|---------|:---------------------:|:-----------:|:-------------:|
| **Prix/mois** | 0 FCFA | ~4 500 FCFA | ~26 000 FCFA |
| **Temps de réponse** | 500ms - 2s | < 100ms | < 50ms |
| **10 000 documents** | ❌ Impossible | ✅ Fluide | ✅ Instantané |
| **100 000 documents** | ❌ | ⚠️ Possible | ✅ Fluide |
| **Disponibilité** | 95% | 99.5% | 99.9% |
| **Données sécurisées** | ⚠️ Éphémères | ✅ Persistantes | ✅ Persistantes |

### Estimation des coûts VPS (FCFA)

| Élément | Coût |
|---------|------|
| **VPS Contabo (recommandé)** | 4 500 FCFA/mois |
| Nom de domaine | 6 000 - 12 000 FCFA/an |
| Certificat SSL | Gratuit (Let's Encrypt) |
| **TOTAL première année** | ~60 000 FCFA |
| **TOTAL années suivantes** | ~54 000 FCFA/an |

---

## 5.4 Comparatif des trois options

| Critère | Serveur Local | Cloud Basique | VPS Haute Perf. |
|---------|:-------------:|:-------------:|:---------------:|
| **Coût initial** | 400 000 - 700 000 | Faible | Faible |
| **Coût mensuel** | ~5 000 (électricité) | 26 000 - 52 000 | ~4 500 |
| **Coût sur 3 ans** | ~580 000 | ~1 200 000 | ~162 000 |
| **Contrôle données** | ✅ Total | ⚠️ Partagé | ✅ Total |
| **Confidentialité** | ✅ Maximum | ⚠️ Moyenne | ✅ Maximum |
| **Accès sans internet** | ✅ Oui | ❌ Non | ❌ Non |
| **Maintenance** | Vous gérez | Prestataire | Vous gérez |
| **Scalabilité** | Limitée | Facile | ✅ Très facile |
| **Performance** | ⭐⭐⭐⭐ | ⭐⭐ | ⭐⭐⭐⭐⭐ |
| **10 000+ documents** | ✅ | ❌ | ✅ |
| **Accès distant** | ⚠️ VPN requis | ✅ Partout | ✅ Partout |
| **Recommandé pour** | Usage interne | Tests/Démo | **Production** |

---

# 6. RECOMMANDATION POUR LA MUTUELLE

## Deux options recommandées selon vos besoins

---

### Option A : **SERVEUR LOCAL** (Usage interne uniquement)

**Idéal si** : Les employés accèdent uniquement depuis les locaux de la mutuelle.

#### Pourquoi ?

1. **Données sensibles** : Les documents d'une mutuelle (contrats, finances, données personnelles) doivent rester confidentiels

2. **Économie à long terme** :
   - Local : ~580 000 FCFA sur 3 ans
   - Cloud basique : ~1 200 000 FCFA sur 3 ans
   - **Économie : 620 000 FCFA**

3. **Indépendance** : Fonctionne même sans internet

4. **Conformité** : Contrôle total sur les données

---

### Option B : **VPS HAUTE PERFORMANCE** (Recommandé pour production)

**Idéal si** : Vous avez besoin d'accès distant, de haute disponibilité, ou de gérer beaucoup de documents.

#### Pourquoi le VPS est plus stable en production ?

L'application est **optimisée pour fonctionner avec des données locales** (sur le même serveur) :

```
┌─────────────────────────────────────────────────┐
│              SERVEUR VPS                         │
│                                                  │
│   Node.js ◄──── 0ms ────► MongoDB (local)       │
│      │                                           │
│      └──────── 0ms ────► Fichiers (local)       │
│                                                  │
│   = Latence quasi-nulle = Performance maximale  │
└─────────────────────────────────────────────────┘
```

Contrairement aux solutions cloud séparées :
```
┌──────────┐      ┌──────────┐      ┌──────────┐
│  App     │ 50ms │ MongoDB  │ 100ms│ Stockage │
│ (Render) │◄────►│ (Atlas)  │◄────►│  (S3)    │
└──────────┘      └──────────┘      └──────────┘
   = Latence cumulée = Lenteurs
```

#### Avantages du VPS avec données locales

| Avantage | Impact |
|----------|--------|
| **MongoDB sur le même serveur** | Requêtes < 1ms au lieu de 50-100ms |
| **Fichiers sur disque local** | Téléchargements instantanés |
| **Pas de cold start** | Application toujours prête |
| **Ressources dédiées** | Performances prévisibles |
| **Coût très bas** | ~4 500 FCFA/mois (~54 000/an) |

#### Comparatif économique sur 3 ans

| Solution | Coût total 3 ans |
|----------|------------------|
| Serveur Local | ~580 000 FCFA |
| **VPS Contabo** | **~162 000 FCFA** ✅ Le moins cher |
| Cloud basique (Render payant) | ~1 200 000 FCFA |

**Le VPS est 3.5x moins cher que le serveur local** et offre l'accès distant inclus

---

## Configurations recommandées

### Configuration A : Serveur Local

```
┌────────────────────────────────────────────────────────┐
│                    SERVEUR LOCAL                        │
│                                                         │
│   Matériel:                                             │
│   ├── Mini PC Intel i5, 16GB RAM, SSD 500GB            │
│   ├── Onduleur 1000VA (protection coupures)            │
│   └── Disque externe 1TB (sauvegardes)                 │
│                                                         │
│   Logiciels:                                            │
│   ├── Windows 10/11 Pro ou Ubuntu Server               │
│   ├── Node.js (application)                            │
│   ├── MongoDB (base de données)                        │
│   └── Antivirus (sécurité)                             │
│                                                         │
└────────────────────────────────────────────────────────┘
```

### Configuration B : VPS Haute Performance (Recommandé)

```
┌────────────────────────────────────────────────────────┐
│              VPS CONTABO / HETZNER                      │
│                                                         │
│   Ressources:                                           │
│   ├── 4 vCPU dédiés                                    │
│   ├── 8 GB RAM                                         │
│   ├── 200 GB SSD NVMe                                  │
│   └── Trafic illimité                                  │
│                                                         │
│   Stack logicielle:                                     │
│   ├── Ubuntu 22.04 LTS                                 │
│   ├── Nginx (reverse proxy + SSL)                      │
│   ├── Node.js 18/20 LTS + PM2                          │
│   ├── MongoDB 6.0+ (local)                             │
│   └── Let's Encrypt (HTTPS gratuit)                    │
│                                                         │
│   Coût: ~4 500 FCFA/mois                               │
│                                                         │
└────────────────────────────────────────────────────────┘
```

### Fournisseur VPS recommandé : Contabo

| Critère | Détail |
|---------|--------|
| **Plan** | Cloud VPS S |
| **Prix** | ~$7/mois (~4 500 FCFA) |
| **CPU** | 4 vCPU |
| **RAM** | 8 GB |
| **Stockage** | 200 GB SSD NVMe |
| **Trafic** | Illimité |
| **Site** | https://contabo.com |

**Alternative** : Hetzner (~$8/mois) - Excellent support et fiabilité

---

## 5.5 Note sur les serveurs institutionnels (UCAD, universités, etc.)

### Les serveurs institutionnels peuvent-ils héberger l'application ?

**Techniquement OUI** - L'application peut fonctionner sur n'importe quel serveur Linux avec :
- Node.js 18+
- MongoDB 6+
- 4 GB RAM minimum

### Pourquoi le VPS est recommandé à la place ?

| Problème serveurs institutionnels | Impact |
|-----------------------------------|--------|
| **Accès SSH refusé/limité** | Impossible d'installer et configurer |
| **Droits administrateur restreints** | Impossible d'installer MongoDB, Node.js |
| **Procédures bureaucratiques** | Délais de plusieurs semaines/mois |
| **Maintenance partagée** | Dépendance au service informatique |
| **Mises à jour imposées** | Risque d'incompatibilité |
| **Priorité basse** | Support lent en cas de problème |

### Comparaison

| Critère | Serveur UCAD | VPS Personnel |
|---------|:------------:|:-------------:|
| **Accès SSH root** | ❌ Souvent refusé | ✅ Total |
| **Installation libre** | ❌ Demande autorisation | ✅ Immédiat |
| **Contrôle total** | ❌ | ✅ |
| **Réactivité support** | ⚠️ Variable | ✅ Vous gérez |
| **Coût** | Gratuit | ~4 500 FCFA/mois |
| **Indépendance** | ❌ Dépendant institution | ✅ Totale |

### Recommandation finale

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│   🎯 RECOMMANDATION : VPS (Contabo/Hetzner)                │
│                                                             │
│   Pourquoi VPS plutôt que serveur UCAD/institutionnel ?    │
│                                                             │
│   ✅ Accès root total (installer ce qu'on veut)           │
│   ✅ Pas de procédures administratives                     │
│   ✅ Pas de dépendance au service IT                       │
│   ✅ Disponible en 24h (vs semaines/mois pour UCAD)        │
│   ✅ Contrôle total sur la configuration                   │
│   ✅ Support réactif en cas de problème                    │
│   ✅ Coût très faible : ~4 500 FCFA/mois                   │
│   ✅ 200 GB de stockage inclus                             │
│   ✅ MongoDB local = performances maximales                │
│                                                             │
│   ❌ UCAD : Accès SSH souvent refusé                       │
│   ❌ UCAD : Installation MongoDB/Node.js bloquée           │
│   ❌ UCAD : Délais administratifs longs                    │
│   ❌ UCAD : Dépendance au service informatique             │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Comparatif économique

| Solution | Coût 1ère année | Coût/an ensuite | Contrôle |
|----------|-----------------|-----------------|:--------:|
| Serveur UCAD | Gratuit (si autorisé) | Gratuit | ❌ Limité |
| Serveur local | ~500 000 FCFA | ~60 000 FCFA | ✅ Total |
| **VPS Contabo** | **~54 000 FCFA** | **~54 000 FCFA** | ✅ **Total** |

**👉 Le VPS est 10x moins cher qu'un serveur local et offre plus de liberté que l'UCAD.**

---

# 7. PLAN DE DÉPLOIEMENT

## Option A : Déploiement Serveur Local

### Phase 1 : Préparation
- [ ] Validation du choix de déploiement
- [ ] Achat du matériel (Mini PC, onduleur, disque externe)
- [ ] Préparation de l'environnement réseau

### Phase 2 : Installation
- [ ] Installation du système d'exploitation (Windows/Ubuntu)
- [ ] Installation de Node.js et MongoDB
- [ ] Déploiement de l'application
- [ ] Configuration réseau local

### Phase 3 : Configuration
- [ ] Création des départements et services
- [ ] Création des comptes utilisateurs
- [ ] Configuration des permissions
- [ ] Import des documents existants (si applicable)

### Phase 4 : Formation et mise en service
- [ ] Formation des administrateurs
- [ ] Formation des utilisateurs
- [ ] Tests finaux et mise en production

---

## Option B : Déploiement VPS (Recommandé)

### Phase 1 : Acquisition du VPS
- [ ] Créer un compte sur Contabo ou Hetzner
- [ ] Commander un VPS (Cloud VPS S recommandé)
- [ ] Recevoir les accès SSH (email)

### Phase 2 : Configuration du serveur
```bash
# Connexion SSH
ssh root@votre_ip_serveur

# Mise à jour système
apt update && apt upgrade -y

# Installation Node.js 20 LTS
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs

# Installation MongoDB 6.0
apt install -y gnupg curl
curl -fsSL https://pgp.mongodb.com/server-6.0.asc | gpg --dearmor -o /usr/share/keyrings/mongodb.gpg
echo "deb [signed-by=/usr/share/keyrings/mongodb.gpg] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/6.0 multiverse" > /etc/apt/sources.list.d/mongodb.list
apt update && apt install -y mongodb-org
systemctl enable --now mongod

# Installation PM2 (gestionnaire de processus)
npm install -g pm2

# Installation Nginx
apt install -y nginx

# Installation Certbot (SSL)
apt install -y certbot python3-certbot-nginx
```

### Phase 3 : Déploiement de l'application
```bash
# Créer le dossier application
mkdir -p /var/www/archivage
cd /var/www/archivage

# Transférer les fichiers (depuis votre PC)
# Option 1: Git
git clone [votre-repo] .

# Option 2: SCP (copie directe)
# scp -r /chemin/local/* root@ip_serveur:/var/www/archivage/

# Installation des dépendances
npm install --production

# Configuration environnement
cat > .env << EOF
NODE_ENV=production
PORT=4000
MONGODB_URI=mongodb://localhost:27017/mes_archivage
SESSION_SECRET=$(openssl rand -hex 32)
SESSION_CRYPTO_SECRET=$(openssl rand -hex 32)
STORAGE_MODE=file
EOF

# Créer le dossier de stockage
mkdir -p storage/files

# Démarrer avec PM2
pm2 start server.js --name archivage
pm2 save
pm2 startup
```

### Phase 4 : Configuration Nginx + SSL
```bash
# Configuration Nginx
cat > /etc/nginx/sites-available/archivage << 'EOF'
server {
    listen 80;
    server_name votre-domaine.com;

    location / {
        proxy_pass http://localhost:4000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_cache_bypass $http_upgrade;
        client_max_body_size 50M;
    }
}
EOF

# Activer le site
ln -s /etc/nginx/sites-available/archivage /etc/nginx/sites-enabled/
nginx -t && systemctl reload nginx

# Installer certificat SSL (HTTPS gratuit)
certbot --nginx -d votre-domaine.com
```

### Phase 5 : Configuration application
- [ ] Accéder à https://votre-domaine.com
- [ ] Créer le Super Admin de production
- [ ] Créer les départements et services
- [ ] Créer les comptes utilisateurs
- [ ] Tester toutes les fonctionnalités

### Phase 6 : Sauvegardes automatiques
```bash
# Script de sauvegarde quotidienne
cat > /root/backup.sh << 'EOF'
#!/bin/bash
DATE=$(date +%Y%m%d)
BACKUP_DIR=/root/backups

mkdir -p $BACKUP_DIR

# Sauvegarde MongoDB
mongodump --out $BACKUP_DIR/mongo_$DATE

# Sauvegarde fichiers
tar -czf $BACKUP_DIR/files_$DATE.tar.gz /var/www/archivage/storage/files

# Garder 7 jours de sauvegardes
find $BACKUP_DIR -mtime +7 -delete

echo "Sauvegarde $DATE terminée"
EOF

chmod +x /root/backup.sh

# Planifier sauvegarde quotidienne à 3h du matin
(crontab -l 2>/dev/null; echo "0 3 * * * /root/backup.sh") | crontab -
```

---

## Commandes utiles (VPS)

| Action | Commande |
|--------|----------|
| Voir les logs | `pm2 logs archivage` |
| Redémarrer l'app | `pm2 restart archivage` |
| État de l'app | `pm2 status` |
| Monitoring | `pm2 monit` |
| Renouveler SSL | `certbot renew` |
| Espace disque | `df -h` |
| Sauvegarde manuelle | `/root/backup.sh` |

---

# 8. MAINTENANCE ET SUPPORT

## 8.1 Sauvegardes recommandées

| Type | Fréquence | Destination |
|------|-----------|-------------|
| Base de données | Quotidienne | Disque externe |
| Fichiers | Hebdomadaire | Disque externe |
| Sauvegarde complète | Mensuelle | Stockage externe (coffre) |

## 8.2 Maintenance préventive

| Action | Fréquence |
|--------|-----------|
| Vérification des sauvegardes | Hebdomadaire |
| Mise à jour de sécurité | Mensuelle |
| Nettoyage disque | Trimestrielle |
| Vérification onduleur | Semestrielle |

---

# 9. CONCLUSION

Le **Système d'Archivage Numérique** offre à la mutuelle :

✅ **Organisation** : Tous les documents centralisés et classés

✅ **Sécurité** : Accès contrôlé et traçabilité complète

✅ **Efficacité** : Recherche rapide, partage facile

✅ **Conformité** : Historique complet pour les audits

✅ **Économie** : Solution pérenne à coût maîtrisé

---

# 10. ANNEXES

## A. Captures d'écran de l'application

### A.1 Page de connexion
Interface de connexion sécurisée avec authentification par mot de passe.

![Page de connexion](images/01-login.png)

---

### A.2 Tableau de bord
Vue d'ensemble avec statistiques et accès rapide aux fonctionnalités.

![Tableau de bord](images/02-dashboard.png)

---

### A.3 Liste des documents
Affichage des documents avec icônes, métadonnées et options de tri.

![Liste des documents](images/03-liste-documents.png)

---

### A.4 Prévisualisation de document
Visualisation des documents (PDF, Word, Excel, images) sans téléchargement.

![Aperçu document](images/04-apercu-document.png)

---

### A.5 Traçabilité complète
Historique des téléchargements, partages et consultations pour chaque document.

![Traçabilité](images/05-tracabilite.png)

---

### A.6 Formulaire d'upload
Interface intuitive pour ajouter de nouveaux documents avec métadonnées.

![Upload document](images/06-upload.png)

---

### A.7 Partage de documents
Sélection des utilisateurs pour partager un document de manière sécurisée.

![Partage](images/07-partage.png)

---

### A.8 Gestion des utilisateurs (Super Admin)
Interface d'administration pour gérer les comptes et les permissions.

![Gestion utilisateurs](images/08-utilisateurs.png)

---

### A.9 Audit et logs (Super Admin)
Journal complet de toutes les actions pour conformité et sécurité.

![Audit](images/09-audit.png)

---

### A.10 Interface responsive (Mobile)
L'application s'adapte aux smartphones et tablettes.

![Version mobile](images/10-mobile.png)

---

## B. Spécifications techniques détaillées

- **Backend** : Node.js v18+, Express v4
- **Base de données** : MongoDB v6+
- **Stockage** : Système de fichiers optimisé
- **Protocole** : HTTP/HTTPS
- **Port par défaut** : 4000

## C. Contact

Pour toute question ou demande de démonstration :

- **Email** : [votre email]
- **Téléphone** : [votre numéro]

---

*Document préparé le : Janvier 2025*
*Version : 1.0*
