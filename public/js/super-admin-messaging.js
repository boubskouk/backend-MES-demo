// ============================================
// SYSTÈME DE MESSAGERIE SUPER ADMIN
// ============================================

let currentReplyMessageId = null;
let currentTab = 'received'; // Tab actif
let messagesData = { received: [], sent: [] };

// Charger tous les messages (reçus ET envoyés)
async function loadMessages() {
    try {
        const response = await fetch('/api/superadmin/messages', {
            credentials: 'include'
        });

        if (!response.ok) {
            const text = await response.text();
            console.error('Erreur HTTP:', response.status, text);
            throw new Error(`Erreur ${response.status}: ${text.substring(0, 100)}`);
        }

        const data = await response.json();
        messagesData.received = data.received || [];
        messagesData.sent = data.sent || [];

        // Mettre à jour les compteurs
        document.getElementById('received-count').textContent = messagesData.received.length;
        document.getElementById('sent-count').textContent = messagesData.sent.length;

        // Afficher les messages selon l'onglet actif
        if (currentTab === 'received') {
            renderReceivedMessages();
        } else {
            renderSentMessages();
        }

        // Mettre à jour le compteur de messages non lus
        const unreadCount = messagesData.received.filter(m => !m.read).length;
        updateUnreadCount(unreadCount);

    } catch (error) {
        console.error('Erreur chargement messages:', error);
        const container = currentTab === 'received' ? 'content-received' : 'content-sent';
        document.getElementById(container).innerHTML = `
            <div style="text-align: center; padding: 40px; color: #ef4444;">
                ❌ Erreur lors du chargement des messages
            </div>
        `;
    }
}

// Changer d'onglet
function switchMessagesTab(tab) {
    currentTab = tab;

    // Mettre à jour les styles des onglets
    const receivedTab = document.getElementById('tab-received');
    const sentTab = document.getElementById('tab-sent');
    const receivedContent = document.getElementById('content-received');
    const sentContent = document.getElementById('content-sent');

    if (tab === 'received') {
        receivedTab.style.background = '#667eea';
        receivedTab.style.color = 'white';
        sentTab.style.background = '#f8fafc';
        sentTab.style.color = '#64748b';
        receivedContent.style.display = 'block';
        sentContent.style.display = 'none';
        renderReceivedMessages();
    } else {
        receivedTab.style.background = '#f8fafc';
        receivedTab.style.color = '#64748b';
        sentTab.style.background = '#667eea';
        sentTab.style.color = 'white';
        receivedContent.style.display = 'none';
        sentContent.style.display = 'block';
        renderSentMessages();
    }
}

// Afficher les messages reçus
function renderReceivedMessages() {
    const container = document.getElementById('content-received');
    const messages = messagesData.received;

    if (messages.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 40px; color: #94a3b8;">
                📭 Aucun message reçu pour le moment
            </div>
        `;
        return;
    }

    let html = `
        <div style="display: flex; justify-content: flex-end; margin-bottom: 16px;">
            <button onclick="deleteAllReceivedMessages()" style="padding: 10px 20px; background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); color: white; border: none; border-radius: 8px; font-weight: 600; cursor: pointer; font-size: 14px;">
                🗑️ Supprimer tous les messages reçus
            </button>
        </div>
    `;

    messages.forEach(msg => {
        const isUnread = !msg.read;

        html += `
            <div style="border: 2px solid ${isUnread ? '#667eea' : '#e2e8f0'}; border-radius: 12px; padding: 20px; margin-bottom: 16px; background: ${isUnread ? '#f0f4ff' : 'white'};">
                <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 12px;">
                    <div>
                        <div style="font-weight: 600; color: #1e293b; margin-bottom: 4px;">
                            ${isUnread ? '🔵 ' : ''}${msg.fromName || msg.from}
                        </div>
                        <div style="font-size: 12px; color: #64748b;">
                            De: ${msg.from} • ${new Date(msg.createdAt).toLocaleString('fr-FR')}
                        </div>
                    </div>
                    <div style="display: flex; gap: 8px;">
                        ${isUnread ? '<span style="background: #667eea; color: white; padding: 4px 12px; border-radius: 999px; font-size: 11px; font-weight: 600;">NOUVEAU</span>' : ''}
                    </div>
                </div>

                <div style="background: white; padding: 16px; border-radius: 8px; margin-bottom: 12px; border-left: 4px solid #667eea;">
                    <p style="margin: 0; color: #1e293b; line-height: 1.6; white-space: pre-wrap;">${msg.body}</p>
                </div>

                <div style="display: flex; gap: 8px;">
                    <button onclick="openReplyModal('${msg._id}', '${msg.from}', '${msg.fromName || msg.from}')" style="padding: 10px 20px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border: none; border-radius: 8px; font-weight: 600; cursor: pointer; font-size: 14px;">
                        💬 Répondre
                    </button>
                    <button onclick="deleteMessage('${msg._id}')" style="padding: 10px 20px; background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); color: white; border: none; border-radius: 8px; font-weight: 600; cursor: pointer; font-size: 14px;">
                        🗑️ Supprimer
                    </button>
                </div>
            </div>
        `;
    });

    container.innerHTML = html;
}

// Afficher les messages envoyés
function renderSentMessages() {
    const container = document.getElementById('content-sent');
    const messages = messagesData.sent;

    if (messages.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 40px; color: #94a3b8;">
                📭 Aucun message envoyé pour le moment
            </div>
        `;
        return;
    }

    let html = `
        <div style="display: flex; justify-content: flex-end; margin-bottom: 16px;">
            <button onclick="deleteAllSentMessages()" style="padding: 10px 20px; background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); color: white; border: none; border-radius: 8px; font-weight: 600; cursor: pointer; font-size: 14px;">
                🗑️ Supprimer tous les messages envoyés
            </button>
        </div>
    `;

    messages.forEach(msg => {
        html += `
            <div style="border: 2px solid #e2e8f0; border-radius: 12px; padding: 20px; margin-bottom: 16px; background: white;">
                <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 12px;">
                    <div>
                        <div style="font-weight: 600; color: #1e293b; margin-bottom: 4px;">
                            📤 À: ${msg.toName || msg.to}
                        </div>
                        <div style="font-size: 12px; color: #64748b;">
                            Destinataire: ${msg.to} • ${new Date(msg.createdAt).toLocaleString('fr-FR')}
                        </div>
                    </div>
                    <div style="background: #10b981; color: white; padding: 4px 12px; border-radius: 999px; font-size: 11px; font-weight: 600;">
                        ENVOYÉ
                    </div>
                </div>

                <div style="background: #f0fdf4; padding: 16px; border-radius: 8px; margin-bottom: 12px; border-left: 4px solid #10b981;">
                    <p style="margin: 0; color: #1e293b; line-height: 1.6; white-space: pre-wrap;">${msg.body}</p>
                </div>

                <div style="display: flex; justify-content: flex-end;">
                    <button onclick="deleteMessage('${msg._id}')" style="padding: 10px 20px; background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); color: white; border: none; border-radius: 8px; font-weight: 600; cursor: pointer; font-size: 14px;">
                        🗑️ Supprimer
                    </button>
                </div>
            </div>
        `;
    });

    container.innerHTML = html;
}

// Mettre à jour le compteur de messages non lus
function updateUnreadCount(count) {
    const badge = document.getElementById('unreadMessagesCount');
    if (badge) {
        if (count > 0) {
            badge.textContent = count;
            badge.style.display = 'inline-block';
        } else {
            badge.style.display = 'none';
        }
    }
}

// Ouvrir le modal de réponse
async function openReplyModal(messageId, recipientUsername, recipientName) {
    currentReplyMessageId = messageId;
    window.currentReplyRecipient = recipientUsername;
    window.currentReplyRecipientName = recipientName;

    // Trouver le message dans les données déjà chargées
    const message = messagesData.received.find(m => m._id === messageId);

    if (!message) {
        alert('Message non trouvé');
        return;
    }

    // Afficher le contenu du message original
    document.getElementById('replyModalContent').innerHTML = `
        <div style="background: #f8fafc; padding: 16px; border-radius: 8px; border-left: 4px solid #667eea;">
            <div style="font-size: 12px; font-weight: 600; color: #64748b; margin-bottom: 8px;">
                MESSAGE DE ${recipientName}
            </div>
            <p style="margin: 0; color: #1e293b; line-height: 1.6; white-space: pre-wrap;">${message.body}</p>
        </div>
    `;

    // Réinitialiser le champ de réponse
    document.getElementById('replyText').value = '';

    // Afficher le modal
    document.getElementById('replyModal').style.display = 'flex';

    // Marquer le message comme lu
    markAsRead(messageId);
}

// Fermer le modal
function closeReplyModal() {
    document.getElementById('replyModal').style.display = 'none';
    currentReplyMessageId = null;
}

// Envoyer une réponse
async function sendReply() {
    const replyText = document.getElementById('replyText').value.trim();

    if (!replyText) {
        alert('Veuillez écrire une réponse');
        return;
    }

    if (!currentReplyMessageId || !window.currentReplyRecipient) {
        alert('Erreur: aucun destinataire sélectionné');
        return;
    }

    try {
        const response = await fetch(`/api/superadmin/messages/send`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify({
                to: window.currentReplyRecipient,
                body: replyText,
                type: 'reply'
            })
        });

        if (!response.ok) {
            throw new Error('Erreur envoi réponse');
        }

        const result = await response.json();

        // Fermer le modal
        closeReplyModal();

        // Recharger les messages
        await loadMessages();

        // Notification avec le nom du destinataire
        alert(`✅ Message envoyé à ${window.currentReplyRecipientName || window.currentReplyRecipient} avec succès !`);

    } catch (error) {
        console.error('Erreur envoi réponse:', error);
        alert('❌ Erreur lors de l\'envoi de la réponse');
    }
}

// Marquer un message comme lu
async function markAsRead(messageId) {
    try {
        await fetch(`/api/messages/${messageId}/read`, {
            method: 'PUT',
            credentials: 'include'
        });

        // Recharger les messages
        await loadMessages();
    } catch (error) {
        console.error('Erreur marquage lu:', error);
    }
}

// Ouvrir le modal de nouveau message
async function openNewMessageModal() {
    document.getElementById('newMessageModal').style.display = 'flex';

    // Charger la liste des utilisateurs niveau 1
    await loadLevel1Users();
}

// Fermer le modal de nouveau message
function closeNewMessageModal() {
    document.getElementById('newMessageModal').style.display = 'none';
    document.getElementById('newMessageRecipient').value = '';
    document.getElementById('newMessageText').value = '';
}

// Charger la liste des utilisateurs niveau 1
async function loadLevel1Users() {
    try {
        const response = await fetch('/api/superadmin/users-level1', {
            credentials: 'include'
        });

        if (!response.ok) {
            throw new Error('Erreur chargement utilisateurs');
        }

        const data = await response.json();
        const select = document.getElementById('newMessageRecipient');

        if (data.users && data.users.length > 0) {
            select.innerHTML = '<option value="">-- Sélectionnez un destinataire --</option>' +
                data.users.map(user => `
                    <option value="${user.username}" data-name="${user.nom || user.username}">
                        ${user.nom || user.username} (${user.username}) - ${user.departementNom || 'Sans département'}
                    </option>
                `).join('');
        } else {
            select.innerHTML = '<option value="">Aucun utilisateur niveau 1 trouvé</option>';
        }

    } catch (error) {
        console.error('Erreur chargement utilisateurs niveau 1:', error);
        const select = document.getElementById('newMessageRecipient');
        select.innerHTML = '<option value="">Erreur de chargement</option>';
    }
}

// Envoyer un nouveau message
async function sendNewMessage() {
    const recipientSelect = document.getElementById('newMessageRecipient');
    const recipient = recipientSelect.value;
    const recipientName = recipientSelect.options[recipientSelect.selectedIndex]?.getAttribute('data-name') || recipient;
    const messageText = document.getElementById('newMessageText').value.trim();

    if (!recipient) {
        alert('Veuillez sélectionner un destinataire');
        return;
    }

    if (!messageText) {
        alert('Veuillez écrire un message');
        return;
    }

    try {
        const response = await fetch('/api/superadmin/messages/send', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify({
                to: recipient,
                body: messageText
            })
        });

        if (!response.ok) {
            throw new Error('Erreur envoi message');
        }

        // Fermer le modal
        closeNewMessageModal();

        // Notification avec le nom du destinataire
        alert(`✅ Message envoyé à ${recipientName} avec succès !`);

    } catch (error) {
        console.error('Erreur envoi nouveau message:', error);
        alert('❌ Erreur lors de l\'envoi du message');
    }
}

// Supprimer un message individuel
async function deleteMessage(messageId) {
    if (!confirm('Voulez-vous vraiment supprimer ce message ?')) {
        return;
    }

    try {
        const response = await fetch(`/api/messages/${messageId}`, {
            method: 'DELETE',
            credentials: 'include'
        });

        const data = await response.json();

        if (data.success) {
            // Recharger les messages
            await loadMessages();
            alert('✅ Message supprimé avec succès');
        } else {
            alert('❌ Erreur: ' + data.message);
        }
    } catch (error) {
        console.error('Erreur suppression message:', error);
        alert('❌ Erreur lors de la suppression du message');
    }
}

// Supprimer tous les messages reçus
async function deleteAllReceivedMessages() {
    const count = messagesData.received.length;

    if (count === 0) {
        alert('Aucun message à supprimer');
        return;
    }

    const confirmed = confirm(`⚠️ ATTENTION\n\nVous allez supprimer TOUS vos messages reçus (${count} message${count > 1 ? 's' : ''}).\n\nCette action est irréversible!\n\nÊtes-vous absolument sûr de vouloir continuer ?`);

    if (!confirmed) return;

    try {
        // Récupérer l'utilisateur connecté
        const currentUser = await fetch('/api/superadmin/current-user', { credentials: 'include' }).then(r => r.json());

        const response = await fetch(`/api/messages/bulk/received/${currentUser.username}`, {
            method: 'DELETE',
            credentials: 'include'
        });

        const data = await response.json();

        if (data.success) {
            // Recharger les messages
            await loadMessages();
            alert(`✅ ${data.deletedCount} message(s) supprimé(s) avec succès`);
        } else {
            alert('❌ Erreur: ' + data.message);
        }
    } catch (error) {
        console.error('Erreur suppression messages reçus:', error);
        alert('❌ Erreur lors de la suppression des messages');
    }
}

// Supprimer tous les messages envoyés
async function deleteAllSentMessages() {
    const count = messagesData.sent.length;

    if (count === 0) {
        alert('Aucun message à supprimer');
        return;
    }

    const confirmed = confirm(`⚠️ ATTENTION\n\nVous allez supprimer TOUS vos messages envoyés (${count} message${count > 1 ? 's' : ''}).\n\nCette action est irréversible!\n\nÊtes-vous absolument sûr de vouloir continuer ?`);

    if (!confirmed) return;

    try {
        // Récupérer l'utilisateur connecté
        const currentUser = await fetch('/api/superadmin/current-user', { credentials: 'include' }).then(r => r.json());

        const response = await fetch(`/api/messages/bulk/sent/${currentUser.username}`, {
            method: 'DELETE',
            credentials: 'include'
        });

        const data = await response.json();

        if (data.success) {
            // Recharger les messages
            await loadMessages();
            alert(`✅ ${data.deletedCount} message(s) supprimé(s) avec succès`);
        } else {
            alert('❌ Erreur: ' + data.message);
        }
    } catch (error) {
        console.error('Erreur suppression messages envoyés:', error);
        alert('❌ Erreur lors de la suppression des messages');
    }
}

// Hook pour charger les messages quand on ouvre la section
document.addEventListener('DOMContentLoaded', function() {
    // Sauvegarder la fonction navigateToSection originale
    if (typeof navigateToSection !== 'undefined') {
        const originalNavigate = navigateToSection;
        window.navigateToSection = function(section) {
            originalNavigate(section);
            if (section === 'messages') {
                setTimeout(() => loadMessages(), 100);
            }
        };
    }
});
