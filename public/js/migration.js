// ============================================
// SCRIPT DE MIGRATION - MCD ARCHIVAGE C.E.R.E.R
// ============================================
// Ce script migre les données existantes vers le nouveau modèle avec rôles et départements

const { MongoClient, ObjectId } = require('mongodb');

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const DB_NAME = 'cerer_archivage';

async function migrate() {
    console.log('🚀 Démarrage de la migration...\n');
    
    let client;
    
    try {
        // Connexion à MongoDB
        console.log('📡 Connexion à MongoDB...');
        client = await MongoClient.connect(MONGO_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });
        const db = client.db(DB_NAME);
        console.log('✅ Connecté à MongoDB\n');
        
        // Collections
        const usersCollection = db.collection('users');
        const documentsCollection = db.collection('documents');
        const categoriesCollection = db.collection('categories');
        const rolesCollection = db.collection('roles');
        const departementsCollection = db.collection('departements');
        
        // ==========================================
        // ÉTAPE 1: Créer les rôles par défaut
        // ==========================================
        console.log('📋 ÉTAPE 1: Création des rôles...');
        
        const defaultRoles = [
            {
                libelle: 'primaire',
                niveau: 1,
                description: 'Accès complet au département'
            },
            {
                libelle: 'secondaire',
                niveau: 2,
                description: 'Accès à ses documents et aux documents tertiaires'
            },
            {
                libelle: 'tertiaire',
                niveau: 3,
                description: 'Accès uniquement à ses propres documents'
            }
        ];
        
        for (const role of defaultRoles) {
            const exists = await rolesCollection.findOne({ libelle: role.libelle });
            if (!exists) {
                await rolesCollection.insertOne(role);
                console.log(`  ✅ Rôle créé: ${role.libelle} (niveau ${role.niveau})`);
            } else {
                console.log(`  ℹ️  Rôle existe déjà: ${role.libelle}`);
            }
        }
        
        // ==========================================
        // ÉTAPE 2: Créer les départements par défaut
        // ==========================================
        console.log('\n📁 ÉTAPE 2: Création des départements...');
        
        const defaultDepartements = [
            { nom: 'Direction', description: 'Direction générale' },
            { nom: 'Comptabilité', description: 'Service comptabilité' },
            { nom: 'Ressources Humaines', description: 'Service RH' },
            { nom: 'Technique', description: 'Service technique' }
        ];
        
        for (const dept of defaultDepartements) {
            const exists = await departementsCollection.findOne({ nom: dept.nom });
            if (!exists) {
                await departementsCollection.insertOne(dept);
                console.log(`  ✅ Département créé: ${dept.nom}`);
            } else {
                console.log(`  ℹ️  Département existe déjà: ${dept.nom}`);
            }
        }
        
        // ==========================================
        // ÉTAPE 3: Récupérer les IDs pour l'association
        // ==========================================
        console.log('\n🔗 ÉTAPE 3: Récupération des références...');
        
        const primaryRole = await rolesCollection.findOne({ libelle: 'primaire' });
        const secondaryRole = await rolesCollection.findOne({ libelle: 'secondaire' });
        const tertiaryRole = await rolesCollection.findOne({ libelle: 'tertiaire' });
        
        const directionDept = await departementsCollection.findOne({ nom: 'Direction' });
        const comptaDept = await departementsCollection.findOne({ nom: 'Comptabilité' });
        
        console.log('  ✅ Références récupérées');
        
        // ==========================================
        // ÉTAPE 4: Mapper les utilisateurs existants
        // ==========================================
        console.log('\n👥 ÉTAPE 4: Migration des utilisateurs...');
        
        // Mapping personnalisé pour les utilisateurs de test
        const userMapping = {
            'fatima': { 
                role: primaryRole._id, 
                dept: directionDept._id,
                nom: 'Fatima Sall',
                email: 'fatima@cerer.sn'
            },
            'awa': { 
                role: secondaryRole._id, 
                dept: directionDept._id,
                nom: 'Awa Diop',
                email: 'awa@cerer.sn'
            },
            'deguene': { 
                role: tertiaryRole._id, 
                dept: comptaDept._id,
                nom: 'Deguene Ndiaye',
                email: 'deguene@cerer.sn'
            },
            'jbk': { 
                role: primaryRole._id, 
                dept: comptaDept._id,
                nom: 'JBK',
                email: 'jbk@cerer.sn'
            },
            'demo': { 
                role: tertiaryRole._id, 
                dept: directionDept._id,
                nom: 'Utilisateur Demo',
                email: 'demo@cerer.sn'
            }
        };
        
        const users = await usersCollection.find().toArray();
        let usersUpdated = 0;
        
        for (const user of users) {
            const mapping = userMapping[user.username];
            
            if (mapping) {
                // Utilisateur connu, on applique le mapping personnalisé
                await usersCollection.updateOne(
                    { _id: user._id },
                    { 
                        $set: { 
                            idRole: mapping.role,
                            idDepartement: mapping.dept,
                            nom: mapping.nom,
                            email: mapping.email
                        } 
                    }
                );
                console.log(`  ✅ ${user.username} → ${mapping.nom} (${await getRoleName(rolesCollection, mapping.role)} - ${await getDeptName(departementsCollection, mapping.dept)})`);
                usersUpdated++;
            } else if (!user.idRole || !user.idDepartement) {
                // Utilisateur inconnu sans rôle/dept, on met des valeurs par défaut
                await usersCollection.updateOne(
                    { _id: user._id },
                    { 
                        $set: { 
                            idRole: tertiaryRole._id,
                            idDepartement: directionDept._id,
                            nom: user.username,
                            email: `${user.username}@cerer.sn`
                        } 
                    }
                );
                console.log(`  ⚠️  ${user.username} → Rôle/Département par défaut appliqué`);
                usersUpdated++;
            }
        }
        
        console.log(`  📊 ${usersUpdated} utilisateurs mis à jour`);
        
        // ==========================================
        // ÉTAPE 5: Migrer les documents
        // ==========================================
        console.log('\n📄 ÉTAPE 5: Migration des documents...');
        
        const updatedUsers = await usersCollection.find().toArray();
        let docsUpdated = 0;
        
        for (const user of updatedUsers) {
            // Migrer les documents avec l'ancien champ 'userId'
            const result = await documentsCollection.updateMany(
                { userId: user.username },
                { 
                    $set: { 
                        idUtilisateur: user.username,
                        idDepartement: user.idDepartement
                    },
                    $unset: { userId: "" }
                }
            );
            
            // Mettre à jour les documents qui utilisent déjà idUtilisateur mais sans département
            const result2 = await documentsCollection.updateMany(
                { 
                    idUtilisateur: user.username,
                    idDepartement: { $exists: false }
                },
                { 
                    $set: { 
                        idDepartement: user.idDepartement
                    }
                }
            );
            
            const totalUpdated = result.modifiedCount + result2.modifiedCount;
            if (totalUpdated > 0) {
                console.log(`  ✅ ${user.username}: ${totalUpdated} document(s) migré(s)`);
                docsUpdated += totalUpdated;
            }
        }
        
        console.log(`  📊 ${docsUpdated} documents mis à jour au total`);
        
        // ==========================================
        // ÉTAPE 6: Migrer les catégories
        // ==========================================
        console.log('\n🏷️  ÉTAPE 6: Migration des catégories...');
        
        let catsUpdated = 0;
        
        for (const user of updatedUsers) {
            const result = await categoriesCollection.updateMany(
                { userId: user.username },
                { 
                    $set: { 
                        idUtilisateur: user.username
                    },
                    $unset: { userId: "" }
                }
            );
            
            if (result.modifiedCount > 0) {
                console.log(`  ✅ ${user.username}: ${result.modifiedCount} catégorie(s) migrée(s)`);
                catsUpdated += result.modifiedCount;
            }
        }
        
        console.log(`  📊 ${catsUpdated} catégories mises à jour au total`);
        
        // ==========================================
        // ÉTAPE 7: Vérifications post-migration
        // ==========================================
        console.log('\n🔍 ÉTAPE 7: Vérifications...');
        
        // Vérifier que tous les users ont un rôle et département
        const usersWithoutRole = await usersCollection.countDocuments({
            $or: [
                { idRole: { $exists: false } },
                { idDepartement: { $exists: false } }
            ]
        });
        
        if (usersWithoutRole > 0) {
            console.log(`  ⚠️  ${usersWithoutRole} utilisateur(s) sans rôle/département!`);
        } else {
            console.log('  ✅ Tous les utilisateurs ont un rôle et département');
        }
        
        // Vérifier que tous les docs ont un département
        const docsWithoutDept = await documentsCollection.countDocuments({
            idDepartement: { $exists: false }
        });
        
        if (docsWithoutDept > 0) {
            console.log(`  ⚠️  ${docsWithoutDept} document(s) sans département!`);
        } else {
            console.log('  ✅ Tous les documents ont un département');
        }
        
        // Statistiques finales
        console.log('\n📊 STATISTIQUES FINALES:');
        const totalUsers = await usersCollection.countDocuments();
        const totalDocs = await documentsCollection.countDocuments();
        const totalCats = await categoriesCollection.countDocuments();
        const totalRoles = await rolesCollection.countDocuments();
        const totalDepts = await departementsCollection.countDocuments();
        
        console.log(`  • Utilisateurs: ${totalUsers}`);
        console.log(`  • Documents: ${totalDocs}`);
        console.log(`  • Catégories: ${totalCats}`);
        console.log(`  • Rôles: ${totalRoles}`);
        console.log(`  • Départements: ${totalDepts}`);
        
        // Répartition par département
        console.log('\n📈 RÉPARTITION PAR DÉPARTEMENT:');
        for (const dept of await departementsCollection.find().toArray()) {
            const userCount = await usersCollection.countDocuments({ idDepartement: dept._id });
            const docCount = await documentsCollection.countDocuments({ idDepartement: dept._id });
            console.log(`  • ${dept.nom}: ${userCount} utilisateur(s), ${docCount} document(s)`);
        }
        
        console.log('\n✅ MIGRATION TERMINÉE AVEC SUCCÈS! 🎉\n');
        
    } catch (error) {
        console.error('\n❌ ERREUR LORS DE LA MIGRATION:', error);
        console.error(error.stack);
        process.exit(1);
    } finally {
        if (client) {
            await client.close();
            console.log('📡 Connexion MongoDB fermée');
        }
    }
}

// Fonctions utilitaires
async function getRoleName(rolesCollection, roleId) {
    const role = await rolesCollection.findOne({ _id: roleId });
    return role ? role.libelle : 'inconnu';
}

async function getDeptName(departementsCollection, deptId) {
    const dept = await departementsCollection.findOne({ _id: deptId });
    return dept ? dept.nom : 'inconnu';
}

// Exécution
console.log('╔═══════════════════════════════════════════════════════════╗');
console.log('║   MIGRATION MCD - APPLICATION D\'ARCHIVAGE C.E.R.E.R     ║');
console.log('╚═══════════════════════════════════════════════════════════╝\n');

migrate().then(() => {
    console.log('🎯 Migration complétée avec succès!');
    process.exit(0);
}).catch((error) => {
    console.error('❌ Échec de la migration:', error);
    process.exit(1);
});