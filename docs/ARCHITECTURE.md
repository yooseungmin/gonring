# Architecture

## Runtime Flow

1. `haw.main` receives CLI command.
2. `haw.config` loads `.env`.
3. `haw.policy` loads `policy.toml`.
4. `haw.agent.actions` routes requests through guardrails and the Anthropic provider layer.
5. `haw.ui.dock_panel` renders single-result or multi-proposal previews.
6. `haw.agent.proposal_store` persists pending proposal state at `.haw/pending_proposal.json`.
7. `haw.services.hwp_client` executes HWP COM actions for read/replace/rewrite.
8. `haw.main_assistant` is the GUI entry point used by the packaged Windows app.

## Module Responsibilities

- `haw/actions.py`: guardrail decision rules.
- `haw/agent/actions.py`: write action orchestration and response payload.
- `haw/agent/proposal_store.py`: pending proposal persistence and acceptance validation.
- `haw/services/llm_client.py`: Anthropic provider integration and response parsing.
- `haw/services/hwp_client.py`: HWP COM integration.
- `haw/services/writer.py`: file output adapter.
- `haw/core/doctor.py`: runtime diagnostics checks.
- `haw/main_assistant.py`: packaged dock launcher entry point.

## Platform Boundary

- Windows: full feature set including HWP COM.
- macOS/Linux: core logic and tests only; no HWP COM execution.

## Packaging

- `haw_assistant.spec`: PyInstaller spec for the portable Windows GUI build.
- `scripts/build_exe.ps1`: produces `release/windows-portable/`.
