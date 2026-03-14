# Inline AI Gap Analysis

## Purpose

This document captures the feature gap between the current HAW product and a production-grade inline AI writing service.
It is intended as a working handoff artifact for the next implementation phase.

Related target journey:

- [docs/USER_JOURNEY_AGENTIC_INLINE_AI.md](/Users/seungmin/Desktop/승민_side%20job/win32COM/gonring/docs/USER_JOURNEY_AGENTIC_INLINE_AI.md)

## Comparison Baseline

Reference product patterns were compared against current HAW behavior using official documentation for mainstream document AI editing flows.

- Microsoft Word Copilot: [Edit with Copilot in Word](https://support.microsoft.com/en-us/office/edit-with-copilot-in-word-647d5d14-eaec-4e8a-a574-7cefffa7f8f0)
- Microsoft Word Copilot: [Draft and add content with Copilot in Word](https://support.microsoft.com/en-us/office/draft-and-add-content-with-copilot-in-word-069c91f0-9e42-4c9a-bbce-fddf5d581541)

## Current Strengths

- Live provider-backed single rewrite flow works.
- Live multi-variant proposal flow works.
- Provider vs fallback state is surfaced in the result payload and preview UI.
- Windows GUI packaging path exists.
- Guardrail policy and HWP review/apply flow are already wired.

Key implementation points:

- [haw/agent/actions.py](/Users/seungmin/Desktop/승민_side%20job/win32COM/gonring/haw/agent/actions.py)
- [haw/ui/dock_panel.py](/Users/seungmin/Desktop/승민_side%20job/win32COM/gonring/haw/ui/dock_panel.py)
- [haw/main.py](/Users/seungmin/Desktop/승민_side%20job/win32COM/gonring/haw/main.py)
- [haw/services/llm_client.py](/Users/seungmin/Desktop/승민_side%20job/win32COM/gonring/haw/services/llm_client.py)

## Major Gaps

### 1. Inline Editing Is Not Real Yet

Current behavior:

- Users review proposals in a dock panel.
- Apply flow is effectively "replace current selection".
- There is no editable proposal card before apply.

Relevant code:

- [haw/main.py](/Users/seungmin/Desktop/승민_side%20job/win32COM/gonring/haw/main.py)
- [haw/ui/dock_panel.py](/Users/seungmin/Desktop/승민_side%20job/win32COM/gonring/haw/ui/dock_panel.py)
- [haw/services/hwp_client.py](/Users/seungmin/Desktop/승민_side%20job/win32COM/gonring/haw/services/hwp_client.py)

Missing product behavior:

- Edit the generated suggestion before apply.
- Choose `Replace` vs `Insert below`.
- Keep the document interaction feeling inline rather than panel-only.

Impact:

- This is the largest gap between a rewrite tool and an inline AI service.

### 2. No Regenerate or Proposal History

Current behavior:

- Only one pending proposal file is stored.
- There is no regenerate command for the same prompt/selection.
- There is no history list, recall, or undo-oriented proposal navigation.

Relevant code:

- [haw/agent/proposal_store.py](/Users/seungmin/Desktop/승민_side%20job/win32COM/gonring/haw/agent/proposal_store.py)

Missing product behavior:

- Regenerate the same prompt with new candidates.
- Keep recent proposal sessions.
- Reopen or compare previous proposal sets.

Impact:

- Current UX feels transactional rather than iterative.

### 3. Context Grounding Is Still Narrow

Current behavior:

- The system uses the selected text plus optional nearby page scan.
- There is no broader document reasoning layer, no reference-file grounding, and no task memory.

Relevant code:

- [haw/services/hwp_client.py](/Users/seungmin/Desktop/승민_side%20job/win32COM/gonring/haw/services/hwp_client.py)
- [haw/agent/actions.py](/Users/seungmin/Desktop/승민_side%20job/win32COM/gonring/haw/agent/actions.py)

Missing product behavior:

- Use wider document structure.
- Use surrounding section intent, not only nearby text.
- Add optional external context sources.

Impact:

- Rewrite quality will degrade on policy, planning, and long-form documents.

### 4. Feature Breadth Is Too Narrow

Current behavior:

- Presets cover formal, friendly, shorter, longer, grammar, and summary.

Relevant code:

- [haw/agent/presets.py](/Users/seungmin/Desktop/승민_side%20job/win32COM/gonring/haw/agent/presets.py)

Missing product behavior:

- Translation
- Continue writing
- More rewrite intents tuned for real office workflows

Target product intent already documented in:

- [docs/PRD_INLINE_AI.md](/Users/seungmin/Desktop/승민_side%20job/win32COM/gonring/docs/PRD_INLINE_AI.md)

Impact:

- Current system is good for rewrite demos but not yet broad enough for inline AI adoption.

### 5. Formatting and Table Handling Are Defensive, Not Product-Grade

Current behavior:

- Style requests are blocked.
- Table-like selections are blocked by safety rules.
- HWP apply still depends on clipboard round-trip.

Relevant code:

- [haw/actions.py](/Users/seungmin/Desktop/승민_side%20job/win32COM/gonring/haw/actions.py)
- [haw/services/hwp_client.py](/Users/seungmin/Desktop/승민_side%20job/win32COM/gonring/haw/services/hwp_client.py)

Missing product behavior:

- Preserve formatting more precisely.
- Safer table-aware transforms instead of broad blocking.
- Reduce clipboard dependence during read/apply.

Impact:

- Reliability is acceptable for early rollout, but not strong enough for heavy document operations.

### 6. Proposal UX Still Lacks Product Controls

Current behavior:

- Multi-proposal preview exists.
- Users can choose a proposal index to apply.
- There is no card-level action model beyond accept/reject.

Missing product behavior:

- Per-card regenerate
- Per-card edit
- Insert vs replace
- History-aware apply
- Stronger status/recovery guidance in UI

Relevant code:

- [haw/ui/dock_panel.py](/Users/seungmin/Desktop/승민_side%20job/win32COM/gonring/haw/ui/dock_panel.py)

## Priority Order

### P0

- Editable proposal cards
- `Replace` and `Insert below`
- Proposal regenerate

### P1

- Proposal history
- Translation preset
- Continue-writing preset
- Better failure messaging and recovery in dock UI

### P2

- Wider document grounding
- Table-aware apply path
- Reduced clipboard dependence
- Usage metrics and acceptance analytics

## Recommended Build Sequence

### Phase 1: Turn Proposal Flow Into Real Inline Editing

Deliver:

- Editable proposal text area per card
- `Replace` action
- `Insert below` action
- `Regenerate` action

Likely files:

- [haw/ui/dock_panel.py](/Users/seungmin/Desktop/승민_side%20job/win32COM/gonring/haw/ui/dock_panel.py)
- [haw/main.py](/Users/seungmin/Desktop/승민_side%20job/win32COM/gonring/haw/main.py)
- [haw/services/hwp_client.py](/Users/seungmin/Desktop/승민_side%20job/win32COM/gonring/haw/services/hwp_client.py)
- [haw/agent/proposal_store.py](/Users/seungmin/Desktop/승민_side%20job/win32COM/gonring/haw/agent/proposal_store.py)

### Phase 2: Make the Experience Iterative

Deliver:

- Proposal session history
- Reopen previous proposal group
- Better session metadata

Likely files:

- [haw/agent/proposal_store.py](/Users/seungmin/Desktop/승민_side%20job/win32COM/gonring/haw/agent/proposal_store.py)
- [haw/ui/dock_panel.py](/Users/seungmin/Desktop/승민_side%20job/win32COM/gonring/haw/ui/dock_panel.py)

### Phase 3: Expand Core Inline AI Skills

Deliver:

- Translation preset
- Continue-writing preset
- More office-task presets

Likely files:

- [haw/agent/presets.py](/Users/seungmin/Desktop/승민_side%20job/win32COM/gonring/haw/agent/presets.py)
- [haw/agent/actions.py](/Users/seungmin/Desktop/승민_side%20job/win32COM/gonring/haw/agent/actions.py)

### Phase 4: Reliability Upgrade

Deliver:

- Better table-safe behavior
- Lower clipboard dependence
- Windows packaged smoke automation

Likely files:

- [haw/services/hwp_client.py](/Users/seungmin/Desktop/승민_side%20job/win32COM/gonring/haw/services/hwp_client.py)
- [tests/test_hwp_client.py](/Users/seungmin/Desktop/승민_side%20job/win32COM/gonring/tests/test_hwp_client.py)

## Immediate Next Tickets

1. Add editable text areas and `Apply Replace` / `Apply Insert Below` buttons to the dock UI.
2. Extend `ProposalStore` from single pending item to recent session history.
3. Add a `Regenerate` action that reuses the current prompt and selection context.
4. Add translation and continue-writing presets.
5. Add Windows HWP smoke coverage for `propose -> show -> accept`.

## Definition of "Inline AI Service" for This Repo

This project should be considered inline AI-complete only when:

- users can generate multiple suggestions inside the working flow
- users can edit suggestions before apply
- users can choose how content is inserted
- users can iterate through regenerate/history without losing context
- the dock experience feels like an in-document assistant rather than a one-shot rewrite tool
