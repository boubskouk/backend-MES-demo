/**
 * ============================================
 * MODULE DÉPARTEMENTS : GESTION (SUPER ADMIN)
 * ============================================
 *
 * Fonctions pour gérer les départements depuis le dashboard Super Admin
 * - Liste complète des départements (principaux et services)
 * - Création de départements principaux
 * - Modification de départements
 * - Suppression de départements (avec validation)
 */

const { ObjectId } = require('mongodb');

// Collections MongoDB
let departementsCollection;
let servicesCollection; // ✅ NOUVEAU: Collection services
let usersCollection;
let documentsCollection;
let auditLogsCollection;

/**
 * Initialiser le module avec les collections MongoDB
 */
function init(collections) {
    departementsCollection = collections.departements;
    servicesCollection = collections.services; // ✅ NOUVEAU
    usersCollection = collections.users;
    documentsCollection = collections.documents;
    auditLogsCollection = collections.auditLogs;

    console.log('✅ Module Departments (Super Admin) initialisé');
}

/**
 * Récupérer tous les départements avec enrichissement
 */
async function getAllDepartments(filters = {}) {
    try {
        const { search = '', type = 'all', page = 1, limit = 50 } = filters;

        // Construction de la query
        const query = {};

        // Filtrer par type (principaux uniquement ou tous)
        if (type === 'main') {
            query.parentDepartement = null; // Départements principaux uniquement
        } else if (type === 'services') {
            query.parentDepartement = { $ne: null }; // Services uniquement
        }

        // Filtrer par recherche (nom ou code)
        if (search) {
            query.$or = [
                { nom: { $regex: search, $options: 'i' } },
                { code: { $regex: search, $options: 'i' } }
            ];
        }

        // Pagination
        const skip = (page - 1) * limit;

        // Récupérer les départements
        const departments = await departementsCollection
            .find(query)
            .sort({ dateCreation: -1 })
            .skip(skip)
            .limit(limit)
            .toArray();

        // Compter le total
        const total = await departementsCollection.countDocuments(query);

        // Enrichir chaque département
        const enrichedDepartments = await Promise.all(
            departments.map(async (dept) => {
                // Compter les utilisateurs affectés
                const userCount = await usersCollection.countDocuments({ idDepartement: dept._id });

                // Compter les documents
                const documentCount = await documentsCollection.countDocuments({ idDepartement: dept._id });

                // ✅ NOUVEAU: Compter les services de ce département (depuis servicesCollection)
                const serviceCount = servicesCollection
                    ? await servicesCollection.countDocuments({ idDepartement: dept._id })
                    : 0;

                // Si c'est un service, récupérer le département parent
                let parentDepartment = null;
                if (dept.parentDepartement) {
                    parentDepartment = await departementsCollection.findOne({ _id: dept.parentDepartement });
                }

                return {
                    ...dept,
                    userCount,
                    documentCount,
                    serviceCount, // ✅ NOUVEAU: Nombre de services
                    subDepartmentCount: serviceCount, // ✅ Alias pour compatibilité
                    parentDepartment: parentDepartment ? {
                        _id: parentDepartment._id,
                        nom: parentDepartment.nom,
                        code: parentDepartment.code
                    } : null,
                    type: dept.parentDepartement ? 'service' : 'principal'
                };
            })
        );

        // Statistiques
        const stats = {
            total,
            main: await departementsCollection.countDocuments({ parentDepartement: null }),
            services: await departementsCollection.countDocuments({ parentDepartement: { $ne: null } })
        };

        return {
            departments: enrichedDepartments,
            pagination: {
                page,
                totalPages: Math.ceil(total / limit),
                total
            },
            stats
        };
    } catch (error) {
        console.error('❌ Erreur getAllDepartments:', error);
        throw error;
    }
}

/**
 * Créer un département principal (niveau 0 uniquement)
 */
async function createDepartment(data, createdBy) {
    try {
        const { nom, code, description = '' } = data;

        // Validation
        if (!nom || !code) {
            throw new Error('Nom et code requis');
        }

        // Vérifier que le code n'existe pas déjà
        const existing = await departementsCollection.findOne({ code });
        if (existing) {
            throw new Error('Ce code de département existe déjà');
        }

        // Créer le département
        const newDepartment = {
            _id: new ObjectId(),
            nom,
            code,
            description,
            parentDepartement: null, // Département principal
            dateCreation: new Date(),
            createdBy
        };

        await departementsCollection.insertOne(newDepartment);

        // Logger l'action
        await auditLogsCollection.insertOne({
            timestamp: new Date(),
            user: createdBy,
            action: 'DEPARTMENT_CREATED',
            details: {
                departmentId: newDepartment._id.toString(),
                nom,
                code
            }
        });

        return newDepartment;
    } catch (error) {
        console.error('❌ Erreur createDepartment:', error);
        throw error;
    }
}

/**
 * Modifier un département
 */
async function updateDepartment(departmentId, data, updatedBy) {
    try {
        const { nom, code, description } = data;

        // Validation
        if (!nom || !code) {
            throw new Error('Nom et code requis');
        }

        // Vérifier que le département existe
        const department = await departementsCollection.findOne({ _id: new ObjectId(departmentId) });
        if (!department) {
            throw new Error('Département non trouvé');
        }

        // Si on change le code, vérifier qu'il n'existe pas déjà
        if (code !== department.code) {
            const existing = await departementsCollection.findOne({ code });
            if (existing) {
                throw new Error('Ce code de département existe déjà');
            }
        }

        // Mettre à jour
        const updateData = {
            nom,
            code,
            description: description || department.description || '',
            lastModified: new Date(),
            lastModifiedBy: updatedBy
        };

        await departementsCollection.updateOne(
            { _id: new ObjectId(departmentId) },
            { $set: updateData }
        );

        // Logger l'action
        await auditLogsCollection.insertOne({
            timestamp: new Date(),
            user: updatedBy,
            action: 'DEPARTMENT_UPDATED',
            details: {
                departmentId,
                changes: {
                    nom: { old: department.nom, new: nom },
                    code: { old: department.code, new: code }
                }
            }
        });

        return { ...department, ...updateData };
    } catch (error) {
        console.error('❌ Erreur updateDepartment:', error);
        throw error;
    }
}

/**
 * Supprimer un département
 */
async function deleteDepartment(departmentId, deletedBy) {
    try {
        // Vérifier que le département existe
        const department = await departementsCollection.findOne({ _id: new ObjectId(departmentId) });
        if (!department) {
            throw new Error('Département non trouvé');
        }

        // Vérifier qu'il n'y a pas d'utilisateurs affectés
        const userCount = await usersCollection.countDocuments({ idDepartement: new ObjectId(departmentId) });
        if (userCount > 0) {
            throw new Error(`Impossible de supprimer : ${userCount} utilisateur(s) sont affectés à ce département`);
        }

        // Vérifier qu'il n'y a pas de sous-départements
        const subDeptCount = await departementsCollection.countDocuments({ parentDepartement: new ObjectId(departmentId) });
        if (subDeptCount > 0) {
            throw new Error(`Impossible de supprimer : ${subDeptCount} service(s) dépendent de ce département`);
        }

        // Vérifier qu'il n'y a pas de documents
        const docCount = await documentsCollection.countDocuments({ idDepartement: new ObjectId(departmentId) });
        if (docCount > 0) {
            throw new Error(`Impossible de supprimer : ${docCount} document(s) sont associés à ce département`);
        }

        // Supprimer
        await departementsCollection.deleteOne({ _id: new ObjectId(departmentId) });

        // Logger l'action
        await auditLogsCollection.insertOne({
            timestamp: new Date(),
            user: deletedBy,
            action: 'DEPARTMENT_DELETED',
            details: {
                departmentId,
                nom: department.nom,
                code: department.code
            }
        });

        return { success: true };
    } catch (error) {
        console.error('❌ Erreur deleteDepartment:', error);
        throw error;
    }
}

/**
 * Obtenir les statistiques globales
 */
async function getStats() {
    try {
        const stats = {
            total: await departementsCollection.countDocuments({}),
            main: await departementsCollection.countDocuments({ parentDepartement: null }),
            services: await departementsCollection.countDocuments({ parentDepartement: { $ne: null } })
        };

        return stats;
    } catch (error) {
        console.error('❌ Erreur getStats:', error);
        throw error;
    }
}

module.exports = {
    init,
    getAllDepartments,
    createDepartment,
    updateDepartment,
    deleteDepartment,
    getStats
};
