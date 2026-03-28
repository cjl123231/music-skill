$ErrorActionPreference = "Stop"

$projectRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$port = if ($env:PORT) { $env:PORT } else { "3310" }

if (-not $env:MUSIC_STORAGE_DRIVER) {
  $env:MUSIC_STORAGE_DRIVER = "sqlite"
}

if (-not $env:MUSIC_DB_PATH) {
  $env:MUSIC_DB_PATH = Join-Path $projectRoot "data\\music-skill.db"
}

if (-not $env:MUSIC_AGENT_TTS_ENABLED) {
  $env:MUSIC_AGENT_TTS_ENABLED = "false"
}

if (-not $env:MUSIC_AGENT_TTS_MODE) {
  $env:MUSIC_AGENT_TTS_MODE = "short"
}

Write-Host "Starting Music Skill panel and voice listener..."
Write-Host "PORT=$port"
Write-Host "MUSIC_STORAGE_DRIVER=$($env:MUSIC_STORAGE_DRIVER)"
Write-Host "MUSIC_DB_PATH=$($env:MUSIC_DB_PATH)"
Write-Host "MUSIC_AGENT_TTS_ENABLED=$($env:MUSIC_AGENT_TTS_ENABLED)"
Write-Host "MUSIC_AGENT_TTS_MODE=$($env:MUSIC_AGENT_TTS_MODE)"
Write-Host ""

$panelCommand = @"
$env:PORT = '$port'
$env:MUSIC_STORAGE_DRIVER = '$($env:MUSIC_STORAGE_DRIVER)'
$env:MUSIC_DB_PATH = '$($env:MUSIC_DB_PATH)'
Set-Location '$projectRoot'
pnpm start:panel
"@

$voiceCommand = @"
$env:PORT = '$port'
$env:MUSIC_STORAGE_DRIVER = '$($env:MUSIC_STORAGE_DRIVER)'
$env:MUSIC_DB_PATH = '$($env:MUSIC_DB_PATH)'
$env:MUSIC_AGENT_TTS_ENABLED = '$($env:MUSIC_AGENT_TTS_ENABLED)'
$env:MUSIC_AGENT_TTS_MODE = '$($env:MUSIC_AGENT_TTS_MODE)'
Set-Location '$projectRoot'
pnpm start:voice
"@

Start-Process -FilePath "powershell.exe" -ArgumentList "-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", $panelCommand | Out-Null
Start-Sleep -Seconds 3
Start-Process -FilePath "powershell.exe" -ArgumentList "-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", $voiceCommand | Out-Null

Write-Host "Panel startup requested."
Write-Host "Voice listener startup requested."
Write-Host "Open http://localhost:$port/panel"
Write-Host "Agent TTS: $($env:MUSIC_AGENT_TTS_ENABLED) ($($env:MUSIC_AGENT_TTS_MODE))"
