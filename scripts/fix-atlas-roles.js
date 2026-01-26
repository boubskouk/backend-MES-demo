/**
 * Script de correction des rôles dans Atlas
 * Ajoute le champ "libelle" manquant au rôle niveau 0
 */

const { MongoClient } = require('mongodb');

const ATLAS_URI = 'mongodb+srv://jacquesboubacarkoukoui_db_user:um6pz5uhsXkNGdOe@cluster0.eq69ixv.mongodb.net/cerer_archivage?retryWrites=true&w=majority';

async function fixAtlasRoles() {
    let client;

    try {
        console.log('🔧 Connexion à MongoDB Atlas...\n');

        client = await MongoClient.connect(ATLAS_URI, {
            serverSelectionTimeoutMS: 5000
        });

        console.log('✅ Connexion réussie!\n');

        const db = client.db('cerer_archivage');
        const rolesCollection = db.collection('roles');

        // Afficher l'état actuel
        console.log('📋 État actuel des rôles:\n');
        const rolesBefore = await rolesCollection.find({}).toArray();
        for (const role of rolesBefore) {
            console.log(`   Niveau ${role.niveau}: libelle = "${role.libelle || 'MANQUANT'}"`);
        }

        console.log('\n🔧 Correction en cours...\n');

        // Corriger le rôle niveau 0
        const result = await rolesCollection.updateOne(
            { niveau: 0 },
            {
                $set: {
                    libelle: 'superadmin',
                    description: 'Supervision et administration complète du système'
                }
            }
        );

        if (result.modifiedCount > 0) {
            console.log('✅ Rôle niveau 0 corrigé avec succès!\n');
        } else {
            console.log('⚠️  Aucune modification effectuée (le rôle était peut-être déjà correct)\n');
        }

        // Vérifier que tous les rôles ont bien un libelle
        console.log('🔍 Vérification finale:\n');
        const rolesAfter = await rolesCollection.find({}).sort({ niveau: 1 }).toArray();

        let allGood = true;
        for (const role of rolesAfter) {
            const hasLibelle = role.libelle ? '✅' : '❌';
            console.log(`   ${hasLibelle} Niveau ${role.niveau}: "${role.libelle || 'MANQUANT'}" - ${role.description}`);
            if (!role.libelle) allGood = false;
        }

        console.log('\n' + '='.repeat(60));
        if (allGood) {
            console.log('🎉 SUCCÈS: Tous les rôles ont maintenant un libellé!');
            console.log('   → L\'erreur en production devrait être résolue');
            console.log('   → Vous pouvez maintenant déployer votre application');
        } else {
            console.log('⚠️  ATTENTION: Certains rôles ont encore des problèmes');
        }
        console.log('='.repeat(60));

    } catch (error) {
        console.error('❌ Erreur:', error.message);
    } finally {
        if (client) {
            await client.close();
            console.log('\n🔌 Connexion fermée');
        }
    }
}

// Exécuter
fixAtlasRoles().catch(console.error);
