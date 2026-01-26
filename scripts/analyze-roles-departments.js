const { MongoClient } = require('mongodb');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const DB_NAME = 'cerer_archivage';

async function analyzeRolesDepartments() {
    const client = new MongoClient(MONGODB_URI);

    try {
        await client.connect();
        console.log('Connecte a MongoDB\n');

        const db = client.db(DB_NAME);
        const usersCollection = db.collection('users');
        const rolesCollection = db.collection('roles');
        const departementsCollection = db.collection('departements');

        // 1. Lister tous les roles
        console.log('='.repeat(80));
        console.log('ROLES DEFINIS DANS LE SYSTEME');
        console.log('='.repeat(80));

        const roles = await rolesCollection.find({}).sort({ niveau: 1 }).toArray();
        roles.forEach(role => {
            console.log(`\nNiveau ${role.niveau} - ${role.nom}`);
            console.log(`  Description: ${role.description || 'N/A'}`);
        });

        // 2. Analyser les utilisateurs par niveau
        console.log('\n\n' + '='.repeat(80));
        console.log('ANALYSE DES UTILISATEURS PAR NIVEAU');
        console.log('='.repeat(80));

        for (const role of roles) {
            const usersWithRole = await usersCollection.find({ idRole: role._id }).toArray();
            const usersWithDept = usersWithRole.filter(u => u.idDepartement);
            const usersWithoutDept = usersWithRole.filter(u => !u.idDepartement);

            console.log(`\n--- Niveau ${role.niveau}: ${role.nom} ---`);
            console.log(`Total utilisateurs: ${usersWithRole.length}`);
            console.log(`Avec departement: ${usersWithDept.length}`);
            console.log(`Sans departement: ${usersWithoutDept.length}`);

            if (usersWithRole.length > 0) {
                console.log(`\nExemples:`);
                for (let i = 0; i < Math.min(3, usersWithRole.length); i++) {
                    const user = usersWithRole[i];
                    let deptName = 'AUCUN';
                    if (user.idDepartement) {
                        const dept = await departementsCollection.findOne({ _id: user.idDepartement });
                        deptName = dept ? dept.nom : 'Departement supprime';
                    }
                    console.log(`  - ${user.nom} (@${user.username}) => Dept: ${deptName}`);
                }
            }
        }

        // 3. Lister les departements
        console.log('\n\n' + '='.repeat(80));
        console.log('DEPARTEMENTS EXISTANTS');
        console.log('='.repeat(80));

        const departements = await departementsCollection.find({}).toArray();
        console.log(`\nTotal departements: ${departements.length}\n`);

        for (const dept of departements) {
            const userCount = await usersCollection.countDocuments({ idDepartement: dept._id });
            console.log(`- ${dept.nom} (ID: ${dept._id}) => ${userCount} utilisateur(s)`);
        }

        // 4. Analyser la logique metier pour niveau 1
        console.log('\n\n' + '='.repeat(80));
        console.log('ANALYSE DE LA LOGIQUE METIER POUR NIVEAU 1');
        console.log('='.repeat(80));

        const level1Role = roles.find(r => r.niveau === 1);
        if (level1Role) {
            const level1Users = await usersCollection.find({ idRole: level1Role._id }).toArray();

            console.log(`\nUtilisateurs Niveau 1 (${level1Role.nom}):`);
            console.log(`Total: ${level1Users.length}`);

            const withDept = level1Users.filter(u => u.idDepartement);
            const withoutDept = level1Users.filter(u => !u.idDepartement);

            console.log(`\nRepartition:`);
            console.log(`  - Avec departement: ${withDept.length} (${((withDept.length / level1Users.length) * 100).toFixed(1)}%)`);
            console.log(`  - Sans departement: ${withoutDept.length} (${((withoutDept.length / level1Users.length) * 100).toFixed(1)}%)`);

            if (withDept.length > 0) {
                console.log(`\nUtilisateurs niveau 1 AVEC departement:`);
                withDept.forEach(async user => {
                    const dept = await departementsCollection.findOne({ _id: user.idDepartement });
                    console.log(`  - ${user.nom} => ${dept ? dept.nom : 'Dept inconnu'}`);
                });
            }

            if (withoutDept.length > 0) {
                console.log(`\nUtilisateurs niveau 1 SANS departement:`);
                withoutDept.forEach(user => {
                    console.log(`  - ${user.nom} (@${user.username})`);
                });
            }
        }

        console.log('\n\n' + '='.repeat(80));
        console.log('ANALYSE TERMINEE');
        console.log('='.repeat(80));

    } catch (error) {
        console.error('Erreur:', error);
    } finally {
        await client.close();
    }
}

analyzeRolesDepartments();
