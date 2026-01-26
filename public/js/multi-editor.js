// ============================================
// GESTIONNAIRE MULTI-ÉDITEURS - ARCHIVAGE C.E.R.E.R
// ============================================

// Configuration des éditeurs disponibles
const EditorConfig = {
    onlyoffice: {
        name: 'OnlyOffice',
        icon: '📝',
        description: 'Éditeur collaboratif complet (nécessite serveur)',
        supports: ['docx', 'doc', 'xlsx', 'xls', 'pptx', 'ppt', 'odt', 'ods', 'odp'],
        color: 'blue',
        available: false, // Désactivé par défaut (serveur démo non accessible)
        priority: 1
    },
    office365: {
        name: 'Microsoft Office Online',
        icon: '🌐',
        description: 'Visualiseur Office officiel Microsoft',
        supports: ['docx', 'doc', 'xlsx', 'xls', 'pptx', 'ppt'],
        color: 'indigo',
        available: true,
        priority: 2
    },
    google: {
        name: 'Google Docs Viewer',
        icon: '📄',
        description: 'Visualiseur Google (nécessite authentification)',
        supports: ['docx', 'doc', 'xlsx', 'xls', 'pptx', 'ppt', 'pdf'],
        color: 'green',
        available: false, // Désactivé car nécessite OAuth2
        priority: 3
    },
    local: {
        name: 'Éditeur Local',
        icon: '⚡',
        description: 'Éditeur intégré rapide (Excel uniquement)',
        supports: ['xlsx', 'xls'],
        color: 'purple',
        available: true,
        priority: 4
    },
    zoho: {
        name: 'Zoho Office',
        icon: '🔷',
        description: 'Suite bureautique Zoho',
        supports: ['docx', 'doc', 'xlsx', 'xls', 'pptx', 'ppt'],
        color: 'red',
        available: true,
        priority: 5
    }
};

// État du gestionnaire multi-éditeurs
const multiEditorState = {
    currentEditor: null,
    currentDoc: null,
    availableEditors: []
};

// Vérifier la disponibilité d'OnlyOffice
async function checkOnlyOfficeAvailability() {
    // OnlyOffice désactivé par défaut car le serveur de démo n'est plus accessible
    // Pour activer OnlyOffice, configurez votre propre serveur et changez available: true

    if (typeof DocsAPI !== 'undefined') {
        EditorConfig.onlyoffice.available = true;
        return true;
    }

    // Ne pas essayer de charger depuis le serveur de démo (génère des erreurs)
    EditorConfig.onlyoffice.available = false;
    return false;
}

// Obtenir les éditeurs compatibles pour un fichier
function getCompatibleEditors(fileName) {
    const ext = fileName.toLowerCase().split('.').pop();

    const compatible = Object.entries(EditorConfig)
        .filter(([key, config]) => {
            return config.available && config.supports.includes(ext);
        })
        .sort((a, b) => a[1].priority - b[1].priority)
        .map(([key, config]) => ({
            id: key,
            ...config
        }));

    return compatible;
}

// Afficher le menu de sélection d'éditeur
async function showEditorSelector(doc) {
    // Vérifier OnlyOffice au préalable
    await checkOnlyOfficeAvailability();

    const compatibleEditors = getCompatibleEditors(doc.nomFichier);

    if (compatibleEditors.length === 0) {
        showNotification('Aucun éditeur disponible pour ce type de fichier', 'error');
        return;
    }

    // Si un seul éditeur disponible, l'ouvrir directement
    if (compatibleEditors.length === 1) {
        openWithEditor(doc, compatibleEditors[0].id);
        return;
    }

    // Créer le modal de sélection
    const modal = document.createElement('div');
    modal.id = 'editor-selector-modal';
    modal.className = 'fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75';

    modal.innerHTML = `
        <div class="bg-white rounded-lg max-w-2xl w-full mx-4 max-h-[90vh] overflow-auto">
            <!-- Header -->
            <div class="bg-gradient-to-r from-blue-500 to-purple-600 p-6 text-white">
                <h2 class="text-2xl font-bold mb-2">Choisir un éditeur</h2>
                <p class="text-blue-100 text-sm">${doc.nomFichier}</p>
            </div>

            <!-- Éditeurs disponibles -->
            <div class="p-6">
                <p class="text-gray-600 mb-4">
                    Plusieurs éditeurs sont disponibles pour ce fichier. Choisissez celui qui vous convient :
                </p>

                <div class="space-y-3">
                    ${compatibleEditors.map(editor => `
                        <button
                            class="editor-option w-full text-left p-4 border-2 rounded-lg hover:border-${editor.color}-500 hover:bg-${editor.color}-50 transition-all group"
                            data-editor="${editor.id}"
                        >
                            <div class="flex items-center gap-4">
                                <div class="text-4xl">${editor.icon}</div>
                                <div class="flex-1">
                                    <div class="flex items-center gap-2 mb-1">
                                        <h3 class="text-lg font-bold text-gray-800">${editor.name}</h3>
                                        ${editor.id === 'onlyoffice' && editor.available ?
                                            '<span class="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded">✓ Disponible</span>' :
                                            editor.id === 'onlyoffice' ?
                                            '<span class="px-2 py-0.5 bg-red-100 text-red-700 text-xs rounded">✗ Non disponible</span>' :
                                            ''
                                        }
                                        ${editor.priority === 1 ?
                                            '<span class="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded">Recommandé</span>' :
                                            ''
                                        }
                                    </div>
                                    <p class="text-sm text-gray-600">${editor.description}</p>
                                </div>
                                <div class="text-${editor.color}-500 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                                    </svg>
                                </div>
                            </div>
                        </button>
                    `).join('')}
                </div>

                <!-- Info supplémentaire -->
                <div class="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <div class="flex items-start gap-3">
                        <div class="text-2xl">💡</div>
                        <div class="flex-1 text-sm">
                            <p class="font-semibold text-blue-900 mb-1">Conseils de choix :</p>
                            <ul class="text-blue-800 space-y-1">
                                <li><strong>OnlyOffice</strong> : Meilleur pour l'édition complète (si disponible)</li>
                                <li><strong>Office Online</strong> : Fidélité Microsoft, visualisation excellente</li>
                                <li><strong>Éditeur Local</strong> : Le plus rapide pour Excel</li>
                                <li><strong>Google Viewer</strong> : Fiable mais lecture seule</li>
                            </ul>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Footer -->
            <div class="bg-gray-50 px-6 py-4 border-t flex items-center justify-between">
                <button
                    id="preview-instead-btn"
                    class="px-4 py-2 text-gray-600 hover:text-gray-800 transition"
                >
                    👁️ Juste prévisualiser
                </button>
                <button
                    id="close-selector-btn"
                    class="px-6 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 transition"
                >
                    Annuler
                </button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    // Gérer la sélection d'éditeur
    modal.querySelectorAll('.editor-option').forEach(btn => {
        btn.addEventListener('click', () => {
            const editorId = btn.dataset.editor;
            modal.remove();
            openWithEditor(doc, editorId);
        });
    });

    // Bouton prévisualiser
    modal.querySelector('#preview-instead-btn').addEventListener('click', () => {
        modal.remove();
        if (typeof openPreview === 'function') {
            openPreview(doc);
        }
    });

    // Bouton annuler
    modal.querySelector('#close-selector-btn').addEventListener('click', () => {
        modal.remove();
    });

    // Fermer en cliquant à l'extérieur
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.remove();
        }
    });
}

// Ouvrir avec l'éditeur choisi
async function openWithEditor(doc, editorId) {
    multiEditorState.currentEditor = editorId;
    multiEditorState.currentDoc = doc;

    Logger.info(`📝 Ouverture avec ${EditorConfig[editorId].name}`);

    try {
        switch (editorId) {
            case 'onlyoffice':
                await openOnlyOfficeEditor(doc);
                break;

            case 'office365':
                openOffice365Editor(doc);
                break;

            case 'google':
                openGoogleEditor(doc);
                break;

            case 'local':
                openLocalEditor(doc);
                break;

            case 'zoho':
                openZohoEditor(doc);
                break;

            default:
                showNotification('Éditeur non implémenté', 'error');
        }
    } catch (error) {
        Logger.error(`Erreur avec ${editorId}:`, error);
        showNotification(`Erreur lors de l'ouverture avec ${EditorConfig[editorId].name}`, 'error');
    }
}

// ============================================
// ÉDITEUR MICROSOFT OFFICE 365
// ============================================
function openOffice365Editor(doc) {
    const modal = createEditorModal('office365', doc);

    const fileUrl = `${window.location.origin}/api/office-file/${state.currentUser}/${doc._id}`;
    const encodedUrl = encodeURIComponent(fileUrl);

    // Microsoft Office Online Viewer
    const viewerUrl = `https://view.officeapps.live.com/op/embed.aspx?src=${encodedUrl}`;

    // Déterminer le type de fichier
    const ext = doc.nomFichier.toLowerCase().split('.').pop();
    const isWord = ext === 'docx' || ext === 'doc';
    const isPowerPoint = ext === 'pptx' || ext === 'ppt';

    const container = modal.querySelector('.editor-container');

    // Pour Word et PowerPoint, afficher une interface de téléchargement/upload
    if (isWord || isPowerPoint) {
        const docType = isWord ? 'Word' : 'PowerPoint';
        const icon = isWord ? '📝' : '📽️';

        // Stocker le document dans multiEditorState pour les callbacks
        multiEditorState.currentDoc = doc;

        container.innerHTML = `
            <div class="h-full flex flex-col">
                <div class="bg-blue-50 border-b p-3">
                    <div class="flex items-center gap-2 text-sm">
                        <span class="text-blue-800 font-medium">${icon} Document ${docType}</span>
                        <span class="text-gray-400">•</span>
                        <span class="text-gray-600">Édition via Microsoft ${docType}</span>
                    </div>
                </div>

                <div class="flex-1 overflow-auto p-6">
                    <!-- Aperçu via Office Online -->
                    <div class="mb-6">
                        <h3 class="text-lg font-bold text-gray-800 mb-3">👁️ Aperçu du document</h3>
                        <div class="border-2 border-gray-200 rounded-lg overflow-hidden" style="height: 400px;">
                            <iframe
                                src="${viewerUrl}"
                                class="w-full h-full border-0"
                                frameborder="0"
                            ></iframe>
                        </div>
                    </div>

                    <!-- Section d'édition -->
                    <div class="bg-gradient-to-br from-blue-50 to-indigo-50 p-6 rounded-xl border-2 border-blue-200">
                        <h3 class="text-lg font-bold text-gray-800 mb-3">✏️ Modifier ce document</h3>
                        <p class="text-gray-700 mb-4">
                            Pour modifier ce document ${docType}, téléchargez-le, modifiez-le avec Microsoft ${docType},
                            puis rechargez la version modifiée.
                        </p>

                        <div class="grid md:grid-cols-2 gap-4 mb-4">
                            <div class="bg-white p-4 rounded-lg border-2 border-blue-300">
                                <div class="text-3xl mb-2">⬇️</div>
                                <h4 class="font-bold text-gray-800 mb-2">1. Télécharger</h4>
                                <p class="text-sm text-gray-600 mb-3">Téléchargez le document sur votre ordinateur</p>
                                <button
                                    id="download-word-btn-${doc._id}"
                                    class="w-full px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition font-medium">
                                    📥 Télécharger ${doc.nomFichier}
                                </button>
                            </div>

                            <div class="bg-white p-4 rounded-lg border-2 border-green-300">
                                <div class="text-3xl mb-2">⬆️</div>
                                <h4 class="font-bold text-gray-800 mb-2">2. Recharger la version modifiée</h4>
                                <p class="text-sm text-gray-600 mb-3">Après modification, rechargez le document</p>
                                <input
                                    type="file"
                                    id="word-upload-input-${doc._id}"
                                    accept=".${ext}"
                                    class="hidden"
                                    onchange="handleWordDocumentUpload(event, '${doc._id}')"
                                />
                                <button
                                    onclick="document.getElementById('word-upload-input-${doc._id}').click()"
                                    class="w-full px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition font-medium">
                                    📤 Recharger le document modifié
                                </button>
                            </div>
                        </div>

                        <div class="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded">
                            <div class="flex items-start gap-3">
                                <span class="text-2xl">💡</span>
                                <div class="text-sm">
                                    <p class="font-semibold text-yellow-800 mb-1">Conseil :</p>
                                    <p class="text-yellow-700">
                                        Ouvrez le document téléchargé avec Microsoft ${docType}, faites vos modifications,
                                        enregistrez-le, puis rechargez-le ici pour mettre à jour l'archive.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="bg-gray-100 border-t p-3 text-center text-xs text-gray-600">
                    💡 Aperçu via Microsoft Office Online • Édition via Microsoft ${docType}
                </div>
            </div>
        `;

        // Ajouter l'écouteur d'événements pour le bouton de téléchargement
        setTimeout(() => {
            const downloadBtn = document.getElementById(`download-word-btn-${doc._id}`);
            if (downloadBtn) {
                downloadBtn.addEventListener('click', () => {
                    if (multiEditorState.currentDoc) {
                        downloadDoc(multiEditorState.currentDoc);
                    }
                });
            }
        }, 0);
    } else {
        // Pour les autres types (si jamais), afficher juste le visualiseur
        container.innerHTML = `
            <div class="h-full flex flex-col">
                <div class="bg-blue-50 border-b p-3">
                    <div class="flex items-center gap-2 text-sm">
                        <span class="text-blue-800 font-medium">🌐 Microsoft Office Online</span>
                        <span class="text-gray-400">•</span>
                        <span class="text-gray-600">Visualisation fidèle au format Office</span>
                    </div>
                </div>
                <iframe
                    src="${viewerUrl}"
                    class="flex-1 w-full border-0"
                    frameborder="0"
                ></iframe>
                <div class="bg-gray-100 border-t p-2 text-center text-xs text-gray-600">
                    💡 Visualisation via Microsoft Office Online
                </div>
            </div>
        `;
    }
}

// ============================================
// ÉDITEUR GOOGLE DOCS/SHEETS/SLIDES
// ============================================
function openGoogleEditor(doc) {
    const modal = createEditorModal('google', doc);

    const container = modal.querySelector('.editor-container');
    container.innerHTML = `
        <div class="h-full flex flex-col items-center justify-center bg-gradient-to-br from-red-50 to-orange-50 p-8">
            <div class="max-w-md text-center">
                <div class="text-6xl mb-4">🔒</div>
                <h3 class="text-xl font-bold text-gray-800 mb-2">
                    Google Docs Viewer non disponible
                </h3>
                <p class="text-gray-600 mb-4">
                    Google nécessite maintenant une authentification OAuth2 pour utiliser leur visualiseur.
                </p>
                <div class="bg-blue-50 border border-blue-200 rounded p-4 text-sm text-left mb-6">
                    <p class="font-semibold text-blue-800 mb-2">💡 Alternatives disponibles :</p>
                    <ul class="text-blue-700 space-y-1">
                        <li>• <strong>Microsoft Office Online</strong> : Visualisation fidèle</li>
                        <li>• <strong>Zoho Office</strong> : Visualisation fiable</li>
                        <li>• <strong>Éditeur Local</strong> : Édition Excel rapide</li>
                    </ul>
                </div>
                <button
                    onclick="document.getElementById('google-editor-modal').remove(); showEditorSelector(multiEditorState.currentDoc)"
                    class="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition"
                >
                    🔄 Choisir un autre éditeur
                </button>
            </div>
        </div>
    `;
}

// ============================================
// ÉDITEUR LOCAL (Excel)
// ============================================
function openLocalEditor(doc) {
    const ext = doc.nomFichier.toLowerCase().split('.').pop();

    if (ext === 'xlsx' || ext === 'xls') {
        // Initialiser l'état de l'éditeur (requis pour openExcelEditor)
        if (typeof editorState !== 'undefined') {
            editorState.isOpen = true;
            editorState.currentDoc = doc;
            editorState.docType = 'excel';
            editorState.changes = {};
        }

        // Utiliser l'éditeur Excel existant
        if (typeof openExcelEditor === 'function') {
            openExcelEditor(doc);
        } else {
            showNotification('Éditeur Excel local non disponible', 'error');
        }
    } else {
        showNotification('Éditeur local disponible uniquement pour Excel', 'error');
    }
}

// ============================================
// ÉDITEUR ZOHO OFFICE
// ============================================
function openZohoEditor(doc) {
    const modal = createEditorModal('zoho', doc);

    const fileUrl = `${window.location.origin}/api/office-file/${state.currentUser}/${doc._id}`;
    const encodedUrl = encodeURIComponent(fileUrl);

    // Zoho Office Viewer
    const viewerUrl = `https://viewer.zoho.com/api/urlview.do?url=${encodedUrl}&embed=true`;

    const container = modal.querySelector('.editor-container');
    container.innerHTML = `
        <div class="h-full flex flex-col">
            <div class="bg-red-50 border-b p-3">
                <div class="flex items-center gap-2 text-sm">
                    <span class="text-red-800 font-medium">🔷 Zoho Office Viewer</span>
                    <span class="text-gray-400">•</span>
                    <span class="text-gray-600">Visualisation en ligne</span>
                </div>
            </div>
            <iframe
                src="${viewerUrl}"
                class="flex-1 w-full border-0"
                frameborder="0"
            ></iframe>
            <div class="bg-gray-100 border-t p-2 text-center text-xs text-gray-600">
                💡 Visualisation via Zoho Office
            </div>
        </div>
    `;
}

// ============================================
// UTILITAIRES
// ============================================

// Créer un modal d'éditeur générique
function createEditorModal(editorId, doc) {
    const config = EditorConfig[editorId];

    const modal = document.createElement('div');
    modal.id = `${editorId}-editor-modal`;
    modal.className = 'fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75';

    modal.innerHTML = `
        <div class="bg-white rounded-lg w-11/12 h-5/6 flex flex-col">
            <div class="flex items-center justify-between p-4 border-b bg-gradient-to-r from-${config.color}-500 to-${config.color}-600">
                <div class="flex-1 min-w-0">
                    <h2 class="text-xl font-bold text-white truncate">
                        ${config.icon} ${config.name}
                    </h2>
                    <p class="text-sm text-${config.color}-100 truncate">${doc.titre}</p>
                </div>
                <div class="flex items-center gap-2 ml-4">
                    <button
                        class="download-btn px-4 py-2 bg-white text-${config.color}-600 rounded hover:bg-gray-100 transition"
                    >
                        📥 Télécharger
                    </button>
                    <button
                        class="change-editor-btn px-4 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600 transition"
                    >
                        🔄 Changer d'éditeur
                    </button>
                    <button
                        class="close-btn px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 transition"
                    >
                        ✕ Fermer
                    </button>
                </div>
            </div>

            <div class="editor-container flex-1 overflow-hidden bg-gray-100"></div>
        </div>
    `;

    document.body.appendChild(modal);

    // Bouton télécharger
    modal.querySelector('.download-btn').addEventListener('click', () => {
        if (typeof downloadDoc === 'function') {
            downloadDoc(doc);
        }
    });

    // Bouton changer d'éditeur
    modal.querySelector('.change-editor-btn').addEventListener('click', () => {
        modal.remove();
        showEditorSelector(doc);
    });

    // Bouton fermer
    modal.querySelector('.close-btn').addEventListener('click', () => {
        modal.remove();
    });

    // Fermer en cliquant à l'extérieur
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.remove();
        }
    });

    return modal;
}

// Fonction pour remplacer openEditor par défaut
function openEditor(doc) {
    // Ouverture DIRECTE sans menu pour une meilleure expérience utilisateur
    const ext = doc.nomFichier.toLowerCase().split('.').pop();

    // Pour Excel : Ouvrir directement l'éditeur local (le plus rapide et performant)
    if (ext === 'xlsx' || ext === 'xls') {
        Logger.debug('📊 Ouverture directe éditeur Excel local');
        openLocalEditor(doc);
        return;
    }

    // Pour Word : Ouvrir directement le visualiseur Microsoft Office
    if (ext === 'docx' || ext === 'doc') {
        Logger.debug('📝 Ouverture directe visualiseur Word (Office Online)');
        openOffice365Editor(doc);
        return;
    }

    // Pour PowerPoint : Ouvrir directement le visualiseur Microsoft Office
    if (ext === 'pptx' || ext === 'ppt') {
        Logger.debug('📽️ Ouverture directe visualiseur PowerPoint (Office Online)');
        openOffice365Editor(doc);
        return;
    }

    // Pour les autres formats : Afficher le menu de sélection
    Logger.debug('❓ Format non reconnu, affichage du menu');
    showEditorSelector(doc);
}

// Fonction alternative pour afficher le menu de sélection (si besoin)
function openEditorWithMenu(doc) {
    showEditorSelector(doc);
}

// Gérer le rechargement d'un document Word/PowerPoint modifié
async function handleWordDocumentUpload(event, docId) {
    const file = event.target.files[0];
    if (!file) return;

    try {
        // Vérifier la taille du fichier (max 50 Mo)
        if (file.size > 50 * 1024 * 1024) {
            showNotification('❌ Le fichier est trop volumineux (max 50 Mo)', 'error');
            return;
        }

        // Afficher une notification de chargement
        showNotification('📤 Rechargement du document en cours...', 'info');

        // Convertir le fichier en base64
        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const contenu = e.target.result;

                // Mettre à jour le document via l'API
                const response = await apiCall(`/documents/${state.currentUser}/${docId}`, 'PUT', {
                    contenu: contenu,
                    taille: file.size
                });

                showNotification('✅ Document mis à jour avec succès !', 'success');

                // Recharger les données et fermer le modal
                await loadData();

                // Fermer le modal
                const modal = document.getElementById('office365-editor-modal');
                if (modal) modal.remove();

                // Réafficher le document mis à jour
                const updatedDoc = state.documents.find(d => d._id === docId);
                if (updatedDoc) {
                    setTimeout(() => {
                        openOffice365Editor(updatedDoc);
                    }, 500);
                }

            } catch (error) {
                Logger.error('Erreur lors de la mise à jour:', error);
                showNotification('❌ Erreur lors de la mise à jour du document', 'error');
            }
        };

        reader.onerror = () => {
            showNotification('❌ Erreur lors de la lecture du fichier', 'error');
        };

        reader.readAsDataURL(file);

    } catch (error) {
        Logger.error('Erreur:', error);
        showNotification('❌ Erreur lors du rechargement du document', 'error');
    }
}

// Exposer la fonction globalement
window.handleWordDocumentUpload = handleWordDocumentUpload;

Logger.info('✅ Gestionnaire multi-éditeurs chargé');
Logger.debug('📝 Éditeurs disponibles:', Object.keys(EditorConfig).join(', '));
