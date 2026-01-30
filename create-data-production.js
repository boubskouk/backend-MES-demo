/**
 * Créer les départements et services par défaut en production
 */

const { MongoClient, ObjectId } = require('mongodb');

const MONGODB_URI = 'mongodb+srv://cerer_user:JCIsME2FEYTOXLpX@cluster0.jodtq6h.mongodb.net/base_MES?retryWrites=true&w=majority&appName=Cluster0';

const DEFAULT_DEPARTEMENTS = [
    { nom: 'Direction', description: 'Direction générale' },
    { nom: 'Comptabilité', description: 'Service comptabilité et finances' },
    { nom: 'Ressources Humaines', description: 'Gestion du personnel' },
    { nom: 'Technique', description: 'Service technique' },
    { nom: 'Informatique', description: 'Service informatique' }
];

const DEFAULT_SERVICES = [
    { nom: 'Administration', departement: 'Direction' },
    { nom: 'Secrétariat', departement: 'Direction' },
    { nom: 'Facturation', departement: 'Comptabilité' },
    { nom: 'Paie', departement: 'Comptabilité' },
    { nom: 'Recrutement', departement: 'Ressources Humaines' },
    { nom: 'Formation', departement: 'Ressources Humaines' },
    { nom: 'Maintenance', departement: 'Technique' },
    { nom: 'Logistique', departement: 'Technique' },
    { nom: 'Développement', departement: 'Informatique' },
    { nom: 'Support', departement: 'Informatique' }
];

const DEFAULT_CATEGORIES = [
    { nom: 'Contrats', description: 'Documents contractuels' },
    { nom: 'Factures', description: 'Factures et devis' },
    { nom: 'Rapports', description: 'Rapports et comptes-rendus' },
    { nom: 'Courriers', description: 'Correspondances' },
    { nom: 'Procédures', description: 'Procédures et guides' },
    { nom: 'Autres', description: 'Documents divers' }
];

async function createData() {
    const client = new MongoClient(MONGODB_URI);

    try {
        console.log('🔄 Connexion à MongoDB Atlas...');
        await client.connect();
        const db = client.db('base_MES');
        console.log('✅ Connecté\n');

        const departementsCollection = db.collection('departements');
        const servicesCollection = db.collection('services');
        const categoriesCollection = db.collection('categories');

        // === DÉPARTEMENTS ===
        console.log('=== CRÉATION DES DÉPARTEMENTS ===\n');
        const deptMap = {};

        for (const dept of DEFAULT_DEPARTEMENTS) {
            let existing = await departementsCollection.findOne({ nom: dept.nom });

            if (!existing) {
                const result = await departementsCollection.insertOne({
                    nom: dept.nom,
                    description: dept.description,
                    dateCreation: new Date()
                });
                deptMap[dept.nom] = result.insertedId;
                console.log(`✅ Département "${dept.nom}" créé`);
            } else {
                deptMap[dept.nom] = existing._id;
                console.log(`⏭️  Département "${dept.nom}" existe déjà`);
            }
        }

        // === SERVICES ===
        console.log('\n=== CRÉATION DES SERVICES ===\n');

        for (const service of DEFAULT_SERVICES) {
            const deptId = deptMap[service.departement];
            if (!deptId) {
                console.log(`❌ Département "${service.departement}" non trouvé pour le service "${service.nom}"`);
                continue;
            }

            let existing = await servicesCollection.findOne({
                nom: service.nom,
                idDepartement: deptId
            });

            if (!existing) {
                await servicesCollection.insertOne({
                    nom: service.nom,
                    idDepartement: deptId,
                    dateCreation: new Date()
                });
                console.log(`✅ Service "${service.nom}" créé (${service.departement})`);
            } else {
                console.log(`⏭️  Service "${service.nom}" existe déjà`);
            }
        }

        // === CATÉGORIES ===
        console.log('\n=== CRÉATION DES CATÉGORIES ===\n');

        for (const cat of DEFAULT_CATEGORIES) {
            let existing = await categoriesCollection.findOne({ nom: cat.nom });

            if (!existing) {
                await categoriesCollection.insertOne({
                    nom: cat.nom,
                    description: cat.description,
                    dateCreation: new Date()
                });
                console.log(`✅ Catégorie "${cat.nom}" créée`);
            } else {
                console.log(`⏭️  Catégorie "${cat.nom}" existe déjà`);
            }
        }

        // === RÉSUMÉ ===
        console.log('\n=== RÉSUMÉ ===\n');

        const deptCount = await departementsCollection.countDocuments();
        const serviceCount = await servicesCollection.countDocuments();
        const catCount = await categoriesCollection.countDocuments();

        console.log(`📁 Départements: ${deptCount}`);
        console.log(`🔧 Services: ${serviceCount}`);
        console.log(`📂 Catégories: ${catCount}`);

        console.log('\n✅ Terminé !');

    } catch (error) {
        console.error('❌ Erreur:', error.message);
    } finally {
        await client.close();
        console.log('✅ Déconnecté');
    }
}

createData();
