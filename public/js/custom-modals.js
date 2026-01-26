// ============================================
// SYSTÈME DE MODALES PERSONNALISÉES DARK MODE
// Pour remplacer confirm(), alert(), prompt()
// ============================================

// État des modales
const modalState = {
    currentModal: null,
    resolve: null,
    reject: null
};

// Fonction globale pour fermer les modals (définie au début pour être toujours disponible)
window.closeCustomModal = function(confirmed = false) {
    const overlay = document.getElementById('custom-modal-overlay');
    if (overlay) {
        overlay.classList.add('animate-fade-out');
        setTimeout(() => {
            overlay.remove();
        }, 200);
    }

    // Si un résolveur existe, l'appeler
    if (window._customModalResolver) {
        window._customModalResolver(confirmed);
        delete window._customModalResolver;
    }
};

// ============================================
// MODAL DE CONFIRMATION MODERNE - DARK MODE
// ============================================
function customConfirm(options) {
    const {
        title = 'Confirmation',
        message = 'Êtes-vous sûr ?',
        confirmText = 'Confirmer',
        cancelText = 'Annuler',
        type = 'warning', // warning, danger, success, info
        icon = '⚠️'
    } = options;

    return new Promise((resolve) => {
        // Couleurs selon le type - VERSION DARK
        const colors = {
            warning: {
                gradient: 'from-orange-600 to-yellow-600',
                bg: 'from-orange-900/20 to-yellow-900/20',
                button: 'from-orange-500 to-orange-600',
                border: 'border-orange-500/50',
                glow: 'shadow-orange-500/50'
            },
            danger: {
                gradient: 'from-red-600 to-pink-600',
                bg: 'from-red-900/20 to-pink-900/20',
                button: 'from-red-500 to-red-600',
                border: 'border-red-500/50',
                glow: 'shadow-red-500/50'
            },
            success: {
                gradient: 'from-green-600 to-emerald-600',
                bg: 'from-green-900/20 to-emerald-900/20',
                button: 'from-green-500 to-green-600',
                border: 'border-green-500/50',
                glow: 'shadow-green-500/50'
            },
            info: {
                gradient: 'from-blue-600 to-cyan-600',
                bg: 'from-blue-900/20 to-cyan-900/20',
                button: 'from-blue-500 to-blue-600',
                border: 'border-blue-500/50',
                glow: 'shadow-blue-500/50'
            }
        };

        const color = colors[type] || colors.warning;

        const modalHTML = `
            <div id="custom-modal-overlay" class="fixed inset-0 bg-black/80 z-[9999] flex items-center justify-center backdrop-blur-lg animate-fade-in" onclick="if(event.target === this) window.closeCustomModal(false)">
                <div class="bg-gradient-to-br from-slate-900/98 to-slate-800/98 rounded-3xl shadow-2xl max-w-md w-full mx-4 animate-scale-in border-2 ${color.border} ${color.glow} shadow-2xl" onclick="event.stopPropagation()">

                    <!-- Header avec gradient -->
                    <div class="bg-gradient-to-r ${color.gradient} p-6 rounded-t-3xl relative overflow-hidden">
                        <div class="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent"></div>
                        <div class="relative z-10 flex items-center gap-4">
                            <div class="bg-white/20 backdrop-blur-sm p-3 rounded-xl shadow-lg">
                                <span class="text-4xl filter drop-shadow-lg">${icon}</span>
                            </div>
                            <h2 class="text-2xl font-bold text-white drop-shadow-lg">${title}</h2>
                        </div>
                    </div>

                    <!-- Corps -->
                    <div class="p-8">
                        <div class="bg-gradient-to-r ${color.bg} backdrop-blur-sm p-5 rounded-2xl ${color.border} border-2 mb-6">
                            <p class="text-gray-100 text-lg leading-relaxed font-medium">${message}</p>
                        </div>

                        <!-- Boutons -->
                        <div class="flex gap-3">
                            <button onclick="window.closeCustomModal(true)"
                                    class="flex-1 px-6 py-4 bg-gradient-to-r ${color.button} text-white rounded-xl hover:shadow-xl hover:scale-105 transition-all duration-300 font-bold text-lg shadow-lg">
                                ${confirmText}
                            </button>
                            <button onclick="window.closeCustomModal(false)"
                                    class="flex-1 px-6 py-4 bg-gradient-to-r from-slate-700 to-slate-600 text-white rounded-xl hover:shadow-xl hover:scale-105 transition-all duration-300 font-bold text-lg shadow-lg">
                                ${cancelText}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Injecter dans le DOM
        const div = document.createElement('div');
        div.innerHTML = modalHTML;
        document.body.appendChild(div);

        // Stocker le résolveur pour que closeCustomModal puisse l'appeler
        window._customModalResolver = resolve;
    });
}

// ============================================
// MODAL D'ALERTE MODERNE - DARK MODE
// ============================================
function customAlert(options) {
    const {
        title = 'Information',
        message = '',
        type = 'info', // success, error, warning, info
        buttonText = 'OK',
        icon = 'ℹ️'
    } = options;

    return new Promise((resolve) => {
        const colors = {
            success: {
                gradient: 'from-green-600 to-emerald-600',
                bg: 'from-green-900/20 to-emerald-900/20',
                button: 'from-green-500 to-green-600',
                border: 'border-green-500/50',
                glow: 'shadow-green-500/50'
            },
            error: {
                gradient: 'from-red-600 to-pink-600',
                bg: 'from-red-900/20 to-pink-900/20',
                button: 'from-red-500 to-red-600',
                border: 'border-red-500/50',
                glow: 'shadow-red-500/50'
            },
            warning: {
                gradient: 'from-orange-600 to-yellow-600',
                bg: 'from-orange-900/20 to-yellow-900/20',
                button: 'from-orange-500 to-orange-600',
                border: 'border-orange-500/50',
                glow: 'shadow-orange-500/50'
            },
            info: {
                gradient: 'from-blue-600 to-cyan-600',
                bg: 'from-blue-900/20 to-cyan-900/20',
                button: 'from-blue-500 to-blue-600',
                border: 'border-blue-500/50',
                glow: 'shadow-blue-500/50'
            }
        };

        const color = colors[type] || colors.info;

        const modalHTML = `
            <div id="custom-alert-overlay" class="fixed inset-0 bg-black/80 z-[9999] flex items-center justify-center backdrop-blur-lg animate-fade-in" onclick="if(event.target === this) window.closeCustomAlert()">
                <div class="bg-gradient-to-br from-slate-900/98 to-slate-800/98 rounded-3xl shadow-2xl max-w-md w-full mx-4 animate-scale-in border-2 ${color.border} ${color.glow} shadow-2xl" onclick="event.stopPropagation()">

                    <!-- Header -->
                    <div class="bg-gradient-to-r ${color.gradient} p-6 rounded-t-3xl relative overflow-hidden">
                        <div class="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent"></div>
                        <div class="relative z-10 flex items-center justify-center gap-4">
                            <div class="bg-white/20 backdrop-blur-sm p-3 rounded-xl shadow-lg">
                                <span class="text-5xl filter drop-shadow-lg">${icon}</span>
                            </div>
                            <h2 class="text-2xl font-bold text-white drop-shadow-lg">${title}</h2>
                        </div>
                    </div>

                    <!-- Corps -->
                    <div class="p-8">
                        <div class="bg-gradient-to-r ${color.bg} backdrop-blur-sm p-5 rounded-2xl ${color.border} border-2 mb-6">
                            <p class="text-gray-100 text-lg leading-relaxed text-center font-medium">${message}</p>
                        </div>

                        <button onclick="window.closeCustomAlert()"
                                class="w-full px-6 py-4 bg-gradient-to-r ${color.button} text-white rounded-xl hover:shadow-xl hover:scale-105 transition-all duration-300 font-bold text-lg shadow-lg">
                            ${buttonText}
                        </button>
                    </div>
                </div>
            </div>
        `;

        const div = document.createElement('div');
        div.innerHTML = modalHTML;
        document.body.appendChild(div);

        window.closeCustomAlert = () => {
            const overlay = document.getElementById('custom-alert-overlay');
            if (overlay) {
                overlay.classList.add('animate-fade-out');
                setTimeout(() => {
                    overlay.remove();
                    delete window.closeCustomAlert;
                }, 200);
            }
            resolve();
        };
    });
}

// ============================================
// MODAL DE PROMPT MODERNE - DARK MODE
// ============================================
function customPrompt(options) {
    const {
        title = 'Saisie requise',
        message = 'Veuillez entrer une valeur',
        placeholder = '',
        defaultValue = '',
        confirmText = 'Confirmer',
        cancelText = 'Annuler',
        type = 'text', // text, textarea, password
        icon = '✏️',
        rows = 4
    } = options;

    return new Promise((resolve) => {
        const modalHTML = `
            <div id="custom-prompt-overlay" class="fixed inset-0 bg-black/80 z-[9999] flex items-center justify-center backdrop-blur-lg animate-fade-in" onclick="if(event.target === this) window.closeCustomPrompt(null)">
                <div class="bg-gradient-to-br from-slate-900/98 to-slate-800/98 rounded-3xl shadow-2xl max-w-md w-full mx-4 animate-scale-in border-2 border-purple-500/50 shadow-purple-500/50 shadow-2xl" onclick="event.stopPropagation()">

                    <!-- Header -->
                    <div class="bg-gradient-to-r from-purple-600 to-pink-600 p-6 rounded-t-3xl relative overflow-hidden">
                        <div class="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent"></div>
                        <div class="relative z-10 flex items-center gap-4">
                            <div class="bg-white/20 backdrop-blur-sm p-3 rounded-xl shadow-lg">
                                <span class="text-4xl filter drop-shadow-lg">${icon}</span>
                            </div>
                            <h2 class="text-2xl font-bold text-white drop-shadow-lg">${title}</h2>
                        </div>
                    </div>

                    <!-- Corps -->
                    <div class="p-8">
                        <div class="mb-6">
                            <p class="text-gray-200 text-base mb-4 font-medium">${message}</p>
                            ${type === 'textarea' ? `
                                <textarea id="custom-prompt-input"
                                          class="w-full px-4 py-3 bg-slate-800/90 text-white border-2 border-purple-500/50 rounded-xl focus:border-purple-400 focus:ring-4 focus:ring-purple-500/30 outline-none transition backdrop-blur-sm resize-none placeholder-gray-400"
                                          placeholder="${placeholder}"
                                          rows="${rows}">${defaultValue}</textarea>
                            ` : type === 'password' ? `
                                <div class="relative">
                                    <input type="password" id="custom-prompt-input"
                                           class="w-full px-4 py-3 pr-12 bg-slate-800/90 text-white border-2 border-purple-500/50 rounded-xl focus:border-purple-400 focus:ring-4 focus:ring-purple-500/30 outline-none transition backdrop-blur-sm placeholder-gray-400"
                                           placeholder="${placeholder}"
                                           value="${defaultValue}">
                                    <button type="button" onclick="togglePasswordVisibility('custom-prompt-input')"
                                            class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300 hover:text-white focus:outline-none text-xl">
                                        <span id="custom-prompt-input_icon">👁️</span>
                                    </button>
                                </div>
                            ` : `
                                <input type="${type}" id="custom-prompt-input"
                                       class="w-full px-4 py-3 bg-slate-800/90 text-white border-2 border-purple-500/50 rounded-xl focus:border-purple-400 focus:ring-4 focus:ring-purple-500/30 outline-none transition backdrop-blur-sm placeholder-gray-400"
                                       placeholder="${placeholder}"
                                       value="${defaultValue}">
                            `}
                        </div>

                        <!-- Boutons -->
                        <div class="flex gap-3">
                            <button onclick="window.closeCustomPrompt(document.getElementById('custom-prompt-input').value)"
                                    class="flex-1 px-6 py-4 bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-xl hover:shadow-xl hover:scale-105 transition-all duration-300 font-bold text-lg shadow-lg">
                                ${confirmText}
                            </button>
                            <button onclick="window.closeCustomPrompt(null)"
                                    class="flex-1 px-6 py-4 bg-gradient-to-r from-slate-700 to-slate-600 text-white rounded-xl hover:shadow-xl hover:scale-105 transition-all duration-300 font-bold text-lg shadow-lg">
                                ${cancelText}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        const div = document.createElement('div');
        div.innerHTML = modalHTML;
        document.body.appendChild(div);

        // Focus sur l'input
        setTimeout(() => {
            document.getElementById('custom-prompt-input')?.focus();
        }, 100);

        // Valider avec Enter
        document.getElementById('custom-prompt-input')?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && type !== 'textarea') {
                window.closeCustomPrompt(e.target.value);
            }
        });

        window.closeCustomPrompt = (value) => {
            const overlay = document.getElementById('custom-prompt-overlay');
            if (overlay) {
                overlay.classList.add('animate-fade-out');
                setTimeout(() => {
                    overlay.remove();
                    delete window.closeCustomPrompt;
                }, 200);
            }
            resolve(value);
        };
    });
}

// ============================================
// MODAL D'AFFICHAGE DE MESSAGE (détails) - DARK MODE
// ============================================
function showMessageModal(message, type = 'received') {
    const isReceived = type === 'received';
    const colors = isReceived ? {
        gradient: 'from-blue-600 to-purple-600',
        bg: 'from-blue-900/20 to-purple-900/20',
        border: 'border-blue-500/50',
        accent: 'blue',
        glow: 'shadow-blue-500/50'
    } : {
        gradient: 'from-green-600 to-emerald-600',
        bg: 'from-green-900/20 to-emerald-900/20',
        border: 'border-green-500/50',
        accent: 'green',
        glow: 'shadow-green-500/50'
    };

    const messageContent = message.body || message.message || '';
    const messageFrom = message.fromName || message.from;
    const messageTo = message.toName || message.to;

    const modalHTML = `
        <div id="message-detail-overlay" class="fixed inset-0 bg-black/80 z-[9999] flex items-center justify-center backdrop-blur-lg animate-fade-in" onclick="if(event.target === this) window.closeMessageModal()">
            <div class="bg-gradient-to-br from-slate-900/98 to-slate-800/98 rounded-3xl shadow-2xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto animate-scale-in border-2 ${colors.border} ${colors.glow} shadow-2xl" onclick="event.stopPropagation()">

                <!-- Header amélioré -->
                <div class="bg-gradient-to-r ${colors.gradient} p-6 rounded-t-3xl relative overflow-hidden sticky top-0 z-10 shadow-lg">
                    <div class="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent"></div>
                    <div class="relative z-10">
                        <div class="flex items-center justify-between mb-3">
                            <div class="flex items-center gap-3 flex-1">
                                <div class="bg-white/20 backdrop-blur-sm p-3 rounded-xl shadow-lg">
                                    <span class="text-4xl filter drop-shadow-lg">${isReceived ? '📥' : '📤'}</span>
                                </div>
                                <div class="flex-1">
                                    <h2 class="text-2xl font-bold text-white mb-1 drop-shadow-lg">${message.subject || '(Sans sujet)'}</h2>
                                    <div class="flex items-center gap-2 text-sm text-white/90">
                                        <span class="px-3 py-1 bg-white/20 backdrop-blur-sm rounded-full font-medium">
                                            ${isReceived ? '📨 De:' : '📬 À:'} ${isReceived ? messageFrom : messageTo}
                                        </span>
                                    </div>
                                </div>
                            </div>
                            <button onclick="window.closeMessageModal()"
                                    class="text-white hover:bg-white/20 w-12 h-12 rounded-full flex items-center justify-center transition text-2xl hover:rotate-90 duration-300">
                                ✖
                            </button>
                        </div>
                        <div class="flex items-center gap-4 text-sm text-white/90 flex-wrap">
                            <span class="px-3 py-1 bg-white/20 backdrop-blur-sm rounded-full font-medium">📅 ${formatDate(message.dateEnvoi || message.createdAt)}</span>
                            ${!message.lu && !message.read && isReceived ? '<span class="px-3 py-1 bg-yellow-400 text-yellow-900 rounded-full text-xs font-bold animate-pulse">✨ NOUVEAU</span>' : ''}
                            ${isReceived ? '<span class="px-3 py-1 bg-white/20 backdrop-blur-sm rounded-full text-xs font-bold">MESSAGE REÇU</span>' : '<span class="px-3 py-1 bg-white/20 backdrop-blur-sm rounded-full text-xs font-bold">MESSAGE ENVOYÉ</span>'}
                        </div>
                    </div>
                </div>

                <!-- Corps du message avec contexte -->
                <div class="p-8">
                    <!-- Contexte du message pour réponse facile -->
                    ${isReceived ? `
                        <div class="bg-blue-900/20 border-l-4 border-blue-400 p-4 rounded-lg mb-4 backdrop-blur-sm">
                            <p class="text-sm text-blue-300 font-semibold mb-1">💡 Conseil rapide</p>
                            <p class="text-xs text-blue-200">Utilisez le bouton "Répondre" pour envoyer une réponse directe avec le contexte du message original</p>
                        </div>
                    ` : ''}

                    <!-- Message principal -->
                    <div class="bg-gradient-to-r ${colors.bg} backdrop-blur-sm p-6 rounded-2xl ${colors.border} border-2 mb-6 min-h-[200px] shadow-inner">
                        <div class="flex items-center gap-2 mb-3 pb-2 border-b-2 ${colors.border}">
                            <span class="text-lg">💬</span>
                            <span class="font-bold text-gray-100 text-sm">Contenu du message</span>
                        </div>
                        <div class="prose max-w-none text-gray-100 text-base leading-relaxed whitespace-pre-wrap">
                            ${messageContent}
                        </div>
                    </div>

                    <!-- Actions améliorées -->
                    <div class="grid grid-cols-1 md:grid-cols-${isReceived ? '3' : '2'} gap-3">
                        ${isReceived ? `
                            <button onclick="window.replyToMessageWithContext('${message.from}', '${escapeQuotes(message.subject || '')}', '${escapeQuotes(messageContent.substring(0, 200))}', '${messageFrom}')"
                                    class="px-6 py-4 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl hover:shadow-xl transition-all duration-300 font-bold text-lg flex items-center justify-center gap-2 hover:scale-105">
                                <span class="text-2xl">↩️</span>
                                <span>Répondre</span>
                            </button>
                        ` : ''}
                        <button onclick="window.deleteThisMessage('${message._id}', '${type}')"
                                class="px-6 py-4 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-xl hover:shadow-xl transition-all duration-300 font-bold text-lg flex items-center justify-center gap-2 hover:scale-105">
                            <span class="text-2xl">🗑️</span>
                            <span>Supprimer</span>
                        </button>
                        <button onclick="window.closeMessageModal()"
                                class="px-6 py-4 bg-gradient-to-r from-slate-700 to-slate-600 text-white rounded-xl hover:shadow-xl transition-all duration-300 font-bold text-lg flex items-center justify-center gap-2 hover:scale-105">
                            <span class="text-2xl">✖</span>
                            <span>Fermer</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;

    const div = document.createElement('div');
    div.innerHTML = modalHTML;
    document.body.appendChild(div);

    window.closeMessageModal = () => {
        const overlay = document.getElementById('message-detail-overlay');
        if (overlay) {
            overlay.classList.add('animate-fade-out');
            setTimeout(() => {
                overlay.remove();
                delete window.closeMessageModal;
                delete window.deleteThisMessage;
                delete window.replyToMessageWithContext;
            }, 200);
        }
    };

    window.deleteThisMessage = async (messageId, type) => {
        const confirmed = await customConfirm({
            title: 'Supprimer le message',
            message: 'Voulez-vous vraiment supprimer ce message ? Cette action est irréversible.',
            confirmText: 'Oui, supprimer',
            cancelText: 'Non, annuler',
            type: 'danger',
            icon: '🗑️'
        });

        if (confirmed) {
            window.closeMessageModal();
            await deleteMessageAndRefresh(messageId, type);
        }
    };

    window.replyToMessageWithContext = (to, subject, originalMessage, fromName) => {
        window.closeMessageModal();
        replyToMessage(to, subject, originalMessage, fromName);
    };
}

// ============================================
// UTILITAIRES
// ============================================
function escapeQuotes(str) {
    if (!str) return '';
    return str.replace(/'/g, "\\'").replace(/"/g, '&quot;');
}

function formatDate(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now - date;
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    const time = date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const fullDate = date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });

    if (days === 0) {
        return `Aujourd'hui à ${time}`;
    } else if (days === 1) {
        return `Hier à ${time}`;
    } else if (days < 7) {
        return `${fullDate} à ${time}`;
    } else {
        return `${fullDate} à ${time}`;
    }
}

// ============================================
// EXPORTS GLOBAUX
// ============================================
window.customConfirm = customConfirm;
window.customAlert = customAlert;
window.customPrompt = customPrompt;
window.showMessageModal = showMessageModal;
