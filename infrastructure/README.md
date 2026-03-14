# Infrastructure

This directory contains the complete production infrastructure setup for HoloCollab EduMeet, implementing **Phase 2, 3, and 4** of the scaling roadmap.

## 🏗️ Architecture Overview

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Nginx Load    │    │   LiveKit SFU   │    │   TURN Server   │
│    Balancer     │    │  (WebRTC Scal.) │    │   (NAT Trans.)  │
│                 │    │                 │    │                 │
│ • API Gateway   │    │ • Mesh → SFU    │    │ • STUN/TURN     │
│ • WebSocket     │    │ • 50-1000 users │    │ • Port 3478     │
│ • SSL Term.     │    │ • Port 7880     │    │ • Coturn        │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 │
                    ┌─────────────────┐
                    │  Application    │
                    │   Services      │
                    │                 │
                    │ • Backend API   │
                    │ • Realtime WS   │
                    │ • AI Service    │
                    │ • CV Service    │
                    └─────────────────┘
                             │
                    ┌─────────────────┐
                    │   Data Layer    │
                    │                 │
                    │ • PostgreSQL    │
                    │ • Redis Cache   │
                    │ • File Storage  │
                    └─────────────────┘
```

## 🚀 Quick Start

### Prerequisites
- Docker & Docker Compose
- Linux/Windows/Mac with 8GB+ RAM
- Public IP address (for TURN server)

### One-Command Deployment
```bash
cd infrastructure
chmod +x deploy.sh
./deploy.sh
```

The script will:
- ✅ Generate secure secrets
- ✅ Build all Docker images
- ✅ Start all services
- ✅ Wait for health checks
- ✅ Display service URLs

## 📁 File Structure

```
infrastructure/
├── docker-compose.yml    # Complete stack definition
├── nginx.conf           # Load balancer & API gateway
├── coturn.conf          # TURN server configuration
├── init-db.sql          # Database initialization
├── deploy.sh            # Automated deployment script
└── README.md           # This documentation
```

## 🔧 Services Configuration

### Environment Variables

Create a `.env` file in the project root:

```env
# Database
POSTGRES_PASSWORD=your-secure-db-password

# LiveKit SFU
LIVEKIT_API_KEY=your-livekit-api-key
LIVEKIT_API_SECRET=your-livekit-api-secret

# TURN Server
TURN_USERNAME=turnuser_randomstring
TURN_PASSWORD=your-turn-password
EXTERNAL_IP=your.public.ip.address

# Multi-server
NGINX_SERVER_NAME=yourdomain.com
LIVEKIT_SERVER_NAME=livekit.yourdomain.com
```

### Scaling Configuration

**For 50-100 participants:**
```yaml
# docker-compose.yml scaling
services:
  backend:
    deploy:
      replicas: 2
  realtime:
    deploy:
      replicas: 2
  livekit:
    deploy:
      replicas: 1
```

**For 500+ participants:**
```yaml
services:
  backend:
    deploy:
      replicas: 4
  realtime:
    deploy:
      replicas: 3
  livekit:
    deploy:
      replicas: 2
  nginx:
    deploy:
      replicas: 2  # Load balancer HA
```

## 🔒 Security Features

### Network Security
- **Internal networking** between services
- **TURN server** for NAT traversal
- **API authentication** with JWT tokens
- **WebSocket security** with tickets

### Data Protection
- **SSL/TLS termination** at Nginx
- **Encrypted WebRTC** connections
- **Secure secrets** generation
- **Database encryption** ready

## 📊 Monitoring & Health Checks

### Service Health
All services include health checks:
- **HTTP endpoints** for API services
- **Database connectivity** checks
- **WebSocket responsiveness**
- **SFU connection status**

### Monitoring Commands
```bash
# View all service logs
docker-compose logs -f

# Check service status
docker-compose ps

# Monitor resource usage
docker stats

# View specific service logs
docker-compose logs backend
```

## 🔄 High Availability

### Load Balancing
- **Nginx** distributes requests across backend instances
- **IP hashing** for WebSocket session affinity
- **Least connections** for AI/CV services

### Data Persistence
- **PostgreSQL** with persistent volumes
- **Redis** clustering ready
- **File uploads** on shared storage

### Failover
- **Auto-restart** on service failures
- **Health check** based routing
- **Graceful shutdowns**

## 🌐 Production Deployment

### Domain Configuration
```nginx
# /etc/nginx/sites-available/holocollab
server {
    server_name yourdomain.com;
    location / {
        proxy_pass http://infrastructure_nginx;
        proxy_set_header Host $host;
    }
}
```

### SSL Certificates
```bash
# Using Let's Encrypt
certbot --nginx -d yourdomain.com -d livekit.yourdomain.com
```

### Firewall Rules
```bash
# Allow HTTP/HTTPS
ufw allow 80
ufw allow 443

# Allow TURN (STUN/TURN)
ufw allow 3478
ufw allow 5349

# Allow WebRTC media ports
ufw allow 50000:60000/udp
```

## 🧪 Testing the Deployment

### Health Checks
```bash
# API Gateway
curl http://localhost/health

# Backend API
curl http://localhost/api/health

# LiveKit SFU
curl http://localhost/livekit/health
```

### WebRTC Testing
```bash
# Test TURN server
turnutils_stunclient -p 3478 your.server.ip

# Test LiveKit connection
# Use the LiveKit test client or browser
```

## 🚨 Troubleshooting

### Common Issues

**Services won't start:**
```bash
# Check logs
docker-compose logs

# Check resource usage
docker system df

# Clean up and retry
docker system prune -a
```

**WebRTC connection issues:**
```bash
# Check TURN server
docker-compose logs coturn

# Verify external IP
curl https://api.ipify.org

# Test connectivity
telnet your.server.ip 3478
```

**Database connection errors:**
```bash
# Check PostgreSQL
docker-compose exec postgres pg_isready

# View database logs
docker-compose logs postgres
```

### Performance Tuning

**For high participant counts:**
```yaml
# Increase Redis memory
redis:
  command: redis-server --maxmemory 1gb --maxmemory-policy allkeys-lru

# PostgreSQL optimization
postgres:
  environment:
    POSTGRES_SHARED_BUFFERS: 512MB
    POSTGRES_EFFECTIVE_CACHE_SIZE: 2GB
```

## 📈 Scaling Strategies

### Vertical Scaling
- **Increase server resources** (CPU, RAM)
- **Optimize database queries**
- **Enable Redis clustering**

### Horizontal Scaling
- **Add more backend instances**
- **Scale LiveKit SFU**
- **Use load balancer clusters**

### Geographic Distribution
- **CDN for static assets**
- **Multi-region deployment**
- **Global TURN servers**

## 🔄 Backup & Recovery

### Database Backups
```bash
# Automated backup script
docker-compose exec postgres pg_dump -U holo_user holocollab > backup.sql

# Restore from backup
docker-compose exec -T postgres psql -U holo_user holocollab < backup.sql
```

### Configuration Backup
```bash
# Backup volumes
docker run --rm -v infrastructure_postgres_data:/data -v $(pwd):/backup alpine tar czf /backup/postgres_backup.tar.gz -C /data .
```

## 🎯 Performance Benchmarks

| Participants | Architecture | CPU | RAM | Bandwidth |
|-------------|-------------|-----|-----|-----------|
| 12 | Mesh | 2 cores | 4GB | 10 Mbps |
| 50 | SFU | 4 cores | 8GB | 50 Mbps |
| 100 | SFU + LB | 8 cores | 16GB | 100 Mbps |
| 500 | Multi-SFU | 16 cores | 32GB | 500 Mbps |
| 1000+ | Global | 32+ cores | 64GB+ | 1 Gbps+ |

## 🚀 Future Enhancements

- **Kubernetes orchestration**
- **Service mesh (Istio)**
- **Advanced monitoring (Prometheus/Grafana)**
- **Auto-scaling policies**
- **Multi-cloud deployment**

---

**Ready to scale?** Run `./deploy.sh` and your infrastructure will be production-ready in minutes! 🎉
