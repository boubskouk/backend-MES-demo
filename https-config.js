// ============================================
// CONFIGURATION HTTPS - ARCHIVAGE C.E.R.E.R
// ============================================

const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');

// ============================================
// CONFIGURATION
// ============================================

const SSL_ENABLED = process.env.SSL_ENABLED === 'true';
const SSL_CERT_PATH = process.env.SSL_CERT_PATH || path.join(__dirname, 'ssl', 'cert.pem');
const SSL_KEY_PATH = process.env.SSL_KEY_PATH || path.join(__dirname, 'ssl', 'key.pem');
const SSL_CA_PATH = process.env.SSL_CA_PATH || null;

// ============================================
// CRÉATION DU SERVEUR
// ============================================

/**
 * Crée un serveur HTTP ou HTTPS selon la configuration
 * @param {Express} app - Application Express
 * @returns {Server} Serveur HTTP ou HTTPS
 */
function createServer(app) {
    if (!SSL_ENABLED) {
        console.log('🌐 Serveur HTTP (non sécurisé)');
        console.log('⚠️  Pour activer HTTPS, configurez SSL_ENABLED=true dans .env');
        return http.createServer(app);
    }

    try {
        // Vérifier l'existence des certificats
        if (!fs.existsSync(SSL_CERT_PATH)) {
            throw new Error(`Certificat SSL introuvable: ${SSL_CERT_PATH}`);
        }

        if (!fs.existsSync(SSL_KEY_PATH)) {
            throw new Error(`Clé privée SSL introuvable: ${SSL_KEY_PATH}`);
        }

        // Options HTTPS
        const httpsOptions = {
            cert: fs.readFileSync(SSL_CERT_PATH),
            key: fs.readFileSync(SSL_KEY_PATH)
        };

        // Ajouter le CA si fourni (certificat intermédiaire)
        if (SSL_CA_PATH && fs.existsSync(SSL_CA_PATH)) {
            httpsOptions.ca = fs.readFileSync(SSL_CA_PATH);
        }

        console.log('🔒 Serveur HTTPS activé');
        console.log(`   Certificat: ${SSL_CERT_PATH}`);
        console.log(`   Clé privée: ${SSL_KEY_PATH}`);

        return https.createServer(httpsOptions, app);
    } catch (error) {
        console.error('❌ Erreur lors de la création du serveur HTTPS:', error.message);
        console.log('⚠️  Retour au mode HTTP non sécurisé');
        return http.createServer(app);
    }
}

// ============================================
// MIDDLEWARE DE REDIRECTION HTTPS
// ============================================

/**
 * Middleware pour forcer HTTPS en production
 * Redirige HTTP vers HTTPS
 */
function forceHTTPS(req, res, next) {
    // Ne forcer HTTPS qu'en production
    if (process.env.NODE_ENV !== 'production') {
        return next();
    }

    // Vérifier si la requête est déjà en HTTPS
    const isSecure = req.secure ||
                     req.headers['x-forwarded-proto'] === 'https' ||
                     req.protocol === 'https';

    if (!isSecure) {
        const httpsUrl = `https://${req.headers.host}${req.url}`;
        console.log(`🔒 Redirection HTTP → HTTPS: ${req.url}`);
        return res.redirect(301, httpsUrl);
    }

    next();
}

// ============================================
// MIDDLEWARE HSTS (HTTP Strict Transport Security)
// ============================================

/**
 * Middleware pour ajouter le header HSTS
 * Force le navigateur à utiliser HTTPS pendant 1 an
 */
function hstsMiddleware(req, res, next) {
    if (process.env.NODE_ENV === 'production' && SSL_ENABLED) {
        res.setHeader(
            'Strict-Transport-Security',
            'max-age=31536000; includeSubDomains; preload'
        );
    }
    next();
}

// ============================================
// GÉNÉRATION DE CERTIFICATS AUTO-SIGNÉS (DEV)
// ============================================

/**
 * Génère des certificats auto-signés pour le développement
 * ATTENTION: Ne JAMAIS utiliser en production
 */
function generateSelfSignedCert() {
    const sslDir = path.join(__dirname, 'ssl');

    // Créer le dossier SSL s'il n'existe pas
    if (!fs.existsSync(sslDir)) {
        fs.mkdirSync(sslDir, { recursive: true });
    }

    console.log('\n⚠️  GÉNÉRATION DE CERTIFICATS AUTO-SIGNÉS (DÉVELOPPEMENT)');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    const { execSync } = require('child_process');

    try {
        // Générer la clé privée et le certificat avec OpenSSL
        execSync(`openssl req -x509 -newkey rsa:4096 -keyout "${path.join(sslDir, 'key.pem')}" -out "${path.join(sslDir, 'cert.pem')}" -days 365 -nodes -subj "/C=SN/ST=Dakar/L=Dakar/O=CERER/CN=localhost"`, {
            stdio: 'inherit'
        });

        console.log('✅ Certificats auto-signés générés avec succès');
        console.log(`   Clé: ${path.join(sslDir, 'key.pem')}`);
        console.log(`   Certificat: ${path.join(sslDir, 'cert.pem')}`);
        console.log('\n⚠️  CES CERTIFICATS SONT POUR LE DÉVELOPPEMENT UNIQUEMENT');
        console.log('   Pour la production, utilisez Let\'s Encrypt ou un CA reconnu');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

        return true;
    } catch (error) {
        console.error('❌ Erreur lors de la génération des certificats:', error.message);
        console.log('\n💡 Vous pouvez générer manuellement avec:');
        console.log('   openssl req -x509 -newkey rsa:4096 -keyout ssl/key.pem -out ssl/cert.pem -days 365 -nodes');
        return false;
    }
}

// ============================================
// GUIDE LET'S ENCRYPT
// ============================================

function showLetsEncryptGuide() {
    console.log('\n📖 GUIDE: Obtenir un certificat SSL gratuit avec Let\'s Encrypt');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('\n1. Installer Certbot:');
    console.log('   Ubuntu/Debian: sudo apt install certbot');
    console.log('   CentOS/RHEL: sudo yum install certbot');
    console.log('\n2. Obtenir un certificat:');
    console.log('   sudo certbot certonly --standalone -d votre-domaine.com');
    console.log('\n3. Les certificats seront dans:');
    console.log('   /etc/letsencrypt/live/votre-domaine.com/');
    console.log('\n4. Configurer dans .env:');
    console.log('   SSL_ENABLED=true');
    console.log('   SSL_CERT_PATH=/etc/letsencrypt/live/votre-domaine.com/fullchain.pem');
    console.log('   SSL_KEY_PATH=/etc/letsencrypt/live/votre-domaine.com/privkey.pem');
    console.log('\n5. Renouvellement automatique:');
    console.log('   sudo certbot renew --dry-run');
    console.log('   Ajouter au cron: 0 0 1 * * certbot renew --quiet');
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

// ============================================
// VÉRIFICATION DES CERTIFICATS
// ============================================

/**
 * Vérifie la validité des certificats SSL
 * @returns {Object} { valid, daysRemaining, error }
 */
function checkCertificateValidity() {
    if (!SSL_ENABLED || !fs.existsSync(SSL_CERT_PATH)) {
        return { valid: false, error: 'SSL non activé ou certificat introuvable' };
    }

    try {
        const { execSync } = require('child_process');
        const certInfo = execSync(`openssl x509 -in "${SSL_CERT_PATH}" -noout -enddate`).toString();

        // Extraire la date d'expiration
        const match = certInfo.match(/notAfter=(.+)/);
        if (!match) {
            return { valid: false, error: 'Impossible de lire la date d\'expiration' };
        }

        const expiryDate = new Date(match[1]);
        const now = new Date();
        const daysRemaining = Math.floor((expiryDate - now) / (1000 * 60 * 60 * 24));

        if (daysRemaining < 0) {
            return { valid: false, daysRemaining, error: 'Certificat expiré' };
        }

        if (daysRemaining < 30) {
            console.warn(`⚠️  Certificat SSL expire dans ${daysRemaining} jours`);
        }

        return { valid: true, daysRemaining };
    } catch (error) {
        return { valid: false, error: error.message };
    }
}

// ============================================
// EXPORTS
// ============================================

module.exports = {
    // Création serveur
    createServer,

    // Middlewares
    forceHTTPS,
    hstsMiddleware,

    // Utilitaires
    generateSelfSignedCert,
    showLetsEncryptGuide,
    checkCertificateValidity,

    // Constantes
    SSL_ENABLED,
    SSL_CERT_PATH,
    SSL_KEY_PATH
};
