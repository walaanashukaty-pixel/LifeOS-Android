@echo off
setlocal EnableExtensions EnableDelayedExpansion
cd /d "%~dp0"

set "REMOTE_BRANCH=main"
set "DEFAULT_REMOTE_URL=https://github.com/walaanashukaty-pixel/LifeOS-Android.git"
set "MAX_PUSH_ATTEMPTS=2"
set "PUSH_TRY=0"

where git >nul 2>nul
if errorlevel 1 (
  echo Git is not installed. Please install Git for Windows first.
  pause
  exit /b 1
)

echo ======================================================
echo LifeOS - Safe GitHub Upload Helper
echo ======================================================
echo.
echo This helper keeps your current LifeOS files as the desired version,
echo preserves the remote GitHub history, and never force-pushes.
echo.
echo GitHub Actions behavior:
echo   1. Normal main/master push = ONE signed Android TEST APK workflow
echo   2. No separate web artifact is uploaded
echo   3. PRODUCTION APK + AAB run only on vMAJOR.MINOR.PATCH tags/manual release
echo.
echo IMPORTANT:
echo   - Existing remote commits are fetched before push.
echo   - If local and remote history diverged, your current files are
      committed on top of origin/main instead of overwriting Git history.
echo   - A local backup branch named lifeos-local-backup is kept before sync.
echo   - No .git deletion and no force push are used.
echo.
pause

rem ------------------------------------------------------
rem 1) Prepare local repository and identity
rem ------------------------------------------------------
if not exist .git (
  echo.
  echo [1/6] Initializing local Git repository...
  git init
  if errorlevel 1 goto :failed
)

git branch -M %REMOTE_BRANCH% >nul 2>nul
if errorlevel 1 goto :failed

for /f "delims=" %%i in ('git config user.name 2^>nul') do set "HAS_GIT_NAME=%%i"
if not defined HAS_GIT_NAME git config user.name "LifeOS Builder"
for /f "delims=" %%i in ('git config user.email 2^>nul') do set "HAS_GIT_EMAIL=%%i"
if not defined HAS_GIT_EMAIL git config user.email "lifeos-builder@local"

git remote get-url origin >nul 2>nul
if errorlevel 1 (
  echo.
  echo [2/6] Adding GitHub remote...
  git remote add origin %DEFAULT_REMOTE_URL%
  if errorlevel 1 goto :failed
) else (
  for /f "delims=" %%i in ('git remote get-url origin') do set "CURRENT_REMOTE=%%i"
  echo.
  echo [2/6] Using existing origin: !CURRENT_REMOTE!
)

rem ------------------------------------------------------
rem 2) Snapshot the exact local files before remote sync
rem ------------------------------------------------------
echo.
echo [3/6] Saving current LifeOS files locally...
git add -A
if errorlevel 1 goto :failed

git diff --cached --quiet
if errorlevel 1 (
  git commit -m "chore: update LifeOS app"
  if errorlevel 1 goto :failed
) else (
  git rev-parse --verify HEAD >nul 2>nul
  if errorlevel 1 (
    echo No commit exists yet. Creating the initial LifeOS snapshot...
    git commit --allow-empty -m "chore: initialize LifeOS repository"
    if errorlevel 1 goto :failed
  ) else (
    echo Local working tree is already committed.
  )
)

rem Keep a recoverable pointer to the exact pre-sync local version.
git branch -f lifeos-local-backup HEAD >nul 2>nul
if errorlevel 1 goto :failed

echo Backup branch updated: lifeos-local-backup

rem ------------------------------------------------------
rem 3) Safe remote sync + push. Retry once if remote changes
rem    between fetch and push.
rem ------------------------------------------------------
:sync_remote
set /a PUSH_TRY+=1
echo.
echo [4/6] Fetching GitHub history ^(attempt !PUSH_TRY!/%MAX_PUSH_ATTEMPTS%^)...
git fetch origin --prune
if errorlevel 1 goto :failed

rem If origin/main exists, make sure our final commit sits on top of it.
git show-ref --verify --quiet refs/remotes/origin/%REMOTE_BRANCH%
if errorlevel 1 (
  echo Remote branch origin/%REMOTE_BRANCH% does not exist yet. A new branch will be created.
) else (
  git merge-base --is-ancestor origin/%REMOTE_BRANCH% HEAD >nul 2>nul
  if errorlevel 1 (
    echo Remote contains commits not present in the local history.
    echo Safely rebasing the CURRENT FILE SNAPSHOT on top of origin/%REMOTE_BRANCH%...

    rem IMPORTANT: --soft moves only HEAD/index base. The working files remain
    rem exactly as they are now. Then git add -A makes the desired local tree
    rem the new commit on top of the remote history.
    git reset --soft origin/%REMOTE_BRANCH%
    if errorlevel 1 goto :failed

    git add -A
    if errorlevel 1 goto :failed

    git diff --cached --quiet
    if errorlevel 1 (
      git commit -m "chore: sync latest LifeOS over remote main"
      if errorlevel 1 goto :failed
      echo Safe sync commit created on top of origin/%REMOTE_BRANCH%.
    ) else (
      echo Local files already match origin/%REMOTE_BRANCH%.
    )
  ) else (
    echo Local history already contains the latest origin/%REMOTE_BRANCH%.
  )
)

rem ------------------------------------------------------
rem 4) Push normally. Never force-push.
rem ------------------------------------------------------
echo.
echo [5/6] Pushing LifeOS to GitHub...
git push -u origin %REMOTE_BRANCH%
if errorlevel 1 (
  if !PUSH_TRY! LSS %MAX_PUSH_ATTEMPTS% (
    echo.
    echo Push did not complete. GitHub may have changed after the fetch.
    echo Re-fetching once and repeating the safe sync...
    goto :sync_remote
  )
  goto :failed
)

rem ------------------------------------------------------
rem 5) Success
rem ------------------------------------------------------
echo.
echo [6/6] Upload complete.
start "" "https://github.com/walaanashukaty-pixel/LifeOS-Android/actions"
echo.
echo GitHub Actions is opening now.
echo.
echo For a Google Play release after production secrets are configured:
echo   git tag v1.0.0
echo   git push origin v1.0.0
echo.
echo If you ever need the exact local state from before synchronization:
echo   git switch lifeos-local-backup
echo.
pause
exit /b 0

:failed
echo.
echo ======================================================
echo Upload stopped safely.
echo ======================================================
echo No force push was attempted and the remote history was not rewritten.
echo Your pre-sync local state is kept in branch: lifeos-local-backup

echo.
echo Useful diagnostics:
echo   git status
echo   git log --oneline --decorate -10
echo   git log origin/main --oneline -5

echo.
echo Keep this window open and review the Git message above.
pause
exit /b 1
