# Render & Vercel Deployment Guide

This guide provides specific instructions for deploying the HoloCollab EduMeet monorepo to Render and Vercel.

## 🎨 Frontend (Vercel)
Vercel is the recommended platform for the React frontend due to its excellent performance and ease of use.

### Steps:
1. **GitHub Connection**: Connect your repository to Vercel.
2. **Framework Preset**: Select **Vite**.
3. **Root Directory**: Set to `apps/web`.
4. **Build Settings**:
   - **Build Command**: `npm run build`
   - **Install Command**: `npm install`
   - **Output Directory**: `dist`
5. **Environment Variables**:
   - `VITE_API_BASE_URL`: The URL of your deployed Render backend (e.g., `https://holocollab-backend.onrender.com`).
   - `VITE_REALTIME_URL`: The URL of your deployed Render realtime service.

---

## 🐍 Backend & Realtime (Render)
Render is ideal for the Python FastAPI backend and the Realtime service.

### 1. Backend Service (`services/backend`)
- **Service Type**: Web Service.
- **Runtime**: Python.
- **Build Command**: `pip install -r requirements.txt`.
- **Start Command**: `python -m uvicorn app.main:app --host 0.0.0.0 --port $PORT`.
- **Environment Variables**:
  - `DATABASE_URL`: Your PostgreSQL connection string.
  - `SECRET_KEY`: A secure random string for JWT.

### 2. Realtime Service (`services/realtime`)
- **Service Type**: Web Service.
- **Build Command**: `pip install -r requirements.txt`.
- **Start Command**: `python -m uvicorn app.main:app --host 0.0.0.0 --port $PORT`.
- **Root Directory**: `services/realtime`.
- **Environment Variables**:
  - `INTERNAL_API_KEY`: Set a secure random string (REQUIRED for production).
  - `REDIS_URL`: Your Redis connection string (e.g., from Upstash).
  - `CORS_ORIGINS`: Your Vercel frontend URL.

---

## 🗄️ Database (Render or Supabase)
You can use Render's native **PostgreSQL** or an external provider like **Supabase**.
- Copy the connection string and add it as `DATABASE_URL` in the Render services' environment variables.

---

## 🔗 Connecting the Services
Once all services are deployed, ensure they can "talk" to each other:
1. Update the Vercel `VITE_API_BASE_URL` with the backend URL.
2. Update the Backend's `CORS_ORIGINS` to include your Vercel URL.
3. If using LiveKit, ensure your `LIVEKIT_URL` is accessible.
