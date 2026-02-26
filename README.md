# HAW Assistant

Windows-first assistant for rewriting selected text in HWP with policy guardrails and diff preview.

## Quick Start

```powershell
.\scripts\bootstrap.ps1
```

## Validate

```powershell
.\scripts\smoke_test.ps1
.\.venv_local\Scripts\python -m haw.main doctor --strict
.\.venv_local\Scripts\python -m haw.main hwp status
```

## CLI

```powershell
.\.venv_local\Scripts\python -m haw.main --help
.\.venv_local\Scripts\python -m haw.main hwp read-selection
.\.venv_local\Scripts\python -m haw.main hwp rewrite-selection -p "문장을 전문적이고 간결하게 다듬어줘"
```

## Repository Layout

- `haw/`: application code
- `tests/`: unit tests
- `docs/`: handoff and architecture docs
- `policy.toml`: runtime guardrail policy
- `.env.example`: environment template

## Platform Notes

- HWP COM automation is Windows-only.
- macOS can run core logic/tests, but cannot run HWP integration end-to-end.
