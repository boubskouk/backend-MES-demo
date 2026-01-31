// ===== CONFIGURATION =====

// Configuration de l'URL de l'API (si non définie par api.js)
if (typeof API_URL === 'undefined') {
    window.API_URL = (() => {
        const h = window.location.hostname;
        const protocol = window.location.protocol;

        // Si localhost, utiliser http://localhost:4000
        if (h === 'localhost' || h === '127.0.0.1') {
            return 'http://localhost:4000/api';
        }

        // En production, utiliser le même protocole et host que la page actuelle
        return `${protocol}//${h}/api`;
    })();
}

// État de l'application
const state = {
    documents: [],
    categories: [],
    roles: [], // NOUVEAU : Liste des rôles
    departements: [], // NOUVEAU : Liste des départements
    services: [], // NOUVEAU : Liste des services (niveau 1)
    // MODE DOSSIERS (nouveau système multi-fichiers)
    useDossiers: true, // Active le mode dossiers par défaut
    dossiers: [], // Liste des dossiers
    selectedDossier: null, // Dossier sélectionné pour détail
    showDossierDetail: false, // Afficher le détail du dossier
    showDossierUploadForm: false, // Formulaire création dossier
    // RECHERCHE DE DOCUMENTS
    documentSearchResults: [], // Résultats de recherche de documents
    showDocumentSearchResults: false, // Afficher les résultats de recherche de documents
    documentSearchQuery: '', // Terme de recherche de documents
    dossierPagination: {
        page: 1,
        limit: 30,
        total: 0,
        totalPages: 0,
        hasNextPage: false,
        hasPrevPage: false
    },
    // PAGINATION
    pagination: {
        page: 1,
        limit: 30,
        total: 0,
        totalPages: 0,
        hasNextPage: false,
        hasPrevPage: false
    },
    searchTerm: '',
    selectedCategory: 'tous',
    selectedDepartement: 'tous',
    dateFrom: '',
    dateTo: '',
    dateType: 'document',
    tempSearchTerm: '',
    tempSelectedCategory: 'tous',
    tempSelectedDepartement: 'tous',
    tempDateFrom: '',
    tempDateTo: '',
    tempDateType: 'document',
    selectedDoc: null,
    showUploadForm: false,
    showMenu: false,
    showCategories: false,
    editingCategory: null, // Catégorie en cours de modification
    showDepartements: false,
    editingDepartement: null, // Département en cours de modification
    showUsersManagement: false,
    editingUser: null,
    allUsersForManagement: [],
    showRolesManagement: false,
    editingRole: null,
    showDepartementsManagement: false,
    editingDepartement: null,
    showAdvancedStats: false,
    showDeleteConfirm: false,
    isAuthenticated: false,
    isCheckingSession: true, // NOUVEAU : Vérifier si on restaure une session
    currentUser: null,
    currentUserInfo: null, // Informations complètes de l'utilisateur (nom, rôle, niveau)
    showRegister: false,
    showProfile: false, // ✅ NOUVEAU : Modal de profil utilisateur
    profilePhotoPreview: null, // NOUVEAU : Prévisualisation de la photo
    storageInfo: { usedMB: 0, totalMB: 1000, percentUsed: 0 },
    loading: false,
    importProgress: { show: false, current: 0, total: 0, message: '' },
    sortBy: '', // Tri par défaut (par date de création)
    showFilters: false, // NOUVEAU : Affichage du panneau de filtres
    showShareModal: false, // NOUVEAU : Modal de partage
    shareAvailableUsers: [], // NOUVEAU : Utilisateurs disponibles pour le partage
    shareSelectedUsers: [], // NOUVEAU : Utilisateurs sélectionnés pour le partage
    shareSearchTerm: '', // NOUVEAU : Terme de recherche pour filtrer les utilisateurs
    showShareDocumentModal: false, // Modal de partage pour un document spécifique
    shareDocumentTarget: null, // { dossierId, documentId, documentNom }
    showPreviewModal: false, // Modal de prévisualisation de document
    previewDocument: null, // { nom, type, contenu, dossierId, documentId }
    messages: [], // NOUVEAU : Messages de la boîte de réception
    showMessages: false, // NOUVEAU : Affichage de la boîte de réception
    unreadCount: 0, // NOUVEAU : Nombre de messages non lus
    showComposeMessage: false, // NOUVEAU : Afficher le formulaire de composition
    composeMessageTo: '', // NOUVEAU : Destinataire du message
    composeMessageSubject: '', // NOUVEAU : Sujet du message
    composeMessageBody: '', // NOUVEAU : Corps du message
    allUsers: [], // NOUVEAU : Liste de tous les utilisateurs pour composition
    showMessagingSection: false, // NOUVEAU : Afficher la section messagerie dans la page principale
    userSearchTerm: '', // NOUVEAU : Terme de recherche pour filtrer les utilisateurs destinataires
    showUserDropdown: false, // NOUVEAU : Afficher le dropdown de recherche
    selectedUser: null // NOUVEAU : Utilisateur sélectionné
};

// Données du formulaire
let formData = {
    titre: '',
    categorie: '', // ✅ CORRIGÉ : Pas de valeur par défaut 'factures', l'utilisateur DOIT choisir
    date: new Date().toISOString().split('T')[0],
    departementArchivage: '', // Département d'archivage
    description: '',
    tags: '',
    locked: false // Verrouillage du document (niveau 1 uniquement)
};

// Données du formulaire dossier
let dossierFormData = {
    titre: '',
    categorie: '',
    date: new Date().toISOString().split('T')[0],
    departementArchivage: '',
    description: '',
    tags: '',
    locked: false,
    fichiers: [] // Fichiers à uploader
};

// ===== VÉRIFICATION AUTOMATIQUE DE SESSION =====
// Vérifie toutes les 5 secondes si la session est toujours valide
// Si la session a été détruite (déconnexion forcée), redirige vers login
let sessionCheckInterval = null;

function startSessionCheck() {
    // Ne vérifier que si l'utilisateur est connecté
    if (!state.isAuthenticated) {
        return;
    }

    // Vérifier immédiatement
    checkSessionValidity();

    // Puis vérifier toutes les 5 secondes
    if (sessionCheckInterval) {
        clearInterval(sessionCheckInterval);
    }

    sessionCheckInterval = setInterval(checkSessionValidity, 5000);
}

async function checkSessionValidity() {
    try {
        // Appeler la route dédiée pour vérifier le statut de la session
        const response = await fetch(`${API_URL}/check-session-status`, {
            method: 'GET',
            credentials: 'include'
        });

        // Si la session a été détruite, le serveur renvoie 401
        if (response.status === 401) {
            const data = await response.json();

            // Vérifier si c'est une déconnexion forcée
            if (data.forceLogout) {
                Logger.debug('⚠️ Session fermée par un administrateur');

                // Arrêter la vérification
                if (sessionCheckInterval) {
                    clearInterval(sessionCheckInterval);
                    sessionCheckInterval = null;
                }

                // Afficher un message BIEN VISIBLE avec style
                const modal = document.createElement('div');
                modal.style.cssText = `
                    position: fixed;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background: rgba(0, 0, 0, 0.9);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 99999;
                    animation: fadeIn 0.3s;
                `;
                modal.innerHTML = `
                    <div style="
                        background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
                        padding: 40px 60px;
                        border-radius: 20px;
                        text-align: center;
                        color: white;
                        box-shadow: 0 20px 60px rgba(0,0,0,0.5);
                        max-width: 500px;
                    ">
                        <div style="font-size: 80px; margin-bottom: 20px;">🔒</div>
                        <h2 style="font-size: 28px; font-weight: 800; margin-bottom: 20px; text-transform: uppercase;">
                            SESSION FERMÉE
                        </h2>
                        <p style="font-size: 20px; margin-bottom: 30px; font-weight: 600;">
                            Vous avez été déconnecté par le Super Admin
                        </p>
                        <p style="font-size: 16px; opacity: 0.9;">
                            Redirection vers la page de connexion...
                        </p>
                    </div>
                `;
                document.body.appendChild(modal);

                // Rediriger après 3 secondes pour laisser le temps de lire
                setTimeout(() => {
                    window.location.href = '/';
                }, 3000);
            }
        }
    } catch (error) {
        // Erreur réseau : ignorer silencieusement
        Logger.debug('Erreur vérification session:', error);
    }
}

// Arrêter la vérification quand l'utilisateur se déconnecte
function stopSessionCheck() {
    if (sessionCheckInterval) {
        clearInterval(sessionCheckInterval);
        sessionCheckInterval = null;
    }
}

// ===== FONCTIONS API =====
async function apiCall(endpoint, method = 'GET', data = null) {
    state.loading = true;
    render();
    try {
        const options = {
            method,
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include' // ✅ Inclure les cookies de session
        };
        if (data) options.body = JSON.stringify(data);
        const response = await fetch(`${API_URL}${endpoint}`, options);
        const result = await response.json();

        // Note: La vérification de session est maintenant gérée par detectSessionChange() et checkSessionValidity()
        // Pas besoin de vérifier à chaque appel API pour éviter les problèmes de performance

        if (!response.ok) {
            Logger.error(`❌ API Error [${method} ${endpoint}]:`, result.message || 'Erreur');
            throw new Error(result.message || 'Erreur');
        }
        return result;
    } catch (error) {
        Logger.error(`❌ API Call Failed [${method} ${endpoint}]:`, error);
        showNotification(error.message, 'error');
        throw error;
    } finally {
        state.loading = false;
        render();
    }
}

// ===== GESTION DES SESSIONS =====

// Sauvegarder la session dans sessionStorage (expire à la fermeture du navigateur)
function saveSession(username, userInfo) {
    try {
        sessionStorage.setItem('mes_session', JSON.stringify({
            username,
            userInfo,
            timestamp: Date.now()
        }));
    } catch (error) {
        Logger.error('Erreur sauvegarde session:', error);
    }
}

// Restaurer la session depuis sessionStorage
async function restoreSession() {
    try {
        // Vérifier la session dans sessionStorage
        const sessionData = sessionStorage.getItem('mes_session');
        if (!sessionData) {
            state.isCheckingSession = false;
            return false;
        }

        const { username, userInfo, timestamp } = JSON.parse(sessionData);

        // Vérifier que la session n'est pas trop ancienne (7 jours)
        const sevenDays = 7 * 24 * 60 * 60 * 1000;
        if (Date.now() - timestamp > sevenDays) {
            clearSession();
            state.isCheckingSession = false;
            return false;
        }

        // Vérifier que la session est toujours valide côté serveur
        const result = await apiCall('/verify-session', 'POST', { username });
        if (result.success) {
            state.currentUser = username;
            state.currentUserInfo = result.user;
            state.isAuthenticated = true;
            state.isCheckingSession = false;

            // 🔒 SÉCURITÉ: Bloquer le niveau 0 (Super Admin)
            if (state.currentUserInfo && state.currentUserInfo.niveau === 0) {
                const message = `⛔ Accès Refusé\n\nVous êtes Super Administrateur (Niveau 0).\n\n👉 Veuillez utiliser l'interface dédiée aux Super Admins.\n\nVous allez être redirigé dans 3 secondes...`;
                alert(message);
                clearSession();
                setTimeout(() => {
                    window.location.href = '/super-admin-login.html';
                }, 3000);
                return false;
            }

            // 🔐 PREMIÈRE CONNEXION: Vérifier si l'utilisateur doit changer son mot de passe
            if (result.user && (result.user.mustChangePassword || result.user.firstLogin)) {
                state.mustChangePassword = true;
                render();
                return true;
            }

            // Démarrer les systèmes de sécurité
            startInactivityTimer();
            startSessionCheck();
            detectSessionChange();

            await loadData();
            return true;
        } else {
            clearSession();
            state.isCheckingSession = false;
            return false;
        }

    } catch (error) {
        Logger.error('Erreur restauration session:', error);
        clearSession();
        state.isCheckingSession = false;
        return false;
    }
}

// Nettoyer la session
function clearSession() {
    try {
        // ✅ CORRECTION: Effacer TOUT le sessionStorage pour éviter les conflits entre versions
        sessionStorage.clear();
    } catch (error) {
        Logger.error('Erreur nettoyage session:', error);
    }
}

// ===== DÉTECTION CHANGEMENT DE SESSION =====
// Détecter si un autre onglet se connecte avec un autre compte
let sessionChangeInterval = null; // ✅ Variable pour stocker l'intervalle

function detectSessionChange() {
    // Arrêter l'intervalle existant si présent
    if (sessionChangeInterval) {
        clearInterval(sessionChangeInterval);
    }

    // Vérifier périodiquement si la session a changé
    sessionChangeInterval = setInterval(async () => {
        if (!state.isAuthenticated || !state.currentUser) return;

        try {
            // Utiliser fetch directement pour éviter les renders inutiles
            const response = await fetch(`${API_URL}/session-check`, {
                method: 'GET',
                credentials: 'include'
            });

            const data = await response.json();

            if (data && data.username) {
                // Si l'utilisateur de la session est différent de celui stocké localement
                if (data.username !== state.currentUser) {
                    Logger.debug(`🚨 SÉCURITÉ: Session changée de ${state.currentUser} à ${data.username} - Déconnexion automatique`);

                    // Logger la violation de session côté serveur
                    try {
                        await fetch(`${API_URL}/log-session-violation`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            credentials: 'include',
                            body: JSON.stringify({
                                oldUser: state.currentUser,
                                newUser: data.username
                            })
                        });
                    } catch (logError) {
                        // Ignorer erreurs de log
                    }

                    // Déconnexion silencieuse et automatique (sans message)
                    await logout(true);
                }
            }
        } catch (error) {
            // Ignorer les erreurs de vérification
        }
    }, 10000); // 🔒 SÉCURITÉ: Vérifier toutes les 10 secondes (changé de 50ms pour éviter le rate limit)
}

// ===== SYSTÈME DE DÉCONNEXION AUTOMATIQUE =====
let inactivityTimer = null;
const INACTIVITY_TIMEOUT = 10 * 60 * 1000; // 10 minutes en millisecondes

// Démarrer le système de détection d'inactivité
function startInactivityTimer() {
    // Réinitialiser le timer existant
    resetInactivityTimer();

    // Événements à surveiller pour détecter l'activité
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];

    // Ajouter les écouteurs d'événements
    events.forEach(event => {
        document.addEventListener(event, resetInactivityTimer, true);
    });
}

// Réinitialiser le timer d'inactivité
function resetInactivityTimer() {
    // Annuler le timer existant
    if (inactivityTimer) {
        clearTimeout(inactivityTimer);
    }

    // Ne démarrer le timer que si l'utilisateur est connecté
    if (state.isAuthenticated) {
        inactivityTimer = setTimeout(() => {
            Logger.debug('Déconnexion automatique après inactivité');
            logout(true); // Déconnexion automatique
        }, INACTIVITY_TIMEOUT);
    }
}

// Arrêter le système de détection d'inactivité
function stopInactivityTimer() {
    if (inactivityTimer) {
        clearTimeout(inactivityTimer);
        inactivityTimer = null;
    }

    // Retirer tous les écouteurs d'événements
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
    events.forEach(event => {
        document.removeEventListener(event, resetInactivityTimer, true);
    });
}

// Démarrer le timer de réinitialisation automatique des filtres (5 minutes)
function startFilterResetTimer() {
    // Arrêter le timer existant s'il y en a un
    if (window.filterResetTimer) {
        clearInterval(window.filterResetTimer);
    }

    // Créer un nouveau timer qui se déclenche toutes les 5 minutes
    window.filterResetTimer = setInterval(() => {
        Logger.debug('🔄 Réinitialisation automatique des filtres après 5 minutes');
        resetFilters();
        showNotification('🔄 Filtres réinitialisés automatiquement', 'info');
    }, 5 * 60 * 1000); // 5 minutes en millisecondes
}

// ===== AUTHENTIFICATION =====
async function login(username, password) {
    try {
        const result = await apiCall('/login', 'POST', { username, password });
        if (result.success) {
            state.currentUser = username;
            state.currentUserInfo = result.user; // Stocker les infos complètes (nom, rôle, niveau)
            state.isAuthenticated = true;

            // 🔒 SÉCURITÉ: Bloquer le niveau 0 (Super Admin)
            if (result.user && result.user.niveau === 0) {
                const message = `
                    ⛔ Accès Refusé

                    Vous êtes Super Administrateur (Niveau 0).

                    👉 Veuillez utiliser l'interface dédiée aux Super Admins.

                    Vous allez être redirigé dans 3 secondes...
                `;

                alert(message);

                Logger.debug(`🔒 Niveau 0 bloqué: ${username} redirigé vers interface Super Admin`);

                // Redirection vers interface Super Admin
                setTimeout(() => {
                    window.location.href = '/super-admin-login.html';
                }, 3000);

                return true;
            }

            // ✅ NOUVEAU: Vérifier si l'utilisateur doit changer son mot de passe
            if (result.user && (result.user.mustChangePassword || result.user.firstLogin)) {
                // Sauvegarder temporairement les identifiants pour le changement de mot de passe
                state.tempPassword = password;
                state.mustChangePassword = true;

                // Afficher le formulaire de changement de mot de passe obligatoire
                render();
                showNotification('🔐 Vous devez changer votre mot de passe', 'warning');
                return true;
            }

            // Sauvegarder la session
            saveSession(username, result.user);

            // Démarrer le système de déconnexion automatique
            startInactivityTimer();

            // Démarrer le timer de réinitialisation automatique des filtres
            startFilterResetTimer();

            // ✅ Démarrer la vérification automatique de session (déconnexion forcée)
            startSessionCheck();

            await loadData();

            // ✅ Charger les rôles, départements et services après le login
            await loadRolesAndDepartements();
            await loadServices();

            showNotification(`✅ Bienvenue ${result.user.nom}!`);
            return true;
        }
    } catch (error) {
        return false;
    }
}

async function register(username, password, nom, email, idRole, idDepartement, adminPassword) {
    if (adminPassword !== '100480') {
        showNotification('Mot de passe admin incorrect', 'error');
        return false;
    }
    try {
        // Utiliser POST /api/users pour création par utilisateur authentifié
        const result = await apiCall('/users', 'POST', {
            username,
            password,
            nom,
            email,
            idRole,
            idDepartement
        });
        if (result.success) {
            showNotification('✅ Compte créé!');
            return true;
        }
    } catch (error) {
        return false;
    }
}

// ✅ NOUVEAU: Gérer le changement de mot de passe obligatoire
async function handlePasswordChange() {
    const oldPassword = document.getElementById('change_old_password').value;
    const newPassword = document.getElementById('change_new_password').value;
    const confirmPassword = document.getElementById('change_confirm_password').value;

    // Validations
    if (!oldPassword || !newPassword || !confirmPassword) {
        showNotification('❌ Veuillez remplir tous les champs', 'error');
        return;
    }

    if (newPassword.length < 4) {
        showNotification('❌ Le nouveau mot de passe doit contenir au moins 4 caractères', 'error');
        return;
    }

    if (newPassword !== confirmPassword) {
        showNotification('❌ Les mots de passe ne correspondent pas', 'error');
        return;
    }

    if (oldPassword === newPassword) {
        showNotification('❌ Le nouveau mot de passe doit être différent de l\'ancien', 'error');
        return;
    }

    try {
        const result = await apiCall(`/users/${state.currentUser}/change-password`, 'POST', {
            currentPassword: oldPassword,
            newPassword
        });

        if (result.success) {
            showNotification('✅ Mot de passe modifié avec succès!');

            // Marquer que le mot de passe a été changé
            state.mustChangePassword = false;
            state.tempPassword = null;

            // Sauvegarder la session et charger les données
            saveSession(state.currentUser, state.currentUserInfo);
            startInactivityTimer();
            startFilterResetTimer();
            await loadData();

            // Afficher l'interface principale
            render();
        }
    } catch (error) {
        Logger.error('Erreur lors du changement de mot de passe:', error);
    }
}

async function logout(isAutoLogout = false) {
    if (!isAutoLogout) {
        const confirmed = await customConfirm({
            title: 'Déconnexion',
            message: 'Êtes-vous sûr de vouloir vous déconnecter ?',
            confirmText: 'Oui, me déconnecter',
            cancelText: 'Annuler',
            type: 'warning',
            icon: '👋'
        });

        if (!confirmed) return;
    }

    // Réinitialiser tous les filtres avant de se déconnecter
    resetFilters();

    // Arrêter le timer de réinitialisation automatique
    if (window.filterResetTimer) {
        clearInterval(window.filterResetTimer);
        window.filterResetTimer = null;
    }

    // ✅ CORRECTION: Détruire la session SERVEUR avant de nettoyer le client
    // Utiliser fetch directement pour éviter le message d'erreur flash de apiCall
    try {
        await fetch(`${API_URL}/logout`, {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' }
        });
        Logger.debug('✅ Session serveur détruite');
    } catch (error) {
        // Ignorer silencieusement les erreurs pour éviter le flash
        Logger.debug('Note: Déconnexion effectuée');
    }

    // Nettoyer la session CLIENT
    clearSession();

    // Arrêter le système de détection d'inactivité
    stopInactivityTimer();

    // ✅ Arrêter la vérification automatique de session
    stopSessionCheck();

    state.currentUser = null;
    state.currentUserInfo = null;
    state.isAuthenticated = false;
    state.documents = [];
    state.categories = [];

    // 🔒 SÉCURITÉ: Nettoyer TOUTES les données utilisateur pour éviter fuite entre sessions
    state.allUsersForManagement = [];
    state.shareAvailableUsers = [];
    state.shareSelectedUsers = [];
    state.roles = [];
    state.departements = [];
    state.services = [];
    state.allUsers = [];
    state.messages = [];
    state.unreadCount = 0;

    // Nettoyer les états d'édition
    state.editingUser = null;
    state.editingRole = null;
    state.editingDepartement = null;
    state.editingCategory = null;

    // Fermer tous les panneaux
    state.showUsersManagement = false;
    state.showRolesManagement = false;
    state.showDepartementsManagement = false;
    state.showCategories = false;
    state.showAdvancedStats = false;
    state.showMessages = false;
    state.showMessagingSection = false;
    state.showComposeMessage = false;

    if (isAutoLogout) {
        showNotification('⏰ Déconnexion automatique après 10 minutes d\'inactivité', 'warning');
    } else {
        showNotification('✅ Déconnexion réussie');
    }

    render();
}

// ===== GESTION DES DONNÉES =====
async function loadData(page = null) {
    if (!state.currentUser) return;
    try {
        // Charger les catégories en premier (utilisées par les deux systèmes)
        const cats = await apiCall(`/categories/${state.currentUser}`);
        state.categories = Array.isArray(cats) ? cats : (cats.categories || []);

        // Si mode dossiers activé, charger les dossiers
        if (state.useDossiers) {
            await loadDossiers(page);
        } else {
            // Mode documents classique
            const currentPage = page || state.pagination.page || 1;
            const limit = state.pagination.limit || 50;

            const params = new URLSearchParams({
                page: currentPage,
                limit: limit
            });

            if (state.searchTerm && state.searchTerm.trim()) {
                params.append('search', state.searchTerm.trim());
            }
            if (state.selectedCategory && state.selectedCategory !== 'tous') {
                params.append('category', state.selectedCategory);
            }

            console.log('[DOCUMENTS] API call URL:', `/documents/${state.currentUser}?${params.toString()}`);
            const response = await apiCall(`/documents/${state.currentUser}?${params.toString()}`);

            state.documents = response.documents || [];

            state.pagination = {
                page: response.page || 1,
                limit: response.limit || limit,
                total: response.total || 0,
                totalPages: response.totalPages || 1,
                hasNextPage: response.hasNextPage || false,
                hasPrevPage: response.hasPrevPage || false
            };

            Logger.debug(`[DOCUMENTS] Page ${state.pagination.page}/${state.pagination.totalPages} - ${state.documents.length}/${state.pagination.total} documents`);
        }

        calculateStorageUsage();
        await updateUnreadCount();
        render();
    } catch (error) {
        Logger.error('Erreur loadData:', error);
        state.loading = false;
        render();
    }
}

// Basculer entre mode documents et mode dossiers
// Fonctions de navigation pagination
async function goToPage(page) {
    if (page < 1 || page > state.pagination.totalPages) return;
    state.pagination.page = page;
    await loadData(page);
}

async function nextPage() {
    if (state.pagination.hasNextPage) {
        await goToPage(state.pagination.page + 1);
    }
}

async function prevPage() {
    if (state.pagination.hasPrevPage) {
        await goToPage(state.pagination.page - 1);
    }
}

async function firstPage() {
    await goToPage(1);
}

async function lastPage() {
    await goToPage(state.pagination.totalPages);
}

// Générer les boutons de pagination (1, 2, 3, ..., 10)
function generatePaginationButtons() {
    const { page, totalPages } = state.pagination;
    const buttons = [];
    const maxButtons = 5; // Nombre max de boutons à afficher

    let startPage = Math.max(1, page - Math.floor(maxButtons / 2));
    let endPage = Math.min(totalPages, startPage + maxButtons - 1);

    // Ajuster si on est proche de la fin
    if (endPage - startPage < maxButtons - 1) {
        startPage = Math.max(1, endPage - maxButtons + 1);
    }

    // Bouton première page si nécessaire
    if (startPage > 1) {
        buttons.push(`<button onclick="goToPage(1)" class="px-3 py-1 rounded bg-gray-100 hover:bg-gray-200 text-sm">1</button>`);
        if (startPage > 2) {
            buttons.push(`<span class="px-2 text-gray-400">...</span>`);
        }
    }

    // Boutons des pages
    for (let i = startPage; i <= endPage; i++) {
        const isActive = i === page;
        buttons.push(`
            <button onclick="goToPage(${i})"
                    class="px-3 py-1 rounded text-sm ${isActive ? 'bg-blue-600 text-white font-bold' : 'bg-gray-100 hover:bg-gray-200'}">
                ${i}
            </button>
        `);
    }

    // Bouton dernière page si nécessaire
    if (endPage < totalPages) {
        if (endPage < totalPages - 1) {
            buttons.push(`<span class="px-2 text-gray-400">...</span>`);
        }
        buttons.push(`<button onclick="goToPage(${totalPages})" class="px-3 py-1 rounded bg-gray-100 hover:bg-gray-200 text-sm">${totalPages}</button>`);
    }

    return buttons.join('');
}

// NOUVEAU : Charger les rôles, départements et services
async function loadRolesAndDepartements() {
    try {
        const rolesData = await apiCall('/roles');
        state.roles = rolesData.roles || [];

        const deptsData = await apiCall('/departements');
        state.departements = deptsData.departements || [];

        Logger.debug('✅ Rôles et départements chargés:', state.roles.length, 'rôles,', state.departements.length, 'départements');
        // Note: Le render est fait après le chargement des services pour éviter le clignotement
    } catch (error) {
        Logger.error('❌ Erreur chargement rôles/départements:', error);
    }
}

// Charger les services (appelé après login)
async function loadServices() {
    try {
        const servicesData = await apiCall('/services');
        state.services = servicesData.services || [];
        Logger.debug('✅ Services chargés:', state.services.length, 'services');
        render(); // Render final après tout le chargement
    } catch (error) {
        Logger.error('❌ Erreur chargement services:', error);
        state.services = [];
    }
}

async function saveDocument(doc) {
    const result = await apiCall('/documents', 'POST', { userId: state.currentUser, ...doc });
    if (result.success) {
        await loadData();
        return result.document;
    }
}

async function deleteDoc(id) {
    const confirmed = await customConfirm({
        title: 'Supprimer le document',
        message: 'Voulez-vous vraiment supprimer ce document ? Cette action est irréversible.',
        confirmText: 'Oui, supprimer',
        cancelText: 'Annuler',
        type: 'danger',
        icon: '🗑️'
    });

    if (!confirmed) return;

    // Demander le motif de suppression
    const motif = await customPrompt({
        title: 'Motif de suppression',
        message: 'Veuillez indiquer la raison de la suppression de ce document :',
        placeholder: 'Ex: Document obsolète, doublon, erreur de classement...',
        type: 'textarea',
        rows: 3,
        icon: '📝'
    });

    if (!motif || motif.trim() === '') {
        showNotification('Le motif de suppression est obligatoire', 'error');
        return;
    }

    await apiCall(`/documents/${state.currentUser}/${id}`, 'DELETE', { motif: motif.trim() });
    state.selectedDoc = null;
    await loadData();
    showNotification('✅ Document supprimé');
}

// Verrouiller/Déverrouiller un document ancien système (niveau 1 uniquement)
// @deprecated - Utilisé pour l'ancien système de documents individuels
async function toggleOldDocumentLock(docId) {
    try {
        const result = await apiCall(`/documents/${state.currentUser}/${docId}/toggle-lock`, 'POST');

        if (result.success) {
            // Mettre à jour le document dans l'état
            const doc = state.documents.find(d => (d._id || d.id) === docId);
            if (doc) {
                doc.locked = result.locked;
                doc.lockedBy = result.lockedBy;
            }

            // Mettre à jour le document sélectionné si c'est lui
            if (state.selectedDoc && (state.selectedDoc._id || state.selectedDoc.id) === docId) {
                state.selectedDoc.locked = result.locked;
                state.selectedDoc.lockedBy = result.lockedBy;
            }

            showNotification(result.locked ? '🔒 Document verrouillé' : '🔓 Document déverrouillé');
            render();
        } else {
            showNotification(result.message || 'Erreur lors du verrouillage', 'error');
        }
    } catch (error) {
        Logger.error('Erreur toggleOldDocumentLock:', error);
        showNotification('Erreur lors du verrouillage', 'error');
    }
}

async function deleteAllDocuments() {
    const count = state.documents.length;
    if (count === 0) {
        showNotification('Aucun document à supprimer', 'error');
        return;
    }

    // Message d'avertissement spécifique selon le niveau
    let warningMessage = `⚠️ ATTENTION ⚠️\n\nVous êtes sur le point de supprimer ${count} document(s).\n\n`;

    if (state.currentUserInfo && state.currentUserInfo.niveau === 1) {
        warningMessage += `🏢 VOUS SUPPRIMEZ TOUS LES DOCUMENTS DU DÉPARTEMENT !\n\n`;
    }

    warningMessage += `Cette action enverra les documents à la corbeille.\nLe Super Admin pourra les restaurer si nécessaire.\n\nVoulez-vous continuer ?`;

    if (!confirm(warningMessage)) {
        return;
    }

    state.showDeleteConfirm = true;
    render();
}

async function confirmDeleteAll() {
    Logger.debug('🗑️ Tentative de suppression pour:', state.currentUser);
    Logger.debug('📊 Documents actuels:', state.documents.length);

    // Demander le motif de suppression
    const motif = prompt('Motif de suppression (obligatoire) :', 'Nettoyage de la base de données');

    if (!motif || motif.trim() === '') {
        showNotification('Le motif de suppression est obligatoire', 'error');
        return;
    }

    try {
        const result = await apiCall(`/documents/${state.currentUser}/delete-all`, 'DELETE', { motif: motif.trim() });
        Logger.debug('✅ Réponse du serveur:', result);

        state.showMenu = false;
        state.showDeleteConfirm = false;
        const deletedCount = result.deletedCount || result.count || 0;
        showNotification(`✅ ${deletedCount} document(s) supprimé(s) et envoyé(s) à la corbeille!`);
        await loadData();
    } catch (error) {
        Logger.error('❌ Erreur lors de la suppression:', error);
        showNotification('Erreur suppression', 'error');
        state.showDeleteConfirm = false;
        render();
    }
}

function cancelDeleteAll() {
    state.showDeleteConfirm = false;
    render();
}

// ===== GESTION DES DOSSIERS (NOUVEAU SYSTÈME MULTI-FICHIERS) =====

// Charger les dossiers accessibles
async function loadDossiers(page = null) {
    if (!state.currentUser) return;
    try {
        const currentPage = page || state.dossierPagination.page || 1;
        const limit = state.dossierPagination.limit || 30;

        const params = new URLSearchParams({
            page: currentPage,
            limit: limit
        });

        if (state.searchTerm && state.searchTerm.trim()) {
            params.append('search', state.searchTerm.trim());
        }
        if (state.selectedCategory && state.selectedCategory !== 'tous') {
            params.append('category', state.selectedCategory);
        }

        console.log('[DOSSIERS] API call:', `/dossiers/${state.currentUser}?${params.toString()}`);
        const response = await getDossiers(state.currentUser, {
            page: currentPage,
            limit: limit,
            search: state.searchTerm || '',
            category: state.selectedCategory !== 'tous' ? state.selectedCategory : ''
        });

        state.dossiers = response.dossiers || [];

        state.dossierPagination = {
            page: response.page || 1,
            limit: response.limit || limit,
            total: response.total || 0,
            totalPages: response.totalPages || 1,
            hasNextPage: response.hasNextPage || false,
            hasPrevPage: response.hasPrevPage || false
        };

        Logger.debug(`[DOSSIERS] Page ${state.dossierPagination.page}/${state.dossierPagination.totalPages} - ${state.dossiers.length}/${state.dossierPagination.total} dossiers`);

        render();
    } catch (error) {
        Logger.error('[DOSSIERS] Erreur loadDossiers:', error);
        state.loading = false;
        render();
    }
}

// Créer un nouveau dossier
async function createDossierFromForm() {
    if (!dossierFormData.titre || dossierFormData.titre.trim() === '') {
        showNotification('Le titre est obligatoire', 'error');
        return;
    }
    if (!dossierFormData.categorie) {
        showNotification('La catégorie est obligatoire', 'error');
        return;
    }

    // Le premier document est OBLIGATOIRE
    if (!dossierFormData.fichiers || dossierFormData.fichiers.length === 0) {
        showNotification('Un document est obligatoire pour créer un dossier', 'error');
        return;
    }

    state.loading = true;
    render();

    try {
        // Préparer le premier document (OBLIGATOIRE)
        const file = dossierFormData.fichiers[0];
        const documentData = {
            nomFichier: file.name,
            taille: file.size,
            type: file.type,
            contenu: await fileToBase64(file)
        };

        const result = await createDossier(state.currentUser, {
            titre: dossierFormData.titre.trim(),
            categorie: dossierFormData.categorie,
            date: dossierFormData.date,
            description: dossierFormData.description,
            tags: dossierFormData.tags ? dossierFormData.tags.split(',').map(t => t.trim()) : [],
            departementArchivage: dossierFormData.departementArchivage,
            locked: dossierFormData.locked,
            document: documentData  // Premier document obligatoire
        });

        if (result.success) {
            showNotification('Dossier créé avec succès');
            resetDossierForm();
            state.showDossierUploadForm = false;
            await loadDossiers();
        } else {
            showNotification(result.message || 'Erreur lors de la création', 'error');
        }
    } catch (error) {
        Logger.error('[DOSSIERS] Erreur création:', error);
        showNotification(error.message || 'Erreur lors de la création', 'error');
    } finally {
        state.loading = false;
        render();
    }
}

// Convertir un fichier en Base64
function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

// Réinitialiser le formulaire dossier
function resetDossierForm() {
    dossierFormData = {
        titre: '',
        categorie: '',
        date: new Date().toISOString().split('T')[0],
        departementArchivage: '',
        description: '',
        tags: '',
        locked: false,
        fichiers: []
    };
}

// Sélectionner un dossier pour afficher les détails
async function selectDossier(dossierId) {
    state.loading = true;
    render();

    try {
        const result = await getDossier(state.currentUser, dossierId);
        if (result.success) {
            state.selectedDossier = result.dossier;
            state.showDossierDetail = true;
        } else {
            showNotification(result.message || 'Erreur chargement dossier', 'error');
        }
    } catch (error) {
        if (error.response && error.response.locked) {
            showNotification(`Ce dossier est verrouillé par ${error.response.lockedBy}`, 'warning');
        } else {
            Logger.error('[DOSSIERS] Erreur chargement:', error);
            showNotification('Erreur lors du chargement du dossier', 'error');
        }
    } finally {
        state.loading = false;
        render();
    }
}

// Fermer le détail du dossier
function closeDossierDetail() {
    state.selectedDossier = null;
    state.showDossierDetail = false;
    render();
}

// Ajouter un document à un dossier (handler UI)
async function handleAddDocumentToDossier(dossierId, file) {
    if (!file) return;

    const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50 MB
    if (file.size > MAX_FILE_SIZE) {
        showNotification(`Le fichier dépasse la limite de 50 MB`, 'error');
        return;
    }

    state.loading = true;
    render();

    try {
        const documentData = {
            nomFichier: file.name,
            taille: file.size,
            type: file.type,
            contenu: await fileToBase64(file)
        };

        // Appel API (fonction de api.js)
        const result = await addDocumentToDossier(state.currentUser, dossierId, documentData);

        if (result.success) {
            showNotification('Document ajouté au dossier');
            await selectDossier(dossierId);
        } else {
            showNotification(result.message || 'Erreur ajout document', 'error');
        }
    } catch (error) {
        Logger.error('[DOSSIERS] Erreur ajout document:', error);
        showNotification(error.message || 'Erreur ajout document', 'error');
    } finally {
        state.loading = false;
        render();
    }
}

// Handler pour l'ajout de document depuis l'input
function addDocumentToDossierFromInput(event, dossierId) {
    const file = event.target.files[0];
    if (file) {
        handleAddDocumentToDossier(dossierId, file);
    }
}

// Supprimer un document d'un dossier (handler UI)
async function handleRemoveDocumentFromDossier(dossierId, documentId, documentNom) {
    const confirmed = await customConfirm({
        title: 'Retirer le document',
        message: `Voulez-vous retirer "${documentNom}" du dossier ?`,
        confirmText: 'Oui, retirer',
        cancelText: 'Annuler',
        type: 'warning',
        icon: '📄'
    });

    if (!confirmed) return;

    state.loading = true;
    render();

    try {
        // Appel API (fonction de api.js)
        const result = await removeDocumentFromDossier(state.currentUser, dossierId, documentId);
        if (result.success) {
            showNotification('Document retiré du dossier');
            await selectDossier(dossierId);
        } else {
            showNotification(result.message || 'Erreur suppression document', 'error');
        }
    } catch (error) {
        Logger.error('[DOSSIERS] Erreur suppression document:', error);
        showNotification(error.message || 'Erreur', 'error');
    } finally {
        state.loading = false;
        render();
    }
}

// Verrouiller/Déverrouiller un document
async function toggleDocumentLockAction(dossierId, documentId) {
    state.loading = true;
    render();

    try {
        const result = await toggleDocumentLock(state.currentUser, dossierId, documentId);
        if (result.success) {
            showNotification(result.locked ? 'Document verrouillé' : 'Document déverrouillé');
            await selectDossier(dossierId);
        } else {
            showNotification(result.message || 'Erreur', 'error');
        }
    } catch (error) {
        Logger.error('[DOSSIERS] Erreur verrouillage document:', error);
        showNotification(error.message || 'Erreur', 'error');
    } finally {
        state.loading = false;
        render();
    }
}

// Ouvrir le modal de partage pour un document spécifique
async function openShareDocumentModal(dossierId, documentId, documentNom) {
    // Charger les utilisateurs disponibles pour le partage
    try {
        state.loading = true;
        render();

        // Récupérer les utilisateurs du département
        const usersResult = await apiCall(`/users?departement=${state.currentUserInfo.idDepartement}`);
        if (usersResult.success) {
            state.shareAvailableUsers = usersResult.users.filter(u => u.username !== state.currentUser);
        }

        state.shareSelectedUsers = [];
        state.shareSearchTerm = '';
        state.shareDocumentTarget = { dossierId, documentId, documentNom };
        state.showShareDocumentModal = true;
    } catch (error) {
        Logger.error('[DOSSIERS] Erreur chargement utilisateurs:', error);
        showNotification('Erreur lors du chargement des utilisateurs', 'error');
    } finally {
        state.loading = false;
        render();
    }
}

// Partager un document avec les utilisateurs sélectionnés
async function shareDocumentWithSelectedUsers() {
    if (state.shareSelectedUsers.length === 0) {
        showNotification('Sélectionnez au moins un utilisateur', 'error');
        return;
    }

    const { dossierId, documentId } = state.shareDocumentTarget;

    state.loading = true;
    render();

    try {
        const result = await shareDocumentInDossier(
            state.currentUser,
            dossierId,
            documentId,
            state.shareSelectedUsers
        );

        if (result.success) {
            showNotification(`Document partagé avec ${state.shareSelectedUsers.length} utilisateur(s)`);
            state.showShareDocumentModal = false;
            state.shareDocumentTarget = null;
            await selectDossier(dossierId);
        } else {
            showNotification(result.message || 'Erreur partage', 'error');
        }
    } catch (error) {
        Logger.error('[DOSSIERS] Erreur partage document:', error);
        showNotification(error.message || 'Erreur', 'error');
    } finally {
        state.loading = false;
        render();
    }
}

// Render du modal de partage de document
function renderShareDocumentModal() {
    if (!state.showShareDocumentModal || !state.shareDocumentTarget) return '';

    const { documentNom } = state.shareDocumentTarget;
    const filteredUsers = state.shareAvailableUsers.filter(u =>
        u.nom?.toLowerCase().includes(state.shareSearchTerm.toLowerCase()) ||
        u.username?.toLowerCase().includes(state.shareSearchTerm.toLowerCase())
    );

    return `
        <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
             onclick="state.showShareDocumentModal = false; render();">
            <div class="bg-white rounded-xl shadow-2xl max-w-md w-full max-h-[80vh] overflow-hidden"
                 onclick="event.stopPropagation()">
                <!-- Header -->
                <div class="p-4 border-b bg-gradient-to-r from-green-500 to-green-600">
                    <div class="flex items-center justify-between">
                        <div>
                            <h3 class="text-lg font-bold text-white">📤 Partager le document</h3>
                            <p class="text-green-100 text-sm truncate">${documentNom}</p>
                        </div>
                        <button onclick="state.showShareDocumentModal = false; render();"
                                class="text-white hover:bg-white/20 rounded-full p-1">
                            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                            </svg>
                        </button>
                    </div>
                </div>

                <!-- Search -->
                <div class="p-4 border-b">
                    <input type="text"
                           placeholder="🔍 Rechercher un utilisateur..."
                           value="${state.shareSearchTerm}"
                           oninput="state.shareSearchTerm = this.value; render();"
                           class="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500" />
                </div>

                <!-- User list -->
                <div class="p-4 overflow-y-auto" style="max-height: 300px;">
                    ${filteredUsers.length > 0 ? filteredUsers.map(user => {
                        const isSelected = state.shareSelectedUsers.includes(user.username);
                        return `
                            <div class="flex items-center gap-3 p-2 rounded hover:bg-gray-100 cursor-pointer ${isSelected ? 'bg-green-50 border border-green-200' : ''}"
                                 onclick="toggleShareUser('${user.username}')">
                                <input type="checkbox" ${isSelected ? 'checked' : ''} class="pointer-events-none" />
                                <div class="flex-1">
                                    <div class="font-medium">${user.nom || user.username}</div>
                                    <div class="text-xs text-gray-500">${user.username}</div>
                                </div>
                            </div>
                        `;
                    }).join('') : `
                        <div class="text-center text-gray-500 py-4">
                            Aucun utilisateur trouvé
                        </div>
                    `}
                </div>

                <!-- Footer -->
                <div class="p-4 border-t bg-gray-50 flex justify-between items-center">
                    <span class="text-sm text-gray-600">
                        ${state.shareSelectedUsers.length} sélectionné(s)
                    </span>
                    <div class="flex gap-2">
                        <button onclick="state.showShareDocumentModal = false; render();"
                                class="px-4 py-2 border rounded-lg hover:bg-gray-100">
                            Annuler
                        </button>
                        <button onclick="shareDocumentWithSelectedUsers()"
                                class="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50"
                                ${state.shareSelectedUsers.length === 0 ? 'disabled' : ''}>
                            Partager
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
}

// Toggle user selection for sharing
function toggleShareUser(username) {
    const index = state.shareSelectedUsers.indexOf(username);
    if (index === -1) {
        state.shareSelectedUsers.push(username);
    } else {
        state.shareSelectedUsers.splice(index, 1);
    }
    render();
}

// Alias pour rétrocompatibilité
async function addFileToDossier(dossierId, file) {
    return handleAddDocumentToDossier(dossierId, file);
}

async function removeFileFromDossier(dossierId, fichierId, fichierNom) {
    return handleRemoveDocumentFromDossier(dossierId, fichierId, fichierNom);
}

// Télécharger un document d'un dossier
async function downloadDossierFile(dossierId, documentId) {
    state.loading = true;
    render();

    try {
        // Utilise l'API downloadDocumentFromDossier (retourne result.document)
        const result = await downloadDocumentFromDossier(state.currentUser, dossierId, documentId);

        // Supporte les deux formats: document (nouveau) ou fichier (ancien)
        const doc = result.document || result.fichier;

        if (result.success && doc) {
            // Créer un lien de téléchargement
            const link = document.createElement('a');
            link.href = doc.contenu;
            link.download = doc.nomOriginal || doc.nom;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            showNotification('Téléchargement démarré');
        } else {
            showNotification(result.message || 'Erreur téléchargement', 'error');
        }
    } catch (error) {
        Logger.error('[DOSSIERS] Erreur téléchargement:', error);
        showNotification(error.message || 'Erreur lors du téléchargement', 'error');
    } finally {
        state.loading = false;
        render();
    }
}

// Télécharger tout le dossier en ZIP
function downloadDossierAsZip(dossierId) {
    const url = getDownloadAllZipUrl(state.currentUser, dossierId);
    window.open(url, '_blank');
    showNotification('Téléchargement ZIP démarré');
}

// Prévisualiser un document
async function previewDocument(dossierId, documentId, documentNom, documentType) {
    state.loading = true;
    render();

    try {
        // Récupérer le document pour la prévisualisation (enregistre DOCUMENT_CONSULTED)
        const result = await consultDocumentFromDossier(state.currentUser, dossierId, documentId);
        const doc = result.document || result.fichier;

        if (result.success && doc) {
            // La consultation est enregistrée automatiquement avec l'action DOCUMENT_CONSULTED

            // Stocker les infos pour le modal
            state.previewDocument = {
                nom: documentNom,
                type: documentType || doc.type,
                contenu: doc.contenu,
                dossierId,
                documentId
            };
            state.showPreviewModal = true;
        } else {
            showNotification(result.message || 'Erreur lors de la récupération', 'error');
        }
    } catch (error) {
        Logger.error('[DOSSIERS] Erreur prévisualisation:', error);
        showNotification(error.message || 'Erreur lors de la prévisualisation', 'error');
    } finally {
        state.loading = false;
        render();
    }
}

// Fermer le modal de prévisualisation
function closePreviewModal() {
    state.showPreviewModal = false;
    state.previewDocument = null;
    render();
}

// Afficher l'historique/traçabilité d'un document (20 dernières actions)
async function showDocumentHistory(dossierId, documentId, documentNom) {
    try {
        state.loading = true;
        render();

        // Appel API pour récupérer l'historique du document
        const response = await fetch(`/api/dossiers/${dossierId}/documents/${documentId}/history?limit=20`, {
            credentials: 'include'
        });

        const result = await response.json();

        if (result.success) {
            const history = result.history || [];

            // Créer le contenu du modal
            let historyHtml = '';
            if (history.length === 0) {
                historyHtml = '<p class="text-gray-500 text-center py-4">Aucun historique disponible pour ce document.</p>';
            } else {
                historyHtml = history.map(item => {
                    const date = new Date(item.timestamp || item.date).toLocaleString('fr-FR');
                    const actionLabel = getActionLabel(item.action);
                    const actionColor = getActionColor(item.action);
                    return `
                        <div class="flex items-start gap-3 p-3 border-b border-gray-100 hover:bg-gray-50">
                            <span class="text-2xl">${actionLabel.icon}</span>
                            <div class="flex-1">
                                <div class="flex items-center gap-2 flex-wrap">
                                    <span class="px-2 py-1 rounded text-xs font-medium text-white" style="background: ${actionColor}">
                                        ${actionLabel.text}
                                    </span>
                                    <span class="text-xs text-gray-500">${date}</span>
                                </div>
                                <p class="text-sm text-gray-700 mt-1">
                                    👤 <strong>${item.user || item.utilisateur || 'Système'}</strong>
                                    ${item.details ? ` - ${item.details}` : ''}
                                </p>
                                ${item.ip ? `<p class="text-xs text-gray-400">IP: ${item.ip}</p>` : ''}
                            </div>
                        </div>
                    `;
                }).join('');
            }

            // Afficher le modal
            const modalHtml = `
                <div id="historyModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onclick="closeHistoryModal()">
                    <div class="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden" onclick="event.stopPropagation()">
                        <div class="p-4 border-b bg-gradient-to-r from-orange-500 to-amber-500 text-white flex items-center justify-between">
                            <div>
                                <h2 class="text-lg font-bold">📜 Historique du document</h2>
                                <p class="text-sm opacity-90">${documentNom}</p>
                            </div>
                            <button onclick="closeHistoryModal()" class="text-white hover:text-gray-200 text-2xl">&times;</button>
                        </div>
                        <div class="overflow-y-auto" style="max-height: calc(80vh - 100px)">
                            ${historyHtml}
                        </div>
                        <div class="p-3 border-t bg-gray-50 text-center">
                            <span class="text-xs text-gray-500">20 dernières actions affichées</span>
                        </div>
                    </div>
                </div>
            `;

            // Ajouter le modal au DOM
            const existingModal = document.getElementById('historyModal');
            if (existingModal) existingModal.remove();
            document.body.insertAdjacentHTML('beforeend', modalHtml);

        } else {
            showNotification(result.message || 'Erreur lors de la récupération de l\'historique', 'error');
        }
    } catch (error) {
        Logger.error('[HISTORY] Erreur:', error);
        showNotification('Erreur lors de la récupération de l\'historique', 'error');
    } finally {
        state.loading = false;
        render();
    }
}

// Fermer le modal d'historique
function closeHistoryModal() {
    const modal = document.getElementById('historyModal');
    if (modal) modal.remove();
}

// Obtenir le libellé d'une action
function getActionLabel(action) {
    const labels = {
        'DOCUMENT_CREATED': { text: 'Création', icon: '📄' },
        'DOCUMENT_UPLOADED': { text: 'Ajout', icon: '📤' },
        'DOCUMENT_CONSULTED': { text: 'Consultation', icon: '👁️' },
        'DOCUMENT_DOWNLOADED': { text: 'Téléchargement', icon: '📥' },
        'DOCUMENT_SHARED': { text: 'Partage', icon: '🔗' },
        'DOCUMENT_UNSHARED': { text: 'Retrait partage', icon: '🔓' },
        'DOCUMENT_LOCKED': { text: 'Verrouillage', icon: '🔒' },
        'DOCUMENT_UNLOCKED': { text: 'Déverrouillage', icon: '🔓' },
        'DOCUMENT_UPDATED': { text: 'Modification', icon: '✏️' },
        'DOCUMENT_DELETED': { text: 'Suppression', icon: '🗑️' },
        'DOCUMENT_RESTORED': { text: 'Restauration', icon: '♻️' },
        'DOCUMENT_RENAMED': { text: 'Renommage', icon: '✍️' },
        'DOSSIER_CREATED': { text: 'Dossier créé', icon: '📁' },
        'DOSSIER_DOWNLOADED': { text: 'Dossier téléchargé', icon: '📦' }
    };
    return labels[action] || { text: action || 'Action', icon: '📋' };
}

// Obtenir la couleur d'une action
function getActionColor(action) {
    const colors = {
        'DOCUMENT_CREATED': '#22c55e',
        'DOCUMENT_UPLOADED': '#22c55e',
        'DOCUMENT_CONSULTED': '#8b5cf6',
        'DOCUMENT_DOWNLOADED': '#3b82f6',
        'DOCUMENT_SHARED': '#06b6d4',
        'DOCUMENT_UNSHARED': '#f59e0b',
        'DOCUMENT_LOCKED': '#ef4444',
        'DOCUMENT_UNLOCKED': '#22c55e',
        'DOCUMENT_UPDATED': '#f59e0b',
        'DOCUMENT_DELETED': '#ef4444',
        'DOCUMENT_RESTORED': '#22c55e',
        'DOCUMENT_RENAMED': '#8b5cf6',
        'DOSSIER_CREATED': '#22c55e',
        'DOSSIER_DOWNLOADED': '#3b82f6'
    };
    return colors[action] || '#6b7280';
}

// Render du modal de prévisualisation
function renderPreviewModal() {
    if (!state.showPreviewModal || !state.previewDocument) return '';

    const doc = state.previewDocument;
    const isImage = doc.type && doc.type.startsWith('image/');
    const isPdf = doc.type && doc.type.includes('pdf');
    const isText = doc.type && (doc.type.includes('text') || doc.type.includes('json') || doc.type.includes('xml'));

    let previewContent = '';

    if (isImage) {
        previewContent = `<img src="${doc.contenu}" alt="${doc.nom}" class="max-w-full max-h-full object-contain" />`;
    } else if (isPdf) {
        previewContent = `<iframe src="${doc.contenu}" class="w-full h-full border-0" title="${doc.nom}"></iframe>`;
    } else if (isText) {
        // Pour les fichiers texte, on les décode en base64
        try {
            const base64Content = doc.contenu.split(',')[1];
            const textContent = atob(base64Content);
            previewContent = `<pre class="p-4 bg-gray-100 rounded overflow-auto text-sm h-full whitespace-pre-wrap">${escapeHtml(textContent)}</pre>`;
        } catch (e) {
            previewContent = `<div class="text-center text-gray-500 py-20">Impossible de prévisualiser ce fichier texte</div>`;
        }
    } else {
        previewContent = `
            <div class="text-center py-20">
                <div class="text-6xl mb-4">${getFileIcon(doc.type, doc.nom)}</div>
                <p class="text-gray-600 mb-4">Prévisualisation non disponible pour ce type de fichier</p>
                <p class="text-sm text-gray-500">${doc.type || 'Type inconnu'}</p>
                <button onclick="downloadDossierFile('${doc.dossierId}', '${doc.documentId}')"
                        class="mt-4 px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600">
                    📥 Télécharger pour ouvrir
                </button>
            </div>
        `;
    }

    return `
        <div class="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50"
             onclick="closePreviewModal()">
            <div class="bg-white rounded-xl shadow-2xl w-[95vw] h-[90vh] max-w-6xl flex flex-col overflow-hidden"
                 onclick="event.stopPropagation()">
                <!-- Header -->
                <div class="p-4 border-b bg-gradient-to-r from-purple-500 to-indigo-600 flex items-center justify-between">
                    <div class="flex items-center gap-3 text-white">
                        <span class="text-2xl">${getFileIcon(doc.type, doc.nom)}</span>
                        <div>
                            <h3 class="font-bold truncate max-w-md">${doc.nom}</h3>
                            <p class="text-xs text-purple-200">${doc.type || 'Type inconnu'}</p>
                        </div>
                    </div>
                    <div class="flex items-center gap-2">
                        <button onclick="downloadDossierFile('${doc.dossierId}', '${doc.documentId}')"
                                class="px-4 py-2 bg-white/20 text-white rounded-lg hover:bg-white/30 transition">
                            📥 Télécharger
                        </button>
                        <button onclick="closePreviewModal()"
                                class="p-2 bg-white/20 text-white rounded-lg hover:bg-white/30 transition">
                            ✕
                        </button>
                    </div>
                </div>

                <!-- Content -->
                <div class="flex-1 overflow-auto p-4 bg-gray-50 flex items-center justify-center">
                    ${previewContent}
                </div>
            </div>
        </div>
    `;
}

// Supprimer un dossier
async function deleteDossierConfirm(dossierId, titre) {
    const confirmed = await customConfirm({
        title: 'Supprimer le dossier',
        message: `Voulez-vous vraiment supprimer le dossier "${titre}" ?`,
        confirmText: 'Oui, supprimer',
        cancelText: 'Annuler',
        type: 'danger',
        icon: '🗑️'
    });

    if (!confirmed) return;

    const motif = await customPrompt({
        title: 'Motif de suppression',
        message: 'Veuillez indiquer la raison de la suppression :',
        placeholder: 'Ex: Dossier obsolète, doublon...',
        type: 'textarea',
        rows: 3,
        icon: '📝'
    });

    if (!motif || motif.trim() === '') {
        showNotification('Le motif est obligatoire', 'error');
        return;
    }

    state.loading = true;
    render();

    try {
        const result = await deleteDossier(state.currentUser, dossierId, motif.trim());
        if (result.success) {
            showNotification('Dossier supprimé');
            state.selectedDossier = null;
            state.showDossierDetail = false;
            await loadDossiers();
        } else {
            showNotification(result.message || 'Erreur suppression', 'error');
        }
    } catch (error) {
        Logger.error('[DOSSIERS] Erreur suppression:', error);
        showNotification(error.message || 'Erreur', 'error');
    } finally {
        state.loading = false;
        render();
    }
}

// Renommer un dossier
async function openRenameDossierModal(dossierId, titreActuel) {
    const nouveauTitre = await customPrompt({
        title: 'Renommer le dossier',
        message: 'Entrez le nouveau nom du dossier :',
        placeholder: titreActuel,
        defaultValue: titreActuel,
        type: 'input',
        icon: '✏️'
    });

    if (!nouveauTitre || nouveauTitre.trim() === '' || nouveauTitre.trim() === titreActuel) {
        return;
    }

    state.loading = true;
    render();

    try {
        const result = await apiCall(`/dossiers/${state.currentUser}/${dossierId}/rename`, 'PUT', {
            nouveauTitre: nouveauTitre.trim()
        });

        if (result.success) {
            showNotification(`✅ Dossier renommé : "${titreActuel}" → "${nouveauTitre.trim()}"`);
            if (state.selectedDossier && state.selectedDossier.idDossier === dossierId) {
                state.selectedDossier.titre = nouveauTitre.trim();
            }
            await loadDossiers();
        } else {
            showNotification(result.message || 'Erreur lors du renommage', 'error');
        }
    } catch (error) {
        Logger.error('[DOSSIERS] Erreur renommage:', error);
        showNotification(error.message || 'Erreur', 'error');
    } finally {
        state.loading = false;
        render();
    }
}

// Verrouiller/Déverrouiller un dossier
async function toggleDossierLockAction(dossierId) {
    state.loading = true;
    render();

    try {
        // Appel API pour verrouiller/déverrouiller le dossier
        const result = await toggleDossierLock(state.currentUser, dossierId);
        if (result.success) {
            showNotification(result.locked ? 'Dossier verrouillé' : 'Dossier déverrouillé');
            if (state.selectedDossier && state.selectedDossier.idDossier === dossierId) {
                state.selectedDossier.locked = result.locked;
            }
            await loadDossiers();
        } else {
            showNotification(result.message || 'Erreur', 'error');
        }
    } catch (error) {
        Logger.error('[DOSSIERS] Erreur verrouillage:', error);
        showNotification(error.message || 'Erreur', 'error');
    } finally {
        state.loading = false;
        render();
    }
}

// Partager un dossier
async function shareDossierWithUsers(dossierId, usernames) {
    if (!usernames || usernames.length === 0) {
        showNotification('Sélectionnez au moins un utilisateur', 'error');
        return;
    }

    state.loading = true;
    render();

    try {
        const result = await shareDossier(state.currentUser, dossierId, usernames);
        if (result.success) {
            showNotification(result.message || 'Dossier partagé');
            await selectDossier(dossierId);
        } else {
            showNotification(result.message || 'Erreur partage', 'error');
        }
    } catch (error) {
        Logger.error('[DOSSIERS] Erreur partage:', error);
        showNotification(error.message || 'Erreur', 'error');
    } finally {
        state.loading = false;
        render();
    }
}

// Formater la taille de fichier
function formatFileSize(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

// Obtenir l'icône selon le type de fichier
function getFileIcon(type, nom) {
    const ext = (nom || '').toLowerCase().split('.').pop();
    const iconMap = {
        'pdf': '📕',
        'doc': '📘', 'docx': '📘',
        'xls': '📗', 'xlsx': '📗',
        'ppt': '📙', 'pptx': '📙',
        'jpg': '🖼️', 'jpeg': '🖼️', 'png': '🖼️', 'gif': '🖼️', 'webp': '🖼️',
        'zip': '📦', 'rar': '📦',
        'txt': '📄',
        'csv': '📊'
    };
    return iconMap[ext] || '📄';
}

// Rendre une carte dossier
function renderDossierCard(dossier) {
    const cat = state.categories.find(c => c.id === dossier.categorie) || { nom: dossier.categorie, couleur: '#3b82f6', icon: '📁' };
    const locked = dossier.locked ? '🔒' : '';
    const shared = (dossier.sharedWith && dossier.sharedWith.length > 0) ? '👥' : '';
    const serviceName = dossier.serviceArchivage || dossier.service || '';
    const deptName = dossier.departementArchivage || dossier.departement || '';
    const dateCreation = dossier.createdAt ? new Date(dossier.createdAt).toLocaleDateString('fr-FR') : '';

    return `
        <div class="bg-white rounded-lg shadow-sm p-4 cursor-pointer hover:shadow-lg transition-shadow border-l-4"
             style="border-left: 4px solid ${cat.couleur}"
             onclick="selectDossier('${dossier.idDossier || dossier._id}')">

            <!-- Titre et icônes -->
            <div class="flex items-center gap-2 mb-2">
                <span class="text-xl">${cat.icon || '📁'}</span>
                <h3 class="font-semibold text-gray-800 truncate flex-1">${dossier.titre}</h3>
                <span class="flex gap-1">${locked}${shared}</span>
            </div>

            <!-- ID du dossier -->
            <div class="flex items-center gap-2 mb-2 text-xs">
                <span class="text-gray-500 font-mono bg-gray-100 px-2 py-1 rounded">
                    🆔 ${dossier.idDossier || dossier._id}
                </span>
                <button onclick="event.stopPropagation(); copyToClipboard('${dossier.idDossier}')"
                        class="px-2 py-1 bg-blue-100 hover:bg-blue-200 rounded text-blue-600"
                        title="Copier l'ID">
                    📋
                </button>
            </div>

            <!-- Catégorie -->
            <div class="flex items-center gap-2 mb-2">
                <span class="text-xs text-gray-500">📂 Catégorie:</span>
                <span class="px-2 py-1 rounded text-white text-xs font-medium" style="background: ${cat.couleur}">
                    ${cat.nom}
                </span>
            </div>

            <!-- Service et Département -->
            <div class="flex items-center gap-2 mb-2 text-xs text-gray-600">
                ${serviceName ? `<span class="bg-green-100 text-green-700 px-2 py-1 rounded">🏢 ${serviceName}</span>` : ''}
                ${deptName ? `<span class="bg-purple-100 text-purple-700 px-2 py-1 rounded">🏛️ ${deptName}</span>` : ''}
            </div>

            <!-- Nombre de fichiers et date -->
            <div class="flex items-center justify-between text-xs text-gray-500 pt-2 border-t border-gray-100">
                <span class="font-medium">📄 ${dossier.nombreFichiers || dossier.nombreDocuments || 0} fichier(s)</span>
                ${dateCreation ? `<span>📅 ${dateCreation}</span>` : ''}
            </div>
        </div>
    `;
}

// Rendre le détail d'un dossier (modal)
function renderDossierDetailModal() {
    if (!state.showDossierDetail || !state.selectedDossier) return '';

    const d = state.selectedDossier;
    const cat = state.categories.find(c => c.id === d.categorie) || { nom: d.categorie, couleur: '#3b82f6', icon: '📁' };
    const canEdit = state.currentUserInfo && state.currentUserInfo.niveau === 1;
    const canShare = state.currentUserInfo && (state.currentUserInfo.niveau === 1 || state.currentUserInfo.niveau === 2);
    const userNiveau = state.currentUserInfo ? state.currentUserInfo.niveau : 3;

    // Documents (ou fichiers pour rétrocompatibilité)
    const documentsArray = d.documents || d.fichiers || [];
    const nombreDocuments = d.nombreDocuments || d.nombreFichiers || documentsArray.length;

    let documentsHtml = '';
    if (documentsArray.length > 0) {
        documentsHtml = documentsArray.map(doc => {
            const docId = doc.idDocument || doc.id;
            const docName = doc.nomOriginal || doc.nom;
            const docLocked = doc.locked || false;
            const docSharedWith = doc.sharedWith || [];

            // Afficher l'ID du document de façon lisible
            let docIdDisplay = '';
            if (docId) {
                if (docId.startsWith('DOC-')) {
                    // Nouveau format: DOC-YYYYMMDD-HHMMSSTTT-RRRR.DXXXX
                    docIdDisplay = docId;
                } else {
                    docIdDisplay = docId;
                }
            }

            // Afficher la traçabilité du document
            let archiveInfo = '';
            if (doc.archivePar) {
                archiveInfo = `
                    <div class="text-xs text-gray-400">
                        👤 ${doc.archivePar.nomComplet || doc.archivePar.utilisateur}
                        ${doc.archivePar.dateArchivage ? ' • ' + new Date(doc.archivePar.dateArchivage).toLocaleDateString('fr-FR') : ''}
                    </div>
                `;
            }

            return `
            <div class="p-3 bg-white border rounded-lg mb-2 shadow-sm hover:shadow-md transition ${docLocked ? 'border-l-4 border-red-500' : 'border-gray-200'}">
                <!-- Ligne supérieure: icône, nom, statuts -->
                <div class="flex items-center gap-2 mb-2">
                    <span class="text-2xl">${getFileIcon(doc.type, doc.nom)}</span>
                    <div class="flex-1 min-w-0">
                        <div class="font-medium text-gray-800 truncate text-sm">${docName}</div>
                        <div class="text-xs text-gray-500 flex items-center gap-2 flex-wrap">
                            ${(doc.categorie || d.categorie) ? `<span class="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full">${doc.categorie || cat.nom}</span>` : ''}
                            <span>📦 ${formatFileSize(doc.taille || 0)}</span>
                            ${docLocked ? '<span class="text-red-500">🔒</span>' : ''}
                            ${docSharedWith.length > 0 ? `<span class="text-blue-500">👥${docSharedWith.length}</span>` : ''}
                            ${doc.historiqueTelechargements && doc.historiqueTelechargements.length > 0 ? `<span class="text-green-600">📥${doc.historiqueTelechargements.length}</span>` : ''}
                        </div>
                        ${archiveInfo}
                    </div>
                    <!-- Bouton copie ID -->
                    ${docIdDisplay ? `
                        <button onclick="event.stopPropagation(); copyToClipboard('${docIdDisplay}')"
                                class="px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded text-xs"
                                title="${docIdDisplay}">
                            📋
                        </button>
                    ` : ''}
                </div>

                <!-- Boutons d'actions avec libellés -->
                <div class="flex gap-2 flex-wrap">
                    <button onclick="event.stopPropagation(); previewDocument('${d.idDossier}', '${docId}', '${docName}', '${doc.type || ''}')"
                            class="px-3 py-1.5 bg-purple-500 text-white rounded-lg text-xs hover:bg-purple-600 font-medium flex items-center gap-1">
                        👁️ Consulter
                    </button>
                    <button onclick="event.stopPropagation(); downloadDossierFile('${d.idDossier}', '${docId}')"
                            class="px-3 py-1.5 bg-blue-500 text-white rounded-lg text-xs hover:bg-blue-600 font-medium flex items-center gap-1">
                        📥 Télécharger
                    </button>
                    ${canShare ? `<button onclick="event.stopPropagation(); openShareDocumentModal('${d.idDossier}', '${docId}', '${docName}')"
                            class="px-3 py-1.5 bg-green-500 text-white rounded-lg text-xs hover:bg-green-600 font-medium flex items-center gap-1">
                        📤 Partager
                    </button>` : ''}
                    <button onclick="event.stopPropagation(); showDocumentHistory('${d.idDossier}', '${docId}', '${docName}')"
                            class="px-3 py-1.5 bg-orange-500 text-white rounded-lg text-xs hover:bg-orange-600 font-medium flex items-center gap-1">
                        📜 Historique
                    </button>
                    ${canEdit ? `<button onclick="event.stopPropagation(); toggleDocumentLockAction('${d.idDossier}', '${docId}')"
                            class="px-3 py-1.5 ${docLocked ? 'bg-yellow-500' : 'bg-gray-500'} text-white rounded-lg text-xs hover:opacity-90 font-medium flex items-center gap-1">
                        ${docLocked ? '🔓 Déverrouiller' : '🔒 Verrouiller'}
                    </button>` : ''}
                    ${canEdit ? `<button onclick="event.stopPropagation(); handleRemoveDocumentFromDossier('${d.idDossier}', '${docId}', '${docName}')"
                            class="px-3 py-1.5 bg-red-500 text-white rounded-lg text-xs hover:bg-red-600 font-medium flex items-center gap-1">
                        🗑️ Supprimer
                    </button>` : ''}
                </div>
            </div>
        `;
        }).join('');
    } else {
        documentsHtml = '<div class="text-center text-gray-500 py-4">Aucun document dans ce dossier</div>';
    }

    // Bouton ajouter document (niveau 1 uniquement)
    // Plus de limite de 10 documents - les limites sont gérées côté serveur
    const addDocumentBtn = canEdit ? `
        <div class="mt-4">
            <label class="cursor-pointer inline-flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">
                <span>➕ Ajouter un document</span>
                <input type="file" class="hidden" onchange="addDocumentToDossierFromInput(event, '${d.idDossier}')" />
            </label>
            <span class="text-sm text-gray-500 ml-2">(${nombreDocuments} documents)</span>
        </div>
    ` : '';

    // Traçabilité simplifiée: seulement date création et verrouilleur si verrouillé
    let tracabiliteHtml = '';
    if (d.archivePar || d.locked) {
        tracabiliteHtml = `
            <div class="text-sm text-gray-600 space-y-1">
                ${d.archivePar ? `<p>📤 Créé par <strong>${d.archivePar.nomComplet || d.archivePar.utilisateur}</strong> le ${new Date(d.archivePar.dateArchivage || d.createdAt).toLocaleString('fr-FR')}</p>` : ''}
                ${d.locked && d.lockedBy ? `<p>🔒 Verrouillé par <strong>${d.lockedByName || d.lockedBy}</strong>${d.lockedAt ? ' le ' + new Date(d.lockedAt).toLocaleString('fr-FR') : ''}</p>` : ''}
            </div>
        `;
    }

    return `
        <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onclick="closeDossierDetail()">
            <div class="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden" onclick="event.stopPropagation()">
                <!-- Header -->
                <div class="p-6 border-b flex items-center justify-between" style="background: linear-gradient(135deg, ${cat.couleur}22, ${cat.couleur}11)">
                    <div class="flex items-center gap-4">
                        <span class="text-4xl">${cat.icon || '📁'}</span>
                        <div>
                            <h2 class="text-xl font-bold text-gray-800">${d.titre}</h2>
                            <span class="inline-block px-2 py-1 rounded text-xs text-white mt-1" style="background: ${cat.couleur}">${cat.nom}</span>
                            ${d.locked ? '<span class="ml-2 text-red-500">🔒 Verrouillé</span>' : ''}
                        </div>
                    </div>
                    <button onclick="closeDossierDetail()" class="text-gray-500 hover:text-gray-800 text-2xl">&times;</button>
                </div>

                <!-- Content -->
                <div class="p-6 overflow-y-auto" style="max-height: calc(90vh - 200px)">
                    <!-- Documents -->
                    <div class="mb-6">
                        <h3 class="text-lg font-semibold mb-3 flex items-center gap-2">
                            📄 Documents (${nombreDocuments})
                            <span class="text-sm font-normal text-gray-500">- ${formatFileSize(d.tailleTotale || 0)} total</span>
                        </h3>
                        ${documentsHtml}
                        ${addDocumentBtn}
                    </div>

                    <!-- Informations du Dossier -->
                    <div class="mb-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
                        <h3 class="text-lg font-semibold mb-3">ℹ️ Informations du Dossier</h3>

                        <!-- ID du Dossier (affiché en évidence) avec bouton copie -->
                        <div class="bg-white px-4 py-3 rounded-lg mb-4 border border-blue-300">
                            <div class="text-xs text-gray-500 uppercase font-semibold mb-1">ID Dossier</div>
                            <div class="flex items-center gap-2">
                                <div class="font-mono text-lg text-blue-700 break-all flex-1">${d.idDossier}</div>
                                <button onclick="event.stopPropagation(); copyToClipboard('${d.idDossier}')"
                                        class="px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded text-sm"
                                        title="Copier l'ID">
                                    📋 Copier
                                </button>
                            </div>
                        </div>

                        <div class="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                            <div><span class="text-gray-500">📅 Date:</span> ${d.date}</div>
                            <div><span class="text-gray-500">🏢 Département:</span> ${d.departementArchivage || 'Non défini'}</div>
                            <div><span class="text-gray-500">📄 Documents:</span> ${nombreDocuments}</div>
                            ${d.serviceArchivage ? `<div><span class="text-gray-500">🏭 Service:</span> ${d.serviceArchivage}</div>` : ''}
                            <div><span class="text-gray-500">📦 Taille:</span> ${formatFileSize(d.tailleTotale || 0)}</div>
                            ${d.description ? `<div class="col-span-full"><span class="text-gray-500">📝 Description:</span> ${d.description}</div>` : ''}
                            ${d.tags && d.tags.length > 0 ? `<div class="col-span-full"><span class="text-gray-500">🏷️ Tags:</span> ${d.tags.join(', ')}</div>` : ''}
                        </div>
                    </div>

                    <!-- Traçabilité simplifiée -->
                    ${tracabiliteHtml ? `
                    <div class="mb-6 p-4 bg-gray-50 rounded-lg">
                        <h3 class="text-sm font-semibold text-gray-600 mb-2">📊 Traçabilité</h3>
                        ${tracabiliteHtml}
                    </div>
                    ` : ''}
                </div>

                <!-- Actions -->
                <div class="p-4 border-t bg-gray-50 flex flex-wrap gap-2 justify-between">
                    <div class="flex gap-2 flex-wrap">
                        <button onclick="downloadDossierAsZip('${d.idDossier}')" class="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600">
                            📥 Télécharger tout (ZIP)
                        </button>
                        ${canEdit ? `
                            <button onclick="openRenameDossierModal('${d.idDossier}', '${escapeHtml(d.titre)}')" class="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">
                                ✏️ Renommer
                            </button>
                            <button onclick="toggleDossierLockAction('${d.idDossier}')" class="px-4 py-2 ${d.locked ? 'bg-yellow-500' : 'bg-gray-500'} text-white rounded hover:opacity-90">
                                ${d.locked ? '🔓 Déverrouiller' : '🔒 Verrouiller'}
                            </button>
                        ` : ''}
                    </div>
                    <div class="flex gap-2">
                        ${canEdit ? `
                            <button onclick="deleteDossierConfirm('${d.idDossier}', '${escapeHtml(d.titre)}')" class="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600">
                                🗑️ Supprimer
                            </button>
                        ` : ''}
                        <button onclick="closeDossierDetail()" class="px-4 py-2 bg-gray-300 text-gray-800 rounded hover:bg-gray-400">
                            Fermer
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
}

// Handler pour l'ajout de fichier depuis l'input
function addFileToDossierFromInput(event, dossierId) {
    const file = event.target.files[0];
    if (file) {
        addFileToDossier(dossierId, file);
    }
}

// Formulaire création dossier
function renderDossierUploadForm() {
    if (!state.showDossierUploadForm) return '';

    // Récupérer les services pour niveaux 1, 2 et 3
    const userServices = state.currentUserInfo && [1, 2, 3].includes(state.currentUserInfo.niveau)
        ? state.services.filter(s => s.idDepartement?.toString() === state.currentUserInfo.idDepartement?.toString())
        : [];

    return `
        <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onclick="state.showDossierUploadForm = false; render();">
            <div class="bg-white rounded-xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto" onclick="event.stopPropagation()">
                <div class="p-6 border-b">
                    <h2 class="text-xl font-bold">📁 Créer un nouveau dossier</h2>
                </div>

                <div class="p-6 space-y-4">
                    <!-- Titre -->
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">Titre *</label>
                        <input type="text" id="dossier_titre"
                               value="${dossierFormData.titre}"
                               onchange="dossierFormData.titre = this.value"
                               class="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                               placeholder="Titre du dossier" />
                    </div>

                    <!-- Catégorie -->
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">Catégorie *</label>
                        <select id="dossier_categorie"
                                onchange="dossierFormData.categorie = this.value"
                                class="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500">
                            <option value="">-- Choisir --</option>
                            ${state.categories.map(c => `<option value="${c.id}" ${dossierFormData.categorie === c.id ? 'selected' : ''}>${c.icon || ''} ${c.nom}</option>`).join('')}
                        </select>
                    </div>

                    <!-- Date -->
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">Date du dossier</label>
                        <input type="date" id="dossier_date"
                               value="${dossierFormData.date}"
                               onchange="dossierFormData.date = this.value"
                               class="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" />
                    </div>

                    <!-- Service d'archivage (si niveau 1) -->
                    ${userServices.length > 0 ? `
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-1">Service d'archivage</label>
                            <select id="dossier_service"
                                    onchange="dossierFormData.departementArchivage = this.value"
                                    class="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500">
                                <option value="">-- Département (aucun service) --</option>
                                ${userServices.map(s => `<option value="${s._id}" ${dossierFormData.departementArchivage === s._id ? 'selected' : ''}>${s.nom}</option>`).join('')}
                            </select>
                        </div>
                    ` : ''}

                    <!-- Description -->
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">Description</label>
                        <textarea id="dossier_description"
                                  onchange="dossierFormData.description = this.value"
                                  class="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                                  rows="3" placeholder="Description optionnelle">${dossierFormData.description}</textarea>
                    </div>

                    <!-- Tags -->
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">Tags (séparés par virgule)</label>
                        <input type="text" id="dossier_tags"
                               value="${dossierFormData.tags}"
                               onchange="dossierFormData.tags = this.value"
                               class="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                               placeholder="tag1, tag2, tag3" />
                    </div>

                    <!-- Premier document (OBLIGATOIRE) -->
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">
                            📄 Premier document * <span class="text-red-500">(obligatoire)</span>
                        </label>
                        <input type="file" id="dossier_fichier" required
                               onchange="dossierFormData.fichiers = Array.from(this.files)"
                               class="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 border-red-300" />
                        <p class="text-xs text-gray-500 mt-1">
                            Un dossier doit contenir au moins un document. Max 50 MB par fichier.
                        </p>
                    </div>

                    <!-- Verrouillage -->
                    ${state.currentUserInfo && state.currentUserInfo.niveau === 1 ? `
                        <div class="flex items-center gap-2">
                            <input type="checkbox" id="dossier_locked"
                                   ${dossierFormData.locked ? 'checked' : ''}
                                   onchange="dossierFormData.locked = this.checked" />
                            <label for="dossier_locked" class="text-sm text-gray-700">🔒 Verrouiller le dossier</label>
                        </div>
                    ` : ''}
                </div>

                <div class="p-4 border-t bg-gray-50 flex gap-2 justify-end">
                    <button onclick="state.showDossierUploadForm = false; resetDossierForm(); render();"
                            class="px-4 py-2 bg-gray-300 text-gray-800 rounded hover:bg-gray-400">
                        Annuler
                    </button>
                    <button onclick="createDossierFromForm()"
                            class="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">
                        Créer le dossier
                    </button>
                </div>
            </div>
        </div>
    `;
}

// ===== GESTION DES CATÉGORIES =====
async function addCategory() {
    const nom = document.getElementById('new_cat_nom').value.trim();
    const couleur = document.getElementById('new_cat_couleur').value;
    const icon = document.getElementById('new_cat_icon').value || '📁';
    if (!nom || nom.length < 2) return showNotification('Nom invalide', 'error');
    const id = nom.toLowerCase().replace(/[^a-z0-9]/g, '_');
    await apiCall('/categories', 'POST', { userId: state.currentUser, id, nom, couleur, icon });
    await loadData();
    showNotification('✅ Catégorie ajoutée');
    document.getElementById('new_cat_nom').value = '';
    document.getElementById('new_cat_icon').value = '';
}

async function deleteCategory(catId) {
    const count = state.documents.filter(d => d.categorie === catId).length;

    if (count > 0) {
        const confirmed = await customConfirm({
            title: 'Supprimer la catégorie',
            message: `Cette catégorie contient ${count} document(s). Les documents seront déplacés vers "Autre". Continuer ?`,
            confirmText: 'Oui, supprimer',
            cancelText: 'Annuler',
            type: 'warning',
            icon: '⚠️'
        });

        if (!confirmed) return;
    } else {
        const confirmed = await customConfirm({
            title: 'Supprimer la catégorie',
            message: 'Voulez-vous vraiment supprimer cette catégorie ?',
            confirmText: 'Oui, supprimer',
            cancelText: 'Annuler',
            type: 'danger',
            icon: '🗑️'
        });

        if (!confirmed) return;
    }

    try {
        await apiCall(`/categories/${state.currentUser}/${catId}`, 'DELETE');
        await loadData();
        showNotification('✅ Catégorie supprimée');
    } catch (error) {
        Logger.error('Erreur suppression catégorie:', error);
    }
}

function startEditCategory(catId) {
    const category = state.categories.find(c => c.id === catId);
    if (category) {
        state.editingCategory = { ...category };
        render();
    }
}

function cancelEditCategory() {
    state.editingCategory = null;
    render();
}

async function saveEditCategory() {
    if (!state.editingCategory) return;

    const nom = document.getElementById('edit_cat_nom').value.trim();
    const couleur = document.getElementById('edit_cat_couleur').value;
    const icon = document.getElementById('edit_cat_icon').value.trim() || '📁';

    if (!nom || nom.length < 2) {
        showNotification('Nom invalide', 'error');
        return;
    }

    await apiCall(`/categories/${state.currentUser}/${state.editingCategory.id}`, 'PUT', { nom, couleur, icon });
    await loadData();
    state.editingCategory = null;
    showNotification('✅ Catégorie modifiée');
}

// ===== GESTION DES DÉPARTEMENTS =====
async function addDepartement() {
    const nom = document.getElementById('new_dept_nom').value.trim();
    const code = document.getElementById('new_dept_code').value.trim();

    if (!nom || !code) {
        showNotification('❌ Nom et code requis', 'error');
        return;
    }

    const isNiveau1 = state.currentUserInfo && state.currentUserInfo.niveau === 1;

    if (isNiveau1) {
        // ✅ Niveau 1 : Créer un service dans son département
        await apiCall('/services', 'POST', {
            nom,
            code,
            idDepartement: state.currentUserInfo.idDepartement
        });
    } else {
        // ✅ Niveau 0 : Créer un département
        await apiCall('/departements', 'POST', { nom, code });
    }

    await loadRolesAndDepartements();
    const message = isNiveau1 ? '✅ Service créé' : '✅ Département créé';
    showNotification(message);
    document.getElementById('new_dept_nom').value = '';
    document.getElementById('new_dept_code').value = '';
}

async function deleteDepartement(deptId) {
    const isNiveau1 = state.currentUserInfo && state.currentUserInfo.niveau === 1;
    const entityName = isNiveau1 ? 'service' : 'département';

    const confirmed = await customConfirm({
        title: `Supprimer le ${entityName}`,
        message: `Voulez-vous vraiment supprimer ce ${entityName} ? Cette action est irréversible.`,
        confirmText: 'Oui, supprimer',
        cancelText: 'Annuler',
        type: 'danger',
        icon: '🗑️'
    });

    if (!confirmed) return;

    try {
        // ✅ Appeler la bonne API selon le niveau
        const endpoint = isNiveau1 ? `/services/${deptId}` : `/departements/${deptId}`;
        await apiCall(endpoint, 'DELETE');
        await loadRolesAndDepartements();
        showNotification(isNiveau1 ? '✅ Service supprimé' : '✅ Département supprimé');
    } catch (error) {
        Logger.error('Erreur suppression:', error);
        showNotification('❌ ' + (error.message || 'Erreur lors de la suppression'), 'error');
    }
}

function startEditDepartement(deptId) {
    const isNiveau1 = state.currentUserInfo && state.currentUserInfo.niveau === 1;

    // ✅ Chercher dans la bonne liste selon le niveau
    const item = isNiveau1
        ? state.services.find(s => s._id === deptId)
        : state.departements.find(d => d._id === deptId);

    if (!item) return;
    state.editingDepartement = { ...item };
    render();
}

function cancelEditDepartement() {
    state.editingDepartement = null;
    render();
}

async function saveEditDepartement() {
    if (!state.editingDepartement) return;

    const nom = document.getElementById('edit_dept_nom').value.trim();
    const code = document.getElementById('edit_dept_code').value.trim();

    if (!nom || !code) {
        showNotification('❌ Nom et code requis', 'error');
        return;
    }

    const isNiveau1 = state.currentUserInfo && state.currentUserInfo.niveau === 1;

    // ✅ Appeler la bonne API selon le niveau
    const endpoint = isNiveau1
        ? `/services/${state.editingDepartement._id}`
        : `/departements/${state.editingDepartement._id}`;

    await apiCall(endpoint, 'PUT', { nom, code });
    await loadRolesAndDepartements();
    state.editingDepartement = null;
    const message = isNiveau1 ? '✅ Service modifié'
        : '✅ Département modifié';
    showNotification(message);
}

// ===== UTILITAIRES =====
function calculateStorageUsage() {
    let totalBytes = 0;
    state.documents.forEach(doc => { 
        if (doc.taille) totalBytes += doc.taille; 
    });
    const usedMB = totalBytes / (1024 * 1024);
    state.storageInfo = {
        usedMB: usedMB.toFixed(2), 
        totalMB: 1000,
        percentUsed: ((usedMB / 1000) * 100).toFixed(1)
    };
}

function formatDate(dateStr) {
    if (!dateStr) return 'N/A';
    try {
        const parts = dateStr.split('T')[0].split('-');
        if (parts.length === 3) {
            const [year, month, day] = parts;
            return `${day}/${month}/${year}`;
        }
        const date = new Date(dateStr + 'T00:00:00');
        if (isNaN(date.getTime())) return dateStr;
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();
        return `${day}/${month}/${year}`;
    } catch (e) {
        return dateStr;
    }
}

function formatSize(bytes) {
    if (!bytes) return '0 B';
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${sizes[i]}`;
}

// Copier l'ID d'un document dans le presse-papiers
function copyDocumentId(docId) {
    if (!docId) {
        showNotification('Aucun ID à copier', 'error');
        return;
    }

    // Méthode moderne avec l'API Clipboard
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(docId)
            .then(() => {
                showNotification(`✅ ID copié : ${docId}`, 'success');
            })
            .catch(err => {
                Logger.error('Erreur copie clipboard:', err);
                // Fallback vers la méthode ancienne
                fallbackCopyToClipboard(docId);
            });
    } else {
        // Fallback pour les navigateurs plus anciens
        fallbackCopyToClipboard(docId);
    }
}

// Méthode de fallback pour copier dans le presse-papiers
// Copier du texte dans le presse-papiers
async function copyToClipboard(text) {
    try {
        if (navigator.clipboard && window.isSecureContext) {
            await navigator.clipboard.writeText(text);
            showNotification(`✅ ID copié : ${text}`, 'success');
        } else {
            fallbackCopyToClipboard(text);
        }
    } catch (err) {
        Logger.error('Erreur copie:', err);
        fallbackCopyToClipboard(text);
    }
}

function fallbackCopyToClipboard(text) {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();

    try {
        const successful = document.execCommand('copy');
        if (successful) {
            showNotification(`✅ ID copié : ${text}`, 'success');
        } else {
            showNotification('Erreur lors de la copie', 'error');
        }
    } catch (err) {
        Logger.error('Erreur copie fallback:', err);
        showNotification('Erreur lors de la copie', 'error');
    }

    document.body.removeChild(textarea);
}

function showNotification(message, type = 'success') {
    const notif = document.createElement('div');
    notif.className = `fixed top-4 right-4 z-50 px-6 py-4 rounded-xl shadow-2xl animate-fade-in font-semibold ${
        type === 'error' ? 'bg-red-500 text-white' :
        type === 'warning' ? 'bg-yellow-500 text-white' :
        'bg-green-500 text-white'
    }`;
    notif.textContent = message;
    document.body.appendChild(notif);
    setTimeout(() => notif.remove(), 3000);
}

// ✅ Modal pour document verrouillé
function showLockedDocumentModal(lockedBy) {
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 flex items-center justify-center z-50';
    modal.style.cssText = 'background: rgba(0,0,0,0.7); backdrop-filter: blur(5px);';
    modal.innerHTML = `
        <div style="
            background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
            border-radius: 24px;
            padding: 40px;
            max-width: 420px;
            margin: 20px;
            box-shadow: 0 25px 60px rgba(0,0,0,0.5);
            border: 1px solid rgba(255,255,255,0.1);
            animation: modalAppear 0.3s ease;
        ">
            <style>
                @keyframes modalAppear {
                    from { opacity: 0; transform: scale(0.9); }
                    to { opacity: 1; transform: scale(1); }
                }
            </style>

            <div style="text-align: center;">
                <!-- Icône animée -->
                <div style="
                    width: 100px;
                    height: 100px;
                    margin: 0 auto 24px;
                    background: linear-gradient(135deg, #ef4444, #dc2626);
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    box-shadow: 0 10px 30px rgba(239, 68, 68, 0.4);
                ">
                    <span style="font-size: 50px;">🔒</span>
                </div>

                <!-- Titre -->
                <h3 style="
                    color: #f1f5f9;
                    font-size: 24px;
                    font-weight: 700;
                    margin-bottom: 16px;
                ">Accès Refusé</h3>

                <!-- Message principal -->
                <div style="
                    background: rgba(239, 68, 68, 0.15);
                    border: 1px solid rgba(239, 68, 68, 0.3);
                    border-radius: 12px;
                    padding: 20px;
                    margin-bottom: 24px;
                ">
                    <p style="color: #fca5a5; font-size: 16px; margin: 0; line-height: 1.6;">
                        Ce document est <strong style="color: #fff;">verrouillé</strong>
                        ${lockedBy ? `<br>par <strong style="color: #fbbf24;">${lockedBy}</strong>` : ''}
                    </p>
                </div>

                <!-- Explication -->
                <p style="color: #94a3b8; font-size: 14px; margin-bottom: 28px; line-height: 1.5;">
                    Vous n'avez pas les droits nécessaires pour consulter ce document.<br>
                    Contactez votre administrateur si besoin.
                </p>

                <!-- Bouton -->
                <button onclick="this.closest('.fixed').remove()" style="
                    padding: 14px 40px;
                    background: linear-gradient(135deg, #3b82f6, #2563eb);
                    color: white;
                    border: none;
                    border-radius: 12px;
                    font-size: 16px;
                    font-weight: 600;
                    cursor: pointer;
                    transition: all 0.2s;
                    box-shadow: 0 4px 15px rgba(59, 130, 246, 0.4);
                " onmouseover="this.style.transform='translateY(-2px)'" onmouseout="this.style.transform='translateY(0)'">
                    J'ai compris
                </button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
    modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.remove();
    });
}

async function compressImage(file) {
    return new Promise((resolve) => {
        if (!file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.readAsDataURL(file);
            return;
        }
        
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;
                const maxSize = 1920;
                
                if (width > height && width > maxSize) {
                    height = (height * maxSize) / width;
                    width = maxSize;
                } else if (height > maxSize) {
                    width = (width * maxSize) / height;
                    height = maxSize;
                }
                
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);
                resolve(canvas.toDataURL('image/jpeg', 0.8));
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    });
}

// ===== GESTION DES FICHIERS =====
async function handleFileUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!formData.titre.trim()) {
        showNotification('Titre requis', 'error');
        e.target.value = '';
        return;
    }

    // Validation des extensions autorisées
    const allowedExtensions = [
        // Documents
        '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.txt',
        '.odt', '.ods', '.odp', '.rtf', '.csv',
        // Images
        '.jpg', '.jpeg', '.png', '.gif', '.bmp', '.svg', '.webp',
        // Archives (optionnel)
        '.zip', '.rar'
    ];

    const fileName = file.name.toLowerCase();
    const isAllowed = allowedExtensions.some(ext => fileName.endsWith(ext));

    if (!isAllowed) {
        const ext = fileName.substring(fileName.lastIndexOf('.'));
        showNotification(`❌ Extension "${ext}" non autorisée. Seuls les documents, images et archives sont acceptés.`, 'error');
        e.target.value = '';
        return;
    }

    // Bloquer explicitement les vidéos et audio
    const blockedExtensions = ['.mp4', '.avi', '.mov', '.mkv', '.flv', '.wmv', '.webm',
                               '.mp3', '.wav', '.ogg', '.m4a', '.exe', '.bat', '.sh', '.msi'];
    const isBlocked = blockedExtensions.some(ext => fileName.endsWith(ext));

    if (isBlocked) {
        const ext = fileName.substring(fileName.lastIndexOf('.'));
        showNotification(`🚫 Les fichiers ${ext} (vidéos, audio, exécutables) ne sont pas autorisés`, 'error');
        e.target.value = '';
        return;
    }

    if (file.size > 50 * 1024 * 1024) {
        showNotification('Max 50 MB', 'error');
        e.target.value = '';
        return;
    }
    showNotification('📤 Traitement...', 'warning');
    const contenu = await compressImage(file);
    const newDoc = { 
        ...formData, 
        nomFichier: file.name, 
        taille: file.size, 
        type: file.type, 
        contenu 
    };
    await saveDocument(newDoc);
    state.showUploadForm = false;
    formData = {
        titre: '',
        categorie: '', // ✅ CORRIGÉ : Pas de valeur par défaut 'factures'
        date: new Date().toISOString().split('T')[0],
        departementArchivage: '',
        description: '',
        tags: '',
        locked: false
    };
    showNotification('✅ Ajouté!');
    render();
    e.target.value = '';
}

async function downloadDoc(doc) {
    try {
        // Récupérer l'ID du document (compatibilité avec différents formats)
        const docId = doc._id || doc.id || doc.idDocument;

        if (!docId) {
            Logger.error('❌ Document sans ID dans downloadDoc:', doc);
            showNotification('Erreur: Document invalide (ID manquant)', 'error');
            return;
        }

        // Récupérer le document complet
        const response = await apiCall(`/documents/${state.currentUser}/${docId}`);
        const fullDoc = response.document;

        // Enregistrer le téléchargement dans l'historique
        await apiCall(`/documents/${state.currentUser}/${docId}/download`, 'POST');

        // Télécharger le fichier
        const link = document.createElement('a');
        link.href = fullDoc.contenu;
        link.download = fullDoc.nomFichier;
        link.click();

        showNotification('📥 Téléchargement en cours...');

        // Recharger les données pour mettre à jour les informations de téléchargement
        await loadData();
    } catch (error) {
        Logger.error('Erreur téléchargement:', error);
        showNotification('Erreur lors du téléchargement', 'error');
    }
}

// ===== ÉDITION OFFICE =====

// Vérifier si un fichier est un fichier Office éditable
function isEditableOfficeFile(fileName) {
    if (!fileName) return false;
    const ext = fileName.toLowerCase();
    return ext.endsWith('.xlsx') || ext.endsWith('.xls');
}

// Vérifier si un fichier est un document Office (Word, Excel, PowerPoint)
function isOfficeDocument(fileName) {
    if (!fileName) return false;
    const ext = fileName.toLowerCase().split('.').pop();
    const officeExtensions = ['doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'odt', 'ods', 'odp'];
    return officeExtensions.includes(ext);
}

// Éditer un document Excel
async function editExcelDocument(doc) {
    try {
        // Créer une interface modale pour l'édition
        const modalHtml = `
            <div id="editExcelModal" class="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                <div class="modal-glass rounded-2xl p-8 max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl animate-fade-in">
                    <div class="flex justify-between items-start mb-6">
                        <h2 class="text-3xl font-bold text-gray-800">✏️ Éditer le tableur Excel</h2>
                        <button onclick="closeEditExcelModal()" class="text-2xl text-red-600 hover:text-red-800 font-bold transition">✖</button>
                    </div>

                    <div class="mb-6 bg-blue-50 p-4 rounded-xl border-2 border-blue-200">
                        <p class="text-gray-700"><strong>📊 Fichier:</strong> ${doc.nomFichier}</p>
                        <p class="text-sm text-blue-900 font-semibold mt-2">Modifiez les cellules ci-dessous. Format: <code>A1</code>, <code>B2</code>, etc.</p>
                    </div>

                    <div id="cellEditsContainer" class="space-y-3 mb-6">
                        <div class="flex gap-3 items-center">
                            <input type="text" id="cell_0" placeholder="Cellule (ex: A1)"
                                   class="w-32 px-3 py-2 border-2 rounded-lg input-modern">
                            <input type="text" id="value_0" placeholder="Nouvelle valeur"
                                   class="flex-1 px-3 py-2 border-2 rounded-lg input-modern">
                        </div>
                    </div>

                    <button onclick="addCellEditRow()"
                            class="w-full px-4 py-3 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition font-medium mb-6">
                        ➕ Ajouter une cellule
                    </button>

                    <div class="flex gap-3">
                        <button onclick="saveExcelEdits('${doc._id}')"
                                class="flex-1 px-6 py-4 bg-gradient-to-br from-green-500 to-green-600 text-white rounded-xl hover:shadow-lg transition font-semibold">
                            ✅ Enregistrer les modifications
                        </button>
                        <button onclick="closeEditExcelModal()"
                                class="flex-1 px-6 py-4 bg-gray-200 text-gray-700 rounded-xl hover:bg-gray-300 transition font-medium">
                            ❌ Annuler
                        </button>
                    </div>
                </div>
            </div>
        `;

        // Ajouter la modale au DOM
        const container = document.createElement('div');
        container.innerHTML = modalHtml;
        document.body.appendChild(container.firstElementChild);

    } catch (error) {
        Logger.error('Erreur ouverture éditeur:', error);
        showNotification('Erreur lors de l\'ouverture de l\'éditeur', 'error');
    }
}

// Ajouter une ligne de cellule à éditer
function addCellEditRow() {
    const container = document.getElementById('cellEditsContainer');
    const count = container.children.length;

    const newRow = document.createElement('div');
    newRow.className = 'flex gap-3 items-center';
    newRow.innerHTML = `
        <input type="text" id="cell_${count}" placeholder="Cellule (ex: B${count + 1})"
               class="w-32 px-3 py-2 border-2 rounded-lg input-modern">
        <input type="text" id="value_${count}" placeholder="Nouvelle valeur"
               class="flex-1 px-3 py-2 border-2 rounded-lg input-modern">
        <button onclick="this.parentElement.remove()"
                class="px-3 py-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition">
            🗑️
        </button>
    `;
    container.appendChild(newRow);
}

// Enregistrer les modifications Excel
async function saveExcelEdits(docId) {
    try {
        const container = document.getElementById('cellEditsContainer');
        const cellUpdates = {};

        // Récupérer toutes les modifications
        for (let i = 0; i < container.children.length; i++) {
            const cellInput = document.getElementById(`cell_${i}`);
            const valueInput = document.getElementById(`value_${i}`);

            if (cellInput && valueInput && cellInput.value.trim() && valueInput.value.trim()) {
                cellUpdates[cellInput.value.trim().toUpperCase()] = valueInput.value.trim();
            }
        }

        if (Object.keys(cellUpdates).length === 0) {
            showNotification('⚠️ Aucune modification à enregistrer', 'warning');
            return;
        }

        showNotification('⏳ Modification du tableur en cours...', 'info');

        // Appeler l'API d'édition
        const result = await apiCall(`/office/edit-excel/${docId}`, 'POST', { cellUpdates });

        if (result.success) {
            showNotification('✅ Tableur modifié avec succès !', 'success');
            closeEditExcelModal();
            await loadData(); // Recharger les documents
        } else {
            showNotification('❌ Erreur lors de la modification', 'error');
        }

    } catch (error) {
        Logger.error('Erreur sauvegarde Excel:', error);
        showNotification('Erreur lors de la sauvegarde', 'error');
    }
}

// Fermer la modale d'édition
function closeEditExcelModal() {
    const modal = document.getElementById('editExcelModal');
    if (modal) {
        modal.remove();
    }
}

// Créer un nouveau rapport Excel
async function createExcelReport() {
    try {
        // Créer une interface pour la création de rapport
        const modalHtml = `
            <div id="createExcelModal" class="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                <div class="modal-glass rounded-2xl p-8 max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl animate-fade-in">
                    <div class="flex justify-between items-start mb-6">
                        <h2 class="text-3xl font-bold text-gray-800">📊 Créer un rapport Excel</h2>
                        <button onclick="closeCreateExcelModal()" class="text-2xl text-red-600 hover:text-red-800 font-bold transition">✖</button>
                    </div>

                    <div class="space-y-4 mb-6">
                        <div>
                            <label class="block text-sm font-semibold text-gray-700 mb-2">Nom du fichier</label>
                            <input type="text" id="excelFileName"
                                   placeholder="rapport-documents.xlsx"
                                   class="w-full px-4 py-3 border-2 rounded-xl input-modern">
                        </div>

                        <div>
                            <label class="block text-sm font-semibold text-gray-700 mb-2">Type de rapport</label>
                            <select id="reportType" class="w-full px-4 py-3 border-2 rounded-xl input-modern">
                                <option value="documents">Liste de tous les documents</option>
                                <option value="categories">Documents par catégorie</option>
                                <option value="stats">Statistiques générales</option>
                            </select>
                        </div>
                    </div>

                    <div class="flex gap-3">
                        <button onclick="generateExcelReport()"
                                class="flex-1 px-6 py-4 bg-gradient-to-br from-green-500 to-green-600 text-white rounded-xl hover:shadow-lg transition font-semibold">
                            ✅ Générer le rapport
                        </button>
                        <button onclick="closeCreateExcelModal()"
                                class="flex-1 px-6 py-4 bg-gray-200 text-gray-700 rounded-xl hover:bg-gray-300 transition font-medium">
                            ❌ Annuler
                        </button>
                    </div>
                </div>
            </div>
        `;

        // Ajouter la modale au DOM
        const container = document.createElement('div');
        container.innerHTML = modalHtml;
        document.body.appendChild(container.firstElementChild);

    } catch (error) {
        Logger.error('Erreur création rapport:', error);
        showNotification('Erreur lors de l\'ouverture', 'error');
    }
}

// Générer le rapport Excel
async function generateExcelReport() {
    try {
        const fileName = document.getElementById('excelFileName').value.trim() || 'rapport.xlsx';
        const reportType = document.getElementById('reportType').value;

        let data = [];
        let sheetName = 'Rapport';

        if (reportType === 'documents') {
            data = [
                ['ID', 'Titre', 'Catégorie', 'Date', 'Taille', 'Fichier'],
                ...state.documents.map(doc => [
                    doc.idDocument || doc._id,
                    doc.titre,
                    getCategoryName(doc.categorie),
                    formatDate(doc.dateAjout),
                    formatSize(doc.taille),
                    doc.nomFichier
                ])
            ];
            sheetName = 'Documents';
        } else if (reportType === 'categories') {
            const catCounts = {};
            state.documents.forEach(doc => {
                const catName = getCategoryName(doc.categorie);
                catCounts[catName] = (catCounts[catName] || 0) + 1;
            });
            data = [
                ['Catégorie', 'Nombre de documents'],
                ...Object.entries(catCounts).map(([cat, count]) => [cat, count])
            ];
            sheetName = 'Catégories';
        } else if (reportType === 'stats') {
            const totalSize = state.documents.reduce((sum, doc) => sum + doc.taille, 0);
            data = [
                ['Statistique', 'Valeur'],
                ['Total de documents', state.documents.length],
                ['Taille totale', formatSize(totalSize)],
                ['Catégories', state.categories.length],
                ['Date du rapport', new Date().toLocaleDateString('fr-FR')]
            ];
            sheetName = 'Statistiques';
        }

        showNotification('⏳ Génération du rapport en cours...', 'info');

        // Appeler l'API de création
        const result = await apiCall('/office/create-excel', 'POST', {
            data,
            fileName,
            sheetName
        });

        if (result.success) {
            // Télécharger le fichier
            const link = document.createElement('a');
            link.href = `data:application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;base64,${result.content}`;
            link.download = fileName;
            link.click();

            showNotification('✅ Rapport généré et téléchargé !', 'success');
            closeCreateExcelModal();
        } else {
            showNotification('❌ Erreur lors de la génération', 'error');
        }

    } catch (error) {
        Logger.error('Erreur génération rapport:', error);
        showNotification('Erreur lors de la génération', 'error');
    }
}

// Fermer la modale de création
function closeCreateExcelModal() {
    const modal = document.getElementById('createExcelModal');
    if (modal) {
        modal.remove();
    }
}

// ===== IMPORT/EXPORT =====
async function exportData() {
    const data = { 
        version: '2.3', 
        exportDate: new Date().toISOString(), 
        user: state.currentUser, 
        documents: state.documents, 
        categories: state.categories 
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `mes_${state.currentUser}_${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
    showNotification('✅ Exporté');
}

async function importData(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 100 * 1024 * 1024) {
        showNotification('Max 100 MB', 'error');
        e.target.value = '';
        return;
    }
    const reader = new FileReader();
    reader.onload = async (event) => {
        try {
            const imported = JSON.parse(event.target.result);
            const docs = Array.isArray(imported) ? imported : imported.documents || [];
            if (docs.length === 0) return showNotification('Aucun document', 'error');
            if (docs.length > 1000) return showNotification('Max 1000', 'error');

            const confirmed = await customConfirm({
                title: 'Importer des documents',
                message: `Voulez-vous importer ${docs.length} document(s) ?`,
                confirmText: 'Oui, importer',
                cancelText: 'Annuler',
                type: 'info',
                icon: '📥'
            });

            if (!confirmed) return;
            state.importProgress = { 
                show: true, 
                current: 0, 
                total: docs.length, 
                message: 'Import...' 
            };
            render();
            const result = await apiCall('/documents/bulk', 'POST', { 
                userId: state.currentUser, 
                documents: docs 
            });
            await loadData();
            state.importProgress = { 
                show: false, 
                current: 0, 
                total: 0, 
                message: '' 
            };
            showNotification(`✅ ${result.insertedCount} importés!`);
        } catch (error) {
            state.importProgress = { 
                show: false, 
                current: 0, 
                total: 0, 
                message: '' 
            };
            showNotification('Erreur', 'error');
        }
    };
    reader.readAsText(file);
    e.target.value = '';
}

// ===== FONCTIONS DE FORMATAGE =====
function getCategoryColor(nom) {
    // Chercher par nom de catégorie au lieu d'ID
    return state.categories.find(c => c.nom === nom)?.couleur || 'bg-gray-100 text-gray-800';
}

function getCategoryName(nom) {
    // Chercher par nom de catégorie au lieu d'ID
    return state.categories.find(c => c.nom === nom)?.nom || nom;
}

function getCategoryIcon(nom) {
    // Chercher par nom de catégorie au lieu d'ID
    return state.categories.find(c => c.nom === nom)?.icon || '📁';
}

function getSortLabel(sortValue) {
    const sortLabels = {
        'date_desc': 'Plus récent document',
        'date_asc': 'Plus ancien document',
        'titre_asc': 'A → Z',
        'titre_desc': 'Z → A',
        'taille_desc': 'Plus grande taille',
        'taille_asc': 'Plus petite taille'
    };
    return sortLabels[sortValue] || 'Aucun tri';
}

// ===== NOUVEAU : TRI DES DOCUMENTS =====
function sortDocuments(docs) {
    const sorted = [...docs];

    // Si "Aucun tri spécifique" (sortBy vide), retourner sans trier
    if (state.sortBy === '') {
        return sorted;
    }

    switch(state.sortBy) {
        case 'date_desc':
            return sorted.sort((a, b) => {
                const dateA = a.date ? new Date(a.date) : new Date(0);
                const dateB = b.date ? new Date(b.date) : new Date(0);
                return dateB - dateA;
            });
        case 'date_asc':
            return sorted.sort((a, b) => {
                const dateA = a.date ? new Date(a.date) : new Date(0);
                const dateB = b.date ? new Date(b.date) : new Date(0);
                return dateA - dateB;
            });
        case 'titre_asc':
            return sorted.sort((a, b) => (a.titre || '').localeCompare(b.titre || ''));
        case 'titre_desc':
            return sorted.sort((a, b) => (b.titre || '').localeCompare(a.titre || ''));
        case 'taille_desc':
            return sorted.sort((a, b) => (b.taille || 0) - (a.taille || 0));
        case 'taille_asc':
            return sorted.sort((a, b) => (a.taille || 0) - (b.taille || 0));
        default:
            // Par défaut, tri par date de création (createdAt)
            return sorted.sort((a, b) => {
                const dateA = a.createdAt ? new Date(a.createdAt) : new Date(0);
                const dateB = b.createdAt ? new Date(b.createdAt) : new Date(0);
                return dateB - dateA;
            });
    }
}

function getFilteredDocs() {
    // ✅ RECHERCHE SERVEUR : searchTerm et selectedCategory sont gérés côté serveur
    // On garde seulement le filtrage local pour département/service et dates (non supportés par API)
    let filtered = state.documents.filter(doc => {
        // Filtre local pour département/service (pas encore côté serveur)
        const matchDepartement = state.selectedDepartement === 'tous' ||
            doc.departementArchivage === state.selectedDepartement ||
            doc.serviceArchivage === state.selectedDepartement;

        // Filtre local pour les dates (pas encore côté serveur)
        let matchDate = true;
        if (state.dateFrom || state.dateTo) {
            const dateToCheck = state.dateType === 'ajout' ? doc.createdAt : doc.date;

            if (state.dateFrom) {
                matchDate = matchDate && new Date(dateToCheck) >= new Date(state.dateFrom);
            }
            if (state.dateTo) {
                matchDate = matchDate && new Date(dateToCheck) <= new Date(state.dateTo + 'T23:59:59');
            }
        }

        return matchDepartement && matchDate;
    });

    // ✅ Tri par date d'ajout : Plus récent en haut (le tri est aussi fait côté serveur)
    filtered.sort((a, b) => {
        const dateA = a.createdAt ? new Date(a.createdAt) : new Date(0);
        const dateB = b.createdAt ? new Date(b.createdAt) : new Date(0);
        return dateB - dateA; // Décroissant (plus récent en premier)
    });

    return filtered;
}

// ===== NOUVEAU : PRÉVISUALISATION DOCUMENT =====
async function showDocDetail(id) {
    try {
        const doc = state.documents.find(d => (d._id || d.id) === id);
        if (!doc) {
            Logger.error('❌ Document non trouvé avec ID:', id);
            return;
        }

        // Charger le contenu complet du document depuis l'API
        const response = await apiCall(`/documents/${state.currentUser}/${id}`);
        const fullDoc = response.document || response; // Compatibilité avec les deux formats

        // Fusionner les métadonnées du document de la liste avec le contenu complet
        // Cela garantit que toutes les métadonnées sont présentes
        state.selectedDoc = {
            ...doc,           // Métadonnées de la liste (categorie, service, etc.)
            ...fullDoc,       // Contenu complet de l'API
            _id: id           // S'assurer que l'ID est présent
        };

        render();
    } catch (error) {
        Logger.error('❌ Erreur lors du chargement du document:', error);

        // ✅ Gestion des documents verrouillés
        if (error.response && error.response.locked) {
            showLockedDocumentModal(error.response.lockedBy);
            return;
        }

        showNotification('Erreur lors du chargement du document', 'error');
    }
}

// ===== ACTIONS UI =====
function closeDocDetail() { 
    state.selectedDoc = null; 
    render(); 
}

function toggleMenu() { 
    state.showMenu = !state.showMenu; 
    render(); 
}

function toggleUploadForm() {
    state.showUploadForm = !state.showUploadForm;
    state.showCategories = false;

    // ❌ SUPPRIMÉ: Ne plus présélectionner automatiquement une catégorie
    // L'utilisateur DOIT faire un choix explicite
    // Réinitialiser les champs pour forcer la saisie
    if (state.showUploadForm) {
        formData.categorie = '';
        formData.departementArchivage = '';
    }

    render();
}

function toggleCategories() {
    state.showCategories = !state.showCategories;
    state.showUploadForm = false;
    state.showDepartements = false;
    render();
}

function toggleDepartements() {
    state.showDepartements = !state.showDepartements;
    state.showUploadForm = false;
    state.showCategories = false;
    render();
}

async function toggleUsersManagement() {
    state.showUsersManagement = !state.showUsersManagement;
    if (state.showUsersManagement) {
        try {
            // Charger les rôles et départements si pas déjà chargés
            if (!Array.isArray(state.roles) || state.roles.length === 0) {
                const rolesData = await apiCall('/roles');
                state.roles = rolesData.roles || [];
            }
            if (!Array.isArray(state.departements) || state.departements.length === 0) {
                const deptsData = await apiCall('/departements');
                state.departements = deptsData.departements || [];
            }

            // Charger tous les utilisateurs
            const response = await apiCall('/users');
            state.allUsersForManagement = response.users || [];

            Logger.debug('✅ Données chargées pour gestion utilisateurs');
        } catch (error) {
            Logger.error('❌ Erreur chargement utilisateurs:', error);
        }
    }
    state.showUploadForm = false;
    state.showCategories = false;
    state.showDepartements = false;
    state.showRolesManagement = false;
    state.showAdvancedStats = false;
    render();
}

async function toggleRolesManagement() {
    state.showRolesManagement = !state.showRolesManagement;
    if (state.showRolesManagement) {
        // Charger tous les rôles
        await loadRolesAndDepartements();
    }
    state.showUploadForm = false;
    state.showCategories = false;
    state.showDepartements = false;
    state.showUsersManagement = false;
    state.showDepartementsManagement = false;
    state.showAdvancedStats = false;
    render();
}

async function toggleDepartementsManagement() {
    state.showDepartementsManagement = !state.showDepartementsManagement;
    if (state.showDepartementsManagement) {
        // Charger tous les départements
        await loadRolesAndDepartements();
    }
    state.showUploadForm = false;
    state.showCategories = false;
    state.showDepartements = false;
    state.showUsersManagement = false;
    state.showRolesManagement = false;
    state.showAdvancedStats = false;
    render();
}

function toggleAdvancedStats() {
    state.showAdvancedStats = !state.showAdvancedStats;
    state.showUploadForm = false;
    state.showCategories = false;
    state.showDepartements = false;
    state.showUsersManagement = false;
    state.showRolesManagement = false;
    render();
}

async function toggleRegister() {
    state.showRegister = !state.showRegister;

    // Charger les rôles et départements si on ouvre le formulaire d'inscription
    if (state.showRegister) {
        try {
            Logger.debug('📋 Chargement des rôles et départements...');
            Logger.debug('📋 État actuel - roles:', state.roles, 'departements:', state.departements);

            // Toujours charger si les données ne sont pas un tableau valide
            if (!Array.isArray(state.roles) || state.roles.length === 0) {
                Logger.debug('🔄 Chargement des rôles...');
                const rolesData = await getRoles();
                Logger.debug('✅ Rôles reçus:', rolesData);
                state.roles = rolesData.roles || [];
                Logger.debug('✅ state.roles mis à jour:', state.roles);
            }

            if (!Array.isArray(state.departements) || state.departements.length === 0) {
                Logger.debug('🔄 Chargement des départements...');
                const deptsData = await getDepartements();
                Logger.debug('✅ Départements reçus:', deptsData);
                state.departements = deptsData.departements || [];
                Logger.debug('✅ state.departements mis à jour:', state.departements);
            }

            Logger.debug('✅ Chargement terminé. Nombre de rôles:', state.roles?.length, 'Nombre de départements:', state.departements?.length);
        } catch (error) {
            Logger.error('❌ Erreur chargement rôles/départements:', error);
            showNotification('Erreur lors du chargement des données', 'error');
        }
    }

    render();
}

// ===== PARTAGE DE DOCUMENTS =====
async function openShareModal(docId) {
    try {
        // Charger TOUS les utilisateurs de TOUS les départements (sauf l'utilisateur actuel)
        const response = await apiCall('/users');
        const allUsers = response.users || [];
        // Filtrer pour exclure l'utilisateur actuel
        const users = allUsers.filter(u => u.username !== state.currentUser);

        state.shareAvailableUsers = users;
        state.shareSelectedUsers = [];
        state.showShareModal = true;
        render();
    } catch (error) {
        showNotification('Erreur lors du chargement des utilisateurs', 'error');
    }
}

function closeShareModal() {
    state.showShareModal = false;
    state.shareAvailableUsers = [];
    state.shareSelectedUsers = [];
    state.shareSearchTerm = ''; // Réinitialiser la recherche
    render();
}

function toggleUserSelection(username) {
    const index = state.shareSelectedUsers.indexOf(username);
    if (index > -1) {
        // Désélectionner
        state.shareSelectedUsers.splice(index, 1);
    } else {
        // Sélectionner
        state.shareSelectedUsers.push(username);
    }

    // Mettre à jour uniquement la liste au lieu de tout recharger
    updateShareUsersList();
}

async function confirmShare() {
    if (!state.selectedDoc || state.shareSelectedUsers.length === 0) {
        showNotification('Veuillez sélectionner au moins un utilisateur', 'error');
        return;
    }

    try {
        const result = await apiCall(
            `/documents/${state.currentUser}/${state.selectedDoc._id}/share`,
            'POST',
            { usersToShare: state.shareSelectedUsers }
        );

        if (result.success) {
            showNotification(`✅ Document partagé avec ${state.shareSelectedUsers.length} utilisateur(s)`);
            closeShareModal();
        }
    } catch (error) {
        showNotification('Erreur lors du partage', 'error');
    }
}

// ✅ NOUVEAU: Mettre à jour le terme de recherche de partage
function updateShareSearch(value) {
    state.shareSearchTerm = value.toLowerCase();

    // Filtrer uniquement la liste des utilisateurs sans recharger toute la page
    updateShareUsersList();
}

// Mettre à jour uniquement la liste des utilisateurs (sans tout re-render)
function updateShareUsersList() {
    const container = document.querySelector('.share-users-list-container');
    if (!container) return;

    const filteredUsers = getFilteredShareUsers();

    if (filteredUsers.length === 0) {
        container.innerHTML = `
            <div class="text-center py-12 text-gray-500">
                <div class="text-6xl mb-3 opacity-50">🔍</div>
                <p class="text-lg font-semibold">Aucun utilisateur trouvé</p>
                <p class="text-sm mt-2">Essayez un autre terme de recherche</p>
            </div>
        `;
    } else {
        container.innerHTML = filteredUsers.map(user => `
            <label class="flex items-center gap-3 p-4 rounded-lg hover:shadow-md transition cursor-pointer border-2 ${state.shareSelectedUsers.includes(user.username) ? 'border-green-400 bg-green-50 shadow-sm' : 'border-gray-200 bg-white hover:border-blue-300'}">
                <input type="checkbox"
                       ${state.shareSelectedUsers.includes(user.username) ? 'checked' : ''}
                       onchange="toggleUserSelection('${user.username}')"
                       class="w-5 h-5 accent-blue-500 rounded cursor-pointer">
                <div class="flex-1">
                    <div class="font-bold text-gray-900 text-base mb-1">${user.nom}</div>
                    <div class="text-sm text-gray-600">
                        📧 ${user.email}
                    </div>
                    <div class="text-sm text-blue-600 font-medium mt-1">
                        🏢 ${user.departement}
                    </div>
                </div>
                ${state.shareSelectedUsers.includes(user.username) ? '<span class="text-2xl text-green-600">✓</span>' : '<span class="text-2xl text-gray-300">○</span>'}
            </label>
        `).join('');
    }

    // Mettre à jour le compteur
    updateShareCounter();
}

// Mettre à jour le compteur de sélection
function updateShareCounter() {
    const counterSelected = document.querySelector('.share-counter-selected');
    const counterTotal = document.querySelector('.share-counter-total');
    const selectAllBtn = document.querySelector('.share-select-all-btn');
    const confirmBtn = document.querySelector('.share-confirm-btn');

    if (counterSelected) {
        counterSelected.textContent = `${state.shareSelectedUsers.length} sélectionné(s)`;
    }

    if (counterTotal) {
        counterTotal.textContent = `sur ${getFilteredShareUsers().length} utilisateur(s) disponible(s)`;
    }

    if (selectAllBtn) {
        const filteredUsers = getFilteredShareUsers();
        selectAllBtn.textContent = state.shareSelectedUsers.length === filteredUsers.length ? '✖ Tout désélectionner' : '✓ Tout sélectionner';
    }

    if (confirmBtn) {
        const span = confirmBtn.querySelector('span:last-child');
        if (span) {
            span.textContent = `Partager avec ${state.shareSelectedUsers.length} utilisateur(s)`;
        }

        if (state.shareSelectedUsers.length === 0) {
            confirmBtn.disabled = true;
            confirmBtn.classList.add('opacity-50', 'cursor-not-allowed');
            confirmBtn.classList.remove('hover:from-blue-600', 'hover:to-blue-700');
        } else {
            confirmBtn.disabled = false;
            confirmBtn.classList.remove('opacity-50', 'cursor-not-allowed');
            confirmBtn.classList.add('hover:from-blue-600', 'hover:to-blue-700');
        }
    }
}

// ✅ NOUVEAU: Sélectionner / Désélectionner tous les utilisateurs visibles
function toggleSelectAll() {
    const filteredUsers = getFilteredShareUsers();

    if (state.shareSelectedUsers.length === filteredUsers.length) {
        // Tout est déjà sélectionné, on désélectionne tout
        state.shareSelectedUsers = [];
    } else {
        // Sélectionner tous les utilisateurs visibles
        state.shareSelectedUsers = filteredUsers.map(u => u.username);
    }

    // Mettre à jour uniquement la liste au lieu de tout recharger
    updateShareUsersList();
}

// ✅ NOUVEAU: Obtenir les utilisateurs filtrés par recherche
function getFilteredShareUsers() {
    if (!state.shareSearchTerm) {
        return state.shareAvailableUsers;
    }

    return state.shareAvailableUsers.filter(user => {
        const searchTerm = state.shareSearchTerm.toLowerCase();
        return user.nom.toLowerCase().includes(searchTerm) ||
               user.username.toLowerCase().includes(searchTerm) ||
               user.email.toLowerCase().includes(searchTerm) ||
               user.departement.toLowerCase().includes(searchTerm);
    });
}

// ============================================
// FONCTIONS DE MESSAGERIE
// ============================================

// Ouvrir la boîte de réception
async function openMessages() {
    try {
        state.showMenu = false;
        state.showMessages = true;
        await loadMessages();
        render();
    } catch (error) {
        Logger.error('Erreur ouverture messagerie:', error);
        showNotification('Erreur lors de l\'ouverture de la messagerie', 'error');
    }
}

// Charger les messages
async function loadMessages() {
    try {
        const messages = await apiCall(`/messages/${state.currentUser}`);
        state.messages = messages;
        await updateUnreadCount();
    } catch (error) {
        Logger.error('Erreur chargement messages:', error);
    }
}

// Mettre à jour le compteur de messages non lus
async function updateUnreadCount() {
    try {
        const result = await apiCall(`/messages/${state.currentUser}/unread-count`);
        state.unreadCount = result.count;
    } catch (error) {
        Logger.error('Erreur comptage messages:', error);
    }
}

// Fermer la boîte de réception
function closeMessages() {
    state.showMessages = false;
    render();
}

// Marquer un message comme lu
async function markMessageAsRead(messageId) {
    try {
        await apiCall(`/messages/${messageId}/read`, 'PUT');
        await loadMessages();
        render();
    } catch (error) {
        Logger.error('Erreur marquage message:', error);
    }
}

// Supprimer un message
async function deleteMessage(messageId) {
    const confirmed = await customConfirm({
        title: 'Supprimer le message',
        message: 'Voulez-vous vraiment supprimer ce message ?',
        confirmText: 'Oui, supprimer',
        cancelText: 'Annuler',
        type: 'danger',
        icon: '🗑️'
    });

    if (!confirmed) return;

    try {
        await apiCall(`/messages/${messageId}`, 'DELETE');
        showNotification('✅ Message supprimé');
        await loadMessages();
        render();
    } catch (error) {
        Logger.error('Erreur suppression message:', error);
        showNotification('Erreur lors de la suppression', 'error');
    }
}

// Charger tous les utilisateurs pour la composition de messages
async function loadAllUsers() {
    try {
        const result = await apiCall(`/users-for-sharing/${state.currentUser}`);
        if (result.success) {
            state.allUsers = result.users;
        }
    } catch (error) {
        Logger.error('Erreur chargement utilisateurs:', error);
    }
}

// Ouvrir le formulaire de composition de message
async function openComposeMessage() {
    await loadAllUsers();
    state.showComposeMessage = true;
    state.composeMessageTo = '';
    state.composeMessageSubject = '';
    state.composeMessageBody = '';
    state.userSearchTerm = '';
    state.showUserDropdown = false;
    state.selectedUser = null;
    render();
}

// Fermer le formulaire de composition
function closeComposeMessage() {
    state.showComposeMessage = false;
    state.userSearchTerm = '';
    state.showUserDropdown = false;
    state.selectedUser = null;
    render();
}

// Gérer la recherche d'utilisateurs
function handleUserSearch(value) {
    state.userSearchTerm = value;
    state.showUserDropdown = true; // Toujours afficher le dropdown
    if (value.length === 0) {
        // Si le champ est vide, ne pas réinitialiser la sélection
        // pour permettre de voir la liste complète
    } else {
        // Si on tape, réinitialiser la sélection
        state.selectedUser = null;
        state.composeMessageTo = '';
    }
    render();
}

// Filtrer les utilisateurs selon le terme de recherche
function getFilteredUsers() {
    // Si pas de terme de recherche, afficher TOUS les utilisateurs
    if (!state.userSearchTerm || state.userSearchTerm.trim() === '') {
        return state.allUsers.slice(0, 20); // Afficher les 20 premiers utilisateurs
    }

    const searchLower = state.userSearchTerm.toLowerCase();
    return state.allUsers.filter(user => {
        return (
            user.nom.toLowerCase().includes(searchLower) ||
            user.username.toLowerCase().includes(searchLower) ||
            (user.departement && user.departement.toLowerCase().includes(searchLower)) ||
            (user.role && user.role.toLowerCase().includes(searchLower))
        );
    }).slice(0, 20); // Augmenter la limite à 20 résultats
}

// Sélectionner un utilisateur
function selectUser(username) {
    const user = state.allUsers.find(u => u.username === username);
    if (user) {
        state.selectedUser = user;
        state.composeMessageTo = username;
        state.showUserDropdown = false;
        state.userSearchTerm = `${user.nom} (${user.username})${user.niveau !== 1 ? ` - ${user.departement}` : ''}`;
        render();
    }
}

// Envoyer un nouveau message
async function sendNewMessage() {
    if (!state.composeMessageTo || !state.composeMessageSubject || !state.composeMessageBody) {
        showNotification('Veuillez remplir tous les champs', 'error');
        return;
    }

    try {
        const result = await apiCall('/messages', 'POST', {
            from: state.currentUser,
            to: state.composeMessageTo,
            subject: state.composeMessageSubject,
            body: state.composeMessageBody,
            type: 'normal'
        });

        if (result.success) {
            showNotification('✅ Message envoyé avec succès');
            closeComposeMessage();
            await loadMessages();
            render();
        }
    } catch (error) {
        Logger.error('Erreur envoi message:', error);
        showNotification('Erreur lors de l\'envoi du message', 'error');
    }
}

// Basculer l'affichage de la section messagerie
async function toggleMessagingSection() {
    state.showMessagingSection = !state.showMessagingSection;
    if (state.showMessagingSection) {
        // Initialiser le système de messagerie amélioré
        await initMessaging();
    }
    render();
}

// ============================================
// FONCTIONS HISTORIQUE DES PARTAGES
// ============================================
// Note: L'historique des partages est maintenant affiché uniquement dans l'aperçu du document

function toggleFilters() {
    state.showFilters = !state.showFilters;
    render();
}

function updateFormData(field, value) {
    formData[field] = value;
}

function updateTempSearch(value) { 
    state.tempSearchTerm = value; 
}

function updateTempCategory(value) {
    state.tempSelectedCategory = value;
}

function updateTempDepartement(value) {
    state.tempSelectedDepartement = value;
}

function updateTempDateFrom(value) {
    state.tempDateFrom = value;
}

function updateTempDateTo(value) {
    state.tempDateTo = value;
}

function updateTempDateType(value) {
    state.tempDateType = value;
}

// NOUVEAU : Changer le tri
function changeSortBy(value) {
    state.sortBy = value;
    render();
}

async function applyFilters() {
    console.log('🔍 [DEBUG] applyFilters appelé');
    console.log('🔍 [DEBUG] tempSearchTerm:', state.tempSearchTerm);
    console.log('🔍 [DEBUG] tempSelectedCategory:', state.tempSelectedCategory);

    if (state.tempDateFrom && state.tempDateTo) {
        const dateDebut = new Date(state.tempDateFrom);
        const dateFin = new Date(state.tempDateTo);

        if (dateDebut > dateFin) {
            showNotification('⚠️ La date de début doit être antérieure à la date de fin', 'error');
            return;
        }
    }

    state.searchTerm = state.tempSearchTerm;
    state.selectedCategory = state.tempSelectedCategory;
    state.selectedDepartement = state.tempSelectedDepartement;
    state.dateFrom = state.tempDateFrom;
    state.dateTo = state.tempDateTo;
    state.dateType = state.tempDateType;

    console.log('🔍 [DEBUG] searchTerm après copie:', state.searchTerm);

    // ✅ RECHERCHE CÔTÉ SERVEUR : Reset à la page 1 et recharger avec les filtres
    state.pagination.page = 1;
    await loadData(1);

    // ✅ RECHERCHE DE DOCUMENTS : Si un terme de recherche est présent, chercher aussi dans les documents
    if (state.searchTerm && state.searchTerm.trim().length >= 2 && state.useDossiers) {
        await searchDocumentsAction(state.searchTerm.trim());
    } else {
        // Réinitialiser les résultats de recherche de documents
        state.documentSearchResults = [];
        state.showDocumentSearchResults = false;
    }

    console.log('🔍 [DEBUG] loadData terminé, total:', state.pagination.total);
}

// Rechercher des documents dans tous les dossiers accessibles
async function searchDocumentsAction(query) {
    if (!query || query.trim().length < 2) {
        state.documentSearchResults = [];
        state.showDocumentSearchResults = false;
        return;
    }

    try {
        console.log('🔍 Recherche de documents:', query);
        const result = await searchDocumentsInDossiers(state.currentUser, query.trim(), { limit: 50 });

        if (result.success && result.results) {
            state.documentSearchResults = result.results;
            state.documentSearchQuery = query;
            state.showDocumentSearchResults = result.results.length > 0;
            console.log(`🔍 ${result.results.length} document(s) trouvé(s)`);
        } else {
            state.documentSearchResults = [];
            state.showDocumentSearchResults = false;
        }
    } catch (error) {
        console.error('❌ Erreur recherche documents:', error);
        state.documentSearchResults = [];
        state.showDocumentSearchResults = false;
    }

    render();
}

// Afficher le dossier parent d'un document trouvé
async function openDossierFromSearchResult(dossierId) {
    try {
        const result = await getDossier(state.currentUser, dossierId);
        if (result.success && result.dossier) {
            state.selectedDossier = result.dossier;
            state.showDossierDetail = true;
            render();
        }
    } catch (error) {
        showNotification('Erreur lors de l\'ouverture du dossier', 'error');
    }
}

async function resetFilters() {
    state.searchTerm = '';
    state.documentSearchResults = [];
    state.showDocumentSearchResults = false;
    state.selectedCategory = 'tous';
    state.selectedDepartement = 'tous';
    state.dateFrom = '';
    state.dateTo = '';
    state.dateType = 'document';
    state.tempSearchTerm = '';
    state.tempSelectedCategory = 'tous';
    state.tempSelectedDepartement = 'tous';
    state.tempDateFrom = '';
    state.tempDateTo = '';
    state.tempDateType = 'document';

    // ✅ RECHERCHE CÔTÉ SERVEUR : Reset à la page 1 et recharger sans filtres
    state.pagination.page = 1;
    await loadData(1);
}

async function handleLogin() {
    const username = document.getElementById('login_username').value.trim();
    const password = document.getElementById('login_password').value;
    if (!username || !password) return showNotification('Remplir tous les champs', 'error');
    await login(username, password);
}

// Gérer le changement de rôle pour masquer le département seulement pour niveau 0 (Super Admin)
function handleRoleChange() {
    const roleSelect = document.getElementById('reg_role');
    const departementContainer = document.getElementById('departement_container');
    const departementSelect = document.getElementById('reg_departement');

    if (!roleSelect || !departementContainer || !departementSelect) return;

    const selectedOption = roleSelect.options[roleSelect.selectedIndex];
    const niveau = selectedOption ? parseInt(selectedOption.getAttribute('data-niveau')) : null;

    if (niveau === 0) {
        // Niveau 0 (Super Admin) : désactiver et masquer le département
        departementSelect.disabled = true;
        departementSelect.value = '';
        departementContainer.style.opacity = '0.5';
        departementContainer.style.pointerEvents = 'none';
    } else {
        // Niveaux 1, 2, 3 : activer le département (OBLIGATOIRE)
        departementSelect.disabled = false;
        departementContainer.style.opacity = '1';
        departementContainer.style.pointerEvents = 'auto';
    }
}

async function handleRegister() {
    const nom = document.getElementById('reg_nom').value.trim();
    const email = document.getElementById('reg_email').value.trim();
    const username = document.getElementById('reg_username').value.trim();
    const password = document.getElementById('reg_password').value;
    const passwordConfirm = document.getElementById('reg_password_confirm').value;
    const idRole = document.getElementById('reg_role').value;
    const idDepartement = document.getElementById('reg_departement').value;
    const adminPassword = document.getElementById('reg_admin_password').value;

    // Vérifier le niveau du rôle sélectionné
    const roleSelect = document.getElementById('reg_role');
    const selectedOption = roleSelect.options[roleSelect.selectedIndex];
    const niveau = selectedOption ? parseInt(selectedOption.getAttribute('data-niveau')) : null;

    // Seul le niveau 0 (Super Admin) n'a pas besoin de département
    // Niveaux 1, 2, 3 DOIVENT avoir un département
    if (niveau === 0) {
        if (!nom || !email || !username || !password || !passwordConfirm || !idRole || !adminPassword) {
            return showNotification('Veuillez remplir tous les champs', 'error');
        }
    } else {
        if (!nom || !email || !username || !password || !passwordConfirm || !idRole || !idDepartement || !adminPassword) {
            return showNotification('Veuillez remplir tous les champs', 'error');
        }
    }
    if (username.length < 3 || password.length < 4) {
        return showNotification('Username: 3+, Password: 4+', 'error');
    }
    if (password !== passwordConfirm) {
        return showNotification('Les mots de passe ne correspondent pas', 'error');
    }
    // Pour niveau 0 (Super Admin), envoyer null pour le département
    const finalIdDepartement = niveau === 0 ? null : idDepartement;
    const success = await register(username, password, nom, email, idRole, finalIdDepartement, adminPassword);
    if (success) {
        state.showRegister = false;
        render();
    }
}

function getStorageColorClass() {
    const percent = parseFloat(state.storageInfo.percentUsed);
    if (percent >= 90) return 'bg-red-500';
    if (percent >= 75) return 'bg-orange-500';
    if (percent >= 50) return 'bg-yellow-500';
    return 'bg-green-500';
}

// ===== RENDU =====
function render() {
    const colorOptions = [
        { value: 'bg-blue-100 text-blue-800', label: '🔵 Bleu' },
        { value: 'bg-green-100 text-green-800', label: '🟢 Vert' },
        { value: 'bg-yellow-100 text-yellow-800', label: '🟡 Jaune' },
        { value: 'bg-red-100 text-red-800', label: '🔴 Rouge' },
        { value: 'bg-purple-100 text-purple-800', label: '🟣 Violet' },
        { value: 'bg-pink-100 text-pink-800', label: '🩷 Rose' },
        { value: 'bg-orange-100 text-orange-800', label: '🟠 Orange' },
        { value: 'bg-gray-100 text-gray-800', label: '⚪ Gris' }
    ];
    
    const app = document.getElementById('app');

    // Si pas authentifié, rediriger vers login SANS afficher le contenu
    if (!state.isCheckingSession && !state.isAuthenticated) {
        // Rediriger vers la page de connexion unique
        window.location.href = '/login.html';
        return;
    }

    // Afficher l'app maintenant qu'on sait qu'on va afficher quelque chose
    app.style.display = 'block';

    // Afficher un loader pendant la vérification de session
    if (state.isCheckingSession) {
        app.innerHTML = `
            <div class="min-h-screen flex items-center justify-center gradient-bg">
                <div class="text-center">
                    <div class="loader mx-auto mb-4"></div>
                    <p class="text-lg font-semibold text-white">⏳ Restauration de la session...</p>
                </div>
            </div>
        `;
        return;
    }

    // Formulaire de changement de mot de passe obligatoire
    if (state.mustChangePassword) {
        app.innerHTML = `
            <div class="min-h-screen flex items-center justify-center" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);">
                <div class="bg-white p-10 rounded-3xl shadow-2xl w-full max-w-md animate-fade-in relative overflow-hidden">
                    <!-- Bandeau décoratif supérieur -->
                    <div style="position: absolute; top: 0; left: 0; right: 0; height: 6px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);"></div>

                    <div class="text-center mb-8 mt-4">
                        <!-- Logo MES -->
                        <div style="
                            width: 90px;
                            height: 90px;
                            margin: 0 auto 20px;
                            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                            border-radius: 50%;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            box-shadow: 0 8px 24px rgba(102, 126, 234, 0.3);
                        ">
                            <span style="font-size: 48px;">🎓</span>
                        </div>

                        <h1 style="
                            font-size: 28px;
                            font-weight: 700;
                            margin-bottom: 8px;
                            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                            -webkit-background-clip: text;
                            -webkit-text-fill-color: transparent;
                            background-clip: text;
                        ">Bienvenue à la M.E.S</h1>

                        <p style="
                            color: #475569;
                            font-size: 13px;
                            font-weight: 600;
                            text-transform: uppercase;
                            letter-spacing: 1.2px;
                            margin-bottom: 12px;
                        ">Centre d'Études et de Recherches<br>sur les Énergies Renouvelables</p>

                        <!-- Séparateur -->
                        <div style="width: 60px; height: 3px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); margin: 20px auto; border-radius: 2px;"></div>

                        <h2 class="text-2xl font-black text-gray-900 mb-2">🔐 Première Connexion</h2>
                        <p class="text-gray-700 font-medium text-sm">Bienvenue <strong style="color: #667eea;">${state.currentUser}</strong> !<br>Pour sécuriser votre compte, veuillez définir un nouveau mot de passe personnel.</p>
                    </div>

                    <div class="space-y-4">
                        <div class="bg-yellow-50 border-2 border-yellow-300 rounded-xl p-4 mb-4">
                            <p class="text-sm text-yellow-800 font-medium">
                                ⚠️ <strong>Important :</strong> Créez un nouveau mot de passe sécurisé (minimum 4 caractères)
                            </p>
                        </div>

                        <div class="relative">
                            <input id="change_old_password" type="password" placeholder="Ancien mot de passe"
                                   class="w-full px-4 py-3 pr-12 border-2 rounded-xl input-modern">
                            <button type="button" onclick="togglePasswordVisibility('change_old_password')"
                                    class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-600 hover:text-gray-900 focus:outline-none text-xl">
                                <span id="change_old_password_icon">👁️</span>
                            </button>
                        </div>

                        <div class="relative">
                            <input id="change_new_password" type="password" placeholder="Nouveau mot de passe (4+ caractères)"
                                   class="w-full px-4 py-3 pr-12 border-2 rounded-xl input-modern">
                            <button type="button" onclick="togglePasswordVisibility('change_new_password')"
                                    class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-600 hover:text-gray-900 focus:outline-none text-xl">
                                <span id="change_new_password_icon">👁️</span>
                            </button>
                        </div>

                        <div class="relative">
                            <input id="change_confirm_password" type="password" placeholder="Confirmer le nouveau mot de passe"
                                   class="w-full px-4 py-3 pr-12 border-2 rounded-xl input-modern">
                            <button type="button" onclick="togglePasswordVisibility('change_confirm_password')"
                                    class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-600 hover:text-gray-900 focus:outline-none text-xl">
                                <span id="change_confirm_password_icon">👁️</span>
                            </button>
                        </div>

                        <button onclick="handlePasswordChange()"
                                class="w-full btn-primary text-white py-3 rounded-xl font-semibold transition btn-shine">
                            ✅ Changer mon mot de passe
                        </button>

                        <div class="mt-6 pt-4 border-t-2 border-gray-300">
                            <p class="text-center text-xs text-gray-600">
                                💡 Conseil : Utilisez un mot de passe unique que vous n'utilisez nulle part ailleurs
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        `;
        return;
    }

    const filteredDocs = getFilteredDocs();
    const activeFilters = state.searchTerm || state.selectedCategory !== 'tous' || state.selectedDepartement !== 'tous' || state.dateFrom || state.dateTo || state.sortBy;
    
    app.innerHTML = `
        <div class="min-h-screen" style="background: linear-gradient(135deg, #e0f2fe 0%, #d1fae5 100%);">
            <!-- HEADER ULTRA-COMPACT -->
            <header class="header-glass sticky top-0 z-40 shadow-lg">
                <div class="max-w-7xl mx-auto px-4 py-3">
                    <div class="flex justify-between items-center">
                        <div class="logo-container">
                            <img src="/logo_white (2).png" alt="Logo MES" style="height: 32px; width: auto;">
                            <div>
                                <h1 class="logo-text" style="font-size: 1rem;">M.E.S</h1>
                                <p class="text-xs text-blue-900 font-bold">Bonjour, <strong>${state.currentUser}</strong></p>
                            </div>
                        </div>
                        <div class="flex gap-2">
                            <button onclick="toggleMessagingSection()"
                                    class="nav-btn ${state.showMessagingSection ? 'nav-btn-active' : 'nav-btn-inactive'} relative">
                                📬 Boîte de réception
                                ${state.unreadCount > 0 ? `
                                    <span class="absolute -top-2 -right-2 px-2 py-1 bg-red-600 text-white text-xs font-bold rounded-full animate-pulse border-2 border-white shadow-lg">
                                        ${state.unreadCount}
                                    </span>
                                ` : ''}
                            </button>
                            <button onclick="toggleFilters()"
                                    class="nav-btn ${state.showFilters ? 'nav-btn-active' : 'nav-btn-inactive'}">
                                🔍 Filtres
                            </button>
                            <button onclick="window.location.href='/new-dashboard.html'"
                                    class="nav-btn nav-btn-inactive relative group"
                                    title="Essayer le nouveau design">
                                🎨 Nouveau Design
                                <span class="absolute -top-2 -right-2 px-2 py-1 bg-gradient-to-r from-purple-500 to-pink-500 text-white text-xs font-bold rounded-full animate-pulse border-2 border-white shadow-lg">
                                    BETA
                                </span>
                            </button>
                            <button onclick="toggleMenu()"
                                    class="px-3 py-2 bg-gradient-to-br from-gray-100 to-gray-200 rounded-lg hover:shadow-lg transition">
                                ☰
                            </button>
                        </div>
                    </div>
                </div>

                <!-- PANNEAU DE FILTRES ESCAMOTABLE -->
                ${state.showFilters ? `
                <div class="border-t border-gray-200 bg-gradient-to-br from-blue-50 to-green-50" style="animation: slideDown 0.3s ease-out;">
                    <div class="max-w-7xl mx-auto px-4 py-4 space-y-4">
                        <div class="flex gap-3 flex-wrap">
                            <div class="flex-1 min-w-[200px]">
                                <input type="text" placeholder="🔍 Rechercher par ID, nom ou tags..."
                                       value="${state.tempSearchTerm}"
                                       oninput="updateTempSearch(this.value)"
                                       class="w-full px-4 py-3 text-sm rounded-lg border-2 focus:ring-2 focus:ring-blue-500 outline-none shadow-sm">
                            </div>
                            <select onchange="updateTempCategory(this.value)"
                                    class="px-4 py-2 text-sm border-2 rounded-lg outline-none font-medium">
                                <option value="tous" ${state.tempSelectedCategory === 'tous' ? 'selected' : ''}>📁 Toutes catégories</option>
                                ${state.categories.map(cat => `
                                    <option value="${cat.id}" ${state.tempSelectedCategory === cat.id ? 'selected' : ''}>
                                        ${cat.icon} ${cat.nom}
                                    </option>
                                `).join('')}
                            </select>
                            <select onchange="updateTempDepartement(this.value)"
                                    class="px-4 py-2 text-sm border-2 rounded-lg outline-none font-medium">
                                <option value="tous" ${state.tempSelectedDepartement === 'tous' ? 'selected' : ''}>
                                    ${state.currentUserInfo && (state.currentUserInfo.niveau === 1 || state.currentUserInfo.niveau === 2 || state.currentUserInfo.niveau === 3)
                                        ? '🏢 Tous services'
                                        : '🏢 Tous départements'}
                                </option>
                                ${(state.currentUserInfo && (state.currentUserInfo.niveau === 1 || state.currentUserInfo.niveau === 2 || state.currentUserInfo.niveau === 3)
                                    ? state.services
                                    : state.departements
                                ).map(dept => `
                                    <option value="${dept.nom}" ${state.tempSelectedDepartement === dept.nom ? 'selected' : ''}>
                                        🏢 ${dept.nom}
                                    </option>
                                `).join('')}
                            </select>
                            <select onchange="changeSortBy(this.value)"
                                    class="px-4 py-2 text-sm border-2 rounded-lg outline-none font-medium bg-white">
                                <option value="" ${state.sortBy === '' ? 'selected' : ''}>🔍 Aucun tri spécifique</option>
                                <option value="date_desc" ${state.sortBy === 'date_desc' ? 'selected' : ''}>📄 Plus récent document</option>
                                <option value="date_asc" ${state.sortBy === 'date_asc' ? 'selected' : ''}>📄 Plus ancien document</option>
                                <option value="titre_asc" ${state.sortBy === 'titre_asc' ? 'selected' : ''}>🔤 A → Z</option>
                                <option value="titre_desc" ${state.sortBy === 'titre_desc' ? 'selected' : ''}>🔤 Z → A</option>
                                <option value="taille_desc" ${state.sortBy === 'taille_desc' ? 'selected' : ''}>📦 Plus grande taille</option>
                                <option value="taille_asc" ${state.sortBy === 'taille_asc' ? 'selected' : ''}>📦 Plus petite taille</option>
                            </select>
                        </div>

                        <div class="bg-white border-2 border-blue-200 rounded-lg p-3">
                            <div class="flex flex-col gap-3">
                                <div class="flex items-center gap-4 flex-wrap">
                                    <span class="text-sm font-bold text-blue-800">📅 Filtrer par date:</span>
                                    <div class="flex gap-4">
                                        <label class="flex items-center gap-2 cursor-pointer">
                                            <input type="radio" name="dateType" value="document"
                                                   ${state.tempDateType === 'document' ? 'checked' : ''}
                                                   onchange="updateTempDateType('document')"
                                                   class="text-blue-600" />
                                            <span class="text-sm font-medium">Date du document</span>
                                        </label>
                                        <label class="flex items-center gap-2 cursor-pointer">
                                            <input type="radio" name="dateType" value="ajout"
                                                   ${state.tempDateType === 'ajout' ? 'checked' : ''}
                                                   onchange="updateTempDateType('ajout')"
                                                   class="text-blue-600" />
                                            <span class="text-sm font-medium">Date d'ajout</span>
                                        </label>
                                    </div>
                                </div>
                                
                                <div class="flex gap-3 flex-wrap">
                                    <div class="flex-1 min-w-[150px]">
                                        <label class="block text-xs text-blue-900 font-bold mb-1">📅 Date de début</label>
                                        <input type="date" value="${state.tempDateFrom}"
                                               onchange="updateTempDateFrom(this.value)"
                                               class="w-full px-3 py-2 border-2 rounded-lg text-sm input-modern" />
                                    </div>
                                    <div class="flex-1 min-w-[150px]">
                                        <label class="block text-xs text-blue-900 font-bold mb-1">📅 Date de fin</label>
                                        <input type="date" value="${state.tempDateTo}"
                                               onchange="updateTempDateTo(this.value)"
                                               class="w-full px-3 py-2 border-2 rounded-lg text-sm input-modern" />
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <div class="flex gap-2 flex-wrap">
                            <button onclick="applyFilters()"
                                    class="px-6 py-2 btn-primary text-white rounded-lg hover:shadow-lg transition text-sm font-semibold">
                                🔎 Appliquer
                            </button>
                            ${activeFilters ? `
                                <button onclick="resetFilters()"
                                        class="px-6 py-2 bg-gradient-to-br from-red-500 to-red-600 text-white rounded-lg hover:shadow-lg transition text-sm font-semibold">
                                    ✖ Réinitialiser
                                </button>
                            ` : ''}
                            <button onclick="toggleFilters()"
                                    class="px-6 py-2 bg-gradient-to-br from-gray-100 to-gray-200 rounded-lg hover:shadow-lg transition text-sm font-semibold ml-auto">
                                ⬆ Masquer les filtres
                            </button>
                        </div>
                        
                        ${activeFilters ? `
                            <div class="bg-blue-50 border border-blue-200 rounded-lg p-2">
                                <p class="text-xs text-blue-800">
                                    <strong>✓ ${state.dossierPagination.total}</strong> dossier(s) trouvé(s)
                                    ${state.searchTerm ? ` • "${state.searchTerm}"` : ''}
                                    ${state.selectedCategory !== 'tous' ? ` • ${getCategoryName(state.selectedCategory)}` : ''}
                                </p>
                            </div>
                        ` : ''}
                    </div>
                </div>
                ` : ''}
            </header>

            <main class="max-w-7xl mx-auto px-4 py-4">

                ${state.showMessagingSection ? renderMessaging() : ''}

                <!-- Barre d'actions Dossiers -->
                <div class="mb-4 flex items-center justify-between bg-white rounded-xl p-3 shadow-md">
                    <div class="flex items-center gap-4">
                        <span class="px-4 py-2 rounded-lg font-semibold bg-blue-500 text-white">
                            📁 Dossiers
                        </span>
                        <span class="text-sm text-gray-600">
                            ${state.dossierPagination.total || 0} dossier(s)
                        </span>
                    </div>
                    <button onclick="state.showDossierUploadForm = true; render();"
                            class="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 font-semibold">
                        ➕ Créer un dossier
                    </button>
                </div>

                <!-- Résultats de recherche de documents -->
                ${state.showDocumentSearchResults && state.documentSearchResults.length > 0 ? `
                    <div class="mb-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-4 shadow-md border-2 border-blue-200">
                        <div class="flex items-center justify-between mb-3">
                            <h3 class="text-lg font-bold text-blue-800">
                                📄 ${state.documentSearchResults.length} document(s) trouvé(s) pour "${escapeHtml(state.documentSearchQuery)}"
                            </h3>
                            <button onclick="state.showDocumentSearchResults = false; state.documentSearchResults = []; render();"
                                    class="text-gray-500 hover:text-gray-700 text-xl font-bold">&times;</button>
                        </div>
                        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-96 overflow-y-auto">
                            ${state.documentSearchResults.map(doc => `
                                <div class="bg-white p-3 rounded-lg shadow-sm border hover:shadow-md transition cursor-pointer"
                                     onclick="openDossierFromSearchResult('${doc.dossier?.idDossier || doc.dossier?._id}')">
                                    <div class="flex items-start gap-2">
                                        <span class="text-2xl">${getFileIcon(doc.type, doc.nom)}</span>
                                        <div class="flex-1 min-w-0">
                                            <div class="font-semibold text-gray-800 truncate">${doc.nomOriginal || doc.nom}</div>
                                            <div class="text-xs text-gray-500">📦 ${formatFileSize(doc.taille || 0)}</div>
                                            <div class="text-xs font-mono text-blue-600 truncate mt-1">${doc.idDocument || doc.id || ''}</div>
                                            ${doc.dossier ? `
                                                <div class="mt-2 p-2 bg-gray-50 rounded text-xs">
                                                    <span class="font-semibold">📁 ${doc.dossier.titre}</span>
                                                    ${doc.dossier.categorie ? ` • ${doc.dossier.categorie}` : ''}
                                                </div>
                                            ` : ''}
                                        </div>
                                    </div>
                                    <div class="flex gap-2 mt-2 border-t pt-2">
                                        <button onclick="event.stopPropagation(); downloadDossierFile('${doc.dossier?.idDossier}', '${doc.idDocument || doc.id}')"
                                                class="flex-1 px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs hover:bg-blue-200">
                                            📥 Télécharger
                                        </button>
                                        <button onclick="event.stopPropagation(); openDossierFromSearchResult('${doc.dossier?.idDossier || doc.dossier?._id}')"
                                                class="flex-1 px-2 py-1 bg-green-100 text-green-700 rounded text-xs hover:bg-green-200">
                                            📁 Ouvrir le dossier
                                        </button>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                ` : ''}

                <!-- Liste des Dossiers -->
                <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                    ${state.dossiers.length > 0 ? state.dossiers.map(dossier => renderDossierCard(dossier)).join('') : `
                        <div class="col-span-full text-center py-8 bg-white rounded-xl shadow-md">
                            <div class="text-4xl mb-2">📁</div>
                            <h3 class="text-lg font-bold text-gray-700 mb-1">Aucun dossier</h3>
                            <p class="text-gray-500 text-sm">Créez votre premier dossier</p>
                        </div>
                    `}
                </div>

                <!-- Pagination dossiers -->
                ${state.dossierPagination.totalPages > 1 ? `
                    <div class="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4 bg-white rounded-xl p-4 shadow-md">
                        <div class="text-sm text-gray-600">
                            Page <strong>${state.dossierPagination.page}</strong> sur <strong>${state.dossierPagination.totalPages}</strong>
                            • <strong>${state.dossierPagination.total}</strong> dossiers au total
                        </div>
                        <div class="flex items-center gap-2">
                            <button onclick="loadDossiers(1)" ${state.dossierPagination.page <= 1 ? 'disabled' : ''}
                                    class="px-3 py-2 rounded-lg ${state.dossierPagination.page > 1 ? 'bg-blue-500 text-white hover:bg-blue-600' : 'bg-gray-200 text-gray-400 cursor-not-allowed'}">⏮️</button>
                            <button onclick="loadDossiers(${state.dossierPagination.page - 1})" ${state.dossierPagination.page <= 1 ? 'disabled' : ''}
                                    class="px-4 py-2 rounded-lg ${state.dossierPagination.page > 1 ? 'bg-blue-500 text-white hover:bg-blue-600' : 'bg-gray-200 text-gray-400 cursor-not-allowed'}">◀ Précédent</button>
                            <span class="px-4 py-2 bg-gray-100 rounded-lg font-bold">${state.dossierPagination.page}</span>
                            <button onclick="loadDossiers(${state.dossierPagination.page + 1})" ${state.dossierPagination.page >= state.dossierPagination.totalPages ? 'disabled' : ''}
                                    class="px-4 py-2 rounded-lg ${state.dossierPagination.page < state.dossierPagination.totalPages ? 'bg-blue-500 text-white hover:bg-blue-600' : 'bg-gray-200 text-gray-400 cursor-not-allowed'}">Suivant ▶</button>
                            <button onclick="loadDossiers(${state.dossierPagination.totalPages})" ${state.dossierPagination.page >= state.dossierPagination.totalPages ? 'disabled' : ''}
                                    class="px-3 py-2 rounded-lg ${state.dossierPagination.page < state.dossierPagination.totalPages ? 'bg-blue-500 text-white hover:bg-blue-600' : 'bg-gray-200 text-gray-400 cursor-not-allowed'}">⏭️</button>
                        </div>
                    </div>
                ` : ''}
            </main>

            ${renderDossierDetailModal()}
            ${renderDossierUploadForm()}
            ${renderShareDocumentModal()}
            ${renderPreviewModal()}

            ${state.showMenu ? `
                <div class="fixed inset-0 bg-black bg-opacity-50 z-50 backdrop-blur-sm" onclick="toggleMenu()"></div>
                <div class="fixed right-0 top-0 h-screen w-80 sidebar-menu shadow-2xl z-50 animate-slide-in flex flex-col">
                    <div class="flex-shrink-0 p-6 pb-4 border-b border-gray-200">
                        <button onclick="toggleMenu()" class="absolute top-4 right-4 text-2xl text-red-600 hover:text-red-800 font-bold">✖</button>
                        <h2 class="text-2xl font-bold bg-gradient-to-r from-blue-600 to-green-600 bg-clip-text text-transparent">Menu</h2>
                    </div>
                    <div class="flex-1 overflow-y-auto p-6 pt-4">
                        <!-- Affichage du rôle et niveau -->
                        ${state.currentUserInfo ? `
                            <div class="mb-4 p-3 bg-gradient-to-br from-blue-50 to-green-50 rounded-xl">
                                <p class="text-sm font-semibold text-gray-700">${state.currentUserInfo.nom}</p>
                                <p class="text-xs text-blue-900 font-bold">Niveau ${state.currentUserInfo.niveau} - ${state.currentUserInfo.role}</p>
                            </div>
                        ` : ''}

                        <div class="space-y-2">
                            ${state.currentUserInfo && state.currentUserInfo.niveau === 0 ? `
                                <!-- Menu complet pour NIVEAU 0 (Super Admin) -->
                                <button onclick="toggleDepartementsManagement()" class="w-full text-left px-4 py-4 hover:bg-gradient-to-r hover:from-green-50 hover:to-teal-50 rounded-xl transition font-medium">
                                    🏢 Gérer les départements
                                </button>
                                <button onclick="toggleCategories()" class="w-full text-left px-4 py-4 hover:bg-gradient-to-r hover:from-blue-50 hover:to-green-50 rounded-xl transition font-medium">
                                    📂 Gérer les catégories
                                </button>
                                <button onclick="toggleUsersManagement()" class="w-full text-left px-4 py-4 hover:bg-gradient-to-r hover:from-purple-50 hover:to-pink-50 rounded-xl transition font-medium">
                                    👥 Gérer les utilisateurs
                                </button>
                                <button onclick="toggleRolesManagement()" class="w-full text-left px-4 py-4 hover:bg-gradient-to-r hover:from-indigo-50 hover:to-blue-50 rounded-xl transition font-medium">
                                    🎭 Gérer les rôles
                                </button>
                                <button onclick="toggleAdvancedStats()" class="w-full text-left px-4 py-4 hover:bg-gradient-to-r hover:from-green-50 hover:to-teal-50 rounded-xl transition font-medium">
                                    📊 Statistiques avancées
                                </button>
                                <button onclick="createExcelReport()" class="w-full text-left px-4 py-4 hover:bg-gradient-to-r hover:from-green-50 hover:to-emerald-50 rounded-xl transition font-medium">
                                    📊 Créer un rapport Excel
                                </button>
                                <button onclick="exportData()" class="w-full text-left px-4 py-4 hover:bg-gradient-to-r hover:from-blue-50 hover:to-green-50 rounded-xl transition font-medium">
                                    💾 Exporter les données
                                </button>
                                <label class="block w-full text-left px-4 py-4 hover:bg-gradient-to-r hover:from-blue-50 hover:to-green-50 rounded-xl cursor-pointer transition font-medium">
                                    📥 Importer des données
                                    <input type="file" accept=".json" onchange="importData(event)" class="hidden">
                                </label>
                                <button onclick="deleteAllDocuments()" class="w-full text-left px-4 py-4 hover:bg-red-50 text-red-600 rounded-xl transition font-medium">
                                    🗑️ Tout supprimer
                                </button>
                            ` : state.currentUserInfo && state.currentUserInfo.niveau === 1 ? `
                                <!-- Menu complet pour NIVEAU 1 (Admin Départemental) -->
                                <button onclick="toggleCategories()" class="w-full text-left px-4 py-4 hover:bg-gradient-to-r hover:from-blue-50 hover:to-green-50 rounded-xl transition font-medium">
                                    📂 Gérer les catégories
                                </button>
                                <button onclick="toggleDepartements()" class="w-full text-left px-4 py-4 hover:bg-gradient-to-r hover:from-blue-50 hover:to-green-50 rounded-xl transition font-medium">
                                    🏢 Gérer les services
                                </button>
                                <button onclick="toggleUsersManagement()" class="w-full text-left px-4 py-4 hover:bg-gradient-to-r hover:from-purple-50 hover:to-pink-50 rounded-xl transition font-medium">
                                    👥 Gérer les utilisateurs
                                </button>
                                <button onclick="toggleAdvancedStats()" class="w-full text-left px-4 py-4 hover:bg-gradient-to-r hover:from-green-50 hover:to-teal-50 rounded-xl transition font-medium">
                                    📊 Statistiques avancées
                                </button>
                                <button onclick="createExcelReport()" class="w-full text-left px-4 py-4 hover:bg-gradient-to-r hover:from-green-50 hover:to-emerald-50 rounded-xl transition font-medium">
                                    📊 Créer un rapport Excel
                                </button>
                            ` : ''}

                            <!-- ✅ NOUVEAU: Boîte de réception des messages pour tous les niveaux -->
                            <button onclick="toggleMessagingSection()" class="w-full text-left px-4 py-4 hover:bg-gradient-to-r hover:from-blue-50 hover:to-green-50 rounded-xl transition font-medium relative">
                                📬 Boîte de réception des messages
                                ${state.unreadCount > 0 ? `
                                    <span class="absolute right-4 top-4 px-2 py-1 bg-red-500 text-white text-xs font-bold rounded-full">
                                        ${state.unreadCount}
                                    </span>
                                ` : ''}
                            </button>

                            <!-- ❌ "Mon Profil" SUPPRIMÉ pour raisons de sécurité (modification niveau possible) -->

                            <!-- Déconnexion pour tous les niveaux -->
                            <button onclick="logout()" class="w-full text-left px-4 py-4 hover:bg-gradient-to-r hover:from-blue-50 hover:to-green-50 rounded-xl transition font-medium">
                                🚪 Déconnexion
                            </button>
                        </div>
                    </div>
                </div>
            ` : ''}
            
            <!-- Ancien formulaire supprimé - utiliser showDossierUploadForm -->
            
            ${state.showCategories ? `
                <div class="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4 backdrop-blur-sm" 
                     onclick="if(event.target === this) toggleCategories()">
                    <div class="modal-glass rounded-2xl p-8 max-w-md w-full max-h-[80vh] overflow-y-auto shadow-2xl animate-fade-in" onclick="event.stopPropagation()">
                        <h2 class="text-2xl font-bold mb-6 bg-gradient-to-r from-blue-600 to-green-600 bg-clip-text text-transparent">📂 Gérer les catégories</h2>
                        <div class="space-y-3 mb-6">
                            ${state.categories.map(cat => `
                                ${state.editingCategory && state.editingCategory.id === cat.id ? `
                                    <!-- Mode édition -->
                                    <div class="p-4 bg-blue-50 rounded-xl space-y-3">
                                        <div class="flex items-center gap-2 mb-2">
                                            <span class="text-lg font-bold">✏️ Modifier</span>
                                        </div>
                                        <input id="edit_cat_nom" type="text" value="${cat.nom}" placeholder="Nom de la catégorie"
                                               class="w-full px-3 py-2 border-2 rounded-lg input-modern text-sm">
                                        <input id="edit_cat_icon" type="text" value="${cat.icon}" placeholder="Emoji"
                                               class="w-full px-3 py-2 border-2 rounded-lg input-modern text-sm">
                                        <select id="edit_cat_couleur" class="w-full px-3 py-2 border-2 rounded-lg input-modern text-sm">
                                            ${colorOptions.map(opt => `
                                                <option value="${opt.value}" ${cat.couleur === opt.value ? 'selected' : ''}>${opt.label}</option>
                                            `).join('')}
                                        </select>
                                        <div class="flex gap-2">
                                            <button onclick="saveEditCategory()"
                                                    class="flex-1 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition text-sm font-semibold">
                                                ✅ Sauvegarder
                                            </button>
                                            <button onclick="cancelEditCategory()"
                                                    class="flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition text-sm font-medium">
                                                ❌ Annuler
                                            </button>
                                        </div>
                                    </div>
                                ` : `
                                    <!-- Mode affichage normal -->
                                    <div class="flex justify-between items-center p-4 hover:bg-gradient-to-r hover:from-blue-50 hover:to-green-50 rounded-xl transition">
                                        <span class="font-medium">${cat.icon} ${cat.nom}</span>
                                        <div class="flex gap-2">
                                            <button onclick="startEditCategory('${cat.id}')"
                                                    class="text-blue-500 hover:text-blue-700 text-xl transition" title="Modifier">
                                                ✏️
                                            </button>
                                            <button onclick="deleteCategory('${cat.id}')"
                                                    class="text-red-500 hover:text-red-700 text-xl transition" title="Supprimer">
                                                🗑️
                                            </button>
                                        </div>
                                    </div>
                                `}
                            `).join('')}
                        </div>
                        <div class="border-t-2 border-gray-200 pt-6 space-y-4">
                            <h3 class="font-bold text-lg">➕ Nouvelle catégorie</h3>
                            <input id="new_cat_nom" type="text" placeholder="Nom de la catégorie"
                                   class="w-full px-4 py-3 border-2 rounded-xl input-modern">
                            <input id="new_cat_icon" type="text" placeholder="Emoji (ex: 📊)"
                                   class="w-full px-4 py-3 border-2 rounded-xl input-modern">
                            <select id="new_cat_couleur" 
                                    class="w-full px-4 py-3 border-2 rounded-xl input-modern font-medium">
                                ${colorOptions.map(opt => `
                                    <option value="${opt.value}">${opt.label}</option>
                                `).join('')}
                            </select>
                            <button onclick="addCategory()" 
                                    class="w-full px-6 py-4 btn-success text-white rounded-xl hover:shadow-lg transition font-semibold">
                                ✅ Ajouter la catégorie
                            </button>
                            <button onclick="toggleCategories()" 
                                    class="w-full px-6 py-3 bg-gradient-to-br from-gray-100 to-gray-200 rounded-xl hover:shadow-md transition font-medium">
                                Fermer
                            </button>
                        </div>
                    </div>
                </div>
            ` : ''}

            ${state.showDepartements ? `
                <div class="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4 backdrop-blur-sm"
                     onclick="if(event.target === this) toggleDepartements()">
                    <div class="modal-glass rounded-2xl p-8 max-w-md w-full max-h-[80vh] overflow-y-auto shadow-2xl animate-fade-in" onclick="event.stopPropagation()">
                        <h2 class="text-2xl font-bold mb-6 bg-gradient-to-r from-blue-600 to-green-600 bg-clip-text text-transparent">
                            ${state.currentUserInfo && state.currentUserInfo.niveau === 1
                                ? '🏢 Gérer les services'
                                : '🏢 Gérer les départements'}
                        </h2>
                        ${state.currentUserInfo && state.currentUserInfo.niveau === 1 ? `
                            <div class="bg-blue-50 border-2 border-blue-300 rounded-lg p-3 mb-4">
                                <p class="text-xs text-blue-800 font-medium">
                                    ℹ️ En tant qu'administrateur départemental, vous gérez les <strong>services</strong> de votre département.
                                </p>
                            </div>
                        ` : ''}
                        <div class="space-y-3 mb-6">
                            ${(state.currentUserInfo && state.currentUserInfo.niveau === 1 ? state.services : state.departements).map(dept => `
                                ${state.editingDepartement && state.editingDepartement._id === dept._id ? `
                                    <!-- Mode édition -->
                                    <div class="p-4 bg-blue-50 rounded-xl space-y-3">
                                        <div class="flex items-center gap-2 mb-2">
                                            <span class="text-lg font-bold">✏️ Modifier</span>
                                        </div>
                                        <input id="edit_dept_nom" type="text" value="${dept.nom}" placeholder="${state.currentUserInfo && state.currentUserInfo.niveau === 1 ? 'Nom du service' : 'Nom du département'}"
                                               class="w-full px-3 py-2 border-2 rounded-lg input-modern text-sm">
                                        <input id="edit_dept_code" type="text" value="${dept.code}" placeholder="Code (ex: INFO)"
                                               class="w-full px-3 py-2 border-2 rounded-lg input-modern text-sm">
                                        <div class="flex gap-2">
                                            <button onclick="saveEditDepartement()"
                                                    class="flex-1 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition text-sm font-semibold">
                                                ✅ Sauvegarder
                                            </button>
                                            <button onclick="cancelEditDepartement()"
                                                    class="flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition text-sm font-medium">
                                                ❌ Annuler
                                            </button>
                                        </div>
                                    </div>
                                ` : `
                                    <!-- Mode affichage normal -->
                                    <div class="flex justify-between items-center p-4 hover:bg-gradient-to-r hover:from-blue-50 hover:to-green-50 rounded-xl transition">
                                        <span class="font-medium">🏢 ${dept.nom} (${dept.code})</span>
                                        <div class="flex gap-2">
                                            <button onclick="startEditDepartement('${dept._id}')"
                                                    class="text-blue-500 hover:text-blue-700 text-xl transition" title="Modifier">
                                                ✏️
                                            </button>
                                            <button onclick="deleteDepartement('${dept._id}')"
                                                    class="text-red-500 hover:text-red-700 text-xl transition" title="Supprimer">
                                                🗑️
                                            </button>
                                        </div>
                                    </div>
                                `}
                            `).join('')}
                        </div>
                        <div class="border-t-2 border-gray-200 pt-6 space-y-4">
                            <h3 class="font-bold text-lg">
                                ${state.currentUserInfo && state.currentUserInfo.niveau === 1
                                    ? '➕ Nouveau service'
                                    : '➕ Nouveau département'}
                            </h3>
                            <input id="new_dept_nom" type="text" placeholder="${state.currentUserInfo && state.currentUserInfo.niveau === 1 ? 'Nom du service' : 'Nom du département'}"
                                   class="w-full px-4 py-3 border-2 rounded-xl input-modern">
                            <input id="new_dept_code" type="text" placeholder="Code (ex: INFO, MATH)"
                                   class="w-full px-4 py-3 border-2 rounded-xl input-modern">
                            <button onclick="addDepartement()"
                                    class="w-full px-6 py-4 btn-success text-white rounded-xl hover:shadow-lg transition font-semibold">
                                ${state.currentUserInfo && state.currentUserInfo.niveau === 1
                                    ? '✅ Ajouter le service'
                                    : '✅ Ajouter le département'}
                            </button>
                            <button onclick="toggleDepartements()"
                                    class="w-full px-6 py-3 bg-gradient-to-br from-gray-100 to-gray-200 rounded-xl hover:shadow-md transition font-medium">
                                Fermer
                            </button>
                        </div>
                    </div>
                </div>
            ` : ''}

            <!-- NOUVEAU : Gestion des utilisateurs -->
            ${renderUsersManagement()}

            <!-- NOUVEAU : Gestion des rôles -->
            ${renderRolesManagement()}

            <!-- NOUVEAU : Gestion des départements (Niveau 0) -->
            ${renderDepartementsManagement()}

            <!-- NOUVEAU : Statistiques avancées -->
            ${renderAdvancedStats()}

            <!-- NOUVEAU : Détail du document AVEC PRÉVISUALISATION -->
            ${state.selectedDoc ? `
                <div class="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4 backdrop-blur-sm" 
                     onclick="if(event.target === this) closeDocDetail()">
                    <div class="modal-glass rounded-2xl p-8 max-w-5xl w-full max-h-[90vh] overflow-y-auto shadow-2xl animate-fade-in" onclick="event.stopPropagation()">
                        <div class="flex justify-between items-start mb-6">
                            <h2 class="text-3xl font-bold text-gray-800">${state.selectedDoc.titre}</h2>
                            <button onclick="closeDocDetail()" class="text-2xl text-gray-600 hover:text-gray-800 transition">✖</button>
                        </div>
                        
                        <!-- PRÉVISUALISATION -->
                        <div class="mb-6 bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl p-6 border-2 border-gray-200">
                            <div class="flex items-center justify-between mb-4">
                                <h3 class="font-bold text-lg text-gray-700 flex items-center gap-2">
                                    <span class="text-2xl">👁️</span> Aperçu du document
                                </h3>
                                <span class="text-sm text-gray-500 bg-white px-3 py-1 rounded-full">
                                    ${state.selectedDoc.nomFichier}
                                </span>
                            </div>
                            
                            <div class="bg-white rounded-xl p-4 shadow-inner">
                                ${state.selectedDoc.type && state.selectedDoc.type.startsWith('image/') ? `
                                    <img src="${state.selectedDoc.contenu}"
                                         alt="${escapeHtml(state.selectedDoc.titre)}"
                                         class="w-full h-auto max-h-[500px] object-contain rounded-lg cursor-zoom-in"
                                         onclick="window.open(this.src, '_blank')"
                                         title="Cliquer pour agrandir">
                                ` : state.selectedDoc.type === 'application/pdf' ? `
                                    <div class="relative" style="height: 600px;">
                                        <iframe src="${state.selectedDoc.contenu}#toolbar=0" 
                                                class="w-full h-full rounded-lg border-2 border-gray-200"
                                                title="Aperçu PDF"></iframe>
                                        <p class="text-center text-sm text-gray-600 mt-3">
                                            💡 Faites défiler pour voir tout le document
                                        </p>
                                    </div>
                                ` : (state.selectedDoc.type && (state.selectedDoc.type.includes('word') || state.selectedDoc.type.includes('document'))) || (state.selectedDoc.nomFichier && (state.selectedDoc.nomFichier.endsWith('.doc') || state.selectedDoc.nomFichier.endsWith('.docx'))) ? `
                                    <div>
                                        <div class="bg-gradient-to-br from-blue-50 to-indigo-50 p-4 rounded-lg mb-4 border-2 border-blue-200">
                                            <div class="flex items-center justify-between mb-3">
                                                <div class="flex items-center gap-3">
                                                    <span class="text-4xl">📝</span>
                                                    <div>
                                                        <p class="font-bold text-lg text-gray-800">Document Microsoft Word</p>
                                                        <p class="text-sm text-gray-600">${state.selectedDoc.nomFichier} • ${formatSize(state.selectedDoc.taille)}</p>
                                                    </div>
                                                </div>
                                                <button onclick="downloadDoc(state.selectedDoc)"
                                                        class="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition font-medium text-sm">
                                                    📥 Télécharger
                                                </button>
                                            </div>
                                        </div>
                                        ${window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' ? `
                                            <div class="text-center py-12 bg-gradient-to-br from-blue-50 to-indigo-100 rounded-xl border-2 border-blue-300">
                                                <div class="text-6xl mb-4 animate-bounce">📝</div>
                                                <p class="text-xl font-bold text-gray-800 mb-3">Aperçu en mode local</p>
                                                <p class="text-gray-600 mb-6 max-w-md mx-auto">
                                                    Le visualiseur Office Online nécessite une URL publique.
                                                    Téléchargez le document pour l'ouvrir dans Microsoft Word.
                                                </p>
                                                <div class="bg-white rounded-lg p-6 max-w-lg mx-auto mb-6 shadow-lg">
                                                    <div class="grid grid-cols-2 gap-4 text-sm">
                                                        <div class="text-left">
                                                            <p class="text-gray-500">Fichier:</p>
                                                            <p class="font-semibold text-gray-800">${state.selectedDoc.nomFichier}</p>
                                                        </div>
                                                        <div class="text-left">
                                                            <p class="text-gray-500">Taille:</p>
                                                            <p class="font-semibold text-gray-800">${formatSize(state.selectedDoc.taille)}</p>
                                                        </div>
                                                        <div class="text-left">
                                                            <p class="text-gray-500">Type:</p>
                                                            <p class="font-semibold text-gray-800">Microsoft Word</p>
                                                        </div>
                                                        <div class="text-left">
                                                            <p class="text-gray-500">Format:</p>
                                                            <p class="font-semibold text-gray-800">${state.selectedDoc.nomFichier.split('.').pop().toUpperCase()}</p>
                                                        </div>
                                                    </div>
                                                </div>
                                                <button onclick="downloadDoc(state.selectedDoc)"
                                                        class="px-8 py-4 bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-xl hover:shadow-lg transition font-semibold text-lg transform hover:scale-105">
                                                    📥 Télécharger et ouvrir dans Word
                                                </button>
                                                <p class="text-xs text-gray-500 mt-4">
                                                    💡 Le visualiseur fonctionnera automatiquement une fois déployé en production
                                                </p>
                                            </div>
                                        ` : `
                                            <div class="relative bg-white rounded-lg" style="height: 700px;">
                                                <!-- Office Online désactivé: causait des erreurs XML -->
                                                <div class="flex items-center justify-center h-full bg-gradient-to-br from-gray-50 to-gray-100">
                                                    <div class="text-center p-8">
                                                        <div class="text-6xl mb-4">📝</div>
                                                        <p class="text-xl font-bold text-gray-800 mb-2">Prévisualisation non disponible</p>
                                                        <p class="text-gray-600 mb-6">
                                                            Utilisez le bouton "Éditer" pour modifier ce document avec OnlyOffice
                                                        </p>
                                                        <button onclick="downloadDoc(state.selectedDoc)" class="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600">
                                                            📥 Télécharger
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        `}
                                    </div>
                                ` : (state.selectedDoc.type && (state.selectedDoc.type.includes('excel') || state.selectedDoc.type.includes('sheet'))) || (state.selectedDoc.nomFichier && (state.selectedDoc.nomFichier.endsWith('.xls') || state.selectedDoc.nomFichier.endsWith('.xlsx'))) ? `
                                    <div>
                                        <div class="bg-gradient-to-br from-green-50 to-emerald-50 p-4 rounded-lg mb-4 border-2 border-green-200">
                                            <div class="flex items-center justify-between mb-3">
                                                <div class="flex items-center gap-3">
                                                    <span class="text-4xl">📊</span>
                                                    <div>
                                                        <p class="font-bold text-lg text-gray-800">Tableur Microsoft Excel</p>
                                                        <p class="text-sm text-gray-600">${state.selectedDoc.nomFichier} • ${formatSize(state.selectedDoc.taille)}</p>
                                                    </div>
                                                </div>
                                                <button onclick="downloadDoc(state.selectedDoc)"
                                                        class="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition font-medium text-sm">
                                                    📥 Télécharger
                                                </button>
                                            </div>
                                        </div>
                                        ${window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' ? `
                                            <div class="text-center py-12 bg-gradient-to-br from-green-50 to-emerald-100 rounded-xl border-2 border-green-300">
                                                <div class="text-6xl mb-4 animate-bounce">📊</div>
                                                <p class="text-xl font-bold text-gray-800 mb-3">Aperçu en mode local</p>
                                                <p class="text-gray-600 mb-6 max-w-md mx-auto">
                                                    Le visualiseur Office Online nécessite une URL publique.
                                                    Téléchargez le tableur pour l'ouvrir dans Microsoft Excel.
                                                </p>
                                                <div class="bg-white rounded-lg p-6 max-w-lg mx-auto mb-6 shadow-lg">
                                                    <div class="grid grid-cols-2 gap-4 text-sm">
                                                        <div class="text-left">
                                                            <p class="text-gray-500">Fichier:</p>
                                                            <p class="font-semibold text-gray-800">${state.selectedDoc.nomFichier}</p>
                                                        </div>
                                                        <div class="text-left">
                                                            <p class="text-gray-500">Taille:</p>
                                                            <p class="font-semibold text-gray-800">${formatSize(state.selectedDoc.taille)}</p>
                                                        </div>
                                                        <div class="text-left">
                                                            <p class="text-gray-500">Type:</p>
                                                            <p class="font-semibold text-gray-800">Microsoft Excel</p>
                                                        </div>
                                                        <div class="text-left">
                                                            <p class="text-gray-500">Format:</p>
                                                            <p class="font-semibold text-gray-800">${state.selectedDoc.nomFichier.split('.').pop().toUpperCase()}</p>
                                                        </div>
                                                    </div>
                                                </div>
                                                <button onclick="downloadDoc(state.selectedDoc)"
                                                        class="px-8 py-4 bg-gradient-to-br from-green-500 to-green-600 text-white rounded-xl hover:shadow-lg transition font-semibold text-lg transform hover:scale-105">
                                                    📥 Télécharger et ouvrir dans Excel
                                                </button>
                                                <p class="text-xs text-gray-500 mt-4">
                                                    💡 Le visualiseur fonctionnera automatiquement une fois déployé en production
                                                </p>
                                            </div>
                                        ` : `
                                            <div class="relative bg-white rounded-lg" style="height: 700px;">
                                                <!-- Office Online désactivé: causait des erreurs XML -->
                                                <div class="flex items-center justify-center h-full bg-gradient-to-br from-gray-50 to-gray-100">
                                                    <div class="text-center p-8">
                                                        <div class="text-6xl mb-4">📊</div>
                                                        <p class="text-xl font-bold text-gray-800 mb-2">Prévisualisation non disponible</p>
                                                        <p class="text-gray-600 mb-6">
                                                            Utilisez le bouton "Éditer" pour modifier ce document avec l'éditeur Excel
                                                        </p>
                                                        <button onclick="downloadDoc(state.selectedDoc)" class="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600">
                                                            📥 Télécharger
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        `}
                                    </div>
                                ` : (state.selectedDoc.type && (state.selectedDoc.type.includes('powerpoint') || state.selectedDoc.type.includes('presentation'))) || (state.selectedDoc.nomFichier && (state.selectedDoc.nomFichier.endsWith('.ppt') || state.selectedDoc.nomFichier.endsWith('.pptx'))) ? `
                                    <div>
                                        <div class="bg-gradient-to-br from-orange-50 to-red-50 p-4 rounded-lg mb-4 border-2 border-orange-200">
                                            <div class="flex items-center justify-between mb-3">
                                                <div class="flex items-center gap-3">
                                                    <span class="text-4xl">🎞️</span>
                                                    <div>
                                                        <p class="font-bold text-lg text-gray-800">Présentation PowerPoint</p>
                                                        <p class="text-sm text-gray-600">${state.selectedDoc.nomFichier} • ${formatSize(state.selectedDoc.taille)}</p>
                                                    </div>
                                                </div>
                                                <button onclick="downloadDoc(state.selectedDoc)"
                                                        class="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition font-medium text-sm">
                                                    📥 Télécharger
                                                </button>
                                            </div>
                                        </div>
                                        ${window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' ? `
                                            <div class="text-center py-12 bg-gradient-to-br from-orange-50 to-red-100 rounded-xl border-2 border-orange-300">
                                                <div class="text-6xl mb-4 animate-bounce">🎞️</div>
                                                <p class="text-xl font-bold text-gray-800 mb-3">Aperçu en mode local</p>
                                                <p class="text-gray-600 mb-6 max-w-md mx-auto">
                                                    Le visualiseur Office Online nécessite une URL publique.
                                                    Téléchargez la présentation pour l'ouvrir dans PowerPoint.
                                                </p>
                                                <div class="bg-white rounded-lg p-6 max-w-lg mx-auto mb-6 shadow-lg">
                                                    <div class="grid grid-cols-2 gap-4 text-sm">
                                                        <div class="text-left">
                                                            <p class="text-gray-500">Fichier:</p>
                                                            <p class="font-semibold text-gray-800">${state.selectedDoc.nomFichier}</p>
                                                        </div>
                                                        <div class="text-left">
                                                            <p class="text-gray-500">Taille:</p>
                                                            <p class="font-semibold text-gray-800">${formatSize(state.selectedDoc.taille)}</p>
                                                        </div>
                                                        <div class="text-left">
                                                            <p class="text-gray-500">Type:</p>
                                                            <p class="font-semibold text-gray-800">Microsoft PowerPoint</p>
                                                        </div>
                                                        <div class="text-left">
                                                            <p class="text-gray-500">Format:</p>
                                                            <p class="font-semibold text-gray-800">${state.selectedDoc.nomFichier.split('.').pop().toUpperCase()}</p>
                                                        </div>
                                                    </div>
                                                </div>
                                                <button onclick="downloadDoc(state.selectedDoc)"
                                                        class="px-8 py-4 bg-gradient-to-br from-orange-500 to-red-500 text-white rounded-xl hover:shadow-lg transition font-semibold text-lg transform hover:scale-105">
                                                    📥 Télécharger et ouvrir dans PowerPoint
                                                </button>
                                                <p class="text-xs text-gray-500 mt-4">
                                                    💡 Le visualiseur fonctionnera automatiquement une fois déployé en production
                                                </p>
                                            </div>
                                        ` : `
                                            <div class="relative bg-white rounded-lg" style="height: 700px;">
                                                <!-- Office Online désactivé: causait des erreurs XML -->
                                                <div class="flex items-center justify-center h-full bg-gradient-to-br from-gray-50 to-gray-100">
                                                    <div class="text-center p-8">
                                                        <div class="text-6xl mb-4">📽️</div>
                                                        <p class="text-xl font-bold text-gray-800 mb-2">Prévisualisation non disponible</p>
                                                        <p class="text-gray-600 mb-6">
                                                            Utilisez le bouton "Éditer" pour modifier ce document avec OnlyOffice
                                                        </p>
                                                        <button onclick="downloadDoc(state.selectedDoc)" class="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600">
                                                            📥 Télécharger
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        `}
                                    </div>
                                ` : `
                                    <div class="text-center py-16">
                                        <div class="text-6xl mb-4">📄</div>
                                        <p class="text-gray-600 font-medium">
                                            Aperçu non disponible pour ce type de fichier
                                        </p>
                                        <p class="text-sm text-gray-500 mt-2">
                                            Type: ${state.selectedDoc.type}
                                        </p>
                                        <button onclick="downloadDoc(state.selectedDoc)"
                                                class="mt-4 px-6 py-3 btn-primary text-white rounded-xl hover:shadow-lg transition">
                                            📥 Télécharger pour voir
                                        </button>
                                    </div>
                                `}
                            </div>
                        </div>
                        
                        <!-- INFORMATIONS -->
                        <div class="space-y-4 mb-8 bg-white rounded-xl p-6 border border-gray-200">
                            <h3 class="font-bold text-lg text-gray-800 mb-4">ℹ️ Informations</h3>
                            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                                ${state.selectedDoc.idDocument ? `
                                <div class="flex items-center gap-2">
                                    <strong class="text-gray-700">🆔 ID Document:</strong>
                                    <span class="text-blue-600 font-semibold">${state.selectedDoc.idDocument}</span>
                                </div>
                                ` : ''}
                                <div class="flex items-center gap-3">
                                    <strong class="text-gray-700">Catégorie:</strong>
                                    <span class="category-badge inline-block px-3 py-1 text-sm rounded-full ${getCategoryColor(state.selectedDoc.categorie)} font-medium">
                                        ${getCategoryIcon(state.selectedDoc.categorie)} ${getCategoryName(state.selectedDoc.categorie)}
                                    </span>
                                </div>
                                ${state.selectedDoc.serviceArchivage || state.selectedDoc.departementArchivage ? `
                                <div class="flex items-center gap-2">
                                    <strong class="text-gray-700">
                                        ${state.selectedDoc.serviceArchivage
                                            ? '🏢 Service d\'archivage:'
                                            : '🏢 Département d\'archivage:'}
                                    </strong>
                                    <span class="text-gray-600 font-semibold">${state.selectedDoc.serviceArchivage || state.selectedDoc.departementArchivage}</span>
                                </div>
                                ` : ''}
                                <div class="flex items-center gap-2">
                                    <strong class="text-gray-700">📄 Date document:</strong>
                                    <span class="text-gray-600">${formatDate(state.selectedDoc.date)}</span>
                                </div>
                                <div class="flex items-center gap-2">
                                    <strong class="text-gray-700">📦 Taille:</strong>
                                    <span class="text-gray-600">${formatSize(state.selectedDoc.taille)}</span>
                                </div>
                            </div>
                            ${state.selectedDoc.description ? `
                                <div class="pt-4 border-t border-gray-200">
                                    <strong class="text-gray-700">📝 Description:</strong>
                                    <p class="text-gray-600 mt-2">${state.selectedDoc.description}</p>
                                </div>
                            ` : ''}
                            ${state.selectedDoc.tags ? `
                                <div class="pt-4 border-t border-gray-200">
                                    <strong class="text-gray-700">🏷️ Tags:</strong>
                                    <p class="text-gray-600 mt-2">${state.selectedDoc.tags}</p>
                                </div>
                            ` : ''}

                            <!-- ✅ TRAÇABILITÉ -->
                            ${state.selectedDoc.archivePar ? `
                                <div class="pt-4 border-t border-gray-200">
                                    <strong class="text-gray-700">👤 Archivé par:</strong>
                                    <div class="text-gray-600 mt-2 space-y-1">
                                        <p><strong>${state.selectedDoc.archivePar.nomComplet}</strong></p>
                                        ${state.selectedDoc.archivePar.role ? `<p class="text-sm">Rôle: ${state.selectedDoc.archivePar.role} (Niveau ${state.selectedDoc.archivePar.niveau})</p>` : ''}
                                        ${state.selectedDoc.archivePar.departement ? `<p class="text-sm">Département: ${state.selectedDoc.archivePar.departement}</p>` : ''}
                                        <p class="text-sm text-gray-500">
                                            Le ${formatDate(state.selectedDoc.archivePar.dateArchivage)} à ${new Date(state.selectedDoc.archivePar.dateArchivage).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                                        </p>
                                    </div>
                                </div>
                            ` : ''}

                            ${state.selectedDoc.historiqueConsultations && state.selectedDoc.historiqueConsultations.length > 0 ? `
                                <div class="pt-4 border-t border-gray-200">
                                    <strong class="text-gray-700">👁️ Dernières consultations (${state.selectedDoc.historiqueConsultations.length}):</strong>
                                    <div class="mt-2 max-h-60 overflow-y-auto space-y-2">
                                        ${state.selectedDoc.historiqueConsultations.slice(-10).reverse().map(c => `
                                            <div class="bg-gray-50 p-3 rounded-lg text-sm">
                                                <p class="font-semibold text-gray-800">${c.nomComplet}</p>
                                                ${c.role ? `<p class="text-gray-600">Rôle: ${c.role} (Niveau ${c.niveau})</p>` : ''}
                                                ${c.departement ? `<p class="text-gray-600">Département: ${c.departement}</p>` : ''}
                                                <p class="text-gray-500 text-xs mt-1">
                                                    ${formatDate(c.date)} à ${new Date(c.date).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                                                </p>
                                            </div>
                                        `).join('')}
                                    </div>
                                </div>
                            ` : ''}

                            ${state.selectedDoc.historiqueTelechargements && state.selectedDoc.historiqueTelechargements.length > 0 ? `
                                <div class="pt-4 border-t border-gray-200">
                                    <strong class="text-gray-700">📥 Derniers téléchargements (${state.selectedDoc.historiqueTelechargements.length}):</strong>
                                    <div class="mt-2 max-h-60 overflow-y-auto space-y-2">
                                        ${state.selectedDoc.historiqueTelechargements.slice(-10).reverse().map(t => `
                                            <div class="bg-blue-50 p-3 rounded-lg text-sm">
                                                <p class="font-semibold text-gray-800">${t.nomComplet}</p>
                                                ${t.role ? `<p class="text-gray-600">Rôle: ${t.role} (Niveau ${t.niveau})</p>` : ''}
                                                ${t.departement ? `<p class="text-gray-600">Département: ${t.departement}</p>` : ''}
                                                <p class="text-gray-500 text-xs mt-1">
                                                    ${formatDate(t.date)} à ${new Date(t.date).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                                                </p>
                                            </div>
                                        `).join('')}
                                    </div>
                                </div>
                            ` : ''}

                            ${state.selectedDoc.sharedWith && state.selectedDoc.sharedWith.length > 0 ? `
                                <div class="pt-4 border-t border-gray-200">
                                    <strong class="text-gray-700">👥 Partagé avec (${state.selectedDoc.sharedWith.length}):</strong>
                                    <div class="mt-2 flex flex-wrap gap-2">
                                        ${state.selectedDoc.sharedWith.map(user => `
                                            <span class="inline-flex items-center gap-1 px-3 py-1.5 bg-gradient-to-r from-amber-100 to-yellow-100 text-amber-800 rounded-full text-sm font-medium border border-amber-300">
                                                <span class="w-6 h-6 bg-amber-500 rounded-full flex items-center justify-center text-white text-xs font-bold">${(user || '?').charAt(0).toUpperCase()}</span>
                                                ${user}
                                            </span>
                                        `).join('')}
                                    </div>
                                </div>
                            ` : ''}

                            ${state.selectedDoc.historiquePartages && state.selectedDoc.historiquePartages.length > 0 ? `
                                <div class="pt-4 border-t border-gray-200">
                                    <strong class="text-gray-700">🔗 Historique des partages (${state.selectedDoc.historiquePartages.length}):</strong>
                                    <div class="mt-2 max-h-60 overflow-y-auto space-y-2">
                                        ${state.selectedDoc.historiquePartages.slice(-10).reverse().map(p => `
                                            <div class="bg-gradient-to-r from-green-50 to-blue-50 p-3 rounded-lg text-sm border-2 border-green-200">
                                                <div class="flex items-start justify-between mb-2">
                                                    <div class="flex-1">
                                                        <p class="font-semibold text-gray-800 flex items-center gap-2">
                                                            <span class="text-blue-600">👤 ${p.sharedByName || p.sharedBy}</span>
                                                            <span class="text-gray-400">→</span>
                                                            <span class="text-green-600">👤 ${p.sharedWithName || p.sharedWith}</span>
                                                        </p>
                                                    </div>
                                                </div>
                                                <div class="grid grid-cols-2 gap-2 mt-2 text-xs">
                                                    <div class="bg-white rounded p-2">
                                                        <p class="text-gray-500">Partagé par:</p>
                                                        <p class="font-semibold text-gray-700">${p.sharedBy}</p>
                                                        ${p.sharedByRole ? `<p class="text-gray-600">${p.sharedByRole} (Niv. ${p.sharedByNiveau || 'N/A'})</p>` : ''}
                                                        ${p.sharedByDepartement ? `<p class="text-gray-600">📍 ${p.sharedByDepartement}</p>` : ''}
                                                    </div>
                                                    <div class="bg-white rounded p-2">
                                                        <p class="text-gray-500">Partagé avec:</p>
                                                        <p class="font-semibold text-gray-700">${p.sharedWith}</p>
                                                        ${p.sharedWithRole ? `<p class="text-gray-600">${p.sharedWithRole} (Niv. ${p.sharedWithNiveau || 'N/A'})</p>` : ''}
                                                        ${p.sharedWithDepartement ? `<p class="text-gray-600">📍 ${p.sharedWithDepartement}</p>` : ''}
                                                    </div>
                                                </div>
                                                <p class="text-gray-500 text-xs mt-2 text-center bg-white rounded p-1">
                                                    📅 ${formatDate(p.sharedAt)} à ${new Date(p.sharedAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                                                </p>
                                            </div>
                                        `).join('')}
                                    </div>
                                </div>
                            ` : ''}
                        </div>

                        <!-- ACTIONS selon niveau -->
                        <div class="flex gap-3 flex-wrap">
                            <!-- Prévisualiser : Tous les niveaux -->
                            <button onclick="openPreview(state.selectedDoc)"
                                    class="flex-1 min-w-[200px] px-6 py-4 bg-gradient-to-br from-purple-500 to-purple-600 text-white rounded-xl hover:shadow-lg transition font-semibold flex items-center justify-center gap-2">
                                <span class="text-xl">👁️</span> Prévisualiser
                            </button>

                            <!-- Télécharger : Tous les niveaux -->
                            <button onclick="downloadDoc(state.selectedDoc)"
                                    class="flex-1 min-w-[200px] px-6 py-4 btn-primary text-white rounded-xl hover:shadow-lg transition font-semibold flex items-center justify-center gap-2">
                                <span class="text-xl">📥</span> Télécharger
                            </button>

                            <!-- Éditer : Fichiers Office (Word, Excel, PowerPoint) -->
                            ${state.selectedDoc && isOfficeDocument(state.selectedDoc.nomFichier) ? `
                                <button onclick="openEditor(state.selectedDoc)"
                                        class="flex-1 min-w-[200px] px-6 py-4 bg-gradient-to-br from-green-500 to-green-600 text-white rounded-xl hover:shadow-lg transition font-semibold flex items-center justify-center gap-2">
                                    <span class="text-xl">✏️</span> Éditer
                                </button>
                            ` : ''}

                            ${state.currentUserInfo && state.currentUserInfo.niveau === 1 ? `
                                <!-- NIVEAU 1 : Télécharger, Verrouiller, Partager et Supprimer N'IMPORTE QUEL document -->
                                <button onclick="toggleOldDocumentLock('${state.selectedDoc._id}')"
                                        class="flex-1 min-w-[200px] px-6 py-4 bg-gradient-to-br from-yellow-500 to-orange-600 text-white rounded-xl hover:shadow-lg transition font-semibold flex items-center justify-center gap-2">
                                    <span class="text-xl">${state.selectedDoc.locked ? '🔒' : '🔓'}</span>
                                    ${state.selectedDoc.locked ? 'Déverrouiller' : 'Verrouiller'}
                                </button>
                                <button onclick="openShareModal('${state.selectedDoc._id}')"
                                        class="flex-1 min-w-[200px] px-6 py-4 bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-xl hover:shadow-lg transition font-semibold flex items-center justify-center gap-2">
                                    <span class="text-xl">📤</span> Partager
                                </button>
                                <button onclick="deleteDoc('${state.selectedDoc._id}')"
                                        class="flex-1 min-w-[200px] px-6 py-4 bg-gradient-to-br from-red-500 to-red-600 text-white rounded-xl hover:shadow-lg transition font-semibold flex items-center justify-center gap-2">
                                    <span class="text-xl">🗑️</span> Supprimer
                                </button>
                            ` : ''}

                            ${state.currentUserInfo && state.currentUserInfo.niveau === 2 ? `
                                <!-- NIVEAU 2 : Télécharger et Partager des documents de son département -->
                                <button onclick="openShareModal('${state.selectedDoc._id}')"
                                        class="flex-1 min-w-[200px] px-6 py-4 bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-xl hover:shadow-lg transition font-semibold flex items-center justify-center gap-2">
                                    <span class="text-xl">📤</span> Partager
                                </button>
                            ` : ''}

                            <!-- NIVEAU 3 : Seulement télécharger (pas d'action supplémentaire) -->
                        </div>
                    </div>
                </div>
            ` : ''}
            
            ${state.showDeleteConfirm ? `
                <div class="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                    <div class="modal-glass rounded-2xl p-8 max-w-md w-full shadow-2xl animate-fade-in">
                        <h2 class="text-2xl font-bold mb-4 text-red-600">🚨 DERNIÈRE CONFIRMATION 🚨</h2>
                        <p class="text-lg mb-4">TOUS tes <strong>${state.documents.length} documents</strong> seront DÉFINITIVEMENT supprimés!</p>
                        <p class="text-gray-700 mb-6">Es-tu VRAIMENT sûr(e)?</p>
                        <div class="flex gap-3">
                            <button onclick="confirmDeleteAll()"
                                    class="flex-1 px-6 py-4 bg-gradient-to-br from-red-500 to-red-600 text-white rounded-xl hover:shadow-lg transition font-semibold">
                                ✅ OUI, tout supprimer
                            </button>
                            <button onclick="cancelDeleteAll()"
                                    class="flex-1 px-6 py-4 bg-gradient-to-br from-gray-100 to-gray-200 rounded-xl hover:shadow-md transition font-medium">
                                ❌ Annuler
                            </button>
                        </div>
                    </div>
                </div>
            ` : ''}

            ${state.showShareModal ? `
                <div class="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4 backdrop-blur-sm"
                     onclick="if(event.target === this) closeShareModal()">
                    <div class="bg-white rounded-2xl p-8 max-w-3xl w-full max-h-[85vh] overflow-y-auto shadow-2xl animate-fade-in border-4 border-blue-400" onclick="event.stopPropagation()">
                        <!-- Header -->
                        <div class="flex justify-between items-start mb-6 pb-4 border-b-4 border-blue-200">
                            <div class="flex items-center gap-4">
                                <div class="bg-gradient-to-br from-blue-500 to-blue-600 p-4 rounded-2xl shadow-lg">
                                    <span class="text-4xl">📤</span>
                                </div>
                                <div>
                                    <h2 class="text-2xl font-bold text-gray-900 mb-1">Partager un document</h2>
                                    <p class="text-gray-600 text-sm">Document : <span class="text-blue-600 font-semibold">${state.selectedDoc ? state.selectedDoc.titre : ''}</span></p>
                                </div>
                            </div>
                            <button onclick="closeShareModal()"
                                    class="text-2xl text-gray-400 hover:text-red-600 transition hover:bg-red-50 px-3 py-1 rounded-lg">✖</button>
                        </div>

                        <!-- Instructions -->
                        <div class="bg-gradient-to-r from-blue-50 to-indigo-50 border-l-4 border-blue-500 p-4 rounded-lg mb-6">
                            <p class="text-gray-800 text-sm font-medium flex items-center gap-2">
                                <span class="text-xl">💡</span>
                                <span>Sélectionnez un ou plusieurs utilisateurs avec qui partager ce document</span>
                            </p>
                        </div>

                        ${state.shareAvailableUsers.length === 0 ? `
                            <div class="text-center py-12">
                                <div class="text-6xl mb-4 opacity-50">👥</div>
                                <p class="text-gray-500 text-lg font-semibold">Chargement des utilisateurs...</p>
                            </div>
                        ` : `
                            <!-- Barre de recherche -->
                            <div class="mb-5">
                                <label class="block text-gray-700 font-semibold mb-2 text-sm">🔍 Rechercher</label>
                                <input type="text"
                                       placeholder="Rechercher par nom, email ou département..."
                                       value="${state.shareSearchTerm}"
                                       oninput="updateShareSearch(this.value)"
                                       class="w-full px-4 py-3 border-2 border-gray-300 rounded-xl text-base focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition">
                            </div>

                            <!-- Compteur et bouton Tout sélectionner -->
                            <div class="mb-5 flex items-center justify-between bg-gradient-to-r from-blue-100 to-indigo-100 p-4 rounded-xl border-2 border-blue-300">
                                <div class="flex items-center gap-3">
                                    <div class="bg-blue-500 w-12 h-12 rounded-full flex items-center justify-center shadow-lg">
                                        <span class="text-2xl">✓</span>
                                    </div>
                                    <div>
                                        <p class="text-gray-900 font-bold text-lg share-counter-selected">${state.shareSelectedUsers.length} sélectionné(s)</p>
                                        <p class="text-gray-600 text-sm share-counter-total">sur ${getFilteredShareUsers().length} utilisateur(s) disponible(s)</p>
                                    </div>
                                </div>
                                <button onclick="toggleSelectAll()"
                                        class="share-select-all-btn px-5 py-2 bg-white text-blue-600 rounded-lg hover:bg-blue-50 transition font-semibold text-sm border-2 border-blue-400 shadow-sm">
                                    ${state.shareSelectedUsers.length === getFilteredShareUsers().length ? '✖ Tout désélectionner' : '✓ Tout sélectionner'}
                                </button>
                            </div>

                            <!-- Liste des utilisateurs -->
                            <div class="mb-6">
                                <label class="block text-gray-700 font-semibold mb-3 text-sm flex items-center gap-2">
                                    <span>👥</span>
                                    <span>Utilisateurs disponibles</span>
                                </label>
                                <div class="share-users-list-container space-y-2 max-h-80 overflow-y-auto border-2 border-gray-300 rounded-xl p-3 bg-gray-50">
                                    ${getFilteredShareUsers().length === 0 ? `
                                        <div class="text-center py-12 text-gray-500">
                                            <div class="text-6xl mb-3 opacity-50">🔍</div>
                                            <p class="text-lg font-semibold">Aucun utilisateur trouvé</p>
                                            <p class="text-sm mt-2">Essayez un autre terme de recherche</p>
                                        </div>
                                    ` : getFilteredShareUsers().map(user => `
                                        <label class="flex items-center gap-3 p-4 rounded-lg hover:shadow-md transition cursor-pointer border-2 ${state.shareSelectedUsers.includes(user.username) ? 'border-green-400 bg-green-50 shadow-sm' : 'border-gray-200 bg-white hover:border-blue-300'}">
                                            <input type="checkbox"
                                                   ${state.shareSelectedUsers.includes(user.username) ? 'checked' : ''}
                                                   onchange="toggleUserSelection('${user.username}')"
                                                   class="w-5 h-5 accent-blue-500 rounded cursor-pointer">
                                            <div class="flex-1">
                                                <div class="font-bold text-gray-900 text-base mb-1">${user.nom}</div>
                                                <div class="text-sm text-gray-600">
                                                    📧 ${user.email}
                                                </div>
                                                <div class="text-sm text-blue-600 font-medium mt-1">
                                                    🏢 ${user.departement}
                                                </div>
                                            </div>
                                            ${state.shareSelectedUsers.includes(user.username) ? '<span class="text-2xl text-green-600">✓</span>' : '<span class="text-2xl text-gray-300">○</span>'}
                                        </label>
                                    `).join('')}
                                </div>
                            </div>

                            <!-- Boutons d'action -->
                            <div class="flex gap-3 pt-4 border-t-2 border-gray-200">
                                <button onclick="confirmShare()"
                                        class="share-confirm-btn flex-1 px-6 py-4 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl hover:shadow-lg transition font-semibold text-base flex items-center justify-center gap-2 ${state.shareSelectedUsers.length === 0 ? 'opacity-50 cursor-not-allowed' : 'hover:from-blue-600 hover:to-blue-700'}"
                                        ${state.shareSelectedUsers.length === 0 ? 'disabled' : ''}>
                                    <span class="text-xl">✓</span>
                                    <span>Partager avec ${state.shareSelectedUsers.length} utilisateur(s)</span>
                                </button>
                                <button onclick="closeShareModal()"
                                        class="px-6 py-4 bg-gray-200 text-gray-700 rounded-xl hover:bg-gray-300 hover:shadow-md transition font-semibold text-base">
                                    Annuler
                                </button>
                            </div>
                        `}
                    </div>
                </div>
            ` : ''}

            ${state.showComposeMessage ? `
                <div style="position: fixed; inset: 0; background: rgba(0,0,0,0.7); z-index: 9999; display: flex; align-items: center; justify-content: center; padding: 20px;"
                     onclick="if(event.target === this) closeComposeMessage()">
                    <div style="background: #ffffff; border-radius: 12px; padding: 30px; max-width: 700px; width: 100%; box-shadow: 0 20px 60px rgba(0,0,0,0.3);" onclick="event.stopPropagation()">
                        <!-- En-tête -->
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 25px; border-bottom: 3px solid #2563eb; padding-bottom: 15px;">
                            <h2 style="font-size: 24px; font-weight: bold; color: #111827; margin: 0;">✉️ Nouveau message</h2>
                            <button onclick="closeComposeMessage()" style="background: none; border: none; font-size: 28px; color: #6b7280; cursor: pointer; padding: 0; line-height: 1;">✖</button>
                        </div>

                        <!-- Formulaire -->
                        <div style="display: flex; flex-direction: column; gap: 20px;">
                            <!-- Destinataire -->
                            <div style="position: relative;">
                                <label style="display: block; font-weight: 600; color: #111827; margin-bottom: 8px; font-size: 14px;">📧 Destinataire *</label>
                                <input type="text"
                                       value="${state.selectedUser ? `${state.selectedUser.nom} (@${state.selectedUser.username})` : state.userSearchTerm}"
                                       oninput="handleUserSearch(this.value)"
                                       onfocus="state.showUserDropdown = true; render();"
                                       placeholder="Cliquez pour voir tous les utilisateurs..."
                                       style="width: 100%; padding: 12px 16px; border: 2px solid #d1d5db; border-radius: 8px; font-size: 15px; color: #111827; background: #ffffff;"
                                       autocomplete="off">

                                ${state.showUserDropdown && getFilteredUsers().length > 0 ? `
                                    <div style="position: absolute; z-index: 10000; width: 100%; margin-top: 8px; background: #ffffff; border: 2px solid #2563eb; border-radius: 8px; box-shadow: 0 10px 30px rgba(0,0,0,0.2); max-height: 320px; overflow-y: auto;">
                                        <!-- En-tête liste -->
                                        <div style="position: sticky; top: 0; background: #2563eb; color: #ffffff; padding: 12px 16px; font-weight: 700; font-size: 13px; border-bottom: 1px solid #1e40af;">
                                            📋 ${state.userSearchTerm ? `Résultats (${getFilteredUsers().length})` : `Tous les utilisateurs (${getFilteredUsers().length})`}
                                        </div>
                                        <!-- Liste utilisateurs -->
                                        ${getFilteredUsers().map(user => `
                                            <div onclick="selectUser('${user.username}')"
                                                 style="padding: 12px 16px; cursor: pointer; border-bottom: 1px solid #e5e7eb; background: #ffffff; color: #111827;"
                                                 onmouseover="this.style.background='#eff6ff'"
                                                 onmouseout="this.style.background='#ffffff'">
                                                <div style="font-weight: 700; color: #111827; font-size: 15px; margin-bottom: 4px;">${user.nom}</div>
                                                <div style="font-size: 13px; color: #374151;">
                                                    <span style="background: #dbeafe; color: #1e40af; padding: 2px 8px; border-radius: 4px; font-weight: 600;">@${user.username}</span>
                                                    ${user.niveau !== 1 ? `<span style="margin-left: 8px; color: #111827; font-weight: 600;">• ${user.departement}</span>` : '<span style="margin-left: 8px; color: #2563eb; font-weight: 700;">• Admin Principal</span>'}
                                                </div>
                                                <div style="font-size: 12px; color: #6b7280; margin-top: 4px;">Niveau ${user.niveau} - ${user.role}</div>
                                            </div>
                                        `).join('')}
                                    </div>
                                ` : ''}
                            </div>

                            <!-- Sujet -->
                            <div>
                                <label style="display: block; font-weight: 600; color: #111827; margin-bottom: 8px; font-size: 14px;">📝 Sujet *</label>
                                <input type="text"
                                       value="${state.composeMessageSubject}"
                                       oninput="state.composeMessageSubject = this.value"
                                       placeholder="Entrez le sujet du message"
                                       style="width: 100%; padding: 12px 16px; border: 2px solid #d1d5db; border-radius: 8px; font-size: 15px; color: #111827; background: #ffffff;">
                            </div>

                            <!-- Message -->
                            <div>
                                <label style="display: block; font-weight: 600; color: #111827; margin-bottom: 8px; font-size: 14px;">💬 Message *</label>
                                <textarea
                                       oninput="state.composeMessageBody = this.value"
                                       placeholder="Écrivez votre message ici..."
                                       rows="8"
                                       style="width: 100%; padding: 12px 16px; border: 2px solid #d1d5db; border-radius: 8px; font-size: 15px; color: #111827; background: #ffffff; resize: vertical; font-family: inherit;">${state.composeMessageBody}</textarea>
                            </div>

                            <!-- Boutons -->
                            <div style="display: flex; gap: 12px; margin-top: 10px;">
                                <button onclick="sendNewMessage()"
                                        style="flex: 1; padding: 14px 24px; background: linear-gradient(135deg, #2563eb, #1e40af); color: #ffffff; border: none; border-radius: 8px; font-weight: 700; font-size: 15px; cursor: pointer; box-shadow: 0 4px 12px rgba(37,99,235,0.3);"
                                        onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 6px 16px rgba(37,99,235,0.4)'"
                                        onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 4px 12px rgba(37,99,235,0.3)'">
                                    ✅ Envoyer
                                </button>
                                <button onclick="closeComposeMessage()"
                                        style="padding: 14px 24px; background: #f3f4f6; color: #374151; border: 2px solid #d1d5db; border-radius: 8px; font-weight: 600; font-size: 15px; cursor: pointer;"
                                        onmouseover="this.style.background='#e5e7eb'"
                                        onmouseout="this.style.background='#f3f4f6'">
                                    ❌ Annuler
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            ` : ''}

            ${state.showMessages ? `
                <div class="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4 backdrop-blur-sm"
                     onclick="if(event.target === this) closeMessages()">
                    <div class="modal-glass rounded-2xl p-8 max-w-4xl w-full max-h-[85vh] overflow-y-auto shadow-2xl animate-fade-in" onclick="event.stopPropagation()">
                        <div class="flex justify-between items-start mb-6">
                            <div>
                                <h2 class="text-3xl font-bold text-gray-800">📬 Boîte de réception</h2>
                                <p class="text-sm text-gray-600 mt-1">${state.messages.length} message(s) • ${state.unreadCount} non lu(s)</p>
                            </div>
                            <button onclick="closeMessages()" class="text-2xl text-gray-600 hover:text-gray-800 transition">✖</button>
                        </div>

                        ${state.messages.length === 0 ? `
                            <div class="text-center py-16">
                                <div class="text-6xl mb-4">📭</div>
                                <p class="text-xl text-gray-600 font-semibold mb-2">Aucun message</p>
                                <p class="text-gray-500">Votre boîte de réception est vide</p>
                            </div>
                        ` : `
                            <div class="space-y-3">
                                ${state.messages.map(msg => `
                                    <div class="bg-white rounded-xl p-5 border-2 ${msg.read ? 'border-gray-200' : 'border-blue-400 bg-blue-50'} hover:shadow-md transition">
                                        <div class="flex justify-between items-start mb-3">
                                            <div class="flex items-center gap-3">
                                                ${!msg.read ? '<div class="w-3 h-3 bg-blue-500 rounded-full"></div>' : ''}
                                                <div>
                                                    <div class="font-bold text-gray-800 text-lg">${msg.subject}</div>
                                                    <div class="text-sm text-gray-600">De: ${msg.fromName} (${msg.from})</div>
                                                </div>
                                            </div>
                                            <div class="text-xs text-gray-500">
                                                ${new Date(msg.createdAt).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                            </div>
                                        </div>

                                        <div class="text-gray-700 mb-4 p-4 bg-gray-50 rounded-lg border border-gray-200 whitespace-pre-line">
                                            ${msg.body}
                                        </div>

                                        <div class="flex gap-2 flex-wrap">
                                            ${!msg.read ? `
                                                <button onclick="markMessageAsRead('${msg._id}')"
                                                        class="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition text-sm font-medium">
                                                    ✅ Marquer comme lu
                                                </button>
                                            ` : ''}

                                            <button onclick="deleteMessage('${msg._id}')"
                                                    class="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition text-sm font-medium">
                                                🗑️ Supprimer
                                            </button>
                                        </div>
                                    </div>
                                `).join('')}
                            </div>
                        `}

                        <div class="mt-6 flex gap-3">
                            <button onclick="loadMessages(); render();"
                                    class="flex-1 px-6 py-3 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition font-medium">
                                🔄 Actualiser
                            </button>
                            <button onclick="closeMessages()"
                                    class="px-6 py-3 bg-gray-200 text-gray-700 rounded-xl hover:bg-gray-300 transition font-medium">
                                ❌ Fermer
                            </button>
                        </div>
                    </div>
                </div>
            ` : ''}

            ${false && state.showProfile ? `
                <div class="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4 backdrop-blur-sm" onclick="if(event.target === this) { state.showProfile = false; render(); }">
                    <div class="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" onclick="event.stopPropagation()">
                        <div class="sticky top-0 bg-white border-b border-gray-200 px-8 py-6 flex justify-between items-center">
                            <h2 class="text-2xl font-bold text-gray-800">👤 Mon Profil</h2>
                            <button onclick="state.showProfile = false; render()" class="text-2xl text-gray-600 hover:text-gray-800">×</button>
                        </div>

                        <div class="p-8">
                            <!-- Photo de profil -->
                            <div class="text-center mb-8">
                                <div class="relative inline-block">
                                    <img id="profilePhotoPreview" src="" alt="Photo de profil" class="w-36 h-36 rounded-full object-cover border-4 border-gray-200 hidden">
                                    <div id="profilePhotoPlaceholder" class="w-36 h-36 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white text-4xl font-bold border-4 border-gray-200">
                                        ${((state.currentUserInfo?.prenom?.[0] || '') + (state.currentUserInfo?.nom?.[0] || '')).toUpperCase() || state.currentUser?.substring(0, 2).toUpperCase()}
                                    </div>
                                    <label for="photoUpload" class="absolute bottom-2 right-2 bg-white rounded-full w-10 h-10 flex items-center justify-center cursor-pointer shadow-lg border-2 border-gray-200 hover:bg-gray-50 transition">
                                        📷
                                    </label>
                                    <input type="file" id="photoUpload" accept="image/*" onchange="handlePhotoUpload(event)" class="hidden">
                                </div>
                                <div class="mt-3 text-xs text-gray-500">Cliquez sur 📷 pour changer votre photo (max 2MB)</div>
                            </div>

                            <!-- Formulaire -->
                            <div class="space-y-6">
                                <div>
                                    <label class="block text-sm font-semibold text-gray-700 mb-2">Nom complet <span class="text-red-500">*</span></label>
                                    <input type="text" id="profile_nom" placeholder="Votre nom complet" required class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent">
                                    <div class="mt-2 text-xs text-amber-600">⚠️ Vous ne pouvez modifier votre nom qu'une seule fois</div>
                                </div>

                                <div>
                                    <label class="block text-sm font-semibold text-gray-700 mb-2">Nom d'utilisateur <span class="text-red-500">*</span></label>
                                    <input type="text" id="profile_username" placeholder="Votre identifiant" required class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent">
                                    <div class="mt-2 text-xs text-amber-600">⚠️ Vous ne pouvez modifier votre nom d'utilisateur qu'une seule fois</div>
                                    <div class="mt-1 text-xs text-gray-500">💡 Si vous changez votre nom d'utilisateur, vous devrez vous reconnecter</div>
                                </div>

                                <div>
                                    <label class="block text-sm font-semibold text-gray-700 mb-2">Email</label>
                                    <input type="email" id="profile_email" placeholder="votre.email@exemple.com" class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent">
                                </div>

                                <!-- Informations non modifiables -->
                                <div class="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-lg">
                                    <div class="font-semibold text-gray-800 mb-3">📋 Informations du compte</div>
                                    <div class="space-y-2 text-sm">
                                        <div class="flex justify-between">
                                            <span class="text-gray-600">Rôle :</span>
                                            <span class="font-semibold text-gray-800">${state.currentUserInfo?.role || 'N/A'}</span>
                                        </div>
                                        <div class="flex justify-between">
                                            <span class="text-gray-600">Niveau :</span>
                                            <span class="font-semibold text-gray-800">${state.currentUserInfo?.niveau ?? 'N/A'}</span>
                                        </div>
                                        <div class="flex justify-between">
                                            <span class="text-gray-600">Département :</span>
                                            <span class="font-semibold text-gray-800">${state.currentUserInfo?.departement || 'N/A'}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div class="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-8 py-4 flex gap-3 justify-end">
                            <button onclick="state.showProfile = false; state.profilePhotoPreview = null; render()" class="px-6 py-3 border border-gray-300 bg-white text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition">
                                Annuler
                            </button>
                            <button onclick="saveProfile()" class="px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:from-purple-600 hover:to-pink-600 font-medium transition">
                                💾 Sauvegarder
                            </button>
                        </div>
                    </div>
                </div>
            ` : ''}

            ${state.loading ? `
                <div class="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center backdrop-blur-sm">
                    <div class="modal-glass p-8 rounded-2xl shadow-2xl">
                        <div class="loader mx-auto mb-4"></div>
                        <p class="text-lg font-semibold text-gray-700">⏳ Chargement...</p>
                    </div>
                </div>
            ` : ''}
        </div>
    `;
}

// Fonction pour afficher/masquer le mot de passe
function togglePasswordVisibility(inputId) {
    const input = document.getElementById(inputId);
    const icon = document.getElementById(inputId + '_icon');

    if (!input || !icon) return;

    if (input.type === 'password') {
        input.type = 'text';
        icon.textContent = '🙈'; // Œil barré
    } else {
        input.type = 'password';
        icon.textContent = '👁️'; // Œil ouvert
    }
}

// Initialisation
async function initApp() {
    // Nettoyer l'ancien localStorage (migration vers sessionStorage)
    try {
        if (localStorage.getItem('mes_session')) {
            localStorage.removeItem('mes_session');
            Logger.debug('✅ Migration localStorage → sessionStorage effectuée');
        }
    } catch (error) {
        Logger.error('Erreur migration storage:', error);
    }

    // Vérifier rapidement si une session existe dans sessionStorage
    let hasSession = sessionStorage.getItem('mes_session');

    // ✅ CORRECTION: Si pas de session dans sessionStorage, vérifier la session serveur (cookie)
    // Cela évite la boucle de redirection login.html ↔ index.html
    if (!hasSession) {
        Logger.debug('Pas de session dans sessionStorage, vérification session serveur...');
        try {
            const response = await fetch(`${API_URL}/session-check`, {
                method: 'GET',
                credentials: 'include'
            });

            if (response.ok) {
                const data = await response.json();
                if (data.authenticated && data.username) {
                    Logger.debug('Session serveur trouvée pour:', data.username);

                    // Récupérer les infos complètes de l'utilisateur
                    const userInfoResponse = await fetch(`${API_URL}/user-info`, {
                        credentials: 'include'
                    });

                    if (userInfoResponse.ok) {
                        const userInfo = await userInfoResponse.json();
                        if (userInfo.success) {
                            // Restaurer sessionStorage depuis la session serveur
                            const sessionData = {
                                username: data.username,
                                userInfo: {
                                    username: userInfo.username,
                                    nom: userInfo.nom,
                                    email: userInfo.email,
                                    niveau: userInfo.niveau,
                                    role: userInfo.role,
                                    departement: userInfo.departement,
                                    idDepartement: userInfo.idDepartement
                                },
                                timestamp: Date.now()
                            };
                            sessionStorage.setItem('mes_session', JSON.stringify(sessionData));
                            hasSession = true;
                            Logger.debug('✅ Session restaurée depuis serveur vers sessionStorage');
                        }
                    }
                }
            }
        } catch (error) {
            Logger.debug('Pas de session serveur valide');
        }
    }

    // Si toujours pas de session, afficher directement la page de connexion (pas de loader)
    if (!hasSession) {
        state.isCheckingSession = false;
        render();
        return;
    }

    // Si session existe, afficher le loader PUIS vérifier
    render();

    // ✅ SÉCURITÉ: Timeout de 30 secondes pour éviter le figement (augmenté de 10s)
    try {
        const sessionRestored = await Promise.race([
            restoreSession(),
            new Promise((_, reject) =>
                setTimeout(() => reject(new Error('Timeout de restauration de session')), 30000)
            )
        ]);

        // Charger les rôles et départements seulement si authentifié
        if (sessionRestored) {
            await loadRolesAndDepartements();
            await loadServices();
        }
    } catch (error) {
        Logger.error('❌ Erreur initApp:', error);
        // En cas d'erreur, afficher la page de connexion
        state.loading = false;
        state.isCheckingSession = false;
        state.isAuthenticated = false;
        clearSession();
        render();
    }
}

// Démarrer l'application
initApp();

// ✅ NETTOYAGE: Arrêter tous les intervalles avant de quitter la page (évite le clignotement)
window.addEventListener('beforeunload', () => {
    // Arrêter tous les intervalles actifs
    if (sessionCheckInterval) {
        clearInterval(sessionCheckInterval);
        sessionCheckInterval = null;
    }
    if (sessionChangeInterval) {
        clearInterval(sessionChangeInterval);
        sessionChangeInterval = null;
    }
    if (window.filterResetTimer) {
        clearInterval(window.filterResetTimer);
        window.filterResetTimer = null;
    }
    if (inactivityTimer) {
        clearTimeout(inactivityTimer);
        inactivityTimer = null;
    }
    Logger.debug('🧹 Nettoyage des intervalles avant changement de page');
});