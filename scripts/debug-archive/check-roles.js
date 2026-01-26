const { MongoClient } = require('mongodb');

async function checkRoles() {
    const client = new MongoClient('mongodb://localhost:27017');

    try {
        await client.connect();
        const db = client.db('cerer_archivage');

        console.log('\n========== ROLES ==========');
        const roles = await db.collection('roles').find().toArray();
        roles.forEach(role => {
            console.log(`- ${role.nomRole}: Niveau ${role.niveau}`);
        });

        console.log('\n========== UTILISATEURS (avec rôles) ==========');
        const users = await db.collection('users').find().limit(10).toArray();

        for (const user of users) {
            const role = await db.collection('roles').findOne({ _id: user.idRole });
            console.log(`- ${user.username}: ${role ? role.nomRole : 'Pas de rôle'} (Niveau ${role ? role.niveau : '?'})`);
        }

    } catch (error) {
        console.error('Erreur:', error);
    } finally {
        await client.close();
    }
}

checkRoles();
