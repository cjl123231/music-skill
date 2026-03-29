$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent $PSScriptRoot
$port = if ($env:PORT) { $env:PORT } else { "3310" }

function Stop-PortListeners {
  param(
    [Parameter(Mandatory = $true)]
    [int]$Port
  )

  $listeners = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
  if (-not $listeners) {
    return
  }

  $processIds = $listeners | Select-Object -ExpandProperty OwningProcess -Unique
  foreach ($processId in $processIds) {
    try {
      Stop-Process -Id $processId -Force -ErrorAction Stop
      Write-Host "Stopped existing listener on port $Port (PID $processId)"
    } catch {
      Write-Warning "Failed to stop PID $processId on port ${Port}: $($_.Exception.Message)"
    }
  }
}

function Stop-MusicPanelProcesses {
  $patterns = @(
    "src\\interfaces\\http\\server-runner.ts",
    "pnpm start:panel",
    "pnpm dev:http"
  )

  $processes = Get-CimInstance Win32_Process -ErrorAction SilentlyContinue |
    Where-Object {
      $commandLine = $_.CommandLine
      if (-not $commandLine) {
        return $false
      }

      foreach ($pattern in $patterns) {
        if ($commandLine -match $pattern) {
          return $true
        }
      }

      return $false
    }

  foreach ($process in $processes) {
    try {
      Stop-Process -Id $process.ProcessId -Force -ErrorAction Stop
      Write-Host "Stopped previous panel process PID $($process.ProcessId)"
    } catch {
      Write-Warning "Failed to stop previous panel process PID $($process.ProcessId): $($_.Exception.Message)"
    }
  }
}

if (-not $env:MUSIC_STORAGE_DRIVER) {
  $env:MUSIC_STORAGE_DRIVER = "sqlite"
}

if (-not $env:MUSIC_DB_PATH) {
  $env:MUSIC_DB_PATH = Join-Path $projectRoot "data\\music-skill.db"
}

Set-Location $projectRoot

Stop-MusicPanelProcesses
Stop-PortListeners -Port ([int]$port)

Write-Host "Starting panel on http://127.0.0.1:$port/panel"
Write-Host "MUSIC_STORAGE_DRIVER=$($env:MUSIC_STORAGE_DRIVER)"
Write-Host "MUSIC_DB_PATH=$($env:MUSIC_DB_PATH)"

pnpm dev:http
