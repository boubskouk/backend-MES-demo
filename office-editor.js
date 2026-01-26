/**
 * Module d'édition de fichiers Office avec Node.js pur
 * Utilise des bibliothèques JavaScript natives (sans LibreOffice)
 */

const PizZip = require('pizzip');
const Docxtemplater = require('docxtemplater');
const ExcelJS = require('exceljs');
const fs = require('fs');
const path = require('path');

class OfficeEditor {
    /**
     * Éditer un document Word (.docx)
     * Remplace des variables template par des valeurs
     *
     * @param {string} inputPath - Chemin du fichier template
     * @param {string} outputPath - Chemin du fichier de sortie
     * @param {object} replacements - Object avec les remplacements {variable: valeur}
     * @returns {Promise<string>} - Chemin du fichier créé
     */
    static async editWord(inputPath, outputPath, replacements) {
        try {
            console.log(`📝 Édition Word: ${inputPath}`);

            // Lire le fichier template
            const content = fs.readFileSync(inputPath, 'binary');

            // Charger le document avec PizZip
            const zip = new PizZip(content);

            // Créer le templater
            const doc = new Docxtemplater(zip, {
                paragraphLoop: true,
                linebreaks: true,
            });

            // Remplacer les variables
            doc.setData(replacements);

            try {
                // Générer le document
                doc.render();
            } catch (error) {
                console.error('❌ Erreur lors du rendu:', error);
                throw error;
            }

            // Générer le buffer
            const buf = doc.getZip().generate({
                type: 'nodebuffer',
                compression: 'DEFLATE',
            });

            // Sauvegarder
            fs.writeFileSync(outputPath, buf);

            console.log(`✅ Document Word créé: ${outputPath}`);
            return outputPath;

        } catch (error) {
            console.error('❌ Erreur édition Word:', error.message);
            throw error;
        }
    }

    /**
     * Éditer un tableur Excel (.xlsx)
     * Modifie des cellules spécifiques
     *
     * @param {string} inputPath - Chemin du fichier Excel
     * @param {string} outputPath - Chemin du fichier de sortie
     * @param {object} cellUpdates - Object avec les mises à jour {cellule: valeur}
     * @returns {Promise<string>} - Chemin du fichier créé
     */
    static async editExcel(inputPath, outputPath, cellUpdates) {
        try {
            console.log(`📊 Édition Excel: ${inputPath}`);

            const workbook = new ExcelJS.Workbook();

            // Lire le fichier existant
            await workbook.xlsx.readFile(inputPath);

            // Obtenir la première feuille
            const worksheet = workbook.worksheets[0];

            // Appliquer les modifications
            for (const [cell, value] of Object.entries(cellUpdates)) {
                const cellObj = worksheet.getCell(cell);

                // Déterminer le type de valeur
                if (typeof value === 'number') {
                    cellObj.value = value;
                } else if (typeof value === 'string' && value.startsWith('=')) {
                    // C'est une formule
                    cellObj.value = { formula: value };
                } else {
                    cellObj.value = value;
                }

                console.log(`   ✓ Cellule ${cell} = ${value}`);
            }

            // Sauvegarder
            await workbook.xlsx.writeFile(outputPath);

            console.log(`✅ Tableur Excel créé: ${outputPath}`);
            return outputPath;

        } catch (error) {
            console.error('❌ Erreur édition Excel:', error.message);
            throw error;
        }
    }

    /**
     * Créer un nouveau document Word
     *
     * @param {string} outputPath - Chemin du fichier de sortie
     * @param {object} data - Données du document {title, content, ...}
     * @returns {Promise<string>} - Chemin du fichier créé
     */
    static async createWord(outputPath, data) {
        try {
            console.log(`📝 Création Word: ${outputPath}`);

            // Créer un document simple avec template minimal
            const templatePath = path.join(__dirname, 'templates', 'word-template.docx');

            if (fs.existsSync(templatePath)) {
                return await this.editWord(templatePath, outputPath, data);
            } else {
                console.warn('⚠️ Template Word non trouvé. Création d\'un fichier basique.');
                // Créer un document basique
                // Note: Pour créer un .docx from scratch, on aurait besoin d'une lib comme docx
                throw new Error('Template Word requis pour créer un nouveau document');
            }

        } catch (error) {
            console.error('❌ Erreur création Word:', error.message);
            throw error;
        }
    }

    /**
     * Créer un nouveau tableur Excel
     *
     * @param {string} outputPath - Chemin du fichier de sortie
     * @param {Array<Array>} data - Données en format tableau 2D
     * @param {object} options - Options {sheetName, headers}
     * @returns {Promise<string>} - Chemin du fichier créé
     */
    static async createExcel(outputPath, data, options = {}) {
        try {
            console.log(`📊 Création Excel: ${outputPath}`);

            const workbook = new ExcelJS.Workbook();
            const worksheet = workbook.addWorksheet(options.sheetName || 'Feuille 1');

            // Ajouter les données
            if (Array.isArray(data) && data.length > 0) {
                // Si des en-têtes sont fournis
                if (options.headers && Array.isArray(options.headers)) {
                    worksheet.addRow(options.headers);

                    // Mettre en gras les en-têtes
                    worksheet.getRow(1).font = { bold: true };
                }

                // Ajouter les données
                data.forEach(row => {
                    worksheet.addRow(row);
                });

                // Auto-ajuster les colonnes
                worksheet.columns.forEach(column => {
                    let maxLength = 10;
                    column.eachCell({ includeEmpty: true }, cell => {
                        const length = cell.value ? cell.value.toString().length : 0;
                        if (length > maxLength) {
                            maxLength = length;
                        }
                    });
                    column.width = maxLength < 10 ? 10 : maxLength + 2;
                });
            }

            // Sauvegarder
            await workbook.xlsx.writeFile(outputPath);

            console.log(`✅ Tableur Excel créé: ${outputPath}`);
            return outputPath;

        } catch (error) {
            console.error('❌ Erreur création Excel:', error.message);
            throw error;
        }
    }

    /**
     * Lire le contenu d'un fichier Excel
     *
     * @param {string} inputPath - Chemin du fichier Excel
     * @param {number} sheetIndex - Index de la feuille (0 par défaut)
     * @returns {Promise<Array<Array>>} - Données en format tableau 2D
     */
    static async readExcel(inputPath, sheetIndex = 0) {
        try {
            console.log(`📖 Lecture Excel: ${inputPath}`);

            const workbook = new ExcelJS.Workbook();
            await workbook.xlsx.readFile(inputPath);

            const worksheet = workbook.worksheets[sheetIndex];
            const data = [];

            worksheet.eachRow((row, rowNumber) => {
                const rowData = [];
                row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
                    rowData.push(cell.value);
                });
                data.push(rowData);
            });

            console.log(`✅ ${data.length} lignes lues`);
            return data;

        } catch (error) {
            console.error('❌ Erreur lecture Excel:', error.message);
            throw error;
        }
    }

    /**
     * Ajouter des lignes à un fichier Excel existant
     *
     * @param {string} inputPath - Chemin du fichier Excel
     * @param {string} outputPath - Chemin du fichier de sortie
     * @param {Array<Array>} rows - Lignes à ajouter
     * @param {number} sheetIndex - Index de la feuille (0 par défaut)
     * @returns {Promise<string>} - Chemin du fichier créé
     */
    static async appendExcelRows(inputPath, outputPath, rows, sheetIndex = 0) {
        try {
            console.log(`➕ Ajout de lignes Excel: ${inputPath}`);

            const workbook = new ExcelJS.Workbook();
            await workbook.xlsx.readFile(inputPath);

            const worksheet = workbook.worksheets[sheetIndex];

            // Ajouter les nouvelles lignes
            rows.forEach(row => {
                worksheet.addRow(row);
            });

            // Sauvegarder
            await workbook.xlsx.writeFile(outputPath);

            console.log(`✅ ${rows.length} lignes ajoutées`);
            return outputPath;

        } catch (error) {
            console.error('❌ Erreur ajout lignes Excel:', error.message);
            throw error;
        }
    }

    /**
     * Obtenir les informations d'un fichier Office
     *
     * @param {string} filePath - Chemin du fichier
     * @returns {Promise<object>} - Informations du fichier
     */
    static async getFileInfo(filePath) {
        try {
            const stats = fs.statSync(filePath);
            const ext = path.extname(filePath).toLowerCase();

            const info = {
                name: path.basename(filePath),
                path: filePath,
                size: stats.size,
                sizeKB: (stats.size / 1024).toFixed(2),
                sizeMB: (stats.size / (1024 * 1024)).toFixed(2),
                extension: ext,
                created: stats.birthtime,
                modified: stats.mtime,
                type: this.getFileType(ext)
            };

            return info;

        } catch (error) {
            console.error('❌ Erreur lecture info fichier:', error.message);
            throw error;
        }
    }

    /**
     * Déterminer le type de fichier
     */
    static getFileType(extension) {
        const types = {
            '.docx': 'Word Document',
            '.doc': 'Word Document (Legacy)',
            '.xlsx': 'Excel Spreadsheet',
            '.xls': 'Excel Spreadsheet (Legacy)',
            '.pptx': 'PowerPoint Presentation',
            '.ppt': 'PowerPoint Presentation (Legacy)',
            '.pdf': 'PDF Document',
            '.txt': 'Text File',
            '.odt': 'OpenDocument Text',
            '.ods': 'OpenDocument Spreadsheet'
        };

        return types[extension.toLowerCase()] || 'Unknown';
    }
}

module.exports = OfficeEditor;

// Test si exécuté directement
if (require.main === module) {
    console.log('📝 Module Office Editor chargé avec succès !');
    console.log('\nFonctionnalités disponibles :');
    console.log('  - editWord() : Éditer un document Word');
    console.log('  - editExcel() : Éditer un tableur Excel');
    console.log('  - createExcel() : Créer un nouveau tableur');
    console.log('  - readExcel() : Lire un tableur');
    console.log('  - appendExcelRows() : Ajouter des lignes à un tableur');
    console.log('  - getFileInfo() : Obtenir les infos d\'un fichier\n');
}
