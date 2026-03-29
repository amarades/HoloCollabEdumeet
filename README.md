# ⬡ HoloCollab EduMeet

[![React](https://img.shields.io/badge/Frontend-React%2018-blue?style=for-the-badge&logo=react)](https://reactjs.org/)
[![FastAPI](https://img.shields.io/badge/Backend-FastAPI-009688?style=for-the-badge&logo=fastapi)](https://fastapi.tiangolo.com/)
[![Gemini AI](https://img.shields.io/badge/AI-Google%20Gemini%202.5%20Flash-4285F4?style=for-the-badge&logo=google-cloud)](https://ai.google.dev/)
[![Three.js](https://img.shields.io/badge/3D-Three.js-black?style=for-the-badge&logo=three.js)](https://threejs.org/)

**HoloCollab EduMeet** is a premium, immersive 3D collaborative platform designed for the next generation of online education. It combines real-time WebRTC communication, interactive AR/3D laboratory environments, and advanced AI-powered insights to create a truly engaging learning experience.

![Demo](docs/assets/demo_video.webp)

---

## ✨ Core Features

### 🎙 AI-Powered Class Summaries
Never miss a detail again. HoloCollab automatically transcribes live sessions in the background. At the end of every class, users can generate a beautiful **AI-generated report** (powered by Gemini 2.5 Flash) featuring a summary of topics discussed, key takeaways, and structured reading notes directly from the frontend.

### 🖖 Next-Gen Gesture Interaction
Control your 3D environment naturally. Using **MediaPipe 0.10+**, teachers and students can rotate, scale, and interact with 3D anatomical, chemical, or engineering models using just their hands—no controllers required.

### 🧠 Intelligent Topic Preparation
Teachers can define their session topic simply by speaking or typing. Our Gemini 2.5 Flash AI listens to the preparation phase, detects the subject matter, and automatically produces lesson plans and suggestions for 3-D models (e.g., "Human Heart", "Solar System") to load into the lobby.

### 🌐 Real-Time Immersive Collaboration
Built on a high-performance **Socket.io** and **WebRTC** stack, supporting:
- Ultra-low latency voice and video.
- Synchronized 3D model interaction across all participants.
- Real-time hand gesture synchronization.

---

## 🏗 Repository Structure

```
HoloCollabEduMeet/
├── apps/
│   └── web/                # React + Vite + Three.js Frontend
├── services/
│   ├── backend/            # FastAPI + SQLAlchemy Core Service
│   └── realtime/           # Socket.io Signaling Service
├── infrastructure/         # K8s & Docker Deployment Configs
├── docs/                   # Full Documentation & Guides
├── PULL_START_DEV.bat      # One-click Developer Start (Windows)
└── SETUP.bat               # Initial Environment Setup
```

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- Python 3.10+
- Google Gemini API Key

### Quick Start (Windows)
1. Clone the repository.
2. Run `SETUP.bat` to install all dependencies and configure environments.
3. Run `PULL_START_DEV.bat` to launch the entire stack (Frontend, Backend, Realtime).

For manual setup instructions or Linux/macOS deployment, see [QUICK_START.md](docs/QUICK_START.md).

---

## 🎨 Design System: Aether Graphite
HoloCollab utilizes the **Aether Graphite** design system—a custom-crafted visual language featuring glassmorphism, depth-based layout, and high-contrast accessibility tailored for immersive learning.

---

## 📄 License
This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
