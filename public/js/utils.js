// ============================================
// FONCTIONS UTILITAIRES - ARCHIVAGE C.E.R.E.R
// ============================================

// Afficher une notification
function showNotification(msg, type = 'success') {
    const notif = document.createElement('div');
    notif.className = `fixed top-4 right-4 z-50 px-6 py-3 rounded-lg shadow-lg text-white animate-slide-in ${
        type === 'error' ? 'bg-red-500' : type === 'warning' ? 'bg-orange-500' : 'bg-green-500'
    }`;
    notif.textContent = msg;
    document.body.appendChild(notif);
    setTimeout(() => {
        notif.style.opacity = '0';
        notif.style.transition = 'opacity 0.3s';
        setTimeout(() => notif.remove(), 300);
    }, 3000);
}

// Formater la taille des fichiers
function formatSize(bytes) {
    if (!bytes) return '0 B';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

// Formater une date
function formatDate(dateStr) {
    if (!dateStr) return 'Date inconnue';
    return new Date(dateStr).toLocaleDateString('fr-FR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}

// Compresser une image
async function compressImage(file, maxSizeKB = 1000) {
    return new Promise((resolve) => {
        // Si ce n'est pas une image, retourner le fichier tel quel en base64
        if (!file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.readAsDataURL(file);
            return;
        }

        // Compression pour les images
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let w = img.width;
                let h = img.height;
                const max = 1920;

                // Redimensionner si trop grand
                if (w > max || h > max) {
                    if (w > h) {
                        h = (h / w) * max;
                        w = max;
                    } else {
                        w = (w / h) * max;
                        h = max;
                    }
                }

                canvas.width = w;
                canvas.height = h;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, w, h);

                // Ajuster la qualité pour atteindre la taille cible
                let quality = 0.8;
                let result = canvas.toDataURL('image/jpeg', quality);

                while (result.length > maxSizeKB * 1024 * 1.37 && quality > 0.1) {
                    quality -= 0.1;
                    result = canvas.toDataURL('image/jpeg', quality);
                }

                resolve(result);
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    });
}

// Calculer l'utilisation du stockage
function calculateStorageUsage(documents) {
    let totalBytes = 0;
    documents.forEach(doc => {
        if (doc.taille) totalBytes += doc.taille;
    });
    const usedMB = totalBytes / (1024 * 1024);
    return {
        usedMB: usedMB.toFixed(2),
        totalMB: 1000,
        percentUsed: ((usedMB / 1000) * 100).toFixed(1)
    };
}

// Obtenir la classe de couleur de la barre de progression
function getStorageColorClass(percentUsed) {
    const percent = parseFloat(percentUsed);
    if (percent >= 90) return 'bg-red-500';
    if (percent >= 75) return 'bg-orange-500';
    if (percent >= 50) return 'bg-yellow-500';
    return 'bg-green-500';
}

// Échapper les valeurs pour utilisation sécurisée dans les attributs HTML
function escapeHtml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;')
        .replace(/\n/g, ' ')
        .replace(/\r/g, '');
}

// Options de couleurs pour les catégories
const colorOptions = [
    { value: 'bg-blue-100 text-blue-800', label: 'Bleu' },
    { value: 'bg-purple-100 text-purple-800', label: 'Violet' },
    { value: 'bg-green-100 text-green-800', label: 'Vert' },
    { value: 'bg-orange-100 text-orange-800', label: 'Orange' },
    { value: 'bg-red-100 text-red-800', label: 'Rouge' },
    { value: 'bg-pink-100 text-pink-800', label: 'Rose' },
    { value: 'bg-gray-100 text-gray-800', label: 'Gris' }
];