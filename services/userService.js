// ============================================
// SERVICE DE GESTION DES UTILISATEURS
// Logique métier pure pour les utilisateurs
// ============================================

const bcrypt = require('bcrypt');
const { ObjectId } = require('mongodb');
const { getCollections, getSecurityLogger } = require('../config/database');
const { validateUniversityEmail } = require('../config/allowedDomains');
const { sendWelcomeEmail } = require('./emailService');
const constants = require('../utils/constants');

/**
 * Trouver un utilisateur par username
 */
async function findByUsername(username) {
    const collections = getCollections();
    return await collections.users.findOne({ username });
}

/**
 * Trouver un utilisateur par email
 */
async function findByEmail(email) {
    const collections = getCollections();
    return await collections.users.findOne({ email });
}

/**
 * Créer un nouvel utilisateur
 */
async function createUser(userData, createdBy = null) {
    const collections = getCollections();

    // Vérifier si username existe déjà
    const existingUser = await findByUsername(userData.username);
    if (existingUser) {
        throw new Error('Ce nom d\'utilisateur est déjà utilisé');
    }

    // Vérifier si email existe déjà
    const existingEmail = await findByEmail(userData.email);
    if (existingEmail) {
        throw new Error('Cette adresse email est déjà utilisée');
    }

    // Validation email domaines universitaires
    const emailValidation = validateUniversityEmail(userData.email);
    if (!emailValidation.valid) {
        throw new Error(`Email invalide: ${emailValidation.error}`);
    }

    // Hacher le mot de passe
    const hashedPassword = await bcrypt.hash(userData.password, constants.SECURITY.BCRYPT_ROUNDS);

    // Créer l'utilisateur
    const newUser = {
        username: userData.username,
        email: userData.email,
        password: hashedPassword,
        nom: userData.nom,
        prenom: userData.prenom || '',
        idRole: userData.idRole ? new ObjectId(userData.idRole) : null,
        idDepartement: userData.idDepartement ? new ObjectId(userData.idDepartement) : null,
        createdAt: new Date(),
        createdBy: createdBy,
        isOnline: false,
        lastActivity: null,
        blocked: false,
        firstLogin: true,
        mustChangePassword: true
    };

    const result = await collections.users.insertOne(newUser);

    // Envoyer email de bienvenue
    try {
        await sendWelcomeEmail(userData.email, userData.nom, userData.username, userData.password);
        console.log(`✅ Email de bienvenue envoyé à: ${userData.email}`);
    } catch (error) {
        console.error(`⚠️ Erreur envoi email bienvenue:`, error.message);
        // Ne pas bloquer la création si l'email échoue
    }

    // Logger la création
    await collections.auditLogs.insertOne({
        timestamp: new Date(),
        user: createdBy || 'system',
        action: 'USER_CREATED',
        details: {
            username: userData.username,
            email: userData.email,
            role: userData.idRole
        }
    });

    console.log(`✅ Utilisateur créé: ${userData.username}`);

    return {
        success: true,
        userId: result.insertedId,
        username: userData.username
    };
}

/**
 * Mettre à jour un utilisateur
 */
async function updateUser(username, updateData, updatedBy = null) {
    const collections = getCollections();

    // Vérifier que l'utilisateur existe
    const user = await findByUsername(username);
    if (!user) {
        throw new Error('Utilisateur non trouvé');
    }

    // Préparer les données à mettre à jour
    const updates = {};

    if (updateData.nom) updates.nom = updateData.nom;
    if (updateData.prenom) updates.prenom = updateData.prenom;
    if (updateData.email) {
        // Vérifier que l'email n'est pas déjà utilisé
        const existingEmail = await findByEmail(updateData.email);
        if (existingEmail && existingEmail.username !== username) {
            throw new Error('Cette adresse email est déjà utilisée');
        }

        // Valider domaine universitaire
        const emailValidation = validateUniversityEmail(updateData.email);
        if (!emailValidation.valid) {
            throw new Error(`Email invalide: ${emailValidation.error}`);
        }

        updates.email = updateData.email;
    }

    if (updateData.idRole) updates.idRole = new ObjectId(updateData.idRole);
    if (updateData.idDepartement) updates.idDepartement = new ObjectId(updateData.idDepartement);
    if (updateData.blocked !== undefined) updates.blocked = updateData.blocked;
    if (updateData.blockedReason) updates.blockedReason = updateData.blockedReason;

    updates.updatedAt = new Date();
    updates.updatedBy = updatedBy;

    // 📝 Tracer les changements de profil (nom, prenom, email, username)
    const profileChanges = [];

    if (updates.nom && updates.nom !== user.nom) {
        profileChanges.push({
            username: user.username,
            type: 'nom',
            oldValue: user.nom || '',
            newValue: updates.nom,
            modifiedBy: updatedBy || 'system',
            date: new Date()
        });
    }

    if (updates.prenom && updates.prenom !== user.prenom) {
        profileChanges.push({
            username: user.username,
            type: 'prenom',
            oldValue: user.prenom || '',
            newValue: updates.prenom,
            modifiedBy: updatedBy || 'system',
            date: new Date()
        });
    }

    if (updates.email && updates.email !== user.email) {
        profileChanges.push({
            username: user.username,
            type: 'email',
            oldValue: user.email || '',
            newValue: updates.email,
            modifiedBy: updatedBy || 'system',
            date: new Date()
        });
    }

    // Enregistrer les changements de profil dans la collection
    if (profileChanges.length > 0) {
        await collections.profileChanges.insertMany(profileChanges);
        console.log(`📝 ${profileChanges.length} changement(s) de profil enregistré(s) pour: ${username}`);
    }

    // Mettre à jour
    await collections.users.updateOne(
        { username },
        { $set: updates }
    );

    // Logger la modification
    await collections.auditLogs.insertOne({
        timestamp: new Date(),
        user: updatedBy || 'system',
        action: 'USER_UPDATED',
        details: {
            username,
            updates: Object.keys(updates)
        }
    });

    console.log(`✅ Utilisateur modifié: ${username}`);

    return { success: true };
}

/**
 * Supprimer un utilisateur
 */
async function deleteUser(username, deletedBy = null) {
    const collections = getCollections();

    // Vérifier que l'utilisateur existe
    const user = await findByUsername(username);
    if (!user) {
        throw new Error('Utilisateur non trouvé');
    }

    // Vérifier que ce n'est pas un Super Admin (niveau 0)
    const userRole = await collections.roles.findOne({ _id: user.idRole });
    if (userRole && userRole.niveau === constants.PERMISSIONS.SUPER_ADMIN) {
        throw new Error('Impossible de supprimer un compte Super Administrateur');
    }

    // Supprimer l'utilisateur
    await collections.users.deleteOne({ username });

    // Logger la suppression
    await collections.auditLogs.insertOne({
        timestamp: new Date(),
        user: deletedBy || 'system',
        action: 'USER_DELETED',
        details: {
            username,
            email: user.email
        }
    });

    console.log(`🗑️ Utilisateur supprimé: ${username}`);

    return { success: true };
}

/**
 * Réinitialiser le mot de passe d'un utilisateur
 */
async function resetPassword(username, newPassword) {
    const collections = getCollections();

    // Vérifier que l'utilisateur existe
    const user = await findByUsername(username);
    if (!user) {
        throw new Error('Utilisateur non trouvé');
    }

    // Hacher le nouveau mot de passe
    const hashedPassword = await bcrypt.hash(newPassword, constants.SECURITY.BCRYPT_ROUNDS);

    // Mettre à jour le mot de passe
    await collections.users.updateOne(
        { username },
        {
            $set: {
                password: hashedPassword,
                passwordResetAt: new Date()
            }
        }
    );

    // Logger
    await collections.auditLogs.insertOne({
        timestamp: new Date(),
        user: username,
        action: 'PASSWORD_RESET',
        details: {
            username
        }
    });

    console.log(`🔑 Mot de passe réinitialisé: ${username}`);

    return { success: true };
}

/**
 * Changer le mot de passe (avec vérification ancien mot de passe)
 */
async function changePassword(username, currentPassword, newPassword) {
    const collections = getCollections();

    // Vérifier que l'utilisateur existe
    const user = await findByUsername(username);
    if (!user) {
        throw new Error('Utilisateur non trouvé');
    }

    // Vérifier l'ancien mot de passe
    const isValidPassword = await bcrypt.compare(currentPassword, user.password);
    if (!isValidPassword) {
        throw new Error('Mot de passe actuel incorrect');
    }

    // Hacher le nouveau mot de passe
    const hashedPassword = await bcrypt.hash(newPassword, constants.SECURITY.BCRYPT_ROUNDS);

    // Mettre à jour le mot de passe
    await collections.users.updateOne(
        { username },
        {
            $set: {
                password: hashedPassword,
                passwordChangedAt: new Date(),
                firstLogin: false,
                mustChangePassword: false
            }
        }
    );

    // Logger
    await collections.auditLogs.insertOne({
        timestamp: new Date(),
        user: username,
        action: 'PASSWORD_CHANGED',
        details: {
            username
        }
    });

    console.log(`🔑 Mot de passe changé: ${username}`);

    return { success: true };
}

/**
 * Vérifier les permissions d'un utilisateur (niveau 1 restrictions)
 */
async function checkUserPermissions(requestingUser, targetUser) {
    const collections = getCollections();

    const requester = await findByUsername(requestingUser);
    if (!requester) {
        throw new Error('Utilisateur demandeur non trouvé');
    }

    // Un utilisateur peut toujours voir ses propres informations
    if (requestingUser === targetUser) {
        return true;
    }

    const requesterRole = await collections.roles.findOne({ _id: requester.idRole });

    // Super Admin peut tout voir
    if (requesterRole && requesterRole.niveau === constants.PERMISSIONS.SUPER_ADMIN) {
        return true;
    }

    // Niveau 1 : ne peut voir que les utilisateurs qu'il a créés ou de son département
    if (requesterRole && requesterRole.niveau === constants.PERMISSIONS.PRIMAIRE) {
        const target = await findByUsername(targetUser);
        if (!target) return false;

        // Vérifier createdBy OU même département
        return target.createdBy === requestingUser ||
               (target.idDepartement && target.idDepartement.toString() === requester.idDepartement?.toString());
    }

    // Par défaut, refuser
    return false;
}

/**
 * Obtenir la liste des utilisateurs filtrée selon les permissions
 */
async function getFilteredUsers(requestingUser) {
    const collections = getCollections();

    const requester = await findByUsername(requestingUser);
    if (!requester) {
        throw new Error('Utilisateur demandeur non trouvé');
    }

    const requesterRole = await collections.roles.findOne({ _id: requester.idRole });

    // Super Admin voit tous les utilisateurs
    if (requesterRole && requesterRole.niveau === constants.PERMISSIONS.SUPER_ADMIN) {
        return await collections.users.find({}).toArray();
    }

    // Niveau 1 : uniquement les utilisateurs créés par lui OU de son département
    if (requesterRole && requesterRole.niveau === constants.PERMISSIONS.PRIMAIRE) {
        return await collections.users.find({
            $or: [
                { createdBy: requestingUser },
                { idDepartement: requester.idDepartement }
            ]
        }).toArray();
    }

    // Niveaux 2/3 : uniquement leur département
    if (requesterRole && (requesterRole.niveau === constants.PERMISSIONS.SECONDAIRE || requesterRole.niveau === constants.PERMISSIONS.TERTIAIRE)) {
        return await collections.users.find({
            idDepartement: requester.idDepartement
        }).toArray();
    }

    // Par défaut, aucun utilisateur
    return [];
}

module.exports = {
    findByUsername,
    findByEmail,
    createUser,
    updateUser,
    deleteUser,
    resetPassword,
    changePassword,
    checkUserPermissions,
    getFilteredUsers
};
