# HoloCollab EduMeet

> **AI-Powered AR Collaborative Learning Platform**  
> Transform remote education with immersive 3D visualization, real-time collaboration, and intelligent AI assistance.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Python 3.9+](https://img.shields.io/badge/python-3.9+-blue.svg)](https://www.python.org/downloads/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.100+-green.svg)](https://fastapi.tiangolo.com/)

---

## 🎯 Overview

HoloCollab EduMeet is a next-generation educational platform that combines augmented reality, computer vision, and artificial intelligence to create immersive learning experiences. Students and educators can interact with 3D models in real-time, collaborate seamlessly, and receive AI-powered assistance—all through a web browser.

### Key Features

- **🎨 3D Model Visualization**: Interactive WebGL-based 3D rendering with Three.js
- **👋 Gesture Recognition**: MediaPipe-powered hand tracking for intuitive model manipulation
- **🤖 AI Assistant**: Google Gemini integration for contextual explanations and quiz generation
- **📹 Real-time Collaboration**: WebRTC video conferencing with synchronized model states
- **🔐 Secure Authentication**: JWT-based auth with role-based access control
- **⚡ Low Latency**: Socket.IO for instant state synchronization across participants

---

## 🏗️ Architecture

HoloCollab EduMeet follows a **microservices architecture** for scalability and maintainability:

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│   Frontend  │────▶│   Backend    │────▶│  AI Service │
│  (Browser)  │     │   (FastAPI)  │     │   (Gemini)  │
└─────────────┘     └──────────────┘     └─────────────┘
       │                    │
       │                    ▼
       │            ┌──────────────┐
       │            │   Realtime   │
       └───────────▶│  (Socket.IO) │
                    └──────────────┘
                           │
                           ▼
                    ┌──────────────┐
                    │  CV Service  │
                    │  (MediaPipe) │
                    └──────────────┘
```

### Technology Stack

**Frontend**
- HTML5, CSS3, JavaScript (ES6+)
- Three.js for 3D rendering
- MediaPipe for gesture recognition
- Socket.IO client for real-time communication

**Backend**
- FastAPI (Python 3.9+)
- Socket.IO for WebSocket management
- Pydantic for data validation
- JWT for authentication

**Services**
- **AI Service**: Google Gemini API integration
- **CV Service**: MediaPipe Hands for gesture processing
- **Realtime Service**: Room management and state synchronization

---

## 🚀 Quick Start

### Prerequisites

- Python 3.9 or higher
- Node.js 16+ (optional, for frontend tooling)
- Google Gemini API key

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/holocollab-edumeet.git
   cd holocollab-edumeet
   ```

2. **Set up the backend**
   ```bash
   cd backend
   python -m venv .venv
   source .venv/bin/activate  # On Windows: .venv\Scripts\activate
   pip install -r requirements.txt
   ```

3. **Configure environment variables**
   ```bash
   cp .env.example .env
   # Edit .env and add your GEMINI_API_KEY
   ```

4. **Run the application**
   ```bash
   python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
   ```

5. **Access the platform**
   - Open your browser to `http://localhost:8000/session.html`
   - Grant camera permissions when prompted
   - Start collaborating!

For detailed setup instructions, see [QUICK_START.md](QUICK_START.md).

---

## 📁 Project Structure

```
holocollab-edumeet/
├── frontend/          # Static web application
│   ├── js/
│   │   ├── core/      # App logic, auth, API client
│   │   ├── ar/        # 3D scene, model loader
│   │   ├── gestures/  # Hand tracking & recognition
│   │   ├── video/     # WebRTC implementation
│   │   ├── realtime/  # Socket.IO client
│   │   └── ai/        # AI assistant integration
│   └── css/           # Stylesheets
│
├── backend/           # FastAPI application
│   └── app/
│       ├── api/       # REST endpoints
│       ├── services/  # Business logic
│       ├── db/        # Database models
│       └── websocket/ # WebSocket handlers
│
├── ai-service/        # AI integration module
├── cv-service/        # Computer vision module
├── realtime/          # Real-time state management
├── shared/            # Shared utilities
├── docs/              # Documentation
└── infrastructure/    # Deployment configs
```

---

## 🎮 Usage

### Joining a Session

1. Click "Join Session" on the home page or navigate to `/join`
2. Enter the 6-character room code provided by the host
3. Enter your name and click "Join Session"
4. You will be connected to the live session with shared 3D models

### Gesture Controls

- **✊ Fist**: Reset model position
- **☝️ Pointing**: Move model
- **✋ Open Hand (Left/Right)**: Rotate model
- **🤏 Pinch**: Zoom in/out

### AI Assistant

Ask questions about the 3D model:
- "Explain the structure of this model"
- "Generate a quiz about this topic"
- "What are the key components?"

---

## 🧪 Development

### Running Tests

```bash
# Backend tests
cd backend
pytest

# Frontend tests (if configured)
npm test
```

### Code Quality

```bash
# Python linting
flake8 backend/

# Format code
black backend/
```

---

## 🤝 Contributing

We welcome contributions! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- **Three.js** for 3D rendering capabilities
- **MediaPipe** for hand tracking technology
- **Google Gemini** for AI-powered features
- **FastAPI** for the robust backend framework

---

## 📞 Support

- **Documentation**: [docs/](docs/)
- **Issues**: [GitHub Issues](https://github.com/yourusername/holocollab-edumeet/issues)
- **Discussions**: [GitHub Discussions](https://github.com/yourusername/holocollab-edumeet/discussions)

---

**Built with ❤️ for the future of education**
