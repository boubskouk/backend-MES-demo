/**
 * ROUTES DE GESTION DU PROFIL UTILISATEUR
 * Permet aux utilisateurs de gérer leur propre profil
 */

const bcrypt = require('bcrypt');
const fs = require('fs');
const path = require('path');

module.exports = function(app, collections) {
    const usersCollection = collections.users;
    const rolesCollection = collections.roles;
    const departementsCollection = collections.departements;
    const auditLogsCollection = collections.auditLogs;
    const { ObjectId } = require('mongodb');

    // 📁 Fichier de traçabilité des changements de profil
    const PROFILE_CHANGES_LOG = path.join(__dirname, 'logs', 'profile-changes.log');

    // Créer le dossier logs s'il n'existe pas
    if (!fs.existsSync(path.join(__dirname, 'logs'))) {
        fs.mkdirSync(path.join(__dirname, 'logs'), { recursive: true });
    }

    // Fonction pour écrire dans le fichier de traçabilité
    function writeProfileChangeLog(logData) {
        const timestamp = new Date().toISOString();
        const logLine = `
${'='.repeat(80)}
[${timestamp}] CHANGEMENT DE PROFIL - PRIORITÉ: ${logData.priority}
${'='.repeat(80)}
👤 Utilisateur: ${logData.oldUsername} ${logData.usernameChanged ? '→ ' + logData.newUsername : ''}

📋 ANCIENNES VALEURS:
   - Nom d'utilisateur: ${logData.oldUsername}
   - Nom complet: ${logData.oldNom || 'N/A'}
   - Email: ${logData.oldEmail || 'N/A'}

📋 NOUVELLES VALEURS:
   - Nom d'utilisateur: ${logData.newUsername} ${logData.usernameChanged ? '✏️ MODIFIÉ' : ''}
   - Nom complet: ${logData.newNom} ${logData.nomChanged ? '✏️ MODIFIÉ' : ''}
   - Email: ${logData.newEmail || 'N/A'} ${logData.emailChanged ? '✏️ MODIFIÉ' : ''}

📊 COMPTEURS DE MODIFICATIONS:
   - Nom: ${logData.nomChangeCount}/1 modification(s)
   - Username: ${logData.usernameChangeCount}/1 modification(s)

🌐 INFORMATIONS TECHNIQUES:
   - Adresse IP: ${logData.ip}
   - User Agent: ${logData.userAgent}
   - Session ID: ${logData.sessionId || 'N/A'}

⚠️ STATUT:
   ${logData.nomChangeCount >= 1 ? '🔒 Nom verrouillé (limite atteinte) - bayil di changer sa tour bi Rék 😊' : '✅ Nom modifiable'}
   ${logData.usernameChangeCount >= 1 ? '🔒 Username verrouillé (limite atteinte) - bayil di changer sa tour bi Rék 😊' : '✅ Username modifiable'}

🔄 MISE À JOUR GLOBALE:
   ${logData.usernameChanged ? '✅ Tous les documents, catégories, services et logs mis à jour' : '⏭️ Aucune mise à jour globale nécessaire'}

${'='.repeat(80)}

`;

        try {
            fs.appendFileSync(PROFILE_CHANGES_LOG, logLine, 'utf8');
            console.log(`📝 Log de traçabilité écrit: ${PROFILE_CHANGES_LOG}`);
        } catch (error) {
            console.error('❌ Erreur écriture log de traçabilité:', error);
        }
    }

    // ============================================
    // MISE À JOUR DU PROFIL UTILISATEUR
    // ============================================
    app.put('/api/profile/update', async (req, res) => {
        try {
            const userId = req.session?.userId;
            if (!userId) {
                return res.status(401).json({
                    success: false,
                    message: 'Non authentifié'
                });
            }

            const { nom, username, email } = req.body;

            // Validation basique
            if (!nom || !username) {
                return res.status(400).json({
                    success: false,
                    message: 'Le nom et le username sont requis'
                });
            }

            // Récupérer l'utilisateur actuel
            const currentUser = await usersCollection.findOne({ username: userId });
            if (!currentUser) {
                return res.status(404).json({
                    success: false,
                    message: 'Utilisateur non trouvé'
                });
            }

            // 🔒 SÉCURITÉ: Initialiser les compteurs s'ils n'existent pas (migration)
            const nomChangeCount = currentUser.nomChangeCount || 0;
            const usernameChangeCount = currentUser.usernameChangeCount || 0;

            // 🔒 CONTRAINTE: Vérifier si le nom a changé et si la limite est atteinte
            const nomHasChanged = nom !== currentUser.nom;
            if (nomHasChanged && nomChangeCount >= 1) {
                return res.status(403).json({
                    success: false,
                    message: '🔒 Modification du nom bloquée',
                    messageDetails: 'Vous avez déjà modifié votre nom une fois. bayil di changer sa tour bi Rék 😊',
                    contactAdmin: true
                });
            }

            // 🔒 CONTRAINTE: Vérifier si le username a changé et si la limite est atteinte
            const usernameHasChanged = username !== userId;
            if (usernameHasChanged && usernameChangeCount >= 1) {
                return res.status(403).json({
                    success: false,
                    message: '🔒 Modification du nom d\'utilisateur bloquée',
                    messageDetails: 'Vous avez déjà modifié votre nom d\'utilisateur une fois. bayil di changer sa tour bi Rék 😊',
                    contactAdmin: true
                });
            }

            // ✅ Vérifier si le nouveau username existe déjà (si différent de l'actuel)
            if (usernameHasChanged) {
                const existingUser = await usersCollection.findOne({ username });
                if (existingUser) {
                    return res.status(409).json({
                        success: false,
                        message: '😊 Yaw rek toudou fi nonou',
                        messageDetails: 'Ce nom d\'utilisateur est déjà utilisé'
                    });
                }
            }

            // Préparer les mises à jour autorisées
            const updateData = {
                nom,
                email: email || currentUser.email,
                updatedAt: new Date()
            };

            // Incrémenter les compteurs si modifications
            if (nomHasChanged) {
                updateData.nomChangeCount = nomChangeCount + 1;
            }

            if (usernameHasChanged) {
                updateData.username = username;
                updateData.usernameChangeCount = usernameChangeCount + 1;
            }

            // Mettre à jour l'utilisateur
            await usersCollection.updateOne(
                { username: userId },
                { $set: updateData }
            );

            // 🔄 MISE À JOUR GLOBALE: Si le username ou le nom a changé, mettre à jour partout
            if (usernameHasChanged || nomHasChanged) {
                const updateTasks = [];

                // Si le username a changé, mettre à jour dans tous les documents et collections
                if (usernameHasChanged) {
                    // 1. Mettre à jour les documents créés par cet utilisateur
                    updateTasks.push(
                        usersCollection.db.collection('documents').updateMany(
                            { userId },
                            { $set: { userId: username } }
                        )
                    );

                    // 2. Mettre à jour les documents verrouillés par cet utilisateur
                    updateTasks.push(
                        usersCollection.db.collection('documents').updateMany(
                            { lockedBy: userId },
                            { $set: { lockedBy: username } }
                        )
                    );

                    // 3. Mettre à jour les catégories créées par cet utilisateur
                    updateTasks.push(
                        usersCollection.db.collection('categories').updateMany(
                            { createdBy: userId },
                            { $set: { createdBy: username } }
                        )
                    );

                    // 4. Mettre à jour les logs d'audit
                    updateTasks.push(
                        auditLogsCollection.updateMany(
                            { user: userId },
                            { $set: { user: username } }
                        )
                    );

                    // 5. Mettre à jour les services (si userId existe dans services)
                    updateTasks.push(
                        usersCollection.db.collection('services').updateMany(
                            { createdBy: userId },
                            { $set: { createdBy: username } }
                        )
                    );
                }

                // Exécuter toutes les mises à jour en parallèle
                await Promise.all(updateTasks);

                console.log(`🔄 Mise à jour globale effectuée pour: ${userId} → ${username}`);
            }

            // 📧 NOTIFICATION SUPER ADMIN: Logger l'action avec notification
            const logEntry = {
                timestamp: new Date(),
                user: usernameHasChanged ? username : userId,
                action: 'PROFILE_UPDATED',
                priority: (nomHasChanged || usernameHasChanged) ? 'HIGH' : 'NORMAL',
                notifyAdmin: nomHasChanged || usernameHasChanged,
                details: {
                    changes: updateData,
                    oldValues: {
                        nom: currentUser.nom,
                        username: userId
                    },
                    newValues: {
                        nom: nom,
                        username: username
                    },
                    nomChanged: nomHasChanged,
                    usernameChanged: usernameHasChanged,
                    nomChangeCount: nomHasChanged ? nomChangeCount + 1 : nomChangeCount,
                    usernameChangeCount: usernameHasChanged ? usernameChangeCount + 1 : usernameChangeCount,
                    ip: req.ip,
                    userAgent: req.headers['user-agent']
                },
                ip: req.ip,
                userAgent: req.headers['user-agent']
            };

            await auditLogsCollection.insertOne(logEntry);

            // 📝 TRAÇABILITÉ: Écrire dans le fichier de log dédié
            const emailChanged = (email || currentUser.email) !== currentUser.email;
            writeProfileChangeLog({
                priority: (nomHasChanged || usernameHasChanged) ? 'HIGH' : 'NORMAL',
                oldUsername: userId,
                newUsername: username,
                usernameChanged: usernameHasChanged,
                oldNom: currentUser.nom,
                newNom: nom,
                nomChanged: nomHasChanged,
                oldEmail: currentUser.email,
                newEmail: email || currentUser.email,
                emailChanged: emailChanged,
                nomChangeCount: nomHasChanged ? nomChangeCount + 1 : nomChangeCount,
                usernameChangeCount: usernameHasChanged ? usernameChangeCount + 1 : usernameChangeCount,
                ip: req.ip,
                userAgent: req.headers['user-agent'],
                sessionId: req.sessionID
            });

            console.log(`✅ Profil mis à jour: ${userId} → ${username}` +
                       (nomHasChanged ? ` (nom: ${nomChangeCount + 1}/1)` : '') +
                       (usernameHasChanged ? ` (username: ${usernameChangeCount + 1}/1)` : ''));

            // Si le username a changé, mettre à jour la session
            if (usernameHasChanged) {
                req.session.userId = username;
            }

            res.json({
                success: true,
                message: 'Profil mis à jour avec succès',
                newUsername: username,
                remainingChanges: {
                    nom: 1 - (nomHasChanged ? nomChangeCount + 1 : nomChangeCount),
                    username: 1 - (usernameHasChanged ? usernameChangeCount + 1 : usernameChangeCount)
                }
            });

        } catch (error) {
            console.error('❌ Erreur mise à jour profil:', error);
            res.status(500).json({
                success: false,
                message: 'Erreur serveur'
            });
        }
    });

    // ============================================
    // UPLOAD DE PHOTO DE PROFIL
    // ============================================
    app.post('/api/profile/upload-photo', async (req, res) => {
        try {
            const userId = req.session?.userId;
            if (!userId) {
                return res.status(401).json({
                    success: false,
                    message: 'Non authentifié'
                });
            }

            const { photoData } = req.body;

            if (!photoData) {
                return res.status(400).json({
                    success: false,
                    message: 'Aucune photo fournie'
                });
            }

            // Vérifier que c'est bien une image base64
            if (!photoData.startsWith('data:image/')) {
                return res.status(400).json({
                    success: false,
                    message: 'Format de photo invalide'
                });
            }

            // Mettre à jour la photo de profil
            await usersCollection.updateOne(
                { username: userId },
                {
                    $set: {
                        photo: photoData,
                        photoUpdatedAt: new Date()
                    }
                }
            );

            // Logger l'action
            await auditLogsCollection.insertOne({
                timestamp: new Date(),
                user: userId,
                action: 'PROFILE_PHOTO_UPDATED',
                details: {
                    ip: req.ip,
                    userAgent: req.headers['user-agent']
                },
                ip: req.ip,
                userAgent: req.headers['user-agent']
            });

            console.log(`📸 Photo de profil mise à jour: ${userId}`);

            res.json({
                success: true,
                message: 'Photo de profil mise à jour avec succès'
            });

        } catch (error) {
            console.error('❌ Erreur upload photo:', error);
            res.status(500).json({
                success: false,
                message: 'Erreur serveur'
            });
        }
    });

    // ============================================
    // RÉCUPÉRER LA PHOTO DE PROFIL
    // ============================================
    app.get('/api/profile/photo/:username', async (req, res) => {
        try {
            const { username } = req.params;

            const user = await usersCollection.findOne(
                { username },
                { projection: { photo: 1 } }
            );

            if (!user || !user.photo) {
                return res.status(404).json({
                    success: false,
                    message: 'Photo non trouvée'
                });
            }

            res.json({
                success: true,
                photo: user.photo
            });

        } catch (error) {
            console.error('❌ Erreur récupération photo:', error);
            res.status(500).json({
                success: false,
                message: 'Erreur serveur'
            });
        }
    });

    // ============================================
    // 🔒 SUPER ADMIN: CONSULTER LES LOGS DE TRAÇABILITÉ (avec filtrage par date)
    // ============================================
    app.get('/api/superadmin/profile-changes-log', async (req, res) => {
        try {
            // 🔒 SÉCURITÉ: Vérifier que l'utilisateur est super admin (niveau 0)
            const userId = req.session?.userId;
            if (!userId) {
                return res.status(401).json({
                    success: false,
                    message: 'Non authentifié'
                });
            }

            const currentUser = await usersCollection.findOne({ username: userId });
            if (!currentUser) {
                return res.status(404).json({
                    success: false,
                    message: 'Utilisateur non trouvé'
                });
            }

            // Récupérer le rôle pour vérifier le niveau
            const userRole = await rolesCollection.findOne({ _id: currentUser.idRole });
            if (!userRole || userRole.niveau !== 0) {
                return res.status(403).json({
                    success: false,
                    message: 'Accès refusé - Réservé aux Super Administrateurs'
                });
            }

            // Vérifier si le fichier existe
            if (!fs.existsSync(PROFILE_CHANGES_LOG)) {
                return res.json({
                    success: true,
                    content: '📋 Aucun changement de profil enregistré pour le moment.',
                    isEmpty: true,
                    totalEntries: 0
                });
            }

            // Lire le fichier de log
            let logContent = fs.readFileSync(PROFILE_CHANGES_LOG, 'utf8');

            // 📅 FILTRAGE PAR DATE
            const { startDate, endDate } = req.query;
            let filteredContent = logContent;
            let totalEntries = 0;

            if (startDate || endDate) {
                // Séparer les entrées (délimitées par les lignes de ===)
                const entries = logContent.split(/={80,}/g).filter(e => e.trim());
                const header = entries[0] || ''; // En-tête du fichier

                const filteredEntries = entries.slice(1).filter(entry => {
                    // Extraire la date de l'entrée (format: [2025-12-27T15:30:45.123Z])
                    const dateMatch = entry.match(/\[(\d{4}-\d{2}-\d{2}T[\d:.]+Z)\]/);
                    if (!dateMatch) return false;

                    const entryDate = new Date(dateMatch[1]);

                    if (startDate) {
                        const start = new Date(startDate);
                        start.setHours(0, 0, 0, 0);
                        if (entryDate < start) return false;
                    }

                    if (endDate) {
                        const end = new Date(endDate);
                        end.setHours(23, 59, 59, 999);
                        if (entryDate > end) return false;
                    }

                    return true;
                });

                totalEntries = filteredEntries.length;

                if (filteredEntries.length === 0) {
                    filteredContent = header + '\n\n' +
                        '================================================================================\n' +
                        `📅 Aucune modification trouvée pour la période ${startDate || 'début'} → ${endDate || 'fin'}\n` +
                        '================================================================================\n';
                } else {
                    filteredContent = header + '\n' +
                        '=' + '='.repeat(79) + '\n' +
                        filteredEntries.join('=' + '='.repeat(79) + '\n');
                }
            } else {
                // Compter le nombre d'entrées total
                const entries = logContent.split(/={80,}/g).filter(e => e.trim() && e.includes('CHANGEMENT DE PROFIL'));
                totalEntries = entries.length;
            }

            // Logger l'accès au fichier de traçabilité
            await auditLogsCollection.insertOne({
                timestamp: new Date(),
                user: userId,
                action: 'PROFILE_CHANGES_LOG_ACCESSED',
                details: {
                    startDate: startDate || null,
                    endDate: endDate || null,
                    totalEntries,
                    ip: req.ip,
                    userAgent: req.headers['user-agent']
                },
                ip: req.ip,
                userAgent: req.headers['user-agent']
            });

            res.json({
                success: true,
                content: filteredContent,
                isEmpty: totalEntries === 0,
                totalEntries,
                fileSize: Buffer.byteLength(filteredContent, 'utf8'),
                lastModified: fs.statSync(PROFILE_CHANGES_LOG).mtime,
                filtered: !!(startDate || endDate),
                period: {
                    startDate: startDate || null,
                    endDate: endDate || null
                }
            });

        } catch (error) {
            console.error('❌ Erreur lecture log de traçabilité:', error);
            res.status(500).json({
                success: false,
                message: 'Erreur serveur'
            });
        }
    });

    // ============================================
    // 🔒 SUPER ADMIN: TÉLÉCHARGER LE FICHIER DE LOG (avec filtrage par date)
    // ============================================
    app.get('/api/superadmin/profile-changes-log/download', async (req, res) => {
        try {
            // 🔒 SÉCURITÉ: Vérifier que l'utilisateur est super admin (niveau 0)
            const userId = req.session?.userId;
            if (!userId) {
                return res.status(401).json({
                    success: false,
                    message: 'Non authentifié'
                });
            }

            const currentUser = await usersCollection.findOne({ username: userId });
            if (!currentUser) {
                return res.status(404).json({
                    success: false,
                    message: 'Utilisateur non trouvé'
                });
            }

            // Récupérer le rôle pour vérifier le niveau
            const userRole = await rolesCollection.findOne({ _id: currentUser.idRole });
            if (!userRole || userRole.niveau !== 0) {
                return res.status(403).json({
                    success: false,
                    message: 'Accès refusé - Réservé aux Super Administrateurs'
                });
            }

            // Vérifier si le fichier existe
            if (!fs.existsSync(PROFILE_CHANGES_LOG)) {
                return res.status(404).json({
                    success: false,
                    message: 'Fichier de log introuvable'
                });
            }

            // Lire le fichier de log
            let logContent = fs.readFileSync(PROFILE_CHANGES_LOG, 'utf8');

            // 📅 FILTRAGE PAR DATE (même logique que la route de consultation)
            const { startDate, endDate } = req.query;
            let filteredContent = logContent;
            let totalEntries = 0;

            if (startDate || endDate) {
                const entries = logContent.split(/={80,}/g).filter(e => e.trim());
                const header = entries[0] || '';

                const filteredEntries = entries.slice(1).filter(entry => {
                    const dateMatch = entry.match(/\[(\d{4}-\d{2}-\d{2}T[\d:.]+Z)\]/);
                    if (!dateMatch) return false;

                    const entryDate = new Date(dateMatch[1]);

                    if (startDate) {
                        const start = new Date(startDate);
                        start.setHours(0, 0, 0, 0);
                        if (entryDate < start) return false;
                    }

                    if (endDate) {
                        const end = new Date(endDate);
                        end.setHours(23, 59, 59, 999);
                        if (entryDate > end) return false;
                    }

                    return true;
                });

                totalEntries = filteredEntries.length;

                if (filteredEntries.length === 0) {
                    filteredContent = header + '\n\n' +
                        '================================================================================\n' +
                        `📅 Aucune modification trouvée pour la période ${startDate || 'début'} → ${endDate || 'fin'}\n` +
                        '================================================================================\n';
                } else {
                    filteredContent = header + '\n' +
                        '=' + '='.repeat(79) + '\n' +
                        filteredEntries.join('=' + '='.repeat(79) + '\n');
                }
            }

            // Logger le téléchargement
            await auditLogsCollection.insertOne({
                timestamp: new Date(),
                user: userId,
                action: 'PROFILE_CHANGES_LOG_DOWNLOADED',
                details: {
                    startDate: startDate || null,
                    endDate: endDate || null,
                    totalEntries,
                    ip: req.ip,
                    userAgent: req.headers['user-agent']
                },
                ip: req.ip,
                userAgent: req.headers['user-agent']
            });

            // Créer un fichier temporaire avec le contenu filtré
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const filename = startDate || endDate
                ? `profile-changes-${startDate || 'debut'}-to-${endDate || 'fin'}-${timestamp}.txt`
                : `profile-changes-log-${timestamp}.txt`;

            // Envoyer le contenu filtré
            res.setHeader('Content-Type', 'text/plain; charset=utf-8');
            res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
            res.send(filteredContent);

        } catch (error) {
            console.error('❌ Erreur téléchargement log:', error);
            res.status(500).json({
                success: false,
                message: 'Erreur serveur'
            });
        }
    });
};
