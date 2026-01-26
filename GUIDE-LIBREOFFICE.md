# Guide d'installation et d'utilisation de LibreOffice

Ce guide explique comment installer et utiliser LibreOffice pour éditer des fichiers Office dans votre application.

## 📥 Installation de LibreOffice

### 1. Télécharger LibreOffice

Téléchargez LibreOffice depuis le site officiel :
- **Site web** : https://www.libreoffice.org/download/download/
- **Version recommandée** : LibreOffice 7.x ou supérieure
- **Système** : Windows 64-bit

### 2. Installer LibreOffice

1. Exécutez le fichier d'installation téléchargé
2. Suivez les étapes d'installation (installation par défaut recommandée)
3. LibreOffice sera installé dans : `C:\Program Files\LibreOffice\`

### 3. Vérifier l'installation

Après l'installation, vérifiez que LibreOffice est bien installé :

```bash
cd E:\site et apps\archivage cerer\backend
node libreoffice-editor.js
```

Vous devriez voir :
```
✅ LibreOffice est installé et prêt à être utilisé !
```

## 🐍 Configuration Python (pour l'édition avancée)

Pour l'édition avancée (rechercher/remplacer du texte), vous devez configurer Python avec l'API UNO de LibreOffice.

### 1. Vérifier Python

```bash
python --version
```

Si Python n'est pas installé, téléchargez-le depuis : https://www.python.org/downloads/

### 2. Configurer le PATH Python de LibreOffice

LibreOffice inclut son propre Python. Ajoutez-le au PATH :

```bash
set PYTHONPATH=%PYTHONPATH%;C:\Program Files\LibreOffice\program
```

Pour une configuration permanente :
1. Ouvrez "Variables d'environnement"
2. Ajoutez une nouvelle variable `PYTHONPATH` :
   - Valeur : `C:\Program Files\LibreOffice\program`

## 🚀 Utilisation du module LibreOffice

### Module Node.js : `libreoffice-editor.js`

Le module fournit plusieurs fonctions pour manipuler les fichiers Office.

### Exemple 1 : Convertir en PDF

```javascript
const libreOfficeEditor = require('./libreoffice-editor');

(async () => {
    // Convertir un document Word en PDF
    const pdfFile = await libreOfficeEditor.convertToPDF(
        'E:/documents/rapport.docx'
    );
    console.log(`PDF créé : ${pdfFile}`);
})();
```

### Exemple 2 : Extraire le texte

```javascript
const libreOfficeEditor = require('./libreoffice-editor');

(async () => {
    // Extraire le texte d'un document
    const text = await libreOfficeEditor.extractText(
        'E:/documents/rapport.docx'
    );
    console.log('Contenu du document :', text);
})();
```

### Exemple 3 : Éditer un document Word

```javascript
const libreOfficeEditor = require('./libreoffice-editor');

(async () => {
    // Remplacer du texte dans un document Word
    await libreOfficeEditor.editWordDocument(
        'E:/documents/template.docx',
        'E:/documents/rapport-final.docx',
        {
            '{{nom}}': 'Jean Dupont',
            '{{date}}': '13/11/2025',
            '{{montant}}': '15 000 FCFA'
        }
    );
})();
```

### Exemple 4 : Éditer un tableur Excel

```javascript
const libreOfficeEditor = require('./libreoffice-editor');

(async () => {
    // Modifier des cellules dans un tableur
    await libreOfficeEditor.editExcelDocument(
        'E:/documents/data.xlsx',
        'E:/documents/data-updated.xlsx',
        {
            'A1': 'Nouveau titre',
            'B2': 12345,
            'C3': '=SUM(B2:B10)'
        }
    );
})();
```

### Exemple 5 : Ouvrir un document pour édition manuelle

```javascript
const libreOfficeEditor = require('./libreoffice-editor');

(async () => {
    // Ouvrir un document dans LibreOffice
    await libreOfficeEditor.openDocument('E:/documents/rapport.docx');
})();
```

## 📦 Intégration dans votre serveur

Ajoutez ces routes dans `server.js` :

```javascript
const libreOfficeEditor = require('./libreoffice-editor');

// Route pour convertir en PDF
app.post('/api/documents/:userId/:docId/convert-pdf', async (req, res) => {
    try {
        const { userId, docId } = req.params;

        // Récupérer le document
        const document = await documentsCollection.findOne({ _id: new ObjectId(docId) });
        if (!document) {
            return res.status(404).json({ message: 'Document non trouvé' });
        }

        // Décoder le contenu base64
        const buffer = Buffer.from(document.contenu, 'base64');
        const tempInputPath = path.join(__dirname, 'temp', `${docId}-input${path.extname(document.nomFichier)}`);
        fs.writeFileSync(tempInputPath, buffer);

        // Convertir en PDF
        const pdfPath = await libreOfficeEditor.convertToPDF(tempInputPath);

        // Lire le PDF
        const pdfBuffer = fs.readFileSync(pdfPath);

        // Nettoyer les fichiers temporaires
        fs.unlinkSync(tempInputPath);
        fs.unlinkSync(pdfPath);

        // Envoyer le PDF
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${path.basename(document.nomFichier, path.extname(document.nomFichier))}.pdf"`);
        res.send(pdfBuffer);

    } catch (error) {
        console.error('Erreur conversion PDF:', error);
        res.status(500).json({ message: 'Erreur de conversion' });
    }
});

// Route pour extraire le texte
app.get('/api/documents/:userId/:docId/extract-text', async (req, res) => {
    try {
        const { userId, docId } = req.params;

        // Récupérer le document
        const document = await documentsCollection.findOne({ _id: new ObjectId(docId) });
        if (!document) {
            return res.status(404).json({ message: 'Document non trouvé' });
        }

        // Décoder le contenu base64
        const buffer = Buffer.from(document.contenu, 'base64');
        const tempPath = path.join(__dirname, 'temp', `${docId}${path.extname(document.nomFichier)}`);
        fs.writeFileSync(tempPath, buffer);

        // Extraire le texte
        const text = await libreOfficeEditor.extractText(tempPath);

        // Nettoyer le fichier temporaire
        fs.unlinkSync(tempPath);

        res.json({ success: true, text });

    } catch (error) {
        console.error('Erreur extraction texte:', error);
        res.status(500).json({ message: 'Erreur d\'extraction' });
    }
});
```

## 🔧 Dépannage

### LibreOffice non trouvé

Si le module ne trouve pas LibreOffice, définissez la variable d'environnement :

```bash
set LIBREOFFICE_PATH=C:\Program Files\LibreOffice\program\soffice.exe
```

### Erreur Python UNO

Si vous obtenez une erreur avec Python UNO :

1. Vérifiez que LibreOffice est installé
2. Utilisez le Python de LibreOffice :
   ```bash
   "C:\Program Files\LibreOffice\program\python.exe" libreoffice-edit-word.py
   ```

### Conversion en PDF lente

La première conversion peut être lente car LibreOffice doit démarrer. Les conversions suivantes seront plus rapides.

## 📚 Formats supportés

LibreOffice supporte de nombreux formats :

**Entrée** :
- Word : .doc, .docx, .odt
- Excel : .xls, .xlsx, .ods
- PowerPoint : .ppt, .pptx, .odp
- PDF : .pdf
- Texte : .txt, .rtf

**Sortie** :
- PDF : .pdf
- Word : .docx, .odt
- Excel : .xlsx, .ods
- PowerPoint : .pptx, .odp
- HTML : .html
- Texte : .txt

## ✅ Tests

Un fichier de test est disponible : `test-libreoffice.js`

Exécutez-le pour vérifier que tout fonctionne :

```bash
node test-libreoffice.js
```

## 📖 Ressources

- Documentation LibreOffice : https://www.libreoffice.org/
- API UNO : https://api.libreoffice.org/
- Forum LibreOffice : https://ask.libreoffice.org/

---

**Note** : Pour une utilisation en production, envisagez d'utiliser LibreOffice en mode serveur (headless) pour de meilleures performances.
