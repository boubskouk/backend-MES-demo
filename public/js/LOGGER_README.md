# Système de Logging Centralisé

## Vue d'ensemble

Le système de logging centralisé remplace les appels `console.log/error/warn` par un système intelligent qui :
- ✅ Détecte automatiquement l'environnement (développement/production)
- ✅ Filtre les logs selon le niveau configuré
- ✅ Réduit le bruit en production
- ✅ Garde les logs importants (erreurs, avertissements)

## Configuration Automatique

Le logger se configure automatiquement :

| Environnement | Niveau de log | Logs affichés |
|--------------|---------------|---------------|
| **Développement** (localhost, 127.0.0.1, ports 3000/4000/5000/8000/8080) | DEBUG | Tous les logs |
| **Production** (autre) | WARN | Seulement WARN et ERROR |

## Utilisation

### Niveaux de log disponibles

```javascript
// DEBUG - Informations de débogage détaillées (masqué en production)
Logger.debug('Utilisateur connecté:', username);
Logger.debug('📊 Ouverture directe éditeur Excel local');

// INFO - Informations importantes sur le fonctionnement normal (masqué en production)
Logger.info('✅ Module OnlyOffice chargé');
Logger.info('🔐 Système de déconnexion automatique activé');

// WARN - Avertissements et situations anormales non critiques (visible en production)
Logger.warn('⚠️ Erreur keep-alive:', error);
Logger.warn('Session expirée, reconnexion nécessaire');

// ERROR - Erreurs et problèmes critiques (visible en production)
Logger.error('❌ Erreur lors de la déconnexion:', error);
Logger.error('Impossible de charger les documents');
```

### Migration depuis console.*

Ancienne syntaxe → Nouvelle syntaxe :

```javascript
// ❌ Ancien code
console.log('Message de debug');
console.log('✅ Opération réussie');
console.error('Erreur:', error);
console.warn('Avertissement');

// ✅ Nouveau code
Logger.debug('Message de debug');
Logger.info('✅ Opération réussie');
Logger.error('Erreur:', error);
Logger.warn('Avertissement');
```

## Configuration Manuelle (optionnel)

Si vous voulez forcer un niveau de log spécifique :

```javascript
// Afficher seulement les erreurs
Logger.configure({ minLevel: Logger.Level.ERROR });

// Afficher tous les logs (même en production)
Logger.configure({ minLevel: Logger.Level.DEBUG });

// Désactiver complètement les logs
Logger.configure({ enabled: false });

// Obtenir la configuration actuelle
const config = Logger.getConfig();
console.log(config.environment);  // 'development' ou 'production'
console.log(config.currentLevel); // 'DEBUG', 'INFO', 'WARN', 'ERROR' ou 'NONE'
```

## Grouper des Logs

Pour grouper des logs ensemble dans la console :

```javascript
Logger.group('Chargement des données', () => {
    Logger.info('Chargement des utilisateurs...');
    Logger.info('Chargement des documents...');
    Logger.info('✅ Données chargées');
});
```

## Avantages

### En Développement
- Tous les logs sont visibles pour faciliter le débogage
- Messages colorés et formatés avec timestamps
- Groupage possible pour organiser les logs

### En Production
- Seulement les WARN et ERROR sont affichés
- Réduit le bruit dans la console
- Améliore les performances (moins de logs)
- Facilite la détection des vrais problèmes

## Exemple Complet

```javascript
// Fonction avec logging approprié
async function loadDocuments() {
    Logger.debug('Début du chargement des documents');

    try {
        const response = await fetch('/api/documents');
        const data = await response.json();

        Logger.info(`✅ ${data.length} documents chargés`);
        return data;

    } catch (error) {
        Logger.error('❌ Erreur lors du chargement des documents:', error);
        throw error;
    }
}
```

## Fichiers Modifiés

Le système de logging a été intégré dans :
- ✅ `logger.js` - Système de logging centralisé
- ✅ `app.js` - Application principale
- ✅ `auto-logout.js` - Déconnexion automatique
- ✅ `superadmin-auto-logout.js` - Déconnexion super admin
- ✅ `multi-editor.js` - Gestionnaire multi-éditeurs
- ✅ `onlyoffice-editor.js` - Éditeur OnlyOffice

Et chargé dans les pages HTML :
- ✅ `index.html`
- ✅ `new-dashboard.html`
- ✅ `super-admin.html`
- ✅ `security-logs.html`
- ✅ `sessions-management.html`

## Support

Le logger est chargé avant tous les autres scripts pour être disponible partout.
Si vous voyez une erreur "Logger is not defined", vérifiez que `logger.js` est bien chargé dans votre page HTML.
