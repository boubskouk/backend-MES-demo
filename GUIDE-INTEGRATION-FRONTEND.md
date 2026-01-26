# GUIDE D'INTÉGRATION FRONTEND
## Nouvelles Fonctionnalités: Partage & Validation de Suppression

Date: 2025-10-31

---

## 📋 TABLE DES MATIÈRES

1. [Modifications de `api.js`](#1-modifications-de-apijs) ✅ FAIT
2. [Modifications de `app.js`](#2-modifications-de-appjs)
3. [Modifications de `index.html`](#3-modifications-de-indexhtml)
4. [Fichiers créés](#4-fichiers-créés) ✅ FAIT
5. [Tests et validation](#5-tests-et-validation)

---

## 1. MODIFICATIONS DE `api.js` ✅ FAIT

Les nouvelles fonctions API ont été ajoutées:

```javascript
// Demandes de suppression
async function getDeletionRequests(userId)
async function approveDeletionRequest(requestId, userId)
async function rejectDeletionRequest(requestId, userId, motifRejet)
async function getDeletionRequestHistory(userId)
async function recordDownload(userId, docId)
```

**Fichier**: `public/js/api.js` (lignes 121-148)

---

## 2. MODIFICATIONS DE `app.js`

### A. Modifier la fonction `deleteDocument()`

**Avant**:
```javascript
async function deleteDocument(docId) {
    if (!confirm('Supprimer ce document ?')) return;

    try {
        await apiCall(`/documents/${state.currentUser}/${docId}`, 'DELETE');
        await loadData();
        state.selectedDoc = null;
        showNotification('Document supprimé');
    } catch (error) {
        // erreur
    }
}
```

**Après**:
```javascript
async function deleteDocument(docId) {
    if (!confirm('Supprimer ce document ?')) return;

    try {
        const response = await fetch(`${API_URL}/documents/${state.currentUser}/${docId}`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' }
        });

        const result = await response.json();

        // ✅ NOUVEAU: Gérer les demandes de suppression
        if (result.requiresApproval) {
            showNotification(
                '📝 Demande de suppression créée. Un utilisateur de niveau 1 doit l\'approuver.',
                'info'
            );
            state.selectedDoc = null;
            render();
            return;
        }

        if (result.success) {
            await loadData();
            state.selectedDoc = null;
            showNotification('✅ Document supprimé avec succès', 'success');
        }
    } catch (error) {
        showNotification('❌ Erreur lors de la suppression', 'error');
    }
}
```

### B. Ajouter le chargement des demandes après login

**Dans la fonction `login()`**, après l'authentification réussie:

```javascript
async function login(username, password) {
    try {
        const result = await apiCall('/login', 'POST', { username, password });
        if (result.success) {
            state.currentUser = username;
            state.currentUserInfo = result.user;
            state.isAuthenticated = true;
            await loadData();

            // ✅ NOUVEAU: Charger les demandes de suppression pour niveau 1
            if (result.user.roleNiveau === 1) {
                setTimeout(() => {
                    loadDeletionRequests();
                }, 500);
            }

            showNotification(`✅ Bienvenue ${result.user.nom}!`);
            return true;
        }
    } catch (error) {
        return false;
    }
}
```

### C. Ajouter des badges visuels pour les documents partagés

**Dans la fonction qui affiche les documents** (probablement `renderDocumentCard()`):

```javascript
function renderDocumentCard(doc) {
    // Détecter si le document est partagé
    const isSharedDoc = doc.idUtilisateur !== state.currentUser;
    const isLevel1CrossDept = state.currentUserInfo?.roleNiveau === 1 &&
                              doc.idDepartement !== state.currentUserInfo?.idDepartement;

    return `
        <div class="document-card">
            <!-- Contenu existant -->

            <!-- ✅ NOUVEAU: Badges de partage -->
            ${isSharedDoc ? `
                <span class="badge badge-info">
                    ${isLevel1CrossDept ? '🔄 Interdépartemental' : '🤝 Partagé'}
                </span>
            ` : ''}

            <p class="text-sm text-gray-600">
                Archivé par: ${doc.archivePar?.nomComplet || doc.idUtilisateur}
            </p>
        </div>
    `;
}
```

### D. Ajouter un bouton "Demandes" dans le menu (Niveau 1 uniquement)

**Dans le rendu du menu principal**:

```javascript
function renderMenu() {
    return `
        <nav>
            <button onclick="showView('documents')">📄 Documents</button>
            <button onclick="showView('upload')">➕ Ajouter</button>
            <button onclick="showView('categories')">🏷️ Catégories</button>

            <!-- ✅ NOUVEAU: Bouton demandes pour niveau 1 -->
            ${state.currentUserInfo?.roleNiveau === 1 ? `
                <button onclick="showView('deletion-requests')" class="relative">
                    📝 Demandes
                    ${renderDeletionRequestsBadge()}
                </button>
            ` : ''}

            <button onclick="logout()">🚪 Déconnexion</button>
        </nav>
    `;
}
```

---

## 3. MODIFICATIONS DE `index.html`

### A. Ajouter le script `deletion-requests.js`

**Avant `</body>`**:

```html
<!-- Scripts existants -->
<script src="/js/api.js"></script>
<script src="/js/auth.js"></script>
<script src="/js/app.js"></script>

<!-- ✅ NOUVEAU: Script des demandes de suppression -->
<script src="/js/deletion-requests.js"></script>
</body>
```

### B. Ajouter le conteneur des demandes

**Dans le corps de la page** (après le conteneur des documents):

```html
<!-- Conteneur existant -->
<div id="app-container">
    <!-- ... contenu existant ... -->
</div>

<!-- ✅ NOUVEAU: Conteneur des demandes de suppression -->
<div id="deletion-requests-container" class="container mx-auto px-4 py-8 max-w-6xl">
    <!-- Rendu dynamique par deletion-requests.js -->
</div>
```

### C. Ajouter les styles pour les badges

**Dans le `<style>` ou fichier CSS**:

```css
/* ✅ NOUVEAU: Styles pour les badges */
.badge {
    display: inline-block;
    padding: 0.25rem 0.75rem;
    border-radius: 9999px;
    font-size: 0.75rem;
    font-weight: 600;
    margin-right: 0.5rem;
}

.badge-info {
    background-color: #3b82f6;
    color: white;
}

.badge-warning {
    background-color: #f59e0b;
    color: white;
}

.badge-success {
    background-color: #10b981;
    color: white;
}

/* Badge de notification */
.notification-badge {
    position: absolute;
    top: -0.25rem;
    right: -0.25rem;
    background-color: #ef4444;
    color: white;
    font-size: 0.75rem;
    border-radius: 9999px;
    width: 1.25rem;
    height: 1.25rem;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 700;
}
```

---

## 4. FICHIERS CRÉÉS ✅ FAIT

### ✅ Fichiers backend
- `NOUVELLES-FONCTIONNALITES-PARTAGE-VALIDATION.md` - Documentation complète
- `test-nouvelles-fonctionnalites.js` - Script de test
- `server.js` (modifié) - Logique backend

### ✅ Fichiers frontend
- `public/js/api.js` (modifié) - Nouvelles fonctions API
- `public/js/deletion-requests.js` - Interface de gestion
- `public/demo-deletion-requests.html` - Page de démonstration

---

## 5. TESTS ET VALIDATION

### Test 1: Partage horizontal (même niveau, même département)

**Procédure**:
1. Se connecter avec un utilisateur niveau 2 (ex: créer `test_niveau2_a`)
2. Créer un document
3. Se déconnecter et se connecter avec un autre niveau 2 du même département (`test_niveau2_b`)
4. ✅ Vérifier que le document de `test_niveau2_a` est visible

**Résultat attendu**: Le document est visible et porte un badge "🤝 Partagé"

---

### Test 2: Partage interdépartemental niveau 1

**Procédure**:
1. Se connecter avec `fatima` (Direction, Niveau 1)
2. Noter les documents affichés
3. Se déconnecter et se connecter avec `jbk` (Comptabilité, Niveau 1)
4. ✅ Vérifier que les documents de Fatima sont visibles

**Résultat attendu**: Les documents interdépartementaux portent un badge "🔄 Interdépartemental"

---

### Test 3: Demande de suppression (Niveau 2/3)

**Procédure**:
1. Se connecter avec `deguene` (Niveau 3)
2. Créer un document de test
3. Tenter de le supprimer
4. ✅ Vérifier qu'une notification apparaît: "Demande créée"
5. ✅ Vérifier que le document n'est PAS supprimé

**Résultat attendu**:
- Message: "📝 Demande de suppression créée"
- Document toujours présent

---

### Test 4: Approbation de demande (Niveau 1)

**Procédure**:
1. Se connecter avec `fatima` (Niveau 1)
2. Cliquer sur "📝 Demandes" dans le menu
3. ✅ Voir la demande de `deguene`
4. Cliquer sur "✅ Approuver"
5. ✅ Vérifier que le document est supprimé

**Résultat attendu**:
- La demande apparaît dans la liste
- Après approbation, le document disparaît
- Message: "✅ Document supprimé avec succès"

---

### Test 5: Rejet de demande (Niveau 1)

**Procédure**:
1. Niveau 3 crée une demande de suppression
2. Niveau 1 ouvre "📝 Demandes"
3. Clique sur "❌ Rejeter"
4. Entre un motif (ex: "Document encore nécessaire")
5. ✅ Vérifier que le document n'est PAS supprimé

**Résultat attendu**:
- Popup demandant le motif de rejet
- Document conservé
- Message: "❌ Demande de suppression rejetée"

---

### Test 6: Suppression directe (Niveau 1)

**Procédure**:
1. Se connecter avec niveau 1 (ex: `fatima`)
2. Supprimer un document
3. ✅ Vérifier la suppression immédiate (pas de demande)

**Résultat attendu**:
- Suppression immédiate
- Message: "✅ Document supprimé avec succès"
- Aucune demande créée

---

## 6. PERSONNALISATION DE L'INTERFACE

### A. Couleurs des badges selon le type de partage

```javascript
function getDocumentBadge(doc) {
    const isOwn = doc.idUtilisateur === state.currentUser;

    if (isOwn) {
        return ''; // Pas de badge pour ses propres documents
    }

    const userDept = state.currentUserInfo?.idDepartement;
    const docDept = doc.idDepartement;

    // Niveau 1 interdépartemental
    if (state.currentUserInfo?.roleNiveau === 1 && userDept !== docDept) {
        return `<span class="badge" style="background-color: #8b5cf6;">🔄 Niveau 1</span>`;
    }

    // Partage horizontal
    return `<span class="badge badge-info">🤝 Collègue</span>`;
}
```

### B. Affichage du nombre de demandes dans le titre

```javascript
function renderPageTitle() {
    const pendingCount = deletionRequestsState.requests.length;

    return `
        <h1>
            Système d'archivage C.E.R.E.R
            ${pendingCount > 0 ? `<span class="badge badge-warning">${pendingCount} demande(s)</span>` : ''}
        </h1>
    `;
}
```

---

## 7. GESTION DES ERREURS

### A. Connexion perdue

```javascript
// Dans api.js, modifier apiCall()
async function apiCall(endpoint, method = 'GET', data = null) {
    try {
        // ... code existant ...
    } catch (error) {
        // ✅ NOUVEAU: Détecter la perte de connexion
        if (error.message.includes('Failed to fetch')) {
            showNotification('⚠️ Erreur de connexion au serveur', 'error');
        }
        throw error;
    }
}
```

### B. Demande déjà traitée

```javascript
async function handleApproveDeletion(requestId) {
    try {
        const result = await approveDeletionRequest(requestId, state.currentUser);

        if (result.success) {
            showNotification('✅ Document supprimé', 'success');
            await loadDeletionRequests();
        }
    } catch (error) {
        // ✅ NOUVEAU: Gérer les cas spéciaux
        if (error.message.includes('déjà été traitée')) {
            showNotification('⚠️ Cette demande a déjà été traitée', 'warning');
            await loadDeletionRequests(); // Rafraîchir la liste
        } else {
            showNotification('❌ Erreur lors de l\'approbation', 'error');
        }
    }
}
```

---

## 8. NOTIFICATIONS AMÉLIORÉES

```javascript
// Système de notifications avec types et icônes
function showNotification(message, type = 'info') {
    const icons = {
        success: '✅',
        error: '❌',
        warning: '⚠️',
        info: 'ℹ️'
    };

    const colors = {
        success: 'bg-green-500',
        error: 'bg-red-500',
        warning: 'bg-orange-500',
        info: 'bg-blue-500'
    };

    const notification = document.createElement('div');
    notification.className = `${colors[type]} text-white px-6 py-4 rounded-lg shadow-lg mb-4`;
    notification.innerHTML = `${icons[type]} ${message}`;

    document.getElementById('notification-area').appendChild(notification);

    setTimeout(() => {
        notification.style.opacity = '0';
        setTimeout(() => notification.remove(), 300);
    }, 5000);
}
```

---

## 9. ACCESSIBILITÉ

### A. Navigation au clavier

```javascript
// Permettre Tab et Enter pour naviguer dans les demandes
function renderDeletionRequestCard(request) {
    return `
        <div class="deletion-request-card" tabindex="0">
            <button
                onclick="handleApproveDeletion('${request._id}')"
                aria-label="Approuver la suppression de ${request.documentTitre}"
                class="approve-btn"
            >
                ✅ Approuver
            </button>
            <button
                onclick="handleRejectDeletion('${request._id}')"
                aria-label="Rejeter la suppression de ${request.documentTitre}"
                class="reject-btn"
            >
                ❌ Rejeter
            </button>
        </div>
    `;
}
```

---

## 10. RÉSUMÉ DES MODIFICATIONS

| Fichier | Type | Statut | Description |
|---------|------|--------|-------------|
| `server.js` | Backend | ✅ Modifié | Logique de partage et validation |
| `api.js` | Frontend | ✅ Modifié | 5 nouvelles fonctions API |
| `deletion-requests.js` | Frontend | ✅ Créé | Interface de gestion |
| `demo-deletion-requests.html` | Frontend | ✅ Créé | Page de démonstration |
| `app.js` | Frontend | ⏳ À modifier | Intégration dans l'app principale |
| `index.html` | Frontend | ⏳ À modifier | Ajout du conteneur et scripts |

---

## 11. CHECKLIST D'INTÉGRATION

- [ ] Modifier `app.js` - fonction `deleteDocument()`
- [ ] Modifier `app.js` - fonction `login()` pour charger les demandes
- [ ] Ajouter le bouton "Demandes" dans le menu (niveau 1)
- [ ] Ajouter le conteneur `#deletion-requests-container` dans `index.html`
- [ ] Inclure le script `<script src="/js/deletion-requests.js"></script>`
- [ ] Ajouter les styles CSS pour les badges
- [ ] Tester avec un utilisateur niveau 1
- [ ] Tester avec un utilisateur niveau 2/3
- [ ] Vérifier le partage horizontal
- [ ] Vérifier le partage interdépartemental niveau 1

---

## 12. SUPPORT ET AIDE

### Questions fréquentes

**Q: Les demandes ne s'affichent pas**
- Vérifier que l'utilisateur est niveau 1
- Vérifier que `deletion-requests.js` est bien chargé
- Vérifier la console pour les erreurs

**Q: La suppression ne crée pas de demande**
- Vérifier que l'utilisateur est niveau 2 ou 3
- Vérifier la réponse du serveur dans la console réseau

**Q: Le badge de notification ne s'affiche pas**
- Vérifier que `renderDeletionRequestsBadge()` est appelée
- Vérifier les styles CSS

---

## 13. PROCHAINES AMÉLIORATIONS POSSIBLES

1. **Historique des demandes**
   - Afficher les demandes approuvées/rejetées
   - Statistiques mensuelles

2. **Notifications en temps réel**
   - WebSocket pour notifier les niveau 1 instantanément
   - Badge animé pour attirer l'attention

3. **Commentaires**
   - Permettre aux niveau 1 de commenter avant approbation
   - Dialogue avec le demandeur

4. **Délégation**
   - Permettre à un niveau 1 de déléguer l'approbation
   - Système de signatures multiples

---

**Développé par le Service Informatique du C.E.R.E.R**
**Date : 2025-10-31**
