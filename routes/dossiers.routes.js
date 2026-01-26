// ============================================
// ROUTES DOSSIERS
// ============================================

const express = require('express');
const router = express.Router();
const dossiersController = require('../controllers/dossiers.controller');
const { isAuthenticated } = require('../middleware/authMiddleware');
const { requireLevel1OrAbove } = require('../middleware/permissionsMiddleware');
const security = require('../security-config');
const { body } = require('express-validator');

// ============================================
// ROUTES PUBLIQUES (avec authentification)
// ============================================

// IMPORTANT: Les routes spécifiques DOIVENT être AVANT les routes génériques

// GET /api/dossiers/:userId/stats - Récupérer les statistiques
router.get('/:userId/stats', isAuthenticated, dossiersController.getStats);

// GET /api/dossiers/:userId/search/documents - Rechercher des documents
router.get('/:userId/search/documents', isAuthenticated, dossiersController.searchDocuments);

// GET /api/dossiers/:userId - Récupérer les dossiers accessibles
router.get('/:userId', isAuthenticated, dossiersController.getAccessibleDossiers);

// GET /api/dossiers/:userId/:dossierId - Récupérer un dossier spécifique
router.get('/:userId/:dossierId', isAuthenticated, dossiersController.getDossier);

// POST /api/dossiers - Créer un dossier (avec rate limiting)
router.post('/',
    security.uploadLimiter,
    [
        body('userId').trim().notEmpty().isLength({ min: 3, max: 50 }),
        body('titre').trim().notEmpty().isLength({ min: 3, max: 200 }).escape(),
        body('description').optional().trim().isLength({ max: 1000 }).escape(),
        body('categorie').trim().notEmpty()
    ],
    dossiersController.createDossier
);

// DELETE /api/dossiers/:userId/delete-all - Supprimer tous les dossiers accessibles (DOIT ÊTRE AVANT /:userId/:dossierId)
router.delete('/:userId/delete-all', isAuthenticated, dossiersController.deleteAll);

// PUT /api/dossiers/:userId/:dossierId/rename - Renommer un dossier (niveau 1 uniquement)
router.put('/:userId/:dossierId/rename', requireLevel1OrAbove, dossiersController.renameDossier);

// DELETE /api/dossiers/:userId/:dossierId - Supprimer un dossier (soft delete)
router.delete('/:userId/:dossierId', isAuthenticated, dossiersController.deleteDossier);

// ============================================
// ROUTES DOCUMENTS (DANS LES DOSSIERS)
// ============================================

// POST /api/dossiers/:userId/:dossierId/document - Ajouter un document
router.post('/:userId/:dossierId/document',
    security.uploadLimiter,
    requireLevel1OrAbove,
    dossiersController.addDocument
);

// DELETE /api/dossiers/:userId/:dossierId/document/:documentId - Retirer un document
router.delete('/:userId/:dossierId/document/:documentId', requireLevel1OrAbove, dossiersController.removeDocument);

// GET /api/dossiers/:userId/:dossierId/document/:documentId - Récupérer un document
router.get('/:userId/:dossierId/document/:documentId', isAuthenticated, dossiersController.getDocument);

// GET /api/dossiers/:userId/:dossierId/document/:documentId/download - Télécharger un document
router.get('/:userId/:dossierId/document/:documentId/download', isAuthenticated, dossiersController.downloadDocument);

// POST /api/dossiers/:userId/:dossierId/document/:documentId/share - Partager un document
router.post('/:userId/:dossierId/document/:documentId/share', isAuthenticated, dossiersController.shareDocument);

// POST /api/dossiers/:userId/:dossierId/document/:documentId/unshare - Retirer le partage d'un document
router.post('/:userId/:dossierId/document/:documentId/unshare', isAuthenticated, dossiersController.unshareDocument);

// POST /api/dossiers/:userId/:dossierId/document/:documentId/toggle-lock - Verrouiller/Déverrouiller un document
router.post('/:userId/:dossierId/document/:documentId/toggle-lock', requireLevel1OrAbove, dossiersController.toggleDocumentLock);

// GET /api/dossiers/:userId/:dossierId/download-all - Télécharger tout en ZIP
router.get('/:userId/:dossierId/download-all', isAuthenticated, dossiersController.downloadAllAsZip);

// ============================================
// ROUTES FICHIERS (Rétrocompatibilité)
// ============================================

// POST /api/dossiers/:userId/:dossierId/fichier - Ajouter un fichier (alias)
router.post('/:userId/:dossierId/fichier',
    security.uploadLimiter,
    requireLevel1OrAbove,
    dossiersController.addDocument
);

// DELETE /api/dossiers/:userId/:dossierId/fichier/:fichierId - Retirer un fichier (alias)
router.delete('/:userId/:dossierId/fichier/:fichierId', requireLevel1OrAbove, dossiersController.removeDocument);

// GET /api/dossiers/:userId/:dossierId/fichier/:fichierId/download - Télécharger un fichier (alias)
router.get('/:userId/:dossierId/fichier/:fichierId/download', isAuthenticated, dossiersController.downloadDocument);

// ============================================
// ROUTES PARTAGE
// ============================================

// POST /api/dossiers/:userId/:dossierId/share - Partager un dossier
router.post('/:userId/:dossierId/share', isAuthenticated, dossiersController.shareDossier);

// POST /api/dossiers/:userId/:dossierId/unshare - Retirer le partage
router.post('/:userId/:dossierId/unshare', isAuthenticated, dossiersController.unshareDossier);

// GET /api/dossiers/:userId/:dossierId/shared-users - Liste des utilisateurs avec qui le dossier est partagé
router.get('/:userId/:dossierId/shared-users', isAuthenticated, dossiersController.getSharedUsers);

// ============================================
// ROUTES VERROUILLAGE (Niveau 1 uniquement)
// ============================================

// POST /api/dossiers/:userId/:dossierId/toggle-lock - Verrouiller/Déverrouiller
router.post('/:userId/:dossierId/toggle-lock', requireLevel1OrAbove, dossiersController.toggleLock);

// ============================================
// ROUTES CORBEILLE
// ============================================

// POST /api/dossiers/restore/:dossierId - Restaurer depuis la corbeille
router.post('/restore/:dossierId', isAuthenticated, dossiersController.restoreDossier);

// DELETE /api/dossiers/permanent/:dossierId - Suppression définitive
router.delete('/permanent/:dossierId', isAuthenticated, dossiersController.permanentDelete);

module.exports = router;
