// ============================================
// ROUTES DOCUMENTS
// ============================================

const express = require('express');
const router = express.Router();
const documentsController = require('../controllers/documents.controller');
const { isAuthenticated } = require('../middleware/authMiddleware');
const { requireLevel1OrAbove } = require('../middleware/permissionsMiddleware');
const security = require('../security-config');
const { body } = require('express-validator');

// ============================================
// ROUTES PUBLIQUES (avec authentification)
// ============================================

// GET /api/documents/:userId - Récupérer les documents accessibles
router.get('/:userId', isAuthenticated, documentsController.getAccessibleDocuments);

// GET /api/documents/:userId/:docId - Récupérer un document spécifique
router.get('/:userId/:docId', isAuthenticated, documentsController.getDocument);

// POST /api/documents - Créer un document (avec rate limiting)
router.post('/',
    security.uploadLimiter,
    [
        body('userId').trim().notEmpty().isLength({ min: 3, max: 50 }),
        body('titre').trim().notEmpty().isLength({ min: 3, max: 200 }).escape(),
        body('description').optional().trim().isLength({ max: 1000 }).escape(),
        body('categorie').trim().notEmpty(),
        body('type').optional().trim() // Type MIME du fichier (optionnel)
    ],
    documentsController.createDocument
);

// DELETE /api/documents/:userId/delete-all - Supprimer tous les documents accessibles (DOIT ÊTRE AVANT /:userId/:docId)
router.delete('/:userId/delete-all', isAuthenticated, documentsController.deleteAll);

// DELETE /api/documents/:userId/:docId - Supprimer un document (soft delete)
router.delete('/:userId/:docId', isAuthenticated, documentsController.deleteDocument);

// ============================================
// ROUTES PARTAGE
// ============================================

// POST /api/documents/:userId/:docId/share - Partager un document
router.post('/:userId/:docId/share', isAuthenticated, documentsController.shareDocument);

// POST /api/documents/:userId/:docId/unshare - Retirer le partage
router.post('/:userId/:docId/unshare', isAuthenticated, documentsController.unshareDocument);

// GET /api/documents/:userId/:docId/shared-users - Liste des utilisateurs avec qui le document est partagé
router.get('/:userId/:docId/shared-users', isAuthenticated, documentsController.getSharedUsers);

// ============================================
// ROUTES VERROUILLAGE (Niveau 1 uniquement)
// ============================================

// POST /api/documents/:userId/:docId/toggle-lock - Verrouiller/Déverrouiller
router.post('/:userId/:docId/toggle-lock', requireLevel1OrAbove, documentsController.toggleLock);

// ============================================
// ROUTES TÉLÉCHARGEMENT
// ============================================

// POST /api/documents/:userId/:docId/download - Enregistrer un téléchargement
router.post('/:userId/:docId/download', isAuthenticated, documentsController.recordDownload);

// GET /api/documents/:userId/:docId/download-json - Télécharger le document au format JSON
router.get('/:userId/:docId/download-json', isAuthenticated, documentsController.downloadAsJson);

// ============================================
// ROUTES CORBEILLE
// ============================================

// POST /api/documents/restore/:docId - Restaurer depuis la corbeille
router.post('/restore/:docId', isAuthenticated, documentsController.restoreDocument);

// DELETE /api/documents/permanent/:docId - Suppression définitive
router.delete('/permanent/:docId', isAuthenticated, documentsController.permanentDelete);

// ============================================
// ROUTES IMPORT/EXPORT
// ============================================

// POST /api/documents/bulk - Import en masse
router.post('/bulk', isAuthenticated, documentsController.bulkImport);

// ============================================
// ROUTES VUES SPÉCIALES (Session-based)
// ============================================

// GET /api/documents/my - Mes documents
router.get('/my', isAuthenticated, documentsController.getMyDocuments);

// GET /api/documents/recent - Documents récents
router.get('/recent', isAuthenticated, documentsController.getRecentDocuments);

// GET /api/documents/favorites - Favoris
router.get('/favorites', isAuthenticated, documentsController.getFavorites);

// GET /api/documents/new - Nouveaux documents
router.get('/new', isAuthenticated, documentsController.getNewDocuments);

module.exports = router;
