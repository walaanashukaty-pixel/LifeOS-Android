$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$androidRes = Join-Path $root 'android/app/src/main/res'
if (!(Test-Path $androidRes)) { throw 'Android project not found. Run npx cap add android first.' }
$densities = @('mdpi','hdpi','xhdpi','xxhdpi','xxxhdpi')
foreach ($density in $densities) {
  $src = Join-Path $root "native-assets/$density"
  $dst = Join-Path $androidRes "mipmap-$density"
  if (!(Test-Path $dst)) { New-Item -ItemType Directory -Force -Path $dst | Out-Null }
  Copy-Item (Join-Path $src 'ic_launcher.png') (Join-Path $dst 'ic_launcher.png') -Force
  Copy-Item (Join-Path $src 'ic_launcher_round.png') (Join-Path $dst 'ic_launcher_round.png') -Force
  Copy-Item (Join-Path $src 'ic_launcher_foreground.png') (Join-Path $dst 'ic_launcher_foreground.png') -Force
}
Write-Host 'LifeOS launcher assets applied.' -ForegroundColor Green
