#!/usr/bin/env node

/**
 * Script de diagnostic Super Admin
 */

async function diagnostic() {
    console.log('\n╔════════════════════════════════════════════════════════╗');
    console.log('║  DIAGNOSTIC SUPER ADMIN                               ║');
    console.log('╚════════════════════════════════════════════════════════╝\n');

    const tests = [];

    // Test 1: Serveur répond
    console.log('1️⃣ Test: Le serveur répond...');
    try {
        const response = await fetch('http://localhost:4000');
        if (response.ok) {
            tests.push({ name: 'Serveur répond', status: '✅' });
            console.log('   ✅ Le serveur répond sur http://localhost:4000\n');
        } else {
            tests.push({ name: 'Serveur répond', status: '❌' });
            console.log(`   ❌ Le serveur répond avec le code ${response.status}\n`);
        }
    } catch (error) {
        tests.push({ name: 'Serveur répond', status: '❌' });
        console.log('   ❌ Le serveur ne répond pas');
        console.log('   💡 Assurez-vous que le serveur est démarré avec: node server.js\n');
    }

    // Test 2: Page de login accessible
    console.log('2️⃣ Test: Page de login accessible...');
    try {
        const response = await fetch('http://localhost:4000/super-admin-login.html');
        if (response.ok) {
            tests.push({ name: 'Page login', status: '✅' });
            console.log('   ✅ Page de login accessible\n');
        } else {
            tests.push({ name: 'Page login', status: '❌' });
            console.log(`   ❌ Page de login retourne le code ${response.status}\n`);
        }
    } catch (error) {
        tests.push({ name: 'Page login', status: '❌' });
        console.log('   ❌ Erreur d\'accès à la page de login:', error.message, '\n');
    }

    // Test 3: Dashboard accessible (devrait rediriger)
    console.log('3️⃣ Test: Dashboard accessible...');
    try {
        const response = await fetch('http://localhost:4000/super-admin.html');
        if (response.ok) {
            tests.push({ name: 'Dashboard', status: '✅' });
            console.log('   ✅ Dashboard accessible\n');
        } else {
            tests.push({ name: 'Dashboard', status: '❌' });
            console.log(`   ❌ Dashboard retourne le code ${response.status}\n`);
        }
    } catch (error) {
        tests.push({ name: 'Dashboard', status: '❌' });
        console.log('   ❌ Erreur d\'accès au dashboard:', error.message, '\n');
    }

    // Test 4: API de login répond (sans authentification)
    console.log('4️⃣ Test: API de login répond...');
    try {
        const response = await fetch('http://localhost:4000/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: '', password: '' })
        });
        const data = await response.json();

        if (data.message === 'Username et password requis') {
            tests.push({ name: 'API login', status: '✅' });
            console.log('   ✅ API de login répond correctement\n');
        } else {
            tests.push({ name: 'API login', status: '⚠️' });
            console.log('   ⚠️ API de login répond mais avec un message inattendu:', data.message, '\n');
        }
    } catch (error) {
        tests.push({ name: 'API login', status: '❌' });
        console.log('   ❌ Erreur API de login:', error.message, '\n');
    }

    // Test 5: API Super Admin répond (sans authentification - devrait refuser)
    console.log('5️⃣ Test: API Super Admin répond...');
    try {
        const response = await fetch('http://localhost:4000/api/superadmin/test');
        const data = await response.json();

        if (response.status === 401 || response.status === 403) {
            tests.push({ name: 'API Super Admin', status: '✅' });
            console.log('   ✅ API Super Admin sécurisée (refuse accès non authentifié)\n');
        } else if (response.ok) {
            tests.push({ name: 'API Super Admin', status: '⚠️' });
            console.log('   ⚠️ API Super Admin accessible sans authentification (problème de sécurité!)\n');
        }
    } catch (error) {
        tests.push({ name: 'API Super Admin', status: '❌' });
        console.log('   ❌ Erreur API Super Admin:', error.message, '\n');
    }

    // Résumé
    console.log('╔════════════════════════════════════════════════════════╗');
    console.log('║  RÉSUMÉ DES TESTS                                     ║');
    console.log('╚════════════════════════════════════════════════════════╝\n');

    tests.forEach(test => {
        console.log(`${test.status} ${test.name}`);
    });

    const allOk = tests.every(t => t.status === '✅');

    console.log('');
    if (allOk) {
        console.log('✅ Tous les tests sont OK !');
        console.log('');
        console.log('📝 Instructions de connexion:');
        console.log('   1. Ouvrez: http://localhost:4000/super-admin-login.html');
        console.log('   2. Entrez votre username: boubs');
        console.log('   3. Entrez votre mot de passe');
        console.log('   4. Cliquez sur "Se connecter"');
        console.log('');
    } else {
        console.log('⚠️ Certains tests ont échoué');
        console.log('');
        console.log('💡 Solutions possibles:');
        console.log('   - Vérifiez que le serveur est démarré: node server.js');
        console.log('   - Vérifiez que MongoDB est en cours d\'exécution');
        console.log('   - Vérifiez les logs du serveur pour des erreurs');
        console.log('');
    }
}

// Utiliser le fetch natif ou installer node-fetch
const fetch = globalThis.fetch || require('node-fetch');

diagnostic().catch(console.error);
