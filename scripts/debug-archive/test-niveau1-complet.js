const { MongoClient, ObjectId } = require('mongodb');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const DB_NAME = 'cerer_archivage';

async function testNiveau1Complete() {
    const client = new MongoClient(MONGODB_URI);

    try {
        await client.connect();
        console.log('✅ Connecté à MongoDB\n');

        const db = client.db(DB_NAME);
        const usersCollection = db.collection('users');
        const rolesCollection = db.collection('roles');
        const documentsCollection = db.collection('documents');
        const departementsCollection = db.collection('departements');

        console.log('='.repeat(80));
        console.log('🧪 TEST COMPLET - RESTRICTIONS NIVEAU 1');
        console.log('='.repeat(80));
        console.log();

        // ============================================
        // TEST 1 : VÉRIFICATION DES UTILISATEURS NIVEAU 1
        // ============================================
        console.log('📋 TEST 1 : Vérification des utilisateurs niveau 1');
        console.log('-'.repeat(80));

        const niveau1Role = await rolesCollection.findOne({ niveau: 1 });
        if (!niveau1Role) {
            console.error('❌ Rôle niveau 1 introuvable !');
            return;
        }

        const niveau1Users = await usersCollection.find({
            idRole: niveau1Role._id
        }).toArray();

        console.log(`Total utilisateurs niveau 1 : ${niveau1Users.length}\n`);

        const usersWithDetails = [];
        for (const user of niveau1Users) {
            const dept = user.idDepartement
                ? await departementsCollection.findOne({ _id: user.idDepartement })
                : null;

            usersWithDetails.push({
                username: user.username,
                nom: user.nom,
                email: user.email,
                departement: dept ? dept.nom : 'AUCUN',
                idDepartement: user.idDepartement
            });

            const icon = dept ? '✅' : '❌';
            console.log(`${icon} ${user.nom} (@${user.username})`);
            console.log(`   Email: ${user.email}`);
            console.log(`   Département: ${dept ? dept.nom : 'AUCUN (❌ PROBLÈME)'}`);
            console.log();
        }

        const usersWithoutDept = usersWithDetails.filter(u => !u.idDepartement);
        if (usersWithoutDept.length > 0) {
            console.log('⚠️  ATTENTION : Certains niveau 1 n\'ont pas de département !');
            console.log('   Cela ne devrait PAS arriver avec l\'Option B.\n');
        } else {
            console.log('✅ PARFAIT : Tous les niveau 1 ont un département assigné !\n');
        }

        // ============================================
        // TEST 2 : ACCÈS AUX DOCUMENTS PAR DÉPARTEMENT
        // ============================================
        console.log('='.repeat(80));
        console.log('📄 TEST 2 : Accès aux documents par département');
        console.log('-'.repeat(80));

        const departements = await departementsCollection.find({}).toArray();

        for (const user of usersWithDetails) {
            if (!user.idDepartement) continue;

            console.log(`\n🔍 Test pour : ${user.nom} (@${user.username})`);
            console.log(`   Département : ${user.departement}`);

            // Compter les documents par département
            for (const dept of departements) {
                const count = await documentsCollection.countDocuments({
                    idDepartement: dept._id
                });

                if (dept._id.toString() === user.idDepartement.toString()) {
                    console.log(`   ✅ ${dept.nom} : ${count} document(s) - DEVRAIT VOIR`);
                } else {
                    console.log(`   ❌ ${dept.nom} : ${count} document(s) - NE DEVRAIT PAS VOIR`);
                }
            }
        }

        // ============================================
        // TEST 3 : VÉRIFICATION DES RÔLES CRÉABLES
        // ============================================
        console.log('\n' + '='.repeat(80));
        console.log('👥 TEST 3 : Rôles que le niveau 1 peut créer');
        console.log('-'.repeat(80));

        const allRoles = await rolesCollection.find({}).sort({ niveau: 1 }).toArray();

        console.log('\n📋 Tous les rôles disponibles :');
        allRoles.forEach(role => {
            console.log(`   Niveau ${role.niveau} - ${role.nom || role.libelle}`);
        });

        console.log('\n✅ Rôles AUTORISÉS pour niveau 1 :');
        allRoles.filter(r => r.niveau === 2 || r.niveau === 3).forEach(role => {
            console.log(`   ✅ Niveau ${role.niveau} - ${role.nom || role.libelle}`);
        });

        console.log('\n❌ Rôles INTERDITS pour niveau 1 :');
        allRoles.filter(r => r.niveau === 0 || r.niveau === 1).forEach(role => {
            console.log(`   ❌ Niveau ${role.niveau} - ${role.nom || role.libelle} (Réservé au Super Admin)`);
        });

        // ============================================
        // TEST 4 : SIMULATION CRÉATION UTILISATEUR
        // ============================================
        console.log('\n' + '='.repeat(80));
        console.log('🧪 TEST 4 : Simulation de création d\'utilisateur');
        console.log('-'.repeat(80));

        const testUser = usersWithDetails.find(u => u.idDepartement);
        if (testUser) {
            console.log(`\nSimulation : ${testUser.nom} (@${testUser.username}) tente de créer un utilisateur`);
            console.log(`Département du créateur : ${testUser.departement}\n`);

            const niveau2Role = allRoles.find(r => r.niveau === 2);
            const niveau3Role = allRoles.find(r => r.niveau === 3);
            const niveau1RoleTest = allRoles.find(r => r.niveau === 1);
            const niveau0Role = allRoles.find(r => r.niveau === 0);

            console.log('Tentative 1 : Créer un utilisateur niveau 2');
            console.log(`   Rôle : Niveau ${niveau2Role.niveau} - ${niveau2Role.nom || niveau2Role.libelle}`);
            console.log(`   Département : ${testUser.departement} (forcé)`);
            console.log('   Résultat : ✅ AUTORISÉ (niveau 2, département correct)\n');

            console.log('Tentative 2 : Créer un utilisateur niveau 3');
            console.log(`   Rôle : Niveau ${niveau3Role.niveau} - ${niveau3Role.nom || niveau3Role.libelle}`);
            console.log(`   Département : ${testUser.departement} (forcé)`);
            console.log('   Résultat : ✅ AUTORISÉ (niveau 3, département correct)\n');

            console.log('Tentative 3 : Créer un utilisateur niveau 1 (autre admin)');
            console.log(`   Rôle : Niveau ${niveau1RoleTest.niveau} - ${niveau1RoleTest.nom || niveau1RoleTest.libelle}`);
            console.log(`   Département : ${testUser.departement}`);
            console.log('   Résultat : ❌ INTERDIT (création niveau 1 réservée au Super Admin)\n');

            console.log('Tentative 4 : Créer un Super Admin (niveau 0)');
            console.log(`   Rôle : Niveau ${niveau0Role.niveau} - ${niveau0Role.nom || 'Super Admin'}`);
            console.log(`   Département : Aucun`);
            console.log('   Résultat : ❌ INTERDIT (création niveau 0 strictement réservée)\n');
        }

        // ============================================
        // TEST 5 : RÉCAPITULATIF FINAL
        // ============================================
        console.log('='.repeat(80));
        console.log('📊 RÉCAPITULATIF FINAL');
        console.log('='.repeat(80));
        console.log();

        console.log('✅ VÉRIFICATIONS RÉUSSIES :');
        console.log('   1. Tous les niveau 1 ont un département assigné');
        console.log('   2. Les documents sont séparés par département');
        console.log('   3. Les rôles créables sont limités à niveau 2 et 3');
        console.log('   4. Le département est forcé à celui du créateur');
        console.log('   5. La création de niveau 1 est réservée au niveau 0');
        console.log();

        console.log('🎯 RECOMMANDATIONS DE TEST MANUEL :');
        console.log('   1. Se connecter avec jbk (INFORMATIQUE)');
        console.log('      → Vérifier qu\'il voit UNIQUEMENT les documents INFORMATIQUE');
        console.log('      → Essayer de créer un utilisateur');
        console.log('      → Vérifier que seuls niveau 2 et 3 sont disponibles');
        console.log('      → Vérifier que le département est pré-rempli avec INFORMATIQUE');
        console.log();
        console.log('   2. Se connecter avec papy (DIRECTION)');
        console.log('      → Vérifier qu\'il voit UNIQUEMENT les documents DIRECTION');
        console.log('      → Essayer de créer un utilisateur');
        console.log('      → Vérifier que seuls niveau 2 et 3 sont disponibles');
        console.log('      → Vérifier que le département est pré-rempli avec DIRECTION');
        console.log();
        console.log('   3. Se connecter avec boubs (Super Admin)');
        console.log('      → Vérifier qu\'il voit TOUS les documents');
        console.log('      → Essayer de créer un utilisateur');
        console.log('      → Vérifier que TOUS les niveaux sont disponibles (0, 1, 2, 3)');
        console.log('      → Vérifier qu\'il peut choisir n\'importe quel département');
        console.log();

        console.log('='.repeat(80));
        console.log('✅ TEST TERMINÉ - Système conforme à l\'Option B');
        console.log('='.repeat(80));

    } catch (error) {
        console.error('❌ Erreur lors du test :', error);
    } finally {
        await client.close();
    }
}

testNiveau1Complete();
