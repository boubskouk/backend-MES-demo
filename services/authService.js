// ============================================
// SERVICE D'AUTHENTIFICATION
// Logique métier pure pour l'authentification
// ============================================

const bcrypt = require('bcrypt');
const { getCollections, getSecurityLogger } = require('../config/database');
const { EVENT_TYPES } = require('../security-logger');
const constants = require('../utils/constants');

/**
 * Authentifier un utilisateur
 * @param {string} username - Nom d'utilisateur
 * @param {string} password - Mot de passe
 * @param {Object} metadata - Métadonnées (IP, user-agent)
 * @returns {Promise<Object>} - Résultat de l'authentification
 */
async function authenticateUser(username, password, metadata = {}) {
    const collections = getCollections();
    const securityLogger = getSecurityLogger();

    // Chercher l'utilisateur
    const user = await collections.users.findOne({ username });

    if (!user) {
        await securityLogger.log(
            EVENT_TYPES.LOGIN_FAILED,
            username,
            { reason: 'user_not_found', ...metadata }
        );
        return {
            success: false,
            message: 'Identifiants incorrects'
        };
    }

    // Récupérer le rôle
    const userRole = await collections.roles.findOne({ _id: user.idRole });

    // Vérifier le mot de passe
    const isValid = await verifyPassword(password, user.password);

    if (!isValid) {
        await securityLogger.log(
            EVENT_TYPES.LOGIN_FAILED,
            username,
            { reason: 'wrong_password', ...metadata }
        );

        return {
            success: false,
            message: 'Identifiants incorrects'
        };
    }

    // Mettre à jour isOnline
    await collections.users.updateOne(
        { _id: user._id },
        {
            $set: {
                isOnline: true,
                lastActivity: new Date()
            }
        }
    );

    // Logger la connexion réussie
    await securityLogger.log(
        EVENT_TYPES.LOGIN_SUCCESS,
        username,
        {
            niveau: userRole ? userRole.niveau : null,
            role: userRole ? userRole.nom : null,
            ...metadata
        }
    );

    // Récupérer le département
    const departement = user.idDepartement
        ? await collections.departements.findOne({ _id: user.idDepartement })
        : null;

    return {
        success: true,
        user: {
            username: user.username,
            nom: user.nom,
            email: user.email,
            role: userRole ? userRole.libelle : 'Non défini',
            niveau: userRole ? userRole.niveau : 0,
            departement: departement ? departement.nom : 'Aucun (Admin Principal)',
            idDepartement: user.idDepartement,
            firstLogin: user.firstLogin || false,
            mustChangePassword: user.mustChangePassword || false
        }
    };
}

/**
 * Vérifier un mot de passe (supporte bcrypt et plain text legacy)
 */
async function verifyPassword(plainPassword, storedPassword) {
    const isBcryptHash = /^\$2[aby]\$/.test(storedPassword);

    if (isBcryptHash) {
        return await bcrypt.compare(plainPassword, storedPassword);
    } else {
        // Legacy plain text - TODO: migrer tous les mots de passe
        return plainPassword === storedPassword;
    }
}

/**
 * Déconnecter un utilisateur
 */
async function logoutUser(username) {
    const collections = getCollections();

    await collections.users.updateOne(
        { username },
        {
            $set: {
                isOnline: false,
                lastActivity: new Date()
            },
            $unset: {
                sessionID: ""  // ✅ Supprimer le sessionID lors de la deconnexion
            }
        }
    );

    console.log(`👋 Utilisateur déconnecté: ${username} (sessionID supprimé)`);

    return { success: true };
}

module.exports = {
    authenticateUser,
    logoutUser
};
