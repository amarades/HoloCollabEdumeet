# HoloCollab Health Checks

## Backend Health
- Endpoint: `/api/health`
- Expected response: `{"status": "ok"}`

## WebRTC Test
1. Start meeting
2. Connect two users
3. Verify video stream active
4. Check peer connection state

## 3D Rendering Test
- Verify: model loads
- Rotation works
- Lighting visible
- Camera controls active

## AI Chatbot Test
- Prompt: "Explain photosynthesis"
- Check: valid response, response time under 5 seconds

## Collaboration Sync
- User A rotates model → User B should see rotation instantly.
