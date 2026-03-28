$ErrorActionPreference = "Stop"

$projectRoot = Resolve-Path (Join-Path $PSScriptRoot "..")

if (-not (Get-Command powershell.exe -ErrorAction SilentlyContinue)) {
  throw "powershell.exe is required but was not found in PATH."
}

& (Join-Path $PSScriptRoot "install-openclaw.ps1")

Write-Host ""
Write-Host "Starting Music Skill assistant..."

$assistantCommand = @"
$env:MUSIC_LIBRARY_DIR = '$projectRoot'
Set-Location '$projectRoot'
pnpm start:assistant
"@

Start-Process -FilePath "powershell.exe" -ArgumentList "-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", $assistantCommand | Out-Null

Write-Host "Assistant startup requested."
Write-Host "This launches the panel and the Windows host-level voice listener."
