# HoloCollab EduMeet - Testing Guide

## Quick Test Checklist

### 1. ✅ Services Running
- Backend: http://127.0.0.1:8000
- CV Service: http://127.0.0.1:8001  
- Realtime: http://127.0.0.1:8002

### 2. 🔐 Authentication Flow
- [ ] Navigate to http://127.0.0.1:8000/login.html
- [ ] Login with: `demo@holocollab.com` / `demo123`
- [ ] Should redirect to dashboard

### 3. 📊 Dashboard
- [ ] See "New Meeting" button
- [ ] Click "New Meeting"
- [ ] Should navigate to lobby page

### 4. 🎥 Lobby Page
- [ ] Camera preview should appear
- [ ] Microphone indicator shows activity
- [ ] Toggle camera/mic buttons work
- [ ] Display name is pre-filled
- [ ] Click "Join Meeting"
- [ ] Should redirect to session page

### 5. 🫀 Session Page (Main Features)

#### 3D Model:
- [ ] Anatomical heart model loads automatically
- [ ] Heart has realistic colors (red chambers, arteries)
- [ ] Subtle pulsing animation visible
- [ ] Drag mouse to rotate
- [ ] Scroll wheel to zoom
- [ ] "Reset View" button works
- [ ] "Rotate X/Y/Z" buttons work
- [ ] "Zoom In/Out" buttons work

#### Video:
- [ ] Webcam feed visible
- [ ] Video toggle button (📹) works
- [ ] Audio toggle button (🎤) works

#### AI Assistant:
- [ ] Chat interface visible in sidebar
- [ ] Type: "what is the heart?"
- [ ] Get intelligent response
- [ ] Type: "tell me about the chambers"
- [ ] Get educational response

#### Gesture Recognition:
- [ ] Click hand icon (✋) to enable
- [ ] Gesture console appears
- [ ] Show hand to camera
- [ ] Finger count updates
- [ ] Different gestures detected

## Common Issues & Fixes

### Camera Not Working
- Check browser permissions (click lock icon in address bar)
- Make sure no other app is using the camera
- Try reloading the page

### 3D Model Not Visible
- Check browser console (F12) for errors
- Make sure Three.js CDN is accessible
- Try clearing cache and reload

### WebSocket Not Connecting
- Ensure Realtime service is running on port 8002
- Check browser console for connection errors

## Expected Results

When everything works:
- ✅ Beautiful 3D anatomical heart rotating smoothly
- ✅ Your video feed in corner
- ✅ All buttons responding to clicks
- ✅ AI chat answering anatomy questions
- ✅ Gesture recognition (if enabled) showing hand data

## Manual Test Script

Open browser console (F12) and check for:
- ✅ "Demo anatomical heart model loaded"
- ✅ "Session initialized"
- ✅ "Webcam initialized"
- ✅ No red errors

Perfect! Everything should be working now. Enjoy exploring your 3D anatomical learning platform! 🎓
