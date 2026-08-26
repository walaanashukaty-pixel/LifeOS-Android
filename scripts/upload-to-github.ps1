$ErrorActionPreference = 'Stop'
$repo = 'https://github.com/walaanashukaty-pixel/LifeOS-Android.git'
$actionsUrl = 'https://github.com/walaanashukaty-pixel/LifeOS-Android/actions'
$root = Split-Path -Parent $PSScriptRoot
$temp = Join-Path $env:TEMP ("LifeOSUpload-" + [guid]::NewGuid().ToString('N'))

Write-Host "[1/6] Checking project files..." -ForegroundColor Cyan
$required = @(
  'package.json',
  'index.html',
  'src\main.tsx',
  'capacitor.config.ts',
  '.github\workflows\main.yml'
)
foreach ($item in $required) {
  $p = Join-Path $root $item
  if (-not (Test-Path $p)) { throw "Missing required file: $item" }
}

Write-Host "[2/6] Connecting to GitHub repository..." -ForegroundColor Cyan
& git clone $repo $temp
if ($LASTEXITCODE -ne 0) { throw 'Could not clone the GitHub repository.' }

Write-Host "[3/6] Replacing partial repository files with the complete LifeOS project..." -ForegroundColor Cyan
Get-ChildItem -LiteralPath $temp -Force | Where-Object { $_.Name -ne '.git' } | Remove-Item -Recurse -Force

# Copy every project file, including hidden .github, but never a local .git directory.
$robocopyArgs = @(
  $root,
  $temp,
  '/E',
  '/COPY:DAT',
  '/R:2',
  '/W:1',
  '/XD', (Join-Path $root '.git')
)
& robocopy @robocopyArgs | Out-Host
if ($LASTEXITCODE -ge 8) { throw "File copy failed (robocopy exit code $LASTEXITCODE)." }

Set-Location $temp
Write-Host "[4/6] Preparing Git commit..." -ForegroundColor Cyan
& git config user.name 'walaanashukaty-pixel'
& git config user.email 'walaanashukaty-pixel@users.noreply.github.com'
& git add -A
& git diff --cached --quiet
$hasChanges = ($LASTEXITCODE -ne 0)
if ($hasChanges) {
  & git commit -m 'Upload complete LifeOS Android project'
  if ($LASTEXITCODE -ne 0) { throw 'Git commit failed.' }
} else {
  Write-Host 'Repository already matches the complete project.' -ForegroundColor Yellow
}

Write-Host "[5/6] Uploading to GitHub..." -ForegroundColor Cyan
& git branch -M main
& git push origin main
if ($LASTEXITCODE -ne 0) {
  Write-Host ''
  Write-Host 'GitHub may open a browser sign-in window. Sign in with your GitHub account, then run UPLOAD_TO_GITHUB.bat again.' -ForegroundColor Yellow
  throw 'GitHub push failed.'
}

Write-Host "[6/6] Upload complete. Opening GitHub Actions..." -ForegroundColor Green
Start-Process $actionsUrl

try { Remove-Item -Recurse -Force $temp } catch {}
exit 0
