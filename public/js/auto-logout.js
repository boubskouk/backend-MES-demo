// ============================================
// DÉCONNEXION AUTOMATIQUE - TOUS UTILISATEURS
// Déconnexion après 20 minutes d'inactivité
// ============================================

(function() {
    'use strict';

    const INACTIVITY_TIMEOUT = 60 * 60 * 1000; // 60 minutes (1 heure) en millisecondes
    const WARNING_TIME = 2 * 60 * 1000; // Avertir 2 minutes avant la déconnexion
    const KEEP_ALIVE_INTERVAL = 5 * 60 * 1000; // Ping serveur toutes les 5 minutes

    let inactivityTimer = null;
    let warningTimer = null;
    let warningShown = false;
    let keepAliveInterval = null;

    // Événements qui comptent comme activité
    const activityEvents = [
        'mousedown',
        'mousemove',
        'keydown',
        'scroll',
        'touchstart',
        'click'
    ];

    // 💓 Ping le serveur pour maintenir la session active
    async function keepSessionAlive() {
        try {
            await fetch('/api/keep-alive', {
                method: 'POST',
                credentials: 'include'
            });
            // Log supprimé car trop verbeux (appelé toutes les 5 minutes)
        } catch (error) {
            Logger.warn('⚠️ Erreur keep-alive:', error);
        }
    }

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

        // Démarrer le timer d'avertissement (19 minutes)
        warningTimer = setTimeout(() => {
            showWarning();
        }, INACTIVITY_TIMEOUT - WARNING_TIME);

        // Démarrer le timer de déconnexion (20 minutes)
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
            background: rgba(0, 0, 0, 0.85);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 999999;
            animation: fadeIn 0.3s ease-out;
        `;

        overlay.innerHTML = `
            <div style="
                background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
                padding: 40px;
                border-radius: 20px;
                box-shadow: 0 20px 60px rgba(0,0,0,0.5);
                text-align: center;
                max-width: 500px;
                color: white;
                animation: slideIn 0.3s ease-out;
            ">
                <div style="font-size: 64px; margin-bottom: 20px;">⏰</div>
                <h2 style="font-size: 28px; font-weight: bold; margin-bottom: 15px;">
                    Session inactive
                </h2>
                <p style="font-size: 18px; margin-bottom: 25px; opacity: 0.9;">
                    Vous serez déconnecté dans <strong id="countdown">120</strong> secondes
                    pour inactivité.
                </p>
                <button onclick="window.autoLogout.continueSession()" style="
                    background: white;
                    color: #d97706;
                    padding: 15px 40px;
                    border: none;
                    border-radius: 10px;
                    font-size: 18px;
                    font-weight: bold;
                    cursor: pointer;
                    transition: all 0.2s;
                    box-shadow: 0 4px 12px rgba(0,0,0,0.2);
                " onmouseover="this.style.transform='scale(1.05)'" onmouseout="this.style.transform='scale(1)'">
                    ✅ Je suis toujours là
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
            @keyframes fadeOut {
                from { opacity: 1; }
                to { opacity: 0; }
            }
        `;
        document.head.appendChild(style);

        document.body.appendChild(overlay);

        // Compte à rebours
        let seconds = 120;
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

        Logger.info('⚠️ Avertissement d\'inactivité affiché - Déconnexion dans 120 secondes');
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
        Logger.info('🔴 Déconnexion automatique pour inactivité (60 minutes)...');

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
                Logger.info('✅ Déconnexion réussie');
            }
        } catch (error) {
            Logger.error('❌ Erreur lors de la déconnexion:', error);
        }

        // Rediriger vers la page de connexion dans tous les cas
        window.location.href = '/';
    }

    // Initialiser le système
    function init() {
        Logger.info('🔐 Système de déconnexion automatique activé (60 minutes d\'inactivité)');

        // Ajouter les écouteurs d'événements
        activityEvents.forEach(event => {
            document.addEventListener(event, resetInactivityTimer, true);
        });

        // Démarrer le timer initial
        resetInactivityTimer();

        // 💓 Démarrer le keep-alive pour maintenir la session serveur
        keepAliveInterval = setInterval(keepSessionAlive, KEEP_ALIVE_INTERVAL);
        Logger.info('💓 Keep-alive activé (ping toutes les 5 minutes)');
    }

    // Nettoyer lors du déchargement
    window.addEventListener('beforeunload', () => {
        if (keepAliveInterval) {
            clearInterval(keepAliveInterval);
        }
    });

    // Exposer les fonctions publiques
    window.autoLogout = {
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
