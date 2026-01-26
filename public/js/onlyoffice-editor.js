// ============================================
// ONLYOFFICE DOCUMENT EDITOR - ARCHIVAGE C.E.R.E.R
// ============================================

// Configuration OnlyOffice
const OnlyOfficeConfig = {
    // URL du Document Server OnlyOffice
    // DÉSACTIVÉ PAR DÉFAUT : Le serveur de démo OnlyOffice n'est plus accessible
    // Pour activer: Installez votre propre serveur OnlyOffice et décommentez la ligne ci-dessous
    // documentServerUrl: 'http://localhost', // ou votre URL OnlyOffice
    documentServerUrl: null, // Désactivé
    enabled: false, // OnlyOffice désactivé par défaut

    // Types de documents supportés
    supportedFormats: {
        word: ['docx', 'doc', 'odt', 'rtf', 'txt'],
        cell: ['xlsx', 'xls', 'ods', 'csv'],
        slide: ['pptx', 'ppt', 'odp']
    }
};

// État de l'éditeur OnlyOffice
const onlyOfficeState = {
    editor: null,
    isOpen: false,
    currentDoc: null
};

// Déterminer le type de document OnlyOffice
function getOnlyOfficeDocType(fileName) {
    const ext = fileName.toLowerCase().split('.').pop();

    if (OnlyOfficeConfig.supportedFormats.word.includes(ext)) {
        return 'word';
    }
    if (OnlyOfficeConfig.supportedFormats.cell.includes(ext)) {
        return 'cell';
    }
    if (OnlyOfficeConfig.supportedFormats.slide.includes(ext)) {
        return 'slide';
    }

    return null;
}

// Ouvrir l'éditeur OnlyOffice
async function openOnlyOfficeEditor(doc) {
    // Vérifier si OnlyOffice est activé
    if (!OnlyOfficeConfig.enabled || !OnlyOfficeConfig.documentServerUrl) {
        Logger.info('OnlyOffice désactivé - Utilisation des alternatives');

        // Basculer vers une alternative selon le type de fichier
        const ext = doc.nomFichier.toLowerCase().split('.').pop();
        if (ext === 'xlsx' || ext === 'xls') {
            // Pour Excel, utiliser l'éditeur local
            if (typeof openLocalEditor === 'function') {
                openLocalEditor(doc);
            } else {
                showNotification('OnlyOffice désactivé. Veuillez télécharger le fichier.', 'warning');
                if (typeof downloadDoc === 'function') downloadDoc(doc);
            }
        } else {
            // Pour Word/PowerPoint, proposer les alternatives
            showNotification('OnlyOffice désactivé. Utilisation du visualiseur Microsoft Office...', 'info');
            if (typeof openOffice365Editor === 'function') {
                openOffice365Editor(doc);
            } else {
                if (typeof downloadDoc === 'function') downloadDoc(doc);
            }
        }
        return;
    }

    try {
        const docType = getOnlyOfficeDocType(doc.nomFichier);

        if (!docType) {
            showNotification('Format de fichier non supporté par OnlyOffice', 'error');
            return;
        }

        // Créer le conteneur de l'éditeur
        const modal = document.createElement('div');
        modal.id = 'onlyoffice-modal';
        modal.className = 'fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75';

        modal.innerHTML = `
            <div class="bg-white rounded-lg w-11/12 h-5/6 flex flex-col">
                <div class="flex items-center justify-between p-4 border-b bg-gradient-to-r from-blue-500 to-blue-600">
                    <div class="flex-1 min-w-0">
                        <h2 class="text-xl font-bold text-white truncate">
                            ${docType === 'word' ? '📝' : docType === 'cell' ? '📊' : '📽️'}
                            OnlyOffice - ${doc.titre}
                        </h2>
                        <p class="text-sm text-blue-100 truncate">${doc.nomFichier}</p>
                    </div>
                    <div class="flex items-center gap-2 ml-4">
                        <button
                            id="onlyoffice-save-btn"
                            class="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 transition"
                            disabled
                        >
                            💾 Auto-sauvegarde
                        </button>
                        <button
                            id="onlyoffice-close-btn"
                            class="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 transition"
                        >
                            ✕ Fermer
                        </button>
                    </div>
                </div>

                <div class="p-3 bg-green-50 border-b">
                    <div class="flex items-center gap-2 text-sm">
                        <div class="flex items-center gap-1">
                            <span class="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                            <span class="text-green-800 font-medium">Chargement OnlyOffice...</span>
                        </div>
                    </div>
                </div>

                <div id="onlyoffice-editor-container" class="flex-1 bg-gray-100">
                    <div class="flex items-center justify-center h-full">
                        <div class="text-center">
                            <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
                            <p class="text-gray-600">Connexion au serveur OnlyOffice...</p>
                        </div>
                    </div>
                </div>

                <div class="p-2 border-t bg-gray-50 text-center text-xs text-gray-500">
                    Propulsé par OnlyOffice Document Server
                </div>
            </div>
        `;

        document.body.appendChild(modal);
        onlyOfficeState.isOpen = true;
        onlyOfficeState.currentDoc = doc;

        // Bouton de fermeture
        document.getElementById('onlyoffice-close-btn').addEventListener('click', () => {
            closeOnlyOfficeEditor();
        });

        // Info auto-sauvegarde
        document.getElementById('onlyoffice-save-btn').addEventListener('click', () => {
            showNotification('💡 OnlyOffice sauvegarde automatiquement vos modifications', 'info');
        });

        // Initialiser l'éditeur OnlyOffice
        await initOnlyOfficeEditor(doc, docType);

    } catch (error) {
        console.error('Erreur ouverture OnlyOffice:', error);

        // Si OnlyOffice échoue, proposer des alternatives
        const ext = doc.nomFichier.toLowerCase().split('.').pop();

        // Fermer le modal OnlyOffice
        closeOnlyOfficeEditor();

        // Proposer une alternative selon le type de fichier
        if (ext === 'xlsx' || ext === 'xls') {
            showNotification('OnlyOffice non disponible. Utilisation de l\'éditeur Excel intégré...', 'info');
            // Ouvrir avec l'éditeur Excel intégré si disponible
            if (typeof openExcelEditor === 'function') {
                openExcelEditor(doc);
            } else {
                showNotification('Aucun éditeur disponible. Veuillez télécharger le fichier.', 'error');
                downloadDoc(doc);
            }
        } else {
            showNotification('OnlyOffice non disponible. Téléchargement du fichier...', 'warning');
            downloadDoc(doc);
        }
    }
}

// Initialiser l'éditeur OnlyOffice
async function initOnlyOfficeEditor(doc, docType) {
    // Vérifier que l'API OnlyOffice est chargée
    if (typeof DocsAPI === 'undefined') {
        showNotification('⚠️ OnlyOffice API non chargée. Chargement...', 'warning');

        // Charger l'API OnlyOffice dynamiquement
        await loadOnlyOfficeAPI();
    }

    // Configuration de l'éditeur
    const config = {
        documentType: docType, // 'word', 'cell', ou 'slide'

        document: {
            fileType: doc.nomFichier.split('.').pop(),
            key: `${doc._id}_${Date.now()}`, // Clé unique pour chaque session
            title: doc.nomFichier,
            url: `${window.location.origin}/api/office-file/${state.currentUser}/${doc._id}`,

            permissions: {
                comment: true,
                download: true,
                edit: true,
                print: true,
                review: true
            },

            info: {
                author: doc.idUtilisateur || 'Utilisateur',
                created: doc.dateArchivage || new Date().toISOString(),
                folder: doc.departementArchivage || 'Documents'
            }
        },

        editorConfig: {
            mode: 'edit', // Mode édition
            lang: 'fr', // Langue française

            user: {
                id: state.currentUser,
                name: state.currentUser
            },

            customization: {
                autosave: true,
                chat: false,
                comments: true,
                compactHeader: false,
                compactToolbar: false,
                help: false,
                hideRightMenu: false,
                logo: {
                    image: '',
                    imageEmbedded: '',
                    url: window.location.origin
                },
                reviewDisplay: 'markup',
                showReviewChanges: true,
                toolbarNoTabs: false,
                zoom: 100
            },

            // Callback pour sauvegarder le document
            callbackUrl: `${window.location.origin}/api/onlyoffice/callback/${doc._id}`
        },

        events: {
            onDocumentReady: () => {
                Logger.info('✅ OnlyOffice: Document prêt');
                showNotification('✅ Document chargé et prêt à éditer', 'success');
            },

            onDocumentStateChange: (event) => {
                Logger.debug('📝 OnlyOffice: État du document changé', event);
            },

            onError: (event) => {
                Logger.error('❌ OnlyOffice: Erreur', event);
                showNotification(`Erreur OnlyOffice: ${event.data}`, 'error');
            },

            onWarning: (event) => {
                Logger.warn('⚠️ OnlyOffice: Avertissement', event);
            }
        },

        width: '100%',
        height: '100%'
    };

    // Créer l'éditeur OnlyOffice
    const container = document.getElementById('onlyoffice-editor-container');

    try {
        onlyOfficeState.editor = new DocsAPI.DocEditor('onlyoffice-editor-container', config);
        Logger.info('✅ Éditeur OnlyOffice initialisé');
    } catch (error) {
        Logger.error('❌ Erreur initialisation OnlyOffice:', error);

        // Fallback: afficher un message d'erreur avec solution
        container.innerHTML = `
            <div class="flex items-center justify-center h-full p-8">
                <div class="max-w-md text-center">
                    <div class="text-6xl mb-4">⚠️</div>
                    <h3 class="text-xl font-bold text-gray-800 mb-2">
                        OnlyOffice Document Server non disponible
                    </h3>
                    <p class="text-gray-600 mb-4">
                        Le serveur OnlyOffice n'est pas accessible. Cela peut être dû à:
                    </p>
                    <ul class="text-left text-sm text-gray-700 space-y-2 mb-6">
                        <li>• Serveur OnlyOffice non installé</li>
                        <li>• Problème de connexion réseau</li>
                        <li>• Configuration incorrecte</li>
                    </ul>
                    <div class="bg-blue-50 border border-blue-200 rounded p-4 text-sm text-left">
                        <p class="font-semibold text-blue-800 mb-2">💡 Solutions alternatives:</p>
                        <p class="text-blue-700">
                            1. Utilisez l'éditeur Excel intégré pour les fichiers .xlsx<br>
                            2. Téléchargez le fichier pour l'éditer localement<br>
                            3. Installez OnlyOffice Document Server pour l'édition en ligne
                        </p>
                    </div>
                    <button
                        onclick="closeOnlyOfficeEditor(); downloadDoc(onlyOfficeState.currentDoc)"
                        class="mt-4 px-6 py-3 bg-blue-500 text-white rounded hover:bg-blue-600"
                    >
                        📥 Télécharger le document
                    </button>
                </div>
            </div>
        `;
    }
}

// Charger l'API OnlyOffice dynamiquement
function loadOnlyOfficeAPI() {
    return new Promise((resolve, reject) => {
        // Vérifier si OnlyOffice est activé
        if (!OnlyOfficeConfig.enabled || !OnlyOfficeConfig.documentServerUrl) {
            reject(new Error('OnlyOffice désactivé'));
            return;
        }

        // Vérifier si déjà chargé
        if (typeof DocsAPI !== 'undefined') {
            resolve();
            return;
        }

        const script = document.createElement('script');
        script.src = `${OnlyOfficeConfig.documentServerUrl}/web-apps/apps/api/documents/api.js`;
        script.async = true;

        // Timeout de 10 secondes
        const timeout = setTimeout(() => {
            script.onerror = null;
            script.onload = null;
            if (script.parentNode) {
                document.head.removeChild(script);
            }
            reject(new Error('Serveur OnlyOffice non disponible (timeout)'));
        }, 10000);

        script.onload = () => {
            clearTimeout(timeout);
            // Vérifier que DocsAPI est bien défini
            if (typeof DocsAPI !== 'undefined') {
                Logger.info('✅ OnlyOffice API chargée');
                resolve();
            } else {
                reject(new Error('OnlyOffice API non initialisée'));
            }
        };

        script.onerror = () => {
            clearTimeout(timeout);
            reject(new Error('Serveur OnlyOffice non accessible'));
        };

        document.head.appendChild(script);
    });
}

// Fermer l'éditeur OnlyOffice
function closeOnlyOfficeEditor() {
    const modal = document.getElementById('onlyoffice-modal');

    if (modal) {
        // Détruire l'éditeur OnlyOffice
        if (onlyOfficeState.editor && typeof onlyOfficeState.editor.destroyEditor === 'function') {
            onlyOfficeState.editor.destroyEditor();
        }

        modal.remove();
        onlyOfficeState.isOpen = false;
        onlyOfficeState.editor = null;
        onlyOfficeState.currentDoc = null;

        // Recharger les données pour voir les changements
        if (typeof loadData === 'function') {
            loadData();
        }
    }
}

// Vérifier si OnlyOffice est disponible
async function isOnlyOfficeAvailable() {
    try {
        await loadOnlyOfficeAPI();
        return true;
    } catch (error) {
        return false;
    }
}

Logger.info('✅ Module OnlyOffice chargé');
