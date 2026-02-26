Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

.\.venv_local\Scripts\python.exe -m pytest -q
.\.venv_local\Scripts\python.exe -m haw.main --help
.\.venv_local\Scripts\python.exe -m haw.main doctor

Write-Host "[OK] smoke tests complete"
