// ============================================
// SERVICE DE GESTION DES MESSAGES
// Logique métier pure pour la messagerie
// ============================================

const { ObjectId } = require('mongodb');
const { getCollections } = require('../config/database');

/**
 * Envoyer un message
 */
async function sendMessage(messageData) {
    const collections = getCollections();

    const { from, to, subject, body, type, relatedData } = messageData;

    // Validation
    if (!from || !to || !body) {
        throw new Error('Données manquantes: from, to et body sont requis');
    }

    // Vérifier que l'expéditeur et le destinataire existent
    const sender = await collections.users.findOne({ username: from });
    const recipient = await collections.users.findOne({ username: to });

    if (!sender) {
        throw new Error('Expéditeur non trouvé');
    }

    if (!recipient) {
        throw new Error('Destinataire non trouvé');
    }

    // Créer le message
    const message = {
        from,
        fromName: sender.nom,
        to,
        toName: recipient.nom,
        subject: subject || '',
        body,
        type: type || 'normal', // normal, document-share
        relatedData: relatedData || null,
        read: false,
        createdAt: new Date()
    };

    const result = await collections.messages.insertOne(message);

    console.log(`📨 Message envoyé: ${from} → ${to}`);

    return {
        success: true,
        messageId: result.insertedId
    };
}

/**
 * Récupérer les messages reçus
 */
async function getReceivedMessages(userId, options = {}) {
    const collections = getCollections();

    const { unreadOnly = false } = options;

    const query = { to: userId };
    if (unreadOnly) {
        query.read = false;
    }

    const messages = await collections.messages
        .find(query)
        .sort({ createdAt: -1 })
        .limit(20)
        .toArray();

    return messages;
}

/**
 * Récupérer les messages envoyés
 */
async function getSentMessages(userId) {
    const collections = getCollections();

    const messages = await collections.messages
        .find({ from: userId })
        .sort({ createdAt: -1 })
        .limit(20)
        .toArray();

    return messages;
}

/**
 * Récupérer tous les messages d'un utilisateur (LEGACY - compatibilité)
 */
async function getUserMessages(userId, options = {}) {
    const collections = getCollections();

    const { unreadOnly = false } = options;

    const query = { to: userId };
    if (unreadOnly) {
        query.read = false;
    }

    const messages = await collections.messages
        .find(query)
        .sort({ createdAt: -1 })
        .toArray();

    return messages;
}

/**
 * Marquer un message comme lu
 */
async function markAsRead(messageId) {
    const collections = getCollections();

    const result = await collections.messages.updateOne(
        { _id: new ObjectId(messageId) },
        {
            $set: {
                read: true,
                readAt: new Date()
            }
        }
    );

    if (result.matchedCount === 0) {
        throw new Error('Message non trouvé');
    }

    console.log(`✅ Message marqué comme lu: ${messageId}`);

    return { success: true };
}

/**
 * Compter les messages non lus
 */
async function getUnreadCount(userId) {
    const collections = getCollections();

    const count = await collections.messages.countDocuments({
        to: userId,
        read: false
    });

    return count;
}

/**
 * Supprimer un message
 */
async function deleteMessage(messageId) {
    const collections = getCollections();

    const result = await collections.messages.deleteOne({
        _id: new ObjectId(messageId)
    });

    if (result.deletedCount === 0) {
        throw new Error('Message non trouvé');
    }

    console.log(`🗑️ Message supprimé: ${messageId}`);

    return { success: true };
}

/**
 * Supprimer tous les messages reçus
 */
async function deleteAllReceived(userId) {
    const collections = getCollections();

    const result = await collections.messages.deleteMany({ to: userId });

    console.log(`🗑️ ${result.deletedCount} messages reçus supprimés pour: ${userId}`);

    return {
        success: true,
        deletedCount: result.deletedCount
    };
}

/**
 * Supprimer tous les messages envoyés
 */
async function deleteAllSent(userId) {
    const collections = getCollections();

    const result = await collections.messages.deleteMany({ from: userId });

    console.log(`🗑️ ${result.deletedCount} messages envoyés supprimés pour: ${userId}`);

    return {
        success: true,
        deletedCount: result.deletedCount
    };
}

module.exports = {
    sendMessage,
    getReceivedMessages,
    getSentMessages,
    getUserMessages,
    markAsRead,
    getUnreadCount,
    deleteMessage,
    deleteAllReceived,
    deleteAllSent
};
