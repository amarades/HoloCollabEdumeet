# Quick Start Guide

## Get Running in 3 Steps

### Step 1: Install Dependencies (First Time Only)

```bash
SETUP.bat
```

Wait for all dependencies to install (~5-10 minutes).

### Step 2: Start Backend Services

```bash
START_DEV.bat
```

You should see 4 services starting:
- ✅ Backend (Port 8000)
- ✅ AI Service (Port 8003)
- ✅ CV Service (Port 8001)
- ✅ Realtime Service (Port 8002)

### Step 3: Start Frontend (New Terminal)

```bash
cd apps\web
npm run dev
```

## Access the Application

Open your browser to: **http://localhost:5173**

## First Time Usage

1. **Create Account**: Click "Sign Up" and register
2. **Create Session**: Click "Create Session" on dashboard
3. **Share Code**: Copy the session code (e.g., ABC-1234-XYZ)
4. **Invite Others**: Share the code with participants
5. **Start Collaborating**: Load 3D models and use gestures!

## Verify Everything Works

```bash
VERIFY.bat
```

Should show all services running.

## Gesture Controls

- ✋ **Open Hand (5 fingers)**: Reset view
- ✌️ **Two Fingers**: Zoom
- ☝️ **One Finger**: Rotate
- ✊ **Fist**: Reset

## Troubleshooting

**Services won't start?**
- Make sure Python 3.9+ is installed
- Run `SETUP.bat` again

**Port already in use?**
- Close other applications using ports 8000-8003
- Or restart your computer

**Frontend errors?**
- Make sure backend services are running first
- Check `START_DEV.bat` terminal for errors

## Need Help?

- See [INSTALLATION.md](INSTALLATION.md) for detailed setup
- See [TROUBLESHOOTING.md](TROUBLESHOOTING.md) for common issues
- See [FIX_SUMMARY.md](FIX_SUMMARY.md) for technical details

## That's It!

You're ready to use HoloCollab EduMeet! 🎉
