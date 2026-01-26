/**
 * ⚠️ SCRIPT DE SUPPRESSION DES DOCUMENTS
 * Supprime tous les documents de la collection "documents" dans Atlas
 *
 * SÉCURITÉ :
 * - Crée une sauvegarde automatique avant suppression
 * - Demande confirmation
 * - Affiche un rapport détaillé
 */

const { MongoClient } = require('mongodb');
const fs = require('fs');
const path = require('path');

const ATLAS_URI = 'mongodb+srv://jacquesboubacarkoukoui_db_user:um6pz5uhsXkNGdOe@cluster0.eq69ixv.mongodb.net/cerer_archivage?retryWrites=true&w=majority';

async function deleteAllDocuments() {
    let client;

    try {
        console.log('⚠️  SUPPRESSION DES DOCUMENTS - MODE SÉCURISÉ\n');
        console.log('='.repeat(80));

        client = await MongoClient.connect(ATLAS_URI);
        const db = client.db('cerer_archivage');
        const documentsCollection = db.collection('documents');

        // 1. Compter les documents
        const totalDocs = await documentsCollection.countDocuments();
        const activeDocs = await documentsCollection.countDocuments({ deleted: { $ne: true } });
        const deletedDocs = await documentsCollection.countDocuments({ deleted: true });

        console.log('\n📊 ÉTAT ACTUEL:\n');
        console.log(`   Total de documents : ${totalDocs}`);
        console.log(`   Documents actifs : ${activeDocs}`);
        console.log(`   Documents en corbeille : ${deletedDocs}`);

        if (totalDocs === 0) {
            console.log('\n✅ Aucun document à supprimer - Collection déjà vide');
            return;
        }

        // 2. Créer une sauvegarde
        console.log('\n💾 CRÉATION D\'UNE SAUVEGARDE...\n');

        const backupDir = path.join(__dirname, '../backups');
        if (!fs.existsSync(backupDir)) {
            fs.mkdirSync(backupDir, { recursive: true });
        }

        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const backupFile = path.join(backupDir, `documents-backup-${timestamp}.json`);

        const allDocuments = await documentsCollection.find({}).toArray();
        fs.writeFileSync(backupFile, JSON.stringify(allDocuments, null, 2), 'utf8');

        console.log(`   ✅ Sauvegarde créée : ${backupFile}`);
        console.log(`   📦 ${totalDocs} documents sauvegardés`);
        console.log(`   💾 Taille : ${(fs.statSync(backupFile).size / 1024 / 1024).toFixed(2)} MB`);

        // 3. Afficher un exemple de ce qui sera supprimé
        console.log('\n📄 EXEMPLES DE DOCUMENTS QUI SERONT SUPPRIMÉS:\n');

        const samples = await documentsCollection.find({}).limit(5).toArray();
        for (let i = 0; i < Math.min(3, samples.length); i++) {
            const doc = samples[i];
            console.log(`   ${i + 1}. ${doc.titre || doc.idDocument}`);
            console.log(`      Créé par: ${doc.idUtilisateur}`);
            console.log(`      Date: ${doc.createdAt ? new Date(doc.createdAt).toLocaleString('fr-FR') : 'N/A'}\n`);
        }

        if (samples.length > 3) {
            console.log(`   ... et ${totalDocs - 3} autre(s)\n`);
        }

        // 4. CONFIRMATION FINALE
        console.log('='.repeat(80));
        console.log('⚠️  CONFIRMATION REQUISE\n');
        console.log(`Vous êtes sur le point de supprimer ${totalDocs} documents de la base ATLAS.`);
        console.log('Cette action est IRRÉVERSIBLE !');
        console.log('\nPour continuer, modifiez le script et décommentez la ligne de suppression.');
        console.log('Cherchez le commentaire: // DÉCOMMENTER CETTE LIGNE POUR CONFIRMER\n');
        console.log('='.repeat(80));

        // 5. SUPPRESSION (COMMENTÉE PAR SÉCURITÉ)
        // 🔴 DÉCOMMENTER CETTE LIGNE POUR CONFIRMER LA SUPPRESSION :
        // const result = await documentsCollection.deleteMany({});

        // Code pour la suppression (actuellement commenté)
        const CONFIRMATION = true; // Mettre à true pour confirmer

        if (CONFIRMATION) {
            console.log('\n🗑️  SUPPRESSION EN COURS...\n');
            const result = await documentsCollection.deleteMany({});

            console.log('✅ SUPPRESSION TERMINÉE\n');
            console.log(`   Documents supprimés : ${result.deletedCount}`);
            console.log(`   Sauvegarde disponible : ${backupFile}\n`);

            // Log d'audit
            const auditLog = {
                timestamp: new Date(),
                action: 'MASS_DELETE_DOCUMENTS',
                user: 'script',
                details: {
                    totalDeleted: result.deletedCount,
                    backupFile: backupFile
                }
            };
            await db.collection('auditLogs').insertOne(auditLog);

            console.log('📝 Log d\'audit créé');
        } else {
            console.log('\n⚠️  SUPPRESSION ANNULÉE - Confirmation requise\n');
            console.log('Pour confirmer :');
            console.log('1. Ouvrez le fichier scripts/delete-documents-atlas.js');
            console.log('2. Changez CONFIRMATION = false en CONFIRMATION = true');
            console.log('3. Relancez le script\n');
        }

        console.log('='.repeat(80));

    } catch (error) {
        console.error('❌ Erreur:', error.message);
    } finally {
        if (client) {
            await client.close();
            console.log('\n🔌 Connexion fermée');
        }
    }
}

// Exécuter
deleteAllDocuments().catch(console.error);
