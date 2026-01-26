// ============================================
// CONTROLLER DES RÔLES
// ============================================

const { getCollections } = require('../config/database');

/**
 * Get all roles - GET /api/roles
 */
async function getAllRoles(req, res) {
    try {
        const collections = getCollections();
        const roles = await collections.roles.find({}).sort({ niveau: 1 }).toArray();

        res.json({
            success: true,
            roles
        });
    } catch (error) {
        console.error('❌ Erreur récupération rôles:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur serveur'
        });
    }
}

module.exports = {
    getAllRoles
};
