/**
 * ============================================
 * MODULE SERVICES : GESTION PAR NIVEAU 1
 * ============================================
 *
 * Un service appartient toujours à un département
 * Seul le niveau 1 peut créer des services dans son département
 */

const { ObjectId } = require('mongodb');

// Collections MongoDB
let servicesCollection;
let departementsCollection;
let usersCollection;
let documentsCollection;

/**
 * Initialiser le module avec les collections MongoDB
 */
function init(db) {
    servicesCollection = db.collection('services');
    departementsCollection = db.collection('departements');
    usersCollection = db.collection('users');
    documentsCollection = db.collection('documents');

    console.log('✅ Module Services initialisé');
}

/**
 * Récupérer tous les services accessibles à l'utilisateur
 * - Niveau 0 : Tous les services
 * - Niveaux 1, 2, 3 : Uniquement les services de leur département
 */
async function getServices(userId, userLevel, userDepartmentId) {
    try {
        let query = {};

        if (userLevel === 1 || userLevel === 2 || userLevel === 3) {
            // Niveaux 1, 2, 3 : Uniquement les services de leur département
            if (!userDepartmentId) {
                console.log('⚠️ getServices: userDepartmentId est undefined pour', userId);
                return [];
            }

            // S'assurer que c'est un ObjectId
            const deptId = userDepartmentId instanceof ObjectId ? userDepartmentId : new ObjectId(userDepartmentId);
            query.idDepartement = deptId;

            console.log('🔍 getServices DEBUG:', {
                userId,
                userLevel,
                userDepartmentId: userDepartmentId.toString(),
                deptIdType: typeof deptId,
                deptId: deptId.toString()
            });
        }
        // Niveau 0 : Tous les services (pas de filtre)

        const services = await servicesCollection
            .find(query)
            .sort({ dateCreation: -1 })
            .toArray();

        console.log(`📊 getServices: ${services.length} service(s) trouvé(s) pour query:`, JSON.stringify(query));

        // Enrichir chaque service avec des infos supplémentaires
        const enrichedServices = await Promise.all(
            services.map(async (service) => {
                // Récupérer le département parent
                const departement = await departementsCollection.findOne({ _id: service.idDepartement });

                // Compter les utilisateurs affectés à ce service
                const userCount = await usersCollection.countDocuments({ idService: service._id });

                // Compter les documents de ce service
                const documentCount = await documentsCollection.countDocuments({ idService: service._id });

                return {
                    ...service,
                    departement: departement ? {
                        _id: departement._id,
                        nom: departement.nom,
                        code: departement.code
                    } : null,
                    userCount,
                    documentCount
                };
            })
        );

        return enrichedServices;
    } catch (error) {
        console.error('❌ Erreur getServices:', error);
        throw error;
    }
}

/**
 * Créer un service
 * - Niveau 1 : Uniquement dans son département
 * - Niveau 0 : Dans n'importe quel département
 */
async function createService(data, createdBy, userLevel, userDepartmentId) {
    try {
        const { nom, code, description = '', idDepartement } = data;

        // Validation
        if (!nom || !code || !idDepartement) {
            throw new Error('Nom, code et département requis');
        }

        // Vérifier que le code n'existe pas déjà
        const existing = await servicesCollection.findOne({ code });
        if (existing) {
            throw new Error('Ce code de service existe déjà');
        }

        // Validation pour niveau 1 : peut créer uniquement dans son département
        if (userLevel === 1) {
            if (!userDepartmentId) {
                throw new Error('Vous devez être affecté à un département');
            }
            if (idDepartement.toString() !== userDepartmentId.toString()) {
                throw new Error('Vous ne pouvez créer des services que dans votre département');
            }
        }

        // Vérifier que le département existe
        const departement = await departementsCollection.findOne({ _id: new ObjectId(idDepartement) });
        if (!departement) {
            throw new Error('Département non trouvé');
        }

        const newService = {
            _id: new ObjectId(),
            nom,
            code,
            description,
            idDepartement: new ObjectId(idDepartement),
            dateCreation: new Date(),
            createdBy
        };

        await servicesCollection.insertOne(newService);

        console.log(`✅ Service créé: ${nom} (${code}) dans ${departement.nom}`);
        return newService;
    } catch (error) {
        console.error('❌ Erreur createService:', error);
        throw error;
    }
}

/**
 * Modifier un service
 */
async function updateService(serviceId, data, updatedBy, userLevel, userDepartmentId) {
    try {
        const { nom, code, description } = data;

        // Validation
        if (!nom || !code) {
            throw new Error('Nom et code requis');
        }

        // Vérifier que le service existe
        const service = await servicesCollection.findOne({ _id: new ObjectId(serviceId) });
        if (!service) {
            throw new Error('Service non trouvé');
        }

        // Validation pour niveau 1 : peut modifier uniquement ses services
        if (userLevel === 1) {
            if (!userDepartmentId) {
                throw new Error('Vous devez être affecté à un département');
            }
            if (service.idDepartement.toString() !== userDepartmentId.toString()) {
                throw new Error('Vous ne pouvez modifier que les services de votre département');
            }
        }

        // Si on change le code, vérifier qu'il n'existe pas déjà
        if (code !== service.code) {
            const existing = await servicesCollection.findOne({ code });
            if (existing) {
                throw new Error('Ce code de service existe déjà');
            }
        }

        // Mettre à jour
        const updateData = {
            nom,
            code,
            description: description || service.description || '',
            lastModified: new Date(),
            lastModifiedBy: updatedBy
        };

        await servicesCollection.updateOne(
            { _id: new ObjectId(serviceId) },
            { $set: updateData }
        );

        console.log(`✅ Service modifié: ${nom}`);
        return { ...service, ...updateData };
    } catch (error) {
        console.error('❌ Erreur updateService:', error);
        throw error;
    }
}

/**
 * Supprimer un service
 */
async function deleteService(serviceId, deletedBy, userLevel, userDepartmentId) {
    try {
        // Vérifier que le service existe
        const service = await servicesCollection.findOne({ _id: new ObjectId(serviceId) });
        if (!service) {
            throw new Error('Service non trouvé');
        }

        // Validation pour niveau 1 : peut supprimer uniquement ses services
        if (userLevel === 1) {
            if (!userDepartmentId) {
                throw new Error('Vous devez être affecté à un département');
            }
            if (service.idDepartement.toString() !== userDepartmentId.toString()) {
                throw new Error('Vous ne pouvez supprimer que les services de votre département');
            }
        }

        // Vérifier qu'il n'y a pas d'utilisateurs affectés
        const userCount = await usersCollection.countDocuments({ idService: new ObjectId(serviceId) });
        if (userCount > 0) {
            throw new Error(`Impossible de supprimer : ${userCount} utilisateur(s) sont affectés à ce service`);
        }

        // Vérifier qu'il n'y a pas de documents
        const docCount = await documentsCollection.countDocuments({ idService: new ObjectId(serviceId) });
        if (docCount > 0) {
            throw new Error(`Impossible de supprimer : ${docCount} document(s) sont associés à ce service`);
        }

        // Supprimer
        await servicesCollection.deleteOne({ _id: new ObjectId(serviceId) });

        console.log(`✅ Service supprimé: ${service.nom}`);
        return { success: true };
    } catch (error) {
        console.error('❌ Erreur deleteService:', error);
        throw error;
    }
}

/**
 * Obtenir les statistiques des services
 */
async function getStats(userLevel, userDepartmentId) {
    try {
        let query = {};

        if (userLevel === 1 && userDepartmentId) {
            query.idDepartement = userDepartmentId;
        }

        const total = await servicesCollection.countDocuments(query);

        return { total };
    } catch (error) {
        console.error('❌ Erreur getStats:', error);
        throw error;
    }
}

module.exports = {
    init,
    getServices,
    createService,
    updateService,
    deleteService,
    getStats
};
