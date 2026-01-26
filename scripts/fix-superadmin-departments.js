const { MongoClient } = require('mongodb');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const DB_NAME = 'cerer_archivage';

async function fixSuperAdminDepartments() {
    const client = new MongoClient(MONGODB_URI);

    try {
        await client.connect();
        console.log('✅ Connecté à MongoDB\n');

        const db = client.db(DB_NAME);
        const usersCollection = db.collection('users');
        const rolesCollection = db.collection('roles');
        const departementsCollection = db.collection('departements');

        // 1. Récupérer le rôle niveau 0 (Super Admin)
        const niveau0Role = await rolesCollection.findOne({ niveau: 0 });
        if (!niveau0Role) {
            console.error('❌ Rôle niveau 0 (Super Admin) introuvable');
            return;
        }

        console.log('📊 ANALYSE DES SUPER ADMINS (NIVEAU 0) :');
        console.log('='.repeat(60));

        // 2. Trouver tous les Super Admins
        const superAdmins = await usersCollection.find({
            idRole: niveau0Role._id
        }).toArray();

        console.log(`Total Super Admins : ${superAdmins.length}\n`);

        // 3. Analyser chaque Super Admin
        const withDept = [];
        const withoutDept = [];

        for (const user of superAdmins) {
            const dept = await departementsCollection.findOne({ _id: user.idDepartement });

            if (user.idDepartement) {
                withDept.push({ user, dept });
                console.log(`⚠️  ${user.nom} (@${user.username}) → ${dept ? dept.nom : 'Département supprimé'}`);
            } else {
                withoutDept.push(user);
                console.log(`✅ ${user.nom} (@${user.username}) → AUCUN (correct)`);
            }
        }

        console.log('\n' + '='.repeat(60));
        console.log(`Super Admins AVEC département : ${withDept.length} ⚠️  (devrait être 0)`);
        console.log(`Super Admins SANS département : ${withoutDept.length} ✅ (correct)`);

        // 4. Proposer la correction
        if (withDept.length > 0) {
            console.log('\n🔧 CORRECTION NÉCESSAIRE :');
            console.log('='.repeat(60));
            console.log('Les Super Admins ne devraient PAS avoir de département.');
            console.log('Ils supervisent TOUS les départements.\n');

            console.log('Action : Retirer le département des Super Admins suivants :');
            withDept.forEach(({ user, dept }) => {
                console.log(`  • ${user.nom} (@${user.username}) → Retirer "${dept ? dept.nom : 'N/A'}"`);
            });

            console.log('\nApplication de la correction...\n');

            // Retirer le département de tous les Super Admins
            for (const { user } of withDept) {
                const result = await usersCollection.updateOne(
                    { _id: user._id },
                    { $unset: { idDepartement: "" } }
                );

                if (result.modifiedCount > 0) {
                    console.log(`✅ Département retiré pour ${user.nom} (@${user.username})`);
                } else {
                    console.log(`⚠️  Échec pour ${user.nom} (@${user.username})`);
                }
            }
        } else {
            console.log('\n✅ AUCUNE CORRECTION NÉCESSAIRE');
            console.log('Tous les Super Admins sont correctement configurés (sans département).');
        }

        // 5. Vérification finale
        console.log('\n📊 VÉRIFICATION FINALE :');
        console.log('='.repeat(60));

        const finalSuperAdmins = await usersCollection.find({
            idRole: niveau0Role._id
        }).toArray();

        let allCorrect = true;
        for (const user of finalSuperAdmins) {
            if (user.idDepartement) {
                const dept = await departementsCollection.findOne({ _id: user.idDepartement });
                console.log(`❌ ${user.nom} (@${user.username}) → ${dept ? dept.nom : 'N/A'} (incorrect)`);
                allCorrect = false;
            } else {
                console.log(`✅ ${user.nom} (@${user.username}) → AUCUN département (correct)`);
            }
        }

        console.log('\n' + '='.repeat(60));
        if (allCorrect) {
            console.log('🎉 PARFAIT ! Tous les Super Admins sont sans département.');
            console.log('   Ils peuvent superviser tous les départements.');
        } else {
            console.log('⚠️  Certains Super Admins ont encore un département assigné.');
        }

        // 6. Résumé de l'architecture
        console.log('\n📐 ARCHITECTURE FINALE DES RÔLES :');
        console.log('='.repeat(60));

        const allRoles = await rolesCollection.find({}).sort({ niveau: 1 }).toArray();

        for (const role of allRoles) {
            const users = await usersCollection.find({ idRole: role._id }).toArray();
            const usersWithDept = users.filter(u => u.idDepartement).length;
            const usersWithoutDept = users.filter(u => !u.idDepartement).length;

            const deptRequired = role.niveau >= 1 ? '✅ REQUIS' : '❌ NON REQUIS';
            const status = role.niveau === 0
                ? (usersWithoutDept === users.length ? '✅' : '⚠️ ')
                : (usersWithDept === users.length ? '✅' : '⚠️ ');

            console.log(`\n${status} Niveau ${role.niveau} - ${role.nom}`);
            console.log(`   Total : ${users.length} utilisateur(s)`);
            console.log(`   Avec département : ${usersWithDept}`);
            console.log(`   Sans département : ${usersWithoutDept}`);
            console.log(`   Département : ${deptRequired}`);
        }

        console.log('\n' + '='.repeat(60));

    } catch (error) {
        console.error('❌ Erreur :', error);
    } finally {
        await client.close();
    }
}

fixSuperAdminDepartments();
