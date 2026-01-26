// ============================================
// GESTION ADMIN AVANCÉE - ARCHIVAGE C.E.R.E.R
// ============================================

// ===== GESTION DES UTILISATEURS =====

// ✅ NOUVEAU: Générer un mot de passe aléatoire sécurisé
function generateSecurePassword(length = 8) {
    const lowercase = 'abcdefghijklmnopqrstuvwxyz';
    const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const numbers = '0123456789';
    const symbols = '@#$%&*';
    const allChars = lowercase + uppercase + numbers + symbols;

    let password = '';
    // Garantir au moins 1 majuscule, 1 minuscule, 1 chiffre
    password += lowercase[Math.floor(Math.random() * lowercase.length)];
    password += uppercase[Math.floor(Math.random() * uppercase.length)];
    password += numbers[Math.floor(Math.random() * numbers.length)];

    // Compléter avec des caractères aléatoires
    for (let i = password.length; i < length; i++) {
        password += allChars[Math.floor(Math.random() * allChars.length)];
    }

    // Mélanger les caractères
    return password.split('').sort(() => Math.random() - 0.5).join('');
}

async function createUser() {
    const username = document.getElementById('new_user_username').value.trim();
    const nom = document.getElementById('new_user_nom').value.trim();
    const email = document.getElementById('new_user_email').value.trim();
    const idRole = document.getElementById('new_user_role').value;
    const idDepartement = document.getElementById('new_user_dept').value;

    if (!username || !nom || !email || !idRole) {
        showNotification('❌ Tous les champs sont requis', 'error');
        return;
    }

    if (username.length < 3) {
        showNotification('❌ Le nom d\'utilisateur doit contenir au moins 3 caractères', 'error');
        return;
    }

    // ✅ Mot de passe par défaut
    const password = '1234';

    try {
        // Utiliser /users (POST) pour les utilisateurs authentifiés (admin)
        await apiCall('/users', 'POST', {
            username,
            password,
            nom,
            email,
            idRole,
            idDepartement: idDepartement || null
        });

        // Afficher le mot de passe généré dans un modal
        await customAlert({
            title: '✅ Utilisateur créé avec succès',
            message: `
                <div class="text-left space-y-3">
                    <p><strong>Nom d'utilisateur :</strong> <span class="font-mono bg-blue-100 px-2 py-1 rounded">${username}</span></p>
                    <p><strong>Mot de passe temporaire :</strong> <span class="font-mono bg-yellow-100 px-2 py-1 rounded text-lg">${password}</span></p>
                    <div class="bg-yellow-50 border-l-4 border-yellow-400 p-3 mt-4">
                        <p class="text-sm text-yellow-800">
                            ⚠️ <strong>Important :</strong> Communiquez ce mot de passe à l'utilisateur.
                            Il devra le changer lors de sa première connexion.
                        </p>
                    </div>
                    ${email ? `<p class="text-xs text-gray-600 mt-2">📧 Un email a également été envoyé à : ${email}</p>` : ''}
                </div>
            `,
            type: 'success',
            icon: '🔑'
        });

        // Recharger la liste des utilisateurs
        const response = await apiCall('/users');
        state.allUsersForManagement = response.users || [];
        render();
    } catch (error) {
        Logger.error('Erreur création utilisateur:', error);
    }
}

async function deleteUser(username) {
    const confirmed = await customConfirm({
        title: 'Supprimer l\'utilisateur',
        message: `Voulez-vous vraiment supprimer l'utilisateur "${username}" ? Cette action est irréversible.`,
        confirmText: 'Oui, supprimer',
        cancelText: 'Annuler',
        type: 'danger',
        icon: '🗑️'
    });

    if (!confirmed) return;

    try {
        await apiCall(`/users/${username}`, 'DELETE');
        // Recharger les utilisateurs sans fermer le panneau
        const response = await apiCall('/users');
        state.allUsersForManagement = response.users || [];
        render();
        showNotification('✅ Utilisateur supprimé');
    } catch (error) {
        Logger.error('Erreur suppression utilisateur:', error);
    }
}

function startEditUser(username) {
    const user = state.allUsersForManagement.find(u => u.username === username);
    if (!user) return;
    state.editingUser = { ...user };
    render();
}

function cancelEditUser() {
    state.editingUser = null;
    render();
}

async function saveEditUser() {
    if (!state.editingUser) return;

    const nom = document.getElementById('edit_user_nom').value.trim();
    const email = document.getElementById('edit_user_email').value.trim();
    const idRole = document.getElementById('edit_user_role').value;
    const idDepartement = document.getElementById('edit_user_dept').value;

    if (!nom || !email || !idRole) {
        showNotification('❌ Nom, email et rôle sont requis', 'error');
        return;
    }

    try {
        await apiCall(`/users/${state.editingUser.username}`, 'PUT', {
            nom,
            email,
            idRole,
            idDepartement: idDepartement || null
        });
        // Recharger les utilisateurs sans fermer le panneau
        const response = await apiCall('/users');
        state.allUsersForManagement = response.users || [];
        state.editingUser = null;
        render();
        showNotification('✅ Utilisateur modifié');
    } catch (error) {
        Logger.error('Erreur modification utilisateur:', error);
    }
}

async function resetUserPassword(username) {
    const newPassword = await customPrompt({
        title: 'Réinitialiser le mot de passe',
        message: `Entrez le nouveau mot de passe pour "${username}" :`,
        placeholder: 'Nouveau mot de passe...',
        confirmText: 'Réinitialiser',
        cancelText: 'Annuler',
        type: 'password',
        icon: '🔐'
    });

    if (!newPassword) return;

    if (newPassword.length < 4) {
        await customAlert({
            title: 'Erreur',
            message: 'Le mot de passe doit contenir au moins 4 caractères.',
            type: 'error',
            icon: '❌'
        });
        return;
    }

    try {
        await apiCall(`/users/${username}/reset-password`, 'POST', { newPassword });
        await customAlert({
            title: 'Succès',
            message: `Mot de passe de "${username}" réinitialisé avec succès.`,
            type: 'success',
            icon: '✅'
        });
    } catch (error) {
        Logger.error('Erreur réinitialisation mot de passe:', error);
    }
}

// ===== GESTION DES RÔLES =====

async function addRole() {
    const nom = document.getElementById('new_role_nom').value.trim();
    const niveau = parseInt(document.getElementById('new_role_niveau').value);
    const description = document.getElementById('new_role_desc').value.trim();

    if (!nom || !niveau || !description) {
        showNotification('❌ Tous les champs sont requis', 'error');
        return;
    }

    try {
        await apiCall('/roles', 'POST', { nom, niveau, description });
        await loadRolesAndDepartements();
        showNotification('✅ Rôle créé');
        document.getElementById('new_role_nom').value = '';
        document.getElementById('new_role_niveau').value = '';
        document.getElementById('new_role_desc').value = '';
    } catch (error) {
        Logger.error('Erreur création rôle:', error);
    }
}

async function deleteRole(roleId) {
    const confirmed = await customConfirm({
        title: 'Supprimer le rôle',
        message: 'Voulez-vous vraiment supprimer ce rôle ? Cette action est irréversible.',
        confirmText: 'Oui, supprimer',
        cancelText: 'Annuler',
        type: 'danger',
        icon: '🗑️'
    });

    if (!confirmed) return;

    try {
        await apiCall(`/roles/${roleId}`, 'DELETE');
        await loadRolesAndDepartements();
        showNotification('✅ Rôle supprimé');
    } catch (error) {
        Logger.error('Erreur suppression rôle:', error);
    }
}

function startEditRole(roleId) {
    const role = state.roles.find(r => r._id === roleId);
    if (!role) return;
    state.editingRole = { ...role };
    render();
}

function cancelEditRole() {
    state.editingRole = null;
    render();
}

async function saveEditRole() {
    if (!state.editingRole) return;

    const nom = document.getElementById('edit_role_nom').value.trim();
    const niveau = parseInt(document.getElementById('edit_role_niveau').value);
    const description = document.getElementById('edit_role_desc').value.trim();

    if (!nom || !niveau || !description) {
        showNotification('❌ Tous les champs sont requis', 'error');
        return;
    }

    try {
        await apiCall(`/roles/${state.editingRole._id}`, 'PUT', { nom, niveau, description });
        await loadRolesAndDepartements();
        state.editingRole = null;
        showNotification('✅ Rôle modifié');
    } catch (error) {
        Logger.error('Erreur modification rôle:', error);
    }
}

// ===== RENDU DES INTERFACES =====

function renderUsersManagement() {
    if (!state.showUsersManagement) return '';

    return `
        <div class="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4 backdrop-blur-sm"
             onclick="if(event.target === this) toggleUsersManagement()">
            <div class="modal-glass rounded-2xl p-8 max-w-5xl w-full max-h-[90vh] overflow-y-auto shadow-2xl animate-fade-in" onclick="event.stopPropagation()">
                <h2 class="text-2xl font-bold mb-6 bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">👥 Gestion des utilisateurs</h2>

                <!-- Liste des utilisateurs -->
                <div class="space-y-3 mb-6">
                    ${state.allUsersForManagement.map((user, index) => `
                        ${state.editingUser && state.editingUser.username === user.username ? `
                            <!-- Mode édition -->
                            <div class="p-4 bg-purple-50 rounded-xl space-y-3 border-2 border-purple-300">
                                <div class="flex items-center gap-2 mb-2">
                                    <span class="text-lg font-bold">✏️ Modifier ${user.username}</span>
                                </div>
                                <input id="edit_user_nom" type="text" value="${user.nom}" placeholder="Nom complet"
                                       class="w-full px-3 py-2 border-2 rounded-lg input-modern text-sm">
                                <input id="edit_user_email" type="email" value="${user.email}" placeholder="Email"
                                       class="w-full px-3 py-2 border-2 rounded-lg input-modern text-sm">
                                <select id="edit_user_role" class="w-full px-3 py-2 border-2 rounded-lg input-modern text-sm" onchange="toggleDepartmentField('edit_user_dept_container', this.value)">
                                    ${state.roles
                                        .filter(role => {
                                            // Filtrer les rôles undefined/null
                                            if (!role.niveau && role.niveau !== 0) return false;

                                            // Si un niveau 1 est connecté, montrer uniquement niveau 2 et 3
                                            if (state.currentUserInfo && state.currentUserInfo.niveau === 1) {
                                                return role.niveau === 2 || role.niveau === 3;
                                            }

                                            // Si un niveau 0 est connecté, montrer uniquement niveau 1, 2 et 3 (PAS niveau 0)
                                            if (state.currentUserInfo && state.currentUserInfo.niveau === 0) {
                                                return role.niveau === 1 || role.niveau === 2 || role.niveau === 3;
                                            }

                                            // Sinon, montrer tous les rôles sauf niveau 0
                                            return role.niveau !== 0;
                                        })
                                        .map(role => `
                                            <option value="${role._id}" data-niveau="${role.niveau}" ${user.idRole === role._id ? 'selected' : ''}>
                                                ${role.nom} (Niveau ${role.niveau})
                                            </option>
                                        `).join('')}
                                </select>
                                <div id="edit_user_dept_container" ${user.niveau === 1 ? 'style="display:none;"' : ''}>
                                    <select id="edit_user_dept" class="w-full px-3 py-2 border-2 rounded-lg input-modern text-sm">
                                        <option value="" ${!user.idDepartement ? 'selected' : ''}>-- Aucun département --</option>
                                        ${state.departements.map(dept => `
                                            <option value="${dept._id}" ${user.idDepartement === dept._id ? 'selected' : ''}>
                                                ${dept.nom}
                                            </option>
                                        `).join('')}
                                    </select>
                                </div>
                                <div class="flex gap-2">
                                    <button onclick="saveEditUser()" class="flex-1 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition text-sm font-medium">
                                        ✅ Enregistrer
                                    </button>
                                    <button onclick="cancelEditUser()" class="flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition text-sm font-medium">
                                        ❌ Annuler
                                    </button>
                                </div>
                            </div>
                        ` : `
                            <!-- Mode affichage -->
                            <div class="p-4 bg-white rounded-xl border-2 border-purple-300 hover:shadow-lg transition">
                                <div class="flex items-center justify-between">
                                    <div class="flex-1">
                                        <div class="flex items-center gap-3 mb-2">
                                            <span class="text-2xl">👤</span>
                                            <div>
                                                <h3 class="font-bold text-gray-900">${user.nom}</h3>
                                                <p class="text-sm text-gray-700">@${user.username}</p>
                                            </div>
                                        </div>
                                        <div class="grid grid-cols-2 gap-2 text-xs">
                                            <div>
                                                <span class="text-gray-600 font-medium">Email:</span>
                                                <span class="font-semibold ml-1 text-gray-900">${user.email}</span>
                                            </div>
                                            <div>
                                                <span class="text-gray-600 font-medium">Rôle:</span>
                                                <span class="font-semibold ml-1 text-gray-900">${user.role} (Niveau ${user.niveau})</span>
                                            </div>
                                            <div>
                                                <span class="text-gray-600 font-medium">Département:</span>
                                                <span class="font-semibold ml-1 text-gray-900">${user.departement}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div class="flex flex-col gap-2">
                                        ${user.username !== state.currentUser ? `
                                            <button onclick='startEditUser("${user.username}")' class="px-3 py-1 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition text-xs font-medium">
                                                ✏️ Modifier
                                            </button>
                                            <button onclick='resetUserPassword("${user.username}")' class="px-3 py-1 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition text-xs font-medium">
                                                🔐 Reset MDP
                                            </button>
                                            <button onclick='deleteUser("${user.username}")' class="px-3 py-1 bg-red-500 text-white rounded-lg hover:bg-red-600 transition text-xs font-medium">
                                                🗑️ Supprimer
                                            </button>
                                        ` : `
                                            <span class="px-3 py-1 bg-green-100 text-green-700 rounded-lg text-xs font-bold">
                                                ✓ Vous
                                            </span>
                                        `}
                                    </div>
                                </div>
                            </div>
                        `}
                    `).join('')}
                </div>

                <!-- Formulaire d'ajout d'utilisateur -->
                <div class="bg-white p-4 rounded-xl border-2 border-purple-300 mb-4 shadow-sm">
                    <h3 class="font-bold text-gray-900 mb-3">➕ Créer un nouvel utilisateur</h3>

                    <!-- ✅ Message informatif sur le mot de passe automatique -->
                    <div class="bg-blue-50 border-2 border-blue-300 rounded-lg p-3 mb-3">
                        <p class="text-xs text-blue-800 font-medium">
                            🔐 <strong>Mot de passe par défaut :</strong> Le mot de passe sera <strong class="font-mono text-lg bg-yellow-100 px-2 rounded">1234</strong>
                            <br>L'utilisateur devra le changer lors de sa première connexion.
                        </p>
                    </div>

                    <div class="space-y-3">
                        <input id="new_user_username" type="text" placeholder="Nom d'utilisateur (3+ caractères)"
                               class="w-full px-3 py-2 border-2 rounded-lg input-modern text-sm">

                        <input id="new_user_nom" type="text" placeholder="Nom complet"
                               class="w-full px-3 py-2 border-2 rounded-lg input-modern text-sm">

                        <input id="new_user_email" type="email" placeholder="Email"
                               class="w-full px-3 py-2 border-2 rounded-lg input-modern text-sm">

                        <select id="new_user_role" class="w-full px-3 py-2 border-2 rounded-lg input-modern text-sm" onchange="toggleDepartmentField('new_user_dept_container', this.value)">
                            <option value="">-- Sélectionner un rôle --</option>
                            ${state.roles
                                .filter(role => {
                                    // Filtrer les rôles undefined/null
                                    if (!role.niveau && role.niveau !== 0) return false;

                                    // Si un niveau 1 est connecté, montrer uniquement niveau 2 et 3
                                    if (state.currentUserInfo && state.currentUserInfo.niveau === 1) {
                                        return role.niveau === 2 || role.niveau === 3;
                                    }

                                    // Si un niveau 0 est connecté, montrer uniquement niveau 1, 2 et 3 (PAS niveau 0)
                                    if (state.currentUserInfo && state.currentUserInfo.niveau === 0) {
                                        return role.niveau === 1 || role.niveau === 2 || role.niveau === 3;
                                    }

                                    // Sinon, montrer tous les rôles sauf niveau 0
                                    return role.niveau !== 0;
                                })
                                .map(role => `
                                    <option value="${role._id}" data-niveau="${role.niveau}">
                                        ${role.nom} (Niveau ${role.niveau})
                                    </option>
                                `).join('')}
                        </select>

                        ${state.currentUserInfo && state.currentUserInfo.niveau === 1 ? `
                            <!-- Niveau 1 : Département automatique (celui du créateur) -->
                            <div class="w-full px-3 py-2 border-2 rounded-lg bg-gray-100 font-semibold text-gray-700 text-sm">
                                🏢 Département : ${state.currentUserInfo.departement || 'Non défini'}
                            </div>
                            <input type="hidden" id="new_user_dept" value="${state.currentUserInfo.idDepartement || ''}">
                            <p class="text-xs text-blue-700 font-semibold mt-1 bg-blue-50 p-2 rounded border-l-4 border-blue-500">
                                ℹ️ En tant qu'<strong>administrateur départemental</strong>, vous créez des utilisateurs <strong>niveau 2 et 3</strong> dans VOTRE département et gérez les <strong>services</strong> de ce département.
                            </p>
                        ` : state.currentUserInfo && state.currentUserInfo.niveau === 0 ? `
                            <!-- Niveau 0 : Super Admin - Choix du département avec message informatif -->
                            <div id="new_user_dept_container">
                                <select id="new_user_dept" class="w-full px-3 py-2 border-2 rounded-lg input-modern text-sm">
                                    <option value="">-- Sélectionner un département (optionnel) --</option>
                                    ${state.departements.map(dept => `
                                        <option value="${dept._id}">
                                            ${dept.nom}
                                        </option>
                                    `).join('')}
                                </select>
                            </div>
                            <p class="text-xs text-green-700 font-semibold mt-1 bg-green-50 p-2 rounded border-l-4 border-green-500">
                                ℹ️ En tant que <strong>Super Administrateur</strong>, vous pouvez créer des utilisateurs <strong>niveau 1, 2 et 3</strong> dans <strong>tous les départements</strong>. Les Super Admins (niveau 0) ne peuvent être créés que via script.
                            </p>
                        ` : `
                            <!-- Autres niveaux : Choix du département -->
                            <div id="new_user_dept_container">
                                <select id="new_user_dept" class="w-full px-3 py-2 border-2 rounded-lg input-modern text-sm">
                                    <option value="">-- Sélectionner un département (optionnel) --</option>
                                    ${state.departements.map(dept => `
                                        <option value="${dept._id}">
                                            ${dept.nom}
                                        </option>
                                    `).join('')}
                                </select>
                            </div>
                        `}

                        <button onclick="createUser()" class="w-full px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition font-medium">
                            ➕ Créer l'utilisateur
                        </button>
                    </div>
                </div>

                <button onclick="toggleUsersManagement()" class="w-full px-6 py-3 bg-gradient-to-br from-gray-200 to-gray-300 rounded-xl hover:shadow-md transition font-medium">
                    Fermer
                </button>
            </div>
        </div>
    `;
}

function renderRolesManagement() {
    if (!state.showRolesManagement) return '';

    return `
        <div class="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4 backdrop-blur-sm"
             onclick="if(event.target === this) toggleRolesManagement()">
            <div class="modal-glass rounded-2xl p-8 max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl animate-fade-in" onclick="event.stopPropagation()">
                <h2 class="text-2xl font-bold mb-6 bg-gradient-to-r from-indigo-600 to-blue-600 bg-clip-text text-transparent">🎭 Gestion des rôles</h2>

                <!-- Liste des rôles -->
                <div class="space-y-3 mb-6">
                    ${state.roles.map((role, index) => `
                        ${state.editingRole && state.editingRole._id === role._id ? `
                            <!-- Mode édition -->
                            <div class="p-4 bg-indigo-50 rounded-xl space-y-3 border-2 border-indigo-300">
                                <div class="flex items-center gap-2 mb-2">
                                    <span class="text-lg font-bold">✏️ Modifier</span>
                                </div>
                                <input id="edit_role_nom" type="text" value="${role.nom}" placeholder="Nom du rôle"
                                       class="w-full px-3 py-2 border-2 rounded-lg input-modern text-sm">
                                <select id="edit_role_niveau" class="w-full px-3 py-2 border-2 rounded-lg input-modern text-sm">
                                    <option value="1" ${role.niveau === 1 ? 'selected' : ''}>Niveau 1 (Administrateur)</option>
                                    <option value="2" ${role.niveau === 2 ? 'selected' : ''}>Niveau 2 (Utilisateur)</option>
                                    <option value="3" ${role.niveau === 3 ? 'selected' : ''}>Niveau 3 (Invité)</option>
                                </select>
                                <textarea id="edit_role_desc" placeholder="Description" rows="3"
                                       class="w-full px-3 py-2 border-2 rounded-lg input-modern text-sm resize-none">${role.description || ''}</textarea>
                                <div class="flex gap-2">
                                    <button onclick="saveEditRole()" class="flex-1 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition text-sm font-medium">
                                        ✅ Enregistrer
                                    </button>
                                    <button onclick="cancelEditRole()" class="flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition text-sm font-medium">
                                        ❌ Annuler
                                    </button>
                                </div>
                            </div>
                        ` : `
                            <!-- Mode affichage -->
                            <div class="p-4 bg-gradient-to-r from-indigo-50 to-blue-50 rounded-xl border-2 border-indigo-200 hover:shadow-md transition">
                                <div class="flex items-center justify-between">
                                    <div class="flex-1">
                                        <div class="flex items-center gap-3 mb-2">
                                            <span class="text-2xl">🎭</span>
                                            <div>
                                                <h3 class="font-bold text-gray-900">${role.nom}</h3>
                                                <p class="text-sm text-gray-600">Niveau ${role.niveau}</p>
                                            </div>
                                        </div>
                                        <p class="text-xs text-gray-600 italic">${role.description || 'Aucune description'}</p>
                                    </div>
                                    <div class="flex gap-2">
                                        <button onclick='startEditRole("${role._id}")' class="px-3 py-1 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition text-xs font-medium">
                                            ✏️ Modifier
                                        </button>
                                        <button onclick='deleteRole("${role._id}")' class="px-3 py-1 bg-red-500 text-white rounded-lg hover:bg-red-600 transition text-xs font-medium">
                                            🗑️ Supprimer
                                        </button>
                                    </div>
                                </div>
                            </div>
                        `}
                    `).join('')}
                </div>

                <!-- Formulaire d'ajout -->
                <div class="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-xl border-2 border-indigo-300 mb-4">
                    <h3 class="font-bold text-gray-800 mb-3">➕ Ajouter un nouveau rôle</h3>
                    <div class="space-y-3">
                        <input id="new_role_nom" type="text" placeholder="Nom du rôle"
                               class="w-full px-3 py-2 border-2 rounded-lg input-modern text-sm">
                        <select id="new_role_niveau" class="w-full px-3 py-2 border-2 rounded-lg input-modern text-sm">
                            <option value="">-- Sélectionner un niveau --</option>
                            <option value="1">Niveau 1 (Administrateur)</option>
                            <option value="2">Niveau 2 (Utilisateur)</option>
                            <option value="3">Niveau 3 (Invité)</option>
                        </select>
                        <textarea id="new_role_desc" placeholder="Description" rows="2"
                                  class="w-full px-3 py-2 border-2 rounded-lg input-modern text-sm resize-none"></textarea>
                        <button onclick="addRole()" class="w-full px-4 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition font-medium">
                            ➕ Créer le rôle
                        </button>
                    </div>
                </div>

                <button onclick="toggleRolesManagement()" class="w-full px-6 py-3 bg-gradient-to-br from-gray-200 to-gray-300 rounded-xl hover:shadow-md transition font-medium">
                    Fermer
                </button>
            </div>
        </div>
    `;
}

function renderAdvancedStats() {
    if (!state.showAdvancedStats) return '';

    // Calculer les statistiques détaillées
    const totalDocs = state.documents.length;
    const docsByCategory = {};
    const docsByDepartment = {};
    const docsByUser = {};
    const docsByMonth = {};

    state.documents.forEach(doc => {
        // Par catégorie
        const cat = state.categories.find(c => c.id === doc.categorie);
        const catName = cat ? cat.nom : 'Autre';
        docsByCategory[catName] = (docsByCategory[catName] || 0) + 1;

        // Par département
        const deptName = doc.departementArchivage || 'Non spécifié';
        docsByDepartment[deptName] = (docsByDepartment[deptName] || 0) + 1;

        // Par utilisateur
        const userName = doc.idUtilisateur || 'Inconnu';
        docsByUser[userName] = (docsByUser[userName] || 0) + 1;

        // Par mois (si date disponible)
        if (doc.dateCreation) {
            const date = new Date(doc.dateCreation);
            const monthYear = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            docsByMonth[monthYear] = (docsByMonth[monthYear] || 0) + 1;
        }
    });

    const totalUsers = state.allUsersForManagement.length || 0;
    const totalCategories = Object.keys(docsByCategory).length;
    const totalDepartments = Object.keys(docsByDepartment).length;

    // Calculer les moyennes
    const docsPerUser = totalUsers > 0 ? (totalDocs / totalUsers).toFixed(1) : 0;
    const docsPerCategory = totalCategories > 0 ? (totalDocs / totalCategories).toFixed(1) : 0;
    const docsPerDepartment = totalDepartments > 0 ? (totalDocs / totalDepartments).toFixed(1) : 0;

    // Trouver les top contributeurs
    const topUser = Object.entries(docsByUser).sort((a, b) => b[1] - a[1])[0];
    const topCategory = Object.entries(docsByCategory).sort((a, b) => b[1] - a[1])[0];
    const topDepartment = Object.entries(docsByDepartment).sort((a, b) => b[1] - a[1])[0];

    // Statistiques mensuelles (derniers 6 mois)
    const monthsArray = Object.entries(docsByMonth).sort((a, b) => b[0].localeCompare(a[0])).slice(0, 6);

    // État de l'onglet actuel (si pas défini, mettre 'vue-ensemble')
    if (!window.currentStatsTab) window.currentStatsTab = 'vue-ensemble';

    return `
        <div class="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4 backdrop-blur-sm"
             onclick="if(event.target === this) toggleAdvancedStats()">
            <div class="modal-glass rounded-2xl p-8 max-w-6xl w-full max-h-[90vh] overflow-y-auto shadow-2xl animate-fade-in" onclick="event.stopPropagation()">

                <!-- En-tête -->
                <div class="flex items-center justify-between mb-6">
                    <h2 class="text-3xl font-bold bg-gradient-to-r from-green-600 to-teal-600 bg-clip-text text-transparent">
                        📊 Tableau de bord statistiques
                    </h2>
                    <button onclick="toggleAdvancedStats()" class="text-gray-500 hover:text-gray-700 text-2xl font-bold">
                        ✕
                    </button>
                </div>

                <!-- Onglets de navigation -->
                <div class="flex gap-2 mb-6 border-b-2 border-gray-200 overflow-x-auto">
                    <button onclick="window.currentStatsTab='vue-ensemble'; render();"
                            class="px-4 py-2 font-medium whitespace-nowrap transition ${window.currentStatsTab === 'vue-ensemble' ? 'border-b-4 border-green-500 text-green-600' : 'text-gray-600 hover:text-gray-900'}">
                        📈 Vue d'ensemble
                    </button>
                    <button onclick="window.currentStatsTab='categories'; render();"
                            class="px-4 py-2 font-medium whitespace-nowrap transition ${window.currentStatsTab === 'categories' ? 'border-b-4 border-blue-500 text-blue-600' : 'text-gray-600 hover:text-gray-900'}">
                        📁 Par catégorie
                    </button>
                    <button onclick="window.currentStatsTab='departements'; render();"
                            class="px-4 py-2 font-medium whitespace-nowrap transition ${window.currentStatsTab === 'departements' ? 'border-b-4 border-orange-500 text-orange-600' : 'text-gray-600 hover:text-gray-900'}">
                        🏢 Par département
                    </button>
                    <button onclick="window.currentStatsTab='utilisateurs'; render();"
                            class="px-4 py-2 font-medium whitespace-nowrap transition ${window.currentStatsTab === 'utilisateurs' ? 'border-b-4 border-purple-500 text-purple-600' : 'text-gray-600 hover:text-gray-900'}">
                        👥 Par utilisateur
                    </button>
                    <button onclick="window.currentStatsTab='tendances'; render();"
                            class="px-4 py-2 font-medium whitespace-nowrap transition ${window.currentStatsTab === 'tendances' ? 'border-b-4 border-pink-500 text-pink-600' : 'text-gray-600 hover:text-gray-900'}">
                        📅 Tendances mensuelles
                    </button>
                </div>

                <!-- Contenu des onglets -->
                <div class="stats-content">
                    ${window.currentStatsTab === 'vue-ensemble' ? `
                        <!-- VUE D'ENSEMBLE -->
                        <div class="space-y-6">
                            <!-- Métriques principales -->
                            <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
                                <div class="bg-gradient-to-br from-blue-500 to-blue-600 p-5 rounded-xl text-white shadow-lg transform hover:scale-105 transition">
                                    <p class="text-sm opacity-90 font-medium">📚 Total Documents</p>
                                    <p class="text-4xl font-bold mt-2">${totalDocs}</p>
                                </div>
                                <div class="bg-gradient-to-br from-purple-500 to-purple-600 p-5 rounded-xl text-white shadow-lg transform hover:scale-105 transition">
                                    <p class="text-sm opacity-90 font-medium">👥 Utilisateurs actifs</p>
                                    <p class="text-4xl font-bold mt-2">${totalUsers}</p>
                                </div>
                                <div class="bg-gradient-to-br from-green-500 to-green-600 p-5 rounded-xl text-white shadow-lg transform hover:scale-105 transition">
                                    <p class="text-sm opacity-90 font-medium">📁 Catégories utilisées</p>
                                    <p class="text-4xl font-bold mt-2">${totalCategories}</p>
                                </div>
                                <div class="bg-gradient-to-br from-orange-500 to-orange-600 p-5 rounded-xl text-white shadow-lg transform hover:scale-105 transition">
                                    <p class="text-sm opacity-90 font-medium">🏢 Départements actifs</p>
                                    <p class="text-4xl font-bold mt-2">${totalDepartments}</p>
                                </div>
                            </div>

                            <!-- Moyennes et insights -->
                            <div class="bg-gradient-to-br from-indigo-50 to-purple-50 p-6 rounded-xl border-2 border-indigo-200">
                                <h3 class="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                                    <span>💡</span> Moyennes et statistiques clés
                                </h3>
                                <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div class="bg-white p-4 rounded-lg shadow-sm">
                                        <p class="text-sm text-gray-600 mb-1">Documents par utilisateur</p>
                                        <p class="text-3xl font-bold text-indigo-600">${docsPerUser}</p>
                                        <p class="text-xs text-gray-500 mt-1">en moyenne</p>
                                    </div>
                                    <div class="bg-white p-4 rounded-lg shadow-sm">
                                        <p class="text-sm text-gray-600 mb-1">Documents par catégorie</p>
                                        <p class="text-3xl font-bold text-blue-600">${docsPerCategory}</p>
                                        <p class="text-xs text-gray-500 mt-1">en moyenne</p>
                                    </div>
                                    <div class="bg-white p-4 rounded-lg shadow-sm">
                                        <p class="text-sm text-gray-600 mb-1">Documents par département</p>
                                        <p class="text-3xl font-bold text-orange-600">${docsPerDepartment}</p>
                                        <p class="text-xs text-gray-500 mt-1">en moyenne</p>
                                    </div>
                                </div>
                            </div>

                            <!-- Top contributeurs -->
                            <div class="bg-gradient-to-br from-yellow-50 to-orange-50 p-6 rounded-xl border-2 border-yellow-200">
                                <h3 class="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                                    <span>🏆</span> Top contributeurs
                                </h3>
                                <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    ${topUser ? `
                                        <div class="bg-white p-4 rounded-lg shadow-sm border-l-4 border-purple-500">
                                            <p class="text-xs text-gray-500 mb-1">👤 Utilisateur le plus actif</p>
                                            <p class="text-lg font-bold text-gray-800">@${topUser[0]}</p>
                                            <p class="text-sm text-purple-600 font-semibold">${topUser[1]} documents</p>
                                        </div>
                                    ` : ''}
                                    ${topCategory ? `
                                        <div class="bg-white p-4 rounded-lg shadow-sm border-l-4 border-blue-500">
                                            <p class="text-xs text-gray-500 mb-1">📁 Catégorie la plus utilisée</p>
                                            <p class="text-lg font-bold text-gray-800">${topCategory[0]}</p>
                                            <p class="text-sm text-blue-600 font-semibold">${topCategory[1]} documents</p>
                                        </div>
                                    ` : ''}
                                    ${topDepartment ? `
                                        <div class="bg-white p-4 rounded-lg shadow-sm border-l-4 border-orange-500">
                                            <p class="text-xs text-gray-500 mb-1">🏢 Département le plus actif</p>
                                            <p class="text-lg font-bold text-gray-800">${topDepartment[0]}</p>
                                            <p class="text-sm text-orange-600 font-semibold">${topDepartment[1]} documents</p>
                                        </div>
                                    ` : ''}
                                </div>
                            </div>
                        </div>
                    ` : ''}

                    ${window.currentStatsTab === 'categories' ? `
                        <!-- PAR CATÉGORIE -->
                        <div class="bg-white p-6 rounded-xl shadow-md border-2 border-blue-200">
                            <div class="flex items-center justify-between mb-4">
                                <h3 class="text-xl font-bold text-gray-800 flex items-center gap-2">
                                    <span>📁</span> Répartition des documents par catégorie
                                </h3>
                                <span class="text-sm text-gray-600 bg-blue-100 px-3 py-1 rounded-full font-medium">
                                    ${totalCategories} catégories actives
                                </span>
                            </div>
                            <p class="text-sm text-gray-600 mb-6">
                                Cette section montre comment vos ${totalDocs} documents sont répartis entre les différentes catégories.
                            </p>
                            <div class="space-y-3">
                                ${Object.entries(docsByCategory)
                                    .sort((a, b) => b[1] - a[1])
                                    .map(([cat, count], index) => {
                                        const percentage = (count / totalDocs * 100).toFixed(1);
                                        const colors = ['blue', 'indigo', 'purple', 'pink', 'cyan', 'teal'];
                                        const color = colors[index % colors.length];
                                        return `
                                            <div class="p-3 bg-gray-50 rounded-lg hover:shadow-md transition">
                                                <div class="flex justify-between items-center mb-2">
                                                    <div class="flex items-center gap-2">
                                                        <span class="text-lg">${index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '📄'}</span>
                                                        <span class="font-semibold text-gray-800">${cat}</span>
                                                    </div>
                                                    <div class="text-right">
                                                        <span class="text-lg font-bold text-${color}-600">${count}</span>
                                                        <span class="text-sm text-gray-500 ml-2">(${percentage}%)</span>
                                                    </div>
                                                </div>
                                                <div class="w-full bg-gray-200 rounded-full h-3">
                                                    <div class="bg-gradient-to-r from-${color}-500 to-${color}-600 h-3 rounded-full transition-all duration-500"
                                                         style="width: ${percentage}%"></div>
                                                </div>
                                            </div>
                                        `;
                                    }).join('')}
                            </div>
                        </div>
                    ` : ''}

                    ${window.currentStatsTab === 'departements' ? `
                        <!-- PAR DÉPARTEMENT -->
                        <div class="bg-white p-6 rounded-xl shadow-md border-2 border-orange-200">
                            <div class="flex items-center justify-between mb-4">
                                <h3 class="text-xl font-bold text-gray-800 flex items-center gap-2">
                                    <span>🏢</span> Répartition des documents par département
                                </h3>
                                <span class="text-sm text-gray-600 bg-orange-100 px-3 py-1 rounded-full font-medium">
                                    ${totalDepartments} départements actifs
                                </span>
                            </div>
                            <p class="text-sm text-gray-600 mb-6">
                                Visualisez la contribution de chaque département à l'archivage des documents.
                            </p>
                            <div class="space-y-3">
                                ${Object.entries(docsByDepartment)
                                    .sort((a, b) => b[1] - a[1])
                                    .map(([dept, count], index) => {
                                        const percentage = (count / totalDocs * 100).toFixed(1);
                                        const colors = ['orange', 'amber', 'yellow', 'lime', 'emerald', 'teal'];
                                        const color = colors[index % colors.length];
                                        return `
                                            <div class="p-3 bg-gray-50 rounded-lg hover:shadow-md transition">
                                                <div class="flex justify-between items-center mb-2">
                                                    <div class="flex items-center gap-2">
                                                        <span class="text-lg">${index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '🏛️'}</span>
                                                        <span class="font-semibold text-gray-800">${dept}</span>
                                                    </div>
                                                    <div class="text-right">
                                                        <span class="text-lg font-bold text-${color}-600">${count}</span>
                                                        <span class="text-sm text-gray-500 ml-2">(${percentage}%)</span>
                                                    </div>
                                                </div>
                                                <div class="w-full bg-gray-200 rounded-full h-3">
                                                    <div class="bg-gradient-to-r from-${color}-500 to-${color}-600 h-3 rounded-full transition-all duration-500"
                                                         style="width: ${percentage}%"></div>
                                                </div>
                                            </div>
                                        `;
                                    }).join('')}
                            </div>
                        </div>
                    ` : ''}

                    ${window.currentStatsTab === 'utilisateurs' ? `
                        <!-- PAR UTILISATEUR -->
                        <div class="bg-white p-6 rounded-xl shadow-md border-2 border-purple-200">
                            <div class="flex items-center justify-between mb-4">
                                <h3 class="text-xl font-bold text-gray-800 flex items-center gap-2">
                                    <span>👥</span> Classement des utilisateurs
                                </h3>
                                <span class="text-sm text-gray-600 bg-purple-100 px-3 py-1 rounded-full font-medium">
                                    Top ${Math.min(15, Object.keys(docsByUser).length)} utilisateurs
                                </span>
                            </div>
                            <p class="text-sm text-gray-600 mb-6">
                                Les utilisateurs les plus actifs dans l'archivage de documents. Moyenne de ${docsPerUser} documents par utilisateur.
                            </p>
                            <div class="space-y-3">
                                ${Object.entries(docsByUser)
                                    .sort((a, b) => b[1] - a[1])
                                    .slice(0, 15)
                                    .map(([user, count], index) => {
                                        const percentage = (count / totalDocs * 100).toFixed(1);
                                        const colors = ['purple', 'violet', 'fuchsia', 'pink', 'rose', 'indigo'];
                                        const color = colors[index % colors.length];
                                        return `
                                            <div class="p-3 bg-gray-50 rounded-lg hover:shadow-md transition">
                                                <div class="flex justify-between items-center mb-2">
                                                    <div class="flex items-center gap-3">
                                                        <span class="text-xl font-bold text-gray-400 w-8 text-center">${index + 1}</span>
                                                        <span class="text-lg">${index === 0 ? '🏆' : index === 1 ? '🥈' : index === 2 ? '🥉' : '👤'}</span>
                                                        <span class="font-semibold text-gray-800">@${user}</span>
                                                    </div>
                                                    <div class="text-right">
                                                        <span class="text-lg font-bold text-${color}-600">${count}</span>
                                                        <span class="text-sm text-gray-500 ml-2">(${percentage}%)</span>
                                                    </div>
                                                </div>
                                                <div class="w-full bg-gray-200 rounded-full h-3">
                                                    <div class="bg-gradient-to-r from-${color}-500 to-${color}-600 h-3 rounded-full transition-all duration-500"
                                                         style="width: ${percentage}%"></div>
                                                </div>
                                            </div>
                                        `;
                                    }).join('')}
                            </div>
                        </div>
                    ` : ''}

                    ${window.currentStatsTab === 'tendances' ? `
                        <!-- TENDANCES MENSUELLES -->
                        <div class="bg-white p-6 rounded-xl shadow-md border-2 border-pink-200">
                            <div class="flex items-center justify-between mb-4">
                                <h3 class="text-xl font-bold text-gray-800 flex items-center gap-2">
                                    <span>📅</span> Évolution mensuelle de l'archivage
                                </h3>
                                <span class="text-sm text-gray-600 bg-pink-100 px-3 py-1 rounded-full font-medium">
                                    Derniers ${monthsArray.length} mois
                                </span>
                            </div>
                            <p class="text-sm text-gray-600 mb-6">
                                Suivi de l'activité d'archivage mois par mois. Identifiez les périodes les plus actives.
                            </p>
                            ${monthsArray.length > 0 ? `
                                <div class="space-y-3">
                                    ${monthsArray.map(([month, count], index) => {
                                        const [year, monthNum] = month.split('-');
                                        const monthNames = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];
                                        const monthName = monthNames[parseInt(monthNum) - 1];
                                        const maxCount = Math.max(...monthsArray.map(m => m[1]));
                                        const percentage = (count / maxCount * 100).toFixed(1);
                                        const colors = ['pink', 'rose', 'fuchsia', 'purple', 'violet', 'indigo'];
                                        const color = colors[index % colors.length];
                                        return `
                                            <div class="p-3 bg-gray-50 rounded-lg hover:shadow-md transition">
                                                <div class="flex justify-between items-center mb-2">
                                                    <div class="flex items-center gap-3">
                                                        <span class="text-lg">${index === 0 ? '📌' : '📅'}</span>
                                                        <div>
                                                            <span class="font-semibold text-gray-800">${monthName} ${year}</span>
                                                            ${index === 0 ? '<span class="ml-2 text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">Plus récent</span>' : ''}
                                                        </div>
                                                    </div>
                                                    <div class="text-right">
                                                        <span class="text-lg font-bold text-${color}-600">${count}</span>
                                                        <span class="text-sm text-gray-500 ml-1">docs</span>
                                                    </div>
                                                </div>
                                                <div class="w-full bg-gray-200 rounded-full h-3">
                                                    <div class="bg-gradient-to-r from-${color}-500 to-${color}-600 h-3 rounded-full transition-all duration-500"
                                                         style="width: ${percentage}%"></div>
                                                </div>
                                            </div>
                                        `;
                                    }).join('')}
                                </div>
                            ` : `
                                <div class="text-center py-8 text-gray-500">
                                    <p class="text-lg">📭</p>
                                    <p class="mt-2">Aucune donnée mensuelle disponible</p>
                                </div>
                            `}
                        </div>
                    ` : ''}
                </div>

                <!-- Bouton fermer en bas -->
                <div class="mt-6 flex gap-3">
                    <button onclick="toggleAdvancedStats()" class="flex-1 px-6 py-3 bg-gradient-to-br from-gray-200 to-gray-300 rounded-xl hover:shadow-md transition font-medium">
                        Fermer
                    </button>
                </div>
            </div>
        </div>
    `;
}

// Fonction pour masquer/afficher le champ département selon le niveau du rôle
function toggleDepartmentField(containerId, roleId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    // Trouver le rôle sélectionné
    const roleSelect = event.target;
    const selectedOption = roleSelect.options[roleSelect.selectedIndex];
    const niveau = selectedOption ? parseInt(selectedOption.getAttribute('data-niveau')) : null;

    // Masquer le département si niveau 1, sinon afficher
    if (niveau === 1) {
        container.style.display = 'none';
        // Réinitialiser la valeur du département
        const deptSelect = container.querySelector('select');
        if (deptSelect) deptSelect.value = '';
    } else {
        container.style.display = 'block';
    }
}

// ===== GESTION DES DÉPARTEMENTS =====

async function addDepartement() {
    const nom = document.getElementById('new_dept_nom').value.trim();
    const code = document.getElementById('new_dept_code').value.trim();

    if (!nom || !code) {
        showNotification('❌ Tous les champs sont requis', 'error');
        return;
    }

    try {
        await apiCall('/departements', 'POST', { nom, code });
        await loadRolesAndDepartements();
        showNotification('✅ Département créé');
        document.getElementById('new_dept_nom').value = '';
        document.getElementById('new_dept_code').value = '';
    } catch (error) {
        Logger.error('Erreur création département:', error);
    }
}

async function deleteDepartement(deptId) {
    const confirmed = await customConfirm({
        title: 'Supprimer le département',
        message: 'Voulez-vous vraiment supprimer ce département ? Cette action est irréversible.',
        confirmText: 'Oui, supprimer',
        cancelText: 'Annuler',
        type: 'danger',
        icon: '🗑️'
    });

    if (!confirmed) return;

    try {
        await apiCall(`/departements/${deptId}`, 'DELETE');
        await loadRolesAndDepartements();
        showNotification('✅ Département supprimé');
    } catch (error) {
        Logger.error('Erreur suppression département:', error);
    }
}

function startEditDepartement(deptId) {
    const dept = state.departements.find(d => d._id === deptId);
    if (!dept) return;
    state.editingDepartement = { ...dept };
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
        showNotification('❌ Nom et code sont requis', 'error');
        return;
    }

    try {
        await apiCall(`/departements/${state.editingDepartement._id}`, 'PUT', { nom, code });
        await loadRolesAndDepartements();
        state.editingDepartement = null;
        showNotification('✅ Département modifié');
    } catch (error) {
        Logger.error('Erreur modification département:', error);
    }
}

function renderDepartementsManagement() {
    if (!state.showDepartementsManagement) return '';

    return `
        <div class="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4 backdrop-blur-sm"
             onclick="if(event.target === this) toggleDepartementsManagement()">
            <div class="modal-glass rounded-2xl p-8 max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl animate-fade-in" onclick="event.stopPropagation()">
                <h2 class="text-2xl font-bold mb-6 bg-gradient-to-r from-green-600 to-teal-600 bg-clip-text text-transparent">🏢 Gestion des départements</h2>

                <!-- Liste des départements -->
                <div class="space-y-3 mb-6">
                    ${state.departements.map((dept, index) => `
                        ${state.editingDepartement && state.editingDepartement._id === dept._id ? `
                            <!-- Mode édition -->
                            <div class="p-4 bg-green-50 rounded-xl space-y-3 border-2 border-green-300">
                                <div class="flex items-center gap-2 mb-2">
                                    <span class="text-lg font-bold">✏️ Modifier</span>
                                </div>
                                <input id="edit_dept_nom" type="text" value="${dept.nom}" placeholder="Nom du département"
                                       class="w-full px-3 py-2 border-2 rounded-lg input-modern text-sm">
                                <input id="edit_dept_code" type="text" value="${dept.code}" placeholder="Code (ex: DEPT001)"
                                       class="w-full px-3 py-2 border-2 rounded-lg input-modern text-sm">
                                <div class="flex gap-2">
                                    <button onclick="saveEditDepartement()" class="flex-1 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition text-sm font-medium">
                                        ✅ Enregistrer
                                    </button>
                                    <button onclick="cancelEditDepartement()" class="flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition text-sm font-medium">
                                        ❌ Annuler
                                    </button>
                                </div>
                            </div>
                        ` : `
                            <!-- Mode affichage -->
                            <div class="p-4 bg-gradient-to-r from-green-50 to-teal-50 rounded-xl border-2 border-green-200 hover:shadow-md transition">
                                <div class="flex items-center justify-between">
                                    <div class="flex-1">
                                        <div class="flex items-center gap-3 mb-2">
                                            <span class="text-2xl">🏢</span>
                                            <div>
                                                <h3 class="font-bold text-gray-900">${dept.nom}</h3>
                                                <p class="text-sm text-gray-600">Code: ${dept.code}</p>
                                            </div>
                                        </div>
                                    </div>
                                    <div class="flex gap-2">
                                        <button onclick='startEditDepartement("${dept._id}")' class="px-3 py-1 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition text-xs font-medium">
                                            ✏️ Modifier
                                        </button>
                                        <button onclick='deleteDepartement("${dept._id}")' class="px-3 py-1 bg-red-500 text-white rounded-lg hover:bg-red-600 transition text-xs font-medium">
                                            🗑️ Supprimer
                                        </button>
                                    </div>
                                </div>
                            </div>
                        `}
                    `).join('')}
                </div>

                <!-- Formulaire d'ajout -->
                <div class="bg-gradient-to-r from-teal-50 to-green-50 p-4 rounded-xl border-2 border-green-300 mb-4">
                    <h3 class="font-bold text-gray-800 mb-3">➕ Ajouter un nouveau département</h3>
                    <div class="space-y-3">
                        <input id="new_dept_nom" type="text" placeholder="Nom du département"
                               class="w-full px-3 py-2 border-2 rounded-lg input-modern text-sm">
                        <input id="new_dept_code" type="text" placeholder="Code (ex: DEPT001)"
                               class="w-full px-3 py-2 border-2 rounded-lg input-modern text-sm">
                        <button onclick="addDepartement()" class="w-full px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition font-medium">
                            ➕ Créer le département
                        </button>
                    </div>
                </div>

                <button onclick="toggleDepartementsManagement()" class="w-full px-6 py-3 bg-gradient-to-br from-gray-200 to-gray-300 rounded-xl hover:shadow-md transition font-medium">
                    Fermer
                </button>
            </div>
        </div>
    `;
}

// Exposer les fonctions globalement
window.createUser = createUser;
window.deleteUser = deleteUser;
window.startEditUser = startEditUser;
window.cancelEditUser = cancelEditUser;
window.saveEditUser = saveEditUser;
window.resetUserPassword = resetUserPassword;
window.addRole = addRole;
window.deleteRole = deleteRole;
window.startEditRole = startEditRole;
window.cancelEditRole = cancelEditRole;
window.saveEditRole = saveEditRole;
window.addDepartement = addDepartement;
window.deleteDepartement = deleteDepartement;
window.startEditDepartement = startEditDepartement;
window.cancelEditDepartement = cancelEditDepartement;
window.saveEditDepartement = saveEditDepartement;
window.renderUsersManagement = renderUsersManagement;
window.renderRolesManagement = renderRolesManagement;
window.renderDepartementsManagement = renderDepartementsManagement;
window.renderAdvancedStats = renderAdvancedStats;
window.toggleDepartmentField = toggleDepartmentField;
