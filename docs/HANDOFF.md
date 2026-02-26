# Handoff Checklist

## Local Setup

```powershell
python -m venv .venv
.\.venv\Scripts\python -m pip install -U pip
.\.venv\Scripts\pip install -e .[dev]
Copy-Item .env.example .env -Force
```

## Smoke Test

```powershell
.\.venv\Scripts\python -m pytest -q
.\.venv\Scripts\python -m haw.main doctor --strict
.\.venv\Scripts\python -m haw.main hwp status
```

## Known Constraints

- Rewrite logic is currently deterministic placeholder logic.
- HWP operations rely on clipboard round-trip and can conflict with external clipboard usage.
- COM behavior can vary by HWP version and workstation policy.

## Recommended Immediate Follow-ups

1. Replace placeholder rewrite implementation with model integration.
2. Add HWP integration tests on dedicated Windows runners.
3. Harden HWP selection read/replace path to avoid clipboard dependency.
