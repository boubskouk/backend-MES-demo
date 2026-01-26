#!/bin/bash

###############################################################################
# Script d'installation automatique - Serveur UCAD
# Système d'archivage C.E.R.E.R
###############################################################################
#
# Ce script automatise l'installation du système sur un serveur Ubuntu
#
# Utilisation:
#   chmod +x scripts/install-server.sh
#   ./scripts/install-server.sh
#
# Prérequis:
#   - Ubuntu Server 20.04 ou 22.04
#   - Accès sudo
#   - Connexion internet
#
###############################################################################

set -e  # Arrêter en cas d'erreur

# Couleurs pour l'affichage
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Fonctions utilitaires
print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

print_header() {
    echo ""
    echo -e "${BLUE}============================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}============================================${NC}"
    echo ""
}

# Vérifier que le script est exécuté avec sudo
check_sudo() {
    if [ "$EUID" -eq 0 ]; then
        print_error "Ne pas exécuter ce script avec sudo directement"
        print_info "Le script demandera sudo quand nécessaire"
        exit 1
    fi

    # Vérifier que l'utilisateur peut utiliser sudo
    if ! sudo -v; then
        print_error "Vous devez avoir les droits sudo pour exécuter ce script"
        exit 1
    fi
}

# Fonction de confirmation
confirm() {
    read -p "$1 (o/n): " -n 1 -r
    echo
    [[ $REPLY =~ ^[OoYy]$ ]]
}

# Mise à jour du système
update_system() {
    print_header "MISE À JOUR DU SYSTÈME"

    print_info "Mise à jour de la liste des paquets..."
    sudo apt update

    print_info "Mise à jour des paquets installés..."
    sudo apt upgrade -y

    print_info "Nettoyage..."
    sudo apt autoremove -y
    sudo apt autoclean

    print_success "Système mis à jour"
}

# Installation de Node.js
install_nodejs() {
    print_header "INSTALLATION DE NODE.JS 18.x"

    if command -v node &> /dev/null; then
        NODE_VERSION=$(node --version)
        print_warning "Node.js est déjà installé: $NODE_VERSION"

        if ! confirm "Voulez-vous réinstaller Node.js ?"; then
            return
        fi
    fi

    print_info "Téléchargement du script d'installation NodeSource..."
    curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -

    print_info "Installation de Node.js..."
    sudo apt install -y nodejs

    NODE_VERSION=$(node --version)
    NPM_VERSION=$(npm --version)

    print_success "Node.js installé: $NODE_VERSION"
    print_success "npm installé: $NPM_VERSION"
}

# Installation de Git
install_git() {
    print_header "INSTALLATION DE GIT"

    if command -v git &> /dev/null; then
        GIT_VERSION=$(git --version)
        print_success "Git déjà installé: $GIT_VERSION"
        return
    fi

    sudo apt install git -y

    GIT_VERSION=$(git --version)
    print_success "Git installé: $GIT_VERSION"
}

# Installation de MongoDB Database Tools
install_mongodb_tools() {
    print_header "INSTALLATION DE MONGODB DATABASE TOOLS"

    if command -v mongodump &> /dev/null; then
        print_success "MongoDB Database Tools déjà installé"
        return
    fi

    print_info "Téléchargement de MongoDB Database Tools..."

    # Détecter la version d'Ubuntu
    UBUNTU_VERSION=$(lsb_release -rs | cut -d. -f1)

    if [ "$UBUNTU_VERSION" = "22" ]; then
        TOOLS_URL="https://fastdl.mongodb.org/tools/db/mongodb-database-tools-ubuntu2204-x86_64-100.9.4.deb"
    else
        TOOLS_URL="https://fastdl.mongodb.org/tools/db/mongodb-database-tools-ubuntu2004-x86_64-100.9.4.deb"
    fi

    wget -q $TOOLS_URL -O /tmp/mongodb-tools.deb

    print_info "Installation..."
    sudo dpkg -i /tmp/mongodb-tools.deb

    rm /tmp/mongodb-tools.deb

    print_success "MongoDB Database Tools installé"
}

# Installation de Nginx
install_nginx() {
    print_header "INSTALLATION DE NGINX"

    if command -v nginx &> /dev/null; then
        print_success "Nginx déjà installé"

        if ! confirm "Voulez-vous réinstaller Nginx ?"; then
            return
        fi
    fi

    sudo apt install nginx -y

    sudo systemctl start nginx
    sudo systemctl enable nginx

    print_success "Nginx installé et démarré"
}

# Installation de Certbot
install_certbot() {
    print_header "INSTALLATION DE CERTBOT"

    if command -v certbot &> /dev/null; then
        print_success "Certbot déjà installé"
        return
    fi

    sudo apt install certbot python3-certbot-nginx -y

    print_success "Certbot installé"
}

# Installation de PM2
install_pm2() {
    print_header "INSTALLATION DE PM2"

    if command -v pm2 &> /dev/null; then
        print_success "PM2 déjà installé"
        return
    fi

    print_info "Installation de PM2 globalement..."
    sudo npm install -g pm2

    print_info "Configuration du démarrage automatique..."
    sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u $USER --hp $HOME

    print_success "PM2 installé"
}

# Configuration du pare-feu
configure_firewall() {
    print_header "CONFIGURATION DU PARE-FEU (UFW)"

    if ! command -v ufw &> /dev/null; then
        print_info "Installation de UFW..."
        sudo apt install ufw -y
    fi

    print_warning "Configuration du pare-feu..."
    print_warning "IMPORTANT: Assurez-vous d'être sur une connexion stable"

    if ! confirm "Voulez-vous configurer le pare-feu maintenant ?"; then
        print_warning "Pare-feu non configuré - À faire manuellement"
        return
    fi

    print_info "Autorisation SSH (port 22)..."
    sudo ufw allow 22/tcp

    print_info "Autorisation HTTP (port 80)..."
    sudo ufw allow 80/tcp

    print_info "Autorisation HTTPS (port 443)..."
    sudo ufw allow 443/tcp

    print_info "Activation du pare-feu..."
    sudo ufw --force enable

    print_success "Pare-feu configuré"
    sudo ufw status verbose
}

# Installation de Fail2Ban
install_fail2ban() {
    print_header "INSTALLATION DE FAIL2BAN"

    if command -v fail2ban-client &> /dev/null; then
        print_success "Fail2Ban déjà installé"
        return
    fi

    sudo apt install fail2ban -y

    # Créer une configuration locale
    if [ ! -f /etc/fail2ban/jail.local ]; then
        sudo cp /etc/fail2ban/jail.conf /etc/fail2ban/jail.local
    fi

    sudo systemctl start fail2ban
    sudo systemctl enable fail2ban

    print_success "Fail2Ban installé et démarré"
}

# Création des dossiers nécessaires
create_directories() {
    print_header "CRÉATION DES DOSSIERS"

    print_info "Création du dossier apps..."
    mkdir -p $HOME/apps

    print_info "Création du dossier logs..."
    mkdir -p $HOME/logs

    print_info "Création du dossier backups..."
    mkdir -p $HOME/backups
    chmod 700 $HOME/backups

    print_info "Création du dossier scripts..."
    mkdir -p $HOME/scripts

    print_success "Dossiers créés"
}

# Afficher le résumé
show_summary() {
    print_header "RÉSUMÉ DE L'INSTALLATION"

    echo ""
    echo "✅ Système mis à jour"
    echo "✅ Node.js $(node --version) installé"
    echo "✅ npm $(npm --version) installé"
    echo "✅ Git installé"
    echo "✅ MongoDB Database Tools installé"
    echo "✅ Nginx installé"
    echo "✅ Certbot installé"
    echo "✅ PM2 installé"
    echo "✅ Pare-feu configuré"
    echo "✅ Fail2Ban installé"
    echo "✅ Dossiers créés"
    echo ""

    print_header "PROCHAINES ÉTAPES"

    echo ""
    echo "1. Cloner votre dépôt Git:"
    echo "   cd ~/apps"
    echo "   git clone https://github.com/votre-repo/archivage-cerer.git"
    echo ""
    echo "2. Configurer l'application:"
    echo "   cd ~/apps/archivage-cerer/backend"
    echo "   cp .env.example .env"
    echo "   nano .env  # Configurer les variables d'environnement"
    echo ""
    echo "3. Installer les dépendances:"
    echo "   npm install --production"
    echo ""
    echo "4. Configurer Nginx:"
    echo "   sudo nano /etc/nginx/sites-available/archivage-ucad"
    echo "   # Copier la configuration depuis GUIDE_DEPLOIEMENT_UCAD.md"
    echo ""
    echo "5. Obtenir le certificat SSL:"
    echo "   sudo certbot --nginx -d archivage.ucad.sn"
    echo ""
    echo "6. Démarrer l'application:"
    echo "   pm2 start server.js --name archivage-cerer"
    echo "   pm2 save"
    echo ""
    echo "7. Consulter le guide complet:"
    echo "   cat GUIDE_DEPLOIEMENT_UCAD.md"
    echo ""
}

# Fonction principale
main() {
    clear

    print_header "INSTALLATION AUTOMATIQUE - SERVEUR UCAD"
    print_info "Système d'archivage C.E.R.E.R"
    echo ""

    print_warning "Ce script va installer:"
    echo "  - Node.js 18.x"
    echo "  - Git"
    echo "  - MongoDB Database Tools"
    echo "  - Nginx"
    echo "  - Certbot (Let's Encrypt)"
    echo "  - PM2"
    echo "  - Fail2Ban"
    echo "  - Configuration du pare-feu UFW"
    echo ""

    if ! confirm "Voulez-vous continuer ?"; then
        print_warning "Installation annulée"
        exit 0
    fi

    # Vérifications préliminaires
    check_sudo

    # Installation
    update_system
    install_nodejs
    install_git
    install_mongodb_tools
    install_nginx
    install_certbot
    install_pm2
    configure_firewall
    install_fail2ban
    create_directories

    # Résumé
    show_summary

    print_success "Installation terminée avec succès !"
}

# Exécuter le script
main
