/**
 * Script pour générer 400 documents de test avec catégories existantes
 * Les documents seront visibles dans le dashboard beta
 *
 * Usage: node scripts/generate-test-documents-v2.js
 */

const { connectDB, getCollections, closeDB } = require('../config/database');
const fs = require('fs');
const path = require('path');

// Configuration
const NB_DOCUMENTS = 400;
const OUTPUT_FILE = path.join(__dirname, '..', 'test-import-400-docs-v2.json');

// Types de fichiers simulés avec contenus réalistes
const fileTypes = [
    { ext: 'pdf', mime: 'application/pdf' },
    { ext: 'docx', mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' },
    { ext: 'xlsx', mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' },
    { ext: 'txt', mime: 'text/plain' }
];

// Titres de documents variés
const titresBase = [
    'Rapport annuel',
    'Compte rendu réunion',
    'Note de frais',
    'Facture fournisseur',
    'Contrat de prestation',
    'Procès-verbal assemblée',
    'Plan de formation',
    'Budget prévisionnel',
    'Analyse des risques',
    'Cahier des charges',
    'Spécifications techniques',
    'Manuel utilisateur',
    'Guide de procédures',
    'Bilan financier',
    'Inventaire matériel',
    'Planning annuel',
    'Organigramme',
    'Fiche de poste',
    'Évaluation performance',
    'Audit interne'
];

/**
 * Générer un contenu de taille variable (plus réaliste)
 * @param {string} type - Extension du fichier
 * @param {number} sizeKB - Taille souhaitée en KB
 * @returns {Object} - { content: base64, realSize: bytes }
 */
function generateContent(type, sizeKB) {
    // Générer du texte pour atteindre la taille souhaitée
    const targetBytes = sizeKB * 1024;

    let text = `Document de test généré automatiquement.
Date: ${new Date().toISOString()}
Type: ${type}

Ce document est utilisé pour tester les performances du système d'archivage.
`;

    // Lorem ipsum pour remplir
    const lorem = `Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum. `;

    // Répéter le lorem ipsum jusqu'à atteindre la taille souhaitée
    while (text.length < targetBytes) {
        text += lorem;
    }

    // Tronquer à la taille exacte
    text = text.substring(0, targetBytes);

    const buffer = Buffer.from(text);
    const base64 = buffer.toString('base64');

    return {
        content: `data:text/plain;base64,${base64}`,
        realSize: buffer.length
    };
}

// Générer une date aléatoire dans les 2 dernières années
function randomDate() {
    const now = new Date();
    const twoYearsAgo = new Date(now.getFullYear() - 2, now.getMonth(), now.getDate());
    const randomTime = twoYearsAgo.getTime() + Math.random() * (now.getTime() - twoYearsAgo.getTime());
    return new Date(randomTime).toISOString().split('T')[0];
}

async function main() {
    console.log('\n' + '='.repeat(60));
    console.log('🚀 GÉNÉRATION DE 400 DOCUMENTS DE TEST (V2)');
    console.log('='.repeat(60) + '\n');

    try {
        // Connexion à la base de données
        console.log('📡 Connexion à MongoDB...');
        await connectDB();
        const collections = getCollections();

        // Récupérer les catégories existantes
        console.log('📂 Récupération des catégories existantes...');
        const categories = await collections.categories.find({}).toArray();

        if (categories.length === 0) {
            console.log('❌ Aucune catégorie trouvée ! Créez des catégories d\'abord.');
            process.exit(1);
        }

        console.log(`✅ ${categories.length} catégorie(s) trouvée(s):`);
        categories.forEach(cat => {
            console.log(`   - "${cat.nom}" (service: ${cat.idService || 'N/A'})`);
        });

        // Récupérer les services existants
        console.log('\n📂 Récupération des services existants...');
        const services = await collections.services.find({}).toArray();

        if (services.length === 0) {
            console.log('⚠️ Aucun service trouvé, les documents seront créés sans service.');
        } else {
            console.log(`✅ ${services.length} service(s) trouvé(s):`);
            services.forEach(svc => {
                console.log(`   - "${svc.nom}" (ID: ${svc._id})`);
            });
        }

        // Générer les documents
        console.log(`\n📝 Génération de ${NB_DOCUMENTS} documents...`);
        const documents = [];
        let totalSize = 0;

        for (let i = 1; i <= NB_DOCUMENTS; i++) {
            const fileType = fileTypes[Math.floor(Math.random() * fileTypes.length)];
            const category = categories[Math.floor(Math.random() * categories.length)];
            const titreBase = titresBase[Math.floor(Math.random() * titresBase.length)];

            // Taille variable : entre 5 KB et 100 KB
            const sizeKB = Math.floor(Math.random() * 95) + 5;
            const { content, realSize } = generateContent(fileType.ext, sizeKB);

            totalSize += realSize;

            const doc = {
                titre: `${titreBase} #${i}`,
                categorie: category.nom,
                date: randomDate(),
                description: `Document de test numéro ${i} - Catégorie: ${category.nom}`,
                tags: [`test-v2`, `batch-${Math.ceil(i / 100)}`, category.nom.toLowerCase().replace(/\s/g, '-')],
                nomFichier: `document_test_v2_${i}.${fileType.ext}`,
                taille: realSize, // ✅ TAILLE RÉELLE en octets
                type: fileType.mime,
                contenu: content
            };

            documents.push(doc);

            if (i % 50 === 0) {
                const avgSize = (totalSize / i / 1024).toFixed(1);
                console.log(`   ⏳ ${i}/${NB_DOCUMENTS} documents... (taille moyenne: ${avgSize} KB)`);
            }
        }

        // Créer le fichier JSON
        const output = {
            version: '2.4',
            exportDate: new Date().toISOString(),
            description: `${NB_DOCUMENTS} documents de test V2 avec catégories existantes`,
            categoriesUsed: categories.map(c => c.nom),
            documents: documents
        };

        console.log('\n💾 Écriture du fichier JSON...');
        fs.writeFileSync(OUTPUT_FILE, JSON.stringify(output, null, 2));

        const fileSizeMB = (fs.statSync(OUTPUT_FILE).size / (1024 * 1024)).toFixed(2);
        const avgDocSize = (totalSize / NB_DOCUMENTS / 1024).toFixed(1);

        console.log('\n' + '='.repeat(60));
        console.log('✅ GÉNÉRATION TERMINÉE');
        console.log('='.repeat(60));
        console.log(`📄 Documents générés: ${NB_DOCUMENTS}`);
        console.log(`📦 Taille moyenne par document: ${avgDocSize} KB`);
        console.log(`📦 Taille totale des contenus: ${(totalSize / (1024 * 1024)).toFixed(2)} MB`);
        console.log(`💾 Fichier JSON: ${OUTPUT_FILE}`);
        console.log(`💾 Taille du fichier JSON: ${fileSizeMB} MB`);
        console.log(`\n📂 Catégories utilisées:`);
        categories.forEach(cat => console.log(`   - ${cat.nom}`));
        console.log('\n📥 Pour importer: Menu → "Importer des données" (niveau 1)');
        console.log('='.repeat(60) + '\n');

    } catch (error) {
        console.error('❌ Erreur:', error);
        throw error;
    } finally {
        try {
            await closeDB();
        } catch (e) {
            // Ignorer l'erreur de fermeture
        }
    }
}

main().catch(err => {
    console.error('Erreur:', err);
    process.exit(1);
});
