Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

if (-not (Test-Path ".venv\Scripts\python.exe")) {
    throw ".venv is missing. Run .\scripts\bootstrap.ps1 first."
}

$python = ".venv\Scripts\python.exe"
$pip = ".venv\Scripts\pip.exe"

& $pip install -e ".[build]"

if (Test-Path "build") {
    Remove-Item "build" -Recurse -Force
}
if (Test-Path "dist") {
    Remove-Item "dist" -Recurse -Force
}

& $python -m PyInstaller --noconfirm "haw_assistant.spec"

$releaseDir = Join-Path $root "release\windows-portable"
if (Test-Path $releaseDir) {
    Remove-Item $releaseDir -Recurse -Force
}
New-Item -ItemType Directory -Path $releaseDir | Out-Null

Copy-Item "dist\haw_assistant\*" $releaseDir -Recurse -Force
Copy-Item ".env.example" (Join-Path $releaseDir ".env.example") -Force
Copy-Item "policy.toml" (Join-Path $releaseDir "policy.toml") -Force

$launcher = @'
@echo off
setlocal
cd /d "%~dp0"
start "" "%~dp0haw_assistant.exe"
'@
Set-Content -Path (Join-Path $releaseDir "haw_assistant.cmd") -Value $launcher -Encoding ASCII

Write-Host "[OK] Portable app created at $releaseDir"
