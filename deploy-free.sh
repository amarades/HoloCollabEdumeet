#!/bin/bash
# Free Hosting Deployment Script for HoloCollab EduMeet
# Supports Railway, Render, and Fly.io

set -e

# Colors
BLUE='\033[0;34m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Configuration
PLATFORM=${PLATFORM:-"railway"}

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

    if ! command -v node &> /dev/null; then
        log_error "Node.js is required but not installed"
        exit 1
    fi

    if ! command -v npm &> /dev/null; then
        log_error "npm is required but not installed"
        exit 1
    fi

    log_success "Prerequisites check passed"
}

# Setup free databases
setup_databases() {
    log_info "Setting up free databases..."

    echo ""
    echo "🔧 Database Setup Required:"
    echo "=========================="
    echo "1. Supabase (PostgreSQL):"
    echo "   - Go to https://supabase.com"
    echo "   - Create free account"
    echo "   - Create new project"
    echo "   - Copy DATABASE_URL from Settings > Database"
    echo ""

    echo "2. Upstash (Redis):"
    echo "   - Go to https://upstash.com"
    echo "   - Create free Redis database"
    echo "   - Copy REST API URL and Token"
    echo ""

    read -p "Have you set up the databases? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        log_warning "Please set up databases first, then run this script again"
        exit 1
    fi

    log_success "Database setup confirmed"
}

# Configure environment
configure_environment() {
    log_info "Configuring environment for $PLATFORM..."

    # Copy free tier environment
    cp .env.free .env

    # Platform-specific configuration
    case $PLATFORM in
        "railway")
            echo "# Railway-specific settings" >> .env
            echo "PORT=3000" >> .env
            ;;
        "render")
            echo "# Render-specific settings" >> .env
            echo "PORT=10000" >> .env
            ;;
        "fly")
            echo "# Fly.io-specific settings" >> .env
            echo "PORT=8080" >> .env
            ;;
    esac

    log_info "Please edit .env file with your database URLs:"
    echo "  - DATABASE_URL (from Supabase)"
    echo "  - REDIS_URL (from Upstash)"
    echo "  - REDIS_TOKEN (from Upstash)"
    echo ""
    read -p "Press Enter after editing .env file..."

    log_success "Environment configured"
}

# Deploy to platform
deploy_to_platform() {
    case $PLATFORM in
        "railway")
            deploy_railway
            ;;
        "render")
            deploy_render
            ;;
        "fly")
            deploy_fly
            ;;
        *)
            log_error "Unsupported platform: $PLATFORM"
            exit 1
            ;;
    esac
}

deploy_railway() {
    log_info "Deploying to Railway..."

    echo ""
    echo "🚂 Railway Deployment Steps:"
    echo "==========================="
    echo "1. Go to https://railway.app"
    echo "2. Sign up/Login with GitHub"
    echo "3. Click 'New Project'"
    echo "4. Select 'Deploy from GitHub repo'"
    echo "5. Connect your HoloCollab repository"
    echo "6. Railway will auto-detect and deploy"
    echo "7. Add PostgreSQL and Redis services in Railway dashboard"
    echo "8. Set environment variables in Railway dashboard"
    echo ""

    # Check if railway CLI is available
    if command -v railway &> /dev/null; then
        log_info "Railway CLI detected. Linking project..."
        railway link
        railway up
    else
        log_warning "Railway CLI not found. Please follow manual steps above."
        echo "Install Railway CLI: curl -fsSL https://railway.app/install.sh | sh"
    fi

    log_success "Railway deployment initiated"
}

deploy_render() {
    log_info "Deploying to Render..."

    echo ""
    echo "🎨 Render Deployment Steps:"
    echo "=========================="
    echo "1. Go to https://dashboard.render.com"
    echo "2. Click 'New +' → 'Web Service'"
    echo "3. Connect your GitHub repository"
    echo "4. Configure service:"
    echo "   - Name: holocollab-edumeet"
    echo "   - Environment: Docker"
    echo "   - Build Command: (leave empty)"
    echo "   - Start Command: npm start"
    echo "   - Root Directory: apps/web"
    echo "   - Dockerfile Path: ../Dockerfile.free"
    echo "5. Select Free instance type"
    echo "6. Add environment variables (see RENDER_DEPLOYMENT.md)"
    echo ""

    # Check if render CLI is available
    if command -v render &> /dev/null; then
        log_info "Render CLI detected. Opening browser for setup..."
        echo "Please follow the steps above in your browser."
        echo "Run 'render deploy' after setting up the service."
    else
        log_warning "Render CLI not found. Please follow manual steps above."
        echo "Install Render CLI: npm install -g render-cli (if available)"
    fi

    log_success "Render deployment configured"
}

deploy_fly() {
    log_info "Deploying to Fly.io..."

    echo ""
    echo "✈️  Fly.io Deployment Steps:"
    echo "==========================="
    echo "1. Install Fly CLI: curl -L https://fly.io/install.sh | sh"
    echo "2. Sign up: fly auth signup"
    echo "3. Launch app: fly launch"
    echo "4. Set secrets: fly secrets set DATABASE_URL=... REDIS_URL=..."
    echo "5. Deploy: fly deploy"
    echo ""

    # Check if fly CLI is available
    if command -v fly &> /dev/null; then
        log_info "Fly CLI detected. Launching..."
        fly launch
        log_info "Set your secrets:"
        echo "fly secrets set DATABASE_URL=your-supabase-url"
        echo "fly secrets set REDIS_URL=your-upstash-url"
        echo "fly secrets set REDIS_TOKEN=your-upstash-token"
        fly deploy
    else
        log_warning "Fly CLI not found. Please install and follow manual steps."
    fi

    log_success "Fly.io deployment initiated"
}

# Test deployment
test_deployment() {
    log_info "Testing deployment..."

    echo ""
    echo "🧪 Testing Checklist:"
    echo "===================="
    echo "1. ✅ App loads at your platform URL"
    echo "2. ✅ Can create a session"
    echo "3. ✅ 2 participants can join (same network)"
    echo "4. ✅ Video/audio works between participants"
    echo "5. ✅ Chat functionality works"
    echo ""

    log_success "Test your deployment and check the items above!"
}

# Main deployment function
main() {
    echo -e "${BLUE}🚀 HoloCollab EduMeet - Free Hosting Deployment${NC}"
    echo -e "${BLUE}================================================${NC}"
    echo "Platform: $PLATFORM"
    echo ""

    # Choose platform if not specified
    if [ -z "$PLATFORM" ] || [ "$PLATFORM" = "choose" ]; then
        echo "Choose your free hosting platform:"
        echo "1) Railway (Recommended - $5 credits, no sleeping)"
        echo "2) Render (750 hours/month, may sleep)"
        echo "3) Fly.io (256MB RAM, global deployment)"
        read -p "Enter choice (1-3): " choice

        case $choice in
            1) PLATFORM="railway" ;;
            2) PLATFORM="render" ;;
            3) PLATFORM="fly" ;;
            *) log_error "Invalid choice"; exit 1 ;;
        esac
    fi

    check_prerequisites
    setup_databases
    configure_environment
    deploy_to_platform
    test_deployment

    echo ""
    log_success "Free hosting deployment completed!"
    echo ""
    echo -e "${BLUE}🌐 Your app will be available at your platform's URL${NC}"
    echo ""
    echo -e "${BLUE}📚 Free Tier Limitations:${NC}"
    echo "  • Max 4 participants"
    echo "  • Public STUN only (may not work behind firewalls)"
    echo "  • No AI/CV features"
    echo "  • Basic video quality"
    echo "  • Limited storage"
    echo ""
    echo -e "${GREEN}🎉 Ready for educational collaboration!${NC}"
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --platform=*)
            PLATFORM="${1#*=}"
            shift
            ;;
        --help)
            echo "Free Hosting Deployment Script"
            echo ""
            echo "Usage: $0 [OPTIONS]"
            echo ""
            echo "Options:"
            echo "  --platform=PLATFORM    Hosting platform (railway/render/fly)"
            echo "  --help                 Show this help"
            echo ""
            echo "Examples:"
            echo "  $0 --platform=railway"
            echo "  $0  # Interactive platform selection"
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