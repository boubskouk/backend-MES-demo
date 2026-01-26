// ============================================
// SERVICE DE GESTION DES DÉPARTEMENTS
// Logique métier pure pour les départements
// ============================================

const { ObjectId } = require('mongodb');
const { getCollections } = require('../config/database');
const constants = require('../utils/constants');

/**
 * Récupérer les départements filtrés selon le niveau de l'utilisateur
 */
async function getDepartementsFiltered(currentUser, currentUserRole) {
    const collections = getCollections();

    let departements = [];

    // Niveaux 1, 2, 3 : uniquement leur département
    if (currentUserRole && currentUserRole.niveau >= 1) {
        if (currentUser.idDepartement) {
            const deptId = typeof currentUser.idDepartement === 'string'
                ? new ObjectId(currentUser.idDepartement)
                : currentUser.idDepartement;

            const userDept = await collections.departements.findOne({ _id: deptId });
            departements = userDept ? [userDept] : [];

            console.log(`🔒 NIVEAU ${currentUserRole.niveau} - Département filtré: ${userDept?.nom || 'Aucun'}`);
        } else {
            console.log(`🔴 NIVEAU ${currentUserRole.niveau} SANS DÉPARTEMENT - Retour liste vide`);
            return [];
        }
    } else {
        // Niveau 0 (Super Admin): tous les départements
        console.log(`✅ Niveau 0 (Super Admin) - Accès à tous les départements`);
        departements = await collections.departements
            .find({})
            .sort({ nom: 1 })
            .toArray();
    }

    return departements;
}

/**
 * Enrichir les départements avec des statistiques
 */
async function enrichDepartements(departements) {
    const collections = getCollections();

    const enrichedDepartements = await Promise.all(departements.map(async (dept) => {
        // Compter les services
        const servicesCount = await collections.services.countDocuments({
            idDepartement: dept._id
        });

        // Compter les documents du département
        const documentsCount = await collections.documents.countDocuments({
            idDepartement: dept._id,
            deleted: { $ne: true }
        });

        // Calculer la taille totale des documents
        const documents = await collections.documents.find({
            idDepartement: dept._id,
            deleted: { $ne: true }
        }).toArray();
        const totalSize = documents.reduce((sum, doc) => sum + (doc.taille || 0), 0);

        // Compter les utilisateurs du département
        const usersCount = await collections.users.countDocuments({
            idDepartement: dept._id
        });

        // Trouver la dernière activité
        const lastDoc = await collections.documents.findOne(
            { idDepartement: dept._id, deleted: { $ne: true } },
            { sort: { dateAjout: -1 } }
        );
        const lastActivity = lastDoc?.dateAjout || dept.dateCreation || new Date();

        return {
            ...dept,
            servicesCount,
            documentsCount,
            totalSize,
            usersCount,
            lastActivity
        };
    }));

    return enrichedDepartements;
}

/**
 * Créer un département
 */
async function createDepartement(departementData, userId) {
    const collections = getCollections();

    const { nom, icon, description } = departementData;

    // Validation
    if (!nom || nom.trim() === '') {
        throw new Error('Le nom du département est obligatoire');
    }

    // Vérifier permissions (niveaux 0 et 1 uniquement)
    const user = await collections.users.findOne({ username: userId });
    if (!user) {
        throw new Error('Utilisateur non trouvé');
    }

    const roleId = typeof user.idRole === 'string'
        ? new ObjectId(user.idRole)
        : user.idRole;

    const userRole = await collections.roles.findOne({ _id: roleId });

    if (!userRole || userRole.niveau > 1) {
        throw new Error('Accès refusé: vous devez être Admin (Niveau 0 ou 1)');
    }

    // Créer le département
    const newDepartment = {
        nom: nom.trim(),
        icon: icon || '',
        description: description || '',
        dateCreation: new Date(),
        createdBy: userId
    };

    const result = await collections.departements.insertOne(newDepartment);

    console.log(`✅ Département créé: ${nom} par ${userId}`);

    return {
        success: true,
        message: 'Département créé avec succès',
        departement: {
            _id: result.insertedId,
            ...newDepartment
        }
    };
}

module.exports = {
    getDepartementsFiltered,
    enrichDepartements,
    createDepartement
};
