const fetch = require('node-fetch');

async function testAba11() {
    try {
        // 1. Connexion avec aba11
        console.log('🔐 Connexion avec aba11...\n');

        const loginResponse = await fetch('http://localhost:4000/api/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                username: 'aba11',
                password: '1243'
            })
        });

        if (!loginResponse.ok) {
            console.log('❌ Échec connexion - Status:', loginResponse.status);
            const error = await loginResponse.text();
            console.log('Erreur:', error);
            return;
        }

        const cookies = loginResponse.headers.raw()['set-cookie'];
        const cookieString = cookies ? cookies.join('; ') : '';

        const loginData = await loginResponse.json();
        console.log('✅ Connecté:', loginData.user.username, '-', loginData.user.nom);
        console.log('Niveau:', loginData.user.niveau, '\n');

        // 2. Récupérer les documents
        console.log('📄 Récupération des documents...\n');

        const docsResponse = await fetch('http://localhost:4000/api/documents/aba11', {
            headers: {
                'Cookie': cookieString
            }
        });

        if (!docsResponse.ok) {
            console.log('❌ Échec récupération documents - Status:', docsResponse.status);
            return;
        }

        const docsData = await docsResponse.json();

        if (!docsData.success || !docsData.documents || docsData.documents.length === 0) {
            console.log('⚠️  Aucun document accessible pour aba11\n');
            return;
        }

        console.log(`✅ ${docsData.documents.length} document(s) accessible(s)\n`);

        // 3. Tester avec le premier document
        const firstDoc = docsData.documents[0];
        console.log(`🔍 Récupération des détails du document: ${firstDoc.titre || firstDoc.idDocument}\n`);

        const docResponse = await fetch(`http://localhost:4000/api/documents/aba11/${firstDoc._id}`, {
            headers: {
                'Cookie': cookieString
            }
        });

        if (!docResponse.ok) {
            console.log('❌ Échec récupération document - Status:', docResponse.status);
            return;
        }

        const docData = await docResponse.json();
        const doc = docData.document;

        // 4. Afficher la traçabilité
        console.log('═══════════════════════════════════════════════════════');
        console.log('           TRAÇABILITÉ DU DOCUMENT                     ');
        console.log('═══════════════════════════════════════════════════════\n');

        console.log(`📋 Titre: ${doc.titre || 'Sans titre'}`);
        console.log(`🆔 ID: ${doc.idDocument}\n`);

        // Consultations
        console.log('👁️  CONSULTATIONS:');
        if (doc.historiqueConsultations && doc.historiqueConsultations.length > 0) {
            console.log(`✅ ${doc.historiqueConsultations.length} consultation(s)\n`);
            doc.historiqueConsultations.slice(-3).forEach((c, i) => {
                console.log(`   ${i + 1}. ${c.nomComplet || c.utilisateur}`);
                console.log(`      Rôle: ${c.role || 'Non défini'}`);
                console.log(`      Niveau: ${c.niveau !== undefined ? c.niveau : 'N/A'}`);
                console.log(`      Département: ${c.departement || 'Aucun'}`);
                console.log(`      Date: ${c.date ? new Date(c.date).toLocaleString('fr-FR') : 'N/A'}\n`);
            });
        } else {
            console.log('❌ VIDE - Aucune consultation\n');
        }

        // Téléchargements
        console.log('📥 TÉLÉCHARGEMENTS:');
        if (doc.historiqueTelechargements && doc.historiqueTelechargements.length > 0) {
            console.log(`✅ ${doc.historiqueTelechargements.length} téléchargement(s)\n`);
            doc.historiqueTelechargements.slice(-3).forEach((t, i) => {
                console.log(`   ${i + 1}. ${t.nomComplet || t.utilisateur}`);
                console.log(`      Rôle: ${t.role || 'Non défini'}`);
                console.log(`      Niveau: ${t.niveau !== undefined ? t.niveau : 'N/A'}`);
                console.log(`      Département: ${t.departement || 'Aucun'}`);
                console.log(`      Date: ${t.date ? new Date(t.date).toLocaleString('fr-FR') : 'N/A'}\n`);
            });
        } else {
            console.log('❌ VIDE - Aucun téléchargement\n');
        }

        // Partages
        console.log('🔗 PARTAGES:');
        if (doc.historiquePartages && doc.historiquePartages.length > 0) {
            console.log(`✅ ${doc.historiquePartages.length} partage(s)\n`);
            doc.historiquePartages.slice(-3).forEach((p, i) => {
                console.log(`   ${i + 1}. ${p.sharedByName || p.sharedBy} → ${p.sharedWithName || p.sharedWith}`);
                console.log(`      De: ${p.sharedByRole || 'N/A'} (Niv. ${p.sharedByNiveau || 'N/A'})`);
                console.log(`      À:  ${p.sharedWithRole || 'N/A'} (Niv. ${p.sharedWithNiveau || 'N/A'})`);
                console.log(`      Date: ${p.sharedAt ? new Date(p.sharedAt).toLocaleString('fr-FR') : 'N/A'}\n`);
            });
        } else {
            console.log('❌ VIDE - Aucun partage\n');
        }

        console.log('═══════════════════════════════════════════════════════');

        // 5. Afficher le JSON brut pour debug
        console.log('\n📦 JSON BRUT (pour debug):\n');
        console.log(JSON.stringify({
            historiqueConsultations: doc.historiqueConsultations || [],
            historiqueTelechargements: doc.historiqueTelechargements || [],
            historiquePartages: doc.historiquePartages || []
        }, null, 2));

    } catch (error) {
        console.error('\n❌ ERREUR:', error.message);
        console.error(error.stack);
    }
}

testAba11();
