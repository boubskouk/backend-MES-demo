/**
 * 🧪 SCRIPT DE TEST - Permissions Niveau 1 (test3)
 *
 * Ce script teste TOUTES les actions qui chargent /api/users
 * pour identifier où se trouve le bug de fuite de permissions
 */

const axios = require('axios');

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const TEST_USER = 'test3'; // Niveau 1 - Département MAINTENANCE
const TEST_PASSWORD = '1234';

let sessionCookie = '';

// ===== UTILITIES =====

async function apiCall(endpoint, method = 'GET', data = null, description = '') {
    try {
        const config = {
            method,
            url: `${BASE_URL}${endpoint}`,
            headers: {
                'Cookie': sessionCookie,
                'Content-Type': 'application/json'
            }
        };

        if (data) {
            config.data = data;
        }

        console.log(`\n📤 ${description || method + ' ' + endpoint}`);
        const response = await axios(config);

        if (Array.isArray(response.data)) {
            console.log(`✅ Réponse: ${response.data.length} élément(s)`);
            return response.data;
        } else if (response.data.success !== undefined) {
            console.log(`✅ Réponse: ${response.data.success ? 'SUCCESS' : 'FAILED'}`);
            return response.data;
        } else {
            console.log(`✅ Réponse reçue`);
            return response.data;
        }
    } catch (error) {
        console.log(`❌ ERREUR: ${error.response?.data?.message || error.message}`);
        return null;
    }
}

function analyzeUsers(users, context) {
    console.log(`\n🔍 ANALYSE ${context}:`);
    console.log(`   Total: ${users.length} utilisateur(s)`);

    // Grouper par département
    const byDept = {};
    users.forEach(u => {
        const dept = u.departement || 'Sans département';
        byDept[dept] = (byDept[dept] || 0) + 1;
    });

    console.log(`   Départements:`);
    Object.entries(byDept).forEach(([dept, count]) => {
        console.log(`      - ${dept}: ${count} utilisateur(s)`);
    });

    // Vérifier si test3 voit QUE son département
    const nonMaintenanceUsers = users.filter(u =>
        u.departement &&
        u.departement !== 'MAINTENANCE' &&
        u.departement !== 'Via service'
    );

    if (nonMaintenanceUsers.length > 0) {
        console.log(`\n🚨 FUITE DE SÉCURITÉ DÉTECTÉE!`);
        console.log(`   test3 voit ${nonMaintenanceUsers.length} utilisateur(s) hors MAINTENANCE:`);
        nonMaintenanceUsers.forEach(u => {
            console.log(`      - ${u.username} (${u.departement})`);
        });
        return false;
    } else {
        console.log(`\n✅ Sécurité OK - test3 voit uniquement MAINTENANCE`);
        return true;
    }
}

// ===== TESTS =====

async function test1_Login() {
    console.log('\n\n========================================');
    console.log('TEST 1: Connexion de test3');
    console.log('========================================');

    const response = await axios.post(`${BASE_URL}/login`, {
        username: TEST_USER,
        password: TEST_PASSWORD
    });

    if (response.data.success) {
        sessionCookie = response.headers['set-cookie']?.join('; ') || '';
        console.log(`✅ Connexion réussie`);
        console.log(`   Niveau: ${response.data.user.niveau}`);
        console.log(`   Département: ${response.data.user.departement}`);
        return true;
    } else {
        console.log(`❌ Échec connexion`);
        return false;
    }
}

async function test2_InitialLoad() {
    console.log('\n\n========================================');
    console.log('TEST 2: Chargement initial - Ouvrir gestion utilisateurs');
    console.log('========================================');
    console.log('Simule: test3 clique sur "Gérer les utilisateurs"');
    console.log('Frontend: toggleUsersManagement() -> apiCall("/users")');

    const users = await apiCall('/api/users', 'GET', null, 'GET /api/users');

    if (users && Array.isArray(users)) {
        return analyzeUsers(users, 'CHARGEMENT INITIAL');
    }
    return false;
}

async function test3_OpenShareModal() {
    console.log('\n\n========================================');
    console.log('TEST 3: Ouverture modal de partage');
    console.log('========================================');
    console.log('Simule: test3 clique sur "Partager" sur un document');
    console.log('Frontend: openShareModal() -> apiCall("/users")');

    const users = await apiCall('/api/users', 'GET', null, 'GET /api/users (partage)');

    if (users && Array.isArray(users)) {
        return analyzeUsers(users, 'MODAL PARTAGE');
    }
    return false;
}

async function test4_AfterCreateUser() {
    console.log('\n\n========================================');
    console.log('TEST 4: Après création d\'un utilisateur');
    console.log('========================================');
    console.log('Simule: test3 crée un nouvel utilisateur');

    // Créer un utilisateur de test
    const randomNum = Math.floor(Math.random() * 10000);
    const newUsername = `testuser_${randomNum}`;

    const createResult = await apiCall('/api/register', 'POST', {
        username: newUsername,
        password: '1234',
        nom: 'Test User',
        email: `${newUsername}@test.com`,
        idRole: '507f1f77bcf86cd799439011', // ID fictif
        idDepartement: null
    }, `Créer utilisateur ${newUsername}`);

    // Recharger les utilisateurs comme le fait le frontend
    console.log('\nFrontend: Après création -> apiCall("/users")');
    const users = await apiCall('/api/users', 'GET', null, 'GET /api/users (après création)');

    if (users && Array.isArray(users)) {
        return analyzeUsers(users, 'APRÈS CRÉATION UTILISATEUR');
    }
    return false;
}

async function test5_AfterDeleteUser() {
    console.log('\n\n========================================');
    console.log('TEST 5: Après suppression d\'un utilisateur');
    console.log('========================================');
    console.log('Simule: test3 supprime un utilisateur');

    // D'abord, récupérer la liste pour trouver un utilisateur à supprimer
    const usersBefore = await apiCall('/api/users', 'GET', null, 'GET /api/users (avant suppression)');

    if (usersBefore && usersBefore.length > 1) {
        const userToDelete = usersBefore.find(u => u.username !== TEST_USER);

        if (userToDelete) {
            console.log(`\nSuppression de: ${userToDelete.username}`);
            await apiCall(`/api/users/${userToDelete.username}`, 'DELETE', null, `DELETE /api/users/${userToDelete.username}`);

            // Recharger comme le fait le frontend
            console.log('\nFrontend: Après suppression -> apiCall("/users")');
            const usersAfter = await apiCall('/api/users', 'GET', null, 'GET /api/users (après suppression)');

            if (usersAfter && Array.isArray(usersAfter)) {
                return analyzeUsers(usersAfter, 'APRÈS SUPPRESSION UTILISATEUR');
            }
        } else {
            console.log('⚠️  Aucun utilisateur disponible pour suppression');
        }
    }

    return false;
}

async function test6_AfterUpdateUser() {
    console.log('\n\n========================================');
    console.log('TEST 6: Après modification d\'un utilisateur');
    console.log('========================================');
    console.log('Simule: test3 modifie un utilisateur');

    // Récupérer un utilisateur à modifier
    const usersBefore = await apiCall('/api/users', 'GET', null, 'GET /api/users (avant modification)');

    if (usersBefore && usersBefore.length > 0) {
        const userToUpdate = usersBefore.find(u => u.username !== TEST_USER);

        if (userToUpdate) {
            console.log(`\nModification de: ${userToUpdate.username}`);
            await apiCall(`/api/users/${userToUpdate.username}`, 'PUT', {
                nom: userToUpdate.nom + ' (modifié)',
                email: userToUpdate.email,
                idRole: userToUpdate.idRole,
                idDepartement: userToUpdate.idDepartement
            }, `PUT /api/users/${userToUpdate.username}`);

            // Recharger comme le fait le frontend
            console.log('\nFrontend: Après modification -> apiCall("/users")');
            const usersAfter = await apiCall('/api/users', 'GET', null, 'GET /api/users (après modification)');

            if (usersAfter && Array.isArray(usersAfter)) {
                return analyzeUsers(usersAfter, 'APRÈS MODIFICATION UTILISATEUR');
            }
        } else {
            console.log('⚠️  Aucun utilisateur disponible pour modification');
        }
    }

    return false;
}

// ===== EXÉCUTION =====

async function runAllTests() {
    console.log('🧪 DÉBUT DES TESTS DE PERMISSIONS NIVEAU 1');
    console.log(`   Utilisateur testé: ${TEST_USER}`);
    console.log(`   Département attendu: MAINTENANCE`);
    console.log(`   URL: ${BASE_URL}`);

    const results = {
        total: 0,
        passed: 0,
        failed: 0,
        details: []
    };

    try {
        // Test 1: Login
        const loginOk = await test1_Login();
        if (!loginOk) {
            console.log('\n❌ Impossible de continuer sans connexion');
            return;
        }

        // Tests 2-6
        const tests = [
            { name: 'Chargement initial', fn: test2_InitialLoad },
            { name: 'Modal partage', fn: test3_OpenShareModal },
            { name: 'Après création utilisateur', fn: test4_AfterCreateUser },
            { name: 'Après suppression utilisateur', fn: test5_AfterDeleteUser },
            { name: 'Après modification utilisateur', fn: test6_AfterUpdateUser }
        ];

        for (const test of tests) {
            results.total++;
            const passed = await test.fn();
            if (passed) {
                results.passed++;
                results.details.push({ test: test.name, status: '✅ PASS' });
            } else {
                results.failed++;
                results.details.push({ test: test.name, status: '❌ FAIL' });
            }
        }

    } catch (error) {
        console.error('\n❌ Erreur durant les tests:', error.message);
    }

    // Résumé
    console.log('\n\n========================================');
    console.log('📊 RÉSUMÉ DES TESTS');
    console.log('========================================');
    console.log(`Total: ${results.total}`);
    console.log(`Réussis: ${results.passed}`);
    console.log(`Échoués: ${results.failed}`);
    console.log('\nDétails:');
    results.details.forEach(r => {
        console.log(`   ${r.status} - ${r.test}`);
    });

    if (results.failed > 0) {
        console.log('\n🚨 DES FUITES DE SÉCURITÉ ONT ÉTÉ DÉTECTÉES !');
        console.log('   test3 (niveau 1) peut voir des utilisateurs hors de son département.');
    } else {
        console.log('\n✅ AUCUNE FUITE DÉTECTÉE - Sécurité OK');
    }
}

// Démarrer les tests
runAllTests().catch(console.error);
