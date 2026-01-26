// ============================================
// CONTROLLER DES SERVICES
// Gestion des requêtes HTTP et réponses
// ============================================

const { ObjectId } = require('mongodb');
const serviceService = require('../services/serviceService');
const { getCollections } = require('../config/database');

/**
 * GET /api/services - Récupérer services (filtrés par niveau)
 */
async function getServices(req, res) {
    try {
        const collections = getCollections();

        // Vérifier authentification
        if (!req.session || !req.session.userId) {
            return res.json({ success: true, services: [] });
        }

        const currentUser = await collections.users.findOne({ username: req.session.userId });
        if (!currentUser) {
            return res.json({ success: true, services: [] });
        }

        // Récupérer le rôle
        const roleId = typeof currentUser.idRole === 'string'
            ? new ObjectId(currentUser.idRole)
            : currentUser.idRole;

        const currentUserRole = await collections.roles.findOne({ _id: roleId });

        console.log(`🔍 /api/services - User: ${req.session.userId}, Role: ${currentUserRole?.nom}, Niveau: ${currentUserRole?.niveau}`);

        // Filtrer selon le niveau
        const services = await serviceService.getServicesFiltered(currentUser, currentUserRole);

        console.log(`📊 /api/services - ${services.length} service(s) retourné(s) pour ${req.session.userId}`);

        res.json({ success: true, services });

    } catch (error) {
        console.error('❌ Erreur getServices:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur serveur'
        });
    }
}

/**
 * POST /api/services - Créer un service
 */
async function createService(req, res) {
    try {
        const { nom, code, idDepartement, description, icon } = req.body;
        const userId = req.session?.userId;

        const result = await serviceService.createService(
            { nom, code, idDepartement, description, icon },
            userId
        );

        res.json(result);

    } catch (error) {
        console.error('❌ Erreur createService:', error);

        if (error.message === 'Nom, code et département requis') {
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

        if (error.message === 'Accès refusé: vous devez être Niveau 0 ou 1') {
            return res.status(403).json({
                success: false,
                message: error.message
            });
        }

        if (error.message === 'Ce code de service existe déjà') {
            return res.status(400).json({
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

/**
 * PUT /api/services/:id - Modifier un service
 */
async function updateService(req, res) {
    try {
        const { id } = req.params;
        const { nom, code, icon, description } = req.body;

        const result = await serviceService.updateService(id, {
            nom,
            code,
            icon,
            description
        });

        res.json(result);

    } catch (error) {
        console.error('❌ Erreur updateService:', error);

        if (error.message === 'Le nom du service est obligatoire') {
            return res.status(400).json({
                success: false,
                message: error.message
            });
        }

        if (error.message === 'Service non trouvé') {
            return res.status(404).json({
                success: false,
                message: error.message
            });
        }

        if (error.message === 'Ce code de service existe déjà') {
            return res.status(400).json({
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

/**
 * DELETE /api/services/:id - Supprimer un service
 */
async function deleteService(req, res) {
    try {
        const { id } = req.params;

        const result = await serviceService.deleteService(id);

        res.json(result);

    } catch (error) {
        console.error('❌ Erreur deleteService:', error);

        if (error.message === 'Service non trouvé') {
            return res.status(404).json({
                success: false,
                message: error.message
            });
        }

        if (error.message.startsWith('Impossible de supprimer :')) {
            return res.status(400).json({
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

/**
 * GET /api/departments/:deptId/services - Services d'un département
 */
async function getDepartmentServices(req, res) {
    try {
        const { deptId } = req.params;
        const userId = req.session?.userId;

        // Vérifier authentification
        if (!userId) {
            return res.status(401).json({
                success: false,
                message: 'Non authentifié'
            });
        }

        // Vérifier accès au département
        await serviceService.checkDepartmentAccess(userId, deptId);

        // Récupérer les services enrichis
        const services = await serviceService.getDepartmentServices(deptId, true);

        console.log(`📂 /api/departments/${deptId}/services - ${services.length} service(s) trouvé(s)`);

        res.json({ success: true, services });

    } catch (error) {
        console.error('❌ Erreur getDepartmentServices:', error);

        if (error.message === 'Utilisateur non trouvé') {
            return res.status(404).json({
                success: false,
                message: error.message
            });
        }

        if (error.message.startsWith('Accès refusé:')) {
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

/**
 * POST /api/departments/:deptId/services - Créer service dans département
 */
async function createServiceInDepartment(req, res) {
    try {
        const { deptId } = req.params;
        const { nom, icon, description } = req.body;
        const userId = req.session?.userId;

        // Vérifier authentification
        if (!userId) {
            return res.status(401).json({
                success: false,
                message: 'Non authentifié'
            });
        }

        const result = await serviceService.createServiceInDepartment(
            deptId,
            { nom, icon, description },
            userId
        );

        res.json(result);

    } catch (error) {
        console.error('❌ Erreur createServiceInDepartment:', error);

        if (error.message === 'Le nom du service est obligatoire') {
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

        if (error.message === 'Accès refusé: vous devez être Niveau 0, 1 ou 2') {
            return res.status(403).json({
                success: false,
                message: error.message
            });
        }

        if (error.message === 'Département non trouvé') {
            return res.status(404).json({
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
    getServices,
    createService,
    updateService,
    deleteService,
    getDepartmentServices,
    createServiceInDepartment
};
