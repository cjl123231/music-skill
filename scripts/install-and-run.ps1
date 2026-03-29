$ErrorActionPreference = "Stop"

$projectRoot = Resolve-Path (Join-Path $PSScriptRoot "..")

if (-not (Get-Command powershell.exe -ErrorAction SilentlyContinue)) {
  throw "powershell.exe is required but was not found in PATH."
}

& (Join-Path $PSScriptRoot "install-openclaw.ps1")

Write-Host ""
Write-Host "Starting XiaoLe desktop player..."

$assistantCommand = @"
Set-Location '$projectRoot'
pnpm desktop:start
"@

Start-Process -FilePath "powershell.exe" -ArgumentList "-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", $assistantCommand | Out-Null

Write-Host "Desktop player startup requested."
Write-Host "This launches the XiaoLe desktop player window."
