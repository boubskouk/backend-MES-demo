// ============================================
// SYSTÈME DE MESSAGERIE UTILISATEUR NIVEAU 1
// ============================================

let userConversation = [];

// Initialisation au chargement de la page
document.addEventListener('DOMContentLoaded', function() {
    // Vérifier si l'utilisateur est niveau 1 et afficher le bouton Messages
    checkUserLevelAndShowMessages();
});

// Vérifier le niveau de l'utilisateur et afficher le bouton si niveau 1
async function checkUserLevelAndShowMessages() {
    try {
        const response = await fetch('/api/user-info', {
            credentials: 'include'
        });

        if (!response.ok) {
            return;
        }

        const data = await response.json();

        // Afficher le bouton Messages uniquement pour les utilisateurs niveau 1
        if (data.niveau === 1) {
            const messagesBtn = document.getElementById('messagesBtn');
            if (messagesBtn) {
                messagesBtn.style.display = 'inline-block';
                // Charger le nombre de messages non lus
                loadUnreadCount();
            }
        }
    } catch (error) {
        Logger.error('Erreur vérification niveau utilisateur:', error);
    }
}

// Charger le nombre de messages non lus
async function loadUnreadCount() {
    try {
        const response = await fetch('/api/messages/my-conversation', {
            credentials: 'include'
        });

        if (!response.ok) {
            return;
        }

        const data = await response.json();

        // Compter les messages non lus (réponses du Super Admin)
        let unreadCount = 0;
        if (data.messages && data.messages.length > 0) {
            const lastMessage = data.messages[0];
            if (lastMessage.replies && lastMessage.replies.length > 0) {
                // Compter les réponses non lues
                unreadCount = lastMessage.replies.filter(reply => !reply.read).length;
            }
        }

        updateUnreadCountBadge(unreadCount);
    } catch (error) {
        Logger.error('Erreur chargement compteur non lus:', error);
    }
}

// Mettre à jour le badge de messages non lus
function updateUnreadCountBadge(count) {
    const badge = document.getElementById('unreadMessagesCountUser');
    if (badge) {
        if (count > 0) {
            badge.textContent = count;
            badge.style.display = 'inline-block';
        } else {
            badge.style.display = 'none';
        }
    }
}

// Ouvrir le modal de messagerie
async function openMessagesModal() {
    document.getElementById('messagesModal').style.display = 'flex';

    // Charger la conversation
    await loadUserConversation();
}

// Fermer le modal de messagerie
function closeMessagesModal() {
    document.getElementById('messagesModal').style.display = 'none';

    // Recharger le compteur de messages non lus
    loadUnreadCount();
}

// Charger la conversation avec le Super Admin
async function loadUserConversation() {
    try {
        const response = await fetch('/api/messages/my-conversation', {
            credentials: 'include'
        });

        if (!response.ok) {
            throw new Error('Erreur chargement conversation');
        }

        const data = await response.json();
        userConversation = data.messages || [];

        renderUserConversation();
    } catch (error) {
        Logger.error('Erreur chargement conversation:', error);
        document.getElementById('messagesConversation').innerHTML = `
            <div style="text-align: center; padding: 40px; color: #ef4444;">
                ❌ Erreur lors du chargement de la conversation
            </div>
        `;
    }
}

// Afficher la conversation
function renderUserConversation() {
    const conversationDiv = document.getElementById('messagesConversation');

    if (userConversation.length === 0) {
        conversationDiv.innerHTML = `
            <div style="text-align: center; padding: 40px; color: #94a3b8;">
                📭 Aucun message pour le moment
                <p style="margin-top: 12px; font-size: 14px;">Utilisez le formulaire ci-dessous pour envoyer un message au Super Admin</p>
            </div>
        `;
        return;
    }

    let html = '';

    // Parcourir tous les messages (du plus ancien au plus récent)
    userConversation.reverse().forEach(msg => {
        const messageId = msg._id;

        // Message de l'utilisateur
        html += `
            <div style="margin-bottom: 20px;">
                <div style="display: flex; justify-content: flex-end; align-items: flex-start; margin-bottom: 12px; gap: 8px;">
                    <button onclick="deleteMessage('${messageId}')"
                            style="background: #ef4444; color: white; border: none; border-radius: 50%; width: 28px; height: 28px; cursor: pointer; font-size: 14px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; margin-top: 8px;"
                            title="Supprimer ce message">
                        🗑️
                    </button>
                    <div style="max-width: 70%; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 16px; border-radius: 12px 12px 0 12px; box-shadow: 0 2px 8px rgba(102, 126, 234, 0.3);">
                        <div style="font-size: 11px; opacity: 0.9; margin-bottom: 6px;">
                            Vous • ${new Date(msg.date).toLocaleString('fr-FR')}
                        </div>
                        <p style="margin: 0; line-height: 1.6; white-space: pre-wrap;">${msg.message}</p>
                    </div>
                </div>
        `;

        // Réponses du Super Admin
        if (msg.replies && msg.replies.length > 0) {
            msg.replies.forEach((reply, index) => {
                const isLastReply = index === msg.replies.length - 1;
                const replyText = reply.message.replace(/'/g, "\\'").replace(/"/g, '\\"').replace(/\n/g, '\\n');
                html += `
                    <div style="display: flex; justify-content: flex-start; margin-bottom: 12px; gap: 8px;">
                        <div style="max-width: 70%; background: white; color: #1e293b; padding: 16px; border-radius: 12px 12px 12px 0; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1); border-left: 4px solid #10b981;">
                            <div style="font-size: 11px; color: #64748b; margin-bottom: 6px;">
                                🔰 Super Admin • ${new Date(reply.date).toLocaleString('fr-FR')}
                            </div>
                            <p style="margin: 0; line-height: 1.6; white-space: pre-wrap;">${reply.message}</p>
                        </div>
                        ${isLastReply ? `
                            <button onclick="replyToAdmin('${replyText}')"
                                    style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; border: none; border-radius: 50%; width: 32px; height: 32px; cursor: pointer; font-size: 14px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; margin-top: 0; box-shadow: 0 2px 6px rgba(16, 185, 129, 0.3); transition: all 0.3s ease;"
                                    onmouseover="this.style.transform='scale(1.1)'"
                                    onmouseout="this.style.transform='scale(1)'"
                                    title="Répondre à ce message">
                                💬
                            </button>
                        ` : ''}
                    </div>
                `;
            });
        }

        html += '</div>';
    });

    conversationDiv.innerHTML = html;

    // Scroller vers le bas pour voir les derniers messages
    conversationDiv.scrollTop = conversationDiv.scrollHeight;
}

// Envoyer un message au Super Admin
async function sendMessageToAdmin() {
    const messageText = document.getElementById('newMessageText').value.trim();

    if (!messageText) {
        customAlert('Veuillez écrire un message avant d\'envoyer', 'Message vide', '✏️');
        return;
    }

    try {
        const response = await fetch('/api/messages/send', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify({ message: messageText })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Erreur envoi message');
        }

        const data = await response.json();

        // Réinitialiser le champ de texte
        document.getElementById('newMessageText').value = '';

        // Fermer le modal
        closeMessagesModal();

        // Notification succès avec le nom de l'admin
        const adminName = data.adminName || 'Super Admin';
        customAlert(`Votre message a été envoyé à ${adminName} avec succès !`, 'Message envoyé', '✅');

    } catch (error) {
        Logger.error('Erreur envoi message:', error);
        customAlert('Une erreur est survenue lors de l\'envoi du message. Veuillez réessayer.', 'Erreur', '❌');
    }
}

// Supprimer un message individuel
async function deleteMessage(messageId) {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce message ?')) {
        return;
    }

    try {
        const response = await fetch(`/api/messages/${messageId}`, {
            method: 'DELETE',
            credentials: 'include'
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Erreur suppression message');
        }

        // Recharger la conversation
        await loadUserConversation();

        // Notification succès
        customAlert('Message supprimé avec succès', 'Suppression réussie', '✅');

    } catch (error) {
        Logger.error('Erreur suppression message:', error);
        customAlert('Une erreur est survenue lors de la suppression. Veuillez réessayer.', 'Erreur', '❌');
    }
}

// Supprimer tous les messages de la conversation
async function deleteAllMessages() {
    if (!confirm('⚠️ Êtes-vous sûr de vouloir supprimer TOUS vos messages ?\n\nCette action est irréversible !')) {
        return;
    }

    try {
        const response = await fetch('/api/messages/delete-all', {
            method: 'DELETE',
            credentials: 'include'
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Erreur suppression messages');
        }

        const data = await response.json();

        // Recharger la conversation
        await loadUserConversation();

        // Notification succès
        customAlert(`${data.deletedCount} message(s) supprimé(s) avec succès`, 'Suppression réussie', '✅');

    } catch (error) {
        Logger.error('Erreur suppression tous messages:', error);
        customAlert('Une erreur est survenue lors de la suppression. Veuillez réessayer.', 'Erreur', '❌');
    }
}

// Échapper les caractères HTML pour éviter les problèmes d'injection
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Répondre à un message du Super Admin
function replyToAdmin(originalMessage) {
    // Trouver le champ de texte
    const messageField = document.getElementById('newMessageText');

    if (!messageField) {
        Logger.error('Champ de texte non trouvé');
        return;
    }

    // Extraire les premiers mots du message original (max 50 caractères)
    const shortMessage = originalMessage.length > 50
        ? originalMessage.substring(0, 50) + '...'
        : originalMessage;

    // Pré-remplir le champ avec une référence au message
    messageField.value = `Re: "${shortMessage}"\n\n`;

    // Mettre le focus sur le champ de texte
    messageField.focus();

    // Placer le curseur à la fin
    messageField.setSelectionRange(messageField.value.length, messageField.value.length);

    // Scroller vers le bas pour voir le champ de texte
    messageField.scrollIntoView({ behavior: 'smooth', block: 'center' });

    Logger.info('💬 Réponse préparée pour le Super Admin');
}
