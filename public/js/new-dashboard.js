/**
 * NOUVEAU DASHBOARD GED CERER - JavaScript
 * Navigation hiérarchique + Pagination + Tri
 */

// ============================================
// MODALES PERSONNALISÉES UI/UX
// ============================================

let customConfirmResolve = null;
let customPromptResolve = null;

// Fonction pour afficher une alerte personnalisée
function customAlert(message, title = 'Information', icon = 'ℹ️') {
    return new Promise((resolve) => {
        document.getElementById('customAlertTitle').textContent = `${icon} ${title}`;
        document.getElementById('customAlertIcon').textContent = icon;
        document.getElementById('customAlertMessage').textContent = message;
        document.getElementById('customAlertModal').classList.add('active');

        window.closeCustomAlert = () => {
            document.getElementById('customAlertModal').classList.remove('active');
            resolve();
        };
    });
}

// Fonction pour afficher une confirmation personnalisée
function customConfirm(message, title = 'Confirmation', icon = '⚠️') {
    return new Promise((resolve) => {
        customConfirmResolve = resolve;
        document.getElementById('customConfirmTitle').textContent = `${icon} ${title}`;
        document.getElementById('customConfirmIcon').textContent = icon;
        document.getElementById('customConfirmMessage').textContent = message;
        document.getElementById('customConfirmModal').classList.add('active');
    });
}

window.resolveCustomConfirm = (result) => {
    document.getElementById('customConfirmModal').classList.remove('active');
    if (customConfirmResolve) {
        customConfirmResolve(result);
        customConfirmResolve = null;
    }
};

// Fonction pour afficher un prompt personnalisé
function customPrompt(message, title = 'Saisie', placeholder = 'Entrez votre réponse...') {
    return new Promise((resolve) => {
        customPromptResolve = resolve;
        document.getElementById('customPromptTitle').textContent = `✏️ ${title}`;
        document.getElementById('customPromptMessage').textContent = message;
        document.getElementById('customPromptInput').value = '';
        document.getElementById('customPromptInput').placeholder = placeholder;
        document.getElementById('customPromptModal').classList.add('active');

        // Focus sur l'input
        setTimeout(() => {
            document.getElementById('customPromptInput').focus();
        }, 100);

        // Permettre la validation avec Enter
        document.getElementById('customPromptInput').onkeyup = (e) => {
            if (e.key === 'Enter') {
                resolveCustomPrompt(document.getElementById('customPromptInput').value);
            }
        };
    });
}

window.resolveCustomPrompt = (result) => {
    document.getElementById('customPromptModal').classList.remove('active');
    if (customPromptResolve) {
        customPromptResolve(result);
        customPromptResolve = null;
    }
};

// ============================================
// VARIABLES GLOBALES
// ============================================

let currentUser = null;
let currentDepartment = null;
let currentService = null;
let currentServiceName = null;
let currentCategory = null;
let allDepartments = [];
let currentPage = 1;
let itemsPerPage = 20;
let currentSortBy = 'date';
let currentSortOrder = 'desc';
let totalDocuments = 0;

// ============================================
// SYSTÈME DE NOTIFICATIONS ÉLÉGANT
// ============================================

/**
 * Affiche une notification élégante (remplace alert)
 * @param {string} message - Le message à afficher
 * @param {string} type - Type: 'success', 'error', 'warning', 'info'
 * @param {number} duration - Durée en ms (0 = nécessite clic pour fermer)
 */
function showNotification(message, type = 'info', duration = 5000) {
    // Supprimer les anciennes notifications
    const existingNotif = document.getElementById('customNotification');
    if (existingNotif) {
        existingNotif.remove();
    }

    // Configuration des types
    const config = {
        success: {
            emoji: '✅',
            gradient: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
            shadow: '0 10px 40px rgba(16, 185, 129, 0.3)'
        },
        error: {
            emoji: '❌',
            gradient: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
            shadow: '0 10px 40px rgba(239, 68, 68, 0.3)'
        },
        warning: {
            emoji: '⚠️',
            gradient: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
            shadow: '0 10px 40px rgba(245, 158, 11, 0.3)'
        },
        info: {
            emoji: 'ℹ️',
            gradient: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
            shadow: '0 10px 40px rgba(59, 130, 246, 0.3)'
        },
        smile: {
            emoji: '😊',
            gradient: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
            shadow: '0 10px 40px rgba(139, 92, 246, 0.3)'
        }
    };

    const style = config[type] || config.info;

    // Créer la notification
    const notification = document.createElement('div');
    notification.id = 'customNotification';
    notification.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%) scale(0.7);
        background: ${style.gradient};
        color: white;
        padding: 30px 40px;
        border-radius: 20px;
        box-shadow: ${style.shadow};
        z-index: 999999;
        max-width: 500px;
        min-width: 300px;
        opacity: 0;
        transition: all 0.3s cubic-bezier(0.68, -0.55, 0.265, 1.55);
        backdrop-filter: blur(10px);
        text-align: center;
    `;

    notification.innerHTML = `
        <div style="font-size: 64px; margin-bottom: 20px; animation: bounce 0.6s ease;">${style.emoji}</div>
        <div style="font-size: 18px; line-height: 1.6; margin-bottom: 25px; white-space: pre-wrap;">${message}</div>
        <button onclick="this.closest('#customNotification').remove()" style="
            background: rgba(255, 255, 255, 0.2);
            border: 2px solid rgba(255, 255, 255, 0.5);
            color: white;
            padding: 12px 30px;
            border-radius: 10px;
            cursor: pointer;
            font-weight: 600;
            font-size: 16px;
            transition: all 0.2s;
            backdrop-filter: blur(5px);
        " onmouseover="this.style.background='rgba(255,255,255,0.3)'; this.style.transform='scale(1.05)'" onmouseout="this.style.background='rgba(255,255,255,0.2)'; this.style.transform='scale(1)'">
            OK
        </button>
    `;

    // Ajouter les animations CSS
    const styleEl = document.createElement('style');
    styleEl.textContent = `
        @keyframes bounce {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-20px); }
        }
    `;
    document.head.appendChild(styleEl);

    // Ajouter au DOM
    document.body.appendChild(notification);

    // Animation d'entrée
    setTimeout(() => {
        notification.style.opacity = '1';
        notification.style.transform = 'translate(-50%, -50%) scale(1)';
    }, 10);

    // Auto-fermeture
    if (duration > 0) {
        setTimeout(() => {
            notification.style.opacity = '0';
            notification.style.transform = 'translate(-50%, -50%) scale(0.7)';
            setTimeout(() => notification.remove(), 300);
        }, duration);
    }
}

// ============================================
// INITIALISATION
// ============================================

document.addEventListener('DOMContentLoaded', async () => {
    Logger.debug('🚀 Initialisation du nouveau dashboard');

    // Vérifier la session
    await checkSession();

    // Charger les données initiales
    await loadUserData();
    await loadDepartments();

    // Gérer les clics en dehors du menu utilisateur
    document.addEventListener('click', (event) => {
        const menu = document.getElementById('userMenu');
        const avatar = document.querySelector('.user-avatar');

        if (!menu.contains(event.target) && !avatar.contains(event.target)) {
            menu.classList.remove('active');
        }
    });

    // Gérer le changement de fichier
    const fileInput = document.getElementById('fileInput');
    if (fileInput) {
        fileInput.addEventListener('change', () => {
            if (fileInput.files.length > 0) {
                const file = fileInput.files[0];
                const fileName = file.name;
                const fileSize = (file.size / (1024 * 1024)).toFixed(2);
                document.getElementById('fileInfo').textContent =
                    `✅ ${fileName} (${fileSize} MB)`;
            }
        });
    }
});

// ============================================
// VÉRIFICATION SESSION
// ============================================

async function checkSession() {
    try {
        const response = await fetch('/api/session-check', {
            method: 'GET',
            credentials: 'include'
        });

        if (!response.ok) {
            // 🚫 Rediriger vers la porte principale avec message
            showAccessDeniedMessage();
            return false;
        }

        const data = await response.json();
        if (!data.authenticated) {
            // 🚫 Rediriger vers la porte principale avec message
            showAccessDeniedMessage();
            return false;
        }

        return true;
    } catch (error) {
        Logger.error('❌ Erreur vérification session:', error);
        // 🚫 Rediriger vers la porte principale avec message
        showAccessDeniedMessage();
        return false;
    }
}

// 🚫 Message pour redirection vers la porte principale
function showAccessDeniedMessage() {
    const message = `
        🚫 Accès Refusé

        😊 Démal diar si bountou KEER GUI FO GUISS DOUGOU

        (Par mesure de prudence, veuillez entrer par la porte principale)

        👉 Vous allez être redirigé vers la page de connexion principale...
    `;

    showNotification(message);

    Logger.debug('🚫 Tentative d\'accès direct à la version BETA bloquée');

    // Redirection vers la porte principale
    setTimeout(() => {
        window.location.href = '/';
    }, 2000);
}

// ============================================
// CHARGEMENT DONNÉES UTILISATEUR
// ============================================

async function loadUserData() {
    try {
        // Récupérer le username depuis sessionStorage ou depuis l'API de session
        let username = sessionStorage.getItem('username');

        if (!username) {
            // Récupérer depuis l'API de session
            const sessionResponse = await fetch('/api/session-check', {
                credentials: 'include'
            });

            if (sessionResponse.ok) {
                const sessionData = await sessionResponse.json();
                if (sessionData.authenticated && sessionData.username) {
                    username = sessionData.username;
                    // Stocker pour la prochaine fois
                    sessionStorage.setItem('username', username);
                } else {
                    Logger.error('❌ Pas de session active');
                    return;
                }
            } else {
                Logger.error('❌ Erreur récupération session');
                return;
            }
        }

        const response = await fetch(`/api/users/${username}`, {
            credentials: 'include'
        });

        if (!response.ok) {
            throw new Error('Erreur chargement utilisateur');
        }

        const result = await response.json();
        currentUser = result.user || result; // ✅ CORRECTION: Extraire l'objet user

        // ✅ Normaliser les propriétés pour compatibilité
        if (currentUser.roleNiveau !== undefined) {
            currentUser.niveau = currentUser.roleNiveau;
        }
        if (currentUser.departement && !currentUser.departementNom) {
            currentUser.departementNom = currentUser.departement;
        }

        // 🔒 SÉCURITÉ: Bloquer le niveau 0 (Super Admin)
        if (currentUser.niveau === 0) {
            const message = `
                ⛔ Accès Refusé

                Vous êtes Super Administrateur (Niveau 0).

                👉 Veuillez utiliser l'interface dédiée aux Super Admins.

                Vous allez être redirigé dans 3 secondes...
            `;

            showNotification(message);

            Logger.debug(`🔒 Niveau 0 bloqué: ${username} redirigé vers interface Super Admin`);

            // Redirection vers interface Super Admin
            setTimeout(() => {
                window.location.href = '/super-admin-login.html';
            }, 3000);

            return;
        }

        // Mettre à jour l'interface
        updateUserInterface();

        Logger.debug('✅ Utilisateur chargé:', currentUser);
    } catch (error) {
        Logger.error('❌ Erreur chargement utilisateur:', error);
    }
}

function updateUserInterface() {
    if (!currentUser) return;

    // Le username peut être dans currentUser.username ou récupéré du sessionStorage
    const username = currentUser.username || sessionStorage.getItem('username') || 'User';

    // Nom complet
    const fullName = currentUser.nom || username;

    // Initiales pour avatar
    const initials = currentUser.nom?.substring(0, 2).toUpperCase()
                     || username.substring(0, 2).toUpperCase();

    // Mettre à jour le topbar
    document.getElementById('userName').textContent = fullName;
    document.getElementById('userDepartment').textContent = currentUser.departementNom || 'Sans département';
    document.getElementById('userLevel').textContent = `NIVEAU ${currentUser.niveau || '?'}`;

    // Mettre à jour l'avatar avec les initiales
    const avatarInitials = document.getElementById('avatarInitials');
    if (avatarInitials) {
        avatarInitials.textContent = initials;
    }

    // Charger la photo de profil
    loadAvatarPhoto(username);

    // Mettre à jour le menu
    document.getElementById('menuUserName').textContent = fullName;
    document.getElementById('menuUserEmail').textContent = currentUser.email || username + '@ucad.edu.sn';
}

// Charger la photo de profil dans l'avatar
async function loadAvatarPhoto(username) {
    try {
        const apiUrl = '/api';
        const response = await fetch(`${apiUrl}/profile/photo/${username}`, {
            credentials: 'include'
        });

        if (response.ok) {
            const data = await response.json();
            if (data.success && data.photo) {
                const avatarPhoto = document.getElementById('avatarPhoto');
                const avatarInitials = document.getElementById('avatarInitials');

                if (avatarPhoto && avatarInitials) {
                    avatarPhoto.src = data.photo;
                    avatarPhoto.style.display = 'block';
                    avatarInitials.style.display = 'none';
                }
            }
        }
    } catch (error) {
        Logger.debug('Aucune photo de profil disponible');
    }
}

// ============================================
// MENU UTILISATEUR
// ============================================

function toggleUserMenu() {
    const menu = document.getElementById('userMenu');
    menu.classList.toggle('active');
}

async function logout() {
    try {
        await fetch('/api/logout', {
            method: 'POST',
            credentials: 'include'
        });

        sessionStorage.clear();
        window.location.href = '/login.html';
    } catch (error) {
        Logger.error('❌ Erreur déconnexion:', error);
    }
}

// ============================================
// CHARGEMENT DÉPARTEMENTS
// ============================================

async function loadDepartments() {
    try {
        Logger.debug('📂 Chargement des départements...');

        const response = await fetch('/api/departements', {
            credentials: 'include'
        });

        if (!response.ok) {
            throw new Error('Erreur chargement départements');
        }

        const data = await response.json();
        allDepartments = data.departements || [];

        Logger.debug(`✅ ${allDepartments.length} département(s) chargé(s)`);

        // Afficher les départements
        displayDepartments();

        // Mettre à jour les statistiques
        updateStats();

    } catch (error) {
        Logger.error('❌ Erreur chargement départements:', error);
        document.getElementById('departmentsGrid').innerHTML =
            '<div class="no-results"><div class="no-results-icon">❌</div><h3>Erreur de chargement</h3></div>';
    }
}

function displayDepartments() {
    const grid = document.getElementById('departmentsGrid');

    if (allDepartments.length === 0) {
        grid.innerHTML = `
            <div class="no-results">
                <div class="no-results-icon">📁</div>
                <h3>Aucun département</h3>
                <p>Contactez l'administrateur pour créer des départements</p>
            </div>
        `;
        return;
    }

    grid.innerHTML = allDepartments.map(dept => `
        <div class="dept-card" onclick="showDepartment('${dept._id}')">
            <div class="dept-header">
                <h3>🏢 ${escapeHtml(dept.nom)}</h3>
                <p>${escapeHtml(dept.description || 'Département universitaire')}</p>
            </div>
            <div class="dept-stats">
                <div class="dept-stat">
                    <div class="dept-stat-icon">📂</div>
                    <div class="dept-stat-info">
                        <div class="dept-stat-label">Services</div>
                        <div class="dept-stat-value">${dept.servicesCount || 0}</div>
                    </div>
                </div>
                <div class="dept-stat">
                    <div class="dept-stat-icon">📄</div>
                    <div class="dept-stat-info">
                        <div class="dept-stat-label">Documents</div>
                        <div class="dept-stat-value">${dept.documentsCount || 0}</div>
                    </div>
                </div>
                <div class="dept-stat">
                    <div class="dept-stat-icon">💾</div>
                    <div class="dept-stat-info">
                        <div class="dept-stat-label">Espace</div>
                        <div class="dept-stat-value">${formatFileSize(dept.totalSize || 0)}</div>
                    </div>
                </div>
                <div class="dept-stat">
                    <div class="dept-stat-icon">👥</div>
                    <div class="dept-stat-info">
                        <div class="dept-stat-label">Utilisateurs</div>
                        <div class="dept-stat-value">${dept.usersCount || 0}</div>
                    </div>
                </div>
            </div>
            <div class="dept-footer">
                <div class="dept-activity">📊 Dernière activité: ${formatDate(dept.lastActivity)}</div>
                <button class="dept-btn" onclick="event.stopPropagation(); showDepartment('${dept._id}')">
                    Explorer →
                </button>
            </div>
        </div>
    `).join('');
}

function updateStats() {
    // Calculer les statistiques globales
    let totalServices = 0;
    let totalDocs = 0;

    allDepartments.forEach(dept => {
        totalServices += dept.servicesCount || 0;
        totalDocs += dept.documentsCount || 0;
    });

    document.getElementById('statDepts').textContent = allDepartments.length;
    document.getElementById('statServices').textContent = totalServices;
    document.getElementById('statDocuments').textContent = totalDocs;
}

// ============================================
// NAVIGATION DÉPARTEMENT
// ============================================

async function showDepartment(deptId) {
    try {
        Logger.debug(`📂 Affichage département: ${deptId}`);

        // Trouver le département
        currentDepartment = allDepartments.find(d => d._id.toString() === deptId.toString());

        if (!currentDepartment) {
            showNotification('Département non trouvé');
            return;
        }

        // Cacher la vue home, afficher la vue département
        document.getElementById('homeView').style.display = 'none';
        document.getElementById('departmentView').classList.add('active');

        // Mettre à jour le titre
        document.getElementById('currentDeptName').textContent = currentDepartment.nom;
        document.getElementById('deptTitle').textContent = '🏢 ' + currentDepartment.nom;
        document.getElementById('breadcrumbDept').textContent = currentDepartment.nom;

        // Charger les services
        await loadServices(deptId);

        window.scrollTo(0, 0);
    } catch (error) {
        Logger.error('❌ Erreur affichage département:', error);
    }
}

async function loadServices(deptId) {
    try {
        Logger.debug(`📂 Chargement services du département ${deptId}...`);

        const response = await fetch(`/api/services/departments/${deptId}`, {
            credentials: 'include'
        });

        if (!response.ok) {
            throw new Error('Erreur chargement services');
        }

        const data = await response.json();
        const services = data.services || [];

        Logger.debug(`✅ ${services.length} service(s) chargé(s)`);

        // Mettre à jour les statistiques du département
        document.getElementById('deptStatServices').textContent = services.length;

        // Calculer le nombre total de documents du département
        let totalDocs = 0;
        services.forEach(service => {
            totalDocs += service.documentsCount || 0;
        });
        document.getElementById('deptStatDocuments').textContent = totalDocs;

        // Afficher les services en accordéon
        displayServices(services);

    } catch (error) {
        Logger.error('❌ Erreur chargement services:', error);
        document.getElementById('servicesAccordion').innerHTML =
            '<div class="loading">❌ Erreur de chargement des services</div>';
    }
}

function displayServices(services) {
    const accordion = document.getElementById('servicesAccordion');

    if (services.length === 0) {
        accordion.innerHTML = `
            <div class="no-results">
                <div class="no-results-icon">📂</div>
                <h3>Aucun service</h3>
                <p>Ce département ne contient aucun service pour le moment</p>
            </div>
        `;
        return;
    }

    accordion.innerHTML = services.map((service, index) => `
        <div class="accordion-item">
            <div class="accordion-header" onclick="toggleAccordion(this, '${service._id}')">
                <div class="accordion-title">
                    <span>📂</span>
                    <span>${escapeHtml(service.nom)}</span>
                    <span class="accordion-badge" id="service-badge-${service._id}"></span>
                </div>
                <div style="display: flex; align-items: center; gap: 16px;">
                    <button class="action-btn edit-btn" onclick="event.stopPropagation(); openEditServiceModal('${service._id}', '${escapeHtml(service.nom)}', '${service.icon || ''}', '${escapeHtml(service.description || '')}')" title="Modifier">✏️</button>
                    <button class="action-btn delete-btn" onclick="event.stopPropagation(); deleteService('${service._id}', '${escapeHtml(service.nom)}')" title="Supprimer">🗑️</button>
                    <span class="accordion-icon">▼</span>
                </div>
            </div>
            <div class="accordion-content" id="accordion-${service._id}">
                <div class="category-list">
                    <div class="loading">Chargement des catégories...</div>
                </div>
            </div>
        </div>
    `).join('');
}

async function toggleAccordion(header, serviceId) {
    const content = header.nextElementSibling;
    const isActive = header.classList.contains('active');

    // Extraire le nom du service depuis le header
    const serviceName = header.querySelector('.accordion-title span:nth-child(2)')?.textContent.trim() || 'Service';

    // Fermer tous les autres accordéons
    document.querySelectorAll('.accordion-header').forEach(h => {
        if (h !== header) {
            h.classList.remove('active');
            h.nextElementSibling.classList.remove('active');
        }
    });

    // Toggle l'accordéon actuel
    header.classList.toggle('active');
    content.classList.toggle('active');

    // Charger les catégories si ouvert et pas encore chargé
    if (!isActive && content.dataset.loaded !== 'true') {
        // Stocker le nom du service pour le breadcrumb
        currentServiceName = serviceName;
        await loadCategories(serviceId);
        content.dataset.loaded = 'true';
    }
}

async function loadCategories(serviceId) {
    try {
        Logger.debug(`🏷️ Chargement catégories...`);

        currentService = serviceId;

        // UTILISER L'ANCIEN SYSTÈME pour compatibilité avec données existantes
        const username = currentUser?.username || sessionStorage.getItem('username');

        // Charger les catégories
        const categoriesResponse = await fetch(`/api/categories/${username}`, {
            credentials: 'include'
        });

        if (!categoriesResponse.ok) {
            throw new Error('Erreur chargement catégories');
        }

        const categories = await categoriesResponse.json();

        Logger.debug(`✅ ${categories.length} catégorie(s) chargée(s)`);

        // Charger tous les documents de l'utilisateur pour compter par catégorie
        const documentsResponse = await fetch(`/api/documents/${username}?full=false`, {
            credentials: 'include'
        });

        if (documentsResponse.ok) {
            const documentsData = await documentsResponse.json();
            const allDocuments = documentsData.documents || [];

            // ✅ CORRECTION: Compter le nombre de documents par catégorie ET par service
            categories.forEach(cat => {
                cat.documentsCount = allDocuments.filter(doc =>
                    doc.categorie === cat.nom &&
                    (!currentServiceName || doc.serviceArchivage === currentServiceName)
                ).length;
            });

            Logger.debug(`📊 Comptage documents par catégorie effectué pour le service "${currentServiceName}"`);
        } else {
            Logger.warn('⚠️ Impossible de charger les documents pour le comptage');
        }

        // Afficher TOUTES les catégories (pour compatibilité)
        displayCategories(serviceId, categories);

        // Mettre à jour le badge du service
        document.getElementById(`service-badge-${serviceId}`).textContent =
            `${categories.length} catégories`;

    } catch (error) {
        Logger.error('❌ Erreur chargement catégories:', error);
        document.getElementById(`accordion-${serviceId}`).innerHTML =
            '<div class="loading">❌ Erreur de chargement des catégories</div>';
    }
}

function displayCategories(serviceId, categories) {
    const content = document.getElementById(`accordion-${serviceId}`);

    // Bouton ajouter catégorie
    const addButton = `
        <div style="padding: 15px 20px; background: white; border-bottom: 2px solid #e1e8ed;">
            <button class="add-btn" onclick="event.stopPropagation(); openAddCategoryModal('${serviceId}')" style="width: 100%;">
                ➕ Ajouter une catégorie
            </button>
        </div>
    `;

    if (categories.length === 0) {
        content.innerHTML = `
            ${addButton}
            <div class="category-list">
                <div class="no-results">
                    <div class="no-results-icon">🏷️</div>
                    <p>Aucune catégorie dans ce service</p>
                </div>
            </div>
        `;
        return;
    }

    content.innerHTML = `
        ${addButton}
        <div class="category-list">
            ${categories.map(cat => `
                <div class="category-item" onclick="showDocuments('${cat.id}', '${escapeHtml(cat.nom)}')">
                    <div class="category-info">
                        <span class="category-icon">🏷️</span>
                        <span class="category-name">${escapeHtml(cat.nom)}</span>
                    </div>
                    <span class="category-count">${cat.documentsCount || 0} docs</span>
                </div>
            `).join('')}
        </div>
    `;
}

// ============================================
// AFFICHAGE DOCUMENTS
// ============================================

async function showDocuments(categoryId, categoryName) {
    try {
        Logger.debug(`📄 Affichage documents de la catégorie ${categoryName}...`);

        // ✅ CORRECTION: Utiliser le NOM de la catégorie pour le filtrage, pas l'ID
        // car doc.categorie contient le nom, pas l'ID
        currentCategory = categoryName;
        currentPage = 1; // Reset à la page 1

        // Mettre à jour le breadcrumb et titre
        document.getElementById('currentServiceName').textContent = currentServiceName || 'Service';
        document.getElementById('currentCategoryName').textContent = categoryName;
        document.getElementById('categoryTitle').textContent = categoryName;

        // Afficher la section documents
        document.getElementById('documentsSection').classList.remove('hidden');

        // Charger les documents
        await loadDocuments();

        // Scroll vers les documents
        setTimeout(() => {
            document.getElementById('documentsSection').scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }, 100);

    } catch (error) {
        Logger.error('❌ Erreur affichage documents:', error);
    }
}

async function loadDocuments() {
    try {
        Logger.debug(`📄 Chargement documents de la catégorie: "${currentCategory}"...`);

        // UTILISER L'ANCIEN SYSTÈME pour compatibilité
        const username = currentUser?.username || sessionStorage.getItem('username');

        const response = await fetch(`/api/documents/${username}?full=false`, {
            credentials: 'include'
        });

        if (!response.ok) {
            throw new Error('Erreur chargement documents');
        }

        const responseData = await response.json();
        let allDocuments = responseData.documents || [];

        Logger.debug(`📊 DEBUG: ${allDocuments.length} document(s) total chargé(s)`);

        // Afficher les catégories uniques pour debug
        if (allDocuments.length > 0) {
            const uniqueCategories = [...new Set(allDocuments.map(d => d.categorie))];
            Logger.debug(`📊 DEBUG: Catégories disponibles:`, uniqueCategories);
            Logger.debug(`📊 DEBUG: Catégorie recherchée: "${currentCategory}"`);
            Logger.debug(`📊 DEBUG: Premier document:`, allDocuments[0]);
        }

        // ✅ CORRECTION: Filtrer par catégorie ET par service
        let documents = allDocuments.filter(doc => {
            // Filtrage par catégorie
            const matchCategory = doc.categorie === currentCategory;

            // ✅ NOUVEAU: Filtrage par service (similitude avec version classique)
            // Si on est dans un service, ne montrer QUE les documents de ce service
            const matchService = !currentServiceName || doc.serviceArchivage === currentServiceName;

            const match = matchCategory && matchService;

            if (!match && allDocuments.length < 20) { // Log seulement si peu de docs
                if (!matchCategory) {
                    Logger.debug(`📊 DEBUG: Document "${doc.titre}" - catégorie="${doc.categorie}" ne match pas "${currentCategory}"`);
                }
                if (!matchService) {
                    Logger.debug(`📊 DEBUG: Document "${doc.titre}" - service="${doc.serviceArchivage}" ne match pas "${currentServiceName}"`);
                }
            }
            return match;
        });

        Logger.debug(`📊 DEBUG: ${documents.length} document(s) après filtrage par catégorie${currentServiceName ? ' et service' : ''}`);

        // Tri
        documents = sortDocumentsArray(documents, currentSortBy, currentSortOrder);

        totalDocuments = documents.length;

        // Pagination côté client
        const start = (currentPage - 1) * itemsPerPage;
        const end = start + itemsPerPage;
        const paginatedDocs = documents.slice(start, end);

        Logger.debug(`✅ ${paginatedDocs.length} document(s) chargé(s) sur ${totalDocuments}`);

        // Afficher les documents
        displayDocuments(paginatedDocs);

        // Mettre à jour le compteur
        document.getElementById('docCount').textContent = totalDocuments;

        // Mettre à jour la pagination
        const totalPages = Math.ceil(totalDocuments / itemsPerPage);
        updatePagination({
            currentPage: currentPage,
            totalPages: totalPages,
            totalDocuments: totalDocuments,
            limit: itemsPerPage,
            hasNextPage: currentPage < totalPages,
            hasPrevPage: currentPage > 1
        });

    } catch (error) {
        Logger.error('❌ Erreur chargement documents:', error);
        document.getElementById('documentsGrid').innerHTML =
            '<div class="no-results"><div class="no-results-icon">❌</div><h3>Erreur de chargement</h3></div>';
    }
}

// Fonction helper pour trier les documents
function sortDocumentsArray(docs, sortBy, order) {
    return docs.sort((a, b) => {
        let valA, valB;

        if (sortBy === 'name') {
            valA = (a.titre || '').toLowerCase();
            valB = (b.titre || '').toLowerCase();
        } else if (sortBy === 'size') {
            valA = a.taille || 0;
            valB = b.taille || 0;
        } else { // date
            valA = new Date(a.dateAjout || 0);
            valB = new Date(b.dateAjout || 0);
        }

        if (order === 'asc') {
            return valA > valB ? 1 : valA < valB ? -1 : 0;
        } else {
            return valA < valB ? 1 : valA > valB ? -1 : 0;
        }
    });
}

function displayDocuments(documents) {
    const grid = document.getElementById('documentsGrid');

    if (documents.length === 0) {
        grid.innerHTML = `
            <div class="no-results">
                <div class="no-results-icon">📄</div>
                <h3>Aucun document</h3>
                <p>Cette catégorie ne contient aucun document</p>
            </div>
        `;
        return;
    }

    grid.innerHTML = documents.map(doc => `
        <div class="doc-card" onclick="openDocument('${doc._id}')" data-id="${escapeHtml(doc.idDocument || doc._id || '')}">
            <div class="doc-icon">${getFileIcon(doc.titre)}</div>
            <div class="doc-title" title="${escapeHtml(doc.titre)}">${escapeHtml(doc.titre)}</div>
            <div class="doc-meta">
                ${doc.categorie ? `<div title="Catégorie">🏷️ ${escapeHtml(doc.categorie)}</div>` : ''}
                ${doc.serviceName ? `<div title="Service">📂 ${escapeHtml(doc.serviceName)}</div>` :
                  doc.departementNom ? `<div title="Département">🏢 ${escapeHtml(doc.departementNom)}</div>` : ''}
                <div title="Date d'ajout">📅 ${formatDate(doc.dateAjout)}</div>
                <div title="Taille">💾 ${formatFileSize(doc.taille)}</div>
            </div>
        </div>
    `).join('');
}

function hideDocuments() {
    document.getElementById('documentsSection').classList.add('hidden');
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ============================================
// PAGINATION
// ============================================

function updatePagination(pagination) {
    const { currentPage: page, totalPages, totalDocuments: total, limit, hasNextPage, hasPrevPage } = pagination;

    // Mettre à jour l'info
    const start = (page - 1) * limit + 1;
    const end = Math.min(page * limit, total);
    document.getElementById('paginationInfo').textContent =
        `Affichage ${start}-${end} sur ${total} documents`;

    // Générer les boutons
    let paginationHTML = '';

    // Bouton Précédent
    paginationHTML += `
        <button class="pagination-btn" onclick="goToPage(${page - 1})" ${!hasPrevPage ? 'disabled' : ''}>
            ← Précédent
        </button>
    `;

    // Numéros de pages
    if (totalPages <= 7) {
        // Afficher toutes les pages
        for (let i = 1; i <= totalPages; i++) {
            paginationHTML += `
                <button class="pagination-btn ${i === page ? 'active' : ''}" onclick="goToPage(${i})">
                    ${i}
                </button>
            `;
        }
    } else {
        // Afficher avec ellipses
        paginationHTML += `<button class="pagination-btn ${page === 1 ? 'active' : ''}" onclick="goToPage(1)">1</button>`;

        if (page > 3) {
            paginationHTML += '<span class="pagination-ellipsis">...</span>';
        }

        const startPage = Math.max(2, page - 1);
        const endPage = Math.min(totalPages - 1, page + 1);

        for (let i = startPage; i <= endPage; i++) {
            paginationHTML += `
                <button class="pagination-btn ${i === page ? 'active' : ''}" onclick="goToPage(${i})">
                    ${i}
                </button>
            `;
        }

        if (page < totalPages - 2) {
            paginationHTML += '<span class="pagination-ellipsis">...</span>';
        }

        paginationHTML += `
            <button class="pagination-btn ${page === totalPages ? 'active' : ''}" onclick="goToPage(${totalPages})">
                ${totalPages}
            </button>
        `;
    }

    // Bouton Suivant
    paginationHTML += `
        <button class="pagination-btn" onclick="goToPage(${page + 1})" ${!hasNextPage ? 'disabled' : ''}>
            Suivant →
        </button>
    `;

    document.getElementById('pagination').innerHTML = paginationHTML;
}

async function goToPage(page) {
    currentPage = page;
    await loadDocuments();

    // Scroll vers le haut des documents
    document.getElementById('documentsSection').scrollIntoView({
        behavior: 'smooth',
        block: 'start'
    });
}

async function sortDocuments() {
    const sortValue = document.getElementById('sortSelect').value;
    const [sortBy, order] = sortValue.split('-');

    currentSortBy = sortBy;
    currentSortOrder = order;
    currentPage = 1; // Reset à la page 1

    await loadDocuments();
}

async function changePerPage() {
    itemsPerPage = parseInt(document.getElementById('perPageSelect').value);
    currentPage = 1; // Reset à la page 1

    await loadDocuments();
}

// ============================================
// FILTRAGE LOCAL
// ============================================

// Variable pour stocker le timer de debounce
let filterDebounceTimer = null;

// Fonction de debounce pour éviter trop d'appels
function debounceFilter() {
    // Annuler le timer précédent
    if (filterDebounceTimer) {
        clearTimeout(filterDebounceTimer);
    }

    // Créer un nouveau timer
    filterDebounceTimer = setTimeout(() => {
        filterDocuments();
    }, 300); // Attendre 300ms après la dernière frappe
}

function filterDocuments() {
    const input = document.getElementById('documentFilterInput');
    if (!input) return;

    const query = input.value.toLowerCase().trim();
    const docCards = document.querySelectorAll('#documentsGrid .doc-card');

    // Optimisation : si la recherche est vide, afficher tous les documents immédiatement
    if (!query) {
        docCards.forEach(card => {
            card.style.display = 'block';
        });
        return;
    }

    // Filtrer les documents
    let visibleCount = 0;
    docCards.forEach(card => {
        const title = card.querySelector('.doc-title')?.textContent.toLowerCase() || '';
        const meta = card.querySelector('.doc-meta')?.textContent.toLowerCase() || '';
        const docId = (card.getAttribute('data-id') || '').toLowerCase();

        if (title.includes(query) || meta.includes(query) || docId.includes(query)) {
            card.style.display = 'block';
            visibleCount++;
        } else {
            card.style.display = 'none';
        }
    });

    // Optionnel : afficher un message si aucun résultat
    Logger.debug(`🔍 Filtre: ${visibleCount} document(s) trouvé(s) sur ${docCards.length}`);
}

// ============================================
// RECHERCHE GLOBALE
// ============================================

async function performGlobalSearch() {
    const query = document.getElementById('globalSearchInput').value.trim();

    if (!query || query.length < 2) {
        document.getElementById('searchResults').classList.add('hidden');
        return;
    }

    try {
        Logger.debug(`🔍 Recherche globale: "${query}"`);

        // Afficher un loader
        const resultsDiv = document.getElementById('searchResults');
        resultsDiv.classList.remove('hidden');
        resultsDiv.innerHTML = '<div class="loading">🔍 Recherche en cours...</div>';

        // Récupérer les filtres
        const filterServices = document.getElementById('filterServices').checked;
        const filterCategories = document.getElementById('filterCategories').checked;
        const filterDocuments = document.getElementById('filterDocuments').checked;

        // Effectuer la recherche
        const response = await fetch(`/api/search?q=${encodeURIComponent(query)}`, {
            credentials: 'include'
        });

        if (!response.ok) {
            throw new Error('Erreur lors de la recherche');
        }

        const data = await response.json();

        // Afficher les résultats
        displaySearchResults(data, query, { filterServices, filterCategories, filterDocuments });

        Logger.debug('✅ Recherche terminée:', data);
    } catch (error) {
        Logger.error('❌ Erreur recherche:', error);
        document.getElementById('searchResults').innerHTML = `
            <div class="no-results">
                <div class="no-results-icon">❌</div>
                <h3>Erreur de recherche</h3>
                <p>${escapeHtml(error.message)}</p>
            </div>
        `;
    }
}

function displaySearchResults(data, query, filters) {
    const resultsDiv = document.getElementById('searchResults');

    const services = (filters.filterServices && data.services) ? data.services : [];
    const categories = (filters.filterCategories && data.categories) ? data.categories : [];
    const documents = (filters.filterDocuments && data.documents) ? data.documents : [];

    const totalResults = services.length + categories.length + documents.length;

    if (totalResults === 0) {
        resultsDiv.innerHTML = `
            <div class="no-results">
                <div class="no-results-icon">🔍</div>
                <h3>Aucun résultat trouvé</h3>
                <p>Aucun élément ne correspond à "${escapeHtml(query)}"</p>
            </div>
        `;
        return;
    }

    let html = `
        <h2>🔍 Résultats de recherche pour "${escapeHtml(query)}" (${totalResults} résultat${totalResults > 1 ? 's' : ''})</h2>
    `;

    // Afficher les services
    if (services.length > 0) {
        html += `
            <div class="result-group">
                <h3>📂 Services (${services.length})</h3>
                ${services.map(service => `
                    <div class="result-item" onclick="navigateToService('${service.departmentId}', '${service._id}')">
                        <div class="result-info">
                            <div class="result-title">📂 ${escapeHtml(service.nom)}</div>
                            <div class="result-breadcrumb">
                                🏢 ${escapeHtml(service.departmentName || 'Département')}
                            </div>
                            <div class="result-meta">${service.categoriesCount || 0} catégories</div>
                        </div>
                        <div class="result-badge">Service</div>
                    </div>
                `).join('')}
            </div>
        `;
    }

    // Afficher les catégories
    if (categories.length > 0) {
        html += `
            <div class="result-group">
                <h3>🏷️ Catégories (${categories.length})</h3>
                ${categories.map(category => `
                    <div class="result-item" onclick="navigateToCategory('${category.departmentId}', '${category.serviceId}', '${escapeHtml(category.nom)}', '${escapeHtml(category.nom)}')">
                        <div class="result-info">
                            <div class="result-title">🏷️ ${escapeHtml(category.nom)}</div>
                            <div class="result-breadcrumb">
                                🏢 ${escapeHtml(category.departmentName || 'Département')} ›
                                📂 ${escapeHtml(category.serviceName || 'Service')}
                            </div>
                            <div class="result-meta">${category.documentsCount || 0} documents</div>
                        </div>
                        <div class="result-badge">Catégorie</div>
                    </div>
                `).join('')}
            </div>
        `;
    }

    // Afficher les documents
    if (documents.length > 0) {
        html += `
            <div class="result-group">
                <h3>📄 Documents (${documents.length})</h3>
                ${documents.map(doc => `
                    <div class="result-item" onclick="openDocument('${doc._id}')">
                        <div class="result-info">
                            <div class="result-title">${getFileIcon(doc.titre)} ${escapeHtml(doc.titre)}</div>
                            <div class="result-breadcrumb">
                                🏢 ${escapeHtml(doc.departmentName || 'Département')} ›
                                📂 ${escapeHtml(doc.serviceName || 'Service')} ›
                                🏷️ ${escapeHtml(doc.categoryName || 'Catégorie')}
                            </div>
                            <div class="result-meta">
                                💾 ${formatFileSize(doc.taille)} •
                                📅 ${formatDate(doc.dateAjout)} •
                                👤 ${escapeHtml(doc.idUtilisateur)}
                            </div>
                        </div>
                        <div class="result-badge">Document</div>
                    </div>
                `).join('')}
            </div>
        `;
    }

    resultsDiv.innerHTML = html;
}

function navigateToService(departmentId, serviceId) {
    // Naviguer vers le département et ouvrir le service
    showDepartment(departmentId).then(() => {
        // Trouver et cliquer sur le header du service
        setTimeout(() => {
            const serviceHeader = document.querySelector(`[onclick*="'${serviceId}'"]`);
            if (serviceHeader) {
                serviceHeader.click();
                serviceHeader.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        }, 500);
    });
}

function navigateToCategory(departmentId, serviceId, categoryId, categoryName) {
    // Naviguer vers le département, ouvrir le service, puis afficher les documents
    showDepartment(departmentId).then(() => {
        setTimeout(() => {
            const serviceHeader = document.querySelector(`[onclick*="'${serviceId}'"]`);
            if (serviceHeader) {
                serviceHeader.click();
                setTimeout(() => {
                    showDocuments(categoryId, categoryName);
                }, 500);
            }
        }, 500);
    });
}

// ============================================
// MODALS
// ============================================

function openAddDepartmentModal() {
    // Vérifier les permissions (SEUL Niveau 0 = Super Admin)
    if (!currentUser || currentUser.niveau !== 0) {
        showNotification(' Accès refusé\n\nSeul le Super Administrateur (Niveau 0) peut créer des départements.');
        return;
    }

    // Réinitialiser le formulaire
    document.getElementById('deptName').value = '';
    document.getElementById('deptIcon').value = '';
    document.getElementById('deptDescription').value = '';

    document.getElementById('addDepartmentModal').classList.add('active');
}

function closeAddDepartmentModal() {
    document.getElementById('addDepartmentModal').classList.remove('active');
}

async function submitDepartment(event) {
    event.preventDefault();

    try {
        const deptName = document.getElementById('deptName').value.trim();
        const deptIcon = document.getElementById('deptIcon').value.trim();
        const deptDescription = document.getElementById('deptDescription').value.trim();

        if (!deptName) {
            showNotification(' Le nom du département est obligatoire');
            return;
        }

        Logger.debug('🏢 Création département:', { deptName, deptIcon, deptDescription });

        // Créer le département
        const response = await fetch('/api/departements', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
                nom: deptName,
                icon: deptIcon,
                description: deptDescription
            })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Erreur lors de la création');
        }

        const result = await response.json();

        Logger.debug('✅ Département créé:', result);

        // Fermer le modal
        closeAddDepartmentModal();

        // Recharger les départements
        await loadDepartments();

        showNotification(` Département "${deptName}" créé avec succès !`);

    } catch (error) {
        Logger.error('❌ Erreur création département:', error);
        showNotification(` Erreur: ${error.message}`);
    }
}

function openAddServiceModal() {
    // Vérifier qu'on est dans un département
    if (!currentDepartment) {
        showNotification(' Veuillez d\'abord sélectionner un département');
        return;
    }

    // Vérifier les permissions (Niveau 0, 1 ou 2)
    if (!currentUser || currentUser.niveau > 2) {
        showNotification(' Accès refusé\n\nVous devez être Niveau 0, 1 ou 2 pour créer un service.');
        return;
    }

    // Réinitialiser le formulaire en mode création
    document.getElementById('serviceId').value = '';
    document.getElementById('serviceName').value = '';
    document.getElementById('serviceIcon').value = '';
    document.getElementById('serviceDescription').value = '';
    document.getElementById('serviceModalTitle').textContent = '📂 Ajouter un service';
    document.getElementById('serviceSubmitBtn').textContent = 'Créer le service';

    document.getElementById('addServiceModal').classList.add('active');
}

function openEditServiceModal(serviceId, serviceName, serviceIcon, serviceDescription) {
    // Vérifier les permissions (Niveau 0, 1 ou 2)
    if (!currentUser || currentUser.niveau > 2) {
        showNotification(' Accès refusé\n\nVous devez être Niveau 0, 1 ou 2 pour modifier un service.');
        return;
    }

    // Remplir le formulaire avec les données existantes
    document.getElementById('serviceId').value = serviceId;
    document.getElementById('serviceName').value = serviceName;
    document.getElementById('serviceIcon').value = serviceIcon;
    document.getElementById('serviceDescription').value = serviceDescription;
    document.getElementById('serviceModalTitle').textContent = '✏️ Modifier le service';
    document.getElementById('serviceSubmitBtn').textContent = 'Enregistrer les modifications';

    document.getElementById('addServiceModal').classList.add('active');
}

function closeAddServiceModal() {
    document.getElementById('addServiceModal').classList.remove('active');
}

async function submitService(event) {
    event.preventDefault();

    try {
        const serviceId = document.getElementById('serviceId').value;
        const serviceName = document.getElementById('serviceName').value.trim();
        const serviceIcon = document.getElementById('serviceIcon').value.trim();
        const serviceDescription = document.getElementById('serviceDescription').value.trim();

        if (!serviceName) {
            showNotification(' Le nom du service est obligatoire');
            return;
        }

        if (!currentDepartment) {
            showNotification(' Erreur: aucun département sélectionné');
            return;
        }

        const isEditing = !!serviceId;
        Logger.debug(isEditing ? '✏️ Modification service:' : '📂 Création service:', { serviceName, serviceIcon, serviceDescription });

        // Créer ou modifier le service
        const url = isEditing
            ? `/api/services/${serviceId}`
            : `/api/departments/${currentDepartment._id}/services`;

        const response = await fetch(url, {
            method: isEditing ? 'PUT' : 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
                nom: serviceName,
                icon: serviceIcon,
                description: serviceDescription
            })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || `Erreur lors de ${isEditing ? 'la modification' : 'la création'}`);
        }

        const result = await response.json();

        Logger.debug(isEditing ? '✅ Service modifié:' : '✅ Service créé:', result);

        // Fermer le modal
        closeAddServiceModal();

        // Recharger les services
        await loadServices(currentDepartment._id);

        showNotification(isEditing
            ? `✅ Service "${serviceName}" modifié avec succès !`
            : `✅ Service "${serviceName}" créé avec succès !`);

    } catch (error) {
        Logger.error('❌ Erreur:', error);
        showNotification(` Erreur: ${error.message}`);
    }
}

async function deleteService(serviceId, serviceName) {
    // Vérifier les permissions (Niveau 0, 1 ou 2)
    if (!currentUser || currentUser.niveau > 2) {
        showNotification(' Accès refusé\n\nVous devez être Niveau 0, 1 ou 2 pour supprimer un service.');
        return;
    }

    // Demander confirmation
    const confirmation = await customConfirm(
        `Êtes-vous sûr de vouloir supprimer le service "${serviceName}" ?\n\nCette action supprimera également toutes les catégories et documents associés.\n\nCette action est IRRÉVERSIBLE !`,
        'ATTENTION - Suppression de service',
        '🗑️'
    );

    if (!confirmation) {
        return;
    }

    try {
        Logger.debug('🗑️ Suppression service:', serviceId);

        const response = await fetch(`/api/services/${serviceId}`, {
            method: 'DELETE',
            credentials: 'include'
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Erreur lors de la suppression');
        }

        Logger.debug('✅ Service supprimé');

        // Recharger les services
        await loadServices(currentDepartment._id);

        showNotification(` Service "${serviceName}" supprimé avec succès !`);

    } catch (error) {
        Logger.error('❌ Erreur suppression service:', error);
        showNotification(` Erreur: ${error.message}`);
    }
}

// Variables pour stocker le service actuel lors de la création de catégorie
let currentServiceForCategory = null;

function openAddCategoryModal(serviceId) {
    // Vérifier les permissions (Niveau 0, 1 ou 2)
    if (!currentUser || currentUser.niveau > 2) {
        showNotification(' Accès refusé\n\nVous devez être Niveau 0, 1 ou 2 pour créer une catégorie.');
        return;
    }

    // Stocker le service actuel
    currentServiceForCategory = serviceId;

    // Réinitialiser le formulaire
    document.getElementById('categoryName').value = '';
    document.getElementById('categoryIcon').value = '';
    document.getElementById('categoryDescription').value = '';

    document.getElementById('addCategoryModal').classList.add('active');
}

function closeAddCategoryModal() {
    document.getElementById('addCategoryModal').classList.remove('active');
    currentServiceForCategory = null;
}

async function submitCategory(event) {
    event.preventDefault();

    try {
        const categoryName = document.getElementById('categoryName').value.trim();
        const categoryIcon = document.getElementById('categoryIcon').value.trim() || '📁';
        const categoryDescription = document.getElementById('categoryDescription').value.trim();

        if (!categoryName || categoryName.length < 2) {
            showNotification(' Le nom de la catégorie est obligatoire (min 2 caractères)');
            return;
        }

        if (!currentServiceForCategory) {
            showNotification(' Erreur: aucun service sélectionné');
            return;
        }

        // Générer l'ID de la catégorie (comme la version classique)
        const categoryId = categoryName.toLowerCase().replace(/[^a-z0-9]/g, '_');

        const username = currentUser?.username || sessionStorage.getItem('username');
        if (!username) {
            showNotification(' Session expirée');
            return;
        }

        Logger.debug('🏷️ Création catégorie:', { categoryName, categoryId, categoryIcon });

        // UTILISER L'ANCIEN SYSTÈME pour compatibilité
        const response = await fetch('/api/categories', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
                userId: username,
                id: categoryId,
                nom: categoryName,
                icon: categoryIcon,
                couleur: '#3b82f6'
            })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Erreur lors de la création');
        }

        const result = await response.json();

        Logger.debug('✅ Catégorie créée:', result);

        // Sauvegarder l'ID du service avant de fermer le modal
        const serviceId = currentServiceForCategory;

        // Fermer le modal
        closeAddCategoryModal();

        // Recharger les catégories du service
        await loadCategories(serviceId);

        showNotification(` Catégorie "${categoryName}" créée avec succès !`);

    } catch (error) {
        Logger.error('❌ Erreur création catégorie:', error);
        showNotification(` Erreur: ${error.message}`);
    }
}

async function openAddDocumentModal() {
    // Vérifier les permissions - Tous les utilisateurs authentifiés peuvent ajouter des documents
    if (!currentUser) {
        showNotification(' Accès refusé\n\nVous devez être connecté pour ajouter un document.');
        return;
    }

    // ✅ CORRECTION: Pour les niveaux 1/2/3, obliger l'utilisateur à être dans un service
    if (currentUser.niveau >= 1 && currentUser.niveau <= 3 && !currentService) {
        showNotification('⚠️ Veuillez d\'abord sélectionner un service\n\nOuvrez un service dans la liste ci-dessus, puis ajoutez le document.');
        return;
    }

    // Réinitialiser le formulaire
    document.getElementById('docTitle').value = '';
    document.getElementById('docDescription').value = '';
    document.getElementById('fileInput').value = '';
    document.getElementById('fileInfo').textContent = '';

    // ✅ Réinitialiser aussi le select de catégorie pour forcer la sélection
    document.getElementById('docCategory').value = '';

    // Initialiser la date à aujourd'hui
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('docDate').value = today;
    document.getElementById('docDate').max = today; // Empêcher la sélection de dates futures

    // Charger les catégories disponibles
    await loadCategoriesForUpload();

    // Initialiser l'état de la zone d'upload (désactivée par défaut)
    checkUploadAreaState();

    // Afficher un message contextuel si on est dans un emplacement spécifique
    const contextInfo = document.getElementById('contextInfo');
    if (currentDepartment || currentService || currentCategory) {
        let contextMessage = '📍 Vous ajoutez un document dans : ';
        const parts = [];

        if (currentDepartment) {
            parts.push(`🏢 ${currentDepartment.nom}`);
        }

        if (currentService) {
            // Essayer de récupérer le nom du service
            const serviceHeader = document.querySelector(`[onclick*="'${currentService}'"]`);
            if (serviceHeader) {
                const serviceNameElement = serviceHeader.querySelector('.accordion-title span:nth-child(2)');
                if (serviceNameElement) {
                    parts.push(`📂 ${serviceNameElement.textContent.trim()}`);
                }
            }
        }

        if (currentCategory) {
            const select = document.getElementById('docCategory');
            const selectedOption = select.options[select.selectedIndex];
            if (selectedOption && selectedOption.value) {
                const categoryName = selectedOption.getAttribute('data-cat-name') || selectedOption.textContent.replace('🏷️', '').trim();
                parts.push(`🏷️ ${categoryName}`);
            }
        }

        if (parts.length > 0) {
            contextMessage += parts.join(' › ');
            contextInfo.innerHTML = `<div style="background: #e0f2fe; padding: 12px; border-radius: 8px; margin-bottom: 15px; border-left: 3px solid #0ea5e9;">${contextMessage}</div>`;
            contextInfo.style.display = 'block';
        } else {
            contextInfo.style.display = 'none';
        }
    } else {
        if (contextInfo) {
            contextInfo.style.display = 'none';
        }
    }

    document.getElementById('addDocumentModal').classList.add('active');
}

async function loadCategoriesForUpload() {
    try {
        const select = document.getElementById('docCategory');
        select.innerHTML = '<option value="">-- Chargement des catégories... --</option>';

        const username = currentUser?.username || sessionStorage.getItem('username');
        if (!username) {
            select.innerHTML = '<option value="">-- Session expirée --</option>';
            return;
        }

        // UTILISER L'ANCIEN SYSTÈME pour compatibilité
        const response = await fetch(`/api/categories/${username}`, {
            credentials: 'include'
        });

        if (!response.ok) {
            throw new Error('Erreur chargement catégories');
        }

        const categories = await response.json();

        // Stocker globalement pour updateArchivePath()
        window.uploadCategories = categories;

        // Remplir le select
        if (categories.length === 0) {
            select.innerHTML = '<option value="">-- Aucune catégorie disponible. Créez-en une d\'abord. --</option>';
        } else {
            // Determiner la categorie a pre-selectionner
            const categoryToSelect = currentCategory || categories[0].nom;

            let optionsHTML = '';
            categories.forEach((cat, index) => {
                // Ajouter l'attribut selected a la categorie cible
                const isSelected = (currentCategory && cat.nom === currentCategory) ||
                                   (!currentCategory && index === 0);
                optionsHTML += `<option value="${cat.nom}" data-cat-name="${escapeHtml(cat.nom)}" ${isSelected ? 'selected' : ''}>
                    🏷️ ${escapeHtml(cat.nom)}
                </option>`;
            });
            select.innerHTML = optionsHTML;

            // Forcer la selection avec select.value
            select.value = categoryToSelect;

            Logger.debug('Categories chargees:', categories.length, '- Categorie selectionnee:', select.value);

            // Afficher le chemin d'archivage
            updateArchivePath();
        }

    } catch (error) {
        Logger.error('❌ Erreur chargement catégories:', error);
        const select = document.getElementById('docCategory');
        select.innerHTML = '<option value="">-- Erreur de chargement --</option>';
    }
}

function updateArchivePath() {
    const select = document.getElementById('docCategory');
    const pathDiv = document.getElementById('archivePath');
    const pathText = document.getElementById('archivePathText');

    if (!select.value) {
        pathDiv.style.display = 'none';
        return;
    }

    const selectedOption = select.options[select.selectedIndex];
    const categoryName = selectedOption.getAttribute('data-cat-name') || selectedOption.textContent.replace('🏷️', '').trim();

    // Construire le chemin d'archivage: Département › Service › Catégorie
    const deptName = currentDepartment?.nom || currentUser?.departementNom || 'Département';

    // Récupérer le nom du service actuel si disponible
    let serviceName = 'Service';
    if (currentService) {
        // Essayer de trouver le service dans l'accordéon
        const serviceHeader = document.querySelector(`[onclick*="'${currentService}'"]`);
        if (serviceHeader) {
            const serviceNameElement = serviceHeader.querySelector('.accordion-title span:nth-child(2)');
            if (serviceNameElement) {
                serviceName = serviceNameElement.textContent.trim();
            }
        }
    }

    pathText.innerHTML = `
        <strong>🏢 ${escapeHtml(deptName)}</strong>
        <span style="margin: 0 8px; color: #9ca3af;">›</span>
        <strong>📂 ${escapeHtml(serviceName)}</strong>
        <span style="margin: 0 8px; color: #9ca3af;">›</span>
        <strong>🏷️ ${escapeHtml(categoryName)}</strong>
    `;

    pathDiv.style.display = 'block';
}

function closeAddDocumentModal() {
    document.getElementById('addDocumentModal').classList.remove('active');
}

// Vérifier les champs obligatoires avant de permettre la sélection de fichier
function checkBeforeFileSelect() {
    const docCategory = document.getElementById('docCategory').value;
    const missingFields = [];

    // Vérifier la catégorie
    if (!docCategory) {
        missingFields.push('Une catégorie');
    }

    // Vérifier le service (pour les niveaux 1/2/3)
    if (currentUser && currentUser.niveau >= 1 && currentUser.niveau <= 3 && !currentService) {
        missingFields.push('Un service d\'archivage');
    }

    // Si des champs manquent, afficher l'avertissement
    if (missingFields.length > 0) {
        const warningDiv = document.getElementById('fileUploadWarning');
        const missingList = document.getElementById('missingFieldsList');
        const uploadArea = document.getElementById('fileUploadArea');

        // Mettre à jour la liste des champs manquants
        missingList.innerHTML = missingFields.map(field => `<li>✗ ${field}</li>`).join('');

        // Afficher l'avertissement
        warningDiv.style.display = 'block';

        // Changer le style de la zone d'upload pour indiquer qu'elle est désactivée
        uploadArea.style.opacity = '0.5';
        uploadArea.style.cursor = 'not-allowed';
        uploadArea.style.backgroundColor = '#f3f4f6';

        // Afficher une notification
        showNotification('❌ CHAMPS OBLIGATOIRES MANQUANTS\n\nVeuillez d\'abord sélectionner : ' + missingFields.join(', '), 'error');

        return;
    }

    // Si tout est OK, masquer l'avertissement et permettre la sélection
    document.getElementById('fileUploadWarning').style.display = 'none';
    const uploadArea = document.getElementById('fileUploadArea');
    uploadArea.style.opacity = '1';
    uploadArea.style.cursor = 'pointer';
    uploadArea.style.backgroundColor = '';

    // Ouvrir le sélecteur de fichier
    document.getElementById('fileInput').click();
}

// Mettre à jour l'état de la zone d'upload quand la catégorie change
function updateArchivePath() {
    const docCategory = document.getElementById('docCategory').value;
    const archivePath = document.getElementById('archivePath');
    const archivePathText = document.getElementById('archivePathText');

    if (docCategory) {
        // Construire le chemin d'archivage
        let path = '';
        if (currentDepartment) {
            path += currentDepartment.nom + ' / ';
        }
        if (currentService) {
            path += currentServiceName + ' / ';
        }
        path += docCategory;

        archivePathText.textContent = path;
        archivePath.style.display = 'block';

        // Réactiver la zone d'upload si la catégorie est sélectionnée
        checkUploadAreaState();
    } else {
        archivePath.style.display = 'none';
    }
}

// Vérifier et mettre à jour l'état de la zone d'upload
function checkUploadAreaState() {
    const docCategory = document.getElementById('docCategory').value;
    const uploadArea = document.getElementById('fileUploadArea');
    const uploadText = document.getElementById('fileUploadText');

    const hasService = currentUser && currentUser.niveau >= 1 && currentUser.niveau <= 3 ? currentService : true;

    if (docCategory && hasService) {
        // Tout est OK
        uploadArea.style.opacity = '1';
        uploadArea.style.cursor = 'pointer';
        uploadArea.style.backgroundColor = '';
        uploadText.textContent = 'Cliquez pour sélectionner un fichier ou glissez-le ici';
        document.getElementById('fileUploadWarning').style.display = 'none';
    } else {
        // Champs manquants
        uploadArea.style.opacity = '0.5';
        uploadArea.style.cursor = 'not-allowed';
        uploadArea.style.backgroundColor = '#f3f4f6';
        uploadText.textContent = '🔒 Veuillez d\'abord sélectionner une catégorie' + (!hasService ? ' et un service' : '');
    }
}

async function submitDocument(event) {
    event.preventDefault();

    try {
        const docTitle = document.getElementById('docTitle').value.trim();
        const docCategory = document.getElementById('docCategory').value;
        const docDate = document.getElementById('docDate').value;
        const docDescription = document.getElementById('docDescription').value.trim();
        const fileInput = document.getElementById('fileInput');

        // Validations
        if (!docTitle) {
            showNotification('❌ CHAMP OBLIGATOIRE\n\nLe titre du document est obligatoire', 'error');
            return;
        }

        if (!docCategory) {
            showNotification('❌ CHAMP OBLIGATOIRE\n\nVeuillez sélectionner une catégorie', 'error');
            return;
        }

        // Validation du service pour les niveaux 1/2/3
        if (currentUser && currentUser.niveau >= 1 && currentUser.niveau <= 3 && !currentService) {
            showNotification('❌ SERVICE REQUIS\n\nVeuillez d\'abord sélectionner un service dans lequel archiver le document', 'error');
            return;
        }

        // Validation de la date du document
        if (!docDate) {
            showNotification('❌ CHAMP OBLIGATOIRE\n\nLa date du document est obligatoire', 'error');
            return;
        }

        const today = new Date().toISOString().split('T')[0];
        if (docDate > today) {
            showNotification('❌ DATE INVALIDE\n\nLa date du document ne peut pas être dans le futur', 'error');
            return;
        }

        if (!fileInput.files || fileInput.files.length === 0) {
            showNotification(' Veuillez sélectionner un fichier');
            return;
        }

        const file = fileInput.files[0];

        // Vérifier la taille (max 50 MB)
        const maxSize = 50 * 1024 * 1024; // 50 MB
        if (file.size > maxSize) {
            showNotification(' Le fichier est trop volumineux (max 50 MB)');
            return;
        }

        // Validation des extensions autorisées
        const allowedExtensions = [
            '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.txt',
            '.odt', '.ods', '.odp', '.rtf', '.csv',
            '.jpg', '.jpeg', '.png', '.gif', '.bmp', '.svg', '.webp',
            '.zip', '.rar'
        ];

        const fileName = file.name.toLowerCase();
        const isAllowed = allowedExtensions.some(ext => fileName.endsWith(ext));

        if (!isAllowed) {
            const ext = fileName.substring(fileName.lastIndexOf('.'));
            showNotification(`⚠️ Extension "${ext}" non autorisée. Seuls les documents, images et archives sont acceptés.`);
            return;
        }

        // Bloquer explicitement les fichiers dangereux
        const blockedExtensions = [
            '.mp4', '.avi', '.mov', '.mkv', '.flv', '.wmv', '.webm',
            '.mp3', '.wav', '.ogg', '.m4a',
            '.exe', '.bat', '.sh', '.msi', '.cmd', '.vbs', '.ps1'
        ];
        const isBlocked = blockedExtensions.some(ext => fileName.endsWith(ext));

        if (isBlocked) {
            const ext = fileName.substring(fileName.lastIndexOf('.'));
            showNotification(`🚫 Les fichiers ${ext} (vidéos, audio, exécutables) ne sont pas autorisés`);
            return;
        }

        Logger.debug('📤 Upload document:', { docTitle, docCategory, file: file.name });

        // Afficher un indicateur de chargement
        showNotification('📤 Traitement du fichier en cours...');

        // Convertir le fichier en base64 (comme dans la version classique)
        const contenu = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });

        // Récupérer le username
        const username = currentUser?.username || sessionStorage.getItem('username');
        if (!username) {
            showNotification(' Session expirée');
            window.location.href = '/login.html';
            return;
        }

        // Construire l'objet document (format attendu par le serveur)
        // ✅ CORRECTION: Envoyer l'ID du service si on est dans un service, sinon l'ID du département
        // Le champ "departementArchivage" est utilisé pour SOIT le département (niveau 0) SOIT le service (niveaux 1/2/3)
        const documentData = {
            userId: username,
            titre: docTitle,
            categorie: docCategory,
            description: docDescription,
            nomFichier: file.name,
            taille: file.size,
            type: file.type,
            contenu: contenu,
            date: docDate, // Utiliser la date saisie par l'utilisateur
            tags: '',
            // ✅ Si on est dans un service, envoyer l'ID du service, sinon l'ID du département
            departementArchivage: currentService || currentDepartment?._id || currentUser?.idDepartement || null
        };

        Logger.debug('📤 Envoi document:', {
            titre: documentData.titre,
            categorie: documentData.categorie,
            nomFichier: documentData.nomFichier,
            taille: documentData.taille,
            departementArchivage: documentData.departementArchivage
        });

        // Upload (envoyer en JSON, pas en FormData)
        const response = await fetch('/api/documents', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify(documentData)
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Erreur lors de l\'upload');
        }

        const result = await response.json();

        Logger.debug('✅ Document uploadé:', result);

        // Fermer le modal
        closeAddDocumentModal();

        // Recharger les documents si on est dans la même catégorie
        if (currentCategory === docCategory) {
            await loadDocuments();
        }

        showNotification(` Document "${docTitle}" uploadé avec succès !`);

    } catch (error) {
        Logger.error('❌ Erreur upload document:', error);
        showNotification(` Erreur: ${error.message}`);
    }
}

// Fermer modal en cliquant à l'extérieur
window.onclick = function(event) {
    const modals = ['addDepartmentModal', 'addServiceModal', 'addCategoryModal', 'addDocumentModal'];
    modals.forEach(modalId => {
        const modal = document.getElementById(modalId);
        if (event.target === modal) {
            modal.classList.remove('active');
        }
    });
}

// ============================================
// ACCÈS RAPIDES
// ============================================

async function showMyDocuments() {
    try {
        if (!currentUser) {
            showNotification(' Veuillez vous connecter');
            return;
        }

        Logger.debug('📄 Chargement de mes documents...');

        // Afficher les résultats
        const resultsDiv = document.getElementById('searchResults');
        resultsDiv.classList.remove('hidden');
        resultsDiv.innerHTML = '<div class="loading">📄 Chargement de vos documents...</div>';

        const response = await fetch(`/api/documents/my?limit=100`, {
            credentials: 'include'
        });

        if (!response.ok) {
            throw new Error('Erreur chargement documents');
        }

        const data = await response.json();
        const documents = data.documents || [];

        displayQuickAccessDocuments('📄 Mes Documents', documents, data.total || 0);

        window.scrollTo({ top: 0, behavior: 'smooth' });

    } catch (error) {
        Logger.error('❌ Erreur:', error);
        document.getElementById('searchResults').innerHTML = `
            <div class="no-results">
                <div class="no-results-icon">❌</div>
                <h3>Erreur</h3>
                <p>${escapeHtml(error.message)}</p>
            </div>
        `;
    }
}

async function showRecentDocuments() {
    try {
        Logger.debug('🕒 Chargement des documents récents...');

        const resultsDiv = document.getElementById('searchResults');
        resultsDiv.classList.remove('hidden');
        resultsDiv.innerHTML = '<div class="loading">🕒 Chargement des documents récents...</div>';

        const response = await fetch('/api/documents/recent?limit=50', {
            credentials: 'include'
        });

        if (!response.ok) {
            throw new Error('Erreur chargement documents récents');
        }

        const data = await response.json();
        const documents = data.documents || [];

        displayQuickAccessDocuments('🕒 Documents Récents', documents, data.total || 0);

        window.scrollTo({ top: 0, behavior: 'smooth' });

    } catch (error) {
        Logger.error('❌ Erreur:', error);
        document.getElementById('searchResults').innerHTML = `
            <div class="no-results">
                <div class="no-results-icon">❌</div>
                <h3>Erreur</h3>
                <p>${escapeHtml(error.message)}</p>
            </div>
        `;
    }
}

async function showFavorites() {
    try {
        if (!currentUser) {
            showNotification(' Veuillez vous connecter');
            return;
        }

        Logger.debug('⭐ Chargement des favoris...');

        const resultsDiv = document.getElementById('searchResults');
        resultsDiv.classList.remove('hidden');
        resultsDiv.innerHTML = '<div class="loading">⭐ Chargement de vos favoris...</div>';

        const response = await fetch(`/api/documents/favorites?limit=100`, {
            credentials: 'include'
        });

        if (!response.ok) {
            throw new Error('Erreur chargement favoris');
        }

        const data = await response.json();
        const documents = data.documents || [];

        displayQuickAccessDocuments('⭐ Mes Favoris', documents, data.total || 0);

        window.scrollTo({ top: 0, behavior: 'smooth' });

    } catch (error) {
        Logger.error('❌ Erreur:', error);
        document.getElementById('searchResults').innerHTML = `
            <div class="no-results">
                <div class="no-results-icon">❌</div>
                <h3>Erreur</h3>
                <p>${escapeHtml(error.message)}</p>
            </div>
        `;
    }
}

async function showNewDocuments() {
    try {
        Logger.debug('🔔 Chargement des nouveaux documents...');

        const resultsDiv = document.getElementById('searchResults');
        resultsDiv.classList.remove('hidden');
        resultsDiv.innerHTML = '<div class="loading">🔔 Chargement des nouveaux documents...</div>';

        // Documents des 7 derniers jours
        const response = await fetch('/api/documents/new?days=7&limit=50', {
            credentials: 'include'
        });

        if (!response.ok) {
            throw new Error('Erreur chargement nouveaux documents');
        }

        const data = await response.json();
        const documents = data.documents || [];

        displayQuickAccessDocuments('🔔 Nouveaux Documents (7 derniers jours)', documents, data.total || 0);

        window.scrollTo({ top: 0, behavior: 'smooth' });

    } catch (error) {
        Logger.error('❌ Erreur:', error);
        document.getElementById('searchResults').innerHTML = `
            <div class="no-results">
                <div class="no-results-icon">❌</div>
                <h3>Erreur</h3>
                <p>${escapeHtml(error.message)}</p>
            </div>
        `;
    }
}

function displayQuickAccessDocuments(title, documents, total) {
    const resultsDiv = document.getElementById('searchResults');

    if (documents.length === 0) {
        resultsDiv.innerHTML = `
            <div class="no-results">
                <div class="no-results-icon">📭</div>
                <h3>Aucun document</h3>
                <p>Aucun document à afficher dans cette catégorie</p>
            </div>
        `;
        return;
    }

    let html = `<h2>${title} (${total} document${total > 1 ? 's' : ''})</h2>`;

    html += `
        <div class="result-group">
            <h3>📄 Documents (${documents.length})</h3>
            ${documents.map(doc => `
                <div class="result-item" onclick="openDocument('${doc._id}')">
                    <div class="result-info">
                        <div class="result-title">${getFileIcon(doc.titre)} ${escapeHtml(doc.titre)}</div>
                        <div class="result-breadcrumb">
                            🏢 ${escapeHtml(doc.departmentName || 'Département')} ›
                            📂 ${escapeHtml(doc.serviceName || 'Service')} ›
                            🏷️ ${escapeHtml(doc.categoryName || 'Catégorie')}
                        </div>
                        <div class="result-meta">
                            💾 ${formatFileSize(doc.taille)} •
                            📅 ${formatDate(doc.dateAjout)} •
                            👤 ${escapeHtml(doc.idUtilisateur)}
                        </div>
                    </div>
                    <div class="result-badge">Document</div>
                </div>
            `).join('')}
        </div>
    `;

    resultsDiv.innerHTML = html;
}

// ============================================
// NAVIGATION
// ============================================

function showHome() {
    document.getElementById('homeView').style.display = 'block';
    document.getElementById('departmentView').classList.remove('active');
    document.getElementById('globalSearchInput').value = '';
    document.getElementById('searchResults').classList.add('hidden');
    window.scrollTo(0, 0);
}

async function openDocument(docId) {
    try {
        Logger.debug('📄 Ouverture document:', docId);

        // Charger les détails du document
        const username = currentUser?.username || sessionStorage.getItem('username');
        if (!username) {
            showNotification(' Session expirée');
            window.location.href = '/login.html';
            return;
        }

        const response = await fetch(`/api/documents/${username}/${docId}`, {
            credentials: 'include'
        });

        if (!response.ok) {
            throw new Error('Erreur chargement document');
        }

        const responseData = await response.json();
        const doc = responseData.document;

        // Afficher le modal de document
        showDocumentModal(doc);

    } catch (error) {
        Logger.error('❌ Erreur ouverture document:', error);
        showNotification(` Erreur: ${error.message}`);
    }
}

function showDocumentModal(doc) {
    // Créer le modal s'il n'existe pas
    let modal = document.getElementById('documentViewModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'documentViewModal';
        modal.className = 'modal';
        document.body.appendChild(modal);
    }

    const username = currentUser?.username || sessionStorage.getItem('username');
    const isOwner = doc.idUtilisateur === username;
    const canEdit = isOwner || currentUser?.niveau <= 1;
    const isLocked = doc.locked || false;

    Logger.debug('📊 DEBUG: Document complet pour modal:', doc);

    modal.innerHTML = `
        <div class="modal-content" style="max-width: 900px;">
            <div class="modal-header">
                <h2>${getFileIcon(doc.titre)} ${escapeHtml(doc.titre)}</h2>
                <button class="modal-close" onclick="closeDocumentModal()">&times;</button>
            </div>
            <div class="modal-body" style="max-height: 70vh; overflow-y: auto;">
                <!-- Description (si disponible) -->
                ${doc.description ? `
                    <div style="background: #f0f9ff; padding: 15px; border-radius: 8px; margin-bottom: 20px; border-left: 3px solid #3b82f6;">
                        <div style="font-size: 12px; color: #1e40af; font-weight: 600; margin-bottom: 8px;">📝 Description</div>
                        <div style="color: #1e3a8a; line-height: 1.6;">${escapeHtml(doc.description)}</div>
                    </div>
                ` : ''}

                <!-- Informations du document -->
                <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
                    <h3 style="margin: 0 0 15px 0; font-size: 16px; color: #374151;">📋 Informations</h3>
                    <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px;">
                        <div>
                            <div style="font-size: 12px; color: #666; margin-bottom: 4px;">🆔 ID Document</div>
                            <div style="font-weight: 600; font-family: monospace; font-size: 11px;">${escapeHtml(doc.idDocument || doc._id || 'N/A')}</div>
                        </div>
                        <div>
                            <div style="font-size: 12px; color: #666; margin-bottom: 4px;">📂 Type de fichier</div>
                            <div style="font-weight: 600;">${doc.type || doc.nomFichier?.split('.').pop()?.toUpperCase() || doc.titre?.split('.').pop()?.toUpperCase() || 'N/A'}</div>
                        </div>
                        <div>
                            <div style="font-size: 12px; color: #666; margin-bottom: 4px;">📅 Date d'ajout</div>
                            <div style="font-weight: 600;">${formatDate(doc.dateAjout || doc.date || doc.createdAt)}</div>
                        </div>
                        <div>
                            <div style="font-size: 12px; color: #666; margin-bottom: 4px;">🕒 Date exacte</div>
                            <div style="font-weight: 600; font-size: 12px;">${(doc.dateAjout || doc.date || doc.createdAt) ? new Date(doc.dateAjout || doc.date || doc.createdAt).toLocaleString('fr-FR') : 'Non renseigné'}</div>
                        </div>
                        <div>
                            <div style="font-size: 12px; color: #666; margin-bottom: 4px;">👤 Propriétaire</div>
                            <div style="font-weight: 600;">${escapeHtml(doc.idUtilisateur || doc.userId || 'N/A')}</div>
                        </div>
                        <div>
                            <div style="font-size: 12px; color: #666; margin-bottom: 4px;">🏢 Département</div>
                            <div style="font-weight: 600;">${escapeHtml(currentDepartment?.nom || currentUser?.departementNom || 'Non renseigné')}</div>
                        </div>
                        <div>
                            <div style="font-size: 12px; color: #666; margin-bottom: 4px;">💾 Taille du fichier</div>
                            <div style="font-weight: 600;">${formatFileSize(doc.taille || (doc.contenu ? doc.contenu.length : 0))}</div>
                        </div>
                        <div>
                            <div style="font-size: 12px; color: #666; margin-bottom: 4px;">🏷️ Catégorie</div>
                            <div style="font-weight: 600;">${escapeHtml(doc.categorie || 'N/A')}</div>
                        </div>
                        <div>
                            <div style="font-size: 12px; color: #666; margin-bottom: 4px;">🔒 Statut de verrouillage</div>
                            <div style="font-weight: 600;">${isLocked ? `🔒 Verrouillé${doc.lockedBy ? ` par ${escapeHtml(doc.lockedBy)}` : ''}` : '🔓 Déverrouillé'}</div>
                        </div>
                        <!-- ❌ Traçage téléchargements supprimé - Disponible uniquement en version classique -->
                        ${doc.cheminFichier ? `
                            <div style="grid-column: 1 / -1;">
                                <div style="font-size: 12px; color: #666; margin-bottom: 4px;">📁 Chemin du fichier</div>
                                <div style="font-weight: 600; font-family: monospace; font-size: 11px; word-break: break-all;">${escapeHtml(doc.cheminFichier)}</div>
                            </div>
                        ` : ''}
                        ${doc.metadata ? `
                            <div style="grid-column: 1 / -1;">
                                <div style="font-size: 12px; color: #666; margin-bottom: 4px;">🔧 Métadonnées</div>
                                <pre style="background: #1f2937; color: #d1d5db; padding: 10px; border-radius: 4px; font-size: 11px; overflow-x: auto;">${JSON.stringify(doc.metadata, null, 2)}</pre>
                            </div>
                        ` : ''}
                    </div>
                </div>

                <!-- Actions -->
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 12px; margin-bottom: 20px;">
                    <button onclick="viewDocument('${doc._id}')" style="padding: 12px; background: #667eea; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: 600;">
                        👁️ Visualiser
                    </button>
                    <button onclick="downloadDocument('${doc._id}')" style="padding: 12px; background: #34d399; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: 600;">
                        ⬇️ Télécharger
                    </button>
                    ${canEdit && !isLocked ? `
                        <button onclick="shareDocument('${doc._id}')" style="padding: 12px; background: #f59e0b; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: 600;">
                            🔗 Partager
                        </button>
                    ` : ''}
                    ${canEdit ? `
                        <button onclick="toggleLock('${doc._id}', ${isLocked})" style="padding: 12px; background: ${isLocked ? '#10b981' : '#ef4444'}; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: 600;">
                            ${isLocked ? '🔓 Déverrouiller' : '🔒 Verrouiller'}
                        </button>
                    ` : ''}
                    ${canEdit && !isLocked ? `
                        <button onclick="confirmDeleteDocument('${doc._id}')" style="padding: 12px; background: #ef4444; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: 600;">
                            🗑️ Supprimer
                        </button>
                    ` : ''}
                </div>

                <!-- Preview iframe -->
                <div id="documentPreview" style="width: 100%; height: 500px; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden; background: #f9fafb;">
                    <div style="display: flex; align-items: center; justify-content: center; height: 100%; color: #9ca3af;">
                        <div style="text-align: center;">
                            <div style="font-size: 48px; margin-bottom: 16px;">📄</div>
                            <div>Cliquez sur "Visualiser" pour voir le contenu</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;

    modal.classList.add('active');
}

function closeDocumentModal() {
    const modal = document.getElementById('documentViewModal');
    if (modal) {
        modal.classList.remove('active');
    }
}

async function viewDocument(docId) {
    try {
        const username = currentUser?.username || sessionStorage.getItem('username');
        Logger.debug('👁️ Visualisation document:', docId);

        // Récupérer le document complet avec son contenu
        const response = await fetch(`/api/documents/${username}/${docId}`, {
            credentials: 'include'
        });

        if (!response.ok) {
            throw new Error('Erreur chargement document');
        }

        const responseData = await response.json();
        const doc = responseData.document;

        // Afficher le document dans l'iframe de prévisualisation
        const previewDiv = document.getElementById('documentPreview');
        if (!previewDiv) {
            Logger.error('❌ Element documentPreview non trouvé');
            return;
        }

        // Enregistrer le téléchargement
        await fetch(`/api/documents/${username}/${docId}/download`, {
            method: 'POST',
            credentials: 'include'
        });

        // Déterminer le type de fichier
        const fileType = doc.type || doc.nomFichier?.split('.').pop()?.toLowerCase() || '';
        const fileName = doc.nomFichier || doc.titre;

        // Si c'est un PDF, l'afficher dans un iframe
        if (fileType.includes('pdf') || fileName.toLowerCase().endsWith('.pdf')) {
            previewDiv.innerHTML = `
                <iframe src="${doc.contenu}"
                        style="width: 100%; height: 100%; border: none;"
                        title="Prévisualisation ${escapeHtml(doc.titre)}">
                </iframe>
            `;
        }
        // Si c'est une image, l'afficher directement
        else if (fileType.includes('image') || /\.(jpg|jpeg|png|gif|bmp|svg|webp)$/i.test(fileName)) {
            previewDiv.innerHTML = `
                <div style="display: flex; align-items: center; justify-content: center; height: 100%; background: #f9fafb;">
                    <img src="${doc.contenu}"
                         alt="${escapeHtml(doc.titre)}"
                         style="max-width: 100%; max-height: 100%; object-fit: contain;">
                </div>
            `;
        }
        // Pour les autres types, proposer le téléchargement
        else {
            previewDiv.innerHTML = `
                <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; color: #6b7280;">
                    <div style="font-size: 64px; margin-bottom: 20px;">📄</div>
                    <div style="font-size: 18px; font-weight: 600; margin-bottom: 10px;">${escapeHtml(doc.titre)}</div>
                    <div style="margin-bottom: 20px; color: #9ca3af;">
                        La prévisualisation n'est pas disponible pour ce type de fichier
                    </div>
                    <button onclick="downloadDocument('${docId}')"
                            style="padding: 12px 24px; background: #34d399; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: 600;">
                        ⬇️ Télécharger le fichier
                    </button>
                </div>
            `;
        }

        Logger.debug('✅ Document affiché dans la prévisualisation');

    } catch (error) {
        Logger.error('❌ Erreur visualisation document:', error);
        showNotification(` Erreur: ${error.message}`);
    }
}

async function downloadDocument(docId) {
    try {
        const username = currentUser?.username || sessionStorage.getItem('username');
        Logger.debug('⬇️ Téléchargement JSON document:', docId);

        // Télécharger le JSON du document
        const response = await fetch(`/api/documents/${username}/${docId}/download-json`, {
            method: 'GET',
            credentials: 'include'
        });

        if (!response.ok) {
            throw new Error('Erreur téléchargement');
        }

        // Récupérer le JSON
        const documentJson = await response.json();

        // Convertir le JSON en Blob
        const jsonString = JSON.stringify(documentJson, null, 2); // Formater avec indentation
        const blob = new Blob([jsonString], { type: 'application/json' });

        // Extraire le nom du fichier depuis les headers ou utiliser le nom du document
        const contentDisposition = response.headers.get('Content-Disposition');
        let filename = 'document.json';
        if (contentDisposition) {
            const match = contentDisposition.match(/filename="?(.+)"?/);
            if (match) filename = match[1];
        } else if (documentJson.nomFichier) {
            filename = `${documentJson.nomFichier.replace(/\.[^/.]+$/, '')}.json`;
        }

        // Créer un lien de téléchargement
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);

        Logger.debug('✅ JSON document téléchargé:', filename);

        // Enregistrer le téléchargement dans les logs
        await fetch(`/api/documents/${username}/${docId}/download`, {
            method: 'POST',
            credentials: 'include'
        });

    } catch (error) {
        Logger.error('❌ Erreur téléchargement JSON:', error);
        showNotification(` Erreur: ${error.message}`);
    }
}

async function shareDocument(docId) {
    try {
        // TODO: Implémenter le modal de partage avec liste des utilisateurs
        const userToShare = await customPrompt(
            'Entrez le nom d\'utilisateur avec qui partager ce document :',
            'Partage de document',
            'Nom d\'utilisateur...'
        );

        if (!userToShare) return;

        const username = currentUser?.username || sessionStorage.getItem('username');

        const response = await fetch(`/api/documents/${username}/${docId}/share`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
                targetUser: userToShare
            })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Erreur partage');
        }

        showNotification(` Document partagé avec ${userToShare}`);

    } catch (error) {
        Logger.error('❌ Erreur partage:', error);
        showNotification(` Erreur: ${error.message}`);
    }
}

async function toggleLock(docId, isCurrentlyLocked) {
    try {
        const username = currentUser?.username || sessionStorage.getItem('username');
        const action = isCurrentlyLocked ? 'déverrouiller' : 'verrouiller';

        const confirmation = await customConfirm(
            `Voulez-vous vraiment ${action} ce document ?`,
            'Confirmation',
            '🔒'
        );

        if (!confirmation) {
            return;
        }

        const response = await fetch(`/api/documents/${username}/${docId}/toggle-lock`, {
            method: 'POST',
            credentials: 'include'
        });

        if (!response.ok) {
            throw new Error(`Erreur ${action}`);
        }

        showNotification(` Document ${isCurrentlyLocked ? 'déverrouillé' : 'verrouillé'}`);

        // Recharger le modal
        closeDocumentModal();
        await openDocument(docId);

    } catch (error) {
        Logger.error('❌ Erreur verrouillage:', error);
        showNotification(` Erreur: ${error.message}`);
    }
}

async function confirmDeleteDocument(docId) {
    const confirmation = await customConfirm(
        'Voulez-vous vraiment supprimer ce document ?\n\nIl sera déplacé dans la corbeille.',
        'Confirmation de suppression',
        '🗑️'
    );

    if (!confirmation) {
        return;
    }

    try {
        const username = currentUser?.username || sessionStorage.getItem('username');

        const response = await fetch(`/api/documents/${username}/${docId}`, {
            method: 'DELETE',
            credentials: 'include'
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Erreur suppression');
        }

        showNotification(' Document supprimé (déplacé dans la corbeille)');

        // Fermer le modal et recharger les documents
        closeDocumentModal();
        if (currentCategory) {
            await loadDocuments();
        }

    } catch (error) {
        Logger.error('❌ Erreur suppression:', error);
        showNotification(` Erreur: ${error.message}`);
    }
}

// ============================================
// UTILITAIRES
// ============================================

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function formatFileSize(bytes) {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

function formatDate(dateString) {
    if (!dateString) return 'Non renseigné';
    const date = new Date(dateString);
    const now = new Date();
    const diff = now - date;
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) return 'Aujourd\'hui';
    if (days === 1) return 'Hier';
    if (days < 7) return `Il y a ${days} jours`;

    return date.toLocaleDateString('fr-FR', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

function getFileIcon(filename) {
    if (!filename) return '📄';
    const ext = filename.split('.').pop().toLowerCase();

    const icons = {
        'pdf': '📕',
        'doc': '📘',
        'docx': '📘',
        'xls': '📗',
        'xlsx': '📗',
        'ppt': '📙',
        'pptx': '📙',
        'zip': '📦',
        'jpg': '🖼️',
        'jpeg': '🖼️',
        'png': '🖼️',
        'gif': '🖼️',
        'txt': '📝',
        'csv': '📊'
    };

    return icons[ext] || '📄';
}
