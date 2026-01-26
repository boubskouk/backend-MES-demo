// ============================================
// ROUTES SERVICES
// ============================================

const express = require('express');
const router = express.Router();
const servicesController = require('../controllers/services.controller');
const { isAuthenticated } = require('../middleware/authMiddleware');

// ============================================
// TOUTES LES ROUTES PROTÉGÉES
// ============================================

router.use(isAuthenticated);

// ============================================
// ROUTES GÉNÉRALES SERVICES
// ============================================

// GET /api/services - Liste services (filtrés par niveau)
router.get('/', servicesController.getServices);

// POST /api/services - Créer service (niveaux 0, 1)
router.post('/', servicesController.createService);

// PUT /api/services/:id - Modifier service
router.put('/:id', servicesController.updateService);

// DELETE /api/services/:id - Supprimer service
router.delete('/:id', servicesController.deleteService);

// ============================================
// ROUTES DÉPARTEMENT (ordre important!)
// ============================================

// GET /api/services/departments/:deptId - Services d'un département
router.get('/departments/:deptId', servicesController.getDepartmentServices);

// POST /api/services/departments/:deptId - Créer service dans département (niveaux 0, 1, 2)
router.post('/departments/:deptId', servicesController.createServiceInDepartment);

module.exports = router;
