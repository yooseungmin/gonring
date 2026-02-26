# Recovery Cards

## Backlog

### CARD-004 Release Readiness
- Goal: Team handoff quality for build/test/run pipeline.
- Scope: scripts, docs, smoke flow, packaging checks.
- DoD: New engineer can run setup and smoke test without questions.

## In Progress

### CARD-003 HWP COM Reliability Hardening
- Goal: Reduce clipboard dependency and improve COM fallback behavior.
- Scope: `haw/services/hwp_client.py`, error handling, retry strategy.
- DoD: Stable behavior across repeated runs and common HWP states.
- Progress:
  - Fixed `win32com.client` import path and dispatch fallback regression.
  - Added clipboard backup/restore for read and paste operations.
  - Added regression tests for backup/restore behavior.

## Done

### CARD-000 Proposal Workflow Baseline
- Result: Added `propose/show/accept/reject` flow with pending proposal store.
- References: `a129bd0`

### CARD-001 UI Recovery Evidence Scan
- Result: Recovered UI architecture clues from logs and mapped reconstruction gap.
- References: `docs/UI_RECOVERY_EVIDENCE.md`

### CARD-002 HWP Dock Panel UI Rebuild
- Result: Rebuilt dock panel with proposal actions, keyboard workflow, and status UX.
- Verification:
  - `hwp status` passed (`HWP COM is available`)
  - dock process smoke start passed (`dock_started=true`)
- References: `8f84b84`
