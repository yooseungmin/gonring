Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

.\.venv\Scripts\python.exe -m pytest -q
.\.venv\Scripts\python.exe -m haw.main --help
.\.venv\Scripts\python.exe -m haw.main doctor

Write-Host "[OK] smoke tests complete"
