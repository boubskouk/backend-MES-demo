#!/usr/bin/env node

require('dotenv').config();
const { MongoClient, ObjectId } = require('mongodb');

const MONGO_URI = process.env.MONGODB_URI || "mongodb://localhost:27017";
const DB_NAME = process.env.MONGODB_DB_NAME || 'cerer_archivage';

async function debugUserRole() {
    let client;
    try {
        client = await MongoClient.connect(MONGO_URI);
        const db = client.db(DB_NAME);

        const usersCollection = db.collection('users');
        const rolesCollection = db.collection('roles');

        // Trouver l'utilisateur boubs
        const user = await usersCollection.findOne({ username: 'boubs' });

        if (!user) {
            console.log('❌ Utilisateur boubs non trouvé');
            await client.close();
            return;
        }

        console.log('\n📋 Utilisateur boubs:');
        console.log('   ID:', user._id);
        console.log('   Username:', user.username);
        console.log('   ID Role:', user.idRole);
        console.log('   Type ID Role:', typeof user.idRole);

        // Trouver le rôle
        const role = await rolesCollection.findOne({ _id: user.idRole });

        console.log('\n🎭 Rôle associé:');
        if (role) {
            console.log('   ID:', role._id);
            console.log('   Libellé:', role.libelle);
            console.log('   Niveau:', role.niveau);
            console.log('   Description:', role.description);
        } else {
            console.log('   ❌ Rôle non trouvé avec ID:', user.idRole);

            // Chercher tous les rôles
            const allRoles = await rolesCollection.find({}).toArray();
            console.log('\n📋 Tous les rôles:');
            allRoles.forEach(r => {
                console.log(`   - ${r._id} | Niveau ${r.niveau} | ${r.libelle || r.description || 'N/A'}`);
            });
        }

        await client.close();

    } catch (error) {
        console.error('❌ Erreur:', error);
        if (client) await client.close();
    }
}

debugUserRole();
