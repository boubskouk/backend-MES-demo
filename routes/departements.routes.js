// ============================================
// ROUTES DÉPARTEMENTS
// ============================================

const express = require('express');
const router = express.Router();
const departementsController = require('../controllers/departements.controller');
const { isAuthenticated } = require('../middleware/authMiddleware');

// ============================================
// TOUTES LES ROUTES PROTÉGÉES
// ============================================

router.use(isAuthenticated);

// GET /api/departements - Liste départements (filtrés par niveau)
router.get('/', departementsController.getDepartements);

// POST /api/departements - Créer département (niveaux 0, 1)
router.post('/', departementsController.createDepartement);

module.exports = router;
