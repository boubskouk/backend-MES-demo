// ============================================
// ROUTES USERS
// ============================================

const express = require('express');
const router = express.Router();
const usersController = require('../controllers/users.controller');
const { isAuthenticated } = require('../middleware/authMiddleware');
const { body } = require('express-validator');

// ============================================
// ROUTES PUBLIQUES (Sans authentification)
// ============================================

// POST /api/users/register - Inscription nouvel utilisateur
router.post('/register',
    [
        body('username')
            .trim()
            .notEmpty().withMessage('Username requis')
            .isLength({ min: 3, max: 50 }).withMessage('Username: 3-50 caractères')
            .matches(/^[a-zA-Z0-9_-]+$/).withMessage('Username: lettres, chiffres, _ et - uniquement'),
        body('email')
            .trim()
            .notEmpty().withMessage('Email requis')
            .isEmail().withMessage('Email invalide')
            .normalizeEmail(),
        body('password')
            .notEmpty().withMessage('Mot de passe requis')
            .isLength({ min: 4 }).withMessage('Mot de passe: minimum 4 caractères'),
        body('nom')
            .trim()
            .notEmpty().withMessage('Nom requis')
            .isLength({ min: 2, max: 100 }).withMessage('Nom: 2-100 caractères'),
        body('secretCode')
            .notEmpty().withMessage('Code secret requis')
    ],
    usersController.register
);

// ============================================
// ROUTES PROTÉGÉES (Avec authentification)
// ============================================

// Appliquer authentification à toutes les routes suivantes
router.use(isAuthenticated);

// GET /api/users - Liste utilisateurs (avec filtrage niveau)
router.get('/', usersController.getUsers);

// GET /api/users/:username - Détail utilisateur
router.get('/:username', usersController.getUserDetails);

// POST /api/users - Créer utilisateur
router.post('/',
    [
        body('username').trim().notEmpty().isLength({ min: 3, max: 50 }),
        body('email').trim().isEmail().normalizeEmail(),
        body('password').isLength({ min: 4 }),
        body('nom').trim().notEmpty()
    ],
    usersController.createUser
);

// PUT /api/users/:username - Modifier utilisateur
router.put('/:username',
    [
        body('email').optional().trim().isEmail().normalizeEmail(),
        body('nom').optional().trim().notEmpty()
    ],
    usersController.updateUser
);

// DELETE /api/users/:username - Supprimer utilisateur
router.delete('/:username', usersController.deleteUser);

// POST /api/users/:username/reset-password - Réinitialiser mot de passe
router.post('/:username/reset-password', usersController.resetPassword);

// POST /api/users/:username/change-password - Changer mot de passe
router.post('/:username/change-password',
    [
        body('currentPassword').notEmpty().withMessage('Mot de passe actuel requis'),
        body('newPassword').isLength({ min: 4 }).withMessage('Nouveau mot de passe: minimum 4 caractères')
    ],
    usersController.changePassword
);

// ============================================
// ROUTES SPÉCIALES
// ============================================

// GET /api/users-for-sharing/:userId - Liste users pour partage
router.get('/for-sharing/:userId', usersController.getUsersForSharing);

module.exports = router;
