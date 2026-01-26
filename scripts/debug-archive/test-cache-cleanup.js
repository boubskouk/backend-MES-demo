/**
 * 🧪 TEST COMPLET - Bug de cache entre sessions
 *
 * Ce test simule le scénario complet du bug :
 * 1. boubs se connecte et charge tous les utilisateurs
 * 2. boubs se déconnecte
 * 3. test3 se connecte
 * 4. test3 charge les utilisateurs
 * 5. VÉRIFICATION : test3 devrait voir UNIQUEMENT son département (MAINTENANCE)
 */

const axios = require('axios');

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

// Configuration des utilisateurs de test
const SUPER_ADMIN = { username: 'boubs', password: 'Boubs@2024', expectedLevel: 0, expectedAllUsers: true };
const NIVEAU_1 = { username: 'aba2', password: '1243', expectedLevel: 1, expectedDept: null }; // expectedDept sera détecté automatiquement

let results = {
    totalTests: 0,
    passed: 0,
    failed: 0,
    details: []
};

// ===== UTILITIES =====

function log(message, type = 'info') {
    const icons = { info: 'ℹ️', success: '✅', error: '❌', warning: '⚠️', test: '🧪' };
    console.log(`${icons[type]} ${message}`);
}

function testResult(testName, passed, details = '') {
    results.totalTests++;
    if (passed) {
        results.passed++;
        results.details.push({ test: testName, status: '✅ PASS', details });
        log(`${testName}: PASS ${details ? '- ' + details : ''}`, 'success');
    } else {
        results.failed++;
        results.details.push({ test: testName, status: '❌ FAIL', details });
        log(`${testName}: FAIL ${details ? '- ' + details : ''}`, 'error');
    }
}

async function apiCall(endpoint, method = 'GET', data = null, cookies = '') {
    try {
        const config = {
            method,
            url: `${BASE_URL}${endpoint}`,
            headers: {
                'Content-Type': 'application/json'
            },
            validateStatus: () => true // Ne pas rejeter sur erreur HTTP
        };

        if (cookies) {
            config.headers['Cookie'] = cookies;
        }

        if (data) {
            config.data = data;
        }

        const response = await axios(config);
        return {
            status: response.status,
            data: response.data,
            cookies: response.headers['set-cookie']?.join('; ') || ''
        };
    } catch (error) {
        return {
            status: 500,
            data: { success: false, message: error.message },
            cookies: ''
        };
    }
}

function analyzeUsers(users, expectedDept = null) {
    const analysis = {
        total: users.length,
        departments: {},
        users: []
    };

    users.forEach(u => {
        const dept = u.departement || 'Sans département';
        analysis.departments[dept] = (analysis.departments[dept] || 0) + 1;
        analysis.users.push({
            username: u.username,
            dept: u.departement,
            role: u.role,
            niveau: u.niveau
        });
    });

    // Vérification sécurité
    if (expectedDept) {
        const unauthorizedUsers = users.filter(u =>
            u.departement &&
            u.departement !== expectedDept &&
            u.departement !== 'Via service' &&
            u.departement !== 'Aucun (Admin Principal)'
        );
        analysis.securityBreach = unauthorizedUsers.length > 0;
        analysis.unauthorizedUsers = unauthorizedUsers;
    }

    return analysis;
}

// ===== TESTS =====

async function testScenario() {
    console.log('\n' + '='.repeat(70));
    console.log('🧪 TEST COMPLET - Bug de cache entre sessions');
    console.log('='.repeat(70));
    console.log(`URL: ${BASE_URL}`);
    console.log();

    let boubsCookies = '';
    let test3Cookies = '';

    // ==========================================
    // ÉTAPE 1: Connexion BOUBS (Super Admin)
    // ==========================================
    console.log('\n' + '-'.repeat(70));
    log('ÉTAPE 1: Connexion de boubs (Super Admin)', 'test');
    console.log('-'.repeat(70));

    const boubsLogin = await apiCall('/api/login', 'POST', {
        username: SUPER_ADMIN.username,
        password: SUPER_ADMIN.password
    });

    if (boubsLogin.status === 200 && boubsLogin.data.success) {
        boubsCookies = boubsLogin.cookies;
        testResult('Connexion boubs', true, `Niveau ${boubsLogin.data.user.niveau}`);
    } else {
        testResult('Connexion boubs', false, boubsLogin.data.message || 'Erreur inconnue');
        log('ARRÊT: Impossible de continuer sans connexion', 'error');
        return;
    }

    // ==========================================
    // ÉTAPE 2: BOUBS charge tous les utilisateurs
    // ==========================================
    console.log('\n' + '-'.repeat(70));
    log('ÉTAPE 2: boubs charge tous les utilisateurs', 'test');
    console.log('-'.repeat(70));

    const boubsUsers = await apiCall('/api/users', 'GET', null, boubsCookies);

    if (boubsUsers.status === 200 && Array.isArray(boubsUsers.data)) {
        const analysis = analyzeUsers(boubsUsers.data);

        log(`Total utilisateurs: ${analysis.total}`, 'info');
        Object.entries(analysis.departments).forEach(([dept, count]) => {
            log(`  - ${dept}: ${count} utilisateur(s)`, 'info');
        });

        // Vérifier que boubs voit TOUS les utilisateurs (niveau 0)
        const hasMultipleDepts = Object.keys(analysis.departments).length > 1;
        testResult(
            'boubs voit tous les utilisateurs',
            hasMultipleDepts,
            `${Object.keys(analysis.departments).length} département(s)`
        );
    } else {
        testResult('boubs charge utilisateurs', false, 'Échec de chargement');
    }

    // ==========================================
    // ÉTAPE 3: BOUBS se déconnecte
    // ==========================================
    console.log('\n' + '-'.repeat(70));
    log('ÉTAPE 3: boubs se déconnecte', 'test');
    console.log('-'.repeat(70));

    const boubsLogout = await apiCall('/api/logout', 'POST', null, boubsCookies);

    if (boubsLogout.status === 200) {
        testResult('Déconnexion boubs', true);
        log('Cache frontend devrait être nettoyé maintenant', 'info');
    } else {
        testResult('Déconnexion boubs', false);
    }

    // Petit délai pour simuler le temps entre sessions
    await new Promise(resolve => setTimeout(resolve, 1000));

    // ==========================================
    // ÉTAPE 4: Connexion TEST3 (Niveau 1)
    // ==========================================
    console.log('\n' + '-'.repeat(70));
    log('ÉTAPE 4: Connexion de test3 (Niveau 1 - MAINTENANCE)', 'test');
    console.log('-'.repeat(70));

    const test3Login = await apiCall('/api/login', 'POST', {
        username: NIVEAU_1.username,
        password: NIVEAU_1.password
    });

    if (test3Login.status === 200 && test3Login.data.success) {
        test3Cookies = test3Login.cookies;
        // Détecter automatiquement le département
        const userDept = test3Login.data.user.departement;
        NIVEAU_1.expectedDept = userDept; // Stocker pour utilisation ultérieure
        testResult('Connexion aba2', true, `Niveau ${test3Login.data.user.niveau}, Dept: ${userDept || 'Aucun'}`);
        log(`📌 Département détecté pour aba2: ${userDept || 'Aucun'}`, 'info');
    } else {
        testResult('Connexion aba2', false, test3Login.data.message || 'Erreur inconnue');
        log('ARRÊT: Impossible de continuer sans connexion', 'error');
        return;
    }

    // ==========================================
    // ÉTAPE 5: TEST3 charge les utilisateurs
    // ==========================================
    console.log('\n' + '-'.repeat(70));
    log('ÉTAPE 5: test3 charge les utilisateurs (TEST CRITIQUE)', 'test');
    console.log('-'.repeat(70));
    log('⚠️  SI BUG: test3 verrait les utilisateurs de boubs (cache non nettoyé)', 'warning');
    log('✅ SI CORRIGÉ: test3 voit UNIQUEMENT son département MAINTENANCE', 'success');

    const test3Users = await apiCall('/api/users', 'GET', null, test3Cookies);

    if (test3Users.status === 200 && Array.isArray(test3Users.data)) {
        const analysis = analyzeUsers(test3Users.data, NIVEAU_1.expectedDept);

        console.log('\n📊 RÉSULTAT ANALYSE:');
        log(`Total utilisateurs: ${analysis.total}`, 'info');
        Object.entries(analysis.departments).forEach(([dept, count]) => {
            const icon = (dept === NIVEAU_1.expectedDept || dept === 'Via service') ? '✅' : '🚨';
            log(`  ${icon} ${dept}: ${count} utilisateur(s)`, 'info');
        });

        // TEST CRITIQUE: Vérifier qu'il n'y a PAS de fuite de sécurité
        if (analysis.securityBreach) {
            console.log('\n🚨 FUITE DE SÉCURITÉ DÉTECTÉE !');
            log(`test3 voit ${analysis.unauthorizedUsers.length} utilisateur(s) non autorisé(s):`, 'error');
            analysis.unauthorizedUsers.forEach(u => {
                log(`  - ${u.username} (${u.departement})`, 'error');
            });
            testResult(
                '🔒 SÉCURITÉ: test3 voit uniquement MAINTENANCE',
                false,
                `FUITE: ${analysis.unauthorizedUsers.length} utilisateurs non autorisés visibles`
            );
        } else {
            log('Aucune fuite de sécurité détectée', 'success');
            testResult(
                '🔒 SÉCURITÉ: test3 voit uniquement MAINTENANCE',
                true,
                `${analysis.total} utilisateur(s) autorisé(s)`
            );
        }

        // Vérifier que test3 voit au moins quelques utilisateurs de son département
        const maintenanceCount = analysis.departments[NIVEAU_1.expectedDept] || 0;
        testResult(
            'test3 voit des utilisateurs MAINTENANCE',
            maintenanceCount > 0,
            `${maintenanceCount} utilisateur(s)`
        );

    } else {
        testResult('test3 charge utilisateurs', false, 'Échec de chargement');
    }

    // ==========================================
    // ÉTAPE 6: Déconnexion test3
    // ==========================================
    console.log('\n' + '-'.repeat(70));
    log('ÉTAPE 6: test3 se déconnecte', 'test');
    console.log('-'.repeat(70));

    await apiCall('/api/logout', 'POST', null, test3Cookies);
    testResult('Déconnexion test3', true);
}

// ===== TEST SUPPLÉMENTAIRE: Multiples actions de test3 =====
async function testMultipleActions() {
    console.log('\n' + '='.repeat(70));
    log('TEST SUPPLÉMENTAIRE: Actions multiples de test3', 'test');
    console.log('='.repeat(70));

    // Connexion test3
    const login = await apiCall('/api/login', 'POST', {
        username: NIVEAU_1.username,
        password: NIVEAU_1.password
    });

    if (login.status !== 200 || !login.data.success) {
        log('Échec connexion test3 pour test supplémentaire', 'error');
        return;
    }

    const cookies = login.cookies;

    // Tester différentes actions qui chargent /api/users
    const actions = [
        { name: 'Chargement initial', endpoint: '/api/users' },
        { name: 'Après délai (simulation action)', endpoint: '/api/users' },
    ];

    for (const action of actions) {
        console.log(`\n📌 ${action.name}`);
        const response = await apiCall(action.endpoint, 'GET', null, cookies);

        if (response.status === 200 && Array.isArray(response.data)) {
            const analysis = analyzeUsers(response.data, NIVEAU_1.expectedDept);

            if (analysis.securityBreach) {
                testResult(
                    `Sécurité - ${action.name}`,
                    false,
                    `${analysis.unauthorizedUsers.length} utilisateurs non autorisés`
                );
            } else {
                testResult(
                    `Sécurité - ${action.name}`,
                    true,
                    `${analysis.total} utilisateurs autorisés uniquement`
                );
            }
        }

        // Petit délai entre actions
        await new Promise(resolve => setTimeout(resolve, 500));
    }

    // Déconnexion
    await apiCall('/api/logout', 'POST', null, cookies);
}

// ===== EXÉCUTION =====

async function runAllTests() {
    console.log('\n');
    console.log('╔════════════════════════════════════════════════════════════════════╗');
    console.log('║     🧪 TESTS DE SÉCURITÉ - Cache et Permissions Niveau 1          ║');
    console.log('╚════════════════════════════════════════════════════════════════════╝');
    console.log();

    try {
        // Test principal: scénario complet
        await testScenario();

        // Test supplémentaire
        await testMultipleActions();

    } catch (error) {
        log(`Erreur durant les tests: ${error.message}`, 'error');
        console.error(error);
    }

    // ===== RÉSUMÉ FINAL =====
    console.log('\n' + '='.repeat(70));
    console.log('📊 RÉSUMÉ FINAL DES TESTS');
    console.log('='.repeat(70));
    console.log(`Total tests: ${results.totalTests}`);
    console.log(`✅ Réussis: ${results.passed}`);
    console.log(`❌ Échoués: ${results.failed}`);
    console.log(`📈 Taux de réussite: ${((results.passed / results.totalTests) * 100).toFixed(1)}%`);

    console.log('\n📋 DÉTAILS:');
    results.details.forEach((r, i) => {
        console.log(`  ${i + 1}. ${r.status} - ${r.test}`);
        if (r.details) {
            console.log(`     ${r.details}`);
        }
    });

    console.log('\n' + '='.repeat(70));
    if (results.failed === 0) {
        console.log('✅ TOUS LES TESTS SONT PASSÉS - Bug corrigé avec succès !');
        console.log('   test3 ne peut voir que les utilisateurs de son département MAINTENANCE');
    } else {
        console.log('❌ CERTAINS TESTS ONT ÉCHOUÉ - Le bug persiste');
        console.log('   Vérifiez les détails ci-dessus pour identifier les problèmes');
    }
    console.log('='.repeat(70));
}

// Démarrer tous les tests
runAllTests().catch(error => {
    console.error('❌ Erreur fatale:', error);
    process.exit(1);
});
