// ============================================
// SERVICE DE GESTION DES PERMISSIONS - DOSSIERS
// Logique d'accès aux dossiers selon les niveaux
// ============================================

const { getCollections } = require('../config/database');
const constants = require('../utils/constants');
const { ObjectId } = require('mongodb');

/**
 * Convertir une valeur en ObjectId si nécessaire
 */
function toObjectId(value) {
    if (!value) return value;
    if (typeof value === 'string') {
        try {
            return new ObjectId(value);
        } catch (e) {
            console.error(`⚠️ Impossible de convertir en ObjectId: ${value}`);
            return value;
        }
    }
    return value;
}

/**
 * Récupérer les dossiers accessibles par un utilisateur selon son niveau
 * @param {string} userId - Username de l'utilisateur
 * @returns {Promise<Array>} - Liste des dossiers accessibles (sans contenu des fichiers)
 */
async function getAccessibleDossiers(userId) {
    try {
        const collections = getCollections();

        const user = await collections.users.findOne({ username: userId });
        if (!user) {
            console.log(`❌ Utilisateur non trouvé: ${userId}`);
            return [];
        }

        const userRole = await collections.roles.findOne({ _id: toObjectId(user.idRole) });
        if (!userRole) {
            console.log(`❌ Rôle non trouvé pour l'utilisateur: ${userId}`);
            return [];
        }

        console.log(`📋 Récupération dossiers pour: ${userId} (niveau ${userRole.niveau}, dept: ${user.idDepartement})`);

        let accessibleDossiers = [];

        // Projection sans contenu fichiers pour performance
        const projection = {
            'fichiers.path': 0 // On garde les métadonnées mais pas le path interne
        };

        // NIVEAU 0 : Super Admin - Voit TOUS les dossiers (lecture seule)
        if (userRole.niveau == constants.PERMISSIONS.SUPER_ADMIN) {
            const allDossiers = await collections.dossiers.find({
                deleted: false
            }, { projection }).toArray();
            accessibleDossiers = allDossiers;
            console.log(`✅ NIVEAU 0 (Super Admin): Accès à TOUS les dossiers en LECTURE SEULE (${accessibleDossiers.length})`);
            return accessibleDossiers;
        }

        // NIVEAU 1 : Voit les dossiers de SON département ET des services de ce département
        if (userRole.niveau == constants.PERMISSIONS.PRIMAIRE) {
            if (!user.idDepartement) {
                console.log(`⚠️ Utilisateur niveau 1 sans département: Aucun dossier accessible`);
                return [];
            }

            const deptId = toObjectId(user.idDepartement);
            const startTime = Date.now();

            // Récupérer tous les services du département
            const services = await collections.services.find({
                idDepartement: deptId
            }).toArray();

            const serviceIds = services.map(s => s._id);
            console.log(`📋 Services trouvés: ${services.map(s => s.nom).join(', ')}`);

            // Requêtes en parallèle
            const [deptDossiers, serviceDossiers] = await Promise.all([
                collections.dossiers.find({
                    idDepartement: deptId,
                    deleted: false
                }, { projection }).toArray(),
                serviceIds.length > 0
                    ? collections.dossiers.find({
                        idService: { $in: serviceIds },
                        deleted: false
                    }, { projection }).toArray()
                    : Promise.resolve([])
            ]);

            // Combiner et dédupliquer
            const dossiersMap = new Map();
            [...deptDossiers, ...serviceDossiers].forEach(dossier => {
                dossiersMap.set(dossier._id.toString(), dossier);
            });
            accessibleDossiers = Array.from(dossiersMap.values());

            console.log(`✅ NIVEAU 1: Accès aux dossiers du département + services (${accessibleDossiers.length}) en ${Date.now() - startTime}ms`);
            return accessibleDossiers;
        }

        // NIVEAU 2 : Voit TOUS les dossiers de son département + partagés avec lui
        if (userRole.niveau == constants.PERMISSIONS.SECONDAIRE) {
            if (!user.idDepartement) {
                console.log(`⚠️ Utilisateur niveau 2 sans département: Aucun dossier accessible`);
                return [];
            }

            const deptId = toObjectId(user.idDepartement);

            // Dossiers du département
            const deptDossiers = await collections.dossiers.find({
                idDepartement: deptId,
                deleted: false
            }, { projection }).toArray();

            // Dossiers partagés avec lui depuis d'autres départements
            const sharedDossiers = await collections.dossiers.find({
                sharedWith: userId,
                idDepartement: { $ne: deptId },
                deleted: false
            }, { projection }).toArray();

            accessibleDossiers = [...deptDossiers, ...sharedDossiers];
            console.log(`✅ NIVEAU 2: Accès à TOUS les dossiers du département (${deptDossiers.length}) + partagés (${sharedDossiers.length})`);
            return accessibleDossiers;
        }

        // NIVEAU 3 : Voit uniquement ses dossiers + dossiers des autres niveau 3 du département + partagés
        if (userRole.niveau == constants.PERMISSIONS.TERTIAIRE) {
            if (!user.idDepartement) {
                console.log(`⚠️ Utilisateur niveau 3 sans département: Aucun dossier accessible`);
                return [];
            }

            const deptId = toObjectId(user.idDepartement);

            // Récupérer tous les utilisateurs niveau 3 du même département
            const niveau3Users = await collections.users.find({
                idDepartement: deptId,
                idRole: userRole._id
            }).toArray();

            const niveau3Usernames = niveau3Users.map(u => u.username);
            console.log(`📋 Utilisateurs niveau 3 du département: ${niveau3Usernames.join(', ')}`);

            // Dossiers des utilisateurs niveau 3 du département
            const niveau3Dossiers = await collections.dossiers.find({
                idDepartement: deptId,
                idUtilisateur: { $in: niveau3Usernames },
                deleted: false
            }, { projection }).toArray();

            // Dossiers partagés avec lui
            const sharedDossiers = await collections.dossiers.find({
                sharedWith: userId,
                deleted: false
            }, { projection }).toArray();

            accessibleDossiers = [...niveau3Dossiers, ...sharedDossiers];
            console.log(`✅ NIVEAU 3: Accès dossiers niveau 3 du département (${niveau3Dossiers.length}) + partagés (${sharedDossiers.length})`);
            return accessibleDossiers;
        }

        console.log(`⚠️ Niveau inconnu (${userRole.niveau}): Aucun dossier accessible`);
        return [];

    } catch (error) {
        console.error(`❌ Erreur getAccessibleDossiers pour ${userId}:`, error);
        console.error('Stack trace:', error.stack);
        throw error;
    }
}

/**
 * Vérifier si un utilisateur peut accéder à un dossier spécifique
 * @param {string} userId - Username de l'utilisateur
 * @param {string} dossierId - ID du dossier
 * @returns {Promise<boolean>} - true si l'utilisateur peut accéder au dossier
 */
async function canAccessDossier(userId, dossierId) {
    const accessibleDossiers = await getAccessibleDossiers(userId);
    return accessibleDossiers.some(dossier =>
        dossier._id.toString() === dossierId || dossier.idDossier === dossierId
    );
}

/**
 * Récupérer les statistiques des dossiers pour un utilisateur
 * @param {string} userId - Username de l'utilisateur
 * @returns {Promise<Object>} - Statistiques des dossiers accessibles
 */
async function getDossiersStats(userId) {
    const dossiers = await getAccessibleDossiers(userId);

    const stats = {
        totalDossiers: dossiers.length,
        totalFichiers: 0,
        tailleTotale: 0,
        dossiersPartages: 0,
        dossiersVerrouilles: 0,
        parCategorie: {}
    };

    dossiers.forEach(dossier => {
        stats.totalFichiers += dossier.nombreFichiers || 0;
        stats.tailleTotale += dossier.tailleTotale || 0;

        if (dossier.sharedWith && dossier.sharedWith.length > 0) {
            stats.dossiersPartages++;
        }

        if (dossier.locked) {
            stats.dossiersVerrouilles++;
        }

        // Par catégorie
        const cat = dossier.categorie || 'Non catégorisé';
        if (!stats.parCategorie[cat]) {
            stats.parCategorie[cat] = 0;
        }
        stats.parCategorie[cat]++;
    });

    return stats;
}

module.exports = {
    getAccessibleDossiers,
    canAccessDossier,
    getDossiersStats
};
