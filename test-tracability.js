// Script pour tester la traçabilité d'un document
const fetch = require('node-fetch');

async function testTracability() {
    try {
        // 1. Se connecter
        console.log('🔐 Connexion avec kinzo...\n');
        const loginResponse = await fetch('http://localhost:4000/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: 'kinzo', password: '1234' })
        });

        const cookies = loginResponse.headers.get('set-cookie');
        const loginData = await loginResponse.json();

        if (!loginData.success) {
            console.log('❌ Échec de connexion');
            return;
        }

        console.log('✅ Connecté avec succès\n');

        // 2. Récupérer les documents accessibles
        console.log('📄 Récupération des documents...\n');
        const docsResponse = await fetch('http://localhost:4000/api/documents/kinzo', {
            headers: { 'Cookie': cookies }
        });

        const docsData = await docsResponse.json();

        if (!docsData.success || !docsData.documents || docsData.documents.length === 0) {
            console.log('❌ Aucun document accessible');
            return;
        }

        console.log(`✅ ${docsData.documents.length} document(s) accessible(s)\n`);

        // 3. Récupérer le premier document avec détails
        const firstDoc = docsData.documents[0];
        console.log(`🔍 Test avec document: ${firstDoc.titre || firstDoc.idDocument}\n`);

        const docResponse = await fetch(`http://localhost:4000/api/documents/kinzo/${firstDoc._id}`, {
            headers: { 'Cookie': cookies }
        });

        const docData = await docResponse.json();

        if (!docData.success) {
            console.log('❌ Erreur récupération document');
            return;
        }

        const doc = docData.document;

        // 4. Afficher les historiques
        console.log('═══════════════════════════════════════════════════════');
        console.log('                    TRAÇABILITÉ                        ');
        console.log('═══════════════════════════════════════════════════════\n');

        console.log(`📋 Document: ${doc.titre || doc.idDocument}\n`);

        // Consultations
        console.log('👁️  HISTORIQUE DES CONSULTATIONS:');
        if (doc.historiqueConsultations && doc.historiqueConsultations.length > 0) {
            console.log(`   Total: ${doc.historiqueConsultations.length} consultation(s)\n`);
            doc.historiqueConsultations.slice(-5).forEach((c, i) => {
                console.log(`   ${i + 1}. ${c.nomComplet || c.utilisateur}`);
                console.log(`      Rôle: ${c.role || 'N/A'} (Niveau ${c.niveau || 'N/A'})`);
                console.log(`      Département: ${c.departement || 'N/A'}`);
                console.log(`      Date: ${new Date(c.date).toLocaleString('fr-FR')}\n`);
            });
        } else {
            console.log('   ⚠️  Aucune consultation enregistrée\n');
        }

        // Téléchargements
        console.log('📥 HISTORIQUE DES TÉLÉCHARGEMENTS:');
        if (doc.historiqueTelechargements && doc.historiqueTelechargements.length > 0) {
            console.log(`   Total: ${doc.historiqueTelechargements.length} téléchargement(s)\n`);
            doc.historiqueTelechargements.slice(-5).forEach((t, i) => {
                console.log(`   ${i + 1}. ${t.nomComplet || t.utilisateur}`);
                console.log(`      Rôle: ${t.role || 'N/A'} (Niveau ${t.niveau || 'N/A'})`);
                console.log(`      Département: ${t.departement || 'N/A'}`);
                console.log(`      Date: ${new Date(t.date).toLocaleString('fr-FR')}\n`);
            });
        } else {
            console.log('   ⚠️  Aucun téléchargement enregistré\n');
        }

        // Partages
        console.log('🔗 HISTORIQUE DES PARTAGES:');
        if (doc.historiquePartages && doc.historiquePartages.length > 0) {
            console.log(`   Total: ${doc.historiquePartages.length} partage(s)\n`);
            doc.historiquePartages.slice(-5).forEach((p, i) => {
                console.log(`   ${i + 1}. ${p.sharedByName || p.sharedBy} → ${p.sharedWithName || p.sharedWith}`);
                console.log(`      De: ${p.sharedByRole || 'N/A'} (Niveau ${p.sharedByNiveau || 'N/A'}) - ${p.sharedByDepartement || 'N/A'}`);
                console.log(`      À:  ${p.sharedWithRole || 'N/A'} (Niveau ${p.sharedWithNiveau || 'N/A'}) - ${p.sharedWithDepartement || 'N/A'}`);
                console.log(`      Date: ${new Date(p.sharedAt).toLocaleString('fr-FR')}\n`);
            });
        } else {
            console.log('   ⚠️  Aucun partage enregistré\n');
        }

        console.log('═══════════════════════════════════════════════════════');

    } catch (error) {
        console.error('❌ Erreur:', error.message);
    }
}

testTracability();
