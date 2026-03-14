# Handoff

## What This Repo Is

HAW is a Windows-first inline AI assistant for HWP.
Current scope includes:

- live Anthropic-backed single rewrite flow
- live multi-variant proposal flow
- dock UI for propose/show/accept/reject
- Windows portable build path via PyInstaller

## Core Entry Points

- CLI: `python -m haw.main`
- GUI/packaged app: `python -m haw.main_assistant`
- Windows build: `.\scripts\build_exe.ps1`

## Local Setup

```powershell
python -m venv .venv
.\.venv\Scripts\python -m pip install -U pip
.\.venv\Scripts\pip install -e .[dev]
Copy-Item .env.example .env -Force
```

Required environment:

- `HAW_ANTHROPIC_API_KEY`
- `HAW_ANTHROPIC_MODEL` (default example uses `claude-sonnet-4-6`)

## Validation

```powershell
.\.venv\Scripts\python -m pytest -q
.\.venv\Scripts\python -m haw.main doctor --strict
.\.venv\Scripts\python -m haw.main agent preview -p "문장을 더 자연스럽고 공식적으로 다듬어줘" -s "본 서비스는 사용자의 문서 작성을 돕습니다."
.\.venv\Scripts\python -m haw.main agent preview-variants -p "문장을 더 자연스럽고 공식적으로 다듬어줘" -s "본 서비스는 사용자의 문서 작성을 돕습니다." -n 3
```

Windows/HWP smoke:

```powershell
.\.venv\Scripts\python -m haw.main hwp status
.\.venv\Scripts\python -m haw.main hwp propose-selection --preset tone_formal
.\.venv\Scripts\python -m haw.main hwp show-proposal
.\.venv\Scripts\python -m haw.main hwp accept-proposal --index 1
```

## Release Path

```powershell
.\scripts\bootstrap.ps1
.\scripts\build_exe.ps1
```

The build output is `release\windows-portable\haw_assistant.exe`.

## Remaining Product Gaps

1. HWP integration still depends on clipboard round-trips for read/apply.
2. Proposal history and inline editing are not implemented yet.
3. Packaged build still needs Windows-side smoke and signing policy.
