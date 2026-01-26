// ============================================
// SERVICE DE GESTION DES SERVICES
// Logique métier pure pour les services
// ============================================

const { ObjectId } = require('mongodb');
const { getCollections } = require('../config/database');
const constants = require('../utils/constants');

/**
 * Récupérer les services filtrés selon le niveau de l'utilisateur
 */
async function getServicesFiltered(currentUser, currentUserRole) {
    const collections = getCollections();

    let services = [];

    // Niveaux 1, 2, 3 : uniquement services de leur département
    if (currentUserRole && (currentUserRole.niveau === 1 || currentUserRole.niveau === 2 || currentUserRole.niveau === 3)) {
        if (currentUser.idDepartement) {
            const deptId = typeof currentUser.idDepartement === 'string'
                ? new ObjectId(currentUser.idDepartement)
                : currentUser.idDepartement;

            services = await collections.services
                .find({ idDepartement: deptId })
                .sort({ nom: 1 })
                .toArray();

            console.log(`🔒 NIVEAU ${currentUserRole.niveau} - ${services.length} service(s) du département filtré(s)`);
        } else {
            console.log(`🔴 NIVEAU ${currentUserRole.niveau} SANS DÉPARTEMENT - Retour liste vide`);
            return [];
        }
    } else {
        // Niveau 0 (Super Admin): accès à tous les services
        console.log(`✅ Niveau ${currentUserRole?.niveau || 'inconnu'} (Super Admin) - Accès à tous les services`);
        services = await collections.services
            .find({})
            .sort({ nom: 1 })
            .toArray();
    }

    return services;
}

/**
 * Créer un service
 */
async function createService(serviceData, userId) {
    const collections = getCollections();

    const { nom, code, idDepartement } = serviceData;

    // Validation
    if (!nom || !code || !idDepartement) {
        throw new Error('Nom, code et département requis');
    }

    // Vérifier permissions (niveaux 0 et 1 uniquement)
    const user = await collections.users.findOne({ username: userId });
    if (!user) {
        throw new Error('Utilisateur non trouvé');
    }

    const userRole = await collections.roles.findOne({ _id: user.idRole });
    if (!userRole || userRole.niveau > 1) {
        throw new Error('Accès refusé: vous devez être Niveau 0 ou 1');
    }

    // Vérifier unicité du code
    const existing = await collections.services.findOne({ code });
    if (existing) {
        throw new Error('Ce code de service existe déjà');
    }

    // Créer le service
    const newService = {
        _id: new ObjectId(),
        nom,
        code,
        description: serviceData.description || '',
        icon: serviceData.icon || '',
        idDepartement: new ObjectId(idDepartement),
        dateCreation: new Date()
    };

    // Utiliser writeConcern pour garantir la durabilité de l'écriture
    await collections.services.insertOne(newService, { writeConcern: { w: 'majority' } });

    console.log(`✅ Service créé: ${nom} (${code})`);

    return {
        success: true,
        service: newService
    };
}

/**
 * Modifier un service
 */
async function updateService(serviceId, updateData) {
    const collections = getCollections();

    const { nom, code, icon, description } = updateData;

    // Validation
    if (!nom) {
        throw new Error('Le nom du service est obligatoire');
    }

    // Vérifier que le service existe
    const service = await collections.services.findOne({ _id: new ObjectId(serviceId) });
    if (!service) {
        throw new Error('Service non trouvé');
    }

    // Si le code est modifié, vérifier unicité
    if (code && code !== service.code) {
        const existing = await collections.services.findOne({
            code,
            _id: { $ne: new ObjectId(serviceId) }
        });
        if (existing) {
            throw new Error('Ce code de service existe déjà');
        }
    }

    // Mettre à jour
    const updates = {
        nom,
        code: code || service.code,
        icon: icon || service.icon || '',
        description: description || service.description || '',
        lastModified: new Date()
    };

    await collections.services.updateOne(
        { _id: new ObjectId(serviceId) },
        { $set: updates },
        { writeConcern: { w: 'majority' } }
    );

    console.log(`✅ Service modifié: ${nom} (${updates.code})`);

    return {
        success: true,
        service: { ...service, ...updates }
    };
}

/**
 * Supprimer un service
 */
async function deleteService(serviceId) {
    const collections = getCollections();

    // Vérifier que le service existe
    const service = await collections.services.findOne({ _id: new ObjectId(serviceId) });
    if (!service) {
        throw new Error('Service non trouvé');
    }

    // Vérifier qu'aucun utilisateur n'est affecté
    const userCount = await collections.users.countDocuments({
        idService: new ObjectId(serviceId)
    });
    if (userCount > 0) {
        throw new Error(`Impossible de supprimer : ${userCount} utilisateur(s) sont affectés à ce service`);
    }

    // Vérifier qu'aucun document n'est associé
    const docCount = await collections.documents.countDocuments({
        idService: new ObjectId(serviceId)
    });
    if (docCount > 0) {
        throw new Error(`Impossible de supprimer : ${docCount} document(s) sont associés à ce service`);
    }

    // Supprimer avec writeConcern pour garantir la durabilité
    await collections.services.deleteOne(
        { _id: new ObjectId(serviceId) },
        { writeConcern: { w: 'majority' } }
    );

    console.log(`🗑️ Service supprimé: ${service.nom}`);

    return {
        success: true,
        message: 'Service supprimé'
    };
}

/**
 * Récupérer les services d'un département (avec enrichissement optionnel)
 */
async function getDepartmentServices(deptId, enrichData = false) {
    const collections = getCollections();

    const departmentId = new ObjectId(deptId);

    // Récupérer les services du département
    const services = await collections.services
        .find({ idDepartement: departmentId })
        .sort({ nom: 1 })
        .toArray();

    // Enrichir si demandé - OPTIMISÉ avec aggregation pipeline
    if (enrichData) {
        // Faire 2 requêtes groupées au lieu de N requêtes
        const serviceIds = services.map(s => s._id);

        // Compter les catégories par service en UNE SEULE requête
        const categoriesPipeline = await collections.categories.aggregate([
            { $match: { idService: { $in: serviceIds } } },
            { $group: { _id: '$idService', count: { $sum: 1 } } }
        ]).toArray();

        // Compter les documents par service en UNE SEULE requête
        const documentsPipeline = await collections.documents.aggregate([
            { $match: { idService: { $in: serviceIds }, deleted: { $ne: true } } },
            { $group: { _id: '$idService', count: { $sum: 1 } } }
        ]).toArray();

        // Créer des maps pour un accès O(1)
        const categoriesMap = new Map(categoriesPipeline.map(c => [c._id.toString(), c.count]));
        const documentsMap = new Map(documentsPipeline.map(d => [d._id.toString(), d.count]));

        // Enrichir les services
        const enrichedServices = services.map(service => ({
            ...service,
            categoriesCount: categoriesMap.get(service._id.toString()) || 0,
            documentsCount: documentsMap.get(service._id.toString()) || 0
        }));

        return enrichedServices;
    }

    return services;
}

/**
 * Vérifier l'accès au département
 */
async function checkDepartmentAccess(userId, deptId) {
    const collections = getCollections();

    const currentUser = await collections.users.findOne({ username: userId });
    if (!currentUser) {
        throw new Error('Utilisateur non trouvé');
    }

    const roleId = typeof currentUser.idRole === 'string'
        ? new ObjectId(currentUser.idRole)
        : currentUser.idRole;

    const currentUserRole = await collections.roles.findOne({ _id: roleId });

    const userLevel = currentUserRole ? currentUserRole.niveau : 3;
    const departmentId = new ObjectId(deptId);

    const userDeptId = typeof currentUser.idDepartement === 'string'
        ? new ObjectId(currentUser.idDepartement)
        : currentUser.idDepartement;

    // Niveaux 1, 2, 3 : uniquement leur département
    if (userLevel >= 1 && userLevel <= 3) {
        if (!userDeptId || !userDeptId.equals(departmentId)) {
            throw new Error('Accès refusé: vous ne pouvez accéder qu\'aux services de votre propre département');
        }
    }
    // Niveau 0 (Super Admin) : accès à tous les départements

    return true;
}

/**
 * Créer un service dans un département
 */
async function createServiceInDepartment(deptId, serviceData, userId) {
    const collections = getCollections();

    const { nom, icon, description } = serviceData;

    // Validation
    if (!nom || nom.trim() === '') {
        throw new Error('Le nom du service est obligatoire');
    }

    // Vérifier permissions (niveaux 0, 1, 2)
    const currentUser = await collections.users.findOne({ username: userId });
    if (!currentUser) {
        throw new Error('Utilisateur non trouvé');
    }

    const roleId = typeof currentUser.idRole === 'string'
        ? new ObjectId(currentUser.idRole)
        : currentUser.idRole;

    const currentUserRole = await collections.roles.findOne({ _id: roleId });

    if (!currentUserRole || currentUserRole.niveau > 2) {
        throw new Error('Accès refusé: vous devez être Niveau 0, 1 ou 2');
    }

    // Vérifier que le département existe
    const departmentId = new ObjectId(deptId);
    const department = await collections.departements.findOne({ _id: departmentId });
    if (!department) {
        throw new Error('Département non trouvé');
    }

    // Créer le service
    const newService = {
        _id: new ObjectId(),
        nom,
        icon: icon || '',
        description: description || '',
        idDepartement: departmentId,
        dateCreation: new Date()
    };

    // Utiliser writeConcern pour garantir la durabilité de l'écriture
    await collections.services.insertOne(newService, { writeConcern: { w: 'majority' } });

    console.log(`✅ Service créé dans département ${deptId}: ${nom}`);

    return {
        success: true,
        service: newService
    };
}

module.exports = {
    getServicesFiltered,
    createService,
    updateService,
    deleteService,
    getDepartmentServices,
    checkDepartmentAccess,
    createServiceInDepartment
};
