# ⚡ DÉMARRAGE RAPIDE - 5 MINUTES
## Tester les Nouvelles Fonctionnalités

---

## 🚀 LANCEMENT (30 secondes)

```bash
# Terminal 1 : Démarrer le serveur
cd "C:\Users\HP\Desktop\Nouveau dossier (6)\config_fichier\backend"
node server.js
```

**Attendez de voir :**
```
✅ SERVEUR ARCHIVAGE C.E.R.E.R DÉMARRÉ
🔡 http://localhost:4000
```

---

## 🧪 TEST 1 : PARTAGE INTERDÉPARTEMENTAL (2 min)

### Étape 1 : Fatima crée un document
1. Ouvrir : **http://localhost:4000**
2. Se connecter : `fatima` / `1234`
3. Cliquer **"Ajouter"** ou **"➕"**
4. Créer un document (n'importe quel titre)
5. ✅ Document créé

### Étape 2 : JBK voit le document de Fatima
1. **Déconnexion**
2. Se connecter : `jbk` / `0811`
3. ✅ **VÉRIFIER** : Le document de Fatima est visible !

**💡 Pourquoi ?** Les deux sont niveau 1, le partage interdépartemental est activé.

---

## 🧪 TEST 2 : PARTAGE HORIZONTAL (2 min)

### Étape 1 : Alice crée un document
1. Se connecter : `alice` / `1111`
2. Créer un document : "Facture Alice"
3. ✅ Document créé

### Étape 2 : Bob voit le document d'Alice
1. **Déconnexion**
2. Se connecter : `bob` / `2222`
3. ✅ **VÉRIFIER** : Le document d'Alice est visible !

**💡 Pourquoi ?** Même niveau (2), même département (Comptabilité).

---

## 🧪 TEST 3 : DEMANDE DE SUPPRESSION (3 min)

### Étape 1 : Deguene demande une suppression
1. Se connecter : `deguene` / `3576`
2. Créer un document : "Test Suppression"
3. **Supprimer** ce document
4. ✅ **VÉRIFIER** : Message "Demande créée"
5. ✅ **VÉRIFIER** : Document toujours visible

### Étape 2 : JBK approuve la demande
1. **Déconnexion**
2. Se connecter : `jbk` / `0811`
3. Ouvrir : **http://localhost:4000/demo-deletion-requests.html**
4. ✅ **VÉRIFIER** : Demande de Deguene affichée
5. Cliquer **"✅ Approuver"**
6. ✅ **VÉRIFIER** : "Document supprimé avec succès"

---

## 📊 TABLEAU DES UTILISATEURS DE TEST

| Username | Password | Niveau | Département |
|----------|----------|--------|-------------|
| fatima | 1234 | 1 | Direction |
| jbk | 0811 | 1 | Comptabilité |
| alice | 1111 | 2 | Comptabilité |
| bob | 2222 | 2 | Comptabilité |
| deguene | 3576 | 3 | Comptabilité |
| carlos | 3333 | 3 | RH |

---

## ✅ RÉSULTAT ATTENDU

Si tous les tests passent :

- ✅ Partage interdépartemental niveau 1 : **FONCTIONNE**
- ✅ Partage horizontal même niveau : **FONCTIONNE**
- ✅ Demande de suppression niveau 2/3 : **FONCTIONNE**
- ✅ Approbation par niveau 1 : **FONCTIONNE**

**🎉 SYSTÈME OPÉRATIONNEL !**

---

## 📖 POUR ALLER PLUS LOIN

- **Documentation complète :** `NOUVELLES-FONCTIONNALITES-PARTAGE-VALIDATION.md`
- **Guide de test détaillé :** `GUIDE-TEST-INTERFACE-WEB.md`
- **Intégration frontend :** `GUIDE-INTEGRATION-FRONTEND.md`
- **Récapitulatif final :** `RECAP-FINAL-IMPLEMENTATION.md`

---

**Temps total : ~7 minutes** ⏱️
