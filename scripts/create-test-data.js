// ============================================
// SCRIPT DE CRÉATION DE DONNÉES DE TEST
// Crée des comptes de test pour chaque niveau
// ============================================

require('dotenv').config();
const { MongoClient, ObjectId } = require('mongodb');
const bcrypt = require('bcrypt');

// Mot de passe par défaut pour tous les comptes de test
const DEFAULT_PASSWORD = 'test123';

async function createTestData() {
    console.log('🧪 CRÉATION DE DONNÉES DE TEST\n');
    console.log('============================================================');

    let client;

    try {
        console.log('📍 Connexion à MongoDB...');
        client = await MongoClient.connect(process.env.MONGODB_URI);
        const db = client.db('cerer_archivage');
        console.log('✅ Connecté\n');

        // Récupérer les rôles et départements existants
        console.log('📋 Récupération des rôles et départements...');
        const roles = await db.collection('roles').find({}).toArray();
        const departements = await db.collection('departements').find({}).toArray();

        if (roles.length === 0) {
            console.log('❌ Aucun rôle trouvé! Créez d\'abord les rôles.');
            await client.close();
            return;
        }

        if (departements.length === 0) {
            console.log('❌ Aucun département trouvé! Créez d\'abord les départements.');
            await client.close();
            return;
        }

        console.log(`✅ ${roles.length} rôles trouvés`);
        console.log(`✅ ${departements.length} départements trouvés\n`);

        // Trouver les rôles par niveau
        const roleNiveau0 = roles.find(r => r.niveau === 0); // Super Admin
        const roleNiveau1 = roles.find(r => r.niveau === 1); // Primaire
        const roleNiveau2 = roles.find(r => r.niveau === 2); // Secondaire
        const roleNiveau3 = roles.find(r => r.niveau === 3); // Tertiaire

        // Premier département pour les tests
        const testDept = departements[0];

        console.log('============================================================');
        console.log('👤 CRÉATION DES COMPTES DE TEST\n');

        // Hasher le mot de passe
        const hashedPassword = await bcrypt.hash(DEFAULT_PASSWORD, 10);

        // Comptes de test à créer
        const testUsers = [
            {
                username: 'test_superadmin',
                password: hashedPassword,
                nom: 'Test Super Admin',
                prenom: 'Super',
                email: 'test.superadmin@cerer.test',
                idRole: roleNiveau0?._id,
                idDepartement: null, // Super admin sans département
                isOnline: true,
                createdAt: new Date()
            },
            {
                username: 'test_niveau1',
                password: hashedPassword,
                nom: 'Test Niveau 1',
                prenom: 'Primaire',
                email: 'test.niveau1@cerer.test',
                idRole: roleNiveau1?._id,
                idDepartement: testDept._id,
                isOnline: true,
                createdAt: new Date()
            },
            {
                username: 'test_niveau2',
                password: hashedPassword,
                nom: 'Test Niveau 2',
                prenom: 'Secondaire',
                email: 'test.niveau2@cerer.test',
                idRole: roleNiveau2?._id,
                idDepartement: testDept._id,
                isOnline: true,
                createdAt: new Date()
            },
            {
                username: 'test_niveau3',
                password: hashedPassword,
                nom: 'Test Niveau 3',
                prenom: 'Tertiaire',
                email: 'test.niveau3@cerer.test',
                idRole: roleNiveau3?._id,
                idDepartement: testDept._id,
                isOnline: true,
                createdAt: new Date()
            },
            {
                username: 'test34',
                password: hashedPassword,
                nom: 'Test Trente-Quatre',
                prenom: 'Test',
                email: 'test34@cerer.test',
                idRole: roleNiveau1?._id, // Niveau 1 par défaut
                idDepartement: testDept._id,
                isOnline: true,
                createdAt: new Date()
            }
        ];

        let created = 0;
        let skipped = 0;

        for (const user of testUsers) {
            // Vérifier si l'utilisateur existe déjà
            const existing = await db.collection('users').findOne({ username: user.username });

            if (existing) {
                console.log(`⏭️  ${user.username}: Déjà existant (ignoré)`);
                skipped++;
            } else {
                await db.collection('users').insertOne(user);
                console.log(`✅ ${user.username}: Créé (niveau ${user.idRole ? roles.find(r => r._id.equals(user.idRole))?.niveau : 'N/A'})`);
                created++;
            }
        }

        console.log('\n============================================================');
        console.log('📊 RÉSUMÉ\n');
        console.log(`✅ Créés: ${created}`);
        console.log(`⏭️  Ignorés (déjà existants): ${skipped}`);
        console.log(`📌 Total: ${testUsers.length}\n`);

        console.log('🔑 IDENTIFIANTS DE CONNEXION:\n');
        testUsers.forEach(user => {
            console.log(`   Username: ${user.username}`);
            console.log(`   Password: ${DEFAULT_PASSWORD}`);
            console.log(`   Niveau:   ${user.idRole ? roles.find(r => r._id.equals(user.idRole))?.niveau : 'N/A'}`);
            console.log('');
        });

        console.log('============================================================');
        console.log('⚠️  IMPORTANT:\n');
        console.log('   Ces comptes sont pour TESTS UNIQUEMENT.');
        console.log('   NE PAS les utiliser en production avec ces mots de passe!\n');
        console.log('============================================================\n');

    } catch (error) {
        console.error('❌ Erreur:', error.message);
        console.error(error.stack);
    } finally {
        if (client) await client.close();
    }
}

// Exécuter
createTestData().catch(console.error);
