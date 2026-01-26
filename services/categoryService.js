// ============================================
// SERVICE DE GESTION DES CATÉGORIES
// Logique métier pure pour les catégories
// ============================================

const { ObjectId } = require('mongodb');
const { getCollections } = require('../config/database');
const constants = require('../utils/constants');

/**
 * Récupérer les catégories d'un département
 */
async function getCategoriesByDepartment(userId) {
    const collections = getCollections();

    // Récupérer l'utilisateur
    const user = await collections.users.findOne({ username: userId });
    if (!user) {
        throw new Error('Utilisateur non trouvé');
    }

    // Récupérer toutes les catégories du département
    const categories = await collections.categories
        .find({ idDepartement: user.idDepartement })
        .sort({ nom: 1 })
        .toArray();

    return categories;
}

/**
 * Créer une catégorie
 */
async function createCategory(categoryData, userId) {
    const collections = getCollections();

    const { id, nom, couleur, icon } = categoryData;

    // Validation
    if (!userId || !id || !nom) {
        throw new Error('userId, id et nom sont obligatoires');
    }

    // Récupérer l'utilisateur
    const user = await collections.users.findOne({ username: userId });
    if (!user) {
        throw new Error('Utilisateur non trouvé');
    }

    // Vérifier le niveau de permission (0, 1 uniquement)
    const userRole = await collections.roles.findOne({ _id: user.idRole });
    if (!userRole || userRole.niveau > 1) {
        throw new Error('Seuls les utilisateurs niveau 0 et 1 peuvent créer des catégories');
    }

    // Vérifier si la catégorie existe déjà dans le département
    const existingCategory = await collections.categories.findOne({
        idDepartement: user.idDepartement,
        id
    });

    if (existingCategory) {
        throw new Error('Cette catégorie existe déjà dans le département');
    }

    // Créer la catégorie
    const newCategory = {
        _id: new ObjectId(),
        idUtilisateur: userId,
        idDepartement: user.idDepartement,
        id,
        nom,
        couleur: couleur || '#3b82f6',
        icon: icon || '📁',
        dateCreation: new Date()
    };

    await collections.categories.insertOne(newCategory);

    console.log(`✅ Catégorie créée: ${nom} pour département ${user.idDepartement}`);

    return {
        success: true,
        category: newCategory
    };
}

/**
 * Modifier une catégorie
 */
async function updateCategory(userId, catId, updateData) {
    const collections = getCollections();

    const { nom, couleur, icon } = updateData;

    // Récupérer l'utilisateur
    const user = await collections.users.findOne({ username: userId });
    if (!user) {
        throw new Error('Utilisateur non trouvé');
    }

    // Vérifier que l'utilisateur est niveau 1
    const userRole = await collections.roles.findOne({ _id: user.idRole });
    if (!userRole || userRole.niveau !== constants.PERMISSIONS.PRIMAIRE) {
        throw new Error('Seuls les utilisateurs niveau 1 peuvent modifier des catégories');
    }

    // Mettre à jour la catégorie dans le département
    const result = await collections.categories.updateOne(
        {
            idDepartement: user.idDepartement,
            id: catId
        },
        {
            $set: {
                nom,
                couleur: couleur || '#3b82f6',
                icon: icon || '📁',
                dateModification: new Date()
            }
        }
    );

    if (result.modifiedCount === 0) {
        throw new Error('Catégorie non trouvée dans le département');
    }

    console.log(`✅ Catégorie modifiée: ${catId}`);

    return {
        success: true,
        message: 'Catégorie modifiée'
    };
}

/**
 * Supprimer une catégorie
 */
async function deleteCategory(userId, catId) {
    const collections = getCollections();

    // Récupérer l'utilisateur
    const user = await collections.users.findOne({ username: userId });
    if (!user) {
        throw new Error('Utilisateur non trouvé');
    }

    // Vérifier que l'utilisateur est niveau 1
    const userRole = await collections.roles.findOne({ _id: user.idRole });
    if (!userRole || userRole.niveau !== constants.PERMISSIONS.PRIMAIRE) {
        throw new Error('Seuls les utilisateurs niveau 1 peuvent supprimer des catégories');
    }

    // Vérifier si des documents utilisent cette catégorie
    const documentsWithCategory = await collections.documents.countDocuments({
        categorie: catId,
        deleted: { $ne: true } // Ignorer les documents supprimés
    });

    if (documentsWithCategory > 0) {
        throw new Error(`Impossible de supprimer : ${documentsWithCategory} document(s) utilisent cette catégorie`);
    }

    // Supprimer la catégorie
    const result = await collections.categories.deleteOne({
        idDepartement: user.idDepartement,
        id: catId
    });

    if (result.deletedCount === 0) {
        throw new Error('Catégorie non trouvée dans le département');
    }

    console.log(`🗑️ Catégorie supprimée: ${catId}`);

    return {
        success: true,
        message: 'Catégorie supprimée'
    };
}

module.exports = {
    getCategoriesByDepartment,
    createCategory,
    updateCategory,
    deleteCategory
};
