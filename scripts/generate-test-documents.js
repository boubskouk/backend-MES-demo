/**
 * Script pour générer 400 documents de test pour tester les performances
 * Usage: node scripts/generate-test-documents.js
 */

const fs = require('fs');
const path = require('path');

// Configuration
const NB_DOCUMENTS = 400;
const OUTPUT_FILE = path.join(__dirname, '..', 'test-import-400-docs.json');

// Catégories de test
const categories = [
    'Rapports',
    'Factures',
    'Contrats',
    'Notes de service',
    'Procès-verbaux',
    'Correspondance',
    'Documents techniques',
    'Ressources humaines'
];

// Types de fichiers simulés
const fileTypes = [
    { ext: 'pdf', mime: 'application/pdf' },
    { ext: 'docx', mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' },
    { ext: 'xlsx', mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' },
    { ext: 'txt', mime: 'text/plain' }
];

// Titres de documents
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

// Générer un contenu factice minimal (petit fichier texte en base64)
function generateFakeContent(type) {
    // Contenu texte simple pour simuler un fichier
    const text = `Document de test généré automatiquement.
Date: ${new Date().toISOString()}
Type: ${type}
Ce document est utilisé pour tester les performances du système d'archivage.
Lorem ipsum dolor sit amet, consectetur adipiscing elit.
Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.
Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris.`;

    const base64 = Buffer.from(text).toString('base64');
    return `data:text/plain;base64,${base64}`;
}

// Générer une date aléatoire dans les 2 dernières années
function randomDate() {
    const now = new Date();
    const twoYearsAgo = new Date(now.getFullYear() - 2, now.getMonth(), now.getDate());
    const randomTime = twoYearsAgo.getTime() + Math.random() * (now.getTime() - twoYearsAgo.getTime());
    return new Date(randomTime).toISOString().split('T')[0];
}

// Générer les documents
function generateDocuments(count) {
    const documents = [];

    for (let i = 1; i <= count; i++) {
        const fileType = fileTypes[Math.floor(Math.random() * fileTypes.length)];
        const category = categories[Math.floor(Math.random() * categories.length)];
        const titreBase = titresBase[Math.floor(Math.random() * titresBase.length)];

        const doc = {
            titre: `${titreBase} #${i}`,
            categorie: category,
            date: randomDate(),
            description: `Document de test numéro ${i} - Généré automatiquement pour test de performance`,
            tags: [`test`, `auto-${i}`, category.toLowerCase().replace(/\s/g, '-')],
            nomFichier: `document_test_${i}.${fileType.ext}`,
            taille: Math.floor(Math.random() * 500000) + 10000, // 10KB - 500KB
            type: fileType.mime,
            contenu: generateFakeContent(fileType.ext)
        };

        documents.push(doc);

        if (i % 50 === 0) {
            console.log(`Génération: ${i}/${count} documents...`);
        }
    }

    return documents;
}

// Main
console.log(`\n🚀 Génération de ${NB_DOCUMENTS} documents de test...\n`);

const startTime = Date.now();
const documents = generateDocuments(NB_DOCUMENTS);
const generationTime = Date.now() - startTime;

// Créer le fichier JSON
const output = {
    version: '2.3',
    exportDate: new Date().toISOString(),
    description: `${NB_DOCUMENTS} documents de test pour test de performance`,
    documents: documents
};

fs.writeFileSync(OUTPUT_FILE, JSON.stringify(output, null, 2));

const fileSizeKB = (fs.statSync(OUTPUT_FILE).size / 1024).toFixed(2);

console.log(`\n✅ Génération terminée !`);
console.log(`📄 ${NB_DOCUMENTS} documents générés`);
console.log(`⏱️  Temps de génération: ${generationTime}ms`);
console.log(`💾 Fichier: ${OUTPUT_FILE}`);
console.log(`📦 Taille: ${fileSizeKB} KB`);
console.log(`\n📥 Pour importer: Utilisez la fonction "Importer des données" dans l'application (niveau 1)`);
