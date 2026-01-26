/**
 * Script de vérification de la base de données Atlas
 * Exécution: node scripts/check-atlas-db.js
 */

const { MongoClient } = require('mongodb');

// URI Atlas (à mettre à jour si nécessaire)
const ATLAS_URI = 'mongodb+srv://jacquesboubacarkoukoui_db_user:um6pz5uhsXkNGdOe@cluster0.eq69ixv.mongodb.net/cerer_archivage?retryWrites=true&w=majority';

async function checkAtlasDatabase() {
    let client;

    try {
        console.log('🔍 Connexion à MongoDB Atlas...\n');

        client = await MongoClient.connect(ATLAS_URI, {
            serverSelectionTimeoutMS: 5000
        });

        console.log('✅ Connexion réussie!\n');

        const db = client.db('cerer_archivage');

        // Liste toutes les collections
        const collections = await db.listCollections().toArray();

        console.log('📊 COLLECTIONS TROUVÉES:\n');
        console.log('Collection Name'.padEnd(25), '| Documents | Taille');
        console.log('-'.repeat(60));

        for (const collInfo of collections) {
            const collName = collInfo.name;
            const coll = db.collection(collName);

            // Compter les documents
            const count = await coll.countDocuments();

            // Obtenir les stats
            const stats = await db.command({ collStats: collName });
            const size = (stats.size / 1024).toFixed(2) + ' KB';

            console.log(
                collName.padEnd(25),
                '|',
                String(count).padEnd(9),
                '|',
                size
            );
        }

        console.log('-'.repeat(60));
        console.log('\n');

        // Vérifier les collections critiques
        console.log('🔍 VÉRIFICATION DES COLLECTIONS CRITIQUES:\n');

        const criticalCollections = [
            { name: 'roles', required: true },
            { name: 'departements', required: true },
            { name: 'services', required: true },
            { name: 'users', required: true },
            { name: 'documents', required: false },
            { name: 'categories', required: false },
            { name: 'auditLogs', required: false }
        ];

        for (const { name, required } of criticalCollections) {
            const exists = collections.some(c => c.name === name);
            const coll = db.collection(name);
            const count = exists ? await coll.countDocuments() : 0;

            const status = exists ?
                (count > 0 ? '✅' : '⚠️  (vide)') :
                (required ? '❌ MANQUANT' : '⚠️  absente');

            console.log(`${status} ${name}: ${count} documents`);
        }

        console.log('\n');

        // Vérifier les rôles en détail
        console.log('🔍 DÉTAILS DE LA COLLECTION ROLES:\n');
        const rolesCollection = db.collection('roles');
        const roles = await rolesCollection.find({}).toArray();

        if (roles.length === 0) {
            console.log('❌ AUCUN RÔLE TROUVÉ - BASE NON INITIALISÉE!');
        } else {
            console.log('Niveau | Libellé          | Description');
            console.log('-'.repeat(60));
            for (const role of roles) {
                const libelle = role.libelle || '⚠️  MANQUANT';
                const description = role.description || '⚠️  MANQUANT';
                console.log(
                    `  ${role.niveau}    |`,
                    libelle.padEnd(16),
                    '|',
                    description
                );
            }
        }

        console.log('\n');

        // Vérifier les départements
        console.log('🔍 DÉTAILS DE LA COLLECTION DEPARTEMENTS:\n');
        const deptsCollection = db.collection('departements');
        const depts = await deptsCollection.find({}).toArray();

        if (depts.length === 0) {
            console.log('❌ AUCUN DÉPARTEMENT TROUVÉ!');
        } else {
            console.log(`✅ ${depts.length} département(s) trouvé(s):`);
            for (const dept of depts) {
                console.log(`   - ${dept.nom} (${dept.type || 'type non défini'})`);
            }
        }

        console.log('\n');

        // Vérifier les utilisateurs
        console.log('🔍 DÉTAILS DE LA COLLECTION USERS:\n');
        const usersCollection = db.collection('users');
        const users = await usersCollection.find({}).toArray();

        if (users.length === 0) {
            console.log('❌ AUCUN UTILISATEUR TROUVÉ!');
        } else {
            console.log(`✅ ${users.length} utilisateur(s) trouvé(s):`);
            for (const user of users.slice(0, 5)) { // Afficher max 5
                console.log(`   - ${user.username} (${user.nom || 'nom inconnu'})`);
            }
            if (users.length > 5) {
                console.log(`   ... et ${users.length - 5} autre(s)`);
            }
        }

        console.log('\n');

        // DIAGNOSTIC FINAL
        console.log('=' .repeat(60));
        console.log('📋 DIAGNOSTIC FINAL:\n');

        if (roles.length === 0) {
            console.log('❌ PROBLÈME CRITIQUE: Base de données non initialisée');
            console.log('   → Les rôles sont manquants');
            console.log('   → Solution: Exécuter le script d\'initialisation');
        } else if (roles.some(r => !r.libelle)) {
            console.log('⚠️  PROBLÈME: Certains rôles ont des données manquantes');
            console.log('   → Des champs "libelle" sont manquants');
            console.log('   → Solution: Corriger les rôles existants');
        } else if (depts.length === 0) {
            console.log('⚠️  PROBLÈME: Aucun département créé');
            console.log('   → Solution: Créer des départements via l\'interface');
        } else if (users.length === 0) {
            console.log('⚠️  PROBLÈME: Aucun utilisateur créé');
            console.log('   → Solution: Créer le premier utilisateur super admin');
        } else {
            console.log('✅ Base de données semble correctement initialisée');
            console.log(`   → ${roles.length} rôles`);
            console.log(`   → ${depts.length} département(s)`);
            console.log(`   → ${users.length} utilisateur(s)`);
        }

        console.log('=' .repeat(60));

    } catch (error) {
        console.error('❌ Erreur:', error.message);
        if (error.message.includes('authentication')) {
            console.log('\n⚠️  Problème d\'authentification - vérifiez vos identifiants Atlas');
        } else if (error.message.includes('network')) {
            console.log('\n⚠️  Problème de connexion réseau - vérifiez votre connexion internet');
        }
    } finally {
        if (client) {
            await client.close();
            console.log('\n🔌 Connexion fermée');
        }
    }
}

// Exécuter
checkAtlasDatabase().catch(console.error);
