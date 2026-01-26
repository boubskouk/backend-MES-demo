// ============================================
// SCRIPT DE TEST - GESTION DES UTILISATEURS
// Test étape par étape pour identifier le problème
// ============================================

console.log('🔍 DEBUT DES TESTS - GESTION DES UTILISATEURS');
console.log('='.repeat(60));

// Test 1: Vérifier que le script est chargé
console.log('\n✅ Test 1: Script chargé avec succès');

// Test 2: Vérifier si les fonctions sont exposées globalement
console.log('\n📋 Test 2: Vérification des fonctions globales');

const expectedFunctions = [
    'deleteUser',
    'startEditUser',
    'cancelEditUser',
    'saveEditUser',
    'resetUserPassword',
    'addRole',
    'deleteRole',
    'startEditRole',
    'cancelEditRole',
    'saveEditRole',
    'renderUsersManagement',
    'renderRolesManagement',
    'renderAdvancedStats'
];

expectedFunctions.forEach(funcName => {
    if (typeof window[funcName] === 'function') {
        console.log(`  ✅ ${funcName} : Disponible`);
    } else {
        console.error(`  ❌ ${funcName} : NON DISPONIBLE`);
    }
});

// Test 3: Vérifier l'état de l'application
console.log('\n📋 Test 3: Vérification de l\'état (state)');
if (typeof state !== 'undefined') {
    console.log('  ✅ state existe');
    console.log('  📊 state.showUsersManagement:', state.showUsersManagement);
    console.log('  📊 state.allUsersForManagement:', state.allUsersForManagement?.length || 0, 'utilisateurs');
    console.log('  📊 state.currentUser:', state.currentUser);
    console.log('  📊 state.currentUserInfo:', state.currentUserInfo);
} else {
    console.error('  ❌ state n\'existe pas');
}

// Test 4: Fonction de test manuel pour toggleUsersManagement
console.log('\n📋 Test 4: Test de toggleUsersManagement');
if (typeof toggleUsersManagement === 'function') {
    console.log('  ✅ toggleUsersManagement disponible');
    console.log('  💡 Pour tester: Exécutez "toggleUsersManagement()" dans la console');
} else {
    console.error('  ❌ toggleUsersManagement NON disponible');
}

// Test 5: Simuler l'appel d'une fonction (startEditUser par exemple)
console.log('\n📋 Test 5: Test d\'appel de fonction simulé');
window.testStartEditUser = function(username) {
    console.log(`  🔧 Appel de startEditUser avec username: "${username}"`);
    try {
        if (typeof window.startEditUser === 'function') {
            console.log('  ✅ La fonction existe, tentative d\'appel...');
            // Ne pas vraiment appeler pour éviter les effets de bord
            console.log('  ℹ️  Pour tester réellement, appelez: window.startEditUser("test")');
        } else {
            console.error('  ❌ La fonction n\'existe pas');
        }
    } catch (error) {
        console.error('  ❌ Erreur lors du test:', error);
    }
};

// Test 6: Vérifier si render() existe
console.log('\n📋 Test 6: Vérification de la fonction render');
if (typeof render === 'function') {
    console.log('  ✅ render() disponible');
} else {
    console.error('  ❌ render() NON disponible');
}

// Test 7: Vérifier si apiCall existe
console.log('\n📋 Test 7: Vérification de apiCall');
if (typeof apiCall === 'function') {
    console.log('  ✅ apiCall() disponible');
} else {
    console.error('  ❌ apiCall() NON disponible');
}

// Test 8: Créer une fonction de test pour les boutons
console.log('\n📋 Test 8: Installation du gestionnaire de test des boutons');
window.testButtonClick = function() {
    console.log('\n🖱️  TEST MANUEL DES BOUTONS:');
    console.log('  1. Ouvrez la fenêtre "Gérer utilisateurs"');
    console.log('  2. Ouvrez la console (F12)');
    console.log('  3. Vérifiez si des erreurs apparaissent quand vous cliquez sur un bouton');
    console.log('  4. Si aucune erreur, vérifiez que la fonction est bien appelée');

    // Installer un listener pour capturer tous les clics
    document.addEventListener('click', function(e) {
        const target = e.target;
        if (target.tagName === 'BUTTON') {
            console.log('  🖱️  Bouton cliqué:', {
                texte: target.textContent.trim(),
                onclick: target.getAttribute('onclick'),
                classes: target.className
            });
        }
    }, true); // true pour capturer en phase de capture

    console.log('  ✅ Listener installé pour tracer les clics sur les boutons');
};

// Test 9: Vérifier les rôles et départements
console.log('\n📋 Test 9: Vérification des rôles et départements');
if (typeof state !== 'undefined') {
    console.log('  📊 Rôles disponibles:', state.roles?.length || 0);
    console.log('  📊 Départements disponibles:', state.departements?.length || 0);
} else {
    console.error('  ❌ Impossible de vérifier (state n\'existe pas)');
}

// Test 10: Instructions finales
console.log('\n' + '='.repeat(60));
console.log('📋 INSTRUCTIONS DE TEST MANUEL:');
console.log('='.repeat(60));
console.log('\n1️⃣  Vérifiez les erreurs ci-dessus');
console.log('2️⃣  Ouvrez la gestion des utilisateurs');
console.log('3️⃣  Exécutez: window.testButtonClick()');
console.log('4️⃣  Cliquez sur un bouton et observez la console');
console.log('5️⃣  Testez directement: window.startEditUser("test")');
console.log('6️⃣  Si ça ne marche pas, vérifiez:');
console.log('     - Les fichiers JS sont-ils bien chargés?');
console.log('     - Y a-t-il des erreurs dans la console avant ce test?');
console.log('     - state.allUsersForManagement contient-il des données?');
console.log('\n' + '='.repeat(60));

// Fonction helper pour débugger l'état complet
window.debugUserManagement = function() {
    console.log('\n🔍 DEBUG COMPLET:');
    console.log('State complet:', state);
    console.log('Utilisateurs:', state.allUsersForManagement);
    console.log('showUsersManagement:', state.showUsersManagement);
    console.log('Fonctions disponibles:', {
        deleteUser: typeof window.deleteUser,
        startEditUser: typeof window.startEditUser,
        saveEditUser: typeof window.saveEditUser,
        toggleUsersManagement: typeof window.toggleUsersManagement
    });
};

console.log('\n💡 COMMANDES UTILES:');
console.log('  - window.testButtonClick()     : Tracer les clics sur les boutons');
console.log('  - window.debugUserManagement() : Afficher l\'état complet');
console.log('  - toggleUsersManagement()      : Ouvrir/fermer la gestion');
console.log('\n🔍 FIN DES TESTS - Vérifiez les résultats ci-dessus\n');
