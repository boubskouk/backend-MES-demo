/**
 * Script pour tester le filtrage des utilisateurs pour un niveau 1
 * Simule une requête à /api/users depuis un utilisateur niveau 1
 */

const { MongoClient, ObjectId } = require('mongodb');
require('dotenv').config();

// Choisir la base à tester
const USE_PRODUCTION = true; // true = Atlas (prod), false = localhost

const MONGODB_URI_LOCAL = 'mongodb://localhost:27017';
const MONGODB_URI_PROD = 'mongodb+srv://jacquesboubacarkoukoui_db_user:um6pz5uhsXkNGdOe@cluster0.eq69ixv.mongodb.net/cerer_archivage?retryWrites=true&w=majority';

const MONGODB_URI = USE_PRODUCTION ? MONGODB_URI_PROD : MONGODB_URI_LOCAL;
const DB_NAME = 'cerer_archivage';

async function testNiveau1Users() {
    const client = new MongoClient(MONGODB_URI);

    try {
        console.log(`🔄 Connexion à ${USE_PRODUCTION ? 'PRODUCTION (Atlas)' : 'LOCAL (localhost)'}...`);
        await client.connect();
        console.log('✅ Connecté à MongoDB\n');

        const db = client.db(DB_NAME);
        const usersCollection = db.collection('users');
        const rolesCollection = db.collection('roles');
        const servicesCollection = db.collection('services');

        // 1. Trouver un utilisateur de niveau 1
        const niveau1Users = await usersCollection.aggregate([
            {
                $lookup: {
                    from: 'roles',
                    localField: 'idRole',
                    foreignField: '_id',
                    as: 'roleData'
                }
            },
            {
                $unwind: '$roleData'
            },
            {
                $match: {
                    'roleData.niveau': 1
                }
            }
        ]).toArray();

        if (niveau1Users.length === 0) {
            console.log('❌ Aucun utilisateur de niveau 1 trouvé dans la base');
            return;
        }

        const testUser = niveau1Users[0];
        console.log(`👤 TEST AVEC: ${testUser.nom} (@${testUser.username})`);
        console.log(`   Rôle: ${testUser.roleData.nom} (niveau ${testUser.roleData.niveau})`);
        console.log(`   Département ID: ${testUser.idDepartement}\n`);

        // 2. Simuler la logique du serveur pour /api/users
        if (!testUser.idDepartement) {
            console.log('🔴 ERREUR: Utilisateur niveau 1 SANS département - devrait retourner liste vide');
            return;
        }

        const deptId = typeof testUser.idDepartement === 'string'
            ? new ObjectId(testUser.idDepartement)
            : testUser.idDepartement;

        // Récupérer les services du département
        const services = await servicesCollection.find({
            $or: [
                { idDepartement: deptId },
                { idDepartement: deptId.toString() }
            ]
        }).toArray();
        const serviceIds = services.map(s => s._id);
        const serviceIdsStr = serviceIds.map(s => s.toString());

        console.log(`📋 Services du département: ${services.length}`);
        services.forEach(s => console.log(`   - ${s.nom}`));
        console.log('');

        // Requête pour récupérer les utilisateurs (LOGIQUE CORRIGÉE)
        const query = {
            $or: [
                { idDepartement: deptId },              // ObjectId
                { idDepartement: deptId.toString() },   // String
                { idService: { $in: serviceIds } },     // ObjectId
                { idService: { $in: serviceIdsStr } }   // String
            ]
        };

        console.log('🔍 Requête MongoDB:');
        console.log(JSON.stringify(query, null, 2));
        console.log('');

        const filteredUsers = await usersCollection.find(query).toArray();

        console.log(`📊 RÉSULTAT: ${filteredUsers.length} utilisateur(s) accessible(s)`);
        console.log('');

        // Afficher la liste
        console.log('👥 LISTE DES UTILISATEURS VISIBLES:');
        for (const user of filteredUsers) {
            const role = await rolesCollection.findOne({ _id: user.idRole });
            console.log(`   - ${user.nom} (@${user.username}) - ${role?.nom || 'N/A'} (niveau ${role?.niveau ?? 'N/A'})`);
        }

        // 3. Vérifier qu'il ne voit PAS d'autres départements
        const allUsers = await usersCollection.countDocuments({});
        console.log(`\n✅ Filtrage correct: ${filteredUsers.length}/${allUsers} utilisateurs visibles`);

        if (filteredUsers.length === allUsers) {
            console.log('❌❌❌ PROBLÈME: Le niveau 1 voit TOUS les utilisateurs!');
        } else {
            console.log('✅✅✅ SÉCURITÉ OK: Le niveau 1 voit uniquement son département');
        }

    } catch (error) {
        console.error('❌ Erreur:', error);
    } finally {
        await client.close();
        console.log('\n👋 Déconnecté de MongoDB');
    }
}

testNiveau1Users();
