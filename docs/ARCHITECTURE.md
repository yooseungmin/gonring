# Architecture

## Runtime Flow

1. `haw.main` receives CLI command.
2. `haw.config` loads `.env`.
3. `haw.policy` loads `policy.toml`.
4. `haw.agent.actions.write_action` decides allow/block and builds rewritten text.
5. `haw.ui.dock_panel` renders diff preview for interactive mode.
6. `haw.agent.proposal_store` persists pending proposal state at `.haw/pending_proposal.json`.
7. `haw.services.hwp_client` executes HWP COM actions for read/replace/rewrite.

## Module Responsibilities

- `haw/actions.py`: guardrail decision rules.
- `haw/agent/actions.py`: write action orchestration and response payload.
- `haw/agent/proposal_store.py`: pending proposal persistence and acceptance validation.
- `haw/services/hwp_client.py`: HWP COM integration.
- `haw/services/writer.py`: file output adapter.
- `haw/core/doctor.py`: runtime diagnostics checks.

## Platform Boundary

- Windows: full feature set including HWP COM.
- macOS/Linux: core logic and tests only; no HWP COM execution.
