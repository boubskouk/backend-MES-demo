#!/usr/bin/env node

// ============================================
// SCRIPT DE TEST SÉCURITÉ - ARCHIVAGE C.E.R.E.R
// ============================================

require('dotenv').config();
const path = require('path');

console.log('\n🔒 TEST DE SÉCURITÉ - ARCHIVAGE C.E.R.E.R');
console.log('═══════════════════════════════════════════════════════════════\n');

let testsPassed = 0;
let testsFailed = 0;

// ============================================
// FONCTIONS UTILITAIRES
// ============================================

function testPass(testName) {
    console.log(`✅ ${testName}`);
    testsPassed++;
}

function testFail(testName, reason) {
    console.log(`❌ ${testName}`);
    console.log(`   Raison: ${reason}\n`);
    testsFailed++;
}

function testInfo(message) {
    console.log(`ℹ️  ${message}`);
}

function sectionHeader(title) {
    console.log(`\n${'─'.repeat(60)}`);
    console.log(`  ${title}`);
    console.log(`${'─'.repeat(60)}\n`);
}

// ============================================
// TEST 1: MODULES DE SÉCURITÉ
// ============================================

sectionHeader('TEST 1: Vérification des modules de sécurité');

const requiredModules = [
    { name: 'auth-jwt.js', path: '../auth-jwt' },
    { name: 'cors-config.js', path: '../cors-config' },
    { name: 'audit-logger.js', path: '../audit-logger' },
    { name: 'https-config.js', path: '../https-config' },
    { name: 'security-config.js', path: '../security-config' }
];

requiredModules.forEach(module => {
    try {
        require(module.path);
        testPass(`Module ${module.name} chargé`);
    } catch (error) {
        testFail(`Module ${module.name} introuvable`, error.message);
    }
});

// ============================================
// TEST 2: CONFIGURATION JWT
// ============================================

sectionHeader('TEST 2: Configuration JWT');

try {
    const authJWT = require('../auth-jwt');

    // Vérifier que les secrets ne sont pas les valeurs par défaut
    if (authJWT.JWT_SECRET.includes('DEV_SECRET') || authJWT.JWT_SECRET.includes('CHANGE')) {
        testFail('Secret JWT', 'Secret par défaut détecté. Exécutez: node scripts/generate-secrets.js');
    } else {
        testPass('Secret JWT configuré');
    }

    // Test de génération de token
    const testUser = {
        _id: '507f1f77bcf86cd799439011',
        username: 'testuser',
        email: 'test@ucad.edu.sn',
        role: 'Admin Principal',
        niveau: 1,
        departement: 'Test'
    };

    const tokens = authJWT.generateTokens(testUser);

    if (tokens.accessToken && tokens.refreshToken) {
        testPass('Génération de tokens');
    } else {
        testFail('Génération de tokens', 'Tokens non générés');
    }

    // Test de vérification
    const decoded = authJWT.verifyAccessToken(tokens.accessToken);
    if (decoded && decoded.userId === testUser._id) {
        testPass('Vérification de token');
    } else {
        testFail('Vérification de token', 'Token invalide');
    }

    // Test expiration
    const expired = authJWT.isTokenExpired(tokens.accessToken);
    if (expired === false) {
        testPass('Token non expiré (normal)');
    } else {
        testFail('Token expiré', 'Le token devrait être valide');
    }

} catch (error) {
    testFail('Configuration JWT', error.message);
}

// ============================================
// TEST 3: CORS
// ============================================

sectionHeader('TEST 3: Configuration CORS');

try {
    const corsConfig = require('../cors-config');

    const origins = corsConfig.getAllowedOrigins();
    testInfo(`Origins autorisées: ${origins.join(', ')}`);

    if (origins.length > 0) {
        testPass('CORS configuré avec origins');
    } else {
        testFail('CORS', 'Aucune origin configurée');
    }

    // Test ajout/suppression
    corsConfig.addAllowedOrigin('https://test.example.com');
    if (corsConfig.isOriginAllowed('https://test.example.com')) {
        testPass('Ajout d\'origin dynamique');
        corsConfig.removeAllowedOrigin('https://test.example.com');
    } else {
        testFail('Ajout d\'origin dynamique', 'Origin non ajoutée');
    }

} catch (error) {
    testFail('Configuration CORS', error.message);
}

// ============================================
// TEST 4: AUDIT LOGGER
// ============================================

sectionHeader('TEST 4: Système d\'audit logs');

try {
    const audit = require('../audit-logger');
    const fs = require('fs');

    // Vérifier que le dossier logs existe
    const logsDir = path.join(__dirname, '..', 'logs', 'audit');
    if (!fs.existsSync(logsDir)) {
        fs.mkdirSync(logsDir, { recursive: true });
    }

    // Test de logging
    audit.logAuditEvent('TEST_EVENT', { test: true }, 'info');
    testPass('Logging d\'événement');

    // Vérifier que les fonctions de logging existent
    const requiredFunctions = [
        'logLoginSuccess',
        'logDocumentUploaded',
        'logUserCreated',
        'logDeletionRequested'
    ];

    requiredFunctions.forEach(funcName => {
        if (typeof audit[funcName] === 'function') {
            testPass(`Fonction ${funcName} disponible`);
        } else {
            testFail(`Fonction ${funcName}`, 'Fonction manquante');
        }
    });

} catch (error) {
    testFail('Système d\'audit logs', error.message);
}

// ============================================
// TEST 5: HTTPS
// ============================================

sectionHeader('TEST 5: Configuration HTTPS');

try {
    const httpsConfig = require('../https-config');

    testInfo(`SSL activé: ${httpsConfig.SSL_ENABLED}`);

    if (process.env.NODE_ENV === 'production' && !httpsConfig.SSL_ENABLED) {
        testFail('HTTPS en production', 'SSL devrait être activé en production');
    } else if (process.env.NODE_ENV === 'development') {
        testPass('HTTPS optionnel en développement');
    } else {
        testPass('Configuration HTTPS appropriée');
    }

    // Test de création de serveur (sans le démarrer)
    const express = require('express');
    const app = express();
    const server = httpsConfig.createServer(app);

    if (server) {
        testPass('Création du serveur');
    } else {
        testFail('Création du serveur', 'Serveur non créé');
    }

} catch (error) {
    testFail('Configuration HTTPS', error.message);
}

// ============================================
// TEST 6: VARIABLES D'ENVIRONNEMENT
// ============================================

sectionHeader('TEST 6: Variables d\'environnement');

const requiredEnvVars = [
    'MONGODB_URI',
    'PORT',
    'JWT_SECRET',
    'JWT_REFRESH_SECRET'
];

const optionalEnvVars = [
    'NODE_ENV',
    'ALLOWED_ORIGINS',
    'SSL_ENABLED',
    'SMTP_HOST',
    'SMTP_USER'
];

requiredEnvVars.forEach(varName => {
    if (process.env[varName]) {
        testPass(`Variable ${varName} configurée`);
    } else {
        testFail(`Variable ${varName}`, 'Variable manquante ou vide');
    }
});

optionalEnvVars.forEach(varName => {
    if (process.env[varName]) {
        testInfo(`${varName}: configurée`);
    } else {
        testInfo(`${varName}: non configurée (optionnel)`);
    }
});

// ============================================
// TEST 7: BCRYPT
// ============================================

sectionHeader('TEST 7: Hachage des mots de passe (Bcrypt)');

try {
    const bcrypt = require('bcrypt');

    const testPassword = 'Test123!@#';
    const hash = bcrypt.hashSync(testPassword, 10);

    if (hash && hash.length > 0) {
        testPass('Hachage de mot de passe');
    } else {
        testFail('Hachage de mot de passe', 'Hash vide');
    }

    const match = bcrypt.compareSync(testPassword, hash);
    if (match) {
        testPass('Vérification de mot de passe');
    } else {
        testFail('Vérification de mot de passe', 'Mots de passe ne correspondent pas');
    }

    const noMatch = bcrypt.compareSync('WrongPassword', hash);
    if (!noMatch) {
        testPass('Rejet de mauvais mot de passe');
    } else {
        testFail('Rejet de mauvais mot de passe', 'Devrait rejeter un mauvais mot de passe');
    }

} catch (error) {
    testFail('Bcrypt', error.message);
}

// ============================================
// TEST 8: RATE LIMITING
// ============================================

sectionHeader('TEST 8: Rate Limiting');

try {
    const security = require('../security-config');

    if (security.loginLimiter) {
        testPass('Login rate limiter configuré');
    } else {
        testFail('Login rate limiter', 'Limiter non configuré');
    }

    if (security.uploadLimiter) {
        testPass('Upload rate limiter configuré');
    } else {
        testFail('Upload rate limiter', 'Limiter non configuré');
    }

    if (security.generalLimiter) {
        testPass('General rate limiter configuré');
    } else {
        testFail('General rate limiter', 'Limiter non configuré');
    }

} catch (error) {
    testFail('Rate Limiting', error.message);
}

// ============================================
// TEST 9: HELMET (Security Headers)
// ============================================

sectionHeader('TEST 9: Headers de sécurité (Helmet)');

try {
    const security = require('../security-config');

    if (security.helmetConfig) {
        testPass('Helmet configuré');
    } else {
        testFail('Helmet', 'Configuration manquante');
    }

} catch (error) {
    testFail('Helmet', error.message);
}

// ============================================
// TEST 10: NoSQL Injection Protection
// ============================================

sectionHeader('TEST 10: Protection NoSQL Injection');

try {
    const security = require('../security-config');

    if (security.sanitizeConfig) {
        testPass('Sanitization configurée');
    } else {
        testFail('Sanitization', 'Configuration manquante');
    }

} catch (error) {
    testFail('NoSQL Injection Protection', error.message);
}

// ============================================
// RÉSUMÉ DES TESTS
// ============================================

console.log('\n' + '═'.repeat(60));
console.log('  RÉSUMÉ DES TESTS');
console.log('═'.repeat(60) + '\n');

const total = testsPassed + testsFailed;
const percentage = total > 0 ? Math.round((testsPassed / total) * 100) : 0;

console.log(`Tests réussis:  ${testsPassed}/${total} (${percentage}%)`);
console.log(`Tests échoués:  ${testsFailed}/${total}`);

if (testsFailed === 0) {
    console.log('\n🎉 TOUS LES TESTS SONT PASSÉS! Sécurité opérationnelle.\n');
    process.exit(0);
} else {
    console.log('\n⚠️  CERTAINS TESTS ONT ÉCHOUÉ. Veuillez corriger les problèmes.\n');
    console.log('💡 Suggestions:');
    console.log('   1. Exécutez: node scripts/generate-secrets.js');
    console.log('   2. Vérifiez votre fichier .env');
    console.log('   3. Consultez SECURITE-AVANCEE.md pour plus d\'infos\n');
    process.exit(1);
}
