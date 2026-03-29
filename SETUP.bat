@echo off
echo ========================================
echo HoloCollab EduMeet - Setup Script
echo ========================================
echo.

echo [0/5] Installing utility dependencies...
python -m pip install -r requirements.txt
if %errorlevel% neq 0 (
    echo ERROR: Utility installation failed
    pause
    exit /b 1
)

echo.
echo [1/3] Installing Backend dependencies...
cd services\backend
python -m pip install -r requirements.txt
if %errorlevel% neq 0 (
    echo ERROR: Backend installation failed
    pause
    exit /b 1
)
cd ..\..

echo.
echo [2/3] Installing Realtime Service dependencies...
cd services\realtime
python -m pip install -r requirements.txt
if %errorlevel% neq 0 (
    echo ERROR: Realtime Service installation failed
    pause
    exit /b 1
)
cd ..\..

echo.
echo [3/3] Installing Frontend dependencies...
cd apps\web
npm install
if %errorlevel% neq 0 (
    echo ERROR: Frontend installation failed
    pause
    exit /b 1
)
cd ..\..

echo.
echo [4/4] Downloading MediaPipe files...
python scripts\download_mediapipe.py
if %errorlevel% neq 0 (
    echo WARNING: MediaPipe download failed, will use CDN
)

echo.
echo ========================================
echo Setup completed successfully!
echo ========================================
echo.
echo Next steps:
echo 1. Configure your .env file (optional)
echo 2. Run START_DEV.bat to start all services
echo 3. Open http://localhost:5173 in your browser
echo.
pause
