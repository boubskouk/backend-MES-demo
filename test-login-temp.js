const fetch = require('node-fetch');

async function testLogin() {
    try {
        console.log('🔐 Test de connexion avec kinzo / 1234...\n');

        const response = await fetch('http://localhost:4000/api/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                username: 'kinzo',
                password: '1234'
            })
        });

        console.log('Status:', response.status, response.statusText);

        const data = await response.json();
        console.log('\n📦 Réponse du serveur:');
        console.log(JSON.stringify(data, null, 2));

        if (data.success && data.user) {
            console.log('\n✅ Connexion réussie!');
            console.log('   firstLogin:', data.user.firstLogin);
            console.log('   mustChangePassword:', data.user.mustChangePassword);
        } else {
            console.log('\n❌ Connexion échouée');
        }

    } catch (error) {
        console.error('❌ Erreur:', error.message);
    }
}

testLogin();
