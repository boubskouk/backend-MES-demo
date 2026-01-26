// Test rapide de connexion Super Admin

const fetch = require('node-fetch');

async function testLogin() {
    try {
        console.log('🧪 Test de connexion Super Admin...\n');

        // Test 1: Connexion
        console.log('1️⃣ Test de connexion...');
        const loginResponse = await fetch('http://localhost:4000/api/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                username: 'boubs',
                password: 'passer@123'  // Vous devez remplacer par le vrai mot de passe
            })
        });

        const loginData = await loginResponse.json();
        console.log('Réponse login:', JSON.stringify(loginData, null, 2));

        if (loginData.success) {
            console.log('✅ Connexion réussie !');
            console.log('   Niveau:', loginData.user.niveau);
            console.log('   Rôle:', loginData.user.role);
            console.log('');

            // Récupérer le cookie de session
            const cookies = loginResponse.headers.get('set-cookie');
            console.log('Cookies:', cookies);

        } else {
            console.log('❌ Connexion échouée:', loginData.message);
        }

    } catch (error) {
        console.error('❌ Erreur:', error.message);
    }
}

testLogin();
