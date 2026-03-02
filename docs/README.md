# HoloCollab EduMeet Documentation

## Project Overview
AI-Powered AR Collaborative Learning Platform

## Directory Structure
```
holocollab-edumeet/
├── frontend/          # Static HTML/CSS/JS frontend
├── backend/           # FastAPI unified backend
├── realtime/          # WebSocket/SocketIO real-time services
├── cv-service/        # Computer Vision & Gesture Recognition
├── ai-service/        # AI Chat & Quiz Generation
├── shared/            # Shared models and utilities
├── docs/              # Documentation
├── infrastructure/    # Deployment configs (Docker, K8s)
├── requirements.txt   # Root dependencies
├── README.md          # Project readme
├── license.md         # License information
└── .gitignore         # Git ignore rules
```

## Services

### Frontend
- **Location**: `frontend/`
- **Tech**: HTML, CSS, JavaScript, Three.js
- **Purpose**: User interface for 3D model viewing, AR sessions, and AI chat

### Backend
- **Location**: `backend/`
- **Tech**: FastAPI, Python
- **Purpose**: Unified API gateway, authentication, database management

### Realtime Service
- **Location**: `realtime/`
- **Tech**: Socket.IO, WebSockets
- **Purpose**: Real-time collaboration, room management, WebRTC signaling

### CV Service
- **Location**: `cv-service/`
- **Tech**: MediaPipe, OpenCV
- **Purpose**: Hand gesture recognition and processing

### AI Service
- **Location**: `ai-service/`
- **Tech**: Google Gemini API
- **Purpose**: AI chat assistant, quiz generation, concept explanations

## Getting Started

See [QUICK_START.md](../QUICK_START.md) for setup instructions.

## Architecture

See [system_design.md](../brain/system_design.md) for detailed architecture documentation.
