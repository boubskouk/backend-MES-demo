/**
 * Script pour assigner un département aux utilisateurs niveau 1 qui n'en ont pas
 * Usage: node scripts/fix-niveau1-missing-departments.js
 */

const { MongoClient, ObjectId } = require('mongodb');
const readline = require('readline');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const DB_NAME = 'cerer_archivage';

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

function question(query) {
    return new Promise(resolve => rl.question(query, resolve));
}

async function fixMissingDepartments() {
    const client = new MongoClient(MONGODB_URI);

    try {
        await client.connect();
        console.log('✅ Connecté à MongoDB');

        const db = client.db(DB_NAME);
        const usersCollection = db.collection('users');
        const rolesCollection = db.collection('roles');
        const departementsCollection = db.collection('departements');

        // 1. Trouver tous les départements disponibles
        const departements = await departementsCollection.find({}).toArray();
        console.log(`\n📋 Départements disponibles:`);
        departements.forEach((dept, index) => {
            console.log(`   ${index + 1}. ${dept.nom} (ID: ${dept._id})`);
        });

        // 2. Trouver tous les utilisateurs niveau 1 sans département
        const allUsers = await usersCollection.find({}).toArray();
        let niveau1SansDept = [];

        for (const user of allUsers) {
            const roleId = typeof user.idRole === 'string'
                ? new ObjectId(user.idRole)
                : user.idRole;

            const role = await rolesCollection.findOne({ _id: roleId });

            if (role && role.niveau === 1 && !user.idDepartement) {
                niveau1SansDept.push(user);
            }
        }

        if (niveau1SansDept.length === 0) {
            console.log(`\n✅ Tous les utilisateurs niveau 1 ont déjà un département`);
            rl.close();
            return;
        }

        console.log(`\n⚠️ ${niveau1SansDept.length} utilisateur(s) niveau 1 sans département trouvé(s):`);
        niveau1SansDept.forEach(u => console.log(`   - ${u.username} (${u.nom})`));

        // 3. Pour chaque utilisateur sans département, demander quel département assigner
        for (const user of niveau1SansDept) {
            console.log(`\n\n👤 Utilisateur: ${user.username} (${user.nom})`);
            console.log(`   Email: ${user.email}`);

            const choix = await question(`\nChoisissez un département (1-${departements.length}) ou 0 pour passer: `);
            const index = parseInt(choix) - 1;

            if (index >= 0 && index < departements.length) {
                const dept = departements[index];

                // Mettre à jour l'utilisateur
                await usersCollection.updateOne(
                    { _id: user._id },
                    { $set: { idDepartement: dept._id } }
                );

                console.log(`   ✅ Département "${dept.nom}" assigné à ${user.username}`);
            } else if (choix === '0') {
                console.log(`   ⏭️ Utilisateur ${user.username} passé`);
            } else {
                console.log(`   ❌ Choix invalide - utilisateur ${user.username} passé`);
            }
        }

        console.log(`\n✅ Traitement terminé`);

        // 4. Vérification finale
        console.log(`\n🔍 Vérification finale...`);
        const remainingWithoutDept = [];

        for (const user of allUsers) {
            const roleId = typeof user.idRole === 'string'
                ? new ObjectId(user.idRole)
                : user.idRole;

            const role = await rolesCollection.findOne({ _id: roleId });
            const updatedUser = await usersCollection.findOne({ _id: user._id });

            if (role && role.niveau === 1 && !updatedUser.idDepartement) {
                remainingWithoutDept.push(updatedUser.username);
            }
        }

        if (remainingWithoutDept.length === 0) {
            console.log(`✅ Tous les utilisateurs niveau 1 ont maintenant un département`);
        } else {
            console.log(`⚠️ Il reste ${remainingWithoutDept.length} utilisateur(s) sans département:`);
            remainingWithoutDept.forEach(u => console.log(`   - ${u}`));
        }

    } catch (error) {
        console.error('❌ Erreur:', error);
    } finally {
        await client.close();
        rl.close();
        console.log('\n👋 Déconnecté de MongoDB');
    }
}

fixMissingDepartments();
