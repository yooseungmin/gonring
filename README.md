# HAW Assistant

Windows-first assistant for guarded rewrite workflows in HWP.

## Quick Start

```powershell
.\scripts\bootstrap.ps1
```

## Validate

```powershell
.\scripts\smoke_test.ps1
.\.venv\Scripts\python -m haw.main doctor --strict
.\.venv\Scripts\python -m haw.main hwp status
```

## Core Commands

```powershell
.\.venv\Scripts\python -m haw.main --help
.\.venv\Scripts\python -m haw.main agent start --dock
.\.venv\Scripts\python -m haw.main hwp read-selection
.\.venv\Scripts\python -m haw.main hwp propose-selection -p "Refine this paragraph"
.\.venv\Scripts\python -m haw.main hwp show-proposal
.\.venv\Scripts\python -m haw.main hwp accept-proposal
.\.venv\Scripts\python -m haw.main hwp reject-proposal
```

## Dock UX

- `Ctrl+Enter`: propose from selected HWP text
- `F5`: show current pending proposal
- `Ctrl+Y`: accept proposal
- `Ctrl+N`: reject proposal
- `Esc`: close dock window
- `Force apply` checkbox: allow apply even if selection changed

## Repository Layout

- `haw/`: application code
- `tests/`: unit tests
- `docs/`: handoff and architecture docs
- `scripts/`: local bootstrap and smoke test scripts
- `policy.toml`: runtime guardrail policy
- `.env.example`: environment template

## Platform Notes

- HWP COM automation is Windows-only.
- macOS can run core logic/tests, but cannot run HWP integration end-to-end.
