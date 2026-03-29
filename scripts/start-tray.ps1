$ErrorActionPreference = "Stop"

Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

$projectRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$port = if ($env:PORT) { $env:PORT } else { "3320" }
$panelUrl = "http://127.0.0.1:$port/panel"

function Get-ProcessIdsByPatterns([string[]]$Patterns) {
  $processes = Get-CimInstance Win32_Process -ErrorAction SilentlyContinue | Where-Object {
    $commandLine = $_.CommandLine
    if (-not $commandLine) {
      return $false
    }

    foreach ($pattern in $Patterns) {
      if ($commandLine -like "*$pattern*") {
        return $true
      }
    }

    return $false
  }

  return $processes | Select-Object -ExpandProperty ProcessId -Unique
}

function Get-TrackedProcessIds {
  return Get-ProcessIdsByPatterns @(
    "src/interfaces/http/server-runner.ts",
    "pnpm.cjs dev:http",
    "pnpm dev:http",
    "pnpm start:voice",
    "scripts/start-voice.ps1",
    "scripts/player-host.ps1"
  )
}

function Get-PanelProcessIds {
  return Get-ProcessIdsByPatterns @(
    "src/interfaces/http/server-runner.ts",
    "pnpm.cjs dev:http",
    "pnpm dev:http"
  )
}

function Get-VoiceProcessIds {
  return Get-ProcessIdsByPatterns @(
    "pnpm start:voice",
    "scripts/start-voice.ps1"
  )
}

function Stop-ProcessesByIds([int[]]$ProcessIds) {
  foreach ($processId in ($ProcessIds | Select-Object -Unique)) {
    try {
      Stop-Process -Id $processId -Force -ErrorAction Stop
    } catch {
    }
  }
}

function Stop-AssistantProcesses {
  Stop-ProcessesByIds (Get-TrackedProcessIds)
}

function Start-PanelProcess {
  $panelCommand = @"
`$env:PORT = '$port'
Set-Location '$projectRoot'
& '.\scripts\start-panel.ps1'
"@

  Start-Process -FilePath "powershell.exe" -ArgumentList "-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", $panelCommand -WindowStyle Hidden | Out-Null
}

function Start-VoiceProcess {
  $voiceCommand = @"
`$env:PORT = '$port'
Set-Location '$projectRoot'
pnpm start:voice
"@

  Start-Process -FilePath "powershell.exe" -ArgumentList "-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", $voiceCommand -WindowStyle Hidden | Out-Null
}

function Start-AssistantProcesses {
  Start-PanelProcess
  Start-Sleep -Seconds 3
  Start-VoiceProcess
}

function Restart-AssistantProcesses {
  Stop-AssistantProcesses
  Start-Sleep -Seconds 1
  Start-AssistantProcesses
}

function Start-VoiceOnly {
  if ((Get-VoiceProcessIds).Count -gt 0) {
    return $false
  }

  Start-VoiceProcess
  return $true
}

function Stop-VoiceOnly {
  $voicePids = Get-VoiceProcessIds
  if ($voicePids.Count -eq 0) {
    return $false
  }

  Stop-ProcessesByIds $voicePids
  return $true
}

function Get-AssistantStatus {
  $panelRunning = (Get-PanelProcessIds).Count -gt 0
  $voiceRunning = (Get-VoiceProcessIds).Count -gt 0

  $summary = if ($panelRunning -and $voiceRunning) {
    "XiaoLe running, voice on"
  } elseif ($panelRunning) {
    "XiaoLe running, voice off"
  } elseif ($voiceRunning) {
    "Voice on, panel off"
  } else {
    "XiaoLe stopped"
  }

  return @{
    panelRunning = $panelRunning
    voiceRunning = $voiceRunning
    summary = $summary
  }
}

function Update-TrayUi {
  param(
    [Parameter(Mandatory = $true)]
    [System.Windows.Forms.NotifyIcon]$NotifyIcon,
    [Parameter(Mandatory = $true)]
    [System.Windows.Forms.ToolStripMenuItem]$StatusItem,
    [Parameter(Mandatory = $true)]
    [System.Windows.Forms.ToolStripMenuItem]$StartVoiceItem,
    [Parameter(Mandatory = $true)]
    [System.Windows.Forms.ToolStripMenuItem]$StopVoiceItem
  )

  $status = Get-AssistantStatus
  $NotifyIcon.Text = $status.summary.Substring(0, [Math]::Min(63, $status.summary.Length))
  $StatusItem.Text = "Status: $($status.summary)"
  $StartVoiceItem.Enabled = -not $status.voiceRunning
  $StopVoiceItem.Enabled = $status.voiceRunning
}

Restart-AssistantProcesses

$notifyIcon = New-Object System.Windows.Forms.NotifyIcon
$notifyIcon.Icon = [System.Drawing.SystemIcons]::Application
$notifyIcon.Visible = $true
$notifyIcon.BalloonTipTitle = "XiaoLe"
$notifyIcon.BalloonTipText = "XiaoLe is running in the background. Right-click to open panel or manage local voice."

$contextMenu = New-Object System.Windows.Forms.ContextMenuStrip

$statusItem = $contextMenu.Items.Add("Status: checking...")
$statusItem.Enabled = $false
[void]$contextMenu.Items.Add((New-Object System.Windows.Forms.ToolStripSeparator))

$openItem = $contextMenu.Items.Add("Open XiaoLe panel")
$openItem.Add_Click({
  Start-Process $panelUrl | Out-Null
})

$startVoiceItem = $contextMenu.Items.Add("Start local voice")
$stopVoiceItem = $contextMenu.Items.Add("Stop local voice")

$startVoiceItem.Add_Click({
  if (Start-VoiceOnly) {
    $notifyIcon.ShowBalloonTip(2000, "XiaoLe", "Local voice started.", [System.Windows.Forms.ToolTipIcon]::Info)
  } else {
    $notifyIcon.ShowBalloonTip(2000, "XiaoLe", "Local voice is already running.", [System.Windows.Forms.ToolTipIcon]::Info)
  }
  Update-TrayUi -NotifyIcon $notifyIcon -StatusItem $statusItem -StartVoiceItem $startVoiceItem -StopVoiceItem $stopVoiceItem
})

$stopVoiceItem.Add_Click({
  if (Stop-VoiceOnly) {
    $notifyIcon.ShowBalloonTip(2000, "XiaoLe", "Local voice stopped.", [System.Windows.Forms.ToolTipIcon]::Info)
  } else {
    $notifyIcon.ShowBalloonTip(2000, "XiaoLe", "Local voice is not running.", [System.Windows.Forms.ToolTipIcon]::Info)
  }
  Update-TrayUi -NotifyIcon $notifyIcon -StatusItem $statusItem -StartVoiceItem $startVoiceItem -StopVoiceItem $stopVoiceItem
})

$restartItem = $contextMenu.Items.Add("Restart XiaoLe")
$restartItem.Add_Click({
  Restart-AssistantProcesses
  $notifyIcon.ShowBalloonTip(2000, "XiaoLe", "Background services restarted.", [System.Windows.Forms.ToolTipIcon]::Info)
  Update-TrayUi -NotifyIcon $notifyIcon -StatusItem $statusItem -StartVoiceItem $startVoiceItem -StopVoiceItem $stopVoiceItem
})

[void]$contextMenu.Items.Add((New-Object System.Windows.Forms.ToolStripSeparator))

$exitItem = $contextMenu.Items.Add("Exit XiaoLe")
$exitItem.Add_Click({
  $notifyIcon.Visible = $false
  Stop-AssistantProcesses
  [System.Windows.Forms.Application]::Exit()
})

$notifyIcon.ContextMenuStrip = $contextMenu
$notifyIcon.Add_DoubleClick({
  Start-Process $panelUrl | Out-Null
})

$statusTimer = New-Object System.Windows.Forms.Timer
$statusTimer.Interval = 3000
$statusTimer.Add_Tick({
  Update-TrayUi -NotifyIcon $notifyIcon -StatusItem $statusItem -StartVoiceItem $startVoiceItem -StopVoiceItem $stopVoiceItem
})
$statusTimer.Start()

Update-TrayUi -NotifyIcon $notifyIcon -StatusItem $statusItem -StartVoiceItem $startVoiceItem -StopVoiceItem $stopVoiceItem
$notifyIcon.ShowBalloonTip(3000)

[System.Windows.Forms.Application]::Run()
