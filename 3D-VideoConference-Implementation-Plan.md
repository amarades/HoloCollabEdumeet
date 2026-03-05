# 🎥 Real-Time 3D Video Conference + AI Chatbot — Implementation Plan

---

## 📌 Overview

A collaborative video conferencing platform where participants can:
- See each other via live video/audio
- Interact with a shared real-time 3D scene (rotate, scale, annotate, manipulate objects)
- Use an embedded AI chatbot for summaries, Q&A, code help, etc.

---
chec
## 🧱 System Architecture

```
┌─────────────────────────────────────────────────────────┐
│                      CLIENT (Browser)                   │
│  ┌──────────┐  ┌──────────────┐  ┌──────────────────┐  │
│  │  WebRTC  │  │  Three.js    │  │  AI Chatbox      │  │
│  │  Video   │  │  3D Canvas   │  │  (Claude API)    │  │
│  │  Audio   │  │  Sync State  │  │                  │  │
│  └────┬─────┘  └──────┬───────┘  └────────┬─────────┘  │
│       │               │                    │            │
└───────┼───────────────┼────────────────────┼────────────┘
        │               │                    │
┌───────▼───────────────▼────────────────────▼────────────┐
│                    BACKEND SERVER                        │
│  ┌──────────────┐  ┌─────────────────┐  ┌────────────┐ │
│  │  WebRTC SFU  │  │  WebSocket      │  │  REST API  │ │
│  │  (mediasoup) │  │  Server (3D     │  │  (Auth,    │ │
│  │              │  │  state sync)    │  │  Rooms)    │ │
│  └──────────────┘  └─────────────────┘  └────────────┘ │
└─────────────────────────────────────────────────────────┘
```

---

## 🔧 Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Frontend Framework | React + TypeScript | UI components & state |
| 3D Rendering | Three.js or React Three Fiber | 3D scene & manipulation |
| Video/Audio | WebRTC + mediasoup (SFU) | Multi-party video calls |
| Real-time Sync | WebSocket (Socket.IO) | 3D state sync across users |
| AI Chatbot | Anthropic Claude API | Intelligent assistant |
| Backend | Node.js + Express | Server, rooms, auth |
| Database | PostgreSQL + Redis | Sessions, room state |
| Deployment | Docker + AWS/GCP | Scalable infrastructure |

---

## 📦 Phase 1: Core Video Conferencing (Weeks 1–3)

### 1.1 — Room & Auth System
```
/backend
  /routes
    auth.ts        → JWT login/register
    rooms.ts       → Create/join/leave rooms
  /models
    User.ts
    Room.ts
```

**Tasks:**
- [ ] User registration & JWT auth
- [ ] Room creation with unique codes
- [ ] Participant management (join/leave/kick)
- [ ] Room persistence in PostgreSQL

### 1.2 — WebRTC Video/Audio
**Technology:** mediasoup (SFU — Selective Forwarding Unit)

Why mediasoup over peer-to-peer mesh?
- Scales to 10+ participants without crushing each user's bandwidth
- Server routes streams, not full re-encoding

```
/backend/webrtc
  mediasoupWorker.ts     → Spin up workers
  roomRouter.ts          → Per-room media routing
  transportManager.ts    → Producer/consumer transports
```

**Tasks:**
- [ ] Initialize mediasoup workers
- [ ] Create room routers per conference room
- [ ] Handle producer (sender) and consumer (receiver) transports
- [ ] Implement screen sharing as a separate producer track
- [ ] Add mute/unmute, camera on/off controls

### 1.3 — Frontend Video UI
```
/frontend/src
  /components
    VideoGrid.tsx         → Responsive grid of participant videos
    VideoTile.tsx         → Single participant tile
    ControlBar.tsx        → Mute, camera, share, leave
    ParticipantList.tsx   → Sidebar with names/status
```

---

## 🧊 Phase 2: Collaborative 3D Scene (Weeks 4–7)

### 2.1 — 3D Rendering (Three.js / React Three Fiber)

```
/frontend/src/3d
  Scene.tsx              → Main Three.js canvas
  ObjectControls.tsx     → Drag, rotate, scale handlers
  SceneObjects/
    ModelLoader.tsx      → Load GLTF/OBJ models
    PrimitiveShapes.tsx  → Cubes, spheres, etc.
  Annotations.tsx        → 3D text labels / sticky notes
```

**3D Interaction Features:**
- Orbit controls (rotate scene view)
- Object selection (click to select)
- Transform controls (move/rotate/scale selected object)
- Multi-user pointer cursors (see others' cursors in 3D space)
- Upload custom 3D models (GLTF/GLB)
- Annotation pins in 3D space

### 2.2 — Real-Time 3D State Sync (Critical Part)

Every object manipulation must be broadcast to all participants instantly.

**State Structure:**
```json
{
  "sceneId": "room_abc123",
  "objects": [
    {
      "id": "obj_001",
      "type": "box",
      "position": [1.2, 0, 0.5],
      "rotation": [0, 45, 0],
      "scale": [1, 1, 1],
      "color": "#ff6b6b",
      "lockedBy": null
    }
  ],
  "lastUpdatedBy": "user_xyz",
  "timestamp": 1710000000
}
```

**WebSocket Events:**
```
Client → Server:
  OBJECT_TRANSFORM   → { id, position, rotation, scale }
  OBJECT_ADD         → { type, position, color, ... }
  OBJECT_DELETE      → { id }
  OBJECT_LOCK        → { id, userId }   ← prevent conflicts
  CURSOR_MOVE        → { userId, position3D }

Server → All Clients:
  SCENE_STATE        → full scene on join
  OBJECT_UPDATED     → delta update
  CURSOR_UPDATE      → other users' cursor positions
```

**Conflict Prevention (Locking):**
- When a user clicks an object → send `OBJECT_LOCK`
- Object is locked to that user for the duration of interaction
- Auto-release on mouse-up or disconnect
- Locked objects shown with the owner's color outline

### 2.3 — Scene State Persistence
- Redis for live session state (fast read/write during call)
- PostgreSQL snapshot on session end (restore for later)

---

## 🤖 Phase 3: AI Chatbot Integration (Weeks 8–9)

### 3.1 — Chatbox Component
```
/frontend/src/ai
  ChatPanel.tsx          → Slide-in AI chat sidebar
  MessageBubble.tsx      → User vs AI messages
  ContextBuilder.ts      → Builds scene/meeting context for AI
```

### 3.2 — AI Features via Claude API

| Feature | How it Works |
|---------|-------------|
| **Meeting Q&A** | User asks questions, AI answers with meeting context |
| **Scene Description** | AI describes the current 3D scene state |
| **Object Suggestions** | "Add a red cube near the sphere" → AI suggests transforms |
| **Live Transcript Summary** | Summarize what was discussed |
| **Code/Diagram Help** | Paste code, AI explains or reviews |
| **Action Commands** | Natural language → 3D scene changes |

### 3.3 — Context Injection
Send relevant context with each AI request:
```javascript
const buildContext = (sceneState, chatHistory, participants) => `
You are an AI assistant in a live video conference.

Current participants: ${participants.map(p => p.name).join(', ')}
3D Scene has ${sceneState.objects.length} objects.
Objects: ${JSON.stringify(sceneState.objects.slice(0, 5))}

Meeting has been running for ${meetingDuration} minutes.
Recent messages: ${chatHistory.slice(-5).map(m => m.text).join('\n')}
`;
```

### 3.4 — AI → Scene Control (Optional Advanced Feature)
Parse AI responses for scene commands:
```javascript
// AI returns structured JSON for scene manipulation
{
  "text": "I've added a red cube at the origin for you.",
  "sceneCommands": [
    { "action": "ADD_OBJECT", "type": "box", "position": [0,0,0], "color": "#ff0000" }
  ]
}
```

---

## 📐 Phase 4: Polish & Advanced Features (Weeks 10–12)

### UI/UX
- [ ] Split-view: video grid left, 3D scene right (resizable)
- [ ] Fullscreen 3D mode with floating video tiles
- [ ] Mobile-responsive layout
- [ ] Dark/light theme

### 3D Advanced
- [ ] Whiteboard plane in 3D (draw on a flat surface)
- [ ] Import PDF/images as 3D planes
- [ ] Laser pointer (shared beam in 3D space)
- [ ] Scene history / undo stack

### AI Advanced
- [ ] Voice-to-AI ("Hey Claude, rotate the cube 90 degrees")
- [ ] AI-generated meeting minutes at end of call
- [ ] Smart object placement suggestions

### Performance
- [ ] 3D LOD (Level of Detail) for heavy scenes
- [ ] Delta compression for WebSocket messages
- [ ] WebRTC adaptive bitrate based on network quality

---

## 🗂️ Full Project Structure

```
project/
├── backend/
│   ├── src/
│   │   ├── webrtc/         # mediasoup workers, room router
│   │   ├── sockets/        # Socket.IO 3D sync handlers
│   │   ├── routes/         # REST API (auth, rooms)
│   │   ├── models/         # DB models
│   │   └── ai/             # Claude API proxy
│   └── package.json
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── VideoGrid/
│   │   │   ├── ControlBar/
│   │   │   └── ParticipantList/
│   │   ├── 3d/
│   │   │   ├── Scene.tsx
│   │   │   ├── ObjectControls.tsx
│   │   │   └── SceneSync.ts
│   │   ├── ai/
│   │   │   ├── ChatPanel.tsx
│   │   │   └── ContextBuilder.ts
│   │   └── hooks/
│   │       ├── useWebRTC.ts
│   │       ├── useScene.ts
│   │       └── useAI.ts
│   └── package.json
│
├── docker-compose.yml
└── README.md
```

---

## 🚦 Development Roadmap

```
Week 1-2   │ Auth + Room system + basic UI shell
Week 3     │ WebRTC video/audio working (2-4 participants)
Week 4-5   │ Three.js scene rendering + local controls
Week 6-7   │ WebSocket 3D sync (multi-user manipulation)
Week 8     │ AI chatbot panel + Claude API integration
Week 9     │ AI context awareness + scene commands
Week 10    │ Polish UI, split-view layout, mobile
Week 11    │ Performance optimization + load testing
Week 12    │ Deploy to cloud, beta testing
```

---

## ⚠️ Key Technical Challenges & Solutions

| Challenge | Solution |
|-----------|----------|
| 3D sync conflicts (two users grab same object) | Object locking with userId ownership |
| High latency for 3D updates | WebSocket delta updates (only send changed values) |
| WebRTC scaling beyond 4 people | Use mediasoup SFU, not P2P mesh |
| AI context window limits | Send summarized scene state, not full dump |
| Mobile 3D performance | Reduce polygon count, disable shadows on mobile |

---

## 💰 Estimated Costs (Monthly, 100 users)

| Service | Cost |
|---------|------|
| mediasoup server (EC2 c5.xlarge) | ~$150/mo |
| TURN/STUN server (coturn) | ~$30/mo |
| Redis (ElastiCache) | ~$50/mo |
| PostgreSQL (RDS) | ~$50/mo |
| Claude API (AI chat) | ~$20–100/mo (usage-based) |
| **Total** | **~$300–380/mo** |

---

## 🔑 Key Libraries to Install

```bash
# Backend
npm install mediasoup socket.io express jsonwebtoken
npm install @anthropic-ai/sdk redis pg

# Frontend
npm install three @react-three/fiber @react-three/drei
npm install mediasoup-client socket.io-client
npm install @anthropic-ai/sdk zustand
```

---

*Built with WebRTC + Three.js + Claude AI*
