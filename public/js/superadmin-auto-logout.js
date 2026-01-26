// ============================================
// DÉCONNEXION AUTOMATIQUE SUPER ADMIN
// Déconnexion après 5 minutes d'inactivité
// ============================================

(function() {
    'use strict';

    const INACTIVITY_TIMEOUT = 5 * 60 * 1000; // 5 minutes en millisecondes
    const WARNING_TIME = 30 * 1000; // Avertir 30 secondes avant la déconnexion

    let inactivityTimer = null;
    let warningTimer = null;
    let warningShown = false;

    // Événements qui comptent comme activité
    const activityEvents = [
        'mousedown',
        'mousemove',
        'keydown',
        'scroll',
        'touchstart',
        'click'
    ];

    // Réinitialiser le timer d'inactivité
    function resetInactivityTimer() {
        // Annuler les timers existants
        if (inactivityTimer) {
            clearTimeout(inactivityTimer);
        }
        if (warningTimer) {
            clearTimeout(warningTimer);
        }

        // Cacher l'avertissement s'il était affiché
        if (warningShown) {
            hideWarning();
        }

        // Démarrer le timer d'avertissement (4min30s)
        warningTimer = setTimeout(() => {
            showWarning();
        }, INACTIVITY_TIMEOUT - WARNING_TIME);

        // Démarrer le timer de déconnexion (5min)
        inactivityTimer = setTimeout(() => {
            logout();
        }, INACTIVITY_TIMEOUT);

        // Log supprimé car trop verbeux (appelé à chaque mouvement de souris)
    }

    // Afficher l'avertissement
    function showWarning() {
        warningShown = true;

        // Créer un overlay d'avertissement
        const overlay = document.createElement('div');
        overlay.id = 'inactivity-warning';
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.8);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 999999;
            animation: fadeIn 0.3s ease-out;
        `;

        overlay.innerHTML = `
            <div style="
                background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
                padding: 40px;
                border-radius: 20px;
                box-shadow: 0 20px 60px rgba(0,0,0,0.5);
                text-align: center;
                max-width: 500px;
                color: white;
                animation: slideIn 0.3s ease-out;
            ">
                <div style="font-size: 64px; margin-bottom: 20px;">⚠️</div>
                <h2 style="font-size: 28px; font-weight: bold; margin-bottom: 15px;">
                    Inactivité détectée
                </h2>
                <p style="font-size: 18px; margin-bottom: 25px; opacity: 0.9;">
                    Vous allez être déconnecté dans <strong id="countdown">30</strong> secondes
                    pour des raisons de sécurité.
                </p>
                <button onclick="window.superAdminAutoLogout.continueSession()" style="
                    background: white;
                    color: #dc2626;
                    padding: 15px 40px;
                    border: none;
                    border-radius: 10px;
                    font-size: 18px;
                    font-weight: bold;
                    cursor: pointer;
                    transition: all 0.2s;
                    box-shadow: 0 4px 12px rgba(0,0,0,0.2);
                " onmouseover="this.style.transform='scale(1.05)'" onmouseout="this.style.transform='scale(1)'">
                    ✅ Continuer ma session
                </button>
            </div>
        `;

        // Ajouter les animations CSS
        const style = document.createElement('style');
        style.textContent = `
            @keyframes fadeIn {
                from { opacity: 0; }
                to { opacity: 1; }
            }
            @keyframes slideIn {
                from { transform: translateY(-50px); opacity: 0; }
                to { transform: translateY(0); opacity: 1; }
            }
        `;
        document.head.appendChild(style);

        document.body.appendChild(overlay);

        // Compte à rebours
        let seconds = 30;
        const countdownEl = document.getElementById('countdown');
        const countdownInterval = setInterval(() => {
            seconds--;
            if (countdownEl) {
                countdownEl.textContent = seconds;
            }
            if (seconds <= 0) {
                clearInterval(countdownInterval);
            }
        }, 1000);

        Logger.debug('⚠️ Avertissement d\'inactivité affiché - Déconnexion dans 30 secondes');
    }

    // Cacher l'avertissement
    function hideWarning() {
        const warning = document.getElementById('inactivity-warning');
        if (warning) {
            warning.style.animation = 'fadeOut 0.3s ease-out';
            setTimeout(() => {
                warning.remove();
            }, 300);
        }
        warningShown = false;
        // Log masqué car peu utile en production
    }

    // Continuer la session
    function continueSession() {
        hideWarning();
        resetInactivityTimer();
    }

    // Déconnecter l'utilisateur
    async function logout() {
        Logger.debug('🔴 Déconnexion automatique pour inactivité...');

        try {
            // Appeler l'endpoint de déconnexion
            const response = await fetch('/api/logout', {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                Logger.debug('✅ Déconnexion réussie');
            }
        } catch (error) {
            Logger.error('❌ Erreur lors de la déconnexion:', error);
        }

        // Rediriger vers la page de connexion dans tous les cas
        // Note: customAlert n'est pas disponible ici, donc on utilise un simple redirect
        window.location.href = '/super-admin-login.html';
    }

    // Initialiser le système
    function init() {
        Logger.debug('🔐 Système de déconnexion automatique Super Admin activé (5 minutes)');

        // Ajouter les écouteurs d'événements
        activityEvents.forEach(event => {
            document.addEventListener(event, resetInactivityTimer, true);
        });

        // Démarrer le timer initial
        resetInactivityTimer();
    }

    // Exposer les fonctions publiques
    window.superAdminAutoLogout = {
        continueSession,
        reset: resetInactivityTimer
    };

    // Démarrer automatiquement au chargement de la page
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
