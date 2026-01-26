const { MongoClient, ObjectId } = require('mongodb');
const bcrypt = require('bcrypt');

const MONGO_URI = "mongodb://localhost:27017/cerer_archivage?retryWrites=true&w=majority";

async function createUserTest2() {
    console.log('🔄 Connexion à la base de données...');

    const client = await MongoClient.connect(MONGO_URI);

    try {
        const db = client.db('cerer_archivage');
        const usersCollection = db.collection('users');

        // Vérifier si test2 existe déjà
        const existing = await usersCollection.findOne({ username: 'test2' });
        if (existing) {
            console.log('❌ L\'utilisateur test2 existe déjà !');
            return;
        }

        // IDs récupérés
        const idRole = new ObjectId('6903b0988a32fd80b12a7fcd'); // primaire (niveau 1)
        const idDepartement = new ObjectId('694bd843b553359d2ff15d93'); // informatique

        // Hasher le mot de passe
        const hashedPassword = await bcrypt.hash('test2', 10);

        // Créer l'utilisateur
        const newUser = {
            _id: new ObjectId(),
            username: 'test2',
            password: hashedPassword,
            email: 'test2@ucad.edu.sn',
            nom: 'Test Niveau 1',
            idRole: idRole,
            idDepartement: idDepartement,
            dateCreation: new Date(),
            actif: true
        };

        await usersCollection.insertOne(newUser);

        console.log('\n✅ Utilisateur test2 créé avec succès !');
        console.log('   USERNAME: test2');
        console.log('   PASSWORD: test2');
        console.log('   EMAIL: test2@ucad.edu.sn');
        console.log('   NOM: Test Niveau 1');
        console.log('   ROLE: primaire (niveau 1)');
        console.log('   DÉPARTEMENT: informatique');
        console.log('   ID:', newUser._id);
        console.log('\n   Vous pouvez maintenant vous connecter et créer des services !');

    } catch (error) {
        console.error('❌ Erreur:', error);
    } finally {
        await client.close();
        console.log('\n🔌 Connexion fermée');
    }
}

// Exécuter le script
createUserTest2().catch(console.error);
