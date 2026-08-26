@echo off
chcp 65001 >nul
setlocal
cd /d "%~dp0"
echo ==========================================
echo     LifeOS - Upload to GitHub
 echo ==========================================
echo.
where git >nul 2>&1
if errorlevel 1 (
  echo ERROR: Git is not installed or not in PATH.
  echo Install Git for Windows, then run this file again.
  pause
  exit /b 1
)
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\upload-to-github.ps1"
set ERR=%ERRORLEVEL%
echo.
if "%ERR%"=="0" (
  echo SUCCESS: LifeOS was uploaded to GitHub.
  echo The Actions page should open automatically.
) else (
  echo Upload did not complete. Error code: %ERR%
)
pause
exit /b %ERR%
