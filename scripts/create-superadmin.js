const { MongoClient, ObjectId } = require('mongodb');
const bcrypt = require('bcrypt');
const readline = require('readline');

const MONGO_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/cerer_archivage?retryWrites=true&w=majority";
const DB_NAME = process.env.MONGODB_DB_NAME || 'cerer_archivage';

// Interface pour lire les entrées utilisateur
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

// Fonction pour poser une question
function question(query) {
    return new Promise(resolve => rl.question(query, resolve));
}

// Fonction pour poser une question de mot de passe (masqué)
function questionPassword(query) {
    return new Promise(resolve => {
        const stdin = process.stdin;
        const stdout = process.stdout;

        stdout.write(query);
        stdin.setRawMode(true);
        stdin.resume();
        stdin.setEncoding('utf8');

        let password = '';

        stdin.on('data', function listener(char) {
            char = char.toString('utf8');

            switch (char) {
                case '\n':
                case '\r':
                case '\u0004':
                    stdin.setRawMode(false);
                    stdin.pause();
                    stdin.removeListener('data', listener);
                    stdout.write('\n');
                    resolve(password);
                    break;
                case '\u0003':
                    process.exit();
                    break;
                case '\u007f': // Backspace
                    password = password.slice(0, -1);
                    stdout.clearLine();
                    stdout.cursorTo(0);
                    stdout.write(query + '*'.repeat(password.length));
                    break;
                default:
                    password += char;
                    stdout.write('*');
                    break;
            }
        });
    });
}

async function createSuperAdmin() {
    console.log('\n🛡️  ========================================');
    console.log('   CRÉATION D\'UN SUPER ADMINISTRATEUR');
    console.log('   (Niveau 0)');
    console.log('   ========================================\n');

    let client;

    try {
        // Connexion à la base de données
        console.log('🔄 Connexion à la base de données...');
        client = await MongoClient.connect(MONGO_URI);
        const db = client.db(DB_NAME);
        const usersCollection = db.collection('users');
        const rolesCollection = db.collection('roles');

        console.log('✅ Connecté à la base de données\n');

        // Trouver le rôle de niveau 0
        const superAdminRole = await rolesCollection.findOne({ niveau: 0 });
        if (!superAdminRole) {
            console.log('❌ ERREUR : Aucun rôle de niveau 0 trouvé dans la base de données !');
            console.log('   Assurez-vous que le rôle Super Admin existe.');
            return;
        }

        console.log(`✅ Rôle trouvé : ${superAdminRole.nom} (Niveau ${superAdminRole.niveau})\n`);

        // 📊 AFFICHER LES SUPER ADMINS EXISTANTS
        const existingSuperAdmins = await usersCollection.find({ idRole: superAdminRole._id }).toArray();
        if (existingSuperAdmins.length > 0) {
            console.log('📋 ========================================');
            console.log(`   SUPER ADMINS EXISTANTS (${existingSuperAdmins.length})`);
            console.log('   ========================================');
            existingSuperAdmins.forEach((admin, index) => {
                console.log(`   ${index + 1}. Username : ${admin.username}`);
                console.log(`      Nom      : ${admin.nom}`);
                console.log(`      Email    : ${admin.email}`);
                console.log('');
            });
            console.log('   ========================================\n');
            console.log('ℹ️  Vous pouvez créer un Super Admin supplémentaire.\n');
        } else {
            console.log('✅ Aucun Super Admin existant. Vous allez créer le premier.\n');
        }

        // Demander le nom d'utilisateur
        let username;
        while (true) {
            username = await question('📝 Nom d\'utilisateur (username) : ');
            username = username.trim();

            if (!username) {
                console.log('❌ Le nom d\'utilisateur ne peut pas être vide !\n');
                continue;
            }

            if (username.length < 3) {
                console.log('❌ Le nom d\'utilisateur doit contenir au moins 3 caractères !\n');
                continue;
            }

            if (!/^[a-zA-Z0-9_-]+$/.test(username)) {
                console.log('❌ Le nom d\'utilisateur ne peut contenir que des lettres, chiffres, _ et - !\n');
                continue;
            }

            // Vérifier si l'utilisateur existe déjà
            const existingUser = await usersCollection.findOne({ username });
            if (existingUser) {
                console.log(`❌ Le nom d'utilisateur "${username}" existe déjà !\n`);
                continue;
            }

            break;
        }

        // Demander le nom complet
        let nom;
        while (true) {
            nom = await question('👤 Nom complet : ');
            nom = nom.trim();

            if (!nom) {
                console.log('❌ Le nom complet ne peut pas être vide !\n');
                continue;
            }

            if (nom.length < 2) {
                console.log('❌ Le nom complet doit contenir au moins 2 caractères !\n');
                continue;
            }

            break;
        }

        // Demander l'email
        let email;
        while (true) {
            email = await question('📧 Email : ');
            email = email.trim().toLowerCase();

            if (!email) {
                console.log('❌ L\'email ne peut pas être vide !\n');
                continue;
            }

            if (!/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(email)) {
                console.log('❌ Format d\'email invalide !\n');
                continue;
            }

            // Vérifier si l'email existe déjà
            const existingEmail = await usersCollection.findOne({ email });
            if (existingEmail) {
                console.log(`❌ L'email "${email}" est déjà utilisé !\n`);
                continue;
            }

            break;
        }

        // Demander le mot de passe
        let password;
        while (true) {
            password = await questionPassword('🔐 Mot de passe (minimum 6 caractères) : ');

            if (!password) {
                console.log('❌ Le mot de passe ne peut pas être vide !\n');
                continue;
            }

            if (password.length < 6) {
                console.log('❌ Le mot de passe doit contenir au moins 6 caractères !\n');
                continue;
            }

            // Confirmer le mot de passe
            const confirmPassword = await questionPassword('🔐 Confirmer le mot de passe : ');

            if (password !== confirmPassword) {
                console.log('❌ Les mots de passe ne correspondent pas !\n');
                continue;
            }

            break;
        }

        // Afficher un résumé
        console.log('\n📋 ========================================');
        console.log('   RÉSUMÉ DES INFORMATIONS');
        console.log('   ========================================');
        console.log(`   Username  : ${username}`);
        console.log(`   Nom       : ${nom}`);
        console.log(`   Email     : ${email}`);
        console.log(`   Rôle      : ${superAdminRole.nom} (Niveau ${superAdminRole.niveau})`);
        console.log('   ========================================\n');

        // Demander confirmation
        const confirmation = await question('✅ Confirmer la création de ce Super Admin ? (oui/non) : ');

        if (confirmation.toLowerCase() !== 'oui' && confirmation.toLowerCase() !== 'o' && confirmation.toLowerCase() !== 'yes' && confirmation.toLowerCase() !== 'y') {
            console.log('\n❌ Création annulée.\n');
            return;
        }

        // Hacher le mot de passe
        console.log('\n🔄 Hachage du mot de passe...');
        const hashedPassword = await bcrypt.hash(password, 10);

        // Créer l'utilisateur
        console.log('🔄 Création du Super Admin...');
        const newUser = {
            username,
            password: hashedPassword,
            nom,
            email,
            idRole: superAdminRole._id,
            dateCreation: new Date(),
            firstLogin: false // Super Admin n'a pas besoin de changer le mot de passe
        };

        const result = await usersCollection.insertOne(newUser);

        if (result.insertedId) {
            console.log('\n✅ ========================================');
            console.log('   SUPER ADMIN CRÉÉ AVEC SUCCÈS ! 🎉');
            console.log('   ========================================');
            console.log(`   ID        : ${result.insertedId}`);
            console.log(`   Username  : ${username}`);
            console.log(`   Email     : ${email}`);
            console.log('   ========================================');
            console.log('\n   🔐 Vous pouvez maintenant vous connecter avec ces identifiants.');
            console.log('   🌐 URL : http://localhost:4000/super-admin-login.html\n');
        } else {
            console.log('\n❌ Erreur lors de la création du Super Admin.\n');
        }

    } catch (error) {
        console.error('\n❌ ERREUR :', error.message);
        console.error(error);
    } finally {
        rl.close();
        if (client) {
            await client.close();
            console.log('🔌 Connexion fermée\n');
        }
    }
}

// Lancer le script
createSuperAdmin().catch(console.error);
