#!/bin/bash
# HoloCollab EduMeet Infrastructure Deployment Script
# This script sets up the complete infrastructure stack for production deployment

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
INFRA_DIR="$PROJECT_ROOT/infrastructure"
ENV_FILE="$PROJECT_ROOT/.env"

echo -e "${BLUE}🚀 HoloCollab EduMeet Infrastructure Setup${NC}"
echo -e "${BLUE}=============================================${NC}"

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ Docker is not installed. Please install Docker first.${NC}"
    exit 1
fi

# Check if Docker Compose is available
if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
    echo -e "${RED}❌ Docker Compose is not available. Please install Docker Compose.${NC}"
    exit 1
fi

# Create .env file if it doesn't exist
if [ ! -f "$ENV_FILE" ]; then
    echo -e "${YELLOW}⚠️  .env file not found. Creating from .env.example...${NC}"
    cp "$PROJECT_ROOT/.env.example" "$ENV_FILE"
    echo -e "${GREEN}✅ Created .env file. Please review and update the configuration.${NC}"
fi

# Generate secure secrets if not set
generate_secret() {
    openssl rand -hex 32
}

update_env_var() {
    local var_name=$1
    local var_value=$2

    if ! grep -q "^$var_name=" "$ENV_FILE"; then
        echo "$var_name=$var_value" >> "$ENV_FILE"
        echo -e "${GREEN}✅ Added $var_name to .env${NC}"
    else
        echo -e "${YELLOW}⚠️  $var_name already exists in .env${NC}"
    fi
}

echo -e "${BLUE}🔐 Generating secure secrets...${NC}"

# Database password
if ! grep -q "^POSTGRES_PASSWORD=" "$ENV_FILE" || grep -q "^POSTGRES_PASSWORD=change-me-db-password" "$ENV_FILE"; then
    update_env_var "POSTGRES_PASSWORD" "$(generate_secret)"
fi

# LiveKit secrets
if ! grep -q "^LIVEKIT_API_KEY=" "$ENV_FILE" || grep -q "^LIVEKIT_API_KEY=devkey" "$ENV_FILE"; then
    update_env_var "LIVEKIT_API_KEY" "$(generate_secret | cut -c1-16)"
fi

if ! grep -q "^LIVEKIT_API_SECRET=" "$ENV_FILE" || grep -q "^LIVEKIT_API_SECRET=secret" "$ENV_FILE"; then
    update_env_var "LIVEKIT_API_SECRET" "$(generate_secret)"
fi

# TURN server credentials
if ! grep -q "^TURN_USERNAME=" "$ENV_FILE" || grep -q "^TURN_USERNAME=turnuser" "$ENV_FILE"; then
    update_env_var "TURN_USERNAME" "turnuser_$(openssl rand -hex 8)"
fi

if ! grep -q "^TURN_PASSWORD=" "$ENV_FILE" || grep -q "^TURN_PASSWORD=turnpass" "$ENV_FILE"; then
    update_env_var "TURN_PASSWORD" "$(generate_secret)"
fi

# Get external IP for TURN server
EXTERNAL_IP=$(curl -s https://api.ipify.org 2>/dev/null || echo "127.0.0.1")
if ! grep -q "^EXTERNAL_IP=" "$ENV_FILE"; then
    update_env_var "EXTERNAL_IP" "$EXTERNAL_IP"
fi

echo -e "${BLUE}🏗️  Building Docker images...${NC}"
cd "$INFRA_DIR"

# Use docker compose (newer syntax) if available, fallback to docker-compose
if docker compose version &> /dev/null; then
    COMPOSE_CMD="docker compose"
else
    COMPOSE_CMD="docker-compose"
fi

# Build images
$COMPOSE_CMD build --parallel

echo -e "${BLUE}🐳 Starting infrastructure services...${NC}"

# Start infrastructure in detached mode
$COMPOSE_CMD up -d

echo -e "${BLUE}⏳ Waiting for services to be healthy...${NC}"

# Wait for services to be healthy
max_attempts=30
attempt=1

while [ $attempt -le $max_attempts ]; do
    echo -e "${BLUE}Checking service health (attempt $attempt/$max_attempts)...${NC}"

    # Check if all services are healthy
    healthy_services=$($COMPOSE_CMD ps | grep -c "healthy" 2>/dev/null || echo "0")
    total_services=$($COMPOSE_CMD ps | grep -c "Up" 2>/dev/null || echo "0")

    if [ "$healthy_services" -eq "$total_services" ] && [ "$total_services" -gt 0 ]; then
        echo -e "${GREEN}✅ All services are healthy!${NC}"
        break
    fi

    echo "Healthy services: $healthy_services/$total_services"
    sleep 10
    ((attempt++))
done

if [ $attempt -gt $max_attempts ]; then
    echo -e "${RED}❌ Services failed to become healthy within the timeout period.${NC}"
    echo -e "${YELLOW}📊 Service status:${NC}"
    $COMPOSE_CMD ps
    echo -e "${YELLOW}📋 Service logs:${NC}"
    $COMPOSE_CMD logs --tail=50
    exit 1
fi

echo -e "${GREEN}🎉 Infrastructure deployment completed successfully!${NC}"
echo ""
echo -e "${BLUE}📊 Service Status:${NC}"
$COMPOSE_CMD ps

echo ""
echo -e "${BLUE}🌐 Service URLs:${NC}"
echo -e "  • API Gateway: http://localhost"
echo -e "  • LiveKit SFU: http://localhost/livekit"
echo -e "  • TURN Server: turn:localhost:3478"
echo -e "  • Redis: localhost:6379"
echo -e "  • PostgreSQL: localhost:5432"

echo ""
echo -e "${BLUE}🛠️  Management Commands:${NC}"
echo -e "  • View logs: $COMPOSE_CMD logs -f"
echo -e "  • Stop services: $COMPOSE_CMD down"
echo -e "  • Restart services: $COMPOSE_CMD restart"
echo -e "  • Scale services: $COMPOSE_CMD up -d --scale backend=3"

echo ""
echo -e "${YELLOW}⚠️  Next Steps:${NC}"
echo -e "  1. Update your DNS to point to this server"
echo -e "  2. Configure SSL certificates for HTTPS"
echo -e "  3. Set up monitoring and backups"
echo -e "  4. Configure firewall rules"

echo ""
echo -e "${GREEN}🚀 Ready for production!${NC}"