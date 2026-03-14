# 🚀 HoloCollab EduMeet Online Deployment Guide

## Overview
Deploy your HoloCollab EduMeet system to production with enterprise-grade scalability supporting 50-1000+ concurrent users.

## 📋 Prerequisites

### Cloud Provider Options
- **AWS EC2** (Recommended for scalability)
- **Google Cloud Compute Engine**
- **Azure Virtual Machines**
- **DigitalOcean Droplets**
- **Linode VPS**

### Server Requirements

#### Minimum (50 participants)
- **OS**: Ubuntu 22.04 LTS or CentOS 8+
- **CPU**: 4 cores (AMD64/ARM64)
- **RAM**: 16GB
- **Storage**: 100GB SSD
- **Bandwidth**: 100 Mbps
- **Cost**: ~$50-100/month

#### Recommended (200+ participants)
- **OS**: Ubuntu 22.04 LTS
- **CPU**: 8 cores
- **RAM**: 32GB
- **Storage**: 200GB SSD
- **Bandwidth**: 500 Mbps
- **Cost**: ~$150-300/month

#### Enterprise (1000+ participants)
- **OS**: Ubuntu 22.04 LTS
- **CPU**: 16+ cores
- **RAM**: 64GB+
- **Storage**: 500GB SSD
- **Bandwidth**: 1 Gbps
- **Cost**: ~$500-1000/month

### Domain & DNS
- **Domain Name**: yourdomain.com
- **DNS Provider**: Cloudflare, Route53, or any DNS service
- **SSL Certificate**: Let's Encrypt (free) or commercial

---

## 🏗️ Step-by-Step Deployment

### Step 1: Provision Cloud Server

#### AWS EC2 Setup
```bash
# Choose Ubuntu 22.04 LTS AMI
# Instance type: t3.xlarge (4 vCPU, 16GB RAM) for 50 users
# Instance type: c5.2xlarge (8 vCPU, 16GB RAM) for 200 users
# Security Group: Allow ports 22, 80, 443, 3478, 5349, 50000-60000/udp
```

#### DigitalOcean Setup
```bash
# Droplet: Ubuntu 22.04, 8GB RAM, 160GB SSD
# Enable monitoring and backups
```

### Step 2: Server Preparation

```bash
# Connect to your server
ssh ubuntu@your-server-ip

# Update system
sudo apt update && sudo apt upgrade -y

# Install required packages
sudo apt install -y curl wget git htop ufw fail2ban

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Reboot to apply changes
sudo reboot
```

### Step 3: Clone and Configure Project

```bash
# Clone your repository
git clone https://github.com/yourusername/HoloCollabEduMeet.git
cd HoloCollabEduMeet

# Copy environment template
cp .env.example .env

# Edit configuration
nano .env
```

### Step 4: Configure Environment Variables

```env
# Environment
ENVIRONMENT=production

# Server Configuration
PORT=8000
HOST=0.0.0.0
RELOAD=False

# Database (use managed database for production)
DATABASE_URL=postgresql+asyncpg://holo_user:your-secure-password@your-db-host:5432/holocollab

# Redis (use managed Redis for production)
REDIS_URL=redis://your-redis-host:6379/0

# LiveKit SFU Configuration
LIVEKIT_URL=ws://localhost:7880
LIVEKIT_API_KEY=your-generated-api-key
LIVEKIT_API_SECRET=your-generated-secret

# TURN Server Configuration
TURN_URL=turn:your-domain.com:3478
TURN_USERNAME=turnuser_your_random_string
TURN_PASSWORD=your_secure_turn_password
EXTERNAL_IP=your.server.public.ip

# Domain Configuration
NGINX_SERVER_NAME=your-domain.com
LIVEKIT_SERVER_NAME=livekit.your-domain.com

# SSL Configuration (after cert setup)
SSL_CERT_PATH=/etc/letsencrypt/live/your-domain.com/fullchain.pem
SSL_KEY_PATH=/etc/letsencrypt/live/your-domain.com/privkey.pem

# Email Configuration (for notifications)
SMTP_SERVER=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=your-email@gmail.com
SMTP_PASSWORD=your-app-password

# Monitoring
SENTRY_DSN=your-sentry-dsn  # Optional
```

### Step 5: Database Setup

#### Option A: Managed Database (Recommended)
```bash
# AWS RDS PostgreSQL
# Google Cloud SQL
# Azure Database for PostgreSQL
# DigitalOcean Managed Database

# Update DATABASE_URL in .env with connection string
```

#### Option B: Self-hosted PostgreSQL
```bash
# Install PostgreSQL
sudo apt install -y postgresql postgresql-contrib

# Configure PostgreSQL
sudo -u postgres createuser holo_user
sudo -u postgres createdb holocollab -O holo_user
sudo -u postgres psql -c "ALTER USER holo_user PASSWORD 'your-secure-password';"

# Update DATABASE_URL in .env
```

### Step 6: Redis Setup

#### Option A: Managed Redis (Recommended)
```bash
# AWS ElastiCache
# Google Cloud Memorystore
# Azure Cache for Redis
# DigitalOcean Managed Redis

# Update REDIS_URL in .env
```

#### Option B: Self-hosted Redis
```bash
# Install Redis
sudo apt install -y redis-server

# Configure Redis
sudo nano /etc/redis/redis.conf
# Set: supervised systemd
# Set: maxmemory 512mb
# Set: maxmemory-policy allkeys-lru

sudo systemctl restart redis
```

### Step 7: Deploy Infrastructure

```bash
# Navigate to infrastructure directory
cd infrastructure

# Make deployment script executable
chmod +x deploy.sh

# Run deployment
./deploy.sh
```

### Step 8: DNS Configuration

#### Point your domain to the server
```bash
# In your DNS provider, create A records:
# your-domain.com → your-server-ip
# livekit.your-domain.com → your-server-ip
# *.your-domain.com → your-server-ip (wildcard for subdomains)
```

#### Verify DNS propagation
```bash
# Check DNS resolution
nslookup your-domain.com
nslookup livekit.your-domain.com

# Test connectivity
ping your-domain.com
```

### Step 9: SSL Certificate Setup

#### Using Let's Encrypt (Free)
```bash
# Install Certbot
sudo apt install -y certbot python3-certbot-nginx

# Get SSL certificate
sudo certbot certonly --standalone -d your-domain.com -d livekit.your-domain.com

# Certificates will be stored in:
# /etc/letsencrypt/live/your-domain.com/
```

#### Update Nginx Configuration
```bash
# Edit nginx.conf in infrastructure directory
sudo nano infrastructure/nginx.conf

# Add SSL configuration:
server {
    listen 443 ssl http2;
    server_name your-domain.com;

    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;

    # ... rest of your configuration
}

# Restart services
cd infrastructure
docker-compose restart nginx
```

### Step 10: Firewall Configuration

```bash
# Configure UFW firewall
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
sudo ufw enable

# Check status
sudo ufw status
```

### Step 11: Monitoring & Logging

#### Install monitoring tools
```bash
# Install Prometheus + Grafana (optional but recommended)
# Or use cloud monitoring services

# Basic monitoring with htop and logs
sudo apt install -y htop

# View service logs
cd infrastructure
docker-compose logs -f

# Monitor resource usage
docker stats
```

#### Set up log rotation
```bash
# Configure logrotate for Docker logs
sudo nano /etc/logrotate.d/docker

/var/lib/docker/containers/*/*.log {
    rotate 7
    daily
    compress
    missingok
    delaycompress
    copytruncate
}
```

### Step 12: Backup Strategy

#### Database backups
```bash
# Create backup script
sudo nano /usr/local/bin/backup-db.sh

#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/opt/backups"
mkdir -p $BACKUP_DIR

# Backup PostgreSQL
docker-compose exec -T postgres pg_dump -U holo_user holocollab > $BACKUP_DIR/db_$DATE.sql

# Compress backup
gzip $BACKUP_DIR/db_$DATE.sql

# Keep only last 7 days
find $BACKUP_DIR -name "db_*.sql.gz" -mtime +7 -delete

echo "Backup completed: $BACKUP_DIR/db_$DATE.sql.gz"
```

#### File system backups
```bash
# Backup uploads directory
rsync -avz uploads/ /opt/backups/uploads/

# Or use cloud storage (AWS S3, Google Cloud Storage)
```

#### Schedule automated backups
```bash
# Add to crontab
sudo crontab -e

# Daily backup at 2 AM
0 2 * * * /usr/local/bin/backup-db.sh
```

### Step 13: Performance Optimization

#### System tuning
```bash
# Increase file descriptors
echo "fs.file-max = 65536" | sudo tee -a /etc/sysctl.conf
echo "* soft nofile 65536" | sudo tee -a /etc/security/limits.conf
echo "* hard nofile 65536" | sudo tee -a /etc/security/limits.conf

# Optimize network
echo "net.core.somaxconn = 65536" | sudo tee -a /etc/sysctl.conf
echo "net.ipv4.tcp_max_syn_backlog = 65536" | sudo tee -a /etc/sysctl.conf

sudo sysctl -p
```

#### Docker optimization
```bash
# Create daemon.json
sudo nano /etc/docker/daemon.json

{
    "log-driver": "json-file",
    "log-opts": {
        "max-size": "10m",
        "max-file": "3"
    },
    "default-ulimits": {
        "nofile": {
            "Name": "nofile",
            "Hard": 65536,
            "Soft": 65536
        }
    }
}

sudo systemctl restart docker
```

### Step 14: Security Hardening

#### SSH hardening
```bash
# Disable password authentication
sudo nano /etc/ssh/sshd_config

# Set: PasswordAuthentication no
# Set: PermitRootLogin no

sudo systemctl restart sshd

# Use SSH keys only
ssh-keygen -t ed25519
# Add your public key to ~/.ssh/authorized_keys
```

#### Fail2Ban setup
```bash
# Already installed, configure for SSH
sudo nano /etc/fail2ban/jail.local

[sshd]
enabled = true
port = ssh
filter = sshd
logpath = /var/log/auth.log
maxretry = 3
bantime = 3600

sudo systemctl restart fail2ban
```

### Step 15: Testing & Verification

#### Health checks
```bash
# Test all services
curl -k https://your-domain.com/health
curl -k https://your-domain.com/api/health
curl -k https://livekit.your-domain.com/health

# Test WebRTC connectivity
# Use https://webrtc.github.io/samples/src/content/peerconnection/trickle-ice/
# Should show successful STUN/TURN connectivity
```

#### Load testing
```bash
# Install Apache Bench
sudo apt install -y apache2-utils

# Test API endpoints
ab -n 1000 -c 10 https://your-domain.com/api/health

# Test WebSocket connections
# Use tools like Artillery or k6 for WebSocket testing
```

### Step 16: Scaling & High Availability

#### Horizontal scaling
```bash
# Scale services as needed
cd infrastructure

# Add more backend instances
docker-compose up -d --scale backend=3

# Add more realtime services
docker-compose up -d --scale realtime=2

# Add more LiveKit instances
docker-compose up -d --scale livekit=2
```

#### Load balancer setup (for multiple servers)
```bash
# Use AWS ALB, Google Cloud Load Balancer, or Nginx upstream
# Configure sticky sessions for WebSocket connections
```

---

## 💰 Cost Optimization

### Monthly Cost Breakdown (AWS, 200 users)

| Service | Cost | Purpose |
|---------|------|---------|
| EC2 (c5.2xlarge) | $150 | Main server |
| RDS PostgreSQL | $50 | Database |
| ElastiCache Redis | $30 | Caching |
| CloudFront + S3 | $20 | CDN & Storage |
| Route53 | $5 | DNS |
| **Total** | **$255** | Production ready |

### Cost Saving Tips
- Use reserved instances (save 30-50%)
- Implement auto-scaling
- Use spot instances for non-critical workloads
- Monitor and optimize resource usage

---

## 🔧 Maintenance & Updates

### Regular maintenance
```bash
# Update system packages
sudo apt update && sudo apt upgrade -y

# Update Docker images
cd infrastructure
docker-compose pull
docker-compose up -d

# Monitor disk usage
df -h

# Check service logs
docker-compose logs --tail=100
```

### Zero-downtime deployments
```bash
# Deploy updates without downtime
docker-compose up -d --no-deps backend
docker-compose up -d --no-deps realtime

# Rollback if needed
docker-compose up -d --no-deps backend:previous-tag
```

---

## 🚨 Troubleshooting

### Common Issues

**WebRTC connection failures:**
```bash
# Check TURN server logs
docker-compose logs coturn

# Verify external IP
curl https://api.ipify.org

# Test TURN connectivity
turnutils_stunclient -p 3478 your-server-ip
```

**High CPU usage:**
```bash
# Check LiveKit performance
docker-compose logs livekit

# Monitor resource usage
docker stats

# Scale services if needed
docker-compose up -d --scale livekit=2
```

**Database connection issues:**
```bash
# Check PostgreSQL logs
docker-compose logs postgres

# Test database connectivity
docker-compose exec postgres pg_isready -U holo_user -d holocollab
```

---

## 📞 Support & Monitoring

### Monitoring Setup
1. **Application Performance**: Set up APM (New Relic, DataDog)
2. **Infrastructure**: CloudWatch, Prometheus + Grafana
3. **Error Tracking**: Sentry or similar
4. **Log Aggregation**: ELK stack or cloud logging

### Emergency Contacts
- Keep server access credentials secure
- Set up monitoring alerts for critical issues
- Have a rollback plan ready

---

## 🎉 Deployment Complete!

Your HoloCollab EduMeet system is now live and ready to handle 50-1000+ concurrent users!

**Access your application at:** https://your-domain.com

**Monitor your system:**
```bash
# Check all services
cd infrastructure
docker-compose ps

# View logs
docker-compose logs -f

# Monitor resources
htop
```

**Next steps:**
1. Create your first session
2. Test with multiple participants
3. Set up user accounts and permissions
4. Configure custom branding
5. Set up automated backups

---

**Need help?** Check the logs, verify your configuration, and ensure all services are healthy. Your deployment is production-ready! 🚀