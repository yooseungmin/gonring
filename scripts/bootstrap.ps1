Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

python -m venv .venv_local
.\.venv_local\Scripts\python.exe -m pip install -U pip
.\.venv_local\Scripts\pip.exe install -e .[dev]

if (-not (Test-Path ".env")) {
    Copy-Item .env.example .env -Force
}

Write-Host "[OK] bootstrap complete"
