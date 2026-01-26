/**
 * Script pour recréer le compte super admin boubs
 */

const MongoClient = require('mongodb').MongoClient;
const bcrypt = require('bcrypt');
const { ObjectId } = require('mongodb');

const url = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const dbName = 'archivage_cerer';

async function recreateBoubs() {
    const client = await MongoClient.connect(url);

    try {
        const db = client.db(dbName);

        // 1. Trouver le rôle Super Administrateur (niveau 0)
        let superAdminRole = await db.collection('roles').findOne({ niveau: 0 });

        if (!superAdminRole) {
            console.error('❌ Rôle Super Administrateur (niveau 0) introuvable !');
            console.log('Création du rôle...');

            const roleResult = await db.collection('roles').insertOne({
                nom: 'Super Administrateur',
                libelle: 'Super Administrateur',
                niveau: 0,
                description: 'Accès complet au système'
            });

            superAdminRole = { _id: roleResult.insertedId };
            console.log('✅ Rôle créé');
        }

        console.log(`📌 ID Rôle Super Admin: ${superAdminRole._id}`);

        // 2. Hasher le mot de passe
        const hashedPassword = await bcrypt.hash('Boubs@2024', 10);

        // 3. Créer le compte boubs
        const result = await db.collection('users').insertOne({
            username: 'boubs',
            password: hashedPassword,
            nom: 'Boubs Admin',
            email: 'boubs@cerer.sn',
            idRole: superAdminRole._id,
            idDepartement: null,
            idService: null,
            dateCreation: new Date(),
            isOnline: false
        });

        console.log('✅ Compte boubs recréé avec succès !');
        console.log('   Username: boubs');
        console.log('   Password: Boubs@2024');
        console.log('   Niveau: 0 (Super Administrateur)');
        console.log('   ID:', result.insertedId);

    } catch (error) {
        console.error('❌ Erreur:', error);
    } finally {
        await client.close();
    }
}

recreateBoubs();
