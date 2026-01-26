# Problèmes Version Beta - Liste Complète

**Date** : 28 décembre 2025
**Statut** : En cours de correction

---

## ✅ PROBLÈMES DÉJÀ CORRIGÉS

### 1. Recherche globale ne trouve pas les documents par ID
- **Problème** : Recherche de `DOC-20251227-123418854-9031` ne donne aucun résultat
- **Cause** : La recherche cherchait uniquement dans le champ `titre`
- **Solution appliquée** : La recherche cherche maintenant dans `titre`, `_id`, `nomFichier` ET `description`
- **Fichier modifié** : `server.js` ligne 5774-5792
- **Statut** : ✅ CORRIGÉ

### 2. Boutons d'accès rapide retournent 0 résultats
- **Boutons concernés** : "Mes documents", "Récents", "Favoris", "Nouveaux"
- **Cause** : Les routes filtraient trop strictement par `idDepartement`, excluant les documents legacy sans ce champ
- **Solution appliquée** : Les routes incluent maintenant les documents sans `idDepartement` ou avec `idDepartement = null`
- **Fichiers modifiés** :
  - `server.js` ligne 5883-5895 (route `/api/documents/recent`)
  - `server.js` ligne 5997-6003 (route `/api/documents/new`)
- **Statut** : ✅ CORRIGÉ

---

## ❌ PROBLÈMES À CORRIGER

### 3. IDs des documents différents entre les 2 versions
- **Problème** :
  - Version Beta affiche : `6950445ba5127a7f13db1ea9` (ObjectId MongoDB)
  - Version Classique affiche : `DOC-20251227-204527831-1612` (ID custom)
- **Impact** : Impossible de chercher un document par son ID classique dans la version beta
- **Solution proposée** :
  - Ajouter un champ `documentId` dans MongoDB pour stocker l'ID custom
  - Afficher cet ID dans la version beta au lieu du `_id` MongoDB
  - Modifier la recherche pour inclure ce champ
- **Priorité** : 🔴 CRITIQUE

### 4. Catégories affichées différemment
- **Problème** : Les catégories ne s'affichent pas de la même manière entre les 2 versions
- **Détails manquants** : L'utilisateur n'a pas précisé exactement quelle différence
- **À investiguer** :
  - Format d'affichage ?
  - Contenu différent ?
  - Ordre différent ?
- **Priorité** : 🟡 MOYENNE

### 5. Date d'ajout = "N/A" dans la version beta
- **Problème** :
  - Le champ "Date exacte" affiche "N/A" au lieu de la vraie date
  - Le champ "Date d'ajout" n'est pas renseigné
- **Cause probable** :
  - Le champ `dateAjout` n'existe pas dans certains documents
  - OU le format de date n'est pas compatible
- **Impact** : Impossible de voir quand un document a été ajouté
- **Priorité** : 🔴 CRITIQUE

### 6. Tailles de fichiers différentes pour le même document
- **Problème** :
  - Version Classique : `139.57 KB`
  - Version Beta : `86.9 KB`
  - Pour le même document ID : `DOC-20251227-204527831-1612`
- **Cause possible** :
  - Calcul de taille différent (base64 vs fichier réel ?)
  - Compression différente ?
  - Deux documents différents en réalité ?
- **Impact** : Incohérence des données, risque de corruption
- **Priorité** : 🔴 CRITIQUE

### 7. Compteur de documents par catégorie affiche 0
- **Problème** : Le nombre de documents dans chaque catégorie affiche "0 docs" alors qu'il y a des documents
- **Localisation** : Dans l'accordéon des services, badge de comptage
- **Cause probable** :
  - Le champ `documentsCount` n'est pas calculé
  - OU la requête ne compte pas les documents correctement
- **Impact** : L'utilisateur ne sait pas combien de documents il y a dans chaque catégorie
- **Priorité** : 🟡 MOYENNE

### 8. Message pas clair quand aucune catégorie disponible
- **Problème** : Quand un utilisateur niveau 1 ouvre la modal "Ajouter un document" et qu'il n'y a aucune catégorie, le message n'est pas assez explicite
- **Message actuel** : "-- Aucune catégorie disponible. Créez-en une d'abord. --" (dans le select)
- **Amélioration souhaitée** :
  - Message plus visible (pas juste dans le select)
  - Bouton direct pour créer une catégorie
  - Instructions claires
- **Priorité** : 🟢 BASSE (UX)

### 9. Catégories par défaut "facture" réapparaissent
- **Problème** : L'utilisateur crée une catégorie "eolienservice1", puis retrouve une catégorie "facture" à sa place
- **Note** : Le code serveur pour créer les catégories par défaut est DÉJÀ désactivé (lignes 1698-1724 en commentaire)
- **Cause probable** :
  - Anciennes catégories dans la base de données
  - Problème de cache navigateur
  - Bug dans le chargement des catégories
- **À investiguer** : Vérifier la base de données et le comportement de chargement
- **Priorité** : 🟡 MOYENNE

### 10. Partage de documents : utilisateurs ne sont pas chargés
- **Problème** : Lors du partage d'un document, la liste des utilisateurs ne se charge pas
- **Localisation** : Modal de partage, fonction `shareDocument()`
- **Impact** : Impossible de partager un document
- **Priorité** : 🟡 MOYENNE

### 11. Photo de profil : pas d'espace dans la version classique
- **Problème** : Dans la version classique, il n'y a pas d'endroit pour afficher la photo de profil après mise à jour
- **Note** : La version beta a déjà la photo de profil dans le topbar
- **Solution proposée** : Ajouter un avatar dans le header de la version classique
- **Priorité** : 🟢 BASSE (UX)

---

## 📊 STATISTIQUES

- **Total de problèmes identifiés** : 11
- **Problèmes corrigés** : 2 ✅
- **Problèmes à corriger** : 9 ❌
  - Priorité CRITIQUE : 3 🔴
  - Priorité MOYENNE : 4 🟡
  - Priorité BASSE : 2 🟢

---

## 🚀 PLAN D'ACTION

### Ordre de correction proposé :

1. **IDs documents différents** (🔴 CRITIQUE)
2. **Date d'ajout = N/A** (🔴 CRITIQUE)
3. **Tailles de fichiers différentes** (🔴 CRITIQUE)
4. **Compteur documents = 0** (🟡 MOYENNE)
5. **Catégories affichées différemment** (🟡 MOYENNE)
6. **Catégories "facture" réapparaissent** (🟡 MOYENNE)
7. **Partage : utilisateurs ne chargent pas** (🟡 MOYENNE)
8. **Message catégories vides** (🟢 BASSE)
9. **Photo profil version classique** (🟢 BASSE)

---

## ⚠️ QUESTIONS POUR L'UTILISATEUR

Avant de corriger, j'ai besoin de clarifications :

### Question 1 : Catégories affichées différemment
**Quelle est exactement la différence ?**
- [ ] Format d'affichage (majuscules/minuscules, accents, etc.)
- [ ] Contenu différent (noms de catégories différents)
- [ ] Ordre différent
- [ ] Autre : _______________

### Question 2 : Tailles de fichiers
**S'agit-il du MÊME document ou de deux documents différents ?**
- [ ] C'est le même document uploadé dans les 2 versions
- [ ] Ce sont deux documents différents avec des noms similaires
- [ ] Je ne suis pas sûr

### Question 3 : Y a-t-il D'AUTRES problèmes ?
**Liste complète ou il en reste ?**
- [ ] C'est la liste COMPLÈTE de tous les problèmes
- [ ] Il y en a d'autres (à lister ci-dessous)

**Autres problèmes** :
- _______________________________________________
- _______________________________________________
- _______________________________________________

---

## 📝 NOTES TECHNIQUES

### Problème des IDs
Les deux versions utilisent des systèmes d'ID différents :
- **Version Beta** : Utilise directement le `_id` MongoDB (ObjectId)
- **Version Classique** : Génère un ID custom au format `DOC-YYYYMMDD-HHMMSSMMM-XXXX`

**Solution** : Ajouter un champ `documentId` dans tous les documents pour stocker l'ID custom, et l'afficher dans la version beta.

### Problème des dates
À investiguer :
- Format de `dateAjout` dans MongoDB
- Compatibilité entre les deux versions
- Conversion de dates JavaScript vs MongoDB

### Problème des tailles
À investiguer :
- Comment la version classique calcule la taille (base64 ?)
- Comment la version beta calcule la taille (fichier réel ?)
- Vérifier l'intégrité des données

---

**Dernière mise à jour** : 28 décembre 2025, 23h15
