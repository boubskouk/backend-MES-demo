const { MongoClient } = require('mongodb');

const MONGO_URI = 'mongodb://localhost:27017';
const DB_NAME = 'mes_archivage';

async function checkDocumentsHistory() {
    const client = await MongoClient.connect(MONGO_URI);
    const db = client.db(DB_NAME);

    const documents = await db.collection('documents').find({
        deleted: { $ne: true }
    }).limit(5).toArray();

    console.log('\n📋 État des historiques dans les documents:\n');
    console.log('═══════════════════════════════════════════════════════\n');

    for (const doc of documents) {
        console.log(`📄 Document: ${doc.titre || doc.idDocument}`);
        console.log(`   ID: ${doc.idDocument}`);

        // Consultations
        const consultations = doc.historiqueConsultations || [];
        console.log(`   👁️  Consultations: ${consultations.length}`);
        if (consultations.length > 0) {
            console.log(`      Dernier: ${consultations[consultations.length - 1].utilisateur} - ${new Date(consultations[consultations.length - 1].date).toLocaleString('fr-FR')}`);
        }

        // Téléchargements
        const telechargements = doc.historiqueTelechargements || [];
        console.log(`   📥 Téléchargements: ${telechargements.length}`);
        if (telechargements.length > 0) {
            console.log(`      Dernier: ${telechargements[telechargements.length - 1].utilisateur} - ${new Date(telechargements[telechargements.length - 1].date).toLocaleString('fr-FR')}`);
        }

        console.log('');
    }

    // Vérifier la collection shareHistory
    console.log('═══════════════════════════════════════════════════════\n');
    console.log('📊 Collection shareHistory:\n');

    const shareHistory = await db.collection('shareHistory').find({}).limit(10).toArray();
    console.log(`   Total d'entrées: ${await db.collection('shareHistory').countDocuments()}`);

    if (shareHistory.length > 0) {
        console.log('   Exemples:\n');
        shareHistory.slice(0, 3).forEach((s, i) => {
            console.log(`   ${i + 1}. Document: ${s.documentId}`);
            console.log(`      ${s.sharedBy} → ${s.sharedWith}`);
            console.log(`      Date: ${s.sharedAt ? new Date(s.sharedAt).toLocaleString('fr-FR') : s.date ? new Date(s.date).toLocaleString('fr-FR') : 'N/A'}\n`);
        });
    } else {
        console.log('   ⚠️  Aucune entrée dans shareHistory\n');
    }

    console.log('═══════════════════════════════════════════════════════');

    await client.close();
}

checkDocumentsHistory().catch(console.error);
