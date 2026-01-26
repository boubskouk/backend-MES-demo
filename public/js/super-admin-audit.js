// ============================================
// GESTION DES SOUS-ONGLETS AUDIT
// ============================================

let currentAuditTab = 'logs';

// Changer de sous-onglet dans la section Audit
function switchAuditTab(tab) {
    currentAuditTab = tab;

    // Mettre à jour les styles des onglets
    const logsTab = document.getElementById('audit-tab-logs');
    const sessionsTab = document.getElementById('audit-tab-sessions');
    const profileChangesTab = document.getElementById('audit-tab-profile-changes');

    const logsContent = document.getElementById('audit-content-logs');
    const sessionsContent = document.getElementById('audit-content-sessions');
    const profileChangesContent = document.getElementById('audit-content-profile-changes');

    // Réinitialiser tous les onglets
    [logsTab, sessionsTab, profileChangesTab].forEach(btn => {
        btn.style.background = '#f8fafc';
        btn.style.color = '#64748b';
    });

    [logsContent, sessionsContent, profileChangesContent].forEach(content => {
        content.style.display = 'none';
    });

    // Activer l'onglet sélectionné
    if (tab === 'logs') {
        logsTab.style.background = '#667eea';
        logsTab.style.color = 'white';
        logsContent.style.display = 'block';
    } else if (tab === 'sessions') {
        sessionsTab.style.background = '#667eea';
        sessionsTab.style.color = 'white';
        sessionsContent.style.display = 'block';
    } else if (tab === 'profile-changes') {
        profileChangesTab.style.background = '#667eea';
        profileChangesTab.style.color = 'white';
        profileChangesContent.style.display = 'block';
        // Charger les changements de profil
        loadProfileChanges();
    }
}

// ============================================
// DIAGNOSTIC DES SESSIONS
// ============================================

async function runSessionDiagnostic() {
    const container = document.getElementById('sessions-diagnostic-result');
    container.innerHTML = '<div style="text-align: center; padding: 40px;"><div style="font-size: 48px; margin-bottom: 16px;">⏳</div><p style="color: #64748b;">Diagnostic en cours...</p></div>';

    try {
        const response = await fetch('/api/superadmin/sessions/diagnostic', {
            credentials: 'include'
        });

        if (!response.ok) {
            throw new Error('Erreur lors du diagnostic');
        }

        const data = await response.json();
        displaySessionDiagnostic(data);

    } catch (error) {
        console.error('Erreur diagnostic sessions:', error);
        container.innerHTML = `
            <div style="text-align: center; padding: 40px; color: #ef4444;">
                <div style="font-size: 48px; margin-bottom: 16px;">❌</div>
                <p style="font-weight: 600;">Erreur lors du diagnostic</p>
                <p style="font-size: 14px; color: #94a3b8;">${error.message}</p>
            </div>
        `;
    }
}

function displaySessionDiagnostic(data) {
    const container = document.getElementById('sessions-diagnostic-result');

    let html = '';

    // Stats globales
    html += `
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 30px;">
            <div style="background: #f0f9ff; padding: 20px; border-radius: 12px; border-left: 4px solid #0ea5e9;">
                <div style="font-size: 12px; color: #64748b; margin-bottom: 8px; text-transform: uppercase;">Total Utilisateurs</div>
                <div style="font-size: 32px; font-weight: 700; color: #0ea5e9;">${data.totalUsers || 0}</div>
            </div>
            <div style="background: #f0fdf4; padding: 20px; border-radius: 12px; border-left: 4px solid #10b981;">
                <div style="font-size: 12px; color: #64748b; margin-bottom: 8px; text-transform: uppercase;">En Ligne</div>
                <div style="font-size: 32px; font-weight: 700; color: #10b981;">${data.onlineUsers || 0}</div>
            </div>
            <div style="background: #fef3c7; padding: 20px; border-radius: 12px; border-left: 4px solid #f59e0b;">
                <div style="font-size: 12px; color: #64748b; margin-bottom: 8px; text-transform: uppercase;">Sessions MongoDB</div>
                <div style="font-size: 32px; font-weight: 700; color: #f59e0b;">${data.mongodbSessions || 0}</div>
            </div>
            <div style="background: ${data.issues > 0 ? '#fef2f2' : '#f0fdf4'}; padding: 20px; border-radius: 12px; border-left: 4px solid ${data.issues > 0 ? '#ef4444' : '#10b981'};">
                <div style="font-size: 12px; color: #64748b; margin-bottom: 8px; text-transform: uppercase;">Incohérences</div>
                <div style="font-size: 32px; font-weight: 700; color: ${data.issues > 0 ? '#ef4444' : '#10b981'};">${data.issues || 0}</div>
            </div>
        </div>
    `;

    // Liste des problèmes
    if (data.issues > 0 && data.problems) {
        html += '<div style="background: #fef2f2; padding: 20px; border-radius: 12px; border-left: 4px solid #ef4444; margin-bottom: 20px;">';
        html += '<h4 style="margin: 0 0 16px 0; color: #ef4444; font-size: 16px;">⚠️ Problèmes détectés</h4>';
        html += '<ul style="margin: 0; padding-left: 20px; color: #64748b;">';

        data.problems.forEach(problem => {
            html += `<li style="margin-bottom: 8px;">${problem}</li>`;
        });

        html += '</ul>';
        html += '<button onclick="fixSessionIssues()" style="margin-top: 16px; padding: 10px 20px; background: #ef4444; color: white; border: none; border-radius: 8px; font-weight: 600; cursor: pointer;">🔧 Corriger automatiquement</button>';
        html += '</div>';
    } else {
        html += '<div style="background: #f0fdf4; padding: 20px; border-radius: 12px; border-left: 4px solid #10b981; margin-bottom: 20px;">';
        html += '<h4 style="margin: 0; color: #10b981; font-size: 16px;">✅ Aucune incohérence détectée</h4>';
        html += '<p style="margin: 8px 0 0 0; color: #64748b;">Toutes les sessions sont cohérentes.</p>';
        html += '</div>';
    }

    // Utilisateurs en ligne
    if (data.onlineUsersList && data.onlineUsersList.length > 0) {
        html += '<div style="background: white; padding: 20px; border-radius: 12px; border: 1px solid #e2e8f0; margin-bottom: 20px;">';
        html += '<h4 style="margin: 0 0 16px 0; color: #1e293b; font-size: 16px;">👥 Utilisateurs actuellement en ligne</h4>';

        data.onlineUsersList.forEach(user => {
            const hasSession = user.hasSession;
            html += `
                <div style="padding: 12px; background: ${hasSession ? '#f0fdf4' : '#fef2f2'}; border-radius: 8px; margin-bottom: 8px; display: flex; justify-content: space-between; align-items: center;">
                    <div>
                        <div style="font-weight: 600; color: #1e293b;">${user.nom || user.username}</div>
                        <div style="font-size: 12px; color: #64748b;">Username: ${user.username}</div>
                    </div>
                    <div style="padding: 4px 12px; background: ${hasSession ? '#10b981' : '#ef4444'}; color: white; border-radius: 999px; font-size: 12px; font-weight: 600;">
                        ${hasSession ? '✅ Session OK' : '❌ Pas de session'}
                    </div>
                </div>
            `;
        });

        html += '</div>';
    }

    container.innerHTML = html;
}

async function fixSessionIssues() {
    if (!confirm('Voulez-vous corriger automatiquement les incohérences de sessions ?')) {
        return;
    }

    try {
        const response = await fetch('/api/superadmin/sessions/fix', {
            method: 'POST',
            credentials: 'include'
        });

        if (!response.ok) {
            throw new Error('Erreur lors de la correction');
        }

        const result = await response.json();
        alert(`✅ ${result.fixed} incohérence(s) corrigée(s)`);

        // Relancer le diagnostic
        runSessionDiagnostic();

    } catch (error) {
        console.error('Erreur correction sessions:', error);
        alert('❌ Erreur lors de la correction des sessions');
    }
}

// ============================================
// CHANGEMENTS DE PROFIL
// ============================================

async function loadProfileChanges(filters = {}) {
    const container = document.getElementById('profile-changes-list');
    container.innerHTML = '<div style="text-align: center; padding: 40px; color: #94a3b8;">Chargement de l\'historique...</div>';

    try {
        // Construire l'URL avec les filtres
        const params = new URLSearchParams();
        if (filters.username) params.append('username', filters.username);
        if (filters.type) params.append('type', filters.type);
        if (filters.period) params.append('period', filters.period);

        const url = `/api/superadmin/profile-changes?${params.toString()}`;

        const response = await fetch(url, {
            credentials: 'include'
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Erreur HTTP:', response.status, errorText);
            throw new Error(`Erreur ${response.status}: ${errorText.substring(0, 100)}`);
        }

        const data = await response.json();
        displayProfileChanges(data.changes || []);

    } catch (error) {
        console.error('Erreur chargement changements:', error);
        container.innerHTML = `
            <div style="text-align: center; padding: 40px; color: #ef4444;">
                <div style="font-size: 48px; margin-bottom: 16px;">❌</div>
                <p style="font-weight: 600;">Erreur lors du chargement de l'historique</p>
                <p style="font-size: 14px; color: #94a3b8;">${error.message}</p>
            </div>
        `;
    }
}

// Appliquer les filtres
function applyProfileFilters() {
    const filters = {
        username: document.getElementById('profile-filter-user')?.value.trim() || '',
        type: document.getElementById('profile-filter-type')?.value || '',
        period: document.getElementById('profile-filter-period')?.value || '7d'
    };

    loadProfileChanges(filters);
}

// Réinitialiser les filtres
function resetProfileFilters() {
    document.getElementById('profile-filter-user').value = '';
    document.getElementById('profile-filter-type').value = '';
    document.getElementById('profile-filter-period').value = '7d';

    loadProfileChanges({ period: '7d' });
}

function displayProfileChanges(changes) {
    const container = document.getElementById('profile-changes-list');

    if (changes.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 40px; color: #94a3b8;">
                📭 Aucun changement de profil enregistré
            </div>
        `;
        return;
    }

    let html = '<div style="space-y: 16px;">';

    changes.forEach(change => {
        const date = new Date(change.date).toLocaleString('fr-FR');
        const typeIcon = {
            nom: '👤',
            prenom: '👤',
            username: '🔑',
            email: '📧'
        }[change.type] || '📝';

        const typeLabel = {
            nom: 'Nom',
            prenom: 'Prénom',
            username: 'Username',
            email: 'Email'
        }[change.type] || 'Modification';

        // Nom complet de l'utilisateur
        const userFullName = change.userName && change.userPrenom
            ? `${change.userName} ${change.userPrenom}`
            : (change.userName || change.username);

        // Nom complet du modificateur
        const modifierFullName = change.modifierName && change.modifierPrenom
            ? `${change.modifierName} ${change.modifierPrenom}`
            : change.modifiedBy;

        html += `
            <div style="border: 2px solid #e2e8f0; border-radius: 12px; padding: 20px; margin-bottom: 16px; background: white;">
                <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 12px;">
                    <div>
                        <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
                            <span style="font-size: 20px;">${typeIcon}</span>
                            <span style="font-weight: 600; color: #1e293b;">${userFullName}</span>
                            <span style="font-size: 12px; color: #94a3b8;">@${change.username}</span>
                        </div>
                        <div style="font-size: 12px; color: #64748b;">
                            ${date} • Modifié par: <strong>${modifierFullName}</strong>
                        </div>
                    </div>
                    <div style="background: #667eea; color: white; padding: 4px 12px; border-radius: 999px; font-size: 11px; font-weight: 600;">
                        ${typeLabel}
                    </div>
                </div>

                <div style="background: #f8fafc; padding: 16px; border-radius: 8px; border-left: 4px solid #667eea;">
                    <div style="display: grid; grid-template-columns: 1fr auto 1fr; gap: 16px; align-items: center;">
                        <div>
                            <div style="font-size: 12px; color: #64748b; margin-bottom: 4px;">Ancienne valeur</div>
                            <div style="font-weight: 600; color: #ef4444;">${change.oldValue || '-'}</div>
                        </div>
                        <div style="color: #64748b; font-size: 20px;">→</div>
                        <div>
                            <div style="font-size: 12px; color: #64748b; margin-bottom: 4px;">Nouvelle valeur</div>
                            <div style="font-weight: 600; color: #10b981;">${change.newValue}</div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    });

    html += '</div>';
    container.innerHTML = html;
}
