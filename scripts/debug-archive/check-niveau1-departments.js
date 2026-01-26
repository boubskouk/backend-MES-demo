/**
 * Script de vérification des utilisateurs niveau 1
 * Vérifie que tous les utilisateurs niveau 1 ont un département
 */

const { MongoClient, ObjectId } = require('mongodb');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const DB_NAME = 'cerer_archivage';

async function checkNiveau1Users() {
    const client = new MongoClient(MONGODB_URI);

    try {
        await client.connect();
        console.log('✅ Connecté à MongoDB');

        const db = client.db(DB_NAME);
        const usersCollection = db.collection('users');
        const rolesCollection = db.collection('roles');

        // 1. Trouver tous les utilisateurs
        const allUsers = await usersCollection.find({}).toArray();
        console.log(`\n📊 Total utilisateurs: ${allUsers.length}`);

        let niveau1Count = 0;
        let niveau1SansDept = [];
        let niveau1AvecDept = [];

        for (const user of allUsers) {
            // Convertir idRole en ObjectId si nécessaire
            const roleId = typeof user.idRole === 'string'
                ? new ObjectId(user.idRole)
                : user.idRole;

            const role = await rolesCollection.findOne({ _id: roleId });

            if (role && role.niveau === 1) {
                niveau1Count++;

                console.log(`\n👤 Utilisateur Niveau 1: ${user.username}`);
                console.log(`   - Nom: ${user.nom}`);
                console.log(`   - Email: ${user.email}`);
                console.log(`   - idRole: ${user.idRole} (type: ${typeof user.idRole})`);
                console.log(`   - idDepartement: ${user.idDepartement || 'AUCUN'} (type: ${typeof user.idDepartement})`);
                console.log(`   - Role trouvé: ${role.nom} (Niveau ${role.niveau})`);

                if (!user.idDepartement) {
                    niveau1SansDept.push(user.username);
                    console.log(`   ⚠️ PROBLÈME: Pas de département !`);
                } else {
                    niveau1AvecDept.push(user.username);
                    console.log(`   ✅ Département configuré`);
                }
            }
        }

        console.log(`\n\n=== RÉSUMÉ ===`);
        console.log(`📊 Utilisateurs Niveau 1: ${niveau1Count}`);
        console.log(`✅ Avec département: ${niveau1AvecDept.length}`);
        console.log(`⚠️ Sans département: ${niveau1SansDept.length}`);

        if (niveau1SansDept.length > 0) {
            console.log(`\n⚠️ UTILISATEURS NIVEAU 1 SANS DÉPARTEMENT:`);
            niveau1SansDept.forEach(u => console.log(`   - ${u}`));
            console.log(`\n🔴 CES UTILISATEURS VERRONT TOUS LES UTILISATEURS DU SYSTÈME !`);
        } else {
            console.log(`\n✅ Tous les utilisateurs niveau 1 ont un département assigné`);
        }

    } catch (error) {
        console.error('❌ Erreur:', error);
    } finally {
        await client.close();
        console.log('\n👋 Déconnecté de MongoDB');
    }
}

checkNiveau1Users();
