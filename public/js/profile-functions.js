/**
 * FONCTIONS DE GESTION DU PROFIL UTILISATEUR
 * À intégrer dans app.js
 */

// ===== GESTION DU PROFIL =====

function toggleProfile() {
    state.showProfile = !state.showProfile;

    if (state.showProfile) {
        // Pré-remplir le formulaire avec les données actuelles
        setTimeout(() => {
            document.getElementById('profile_nom').value = state.currentUserInfo.nom || '';
            document.getElementById('profile_prenom').value = state.currentUserInfo.prenom || '';
            document.getElementById('profile_username').value = state.currentUser || '';
            document.getElementById('profile_email').value = state.currentUserInfo.email || '';

            // Charger la photo si elle existe
            loadUserPhoto();
        }, 100);
    }

    render();
}

async function loadUserPhoto() {
    try {
        const apiUrl = '/api';
        const response = await fetch(`${apiUrl}/profile/photo/${state.currentUser}`, {
            credentials: 'include'
        });

        if (response.ok) {
            const data = await response.json();
            if (data.success && data.photo) {
                const preview = document.getElementById('profilePhotoPreview');
                if (preview) {
                    preview.src = data.photo;
                    preview.style.display = 'block';
                }
            }
        }
    } catch (error) {
        Logger.debug('Aucune photo de profil');
    }
}

function handlePhotoUpload(event) {
    const file = event.target.files[0];

    if (!file) return;

    // Vérifier que c'est une image
    if (!file.type.startsWith('image/')) {
        showNotification('Veuillez sélectionner une image', 'warning', 4000);
        return;
    }

    // Vérifier la taille (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
        showNotification('La photo est trop grande\n\nTaille maximale: 2MB', 'warning', 4000);
        return;
    }

    // Lire et prévisualiser
    const reader = new FileReader();
    reader.onload = function(e) {
        // Version beta
        if (typeof currentUser !== 'undefined' && currentUser) {
            betaProfilePhotoPreview = e.target.result;
        }
        // Version classique
        else if (typeof state !== 'undefined') {
            state.profilePhotoPreview = e.target.result;
        }

        const preview = document.getElementById('profilePhotoPreview');
        const placeholder = document.getElementById('profilePhotoPlaceholder');

        if (preview) {
            preview.src = e.target.result;
            preview.style.display = 'block';
            if (placeholder) {
                placeholder.style.display = 'none';
            }
        }
    };
    reader.readAsDataURL(file);
}

async function saveProfile() {
    try {
        const apiUrl = '/api';
        const nom = document.getElementById('profile_nom').value.trim();
        const username = document.getElementById('profile_username').value.trim();
        const email = document.getElementById('profile_email').value.trim();

        if (!nom || !username) {
            showNotification('Le nom et le nom d\'utilisateur sont requis', 'warning', 4000);
            return;
        }

        // Détecter la version (beta ou classique)
        const isBeta = typeof currentUser !== 'undefined' && currentUser;
        const photoPreview = isBeta ? betaProfilePhotoPreview : (typeof state !== 'undefined' ? state.profilePhotoPreview : null);

        // 1. Mettre à jour le profil
        const response = await fetch(`${apiUrl}/profile/update`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ nom, username, email })
        });

        if (!response.ok) {
            // Essayer de parser le JSON pour avoir le message d'erreur
            let errorMessage = 'Erreur lors de la mise à jour du profil';
            try {
                const result = await response.json();
                if (response.status === 409) {
                    // Username déjà utilisé
                    showNotification(result.message + '\n\n' + result.messageDetails, 'error', 0);
                } else if (response.status === 403 && result.contactAdmin) {
                    // Limite de modifications atteinte - Message wolof avec emoji souriant
                    showNotification(result.message + '\n\n' + result.messageDetails, 'smile', 0);
                } else {
                    showNotification(result.message || errorMessage, 'error', 0);
                }
            } catch (e) {
                showNotification(errorMessage + ' (Erreur serveur)', 'error', 0);
            }
            return;
        }

        const result = await response.json();

        // 2. Upload de la photo si elle a été modifiée
        if (photoPreview) {
            try {
                const photoResponse = await fetch(`${apiUrl}/profile/upload-photo`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({ photoData: photoPreview })
                });

                if (!photoResponse.ok) {
                    const photoError = await photoResponse.json();
                    Logger.error('Erreur upload photo:', photoError);
                    showNotification('Photo non sauvegardée: ' + (photoError.message || 'Erreur serveur'), 'warning', 5000);
                } else {
                    Logger.debug('Photo uploadée avec succès');
                }
            } catch (photoErr) {
                Logger.error('Erreur upload photo:', photoErr);
                showNotification('Photo non sauvegardée (erreur réseau)', 'warning', 5000);
            }
        }

        // 3. Mettre à jour l'état local selon la version
        if (isBeta) {
            // Version BETA
            currentUser.nom = nom;
            currentUser.email = email;

            if (result.newUsername && result.newUsername !== currentUser.username) {
                currentUser.username = result.newUsername;
            }

            // Afficher message avec infos sur les modifications restantes
            let message = 'Profil mis à jour avec succès';
            if (result.remainingChanges) {
                message += '\n\n📊 Modifications restantes:';
                message += '\n• Nom: ' + result.remainingChanges.nom + '/1';
                message += '\n• Username: ' + result.remainingChanges.username + '/1';
            }
            showNotification(message, 'success', 5000);

            closeProfileModal();
            betaProfilePhotoPreview = null;

            // Recharger les données utilisateur
            if (typeof loadUserData === 'function') {
                await loadUserData();
            }
        } else if (typeof state !== 'undefined') {
            // Version CLASSIQUE
            state.currentUserInfo.nom = nom;
            state.currentUserInfo.email = email;

            if (result.newUsername && result.newUsername !== state.currentUser) {
                state.currentUser = result.newUsername;
                saveSession(state.currentUser, state.currentUserInfo);
            }

            let message = '✅ Profil mis à jour avec succès';
            if (result.remainingChanges) {
                message += ' - Nom: ' + result.remainingChanges.nom + '/1, Username: ' + result.remainingChanges.username + '/1';
            }
            showNotification(message);
            state.showProfile = false;
            state.profilePhotoPreview = null;
            render();
        }

    } catch (error) {
        Logger.error('Erreur sauvegarde profil:', error);
        showNotification('Erreur lors de la sauvegarde du profil\n\nVeuillez réessayer', 'error', 0);
    }
}

function getProfilePhotoUrl(username) {
    // Retourner l'URL de la photo ou une photo par défaut
    const apiUrl = '/api';
    return `${apiUrl}/profile/photo/${username}`;
}

// Fonction pour afficher l'avatar avec photo
function renderUserAvatar() {
    const fullName = state.currentUserInfo ?
        `${state.currentUserInfo.prenom || ''} ${state.currentUserInfo.nom || ''}`.trim() :
        state.currentUser || 'User';

    const initials = state.currentUserInfo ?
        ((state.currentUserInfo.prenom?.[0] || '') + (state.currentUserInfo.nom?.[0] || '')).toUpperCase() :
        (state.currentUser?.substring(0, 2).toUpperCase() || 'U');

    // Essayer de charger la photo
    const photoUrl = getProfilePhotoUrl(state.currentUser);

    return `
        <div class="user-info" onclick="state.showMenu = !state.showMenu; render()">
            <div class="user-avatar" id="userAvatar">
                <img src="${photoUrl}"
                     alt="${fullName}"
                     onerror="this.style.display='none'; this.nextElementSibling.style.display='flex'"
                     style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%;">
                <div style="display: none; width: 100%; height: 100%; align-items: center; justify-content: center; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 50%; font-weight: 600; color: white;">
                    ${initials}
                </div>
            </div>
            <div class="user-details">
                <div class="user-name">${fullName}</div>
                <div class="user-role">${state.currentUserInfo?.role || 'Utilisateur'}</div>
            </div>
            <svg class="dropdown-icon" width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M2 4L6 8L10 4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
            </svg>
        </div>
    `;
}

// ===== FONCTIONS POUR LA VERSION BETA (new-dashboard.html) =====

// Variable pour stocker l'aperçu de la photo dans la version beta
let betaProfilePhotoPreview = null;

// Ouvrir la modal de profil (version beta)
function toggleProfile() {
    const modal = document.getElementById('profileModal');
    if (!modal) {
        Logger.error('Modal de profil non trouvée');
        return;
    }

    // Vérifier si on est dans la version beta (currentUser existe) ou classique (state existe)
    if (typeof currentUser !== 'undefined' && currentUser) {
        // Version BETA
        openProfileModalBeta();
    } else if (typeof state !== 'undefined') {
        // Version CLASSIQUE
        state.showProfile = !state.showProfile;
        if (state.showProfile) {
            setTimeout(() => {
                document.getElementById('profile_nom').value = state.currentUserInfo.nom || '';
                document.getElementById('profile_prenom').value = state.currentUserInfo.prenom || '';
                document.getElementById('profile_username').value = state.currentUser || '';
                document.getElementById('profile_email').value = state.currentUserInfo.email || '';
                loadUserPhoto();
            }, 100);
        }
        render();
    }
}

// Ouvrir la modal (version beta)
function openProfileModalBeta() {
    const modal = document.getElementById('profileModal');

    // Pré-remplir le formulaire
    document.getElementById('profile_nom').value = currentUser.nom || '';
    document.getElementById('profile_username').value = currentUser.username || '';
    document.getElementById('profile_email').value = currentUser.email || '';

    // Afficher les infos non modifiables
    document.getElementById('profile_niveau').textContent = currentUser.niveau !== undefined ? `Niveau ${currentUser.niveau}` : 'N/A';
    document.getElementById('profile_departement').textContent = currentUser.departement || 'N/A';

    // Mettre à jour le placeholder avec les initiales du nom
    const initials = currentUser.nom?.substring(0, 2).toUpperCase() ||
                     currentUser.username?.substring(0, 2).toUpperCase() || '--';
    document.getElementById('profilePhotoPlaceholder').textContent = initials;

    // Charger la photo si elle existe
    loadUserPhotoBeta();

    // Afficher la modal
    modal.style.display = 'flex';
}

// Fermer la modal (version beta)
function closeProfileModal() {
    const modal = document.getElementById('profileModal');
    modal.style.display = 'none';
    betaProfilePhotoPreview = null;

    // Réinitialiser l'aperçu
    document.getElementById('profilePhotoPreview').style.display = 'none';
    document.getElementById('profilePhotoPlaceholder').style.display = 'flex';
}

// Charger la photo utilisateur (version beta)
async function loadUserPhotoBeta() {
    try {
        const apiUrl = '/api';
        const response = await fetch(`${apiUrl}/profile/photo/${currentUser.username}`, {
            credentials: 'include'
        });

        if (response.ok) {
            const data = await response.json();
            if (data.success && data.photo) {
                const preview = document.getElementById('profilePhotoPreview');
                const placeholder = document.getElementById('profilePhotoPlaceholder');
                if (preview && placeholder) {
                    preview.src = data.photo;
                    preview.style.display = 'block';
                    placeholder.style.display = 'none';
                }
            }
        }
    } catch (error) {
        Logger.debug('Aucune photo de profil');
    }
}
