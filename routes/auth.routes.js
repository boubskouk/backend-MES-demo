// ============================================
// ROUTES D'AUTHENTIFICATION
// ============================================

const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const security = require('../security-config');

// POST /api/auth/login - Connexion utilisateur
router.post('/login', security.loginLimiter, authController.login);

// POST /api/auth/logout - Déconnexion utilisateur
router.post('/logout', authController.logout);

// GET /api/auth/session-check - Vérifier statut de session
router.get('/session-check', authController.checkSession);

// GET /api/auth/user-info - Obtenir infos utilisateur connecté
router.get('/user-info', authController.getUserInfo);

// POST /api/auth/admin-login - Connexion Super Admin (niveau 0 uniquement)
router.post('/admin-login', security.loginLimiter, authController.adminLogin);

module.exports = router;
