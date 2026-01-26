// ============================================
// SYSTÈME D'ÉDITION DE DOCUMENTS - ARCHIVAGE C.E.R.E.R
// ============================================

// État de l'éditeur
const editorState = {
    isOpen: false,
    currentDoc: null,
    docType: null,
    excelData: null,
    changes: {}
};

// Déterminer si un document est éditable
function isEditable(doc) {
    if (!doc.type && !doc.nomFichier) return false;

    const ext = doc.nomFichier ? doc.nomFichier.toLowerCase().split('.').pop() : '';
    const type = doc.type || '';

    // Excel moderne → Éditeur intégré
    if (type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' || ext === 'xlsx') {
        return 'excel';
    }

    // Excel ancien → OnlyOffice (ExcelJS ne supporte pas .xls)
    if (type === 'application/vnd.ms-excel' || ext === 'xls') {
        return 'excel-old';
    }

    // CSV → Éditeur intégré
    if (type === 'text/csv' || ext === 'csv') {
        return 'csv';
    }

    // Word (moderne et ancien) → OnlyOffice
    if (type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || ext === 'docx' ||
        type === 'application/msword' || ext === 'doc') {
        return 'word';
    }

    // PowerPoint (moderne et ancien) → OnlyOffice
    if (type === 'application/vnd.openxmlformats-officedocument.presentationml.presentation' || ext === 'pptx' ||
        type === 'application/vnd.ms-powerpoint' || ext === 'ppt') {
        return 'powerpoint';
    }

    return false;
}

// Ouvrir l'éditeur
async function openEditor(doc) {
    const editableType = isEditable(doc);

    if (!editableType) {
        showNotification('Ce type de fichier ne peut pas être édité', 'error');
        return;
    }

    editorState.isOpen = true;
    editorState.currentDoc = doc;
    editorState.docType = editableType;
    editorState.changes = {};

    if (editableType === 'excel') {
        // Excel moderne (.xlsx) → Éditeur intégré
        await openExcelEditor(doc);
    } else if (editableType === 'csv') {
        // CSV → Éditeur CSV intégré
        await openCSVEditor(doc);
    } else if (editableType === 'excel-old' || editableType === 'word' || editableType === 'powerpoint') {
        // Excel ancien (.xls), Word, PowerPoint → OnlyOffice
        await openWordEditor(doc);
    }
}

// ============================================
// ÉDITEUR EXCEL
// ============================================

async function openExcelEditor(doc) {
    try {
        // Vérifier que le document est valide
        if (!doc || !doc._id) {
            Logger.error('Document invalide passé à openExcelEditor:', doc);
            showNotification('Erreur: Document invalide', 'error');
            return;
        }

        // S'assurer que editorState.currentDoc est défini
        if (!editorState.currentDoc) {
            editorState.currentDoc = doc;
            editorState.docType = 'excel';
            editorState.changes = {};
        }

        // Récupérer les données du fichier Excel
        const response = await apiCall(`/office/read-excel/${doc._id}`);

        if (!response.success) {
            showNotification('Erreur lors de la lecture du fichier', 'error');
            return;
        }

        editorState.excelData = response.data;

        // Créer le modal d'édition
        const modal = document.createElement('div');
        modal.id = 'editor-modal';
        modal.className = 'fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75';

        modal.innerHTML = `
            <div class="bg-white rounded-lg w-11/12 h-5/6 flex flex-col">
                <!-- Header -->
                <div class="flex items-center justify-between p-4 border-b bg-blue-50">
                    <div class="flex-1 min-w-0">
                        <h2 class="text-xl font-bold truncate">📝 Édition: ${doc.titre}</h2>
                        <p class="text-sm text-gray-600 truncate">${doc.nomFichier} • ${response.rows} lignes</p>
                    </div>
                    <div class="flex items-center gap-2 ml-4">
                        <button
                            id="save-excel-btn"
                            class="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 flex items-center gap-2"
                        >
                            <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                            </svg>
                            Enregistrer
                        </button>
                        <button
                            id="close-editor-btn"
                            class="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
                        >
                            ✕ Fermer
                        </button>
                    </div>
                </div>

                <!-- Instructions -->
                <div class="p-3 bg-yellow-50 border-b text-sm">
                    <p class="text-yellow-800">
                        💡 <strong>Instructions:</strong> Cliquez sur une cellule pour la modifier. Les cellules modifiées sont surlignées en jaune.
                    </p>
                </div>

                <!-- Contenu éditeur -->
                <div id="excel-editor-content" class="flex-1 overflow-auto p-4 bg-gray-50">
                    <div class="bg-white shadow-lg rounded">
                        ${renderExcelTable(response.data)}
                    </div>
                </div>

                <!-- Footer avec compteur -->
                <div class="p-3 border-t bg-gray-50 flex items-center justify-between">
                    <span id="changes-counter" class="text-sm text-gray-600">
                        Aucune modification
                    </span>
                    <span class="text-xs text-gray-500">
                        Cliquez sur "Enregistrer" pour appliquer les modifications
                    </span>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // Activer l'édition des cellules
        initExcelCellEditing();

        // Gérer l'enregistrement
        document.getElementById('save-excel-btn').addEventListener('click', saveExcelChanges);

        // Gérer la fermeture
        document.getElementById('close-editor-btn').addEventListener('click', closeEditor);

        // Fermer avec Échap
        document.addEventListener('keydown', handleEditorEscape);

    } catch (error) {
        Logger.error('Erreur ouverture éditeur Excel:', error);
        showNotification('Erreur lors de l\'ouverture de l\'éditeur', 'error');
    }
}

// Rendre le tableau Excel
function renderExcelTable(data) {
    if (!data || data.length === 0) {
        return '<p class="p-4 text-gray-500">Aucune donnée</p>';
    }

    let html = '<table class="excel-table min-w-full border-collapse">';

    data.forEach((row, rowIndex) => {
        html += '<tr>';
        row.forEach((cell, colIndex) => {
            const cellRef = columnToLetter(colIndex) + (rowIndex + 1);
            const cellValue = cell !== null && cell !== undefined ? String(cell) : '';
            const isFirstRow = rowIndex === 0;

            html += `
                <td
                    data-cell="${cellRef}"
                    data-row="${rowIndex}"
                    data-col="${colIndex}"
                    class="excel-cell border border-gray-300 px-3 py-2 min-w-[100px] ${isFirstRow ? 'bg-blue-50 font-semibold' : 'bg-white'}"
                    contenteditable="true"
                    title="Cellule ${cellRef}"
                >${cellValue}</td>
            `;
        });
        html += '</tr>';
    });

    html += '</table>';
    return html;
}

// Convertir numéro de colonne en lettre (0 -> A, 1 -> B, etc.)
function columnToLetter(col) {
    let letter = '';
    while (col >= 0) {
        letter = String.fromCharCode((col % 26) + 65) + letter;
        col = Math.floor(col / 26) - 1;
    }
    return letter;
}

// Initialiser l'édition des cellules
function initExcelCellEditing() {
    const cells = document.querySelectorAll('.excel-cell');

    cells.forEach(cell => {
        // Sauvegarder la valeur initiale
        cell.dataset.originalValue = cell.textContent;

        // Détecter les modifications
        cell.addEventListener('input', function() {
            const cellRef = this.dataset.cell;
            const newValue = this.textContent;
            const originalValue = this.dataset.originalValue;

            if (newValue !== originalValue) {
                // Marquer comme modifié
                this.classList.add('bg-yellow-100');

                // Enregistrer la modification
                editorState.changes[cellRef] = newValue;
            } else {
                // Retirer le marquage
                this.classList.remove('bg-yellow-100');
                delete editorState.changes[cellRef];
            }

            updateChangesCounter();
        });

        // Sélectionner tout le texte au focus
        cell.addEventListener('focus', function() {
            const range = document.createRange();
            range.selectNodeContents(this);
            const selection = window.getSelection();
            selection.removeAllRanges();
            selection.addRange(range);
        });
    });
}

// Mettre à jour le compteur de modifications
function updateChangesCounter() {
    const counter = document.getElementById('changes-counter');
    const count = Object.keys(editorState.changes).length;

    if (count === 0) {
        counter.textContent = 'Aucune modification';
        counter.className = 'text-sm text-gray-600';
    } else {
        counter.textContent = `${count} cellule${count > 1 ? 's' : ''} modifiée${count > 1 ? 's' : ''}`;
        counter.className = 'text-sm text-yellow-600 font-semibold';
    }
}

// Enregistrer les modifications Excel
async function saveExcelChanges() {
    // Vérifier que le document est bien chargé
    if (!editorState.currentDoc || !editorState.currentDoc._id) {
        Logger.error('Erreur: Document non chargé dans editorState');
        showNotification('Erreur: Document non trouvé. Veuillez réouvrir l\'éditeur.', 'error');
        return;
    }

    const changeCount = Object.keys(editorState.changes).length;

    if (changeCount === 0) {
        showNotification('Aucune modification à enregistrer', 'warning');
        return;
    }

    try {
        // Désactiver le bouton
        const saveBtn = document.getElementById('save-excel-btn');
        if (saveBtn) {
            saveBtn.disabled = true;
            saveBtn.innerHTML = '<span>⏳ Enregistrement...</span>';
        }

        // Envoyer les modifications
        const response = await apiCall(`/office/edit-excel/${editorState.currentDoc._id}`, 'POST', {
            cellUpdates: editorState.changes
        });

        if (response.success) {
            showNotification(`✅ ${changeCount} cellule${changeCount > 1 ? 's' : ''} mise${changeCount > 1 ? 's' : ''} à jour!`);

            // Réinitialiser l'état
            editorState.changes = {};

            // Retirer les marquages jaunes
            document.querySelectorAll('.excel-cell').forEach(cell => {
                cell.classList.remove('bg-yellow-100');
                cell.dataset.originalValue = cell.textContent;
            });

            updateChangesCounter();

            // Recharger les données après une courte pause
            setTimeout(() => {
                closeEditor();
                loadData(); // Recharger la liste des documents
            }, 1500);
        } else {
            showNotification('Erreur lors de l\'enregistrement', 'error');
            saveBtn.disabled = false;
            saveBtn.innerHTML = `
                <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                </svg>
                Enregistrer
            `;
        }

    } catch (error) {
        Logger.error('Erreur enregistrement:', error);
        showNotification('Erreur lors de l\'enregistrement', 'error');
    }
}

// ============================================
// ÉDITEUR WORD ET OFFICE (Office Online)
// ============================================

// Détecter si l'application est en ligne ou en local
function isOnlineDeployment() {
    const hostname = window.location.hostname;
    // En local: localhost, 127.0.0.1, ou IP locale
    return hostname !== 'localhost' &&
           hostname !== '127.0.0.1' &&
           !hostname.startsWith('192.168.') &&
           !hostname.startsWith('10.') &&
           !hostname.startsWith('172.');
}

async function openWordEditor(doc) {
    // NOUVELLE APPROCHE: Utiliser OnlyOffice pour Word et PowerPoint
    // OnlyOffice fonctionne sans WOPI (contrairement à Office Online)

    // Vérifier si OnlyOffice est disponible
    if (typeof openOnlyOfficeEditor === 'function') {
        // Utiliser OnlyOffice pour l'édition
        await openOnlyOfficeEditor(doc);
    } else {
        // Fallback: Guide de téléchargement si OnlyOffice n'est pas chargé
        Logger.warn('⚠️ OnlyOffice non disponible, affichage du guide de téléchargement');
        await openLocalWordEditor(doc);
    }
}

// Éditeur Office Online (pour déploiement en ligne)
async function openOfficeOnlineEditor(doc) {
    const modal = document.createElement('div');
    modal.id = 'editor-modal';
    modal.className = 'fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75';

    // Construire l'URL publique du fichier
    const baseUrl = window.location.origin;
    const fileUrl = `${baseUrl}/api/office-file/${state.currentUser}/${doc._id}`;

    // Encoder l'URL pour Office Online
    const encodedUrl = encodeURIComponent(fileUrl);

    // URL Office Online pour édition
    const officeOnlineUrl = `https://view.officeapps.live.com/op/edit.aspx?src=${encodedUrl}`;

    modal.innerHTML = `
        <div class="bg-white rounded-lg w-11/12 h-5/6 flex flex-col">
            <div class="flex items-center justify-between p-4 border-b bg-blue-50">
                <div class="flex-1 min-w-0">
                    <h2 class="text-xl font-bold truncate">📝 Édition Office Online: ${doc.titre}</h2>
                    <p class="text-sm text-gray-600 truncate">${doc.nomFichier}</p>
                </div>
                <div class="flex items-center gap-2 ml-4">
                    <button
                        id="save-office-btn"
                        class="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
                        title="Les modifications sont automatiquement sauvegardées par Office Online"
                    >
                        ℹ️ Auto-sauvegarde
                    </button>
                    <button
                        id="close-editor-btn"
                        class="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
                    >
                        ✕ Fermer
                    </button>
                </div>
            </div>

            <div class="p-3 bg-green-50 border-b text-sm">
                <p class="text-green-800">
                    ✅ <strong>Office Online activé!</strong> Éditez votre document directement dans le navigateur.
                    Les modifications sont automatiquement sauvegardées.
                </p>
            </div>

            <div class="flex-1 overflow-hidden">
                <iframe
                    id="office-iframe"
                    src="${officeOnlineUrl}"
                    width="100%"
                    height="100%"
                    frameborder="0"
                    style="border: none;"
                ></iframe>
            </div>

            <div class="p-3 border-t bg-gray-50 text-center text-xs text-gray-600">
                Propulsé par Microsoft Office Online
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    // Info auto-sauvegarde
    document.getElementById('save-office-btn').addEventListener('click', () => {
        showNotification('💡 Office Online sauvegarde automatiquement vos modifications', 'info');
    });

    document.getElementById('close-editor-btn').addEventListener('click', async () => {
        const confirmed = await customConfirm({
            title: 'Fermer l\'éditeur',
            message: 'Fermer l\'éditeur Office Online?\n\nLes modifications sont automatiquement sauvegardées.',
            confirmText: 'Oui, fermer',
            cancelText: 'Continuer l\'édition',
            type: 'info',
            icon: '📝'
        });

        if (confirmed) {
            closeEditor();
            loadData(); // Recharger pour voir les changements
        }
    });

    document.addEventListener('keydown', handleEditorEscape);
}

// Éditeur local (localhost - guide de téléchargement)
async function openLocalWordEditor(doc) {
    const modal = document.createElement('div');
    modal.id = 'editor-modal';
    modal.className = 'fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75';

    modal.innerHTML = `
        <div class="bg-white rounded-lg w-11/12 max-w-2xl flex flex-col">
            <div class="flex items-center justify-between p-4 border-b bg-blue-50">
                <div class="flex-1 min-w-0">
                    <h2 class="text-xl font-bold truncate">📝 Édition Word: ${doc.titre}</h2>
                    <p class="text-sm text-gray-600 truncate">${doc.nomFichier}</p>
                </div>
                <button
                    id="close-editor-btn"
                    class="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
                >
                    ✕ Fermer
                </button>
            </div>

            <div class="p-6">
                <div class="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                    <p class="text-yellow-800 text-sm mb-2">
                        ℹ️ <strong>Mode Local - Édition hors ligne</strong>
                    </p>
                    <p class="text-yellow-700 text-sm">
                        Pour éditer ce document en local, suivez ces étapes:
                    </p>
                </div>

                <div class="space-y-3">
                    <button
                        onclick="downloadDoc(editorState.currentDoc)"
                        class="w-full px-4 py-3 bg-blue-500 text-white rounded hover:bg-blue-600 flex items-center justify-center gap-2"
                    >
                        <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                        1. Télécharger le document
                    </button>

                    <div class="text-center text-gray-600 text-sm">
                        ↓
                    </div>

                    <div class="px-4 py-3 bg-gray-100 rounded text-center">
                        <p class="text-gray-700 text-sm">
                            2. Éditer avec Microsoft Word ou LibreOffice
                        </p>
                    </div>

                    <div class="text-center text-gray-600 text-sm">
                        ↓
                    </div>

                    <div class="px-4 py-3 bg-gray-100 rounded text-center">
                        <p class="text-gray-700 text-sm">
                            3. Re-téléverser le document modifié dans l'application
                        </p>
                    </div>
                </div>

                <div class="mt-6 p-4 bg-blue-50 border border-blue-200 rounded">
                    <p class="text-blue-800 text-sm mb-2">
                        🚀 <strong>Bonne nouvelle!</strong>
                    </p>
                    <p class="text-blue-700 text-sm">
                        Une fois que vous déployerez cette application en ligne (sur un serveur web),
                        vous pourrez éditer vos documents Word et Excel directement dans le navigateur
                        grâce à <strong>Microsoft Office Online</strong>!
                    </p>
                </div>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    document.getElementById('close-editor-btn').addEventListener('click', closeEditor);
    document.addEventListener('keydown', handleEditorEscape);
}

// Gérer la touche Échap
async function handleEditorEscape(e) {
    if (e.key === 'Escape' && editorState.isOpen) {
        const changeCount = Object.keys(editorState.changes).length;

        if (changeCount > 0) {
            const confirmed = await customConfirm({
                title: 'Fermer sans enregistrer ?',
                message: `Vous avez ${changeCount} modification${changeCount > 1 ? 's' : ''} non enregistrée${changeCount > 1 ? 's' : ''}.\n\nVoulez-vous vraiment fermer sans enregistrer?`,
                confirmText: 'Oui, fermer',
                cancelText: 'Continuer l\'édition',
                type: 'warning',
                icon: '⚠️'
            });

            if (confirmed) {
                closeEditor();
            }
        } else {
            closeEditor();
        }
    }
}

// Fermer l'éditeur
function closeEditor() {
    const modal = document.getElementById('editor-modal');
    if (modal) {
        modal.remove();
    }

    editorState.isOpen = false;
    editorState.currentDoc = null;
    editorState.docType = null;
    editorState.excelData = null;
    editorState.changes = {};

    document.removeEventListener('keydown', handleEditorEscape);
}

// Style pour le tableau Excel
const style = document.createElement('style');
style.textContent = `
    .excel-table {
        font-size: 0.875rem;
    }

    .excel-cell {
        transition: background-color 0.2s;
    }

    .excel-cell:focus {
        outline: 2px solid #3b82f6;
        outline-offset: -2px;
        background-color: #eff6ff;
    }

    .excel-cell:hover {
        background-color: #f3f4f6;
    }
`;
document.head.appendChild(style);

// ============================================
// ÉDITEUR CSV
// ============================================

async function openCSVEditor(doc) {
    try {
        // Vérifier que le document est valide
        if (!doc || !doc._id) {
            Logger.error('Document invalide passé à openCSVEditor:', doc);
            showNotification('Erreur: Document invalide', 'error');
            return;
        }

        // Récupérer le contenu CSV
        const response = await getDocument(state.currentUser, doc._id);
        const fullDoc = response.document || response; // Compatibilité avec les deux formats

        // Extraire le contenu CSV depuis le data URL
        let csvContent;
        if (fullDoc.contenu.startsWith('data:')) {
            const base64Data = fullDoc.contenu.split(',')[1];
            csvContent = atob(base64Data);
        } else {
            csvContent = fullDoc.contenu;
        }

        // Parser le CSV
        const rows = parseCSV(csvContent);

        // Créer le modal
        const modal = document.createElement('div');
        modal.id = 'csv-editor-modal';
        modal.className = 'fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75';

        modal.innerHTML = `
            <div class="bg-white rounded-lg w-11/12 h-5/6 flex flex-col">
                <!-- Header -->
                <div class="flex items-center justify-between p-4 border-b bg-gradient-to-r from-green-500 to-teal-600">
                    <div class="flex-1 min-w-0">
                        <h2 class="text-xl font-bold text-white truncate">📊 Éditeur CSV - ${fullDoc.titre}</h2>
                        <p class="text-sm text-green-100 truncate">${fullDoc.nomFichier}</p>
                    </div>
                    <div class="flex items-center gap-2 ml-4">
                        <button id="csv-add-row-btn" class="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition flex items-center gap-2">
                            <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
                            </svg>
                            Ajouter ligne
                        </button>
                        <button id="csv-save-btn" class="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 transition flex items-center gap-2">
                            <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                            </svg>
                            Enregistrer
                        </button>
                        <button id="csv-close-btn" class="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 transition">
                            ✕ Fermer
                        </button>
                    </div>
                </div>

                <!-- Content -->
                <div class="flex-1 overflow-auto p-4 bg-gray-50">
                    <div id="csv-grid" class="bg-white rounded-lg shadow-md overflow-x-auto"></div>
                </div>

                <!-- Footer -->
                <div class="p-3 border-t bg-gray-100">
                    <div class="flex items-center justify-between text-sm text-gray-600">
                        <span>💡 Double-cliquez sur une cellule pour éditer • Cliquez sur 🗑️ pour supprimer une ligne</span>
                        <span id="csv-row-count">${rows.length} lignes</span>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // Rendre la grille CSV
        renderCSVGrid(rows);

        // Bouton ajouter ligne
        document.getElementById('csv-add-row-btn').addEventListener('click', () => {
            const grid = getCurrentCSVGrid();
            const newRow = new Array(grid[0]?.length || 3).fill('');
            grid.push(newRow);
            renderCSVGrid(grid);
            document.getElementById('csv-row-count').textContent = `${grid.length} lignes`;
        });

        // Bouton enregistrer
        document.getElementById('csv-save-btn').addEventListener('click', async () => {
            await saveCSVDocument(fullDoc._id);
        });

        // Bouton fermer
        document.getElementById('csv-close-btn').addEventListener('click', () => {
            modal.remove();
            editorState.isOpen = false;
        });

        // Fermer en cliquant à l'extérieur
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
                editorState.isOpen = false;
            }
        });

    } catch (error) {
        Logger.error('Erreur ouverture éditeur CSV:', error);
        showNotification('Erreur lors de l\'ouverture de l\'éditeur CSV', 'error');
    }
}

// Parser un contenu CSV
function parseCSV(csvText) {
    const lines = csvText.split('\n');
    const rows = [];

    for (const line of lines) {
        if (!line.trim()) continue;

        // Simple parser CSV (gère les virgules et guillemets basiques)
        const row = [];
        let cell = '';
        let inQuotes = false;

        for (let i = 0; i < line.length; i++) {
            const char = line[i];

            if (char === '"') {
                inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
                row.push(cell.trim());
                cell = '';
            } else {
                cell += char;
            }
        }
        row.push(cell.trim());
        rows.push(row);
    }

    return rows;
}

// Rendre la grille CSV
function renderCSVGrid(rows) {
    const gridContainer = document.getElementById('csv-grid');
    if (!gridContainer) return;

    let html = '<table class="w-full border-collapse">';

    // En-tête
    if (rows.length > 0) {
        html += '<thead><tr class="bg-green-500 text-white">';
        rows[0].forEach((cell, colIndex) => {
            html += `<th class="border border-gray-300 px-4 py-2 text-left font-semibold">
                <input type="text"
                       value="${escapeHtml(cell)}"
                       class="csv-header-cell w-full bg-transparent text-white font-semibold"
                       data-row="0"
                       data-col="${colIndex}">
            </th>`;
        });
        html += '</tr></thead>';
    }

    // Corps
    html += '<tbody>';
    for (let rowIndex = 1; rowIndex < rows.length; rowIndex++) {
        html += `<tr class="hover:bg-gray-50">`;
        rows[rowIndex].forEach((cell, colIndex) => {
            html += `<td class="border border-gray-300 px-2 py-1">
                <input type="text"
                       value="${escapeHtml(cell)}"
                       class="csv-cell w-full px-2 py-1"
                       data-row="${rowIndex}"
                       data-col="${colIndex}">
            </td>`;
        });
        html += `<td class="border border-gray-300 px-2 py-1 text-center">
            <button onclick="deleteCSVRow(${rowIndex})"
                    class="text-red-500 hover:text-red-700 transition"
                    title="Supprimer cette ligne">
                🗑️
            </button>
        </td>`;
        html += '</tr>';
    }
    html += '</tbody></table>';

    gridContainer.innerHTML = html;

    // Ajouter les écouteurs d'événements
    document.querySelectorAll('.csv-cell, .csv-header-cell').forEach(input => {
        input.addEventListener('change', () => {
            updateCSVCell(input);
        });
    });
}

// Récupérer la grille CSV actuelle
function getCurrentCSVGrid() {
    const rows = [];
    const inputs = document.querySelectorAll('.csv-cell, .csv-header-cell');

    inputs.forEach(input => {
        const row = parseInt(input.dataset.row);
        const col = parseInt(input.dataset.col);

        if (!rows[row]) rows[row] = [];
        rows[row][col] = input.value;
    });

    return rows;
}

// Mettre à jour une cellule CSV
function updateCSVCell(input) {
    // La valeur est déjà dans l'input, rien de plus à faire
    Logger.debug(`Cellule mise à jour: [${input.dataset.row}, ${input.dataset.col}] = "${input.value}"`);
}

// Supprimer une ligne CSV
function deleteCSVRow(rowIndex) {
    const grid = getCurrentCSVGrid();
    grid.splice(rowIndex, 1);
    renderCSVGrid(grid);
    document.getElementById('csv-row-count').textContent = `${grid.length} lignes`;
}

// Exposer la fonction globalement
window.deleteCSVRow = deleteCSVRow;

// Sauvegarder le document CSV
async function saveCSVDocument(docId) {
    try {
        const grid = getCurrentCSVGrid();

        // Convertir la grille en CSV
        const csvContent = grid.map(row => {
            return row.map(cell => {
                // Échapper les cellules contenant des virgules ou des guillemets
                if (cell.includes(',') || cell.includes('"') || cell.includes('\n')) {
                    return `"${cell.replace(/"/g, '""')}"`;
                }
                return cell;
            }).join(',');
        }).join('\n');

        // Convertir en data URL
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const reader = new FileReader();

        reader.onload = async (e) => {
            const dataUrl = e.target.result;

            // Enregistrer via l'API
            const saveBtn = document.getElementById('csv-save-btn');
            saveBtn.disabled = true;
            saveBtn.textContent = '⏳ Enregistrement...';

            try {
                await apiCall(`/documents/${docId}`, 'PUT', {
                    contenu: dataUrl,
                    taille: blob.size
                });

                showNotification('✅ Document CSV enregistré avec succès');
                await loadData();

                saveBtn.textContent = '✅ Enregistré';
                setTimeout(() => {
                    saveBtn.disabled = false;
                    saveBtn.innerHTML = `
                        <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                        </svg>
                        Enregistrer
                    `;
                }, 1000);

            } catch (error) {
                Logger.error('Erreur sauvegarde CSV:', error);
                showNotification('Erreur lors de l\'enregistrement', 'error');
                saveBtn.disabled = false;
                saveBtn.innerHTML = `
                    <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                    </svg>
                    Enregistrer
                `;
            }
        };

        reader.readAsDataURL(blob);

    } catch (error) {
        Logger.error('Erreur lors de la sauvegarde:', error);
        showNotification('Erreur lors de l\'enregistrement', 'error');
    }
}

// Fonction utilitaire pour échapper le HTML
function escapeHtml(text) {
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return String(text).replace(/[&<>"']/g, m => map[m]);
}
