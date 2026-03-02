# 🚀 Quick Start Guide

## Development Setup

### 1. Start Backend Server
```bash
# Option 1: Use the batch file (Windows)
start-dev.bat

# Option 2: Manual start
cd backend
pip install -r requirements.txt
python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

### 2. Access Application
- **Main Page**: http://127.0.0.1:8000
- **Session**: http://127.0.0.1:8000/session.html?room=new-room
- **API Docs**: http://127.0.0.1:8000/docs

### 3. Demo Login
- **Email**: demo@holocollab.com
- **Password**: demo123

## 🔧 Fixed Issues

### ✅ THREE.js Loading
- Fixed CDN loading issues
- Added retry mechanism
- Enhanced error handling

### ✅ Authentication
- Auto-login with demo user
- Better token handling
- Improved error messages

### ✅ CORS Configuration
- Fixed for local development
- Updated to use 127.0.0.1:8000

### ✅ Project Structure
- Cleaned up duplicate files
- Organized dependencies
- Added development scripts

## 🐛 Troubleshooting

### 3D Model Not Showing
1. Check browser console for THREE.js errors
2. Ensure internet connection for CDN loading
3. Clear browser cache

### Video Not Working
1. Check camera/microphone permissions
2. Ensure HTTPS for production
3. Check browser WebRTC support

### WebSocket Connection Issues
1. Ensure backend is running
2. Check firewall settings
3. Verify WebSocket URL in console

## 📁 Project Structure

```
HoloCollabEduMeet/
├── backend/                 # FastAPI backend
│   ├── app/
│   │   ├── main.py         # Main application
│   │   ├── config.py       # Configuration
│   │   ├── routes/        # API endpoints
│   │   ├── sockets/       # WebSocket handlers
│   │   ├── services/      # AI integrations
│   │   └── models/        # Data models
│   └── requirements.txt   # Python dependencies
├── frontend/              # Web frontend
│   ├── *.html           # HTML pages
│   ├── css/             # Stylesheets
│   └── js/              # JavaScript modules
├── start-dev.bat        # Development script
└── .env               # Environment variables
```
