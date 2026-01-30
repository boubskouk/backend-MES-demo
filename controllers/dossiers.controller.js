// ============================================
// CONTROLLER DES DOSSIERS
// Gestion des requêtes HTTP et réponses
// ============================================

const { validationResult } = require('express-validator');
const dossierService = require('../services/dossierService');
const { getAccessibleDossiers, getDossiersStats } = require('../services/permissionsDossierService');

/**
 * Validation des extensions de fichiers
 */
const ALLOWED_EXTENSIONS = [
    '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.txt',
    '.odt', '.ods', '.odp', '.rtf', '.csv',
    '.jpg', '.jpeg', '.png', '.gif', '.bmp', '.svg', '.webp',
    '.zip', '.rar'
];

const BLOCKED_EXTENSIONS = [
    '.mp4', '.avi', '.mov', '.mkv', '.flv', '.wmv', '.webm',
    '.mp3', '.wav', '.ogg', '.m4a',
    '.exe', '.bat', '.sh', '.msi', '.cmd', '.vbs', '.ps1'
];

/**
 * Valider l'extension d'un fichier
 */
function validateFileExtension(fileName) {
    const fileNameLower = fileName.toLowerCase();
    const isAllowed = ALLOWED_EXTENSIONS.some(ext => fileNameLower.endsWith(ext));

    if (!isAllowed) {
        const ext = fileNameLower.substring(fileNameLower.lastIndexOf('.'));
        return { valid: false, message: `Extension "${ext}" non autorisée` };
    }

    const isBlocked = BLOCKED_EXTENSIONS.some(ext => fileNameLower.endsWith(ext));
    if (isBlocked) {
        const ext = fileNameLower.substring(fileNameLower.lastIndexOf('.'));
        return { valid: false, message: `Les fichiers ${ext} ne sont pas autorisés` };
    }

    return { valid: true };
}

/**
 * GET /api/dossiers/:userId - Récupérer les dossiers accessibles
 */
async function getAccessibleDossiers_Controller(req, res) {
    try {
        const { userId } = req.params;
        const {
            page = 1,
            limit = 50,
            search = '',
            category = '',
            sort = 'createdAt',
            order = -1
        } = req.query;

        // Récupérer tous les dossiers accessibles
        let dossiers = await getAccessibleDossiers(userId);

        // Filtrage par recherche
        if (search && search.trim()) {
            const searchLower = search.toLowerCase().trim();
            dossiers = dossiers.filter(dossier =>
                (dossier.titre && dossier.titre.toLowerCase().includes(searchLower)) ||
                (dossier.description && dossier.description.toLowerCase().includes(searchLower)) ||
                (dossier.idDossier && dossier.idDossier.toLowerCase().includes(searchLower)) ||
                (dossier.tags && dossier.tags.some(tag => tag.toLowerCase().includes(searchLower)))
            );
        }

        // Filtrage par catégorie
        if (category && category.trim()) {
            dossiers = dossiers.filter(dossier => dossier.categorie === category.trim());
        }

        // Tri
        const sortField = sort === 'titre' ? 'titre' : sort === 'nombreFichiers' ? 'nombreFichiers' : 'createdAt';
        const sortOrder = parseInt(order) || -1;
        dossiers.sort((a, b) => {
            const valA = a[sortField] || '';
            const valB = b[sortField] || '';
            if (sortOrder === 1) {
                return valA > valB ? 1 : valA < valB ? -1 : 0;
            } else {
                return valA < valB ? 1 : valA > valB ? -1 : 0;
            }
        });

        // Pagination
        const total = dossiers.length;
        const pageNum = parseInt(page) || 1;
        const limitNum = parseInt(limit) || 50;
        const totalPages = Math.ceil(total / limitNum);
        const skip = (pageNum - 1) * limitNum;
        const paginatedDossiers = dossiers.slice(skip, skip + limitNum);

        res.json({
            success: true,
            dossiers: paginatedDossiers,
            total,
            page: pageNum,
            limit: limitNum,
            totalPages,
            hasNextPage: pageNum < totalPages,
            hasPrevPage: pageNum > 1
        });

    } catch (error) {
        console.error('❌ Erreur getAccessibleDossiers:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur serveur'
        });
    }
}

/**
 * GET /api/dossiers/:userId/stats - Récupérer les statistiques
 */
async function getStats(req, res) {
    try {
        const { userId } = req.params;
        const stats = await getDossiersStats(userId);

        res.json({
            success: true,
            stats
        });

    } catch (error) {
        console.error('❌ Erreur getStats:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur serveur'
        });
    }
}

/**
 * GET /api/dossiers/:userId/:dossierId - Récupérer un dossier spécifique
 */
async function getDossier(req, res) {
    try {
        const { userId, dossierId } = req.params;

        const dossier = await dossierService.getDossier(userId, dossierId);

        res.json({
            success: true,
            dossier
        });

    } catch (error) {
        console.error('❌ Erreur getDossier:', error);

        if (error.locked) {
            return res.status(403).json({
                success: false,
                message: error.message,
                locked: true,
                lockedBy: error.lockedBy
            });
        }

        if (error.message === 'Dossier non trouvé ou accès refusé') {
            return res.status(404).json({
                success: false,
                message: error.message
            });
        }

        res.status(500).json({
            success: false,
            message: 'Erreur serveur'
        });
    }
}

/**
 * POST /api/dossiers - Créer un dossier
 */
async function createDossier(req, res) {
    try {
        // Validation
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            console.error('❌ Erreurs de validation:', JSON.stringify(errors.array(), null, 2));
            return res.status(400).json({
                success: false,
                message: 'Données invalides',
                errors: errors.array()
            });
        }

        const { userId, titre, categorie, date, description, tags, document, fichier, departementArchivage, locked } = req.body;

        // Vérifier champs obligatoires
        if (!userId || !titre) {
            return res.status(400).json({
                success: false,
                message: 'Données manquantes: userId et titre sont obligatoires'
            });
        }

        // Le document est OBLIGATOIRE pour créer un dossier
        const documentData = document || fichier;
        if (!documentData || !documentData.nomFichier || !documentData.contenu) {
            return res.status(400).json({
                success: false,
                message: 'Un document est obligatoire pour créer un dossier'
            });
        }

        // Valider l'extension du document
        const validation = validateFileExtension(documentData.nomFichier);
        if (!validation.valid) {
            return res.status(400).json({
                success: false,
                message: validation.message
            });
        }

        // Créer le dossier
        const result = await dossierService.createDossier({
            titre,
            categorie,
            date,
            description,
            tags,
            document: documentData,
            departementArchivage,
            locked
        }, userId);

        res.json(result);

    } catch (error) {
        console.error('❌ Erreur createDossier:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Erreur serveur'
        });
    }
}

/**
 * DELETE /api/dossiers/:userId/:dossierId - Supprimer un dossier (soft delete)
 */
async function deleteDossier(req, res) {
    try {
        const { userId, dossierId } = req.params;
        const { motif } = req.body;

        if (!motif || motif.trim() === '') {
            return res.status(400).json({
                success: false,
                message: 'Le motif de suppression est obligatoire'
            });
        }

        await dossierService.deleteDossier(userId, dossierId, motif);

        res.json({
            success: true,
            message: 'Dossier supprimé (corbeille)'
        });

    } catch (error) {
        console.error('❌ Erreur deleteDossier:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Erreur serveur'
        });
    }
}

/**
 * POST /api/dossiers/:userId/:dossierId/fichier - Ajouter un fichier
 */
async function addFichier(req, res) {
    try {
        const { userId, dossierId } = req.params;
        const { nomFichier, taille, type, contenu } = req.body;

        // Validation
        if (!nomFichier || !contenu) {
            return res.status(400).json({
                success: false,
                message: 'Nom du fichier et contenu requis'
            });
        }

        // Valider l'extension
        const validation = validateFileExtension(nomFichier);
        if (!validation.valid) {
            return res.status(400).json({
                success: false,
                message: validation.message
            });
        }

        const result = await dossierService.addFichier(userId, dossierId, {
            nomFichier,
            taille,
            type,
            contenu
        });

        res.json(result);

    } catch (error) {
        console.error('❌ Erreur addFichier:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Erreur serveur'
        });
    }
}

/**
 * DELETE /api/dossiers/:userId/:dossierId/fichier/:fichierId - Retirer un fichier
 */
async function removeFichier(req, res) {
    try {
        const { userId, dossierId, fichierId } = req.params;

        await dossierService.removeFichier(userId, dossierId, fichierId);

        res.json({
            success: true,
            message: 'Fichier retiré du dossier'
        });

    } catch (error) {
        console.error('❌ Erreur removeFichier:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Erreur serveur'
        });
    }
}

/**
 * GET /api/dossiers/:userId/:dossierId/fichier/:fichierId/download - Télécharger un fichier
 */
async function downloadFichier(req, res) {
    try {
        const { userId, dossierId, fichierId } = req.params;

        const result = await dossierService.downloadFichier(userId, dossierId, fichierId);

        res.json({
            success: true,
            fichier: result.fichier
        });

    } catch (error) {
        console.error('❌ Erreur downloadFichier:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Erreur serveur'
        });
    }
}

/**
 * GET /api/dossiers/:userId/:dossierId/download-all - Télécharger tout en ZIP
 */
async function downloadAllAsZip(req, res) {
    try {
        const { userId, dossierId } = req.params;

        const { archive, dossier } = await dossierService.downloadAllAsZip(userId, dossierId);

        // Configurer les headers pour le téléchargement ZIP
        res.setHeader('Content-Type', 'application/zip');
        res.setHeader('Content-Disposition', `attachment; filename="${dossier.idDossier}.zip"`);

        // Pipe l'archive vers la réponse
        archive.pipe(res);

        // Finaliser l'archive
        archive.finalize();

    } catch (error) {
        console.error('❌ Erreur downloadAllAsZip:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Erreur serveur'
        });
    }
}

/**
 * POST /api/dossiers/:userId/:dossierId/share - Partager le dossier
 */
async function shareDossier(req, res) {
    try {
        const { userId, dossierId } = req.params;
        const { usersToShare } = req.body;

        if (!usersToShare || !Array.isArray(usersToShare) || usersToShare.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Liste d\'utilisateurs invalide'
            });
        }

        await dossierService.shareDossier(userId, dossierId, usersToShare);

        res.json({
            success: true,
            message: `Dossier partagé avec ${usersToShare.length} utilisateur(s)`
        });

    } catch (error) {
        console.error('❌ Erreur shareDossier:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Erreur serveur'
        });
    }
}

/**
 * POST /api/dossiers/:userId/:dossierId/unshare - Retirer le partage
 */
async function unshareDossier(req, res) {
    try {
        const { userId, dossierId } = req.params;
        const { userToRemove } = req.body;

        if (!userToRemove) {
            return res.status(400).json({
                success: false,
                message: 'Utilisateur requis'
            });
        }

        await dossierService.unshareDossier(userId, dossierId, userToRemove);

        res.json({
            success: true,
            message: 'Partage retiré'
        });

    } catch (error) {
        console.error('❌ Erreur unshareDossier:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Erreur serveur'
        });
    }
}

/**
 * GET /api/dossiers/:userId/:dossierId/shared-users - Liste utilisateurs partagés
 */
async function getSharedUsers(req, res) {
    try {
        const { userId, dossierId } = req.params;

        const dossier = await dossierService.getDossier(userId, dossierId);

        res.json({
            success: true,
            sharedWith: dossier.sharedWith || []
        });

    } catch (error) {
        console.error('❌ Erreur getSharedUsers:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Erreur serveur'
        });
    }
}

/**
 * POST /api/dossiers/:userId/:dossierId/toggle-lock - Verrouiller/Déverrouiller
 */
async function toggleLock(req, res) {
    try {
        const { userId, dossierId } = req.params;

        const result = await dossierService.toggleLock(userId, dossierId);

        res.json(result);

    } catch (error) {
        console.error('❌ Erreur toggleLock:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Erreur serveur'
        });
    }
}

/**
 * POST /api/dossiers/restore/:dossierId - Restaurer depuis corbeille
 */
async function restoreDossier(req, res) {
    try {
        const { dossierId } = req.params;
        const userId = req.session?.userId;

        await dossierService.restoreDossier(userId, dossierId);

        res.json({
            success: true,
            message: 'Dossier restauré'
        });

    } catch (error) {
        console.error('❌ Erreur restoreDossier:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Erreur serveur'
        });
    }
}

/**
 * DELETE /api/dossiers/permanent/:dossierId - Suppression définitive
 */
async function permanentDelete(req, res) {
    try {
        const { dossierId } = req.params;
        const userId = req.session?.userId;

        await dossierService.permanentDelete(userId, dossierId);

        res.json({
            success: true,
            message: 'Dossier supprimé définitivement'
        });

    } catch (error) {
        console.error('❌ Erreur permanentDelete:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Erreur serveur'
        });
    }
}

/**
 * DELETE /api/dossiers/:userId/delete-all - Tout supprimer
 */
async function deleteAll(req, res) {
    try {
        const { userId } = req.params;
        const { motif } = req.body;

        if (!motif) {
            return res.status(400).json({
                success: false,
                message: 'Motif requis'
            });
        }

        // Récupérer tous les dossiers accessibles
        const dossiers = await getAccessibleDossiers(userId);

        if (dossiers.length === 0) {
            return res.json({
                success: true,
                count: 0,
                deletedCount: 0
            });
        }

        // Supprimer chaque dossier
        let deletedCount = 0;
        for (const dossier of dossiers) {
            try {
                await dossierService.deleteDossier(userId, dossier.idDossier, motif);
                deletedCount++;
            } catch (error) {
                console.error(`Erreur suppression dossier ${dossier.idDossier}:`, error.message);
            }
        }

        res.json({
            success: true,
            count: dossiers.length,
            deletedCount
        });

    } catch (error) {
        console.error('❌ Erreur deleteAll:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Erreur serveur'
        });
    }
}

/**
 * PUT /api/dossiers/:userId/:dossierId/rename - Renommer un dossier
 */
async function renameDossier(req, res) {
    try {
        const { userId, dossierId } = req.params;
        const { nouveauTitre } = req.body;

        if (!nouveauTitre || nouveauTitre.trim().length < 2) {
            return res.status(400).json({
                success: false,
                message: 'Le nouveau titre doit contenir au moins 2 caractères'
            });
        }

        const result = await dossierService.renameDossier(userId, dossierId, nouveauTitre);

        res.json({
            success: true,
            message: 'Dossier renommé avec succès',
            ...result
        });

    } catch (error) {
        console.error('❌ Erreur renameDossier:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Erreur serveur'
        });
    }
}

// ============================================
// ACTIONS AU NIVEAU DES DOCUMENTS
// ============================================

/**
 * POST /api/dossiers/:userId/:dossierId/document - Ajouter un document
 */
async function addDocument(req, res) {
    try {
        const { userId, dossierId } = req.params;
        const { nomFichier, taille, type, contenu } = req.body;

        // Validation
        if (!nomFichier || !contenu) {
            return res.status(400).json({
                success: false,
                message: 'Nom du fichier et contenu requis'
            });
        }

        // Valider l'extension
        const validation = validateFileExtension(nomFichier);
        if (!validation.valid) {
            return res.status(400).json({
                success: false,
                message: validation.message
            });
        }

        const result = await dossierService.addDocument(userId, dossierId, {
            nomFichier,
            taille,
            type,
            contenu
        });

        res.json(result);

    } catch (error) {
        console.error('❌ Erreur addDocument:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Erreur serveur'
        });
    }
}

/**
 * DELETE /api/dossiers/:userId/:dossierId/document/:documentId - Retirer un document
 * Aussi utilisé par la route de rétrocompatibilité /:userId/:dossierId/fichier/:fichierId
 */
async function removeDocument(req, res) {
    try {
        const { userId, dossierId, documentId, fichierId } = req.params;
        // Supporte les deux paramètres : documentId (nouveau) et fichierId (rétrocompat)
        const docId = documentId || fichierId;

        await dossierService.removeDocument(userId, dossierId, docId);

        res.json({
            success: true,
            message: 'Document retiré du dossier'
        });

    } catch (error) {
        console.error('❌ Erreur removeDocument:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Erreur serveur'
        });
    }
}

/**
 * GET /api/dossiers/:userId/:dossierId/document/:documentId - Récupérer un document
 */
async function getDocument(req, res) {
    try {
        const { userId, dossierId, documentId } = req.params;

        const result = await dossierService.getDocument(userId, dossierId, documentId);

        res.json({
            success: true,
            document: result.document,
            dossier: result.dossier
        });

    } catch (error) {
        console.error('❌ Erreur getDocument:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Erreur serveur'
        });
    }
}

/**
 * GET /api/dossiers/:userId/:dossierId/document/:documentId/download - Télécharger un document
 * Aussi utilisé par la route de rétrocompatibilité /:userId/:dossierId/fichier/:fichierId/download
 */
async function downloadDocument(req, res) {
    try {
        const { userId, dossierId, documentId, fichierId } = req.params;
        // Supporte les deux paramètres : documentId (nouveau) et fichierId (rétrocompat)
        const docId = documentId || fichierId;

        // Vérifier si c'est une consultation (prévisualisation) ou un téléchargement
        const isPreview = req.query.preview === 'true';

        const result = await dossierService.downloadDocument(userId, dossierId, docId, { isPreview });

        res.json({
            success: true,
            document: result.document
        });

    } catch (error) {
        console.error('❌ Erreur downloadDocument:', error);

        if (error.message && error.message.includes('verrouillé')) {
            return res.status(403).json({
                success: false,
                message: error.message,
                locked: true
            });
        }

        res.status(500).json({
            success: false,
            message: error.message || 'Erreur serveur'
        });
    }
}

/**
 * POST /api/dossiers/:userId/:dossierId/document/:documentId/share - Partager un document
 */
async function shareDocument(req, res) {
    try {
        const { userId, dossierId, documentId } = req.params;
        const { usersToShare } = req.body;

        if (!usersToShare || !Array.isArray(usersToShare) || usersToShare.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Liste d\'utilisateurs invalide'
            });
        }

        await dossierService.shareDocument(userId, dossierId, documentId, usersToShare);

        res.json({
            success: true,
            message: `Document partagé avec ${usersToShare.length} utilisateur(s)`
        });

    } catch (error) {
        console.error('❌ Erreur shareDocument:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Erreur serveur'
        });
    }
}

/**
 * POST /api/dossiers/:userId/:dossierId/document/:documentId/unshare - Retirer le partage d'un document
 */
async function unshareDocument(req, res) {
    try {
        const { userId, dossierId, documentId } = req.params;
        const { userToRemove } = req.body;

        if (!userToRemove) {
            return res.status(400).json({
                success: false,
                message: 'Utilisateur requis'
            });
        }

        await dossierService.unshareDocument(userId, dossierId, documentId, userToRemove);

        res.json({
            success: true,
            message: 'Partage du document retiré'
        });

    } catch (error) {
        console.error('❌ Erreur unshareDocument:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Erreur serveur'
        });
    }
}

/**
 * POST /api/dossiers/:userId/:dossierId/document/:documentId/toggle-lock - Verrouiller/Déverrouiller un document
 */
async function toggleDocumentLock(req, res) {
    try {
        const { userId, dossierId, documentId } = req.params;

        const result = await dossierService.toggleDocumentLock(userId, dossierId, documentId);

        res.json(result);

    } catch (error) {
        console.error('❌ Erreur toggleDocumentLock:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Erreur serveur'
        });
    }
}

/**
 * GET /api/dossiers/:userId/search/documents - Rechercher des documents
 */
async function searchDocuments(req, res) {
    try {
        const { userId } = req.params;
        const { q, page = 1, limit = 20 } = req.query;

        if (!q || q.trim().length < 2) {
            return res.status(400).json({
                success: false,
                message: 'La recherche doit contenir au moins 2 caractères'
            });
        }

        const result = await dossierService.searchDocuments(userId, q.trim(), {
            page: parseInt(page),
            limit: parseInt(limit)
        });

        res.json({
            success: true,
            ...result
        });

    } catch (error) {
        console.error('❌ Erreur searchDocuments:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Erreur serveur'
        });
    }
}

/**
 * GET /api/dossiers/:dossierId/documents/:documentId/history
 * Récupérer l'historique/traçabilité d'un document (20 dernières actions)
 */
async function getDocumentHistory(req, res) {
    try {
        const { dossierId, documentId } = req.params;
        const limit = parseInt(req.query.limit) || 20;

        const { getCollections } = require('../config/database');
        const collections = getCollections();

        // Rechercher les logs d'audit liés à ce document
        const history = await collections.auditLogs.find({
            $or: [
                { 'details.documentId': documentId },
                { 'details.dossierId': dossierId, 'details.documentId': documentId },
                { documentId: documentId },
                { 'metadata.documentId': documentId }
            ]
        })
        .sort({ timestamp: -1 })
        .limit(limit)
        .toArray();

        // Formater les résultats
        const formattedHistory = history.map(log => ({
            action: log.action || log.eventType,
            timestamp: log.timestamp || log.date,
            user: log.user || log.utilisateur || log.username,
            details: log.details?.message || log.message || '',
            ip: log.ip || log.details?.ip
        }));

        // Si pas assez de résultats, chercher aussi dans le dossier lui-même
        if (formattedHistory.length < limit) {
            // Récupérer le dossier pour voir l'historique embarqué
            const dossier = await collections.dossiers.findOne({
                $or: [
                    { idDossier: dossierId },
                    { _id: require('mongodb').ObjectId.isValid(dossierId) ? new require('mongodb').ObjectId(dossierId) : null }
                ]
            });

            if (dossier) {
                // Chercher le document dans le dossier
                const documents = dossier.documents || dossier.fichiers || [];
                const doc = documents.find(d =>
                    d.idDocument === documentId ||
                    d.id === documentId ||
                    String(d._id) === documentId
                );

                if (doc) {
                    // Ajouter l'historique de téléchargement
                    if (doc.historiqueTelechargements) {
                        doc.historiqueTelechargements.forEach(h => {
                            formattedHistory.push({
                                action: 'DOCUMENT_DOWNLOADED',
                                timestamp: h.date,
                                user: h.utilisateur,
                                details: '',
                                ip: h.ip
                            });
                        });
                    }

                    // Ajouter l'historique de consultation
                    if (doc.historiqueConsultations) {
                        doc.historiqueConsultations.forEach(h => {
                            formattedHistory.push({
                                action: 'DOCUMENT_CONSULTED',
                                timestamp: h.date,
                                user: h.utilisateur,
                                details: '',
                                ip: h.ip
                            });
                        });
                    }

                    // Ajouter les infos d'archivage
                    if (doc.archivePar) {
                        formattedHistory.push({
                            action: 'DOCUMENT_UPLOADED',
                            timestamp: doc.archivePar.dateArchivage || doc.dateAjout,
                            user: doc.archivePar.utilisateur || doc.archivePar.nomComplet,
                            details: 'Document ajouté au dossier',
                            ip: ''
                        });
                    }

                    // Ajouter les infos de partage
                    if (doc.sharedWith && doc.sharedWith.length > 0) {
                        doc.sharedWith.forEach(share => {
                            formattedHistory.push({
                                action: 'DOCUMENT_SHARED',
                                timestamp: share.sharedAt || share.date,
                                user: share.sharedBy,
                                details: `Partagé avec ${share.sharedWith || share.utilisateur}`,
                                ip: ''
                            });
                        });
                    }
                }
            }
        }

        // Trier par date décroissante et limiter
        formattedHistory.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        const finalHistory = formattedHistory.slice(0, limit);

        res.json({
            success: true,
            history: finalHistory,
            total: finalHistory.length
        });

    } catch (error) {
        console.error('❌ Erreur getDocumentHistory:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Erreur serveur'
        });
    }
}

module.exports = {
    // Dossiers
    getAccessibleDossiers: getAccessibleDossiers_Controller,
    getStats,
    getDossier,
    createDossier,
    deleteDossier,
    downloadAllAsZip,
    shareDossier,
    unshareDossier,
    getSharedUsers,
    toggleLock,
    restoreDossier,
    permanentDelete,
    deleteAll,
    renameDossier,

    // Documents (nouveau format)
    addDocument,
    removeDocument,
    getDocument,
    downloadDocument,
    shareDocument,
    unshareDocument,
    toggleDocumentLock,
    searchDocuments,
    getDocumentHistory,

    // Alias rétrocompatibilité
    addFichier: addDocument,
    removeFichier: removeDocument,
    downloadFichier: downloadDocument
};
