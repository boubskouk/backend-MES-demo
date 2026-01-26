// ============================================
// SERVICE D'ENVOI D'EMAIL
// Notifications pour les nouveaux utilisateurs
// ============================================

const nodemailer = require('nodemailer');

/**
 * Configuration du transporteur d'email
 *
 * IMPORTANT: Configurez vos identifiants SMTP dans le fichier .env
 *
 * Pour Gmail:
 * - Activer "Autoriser les applications moins sécurisées"
 * - OU créer un "Mot de passe d'application" (recommandé)
 *
 * Pour un serveur SMTP personnalisé:
 * - Utilisez les paramètres fournis par votre hébergeur
 */
function createTransporter() {
    // Configuration selon les variables d'environnement
    const config = {
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: process.env.SMTP_SECURE === 'true', // true pour port 465, false pour autres ports
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS
        }
    };

    // Si pas de configuration, utiliser un transporteur de test (ethereal)
    if (!config.auth.user || !config.auth.pass) {
        console.warn('⚠️  Configuration SMTP manquante. Les emails ne seront pas envoyés.');
        console.warn('   Configurez SMTP_USER et SMTP_PASS dans le fichier .env');
        return null;
    }

    return nodemailer.createTransport(config);
}

/**
 * Génère le HTML de l'email de bienvenue
 */
function generateWelcomeEmailHTML(userData) {
    const { nom, username, password, email, university } = userData;

    return `
<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Bienvenue sur la plateforme GED CERER</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
    <table role="presentation" style="width: 100%; border-collapse: collapse;">
        <tr>
            <td align="center" style="padding: 40px 0;">
                <table role="presentation" style="width: 600px; border-collapse: collapse; background-color: #ffffff; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                    <!-- En-tête -->
                    <tr>
                        <td style="padding: 40px 30px; background: linear-gradient(135deg, #0284c7 0%, #059669 100%); text-align: center;">
                            <h1 style="margin: 0; color: #ffffff; font-size: 28px;">🎓 Bienvenue sur GED CERER</h1>
                            <p style="margin: 10px 0 0 0; color: #e0f2fe; font-size: 16px;">Plateforme de Gestion Électronique de Documents</p>
                        </td>
                    </tr>

                    <!-- Corps du message -->
                    <tr>
                        <td style="padding: 40px 30px;">
                            <h2 style="color: #1e293b; margin-top: 0;">Bonjour ${nom},</h2>

                            <p style="color: #475569; font-size: 16px; line-height: 1.6;">
                                Votre compte a été créé avec succès sur la plateforme GED CERER, réservée aux universités sénégalaises.
                            </p>

                            ${university ? `
                            <div style="background-color: #f0f9ff; border-left: 4px solid: #0284c7; padding: 15px; margin: 20px 0;">
                                <p style="margin: 0; color: #0c4a6e; font-weight: bold;">
                                    ✓ Université reconnue : ${university}
                                </p>
                            </div>
                            ` : ''}

                            <div style="background-color: #f8fafc; border-radius: 8px; padding: 25px; margin: 30px 0;">
                                <h3 style="margin-top: 0; color: #1e293b;">🔑 Vos identifiants de connexion</h3>

                                <table style="width: 100%; border-collapse: collapse;">
                                    <tr>
                                        <td style="padding: 10px 0; color: #64748b; font-weight: bold;">Email :</td>
                                        <td style="padding: 10px 0; color: #1e293b; font-family: monospace; font-size: 16px;">${email}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 10px 0; color: #64748b; font-weight: bold;">Nom d'utilisateur :</td>
                                        <td style="padding: 10px 0; color: #1e293b; font-family: monospace; font-size: 16px;">${username}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 10px 0; color: #64748b; font-weight: bold;">Mot de passe :</td>
                                        <td style="padding: 10px 0; color: #1e293b; font-family: monospace; font-size: 16px; background-color: #fef3c7; padding: 5px 10px; border-radius: 4px;">
                                            <strong>${password}</strong>
                                        </td>
                                    </tr>
                                </table>

                                <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin-top: 20px;">
                                    <p style="margin: 0; color: #92400e; font-size: 14px;">
                                        ⚠️ <strong>Important :</strong> Pour votre sécurité, veuillez changer ce mot de passe dès votre première connexion.
                                    </p>
                                </div>
                            </div>

                            <div style="text-align: center; margin: 30px 0;">
                                <a href="${process.env.FRONTEND_URL || 'http://localhost:4000'}"
                                   style="display: inline-block; padding: 15px 40px; background: linear-gradient(135deg, #0284c7 0%, #059669 100%); color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px;">
                                    Se connecter maintenant
                                </a>
                            </div>

                            <div style="background-color: #f1f5f9; border-radius: 6px; padding: 20px; margin-top: 30px;">
                                <h4 style="margin-top: 0; color: #1e293b;">📚 Premiers pas</h4>
                                <ul style="color: #475569; line-height: 1.8; padding-left: 20px;">
                                    <li>Connectez-vous avec vos identifiants</li>
                                    <li>Changez votre mot de passe dans les paramètres</li>
                                    <li>Complétez votre profil</li>
                                    <li>Commencez à archiver vos documents</li>
                                </ul>
                            </div>
                        </td>
                    </tr>

                    <!-- Pied de page -->
                    <tr>
                        <td style="padding: 30px; background-color: #f8fafc; text-align: center; border-top: 1px solid #e2e8f0;">
                            <p style="margin: 0; color: #64748b; font-size: 14px;">
                                Cet email a été envoyé automatiquement. Merci de ne pas y répondre.
                            </p>
                            <p style="margin: 10px 0 0 0; color: #94a3b8; font-size: 12px;">
                                © ${new Date().getFullYear()} GED CERER - Plateforme réservée aux universités sénégalaises
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
    `.trim();
}

/**
 * Génère le texte brut de l'email (pour les clients qui ne supportent pas HTML)
 */
function generateWelcomeEmailText(userData) {
    const { nom, username, password, email, university } = userData;

    return `
Bonjour ${nom},

Votre compte a été créé avec succès sur la plateforme GED CERER.

${university ? `✓ Université reconnue : ${university}\n` : ''}
VOS IDENTIFIANTS DE CONNEXION
==============================

Email : ${email}
Nom d'utilisateur : ${username}
Mot de passe : ${password}

⚠️  IMPORTANT : Pour votre sécurité, veuillez changer ce mot de passe dès votre première connexion.

PREMIERS PAS
============

1. Connectez-vous sur ${process.env.FRONTEND_URL || 'http://localhost:4000'}
2. Changez votre mot de passe dans les paramètres
3. Complétez votre profil
4. Commencez à archiver vos documents

---
Cet email a été envoyé automatiquement. Merci de ne pas y répondre.
© ${new Date().getFullYear()} GED CERER - Plateforme réservée aux universités sénégalaises
    `.trim();
}

/**
 * Envoie un email de bienvenue au nouvel utilisateur
 *
 * @param {Object} userData - Données de l'utilisateur
 * @param {string} userData.nom - Nom complet
 * @param {string} userData.username - Nom d'utilisateur
 * @param {string} userData.password - Mot de passe (en clair, avant hachage)
 * @param {string} userData.email - Adresse email
 * @param {string} userData.university - Nom de l'université (optionnel)
 *
 * @returns {Promise<Object>} Résultat de l'envoi
 */
async function sendWelcomeEmail(userData) {
    try {
        const transporter = createTransporter();

        // Si pas de configuration SMTP, logger seulement
        if (!transporter) {
            console.log('📧 [EMAIL NON ENVOYÉ - Config manquante]');
            console.log(`   Destinataire: ${userData.email}`);
            console.log(`   Username: ${userData.username}`);
            console.log(`   Password: ${userData.password}`);

            return {
                success: false,
                error: 'Configuration SMTP manquante',
                logged: true
            };
        }

        // Configuration de l'email
        const mailOptions = {
            from: {
                name: process.env.SMTP_FROM_NAME || 'GED CERER',
                address: process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER
            },
            to: userData.email,
            subject: '🎓 Bienvenue sur la plateforme GED CERER - Vos identifiants',
            text: generateWelcomeEmailText(userData),
            html: generateWelcomeEmailHTML(userData)
        };

        // Envoi de l'email
        const info = await transporter.sendMail(mailOptions);

        console.log('✅ Email envoyé avec succès');
        console.log(`   Destinataire: ${userData.email}`);
        console.log(`   Message ID: ${info.messageId}`);

        return {
            success: true,
            messageId: info.messageId
        };

    } catch (error) {
        console.error('❌ Erreur lors de l\'envoi de l\'email:', error.message);

        return {
            success: false,
            error: error.message
        };
    }
}

/**
 * Teste la configuration SMTP
 */
async function testEmailConfiguration() {
    try {
        const transporter = createTransporter();

        if (!transporter) {
            return {
                success: false,
                error: 'Configuration SMTP manquante'
            };
        }

        // Vérifier la connexion
        await transporter.verify();

        console.log('✅ Configuration SMTP valide');
        return {
            success: true,
            message: 'Configuration SMTP valide'
        };

    } catch (error) {
        console.error('❌ Erreur de configuration SMTP:', error.message);
        return {
            success: false,
            error: error.message
        };
    }
}

module.exports = {
    sendWelcomeEmail,
    testEmailConfiguration
};
