# 🚀 Deploy HoloCollab EduMeet to Render (Free)

## Overview
Deploy your HoloCollab EduMeet application to Render's free tier with 750 hours/month of runtime.

## 📋 Prerequisites

### Required Accounts
- [Render Account](https://render.com) (Free)
- [Supabase Account](https://supabase.com) (Free PostgreSQL)
- [Upstash Account](https://upstash.com) (Free Redis)
- GitHub Repository (for deployment)

### System Requirements
- Node.js application (React/Vite)
- PostgreSQL database
- Redis for caching
- WebRTC for video calling

---

## 🛠️ Step-by-Step Render Deployment

### Step 1: Prepare Your Repository

1. **Push your code to GitHub:**
   ```bash
   git add .
   git commit -m "Ready for Render deployment"
   git push origin main
   ```

2. **Create free databases:**

   **Supabase (PostgreSQL):**
   - Go to https://supabase.com
   - Create free account → New Project
   - Choose region (e.g., us-east-1)
   - Wait for setup to complete
   - Go to Settings → Database
   - Copy the "Connection string" (starts with `postgresql://`)

   **Upstash (Redis):**
   - Go to https://upstash.com
   - Create free account → Create Database
   - Choose region (same as Supabase if possible)
   - Copy:
     - REST API URL (starts with `https://`)
     - REST Token (for authentication)

### Step 2: Create Render Web Service

1. **Go to Render Dashboard:**
   - Visit https://dashboard.render.com
   - Click "New +" → "Web Service"

2. **Connect Repository:**
   - Select "Build and deploy from a Git repository"
   - Connect your GitHub account
   - Select your HoloCollab repository
   - Click "Connect"

3. **Configure Service:**
   ```
   Name: holocollab-edumeet
   Environment: Docker
   Build Command: (leave empty - uses Dockerfile)
   Start Command: npm start
   ```

4. **Select Free Plan:**
   - Instance Type: Free
   - Region: Choose closest to your users (e.g., Oregon - us-west-2)

### Step 3: Configure Environment Variables

In Render dashboard, go to your service → Environment → Add Environment Variable:

#### Required Variables:
```
# Database
DATABASE_URL=postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:5432/postgres

# Redis
REDIS_URL=https://[your-upstash-url].upstash.io
REDIS_TOKEN=[your-upstash-token]

# Application
NODE_ENV=production
ENVIRONMENT=free

# Render provides this automatically
PORT=10000

# WebRTC (Free tier - public STUN only)
VITE_ICE_SERVERS=[{"urls":"stun:stun.l.google.com:19302"},{"urls":"stun:stun1.l.google.com:19302"}]

# Disabled features for free tier
LIVEKIT_ENABLED=false
TURN_ENABLED=false
AI_SERVICE_ENABLED=false
CV_SERVICE_ENABLED=false
FILE_UPLOAD_ENABLED=false

# Free tier limits
MAX_PARTICIPANTS=4
VIDEO_WIDTH=640
VIDEO_HEIGHT=480
VIDEO_FRAME_RATE=15

# Security
SESSION_SECRET=your-session-secret-here
SECRET_KEY=your-jwt-secret-here
INTERNAL_API_KEY=your-internal-api-key

# Optional: Email (use Gmail or similar)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=your-email@gmail.com
SMTP_PASSWORD=your-app-password
```

### Step 4: Set Up Dockerfile for Render

Create `Dockerfile.free` in your project root:

```dockerfile
# Dockerfile for Render Free Tier
FROM node:18-alpine

# Install dependencies
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production --no-audit --no-fund

# Copy source
COPY . .

# Build application
RUN npm run build

# Expose port (Render provides PORT env var)
EXPOSE $PORT

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD node -e "require('http').get('http://localhost:' + (process.env.PORT || 10000) + '/health', (res) => process.exit(res.statusCode === 200 ? 0 : 1))"

# Start application
CMD ["npm", "start"]
```

### Step 5: Configure Build Settings

In Render dashboard → Service → Settings:

```
Build Command: (leave empty)
Start Command: npm start
Root Directory: apps/web
Dockerfile Path: ../Dockerfile.free (relative to root directory)
```

**Important:** Set the Root Directory to `apps/web` since your React app is in that folder.

### Step 6: Deploy

1. **Trigger Deploy:**
   - Click "Create Web Service"
   - Render will start building automatically

2. **Monitor Build:**
   - Watch the build logs in real-time
   - Should take 5-10 minutes for first build

3. **Check Deployment:**
   - Once deployed, you'll get a URL like: `https://holocollab-edumeet.onrender.com`
   - Click the URL to test your application

### Step 7: Set Up Custom Domain (Optional)

1. **In Render Dashboard:**
   - Service → Settings → Custom Domain
   - Add your domain (e.g., `holocollab.yourdomain.com`)

2. **Configure DNS:**
   - Add CNAME record pointing to your Render URL
   - Wait for DNS propagation (can take 24-48 hours)

---

## 🔧 Troubleshooting Render Deployment

### Build Failures

**Issue: Build timeout**
```
Solution: Reduce build time by:
- Using --no-audit --no-fund flags
- Removing unnecessary dependencies
- Using smaller base image
```

**Issue: Out of memory during build**
```
Solution: Free tier has limited memory
- Use node:18-alpine base image
- Build in separate stage if needed
- Remove dev dependencies
```

### Runtime Issues

**Issue: Port binding error**
```
Solution: Render provides PORT env var
- Use process.env.PORT || 10000
- Don't hardcode port numbers
```

**Issue: Database connection fails**
```
Solution: Check Supabase settings
- Verify connection string format
- Ensure database is not paused
- Check firewall settings
```

**Issue: WebRTC not working**
```
Solution: Free tier limitations
- Only public STUN servers work
- May not work behind corporate firewalls
- Test with 2 devices on same network first
```

### Service Sleeping

**Render Free Tier Behavior:**
- Services sleep after 15 minutes of inactivity
- First request after sleep takes 30-60 seconds to wake up
- Use uptime monitoring to keep service awake

**Keep Service Awake:**
```javascript
// Add to your app for uptime monitoring
setInterval(() => {
  fetch('/health').catch(() => {});
}, 10 * 60 * 1000); // Every 10 minutes
```

---

## 📊 Render Free Tier Limits

| Resource | Limit | Notes |
|----------|-------|-------|
| Runtime | 750 hours/month | ~31 days of continuous use |
| Memory | 512MB | Shared CPU, may be slower |
| Build Time | 15 minutes | Builds fail if exceeded |
| Bandwidth | Unlimited | But slow if high usage |
| Custom Domains | 1 free | Additional domains cost $5/month |

---

## 🚀 Post-Deployment Checklist

### ✅ Basic Functionality
- [ ] App loads at Render URL
- [ ] Can create a new session
- [ ] 2 participants can join (same network)
- [ ] Video/audio works between participants
- [ ] Chat messages are sent/received
- [ ] Screen sharing works

### ✅ Database & Redis
- [ ] Database connections work
- [ ] Sessions are saved
- [ ] User data persists
- [ ] Redis caching works

### ✅ Performance
- [ ] Page loads in <3 seconds
- [ ] Video quality is acceptable
- [ ] No excessive lag
- [ ] Service doesn't crash under load

### ✅ Free Tier Optimizations
- [ ] Participant limit (4 max) enforced
- [ ] AI/CV features disabled
- [ ] File uploads disabled
- [ ] Video quality reduced appropriately

---

## 🔄 Scaling Up from Render

When you need more capacity:

### Option 1: Upgrade Render Plan
- **Starter**: $7/month (more hours, better performance)
- **Standard**: $25/month (2GB RAM, dedicated CPU)
- **Pro**: $50/month+ (more resources)

### Option 2: Switch to Railway
- Better for complex multi-service apps
- $5 monthly credits (essentially free)
- No sleeping, always available

### Option 3: Move to VPS
- DigitalOcean: $6/month (1GB RAM)
- Linode: $5/month (1GB RAM)
- Use the paid deployment scripts

---

## 💰 Cost Summary (Free Tier)

| Service | Cost | Notes |
|---------|------|-------|
| **Render** | $0 | 750 hours/month |
| **Supabase** | $0 | 500MB database |
| **Upstash** | $0 | 10k Redis requests/day |
| **GitHub** | $0 | Public repositories |
| **Domain** | $0-15 | Use Render subdomain or buy domain |
| **Total** | **$0** | Completely free! |

---

## 🎯 What Works on Render Free Tier

✅ **Real-time video calling** (up to 4 participants)  
✅ **Audio conferencing**  
✅ **Screen sharing**  
✅ **Text chat**  
✅ **Session management**  
✅ **User authentication**  
✅ **Database storage**  
✅ **Redis caching**  

❌ **AI features** (disabled for free tier)  
❌ **CV/gesture recognition** (disabled)  
❌ **File uploads** (disabled)  
❌ **TURN servers** (no corporate firewall support)  
❌ **High participant counts** (max 4)  

---

## 🚀 Quick Commands for Render

```bash
# Check deployment status
curl https://your-app.onrender.com/health

# View logs
# Go to Render Dashboard → Service → Logs

# Manual deploy
# Go to Render Dashboard → Service → Manual Deploy

# Environment variables
# Dashboard → Service → Environment
```

Your HoloCollab EduMeet is now ready to deploy to Render's free tier! The setup takes about 30 minutes and gives you a fully functional educational collaboration platform at no cost. 🎉