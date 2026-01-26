// ============================================
// ROUTES MESSAGES
// ============================================

const express = require('express');
const router = express.Router();
const messagesController = require('../controllers/messages.controller');
const { isAuthenticated } = require('../middleware/authMiddleware');

// ============================================
// TOUTES LES ROUTES PROTÉGÉES
// ============================================

router.use(isAuthenticated);

// ============================================
// ENVOI
// ============================================

// POST /api/messages - Envoyer un message
router.post('/', messagesController.sendMessage);

// POST /api/messages/send - Envoyer un message au Super Admin (utilisateur niveau 1)
router.post('/send', async (req, res) => {
    try {
        const { message } = req.body;
        const userId = req.session?.userId;

        if (!userId) {
            return res.status(401).json({
                success: false,
                message: 'Non authentifié'
            });
        }

        if (!message) {
            return res.status(400).json({
                success: false,
                message: 'Message vide'
            });
        }

        // Récupérer l'utilisateur courant
        const collections = require('../config/database').getCollections();
        const currentUser = await collections.users.findOne({ username: userId });

        if (!currentUser) {
            return res.status(404).json({
                success: false,
                message: 'Utilisateur non trouvé'
            });
        }

        // Trouver le Super Admin (niveau 0)
        // 1. Trouver le rôle de niveau 0
        const superAdminRole = await collections.roles.findOne({ niveau: 0 });

        if (!superAdminRole) {
            return res.status(404).json({
                success: false,
                message: 'Rôle Super Admin non trouvé'
            });
        }

        // 2. Trouver un utilisateur avec ce rôle
        const superAdmin = await collections.users.findOne({ idRole: superAdminRole._id });

        if (!superAdmin) {
            return res.status(404).json({
                success: false,
                message: 'Super Admin non trouvé'
            });
        }

        // Créer le message
        const messageDoc = {
            from: userId,
            fromName: currentUser.nom,
            to: superAdmin.username,
            toName: superAdmin.nom || 'Super Admin',
            subject: '',
            body: message,
            type: 'normal',
            read: false,
            createdAt: new Date()
        };

        await collections.messages.insertOne(messageDoc);

        console.log(`📨 Message envoyé: ${userId} → ${superAdmin.username}`);

        res.json({
            success: true,
            message: 'Message envoyé avec succès',
            adminName: superAdmin.nom || 'Super Admin'
        });

    } catch (error) {
        console.error('❌ Erreur /messages/send:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur serveur'
        });
    }
});

// ============================================
// RÉCEPTION
// ============================================

// GET /api/messages/received/:userId - Messages reçus (limit 20)
router.get('/received/:userId', messagesController.getReceivedMessages);

// GET /api/messages/sent/:userId - Messages envoyés (limit 20)
router.get('/sent/:userId', messagesController.getSentMessages);

// GET /api/messages/:userId - Messages utilisateur (LEGACY - compatibilité)
router.get('/:userId', messagesController.getMessages);

// ============================================
// ACTIONS
// ============================================

// PUT /api/messages/:messageId/read - Marquer comme lu
router.put('/:messageId/read', messagesController.markAsRead);

// GET /api/messages/:userId/unread-count - Compteur non lus
router.get('/:userId/unread-count', messagesController.getUnreadCount);

// ============================================
// SUPPRESSION
// ============================================

// DELETE /api/messages/:messageId - Supprimer un message
router.delete('/:messageId', messagesController.deleteMessage);

// DELETE /api/messages/bulk/received/:userId - Supprimer tous messages reçus
router.delete('/bulk/received/:userId', messagesController.deleteAllReceived);

// DELETE /api/messages/bulk/sent/:userId - Supprimer tous messages envoyés
router.delete('/bulk/sent/:userId', messagesController.deleteAllSent);

// ============================================
// ROUTES UTILISATEUR CONNECTÉ
// ============================================

// GET /api/messages/my-conversation - Conversation de l'utilisateur connecté
router.get('/my-conversation', messagesController.getMyConversation);

// DELETE /api/messages/delete-all - Supprimer tous messages de l'utilisateur connecté
router.delete('/delete-all', messagesController.deleteAllMyMessages);

module.exports = router;
