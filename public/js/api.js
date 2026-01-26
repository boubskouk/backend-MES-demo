// ============================================
// API CLIENT - ARCHIVAGE C.E.R.E.R
// ============================================

// Configuration de l'URL de l'API
const API_URL = (() => {
    const h = window.location.hostname;
    const protocol = window.location.protocol;

    // Si localhost, utiliser http://localhost:4000
    if (h === 'localhost' || h === '127.0.0.1') {
        return 'http://localhost:4000/api';
    }

    // En production, utiliser le même protocole et host que la page actuelle
    return `${protocol}//${h}/api`;
})();

// Fonction générique pour les appels API
async function apiCall(endpoint, method = 'GET', data = null) {
    try {
        const options = {
            method,
            headers: {
                'Content-Type': 'application/json'
            }
        };

        if (data) {
            options.body = JSON.stringify(data);
        }

        const response = await fetch(`${API_URL}${endpoint}`, options);

        // Vérifier si la réponse est du JSON
        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
            throw new Error(`Erreur serveur: la réponse n'est pas du JSON (${response.status})`);
        }

        const result = await response.json();

        if (!response.ok) {
            const error = new Error(result.message || 'Erreur lors de la requête');
            error.response = result; // Garder les détails de la réponse
            throw error;
        }

        return result;
    } catch (error) {
        Logger.error('Erreur API:', error);
        // Ne pas afficher de notification pour les documents verrouillés
        if (!error.response || !error.response.locked) {
            showNotification(error.message, 'error');
        }
        throw error;
    }
}

// ============================================
// APPELS API SPÉCIFIQUES
// ============================================

// Documents
async function getDocuments(userId, full = false) {
    return await apiCall(`/documents/${userId}?full=${full}`);
}

async function getDocument(userId, docId) {
    try {
        return await apiCall(`/documents/${userId}/${docId}`);
    } catch (error) {
        // Si c'est une erreur de verrouillage, afficher un modal spécifique
        if (error.response && error.response.locked) {
            if (typeof showLockedDocumentModal === 'function') {
                showLockedDocumentModal(error.response.lockedBy);
            }
        }
        throw error;
    }
}

async function createDocument(userId, documentData) {
    return await apiCall('/documents', 'POST', { userId, ...documentData });
}

async function deleteDocument(userId, docId) {
    return await apiCall(`/documents/${userId}/${docId}`, 'DELETE');
}

async function deleteAllDocuments(userId, motif = 'Suppression massive') {
    return await apiCall(`/documents/${userId}/delete-all`, 'DELETE', { motif });
}

async function bulkImportDocuments(userId, documents) {
    return await apiCall('/documents/bulk', 'POST', { userId, documents });
}

// Catégories
async function getCategories(userId) {
    return await apiCall(`/categories/${userId}`);
}

async function createCategory(userId, categoryData) {
    return await apiCall('/categories', 'POST', { userId, ...categoryData });
}

async function deleteCategory(userId, catId) {
    return await apiCall(`/categories/${userId}/${catId}`, 'DELETE');
}

// Authentification
async function loginUser(username, password) {
    return await apiCall('/login', 'POST', { username, password });
}

async function registerUser(username, password, nom, email, idRole, idDepartement) {
    // Utiliser /users (POST) pour les utilisateurs authentifiés (admin)
    return await apiCall('/users', 'POST', {
        username,
        password,
        nom,
        email,
        idRole,
        idDepartement
    });
}

// Rôles et Départements
async function getRoles() {
    return await apiCall('/roles');
}

async function getDepartements() {
    return await apiCall('/departements');
}

async function getUserInfo(username) {
    return await apiCall(`/users/${username}`);
}

// ============================================
// DEMANDES DE SUPPRESSION (NOUVEAU)
// ============================================

// Récupérer les demandes de suppression en attente (niveau 1 uniquement)
async function getDeletionRequests(userId) {
    return await apiCall(`/deletion-requests/${userId}`);
}

// Approuver une demande de suppression (niveau 1 uniquement)
async function approveDeletionRequest(requestId, userId) {
    return await apiCall(`/deletion-requests/${requestId}/approve`, 'POST', { userId });
}

// Rejeter une demande de suppression (niveau 1 uniquement)
async function rejectDeletionRequest(requestId, userId, motifRejet) {
    return await apiCall(`/deletion-requests/${requestId}/reject`, 'POST', { userId, motifRejet });
}

// Récupérer l'historique des demandes
async function getDeletionRequestHistory(userId) {
    return await apiCall(`/deletion-requests/${userId}/history`);
}

// Enregistrer un téléchargement
async function recordDownload(userId, docId) {
    return await apiCall(`/documents/${userId}/${docId}/download`, 'POST');
}

// ============================================
// DOSSIERS (Nouveau système multi-fichiers)
// ============================================

// Récupérer les dossiers accessibles
async function getDossiers(userId, options = {}) {
    const { page = 1, limit = 50, search = '', category = '', sort = 'createdAt', order = -1 } = options;
    const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        search,
        category,
        sort,
        order: order.toString()
    });
    return await apiCall(`/dossiers/${userId}?${params.toString()}`);
}

// Récupérer un dossier spécifique
async function getDossier(userId, dossierId) {
    try {
        return await apiCall(`/dossiers/${userId}/${dossierId}`);
    } catch (error) {
        if (error.response && error.response.locked) {
            if (typeof showLockedDocumentModal === 'function') {
                showLockedDocumentModal(error.response.lockedBy);
            }
        }
        throw error;
    }
}

// Récupérer les statistiques des dossiers
async function getDossiersStats(userId) {
    return await apiCall(`/dossiers/${userId}/stats`);
}

// Créer un dossier
async function createDossier(userId, dossierData) {
    return await apiCall('/dossiers', 'POST', { userId, ...dossierData });
}

// Supprimer un dossier (soft delete)
async function deleteDossier(userId, dossierId, motif) {
    return await apiCall(`/dossiers/${userId}/${dossierId}`, 'DELETE', { motif });
}

// Supprimer tous les dossiers accessibles
async function deleteAllDossiers(userId, motif = 'Suppression massive') {
    return await apiCall(`/dossiers/${userId}/delete-all`, 'DELETE', { motif });
}

// ============================================
// DOCUMENTS DANS LES DOSSIERS
// ============================================

// Ajouter un document à un dossier
async function addDocumentToDossier(userId, dossierId, documentData) {
    return await apiCall(`/dossiers/${userId}/${dossierId}/document`, 'POST', documentData);
}

// Retirer un document d'un dossier
async function removeDocumentFromDossier(userId, dossierId, documentId) {
    return await apiCall(`/dossiers/${userId}/${dossierId}/document/${documentId}`, 'DELETE');
}

// Récupérer un document spécifique
async function getDocumentInDossier(userId, dossierId, documentId) {
    return await apiCall(`/dossiers/${userId}/${dossierId}/document/${documentId}`);
}

// Télécharger un document d'un dossier
async function downloadDocumentFromDossier(userId, dossierId, documentId) {
    return await apiCall(`/dossiers/${userId}/${dossierId}/document/${documentId}/download`);
}

// Consulter (prévisualiser) un document - enregistre DOCUMENT_CONSULTED au lieu de DOCUMENT_DOWNLOADED
async function consultDocumentFromDossier(userId, dossierId, documentId) {
    return await apiCall(`/dossiers/${userId}/${dossierId}/document/${documentId}/download?preview=true`);
}

// Partager un document spécifique
async function shareDocumentInDossier(userId, dossierId, documentId, usersToShare) {
    return await apiCall(`/dossiers/${userId}/${dossierId}/document/${documentId}/share`, 'POST', { usersToShare });
}

// Retirer le partage d'un document
async function unshareDocumentInDossier(userId, dossierId, documentId, userToRemove) {
    return await apiCall(`/dossiers/${userId}/${dossierId}/document/${documentId}/unshare`, 'POST', { userToRemove });
}

// Verrouiller/Déverrouiller un document
async function toggleDocumentLock(userId, dossierId, documentId) {
    return await apiCall(`/dossiers/${userId}/${dossierId}/document/${documentId}/toggle-lock`, 'POST');
}

// Rechercher des documents dans les dossiers
async function searchDocumentsInDossiers(userId, query, options = {}) {
    const { page = 1, limit = 20 } = options;
    const params = new URLSearchParams({
        q: query,
        page: page.toString(),
        limit: limit.toString()
    });
    return await apiCall(`/dossiers/${userId}/search/documents?${params.toString()}`);
}

// ============================================
// ALIAS RÉTROCOMPATIBILITÉ (FICHIERS)
// ============================================

// Ajouter un fichier à un dossier (alias)
async function addFichierToDossier(userId, dossierId, fichierData) {
    return await addDocumentToDossier(userId, dossierId, fichierData);
}

// Retirer un fichier d'un dossier (alias)
async function removeFichierFromDossier(userId, dossierId, fichierId) {
    return await removeDocumentFromDossier(userId, dossierId, fichierId);
}

// Télécharger un fichier d'un dossier (alias)
async function downloadFichier(userId, dossierId, fichierId) {
    return await downloadDocumentFromDossier(userId, dossierId, fichierId);
}

// Télécharger tout en ZIP (retourne l'URL pour le téléchargement direct)
function getDownloadAllZipUrl(userId, dossierId) {
    return `${API_URL}/dossiers/${userId}/${dossierId}/download-all`;
}

// Partager un dossier
async function shareDossier(userId, dossierId, usersToShare) {
    return await apiCall(`/dossiers/${userId}/${dossierId}/share`, 'POST', { usersToShare });
}

// Retirer le partage d'un dossier
async function unshareDossier(userId, dossierId, userToRemove) {
    return await apiCall(`/dossiers/${userId}/${dossierId}/unshare`, 'POST', { userToRemove });
}

// Récupérer les utilisateurs avec qui le dossier est partagé
async function getDossierSharedUsers(userId, dossierId) {
    return await apiCall(`/dossiers/${userId}/${dossierId}/shared-users`);
}

// Verrouiller/Déverrouiller un dossier
async function toggleDossierLock(userId, dossierId) {
    return await apiCall(`/dossiers/${userId}/${dossierId}/toggle-lock`, 'POST');
}

// Restaurer un dossier depuis la corbeille
async function restoreDossier(dossierId) {
    return await apiCall(`/dossiers/restore/${dossierId}`, 'POST');
}

// Supprimer définitivement un dossier
async function permanentDeleteDossier(dossierId) {
    return await apiCall(`/dossiers/permanent/${dossierId}`, 'DELETE');
}

// Enregistrer un téléchargement de fichier
async function recordFichierDownload(userId, dossierId, fichierId) {
    // Le téléchargement est automatiquement enregistré côté serveur
    return await downloadFichier(userId, dossierId, fichierId);
}