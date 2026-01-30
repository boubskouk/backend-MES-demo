/**
 * Créer les rôles par défaut en production
 */

const { MongoClient } = require('mongodb');

const MONGODB_URI = 'mongodb+srv://cerer_user:JCIsME2FEYTOXLpX@cluster0.jodtq6h.mongodb.net/base_MES?retryWrites=true&w=majority&appName=Cluster0';

const DEFAULT_ROLES = [
    {
        nom: 'super_admin',
        libelle: 'Super Administrateur',
        niveau: 0,
        description: 'Accès complet au système'
    },
    {
        nom: 'primaire',
        libelle: 'Administrateur Départemental',
        niveau: 1,
        description: 'Gestion complète du département'
    },
    {
        nom: 'secondaire',
        libelle: 'Utilisateur Avancé',
        niveau: 2,
        description: 'Accès à tous les documents du département'
    },
    {
        nom: 'tertiaire',
        libelle: 'Utilisateur Standard',
        niveau: 3,
        description: 'Accès uniquement à ses propres documents'
    }
];

async function createRoles() {
    const client = new MongoClient(MONGODB_URI);

    try {
        console.log('🔄 Connexion à MongoDB Atlas...');
        await client.connect();
        const db = client.db('base_MES');
        const rolesCollection = db.collection('roles');
        console.log('✅ Connecté\n');

        console.log('=== CRÉATION DES RÔLES ===\n');

        for (const role of DEFAULT_ROLES) {
            // Vérifier si le rôle existe déjà
            const existing = await rolesCollection.findOne({ niveau: role.niveau });

            if (existing) {
                // Mettre à jour le rôle existant
                await rolesCollection.updateOne(
                    { niveau: role.niveau },
                    { $set: role }
                );
                console.log(`✅ Rôle "${role.libelle}" (niveau ${role.niveau}) mis à jour`);
            } else {
                // Créer le nouveau rôle
                await rolesCollection.insertOne(role);
                console.log(`✅ Rôle "${role.libelle}" (niveau ${role.niveau}) créé`);
            }
        }

        console.log('\n=== RÔLES DANS LA BASE ===\n');
        const allRoles = await rolesCollection.find({}).sort({ niveau: 1 }).toArray();
        allRoles.forEach(r => {
            console.log(`  Niveau ${r.niveau}: ${r.libelle} (${r.nom})`);
        });

        console.log('\n✅ Terminé !');

    } catch (error) {
        console.error('❌ Erreur:', error.message);
    } finally {
        await client.close();
        console.log('✅ Déconnecté');
    }
}

createRoles();
