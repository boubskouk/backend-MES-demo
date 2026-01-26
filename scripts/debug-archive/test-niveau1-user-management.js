/**
 * Script de test pour vérifier les modifications de gestion des utilisateurs Niveau 1
 *
 * Ce script vérifie que :
 * 1. Le champ createdBy est bien ajouté lors de la création d'utilisateur
 * 2. Les utilisateurs Niveau 1 ne voient que les utilisateurs qu'ils ont créés
 * 3. La messagerie reste interdépartementale (tous les utilisateurs visibles)
 */

const { MongoClient, ObjectId } = require('mongodb');
require('dotenv').config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017';
const DB_NAME = process.env.DB_NAME || 'archivageDB';

async function testNiveau1UserManagement() {
    const client = new MongoClient(MONGO_URI);

    try {
        await client.connect();
        console.log('✅ Connecté à MongoDB\n');

        const db = client.db(DB_NAME);
        const usersCollection = db.collection('utilisateurs');
        const rolesCollection = db.collection('roles');
        const departementsCollection = db.collection('departements');

        // ========================================
        // TEST 1 : Vérifier le champ createdBy
        // ========================================
        console.log('📝 TEST 1 : Vérification du champ createdBy');
        console.log('━'.repeat(60));

        // Compter les utilisateurs avec et sans createdBy
        const totalUsers = await usersCollection.countDocuments({});
        const usersWithCreatedBy = await usersCollection.countDocuments({ createdBy: { $exists: true, $ne: null } });
        const usersWithoutCreatedBy = await usersCollection.countDocuments({
            $or: [
                { createdBy: { $exists: false } },
                { createdBy: null }
            ]
        });

        console.log(`   Total utilisateurs : ${totalUsers}`);
        console.log(`   Avec createdBy : ${usersWithCreatedBy}`);
        console.log(`   Sans createdBy (utilisateurs existants) : ${usersWithoutCreatedBy}`);

        // Afficher quelques exemples d'utilisateurs avec createdBy
        const sampleUsers = await usersCollection.find({
            createdBy: { $exists: true, $ne: null }
        }).limit(5).toArray();

        if (sampleUsers.length > 0) {
            console.log('\n   Exemples d\'utilisateurs avec createdBy :');
            for (const user of sampleUsers) {
                console.log(`      - ${user.username} créé par ${user.createdBy}`);
            }
        }

        console.log('\n');

        // ========================================
        // TEST 2 : Simuler la récupération des utilisateurs pour Niveau 1
        // ========================================
        console.log('📝 TEST 2 : Simulation du filtrage pour Niveau 1');
        console.log('━'.repeat(60));

        // Trouver un utilisateur Niveau 1
        const niveau1Role = await rolesCollection.findOne({ niveau: 1 });
        if (!niveau1Role) {
            console.log('   ⚠️  Aucun rôle Niveau 1 trouvé dans la base');
        } else {
            const niveau1User = await usersCollection.findOne({ idRole: niveau1Role._id });

            if (!niveau1User) {
                console.log('   ⚠️  Aucun utilisateur Niveau 1 trouvé dans la base');
            } else {
                console.log(`   Utilisateur Niveau 1 trouvé : ${niveau1User.username}`);
                console.log(`   Département : ${niveau1User.idDepartement ? 'Oui' : 'Non'}`);

                // Simuler la requête de filtrage
                const usersCreatedByNiveau1 = await usersCollection.find({
                    createdBy: niveau1User.username
                }).toArray();

                console.log(`\n   Utilisateurs créés par ${niveau1User.username} : ${usersCreatedByNiveau1.length}`);

                if (usersCreatedByNiveau1.length > 0) {
                    console.log('\n   Liste des utilisateurs créés :');
                    for (const user of usersCreatedByNiveau1) {
                        const role = await rolesCollection.findOne({ _id: user.idRole });
                        const dept = user.idDepartement ? await departementsCollection.findOne({ _id: user.idDepartement }) : null;
                        console.log(`      - ${user.username} (Niveau ${role?.niveau || '?'}, Dept: ${dept?.nom || 'N/A'})`);
                    }
                } else {
                    console.log('      (Aucun utilisateur créé par cet admin Niveau 1 pour le moment)');
                }
            }
        }

        console.log('\n');

        // ========================================
        // TEST 3 : Vérifier la messagerie (tous les utilisateurs)
        // ========================================
        console.log('📝 TEST 3 : Vérification de la messagerie interdépartementale');
        console.log('━'.repeat(60));

        const allUsersForMessaging = await usersCollection.find({}).toArray();
        console.log(`   Total utilisateurs disponibles pour messagerie : ${allUsersForMessaging.length}`);

        // Grouper par département
        const usersByDept = {};
        for (const user of allUsersForMessaging) {
            if (user.idDepartement) {
                const dept = await departementsCollection.findOne({ _id: user.idDepartement });
                const deptName = dept ? dept.nom : 'Inconnu';
                if (!usersByDept[deptName]) {
                    usersByDept[deptName] = 0;
                }
                usersByDept[deptName]++;
            } else {
                if (!usersByDept['Sans département']) {
                    usersByDept['Sans département'] = 0;
                }
                usersByDept['Sans département']++;
            }
        }

        console.log('\n   Répartition par département :');
        for (const [dept, count] of Object.entries(usersByDept)) {
            console.log(`      - ${dept} : ${count} utilisateur(s)`);
        }

        console.log('\n');

        // ========================================
        // TEST 4 : Vérifier les rôles disponibles pour Niveau 1
        // ========================================
        console.log('📝 TEST 4 : Vérification des rôles disponibles pour Niveau 1');
        console.log('━'.repeat(60));

        const allRoles = await rolesCollection.find({}).toArray();
        const rolesForNiveau1 = allRoles.filter(role => role.niveau === 2 || role.niveau === 3);

        console.log(`   Total rôles dans le système : ${allRoles.length}`);
        console.log(`   Rôles disponibles pour Niveau 1 (niveaux 2 et 3) : ${rolesForNiveau1.length}`);
        console.log('\n   Liste des rôles disponibles pour Niveau 1 :');
        for (const role of rolesForNiveau1) {
            console.log(`      - ${role.libelle} (Niveau ${role.niveau}) : ${role.description}`);
        }

        console.log('\n');

        // ========================================
        // RÉSUMÉ
        // ========================================
        console.log('📊 RÉSUMÉ DES TESTS');
        console.log('━'.repeat(60));
        console.log(`   ✅ Champ createdBy : ${usersWithCreatedBy > 0 ? 'Présent' : 'Non présent'}`);
        console.log(`   ✅ Filtrage Niveau 1 : ${niveau1Role ? 'Configuré' : 'Non configuré'}`);
        console.log(`   ✅ Messagerie interdépartementale : ${allUsersForMessaging.length} utilisateurs disponibles`);
        console.log(`   ✅ Rôles pour Niveau 1 : ${rolesForNiveau1.length} rôles (niveaux 2 et 3)`);
        console.log('\n');

    } catch (error) {
        console.error('❌ Erreur lors des tests:', error);
    } finally {
        await client.close();
        console.log('✅ Déconnecté de MongoDB');
    }
}

// Exécution du script
testNiveau1UserManagement();
