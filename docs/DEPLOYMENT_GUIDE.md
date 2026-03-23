# Deployment Guide - HoloCollab EduMeet

This guide outlines the different ways to deploy HoloCollab EduMeet, depending on your scale and budget requirements.

## 🚀 Option 1: Free Hosting (Recommended for Testing)
Best for: Quick demos, personal testing, and low-scale collaboration (up to 4 participants).

**Platforms Supported:** Render, Railway, Fly.io.

### Instructions:
1. **Set up External Databases (Free Tier):**
   - **PostgreSQL**: Create a project on [Supabase](https://supabase.com) and copy the `DATABASE_URL`.
   - **Redis**: Create a database on [Upstash](https://upstash.com) and copy the `REDIS_URL` and `REDIS_TOKEN`.
2. **Run Deployment Script:**
   ```bash
   ./deploy-free.sh --platform=render
   ```
   *(Replace `render` with `railway` or `fly` as needed)*
3. **Configure Environment:**
   The script will ask you to update your `.env` file with the URLs from Step 1.

> [!NOTE]
> Free tiers often have "sleeping" instances and lack high-performance AI/CV features.

---

## 🏗️ Option 2: Production VPS (Full Features)
Best for: Actual classes, large sessions (50+ participants), and full AI/Gestural control features.

**Requirements:** A Linux VPS (Ubuntu 22.04+ recommended) with at least 8GB RAM and a Public IP.

### Instructions:
1. **Clone & Prepare:**
   ```bash
   git clone <your-repo-url>
   cd HoloCollabEduMeet
   ```
2. **Run Cloud Setup:**
   If you are on a cloud provider (AWS, DO, GCP), use the wrapper:
   ```bash
   ./cloud-deploy.sh --cloud=generic --domain=yourdomain.com --email=your@email.com
   ```
3. **Manual Infrastructure Deploy:**
   Alternatively, run the core infrastructure script:
   ```bash
   cd infrastructure
   chmod +x deploy.sh
   ./deploy.sh
   ```

### Included Services:
- **Nginx**: Load balancing and SSL termination.
- **LiveKit SFU**: High-performance WebRTC scaling.
- **Coturn**: STUN/TURN server for NAT traversal (essential for video).
- **PostgreSQL & Redis**: Local Docker-managed data layer.

---

## 🔑 Key Environment Variables
Ensure these are set in your production environment:
- `DOMAIN`: Your public domain (e.g., `holocollab.edu`)
- `LIVEKIT_API_KEY` / `LIVEKIT_API_SECRET`: For video session management.
- `DATABASE_URL`: Connection string for PostgreSQL.
- `BACKEND_URL`: URL of the backend API service.

---

## 🛠️ Build Steps
For manual deployments, always ensure the frontend is built:
```bash
cd apps/web
npm install
npm run build
```
The server will serve the `dist` folder via `node server.js` on the configured `PORT`.
