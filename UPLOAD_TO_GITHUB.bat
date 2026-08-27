@echo off
setlocal
cd /d "%~dp0"
where git >nul 2>nul
if errorlevel 1 (
  echo Git is not installed. Please install Git for Windows first.
  pause
  exit /b 1
)

if exist .git rmdir /s /q .git
git init
git branch -M main
git config user.name "LifeOS Builder"
git config user.email "lifeos-builder@local"
git add -A
git commit -m "feat: professional LifeOS mobile shell and notifications"
git remote add origin https://github.com/walaanashukaty-pixel/LifeOS-Android.git
git push -u origin main --force
if errorlevel 1 (
  echo.
  echo Upload failed. Keep this window open and send a screenshot.
  pause
  exit /b 1
)
start https://github.com/walaanashukaty-pixel/LifeOS-Android/actions
echo.
echo Upload complete. GitHub Actions is opening now.
pause
