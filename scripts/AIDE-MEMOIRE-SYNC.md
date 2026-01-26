# 🚀 AIDE-MÉMOIRE RAPIDE - Synchronisation DB

## ▶️ Lancer le script

```bash
cd "E:\site et apps\archivage cerer\backend"
node scripts/sync-databases.js
```

---

## 📊 Options rapides

| Tâche | Option | Risque |
|-------|--------|--------|
| Voir les différences | **1** | ✅ Aucun |
| Pousser vers production | **2** ou **4** | ⚠️ Moyen-Élevé |
| Récupérer de production | **3** ou **5** | ⚠️ Moyen |
| Backup avant modif | **8** | ✅ Aucun |
| Tester connexion | **9** | ✅ Aucun |

---

## 🔄 REPLACE vs MERGE

### REPLACE (Options 2 et 3)
```
Source → Destination
⚠️ ÉCRASE TOUT

Avant:  Destination = [A, B, C]
Après:  Destination = [X, Y, Z]  (copie exacte de Source)
```

**Quand ?** Déploiement initial, copie exacte souhaitée

### MERGE (Options 4 et 5)
```
Source + Destination → Destination
✅ COMBINE

Avant:  Destination = [A, B, C]
Après:  Destination = [A, B, C, X, Y, Z]  (fusion)
```

**Quand ?** Conserver les deux, ajouter des données

---

## 🎯 Scénarios fréquents

### 1️⃣ Premier déploiement
```
1 → 8 → 2 → 1
(Comparer → Backup → Local→Prod REPLACE → Vérifier)
```

### 2️⃣ Ajouter des utilisateurs en prod
```
1 → 8 → 4 → 1
(Comparer → Backup → Local→Prod MERGE → Vérifier)
```

### 3️⃣ Nouvelle machine (récupérer prod)
```
1 → 6 → 3
(Comparer → Backup Local → Prod→Local REPLACE)
```

### 4️⃣ Avant grosse modification
```
8 → (faire vos modifs) → 8
(Backup avant → modifier → Backup après)
```

---

## ⚠️ RÈGLE D'OR

```
TOUJOURS dans cet ordre:
1. COMPARER (option 1)
2. BACKUP (option 8)
3. SYNCHRONISER (options 2-5)
4. VÉRIFIER (option 1)
```

---

## 🆘 Problèmes fréquents

| Erreur | Solution |
|--------|----------|
| `ECONNREFUSED` | Démarrer MongoDB: `mongod` |
| `Authentication failed` | Vérifier l'URI Atlas dans le script |
| `IP not whitelisted` | Atlas → Network Access → Add IP |
| Données manquantes | Restaurer depuis `scripts/backups/` |

---

## 📂 Où sont les backups ?

```
scripts/backups/
├── local_users_2025-11-27T14-30-00.json
├── local_documents_2025-11-27T14-30-00.json
├── production_users_2025-11-27T14-30-00.json
└── ...
```

**Restaurer un backup:**
```bash
mongoimport --db cerer_archivage --collection users --file scripts/backups/local_users_2025-11-27T14-30-00.json --jsonArray
```

---

## 💡 Astuces

✅ **Option 1** (Comparer) = GRATUIT, sans risque, à utiliser souvent
✅ **Option 8** (Backup) = Assurance gratuite avant toute opération
⚠️ **Options 2-5** = Demandent confirmation, créent backup automatique
🔒 **REPLACE** = Tapez "OUI" en majuscules pour confirmer
🔀 **MERGE** = Tapez "O" pour confirmer

---

**📖 Guide complet:** `GUIDE-SYNCHRONISATION.md`
