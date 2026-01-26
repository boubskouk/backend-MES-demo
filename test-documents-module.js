/**
 * Script de test pour le module Documents du Super Admin
 */

const fetch = require('node-fetch');

const BASE_URL = 'http://localhost:4000';
let cookies = '';

async function login() {
    console.log('🔐 Connexion en tant que Super Admin...\n');

    const response = await fetch(`${BASE_URL}/api/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            username: 'boubs',
            password: 'Boubs@2024'
        })
    });

    // Extraire les cookies de session
    const setCookie = response.headers.get('set-cookie');
    if (setCookie) {
        cookies = setCookie.split(';')[0];
    }

    const data = await response.json();
    console.log('Connexion:', data.success ? '✅ Réussie' : '❌ Échouée');
    console.log('Message:', data.message);
    console.log('');

    return data.success;
}

async function testDocumentsStats() {
    console.log('📊 Test: Documents Stats (période: all)');

    const response = await fetch(`${BASE_URL}/api/superadmin/documents/stats?period=all`, {
        headers: { 'Cookie': cookies }
    });

    const data = await response.json();

    if (data.success) {
        console.log('✅ Stats récupérées');
        console.log('   - Total documents:', data.data.total);
        console.log('   - Documents verrouillés:', data.data.locked);
        console.log('   - Documents partagés:', data.data.shared);
        console.log('   - Départements:', data.data.byDepartment.length);

        if (data.data.byDepartment.length > 0) {
            console.log('   - Top département:', data.data.byDepartment[0].departement, ':', data.data.byDepartment[0].count);
        }
    } else {
        console.log('❌ Erreur:', data.message);
    }
    console.log('');
}

async function testDocumentsActivity() {
    console.log('📈 Test: Documents Activity (période: all)');

    const response = await fetch(`${BASE_URL}/api/superadmin/documents/activity?period=all`, {
        headers: { 'Cookie': cookies }
    });

    const data = await response.json();

    if (data.success) {
        console.log('✅ Activité récupérée');
        console.log('   - Documents créés:', data.data.created);
        console.log('   - Documents supprimés:', data.data.deleted);
        console.log('   - Téléchargements:', data.data.downloaded);
        console.log('   - Partages:', data.data.shared);
    } else {
        console.log('❌ Erreur:', data.message);
    }
    console.log('');
}

async function testMostShared() {
    console.log('📤 Test: Documents les Plus Partagés');

    const response = await fetch(`${BASE_URL}/api/superadmin/documents/most-shared?period=all`, {
        headers: { 'Cookie': cookies }
    });

    const data = await response.json();

    if (data.success) {
        console.log('✅ Top partagés récupérés:', data.data.length, 'documents');
        if (data.data.length > 0) {
            console.log('   - Top 1:', data.data[0].titre, ':', data.data[0].nombrePartages, 'partages');
        } else {
            console.log('   - Aucun document partagé');
        }
    } else {
        console.log('❌ Erreur:', data.message);
    }
    console.log('');
}

async function testMostDownloaded() {
    console.log('📥 Test: Documents les Plus Téléchargés');

    const response = await fetch(`${BASE_URL}/api/superadmin/documents/most-downloaded?period=all`, {
        headers: { 'Cookie': cookies }
    });

    const data = await response.json();

    if (data.success) {
        console.log('✅ Top téléchargés récupérés:', data.data.length, 'documents');
        if (data.data.length > 0) {
            console.log('   - Top 1:', data.data[0].titre, ':', data.data[0].nombreTelechargements, 'téléchargements');
        } else {
            console.log('   - Aucun téléchargement');
        }
    } else {
        console.log('❌ Erreur:', data.message);
    }
    console.log('');
}

async function testLevel1Deletions() {
    console.log('👨‍💼 Test: Admins Niveau 1 - Suppressions');

    const response = await fetch(`${BASE_URL}/api/superadmin/documents/level1-deletions?period=all`, {
        headers: { 'Cookie': cookies }
    });

    const data = await response.json();

    if (data.success) {
        console.log('✅ Admins récupérés:', data.data.length, 'admin(s)');
        if (data.data.length > 0) {
            console.log('   - Admin 1:', data.data[0].nom, ':', data.data[0].nombreSuppressions, 'suppressions');
        } else {
            console.log('   - Aucune suppression par des admins niveau 1');
        }
    } else {
        console.log('❌ Erreur:', data.message);
    }
    console.log('');
}

async function testDeletedDocuments() {
    console.log('🗑️ Test: Documents Supprimés (page 1)');

    const response = await fetch(`${BASE_URL}/api/superadmin/documents/deleted?period=all&page=1&limit=5`, {
        headers: { 'Cookie': cookies }
    });

    const data = await response.json();

    if (data.success) {
        console.log('✅ Documents supprimés récupérés:', data.data.deletions.length, 'sur', data.data.pagination.total);
        console.log('   - Pages:', data.data.pagination.totalPages);
        if (data.data.deletions.length > 0) {
            console.log('   - Premier:', data.data.deletions[0].titre, '- supprimé par', data.data.deletions[0].supprimePar);
        }
    } else {
        console.log('❌ Erreur:', data.message);
    }
    console.log('');
}

async function testLockedDocuments() {
    console.log('🔒 Test: Documents Verrouillés (page 1)');

    const response = await fetch(`${BASE_URL}/api/superadmin/documents/locked?period=all&page=1&limit=5`, {
        headers: { 'Cookie': cookies }
    });

    const data = await response.json();

    if (data.success) {
        console.log('✅ Documents verrouillés récupérés:', data.data.locked.length, 'sur', data.data.pagination.total);
        console.log('   - Pages:', data.data.pagination.totalPages);
        if (data.data.locked.length > 0) {
            console.log('   - Premier:', data.data.locked[0].titre, '- verrouillé par', data.data.locked[0].verrouilléPar);
        }
    } else {
        console.log('❌ Erreur:', data.message);
    }
    console.log('');
}

async function testPeriodFilters() {
    console.log('🗓️ Test: Filtres de Période');

    const periods = ['today', '7days', '30days'];

    for (const period of periods) {
        const response = await fetch(`${BASE_URL}/api/superadmin/documents/stats?period=${period}`, {
            headers: { 'Cookie': cookies }
        });

        const data = await response.json();

        if (data.success) {
            console.log(`   ✅ Période "${period}": ${data.data.total} documents`);
        } else {
            console.log(`   ❌ Période "${period}": Erreur`);
        }
    }
    console.log('');
}

// Exécution des tests
(async () => {
    console.log('╔════════════════════════════════════════════════════════╗');
    console.log('║  TEST MODULE DOCUMENTS - SUPER ADMIN                  ║');
    console.log('╚════════════════════════════════════════════════════════╝');
    console.log('');

    try {
        const isLoggedIn = await login();

        if (!isLoggedIn) {
            console.log('❌ Impossible de se connecter. Tests annulés.');
            return;
        }

        console.log('🧪 Exécution des tests...\n');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

        await testDocumentsStats();
        await testDocumentsActivity();
        await testMostShared();
        await testMostDownloaded();
        await testLevel1Deletions();
        await testDeletedDocuments();
        await testLockedDocuments();
        await testPeriodFilters();

        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
        console.log('✅ Tests terminés !');
        console.log('');
        console.log('🌐 Pour tester l\'interface graphique, ouvrez :');
        console.log('   http://localhost:4000/super-admin-login.html');
        console.log('');
        console.log('   Username: boubs');
        console.log('   Password: Boubs@2024');
        console.log('');

    } catch (error) {
        console.error('❌ Erreur lors des tests:', error.message);
    }
})();
