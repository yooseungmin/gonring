# HAW Assistant

Windows-first assistant for rewriting selected text in HWP with policy guardrails and diff preview.

## Quick Start

```powershell
.\scripts\bootstrap.ps1
```

## Validate

```powershell
.\scripts\smoke_test.ps1
.\\.venv\Scripts\python -m haw.main doctor --strict
.\\.venv\Scripts\python -m haw.main hwp status
```

## CLI

```powershell
.\\.venv\Scripts\python -m haw.main --help
.\\.venv\Scripts\python -m haw.main hwp read-selection
.\\.venv\Scripts\python -m haw.main hwp rewrite-selection -p "臾몄옣???꾨Ц?곸씠怨?媛꾧껐?섍쾶 ?ㅻ벉?댁쨾"
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
