@echo off
echo ========================================
echo HoloCollab EduMeet - Pull and Start Dev
echo ========================================
echo.

echo [1/3] Pulling latest changes from Git...
git pull
if %errorlevel% neq 0 (
    echo.
    echo ERROR: Git pull failed. Please resolve conflicts or check repository status.
    pause
    exit /b 1
)

echo.
echo [2/3] Starting Backend Services...
start "HoloCollab Backend Services" cmd /c "python scripts\start_all.py || pause"
echo Backend services starting in a new window...

echo.
echo [3/3] Starting Frontend Service...
start "HoloCollab Frontend" cmd /c "cd apps\web && npm run dev || pause"
echo Frontend starting in a new window...

echo.
echo ========================================
echo Development environment starting!
echo ========================================
echo - Backend services are starting in a new window.
echo - Frontend is starting in a new window.
echo - Wait a moment for all services to initialize.
echo.
echo Frontend URL: http://localhost:5173
echo Backend URLs:
echo   - Backend:  http://localhost:8000
echo   - AI Svc:   http://localhost:8003
echo   - CV Svc:   http://localhost:8001
echo   - Realtime: http://localhost:8002
echo ========================================
echo.
pause
