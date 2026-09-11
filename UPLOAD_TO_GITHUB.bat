@echo off
setlocal
cd /d "%~dp0"
where git >nul 2>nul
if errorlevel 1 (
  echo Git is not installed. Please install Git for Windows first.
  pause
  exit /b 1
)

echo ======================================================
echo LifeOS - AdMob Rewarded + Pro v1
echo ======================================================
echo.
echo Required for the signed APK and Google login:
echo   LIFEOS_DEBUG_KEYSTORE_BASE64
echo   VITE_GOOGLE_WEB_CLIENT_ID
echo.
echo Optional for the first TEST build:
echo   ADMOB_ANDROID_APP_ID
echo   VITE_ADMOB_REWARDED_AD_UNIT_ID
echo.
echo If the two AdMob values are missing, GitHub Actions will use

echo Google's official DEMO AdMob IDs automatically. This is safer for testing.
echo.
echo IMPORTANT: never copy the keystore or secret values into this folder.
echo.
pause

if exist .git rmdir /s /q .git
git init
git branch -M main
git config user.name "LifeOS Builder"
git config user.email "lifeos-builder@local"
git add -A
git commit -m "feat: add rewarded AdMob limits and Pro bypass"
git remote add origin https://github.com/walaanashukaty-pixel/LifeOS-Android.git
git push -u origin main --force
if errorlevel 1 (
  echo.
  echo Upload failed. Keep this window open and send a screenshot.
  pause
  exit /b 1
)
start "" "https://github.com/walaanashukaty-pixel/LifeOS-Android/actions"
echo.
echo Upload complete. GitHub Actions is opening now.
echo Open the latest Build LifeOS APK run and wait until it becomes green.
pause
