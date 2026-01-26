# 📖 Guide Utilisateurs - Système d'Archivage CERER

**Version Bêta** - Documentation complète pour tous les niveaux d'utilisateurs

---

## 📑 Table des Matières

1. [Introduction](#introduction)
2. [Guide Niveau 3 - Utilisateur](#guide-niveau-3---utilisateur)
3. [Guide Niveau 2 - Chef de Service](#guide-niveau-2---chef-de-service)
4. [Guide Niveau 1 - Chef de Département](#guide-niveau-1---chef-de-département)
5. [Guide Niveau 0 - Super Administrateur](#guide-niveau-0---super-administrateur)
6. [FAQ - Questions Fréquentes](#faq---questions-fréquentes)

---

## Introduction

Le système d'archivage CERER est une plateforme de **Gestion Électronique de Documents** (GED) conçue pour organiser, stocker et gérer les documents universitaires de manière sécurisée et efficace.

### 🎯 Système de Niveaux

Le système utilise **4 niveaux hiérarchiques** :

| Niveau | Rôle | Permissions |
|--------|------|-------------|
| **Niveau 3** | 👤 Utilisateur | Gérer ses propres documents |
| **Niveau 2** | 👔 Chef de Service | Gérer son service + documents utilisateurs |
| **Niveau 1** | 🏢 Chef de Département | Gérer son département complet |
| **Niveau 0** | 👑 Super Admin | Administration complète du système |

---

## Guide Niveau 3 - Utilisateur

### 🎯 Vos Capacités

En tant qu'utilisateur Niveau 3, vous pouvez :
- ✅ Téléverser vos documents
- ✅ Consulter vos documents
- ✅ Modifier/Éditer vos documents
- ✅ Partager vos documents avec d'autres utilisateurs
- ✅ Organiser vos documents par catégories
- ✅ Mettre des documents en favori
- ✅ Rechercher dans vos documents

### 📤 Téléverser un Document

1. **Accéder au dashboard**
   - Connectez-vous avec vos identifiants
   - Vous arrivez sur votre tableau de bord personnel

2. **Ajouter un document**
   - Cliquez sur le bouton **"➕ Ajouter un document"**
   - Remplissez le formulaire :
     - **Titre** : Nom descriptif du document
     - **Catégorie** : Choisissez la catégorie appropriée (Mémoires, Rapports, etc.)
     - **Description** (optionnel) : Détails supplémentaires
     - **Fichier** : Sélectionnez votre fichier (PDF, Word, Excel, PowerPoint)
   - Cliquez sur **"📤 Téléverser"**

3. **Formats acceptés**
   - 📕 PDF (.pdf)
   - 📘 Word (.doc, .docx)
   - 📗 Excel (.xls, .xlsx)
   - 📙 PowerPoint (.ppt, .pptx)
   - **Taille maximale** : 50 MB par fichier

### 📄 Gérer vos Documents

#### Consulter un document
1. Dans la liste, cliquez sur le document
2. Le visualiseur s'ouvre automatiquement
3. Actions disponibles :
   - 👁️ **Visualiser** : Voir le contenu
   - ⬇️ **Télécharger** : Sauvegarder localement
   - ✏️ **Éditer** : Modifier le document (Word, Excel, PowerPoint)
   - 🔒 **Verrouiller** : Empêcher modifications

#### Modifier un document
1. Cliquez sur **✏️ Modifier**
2. Le document s'ouvre dans l'éditeur
3. Effectuez vos modifications
4. Cliquez sur **💾 Sauvegarder**

#### Partager un document
1. Ouvrez le document
2. Cliquez sur **🔗 Partager**
3. Sélectionnez les utilisateurs destinataires
4. Cliquez sur **"Partager"**
5. Les utilisateurs recevront un accès en lecture

#### Mettre un document en favori
1. Cliquez sur l'⭐ à côté du document
2. Retrouvez vos favoris dans **"⭐ Mes Favoris"**

### 🔍 Rechercher des Documents

Utilisez la barre de recherche en haut de la page :
- Tapez des mots-clés du titre
- Filtrez par date d'ajout
- Triez par nom, date ou taille

### 🗑️ Supprimer un Document

1. Cliquez sur **🗑️ Supprimer** sur le document
2. Le document va dans la **Corbeille**
3. Dans la corbeille, vous pouvez :
   - **🔄 Restaurer** : Récupérer le document
   - **❌ Supprimer définitivement** : Suppression permanente

**⚠️ Attention** : Les documents dans la corbeille sont automatiquement supprimés après **30 jours**.

---

## Guide Niveau 2 - Chef de Service

### 🎯 Vos Capacités

En tant que Chef de Service (Niveau 2), vous avez toutes les capacités du Niveau 3, plus :
- ✅ Créer et gérer des **catégories** dans votre service
- ✅ Voir les documents de **tous les utilisateurs de votre service**
- ✅ Créer et gérer des **utilisateurs Niveau 3**
- ✅ Organiser votre service

### 📁 Gérer les Catégories

Les catégories permettent d'organiser les documents par type (Mémoires, Rapports, Thèses, etc.).

#### Créer une catégorie
1. Accédez à votre service dans le dashboard
2. Cliquez sur **"➕ Ajouter une catégorie"**
3. Remplissez :
   - **Nom** : Ex: "Mémoires M2 2024"
   - **Icône** : Emoji optionnel (📚)
   - **Description** : Détails
4. Cliquez sur **"Créer la catégorie"**

#### Modifier/Supprimer une catégorie
1. Cliquez sur l'icône ⚙️ à côté de la catégorie
2. Choisissez **"✏️ Modifier"** ou **"🗑️ Supprimer"**
3. **⚠️ Attention** : Supprimer une catégorie ne supprime PAS les documents

### 👥 Gérer les Utilisateurs

#### Créer un utilisateur Niveau 3
1. Cliquez sur **"👥 Gestion des utilisateurs"**
2. Cliquez sur **"➕ Ajouter un utilisateur"**
3. Remplissez le formulaire :
   - **Nom complet**
   - **Email** (domaine universitaire)
   - **Nom d'utilisateur**
   - **Niveau** : 3 (Utilisateur)
   - **Service** : Votre service
4. Un mot de passe temporaire sera généré
5. **📧 Communiquez** le mot de passe à l'utilisateur

#### Désactiver/Supprimer un utilisateur
1. Dans la liste des utilisateurs
2. Cliquez sur **"⚙️ Actions"**
3. Choisissez :
   - **"🚫 Désactiver"** : Suspend l'accès temporairement
   - **"🗑️ Supprimer"** : Suppression définitive (⚠️ irréversible)

### 📊 Statistiques de votre Service

Consultez les statistiques en haut du dashboard :
- 📄 Nombre total de documents
- 👥 Nombre d'utilisateurs actifs
- 💾 Espace de stockage utilisé
- 📈 Évolution mensuelle

---

## Guide Niveau 1 - Chef de Département

### 🎯 Vos Capacités

En tant que Chef de Département (Niveau 1), vous avez toutes les capacités du Niveau 2, plus :
- ✅ Créer et gérer des **services** dans votre département
- ✅ Voir **tous les documents du département**
- ✅ Créer des utilisateurs **Niveau 2 et 3**
- ✅ Gérer **tous les services** de votre département
- ✅ Accéder aux **statistiques complètes du département**

### 🏢 Gérer les Services

Les services sont les subdivisions de votre département (ex: Biologie Moléculaire, Chimie Organique, etc.).

#### Créer un service
1. Dans votre département, cliquez sur **"➕ Ajouter un service"**
2. Remplissez :
   - **Nom** : Ex: "Biologie Moléculaire"
   - **Icône** : Emoji optionnel (🧬)
   - **Description** : Détails sur le service
3. Cliquez sur **"Créer le service"**

#### Attribuer un Chef de Service
1. Créez un utilisateur **Niveau 2**
2. Sélectionnez le service approprié
3. L'utilisateur pourra gérer ce service

### 👥 Gestion Avancée des Utilisateurs

#### Créer un Chef de Service (Niveau 2)
1. Cliquez sur **"👥 Gestion des utilisateurs"**
2. **"➕ Ajouter un utilisateur"**
3. Remplissez avec **Niveau : 2**
4. Attribuez au service concerné

#### Transférer un utilisateur entre services
1. Modifiez l'utilisateur
2. Changez le **Service**
3. Sauvegardez

### 📊 Tableaux de Bord Département

Vous avez accès à :
- 📈 **Graphiques d'activité** par service
- 👥 **Répartition des utilisateurs**
- 💾 **Utilisation du stockage par service**
- 📄 **Documents les plus consultés**
- 🕒 **Activité récente**

### 🔍 Recherche Département

La recherche globale vous permet de trouver :
- Documents dans tous les services
- Utilisateurs du département
- Catégories et services

---

## Guide Niveau 0 - Super Administrateur

### 🎯 Vos Capacités

En tant que Super Administrateur (Niveau 0), vous avez un **contrôle total** du système :
- ✅ Gérer **tous les départements**
- ✅ Créer et gérer des utilisateurs de **tous niveaux**
- ✅ Accéder aux **logs de sécurité** complets
- ✅ Gérer les **paramètres système**
- ✅ Forcer la déconnexion d'utilisateurs
- ✅ Activer le **mode maintenance**
- ✅ Consulter les **statistiques globales**

### 🏢 Gérer les Départements

#### Créer un département
1. Dashboard Super Admin → **"➕ Ajouter un département"**
2. Remplissez :
   - **Nom** : Ex: "Faculté des Sciences"
   - **Icône** : Emoji (🔬)
   - **Description**
3. Créez le département

#### Attribuer un Chef de Département
1. Créez un utilisateur **Niveau 1**
2. Attribuez-le au département
3. Il pourra gérer le département complet

### 🔒 Logs de Sécurité (Audit)

Accédez à l'onglet **"🔍 Audit"** pour consulter :

#### Types d'événements surveillés
- 🔐 **Authentification** : Connexions/déconnexions
- 📄 **Documents** : Ajouts, modifications, suppressions
- 👥 **Utilisateurs** : Créations, modifications, suppressions
- 🔑 **Permissions** : Changements de rôles
- ⚠️ **Sécurité** : Tentatives d'accès non autorisées

#### Niveaux de sévérité
- 🟢 **INFO** : Événements normaux
- 🟡 **WARNING** : Événements à surveiller
- 🔴 **CRITICAL** : Événements critiques nécessitant une action

#### Filtrer les logs
1. Par **période** : 24h, 7j, 30j, personnalisé
2. Par **type d'événement**
3. Par **utilisateur**
4. Par **sévérité**

#### Exporter les logs
- Bouton **"📥 Exporter"** pour télécharger en CSV
- Utile pour analyses ou archivage

### 👥 Gestion Globale des Utilisateurs

#### Voir tous les utilisateurs
1. Onglet **"👥 Utilisateurs"**
2. Filtres disponibles :
   - Par département
   - Par niveau
   - Par statut (actif/inactif)
   - En ligne/hors ligne

#### Sessions actives
- Voyez qui est **connecté en temps réel**
- **🚪 Forcer la déconnexion** si nécessaire
- Utile en cas de compte compromis

#### Créer un utilisateur de n'importe quel niveau
1. **"➕ Ajouter un utilisateur"**
2. Choisissez le niveau (0, 1, 2 ou 3)
3. **⚠️ Attention** : Ne créez des Niveau 0 qu'en cas de nécessité absolue

### ⚙️ Paramètres Système

#### Mode Maintenance
1. Activez via le bouton **"🔧 Mode Maintenance"**
2. Tous les utilisateurs (sauf Niveau 0) seront déconnectés
3. Affichez un message personnalisé
4. Désactivez quand la maintenance est terminée

#### Sauvegardes
- Les sauvegardes automatiques sont configurées
- Vérifiez via `scripts/check-atlas-backups.js`
- Restauration possible via `scripts/restore-database.js`

### 📊 Statistiques Globales

Dashboard Super Admin affiche :
- 🏢 **Départements** : Nombre total
- 👥 **Utilisateurs** : Total et par niveau
- 📄 **Documents** : Total et taille
- 💾 **Stockage** : Utilisation et limite
- 📈 **Graphiques** : Évolution sur 30 jours

---

## FAQ - Questions Fréquentes

### 🔐 Connexion et Compte

**Q : J'ai oublié mon mot de passe, que faire ?**
R : Contactez votre Chef de Service (Niveau 2) ou Chef de Département (Niveau 1) qui peut réinitialiser votre mot de passe.

**Q : Comment changer mon mot de passe ?**
R : Cliquez sur votre avatar en haut à droite → **"⚙️ Paramètres"** → **"Changer le mot de passe"**

**Q : Pourquoi suis-je déconnecté automatiquement ?**
R : Pour votre sécurité, vous êtes déconnecté après **10 minutes d'inactivité**.

### 📄 Documents

**Q : Quelle est la taille maximale d'un document ?**
R : **50 MB** par document.

**Q : Quels formats sont acceptés ?**
R : PDF, Word (.doc/.docx), Excel (.xls/.xlsx), PowerPoint (.ppt/.pptx).

**Q : Puis-je récupérer un document supprimé ?**
R : Oui, pendant **30 jours** via la **Corbeille**. Après, la suppression est définitive.

**Q : Comment éditer un document Word/Excel en ligne ?**
R : Cliquez sur **✏️ Éditer** sur le document. L'éditeur s'ouvre automatiquement.

**Q : Puis-je partager un document avec quelqu'un d'un autre département ?**
R : Oui, via la fonction **🔗 Partager**, vous pouvez partager avec n'importe quel utilisateur du système.

### 🔍 Recherche

**Q : Comment rechercher un document spécifique ?**
R : Utilisez la barre de recherche en haut. Vous pouvez rechercher par titre, auteur, date, ou catégorie.

**Q : La recherche ne trouve pas mon document ?**
R : Vérifiez :
- L'orthographe des mots-clés
- Les filtres de catégorie/service
- Que vous avez bien les permissions pour voir ce document

### 🔒 Sécurité

**Q : Mes documents sont-ils sécurisés ?**
R : Oui, le système utilise :
- Chiffrement HTTPS
- Sessions sécurisées
- Logs de sécurité complets
- Permissions par niveau strictes

**Q : Qui peut voir mes documents ?**
R :
- **Niveau 3** : Vos documents + documents partagés avec vous
- **Niveau 2** : Tous les documents de votre service
- **Niveau 1** : Tous les documents de votre département
- **Niveau 0** : Tous les documents du système

**Q : Que signifie "Document verrouillé" ?**
R : Un document verrouillé (🔒) ne peut plus être modifié ni supprimé. Seul le créateur ou un administrateur peut le déverrouiller.

### 🛠️ Problèmes Techniques

**Q : Le document ne s'affiche pas correctement ?**
R :
1. Rechargez la page (F5)
2. Videz le cache du navigateur
3. Essayez un autre navigateur
4. Contactez le support si le problème persiste

**Q : L'upload échoue systématiquement ?**
R : Vérifiez :
- La taille du fichier (< 50 MB)
- Le format du fichier
- Votre connexion internet
- L'espace de stockage disponible

**Q : "Erreur de session" apparaît souvent ?**
R : Videz les cookies de votre navigateur et reconnectez-vous.

---

## 🆘 Support

### Contactez-nous

**Pour les utilisateurs Niveau 3** :
- Contactez votre Chef de Service (Niveau 2)

**Pour les Chefs de Service (Niveau 2)** :
- Contactez votre Chef de Département (Niveau 1)

**Pour les Chefs de Département (Niveau 1)** :
- Contactez le Super Administrateur (Niveau 0)

**Pour les Super Administrateurs** :
- Email support technique : support@cerer.edu.sn
- Documentation technique : `GUIDE-TECHNIQUE.md`

---

## 📝 Notes de Version

**Version Bêta (Décembre 2025)**
- ✅ Nouveau dashboard moderne
- ✅ Système de logs de sécurité complet
- ✅ Documents verrouillés
- ✅ Amélioration des performances
- ✅ Correction de vulnérabilités de sécurité

---

**🎓 Système d'Archivage CERER** - Gestion Électronique de Documents
*Pour toute question, consultez ce guide ou contactez votre superviseur.*
