"""
Export all hand gesture related files
"""
import os
import shutil
from pathlib import Path

# Create export directory
export_dir = Path("GESTURE_FILES_EXPORT")
export_dir.mkdir(exist_ok=True)

# Files to export
files_to_export = [
    # Frontend
    ("apps/web/src/pages/Session.tsx", "frontend/Session.tsx"),
    ("apps/web/src/services/GestureService.ts", "frontend/GestureService.ts"),
    ("apps/web/src/realtime/SocketManager.ts", "frontend/SocketManager.ts"),
    ("apps/web/src/three/ARScene.ts", "frontend/ARScene.ts"),
    
    # Backend Services
    ("services/cv-service/app/main.py", "backend/cv-service/main.py"),
    ("services/cv-service/app/recognition/classifier.py", "backend/cv-service/classifier.py"),
    ("services/realtime/app/main.py", "backend/realtime/main.py"),
    ("services/realtime/app/websocket/manager.py", "backend/realtime/manager.py"),
    ("services/realtime/app/state/model_state.py", "backend/realtime/model_state.py"),
    
    # Configuration
    ("services/cv-service/requirements.txt", "config/cv-requirements.txt"),
    ("services/realtime/requirements.txt", "config/realtime-requirements.txt"),
    ("apps/web/package.json", "config/frontend-package.json"),
    
    # Documentation
    ("GESTURE_FIX_FINAL.md", "docs/GESTURE_FIX_FINAL.md"),
    ("APPLY_GESTURE_FIX.md", "docs/APPLY_GESTURE_FIX.md"),
    ("GESTURE_TROUBLESHOOTING.md", "docs/GESTURE_TROUBLESHOOTING.md"),
    ("GESTURE_CONTROL_PATCH.js", "docs/GESTURE_CONTROL_PATCH.js"),
    
    # Scripts
    ("scripts/test_gestures.py", "scripts/test_gestures.py"),
    ("scripts/download_mediapipe.py", "scripts/download_mediapipe.py"),
    ("CHECK_SERVICES.bat", "scripts/CHECK_SERVICES.bat"),
    ("TEST_GESTURES.bat", "scripts/TEST_GESTURES.bat"),
]

print("=" * 60)
print("Exporting Hand Gesture Files")
print("=" * 60)
print()

for source, dest in files_to_export:
    source_path = Path(source)
    dest_path = export_dir / dest
    
    if source_path.exists():
        dest_path.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(source_path, dest_path)
        print(f"✓ {source} -> {dest}")
    else:
        print(f"✗ {source} (not found)")

# Create README
readme_content = """# Hand Gesture Control Files

## Overview
This archive contains all files related to hand gesture detection and control in HoloCollab EduMeet.

## Directory Structure

```
GESTURE_FILES_EXPORT/
├── frontend/           # React/TypeScript frontend files
│   ├── Session.tsx     # Main session page with gesture integration
│   ├── GestureService.ts   # MediaPipe gesture detection
│   ├── SocketManager.ts    # WebSocket communication
│   └── ARScene.ts      # Three.js 3D scene management
│
├── backend/            # Python backend services
│   ├── cv-service/     # Computer vision service
│   │   ├── main.py     # FastAPI app
│   │   └── classifier.py   # Gesture classification
│   └── realtime/       # Real-time state management
│       ├── main.py     # WebSocket server
│       ├── manager.py  # Connection manager
│       └── model_state.py  # 3D model state
│
├── config/             # Configuration files
│   ├── cv-requirements.txt
│   ├── realtime-requirements.txt
│   └── frontend-package.json
│
├── docs/               # Documentation
│   ├── GESTURE_FIX_FINAL.md
│   ├── APPLY_GESTURE_FIX.md
│   ├── GESTURE_TROUBLESHOOTING.md
│   └── GESTURE_CONTROL_PATCH.js
│
└── scripts/            # Utility scripts
    ├── test_gestures.py
    ├── download_mediapipe.py
    ├── CHECK_SERVICES.bat
    └── TEST_GESTURES.bat
```

## Gesture Controls

| Gesture | Action |
|---------|--------|
| ✊ Fist (0 fingers) | Reset model position, rotation, scale |
| ✋ Open Hand (5 fingers) | Rotate model based on hand orientation |
| 🤏 Pinch (2 fingers) | Zoom in/out (scale model) |
| ☝️ Pointing (1 finger) | Model follows index finger position |

## How It Works

1. **MediaPipe Detection** (GestureService.ts)
   - Captures video from webcam
   - Detects 21 hand landmarks per frame
   - Runs at ~30 FPS

2. **Gesture Classification** (Session.tsx)
   - Counts extended fingers
   - Identifies gesture type
   - Applies transformation to 3D model

3. **Direct Control** (Session.tsx)
   - Landmarks directly control model
   - No backend dependency for basic control
   - Instant response, no lag

4. **Backend Sync** (Optional)
   - Sends gestures to CV Service
   - Classifies and validates
   - Broadcasts to other users

## Key Features

✅ Real-time hand tracking with MediaPipe
✅ Direct landmark-to-model mapping
✅ 4 distinct gesture controls
✅ Instant response (no backend delay)
✅ Multi-user synchronization
✅ Comprehensive error handling
✅ CDN fallback for MediaPipe files

## Installation

See individual service README files for setup instructions.

## Testing

```bash
# Test gesture pipeline
python scripts/test_gestures.py

# Check all services
CHECK_SERVICES.bat
```

## Troubleshooting

See `docs/GESTURE_TROUBLESHOOTING.md` for common issues and solutions.

## Architecture

```
Camera → MediaPipe → Landmarks → Gesture Detection → 3D Model
                                      ↓
                              WebSocket (optional)
                                      ↓
                              Backend Services
                                      ↓
                              Multi-user Sync
```

## License

MIT License - See main project LICENSE file

## Support

For issues, see GESTURE_TROUBLESHOOTING.md or check the main project documentation.
"""

with open(export_dir / "README.md", "w") as f:
    f.write(readme_content)

print()
print("=" * 60)
print(f"Export complete! Files saved to: {export_dir.absolute()}")
print("=" * 60)
print()
print("Archive contents:")
print(f"  - {len([f for f in files_to_export if Path(f[0]).exists()])} source files")
print(f"  - README.md with documentation")
print()
print("To use these files:")
print("  1. Copy to your project")
print("  2. Install dependencies from config/")
print("  3. Follow docs/APPLY_GESTURE_FIX.md")
