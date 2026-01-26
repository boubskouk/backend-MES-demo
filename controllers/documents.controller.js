// ============================================
// CONTROLLER DES DOCUMENTS
// Gestion des requêtes HTTP et réponses
// ============================================

const { validationResult } = require('express-validator');
const documentService = require('../services/documentService');
const { getAccessibleDocuments } = require('../services/permissionsService');

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
 * GET /api/documents/:userId - Récupérer les documents accessibles
 */
async function getAccessibleDocuments_Controller(req, res) {
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

        // Récupérer tous les documents accessibles
        let documents = await getAccessibleDocuments(userId);

        // Filtrage par recherche
        if (search && search.trim()) {
            const searchLower = search.toLowerCase().trim();
            documents = documents.filter(doc =>
                (doc.titre && doc.titre.toLowerCase().includes(searchLower)) ||
                (doc.description && doc.description.toLowerCase().includes(searchLower)) ||
                (doc.idDocument && doc.idDocument.toLowerCase().includes(searchLower)) ||
                (doc.tags && doc.tags.some(tag => tag.toLowerCase().includes(searchLower)))
            );
        }

        // Filtrage par catégorie
        if (category && category.trim()) {
            documents = documents.filter(doc => doc.categorie === category.trim());
        }

        // Tri
        const sortField = sort === 'titre' ? 'titre' : sort === 'taille' ? 'taille' : 'dateAjout';
        const sortOrder = parseInt(order) || -1;
        documents.sort((a, b) => {
            const valA = a[sortField] || '';
            const valB = b[sortField] || '';
            if (sortOrder === 1) {
                return valA > valB ? 1 : valA < valB ? -1 : 0;
            } else {
                return valA < valB ? 1 : valA > valB ? -1 : 0;
            }
        });

        // Pagination
        const total = documents.length;
        const pageNum = parseInt(page) || 1;
        const limitNum = parseInt(limit) || 50;
        const totalPages = Math.ceil(total / limitNum);
        const skip = (pageNum - 1) * limitNum;
        const paginatedDocs = documents.slice(skip, skip + limitNum);

        res.json({
            success: true,
            documents: paginatedDocs,
            total: total,
            page: pageNum,
            limit: limitNum,
            totalPages: totalPages,
            hasNextPage: pageNum < totalPages,
            hasPrevPage: pageNum > 1
        });

    } catch (error) {
        console.error('❌ Erreur getAccessibleDocuments:', error);
        console.error('❌ Stack trace:', error.stack);
        res.status(500).json({
            success: false,
            message: 'Erreur serveur'
        });
    }
}

/**
 * GET /api/documents/:userId/:docId - Récupérer un document spécifique
 */
async function getDocument(req, res) {
    try {
        const { userId, docId } = req.params;

        const document = await documentService.getDocument(userId, docId);

        res.json({
            success: true,
            document
        });

    } catch (error) {
        console.error('❌ Erreur getDocument:', error);

        if (error.message === 'Document non trouvé ou accès refusé') {
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
 * POST /api/documents - Créer un document
 */
async function createDocument(req, res) {
    try {
        // Validation
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            console.error('❌ Erreurs de validation:', JSON.stringify(errors.array(), null, 2));
            console.error('📦 Body reçu:', JSON.stringify(req.body, null, 2));
            return res.status(400).json({
                success: false,
                message: 'Données invalides',
                errors: errors.array()
            });
        }

        const { userId, titre, categorie, date, description, tags, nomFichier, taille, type, contenu, departementArchivage, locked } = req.body;

        // Vérifier champs obligatoires
        if (!userId || !titre || !nomFichier) {
            return res.status(400).json({
                success: false,
                message: 'Données manquantes: userId, titre et nomFichier sont obligatoires'
            });
        }

        // Validation extension
        const fileName = nomFichier.toLowerCase();
        const isAllowed = ALLOWED_EXTENSIONS.some(ext => fileName.endsWith(ext));

        if (!isAllowed) {
            const ext = fileName.substring(fileName.lastIndexOf('.'));
            return res.status(400).json({
                success: false,
                message: `Extension "${ext}" non autorisée`
            });
        }

        // Bloquer fichiers dangereux
        const isBlocked = BLOCKED_EXTENSIONS.some(ext => fileName.endsWith(ext));
        if (isBlocked) {
            const ext = fileName.substring(fileName.lastIndexOf('.'));
            return res.status(403).json({
                success: false,
                message: `Les fichiers ${ext} ne sont pas autorisés`
            });
        }

        // Créer le document
        const result = await documentService.createDocument({
            titre,
            categorie,
            date,
            description,
            tags,
            nomFichier,
            taille,
            type,
            contenu,
            departementArchivage,
            locked
        }, userId);

        res.json(result);

    } catch (error) {
        console.error('❌ Erreur createDocument:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Erreur serveur'
        });
    }
}

/**
 * DELETE /api/documents/:userId/:docId - Supprimer un document
 */
async function deleteDocument(req, res) {
    try {
        const { userId, docId } = req.params;
        const { motif } = req.body;

        if (!motif || motif.trim() === '') {
            return res.status(400).json({
                success: false,
                message: 'Le motif de suppression est obligatoire'
            });
        }

        await documentService.deleteDocument(userId, docId, motif);

        res.json({
            success: true,
            message: 'Document supprimé (corbeille)'
        });

    } catch (error) {
        console.error('❌ Erreur deleteDocument:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Erreur serveur'
        });
    }
}

/**
 * POST /api/documents/:userId/:docId/share - Partager un document
 */
async function shareDocument(req, res) {
    try {
        const { userId, docId } = req.params;
        const { usersToShare } = req.body;

        if (!usersToShare || !Array.isArray(usersToShare) || usersToShare.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Liste d\'utilisateurs invalide'
            });
        }

        await documentService.shareDocument(userId, docId, usersToShare);

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
 * POST /api/documents/:userId/:docId/unshare - Retirer le partage
 */
async function unshareDocument(req, res) {
    try {
        const { userId, docId } = req.params;
        const { userToRemove } = req.body;

        if (!userToRemove) {
            return res.status(400).json({
                success: false,
                message: 'Utilisateur requis'
            });
        }

        await documentService.unshareDocument(userId, docId, userToRemove);

        res.json({
            success: true,
            message: 'Partage retiré'
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
 * GET /api/documents/:userId/:docId/shared-users - Liste utilisateurs partagés
 */
async function getSharedUsers(req, res) {
    try {
        const { userId, docId } = req.params;

        const document = await documentService.getDocument(userId, docId);

        res.json({
            success: true,
            sharedWith: document.sharedWith || []
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
 * POST /api/documents/:userId/:docId/toggle-lock - Verrouiller/Déverrouiller
 */
async function toggleLock(req, res) {
    try {
        const { userId, docId } = req.params;

        const result = await documentService.toggleLock(userId, docId);

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
 * POST /api/documents/:userId/:docId/download - Enregistrer téléchargement
 */
async function recordDownload(req, res) {
    try {
        const { userId, docId } = req.params;

        await documentService.recordDownload(userId, docId);

        res.json({
            success: true,
            message: 'Téléchargement enregistré'
        });

    } catch (error) {
        console.error('❌ Erreur recordDownload:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Erreur serveur'
        });
    }
}

/**
 * GET /api/documents/:userId/:docId/download-json - Télécharger au format JSON
 */
async function downloadAsJson(req, res) {
    try {
        const { userId, docId } = req.params;

        const document = await documentService.getDocument(userId, docId);

        res.json({
            success: true,
            document
        });

    } catch (error) {
        console.error('❌ Erreur downloadAsJson:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Erreur serveur'
        });
    }
}

/**
 * POST /api/documents/restore/:docId - Restaurer depuis corbeille
 */
async function restoreDocument(req, res) {
    try {
        const { docId } = req.params;
        const userId = req.session?.userId;

        await documentService.restoreDocument(userId, docId);

        res.json({
            success: true,
            message: 'Document restauré'
        });

    } catch (error) {
        console.error('❌ Erreur restoreDocument:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Erreur serveur'
        });
    }
}

/**
 * DELETE /api/documents/permanent/:docId - Suppression définitive
 */
async function permanentDelete(req, res) {
    try {
        const { docId } = req.params;
        const userId = req.session?.userId;

        await documentService.permanentDelete(userId, docId);

        res.json({
            success: true,
            message: 'Document supprimé définitivement'
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
 * DELETE /api/documents/:userId/delete-all - Tout supprimer
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

        const result = await documentService.deleteAll(userId, motif);

        res.json(result);

    } catch (error) {
        console.error('❌ Erreur deleteAll:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Erreur serveur'
        });
    }
}

/**
 * POST /api/documents/bulk - Import en masse
 */
async function bulkImport(req, res) {
    try {
        const { userId, documents } = req.body;

        if (!documents || !Array.isArray(documents)) {
            return res.status(400).json({
                success: false,
                message: 'Liste de documents invalide'
            });
        }

        const results = [];
        for (const docData of documents) {
            try {
                const result = await documentService.createDocument(docData, userId);
                results.push(result);
            } catch (error) {
                results.push({ success: false, error: error.message });
            }
        }

        res.json({
            success: true,
            imported: results.filter(r => r.success).length,
            failed: results.filter(r => !r.success).length,
            results
        });

    } catch (error) {
        console.error('❌ Erreur bulkImport:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Erreur serveur'
        });
    }
}

/**
 * GET /api/documents/my - Mes documents
 */
async function getMyDocuments(req, res) {
    try {
        const userId = req.session?.userId;

        if (!userId) {
            return res.status(401).json({
                success: false,
                message: 'Non authentifié'
            });
        }

        const documents = await getAccessibleDocuments(userId);
        const myDocs = documents.filter(doc => doc.idUtilisateur === userId);

        res.json({
            success: true,
            documents: myDocs,
            total: myDocs.length
        });

    } catch (error) {
        console.error('❌ Erreur getMyDocuments:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Erreur serveur'
        });
    }
}

/**
 * GET /api/documents/recent - Documents récents
 */
async function getRecentDocuments(req, res) {
    try {
        const userId = req.session?.userId;

        if (!userId) {
            return res.status(401).json({
                success: false,
                message: 'Non authentifié'
            });
        }

        const documents = await getAccessibleDocuments(userId);
        const recentDocs = documents
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
            .slice(0, 20);

        res.json({
            success: true,
            documents: recentDocs,
            total: recentDocs.length
        });

    } catch (error) {
        console.error('❌ Erreur getRecentDocuments:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Erreur serveur'
        });
    }
}

/**
 * GET /api/documents/favorites - Favoris
 */
async function getFavorites(req, res) {
    try {
        const userId = req.session?.userId;

        if (!userId) {
            return res.status(401).json({
                success: false,
                message: 'Non authentifié'
            });
        }

        const documents = await getAccessibleDocuments(userId);
        const favorites = documents.filter(doc => doc.isFavorite === true);

        res.json({
            success: true,
            documents: favorites,
            total: favorites.length
        });

    } catch (error) {
        console.error('❌ Erreur getFavorites:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Erreur serveur'
        });
    }
}

/**
 * GET /api/documents/new - Nouveaux documents
 */
async function getNewDocuments(req, res) {
    try {
        const userId = req.session?.userId;

        if (!userId) {
            return res.status(401).json({
                success: false,
                message: 'Non authentifié'
            });
        }

        const documents = await getAccessibleDocuments(userId);
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        const newDocs = documents.filter(doc =>
            new Date(doc.createdAt) > sevenDaysAgo
        );

        res.json({
            success: true,
            documents: newDocs,
            total: newDocs.length
        });

    } catch (error) {
        console.error('❌ Erreur getNewDocuments:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Erreur serveur'
        });
    }
}

module.exports = {
    getAccessibleDocuments: getAccessibleDocuments_Controller,
    getDocument,
    createDocument,
    deleteDocument,
    shareDocument,
    unshareDocument,
    getSharedUsers,
    toggleLock,
    recordDownload,
    downloadAsJson,
    restoreDocument,
    permanentDelete,
    deleteAll,
    bulkImport,
    getMyDocuments,
    getRecentDocuments,
    getFavorites,
    getNewDocuments
};
