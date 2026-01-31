/**
 * ============================================
 * SUPER ADMIN DASHBOARD - FRONTEND
 * ============================================
 *
 * Gère l'affichage du dashboard Super Admin
 * Récupère et affiche les statistiques système
 *
 * 🛡️ VERSION: 20241224999 - FILTRAGE NIVEAU 0 ACTIVÉ
 */

// 🔍 LOG VERSION POUR DÉBOGAGE
console.log('═══════════════════════════════════════════════════════════');
console.log('🛡️ SUPER ADMIN DASHBOARD - VERSION 20241224999');
console.log('🔒 SÉCURITÉ: Filtrage niveau 0 ACTIF dans création utilisateur');
console.log('═══════════════════════════════════════════════════════════');

// Variables globales pour les graphiques
let usersChart = null;
let documentsChart = null;

// ============================================
// MODALES PERSONNALISÉES
// ============================================

/**
 * Afficher une alerte personnalisée
 */
function customAlert(message, title = 'Information', icon = 'ℹ️') {
    return new Promise((resolve) => {
        const modal = document.createElement('div');
        modal.className = 'custom-modal-overlay';
        modal.innerHTML = `
            <div class="custom-modal">
                <div class="custom-modal-header">
                    <span class="custom-modal-icon">${icon}</span>
                    <h3>${title}</h3>
                </div>
                <div class="custom-modal-body">
                    <p>${message}</p>
                </div>
                <div class="custom-modal-footer">
                    <button class="custom-btn custom-btn-primary" onclick="this.closest('.custom-modal-overlay').remove()">OK</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);

        modal.querySelector('button').addEventListener('click', () => {
            modal.remove();
            resolve();
        });

        // Fermer avec Escape
        const closeOnEscape = (e) => {
            if (e.key === 'Escape') {
                modal.remove();
                document.removeEventListener('keydown', closeOnEscape);
                resolve();
            }
        };
        document.addEventListener('keydown', closeOnEscape);
    });
}

/**
 * Afficher une confirmation personnalisée
 */
function customConfirm(message, title = 'Confirmation', icon = '⚠️') {
    return new Promise((resolve) => {
        const modal = document.createElement('div');
        modal.className = 'custom-modal-overlay';
        modal.innerHTML = `
            <div class="custom-modal">
                <div class="custom-modal-header">
                    <span class="custom-modal-icon">${icon}</span>
                    <h3>${title}</h3>
                </div>
                <div class="custom-modal-body">
                    <p>${message}</p>
                </div>
                <div class="custom-modal-footer">
                    <button class="custom-btn custom-btn-secondary" data-action="cancel">Annuler</button>
                    <button class="custom-btn custom-btn-danger" data-action="confirm">Confirmer</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);

        modal.querySelectorAll('button').forEach(btn => {
            btn.addEventListener('click', () => {
                const action = btn.dataset.action === 'confirm';
                modal.remove();
                resolve(action);
            });
        });

        // Fermer avec Escape = Annuler
        const closeOnEscape = (e) => {
            if (e.key === 'Escape') {
                modal.remove();
                document.removeEventListener('keydown', closeOnEscape);
                resolve(false);
            }
        };
        document.addEventListener('keydown', closeOnEscape);
    });
}

/**
 * Afficher une notification toast
 */
function showNotification(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `custom-toast custom-toast-${type}`;

    const icons = {
        success: '✅',
        error: '❌',
        warning: '⚠️',
        info: 'ℹ️'
    };

    toast.innerHTML = `
        <span class="custom-toast-icon">${icons[type] || icons.info}</span>
        <span class="custom-toast-message">${message}</span>
    `;

    document.body.appendChild(toast);

    // Animation d'entrée
    setTimeout(() => toast.classList.add('show'), 10);

    // Suppression automatique après 4 secondes
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}

// État global
const state = {
    currentSection: 'dashboard',

    // Module Utilisateurs
    users: [],
    usersStats: null,
    usersPagination: { page: 1, totalPages: 1, totalUsers: 0 },
    usersFilters: {
        search: '',
        role: 'all',
        status: 'all',
        period: 'all',
        startDate: '',
        endDate: ''
    },
    selectedUser: null,
    userHistory: [],
    historyPagination: { page: 1, totalPages: 1 },

    // Module Documents
    documentsStats: null,
    documentsActivity: null,
    documentsPeriod: 'all',
    documentsCustomStartDate: null,
    documentsCustomEndDate: null,
    documentsSubTab: 'overview', // Sous-onglet actif
    mostShared: [],
    mostDownloaded: [],
    level1Deletions: [],
    deletedDocuments: [],
    deletedPagination: { page: 1, totalPages: 1, total: 0 },
    expandedAdmin: null, // Admin dont on affiche les documents supprimés
    adminDeletedDocs: [], // Documents supprimés par l'admin sélectionné
    level1Locks: [], // Admins niveau 1 ayant verrouillé des documents
    lockedDocuments: [],
    lockedPagination: { page: 1, totalPages: 1, total: 0 },
    expandedAdminLocked: null, // Admin dont on affiche les documents verrouillés
    adminLockedDocs: [], // Documents verrouillés par l'admin sélectionné
    allDocuments: [],
    allDocsPagination: { page: 1, totalPages: 1, total: 0 },
    allDocsSearch: '',
    expandedDocTrace: null, // ID du document dont on affiche la traçabilité
    expandedUserDownload: null, // Username de l'utilisateur dont on affiche les téléchargements

    // NOUVEAU: Traçabilité par niveau (1, 2, 3)
    usersDeletions: { niveau1: [], niveau2: [], niveau3: [] },
    usersLocks: { niveau1: [], niveau2: [], niveau3: [] },
    usersDownloads: { niveau1: [], niveau2: [], niveau3: [] },
    selectedTraceLevel: 'all', // 'all', '1', '2', '3' - filtre niveau affiché
    expandedUserTrace: null, // Utilisateur dont on affiche les détails
    expandedUserDocs: [], // Documents de l'utilisateur sélectionné

    // Filtres de recherche pour chaque section
    searchFilters: {
        shared: '',
        downloaded: '',
        deleted: '',
        locked: ''
    },

    // Modales
    showUserDetails: false,
    showCreateUser: false,
    showBlockConfirm: false,
    showDeleteConfirm: false,
    showFullHistory: false,
    showRestoreConfirm: false,  // ✅ NOUVEAU: Modal restauration document
    documentToRestore: null,     // ✅ NOUVEAU: Document à restaurer
    restoringDocument: false,    // ✅ NOUVEAU: État restauration en cours
    showRestoreAllConfirm: false,  // Modal restauration en masse
    restoringAllDocuments: false,  // État restauration en masse
    showPermanentDeleteAllConfirm: false, // Modal suppression définitive en masse
    deletingAllDocuments: false,   // État suppression définitive en masse

    // Module Dossiers (nouveau système)
    dossiersStats: null,
    dossiersActivity: null,
    dossiersPeriod: 'all',
    dossiersCustomStartDate: null,
    dossiersCustomEndDate: null,
    dossiersSubTab: 'overview', // Sous-onglet actif: overview, all, deleted, locked
    allDossiers: [],
    allDossiersPagination: { page: 1, totalPages: 1, total: 0 },
    allDossiersSearch: '',
    deletedDossiers: [],
    deletedDossiersPagination: { page: 1, totalPages: 1, total: 0 },
    lockedDossiers: [],
    lockedDossiersPagination: { page: 1, totalPages: 1, total: 0 },
    selectedDossier: null, // Dossier sélectionné pour détail
    showDossierDetail: false,

    // Rôles et départements (pour les selects)
    roles: [],
    departements: [],

    // Module Départements
    departmentsData: [],
    departmentsStats: null,
    departmentsPagination: { page: 1, totalPages: 1, total: 0 },
    departmentsFilters: {
        search: '',
        type: 'all' // 'all', 'main', 'services'
    },
    selectedDepartment: null,
    showCreateDepartment: false,
    showEditDepartment: false,
    showDeleteDepartmentConfirm: false,

    // Mode maintenance
    maintenanceMode: false
};

/**
 * Formater une date avec le fuseau horaire du serveur (Dakar)
 * Utilise toujours l'heure du serveur, pas celle du client
 */
function formatServerDate(date) {
    if (!date) return '-';
    return new Date(date).toLocaleString('fr-FR', {
        timeZone: 'Africa/Dakar',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });
}

/**
 * Navigation entre sections
 */
function navigateToSection(section) {
    state.currentSection = section;

    // Mettre à jour les tabs
    document.querySelectorAll('.nav-tab').forEach(tab => {
        tab.classList.remove('active');
        if (tab.dataset.section === section) {
            tab.classList.add('active');
        }
    });

    // Masquer toutes les sections
    document.querySelectorAll('[id^="section-"]').forEach(sec => {
        sec.style.display = 'none';
    });

    // Afficher la section active
    const sectionElement = document.getElementById(`section-${section}`);
    if (sectionElement) {
        sectionElement.style.display = 'block';
    }

    // Charger les données de la section
    loadCurrentSection();
}

/**
 * Charger la section actuelle
 */
async function loadCurrentSection() {
    if (state.currentSection === 'dashboard') {
        await loadDashboard();
    } else if (state.currentSection === 'users') {
        await loadUsersModule();
    } else if (state.currentSection === 'documents') {
        await loadDocumentsModule();
    } else if (state.currentSection === 'dossiers') {
        await loadDossiersModule();
    } else if (state.currentSection === 'departments') {
        await loadDepartmentsModule();
    } else if (state.currentSection === 'audit') {
        await loadAuditLogs();
    } else if (state.currentSection === 'messages') {
        // Recharger les messages
        if (typeof loadMessages === 'function') {
            await loadMessages();
        }
    }
}

/**
 * Rafraîchir la section actuelle
 */
async function refreshCurrentSection() {
    await loadCurrentSection();
}

/**
 * Vérifier l'état de la maintenance au chargement
 */
async function checkMaintenanceStatus() {
    try {
        const response = await fetch('/api/superadmin/maintenance/status', {
            credentials: 'include'
        });
        const data = await response.json();

        if (data.success) {
            state.maintenanceMode = data.maintenanceMode;
            updateMaintenanceButton(data.maintenanceMode);
        }
    } catch (error) {
        console.error('Erreur vérification maintenance:', error);
    }
}

/**
 * Basculer le mode maintenance
 */
async function toggleMaintenance() {
    try {
        // Vérifier l'état actuel
        const statusResponse = await fetch('/api/superadmin/maintenance/status', {
            credentials: 'include'
        });
        const statusData = await statusResponse.json();

        const isCurrentlyEnabled = statusData.maintenanceMode;
        const endpoint = isCurrentlyEnabled ? '/api/superadmin/maintenance/disable' : '/api/superadmin/maintenance/enable';

        // ✅ ACTIVATION/DÉSACTIVATION DIRECTE sans confirmation
        const response = await fetch(endpoint, {
            method: 'POST',
            credentials: 'include'
        });

        const data = await response.json();

        if (data.success) {
            // Mettre à jour le bouton immédiatement
            updateMaintenanceButton(!isCurrentlyEnabled);
            console.log(`✅ Maintenance ${!isCurrentlyEnabled ? 'activée' : 'désactivée'}`);
        } else {
            // Afficher uniquement les erreurs
            await customAlert({
                title: 'Erreur',
                message: data.message,
                type: 'error',
                icon: '❌'
            });
        }
    } catch (error) {
        console.error('Erreur toggle maintenance:', error);
        await customAlert({
            title: 'Erreur',
            message: 'Erreur lors de la modification du mode maintenance',
            type: 'error',
            icon: '❌'
        });
    }
}

/**
 * Mettre à jour l'apparence du bouton maintenance
 */
function updateMaintenanceButton(isEnabled) {
    const btn = document.getElementById('maintenanceBtn');
    const icon = document.getElementById('maintenanceIcon');
    const text = document.getElementById('maintenanceText');
    const banner = document.getElementById('maintenanceBanner');

    // Mettre à jour le state
    state.maintenanceMode = isEnabled;

    if (isEnabled) {
        // Maintenance ACTIVÉE : Vert ÉCLATANT avec effet GLOW
        btn.style.background = 'linear-gradient(135deg, #10b981 0%, #059669 100%)';
        btn.style.borderColor = '#10b981';
        btn.style.boxShadow = '0 2px 12px rgba(16, 185, 129, 0.5)';
        btn.style.animation = 'pulse-success 2s infinite';
        icon.textContent = '✅';
        if (text) text.textContent = 'Maintenance : Actif';
        btn.title = 'Mode maintenance ACTIVÉ - Site bloqué sauf whitelist - Cliquez pour désactiver';

        // Ajouter l'animation pulse-success si elle n'existe pas déjà
        if (!document.getElementById('pulse-success-style')) {
            const style = document.createElement('style');
            style.id = 'pulse-success-style';
            style.textContent = `
                @keyframes pulse-success {
                    0%, 100% {
                        box-shadow: 0 2px 12px rgba(16, 185, 129, 0.5);
                    }
                    50% {
                        box-shadow: 0 2px 18px rgba(16, 185, 129, 0.8);
                    }
                }
            `;
            document.head.appendChild(style);
        }

        // ✅ AFFICHER LA BANNIÈRE D'AVERTISSEMENT
        if (banner) {
            banner.style.display = 'block';
            banner.style.animation = 'slideDown 0.3s ease-out';
        }
    } else {
        // Maintenance DÉSACTIVÉE : Gris neutre
        btn.style.background = 'linear-gradient(135deg, #6b7280 0%, #4b5563 100%)';
        btn.style.borderColor = '#6b7280';
        btn.style.boxShadow = '0 2px 8px rgba(107, 114, 128, 0.3)';
        btn.style.animation = 'none';
        icon.textContent = '🔒';
        if (text) text.textContent = 'Maintenance : Inactif';
        btn.title = 'Mode maintenance DÉSACTIVÉ - Site accessible - Cliquez pour activer';

        // ✅ MASQUER LA BANNIÈRE
        if (banner) {
            banner.style.display = 'none';
        }
    }

    // Rafraîchir la liste des utilisateurs si on est dans la section users
    if (state.currentSection === 'users') {
        renderUsersModule();
    }
}

/**
 * Afficher une notification en haut de l'écran qui disparaît après 5 secondes
 */
function showTopNotification(message, type = 'info') {
    // Supprimer les anciennes notifications
    const oldNotif = document.getElementById('topNotification');
    if (oldNotif) oldNotif.remove();

    // Créer la notification
    const notif = document.createElement('div');
    notif.id = 'topNotification';
    notif.style.cssText = `
        position: fixed;
        top: 20px;
        left: 50%;
        transform: translateX(-50%);
        background: ${type === 'success' ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' :
                     type === 'error' ? 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)' :
                     'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)'};
        color: white;
        padding: 20px 40px;
        border-radius: 12px;
        font-size: 18px;
        font-weight: 700;
        box-shadow: 0 10px 40px rgba(0,0,0,0.3);
        z-index: 100000;
        animation: slideDown 0.5s ease-out;
        max-width: 90%;
        text-align: center;
    `;
    notif.textContent = message;

    // Ajouter l'animation CSS
    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideDown {
            from {
                opacity: 0;
                transform: translateX(-50%) translateY(-100px);
            }
            to {
                opacity: 1;
                transform: translateX(-50%) translateY(0);
            }
        }
        @keyframes slideUp {
            from {
                opacity: 1;
                transform: translateX(-50%) translateY(0);
            }
            to {
                opacity: 0;
                transform: translateX(-50%) translateY(-100px);
            }
        }
    `;
    document.head.appendChild(style);

    document.body.appendChild(notif);

    // Supprimer après 5 secondes
    setTimeout(() => {
        notif.style.animation = 'slideUp 0.5s ease-out';
        setTimeout(() => notif.remove(), 500);
    }, 5000);
}

/**
 * Déconnecter tous les utilisateurs
 */
async function forceLogoutAllUsers() {
    try {
        console.log('🔴 Déconnexion de tous les utilisateurs...');

        const response = await fetch('/api/superadmin/force-logout-all', {
            method: 'POST',
            credentials: 'include'
        });

        const data = await response.json();

        if (data.success) {
            console.log(`✅ ${data.count} utilisateur(s) déconnecté(s)`);
            console.log(`💥 ${data.sessionsDestroyed} session(s) détruite(s)`);

            // Afficher un message EN HAUT DE L'ÉCRAN qui disparaît après 5 secondes
            showTopNotification(
                `🔴 TOUS LES UTILISATEURS ONT ÉTÉ DÉCONNECTÉS - ${data.count} utilisateur(s) - ${data.sessionsDestroyed} session(s) détruite(s)`,
                'success'
            );

            // Rafraîchir la liste si on est dans la section users
            if (state.currentSection === 'users') {
                renderUsersModule();
            }
        } else {
            await customAlert({
                title: 'Erreur',
                message: data.message || 'Erreur lors de la déconnexion',
                type: 'error',
                icon: '❌'
            });
        }
    } catch (error) {
        console.error('❌ Erreur force-logout-all:', error);
        await customAlert({
            title: 'Erreur',
            message: 'Erreur lors de la déconnexion des utilisateurs',
            type: 'error',
            icon: '❌'
        });
    }
}

/**
 * Vérifier l'authentification Super Admin
 */
async function checkAuth() {
    try {
        const response = await fetch('/api/superadmin/test', {
            method: 'GET',
            credentials: 'include'
        });

        if (!response.ok) {
            console.warn('⚠️ Authentification échouée, statut:', response.status);
            // Seulement rediriger si c'est vraiment une erreur d'auth (401)
            if (response.status === 401 || response.status === 403) {
                window.location.href = '/super-admin-login.html';
            }
            return false;
        }

        const data = await response.json();

        if (!data.success) {
            console.warn('⚠️ Réponse auth invalide');
            window.location.href = '/super-admin-login.html';
            return false;
        }

        console.log('✅ Authentification Super Admin valide');
        return true;

    } catch (error) {
        console.error('❌ Erreur vérification auth:', error);
        // Ne pas rediriger en cas d'erreur réseau, juste logger
        // La session peut encore être valide
        return false;
    }
}

/**
 * Charger le dashboard complet avec timeout
 */
async function loadDashboard() {
    try {
        showLoading();
        hideError();

        // Vérifier l'authentification avec timeout de 5 secondes
        console.log('🔐 Vérification authentification...');
        const authPromise = checkAuth();
        const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Timeout authentification')), 5000)
        );

        const isAuth = await Promise.race([authPromise, timeoutPromise]);

        if (!isAuth) {
            hideLoading();
            console.warn('⚠️ Authentification échouée - Arrêt du chargement');
            return;
        }

        console.log('✅ Authentification OK');

        // Afficher le dashboard vide d'abord pour meilleure UX
        showDashboard();

        // Charger les statistiques en arrière-plan
        console.log('📊 Chargement statistiques...');
        loadStats().catch(err => {
            console.error('❌ Erreur stats:', err);
            showError('Impossible de charger les statistiques');
        });

        // Charger les graphiques en arrière-plan
        console.log('📈 Chargement graphiques...');
        loadCharts().catch(err => {
            console.error('❌ Erreur graphiques:', err);
        });

    } catch (error) {
        console.error('❌ Erreur chargement dashboard:', error);
        hideLoading();
        showError(error.message || 'Erreur lors du chargement du dashboard');
    }
}

/**
 * Charger les statistiques globales
 */
async function loadStats() {
    const response = await fetch('/api/superadmin/dashboard/stats', {
        method: 'GET',
        credentials: 'include'
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Erreur lors de la récupération des statistiques');
    }

    const data = await response.json();

    if (!data.success) {
        throw new Error(data.message || 'Erreur inconnue');
    }

    displayStats(data.data);
}

/**
 * Afficher les statistiques
 */
function displayStats(stats) {
    // Statistiques utilisateurs
    document.getElementById('totalUsers').textContent = stats.users.total.toLocaleString();
    document.getElementById('activeToday').textContent = stats.users.activeToday.toLocaleString();

    // Statistiques documents
    document.getElementById('totalDocuments').textContent = stats.documents.total.toLocaleString();
    document.getElementById('docsToday').textContent = stats.documents.createdToday.toLocaleString();

    // Ressources système
    if (stats.system.resources) {
        const memory = stats.system.resources.memory;
        const uptime = stats.system.resources.uptime;

        // Mémoire
        if (memory && document.getElementById('memoryPercent')) {
            document.getElementById('memoryPercent').textContent =
                `${memory.percentage}% (${memory.used} / ${memory.total})`;

            const memProgress = document.getElementById('memoryProgress');
            if (memProgress) {
                memProgress.style.width = memory.percentage + '%';
                memProgress.className = 'progress-fill ' + getProgressClass(memory.percentage);
            }
        }

        // Uptime
        if (uptime) {
            if (document.getElementById('systemUptime')) {
                document.getElementById('systemUptime').textContent = formatUptime(uptime.system);
            }
            if (document.getElementById('processUptime')) {
                document.getElementById('processUptime').textContent = formatUptime(uptime.process);
            }
        }
    }

    // Sécurité
    document.getElementById('securityAlerts').textContent = stats.security.activeAlerts || 0;

    // Événements de sécurité
    displaySecurityEvents(stats.security.events || []);
}

/**
 * Afficher les événements de sécurité
 */
function displaySecurityEvents(events) {
    const container = document.getElementById('securityEvents');

    if (events.length === 0) {
        container.innerHTML = '<p style="color: #718096;">Aucun événement de sécurité</p>';
        return;
    }

    container.innerHTML = events.map(event => `
        <div class="event-item">
            <div class="type">${getEventLabel(event.type)}</div>
            <div class="details">
                ${event.count} occurrence(s) -
                Dernier: ${formatServerDate(event.lastOccurrence)}
            </div>
        </div>
    `).join('');
}

/**
 * Obtenir le label d'un événement de sécurité
 */
function getEventLabel(type) {
    const labels = {
        'UNAUTHORIZED_SUPERADMIN_ACCESS': '🚫 Tentative d\'accès non autorisé',
        'LOGIN_FAILED': '❌ Échec de connexion',
        'RATE_LIMIT_EXCEEDED': '⚠️ Limite de requêtes dépassée'
    };
    return labels[type] || type;
}

/**
 * Obtenir la classe CSS pour la barre de progression
 */
function getProgressClass(percentage) {
    if (percentage >= 90) return 'danger';
    if (percentage >= 70) return 'warning';
    return '';
}

/**
 * Formater le temps d'uptime
 */
function formatUptime(seconds) {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);

    if (days > 0) {
        return `${days}j ${hours}h ${minutes}m`;
    } else if (hours > 0) {
        return `${hours}h ${minutes}m`;
    } else {
        return `${minutes}m`;
    }
}

/**
 * Charger les graphiques
 */
async function loadCharts() {
    // Charger les données des utilisateurs
    const usersData = await loadTrends('users', '24h');
    displayUsersChart(usersData);

    // Charger les données des documents
    const docsData = await loadTrends('documents', '24h');
    displayDocumentsChart(docsData);
}

/**
 * Charger les tendances
 */
async function loadTrends(type, period) {
    const response = await fetch(`/api/superadmin/dashboard/trends?type=${type}&period=${period}`, {
        method: 'GET',
        credentials: 'include'
    });

    if (!response.ok) {
        throw new Error('Erreur lors de la récupération des tendances');
    }

    const data = await response.json();

    if (!data.success) {
        throw new Error(data.message || 'Erreur inconnue');
    }

    return data.data;
}

/**
 * Afficher le graphique des utilisateurs
 */
function displayUsersChart(data) {
    const chartElement = document.getElementById('usersChart');
    if (!chartElement) {
        console.log('⚠️ Element usersChart non trouvé, graphique ignoré');
        return;
    }
    const ctx = chartElement.getContext('2d');

    // Détruire l'ancien graphique s'il existe
    if (usersChart) {
        usersChart.destroy();
    }

    // Préparer les données
    const labels = data.map((item, index) => `H-${24 - index}`);
    const values = data.map(item => item.count);

    usersChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Utilisateurs actifs',
                data: values,
                borderColor: '#667eea',
                backgroundColor: 'rgba(102, 126, 234, 0.1)',
                borderWidth: 2,
                fill: true,
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        precision: 0
                    }
                }
            }
        }
    });
}

/**
 * Afficher le graphique des documents
 */
function displayDocumentsChart(data) {
    const chartElement = document.getElementById('documentsChart');
    if (!chartElement) {
        console.log('⚠️ Element documentsChart non trouvé, graphique ignoré');
        return;
    }
    const ctx = chartElement.getContext('2d');

    // Détruire l'ancien graphique s'il existe
    if (documentsChart) {
        documentsChart.destroy();
    }

    // Préparer les données
    const labels = data.map((item, index) => `H-${24 - index}`);
    const values = data.map(item => item.count);

    documentsChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Documents créés',
                data: values,
                backgroundColor: 'rgba(118, 75, 162, 0.7)',
                borderColor: '#764ba2',
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        precision: 0
                    }
                }
            }
        }
    });
}

/**
 * Afficher l'état de chargement
 */
function showLoading() {
    document.getElementById('loading').style.display = 'block';
    document.getElementById('dashboard-content').style.display = 'none';
}

/**
 * Masquer l'état de chargement
 */
function hideLoading() {
    document.getElementById('loading').style.display = 'none';
}

/**
 * Afficher le dashboard
 */
function showDashboard() {
    document.getElementById('loading').style.display = 'none';
    document.getElementById('dashboard-content').style.display = 'block';
}

/**
 * Afficher une erreur
 */
function showError(message) {
    const errorDiv = document.getElementById('error');
    errorDiv.textContent = '❌ ' + message;
    errorDiv.style.display = 'block';
    document.getElementById('loading').style.display = 'none';
}

/**
 * Masquer l'erreur
 */
function hideError() {
    document.getElementById('error').style.display = 'none';
}

/**
 * Déconnexion
 */
async function logout() {
    // ✅ Arrêter tous les intervalles et timers avant de déconnecter
    if (window.dashboardRefreshInterval) {
        clearInterval(window.dashboardRefreshInterval);
        window.dashboardRefreshInterval = null;
    }
    if (window.dashboardInactivityTimer) {
        clearTimeout(window.dashboardInactivityTimer);
        window.dashboardInactivityTimer = null;
    }

    try {
        // Détruire la session silencieusement
        await fetch('/api/logout', {
            method: 'POST',
            credentials: 'include'
        });
    } catch (error) {
        // Ignorer les erreurs silencieusement pour éviter le flash
        console.log('Note: Session déconnectée');
    }

    // Rediriger immédiatement vers la page de connexion
    window.location.replace('/super-admin-login.html');
}

// ============================================
// MODULE UTILISATEURS
// ============================================

/**
 * Charger le module utilisateurs
 */
async function loadUsersModule() {
    try {
        // Charger les rôles et départements (pour les selects)
        if (state.roles.length === 0) {
            try {
                const rolesRes = await fetch('/api/roles', { credentials: 'include' });
                if (rolesRes.ok) {
                    const rolesData = await rolesRes.json();
                    state.roles = rolesData.roles || [];
                }
            } catch (e) {
                console.warn('Impossible de charger les rôles, utilisation par défaut');
                state.roles = [];
            }
        }

        if (state.departements.length === 0) {
            try {
                const deptsRes = await fetch('/api/departements', { credentials: 'include' });
                if (deptsRes.ok) {
                    const deptsData = await deptsRes.json();
                    state.departements = deptsData.departements || [];
                }
            } catch (e) {
                console.warn('Impossible de charger les départements, utilisation par défaut');
                state.departements = [];
            }
        }

        // Charger les utilisateurs
        await loadUsers();

        // Render
        renderUsersModule();

    } catch (error) {
        console.error('Erreur chargement module utilisateurs:', error);
        showError('Erreur lors du chargement du module utilisateurs: ' + error.message);
    }
}

/**
 * Charger les utilisateurs
 */
async function loadUsers() {
    const { search, role, status, period, startDate, endDate } = state.usersFilters;
    const { page } = state.usersPagination;

    console.log('🔍 DEBUG loadUsers - Filtre status:', status);

    const params = new URLSearchParams({
        search,
        role,
        status,
        page,
        period
    });

    console.log('🔍 DEBUG loadUsers - URL:', `/api/superadmin/users?${params}`);

    // Ajouter les dates personnalisées si période = custom
    if (period === 'custom' && startDate && endDate) {
        params.append('startDate', startDate);
        params.append('endDate', endDate);
    }

    const response = await fetch(`/api/superadmin/users?${params}`, {
        credentials: 'include'
    });

    if (!response.ok) {
        const errorText = await response.text();
        console.error('Erreur API response:', response.status, errorText);
        throw new Error(`Erreur API: ${response.status} - ${errorText.substring(0, 100)}`);
    }

    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text();
        console.error('La réponse n\'est pas du JSON:', text.substring(0, 200));
        throw new Error('La réponse du serveur n\'est pas du JSON');
    }

    const data = await response.json();

    if (data.success) {
        console.log(`✅ DEBUG loadUsers - Reçu ${data.data.users.length} utilisateur(s)`);
        state.users = data.data.users;
        state.usersStats = data.data.stats;
        state.usersPagination = data.data.pagination;
    } else {
        throw new Error(data.message || 'Erreur inconnue');
    }
}

/**
 * Render du module utilisateurs
 */
function renderUsersModule() {
    const sectionUsers = document.getElementById('section-users');

    // Sauvegarder le focus et la position du curseur
    const activeElement = document.activeElement;
    const isSearchInput = activeElement && activeElement.placeholder && activeElement.placeholder.includes('Rechercher');
    const cursorPosition = isSearchInput ? activeElement.selectionStart : null;

    sectionUsers.innerHTML = `
        <div class="users-module">
            ${renderUsersStats()}
            ${renderUsersFilters()}
            ${renderUsersTable()}
            ${renderUsersPagination()}
        </div>

        ${state.showUserDetails ? renderUserDetailsModal() : ''}
        ${state.showCreateUser ? renderCreateUserModal() : ''}
        ${state.showBlockConfirm ? renderBlockConfirmModal() : ''}
        ${state.showDeleteConfirm ? renderDeleteConfirmModal() : ''}
    `;

    // Restaurer le focus si c'était le champ de recherche
    if (isSearchInput) {
        setTimeout(() => {
            const searchInput = sectionUsers.querySelector('input[placeholder*="Rechercher"]');
            if (searchInput) {
                searchInput.focus();
                if (cursorPosition !== null) {
                    searchInput.setSelectionRange(cursorPosition, cursorPosition);
                }
            }
        }, 0);
    }
}

function renderUsersStats() {
    const { total, active, blocked } = state.usersStats || { total: 0, active: 0, blocked: 0 };

    return `
        <div class="stats-bar">
            <div class="stat-item">
                👥 ${total} Total
            </div>
            <div class="stat-item success">
                ✅ ${active} Actifs
            </div>
            <div class="stat-item danger">
                🚫 ${blocked} Bloqués
            </div>
        </div>
    `;
}

function renderUsersFilters() {
    const showCustomDates = state.usersFilters.period === 'custom';
    const periodActive = state.usersFilters.period !== 'all';

    return `
        <div class="filters-bar">
            <input type="text"
                   placeholder="🔍 Rechercher par nom, email ou username..."
                   value="${state.usersFilters.search}"
                   oninput="handleSearchChange(this.value)" />

            <select onchange="handleRoleFilter(this.value)">
                <option value="all">Tous les rôles</option>
                ${state.roles.map(role => `
                    <option value="${role._id}" ${state.usersFilters.role === role._id ? 'selected' : ''}>
                        ${role.nom}
                    </option>
                `).join('')}
            </select>

            <select onchange="handleStatusFilter(this.value)">
                <option value="all">Tous les statuts</option>
                <option value="active" ${state.usersFilters.status === 'active' ? 'selected' : ''}>Actifs</option>
                <option value="blocked" ${state.usersFilters.status === 'blocked' ? 'selected' : ''}>Bloqués</option>
                <option value="online" ${state.usersFilters.status === 'online' ? 'selected' : ''}>🟢 Connectés</option>
            </select>

            <select onchange="handlePeriodFilter(this.value)" style="border: ${periodActive ? '2px solid #667eea' : '2px solid #e2e8f0'};">
                <option value="all">📅 Toute la période</option>
                <option value="today" ${state.usersFilters.period === 'today' ? 'selected' : ''}>Aujourd'hui</option>
                <option value="7days" ${state.usersFilters.period === '7days' ? 'selected' : ''}>7 derniers jours</option>
                <option value="30days" ${state.usersFilters.period === '30days' ? 'selected' : ''}>30 derniers jours</option>
                <option value="custom" ${state.usersFilters.period === 'custom' ? 'selected' : ''}>Période personnalisée</option>
            </select>

            ${showCustomDates ? `
                <input type="date"
                       value="${state.usersFilters.startDate}"
                       onchange="handleCustomDateChange('startDate', this.value)"
                       style="padding: 10px 16px; border: 2px solid #667eea; border-radius: 8px; font-size: 14px;" />
                <input type="date"
                       value="${state.usersFilters.endDate}"
                       onchange="handleCustomDateChange('endDate', this.value)"
                       style="padding: 10px 16px; border: 2px solid #667eea; border-radius: 8px; font-size: 14px;" />
            ` : ''}

            <button class="refresh-btn" onclick="showCreateUserModal()">
                ➕ Créer utilisateur
            </button>
        </div>
        ${periodActive ? `
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 10px 16px; border-radius: 8px; font-size: 13px; font-weight: 600; margin-bottom: 12px; display: inline-block;">
                🔍 Filtre actif : ${getPeriodLabel(state.usersFilters.period)}
                ${state.usersFilters.period === 'custom' ? `(${formatDate(state.usersFilters.startDate)} - ${formatDate(state.usersFilters.endDate)})` : ''}
                <button onclick="clearPeriodFilter()" style="background: rgba(255,255,255,0.3); border: none; color: white; padding: 4px 8px; border-radius: 4px; margin-left: 8px; cursor: pointer; font-size: 12px;">
                    ✕ Effacer
                </button>
            </div>
        ` : ''}
    `;
}

function getPeriodLabel(period) {
    const labels = {
        'today': "Aujourd'hui",
        '7days': '7 derniers jours',
        '30days': '30 derniers jours',
        'custom': 'Période personnalisée'
    };
    return labels[period] || 'Toute la période';
}

function formatDate(dateStr) {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('fr-FR');
}

function renderUsersTable() {
    if (state.users.length === 0) {
        return '<p style="text-align: center; color: #718096; padding: 40px;">Aucun utilisateur trouvé</p>';
    }

    return `
        <table class="users-table">
            <thead>
                <tr>
                    <th>Utilisateur</th>
                    <th>Email</th>
                    <th>Rôle</th>
                    <th>Département</th>
                    <th>Créé par</th>
                    <th>Date de création</th>
                    <th>Dernière connexion</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>
                ${state.users.map(user => renderUserRow(user)).join('')}
            </tbody>
        </table>
    `;
}

function renderUserRow(user) {
    const isBlocked = user.status === 'blocked';
    const isLevel0 = user.role.niveau === 0;
    const lastLoginText = user.lastLogin
        ? formatServerDate(user.lastLogin)
        : 'Jamais';
    const createdAtText = user.createdAt
        ? formatServerDate(user.createdAt)
        : '-';

    // En mode maintenance, vérifier si l'utilisateur est dans la whitelist
    const inWhitelist = user.inMaintenanceWhitelist || false;

    // Déterminer le statut de connexion
    const isOnline = user.isOnline || false;

    // DEBUG: Log pour TOUS les utilisateurs
    console.log(`👤 User ${user.username}:`, {
        isOnline: user.isOnline,
        isOnlineCalculated: isOnline,
        lastActivity: user.lastActivity
    });

    // Badge simple avec emoji (plus visible)
    const statusBadge = isOnline ? '🟢' : '⚪';

    // Texte "EN LIGNE" simplifié
    const onlineText = isOnline ? ' <strong style="color: #10b981; font-size: 11px;">EN LIGNE</strong>' : '';

    console.log(`🔍 ${user.username} - isOnline=${isOnline}, badge="${statusBadge}", texte="${onlineText}"`);

    return `
        <tr class="${isBlocked ? 'blocked' : ''}">
            <td>
                <div style="display: flex; align-items: center; gap: 8px;">
                    ${statusBadge}
                    <div>
                        <strong>${user.nom}</strong>
                        ${onlineText}
                        <br>
                        <small style="color: #718096;">@${user.username}</small>
                    </div>
                </div>
            </td>
            <td>${user.email}</td>
            <td>
                <span class="user-badge badge-niveau-${user.role.niveau}">
                    ${user.role.nom}
                </span>
            </td>
            <td>${user.departement ? user.departement.nom : '-'}</td>
            <td>
                <span style="color: #4a5568; font-weight: 600;">
                    ${user.createdBy ? `👤 ${user.createdBy}` : '⚙️ Système'}
                </span>
            </td>
            <td>${createdAtText}</td>
            <td>${lastLoginText}</td>
            <td>
                <button class="action-btn btn-view" onclick="viewUserDetails('${user.username}')">
                    👁️ Voir
                </button>
                ${!isLevel0 ? `
                    ${isOnline ? `
                        <button class="action-btn" style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);" onclick="disconnectUser('${user.username}')">
                            🔌 Déconnecter
                        </button>
                    ` : ''}
                    ${state.maintenanceMode
                        ? (inWhitelist
                            ? `<button class="action-btn btn-block" onclick="confirmBlockUser('${user.username}')">
                                🚫 Bloquer
                               </button>`
                            : `<button class="action-btn btn-unblock" onclick="confirmUnblockUser('${user.username}')">
                                🔓 Débloquer
                               </button>`)
                        : isBlocked
                            ? `<button class="action-btn btn-unblock" onclick="confirmUnblockUser('${user.username}')">
                                🔓 Débloquer
                               </button>`
                            : `<button class="action-btn btn-block" onclick="confirmBlockUser('${user.username}')">
                                🚫 Bloquer
                               </button>`
                    }
                    <button class="action-btn btn-delete" onclick="confirmDeleteUser('${user.username}')">
                        🗑️ Supprimer
                    </button>
                ` : ''}
            </td>
        </tr>
    `;
}

function renderUsersPagination() {
    const { page, totalPages, totalUsers } = state.usersPagination;

    if (totalPages <= 1) return '';

    // Générer les numéros de pages à afficher
    const pageNumbers = [];
    const maxPagesToShow = 5;

    let startPage = Math.max(1, page - Math.floor(maxPagesToShow / 2));
    let endPage = Math.min(totalPages, startPage + maxPagesToShow - 1);

    // Ajuster si on est proche de la fin
    if (endPage - startPage < maxPagesToShow - 1) {
        startPage = Math.max(1, endPage - maxPagesToShow + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
        pageNumbers.push(i);
    }

    return `
        <div class="pagination-container">
            <div class="pagination-info">
                ${totalUsers} utilisateur${totalUsers > 1 ? 's' : ''} au total - 15 par page
            </div>
            <div class="pagination">
                <button class="pagination-btn" ${page === 1 ? 'disabled' : ''} onclick="goToUsersPage(${page - 1})">
                    ◀ Précédent
                </button>

                ${startPage > 1 ? `
                    <button class="pagination-btn page-btn" onclick="goToUsersPage(1)">1</button>
                    ${startPage > 2 ? '<span class="pagination-dots">...</span>' : ''}
                ` : ''}

                ${pageNumbers.map(p => `
                    <button class="pagination-btn page-btn ${p === page ? 'active' : ''}"
                            onclick="goToUsersPage(${p})">
                        ${p}
                    </button>
                `).join('')}

                ${endPage < totalPages ? `
                    ${endPage < totalPages - 1 ? '<span class="pagination-dots">...</span>' : ''}
                    <button class="pagination-btn page-btn" onclick="goToUsersPage(${totalPages})">${totalPages}</button>
                ` : ''}

                <button class="pagination-btn" ${page === totalPages ? 'disabled' : ''} onclick="goToUsersPage(${page + 1})">
                    Suivant ▶
                </button>
            </div>
        </div>
    `;
}

// Filtres
let searchDebounce;
function handleSearchChange(value) {
    clearTimeout(searchDebounce);
    searchDebounce = setTimeout(async () => {
        state.usersFilters.search = value;
        state.usersPagination.page = 1;
        await loadUsers();
        renderUsersModule();
    }, 300);
}

function handleRoleFilter(value) {
    state.usersFilters.role = value;
    state.usersPagination.page = 1;
    loadUsers().then(renderUsersModule);
}

function handleStatusFilter(value) {
    state.usersFilters.status = value;
    state.usersPagination.page = 1;
    loadUsers().then(renderUsersModule);
}

function handlePeriodFilter(value) {
    state.usersFilters.period = value;
    state.usersPagination.page = 1;

    // Si on change vers "custom", ne pas charger encore (attendre les dates)
    // Sinon, charger immédiatement
    if (value !== 'custom') {
        loadUsers().then(renderUsersModule);
    } else {
        // Juste re-render pour afficher les inputs de date
        renderUsersModule();
    }
}

function handleCustomDateChange(field, value) {
    state.usersFilters[field] = value;

    // Si les deux dates sont remplies, charger les utilisateurs
    if (state.usersFilters.startDate && state.usersFilters.endDate) {
        state.usersPagination.page = 1;
        loadUsers().then(renderUsersModule);
    }
}

function clearPeriodFilter() {
    state.usersFilters.period = 'all';
    state.usersFilters.startDate = '';
    state.usersFilters.endDate = '';
    state.usersPagination.page = 1;
    loadUsers().then(renderUsersModule);
}

// Pagination
function goToUsersPage(page) {
    state.usersPagination.page = page;
    loadUsers().then(renderUsersModule);
}

// Modales
function renderUserDetailsModal() {
    const user = state.selectedUser;
    if (!user) return '';

    const lastLoginText = user.lastLogin
        ? formatServerDate(user.lastLogin)
        : 'Jamais connecté';

    const lastLogoutText = user.lastLogout
        ? formatServerDate(user.lastLogout)
        : 'Jamais déconnecté';

    const lastDisconnectionText = user.lastDisconnection
        ? formatServerDate(user.lastDisconnection)
        : null;

    return `
        <div class="modal-overlay" onclick="closeModal(event)">
            <div class="modal-content" onclick="event.stopPropagation()">
                <div class="modal-header">
                    <h2>👤 Détails de l'utilisateur</h2>
                    <button class="modal-close" onclick="closeUserDetailsModal()">✕</button>
                </div>
                <div class="modal-body">
                    <div class="detail-row">
                        <span class="detail-label">Nom complet</span>
                        <span class="detail-value">${user.nom}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Username</span>
                        <span class="detail-value">@${user.username}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Email</span>
                        <span class="detail-value">${user.email}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Rôle</span>
                        <span class="detail-value">
                            <span class="user-badge badge-niveau-${user.role.niveau}">
                                ${user.role.nom}
                            </span>
                        </span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Département</span>
                        <span class="detail-value">${user.departement ? user.departement.nom : 'Aucun'}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Date de création</span>
                        <span class="detail-value">${formatServerDate(user.createdAt)}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Créé par</span>
                        <span class="detail-value">${user.createdBy || 'Non renseigné'}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Dernière connexion</span>
                        <span class="detail-value">${lastLoginText}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Dernière déconnexion</span>
                        <span class="detail-value">${lastLogoutText}</span>
                    </div>
                    ${lastDisconnectionText ? `
                    <div class="detail-row" style="background: #fef3c7; padding: 12px; border-radius: 8px; border-left: 4px solid #f59e0b;">
                        <span class="detail-label" style="color: #92400e; font-weight: 600;">🔌 Déconnexion forcée</span>
                        <span class="detail-value" style="color: #92400e;">
                            ${lastDisconnectionText}
                            ${user.disconnectedBy ? `<br><small style="font-size: 12px;">Par: ${user.disconnectedBy}</small>` : ''}
                        </span>
                    </div>
                    ` : ''}
                    <div class="detail-row">
                        <span class="detail-label">Nombre de connexions</span>
                        <span class="detail-value">${user.loginCount}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Total d'actions</span>
                        <span class="detail-value">${user.actionsCount}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Statut</span>
                        <span class="detail-value">
                            <span class="user-badge ${user.status === 'blocked' ? 'badge-blocked' : 'badge-active'}">
                                ${user.status === 'blocked' ? '🚫 Bloqué' : '✅ Actif'}
                            </span>
                        </span>
                    </div>

                    ${user.lastActions && user.lastActions.length > 0 ? `
                        <div style="margin-top: 24px; padding-top: 20px; border-top: 2px solid #e2e8f0;">
                            <h3 style="color: #1a202c; font-size: 16px; font-weight: 600; margin-bottom: 12px;">
                                📋 20 Dernières Actions (Documents)
                            </h3>
                            <div class="actions-list">
                                ${user.lastActions.map(action => `
                                    <div class="action-item">
                                        <div class="action-type">${formatActionType(action.action)}</div>
                                        <div class="action-details">
                                            📅 ${formatServerDate(action.timestamp)}
                                            ${action.ip ? ` • 🌐 ${action.ip}` : ''}
                                        </div>
                                        ${action.documentId ? `
                                            <div class="action-doc">
                                                📄 Document: ${action.documentTitle || 'Sans titre'}
                                                <br>🆔 ${action.documentId}
                                                ${action.action === 'DOCUMENT_SHARED' && action.sharedWith && action.sharedWith.length > 0 ? `
                                                    <br>👥 Partagé avec: ${action.sharedWith.join(', ')}
                                                ` : ''}
                                            </div>
                                        ` : ''}
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    ` : '<p style="color: #a0aec0; margin-top: 20px; text-align: center;">Aucune action sur les documents</p>'}
                </div>
                <div class="modal-actions">
                    <button class="btn-modal btn-secondary" onclick="closeUserDetailsModal()">
                        Fermer
                    </button>
                </div>
            </div>
        </div>
    `;
}

function renderCreateUserModal() {
    return `
        <div class="modal-overlay" onclick="closeModal(event)">
            <div class="modal-content" onclick="event.stopPropagation()">
                <div class="modal-header">
                    <h2>➕ Créer un utilisateur</h2>
                    <button class="modal-close" onclick="closeCreateUserModal()">✕</button>
                </div>
                <form id="createUserForm" onsubmit="handleCreateUser(event)">
                    <div class="modal-body">
                        <div class="form-group">
                            <label for="newUsername">Nom d'utilisateur *</label>
                            <input type="text" id="newUsername" name="username" required
                                   placeholder="Ex: jdupont">
                        </div>
                        <div class="form-group">
                            <label for="newNom">Nom complet *</label>
                            <input type="text" id="newNom" name="nom" required
                                   placeholder="Ex: Jean Dupont">
                        </div>
                        <div class="form-group">
                            <label for="newEmail">Email *</label>
                            <input type="email" id="newEmail" name="email" required
                                   placeholder="Ex: jean.dupont@mes.gouv.sn">
                        </div>
                        <div class="form-group">
                            <label for="newRole">Rôle *</label>
                            <select id="newRole" name="idRole" required>
                                <option value="">-- Sélectionner un rôle --</option>
                                ${(() => {
                                    // 🛡️ SÉCURITÉ CRITIQUE: Filtrer niveau 0
                                    console.log('🔍 [SUPER ADMIN] Filtrage des rôles pour création utilisateur');
                                    console.log('📋 Rôles disponibles AVANT filtrage:', state.roles);

                                    const rolesFiltered = state.roles.filter(role => {
                                        // Exclure les rôles sans niveau défini (sauf 0)
                                        if (role.niveau === null || role.niveau === undefined) {
                                            console.log('❌ Rôle exclu (niveau undefined):', role);
                                            return false;
                                        }

                                        // INTERDICTION ABSOLUE: Exclure niveau 0
                                        if (role.niveau === 0) {
                                            console.log('🛡️ NIVEAU 0 BLOQUÉ:', role);
                                            return false;
                                        }

                                        // Autoriser uniquement niveaux 1, 2, 3
                                        const isAllowed = role.niveau >= 1 && role.niveau <= 3;
                                        console.log(isAllowed ? '✅' : '❌', 'Rôle:', role.nom, '- Niveau:', role.niveau);
                                        return isAllowed;
                                    });

                                    console.log('✅ Rôles disponibles APRÈS filtrage:', rolesFiltered);
                                    console.log(`📊 Total: ${rolesFiltered.length} rôles (niveaux 1, 2, 3 uniquement)`);

                                    return rolesFiltered.map(role => `
                                        <option value="${role._id}">${role.nom} (Niveau ${role.niveau})</option>
                                    `).join('');
                                })()}
                            </select>
                            <p style="margin-top: 8px; font-size: 12px; color: #059669; background: #d1fae5; padding: 8px; border-radius: 6px; border-left: 3px solid #059669;">
                                🛡️ <strong>Sécurité:</strong> Les Super Admins (niveau 0) ne peuvent être créés que via le script dédié: <code>npm run create-superadmin</code>
                            </p>
                        </div>
                        <div class="form-group">
                            <label for="newDepartement">Département *</label>
                            <select id="newDepartement" name="idDepartement" required>
                                <option value="">-- Sélectionnez un département --</option>
                                ${state.departements.map(dept => `
                                    <option value="${dept._id}">${dept.nom}</option>
                                `).join('')}
                            </select>
                        </div>
                        <div style="background: #fef3c7; padding: 12px; border-radius: 8px; border-left: 3px solid #f59e0b;">
                            <p style="margin: 0; font-size: 13px; color: #92400e;">
                                ℹ️ Le mot de passe par défaut sera <strong>1234</strong>.
                                L'utilisateur devra le changer à sa première connexion.
                            </p>
                        </div>
                    </div>
                    <div class="modal-actions">
                        <button type="button" class="btn-modal btn-secondary" onclick="closeCreateUserModal()">
                            Annuler
                        </button>
                        <button type="submit" class="btn-modal btn-primary">
                            ✓ Créer l'utilisateur
                        </button>
                    </div>
                </form>
            </div>
        </div>
    `;
}

function renderBlockConfirmModal() {
    const user = state.selectedUser;
    if (!user) return '';

    return `
        <div class="modal-overlay" onclick="closeModal(event)">
            <div class="modal-content" onclick="event.stopPropagation()">
                <div class="modal-header">
                    <h2>🚫 Bloquer l'utilisateur</h2>
                    <button class="modal-close" onclick="closeBlockModal()">✕</button>
                </div>
                <form id="blockUserForm" onsubmit="handleBlockUser(event)">
                    <div class="modal-body">
                        <p style="color: #4a5568; margin-bottom: 20px;">
                            Vous êtes sur le point de bloquer <strong>${user.nom}</strong> (@${user.username}).
                        </p>
                        <div class="form-group">
                            <label for="blockReason">Raison du blocage *</label>
                            <textarea id="blockReason" name="reason" required
                                      placeholder="Ex: Violation des règles d'utilisation, compte inactif, etc."></textarea>
                        </div>
                        <div style="background: #fef2f2; padding: 12px; border-radius: 8px; border-left: 3px solid #ef4444;">
                            <p style="margin: 0; font-size: 13px; color: #991b1b;">
                                ⚠️ L'utilisateur ne pourra plus se connecter tant que son compte est bloqué.
                            </p>
                        </div>
                    </div>
                    <div class="modal-actions">
                        <button type="button" class="btn-modal btn-secondary" onclick="closeBlockModal()">
                            Annuler
                        </button>
                        <button type="submit" class="btn-modal btn-danger">
                            🚫 Bloquer
                        </button>
                    </div>
                </form>
            </div>
        </div>
    `;
}

function renderDeleteConfirmModal() {
    const user = state.selectedUser;
    if (!user) return '';

    return `
        <div class="modal-overlay" onclick="closeModal(event)">
            <div class="modal-content" onclick="event.stopPropagation()">
                <div class="modal-header">
                    <h2>🗑️ Supprimer l'utilisateur</h2>
                    <button class="modal-close" onclick="closeDeleteModal()">✕</button>
                </div>
                <div class="modal-body">
                    <div style="background: #fef2f2; padding: 20px; border-radius: 8px; border: 2px solid #ef4444; margin-bottom: 20px;">
                        <p style="margin: 0 0 12px 0; font-size: 16px; font-weight: 700; color: #991b1b;">
                            ⚠️ ATTENTION - Action irréversible !
                        </p>
                        <p style="margin: 0; font-size: 14px; color: #7f1d1d;">
                            Vous êtes sur le point de supprimer définitivement l'utilisateur :
                        </p>
                    </div>
                    <div style="background: #f7fafc; padding: 16px; border-radius: 8px; margin-bottom: 20px;">
                        <p style="margin: 0 0 8px 0; font-size: 15px; font-weight: 600; color: #1a202c;">
                            ${user.nom}
                        </p>
                        <p style="margin: 0; font-size: 13px; color: #718096;">
                            @${user.username} • ${user.email}
                        </p>
                    </div>
                    <p style="color: #4a5568; font-size: 14px;">
                        Cette action supprimera toutes les données de l'utilisateur.
                        Êtes-vous absolument certain de vouloir continuer ?
                    </p>
                </div>
                <div class="modal-actions">
                    <button type="button" class="btn-modal btn-secondary" onclick="closeDeleteModal()">
                        Annuler
                    </button>
                    <button type="button" class="btn-modal btn-danger" onclick="deleteUserConfirmed()">
                        🗑️ Oui, supprimer définitivement
                    </button>
                </div>
            </div>
        </div>
    `;
}

// Utilitaires
function formatActionType(action) {
    const labels = {
        'DOCUMENT_ARCHIVED': '📦 Archivage',
        'DOCUMENT_DELETED': '🗑️ Suppression',
        'DOCUMENT_SHARED': '📤 Partage',
        'DOCUMENT_DOWNLOADED': '⬇️ Téléchargement',
        'DOCUMENT_VIEWED': '👁️ Prévisualisation',
        'DOCUMENT_VERROUILLE': '🔒 Verrouillage',
        'DOCUMENT_DEVERROUILLE': '🔓 Déverrouillage'
    };
    return labels[action] || action;
}

function closeModal(event) {
    if (event.target.classList.contains('modal-overlay')) {
        closeAllModals();
    }
}

function closeAllModals() {
    state.showUserDetails = false;
    state.showCreateUser = false;
    state.showBlockConfirm = false;
    state.showDeleteConfirm = false;
    renderUsersModule();
}

function closeUserDetailsModal() {
    state.showUserDetails = false;
    renderUsersModule();
}

function closeCreateUserModal() {
    state.showCreateUser = false;
    renderUsersModule();
}

function closeBlockModal() {
    state.showBlockConfirm = false;
    state.selectedUser = null;
    renderUsersModule();
}

function closeDeleteModal() {
    state.showDeleteConfirm = false;
    state.selectedUser = null;
    renderUsersModule();
}

// Voir détails
async function viewUserDetails(username) {
    state.selectedUser = state.users.find(u => u.username === username);
    if (!state.selectedUser) return;

    state.showUserDetails = true;
    renderUsersModule();
}

// Bloquer
function confirmBlockUser(username) {
    state.selectedUser = state.users.find(u => u.username === username);
    state.showBlockConfirm = true;
    renderUsersModule();
}

async function handleBlockUser(event) {
    event.preventDefault();
    const formData = new FormData(event.target);
    const reason = formData.get('reason');

    try {
        const response = await fetch(`/api/superadmin/users/${state.selectedUser.username}/block`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ reason })
        });

        const data = await response.json();

        if (data.success) {
            closeBlockModal();
            await loadUsers();
            renderUsersModule();
            showSuccess(data.message);
        } else {
            showError(data.message);
        }
    } catch (error) {
        console.error('Erreur blocage:', error);
        showError('Erreur lors du blocage');
    }
}

// Débloquer
async function confirmUnblockUser(username) {
    try {
        const response = await fetch(`/api/superadmin/users/${username}/unblock`, {
            method: 'POST',
            credentials: 'include'
        });

        const data = await response.json();

        if (data.success) {
            await loadUsers();
            renderUsersModule();
            showSuccess(data.message);
        } else {
            showError(data.message);
        }
    } catch (error) {
        console.error('Erreur déblocage:', error);
        showError('Erreur lors du déblocage');
    }
}

// Déconnecter individuellement un utilisateur
async function disconnectUser(username) {
    const user = state.users.find(u => u.username === username);
    const confirmMsg = `Voulez-vous vraiment déconnecter ${user ? user.nom : username} ?\n\nCette action va :\n• Fermer sa session active\n• Le forcer à se reconnecter`;

    if (!confirm(confirmMsg)) {
        return;
    }

    try {
        const response = await fetch(`/api/superadmin/users/${username}/disconnect`, {
            method: 'POST',
            credentials: 'include'
        });

        const data = await response.json();

        if (data.success) {
            await loadUsers();
            renderUsersModule();
            showSuccess(`✅ ${user ? user.nom : username} a été déconnecté`);
        } else {
            showError(data.message || 'Erreur lors de la déconnexion');
        }
    } catch (error) {
        console.error('Erreur déconnexion:', error);
        showError('Erreur lors de la déconnexion de l\'utilisateur');
    }
}

// Supprimer
function confirmDeleteUser(username) {
    state.selectedUser = state.users.find(u => u.username === username);
    state.showDeleteConfirm = true;
    renderUsersModule();
}

async function deleteUserConfirmed() {
    try {
        const response = await fetch(`/api/superadmin/users/${state.selectedUser.username}`, {
            method: 'DELETE',
            credentials: 'include'
        });

        const data = await response.json();

        if (data.success) {
            closeDeleteModal();
            await loadUsers();
            renderUsersModule();
            showSuccess(data.message);
        } else {
            showError(data.message);
        }
    } catch (error) {
        console.error('Erreur suppression:', error);
        showError('Erreur lors de la suppression');
    }
}

// Créer
function showCreateUserModal() {
    state.showCreateUser = true;
    renderUsersModule();
}

async function handleCreateUser(event) {
    event.preventDefault();
    const formData = new FormData(event.target);

    const userData = {
        username: formData.get('username'),
        nom: formData.get('nom'),
        email: formData.get('email'),
        idRole: formData.get('idRole'),
        idDepartement: formData.get('idDepartement') || null
    };

    try {
        const response = await fetch('/api/superadmin/users', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify(userData)
        });

        const data = await response.json();

        if (data.success) {
            closeCreateUserModal();
            await loadUsers();
            renderUsersModule();
            showSuccess(`Utilisateur créé avec succès ! Mot de passe par défaut : ${data.data.defaultPassword}`);
        } else {
            showError(data.message);
        }
    } catch (error) {
        console.error('Erreur création:', error);
        showError('Erreur lors de la création');
    }
}

// ============================================
// MODULE DOCUMENTS
// ============================================

/**
 * Charger le module documents
 */
async function loadDocumentsModule() {
    try {
        console.log('📄 Chargement module documents...');

        // Construire les paramètres de période
        const params = new URLSearchParams();
        params.set('period', state.documentsPeriod);

        if (state.documentsPeriod === 'custom') {
            if (state.documentsCustomStartDate) params.set('startDate', state.documentsCustomStartDate);
            if (state.documentsCustomEndDate) params.set('endDate', state.documentsCustomEndDate);
        }

        // Charger toutes les données en parallèle
        const [
            statsRes,
            activityRes,
            sharedRes,
            downloadedRes,
            level1Res,
            level1LocksRes,
            deletedRes,
            lockedRes,
            // NOUVEAU: Traçabilité tous niveaux
            usersDeletionsRes,
            usersLocksRes,
            usersDownloadsRes
        ] = await Promise.all([
            fetch(`/api/superadmin/documents/stats?${params}`, { credentials: 'include' }),
            fetch(`/api/superadmin/documents/activity?${params}`, { credentials: 'include' }),
            fetch(`/api/superadmin/documents/most-shared?${params}`, { credentials: 'include' }),
            fetch(`/api/superadmin/documents/most-downloaded?${params}`, { credentials: 'include' }),
            fetch(`/api/superadmin/documents/level1-deletions?${params}`, { credentials: 'include' }),
            fetch(`/api/superadmin/documents/level1-locks?${params}`, { credentials: 'include' }),
            fetch(`/api/superadmin/documents/deleted?${params}&page=${state.deletedPagination.page}`, { credentials: 'include' }),
            fetch(`/api/superadmin/documents/locked?${params}&page=${state.lockedPagination.page}`, { credentials: 'include' }),
            // NOUVEAU: Traçabilité tous niveaux
            fetch(`/api/superadmin/documents/users-deletions?${params}`, { credentials: 'include' }),
            fetch(`/api/superadmin/documents/users-locks?${params}`, { credentials: 'include' }),
            fetch(`/api/superadmin/documents/users-downloads?${params}`, { credentials: 'include' })
        ]);

        // Vérifier et parser les réponses
        if (!statsRes.ok) throw new Error(`Erreur stats: ${statsRes.status}`);
        if (!activityRes.ok) throw new Error(`Erreur activity: ${activityRes.status}`);
        if (!sharedRes.ok) throw new Error(`Erreur shared: ${sharedRes.status}`);
        if (!downloadedRes.ok) throw new Error(`Erreur downloaded: ${downloadedRes.status}`);
        if (!level1Res.ok) throw new Error(`Erreur level1-deletions: ${level1Res.status}`);
        if (!level1LocksRes.ok) throw new Error(`Erreur level1-locks: ${level1LocksRes.status}`);
        if (!deletedRes.ok) throw new Error(`Erreur deleted: ${deletedRes.status}`);
        if (!lockedRes.ok) throw new Error(`Erreur locked: ${lockedRes.status}`);

        const statsData = await statsRes.json();
        const activityData = await activityRes.json();
        const sharedData = await sharedRes.json();
        const downloadedData = await downloadedRes.json();
        const level1Data = await level1Res.json();
        const level1LocksData = await level1LocksRes.json();
        const deletedData = await deletedRes.json();
        const lockedData = await lockedRes.json();

        // NOUVEAU: Parser les réponses traçabilité tous niveaux
        const usersDeletionsData = usersDeletionsRes.ok ? await usersDeletionsRes.json() : { success: false };
        const usersLocksData = usersLocksRes.ok ? await usersLocksRes.json() : { success: false };
        const usersDownloadsData = usersDownloadsRes.ok ? await usersDownloadsRes.json() : { success: false };

        // Mettre à jour le state
        if (statsData.success) state.documentsStats = statsData.data;
        if (activityData.success) state.documentsActivity = activityData.data;
        if (sharedData.success) state.mostShared = sharedData.data;
        if (downloadedData.success) state.mostDownloaded = downloadedData.data;
        if (level1Data.success) state.level1Deletions = level1Data.data;
        if (level1LocksData.success) state.level1Locks = level1LocksData.data;
        if (deletedData.success) {
            state.deletedDocuments = deletedData.data.deletions;
            state.deletedPagination = deletedData.data.pagination;
        }
        if (lockedData.success) {
            state.lockedDocuments = lockedData.data.locked;
            state.lockedPagination = lockedData.data.pagination;
        }

        // NOUVEAU: Mettre à jour traçabilité tous niveaux
        if (usersDeletionsData.success) state.usersDeletions = usersDeletionsData.data;
        if (usersLocksData.success) state.usersLocks = usersLocksData.data;
        if (usersDownloadsData.success) state.usersDownloads = usersDownloadsData.data;

        console.log('✅ Module documents chargé');

        // Render
        renderDocumentsModule();

    } catch (error) {
        console.error('❌ Erreur chargement module documents:', error);
        showError('Erreur lors du chargement du module documents');
    }
}

/**
 * Render du module documents
 */
function renderDocumentsModule() {
    const sectionDocuments = document.getElementById('section-documents');
    if (!sectionDocuments) return;

    sectionDocuments.innerHTML = `
        <div class="documents-module">
            <h2 style="margin-bottom: 20px;">📄 Gestion des Documents</h2>

            ${renderDocumentsSubTabs()}
            ${renderPeriodFilter()}
            ${renderDocumentsSubTabContent()}
        </div>

        ${state.showRestoreConfirm ? renderRestoreConfirmModal() : ''}
        ${state.showRestoreAllConfirm ? renderRestoreAllConfirmModal() : ''}
        ${state.showPermanentDeleteAllConfirm ? renderPermanentDeleteAllConfirmModal() : ''}
    `;
}

/**
 * Render des sous-onglets du module documents
 */
function renderDocumentsSubTabs() {
    return `
        <div class="sub-tabs">
            <button class="sub-tab ${state.documentsSubTab === 'overview' ? 'active' : ''}"
                    onclick="changeDocumentsSubTab('overview')">
                📊 Aperçu
            </button>
            <button class="sub-tab ${state.documentsSubTab === 'all' ? 'active' : ''}"
                    onclick="changeDocumentsSubTab('all')">
                📋 Tous
            </button>
            <button class="sub-tab ${state.documentsSubTab === 'shared' ? 'active' : ''}"
                    onclick="changeDocumentsSubTab('shared')">
                📤 Partagés
            </button>
            <button class="sub-tab ${state.documentsSubTab === 'downloaded' ? 'active' : ''}"
                    onclick="changeDocumentsSubTab('downloaded')">
                📥 Téléchargés
            </button>
            <button class="sub-tab ${state.documentsSubTab === 'deletions' ? 'active' : ''}"
                    onclick="changeDocumentsSubTab('deletions')">
                🗑️ Suppressions
            </button>
        </div>
    `;
}

/**
 * Changer de sous-onglet
 */
function changeDocumentsSubTab(subTab) {
    state.documentsSubTab = subTab;

    // Si on passe à l'onglet "Tous les documents", charger les données
    if (subTab === 'all') {
        loadAllDocuments();
    } else {
        renderDocumentsModule();
    }
}

/**
 * Render du contenu selon le sous-onglet actif
 */
function renderDocumentsSubTabContent() {
    switch (state.documentsSubTab) {
        case 'overview':
            // Simplifié: seulement stats générales et répartition par département
            return `
                ${renderDocumentsStats()}
                ${renderDocumentsByDepartment()}
            `;

        case 'all':
            return `
                ${renderAllDocuments()}
            `;

        case 'shared':
            return `
                ${renderMostSharedDocuments()}
            `;

        case 'downloaded':
            return `
                ${renderUsersDownloads()}
                ${renderMostDownloadedDocuments()}
            `;

        case 'deletions':
            return `
                ${renderLevel1Deletions()}
                ${renderDeletedDocuments()}
            `;

        case 'locked':
            return `
                ${renderLockedDocuments()}
            `;

        case 'tracabilite':
            return `
                ${renderTracabilite()}
            `;

        default:
            return '';
    }
}

/**
 * Render du filtre de période
 */
function renderPeriodFilter() {
    return `
        <div class="period-filter">
            <button class="period-btn ${state.documentsPeriod === 'today' ? 'active' : ''}"
                    onclick="changeDocumentsPeriod('today')">
                Aujourd'hui
            </button>
            <button class="period-btn ${state.documentsPeriod === '7days' ? 'active' : ''}"
                    onclick="changeDocumentsPeriod('7days')">
                7 derniers jours
            </button>
            <button class="period-btn ${state.documentsPeriod === '30days' ? 'active' : ''}"
                    onclick="changeDocumentsPeriod('30days')">
                30 derniers jours
            </button>
            <button class="period-btn ${state.documentsPeriod === 'all' ? 'active' : ''}"
                    onclick="changeDocumentsPeriod('all')">
                Tout
            </button>

            <div class="custom-date-range">
                <label style="font-size: 13px; color: #4a5568; font-weight: 600;">Période personnalisée :</label>
                <input type="date"
                       id="custom-start-date"
                       value="${state.documentsCustomStartDate || ''}"
                       onchange="setCustomStartDate(this.value)" />
                <span style="color: #718096;">→</span>
                <input type="date"
                       id="custom-end-date"
                       value="${state.documentsCustomEndDate || ''}"
                       onchange="setCustomEndDate(this.value)" />
                <button class="period-btn apply-custom-period ${state.documentsPeriod === 'custom' ? 'active' : ''}"
                        onclick="applyCustomPeriod()"
                        ${!state.documentsCustomStartDate || !state.documentsCustomEndDate ? 'disabled' : ''}>
                    ✓ Appliquer
                </button>
            </div>
        </div>
    `;
}

function changeDocumentsPeriod(period) {
    state.documentsPeriod = period;

    // Si on est sur l'onglet "Tous les documents", recharger les documents
    if (state.documentsSubTab === 'all') {
        loadAllDocuments();
    }

    loadDocumentsModule();
}

function setCustomStartDate(value) {
    state.documentsCustomStartDate = value;
    // Mettre à jour immédiatement le bouton "Appliquer"
    updateApplyButton();
}

function setCustomEndDate(value) {
    state.documentsCustomEndDate = value;
    // Mettre à jour immédiatement le bouton "Appliquer"
    updateApplyButton();
}

/**
 * Mettre à jour l'état du bouton "Appliquer" pour la période personnalisée
 */
function updateApplyButton() {
    const applyBtn = document.querySelector('.apply-custom-period');
    if (applyBtn) {
        const shouldEnable = state.documentsCustomStartDate && state.documentsCustomEndDate;
        applyBtn.disabled = !shouldEnable;

        // Changer le style visuellement
        if (shouldEnable) {
            applyBtn.style.opacity = '1';
            applyBtn.style.cursor = 'pointer';
        } else {
            applyBtn.style.opacity = '0.5';
            applyBtn.style.cursor = 'not-allowed';
        }
    }
}

function applyCustomPeriod() {
    if (state.documentsCustomStartDate && state.documentsCustomEndDate) {
        // Vérifier que la date de début est avant la date de fin
        const start = new Date(state.documentsCustomStartDate);
        const end = new Date(state.documentsCustomEndDate);

        if (start > end) {
            showError('La date de début doit être avant la date de fin');
            return;
        }

        state.documentsPeriod = 'custom';

        // Si on est sur l'onglet "Tous les documents", recharger les documents
        if (state.documentsSubTab === 'all') {
            loadAllDocuments();
        }

        loadDocumentsModule();
    } else {
        showError('Veuillez sélectionner une date de début et une date de fin');
    }
}

/**
 * Render de l'activité globale
 */
function renderDocumentsActivity() {
    if (!state.documentsActivity) return '';

    const { created, deleted, downloaded, consulted, shared, documentsAdded } = state.documentsActivity;

    return `
        <div class="stats-grid">
            <div class="stat-card success">
                <div class="stat-label">📁 Dossiers Créés</div>
                <div class="stat-value">${created || 0}</div>
            </div>
            <div class="stat-card" style="background: linear-gradient(135deg, #3b82f6, #1d4ed8);">
                <div class="stat-label">📄 Documents Ajoutés</div>
                <div class="stat-value">${documentsAdded || 0}</div>
            </div>
            <div class="stat-card danger">
                <div class="stat-label">🗑️ Dossiers Supprimés</div>
                <div class="stat-value">${deleted || 0}</div>
            </div>
            <div class="stat-card">
                <div class="stat-label">📥 Téléchargements</div>
                <div class="stat-value">${downloaded || 0}</div>
            </div>
            <div class="stat-card" style="background: linear-gradient(135deg, #06b6d4, #0891b2);">
                <div class="stat-label">👁️ Consultations</div>
                <div class="stat-value">${consulted || 0}</div>
            </div>
            <div class="stat-card warning">
                <div class="stat-label">📤 Partages</div>
                <div class="stat-value">${shared || 0}</div>
            </div>
        </div>
    `;
}

/**
 * Render des stats générales (inclut dossiers et documents)
 */
function renderDocumentsStats() {
    if (!state.documentsStats) return '';

    const { total, totalDossiers, totalDocuments, locked, shared } = state.documentsStats;

    return `
        <div class="stats-grid" style="margin-top: 16px;">
            <div class="stat-card" style="background: linear-gradient(135deg, #3b82f6, #1d4ed8);">
                <div class="stat-label">📁 Total Dossiers</div>
                <div class="stat-value">${totalDossiers || 0}</div>
            </div>
            <div class="stat-card" style="background: linear-gradient(135deg, #10b981, #059669);">
                <div class="stat-label">📄 Total Documents</div>
                <div class="stat-value">${totalDocuments || total || 0}</div>
            </div>
            <div class="stat-card warning">
                <div class="stat-label">🔒 Dossiers Verrouillés</div>
                <div class="stat-value">${locked || 0}</div>
            </div>
            <div class="stat-card success">
                <div class="stat-label">📤 Dossiers Partagés</div>
                <div class="stat-value">${shared || 0}</div>
            </div>
        </div>
    `;
}

/**
 * Render de la répartition par département (dossiers et documents)
 */
function renderDocumentsByDepartment() {
    if (!state.documentsStats || !state.documentsStats.byDepartment) return '';

    const departments = state.documentsStats.byDepartment;
    if (departments.length === 0) return '';

    const maxCount = Math.max(...departments.map(d => d.count || 1));

    return `
        <div class="chart-container" style="margin-top: 24px;">
            <div class="chart-title">📊 Répartition par Département</div>
            <div class="bar-chart">
                ${departments.map(dept => {
                    const percentage = ((dept.count || 0) / maxCount) * 100;
                    return `
                        <div class="bar-item">
                            <div class="bar-label">${dept.departement || 'Sans département'}</div>
                            <div class="bar-track">
                                <div class="bar-fill" style="width: ${percentage}%"></div>
                            </div>
                            <div class="bar-value">
                                <span title="Dossiers">📁 ${dept.count || 0}</span>
                                <span title="Documents" style="margin-left: 8px; color: #10b981;">📄 ${dept.documents || 0}</span>
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>
        </div>
    `;
}

/**
 * Mettre à jour un filtre de recherche
 */
function updateSearchFilter(section, value) {
    state.searchFilters[section] = value;
    renderDocumentsModule();
}

/**
 * Filtrer une liste de documents par recherche
 */
function filterDocuments(docs, searchTerm) {
    if (!searchTerm) return docs;
    const term = searchTerm.toLowerCase();
    return docs.filter(doc =>
        (doc.titre && doc.titre.toLowerCase().includes(term)) ||
        (doc.idDocument && doc.idDocument.toLowerCase().includes(term)) ||
        (doc.documentId && doc.documentId.toLowerCase().includes(term)) ||
        (doc.categorie && doc.categorie.toLowerCase().includes(term))
    );
}

/**
 * Render des documents les plus partagés
 */
function renderMostSharedDocuments() {
    const filteredDocs = filterDocuments(state.mostShared || [], state.searchFilters.shared);

    return `
        <!-- Barre de recherche -->
        <div style="margin-bottom: 16px;">
            <input type="text"
                   placeholder="🔍 Rechercher un document partagé (titre, ID, catégorie)..."
                   value="${state.searchFilters.shared}"
                   oninput="updateSearchFilter('shared', this.value)"
                   style="width: 100%; padding: 10px 16px; border: 2px solid #e2e8f0; border-radius: 8px; font-size: 14px;">
        </div>

        ${filteredDocs.length === 0 ? `
            <div class="empty-state">
                <div class="empty-state-icon">${state.searchFilters.shared ? '🔍' : '📭'}</div>
                <div class="empty-state-text">${state.searchFilters.shared ? 'Aucun résultat trouvé' : 'Aucun document partagé sur cette période'}</div>
            </div>
        ` : `
        <div style="margin-top: 16px;">
            <table class="documents-table shared-docs-table">
                <thead>
                    <tr>
                        <th style="width: 50px;">#</th>
                        <th>Document</th>
                        <th style="width: 150px;">Partages</th>
                        <th style="width: 100px;">Détails</th>
                    </tr>
                </thead>
                <tbody>
                    ${filteredDocs.map((doc, index) => `
                        <tr>
                            <td>
                                <div style="font-size: 18px; font-weight: 700; color: #667eea;">
                                    #${index + 1}
                                </div>
                            </td>
                            <td>
                                <div style="font-weight: 600; color: #1a202c; margin-bottom: 4px;">
                                    ${doc.titre}
                                </div>
                                <div style="font-size: 12px; color: #718096;">
                                    ${doc.idDocument}
                                </div>
                            </td>
                            <td>
                                <span class="top-doc-count">
                                    ${doc.nombrePartages} partage${doc.nombrePartages > 1 ? 's' : ''}
                                </span>
                            </td>
                            <td>
                                <button class="action-btn btn-view" onclick="toggleShareDetails('share-${index}')">
                                    👁️ Voir
                                </button>
                            </td>
                        </tr>
                        <tr id="share-${index}" class="share-details-row" style="display: none;">
                            <td colspan="4">
                                <div class="share-details-content">
                                    <h4 style="margin-bottom: 12px; color: #1a202c; font-size: 14px; font-weight: 600;">
                                        📋 Historique des partages (${doc.partages ? doc.partages.length : 0})
                                    </h4>
                                    ${doc.partages && doc.partages.length > 0 ? `
                                        <div class="shares-list">
                                            ${doc.partages.map(share => `
                                                <div class="share-item">
                                                    <div class="share-info">
                                                        <span style="color: #667eea; font-weight: 600;">
                                                            ${share.sharedByName || share.sharedBy || 'Inconnu'}
                                                        </span>
                                                        <span style="color: #718096; margin: 0 8px;">→</span>
                                                        <span style="color: #16a34a; font-weight: 600;">
                                                            ${share.sharedWithName || share.sharedWith || 'Inconnu'}
                                                        </span>
                                                    </div>
                                                    <div class="share-date">
                                                        ${share.sharedAt ? formatServerDate(share.sharedAt) : '-'}
                                                    </div>
                                                </div>
                                            `).join('')}
                                        </div>
                                    ` : '<p style="color: #718096; font-style: italic;">Aucun détail disponible</p>'}
                                </div>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
        `}
    `;
}

function toggleShareDetails(rowId) {
    const row = document.getElementById(rowId);
    if (row) {
        row.style.display = row.style.display === 'none' ? 'table-row' : 'none';
    }
}

/**
 * Render des utilisateurs ayant téléchargé des documents (par niveau)
 */
function renderUsersDownloads() {
    const data = state.usersDownloads;
    if (!data) return '';

    // Combiner tous les niveaux
    const allUsers = [
        ...(data.niveau1 || []).map(u => ({ ...u, niveau: 1 })),
        ...(data.niveau2 || []).map(u => ({ ...u, niveau: 2 })),
        ...(data.niveau3 || []).map(u => ({ ...u, niveau: 3 }))
    ].sort((a, b) => (b.count || 0) - (a.count || 0));

    if (allUsers.length === 0) {
        return `
            <div style="margin-bottom: 24px;">
                <h3 style="font-size: 14px; font-weight: 600; color: #1a202c; margin-bottom: 12px;">
                    👥 Téléchargements par Utilisateur
                </h3>
                <div class="empty-state">
                    <div class="empty-state-icon">📥</div>
                    <div class="empty-state-text">Aucun téléchargement sur cette période</div>
                </div>
            </div>
        `;
    }

    const levelColors = {
        1: { bg: '#fef2f2', text: '#dc2626', label: 'Niveau 1', gradient: 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)' },
        2: { bg: '#fffbeb', text: '#f59e0b', label: 'Niveau 2', gradient: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)' },
        3: { bg: '#ecfdf5', text: '#10b981', label: 'Niveau 3', gradient: 'linear-gradient(135deg, #10b981 0%, #059669 100%)' }
    };

    return `
        <div style="margin-bottom: 24px;">
            <h3 style="font-size: 14px; font-weight: 600; color: #1a202c; margin-bottom: 12px;">
                👥 Téléchargements par Utilisateur
            </h3>
            <div style="display: flex; flex-direction: column; gap: 8px;">
                ${allUsers.slice(0, 15).map((user, idx) => {
                    const levelStyle = levelColors[user.niveau] || { bg: '#f3f4f6', text: '#6b7280', label: 'N/A', gradient: '#6b7280' };
                    const isExpanded = state.expandedUserDownload === user.username;
                    return `
                        <div style="border: 2px solid ${isExpanded ? '#10b981' : '#e2e8f0'}; border-radius: 8px; overflow: hidden;">
                            <div onclick="toggleUserDownloads('${user.username}')"
                                 style="padding: 12px 16px; background: ${isExpanded ? '#ecfdf5' : '#f7fafc'}; cursor: pointer; display: flex; align-items: center; justify-content: space-between;">
                                <div style="display: flex; align-items: center; gap: 12px; flex: 1;">
                                    <div style="font-size: 16px; font-weight: 700; color: #718096; width: 30px;">#${idx + 1}</div>
                                    <div style="flex: 1;">
                                        <div style="font-weight: 600; color: #1a202c;">${user.nom || user.username}</div>
                                        <div style="font-size: 11px; color: #718096;">@${user.username} ${user.email ? '• ' + user.email : ''}</div>
                                    </div>
                                    <span style="background: ${levelStyle.bg}; color: ${levelStyle.text}; padding: 4px 10px; border-radius: 12px; font-size: 11px; font-weight: 600;">
                                        ${levelStyle.label}
                                    </span>
                                </div>
                                <div style="display: flex; align-items: center; gap: 12px;">
                                    <span style="background: ${levelStyle.gradient}; color: white; padding: 6px 14px; border-radius: 16px; font-weight: 700; font-size: 13px;">
                                        📥 ${user.count}
                                    </span>
                                    <span style="font-size: 14px; transform: ${isExpanded ? 'rotate(90deg)' : ''}; transition: transform 0.2s;">▶</span>
                                </div>
                            </div>
                            ${isExpanded && user.downloads ? `
                                <div style="padding: 16px; background: white; border-top: 1px solid #e2e8f0; max-height: 250px; overflow-y: auto;">
                                    <table style="width: 100%; border-collapse: collapse; font-size: 12px;">
                                        <thead>
                                            <tr style="background: #f7fafc;">
                                                <th style="padding: 8px; text-align: left; font-weight: 600; color: #4a5568;">ID Document</th>
                                                <th style="padding: 8px; text-align: left; font-weight: 600; color: #4a5568;">Titre</th>
                                                <th style="padding: 8px; text-align: left; font-weight: 600; color: #4a5568;">Catégorie</th>
                                                <th style="padding: 8px; text-align: left; font-weight: 600; color: #4a5568;">Date</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            ${user.downloads.slice(0, 30).map(dl => `
                                                <tr style="border-bottom: 1px solid #f0f0f0;">
                                                    <td style="padding: 8px;"><code style="background: #f0f0f0; padding: 2px 6px; border-radius: 4px; font-size: 10px;">${dl.documentId || '-'}</code></td>
                                                    <td style="padding: 8px; font-weight: 500;">${dl.titre || '-'}</td>
                                                    <td style="padding: 8px;">${dl.categorie || '-'}</td>
                                                    <td style="padding: 8px; white-space: nowrap;">${dl.date ? formatServerDate(dl.date) : '-'}</td>
                                                </tr>
                                            `).join('')}
                                        </tbody>
                                    </table>
                                    ${user.downloads.length > 30 ? `<p style="color: #718096; text-align: center; margin-top: 8px; font-size: 11px;">... et ${user.downloads.length - 30} autres téléchargements</p>` : ''}
                                </div>
                            ` : ''}
                        </div>
                    `;
                }).join('')}
            </div>
            ${allUsers.length > 15 ? `<p style="color: #718096; text-align: center; margin-top: 12px; font-size: 12px;">... et ${allUsers.length - 15} autres utilisateurs</p>` : ''}
        </div>

        <h3 style="font-size: 14px; font-weight: 600; color: #1a202c; margin-bottom: 12px; margin-top: 24px;">
            📄 Documents les plus téléchargés
        </h3>
    `;
}

/**
 * Toggle affichage téléchargements d'un utilisateur
 */
function toggleUserDownloads(username) {
    if (state.expandedUserDownload === username) {
        state.expandedUserDownload = null;
    } else {
        state.expandedUserDownload = username;
    }
    renderDocumentsModule();
}

/**
 * Render des documents les plus téléchargés
 */
function renderMostDownloadedDocuments() {
    const filteredDocs = filterDocuments(state.mostDownloaded || [], state.searchFilters.downloaded);

    return `
        <!-- Barre de recherche -->
        <div style="margin-bottom: 16px;">
            <input type="text"
                   placeholder="🔍 Rechercher un document téléchargé (titre, ID, catégorie)..."
                   value="${state.searchFilters.downloaded}"
                   oninput="updateSearchFilter('downloaded', this.value)"
                   style="width: 100%; padding: 10px 16px; border: 2px solid #e2e8f0; border-radius: 8px; font-size: 14px;">
        </div>

        ${filteredDocs.length === 0 ? `
            <div class="empty-state">
                <div class="empty-state-icon">${state.searchFilters.downloaded ? '🔍' : '📭'}</div>
                <div class="empty-state-text">${state.searchFilters.downloaded ? 'Aucun résultat trouvé' : 'Aucun téléchargement sur cette période'}</div>
            </div>
        ` : `
        <table class="documents-table shared-docs-table">
            <thead>
                <tr>
                    <th>#</th>
                    <th>Document</th>
                    <th>Téléchargements</th>
                    <th>Détails</th>
                </tr>
            </thead>
            <tbody>
                ${filteredDocs.map((doc, index) => `
                    <tr>
                        <td style="font-weight: 700; color: #16a34a;">#${index + 1}</td>
                        <td>
                            <div style="font-weight: 600; color: #1a202c;">${doc.titre}</div>
                            <div style="font-size: 12px; color: #718096;">${doc.idDocument}</div>
                        </td>
                        <td>
                            <span style="display: inline-block; padding: 6px 12px; background: linear-gradient(135deg, #16a34a 0%, #059669 100%); color: white; border-radius: 12px; font-weight: 700; font-size: 14px;">
                                ${doc.nombreTelechargements} téléchargement${doc.nombreTelechargements > 1 ? 's' : ''}
                            </span>
                        </td>
                        <td>
                            <button class="action-btn btn-view" onclick="toggleDownloadDetails('download-${index}')" style="padding: 6px 12px; background: #667eea; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 13px;">
                                👁️ Voir
                            </button>
                        </td>
                    </tr>
                    <tr id="download-${index}" class="share-details-row" style="display: none;">
                        <td colspan="4">
                            <div class="share-details-content">
                                <h4 style="margin: 0 0 12px 0; color: #1a202c; font-size: 14px;">📥 Historique des téléchargements :</h4>
                                ${doc.telechargements && doc.telechargements.length > 0 ?
                                    doc.telechargements.map(dl => `
                                        <div class="share-item" style="border-left-color: #16a34a;">
                                            <span style="font-weight: 600; color: #1a202c;">${dl.nomComplet || dl.utilisateur}</span>
                                            <span style="color: #718096; font-size: 12px;">@${dl.utilisateur}</span>
                                            <div style="margin-left: auto; font-size: 12px; color: #718096;">
                                                ${formatServerDate(dl.date)}
                                            </div>
                                        </div>
                                    `).join('')
                                : '<p style="color: #718096; font-style: italic;">Aucun détail disponible</p>'}
                            </div>
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
        `}
    `;
}

/**
 * Afficher/Masquer les détails de téléchargement
 */
function toggleDownloadDetails(rowId) {
    const row = document.getElementById(rowId);
    if (row) {
        row.style.display = row.style.display === 'none' ? 'table-row' : 'none';
    }
}

// ============================================
// TRAÇABILITÉ PAR NIVEAU (1, 2, 3)
// ============================================

/**
 * Render principal de la traçabilité
 */
function renderTracabilite() {
    return `
        <div style="margin-top: 16px;">
            <h3 style="font-size: 16px; font-weight: 700; color: #1a202c; margin-bottom: 16px;">
                🔍 Traçabilité des Actions par Niveau
            </h3>

            <!-- Filtre par niveau -->
            <div style="margin-bottom: 20px; display: flex; gap: 8px; flex-wrap: wrap;">
                <button class="period-btn ${state.selectedTraceLevel === 'all' ? 'active' : ''}"
                        onclick="changeTraceLevel('all')">
                    Tous les niveaux
                </button>
                <button class="period-btn ${state.selectedTraceLevel === '1' ? 'active' : ''}"
                        onclick="changeTraceLevel('1')"
                        style="background: ${state.selectedTraceLevel === '1' ? '#dc2626' : ''};">
                    👑 Niveau 1 (Admin)
                </button>
                <button class="period-btn ${state.selectedTraceLevel === '2' ? 'active' : ''}"
                        onclick="changeTraceLevel('2')"
                        style="background: ${state.selectedTraceLevel === '2' ? '#f59e0b' : ''};">
                    📋 Niveau 2 (Archiviste)
                </button>
                <button class="period-btn ${state.selectedTraceLevel === '3' ? 'active' : ''}"
                        onclick="changeTraceLevel('3')"
                        style="background: ${state.selectedTraceLevel === '3' ? '#10b981' : ''};">
                    👁️ Niveau 3 (Lecteur)
                </button>
            </div>

            <!-- Sections par type d'action -->
            <div style="display: flex; flex-direction: column; gap: 24px;">
                ${renderTraceSection('downloads', '📥 Téléchargements', state.usersDownloads, '#10b981')}
                ${renderTraceSection('deletions', '🗑️ Suppressions', state.usersDeletions, '#dc2626')}
                ${renderTraceSection('locks', '🔒 Verrouillages', state.usersLocks, '#f59e0b')}
            </div>
        </div>
    `;
}

/**
 * Changer le filtre de niveau
 */
function changeTraceLevel(level) {
    state.selectedTraceLevel = level;
    state.expandedUserTrace = null;
    state.expandedUserDocs = [];
    renderDocumentsModule();
}

/**
 * Render d'une section de traçabilité (téléchargements, suppressions ou verrouillages)
 */
function renderTraceSection(type, title, data, color) {
    if (!data) return '';

    // Filtrer par niveau sélectionné
    let usersToShow = [];
    if (state.selectedTraceLevel === 'all') {
        usersToShow = [
            ...(data.niveau1 || []).map(u => ({ ...u, niveau: 1 })),
            ...(data.niveau2 || []).map(u => ({ ...u, niveau: 2 })),
            ...(data.niveau3 || []).map(u => ({ ...u, niveau: 3 }))
        ];
    } else {
        const niveau = parseInt(state.selectedTraceLevel);
        usersToShow = (data['niveau' + niveau] || []).map(u => ({ ...u, niveau }));
    }

    // Trier par nombre d'actions décroissant
    usersToShow.sort((a, b) => (b.count || b.nombreSuppressions || 0) - (a.count || a.nombreSuppressions || 0));

    const totalActions = usersToShow.reduce((sum, u) => sum + (u.count || u.nombreSuppressions || 0), 0);

    return `
        <div style="border: 2px solid #e2e8f0; border-radius: 12px; overflow: hidden;">
            <div style="padding: 16px; background: linear-gradient(135deg, ${color}22 0%, ${color}11 100%); border-bottom: 2px solid #e2e8f0;">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <h4 style="font-size: 15px; font-weight: 700; color: #1a202c; margin: 0;">
                        ${title}
                    </h4>
                    <div style="display: flex; gap: 12px; align-items: center;">
                        <span style="background: ${color}; color: white; padding: 6px 14px; border-radius: 20px; font-weight: 700; font-size: 13px;">
                            ${totalActions} action${totalActions > 1 ? 's' : ''}
                        </span>
                        <span style="color: #718096; font-size: 13px;">
                            ${usersToShow.length} utilisateur${usersToShow.length > 1 ? 's' : ''}
                        </span>
                    </div>
                </div>
            </div>

            <div style="padding: 16px; background: white;">
                ${usersToShow.length === 0 ? `
                    <div style="text-align: center; padding: 20px; color: #718096;">
                        <div style="font-size: 32px; margin-bottom: 8px;">✅</div>
                        <div>Aucune action sur cette période</div>
                    </div>
                ` : `
                    <div style="display: flex; flex-direction: column; gap: 8px;">
                        ${usersToShow.map((user, idx) => renderTraceUserRow(type, user, idx, color)).join('')}
                    </div>
                `}
            </div>
        </div>
    `;
}

/**
 * Render d'une ligne utilisateur dans la traçabilité
 */
function renderTraceUserRow(type, user, idx, color) {
    const count = user.count || user.nombreSuppressions || 0;
    const isExpanded = state.expandedUserTrace === type + '-' + user.username;
    const docs = getTraceUserDocs(type, user);

    const levelColors = {
        1: { bg: '#fef2f2', text: '#dc2626', label: 'Niveau 1' },
        2: { bg: '#fffbeb', text: '#f59e0b', label: 'Niveau 2' },
        3: { bg: '#ecfdf5', text: '#10b981', label: 'Niveau 3' }
    };
    const levelStyle = levelColors[user.niveau] || { bg: '#f3f4f6', text: '#6b7280', label: 'N/A' };

    return `
        <div style="border: 2px solid ${isExpanded ? color : '#e2e8f0'}; border-radius: 8px; overflow: hidden; transition: all 0.2s;">
            <div onclick="toggleTraceUser('${type}', '${user.username}')"
                 style="padding: 12px 16px; background: ${isExpanded ? color + '11' : '#f7fafc'}; cursor: pointer; display: flex; align-items: center; justify-content: space-between;">
                <div style="display: flex; align-items: center; gap: 12px; flex: 1;">
                    <div style="font-size: 18px; font-weight: 700; color: #718096; width: 30px;">
                        #${idx + 1}
                    </div>
                    <div style="flex: 1;">
                        <div style="font-weight: 600; color: #1a202c;">
                            ${user.nom || user.username}
                        </div>
                        <div style="font-size: 11px; color: #718096;">
                            @${user.username} ${user.email ? '• ' + user.email : ''}
                        </div>
                    </div>
                    <span style="background: ${levelStyle.bg}; color: ${levelStyle.text}; padding: 4px 10px; border-radius: 12px; font-size: 11px; font-weight: 600;">
                        ${levelStyle.label}
                    </span>
                </div>
                <div style="display: flex; align-items: center; gap: 12px;">
                    <span style="background: ${color}; color: white; padding: 6px 14px; border-radius: 16px; font-weight: 700; font-size: 13px;">
                        ${count}
                    </span>
                    <span style="font-size: 14px; transform: ${isExpanded ? 'rotate(90deg)' : ''}; transition: transform 0.2s;">▶</span>
                </div>
            </div>

            ${isExpanded ? `
                <div style="padding: 16px; background: white; border-top: 1px solid #e2e8f0; max-height: 300px; overflow-y: auto;">
                    ${renderTraceUserDocs(type, docs)}
                </div>
            ` : ''}
        </div>
    `;
}

/**
 * Obtenir les documents d'un utilisateur selon le type
 */
function getTraceUserDocs(type, user) {
    switch (type) {
        case 'downloads':
            return user.downloads || [];
        case 'deletions':
            return user.documentsSupprimes || [];
        case 'locks':
            return user.documentsVerrouilles || [];
        default:
            return [];
    }
}

/**
 * Toggle l'affichage des documents d'un utilisateur
 */
function toggleTraceUser(type, username) {
    const key = type + '-' + username;
    if (state.expandedUserTrace === key) {
        state.expandedUserTrace = null;
    } else {
        state.expandedUserTrace = key;
    }
    renderDocumentsModule();
}

/**
 * Render des documents d'un utilisateur
 */
function renderTraceUserDocs(type, docs) {
    if (!docs || docs.length === 0) {
        return '<p style="color: #718096; text-align: center;">Aucun document</p>';
    }

    const headers = {
        downloads: ['ID Document', 'Titre', 'Catégorie', 'Date'],
        deletions: ['ID Document', 'Titre', 'Motif', 'Date', 'IP'],
        locks: ['ID Document', 'Titre', 'Catégorie', 'Département', 'Date']
    };

    return `
        <table style="width: 100%; border-collapse: collapse; font-size: 12px;">
            <thead>
                <tr style="background: #f7fafc;">
                    ${headers[type].map(h => '<th style="padding: 8px; text-align: left; border-bottom: 1px solid #e2e8f0; font-weight: 600; color: #4a5568;">' + h + '</th>').join('')}
                </tr>
            </thead>
            <tbody>
                ${docs.slice(0, 50).map(doc => renderTraceDocRow(type, doc)).join('')}
            </tbody>
        </table>
        ${docs.length > 50 ? '<p style="color: #718096; text-align: center; margin-top: 8px; font-size: 11px;">... et ' + (docs.length - 50) + ' autres documents</p>' : ''}
    `;
}

/**
 * Render d'une ligne de document dans la traçabilité
 */
function renderTraceDocRow(type, doc) {
    const date = doc.date || doc.timestamp;
    const formattedDate = date ? formatServerDate(date) : '-';

    switch (type) {
        case 'downloads':
            return `
                <tr style="border-bottom: 1px solid #f0f0f0;">
                    <td style="padding: 8px;"><code style="background: #f0f0f0; padding: 2px 6px; border-radius: 4px; font-size: 10px;">${doc.documentId || '-'}</code></td>
                    <td style="padding: 8px; font-weight: 500;">${doc.titre || '-'}</td>
                    <td style="padding: 8px;">${doc.categorie || '-'}</td>
                    <td style="padding: 8px; white-space: nowrap;">${formattedDate}</td>
                </tr>
            `;
        case 'deletions':
            return `
                <tr style="border-bottom: 1px solid #f0f0f0;">
                    <td style="padding: 8px;"><code style="background: #f0f0f0; padding: 2px 6px; border-radius: 4px; font-size: 10px;">${doc.documentId || '-'}</code></td>
                    <td style="padding: 8px; font-weight: 500;">${doc.titre || '-'}</td>
                    <td style="padding: 8px; max-width: 150px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${doc.motif || ''}">${doc.motif || '-'}</td>
                    <td style="padding: 8px; white-space: nowrap;">${formattedDate}</td>
                    <td style="padding: 8px; font-size: 10px; color: #718096;">${doc.ip || '-'}</td>
                </tr>
            `;
        case 'locks':
            return `
                <tr style="border-bottom: 1px solid #f0f0f0;">
                    <td style="padding: 8px;"><code style="background: #f0f0f0; padding: 2px 6px; border-radius: 4px; font-size: 10px;">${doc.documentId || '-'}</code></td>
                    <td style="padding: 8px; font-weight: 500;">${doc.titre || '-'}</td>
                    <td style="padding: 8px;">${doc.categorie || '-'}</td>
                    <td style="padding: 8px;">${doc.departement || '-'}</td>
                    <td style="padding: 8px; white-space: nowrap;">${formattedDate}</td>
                </tr>
            `;
        default:
            return '';
    }
}

// Fin traçabilité
// ============================================

/**
 * Render des admins ayant supprimé des documents (VERSION ACCORDÉON COMPACTE)
 */
function renderLevel1Deletions() {
    if (!state.level1Deletions || state.level1Deletions.length === 0) {
        return `
            <div style="margin-top: 16px; margin-bottom: 32px;">
                <h3 style="font-size: 14px; font-weight: 600; color: #1a202c; margin-bottom: 12px;">
                    👨‍💼 Admins (Niveau 1) ayant Supprimé
                </h3>
                <div class="empty-state">
                    <div class="empty-state-icon">✅</div>
                    <div class="empty-state-text">Aucune suppression par des admins sur cette période</div>
                </div>
            </div>
        `;
    }

    return `
        <div style="margin-top: 16px; margin-bottom: 32px;">
            <h3 style="font-size: 14px; font-weight: 600; color: #1a202c; margin-bottom: 12px;">
                👨‍💼 Admins (Niveau 1) ayant Supprimé
            </h3>
            <div style="display: flex; flex-direction: column; gap: 8px;">
                ${state.level1Deletions.map(admin => {
                    const isExpanded = state.expandedAdmin === admin.username;
                    return `
                        <div style="border: 2px solid ${isExpanded ? '#667eea' : '#e2e8f0'}; border-radius: 8px; overflow: hidden; transition: all 0.2s;">
                            <!-- En-tête cliquable de l'admin -->
                            <div onclick="toggleAdminDeletions('${admin.username}')"
                                 style="padding: 12px 16px; background: ${isExpanded ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' : '#f7fafc'}; cursor: pointer; display: flex; align-items: center; justify-content: space-between; transition: all 0.2s;">
                                <div style="display: flex; align-items: center; gap: 12px; flex: 1;">
                                    <div style="font-size: 24px;">${isExpanded ? '📂' : '📁'}</div>
                                    <div style="flex: 1;">
                                        <div style="font-weight: 700; font-size: 14px; color: ${isExpanded ? 'white' : '#1a202c'};">
                                            ${admin.nom}
                                        </div>
                                        <div style="font-size: 11px; color: ${isExpanded ? 'rgba(255,255,255,0.9)' : '#718096'};">
                                            @${admin.username} • ${admin.email}
                                        </div>
                                    </div>
                                    <div style="display: flex; align-items: center; gap: 8px;">
                                        <span style="background: ${isExpanded ? 'rgba(255,255,255,0.2)' : '#fef2f2'}; color: ${isExpanded ? 'white' : '#991b1b'}; padding: 6px 12px; border-radius: 20px; font-weight: 700; font-size: 12px;">
                                            🗑️ ${admin.nombreSuppressions}
                                        </span>
                                        <span style="font-size: 16px; transition: transform 0.2s; ${isExpanded ? 'transform: rotate(90deg);' : ''}">
                                            ▶
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <!-- Liste des documents supprimés (affichée si expanded) -->
                            ${isExpanded ? `
                                <div style="padding: 16px; background: white; border-top: 2px solid #667eea;">
                                    ${renderAdminDeletedDocuments(admin.username)}
                                </div>
                            ` : ''}
                        </div>
                    `;
                }).join('')}
            </div>
        </div>
    `;
}

/**
 * Render des documents supprimés par un admin spécifique
 */
function renderAdminDeletedDocuments(username) {
    if (!state.adminDeletedDocs || state.adminDeletedDocs.length === 0) {
        return `
            <div style="text-align: center; padding: 20px; color: #718096;">
                ⏳ Chargement des documents...
            </div>
        `;
    }

    return `
        <table class="documents-table" style="margin: 0;">
            <thead>
                <tr style="background: #f7fafc;">
                    <th style="font-size: 11px; padding: 8px;">ID Document</th>
                    <th style="font-size: 11px; padding: 8px;">Titre</th>
                    <th style="font-size: 11px; padding: 8px;">Date Suppression</th>
                    <th style="font-size: 11px; padding: 8px;">IP</th>
                </tr>
            </thead>
            <tbody>
                ${state.adminDeletedDocs.map(doc => `
                    <tr style="font-size: 12px;">
                        <td style="padding: 8px;"><code style="font-size: 10px; background: #f0f0f0; padding: 2px 6px; border-radius: 4px;">${doc.documentId}</code></td>
                        <td style="padding: 8px;"><strong>${doc.titre}</strong></td>
                        <td style="padding: 8px; white-space: nowrap;">${formatServerDate(doc.dateSuppression)}</td>
                        <td style="padding: 8px;"><small style="color: #718096;">${doc.ip}</small></td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
        ${state.adminDeletedDocs.length === 0 ? `
            <div style="text-align: center; padding: 20px; color: #718096;">
                Aucun document trouvé
            </div>
        ` : ''}
    `;
}

/**
 * Toggle l'affichage des documents supprimés d'un admin
 */
async function toggleAdminDeletions(username) {
    // Si on clique sur l'admin déjà ouvert, on le ferme
    if (state.expandedAdmin === username) {
        state.expandedAdmin = null;
        state.adminDeletedDocs = [];
        renderDocumentsModule();
        return;
    }

    // Sinon, on ouvre le nouvel admin
    state.expandedAdmin = username;
    state.adminDeletedDocs = []; // Reset pendant le chargement
    renderDocumentsModule();

    // Charger les documents supprimés par cet admin
    await loadAdminDeletedDocuments(username);
}

/**
 * Charger les documents supprimés par un admin spécifique
 */
async function loadAdminDeletedDocuments(username) {
    try {
        const { documentsPeriod, documentsCustomStartDate, documentsCustomEndDate } = state;

        const params = new URLSearchParams({
            period: documentsPeriod,
            username: username,
            limit: 100 // Limite pour ne pas surcharger
        });

        if (documentsPeriod === 'custom' && documentsCustomStartDate && documentsCustomEndDate) {
            params.append('startDate', documentsCustomStartDate);
            params.append('endDate', documentsCustomEndDate);
        }

        const response = await fetch(`/api/superadmin/documents/deleted?${params}`, {
            credentials: 'include'
        });

        const result = await response.json();

        if (result.success) {
            // Filtrer pour ne garder que les documents de cet admin
            state.adminDeletedDocs = result.data.deletions.filter(doc => doc.supprimePar === username);
            renderDocumentsModule();
        } else {
            console.error('Erreur chargement documents supprimés:', result.message);
            state.adminDeletedDocs = [];
            renderDocumentsModule();
        }
    } catch (error) {
        console.error('❌ Erreur loadAdminDeletedDocuments:', error);
        state.adminDeletedDocs = [];
        renderDocumentsModule();
    }
}

/**
 * Toggle l'affichage des documents verrouillés d'un admin niveau 1
 */
async function toggleAdminLocks(username) {
    // Si on clique sur l'admin déjà ouvert, on le ferme
    if (state.expandedAdminLocked === username) {
        state.expandedAdminLocked = null;
        state.adminLockedDocs = [];
        renderDocumentsModule();
        return;
    }

    // Sinon, on ouvre le nouvel admin
    state.expandedAdminLocked = username;
    state.adminLockedDocs = []; // Reset pendant le chargement
    renderDocumentsModule();

    // Charger les documents verrouillés par cet admin
    await loadAdminLockedDocuments(username);
}

/**
 * Charge les documents verrouillés par un admin spécifique
 */
async function loadAdminLockedDocuments(username) {
    try {
        const { documentsPeriod, documentsCustomStartDate, documentsCustomEndDate } = state;

        const params = new URLSearchParams({
            period: documentsPeriod,
            username: username,
            limit: 100 // Limite pour ne pas surcharger
        });

        if (documentsPeriod === 'custom' && documentsCustomStartDate && documentsCustomEndDate) {
            params.append('startDate', documentsCustomStartDate);
            params.append('endDate', documentsCustomEndDate);
        }

        const response = await fetch(`/api/superadmin/documents/locked?${params}`, {
            credentials: 'include'
        });

        const result = await response.json();

        if (result.success) {
            // Filtrer pour ne garder que les documents de cet admin
            state.adminLockedDocs = result.data.locked.filter(doc => doc.verrouilléPar === username);
            renderDocumentsModule();
        } else {
            console.error('Erreur chargement documents verrouillés:', result.message);
            state.adminLockedDocs = [];
            renderDocumentsModule();
        }
    } catch (error) {
        console.error('❌ Erreur loadAdminLockedDocuments:', error);
        state.adminLockedDocs = [];
        renderDocumentsModule();
    }
}

/**
 * Render des documents supprimés
 */
function renderDeletedDocuments() {
    const filteredDocs = filterDocuments(state.deletedDocuments || [], state.searchFilters.deleted);
    const recoverableCount = (state.deletedDocuments || []).filter(d => d.isRecoverable).length;
    const totalDeletedCount = (state.deletedDocuments || []).length;

    return `
        <div style="margin-top: 16px;">
            <h3 style="font-size: 14px; font-weight: 600; color: #1a202c; margin-bottom: 12px;">
                🗑️ Corbeille - Documents Supprimés
            </h3>

            <!-- Barre de recherche -->
            <div style="margin-bottom: 16px;">
                <input type="text"
                       placeholder="🔍 Rechercher un document supprimé (titre, ID, motif)..."
                       value="${state.searchFilters.deleted}"
                       oninput="updateSearchFilter('deleted', this.value)"
                       style="width: 100%; padding: 10px 16px; border: 2px solid #e2e8f0; border-radius: 8px; font-size: 14px;">
            </div>

            <!-- Boutons d'actions en masse -->
            ${totalDeletedCount > 0 ? `
                <div style="display: flex; gap: 12px; margin-bottom: 16px; flex-wrap: wrap;">
                    <button onclick="confirmRestoreAllDocuments()"
                            ${recoverableCount === 0 ? 'disabled' : ''}
                            style="padding: 10px 20px; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; border: none; border-radius: 8px; cursor: pointer; font-size: 14px; font-weight: 600; display: flex; align-items: center; gap: 8px; box-shadow: 0 2px 4px rgba(16, 185, 129, 0.3); ${recoverableCount === 0 ? 'opacity: 0.5; cursor: not-allowed;' : ''}">
                        ♻️ Tout récupérer (${recoverableCount})
                    </button>
                    <button onclick="confirmPermanentDeleteAllDocuments()"
                            style="padding: 10px 20px; background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); color: white; border: none; border-radius: 8px; cursor: pointer; font-size: 14px; font-weight: 600; display: flex; align-items: center; gap: 8px; box-shadow: 0 2px 4px rgba(239, 68, 68, 0.3);">
                        🗑️ Supprimer définitivement tout (${totalDeletedCount})
                    </button>
                </div>
            ` : ''}

            ${filteredDocs.length === 0 ? `
                <div class="empty-state">
                    <div class="empty-state-icon">${state.searchFilters.deleted ? '🔍' : '✅'}</div>
                    <div class="empty-state-text">${state.searchFilters.deleted ? 'Aucun résultat trouvé' : 'Aucun document supprimé sur cette période'}</div>
                </div>
            ` : `
            <table class="documents-table" style="font-size: 13px;">
                <thead>
                    <tr>
                        <th>Statut</th>
                        <th>ID</th>
                        <th>Titre</th>
                        <th>Motif</th>
                        <th>Département</th>
                        <th>Service</th>
                        <th>Supprimé Par</th>
                        <th>Date</th>
                        <th>Expire le</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    ${filteredDocs.map(doc => {
                        const isRecoverable = doc.isRecoverable;
                        const daysLeft = Math.floor(doc.daysUntilExpiration || 0);

                        return `
                        <tr style="background-color: ${isRecoverable ? '#f0fdf4' : '#fef2f2'};">
                            <td>
                                ${isRecoverable ? `
                                    <span style="display: inline-block; padding: 4px 8px; background: #10b981; color: white; border-radius: 12px; font-size: 11px; font-weight: 600;">
                                        ♻️ ${daysLeft}j restant${daysLeft > 1 ? 's' : ''}
                                    </span>
                                ` : `
                                    <span style="display: inline-block; padding: 4px 8px; background: #ef4444; color: white; border-radius: 12px; font-size: 11px; font-weight: 600;">
                                        ⚠️ Expiré
                                    </span>
                                `}
                            </td>
                            <td><code style="font-size: 11px;">${doc.documentId}</code></td>
                            <td><strong>${doc.titre}</strong></td>
                            <td title="${doc.motif || 'Non spécifié'}" style="max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                                ${doc.motif || 'Non spécifié'}
                            </td>
                            <td>${doc.departement || '-'}</td>
                            <td>${doc.service || '-'}</td>
                            <td>
                                ${doc.nomComplet || doc.supprimePar}<br>
                                <small style="color: #718096;">${doc.email || ''}</small>
                            </td>
                            <td>${formatServerDate(doc.dateSuppression)}</td>
                            <td>${formatServerDate(doc.expiresAt)}</td>
                            <td>
                                ${isRecoverable ? `
                                    <button onclick="confirmRestoreDocument('${doc._id}', '${doc.titre.replace(/'/g, "\\'")}', '${doc.documentId}')"
                                            style="padding: 6px 12px; background: #10b981; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 12px; font-weight: 600;">
                                        ♻️ Récupérer
                                    </button>
                                ` : `
                                    <span style="color: #9ca3af; font-size: 12px;">Non récupérable</span>
                                `}
                            </td>
                        </tr>
                    `}).join('')}
                </tbody>
            </table>
            `}
        </div>
    `;
}

function renderDeletedPagination() {
    const { page, totalPages } = state.deletedPagination;
    if (totalPages <= 1) return '';

    return `
        <div class="pagination">
            <button ${page === 1 ? 'disabled' : ''} onclick="goToDeletedPage(${page - 1})">
                ◀ Précédent
            </button>
            <span class="page-number">Page ${page} sur ${totalPages}</span>
            <button ${page === totalPages ? 'disabled' : ''} onclick="goToDeletedPage(${page + 1})">
                Suivant ▶
            </button>
        </div>
    `;
}

function goToDeletedPage(page) {
    state.deletedPagination.page = page;
    loadDocumentsModule();
}

/**
 * Fonctions de restauration de documents
 */
function confirmRestoreDocument(docId, titre, documentId) {
    state.documentToRestore = { _id: docId, titre, documentId };
    state.showRestoreConfirm = true;
    renderDocumentsModule();
}

function cancelRestore() {
    state.showRestoreConfirm = false;
    state.documentToRestore = null;
    renderDocumentsModule();
}

async function restoreDocument() {
    if (!state.documentToRestore) return;

    state.restoringDocument = true;
    renderDocumentsModule();

    try {
        const response = await fetch(`/api/superadmin/documents/${state.documentToRestore._id}/restore`, {
            method: 'POST',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        const result = await response.json();

        if (result.success) {
            // Retirer le document restauré de la liste immédiatement (mise à jour optimiste)
            const docId = state.documentToRestore._id;
            state.documentToRestore = null;

            // Supprimer le document de TOUTES les listes de documents supprimés
            state.deletedDocuments = state.deletedDocuments.filter(doc => doc._id !== docId);
            state.adminDeletedDocs = state.adminDeletedDocs.filter(doc => doc._id !== docId);

            // Afficher la notification APRÈS avoir mis à jour les listes
            showNotification('✅ Document restauré avec succès !', 'success');
            state.showRestoreConfirm = false;

            // Recharger en arrière-plan après 3 secondes (quand la notification aura disparu)
            setTimeout(() => {
                loadDocumentsModule().catch(err => {
                    console.error('Erreur rechargement silencieux:', err);
                });
            }, 3500);
        } else {
            showNotification('❌ ' + (result.message || 'Erreur lors de la restauration'), 'error');
        }
    } catch (error) {
        console.error('Erreur restauration:', error);
        showNotification('❌ Erreur de connexion au serveur', 'error');
    } finally {
        state.restoringDocument = false;
        renderDocumentsModule();
    }
}

/**
 * Confirmer la restauration de tous les documents
 */
function confirmRestoreAllDocuments() {
    const recoverableCount = (state.deletedDocuments || []).filter(d => d.isRecoverable).length;

    if (recoverableCount === 0) {
        showNotification('⚠️ Aucun document récupérable dans la corbeille', 'warning');
        return;
    }

    state.showRestoreAllConfirm = true;
    renderDocumentsModule();
}

/**
 * Annuler la restauration en masse
 */
function cancelRestoreAll() {
    state.showRestoreAllConfirm = false;
    renderDocumentsModule();
}

/**
 * Restaurer tous les documents de la corbeille
 */
async function restoreAllDocuments() {
    if (state.restoringAllDocuments) return;
    state.restoringAllDocuments = true;
    renderDocumentsModule();

    try {
        const response = await fetch('/api/superadmin/documents/restore-all', {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' }
        });

        const result = await response.json();

        if (result.success) {
            showNotification(`✅ ${result.restoredCount} document(s) restauré(s) avec succès !`, 'success');
            state.showRestoreAllConfirm = false;
            state.deletedDocuments = [];
            state.adminDeletedDocs = [];

            // Recharger les données
            setTimeout(() => {
                loadDocumentsModule().catch(err => {
                    console.error('Erreur rechargement:', err);
                });
            }, 1500);
        } else {
            showNotification('❌ ' + (result.message || 'Erreur lors de la restauration'), 'error');
        }
    } catch (error) {
        console.error('Erreur restauration en masse:', error);
        showNotification('❌ Erreur de connexion au serveur', 'error');
    } finally {
        state.restoringAllDocuments = false;
        renderDocumentsModule();
    }
}

/**
 * Confirmer la suppression définitive de tous les documents
 */
function confirmPermanentDeleteAllDocuments() {
    const totalCount = (state.deletedDocuments || []).length;

    if (totalCount === 0) {
        showNotification('⚠️ Aucun document dans la corbeille', 'warning');
        return;
    }

    state.showPermanentDeleteAllConfirm = true;
    renderDocumentsModule();
}

/**
 * Annuler la suppression définitive en masse
 */
function cancelPermanentDeleteAll() {
    state.showPermanentDeleteAllConfirm = false;
    renderDocumentsModule();
}

/**
 * Supprimer définitivement tous les documents de la corbeille
 */
async function permanentDeleteAllDocuments() {
    if (state.deletingAllDocuments) return;
    state.deletingAllDocuments = true;
    renderDocumentsModule();

    try {
        const response = await fetch('/api/superadmin/documents/permanent-all', {
            method: 'DELETE',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' }
        });

        const result = await response.json();

        if (result.success) {
            showNotification(`🗑️ ${result.deletedCount} document(s) supprimé(s) définitivement`, 'success');
            state.showPermanentDeleteAllConfirm = false;
            state.deletedDocuments = [];
            state.adminDeletedDocs = [];

            // Recharger les données
            setTimeout(() => {
                loadDocumentsModule().catch(err => {
                    console.error('Erreur rechargement:', err);
                });
            }, 1500);
        } else {
            showNotification('❌ ' + (result.message || 'Erreur lors de la suppression'), 'error');
        }
    } catch (error) {
        console.error('Erreur suppression en masse:', error);
        showNotification('❌ Erreur de connexion au serveur', 'error');
    } finally {
        state.deletingAllDocuments = false;
        renderDocumentsModule();
    }
}

function renderRestoreConfirmModal() {
    if (!state.showRestoreConfirm || !state.documentToRestore) return '';

    return `
        <div class="modal-overlay" onclick="cancelRestore()" style="display: flex; position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0, 0, 0, 0.5); align-items: center; justify-content: center; z-index: 9999;">
            <div class="modal-content" onclick="event.stopPropagation()" style="background: white; border-radius: 16px; padding: 32px; max-width: 500px; width: 90%; box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);">
                <div style="text-align: center; margin-bottom: 24px;">
                    <div style="font-size: 64px; margin-bottom: 16px;">♻️</div>
                    <h2 style="font-size: 24px; font-weight: 700; color: #1a202c; margin-bottom: 8px;">
                        Restaurer ce document ?
                    </h2>
                    <p style="color: #718096; font-size: 14px; margin-bottom: 16px;">
                        Le document sera récupéré et redeviendra accessible aux utilisateurs.
                    </p>
                    <div style="background: #f7fafc; padding: 16px; border-radius: 8px; text-align: left;">
                        <div style="margin-bottom: 8px;">
                            <strong style="color: #4a5568;">Titre:</strong><br>
                            <span style="color: #1a202c;">${state.documentToRestore.titre}</span>
                        </div>
                        <div>
                            <strong style="color: #4a5568;">ID:</strong><br>
                            <code style="background: #e2e8f0; padding: 2px 6px; border-radius: 4px; font-size: 12px;">${state.documentToRestore.documentId}</code>
                        </div>
                    </div>
                </div>

                <div style="display: flex; gap: 12px; justify-content: center;">
                    <button onclick="cancelRestore()"
                            style="padding: 12px 24px; background: #e2e8f0; color: #4a5568; border: none; border-radius: 8px; cursor: pointer; font-size: 14px; font-weight: 600;">
                        Annuler
                    </button>
                    <button onclick="restoreDocument()"
                            ${state.restoringDocument ? 'disabled' : ''}
                            style="padding: 12px 24px; background: #10b981; color: white; border: none; border-radius: 8px; cursor: pointer; font-size: 14px; font-weight: 600; ${state.restoringDocument ? 'opacity: 0.6;' : ''}">
                        ${state.restoringDocument ? '⏳ Restauration...' : '♻️ Restaurer'}
                    </button>
                </div>
            </div>
        </div>
    `;
}

/**
 * Modal de confirmation pour restaurer tous les documents
 */
function renderRestoreAllConfirmModal() {
    if (!state.showRestoreAllConfirm) return '';

    const recoverableCount = (state.deletedDocuments || []).filter(d => d.isRecoverable).length;

    return `
        <div class="modal-overlay" onclick="cancelRestoreAll()" style="display: flex; position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0, 0, 0, 0.5); align-items: center; justify-content: center; z-index: 9999;">
            <div class="modal-content" onclick="event.stopPropagation()" style="background: white; border-radius: 16px; padding: 32px; max-width: 500px; width: 90%; box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);">
                <div style="text-align: center; margin-bottom: 24px;">
                    <div style="font-size: 64px; margin-bottom: 16px;">♻️</div>
                    <h2 style="font-size: 24px; font-weight: 700; color: #1a202c; margin-bottom: 8px;">
                        Restaurer tous les documents ?
                    </h2>
                    <p style="color: #718096; font-size: 14px; margin-bottom: 16px;">
                        Tous les documents récupérables seront restaurés et redeviendront accessibles.
                    </p>
                    <div style="background: #f0fdf4; padding: 16px; border-radius: 8px; border: 2px solid #10b981;">
                        <div style="font-size: 32px; font-weight: 700; color: #10b981;">${recoverableCount}</div>
                        <div style="color: #059669; font-size: 14px; font-weight: 600;">document(s) à restaurer</div>
                    </div>
                </div>

                <div style="display: flex; gap: 12px; justify-content: center;">
                    <button onclick="cancelRestoreAll()"
                            style="padding: 12px 24px; background: #e2e8f0; color: #4a5568; border: none; border-radius: 8px; cursor: pointer; font-size: 14px; font-weight: 600;">
                        Annuler
                    </button>
                    <button onclick="restoreAllDocuments()"
                            ${state.restoringAllDocuments ? 'disabled' : ''}
                            style="padding: 12px 24px; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; border: none; border-radius: 8px; cursor: pointer; font-size: 14px; font-weight: 600; ${state.restoringAllDocuments ? 'opacity: 0.6;' : ''}">
                        ${state.restoringAllDocuments ? '⏳ Restauration...' : '♻️ Tout restaurer'}
                    </button>
                </div>
            </div>
        </div>
    `;
}

/**
 * Modal de confirmation pour supprimer définitivement tous les documents
 */
function renderPermanentDeleteAllConfirmModal() {
    if (!state.showPermanentDeleteAllConfirm) return '';

    const totalCount = (state.deletedDocuments || []).length;

    return `
        <div class="modal-overlay" onclick="cancelPermanentDeleteAll()" style="display: flex; position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0, 0, 0, 0.5); align-items: center; justify-content: center; z-index: 9999;">
            <div class="modal-content" onclick="event.stopPropagation()" style="background: white; border-radius: 16px; padding: 32px; max-width: 500px; width: 90%; box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);">
                <div style="text-align: center; margin-bottom: 24px;">
                    <div style="font-size: 64px; margin-bottom: 16px;">⚠️</div>
                    <h2 style="font-size: 24px; font-weight: 700; color: #dc2626; margin-bottom: 8px;">
                        Suppression définitive
                    </h2>
                    <p style="color: #718096; font-size: 14px; margin-bottom: 16px;">
                        <strong style="color: #dc2626;">Attention !</strong> Cette action est irréversible.<br>
                        Tous les documents de la corbeille seront supprimés définitivement.
                    </p>
                    <div style="background: #fef2f2; padding: 16px; border-radius: 8px; border: 2px solid #ef4444;">
                        <div style="font-size: 32px; font-weight: 700; color: #ef4444;">${totalCount}</div>
                        <div style="color: #dc2626; font-size: 14px; font-weight: 600;">document(s) à supprimer</div>
                    </div>
                </div>

                <div style="display: flex; gap: 12px; justify-content: center;">
                    <button onclick="cancelPermanentDeleteAll()"
                            style="padding: 12px 24px; background: #e2e8f0; color: #4a5568; border: none; border-radius: 8px; cursor: pointer; font-size: 14px; font-weight: 600;">
                        Annuler
                    </button>
                    <button onclick="permanentDeleteAllDocuments()"
                            ${state.deletingAllDocuments ? 'disabled' : ''}
                            style="padding: 12px 24px; background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); color: white; border: none; border-radius: 8px; cursor: pointer; font-size: 14px; font-weight: 600; ${state.deletingAllDocuments ? 'opacity: 0.6;' : ''}">
                        ${state.deletingAllDocuments ? '⏳ Suppression...' : '🗑️ Supprimer définitivement'}
                    </button>
                </div>
            </div>
        </div>
    `;
}

/**
 * Render des documents verrouillés
 */
function renderLockedDocuments() {
    return `
        ${renderLevel1Locks()}
    `;
}

/**
 * Render des admins ayant verrouillé des documents (VERSION ACCORDÉON)
 */
function renderLevel1Locks() {
    if (!state.level1Locks || state.level1Locks.length === 0) {
        return `
            <div style="margin-top: 16px; margin-bottom: 32px;">
                <h3 style="font-size: 14px; font-weight: 600; color: #1a202c; margin-bottom: 12px;">
                    👨‍💼 Admins (Niveau 1) ayant Verrouillé
                </h3>
                <div class="empty-state">
                    <div class="empty-state-icon">🔓</div>
                    <div class="empty-state-text">Aucun admin n'a verrouillé de documents</div>
                </div>
            </div>
        `;
    }

    return `
        <div style="margin-top: 16px; margin-bottom: 32px;">
            <h3 style="font-size: 14px; font-weight: 600; color: #1a202c; margin-bottom: 12px;">
                👨‍💼 Admins (Niveau 1) ayant Verrouillé
            </h3>
            <div style="display: flex; flex-direction: column; gap: 8px;">
                ${state.level1Locks.map(admin => {
                    const isExpanded = state.expandedAdminLocked === admin.username;
                    return `
                        <div style="border: 2px solid ${isExpanded ? '#f39c12' : '#e2e8f0'}; border-radius: 8px; overflow: hidden; transition: all 0.2s;">
                            <!-- En-tête cliquable de l'admin -->
                            <div onclick="toggleAdminLocks('${admin.username}')"
                                 style="padding: 12px 16px; background: ${isExpanded ? 'linear-gradient(135deg, #f39c12 0%, #e67e22 100%)' : '#f7fafc'}; cursor: pointer; display: flex; align-items: center; justify-content: space-between; transition: all 0.2s;">
                                <div style="display: flex; align-items: center; gap: 12px; flex: 1;">
                                    <div style="font-size: 24px;">${isExpanded ? '🔓' : '🔒'}</div>
                                    <div style="flex: 1;">
                                        <div style="font-weight: 700; font-size: 14px; color: ${isExpanded ? 'white' : '#1a202c'};">
                                            ${admin.nom}
                                        </div>
                                        <div style="font-size: 11px; color: ${isExpanded ? 'rgba(255,255,255,0.9)' : '#718096'};">
                                            @${admin.username} • ${admin.email}
                                        </div>
                                    </div>
                                </div>
                                <div style="text-align: right;">
                                    <div style="font-size: 20px; font-weight: 700; color: ${isExpanded ? 'white' : '#f39c12'};">
                                        ${admin.count}
                                    </div>
                                    <div style="font-size: 10px; color: ${isExpanded ? 'rgba(255,255,255,0.9)' : '#718096'};">
                                        document${admin.count > 1 ? 's' : ''}
                                    </div>
                                </div>
                            </div>

                            <!-- Zone de contenu si étendu -->
                            ${isExpanded ? `
                                <div style="padding: 16px; background: white;">
                                    ${state.adminLockedDocs && state.adminLockedDocs.length > 0 ? `
                                        <table class="documents-table" style="margin: 0;">
                                            <thead>
                                                <tr style="background: #f7fafc;">
                                                    <th style="font-size: 11px; padding: 8px;">ID Document</th>
                                                    <th style="font-size: 11px; padding: 8px;">Titre</th>
                                                    <th style="font-size: 11px; padding: 8px;">Catégorie</th>
                                                    <th style="font-size: 11px; padding: 8px;">Département</th>
                                                    <th style="font-size: 11px; padding: 8px;">Date Verrouillage</th>
                                                    <th style="font-size: 11px; padding: 8px;">Durée</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                ${state.adminLockedDocs.map(doc => {
                                                    const lockDate = new Date(doc.dateVerrouillage);
                                                    const now = new Date();
                                                    const diffDays = Math.floor((now - lockDate) / (1000 * 60 * 60 * 24));
                                                    const diffHours = Math.floor((now - lockDate) / (1000 * 60 * 60));
                                                    const duree = diffDays > 0 ? diffDays + 'j' : diffHours + 'h';
                                                    return '<tr style="font-size: 12px;">' +
                                                        '<td style="padding: 8px;"><code style="font-size: 10px; background: #f0f0f0; padding: 2px 6px; border-radius: 4px;">' + (doc.idDocument || '-') + '</code></td>' +
                                                        '<td style="padding: 8px;"><strong>' + doc.titre + '</strong></td>' +
                                                        '<td style="padding: 8px;"><span style="background: #e0f2fe; color: #0369a1; padding: 4px 8px; border-radius: 12px; font-size: 11px;">' + (doc.categorie || '-') + '</span></td>' +
                                                        '<td style="padding: 8px;">' + (doc.departementVerrouilleur || '-') + '</td>' +
                                                        '<td style="padding: 8px; white-space: nowrap;">' + formatServerDate(doc.dateVerrouillage) + '</td>' +
                                                        '<td style="padding: 8px;"><span style="background: ' + (diffDays >= 180 ? '#fee2e2' : '#fef3c7') + '; color: ' + (diffDays >= 180 ? '#dc2626' : '#d97706') + '; padding: 4px 8px; border-radius: 12px; font-size: 11px; font-weight: 600;">🔒 ' + duree + '</span></td>' +
                                                    '</tr>';
                                                }).join('')}
                                            </tbody>
                                        </table>
                                    ` : `
                                        <div class="loading" style="text-align: center; padding: 20px; color: #718096;">
                                            ⏳ Chargement des documents...
                                        </div>
                                    `}
                                </div>
                            ` : ''}
                        </div>
                    `;
                }).join('')}
            </div>
        </div>
    `;
}

/**
 * Render des documents verrouillés par l'admin sélectionné (conservé pour compatibilité)
 */
function renderAdminLockedDocuments() {
    // Cette fonction n'est plus utilisée car le contenu est intégré dans renderLevel1Locks
    return '';
}

function renderLockedPagination() {
    const { page, totalPages } = state.lockedPagination;
    if (totalPages <= 1) return '';

    return `
        <div class="pagination">
            <button ${page === 1 ? 'disabled' : ''} onclick="goToLockedPage(${page - 1})">
                ◀ Précédent
            </button>
            <span class="page-number">Page ${page} sur ${totalPages}</span>
            <button ${page === totalPages ? 'disabled' : ''} onclick="goToLockedPage(${page + 1})">
                Suivant ▶
            </button>
        </div>
    `;
}

function goToLockedPage(page) {
    state.lockedPagination.page = page;
    loadDocumentsModule();
}

/**
 * Render de tous les documents avec pagination
 */
function renderAllDocuments() {
    if (!state.allDocuments || state.allDocuments.length === 0) {
        return `
            <div class="empty-state">
                <div class="empty-state-icon">📭</div>
                <div class="empty-state-text">Aucun document trouvé</div>
            </div>
        `;
    }

    return `
        <div style="margin-top: 16px;">
            <!-- Barre de recherche -->
            <div class="filters-bar" style="margin-bottom: 20px;">
                <input type="text"
                       placeholder="🔍 Rechercher un document (titre, ID, catégorie)..."
                       value="${state.allDocsSearch}"
                       onchange="setAllDocsSearch(this.value)"
                       onkeyup="if(event.key === 'Enter') loadAllDocuments()" />
                <button class="action-btn btn-view" onclick="loadAllDocuments()" style="padding: 10px 20px;">
                    🔍 Rechercher
                </button>
                ${state.allDocsSearch ? `
                    <button class="action-btn btn-delete" onclick="clearAllDocsSearch()" style="padding: 10px 20px;">
                        ✖️ Effacer
                    </button>
                ` : ''}
            </div>

            <!-- Statistiques -->
            <div class="stats-bar" style="margin-bottom: 20px;">
                <span class="stat-item">
                    📄 Total: <strong>${state.allDocsPagination.total}</strong>
                </span>
                <span class="stat-item">
                    📑 Page ${state.allDocsPagination.page} / ${state.allDocsPagination.totalPages}
                </span>
            </div>

            <!-- Table des documents -->
            <table class="documents-table">
                <thead>
                    <tr>
                        <th>ID Document</th>
                        <th>Titre</th>
                        <th>Département</th>
                        <th>Service</th>
                        <th>Créé par</th>
                        <th>Date de création</th>
                        <th>Statut</th>
                        <th>Partages</th>
                        <th>Téléchargements</th>
                    </tr>
                </thead>
                <tbody>
                    ${state.allDocuments.map((doc, index) => `
                        <tr onclick="toggleDocTrace('${doc.idDocument}')" style="cursor: pointer;" class="${state.expandedDocTrace === doc.idDocument ? 'expanded-row' : ''}">
                            <td><code style="font-size: 11px; background: #f0f0f0; padding: 2px 6px; border-radius: 4px;">${doc.idDocument}</code></td>
                            <td><strong>${doc.titre}</strong></td>
                            <td>
                                ${doc.departement ? `
                                    <span style="background: #dbeafe; color: #1e40af; padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: 600;">
                                        ${doc.departement}
                                    </span>
                                ` : '-'}
                            </td>
                            <td>
                                ${doc.service ? `
                                    <span style="background: #fef3c7; color: #92400e; padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: 600;">
                                        ${doc.service}
                                    </span>
                                ` : '-'}
                            </td>
                            <td>
                                ${doc.creatorName && doc.creatorName !== 'Inconnu' ? `
                                    <div style="font-weight: 600;">${doc.creatorName}</div>
                                    ${doc.creatorUsername ? `<small style="color: #718096;">@${doc.creatorUsername}</small>` : ''}
                                ` : `<span style="color: #718096;">${doc.creatorUsername || 'Inconnu'}</span>`}
                            </td>
                            <td style="white-space: nowrap;">
                                <strong style="color: #667eea;">${formatServerDate(doc.createdAt)}</strong>
                            </td>
                            <td>
                                ${doc.locked ? `
                                    <div>
                                        <span class="badge-locked">🔒 Verrouillé</span>
                                        ${doc.lockerName ? `
                                            <div style="font-size: 10px; color: #718096; margin-top: 4px;">
                                                par <strong>${doc.lockerName}</strong>
                                            </div>
                                        ` : ''}
                                    </div>
                                ` : `
                                    <span style="color: #10b981; font-weight: 600;">✓ Actif</span>
                                `}
                            </td>
                            <td style="text-align: center;">
                                ${doc.shareCount > 0 ? `
                                    <span style="background: #fef3c7; color: #92400e; padding: 4px 8px; border-radius: 12px; font-weight: 700; font-size: 12px;">
                                        📤 ${doc.shareCount}
                                    </span>
                                ` : `<span style="color: #cbd5e0;">-</span>`}
                            </td>
                            <td style="text-align: center;">
                                ${doc.downloadCount > 0 ? `
                                    <span style="background: #d1fae5; color: #065f46; padding: 4px 8px; border-radius: 12px; font-weight: 700; font-size: 12px;">
                                        📥 ${doc.downloadCount}
                                    </span>
                                ` : `<span style="color: #cbd5e0;">-</span>`}
                            </td>
                        </tr>
                        ${state.expandedDocTrace === doc.idDocument ? `
                        <tr class="trace-details-row">
                            <td colspan="9" style="padding: 16px; background: #f8fafc; border-top: 2px solid #667eea;">
                                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
                                    <!-- Partages -->
                                    <div style="background: white; border-radius: 8px; padding: 16px; border: 1px solid #e2e8f0;">
                                        <h4 style="margin: 0 0 12px 0; font-size: 14px; color: #92400e; display: flex; align-items: center; gap: 8px;">
                                            📤 Partages (${doc.shareCount || 0})
                                        </h4>
                                        ${(doc.sharedWith && doc.sharedWith.length > 0) ? `
                                            <div style="max-height: 150px; overflow-y: auto;">
                                                ${doc.sharedWith.map(user => `
                                                    <div style="padding: 6px 10px; background: #fef3c7; border-radius: 4px; margin-bottom: 4px; font-size: 12px;">
                                                        👤 ${user}
                                                    </div>
                                                `).join('')}
                                            </div>
                                        ` : `
                                            <div style="color: #718096; font-size: 12px; text-align: center; padding: 20px;">
                                                Aucun partage
                                            </div>
                                        `}
                                    </div>
                                    <!-- Téléchargements -->
                                    <div style="background: white; border-radius: 8px; padding: 16px; border: 1px solid #e2e8f0;">
                                        <h4 style="margin: 0 0 12px 0; font-size: 14px; color: #065f46; display: flex; align-items: center; gap: 8px;">
                                            📥 Téléchargements (${doc.downloadCount || 0})
                                        </h4>
                                        ${(doc.historiqueTelechargements && doc.historiqueTelechargements.length > 0) ? `
                                            <div style="max-height: 150px; overflow-y: auto;">
                                                ${doc.historiqueTelechargements.map(dl => `
                                                    <div style="padding: 6px 10px; background: #d1fae5; border-radius: 4px; margin-bottom: 4px; font-size: 12px; display: flex; justify-content: space-between;">
                                                        <span>👤 ${dl.nomComplet || dl.utilisateur}</span>
                                                        <span style="color: #718096;">${dl.date ? formatServerDate(dl.date) : ''}</span>
                                                    </div>
                                                `).join('')}
                                            </div>
                                        ` : `
                                            <div style="color: #718096; font-size: 12px; text-align: center; padding: 20px;">
                                                Aucun téléchargement
                                            </div>
                                        `}
                                    </div>
                                </div>
                            </td>
                        </tr>
                        ` : ''}
                    `).join('')}
                </tbody>
            </table>
            ${renderAllDocsPagination()}
        </div>
    `;
}

/**
 * Render de la pagination pour tous les documents
 */
function renderAllDocsPagination() {
    const { page, totalPages } = state.allDocsPagination;
    if (totalPages <= 1) return '';

    return `
        <div class="pagination-container">
            <div class="pagination-info">
                Affichage de ${state.allDocuments.length} documents sur ${state.allDocsPagination.total}
            </div>
            <div class="pagination">
                <button class="pagination-btn" ${page === 1 ? 'disabled' : ''} onclick="goToAllDocsPage(1)">
                    ⏮ Début
                </button>
                <button class="pagination-btn" ${page === 1 ? 'disabled' : ''} onclick="goToAllDocsPage(${page - 1})">
                    ◀ Précédent
                </button>
                ${renderAllDocsPageNumbers()}
                <button class="pagination-btn" ${page === totalPages ? 'disabled' : ''} onclick="goToAllDocsPage(${page + 1})">
                    Suivant ▶
                </button>
                <button class="pagination-btn" ${page === totalPages ? 'disabled' : ''} onclick="goToAllDocsPage(${totalPages})">
                    Fin ⏭
                </button>
            </div>
        </div>
    `;
}

/**
 * Render des numéros de pages pour la pagination
 */
function renderAllDocsPageNumbers() {
    const { page, totalPages } = state.allDocsPagination;
    const pages = [];
    const maxPagesToShow = 5;

    let startPage = Math.max(1, page - Math.floor(maxPagesToShow / 2));
    let endPage = Math.min(totalPages, startPage + maxPagesToShow - 1);

    if (endPage - startPage < maxPagesToShow - 1) {
        startPage = Math.max(1, endPage - maxPagesToShow + 1);
    }

    if (startPage > 1) {
        pages.push(`<span class="pagination-dots">...</span>`);
    }

    for (let i = startPage; i <= endPage; i++) {
        pages.push(`
            <button class="pagination-btn page-btn ${i === page ? 'active' : ''}"
                    onclick="goToAllDocsPage(${i})">
                ${i}
            </button>
        `);
    }

    if (endPage < totalPages) {
        pages.push(`<span class="pagination-dots">...</span>`);
    }

    return pages.join('');
}

/**
 * Naviguer vers une page spécifique
 */
function goToAllDocsPage(page) {
    state.allDocsPagination.page = page;
    loadAllDocuments();
}

/**
 * Définir la recherche
 */
function setAllDocsSearch(value) {
    state.allDocsSearch = value;
}

/**
 * Effacer la recherche
 */
function clearAllDocsSearch() {
    state.allDocsSearch = '';
    state.allDocsPagination.page = 1;
    loadAllDocuments();
}

/**
 * Charger tous les documents depuis l'API
 */
async function loadAllDocuments() {
    try {
        const { page } = state.allDocsPagination;
        const { documentsPeriod, documentsCustomStartDate, documentsCustomEndDate, allDocsSearch } = state;

        const params = new URLSearchParams({
            period: documentsPeriod,
            page,
            limit: 20,
            search: allDocsSearch
        });

        if (documentsPeriod === 'custom' && documentsCustomStartDate && documentsCustomEndDate) {
            params.append('startDate', documentsCustomStartDate);
            params.append('endDate', documentsCustomEndDate);
        }

        const response = await fetch(`/api/superadmin/documents/all?${params}`, {
            credentials: 'include'
        });

        const result = await response.json();

        if (result.success) {
            state.allDocuments = result.data.documents;
            state.allDocsPagination = result.data.pagination;
            renderDocumentsModule();
        } else {
            showError(result.message || 'Erreur lors du chargement des documents');
        }
    } catch (error) {
        console.error('❌ Erreur loadAllDocuments:', error);
        showError('Erreur lors du chargement des documents');
    }
}

/**
 * Toggle l'affichage de la traçabilité d'un document
 */
function toggleDocTrace(docId) {
    if (state.expandedDocTrace === docId) {
        state.expandedDocTrace = null;
    } else {
        state.expandedDocTrace = docId;
    }
    renderDocumentsModule();
}

// Notifications
function showSuccess(message) {
    const errorDiv = document.getElementById('error');
    errorDiv.textContent = '✅ ' + message;
    errorDiv.style.background = '#d1fae5';
    errorDiv.style.borderColor = '#10b981';
    errorDiv.style.color = '#065f46';
    errorDiv.style.display = 'block';

    setTimeout(() => {
        errorDiv.style.display = 'none';
        errorDiv.style.background = '#fee';
        errorDiv.style.borderColor = '#f88';
        errorDiv.style.color = '#c00';
    }, 5000);
}

// ============================================
// MODULE DOSSIERS (NOUVEAU SYSTÈME)
// ============================================

/**
 * Charger le module dossiers
 */
async function loadDossiersModule() {
    try {
        console.log('📁 Chargement module dossiers...');

        const params = new URLSearchParams();
        params.set('period', state.dossiersPeriod);
        if (state.dossiersPeriod === 'custom') {
            if (state.dossiersCustomStartDate) params.set('startDate', state.dossiersCustomStartDate);
            if (state.dossiersCustomEndDate) params.set('endDate', state.dossiersCustomEndDate);
        }

        // Charger toutes les données en parallèle
        const [statsRes, activityRes, allRes, deletedRes, lockedRes] = await Promise.all([
            fetch(`/api/superadmin/dossiers/stats?${params}`, { credentials: 'include' }),
            fetch(`/api/superadmin/dossiers/activity?${params}`, { credentials: 'include' }),
            fetch(`/api/superadmin/dossiers/all?${params}&page=${state.allDossiersPagination.page}&search=${state.allDossiersSearch}`, { credentials: 'include' }),
            fetch(`/api/superadmin/dossiers/deleted?${params}&page=${state.deletedDossiersPagination.page}`, { credentials: 'include' }),
            fetch(`/api/superadmin/dossiers/locked?${params}&page=${state.lockedDossiersPagination.page}`, { credentials: 'include' })
        ]);

        // Parser les réponses
        if (statsRes.ok) {
            const statsData = await statsRes.json();
            if (statsData.success) state.dossiersStats = statsData.data;
        }
        if (activityRes.ok) {
            const activityData = await activityRes.json();
            if (activityData.success) state.dossiersActivity = activityData.data;
        }
        if (allRes.ok) {
            const allData = await allRes.json();
            if (allData.success) {
                state.allDossiers = allData.data.dossiers || [];
                state.allDossiersPagination = allData.data.pagination || { page: 1, totalPages: 1, total: 0 };
            }
        }
        if (deletedRes.ok) {
            const deletedData = await deletedRes.json();
            if (deletedData.success) {
                state.deletedDossiers = deletedData.data.deletions || [];
                state.deletedDossiersPagination = deletedData.data.pagination || { page: 1, totalPages: 1, total: 0 };
            }
        }
        if (lockedRes.ok) {
            const lockedData = await lockedRes.json();
            if (lockedData.success) {
                state.lockedDossiers = lockedData.data.locked || [];
                state.lockedDossiersPagination = lockedData.data.pagination || { page: 1, totalPages: 1, total: 0 };
            }
        }

        console.log('✅ Module dossiers chargé');
        renderDossiersModule();

    } catch (error) {
        console.error('❌ Erreur chargement module dossiers:', error);
        showError('Erreur lors du chargement du module dossiers');
    }
}

/**
 * Render du module dossiers
 */
function renderDossiersModule() {
    const sectionDossiers = document.getElementById('section-dossiers');
    if (!sectionDossiers) return;

    sectionDossiers.innerHTML = `
        <div class="dossiers-module">
            <h2 style="margin-bottom: 20px;">📁 Gestion des Dossiers</h2>

            ${renderDossiersSubTabs()}
            ${renderDossiersPeriodFilter()}
            ${renderDossiersSubTabContent()}
        </div>

        ${state.showDossierDetail ? renderDossierDetailModal() : ''}
    `;
}

/**
 * Sous-onglets du module dossiers
 */
function renderDossiersSubTabs() {
    const tabs = [
        { id: 'overview', label: '📊 Vue d\'ensemble', icon: '📊' },
        { id: 'all', label: '📋 Tous les dossiers', icon: '📋' },
        { id: 'deleted', label: '🗑️ Corbeille', icon: '🗑️', count: state.deletedDossiersPagination?.total || 0 },
        { id: 'locked', label: '🔒 Verrouillés', icon: '🔒', count: state.lockedDossiersPagination?.total || 0 }
    ];

    return `
        <div class="sub-tabs" style="display: flex; gap: 10px; margin-bottom: 20px; flex-wrap: wrap;">
            ${tabs.map(tab => `
                <button onclick="switchDossiersSubTab('${tab.id}')"
                        class="sub-tab ${state.dossiersSubTab === tab.id ? 'active' : ''}"
                        style="padding: 10px 20px; border: none; border-radius: 8px; cursor: pointer;
                               background: ${state.dossiersSubTab === tab.id ? '#3b82f6' : '#e5e7eb'};
                               color: ${state.dossiersSubTab === tab.id ? 'white' : '#374151'};
                               font-weight: 600; transition: all 0.2s;">
                    ${tab.label}
                    ${tab.count !== undefined ? `<span style="margin-left: 5px; padding: 2px 8px; background: ${state.dossiersSubTab === tab.id ? 'rgba(255,255,255,0.2)' : '#d1d5db'}; border-radius: 10px; font-size: 12px;">${tab.count}</span>` : ''}
                </button>
            `).join('')}
        </div>
    `;
}

function switchDossiersSubTab(tab) {
    state.dossiersSubTab = tab;
    renderDossiersModule();
}

/**
 * Filtre de période pour dossiers
 */
function renderDossiersPeriodFilter() {
    return `
        <div class="period-filter" style="background: #f3f4f6; padding: 15px; border-radius: 10px; margin-bottom: 20px;">
            <label style="font-weight: 600; margin-right: 10px;">📅 Période:</label>
            <select onchange="changeDossiersPeriod(this.value)" style="padding: 8px 15px; border-radius: 6px; border: 1px solid #d1d5db;">
                <option value="all" ${state.dossiersPeriod === 'all' ? 'selected' : ''}>Tout</option>
                <option value="today" ${state.dossiersPeriod === 'today' ? 'selected' : ''}>Aujourd'hui</option>
                <option value="7days" ${state.dossiersPeriod === '7days' ? 'selected' : ''}>7 derniers jours</option>
                <option value="30days" ${state.dossiersPeriod === '30days' ? 'selected' : ''}>30 derniers jours</option>
                <option value="custom" ${state.dossiersPeriod === 'custom' ? 'selected' : ''}>Personnalisé</option>
            </select>
            ${state.dossiersPeriod === 'custom' ? `
                <input type="date" value="${state.dossiersCustomStartDate || ''}" onchange="state.dossiersCustomStartDate = this.value"
                       style="margin-left: 10px; padding: 8px; border-radius: 6px; border: 1px solid #d1d5db;">
                <input type="date" value="${state.dossiersCustomEndDate || ''}" onchange="state.dossiersCustomEndDate = this.value"
                       style="margin-left: 5px; padding: 8px; border-radius: 6px; border: 1px solid #d1d5db;">
                <button onclick="loadDossiersModule()" style="margin-left: 10px; padding: 8px 15px; background: #3b82f6; color: white; border: none; border-radius: 6px; cursor: pointer;">
                    Appliquer
                </button>
            ` : ''}
        </div>
    `;
}

function changeDossiersPeriod(period) {
    state.dossiersPeriod = period;
    loadDossiersModule();
}

/**
 * Contenu selon le sous-onglet actif
 */
function renderDossiersSubTabContent() {
    switch (state.dossiersSubTab) {
        case 'overview':
            return renderDossiersOverview();
        case 'all':
            return renderAllDossiers();
        case 'deleted':
            return renderDeletedDossiers();
        case 'locked':
            return renderLockedDossiers();
        default:
            return renderDossiersOverview();
    }
}

/**
 * Vue d'ensemble des dossiers
 */
function renderDossiersOverview() {
    const stats = state.dossiersStats || {};

    return `
        <div class="dossiers-overview">
            <!-- Statistiques principales simplifiées -->
            <div class="stats-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 30px;">
                <div class="stat-card" style="background: linear-gradient(135deg, #3b82f6, #1d4ed8); color: white; padding: 25px; border-radius: 15px;">
                    <div style="font-size: 14px; opacity: 0.9;">📁 Total Dossiers</div>
                    <div style="font-size: 36px; font-weight: bold;">${stats.total || 0}</div>
                </div>
                <div class="stat-card" style="background: linear-gradient(135deg, #10b981, #059669); color: white; padding: 25px; border-radius: 15px;">
                    <div style="font-size: 14px; opacity: 0.9;">📄 Total Documents</div>
                    <div style="font-size: 36px; font-weight: bold;">${stats.totalDocuments || stats.totalFichiers || 0}</div>
                </div>
                <div class="stat-card" style="background: linear-gradient(135deg, #f59e0b, #d97706); color: white; padding: 25px; border-radius: 15px;">
                    <div style="font-size: 14px; opacity: 0.9;">🔒 Verrouillés</div>
                    <div style="font-size: 36px; font-weight: bold;">${stats.locked || 0}</div>
                </div>
                <div class="stat-card" style="background: linear-gradient(135deg, #8b5cf6, #7c3aed); color: white; padding: 25px; border-radius: 15px;">
                    <div style="font-size: 14px; opacity: 0.9;">📤 Partagés</div>
                    <div style="font-size: 36px; font-weight: bold;">${stats.shared || 0}</div>
                </div>
            </div>

            <!-- Répartition par département -->
            ${stats.byDepartment && stats.byDepartment.length > 0 ? `
                <div style="background: white; padding: 20px; border-radius: 15px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
                    <h3 style="margin-bottom: 15px;">🏢 Répartition par Département</h3>
                    <div style="display: grid; gap: 10px;">
                        ${stats.byDepartment.map(dept => `
                            <div style="display: flex; justify-content: space-between; align-items: center; padding: 12px; background: #f9fafb; border-radius: 8px;">
                                <span style="font-weight: 500;">${dept.departement}</span>
                                <div style="display: flex; gap: 15px;">
                                    <span style="background: #dbeafe; padding: 4px 12px; border-radius: 15px; font-size: 13px;">
                                        📁 ${dept.count} dossier(s)
                                    </span>
                                    <span style="background: #d1fae5; padding: 4px 12px; border-radius: 15px; font-size: 13px;">
                                        📄 ${dept.documents || 0} doc(s)
                                    </span>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            ` : '<div style="text-align: center; color: #6b7280; padding: 40px;">Aucun dossier trouvé</div>'}
        </div>
    `;
}

/**
 * Liste de tous les dossiers
 */
function renderAllDossiers() {
    const dossiers = state.allDossiers || [];
    const pagination = state.allDossiersPagination;

    return `
        <div class="all-dossiers">
            <!-- Barre de recherche -->
            <div style="display: flex; gap: 10px; margin-bottom: 20px;">
                <input type="text" placeholder="🔍 Rechercher un dossier..."
                       value="${state.allDossiersSearch}"
                       onkeyup="if(event.key === 'Enter') searchAllDossiers(this.value)"
                       style="flex: 1; padding: 12px 15px; border: 2px solid #e5e7eb; border-radius: 10px; font-size: 14px;">
                <button onclick="searchAllDossiers(document.querySelector('input[placeholder*=Rechercher]').value)"
                        style="padding: 12px 25px; background: #3b82f6; color: white; border: none; border-radius: 10px; cursor: pointer; font-weight: 600;">
                    Rechercher
                </button>
            </div>

            <!-- Liste des dossiers -->
            <div style="background: white; border-radius: 15px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
                <table style="width: 100%; border-collapse: collapse;">
                    <thead style="background: #f3f4f6;">
                        <tr>
                            <th style="padding: 15px; text-align: left; font-weight: 600;">ID Dossier</th>
                            <th style="padding: 15px; text-align: left; font-weight: 600;">Titre</th>
                            <th style="padding: 15px; text-align: left; font-weight: 600;">Documents</th>
                            <th style="padding: 15px; text-align: left; font-weight: 600;">Département</th>
                            <th style="padding: 15px; text-align: left; font-weight: 600;">Créé par</th>
                            <th style="padding: 15px; text-align: left; font-weight: 600;">Date</th>
                            <th style="padding: 15px; text-align: left; font-weight: 600;">Statut</th>
                            <th style="padding: 15px; text-align: center; font-weight: 600;">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${dossiers.length > 0 ? dossiers.map(dossier => `
                            <tr style="border-bottom: 1px solid #e5e7eb; cursor: pointer;" onclick="viewDossierDetail('${dossier.idDossier || dossier._id}')">
                                <td style="padding: 15px; font-family: monospace; font-size: 12px; color: #3b82f6;">${dossier.idDossier || 'N/A'}</td>
                                <td style="padding: 15px; font-weight: 500;">${dossier.titre || 'Sans titre'}</td>
                                <td style="padding: 15px;">
                                    <span style="background: #dbeafe; padding: 4px 10px; border-radius: 15px; font-size: 12px;">
                                        📄 ${dossier.nombreFichiers || dossier.nombreDocuments || 0}
                                    </span>
                                </td>
                                <td style="padding: 15px;">${dossier.departement || dossier.departementArchivage || '-'}</td>
                                <td style="padding: 15px;">${dossier.creatorName || dossier.creatorUsername || dossier.idUtilisateur || '-'}</td>
                                <td style="padding: 15px;">${dossier.createdAt ? new Date(dossier.createdAt).toLocaleDateString('fr-FR') : '-'}</td>
                                <td style="padding: 15px;">
                                    ${dossier.locked ? '<span style="color: #dc2626;">🔒 Verrouillé</span>' : ''}
                                    ${dossier.shareCount > 0 ? `<span style="color: #7c3aed;">📤 Partagé (${dossier.shareCount})</span>` : ''}
                                </td>
                                <td style="padding: 15px; text-align: center;">
                                    <button onclick="event.stopPropagation(); viewDossierDetail('${dossier.idDossier || dossier._id}')"
                                            style="padding: 6px 12px; background: #3b82f6; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 12px;">
                                        👁️ Voir
                                    </button>
                                </td>
                            </tr>
                        `).join('') : `
                            <tr>
                                <td colspan="8" style="padding: 40px; text-align: center; color: #6b7280;">
                                    📁 Aucun dossier trouvé
                                </td>
                            </tr>
                        `}
                    </tbody>
                </table>
            </div>

            <!-- Pagination -->
            ${pagination.totalPages > 1 ? `
                <div style="display: flex; justify-content: center; gap: 10px; margin-top: 20px;">
                    <button onclick="changeDossiersPage(${pagination.page - 1})" ${pagination.page <= 1 ? 'disabled' : ''}
                            style="padding: 8px 15px; border: 1px solid #d1d5db; border-radius: 6px; cursor: pointer; ${pagination.page <= 1 ? 'opacity: 0.5;' : ''}">
                        ← Précédent
                    </button>
                    <span style="padding: 8px 15px;">Page ${pagination.page} / ${pagination.totalPages}</span>
                    <button onclick="changeDossiersPage(${pagination.page + 1})" ${pagination.page >= pagination.totalPages ? 'disabled' : ''}
                            style="padding: 8px 15px; border: 1px solid #d1d5db; border-radius: 6px; cursor: pointer; ${pagination.page >= pagination.totalPages ? 'opacity: 0.5;' : ''}">
                        Suivant →
                    </button>
                </div>
            ` : ''}
        </div>
    `;
}

function searchAllDossiers(query) {
    state.allDossiersSearch = query;
    state.allDossiersPagination.page = 1;
    loadDossiersModule();
}

function changeDossiersPage(page) {
    if (page < 1) return;
    state.allDossiersPagination.page = page;
    loadDossiersModule();
}

/**
 * Dossiers supprimés (corbeille)
 */
function renderDeletedDossiers() {
    const dossiers = state.deletedDossiers || [];
    const pagination = state.deletedDossiersPagination;

    return `
        <div class="deleted-dossiers">
            <div style="background: #fef2f2; padding: 15px; border-radius: 10px; margin-bottom: 20px; border: 1px solid #fecaca;">
                <p style="margin: 0; color: #991b1b;">
                    ⚠️ Les dossiers dans la corbeille seront supprimés définitivement après 60 jours.
                </p>
            </div>

            <div style="background: white; border-radius: 15px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
                <table style="width: 100%; border-collapse: collapse;">
                    <thead style="background: #fef2f2;">
                        <tr>
                            <th style="padding: 15px; text-align: left;">Titre</th>
                            <th style="padding: 15px; text-align: left;">Documents</th>
                            <th style="padding: 15px; text-align: left;">Supprimé par</th>
                            <th style="padding: 15px; text-align: left;">Date suppression</th>
                            <th style="padding: 15px; text-align: left;">Expiration</th>
                            <th style="padding: 15px; text-align: center;">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${dossiers.length > 0 ? dossiers.map(dossier => `
                            <tr style="border-bottom: 1px solid #e5e7eb;">
                                <td style="padding: 15px; font-weight: 500;">${dossier.titre || 'Sans titre'}</td>
                                <td style="padding: 15px;">${dossier.nombreFichiers || 0} fichier(s)</td>
                                <td style="padding: 15px;">${dossier.nomComplet || dossier.supprimePar || '-'}</td>
                                <td style="padding: 15px;">${dossier.dateSuppression ? new Date(dossier.dateSuppression).toLocaleDateString('fr-FR') : '-'}</td>
                                <td style="padding: 15px;">
                                    ${dossier.isRecoverable
                                        ? `<span style="color: #16a34a;">${Math.ceil(dossier.daysUntilExpiration || 0)} jours</span>`
                                        : '<span style="color: #dc2626;">Expiré</span>'
                                    }
                                </td>
                                <td style="padding: 15px; text-align: center;">
                                    ${dossier.isRecoverable ? `
                                        <button onclick="restoreDossier('${dossier.dossierId || dossier._id}')"
                                                style="padding: 6px 12px; background: #10b981; color: white; border: none; border-radius: 6px; cursor: pointer; margin-right: 5px;">
                                            ♻️ Restaurer
                                        </button>
                                    ` : ''}
                                    <button onclick="permanentDeleteDossier('${dossier.dossierId || dossier._id}')"
                                            style="padding: 6px 12px; background: #dc2626; color: white; border: none; border-radius: 6px; cursor: pointer;">
                                        🗑️ Supprimer
                                    </button>
                                </td>
                            </tr>
                        `).join('') : `
                            <tr>
                                <td colspan="6" style="padding: 40px; text-align: center; color: #6b7280;">
                                    🗑️ La corbeille est vide
                                </td>
                            </tr>
                        `}
                    </tbody>
                </table>
            </div>
        </div>
    `;
}

/**
 * Dossiers verrouillés
 */
function renderLockedDossiers() {
    const dossiers = state.lockedDossiers || [];

    return `
        <div class="locked-dossiers">
            <div style="background: #fef3c7; padding: 15px; border-radius: 10px; margin-bottom: 20px; border: 1px solid #fcd34d;">
                <p style="margin: 0; color: #92400e;">
                    🔒 Les dossiers verrouillés ne peuvent être modifiés que par les utilisateurs de niveau 1.
                </p>
            </div>

            <div style="background: white; border-radius: 15px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
                <table style="width: 100%; border-collapse: collapse;">
                    <thead style="background: #fef3c7;">
                        <tr>
                            <th style="padding: 15px; text-align: left;">ID Dossier</th>
                            <th style="padding: 15px; text-align: left;">Titre</th>
                            <th style="padding: 15px; text-align: left;">Documents</th>
                            <th style="padding: 15px; text-align: left;">Verrouillé par</th>
                            <th style="padding: 15px; text-align: left;">Date verrouillage</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${dossiers.length > 0 ? dossiers.map(dossier => `
                            <tr style="border-bottom: 1px solid #e5e7eb; cursor: pointer;" onclick="viewDossierDetail('${dossier.idDossier}')">
                                <td style="padding: 15px; font-family: monospace; font-size: 12px; color: #f59e0b;">${dossier.idDossier || 'N/A'}</td>
                                <td style="padding: 15px; font-weight: 500;">${dossier.titre || 'Sans titre'}</td>
                                <td style="padding: 15px;">${dossier.nombreFichiers || 0} fichier(s)</td>
                                <td style="padding: 15px;">${dossier.verrouilleurNom || dossier.verrouillePar || '-'}</td>
                                <td style="padding: 15px;">${dossier.dateVerrouillage ? new Date(dossier.dateVerrouillage).toLocaleDateString('fr-FR') : '-'}</td>
                            </tr>
                        `).join('') : `
                            <tr>
                                <td colspan="5" style="padding: 40px; text-align: center; color: #6b7280;">
                                    🔓 Aucun dossier verrouillé
                                </td>
                            </tr>
                        `}
                    </tbody>
                </table>
            </div>
        </div>
    `;
}

/**
 * Voir le détail d'un dossier
 */
async function viewDossierDetail(dossierId) {
    try {
        const res = await fetch(`/api/superadmin/dossiers/${dossierId}`, { credentials: 'include' });
        const data = await res.json();

        if (data.success) {
            state.selectedDossier = data.data;
            state.showDossierDetail = true;
            renderDossiersModule();
        } else {
            showNotification('Dossier non trouvé', 'error');
        }
    } catch (error) {
        console.error('Erreur viewDossierDetail:', error);
        showNotification('Erreur lors du chargement du dossier', 'error');
    }
}

/**
 * Modal détail dossier
 */
function renderDossierDetailModal() {
    const d = state.selectedDossier;
    if (!d) return '';

    const documentsArray = d.documents || d.fichiers || [];

    return `
        <div class="modal-overlay" style="position: fixed; inset: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 1000;"
             onclick="closeDossierDetailModal()">
            <div style="background: white; border-radius: 15px; max-width: 900px; width: 95%; max-height: 90vh; overflow-y: auto;" onclick="event.stopPropagation()">
                <!-- Header -->
                <div style="padding: 20px; border-bottom: 1px solid #e5e7eb; display: flex; justify-content: space-between; align-items: center;">
                    <div>
                        <h2 style="margin: 0;">📁 ${d.titre || 'Dossier'}</h2>
                        <div style="font-family: monospace; color: #3b82f6; margin-top: 5px;">${d.idDossier || ''}</div>
                    </div>
                    <button onclick="closeDossierDetailModal()" style="background: none; border: none; font-size: 24px; cursor: pointer;">&times;</button>
                </div>

                <!-- Contenu -->
                <div style="padding: 20px;">
                    <!-- Infos générales -->
                    <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; margin-bottom: 25px;">
                        <div style="background: #f3f4f6; padding: 15px; border-radius: 10px;">
                            <div style="font-size: 12px; color: #6b7280;">Catégorie</div>
                            <div style="font-weight: 600;">${d.categorie || '-'}</div>
                        </div>
                        <div style="background: #f3f4f6; padding: 15px; border-radius: 10px;">
                            <div style="font-size: 12px; color: #6b7280;">Département</div>
                            <div style="font-weight: 600;">${d.departementArchivage || d.departementNom || '-'}</div>
                        </div>
                        <div style="background: #f3f4f6; padding: 15px; border-radius: 10px;">
                            <div style="font-size: 12px; color: #6b7280;">Service</div>
                            <div style="font-weight: 600;">${d.serviceArchivage || '-'}</div>
                        </div>
                        <div style="background: #f3f4f6; padding: 15px; border-radius: 10px;">
                            <div style="font-size: 12px; color: #6b7280;">Créé par</div>
                            <div style="font-weight: 600;">${d.archivePar?.nomComplet || d.idUtilisateur || '-'}</div>
                        </div>
                        <div style="background: #f3f4f6; padding: 15px; border-radius: 10px;">
                            <div style="font-size: 12px; color: #6b7280;">Date création</div>
                            <div style="font-weight: 600;">${d.createdAt ? new Date(d.createdAt).toLocaleString('fr-FR') : '-'}</div>
                        </div>
                        <div style="background: #f3f4f6; padding: 15px; border-radius: 10px;">
                            <div style="font-size: 12px; color: #6b7280;">Taille totale</div>
                            <div style="font-weight: 600;">${formatFileSize(d.tailleTotale || 0)}</div>
                        </div>
                    </div>

                    <!-- Statut -->
                    <div style="display: flex; gap: 10px; margin-bottom: 25px;">
                        ${d.locked ? '<span style="background: #fef2f2; color: #dc2626; padding: 8px 15px; border-radius: 20px;">🔒 Verrouillé par ' + (d.lockedBy || 'Admin') + '</span>' : ''}
                        ${d.sharedWith?.length > 0 ? '<span style="background: #f3e8ff; color: #7c3aed; padding: 8px 15px; border-radius: 20px;">📤 Partagé avec ' + d.sharedWith.length + ' utilisateur(s)</span>' : ''}
                    </div>

                    <!-- Documents -->
                    <div style="margin-bottom: 25px;">
                        <h3 style="margin-bottom: 15px;">📄 Documents (${documentsArray.length})</h3>
                        <div style="display: grid; gap: 10px;">
                            ${documentsArray.length > 0 ? documentsArray.map(doc => `
                                <div style="background: #f9fafb; padding: 15px; border-radius: 10px; display: flex; justify-content: space-between; align-items: center;">
                                    <div>
                                        <div style="font-weight: 500;">${doc.nomOriginal || doc.nom || 'Document'}</div>
                                        <div style="font-size: 12px; color: #6b7280;">
                                            ${doc.categorie ? `<span style="background: #e0f2fe; color: #0369a1; padding: 2px 8px; border-radius: 8px; margin-right: 8px;">${doc.categorie}</span>` : ''}
                                            📦 ${formatFileSize(doc.taille || 0)} •
                                            <span style="font-family: monospace;">${doc.idDocument || doc.id || ''}</span>
                                            ${doc.locked ? ' • 🔒 Verrouillé' : ''}
                                        </div>
                                    </div>
                                    <div style="display: flex; gap: 5px;">
                                        ${doc.sharedWith?.length > 0 ? `<span style="background: #ddd6fe; padding: 4px 10px; border-radius: 10px; font-size: 11px;">📤 ${doc.sharedWith.length}</span>` : ''}
                                    </div>
                                </div>
                            `).join('') : '<p style="color: #6b7280; text-align: center;">Aucun document</p>'}
                        </div>
                    </div>

                    ${d.description ? `
                        <div style="margin-bottom: 25px;">
                            <h3 style="margin-bottom: 10px;">📝 Description</h3>
                            <p style="background: #f9fafb; padding: 15px; border-radius: 10px; margin: 0;">${d.description}</p>
                        </div>
                    ` : ''}

                    ${d.tags?.length > 0 ? `
                        <div>
                            <h3 style="margin-bottom: 10px;">🏷️ Tags</h3>
                            <div style="display: flex; gap: 8px; flex-wrap: wrap;">
                                ${d.tags.map(tag => `<span style="background: #e0e7ff; color: #4338ca; padding: 5px 12px; border-radius: 15px; font-size: 13px;">${tag}</span>`).join('')}
                            </div>
                        </div>
                    ` : ''}
                </div>

                <!-- Footer -->
                <div style="padding: 20px; border-top: 1px solid #e5e7eb; text-align: right;">
                    <button onclick="closeDossierDetailModal()" style="padding: 10px 25px; background: #6b7280; color: white; border: none; border-radius: 8px; cursor: pointer;">
                        Fermer
                    </button>
                </div>
            </div>
        </div>
    `;
}

function closeDossierDetailModal() {
    state.showDossierDetail = false;
    state.selectedDossier = null;
    renderDossiersModule();
}

/**
 * Restaurer un dossier
 */
async function restoreDossier(dossierId) {
    if (!await customConfirm('Voulez-vous restaurer ce dossier ?', 'Restauration', '♻️')) return;

    try {
        const res = await fetch(`/api/superadmin/dossiers/${dossierId}/restore`, {
            method: 'POST',
            credentials: 'include'
        });
        const data = await res.json();

        if (data.success) {
            showNotification('Dossier restauré avec succès', 'success');
            loadDossiersModule();
        } else {
            showNotification(data.message || 'Erreur lors de la restauration', 'error');
        }
    } catch (error) {
        console.error('Erreur restoreDossier:', error);
        showNotification('Erreur lors de la restauration', 'error');
    }
}

/**
 * Supprimer définitivement un dossier
 */
async function permanentDeleteDossier(dossierId) {
    if (!await customConfirm('⚠️ Cette action est IRRÉVERSIBLE. Supprimer définitivement ce dossier et tous ses documents ?', 'Suppression définitive', '💀')) return;

    try {
        const res = await fetch(`/api/superadmin/dossiers/${dossierId}/permanent`, {
            method: 'DELETE',
            credentials: 'include'
        });
        const data = await res.json();

        if (data.success) {
            showNotification('Dossier supprimé définitivement', 'success');
            loadDossiersModule();
        } else {
            showNotification(data.message || 'Erreur lors de la suppression', 'error');
        }
    } catch (error) {
        console.error('Erreur permanentDeleteDossier:', error);
        showNotification('Erreur lors de la suppression', 'error');
    }
}

/**
 * Formatter la taille de fichier
 */
function formatFileSize(bytes) {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// ============================================
// MODULE DÉPARTEMENTS
// ============================================

/**
 * Charger le module départements
 */
async function loadDepartmentsModule() {
    try {
        console.log('🏢 Chargement module départements...');

        const { search, type } = state.departmentsFilters;
        const { page } = state.departmentsPagination;

        const params = new URLSearchParams({ search, type, page });

        const [depsRes, statsRes] = await Promise.all([
            fetch(`/api/superadmin/departments?${params}`, { credentials: 'include' }),
            fetch('/api/superadmin/departments/stats', { credentials: 'include' })
        ]);

        const depsData = await depsRes.json();
        const statsData = await statsRes.json();

        if (depsData.success) {
            state.departmentsData = depsData.data.departments;
            state.departmentsPagination = depsData.data.pagination;
            state.departmentsStats = depsData.data.stats;
        }

        if (statsData.success) {
            state.departmentsStats = { ...state.departmentsStats, ...statsData.data };
        }

        console.log('✅ Module départements chargé');
        renderDepartmentsModule();

    } catch (error) {
        console.error('❌ Erreur chargement module départements:', error);
        showError('Erreur lors du chargement du module départements');
    }
}

/**
 * Render du module départements
 */
function renderDepartmentsModule() {
    const sectionDepartments = document.getElementById('section-departments');
    if (!sectionDepartments) return;

    sectionDepartments.innerHTML = `
        <div class="users-module">
            ${renderDepartmentsStats()}
            ${renderDepartmentsFilters()}
            ${renderDepartmentsTable()}
            ${renderDepartmentsPagination()}
        </div>

        ${state.showCreateDepartment ? renderCreateDepartmentModal() : ''}
        ${state.showEditDepartment ? renderEditDepartmentModal() : ''}
        ${state.showDeleteDepartmentConfirm ? renderDeleteDepartmentModal() : ''}
    `;
}

function renderDepartmentsStats() {
    const { total, main, services } = state.departmentsStats || { total: 0, main: 0, services: 0 };

    return `
        <div class="stats-bar">
            <div class="stat-item">
                🏢 ${total} Total
            </div>
            <div class="stat-item success">
                🏛️ ${main} Départements principaux
            </div>
            <div class="stat-item" style="background: #dbeafe; color: #1e40af;">
                📋 ${services} Services
            </div>
        </div>
    `;
}

function renderDepartmentsFilters() {
    return `
        <div class="filters-bar">
            <input type="text"
                   placeholder="🔍 Rechercher par nom ou code..."
                   value="${state.departmentsFilters.search}"
                   oninput="handleDepartmentSearchChange(this.value)" />

            <select onchange="handleDepartmentTypeFilter(this.value)">
                <option value="all" ${state.departmentsFilters.type === 'all' ? 'selected' : ''}>Tous</option>
                <option value="main" ${state.departmentsFilters.type === 'main' ? 'selected' : ''}>Départements principaux</option>
                <option value="services" ${state.departmentsFilters.type === 'services' ? 'selected' : ''}>Services</option>
            </select>

            <button class="refresh-btn" onclick="showCreateDepartmentModal()">
                ➕ Créer un département
            </button>
        </div>
    `;
}

function renderDepartmentsTable() {
    if (state.departmentsData.length === 0) {
        return '<p style="text-align: center; color: #718096; padding: 40px;">Aucun département trouvé</p>';
    }

    return `
        <table class="users-table">
            <thead>
                <tr>
                    <th>Type</th>
                    <th>Code</th>
                    <th>Nom</th>
                    <th>Département parent</th>
                    <th>Utilisateurs</th>
                    <th>Documents</th>
                    <th>Services</th>
                    <th>Date création</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>
                ${state.departmentsData.map(dept => renderDepartmentRow(dept)).join('')}
            </tbody>
        </table>
    `;
}

function renderDepartmentRow(dept) {
    const createdAt = dept.dateCreation ? formatServerDate(dept.dateCreation) : '-';

    return `
        <tr>
            <td>
                <span class="user-badge ${dept.type === 'principal' ? 'badge-niveau-0' : 'badge-niveau-1'}">
                    ${dept.type === 'principal' ? '🏛️ Département' : '📋 Service'}
                </span>
            </td>
            <td><strong>${dept.code}</strong></td>
            <td>${dept.nom}</td>
            <td>${dept.parentDepartment ? dept.parentDepartment.nom : '-'}</td>
            <td>${dept.userCount || 0}</td>
            <td>${dept.documentCount || 0}</td>
            <td>${dept.subDepartmentCount || 0}</td>
            <td>${createdAt}</td>
            <td>
                <button class="action-btn btn-view" onclick='viewDepartmentDetails(${JSON.stringify(dept).replace(/'/g, "&#39;")})'>
                    ✏️ Modifier
                </button>
                <button class="action-btn btn-delete" onclick='confirmDeleteDepartment(${JSON.stringify(dept).replace(/'/g, "&#39;")})'>
                    🗑️ Supprimer
                </button>
            </td>
        </tr>
    `;
}

function renderDepartmentsPagination() {
    const { page, totalPages, total } = state.departmentsPagination;
    if (totalPages <= 1) return '';

    return `
        <div class="pagination-container">
            <div class="pagination-info">
                ${total} département${total > 1 ? 's' : ''} au total
            </div>
            <div class="pagination">
                <button class="pagination-btn" ${page === 1 ? 'disabled' : ''} onclick="goToDepartmentPage(${page - 1})">
                    ◀ Précédent
                </button>
                <span class="page-number">Page ${page} sur ${totalPages}</span>
                <button class="pagination-btn" ${page === totalPages ? 'disabled' : ''} onclick="goToDepartmentPage(${page + 1})">
                    Suivant ▶
                </button>
            </div>
        </div>
    `;
}

// Modales
function renderCreateDepartmentModal() {
    return `
        <div class="modal-overlay" onclick="closeCreateDepartmentModal()">
            <div class="modal-content" onclick="event.stopPropagation()">
                <div class="modal-header">
                    <h2>➕ Créer un département principal</h2>
                    <button class="modal-close" onclick="closeCreateDepartmentModal()">✕</button>
                </div>
                <form id="createDepartmentForm" onsubmit="handleCreateDepartment(event)">
                    <div class="modal-body">
                        <div class="form-group">
                            <label for="newDeptCode">Code du département *</label>
                            <input type="text" id="newDeptCode" name="code" required
                                   placeholder="Ex: DEPT001">
                        </div>
                        <div class="form-group">
                            <label for="newDeptNom">Nom du département *</label>
                            <input type="text" id="newDeptNom" name="nom" required
                                   placeholder="Ex: Direction Générale">
                        </div>
                        <div class="form-group">
                            <label for="newDeptDesc">Description (optionnel)</label>
                            <textarea id="newDeptDesc" name="description"
                                      placeholder="Description du département..."></textarea>
                        </div>
                    </div>
                    <div class="modal-actions">
                        <button type="button" class="btn-modal btn-secondary" onclick="closeCreateDepartmentModal()">
                            Annuler
                        </button>
                        <button type="submit" class="btn-modal btn-primary">
                            ✓ Créer le département
                        </button>
                    </div>
                </form>
            </div>
        </div>
    `;
}

function renderEditDepartmentModal() {
    const dept = state.selectedDepartment;
    if (!dept) return '';

    return `
        <div class="modal-overlay" onclick="closeEditDepartmentModal()">
            <div class="modal-content" onclick="event.stopPropagation()">
                <div class="modal-header">
                    <h2>✏️ Modifier le département</h2>
                    <button class="modal-close" onclick="closeEditDepartmentModal()">✕</button>
                </div>
                <form id="editDepartmentForm" onsubmit="handleEditDepartment(event)">
                    <div class="modal-body">
                        <div class="form-group">
                            <label for="editDeptCode">Code du département *</label>
                            <input type="text" id="editDeptCode" name="code" required
                                   value="${dept.code}">
                        </div>
                        <div class="form-group">
                            <label for="editDeptNom">Nom du département *</label>
                            <input type="text" id="editDeptNom" name="nom" required
                                   value="${dept.nom}">
                        </div>
                        <div class="form-group">
                            <label for="editDeptDesc">Description (optionnel)</label>
                            <textarea id="editDeptDesc" name="description">${dept.description || ''}</textarea>
                        </div>
                    </div>
                    <div class="modal-actions">
                        <button type="button" class="btn-modal btn-secondary" onclick="closeEditDepartmentModal()">
                            Annuler
                        </button>
                        <button type="submit" class="btn-modal btn-primary">
                            ✓ Enregistrer
                        </button>
                    </div>
                </form>
            </div>
        </div>
    `;
}

function renderDeleteDepartmentModal() {
    const dept = state.selectedDepartment;
    if (!dept) return '';

    return `
        <div class="modal-overlay" onclick="closeDeleteDepartmentModal()">
            <div class="modal-content" onclick="event.stopPropagation()">
                <div class="modal-header">
                    <h2>🗑️ Supprimer le département</h2>
                    <button class="modal-close" onclick="closeDeleteDepartmentModal()">✕</button>
                </div>
                <div class="modal-body">
                    <div style="background: #fef2f2; padding: 20px; border-radius: 8px; border: 2px solid #ef4444; margin-bottom: 20px;">
                        <p style="margin: 0; font-size: 14px; color: #7f1d1d;">
                            ⚠️ Vous êtes sur le point de supprimer le département :
                        </p>
                    </div>
                    <div style="background: #f7fafc; padding: 16px; border-radius: 8px; margin-bottom: 20px;">
                        <p style="margin: 0; font-weight: 600;">${dept.nom} (${dept.code})</p>
                        ${dept.userCount > 0 || dept.subDepartmentCount > 0 || dept.documentCount > 0 ? `
                            <div style="margin-top: 12px; padding: 12px; background: #fef2f2; border-radius: 6px;">
                                <p style="margin: 0; font-size: 13px; color: #991b1b; font-weight: 600;">
                                    ❌ Impossible de supprimer :
                                </p>
                                ${dept.userCount > 0 ? `<p style="margin: 4px 0 0 0; font-size: 12px; color: #7f1d1d;">• ${dept.userCount} utilisateur(s) affecté(s)</p>` : ''}
                                ${dept.subDepartmentCount > 0 ? `<p style="margin: 4px 0 0 0; font-size: 12px; color: #7f1d1d;">• ${dept.subDepartmentCount} service(s) dépendant(s)</p>` : ''}
                                ${dept.documentCount > 0 ? `<p style="margin: 4px 0 0 0; font-size: 12px; color: #7f1d1d;">• ${dept.documentCount} document(s) associé(s)</p>` : ''}
                            </div>
                        ` : ''}
                    </div>
                </div>
                <div class="modal-actions">
                    <button type="button" class="btn-modal btn-secondary" onclick="closeDeleteDepartmentModal()">
                        Annuler
                    </button>
                    ${dept.userCount === 0 && dept.subDepartmentCount === 0 && dept.documentCount === 0 ? `
                        <button type="button" class="btn-modal btn-danger" onclick="deleteDepartmentConfirmed()">
                            🗑️ Oui, supprimer définitivement
                        </button>
                    ` : ''}
                </div>
            </div>
        </div>
    `;
}

// Handlers
let departmentSearchDebounce;
function handleDepartmentSearchChange(value) {
    clearTimeout(departmentSearchDebounce);
    departmentSearchDebounce = setTimeout(async () => {
        state.departmentsFilters.search = value;
        state.departmentsPagination.page = 1;
        await loadDepartmentsModule();
    }, 300);
}

function handleDepartmentTypeFilter(value) {
    state.departmentsFilters.type = value;
    state.departmentsPagination.page = 1;
    loadDepartmentsModule();
}

function goToDepartmentPage(page) {
    state.departmentsPagination.page = page;
    loadDepartmentsModule();
}

function showCreateDepartmentModal() {
    state.showCreateDepartment = true;
    renderDepartmentsModule();
}

function closeCreateDepartmentModal() {
    state.showCreateDepartment = false;
    renderDepartmentsModule();
}

function viewDepartmentDetails(dept) {
    state.selectedDepartment = dept;
    state.showEditDepartment = true;
    renderDepartmentsModule();
}

function closeEditDepartmentModal() {
    state.showEditDepartment = false;
    state.selectedDepartment = null;
    renderDepartmentsModule();
}

function confirmDeleteDepartment(dept) {
    state.selectedDepartment = dept;
    state.showDeleteDepartmentConfirm = true;
    renderDepartmentsModule();
}

function closeDeleteDepartmentModal() {
    state.showDeleteDepartmentConfirm = false;
    state.selectedDepartment = null;
    renderDepartmentsModule();
}

async function handleCreateDepartment(event) {
    event.preventDefault();
    const formData = new FormData(event.target);

    const deptData = {
        code: formData.get('code'),
        nom: formData.get('nom'),
        description: formData.get('description')
    };

    try {
        const response = await fetch('/api/superadmin/departments', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify(deptData)
        });

        const data = await response.json();

        if (data.success) {
            closeCreateDepartmentModal();
            await loadDepartmentsModule();
            showSuccess(data.message);
        } else {
            showError(data.message);
        }
    } catch (error) {
        console.error('Erreur création département:', error);
        showError('Erreur lors de la création');
    }
}

async function handleEditDepartment(event) {
    event.preventDefault();
    const formData = new FormData(event.target);

    const deptData = {
        code: formData.get('code'),
        nom: formData.get('nom'),
        description: formData.get('description')
    };

    try {
        const response = await fetch(`/api/superadmin/departments/${state.selectedDepartment._id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify(deptData)
        });

        const data = await response.json();

        if (data.success) {
            closeEditDepartmentModal();
            await loadDepartmentsModule();
            showSuccess(data.message);
        } else {
            showError(data.message);
        }
    } catch (error) {
        console.error('Erreur modification département:', error);
        showError('Erreur lors de la modification');
    }
}

async function deleteDepartmentConfirmed() {
    try {
        const response = await fetch(`/api/superadmin/departments/${state.selectedDepartment._id}`, {
            method: 'DELETE',
            credentials: 'include'
        });

        const data = await response.json();

        if (data.success) {
            closeDeleteDepartmentModal();
            await loadDepartmentsModule();
            showSuccess(data.message);
        } else {
            showError(data.message);
        }
    } catch (error) {
        console.error('Erreur suppression département:', error);
        showError('Erreur lors de la suppression');
    }
}

// ============================================
// GESTION DES LOGS DE SÉCURITÉ (AUDIT)
// ============================================

let allAuditLogs = [];

/**
 * Charger les logs de sécurité
 */
async function loadAuditLogs() {
    try {
        const response = await fetch('/api/security-logs?limit=200', {
            credentials: 'include'
        });

        if (!response.ok) {
            throw new Error('Erreur chargement logs');
        }

        const data = await response.json();

        if (data.success) {
            allAuditLogs = data.logs;

            // Mettre à jour les stats
            document.getElementById('audit-stat-info').textContent = data.stats.INFO || 0;
            document.getElementById('audit-stat-warning').textContent = data.stats.WARNING || 0;
            document.getElementById('audit-stat-critical').textContent = data.stats.CRITICAL || 0;

            // Afficher les logs
            displayAuditLogs(allAuditLogs);
        }
    } catch (error) {
        console.error('Erreur chargement logs:', error);
        document.getElementById('audit-logs-list').innerHTML = `
            <div style="text-align: center; padding: 40px; color: #e74c3c;">
                <div style="font-size: 48px; margin-bottom: 16px;">❌</div>
                <div style="font-size: 16px; font-weight: 600; margin-bottom: 8px;">Erreur de chargement</div>
                <div style="font-size: 14px;">Impossible de charger les logs de sécurité</div>
            </div>
        `;
    }
}

/**
 * Afficher les logs dans la liste
 */
function displayAuditLogs(logs) {
    const container = document.getElementById('audit-logs-list');
    const countEl = document.getElementById('audit-log-count');

    if (!logs || logs.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 60px 20px; color: #95a5a6;">
                <div style="font-size: 48px; margin-bottom: 16px;">📋</div>
                <div style="font-size: 18px; font-weight: 600; margin-bottom: 8px;">Aucun log trouvé</div>
                <div style="font-size: 14px;">Aucun événement de sécurité ne correspond aux critères</div>
            </div>
        `;
        countEl.textContent = '0 événements';
        return;
    }

    countEl.textContent = `${logs.length} événement${logs.length > 1 ? 's' : ''}`;

    // ✅ CORRECTION: Trier par date décroissante (LIFO - Last In First Out)
    // Les événements les plus récents s'affichent en premier
    const sortedLogs = [...logs].sort((a, b) => {
        const dateA = new Date(a.timestamp);
        const dateB = new Date(b.timestamp);
        return dateB - dateA; // Ordre décroissant (plus récent en premier)
    });

    container.innerHTML = sortedLogs.map((log, index) => {
        const date = new Date(log.timestamp);
        const timeAgo = getTimeAgo(date);
        const formattedDate = date.toLocaleString('fr-FR');

        // Couleur de la bulle selon gravité
        const bubbleColor = log.severity === 'CRITICAL' ? '#e74c3c' :
                           log.severity === 'WARNING' ? '#f39c12' : '#27ae60';
        const borderColor = bubbleColor;

        // Enrichir les détails avec les informations utilisateur et document
        let enrichedDetails = '';

        // Informations utilisateur enrichies
        if (log.userInfo) {
            // Construire le nom complet intelligemment
            let nomComplet = log.username; // Par défaut, utiliser le username
            if (log.userInfo.nom && log.userInfo.nom !== 'N/A' && log.userInfo.prenom && log.userInfo.prenom !== 'N/A') {
                nomComplet = `${log.userInfo.prenom} ${log.userInfo.nom}`;
            } else if (log.userInfo.nom && log.userInfo.nom !== 'N/A') {
                nomComplet = log.userInfo.nom;
            } else if (log.userInfo.prenom && log.userInfo.prenom !== 'N/A') {
                nomComplet = log.userInfo.prenom;
            }

            enrichedDetails += `
                <div style="background: #f8f9fa; padding: 12px; border-radius: 6px; margin-bottom: 10px;">
                    <div style="font-weight: 700; color: #000000; margin-bottom: 8px; font-size: 13px;">👤 Informations Utilisateur</div>
                    <div style="display: grid; grid-template-columns: auto 1fr; gap: 8px; font-size: 12px;">
                        <strong style="color: #000000;">Utilisateur:</strong> <span>${escapeHtml(log.username)}</span>
                        ${nomComplet !== log.username ? `<strong style="color: #000000;">Nom complet:</strong> <span>${escapeHtml(nomComplet)}</span>` : ''}
                        <strong style="color: #000000;">Département:</strong> <span>${escapeHtml(log.userInfo.departement && log.userInfo.departement !== 'N/A' ? log.userInfo.departement : 'Non renseigné')}</span>
                        <strong style="color: #000000;">Niveau:</strong> <span>Niveau ${log.userInfo.niveau} - ${escapeHtml(log.userInfo.role && log.userInfo.role !== 'N/A' ? log.userInfo.role : 'Non défini')}</span>
                        ${log.userInfo.email && log.userInfo.email !== 'N/A' ? `<strong style="color: #000000;">Email:</strong> <span>${escapeHtml(log.userInfo.email)}</span>` : ''}
                    </div>
                </div>
            `;
        }

        // Informations document si présent
        if (log.documentInfo) {
            enrichedDetails += `
                <div style="background: #fff3cd; padding: 12px; border-radius: 6px; margin-bottom: 10px;">
                    <div style="font-weight: 700; color: #000000; margin-bottom: 8px; font-size: 13px;">📄 Document Concerné</div>
                    <div style="display: grid; grid-template-columns: auto 1fr; gap: 8px; font-size: 12px;">
                        <strong style="color: #000000;">Titre:</strong> <span>${escapeHtml(log.documentInfo.titre && log.documentInfo.titre !== 'N/A' ? log.documentInfo.titre : 'Non renseigné')}</span>
                        <strong style="color: #000000;">Propriétaire:</strong> <span>${escapeHtml(log.documentInfo.proprietaire && log.documentInfo.proprietaire !== 'N/A' ? log.documentInfo.proprietaire : 'Inconnu')}</span>
                        <strong style="color: #000000;">Statut:</strong> <span>${escapeHtml(log.documentInfo.statut && log.documentInfo.statut !== 'N/A' ? log.documentInfo.statut : 'Non défini')}</span>
                        ${log.documentInfo.categorie && log.documentInfo.categorie !== 'N/A' ? `<strong style="color: #000000;">Catégorie:</strong> <span>${escapeHtml(log.documentInfo.categorie)}</span>` : ''}
                    </div>
                </div>
            `;
        }

        // Explication détaillée du pourquoi
        if (log.explanation) {
            enrichedDetails += `
                <div style="background: linear-gradient(135deg, #667eea15 0%, #764ba215 100%); padding: 14px; border-radius: 6px; border-left: 4px solid #667eea; margin-bottom: 10px;">
                    <div style="font-weight: 700; color: #000000; margin-bottom: 8px; font-size: 13px;">💡 Pourquoi ce log ?</div>
                    <div style="font-size: 12px; color: #000000; line-height: 1.6;">
                        ${escapeHtml(log.explanation)}
                    </div>
                </div>
            `;
        }

        // Détails techniques
        enrichedDetails += `
            <div style="background: white; padding: 12px; border-radius: 6px; border: 1px solid #e1e8ed;">
                <div style="font-weight: 700; color: #000000; margin-bottom: 8px; font-size: 13px;">🔧 Détails Techniques</div>
                <div style="font-size: 12px; color: #000000;">
                    <strong>Type d'événement:</strong> ${log.eventType}<br>
                    <strong>Adresse IP:</strong> ${escapeHtml(log.ip)}<br>
                    <strong>Navigateur:</strong> ${escapeHtml(log.userAgent)}<br>
                    ${log.details && log.details.url ? `<strong>URL:</strong> ${escapeHtml(log.details.url)}<br>` : ''}
                    ${log.details && log.details.method ? `<strong>Méthode:</strong> ${log.details.method}<br>` : ''}
                    ${log.details && Object.keys(log.details).length > 0 ?
                        `<br><strong>Données additionnelles:</strong><br><pre style="margin: 4px 0; white-space: pre-wrap; font-family: 'Courier New', monospace; background: #f8f9fa; padding: 8px; border-radius: 4px;">${JSON.stringify(log.details, null, 2)}</pre>`
                        : ''}
                </div>
            </div>
        `;

        return `
            <div style="display: flex; gap: 12px; padding: 16px; border-radius: 8px; margin-bottom: 12px; background: #fafbfc; border-left: 4px solid ${borderColor}; transition: all 0.2s;">
                <div style="width: 12px; height: 12px; border-radius: 50%; background: ${bubbleColor}; flex-shrink: 0; margin-top: 4px;"></div>
                <div style="flex: 1;">
                    <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 8px;">
                        <div style="flex: 1;">
                            <div style="font-size: 15px; font-weight: 600; color: #2c3e50; margin-bottom: 4px;">${escapeHtml(log.message)}</div>
                            <div style="display: flex; gap: 16px; flex-wrap: wrap; font-size: 13px; color: #7f8c8d;">
                                <span style="display: flex; align-items: center; gap: 4px;"><strong>👤</strong> ${escapeHtml(log.username)}</span>
                                <span style="display: flex; align-items: center; gap: 4px;"><strong>🌐</strong> ${escapeHtml(log.ip)}</span>
                                <span style="display: flex; align-items: center; gap: 4px;"><strong>📅</strong> ${formattedDate}</span>
                                <span style="display: inline-block; padding: 3px 8px; border-radius: 10px; font-size: 10px; font-weight: 600; text-transform: uppercase; background: ${log.severity === 'CRITICAL' ? '#fadbd8' : log.severity === 'WARNING' ? '#fef5e7' : '#d5f4e6'}; color: ${bubbleColor};">${log.severity === 'CRITICAL' ? 'CRITIQUE' : log.severity === 'WARNING' ? 'AVERTISSEMENT' : 'INFO'}</span>
                            </div>
                        </div>
                        <div style="display: flex; flex-direction: column; align-items: flex-end; gap: 8px;">
                            <div style="font-size: 12px; color: #95a5a6; white-space: nowrap;">${timeAgo}</div>
                            <div style="display: flex; gap: 6px;">
                                <button onclick="toggleAuditLogDetails(event, this)" style="padding: 6px 12px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border: none; border-radius: 6px; font-size: 12px; font-weight: 600; cursor: pointer; box-shadow: 0 2px 4px rgba(0,0,0,0.1); transition: all 0.2s;" onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 4px 8px rgba(0,0,0,0.2)'" onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 2px 4px rgba(0,0,0,0.1)'">
                                    👁️ Voir détail
                                </button>
                                <button onclick="deleteAuditLog(event, '${log._id}')" style="padding: 6px 12px; background: linear-gradient(135deg, #e74c3c 0%, #c0392b 100%); color: white; border: none; border-radius: 6px; font-size: 12px; font-weight: 600; cursor: pointer; box-shadow: 0 2px 4px rgba(0,0,0,0.1); transition: all 0.2s;" onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 4px 8px rgba(0,0,0,0.2)'" onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 2px 4px rgba(0,0,0,0.1)'">
                                    🗑️ Supprimer
                                </button>
                            </div>
                        </div>
                    </div>
                    <div class="audit-log-details" style="max-height: 0; overflow: hidden; transition: max-height 0.3s ease;">
                        <div style="margin-top: 12px;">
                            ${enrichedDetails}
                        </div>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

/**
 * Basculer l'affichage des détails d'un log
 */
function toggleAuditLogDetails(event, button) {
    // Empêcher la propagation de l'événement
    if (event) event.stopPropagation();

    // Trouver le conteneur parent du log
    const logContainer = button.closest('[style*="border-left"]');
    const details = logContainer.querySelector('.audit-log-details');

    if (details.style.maxHeight === '0px' || !details.style.maxHeight) {
        details.style.maxHeight = '1000px';
        button.innerHTML = '🔼 Masquer détail';
        button.style.background = 'linear-gradient(135deg, #fc5c7d 0%, #6a82fb 100%)';
    } else {
        details.style.maxHeight = '0px';
        button.innerHTML = '👁️ Voir détail';
        button.style.background = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
    }
}

/**
 * Toggle affichage des dates personnalisées
 */
function toggleCustomAuditDates() {
    const period = document.getElementById('audit-filter-period').value;
    const customDatesDiv = document.getElementById('audit-custom-dates');

    if (period === 'custom') {
        customDatesDiv.style.display = 'grid';
        // Définir les dates par défaut (7 derniers jours)
        const today = new Date();
        const weekAgo = new Date(today);
        weekAgo.setDate(weekAgo.getDate() - 7);

        document.getElementById('audit-custom-end').value = today.toISOString().split('T')[0];
        document.getElementById('audit-custom-start').value = weekAgo.toISOString().split('T')[0];
    } else {
        customDatesDiv.style.display = 'none';
    }
}

/**
 * Appliquer les filtres
 */
function applyAuditFilters() {
    const severity = document.getElementById('audit-filter-severity').value;
    const username = document.getElementById('audit-filter-username').value.toLowerCase();
    const period = document.getElementById('audit-filter-period').value;

    let filtered = allAuditLogs.filter(log => {
        if (severity && log.severity !== severity) return false;
        if (username && !log.username.toLowerCase().includes(username)) return false;

        if (period !== 'all') {
            const logDate = new Date(log.timestamp);
            const now = new Date();
            const diffHours = (now - logDate) / (1000 * 60 * 60);

            if (period === '24h' && diffHours > 24) return false;
            if (period === '7d' && diffHours > 168) return false;
            if (period === '30d' && diffHours > 720) return false;

            // Période personnalisée
            if (period === 'custom') {
                const startDate = document.getElementById('audit-custom-start').value;
                const endDate = document.getElementById('audit-custom-end').value;

                if (startDate && endDate) {
                    const start = new Date(startDate);
                    start.setHours(0, 0, 0, 0);
                    const end = new Date(endDate);
                    end.setHours(23, 59, 59, 999);

                    if (logDate < start || logDate > end) return false;
                }
            }
        }

        return true;
    });

    displayAuditLogs(filtered);
}

/**
 * Supprimer un log individuel
 */
async function deleteAuditLog(event, logId) {
    // Empêcher la propagation
    if (event) event.stopPropagation();

    // Demander confirmation
    const confirmed = await customConfirm(
        'Êtes-vous sûr de vouloir supprimer ce log de sécurité ?',
        'Suppression de log',
        '🗑️'
    );

    if (!confirmed) return;

    try {
        const response = await fetch(`/api/security-logs/${logId}`, {
            method: 'DELETE',
            credentials: 'include'
        });

        const result = await response.json();

        if (result.success) {
            // Retirer le log de la liste
            allAuditLogs = allAuditLogs.filter(log => log._id !== logId);

            // Réappliquer les filtres pour rafraîchir l'affichage
            applyAuditFilters();

            // Message de succès
            showNotification('Log supprimé avec succès', 'success');
        } else {
            showNotification('Erreur: ' + result.message, 'error');
        }
    } catch (error) {
        console.error('❌ Erreur suppression log:', error);
        showNotification('Erreur lors de la suppression du log', 'error');
    }
}

/**
 * Supprimer tous les logs
 */
async function deleteAllAuditLogs() {
    // Première confirmation
    const confirmed1 = await customConfirm(
        '⚠️ ATTENTION: Vous allez supprimer TOUS les logs de sécurité.\n\nCette action est irréversible!\n\nÊtes-vous absolument sûr de vouloir continuer ?',
        'ATTENTION - Suppression totale',
        '⚠️'
    );

    if (!confirmed1) return;

    // Double confirmation pour être sûr
    const confirmed2 = await customConfirm(
        'Dernière confirmation: Voulez-vous vraiment supprimer TOUS les logs ?',
        'Confirmation finale',
        '🗑️'
    );

    if (!confirmed2) return;

    try {
        const response = await fetch('/api/security-logs/all', {
            method: 'DELETE',
            credentials: 'include'
        });

        const result = await response.json();

        if (result.success) {
            // Vider la liste locale
            allAuditLogs = [];

            // Rafraîchir l'affichage
            displayAuditLogs([]);

            // Rafraîchir les stats
            document.getElementById('audit-stat-info').textContent = '0';
            document.getElementById('audit-stat-warning').textContent = '0';
            document.getElementById('audit-stat-critical').textContent = '0';

            showNotification(`${result.deletedCount} log(s) supprimé(s) avec succès`, 'success');
        } else {
            showNotification('Erreur: ' + result.message, 'error');
        }
    } catch (error) {
        console.error('❌ Erreur suppression tous les logs:', error);
        showNotification('Erreur lors de la suppression des logs', 'error');
    }
}

/**
 * Réinitialiser les filtres
 */
function resetAuditFilters() {
    document.getElementById('audit-filter-severity').value = '';
    document.getElementById('audit-filter-username').value = '';
    document.getElementById('audit-filter-period').value = '7d';
    displayAuditLogs(allAuditLogs);
}

/**
 * Obtenir le temps écoulé depuis une date
 */
function getTimeAgo(date) {
    const seconds = Math.floor((new Date() - date) / 1000);

    if (seconds < 60) return 'À l\'instant';
    if (seconds < 3600) return `Il y a ${Math.floor(seconds / 60)} min`;
    if (seconds < 86400) return `Il y a ${Math.floor(seconds / 3600)} h`;
    return `Il y a ${Math.floor(seconds / 86400)} jour${Math.floor(seconds / 86400) > 1 ? 's' : ''}`;
}

/**
 * Échapper le HTML pour éviter XSS
 */
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ============================================
// NAVIGATION VERS LES PAGES DE TRAÇABILITÉ
// ============================================

/**
 * Navigation vers la page des logs de changements de profil
 * Réservée aux Super Administrateurs (Niveau 0)
 */
function navigateToProfileLogs() {
    console.log('🔐 Navigation vers logs de traçabilité...');
    window.location.href = '/profile-changes-logs.html';
}

/**
 * Navigation vers la page de gestion des sessions
 * Réservée aux Super Administrateurs (Niveau 0)
 */
function navigateToSessionsManagement() {
    console.log('🔐 Navigation vers gestion des sessions...');
    window.location.href = '/sessions-management.html';
}

// ============================================
// INITIALISATION
// ============================================

/**
 * Initialisation au chargement de la page
 */
document.addEventListener('DOMContentLoaded', () => {
    loadDashboard();
    checkMaintenanceStatus();  // Vérifier l'état de la maintenance

    // Auto-refresh toutes les 30 secondes (seulement pour le dashboard)
    // ✅ Stocké dans window pour pouvoir l'arrêter lors de la déconnexion
    window.dashboardRefreshInterval = setInterval(() => {
        if (state.currentSection === 'dashboard') {
            loadDashboard();
        }
    }, 30000);

    // ✅ Déconnexion automatique après 5 minutes d'inactivité
    const INACTIVITY_TIMEOUT = 5 * 60 * 1000; // 5 minutes en millisecondes

    function resetInactivityTimer() {
        // Annuler le timer précédent
        if (window.dashboardInactivityTimer) {
            clearTimeout(window.dashboardInactivityTimer);
        }

        // Créer un nouveau timer - stocké dans window pour pouvoir l'arrêter
        window.dashboardInactivityTimer = setTimeout(async () => {
            console.log('⏱️ Déconnexion automatique après 5 minutes d\'inactivité');

            // Afficher une notification
            const shouldLogout = await customConfirm({
                title: '⏱️ Session inactive',
                message: 'Vous allez être déconnecté dans 10 secondes en raison d\'inactivité.\n\nSouhaitez-vous rester connecté ?',
                confirmText: 'Rester connecté',
                cancelText: 'Se déconnecter',
                type: 'warning',
                icon: '⏱️'
            });

            if (shouldLogout) {
                // L'utilisateur a choisi de rester connecté, réinitialiser le timer
                console.log('✅ Utilisateur actif, réinitialisation du timer');
                resetInactivityTimer();
            } else {
                // Déconnexion automatique
                try {
                    await fetch('/api/logout', {
                        method: 'POST',
                        credentials: 'include'
                    });

                    // Afficher une notification avant de rediriger
                    await customAlert(
                        'Vous avez été déconnecté pour inactivité.\n\nPour votre sécurité, veuillez vous reconnecter.',
                        'Déconnexion automatique',
                        '🚪'
                    );
                    window.location.href = '/super-admin-login.html';
                } catch (error) {
                    console.error('Erreur déconnexion:', error);
                    window.location.href = '/super-admin-login.html';
                }
            }
        }, INACTIVITY_TIMEOUT);
    }

    // Événements qui réinitialisent le timer (activité de l'utilisateur)
    const activityEvents = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
    activityEvents.forEach(event => {
        document.addEventListener(event, resetInactivityTimer, true);
    });

    // Initialiser le timer au chargement
    resetInactivityTimer();

    console.log('✅ Déconnexion automatique activée (5 min d\'inactivité)');
});
