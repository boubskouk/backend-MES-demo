/**
 * Script de migration pour ajouter les champs manquants aux utilisateurs existants
 * Usage: node scripts/migrate-add-missing-fields.js
 */

const { MongoClient } = require('mongodb');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const DB_NAME = 'cerer_archivage';

async function migrate() {
    const client = new MongoClient(MONGODB_URI);

    try {
        await client.connect();
        console.log('✅ Connecté à MongoDB');

        const db = client.db(DB_NAME);
        const usersCollection = db.collection('users');

        // 1. Trouver tous les utilisateurs sans createdAt
        const usersWithoutCreatedAt = await usersCollection.find({
            createdAt: { $exists: false }
        }).toArray();

        console.log(`\n📊 ${usersWithoutCreatedAt.length} utilisateur(s) sans champ createdAt trouvé(s)`);

        if (usersWithoutCreatedAt.length === 0) {
            console.log('✅ Tous les utilisateurs ont déjà les champs requis');
            return;
        }

        // 2. Mettre à jour chaque utilisateur
        let updated = 0;
        for (const user of usersWithoutCreatedAt) {
            const updates = {};

            // Ajouter createdAt si manquant (date par défaut: il y a 30 jours)
            if (!user.createdAt) {
                const defaultDate = new Date();
                defaultDate.setDate(defaultDate.getDate() - 30); // Il y a 30 jours
                updates.createdAt = defaultDate;
            }

            // Ajouter createdBy si manquant (valeur par défaut: null)
            if (!user.createdBy) {
                updates.createdBy = null;
            }

            // Appliquer les mises à jour
            if (Object.keys(updates).length > 0) {
                await usersCollection.updateOne(
                    { _id: user._id },
                    { $set: updates }
                );
                console.log(`  ✅ ${user.username} - Champs ajoutés:`, Object.keys(updates).join(', '));
                updated++;
            }
        }

        console.log(`\n✅ Migration terminée: ${updated} utilisateur(s) mis à jour`);

        // 3. Vérification
        const stillMissing = await usersCollection.countDocuments({
            createdAt: { $exists: false }
        });

        if (stillMissing === 0) {
            console.log('✅ Tous les utilisateurs ont maintenant les champs requis');
        } else {
            console.log(`⚠️ Il reste ${stillMissing} utilisateur(s) sans champs`);
        }

    } catch (error) {
        console.error('❌ Erreur:', error);
    } finally {
        await client.close();
        console.log('\n👋 Déconnecté de MongoDB');
    }
}

migrate();
