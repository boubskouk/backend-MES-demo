// ============================================
// CONTROLLER DES DÉPARTEMENTS
// Gestion des requêtes HTTP et réponses
// ============================================

const { ObjectId } = require('mongodb');
const departementService = require('../services/departementService');
const { getCollections } = require('../config/database');

/**
 * GET /api/departements - Récupérer départements (filtrés par niveau)
 */
async function getDepartements(req, res) {
    try {
        const collections = getCollections();

        // Vérifier authentification
        if (!req.session || !req.session.userId) {
            return res.json({ success: true, departements: [] });
        }

        const currentUser = await collections.users.findOne({ username: req.session.userId });
        if (!currentUser) {
            return res.json({ success: true, departements: [] });
        }

        // Récupérer le rôle
        const roleId = typeof currentUser.idRole === 'string'
            ? new ObjectId(currentUser.idRole)
            : currentUser.idRole;

        const currentUserRole = await collections.roles.findOne({ _id: roleId });

        console.log(`🔍 /api/departements - User: ${req.session.userId}, Role: ${currentUserRole?.nom}, Niveau: ${currentUserRole?.niveau}`);

        // Filtrer selon le niveau
        const departements = await departementService.getDepartementsFiltered(currentUser, currentUserRole);

        // Enrichir avec statistiques
        const enrichedDepartements = await departementService.enrichDepartements(departements);

        console.log(`📊 /api/departements - ${enrichedDepartements.length} département(s) retourné(s) pour ${req.session.userId}`);

        res.json({ success: true, departements: enrichedDepartements });

    } catch (error) {
        console.error('❌ Erreur getDepartements:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur serveur'
        });
    }
}

/**
 * POST /api/departements - Créer un département
 */
async function createDepartement(req, res) {
    try {
        const { nom, icon, description } = req.body;
        const userId = req.session?.userId;

        // Vérifier authentification
        if (!userId) {
            return res.status(401).json({
                success: false,
                message: 'Non authentifié'
            });
        }

        const result = await departementService.createDepartement(
            { nom, icon, description },
            userId
        );

        res.json(result);

    } catch (error) {
        console.error('❌ Erreur createDepartement:', error);

        if (error.message === 'Le nom du département est obligatoire') {
            return res.status(400).json({
                success: false,
                message: error.message
            });
        }

        if (error.message === 'Utilisateur non trouvé') {
            return res.status(404).json({
                success: false,
                message: error.message
            });
        }

        if (error.message === 'Accès refusé: vous devez être Admin (Niveau 0 ou 1)') {
            return res.status(403).json({
                success: false,
                message: error.message
            });
        }

        res.status(500).json({
            success: false,
            message: 'Erreur serveur'
        });
    }
}

module.exports = {
    getDepartements,
    createDepartement
};
