// ============================================
// GESTION DES CATÉGORIES - ARCHIVAGE C.E.R.E.R
// ============================================

// Ajouter une nouvelle catégorie
async function addCategory() {
    const nom = document.getElementById('new_cat_nom').value.trim();
    const couleur = document.getElementById('new_cat_couleur').value;
    const icon = document.getElementById('new_cat_icon').value || '📁';

    if (!nom || nom.length < 2) {
        showNotification('Nom de catégorie invalide (minimum 2 caractères)', 'error');
        return;
    }

    const id = nom.toLowerCase().replace(/[^a-z0-9]/g, '_');

    try {
        await createCategory(state.currentUser, { id, nom, couleur, icon });
        await loadData();
        showNotification('✅ Catégorie ajoutée avec succès');
        
        // Réinitialiser les champs
        document.getElementById('new_cat_nom').value = '';
        document.getElementById('new_cat_icon').value = '';
    } catch (error) {
        // Erreur déjà gérée par apiCall
    }
}

// Supprimer une catégorie
async function deleteCategoryHandler(catId) {
    const count = state.documents.filter(d => d.categorie === catId).length;

    if (count > 0) {
        const confirmed = await customConfirm({
            title: 'Supprimer cette catégorie',
            message: `${count} document(s) seront automatiquement déplacés vers "Autre".\n\nVoulez-vous continuer ?`,
            confirmText: 'Oui, continuer',
            cancelText: 'Non, annuler',
            type: 'warning',
            icon: '⚠️'
        });

        if (!confirmed) {
            return;
        }
    }

    try {
        await deleteCategory(state.currentUser, catId);
        await loadData();
        showNotification('Catégorie supprimée avec succès');
    } catch (error) {
        // Erreur déjà gérée par apiCall
    }
}

// Obtenir la couleur d'une catégorie
function getCategoryColor(id) {
    const category = state.categories.find(c => c.id === id);
    return category ? category.couleur : 'bg-gray-100 text-gray-800';
}

// Obtenir le nom d'une catégorie
function getCategoryName(id) {
    const category = state.categories.find(c => c.id === id);
    return category ? category.nom : id;
}

// Obtenir l'icône d'une catégorie
function getCategoryIcon(id) {
    const category = state.categories.find(c => c.id === id);
    return category ? category.icon : '📁';
}

// Basculer l'affichage de la gestion des catégories
function toggleCategories() {
    state.showCategories = !state.showCategories;
    state.showUploadForm = false;
    render();
}