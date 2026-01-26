// ============================================
// ROUTES CATÉGORIES
// ============================================

const express = require('express');
const router = express.Router();
const categoriesController = require('../controllers/categories.controller');
const { isAuthenticated } = require('../middleware/authMiddleware');
const { requireLevel1OrAbove } = require('../middleware/permissionsMiddleware');

// ============================================
// TOUTES LES ROUTES PROTÉGÉES
// ============================================

router.use(isAuthenticated);

// ============================================
// RÉCUPÉRATION (tous les utilisateurs authentifiés)
// ============================================

// GET /api/categories/:userId - Récupérer catégories du département
router.get('/:userId', categoriesController.getCategories);

// ============================================
// CRÉATION (niveaux 0, 1, 2 uniquement - vérification dans le service)
// ============================================

// POST /api/categories - Créer une catégorie
router.post('/', categoriesController.createCategory);

// ============================================
// MODIFICATION (niveau 1 uniquement)
// ============================================

// PUT /api/categories/:userId/:catId - Modifier une catégorie
router.put('/:userId/:catId', requireLevel1OrAbove, categoriesController.updateCategory);

// ============================================
// SUPPRESSION (niveau 1 uniquement)
// ============================================

// DELETE /api/categories/:userId/:catId - Supprimer une catégorie
router.delete('/:userId/:catId', requireLevel1OrAbove, categoriesController.deleteCategory);

module.exports = router;
