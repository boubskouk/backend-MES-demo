// ============================================
// CONTROLLER DES CATÉGORIES
// Gestion des requêtes HTTP et réponses
// ============================================

const categoryService = require('../services/categoryService');

/**
 * GET /api/categories/:userId - Récupérer catégories du département
 */
async function getCategories(req, res) {
    try {
        const { userId } = req.params;

        const categories = await categoryService.getCategoriesByDepartment(userId);

        res.json(categories);

    } catch (error) {
        console.error('❌ Erreur getCategories:', error);

        if (error.message === 'Utilisateur non trouvé') {
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

/**
 * POST /api/categories - Créer une catégorie
 */
async function createCategory(req, res) {
    try {
        const { userId, id, nom, couleur, icon } = req.body;

        const result = await categoryService.createCategory(
            { id, nom, couleur, icon },
            userId
        );

        res.json(result);

    } catch (error) {
        console.error('❌ Erreur createCategory:', error);

        if (error.message === 'userId, id et nom sont obligatoires') {
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

        if (error.message === 'Seuls les utilisateurs niveau 0 et 1 peuvent créer des catégories') {
            return res.status(403).json({
                success: false,
                message: error.message
            });
        }

        if (error.message === 'Cette catégorie existe déjà dans le département') {
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
 * PUT /api/categories/:userId/:catId - Modifier une catégorie
 */
async function updateCategory(req, res) {
    try {
        const { userId, catId } = req.params;
        const { nom, couleur, icon } = req.body;

        const result = await categoryService.updateCategory(userId, catId, {
            nom,
            couleur,
            icon
        });

        res.json(result);

    } catch (error) {
        console.error('❌ Erreur updateCategory:', error);

        if (error.message === 'Utilisateur non trouvé') {
            return res.status(404).json({
                success: false,
                message: error.message
            });
        }

        if (error.message === 'Seuls les utilisateurs niveau 1 peuvent modifier des catégories') {
            return res.status(403).json({
                success: false,
                message: error.message
            });
        }

        if (error.message === 'Catégorie non trouvée dans le département') {
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

/**
 * DELETE /api/categories/:userId/:catId - Supprimer une catégorie
 */
async function deleteCategory(req, res) {
    try {
        const { userId, catId } = req.params;

        const result = await categoryService.deleteCategory(userId, catId);

        res.json(result);

    } catch (error) {
        console.error('❌ Erreur deleteCategory:', error);

        if (error.message === 'Utilisateur non trouvé') {
            return res.status(404).json({
                success: false,
                message: error.message
            });
        }

        if (error.message === 'Seuls les utilisateurs niveau 1 peuvent supprimer des catégories') {
            return res.status(403).json({
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

        if (error.message === 'Catégorie non trouvée dans le département') {
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
    getCategories,
    createCategory,
    updateCategory,
    deleteCategory
};
