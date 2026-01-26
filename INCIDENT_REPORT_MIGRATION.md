# 📋 RAPPORT D'INCIDENT - MIGRATION MONGODB

## Date: 2026-01-09

## 🚨 PROBLÈME RENCONTRÉ
Après migration du cluster MongoDB de l'ancien vers le nouveau cluster Paris, l'utilisateur **test34** n'était pas trouvé en production.

## 🔍 CAUSE RACINE

Le compte **test34** n'existait que dans **l'environnement LOCAL** (MongoDB localhost:27017), mais PAS dans l'**ancien cluster Atlas** (eq69ixv).

Le script `migrate-to-new-cluster.js` a correctement copié toutes les données de l'ancien cluster Atlas vers le nouveau cluster Paris, MAIS:
- ✅ Il a copié les 15 utilisateurs de l'ancien cluster Atlas
- ❌ Il n'a PAS copié test34 car ce compte n'existait pas dans la source

### Chronologie:
1. Développement local utilisait MongoDB local (localhost) avec test34
2. Production utilisait l'ancien cluster Atlas (sans test34)
3. Migration a copié ancien cluster → nouveau cluster
4. test34 n'a pas été migré car absent de la source

## 💡 LEÇONS APPRISES

### Erreur 1: Pas de vérification pré-migration
- Aucune vérification des différences entre local et production
- Aucune liste des comptes critiques à migrer

### Erreur 2: Pas de données de test en production
- Comptes de test non documentés
- Pas de script pour créer des données de test

### Erreur 3: Pas de vérification post-migration
- Aucun script pour valider que toutes les données critiques sont présentes
- Pas de checklist de validation

## ✅ SOLUTIONS MISES EN PLACE

### 1. Script de vérification pré-migration
Créé: `scripts/pre-migration-check.js`
- Compare local vs production
- Liste les différences
- Identifie les données manquantes

### 2. Script de données de test
Créé: `scripts/create-test-data.js`
- Crée automatiquement des comptes de test
- Peut être exécuté en local ou production

### 3. Script de vérification post-migration
Créé: `scripts/post-migration-check.js`
- Valide que toutes les collections sont migrées
- Vérifie les comptes critiques
- Compare les counts local/production

### 4. Documentation des comptes
Créé: `COMPTES_TEST.md`
- Liste tous les comptes de test
- Mots de passe (chiffrés)
- Rôles et départements

## 🎯 POUR LA PROCHAINE FOIS

**AVANT toute migration:**
1. ✅ Exécuter `node scripts/pre-migration-check.js`
2. ✅ Lire le rapport des différences
3. ✅ Décider quelles données locales doivent être migrées
4. ✅ Créer les données de test manquantes si nécessaire

**APRÈS toute migration:**
1. ✅ Exécuter `node scripts/post-migration-check.js`
2. ✅ Vérifier que tous les comptes critiques existent
3. ✅ Tester avec un compte de chaque niveau (0, 1, 2, 3)

## 📊 IMPACT

- ⏱️ Temps perdu: ~10 minutes (confusion sur le compte manquant)
- 💥 Gravité: FAIBLE (résolu en utilisant un autre compte)
- 🎯 Prévention: Scripts de validation créés
