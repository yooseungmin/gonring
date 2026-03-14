# Release

## Product Goal

HAW is a Windows inline AI assistant for HWP, not a validation-only utility.
The portable release target is a GUI executable that launches directly into the dock workflow.

## Build Target

- Output: `release/windows-portable/`
- Main executable: `haw_assistant.exe`
- Launcher: `haw_assistant.cmd`

## Windows Build Steps

```powershell
.\scripts\bootstrap.ps1
.\scripts\build_exe.ps1
```

## Bundle Contents

- `haw_assistant.exe`
- Python runtime packaged by PyInstaller
- `policy.toml`
- `.env.example`
- `haw_assistant.cmd`

## First-Run Setup

1. Copy `.env.example` to `.env`.
2. Set `HAW_ANTHROPIC_API_KEY`.
3. Optionally adjust `HAW_ANTHROPIC_MODEL`.
4. Start `haw_assistant.exe` or `haw_assistant.cmd`.

## Release Gate

1. `pytest -q` passes.
2. `python -m haw.main doctor --strict` passes on Windows.
3. HWP `propose-selection -> show-proposal -> accept-proposal` smoke passes.
4. Packaged `haw_assistant.exe` launches dock mode without console errors.
