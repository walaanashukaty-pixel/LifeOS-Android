$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$hashFile = Join-Path $root 'SOURCE_HASHES.sha256'
$failed = $false
Get-Content $hashFile | ForEach-Object {
  if ($_ -match '^([0-9a-f]{64})  (.+)$') {
    $expected = $Matches[1]
    $relative = $Matches[2]
    $path = Join-Path $root $relative
    if (!(Test-Path $path)) {
      Write-Host "MISSING: $relative" -ForegroundColor Red
      $failed = $true
    } else {
      $actual = (Get-FileHash -Algorithm SHA256 $path).Hash.ToLower()
      if ($actual -ne $expected) {
        Write-Host "CHANGED: $relative" -ForegroundColor Red
        $failed = $true
      }
    }
  }
}
if ($failed) { exit 1 }
Write-Host 'OK - Original UI, CSS, logic, Supabase and backend files are unchanged.' -ForegroundColor Green
