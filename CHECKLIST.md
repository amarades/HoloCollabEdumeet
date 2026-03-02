# ✅ Startup Checklist

Use this checklist to ensure everything is set up correctly.

## Prerequisites

- [ ] Python 3.9+ installed (`python --version`)
- [ ] Node.js 16+ installed (`node --version`)
- [ ] Git installed (optional)

## Installation

- [ ] Run `SETUP.bat` successfully
- [ ] All dependencies installed without errors
- [ ] No red error messages in terminal

## Backend Services

- [ ] Run `START_DEV.bat`
- [ ] Backend Service started (Port 8000)
- [ ] AI Service started (Port 8003)
- [ ] CV Service started (Port 8001)
- [ ] Realtime Service started (Port 8002)
- [ ] No error messages in terminal

## Frontend

- [ ] Open new terminal
- [ ] Navigate to `apps\web`
- [ ] Run `npm run dev`
- [ ] Frontend started (Port 5173)
- [ ] No compilation errors

## Verification

- [ ] Run `VERIFY.bat` - all services show ✓
- [ ] Open http://localhost:8000/docs - API docs load
- [ ] Open http://localhost:5173 - Frontend loads

## First Use

- [ ] Create account successfully
- [ ] Login works
- [ ] Dashboard loads
- [ ] Can create session
- [ ] Session code generated
- [ ] Can join session with code

## Features

- [ ] 3D models load in viewer
- [ ] Camera permission granted
- [ ] Hand gestures detected
- [ ] Model responds to gestures
- [ ] AI chat responds
- [ ] WebSocket connected (check browser console)

## If Any Item Fails

1. Check [TROUBLESHOOTING.md](TROUBLESHOOTING.md)
2. Review error messages in terminals
3. Ensure all prerequisites are met
4. Try clean reinstall

## Clean Reinstall Steps

```bash
# Stop all services (Ctrl+C in terminals)

# Delete and reinstall
cd services\backend
python -m pip install -r requirements.txt --force-reinstall

cd ..\ai-service
python -m pip install -r requirements.txt --force-reinstall

cd ..\cv-service
python -m pip install -r requirements.txt --force-reinstall

cd ..\realtime
python -m pip install -r requirements.txt --force-reinstall

cd ..\..\apps\web
rmdir /s /q node_modules
npm install

# Restart
cd ..\..
START_DEV.bat
```

## Success!

When all items are checked, you're ready to use HoloCollab EduMeet! 🎉

## Quick Reference

| Service | Port | URL |
|---------|------|-----|
| Frontend | 5173 | http://localhost:5173 |
| Backend | 8000 | http://localhost:8000 |
| AI Service | 8003 | http://localhost:8003 |
| CV Service | 8001 | http://localhost:8001 |
| Realtime | 8002 | http://localhost:8002 |
