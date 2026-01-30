/**
 * Debug complet du processus de login en production
 */

const bcrypt = require('bcrypt');
const { MongoClient, ObjectId } = require('mongodb');

const MONGODB_URI = 'mongodb+srv://cerer_user:JCIsME2FEYTOXLpX@cluster0.jodtq6h.mongodb.net/base_MES?retryWrites=true&w=majority&appName=Cluster0';

async function debugLogin() {
    const client = new MongoClient(MONGODB_URI);

    try {
        console.log('🔄 Connexion à MongoDB Atlas...');
        await client.connect();
        const db = client.db('base_MES');
        console.log('✅ Connecté\n');

        const usersCollection = db.collection('users');
        const rolesCollection = db.collection('roles');

        // 1. Chercher l'utilisateur exactement comme le fait le service
        console.log('=== ÉTAPE 1: Recherche utilisateur ===');
        const username = 'boubs';
        const user = await usersCollection.findOne({ username });

        if (!user) {
            console.log('❌ ERREUR: Utilisateur non trouvé avec username:', username);
            console.log('\n📋 Liste de tous les utilisateurs:');
            const allUsers = await usersCollection.find({}).toArray();
            allUsers.forEach(u => console.log(`  - "${u.username}"`));
            return;
        }

        console.log('✅ Utilisateur trouvé');
        console.log('   _id:', user._id);
        console.log('   username:', user.username);
        console.log('   idRole:', user.idRole);
        console.log('   statut:', user.statut);

        // 2. Vérifier le mot de passe
        console.log('\n=== ÉTAPE 2: Vérification mot de passe ===');
        const password = 'passer@123';
        console.log('   Hash stocké:', user.password);
        console.log('   Mot de passe testé:', password);

        const isBcryptHash = /^\$2[aby]\$/.test(user.password);
        console.log('   Est un hash bcrypt:', isBcryptHash);

        let isValid;
        if (isBcryptHash) {
            isValid = await bcrypt.compare(password, user.password);
        } else {
            isValid = password === user.password;
            console.log('   ⚠️ Mot de passe en clair (legacy)');
        }

        console.log('   Résultat:', isValid ? '✅ VALIDE' : '❌ INVALIDE');

        // 3. Récupérer le rôle
        console.log('\n=== ÉTAPE 3: Récupération du rôle ===');
        console.log('   idRole type:', typeof user.idRole);
        console.log('   idRole value:', user.idRole);

        let userRole = null;

        // Essayer différentes façons de chercher le rôle
        if (user.idRole) {
            // Essai 1: ObjectId direct
            userRole = await rolesCollection.findOne({ _id: user.idRole });
            console.log('   Recherche par _id direct:', userRole ? '✅ trouvé' : '❌ non trouvé');

            if (!userRole && typeof user.idRole === 'string') {
                // Essai 2: Convertir string en ObjectId
                try {
                    const roleId = new ObjectId(user.idRole);
                    userRole = await rolesCollection.findOne({ _id: roleId });
                    console.log('   Recherche par ObjectId converti:', userRole ? '✅ trouvé' : '❌ non trouvé');
                } catch (e) {
                    console.log('   ❌ Erreur conversion ObjectId:', e.message);
                }
            }
        }

        if (userRole) {
            console.log('   ✅ Rôle trouvé:');
            console.log('      nom:', userRole.nom);
            console.log('      libelle:', userRole.libelle);
            console.log('      niveau:', userRole.niveau);
        } else {
            console.log('   ❌ ERREUR: Rôle non trouvé!');
            console.log('\n📋 Liste de tous les rôles:');
            const allRoles = await rolesCollection.find({}).toArray();
            allRoles.forEach(r => console.log(`  - _id: ${r._id}, nom: ${r.nom}, niveau: ${r.niveau}`));
        }

        // 4. Résumé
        console.log('\n=== RÉSUMÉ ===');
        if (isValid && userRole && userRole.niveau === 0) {
            console.log('✅ Le login devrait fonctionner!');
            console.log('   Le problème est peut-être ailleurs (session, cookies, etc.)');
        } else {
            console.log('❌ Problèmes détectés:');
            if (!isValid) console.log('   - Mot de passe invalide');
            if (!userRole) console.log('   - Rôle non trouvé');
            if (userRole && userRole.niveau !== 0) console.log('   - Niveau != 0 (niveau actuel:', userRole?.niveau, ')');
        }

    } catch (error) {
        console.error('❌ Erreur:', error);
    } finally {
        await client.close();
        console.log('\n✅ Déconnecté');
    }
}

debugLogin();
