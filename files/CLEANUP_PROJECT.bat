@echo off
REM Cleanup Script - Remove unnecessary files from HoloCollabEduMeet
REM Run this to clean up your project folder

echo ========================================
echo HoloCollabEduMeet - Project Cleanup
echo ========================================
echo.
echo This will remove unnecessary documentation and script files.
echo Press Ctrl+C to cancel, or any key to continue...
pause >nul

echo.
echo Removing duplicate documentation files...

REM Remove duplicate documentation
del /f /q "APPLY_GESTURE_FIX.md" 2>nul
del /f /q "COMPLETE_FIX.md" 2>nul
del /f /q "FINAL_MEDIAPIPE_FIX.md" 2>nul
del /f /q "FINAL_SOLUTION.md" 2>nul
del /f /q "FIX_SUMMARY.md" 2>nul
del /f /q "GESTURE_FIX_FINAL.md" 2>nul
del /f /q "GESTURE_TROUBLESHOOTING.md" 2>nul
del /f /q "MEDIAPIPE_FIX.md" 2>nul
del /f /q "START_HERE.md" 2>nul
del /f /q "TROUBLESHOOTING.md" 2>nul
del /f /q "GET_STARTED.md" 2>nul

echo Removing temporary/development scripts...

REM Remove temporary scripts
del /f /q "GESTURE_CONTROL_PATCH.js" 2>nul
del /f /q "EXPORT_GESTURE_FILES.bat" 2>nul
del /f /q "DOWNLOAD_MEDIAPIPE.bat" 2>nul
del /f /q "TEST_GESTURES.bat" 2>nul
del /f /q "VERIFY.bat" 2>nul
del /f /q "CHECK_SERVICES.bat" 2>nul
del /f /q "clean_project.bat" 2>nul

echo.
echo ========================================
echo Cleanup Complete!
echo ========================================
echo.
echo Remaining essential files:
echo   - README.md (Main documentation)
echo   - QUICK_START.md (Quick setup guide)
echo   - SETUP.bat (Initial setup)
echo   - START_DEV.bat (Start all services)
echo   - docs/ (Technical documentation)
echo.
echo Your project is now cleaner and easier to navigate!
echo.
pause
