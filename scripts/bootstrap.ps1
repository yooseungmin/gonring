Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -U pip
.\.venv\Scripts\pip.exe install -e .[dev]

if (-not (Test-Path ".env")) {
    Copy-Item .env.example .env -Force
}

Write-Host "[OK] bootstrap complete"
