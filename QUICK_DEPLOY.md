# 🚀 Quick Deployment Checklist

## Pre-Deployment ✅
- [ ] Choose cloud provider (AWS/DigitalOcean/Google Cloud)
- [ ] Register domain name
- [ ] Provision server (16GB+ RAM, 4+ cores)
- [ ] Configure DNS (A records for domain and livekit subdomain)
- [ ] Generate SSH keys for secure access

## Server Setup ✅
- [ ] Connect via SSH
- [ ] Update system packages
- [ ] Install Docker & Docker Compose
- [ ] Configure firewall (ports 22, 80, 443, 3478, 5349, 50000-60000/udp)
- [ ] Install monitoring tools (htop, fail2ban)

## Application Deployment ✅
- [ ] Clone repository
- [ ] Copy .env.example to .env
- [ ] Configure environment variables
- [ ] Set up database (managed recommended)
- [ ] Set up Redis (managed recommended)
- [ ] Run deployment script: `cd infrastructure && ./deploy.sh`

## SSL & Security ✅
- [ ] Install Let's Encrypt certificates
- [ ] Configure HTTPS in Nginx
- [ ] Enable firewall rules
- [ ] Set up SSH key authentication only
- [ ] Configure fail2ban

## Testing & Verification ✅
- [ ] Test HTTP/HTTPS access
- [ ] Verify WebRTC connectivity
- [ ] Test TURN server functionality
- [ ] Create test session with multiple participants
- [ ] Verify all API endpoints

## Production Ready ✅
- [ ] Set up automated backups
- [ ] Configure monitoring/alerts
- [ ] Test load handling (50+ users)
- [ ] Set up log rotation
- [ ] Document emergency procedures

---

# ☁️ Cloud-Specific Setup Scripts

## AWS EC2 Deployment

```bash
#!/bin/bash
# AWS EC2 Ubuntu Setup Script

# Update system
sudo apt update && sudo apt upgrade -y

# Install required packages
sudo apt install -y curl wget git htop ufw fail2ban unattended-upgrades

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker ubuntu

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Configure firewall
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw allow 80
sudo ufw allow 443
sudo ufw allow 3478
sudo ufw allow 5349
sudo ufw allow 50000:60000/udp
sudo ufw --force enable

# Install AWS CLI (optional)
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
unzip awscliv2.zip
sudo ./aws/install

# Reboot
sudo reboot
```

## DigitalOcean Droplet Setup

```bash
#!/bin/bash
# DigitalOcean Ubuntu Setup Script

# Initial setup
sudo apt update && sudo apt upgrade -y

# Install packages
sudo apt install -y curl wget git htop ufw fail2ban unattended-upgrades

# Docker installation
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Firewall configuration
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw allow 80
sudo ufw allow 443
sudo ufw allow 3478
sudo ufw allow 5349
sudo ufw allow 50000:60000/udp
echo "y" | sudo ufw enable

# Enable automatic updates
sudo dpkg-reconfigure --priority=low unattended-upgrades

# Install monitoring (optional)
sudo apt install -y prometheus-node-exporter

echo "✅ DigitalOcean droplet ready for HoloCollab deployment!"
```

## Google Cloud Compute Engine

```bash
#!/bin/bash
# Google Cloud Ubuntu Setup Script

# Update system
sudo apt update && sudo apt upgrade -y

# Install packages
sudo apt install -y curl wget git htop ufw fail2ban

# Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Firewall (GCP firewall rules are managed separately)
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw allow 80
sudo ufw allow 443
sudo ufw allow 3478
sudo ufw allow 5349
sudo ufw allow 50000:60000/udp
echo "y" | sudo ufw enable

# Install Google Cloud SDK (optional)
echo "deb [signed-by=/usr/share/keyrings/cloud.google.gpg] https://packages.cloud.google.com/apt cloud-sdk main" | sudo tee -a /etc/apt/sources.list.d/google-cloud-sdk.list
curl https://packages.cloud.google.com/apt/doc/apt-key.gpg | sudo apt-key --keyring /usr/share/keyrings/cloud.google.gpg add -
sudo apt update && sudo apt install -y google-cloud-sdk

echo "✅ Google Cloud instance ready for deployment!"
```

---

# 🔧 Environment Configuration Templates

## Production .env Template

```env
# Environment
ENVIRONMENT=production

# Server Configuration
PORT=8000
HOST=0.0.0.0
RELOAD=False

# Database (AWS RDS Example)
DATABASE_URL=postgresql+asyncpg://holo_user:your-secure-password@holocollab-db.cluster-xxxxxx.us-east-1.rds.amazonaws.com:5432/holocollab

# Redis (AWS ElastiCache Example)
REDIS_URL=redis://holocollab-cache.xxxxxx.ng.0001.use1.cache.amazonaws.com:6379/0

# LiveKit SFU Configuration
LIVEKIT_URL=ws://localhost:7880
LIVEKIT_API_KEY=livekit_api_key_here
LIVEKIT_API_SECRET=livekit_secret_here

# TURN Server Configuration
TURN_URL=turn:your-domain.com:3478
TURN_USERNAME=turnuser_randomstring
TURN_PASSWORD=secure_turn_password
EXTERNAL_IP=your.server.public.ip

# Domain Configuration
NGINX_SERVER_NAME=your-domain.com
LIVEKIT_SERVER_NAME=livekit.your-domain.com

# SSL Configuration
SSL_CERT_PATH=/etc/letsencrypt/live/your-domain.com/fullchain.pem
SSL_KEY_PATH=/etc/letsencrypt/live/your-domain.com/privkey.pem

# Security
SESSION_SECRET=your-session-secret-here
SECRET_KEY=your-jwt-secret-here
INTERNAL_API_KEY=your-internal-api-key

# Email (AWS SES Example)
SMTP_SERVER=email-smtp.us-east-1.amazonaws.com
SMTP_PORT=587
SMTP_USERNAME=your-ses-username
SMTP_PASSWORD=your-ses-password

# File Storage (AWS S3 Example)
AWS_ACCESS_KEY_ID=your-aws-access-key
AWS_SECRET_ACCESS_KEY=your-aws-secret-key
AWS_S3_BUCKET=holocollab-uploads
AWS_REGION=us-east-1

# Monitoring (Optional)
SENTRY_DSN=https://your-sentry-dsn@sentry.io/project-id
```

---

# 📊 Cost Calculator

## AWS Monthly Cost Estimate

| Service | Instance | Cost | Notes |
|---------|----------|------|-------|
| EC2 | c5.2xlarge | $150 | 8 vCPU, 16GB RAM |
| RDS | db.t3.medium | $50 | PostgreSQL, 20GB storage |
| ElastiCache | cache.t3.micro | $15 | Redis, 1GB |
| CloudFront | - | $10 | CDN for assets |
| S3 | - | $5 | File storage |
| Route53 | - | $5 | DNS management |
| **Total** | | **$235** | For 200 concurrent users |

## DigitalOcean Monthly Cost

| Service | Instance | Cost | Notes |
|---------|----------|------|-------|
| Droplet | 8GB RAM | $48 | 4 vCPU, 160GB SSD |
| Managed DB | Basic | $15 | PostgreSQL |
| Spaces | 250GB | $5 | Object storage |
| **Total** | | **$68** | Cost-effective option |

---

# 🚨 Emergency Procedures

## Service Down
```bash
# Check service status
cd infrastructure
docker-compose ps

# Restart all services
docker-compose restart

# Check logs for errors
docker-compose logs --tail=50
```

## Database Issues
```bash
# Check database connectivity
docker-compose exec postgres pg_isready -U holo_user -d holocollab

# Restore from backup
gunzip backup.sql.gz
docker-compose exec -T postgres psql -U holo_user holocollab < backup.sql
```

## High Load Issues
```bash
# Scale services
docker-compose up -d --scale backend=3
docker-compose up -d --scale realtime=2

# Check resource usage
docker stats
htop
```

## SSL Certificate Renewal
```bash
# Renew Let's Encrypt certificates
sudo certbot renew

# Restart Nginx
docker-compose restart nginx
```

---

**Ready to deploy? Follow the checklist and use the appropriate setup script for your cloud provider!** 🚀