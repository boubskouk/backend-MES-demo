// ============================================
// GESTION AUTHENTIFICATION - ARCHIVAGE C.E.R.E.R
// ============================================

// Connexion
async function login(username, password) {
    try {
        const result = await loginUser(username, password);

        if (result.success) {
            state.currentUser = username;
            state.isAuthenticated = true;
            await loadData();
            showNotification(`✅ Bienvenue ${username}!`);
            return true;
        } else if (result.maintenance === true) {
            // Mode maintenance activé - afficher le message pendant 10 secondes
            showMaintenanceMessage(result.message);
            return false;
        }
    } catch (error) {
        return false;
    }
}

// Afficher le message de maintenance pendant 10 secondes
function showMaintenanceMessage(message) {
    const overlay = document.createElement('div');
    overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.9);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10000;
        animation: fadeIn 0.3s;
    `;

    const messageBox = document.createElement('div');
    messageBox.style.cssText = `
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        padding: 40px;
        border-radius: 16px;
        max-width: 500px;
        text-align: center;
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
        animation: slideIn 0.3s;
    `;

    messageBox.innerHTML = `
        <div style="font-size: 60px; margin-bottom: 20px;">🔧</div>
        <h2 style="margin: 0 0 16px 0; font-size: 24px; font-weight: 700;">Mode Maintenance</h2>
        <p style="margin: 0; font-size: 16px; line-height: 1.6;">${message}</p>
        <div id="maintenanceCountdown" style="margin-top: 20px; font-size: 14px; opacity: 0.8;"></div>
    `;

    overlay.appendChild(messageBox);
    document.body.appendChild(overlay);

    // Compte à rebours de 10 secondes
    let countdown = 10;
    const countdownElement = document.getElementById('maintenanceCountdown');
    countdownElement.textContent = `Ce message disparaîtra dans ${countdown} secondes...`;

    const interval = setInterval(() => {
        countdown--;
        countdownElement.textContent = `Ce message disparaîtra dans ${countdown} secondes...`;
        if (countdown <= 0) {
            clearInterval(interval);
            overlay.style.animation = 'fadeOut 0.3s';
            setTimeout(() => overlay.remove(), 300);
        }
    }, 1000);

    // Fermer aussi au clic
    overlay.addEventListener('click', () => {
        clearInterval(interval);
        overlay.style.animation = 'fadeOut 0.3s';
        setTimeout(() => overlay.remove(), 300);
    });
}

// Inscription
async function register(username, password, nom, email, idRole, idDepartement, adminPassword) {
    if (adminPassword !== '100480') {
        showNotification('Mot de passe admin incorrect', 'error');
        return false;
    }

    try {
        const result = await registerUser(username, password, nom, email, idRole, idDepartement);

        if (result.success) {
            showNotification('✅ Compte créé avec succès!');
            return true;
        }
    } catch (error) {
        return false;
    }
}

// Déconnexion
async function logout() {
    const confirmed = await customConfirm({
        title: 'Déconnexion',
        message: 'Voulez-vous vraiment vous déconnecter ?',
        confirmText: 'Oui, me déconnecter',
        cancelText: 'Annuler',
        type: 'warning',
        icon: '🚪'
    });

    if (confirmed) {
        state.currentUser = null;
        state.isAuthenticated = false;
        state.documents = [];
        state.categories = [];
        showNotification('✅ Déconnexion réussie');
        render();
    }
}

// Gestion du formulaire de connexion
async function handleLogin() {
    const username = document.getElementById('login_username').value.trim();
    const password = document.getElementById('login_password').value;

    if (!username || !password) {
        showNotification('Veuillez remplir tous les champs', 'error');
        return;
    }

    await login(username, password);
}

// Gestion du formulaire d'inscription
async function handleRegister() {
    const nom = document.getElementById('reg_nom').value.trim();
    const email = document.getElementById('reg_email').value.trim();
    const username = document.getElementById('reg_username').value.trim();
    const password = document.getElementById('reg_password').value;
    const passwordConfirm = document.getElementById('reg_password_confirm').value;
    const idRole = document.getElementById('reg_role').value;
    const idDepartement = document.getElementById('reg_departement').value;
    const adminPassword = document.getElementById('reg_admin_password').value;

    if (!nom || !email || !username || !password || !passwordConfirm || !idRole || !idDepartement || !adminPassword) {
        showNotification('Veuillez remplir tous les champs', 'error');
        return;
    }

    if (username.length < 3 || password.length < 4) {
        showNotification('Username: 3+ caractères, Password: 4+ caractères', 'error');
        return;
    }

    if (password !== passwordConfirm) {
        showNotification('Les mots de passe ne correspondent pas', 'error');
        return;
    }

    const success = await register(username, password, nom, email, idRole, idDepartement, adminPassword);
    if (success) {
        state.showRegister = false;
        render();
    }
}

// Basculer vers le formulaire d'inscription
function toggleRegister() {
    state.showRegister = !state.showRegister;
    render();
}