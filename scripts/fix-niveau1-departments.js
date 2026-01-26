const { MongoClient } = require('mongodb');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const DB_NAME = 'cerer_archivage';

async function fixNiveau1Departments() {
    const client = new MongoClient(MONGODB_URI);

    try {
        await client.connect();
        console.log('✅ Connecté à MongoDB\n');

        const db = client.db(DB_NAME);
        const usersCollection = db.collection('users');
        const rolesCollection = db.collection('roles');
        const departementsCollection = db.collection('departements');

        // 1. Récupérer les départements existants
        console.log('📋 DÉPARTEMENTS DISPONIBLES :');
        console.log('='.repeat(60));
        const departments = await departementsCollection.find({}).toArray();
        departments.forEach((dept, index) => {
            console.log(`${index + 1}. ${dept.nom} (ID: ${dept._id})`);
        });

        // 2. Récupérer le rôle niveau 1
        const niveau1Role = await rolesCollection.findOne({ niveau: 1 });
        if (!niveau1Role) {
            console.error('❌ Rôle niveau 1 introuvable');
            return;
        }

        // 3. Trouver les utilisateurs niveau 1 sans département
        console.log('\n📊 UTILISATEURS NIVEAU 1 SANS DÉPARTEMENT :');
        console.log('='.repeat(60));
        const niveau1WithoutDept = await usersCollection.find({
            idRole: niveau1Role._id,
            idDepartement: { $exists: false }
        }).toArray();

        const niveau1WithoutDept2 = await usersCollection.find({
            idRole: niveau1Role._id,
            idDepartement: null
        }).toArray();

        const usersToFix = [...niveau1WithoutDept, ...niveau1WithoutDept2];

        if (usersToFix.length === 0) {
            console.log('✅ Tous les utilisateurs niveau 1 ont déjà un département assigné !');

            // Afficher la répartition actuelle
            console.log('\n📊 RÉPARTITION ACTUELLE DES NIVEAU 1 :');
            console.log('='.repeat(60));
            const allNiveau1 = await usersCollection.find({ idRole: niveau1Role._id }).toArray();
            for (const user of allNiveau1) {
                const dept = await departementsCollection.findOne({ _id: user.idDepartement });
                console.log(`• ${user.nom} (@${user.username}) → ${dept ? dept.nom : 'AUCUN'}`);
            }
            return;
        }

        console.log(`Trouvé ${usersToFix.length} utilisateur(s) à corriger :\n`);
        usersToFix.forEach(user => {
            console.log(`• ${user.nom} (@${user.username})`);
        });

        // 4. Assignation automatique basée sur la logique métier
        console.log('\n🔧 ASSIGNATION DES DÉPARTEMENTS :');
        console.log('='.repeat(60));

        // Récupérer les IDs des départements
        const directionDept = departments.find(d => d.nom === 'DIRECTION');
        const informatiqueDept = departments.find(d => d.nom === 'INFORMATIQUE');

        for (const user of usersToFix) {
            let assignedDept;

            // Logique d'assignation basée sur le username
            if (user.username === 'jbk') {
                // JBK → INFORMATIQUE (il semble être un profil technique)
                assignedDept = informatiqueDept;
            } else if (user.username === 'babs') {
                // BABS → DIRECTION (par défaut, administrateur général)
                assignedDept = directionDept;
            } else {
                // Par défaut → DIRECTION
                assignedDept = directionDept;
            }

            if (!assignedDept) {
                console.log(`⚠️ Impossible d'assigner un département à ${user.username}`);
                continue;
            }

            // Mettre à jour l'utilisateur
            const result = await usersCollection.updateOne(
                { _id: user._id },
                { $set: { idDepartement: assignedDept._id } }
            );

            if (result.modifiedCount > 0) {
                console.log(`✅ ${user.nom} (@${user.username}) → ${assignedDept.nom}`);
            } else {
                console.log(`⚠️ Échec pour ${user.username}`);
            }
        }

        // 5. Vérification finale
        console.log('\n📊 VÉRIFICATION FINALE :');
        console.log('='.repeat(60));
        const allNiveau1 = await usersCollection.find({ idRole: niveau1Role._id }).toArray();

        console.log(`\nTotal utilisateurs niveau 1 : ${allNiveau1.length}`);

        const withDept = [];
        const withoutDept = [];

        for (const user of allNiveau1) {
            const dept = await departementsCollection.findOne({ _id: user.idDepartement });
            if (dept) {
                withDept.push({ user, dept });
            } else {
                withoutDept.push(user);
            }
        }

        console.log(`✅ Avec département : ${withDept.length}`);
        console.log(`❌ Sans département : ${withoutDept.length}`);

        console.log('\nRépartition détaillée :');
        withDept.forEach(({ user, dept }) => {
            console.log(`  ✅ ${user.nom} (@${user.username}) → ${dept.nom}`);
        });

        if (withoutDept.length > 0) {
            console.log('\nUtilisateurs encore sans département :');
            withoutDept.forEach(user => {
                console.log(`  ❌ ${user.nom} (@${user.username})`);
            });
        }

        console.log('\n' + '='.repeat(60));
        if (withoutDept.length === 0) {
            console.log('🎉 CORRECTION RÉUSSIE ! Tous les niveau 1 ont un département.');
        } else {
            console.log('⚠️ Certains utilisateurs n\'ont toujours pas de département.');
        }

    } catch (error) {
        console.error('❌ Erreur :', error);
    } finally {
        await client.close();
    }
}

fixNiveau1Departments();
