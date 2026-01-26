#!/usr/bin/env node

// ============================================
// GÉNÉRATEUR DE SECRETS - ARCHIVAGE C.E.R.E.R
// ============================================

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

console.log('\n🔐 GÉNÉRATEUR DE SECRETS SÉCURISÉS');
console.log('═══════════════════════════════════════════════════════\n');

// ============================================
// GÉNÉRATION DES SECRETS
// ============================================

function generateSecret(length = 64) {
    return crypto.randomBytes(length).toString('hex');
}

// Générer tous les secrets nécessaires
const secrets = {
    JWT_SECRET: generateSecret(64),
    JWT_REFRESH_SECRET: generateSecret(64),
    SESSION_SECRET: generateSecret(32)
};

// ============================================
// AFFICHAGE DES SECRETS
// ============================================

console.log('Secrets générés avec succès:');
console.log('─────────────────────────────────────────────────────\n');

console.log('JWT_SECRET=');
console.log(secrets.JWT_SECRET);
console.log('');

console.log('JWT_REFRESH_SECRET=');
console.log(secrets.JWT_REFRESH_SECRET);
console.log('');

console.log('SESSION_SECRET=');
console.log(secrets.SESSION_SECRET);
console.log('');

console.log('─────────────────────────────────────────────────────\n');

// ============================================
// SAUVEGARDE DANS .env
// ============================================

const envPath = path.join(__dirname, '..', '.env');
const envExamplePath = path.join(__dirname, '..', '.env.example');

// Vérifier si .env existe déjà
if (fs.existsSync(envPath)) {
    console.log('⚠️  Le fichier .env existe déjà');
    console.log('\nOptions:');
    console.log('1. Copiez manuellement les secrets ci-dessus dans .env');
    console.log('2. Supprimez .env et relancez ce script pour le régénérer');
    console.log('3. Exécutez: node scripts/generate-secrets.js --force\n');

    if (process.argv.includes('--force')) {
        console.log('🔄 Mode --force activé, mise à jour de .env...\n');
        updateEnvFile(envPath, secrets);
    }
} else {
    console.log('📝 Création du fichier .env...\n');

    // Copier .env.example vers .env si disponible
    if (fs.existsSync(envExamplePath)) {
        fs.copyFileSync(envExamplePath, envPath);
        updateEnvFile(envPath, secrets);
    } else {
        createEnvFile(envPath, secrets);
    }
}

// ============================================
// INSTRUCTIONS
// ============================================

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('📋 INSTRUCTIONS');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

console.log('1. Vérifiez que les secrets ont bien été ajoutés à .env');
console.log('2. Configurez les autres variables (MongoDB, SMTP, etc.)');
console.log('3. NE COMMITEZ JAMAIS le fichier .env sur Git');
console.log('4. En production, configurez ces secrets dans les variables');
console.log('   d\'environnement de votre plateforme (Render, Heroku, etc.)\n');

console.log('🔒 SÉCURITÉ:');
console.log('   • Ces secrets donnent accès complet à votre application');
console.log('   • Gardez-les secrets et ne les partagez jamais');
console.log('   • Régénérez-les si vous soupçonnez une compromission');
console.log('   • Utilisez des secrets différents pour dev/prod\n');

console.log('✅ Secrets générés avec succès!\n');

// ============================================
// FONCTIONS UTILITAIRES
// ============================================

function updateEnvFile(filePath, secrets) {
    try {
        let content = fs.readFileSync(filePath, 'utf8');

        // Remplacer ou ajouter chaque secret
        for (const [key, value] of Object.entries(secrets)) {
            const regex = new RegExp(`^${key}=.*$`, 'm');

            if (regex.test(content)) {
                // Remplacer la valeur existante
                content = content.replace(regex, `${key}=${value}`);
            } else {
                // Ajouter la nouvelle variable
                content += `\n${key}=${value}`;
            }
        }

        fs.writeFileSync(filePath, content);
        console.log(`✅ Fichier ${filePath} mis à jour\n`);
    } catch (error) {
        console.error(`❌ Erreur lors de la mise à jour de ${filePath}:`, error.message);
    }
}

function createEnvFile(filePath, secrets) {
    const envContent = `# ============================================
# CONFIGURATION - ARCHIVAGE C.E.R.E.R
# ============================================

# MongoDB
MONGODB_URI=mongodb://localhost:27017/cerer_archivage?retryWrites=true&w=majority
PORT=4000
NODE_ENV=development

# Sécurité JWT (GÉNÉRÉS AUTOMATIQUEMENT - NE PAS MODIFIER MANUELLEMENT)
JWT_SECRET=${secrets.JWT_SECRET}
JWT_REFRESH_SECRET=${secrets.JWT_REFRESH_SECRET}
SESSION_SECRET=${secrets.SESSION_SECRET}

# Durée de vie des tokens
JWT_EXPIRY=2h
JWT_REFRESH_EXPIRY=7d

# HTTPS (optionnel en développement)
SSL_ENABLED=false
# SSL_CERT_PATH=/chemin/vers/cert.pem
# SSL_KEY_PATH=/chemin/vers/key.pem

# CORS
ALLOWED_ORIGINS=http://localhost:4000,http://127.0.0.1:4000

# Email SMTP
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=votre_email@gmail.com
SMTP_PASS=votre_mot_de_passe_application

# ============================================
# NOTES DE SÉCURITÉ
# ============================================
# - NE JAMAIS commiter ce fichier sur Git
# - Changez les secrets en production
# - Configurez MongoDB Atlas en production
# - Activez SSL_ENABLED=true en production
`;

    try {
        fs.writeFileSync(filePath, envContent);
        console.log(`✅ Fichier ${filePath} créé avec succès\n`);
    } catch (error) {
        console.error(`❌ Erreur lors de la création de ${filePath}:`, error.message);
    }
}
