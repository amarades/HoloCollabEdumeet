#!/bin/bash
# HoloCollab EduMeet Cloud Deployment Script
# Supports AWS, DigitalOcean, Google Cloud, and generic Linux servers

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
CLOUD_PROVIDER=${CLOUD_PROVIDER:-"generic"}
DOMAIN=${DOMAIN:-""}
EMAIL=${EMAIL:-""}

# Functions
log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Check prerequisites
check_prerequisites() {
    log_info "Checking prerequisites..."

    if [ "$CLOUD_PROVIDER" = "generic" ] && [ -z "$DOMAIN" ]; then
        log_error "DOMAIN environment variable is required for generic deployment"
        exit 1
    fi

    if ! command -v curl &> /dev/null; then
        log_error "curl is required but not installed"
        exit 1
    fi

    log_success "Prerequisites check passed"
}

# Install system dependencies
install_system_deps() {
    log_info "Installing system dependencies..."

    # Update package list
    sudo apt update

    # Install basic tools
    sudo apt install -y curl wget git htop ufw fail2ban unattended-upgrades software-properties-common

    log_success "System dependencies installed"
}

# Install Docker
install_docker() {
    log_info "Installing Docker..."

    # Remove old versions
    sudo apt remove -y docker docker-engine docker.io containerd runc 2>/dev/null || true

    # Install Docker
    curl -fsSL https://get.docker.com -o get-docker.sh
    sudo sh get-docker.sh

    # Add user to docker group
    sudo usermod -aG docker $USER

    # Install Docker Compose
    sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    sudo chmod +x /usr/local/bin/docker-compose

    log_success "Docker installed"
}

# Configure firewall
configure_firewall() {
    log_info "Configuring firewall..."

    sudo ufw default deny incoming
    sudo ufw default allow outgoing

    # Allow SSH
    sudo ufw allow ssh

    # Allow HTTP/HTTPS
    sudo ufw allow 80
    sudo ufw allow 443

    # Allow TURN server
    sudo ufw allow 3478
    sudo ufw allow 5349

    # Allow WebRTC media ports
    sudo ufw allow 50000:60000/udp

    # Enable firewall
    echo "y" | sudo ufw enable

    log_success "Firewall configured"
}

# Setup SSL certificates
setup_ssl() {
    if [ -n "$EMAIL" ] && [ -n "$DOMAIN" ]; then
        log_info "Setting up SSL certificates..."

        # Install Certbot
        sudo apt install -y certbot python3-certbot-nginx

        # Get SSL certificate
        sudo certbot certonly --standalone -d $DOMAIN -d livekit.$DOMAIN --email $EMAIL --agree-tos --non-interactive

        log_success "SSL certificates obtained"
    else
        log_warning "SSL setup skipped - EMAIL and DOMAIN not provided"
    fi
}

# Clone and configure application
setup_application() {
    log_info "Setting up application..."

    # Clone repository (replace with your repo)
    if [ ! -d "HoloCollabEduMeet" ]; then
        git clone https://github.com/yourusername/HoloCollabEduMeet.git
    fi

    cd HoloCollabEduMeet

    # Copy environment file
    cp .env.example .env

    # Generate secrets
    generate_secrets

    # Configure domain
    if [ -n "$DOMAIN" ]; then
        sed -i "s/your-domain.com/$DOMAIN/g" .env
        sed -i "s/livekit.your-domain.com/livekit.$DOMAIN/g" .env
    fi

    log_success "Application configured"
}

# Generate secure secrets
generate_secrets() {
    log_info "Generating secure secrets..."

    # Generate random secrets
    POSTGRES_PASSWORD=$(openssl rand -hex 16)
    LIVEKIT_API_KEY=$(openssl rand -hex 16)
    LIVEKIT_API_SECRET=$(openssl rand -hex 32)
    TURN_PASSWORD=$(openssl rand -hex 16)
    SESSION_SECRET=$(openssl rand -hex 32)
    JWT_SECRET=$(openssl rand -hex 32)
    INTERNAL_API_KEY=$(openssl rand -hex 32)

    # Update .env file
    cat >> .env << EOF

# Generated secrets
POSTGRES_PASSWORD=$POSTGRES_PASSWORD
LIVEKIT_API_KEY=$LIVEKIT_API_KEY
LIVEKIT_API_SECRET=$LIVEKIT_API_SECRET
TURN_PASSWORD=$TURN_PASSWORD
SESSION_SECRET=$SESSION_SECRET
SECRET_KEY=$JWT_SECRET
INTERNAL_API_KEY=$INTERNAL_API_KEY
EOF

    log_success "Secrets generated and saved"
}

# Deploy application
deploy_application() {
    log_info "Deploying application..."

    cd infrastructure

    # Make deployment script executable
    chmod +x deploy.sh

    # Run deployment
    ./deploy.sh

    log_success "Application deployed"
}

# Setup monitoring
setup_monitoring() {
    log_info "Setting up monitoring..."

    # Install Node Exporter for Prometheus
    sudo apt install -y prometheus-node-exporter

    # Setup logrotate for Docker logs
    sudo tee /etc/logrotate.d/docker > /dev/null << EOF
/var/lib/docker/containers/*/*.log {
    rotate 7
    daily
    compress
    missingok
    delaycompress
    copytruncate
}
EOF

    log_success "Monitoring configured"
}

# Cloud provider specific setup
setup_cloud_specific() {
    case $CLOUD_PROVIDER in
        "aws")
            log_info "Setting up AWS-specific configuration..."
            # Install AWS CLI
            curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
            unzip awscliv2.zip
            sudo ./aws/install
            rm -rf aws awscliv2.zip
            log_success "AWS CLI installed"
            ;;

        "digitalocean")
            log_info "Setting up DigitalOcean-specific configuration..."
            # Install doctl
            wget https://github.com/digitalocean/doctl/releases/download/v1.104.0/doctl-1.104.0-linux-amd64.tar.gz
            tar xf doctl-1.104.0-linux-amd64.tar.gz
            sudo mv doctl /usr/local/bin
            rm doctl-1.104.0-linux-amd64.tar.gz
            log_success "doctl installed"
            ;;

        "gcp")
            log_info "Setting up Google Cloud-specific configuration..."
            # Install gcloud SDK
            echo "deb [signed-by=/usr/share/keyrings/cloud.google.gpg] https://packages.cloud.google.com/apt cloud-sdk main" | sudo tee -a /etc/apt/sources.list.d/google-cloud-sdk.list
            curl https://packages.cloud.google.com/apt/doc/apt-key.gpg | sudo apt-key --keyring /usr/share/keyrings/cloud.google.gpg add -
            sudo apt update && sudo apt install -y google-cloud-sdk
            log_success "Google Cloud SDK installed"
            ;;

        "generic")
            log_info "Generic Linux setup - no cloud-specific configuration needed"
            ;;
    esac
}

# Main deployment function
main() {
    echo -e "${BLUE}🚀 HoloCollab EduMeet Cloud Deployment${NC}"
    echo -e "${BLUE}=====================================${NC}"
    echo "Cloud Provider: $CLOUD_PROVIDER"
    echo "Domain: ${DOMAIN:-Not specified}"
    echo "Email: ${EMAIL:-Not specified}"
    echo ""

    check_prerequisites
    install_system_deps
    install_docker
    configure_firewall
    setup_cloud_specific
    setup_application
    setup_ssl
    deploy_application
    setup_monitoring

    echo ""
    log_success "Deployment completed successfully!"
    echo ""
    echo -e "${BLUE}🌐 Access your application:${NC}"
    if [ -n "$DOMAIN" ]; then
        echo "  • Main App: https://$DOMAIN"
        echo "  • LiveKit: https://livekit.$DOMAIN"
    else
        echo "  • Main App: http://your-server-ip"
        echo "  • LiveKit: http://your-server-ip/livekit"
    fi
    echo ""
    echo -e "${BLUE}🛠️  Management commands:${NC}"
    echo "  • View logs: cd HoloCollabEduMeet/infrastructure && docker-compose logs -f"
    echo "  • Check status: docker-compose ps"
    echo "  • Restart services: docker-compose restart"
    echo ""
    echo -e "${YELLOW}⚠️  Important next steps:${NC}"
    echo "  1. Update DNS records to point to this server"
    echo "  2. Configure database and Redis (consider managed services)"
    echo "  3. Set up monitoring and alerts"
    echo "  4. Test with multiple participants"
    echo "  5. Configure backups"
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --cloud=*)
            CLOUD_PROVIDER="${1#*=}"
            shift
            ;;
        --domain=*)
            DOMAIN="${1#*=}"
            shift
            ;;
        --email=*)
            EMAIL="${1#*=}"
            shift
            ;;
        --help)
            echo "Usage: $0 [OPTIONS]"
            echo ""
            echo "Options:"
            echo "  --cloud=PROVIDER    Cloud provider (aws, digitalocean, gcp, generic)"
            echo "  --domain=DOMAIN     Your domain name"
            echo "  --email=EMAIL       Email for SSL certificates"
            echo "  --help              Show this help"
            echo ""
            echo "Examples:"
            echo "  $0 --cloud=aws --domain=holocollab.com --email=admin@holocollab.com"
            echo "  $0 --cloud=digitalocean --domain=myapp.com --email=user@gmail.com"
            exit 0
            ;;
        *)
            log_error "Unknown option: $1"
            exit 1
            ;;
    esac
done

# Run main deployment
main