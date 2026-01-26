# État des Bases de Données - [REMPLIR LA DATE]

> **INSTRUCTIONS** : Remplissez ce fichier en suivant les instructions de la Phase 1 du guide.
> Une fois rempli, renommez-le en `db-status.md` et partagez-le avec Claude.

---

## Base de données LOCALE

### Localisation
- Chemin : `___________________________` (ex: ./users.db ou ./data/users.db)

### Tables existantes

**Pour obtenir la liste, exécutez** :
```bash
sqlite3 users.db "SELECT name FROM sqlite_master WHERE type='table';"
```

Listez toutes les tables :
- [ ] users
- [ ] sessions
- [ ] documents
- [ ] audit_logs
- [ ] security_logs
- [ ] profile_changes_logs
- [ ] _______________________ (ajoutez d'autres)

### Structure détaillée des tables principales

**Pour obtenir le schéma, exécutez** :
```bash
sqlite3 users.db ".schema users"
sqlite3 users.db ".schema sessions"
# etc pour chaque table
```

**Table `users`** :
```sql
[COLLEZ ICI LE RÉSULTAT DE .schema users]
```

**Table `sessions`** :
```sql
[COLLEZ ICI LE RÉSULTAT DE .schema sessions]
```

**Table `documents`** :
```sql
[COLLEZ ICI LE RÉSULTAT DE .schema documents]
```

**Table `audit_logs`** :
```sql
[COLLEZ ICI LE RÉSULTAT DE .schema audit_logs]
```

**Autres tables** :
```sql
[COLLEZ ICI les autres schémas si nécessaire]
```

### Données statistiques

**Pour obtenir ces infos, exécutez** :
```bash
sqlite3 users.db "SELECT COUNT(*) FROM users;"
sqlite3 users.db "SELECT COUNT(*) FROM documents;"
# etc
```

- Nombre total d'utilisateurs : `_______`
- Nombre de super-admins : `_______`
- Nombre de niveau0 : `_______`
- Nombre de niveau1 : `_______`
- Nombre de documents : `_______`
- Nombre de logs d'audit : `_______`

---

## Base de données PRODUCTION

### Localisation
- Chemin : `___________________________` (ex: /var/www/app/users.db)
- Serveur IP : `___________________________`

### Comment obtenir les infos de production

**Connectez-vous en SSH** :
```bash
ssh votre-user@votre-serveur-ip
cd /chemin/vers/app
```

**Puis exécutez les mêmes commandes** :
```bash
sqlite3 users.db "SELECT name FROM sqlite_master WHERE type='table';"
sqlite3 users.db ".schema users"
# etc
```

### Tables existantes

- [ ] users
- [ ] sessions
- [ ] documents
- [ ] audit_logs
- [ ] security_logs
- [ ] profile_changes_logs
- [ ] _______________________ (ajoutez d'autres)

### Structure détaillée des tables principales

**Table `users`** :
```sql
[COLLEZ ICI LE RÉSULTAT DE .schema users EN PRODUCTION]
```

**Table `sessions`** :
```sql
[COLLEZ ICI LE RÉSULTAT DE .schema sessions EN PRODUCTION]
```

**Table `documents`** :
```sql
[COLLEZ ICI LE RÉSULTAT DE .schema documents EN PRODUCTION]
```

**Autres tables** :
```sql
[COLLEZ ICI les autres schémas si nécessaire]
```

### Données statistiques

- Nombre total d'utilisateurs : `_______`
- Nombre de super-admins : `_______`
- Nombre de niveau0 : `_______`
- Nombre de niveau1 : `_______`
- Nombre de documents : `_______`
- Nombre de logs d'audit : `_______`

---

## ANALYSE DES DIFFÉRENCES

### Tables manquantes

**En PRODUCTION (pas en local)** :
- [ ] Aucune
- [ ] _______________________

**En LOCAL (pas en production)** :
- [ ] Aucune
- [ ] security_logs (EXEMPLE - à vérifier)
- [ ] profile_changes_logs (EXEMPLE - à vérifier)
- [ ] _______________________

### Colonnes manquantes ou différentes

**Table `users`** :
- [ ] Structures identiques ✅
- [ ] Différences détectées :
  - Colonne `department` présente en LOCAL mais pas en PRODUCTION
  - Colonne `avatar_url` présente en LOCAL mais pas en PRODUCTION
  - [Listez toutes les différences]

**Table `sessions`** :
- [ ] Structures identiques ✅
- [ ] Différences détectées :
  - [Listez]

**Table `documents`** :
- [ ] Structures identiques ✅
- [ ] Différences détectées :
  - [Listez]

**Autres tables** :
- [ ] [Listez toutes les différences]

### Index et contraintes

**Y a-t-il des différences dans les index ?**
```bash
# Pour vérifier
sqlite3 users.db ".schema" | grep INDEX
```

- [ ] Index identiques
- [ ] Différences : _______________________

---

## RISQUES IDENTIFIÉS

### Risques de rupture lors du déploiement

**CRITIQUE** (❌ Bloquant si pas résolu) :
- [ ] Le code LOCAL référence des tables qui n'existent pas en PRODUCTION
  - Tables concernées : _______________________
- [ ] Le code LOCAL référence des colonnes qui n'existent pas en PRODUCTION
  - Colonnes concernées : _______________________

**IMPORTANT** (⚠️ Peut causer des bugs) :
- [ ] Des données sont présentes en PRODUCTION mais pas en LOCAL
- [ ] Des contraintes différentes (UNIQUE, NOT NULL, etc.)
- [ ] [Autres risques]

**MINEUR** (✅ Peu de risque) :
- [ ] Tables de logs manquantes (peuvent être recréées)
- [ ] [Autres]

### Données à préserver ABSOLUMENT

**Ces données ne doivent JAMAIS être perdues** :
- [ ] Utilisateurs de production (combien : _______)
- [ ] Documents uploadés (combien : _______)
- [ ] [Autres données critiques]

---

## DÉCISION : STRATÉGIE DE MIGRATION

**Après avoir analysé les différences, choisissez** :

### Option A : Migration Destructive (RESET complet)
- [ ] **Je choisis cette option**

**Conditions** :
- ✅ Pas de vraies données utilisateur en production (ou données de test uniquement)
- ✅ Je peux recréer les comptes utilisateurs manuellement
- ✅ Aucun document important en production

**Ce qui va se passer** :
1. Backup de l'ancienne DB production
2. Remplacement complet par la structure locale
3. Perte de toutes les données production
4. Recréation manuelle des comptes essentiels

### Option B : Migration Incrémentale (ADD uniquement)
- [ ] **Je choisis cette option**

**Conditions** :
- ✅ J'ai de vraies données utilisateur en production
- ✅ Il y a des documents importants
- ✅ Je veux conserver l'historique

**Ce qui va se passer** :
1. Backup de la DB production
2. Ajout des tables manquantes
3. Ajout des colonnes manquantes
4. Données existantes préservées
5. Migration des données si nécessaire

---

## BACKUP PRÉ-MIGRATION

### J'ai fait un backup manuel de sécurité

- [ ] ✅ Backup fait sur le serveur
  - Localisation : `_______________________`
  - Taille : `_______ Ko/Mo`
  - Date : `_______________________`

- [ ] ✅ Backup téléchargé en local
  - Localisation locale : `_______________________`
  - Vérifié (fichier non corrompu) : Oui / Non

- [ ] ✅ Backup testé (peut être ouvert avec sqlite3) : Oui / Non

---

## PRÊT POUR LA PHASE 2

**Une fois ce fichier rempli** :

1. Renommer en `db-status.md`
2. Dire à Claude :
   ```
   "J'ai terminé l'analyse de ma base de données.
   Voici mon fichier db-status.md.
   J'ai choisi l'option [A ou B] pour la migration.
   Peux-tu créer les scripts de migration pour moi ?"
   ```

3. Claude créera tous les scripts nécessaires pour la Phase 2

---

**Date de remplissage** : ___________________________
**Rempli par** : ___________________________
**Temps passé** : _______ minutes
