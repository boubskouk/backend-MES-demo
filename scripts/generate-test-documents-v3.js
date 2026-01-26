/**
 * Script pour générer 400 documents de test LÉGERS avec catégories existantes
 * Taille réduite pour import rapide
 *
 * Usage: node scripts/generate-test-documents-v3.js
 */

const { connectDB, getCollections, closeDB } = require('../config/database');
const fs = require('fs');
const path = require('path');

// Configuration
const NB_DOCUMENTS = 400;
const OUTPUT_FILE = path.join(__dirname, '..', 'test-import-400-docs-v3.json');

// Types de fichiers
const fileTypes = [
    { ext: 'pdf', mime: 'application/pdf' },
    { ext: 'docx', mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' },
    { ext: 'xlsx', mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' },
    { ext: 'txt', mime: 'text/plain' }
];

// Titres de documents
const titresBase = [
    'Rapport annuel', 'Compte rendu', 'Note de frais', 'Facture',
    'Contrat', 'Procès-verbal', 'Plan formation', 'Budget',
    'Analyse risques', 'Cahier charges', 'Manuel', 'Guide',
    'Bilan', 'Inventaire', 'Planning', 'Fiche poste'
];

/**
 * Générer un contenu de taille ~30 KB
 */
function generateContent(type, docNumber) {
    // Taille fixe de 30 KB
    const sizeKB = 30;
    const targetBytes = sizeKB * 1024;

    let text = `=== DOCUMENT DE TEST #${docNumber} ===
Type: ${type}
Date: ${new Date().toISOString()}
Catégorie: Test Performance

CONTENU DU DOCUMENT
-------------------
`;

    const lorem = 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. ';

    while (text.length < targetBytes) {
        text += lorem;
    }

    text = text.substring(0, targetBytes);
    const buffer = Buffer.from(text);

    return {
        content: `data:text/plain;base64,${buffer.toString('base64')}`,
        realSize: buffer.length
    };
}

function randomDate() {
    const now = new Date();
    const oneYearAgo = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
    const randomTime = oneYearAgo.getTime() + Math.random() * (now.getTime() - oneYearAgo.getTime());
    return new Date(randomTime).toISOString().split('T')[0];
}

async function main() {
    console.log('\n' + '='.repeat(60));
    console.log('🚀 GÉNÉRATION DE 400 DOCUMENTS LÉGERS (V3)');
    console.log('='.repeat(60) + '\n');

    try {
        console.log('📡 Connexion à MongoDB...');
        await connectDB();
        const collections = getCollections();

        // Récupérer les catégories
        const categories = await collections.categories.find({}).toArray();
        console.log(`✅ ${categories.length} catégorie(s): ${categories.map(c => c.nom).join(', ')}`);

        if (categories.length === 0) {
            console.log('❌ Aucune catégorie ! Créez-en d\'abord.');
            process.exit(1);
        }

        // Générer les documents
        console.log(`\n📝 Génération de ${NB_DOCUMENTS} documents légers...`);
        const documents = [];
        let totalSize = 0;

        for (let i = 1; i <= NB_DOCUMENTS; i++) {
            const fileType = fileTypes[Math.floor(Math.random() * fileTypes.length)];
            const category = categories[Math.floor(Math.random() * categories.length)];
            const titreBase = titresBase[Math.floor(Math.random() * titresBase.length)];

            const { content, realSize } = generateContent(fileType.ext, i);
            totalSize += realSize;

            documents.push({
                titre: `${titreBase} V3-${i}`,
                categorie: category.nom,
                date: randomDate(),
                description: `Document test V3 #${i}`,
                tags: [`v3`, `test`, `batch-${Math.ceil(i / 100)}`],
                nomFichier: `doc_v3_${i}.${fileType.ext}`,
                taille: realSize,
                type: fileType.mime,
                contenu: content
            });

            if (i % 100 === 0) {
                console.log(`   ⏳ ${i}/${NB_DOCUMENTS}...`);
            }
        }

        // Sauvegarder
        const output = {
            version: '3.0',
            exportDate: new Date().toISOString(),
            description: `${NB_DOCUMENTS} documents légers pour test performance`,
            documents
        };

        fs.writeFileSync(OUTPUT_FILE, JSON.stringify(output));

        const fileSizeMB = (fs.statSync(OUTPUT_FILE).size / (1024 * 1024)).toFixed(2);

        console.log('\n' + '='.repeat(60));
        console.log('✅ GÉNÉRATION TERMINÉE');
        console.log('='.repeat(60));
        console.log(`📄 Documents: ${NB_DOCUMENTS}`);
        console.log(`📦 Taille moyenne: ${(totalSize / NB_DOCUMENTS / 1024).toFixed(1)} KB`);
        console.log(`💾 Fichier: ${fileSizeMB} MB`);
        console.log(`📂 Catégories: ${categories.map(c => c.nom).join(', ')}`);
        console.log('\n📥 Redémarrez le serveur puis importez !');

    } catch (error) {
        console.error('❌ Erreur:', error);
    } finally {
        try { await closeDB(); } catch (e) {}
    }
}

main();
