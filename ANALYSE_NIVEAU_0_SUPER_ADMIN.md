# Analyse Complète - Niveau 0 : Super Administrateur

**Date :** 30 Novembre 2025
**Objectif :** Ajouter un niveau 0 (Super Admin) pour la supervision et la maintenance du système
**Contrainte :** Ne PAS casser le code existant - Implémentation modulaire

---

## 📋 Table des Matières

1. [Architecture Actuelle](#architecture-actuelle)
2. [Concept du Niveau 0](#concept-du-niveau-0)
3. [Modules à Implémenter](#modules-à-implémenter)
4. [Architecture Technique](#architecture-technique)
5. [Interface Utilisateur](#interface-utilisateur)
6. [Sécurité](#sécurité)
7. [Plan d'Implémentation](#plan-dimplémentation)

---

## 🏗️ Architecture Actuelle

### Niveaux Existants

```
Niveau 3 (Invité)
├─ Voit ses documents
├─ Voit les documents des autres niveau 3 de son département
└─ Voit les documents partagés avec lui

Niveau 2 (Utilisateur)
├─ Voit TOUS les documents de son département
├─ Voit les documents partagés avec lui
├─ Peut créer, modifier, supprimer ses documents
└─ Peut demander la suppression de documents du département

Niveau 1 (Administrateur)
├─ Voit TOUS les documents de TOUS les départements
├─ Peut créer, modifier, supprimer N'IMPORTE QUEL document
├─ Peut partager des documents inter-départements
├─ Peut gérer les utilisateurs (via /admin-management.html)
└─ Peut gérer les catégories et départements
```

### Collections MongoDB Actuelles

```javascript
{
    usersCollection,           // Utilisateurs
    documentsCollection,       // Documents archivés
    categoriesCollection,      // Catégories de documents
    rolesCollection,           // Rôles (niveaux 1, 2, 3)
    departementsCollection,    // Départements
    deletionRequestsCollection, // Demandes de suppression
    messagesCollection,        // Messages système
    messageDeletionRequestsCollection, // Demandes suppression messages
    shareHistoryCollection,    // Historique des partages
    sessionsCollection         // Sessions utilisateurs (auto)
}
```

---

## 🎯 Concept du Niveau 0 : Super Administrateur

### Définition

**Le Niveau 0 est le GARDIEN du système**, pas un archiviste.

**Responsabilités :**
1. ✅ **Supervision** : Surveiller la santé du système
2. ✅ **Maintenance** : Gérer les ressources système
3. ✅ **Sécurité** : Détecter et prévenir les menaces
4. ✅ **Analytics** : Analyser l'usage et les performances
5. ✅ **Administration** : Gérer les administrateurs niveau 1
6. ✅ **Audit** : Consulter tous les logs et l'historique
7. ✅ **Support** : Identifier et résoudre les problèmes

**Ce qu'il NE fait PAS :**
- ❌ Archiver des documents
- ❌ Créer/modifier des documents (sauf exception critique)
- ❌ Participer aux workflows métiers
- ❌ Appartenir à un département

**Accès :**
- ✅ Dashboard de supervision dédié (`/super-admin.html`)
- ✅ Lecture TOTALE (tous documents, tous utilisateurs, tous logs)
- ✅ Actions d'administration système
- ⚠️ Modifications limitées (avec logs d'audit)

---

## 📊 Modules à Implémenter

### MODULE 1 : Dashboard de Vue d'Ensemble 📈

**Objectif :** Avoir une vue instantanée de l'état du système

#### 1.1 Statistiques Globales (KPIs)

**Carte 1 : Utilisateurs**
```javascript
{
    totalUsers: 1243,           // Nombre total d'utilisateurs
    activeToday: 187,           // Actifs aujourd'hui
    activeThisWeek: 542,        // Actifs cette semaine
    newThisMonth: 23,           // Nouveaux ce mois
    byLevel: {
        niveau0: 2,             // Super admins
        niveau1: 12,            // Administrateurs
        niveau2: 453,           // Utilisateurs
        niveau3: 776            // Invités
    },
    byDepartment: {
        "IT": 234,
        "RH": 189,
        // ...
    },
    onlineNow: 45               // En ligne maintenant (sessions actives)
}
```

**Carte 2 : Documents**
```javascript
{
    totalDocuments: 45678,      // Total documents
    createdToday: 234,          // Créés aujourd'hui
    createdThisWeek: 1234,      // Créés cette semaine
    createdThisMonth: 5234,     // Créés ce mois
    byCategory: {
        "Rapports": 12345,
        "Contrats": 8934,
        // ...
    },
    byDepartment: {
        "IT": 8934,
        "RH": 6234,
        // ...
    },
    totalSize: "45.6 GB",       // Taille totale
    averageSize: "1.2 MB"       // Taille moyenne
}
```

**Carte 3 : Activité Système**
```javascript
{
    requestsPerMinute: 234,     // Requêtes/min actuel
    requestsToday: 123456,      // Requêtes aujourd'hui
    uploadsToday: 456,          // Uploads aujourd'hui
    downloadsToday: 1234,       // Downloads aujourd'hui
    searchesToday: 789,         // Recherches aujourd'hui
    errorsToday: 12,            // Erreurs aujourd'hui
    averageResponseTime: "45ms" // Temps de réponse moyen
}
```

**Carte 4 : Ressources Serveur**
```javascript
{
    cpu: {
        usage: 45,              // % utilisation CPU
        cores: 4,               // Nombre de cores
        loadAverage: [1.2, 1.5, 1.8]
    },
    memory: {
        total: "16 GB",
        used: "8.2 GB",
        free: "7.8 GB",
        percentage: 51
    },
    disk: {
        total: "100 GB",
        used: "62 GB",
        free: "38 GB",
        percentage: 62
    },
    mongodb: {
        size: "2.3 GB",
        collections: 9,
        indexes: 15,
        avgObjSize: "2.1 KB"
    }
}
```

**Carte 5 : Sécurité & Alertes**
```javascript
{
    securityEvents: [
        {
            type: "RATE_LIMIT_EXCEEDED",
            count: 12,
            lastOccurrence: "2025-11-30 14:23:45"
        },
        {
            type: "FAILED_LOGIN",
            count: 5,
            lastOccurrence: "2025-11-30 14:20:12"
        }
    ],
    activeAlerts: 3,            // Alertes actives
    criticalAlerts: 0,          // Alertes critiques
    warningAlerts: 3            // Alertes warning
}
```

#### 1.2 Graphiques de Tendances

**Graphique 1 : Activité Utilisateurs (7 derniers jours)**
```javascript
// Utilisateurs actifs par jour
{
    labels: ["24/11", "25/11", "26/11", "27/11", "28/11", "29/11", "30/11"],
    data: [234, 267, 245, 289, 312, 298, 187]
}
```

**Graphique 2 : Documents Créés (30 derniers jours)**
```javascript
// Documents par jour
{
    labels: ["01/11", "02/11", ..., "30/11"],
    data: [45, 67, 52, ..., 234]
}
```

**Graphique 3 : Utilisation Ressources (24 dernières heures)**
```javascript
// CPU, RAM, Disk
{
    labels: ["00:00", "01:00", ..., "23:00"],
    cpu: [45, 42, 38, ..., 51],
    memory: [62, 64, 61, ..., 68],
    disk: [62, 62, 62, ..., 63]
}
```

**Graphique 4 : Requêtes HTTP (24 dernières heures)**
```javascript
// Requêtes par heure
{
    labels: ["00:00", "01:00", ..., "23:00"],
    success: [123, 145, ..., 234],  // 2xx
    errors: [2, 5, ..., 12]          // 4xx, 5xx
}
```

---

### MODULE 2 : Gestion des Utilisateurs Avancée 👥

**Objectif :** Supervision complète des utilisateurs

#### 2.1 Liste Complète des Utilisateurs

**Tableau avec filtres :**
```javascript
{
    columns: [
        "ID",
        "Nom complet",
        "Email",
        "Username",
        "Niveau",
        "Département",
        "Date création",
        "Dernière connexion",
        "Documents créés",
        "Statut",
        "Actions"
    ],
    filters: {
        niveau: [0, 1, 2, 3],
        departement: ["Tous", "IT", "RH", ...],
        statut: ["Actif", "Inactif", "Bloqué"],
        dateCreation: "range",
        derniereConnexion: "range"
    },
    search: "Recherche par nom, email, username",
    sort: {
        by: ["nom", "email", "niveau", "dateCreation", "derniereConnexion"],
        order: ["asc", "desc"]
    },
    pagination: {
        page: 1,
        limit: 50,
        total: 1243
    }
}
```

#### 2.2 Détails Utilisateur (Modal)

**Vue complète d'un utilisateur :**
```javascript
{
    // Informations de base
    _id: "...",
    nom: "DIOP",
    prenom: "Mamadou",
    email: "mamadou.diop@ucad.sn",
    username: "mdiop",
    niveau: 2,
    departement: {
        _id: "...",
        nom: "Informatique"
    },

    // Statistiques
    stats: {
        documentsCreated: 234,
        documentsShared: 45,
        documentsDownloaded: 123,
        totalStorageUsed: "2.3 GB",
        lastLogin: "2025-11-30 14:23:45",
        loginCount: 456,
        accountAge: "234 jours"
    },

    // Activité récente
    recentActivity: [
        {
            action: "UPLOAD",
            document: "Rapport Q4",
            date: "2025-11-30 14:20:12"
        },
        {
            action: "DOWNLOAD",
            document: "Budget 2025",
            date: "2025-11-30 13:45:23"
        },
        // ...
    ],

    // Historique de connexion
    loginHistory: [
        {
            date: "2025-11-30 14:23:45",
            ip: "192.168.1.45",
            userAgent: "Chrome 119.0.0.0",
            success: true
        },
        // ...
    ],

    // Événements de sécurité
    securityEvents: [
        {
            type: "FAILED_LOGIN",
            date: "2025-11-25 09:12:34",
            ip: "192.168.1.45",
            details: "Mot de passe incorrect"
        }
    ]
}
```

#### 2.3 Actions sur Utilisateurs

```javascript
{
    actions: [
        "Voir détails",
        "Modifier niveau/rôle",
        "Réinitialiser mot de passe",
        "Bloquer/Débloquer compte",
        "Voir tous ses documents",
        "Voir son activité",
        "Envoyer notification",
        "Supprimer compte (avec confirmation)",
        "Exporter données utilisateur (RGPD)"
    ]
}
```

---

### MODULE 3 : Gestion des Documents Globale 📁

**Objectif :** Vue d'ensemble et contrôle des documents

#### 3.1 Liste Globale des Documents

**Tableau avancé :**
```javascript
{
    columns: [
        "ID Document",
        "Titre",
        "Catégorie",
        "Département",
        "Créateur",
        "Date création",
        "Taille",
        "Downloads",
        "Partages",
        "Statut",
        "Actions"
    ],
    filters: {
        categorie: ["Tous", "Rapports", "Contrats", ...],
        departement: ["Tous", "IT", "RH", ...],
        createur: "autocomplete",
        dateCreation: "range",
        taille: "range",
        statut: ["Normal", "Verrouillé", "Supprimé"]
    },
    search: "Recherche full-text (titre, contenu, ID)",
    sort: {
        by: ["titre", "dateCreation", "taille", "downloads"],
        order: ["asc", "desc"]
    },
    actions: [
        "Voir détails",
        "Télécharger",
        "Voir historique",
        "Forcer déverrouillage",
        "Restaurer document supprimé",
        "Supprimer définitivement"
    ]
}
```

#### 3.2 Analyse des Documents

**Statistiques avancées :**
```javascript
{
    // Documents orphelins
    orphanedDocuments: {
        count: 12,
        reason: "Créateur supprimé ou département supprimé",
        totalSize: "45 MB",
        list: [...]
    },

    // Documents volumineux
    largeDocuments: {
        above50MB: 23,
        above100MB: 5,
        above500MB: 1,
        totalSize: "2.3 GB",
        list: [...] // Top 20
    },

    // Documents non consultés
    unusedDocuments: {
        never: 234,         // Jamais téléchargés
        over6Months: 456,   // Pas consultés depuis 6 mois
        over1Year: 789,     // Pas consultés depuis 1 an
        totalSize: "8.9 GB"
    },

    // Documents verrouillés
    lockedDocuments: {
        count: 12,
        lockedBy: {
            "admin1": 5,
            "admin2": 7
        },
        oldestLock: "2025-01-15",
        list: [...]
    },

    // Documents dupliqués (même hash)
    duplicateDocuments: {
        groups: 45,         // 45 groupes de doublons
        duplicates: 234,    // 234 fichiers en double
        wastedSpace: "1.2 GB",
        list: [...]
    }
}
```

---

### MODULE 4 : Logs et Audit 📜

**Objectif :** Traçabilité complète de toutes les actions

#### 4.1 Logs Système (Winston)

**Consultation des logs :**
```javascript
{
    sources: [
        "logs/security.log",    // Logs de sécurité
        "logs/error.log",       // Logs d'erreurs
        "logs/requests.log",    // Logs HTTP
        "logs/combined.log"     // Tous les logs
    ],

    filters: {
        level: ["info", "warn", "error"],
        event: [
            "LOGIN_SUCCESS",
            "LOGIN_FAILED",
            "UPLOAD",
            "DOWNLOAD",
            "DELETE",
            "RATE_LIMIT_EXCEEDED",
            // ...
        ],
        user: "autocomplete",
        ip: "search",
        dateRange: "picker"
    },

    display: {
        timestamp: "2025-11-30 14:23:45",
        level: "warn",
        event: "RATE_LIMIT_EXCEEDED",
        user: "mdiop",
        ip: "192.168.1.45",
        details: {...},
        message: "Trop de requêtes"
    }
}
```

#### 4.2 Historique des Actions

**Audit trail complet :**
```javascript
{
    // Nouvelle collection : auditLogs
    auditLog: {
        _id: "...",
        timestamp: ISODate("2025-11-30T14:23:45Z"),
        user: "mdiop",
        userLevel: 2,
        action: "DELETE_DOCUMENT",
        target: {
            type: "document",
            id: "DOC-20251130-142345123-4567",
            title: "Rapport Budget 2025"
        },
        details: {
            reason: "Document obsolète",
            confirmationToken: "abc123"
        },
        ip: "192.168.1.45",
        userAgent: "Chrome 119.0.0.0",
        result: "success"
    }
}
```

**Types d'actions trackées :**
```javascript
{
    authentification: [
        "LOGIN",
        "LOGOUT",
        "PASSWORD_RESET",
        "ACCOUNT_LOCKED"
    ],
    documents: [
        "CREATE_DOCUMENT",
        "UPDATE_DOCUMENT",
        "DELETE_DOCUMENT",
        "DOWNLOAD_DOCUMENT",
        "SHARE_DOCUMENT",
        "LOCK_DOCUMENT",
        "UNLOCK_DOCUMENT"
    ],
    administration: [
        "CREATE_USER",
        "UPDATE_USER",
        "DELETE_USER",
        "CHANGE_USER_LEVEL",
        "CREATE_DEPARTMENT",
        "UPDATE_DEPARTMENT",
        "DELETE_DEPARTMENT",
        "CREATE_CATEGORY",
        "UPDATE_CATEGORY",
        "DELETE_CATEGORY"
    ],
    system: [
        "SYSTEM_BACKUP",
        "DATABASE_CLEANUP",
        "CONFIG_CHANGE"
    ]
}
```

#### 4.3 Recherche Avancée dans l'Audit

**Requêtes spécialisées :**
```javascript
{
    queries: [
        "Qui a téléchargé le document X ?",
        "Quelles actions a fait l'utilisateur Y ?",
        "Qui a supprimé des documents aujourd'hui ?",
        "Quels documents ont été partagés depuis IP X ?",
        "Combien de tentatives de connexion échouées pour user Y ?",
        "Quels admins ont modifié des utilisateurs cette semaine ?"
    ],

    filters: {
        user: "autocomplete",
        action: "dropdown",
        target: "search",
        dateRange: "picker",
        ip: "search",
        result: ["success", "failure"]
    }
}
```

---

### MODULE 5 : Sécurité et Surveillance 🔒

**Objectif :** Détecter et prévenir les menaces

#### 5.1 Tableau de Bord Sécurité

**Alertes en temps réel :**
```javascript
{
    alerts: [
        {
            severity: "critical",
            type: "BRUTE_FORCE_ATTACK",
            message: "10 tentatives de connexion échouées pour 'admin' depuis IP 192.168.1.45",
            timestamp: "2025-11-30 14:23:45",
            action: "IP bloquée automatiquement",
            status: "active"
        },
        {
            severity: "warning",
            type: "UNUSUAL_ACTIVITY",
            message: "Utilisateur 'mdiop' a téléchargé 150 documents en 1h",
            timestamp: "2025-11-30 13:45:23",
            action: "Notification envoyée",
            status: "investigating"
        },
        {
            severity: "info",
            type: "RATE_LIMIT_HIT",
            message: "Rate limit atteint pour IP 192.168.1.67",
            timestamp: "2025-11-30 14:20:12",
            action: "Limite appliquée",
            status: "resolved"
        }
    ]
}
```

#### 5.2 Analyse de Sécurité

**Détection d'anomalies :**
```javascript
{
    anomalies: {
        // Tentatives de connexion suspectes
        suspiciousLogins: {
            count: 12,
            patterns: [
                {
                    pattern: "Multiples échecs puis succès",
                    users: ["user1", "user2"],
                    risk: "medium"
                },
                {
                    pattern: "Connexion depuis IP inhabituelle",
                    users: ["admin1"],
                    risk: "high"
                }
            ]
        },

        // Activité inhabituelle
        unusualActivity: {
            count: 5,
            cases: [
                {
                    user: "mdiop",
                    activity: "Download massif (150 docs/heure)",
                    normal: "5-10 docs/heure",
                    risk: "medium"
                },
                {
                    user: "admin1",
                    activity: "Suppression de 50 utilisateurs",
                    normal: "1-2/mois",
                    risk: "high"
                }
            ]
        },

        // Accès non autorisés (tentatives)
        unauthorizedAccess: {
            count: 23,
            attempts: [
                {
                    ip: "192.168.1.45",
                    user: "unknown",
                    targetResource: "/api/admin/users",
                    timestamp: "2025-11-30 14:23:45",
                    blocked: true
                }
            ]
        }
    }
}
```

#### 5.3 Gestion des IPs

**Whitelist / Blacklist :**
```javascript
{
    // Nouvelle collection : ipRules
    whitelist: [
        {
            ip: "192.168.1.0/24",
            label: "Réseau UCAD",
            addedBy: "superadmin",
            addedAt: "2025-11-01"
        }
    ],

    blacklist: [
        {
            ip: "45.67.89.123",
            reason: "Tentatives brute force",
            blockedBy: "system",
            blockedAt: "2025-11-30 14:23:45",
            expiresAt: "2025-12-01 14:23:45"
        }
    ],

    rateLimitExceptions: [
        {
            ip: "192.168.1.100",
            user: "admin1",
            customLimit: 1000, // Au lieu de 500
            reason: "Opérations maintenance"
        }
    ]
}
```

---

### MODULE 6 : Performance et Monitoring 📊

**Objectif :** Surveiller et optimiser les performances

#### 6.1 Métriques de Performance

**Temps de réponse :**
```javascript
{
    endpoints: [
        {
            route: "/api/documents",
            avgResponseTime: "45ms",
            p50: "32ms",
            p95: "87ms",
            p99: "156ms",
            requestsToday: 12345,
            errorsToday: 5
        },
        {
            route: "/api/upload",
            avgResponseTime: "2.3s",
            p50: "1.8s",
            p95: "4.2s",
            p99: "8.9s",
            requestsToday: 456,
            errorsToday: 2
        }
        // ...
    ],

    slowestEndpoints: [
        {route: "/api/search", avgTime: "234ms"},
        {route: "/api/upload", avgTime: "2.3s"}
    ]
}
```

#### 6.2 MongoDB Monitoring

**Performances MongoDB :**
```javascript
{
    connections: {
        current: 45,
        available: 1455,
        total: 1500
    },

    operations: {
        queries: 1234,      // Queries/sec
        inserts: 23,        // Inserts/sec
        updates: 45,        // Updates/sec
        deletes: 2,         // Deletes/sec
        getmores: 89        // Cursors/sec
    },

    indexes: {
        total: 15,
        hits: 12345,        // Index hits
        misses: 23,         // Index misses
        hitRatio: 99.8      // %
    },

    slowQueries: [
        {
            query: "find({titre: /rapport/i})",
            executionTime: "234ms",
            timestamp: "2025-11-30 14:23:45",
            collection: "documents"
        }
    ],

    storage: {
        dataSize: "2.3 GB",
        indexSize: "234 MB",
        totalSize: "2.5 GB",
        avgObjSize: "2.1 KB"
    }
}
```

#### 6.3 Ressources Système

**Monitoring temps réel :**
```javascript
{
    cpu: {
        usage: 45,          // %
        processes: [
            {name: "node", cpu: 35, memory: "2.3 GB"},
            {name: "mongod", cpu: 10, memory: "1.2 GB"}
        ]
    },

    memory: {
        total: "16 GB",
        used: "8.2 GB",
        free: "7.8 GB",
        cached: "3.2 GB",
        available: "11 GB",
        swapUsed: "0 GB"
    },

    disk: {
        partitions: [
            {
                mount: "/",
                total: "100 GB",
                used: "62 GB",
                free: "38 GB",
                percentage: 62
            }
        ],
        io: {
            read: "23 MB/s",
            write: "12 MB/s"
        }
    },

    network: {
        rx: "45 MB/s",      // Réception
        tx: "23 MB/s",      // Transmission
        connections: 234
    }
}
```

---

### MODULE 7 : Rapports et Exports 📄

**Objectif :** Générer des rapports pour l'analyse

#### 7.1 Rapports Prédéfinis

**Types de rapports :**
```javascript
{
    reports: [
        {
            name: "Rapport d'Activité Mensuel",
            description: "Synthèse complète du mois",
            format: ["PDF", "Excel", "JSON"],
            includes: [
                "Nombre d'utilisateurs actifs",
                "Documents créés/modifiés/supprimés",
                "Activité par département",
                "Top 10 utilisateurs les plus actifs",
                "Top 10 documents les plus téléchargés",
                "Événements de sécurité",
                "Utilisation ressources"
            ]
        },
        {
            name: "Rapport de Sécurité Hebdomadaire",
            description: "Événements de sécurité de la semaine",
            format: ["PDF", "Email"],
            includes: [
                "Tentatives de connexion échouées",
                "Alertes de sécurité",
                "IPs bloquées",
                "Activités suspectes",
                "Recommandations"
            ]
        },
        {
            name: "Rapport d'Utilisation par Département",
            description: "Activité détaillée par département",
            format: ["Excel", "CSV"],
            includes: [
                "Nombre d'utilisateurs par département",
                "Documents par département",
                "Espace utilisé par département",
                "Activité par département",
                "Comparaison inter-départements"
            ]
        },
        {
            name: "Rapport de Performance",
            description: "Performances système et API",
            format: ["PDF", "JSON"],
            includes: [
                "Temps de réponse moyens",
                "Taux d'erreurs",
                "Utilisation ressources",
                "Métriques MongoDB",
                "Recommandations d'optimisation"
            ]
        }
    ]
}
```

#### 7.2 Exports de Données

**Exports disponibles :**
```javascript
{
    exports: [
        "Tous les utilisateurs (CSV/Excel)",
        "Tous les documents (métadonnées CSV)",
        "Logs d'audit (JSON/CSV)",
        "Statistiques d'usage (JSON/Excel)",
        "Configuration système (JSON)",
        "Liste des erreurs (CSV)",
        "Rapport RGPD par utilisateur"
    ],

    scheduled: [
        {
            report: "Rapport d'Activité Mensuel",
            frequency: "monthly",
            recipients: ["admin@ucad.sn"],
            nextRun: "2025-12-01 00:00:00"
        }
    ]
}
```

---

### MODULE 8 : Maintenance et Optimisation 🛠️

**Objectif :** Outils de maintenance système

#### 8.1 Nettoyage Base de Données

**Actions disponibles :**
```javascript
{
    cleanup: [
        {
            action: "Supprimer sessions expirées",
            description: "Supprime les sessions MongoDB > 7 jours",
            impact: "Libère espace DB",
            lastRun: "2025-11-29 02:00:00",
            nextRun: "2025-12-06 02:00:00"
        },
        {
            action: "Supprimer logs anciens",
            description: "Supprime les logs > 30 jours",
            impact: "Libère espace disque",
            lastRun: "2025-11-01 03:00:00",
            nextRun: "2025-12-01 03:00:00"
        },
        {
            action: "Optimiser index MongoDB",
            description: "Reconstruire les index pour performance",
            impact: "Améliore performances",
            lastRun: "2025-11-15 01:00:00",
            estimatedDuration: "5-10 minutes"
        },
        {
            action: "Nettoyer documents orphelins",
            description: "Documents dont le créateur n'existe plus",
            impact: "Cohérence des données",
            count: 12,
            totalSize: "45 MB"
        }
    ]
}
```

#### 8.2 Sauvegardes

**Gestion des sauvegardes :**
```javascript
{
    backups: {
        schedule: {
            frequency: "daily",
            time: "02:00:00",
            retention: 7
        },

        list: [
            {
                date: "2025-11-30 02:00:00",
                size: "2.3 GB",
                duration: "5m 23s",
                status: "success",
                location: "/backups/backup_20251130_020000.tar.gz"
            },
            {
                date: "2025-11-29 02:00:00",
                size: "2.2 GB",
                duration: "5m 12s",
                status: "success",
                location: "/backups/backup_20251129_020000.tar.gz"
            }
        ],

        actions: [
            "Backup manuel",
            "Restaurer backup",
            "Télécharger backup",
            "Vérifier intégrité",
            "Modifier planification"
        ]
    }
}
```

#### 8.3 Configuration Système

**Paramètres modifiables :**
```javascript
{
    config: {
        rateLimiting: {
            general: 500,           // Requêtes/15min
            upload: 50,             // Uploads/heure
            login: 5                // Tentatives/15min
        },

        sessions: {
            ttl: 86400,            // 24 heures
            touchAfter: 300        // 5 minutes
        },

        uploads: {
            maxSize: 104857600,    // 100 MB
            allowedTypes: [".pdf", ".docx", ".xlsx", ...]
        },

        maintenance: {
            mode: false,
            message: "Maintenance en cours..."
        },

        notifications: {
            emailAlerts: true,
            alertsRecipients: ["admin@ucad.sn"],
            alertThresholds: {
                cpu: 80,
                memory: 85,
                disk: 90,
                errors: 50
            }
        }
    }
}
```

---

### MODULE 9 : Notifications et Alertes 🔔

**Objectif :** Système d'alertes proactif

#### 9.1 Alertes Automatiques

**Déclencheurs d'alertes :**
```javascript
{
    triggers: [
        {
            type: "RESOURCE_THRESHOLD",
            condition: "CPU > 80%",
            action: "Email + Dashboard",
            severity: "warning"
        },
        {
            type: "RESOURCE_THRESHOLD",
            condition: "Memory > 85%",
            action: "Email + Dashboard",
            severity: "warning"
        },
        {
            type: "RESOURCE_THRESHOLD",
            condition: "Disk > 90%",
            action: "Email + SMS + Dashboard",
            severity: "critical"
        },
        {
            type: "SECURITY_EVENT",
            condition: "Failed logins > 10 in 1h",
            action: "Email + Block IP",
            severity: "critical"
        },
        {
            type: "SECURITY_EVENT",
            condition: "Rate limit exceeded > 50/hour",
            action: "Email",
            severity: "warning"
        },
        {
            type: "PERFORMANCE",
            condition: "Response time > 1s",
            action: "Dashboard",
            severity: "warning"
        },
        {
            type: "ERROR_RATE",
            condition: "Errors > 50/hour",
            action: "Email + Dashboard",
            severity: "critical"
        },
        {
            type: "MONGODB",
            condition: "Connections > 90%",
            action: "Email",
            severity: "warning"
        }
    ]
}
```

#### 9.2 Notifications

**Centre de notifications :**
```javascript
{
    notifications: [
        {
            id: "notif_123",
            type: "alert",
            severity: "warning",
            title: "Utilisation CPU élevée",
            message: "Le CPU est à 85% depuis 10 minutes",
            timestamp: "2025-11-30 14:23:45",
            read: false,
            actions: [
                "Voir détails",
                "Ignorer",
                "Marquer comme résolu"
            ]
        },
        {
            id: "notif_124",
            type: "info",
            severity: "info",
            title: "Sauvegarde terminée",
            message: "La sauvegarde quotidienne s'est terminée avec succès",
            timestamp: "2025-11-30 02:05:12",
            read: true
        }
    ],

    settings: {
        email: true,
        emailAddress: "admin@ucad.sn",
        dashboard: true,
        sms: false,
        smsNumber: "+221 XX XXX XX XX"
    }
}
```

---

### MODULE 10 : Support et Diagnostics 🔧

**Objectif :** Outils d'aide au dépannage

#### 10.1 Health Check

**Vérification santé système :**
```javascript
{
    healthCheck: {
        overall: "healthy",         // healthy, degraded, critical

        components: [
            {
                name: "Application Node.js",
                status: "healthy",
                uptime: "15 jours 3h 45m",
                pm2Instances: 2,
                memory: "2.3 GB"
            },
            {
                name: "MongoDB",
                status: "healthy",
                connections: "45/1500",
                responseTime: "12ms"
            },
            {
                name: "Nginx",
                status: "healthy",
                activeConnections: 234,
                requestRate: "150/min"
            },
            {
                name: "Redis Cache",
                status: "not_configured",
                message: "Cache non activé"
            },
            {
                name: "Disk Space",
                status: "warning",
                usage: "62%",
                message: "Espace disque à surveiller"
            }
        ],

        lastCheck: "2025-11-30 14:23:45",
        nextCheck: "2025-11-30 14:28:45"
    }
}
```

#### 10.2 Diagnostics

**Tests de diagnostic :**
```javascript
{
    diagnostics: [
        {
            name: "Test connexion MongoDB",
            description: "Vérifie la connectivité à MongoDB",
            run: () => testMongoConnection(),
            lastResult: "success",
            lastRun: "2025-11-30 14:23:45"
        },
        {
            name: "Test lecture/écriture DB",
            description: "Teste les opérations sur la base",
            run: () => testDbOperations(),
            lastResult: "success"
        },
        {
            name: "Test upload fichier",
            description: "Teste l'upload d'un fichier test",
            run: () => testFileUpload(),
            lastResult: "success"
        },
        {
            name: "Test email",
            description: "Envoie un email de test",
            run: () => testEmailService(),
            lastResult: "success"
        },
        {
            name: "Vérifier logs",
            description: "Analyse les derniers logs pour erreurs",
            run: () => analyzeLogs(),
            lastResult: "warning: 5 erreurs trouvées"
        }
    ]
}
```

---

## 🏗️ Architecture Technique

### Structure des Fichiers (Sans casser l'existant)

```
backend/
├── server.js                    # ✅ Existant - Légères modifications
├── security-config.js           # ✅ Existant - Aucune modification
├── package.json                 # ✅ Existant - Ajout dépendances
├──
├── public/
│   ├── super-admin.html         # 🆕 NOUVEAU - Page Super Admin
│   ├── css/
│   │   └── super-admin.css      # 🆕 NOUVEAU - Styles
│   └── js/
│       ├── super-admin.js       # 🆕 NOUVEAU - Logique frontend
│       └── super-admin-charts.js # 🆕 NOUVEAU - Graphiques
│
├── modules/                     # 🆕 NOUVEAU DOSSIER
│   ├── superadmin/
│   │   ├── dashboard.js         # Module 1: Dashboard
│   │   ├── users.js             # Module 2: Gestion utilisateurs
│   │   ├── documents.js         # Module 3: Gestion documents
│   │   ├── audit.js             # Module 4: Logs et audit
│   │   ├── security.js          # Module 5: Sécurité
│   │   ├── performance.js       # Module 6: Performance
│   │   ├── reports.js           # Module 7: Rapports
│   │   ├── maintenance.js       # Module 8: Maintenance
│   │   ├── notifications.js     # Module 9: Notifications
│   │   └── diagnostics.js       # Module 10: Diagnostics
│   │
│   └── middleware/
│       └── requireSuperAdmin.js # Middleware de vérification niveau 0
│
├── routes/                      # 🆕 NOUVEAU DOSSIER
│   └── superadmin.js            # Routes API Super Admin
│
└── scripts/
    ├── init-superadmin.js       # 🆕 Script création premier Super Admin
    └── ...                      # Existants
```

### Nouvelles Collections MongoDB

```javascript
// Collections à créer
{
    // Audit complet
    auditLogsCollection: {
        _id: ObjectId,
        timestamp: ISODate,
        user: String,
        userLevel: Number,
        action: String,
        target: Object,
        details: Object,
        ip: String,
        userAgent: String,
        result: String
    },

    // Règles IP
    ipRulesCollection: {
        _id: ObjectId,
        ip: String,
        type: String,           // "whitelist", "blacklist"
        reason: String,
        addedBy: String,
        addedAt: ISODate,
        expiresAt: ISODate
    },

    // Notifications
    notificationsCollection: {
        _id: ObjectId,
        type: String,
        severity: String,
        title: String,
        message: String,
        timestamp: ISODate,
        read: Boolean,
        readAt: ISODate,
        targetUsers: [String]   // Super admins
    },

    // Métriques système (historique)
    systemMetricsCollection: {
        _id: ObjectId,
        timestamp: ISODate,
        cpu: Number,
        memory: Object,
        disk: Object,
        mongodb: Object,
        requests: Number,
        errors: Number
    },

    // Configuration système
    systemConfigCollection: {
        _id: ObjectId,
        key: String,
        value: Mixed,
        modifiedBy: String,
        modifiedAt: ISODate
    }
}
```

---

## 🔐 Sécurité

### Contrôle d'Accès Niveau 0

```javascript
// Middleware de vérification
async function requireSuperAdmin(req, res, next) {
    if (!req.session.userId) {
        return res.status(401).json({
            success: false,
            message: "Non authentifié"
        });
    }

    const user = await usersCollection.findOne({
        username: req.session.userId
    });

    if (!user) {
        return res.status(401).json({
            success: false,
            message: "Utilisateur non trouvé"
        });
    }

    const role = await rolesCollection.findOne({
        _id: user.idRole
    });

    if (!role || role.niveau !== 0) {
        // Log tentative accès non autorisé
        await auditLogsCollection.insertOne({
            timestamp: new Date(),
            user: req.session.userId,
            userLevel: role?.niveau || -1,
            action: "UNAUTHORIZED_SUPERADMIN_ACCESS_ATTEMPT",
            target: {
                route: req.path
            },
            ip: req.ip,
            userAgent: req.headers['user-agent'],
            result: "blocked"
        });

        return res.status(403).json({
            success: false,
            message: "Accès réservé aux Super Administrateurs"
        });
    }

    next();
}
```

### Audit de Toutes les Actions

```javascript
// Fonction helper pour logger les actions
async function logSuperAdminAction(action, userId, details) {
    await auditLogsCollection.insertOne({
        timestamp: new Date(),
        user: userId,
        userLevel: 0,
        action: action,
        target: details.target || {},
        details: details,
        ip: details.ip,
        userAgent: details.userAgent,
        result: details.result || "success"
    });
}
```

---

## 📅 Plan d'Implémentation

### Phase 1 : Fondations (Semaine 1)

**Tâches :**
1. ✅ Créer le rôle niveau 0 dans la base
2. ✅ Créer les nouvelles collections MongoDB
3. ✅ Créer le middleware `requireSuperAdmin`
4. ✅ Créer la structure de fichiers (modules/)
5. ✅ Créer la page `super-admin.html` (structure de base)
6. ✅ Créer le script `init-superadmin.js`

**Livrables :**
- Niveau 0 fonctionnel
- Première connexion Super Admin possible
- Dashboard vide mais accessible

---

### Phase 2 : Module Dashboard (Semaine 2)

**Tâches :**
1. ✅ Implémenter Module 1 (Dashboard vue d'ensemble)
2. ✅ API pour statistiques globales
3. ✅ API pour graphiques de tendances
4. ✅ Interface dashboard avec cartes KPIs
5. ✅ Graphiques temps réel (Chart.js)

**Livrables :**
- Dashboard avec statistiques en temps réel
- 5 cartes KPIs fonctionnelles
- 4 graphiques de tendances

---

### Phase 3 : Modules Gestion (Semaine 3-4)

**Tâches :**
1. ✅ Implémenter Module 2 (Gestion utilisateurs)
2. ✅ Implémenter Module 3 (Gestion documents)
3. ✅ API pour lister/filtrer/chercher
4. ✅ Modals de détails
5. ✅ Actions d'administration

**Livrables :**
- Gestion complète utilisateurs
- Gestion complète documents
- Recherche avancée
- Actions admin fonctionnelles

---

### Phase 4 : Logs et Sécurité (Semaine 5-6)

**Tâches :**
1. ✅ Implémenter Module 4 (Logs et audit)
2. ✅ Implémenter Module 5 (Sécurité)
3. ✅ Système d'audit complet
4. ✅ Détection d'anomalies
5. ✅ Gestion IP whitelist/blacklist

**Livrables :**
- Audit trail complet
- Alertes de sécurité
- Tableau de bord sécurité
- Gestion des IPs

---

### Phase 5 : Performance et Rapports (Semaine 7-8)

**Tâches :**
1. ✅ Implémenter Module 6 (Performance)
2. ✅ Implémenter Module 7 (Rapports)
3. ✅ Monitoring temps réel
4. ✅ Génération de rapports PDF/Excel
5. ✅ Exports de données

**Livrables :**
- Monitoring performance
- Rapports automatiques
- Exports multiformats

---

### Phase 6 : Maintenance et Finitions (Semaine 9-10)

**Tâches :**
1. ✅ Implémenter Module 8 (Maintenance)
2. ✅ Implémenter Module 9 (Notifications)
3. ✅ Implémenter Module 10 (Diagnostics)
4. ✅ Tests complets
5. ✅ Documentation utilisateur

**Livrables :**
- Système complet et testé
- Notifications fonctionnelles
- Documentation complète

---

## ✅ Validation et Tests

### Tests Critiques

1. **Test Sécurité :**
   - Vérifier qu'un niveau 1/2/3 ne peut pas accéder au dashboard Super Admin
   - Vérifier l'audit trail de toutes les actions

2. **Test Performance :**
   - Dashboard doit charger en < 2 secondes
   - Graphiques doivent se rafraîchir en < 500ms

3. **Test Compatibilité :**
   - Vérifier qu'aucune fonctionnalité existante n'est cassée
   - Tester avec niveaux 1, 2, 3 existants

---

## 📊 Estimation Ressources

**Temps de développement :** 10 semaines

**Technologies nécessaires :**
- Frontend : Chart.js, DataTables
- Backend : Modules Node.js existants
- Pas de nouvelles dépendances majeures

**Impact sur le système :**
- ✅ Pas de modification du code existant (sauf ajouts)
- ✅ Nouvelles routes isolées (`/api/superadmin/*`)
- ✅ Collections MongoDB séparées
- ✅ Impact minimal sur performance

---

**Document créé le : 30 Novembre 2025**
**Prêt pour validation et implémentation progressive**
