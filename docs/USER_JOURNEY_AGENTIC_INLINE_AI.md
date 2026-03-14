# User Journey: Agentic Inline AI

## Goal

This document defines the target end-to-end user journey for HAW as an agentic inline AI service inside HWP or Word-like document editors.
It is more specific than the PRD and should guide implementation order, UI behavior, and runtime orchestration.

## Product Principle

The user should feel that:

- the assistant understands the currently active document
- the assistant can understand either a caret position or a selected block
- the assistant actively scans nearby context before editing
- the assistant shows progress while reasoning
- the assistant edits directly into the document as a review-style revision
- the user remains in control at the final approval step

## Terminology

- `active editor`: the currently focused HWP or Word window
- `caret anchor`: the current cursor location when no text is selected
- `selection block`: the explicitly selected text range
- `context scan window`: the surrounding pages scanned around the caret or selection
- `user-facing thinking`: short progress/status explanations shown to the user, not hidden chain-of-thought
- `review edit`: an edit applied through the document review/track-changes mechanism

## Target Journey

### 1. Detect Open Editor

Expected behavior:

- If HWP or Word is already open, HAW detects the active editor window.
- If multiple supported editors are open, HAW identifies the focused one.
- If no supported editor is available, HAW tells the user immediately.

User-visible state:

- `Editor detected`
- `No supported editor found`

### 2. Detect Caret or Selection

Expected behavior:

- If the user has selected text, HAW uses that selection block as the primary editing target.
- If the user has no selection, HAW uses the caret anchor and resolves the nearest editable block around it.
- The resolved target must be previewable in the HAW UI.

User-visible state:

- `Selection detected`
- `Caret detected, resolving nearby block`
- `Unable to resolve editable target`

### 3. User Enters Prompt in HAW UI

Expected behavior:

- The user enters a free-form instruction in HAW UI.
- The prompt can be combined with presets or follow-up edits.
- The system stores both the raw prompt and the resolved prompt used for generation.

User-visible state:

- `Prompt received`
- `Prompt + preset combined`

### 4. HAW Shows First Thinking Stage

Expected behavior:

- HAW begins by telling the user what it is about to do.
- This is a short status explanation, not model chain-of-thought.

Examples:

- `선택 영역을 확인하고 있습니다`
- `커서 주변 문맥을 스캔하는 중입니다`
- `편집 범위를 결정하고 있습니다`

### 5. HAW Scans Context by Moving Through the Document

Expected behavior:

- HAW moves through the live document around the caret/selection.
- The user should visibly see the document scroll or move while scanning.
- The scan window should default to a bounded range such as 10 pages around the target.
- After scanning, HAW returns to the original anchor before applying any edits.

Important product note:

- This movement is intentional and should feel fast but observable.
- The UI should explain that the system is reading nearby context.

User-visible state:

- `문맥을 파악하기 위해 주변 페이지를 스캔하고 있습니다`
- `스캔 완료, 원래 위치로 복귀했습니다`

### 6. HAW Shows Second Thinking Stage

Expected behavior:

- HAW summarizes what it understood from the surrounding context.
- This summary is concise and user-facing.

Examples:

- `이 문단은 보고서 요약 섹션에 위치해 있습니다`
- `앞뒤 문맥상 공식 문체와 일정 정보 유지가 중요합니다`

### 7. HAW Shows Third Thinking Stage

Expected behavior:

- HAW states how it plans to modify the target based on the prompt and context.
- The message should explain the editing intent without exposing hidden reasoning.

Examples:

- `공식 문체를 유지하면서 표현만 더 명확하게 다듬습니다`
- `일정, 수치, 고유명사는 유지하고 문장만 간결하게 줄입니다`

### 8. HAW Starts Review-Mode Editing in the Document

Expected behavior:

- HAW switches into review/track-changes mode before modifying the document.
- The actual edits happen directly in the document, not only in HAW preview.
- Editing should be faster than the user but still visually observable step by step.

Key requirement:

- The user must be able to see the document changing in review mode.
- The system should not feel like a hidden background replacement.

User-visible state:

- `검토 모드로 편집을 시작합니다`
- `편집 중`
- `검토 편집 완료`

### 9. HAW Offers Final Choice

Expected behavior:

- After the review edit is complete, HAW must ask what to do next.
- The final actions should be explicit and easy to understand.

Required actions:

- `반영`
- `재수정`
- `취소`

Definitions:

- `반영`: keep the review edit as final
- `재수정`: keep the current target and re-run from a new prompt
- `취소`: revert or discard the current review edit

### 10. Finish

Expected behavior:

- If the user accepts, the review edit becomes final.
- If the user retries, the system reuses the same anchor/selection context where possible.
- If the user cancels, the document returns to the pre-edit state or the review edit is explicitly discarded.

## Required System States

The implementation should support the following state machine:

1. `idle`
2. `editor_detected`
3. `target_resolved`
4. `prompt_received`
5. `scanning_context`
6. `context_understood`
7. `edit_plan_ready`
8. `review_editing`
9. `awaiting_user_decision`
10. `accepted`
11. `retry_requested`
12. `cancelled`
13. `error`

## Engineering Implications

### Editor Integration

- The system needs active-window detection, not only manual CLI invocation.
- Target resolution must distinguish between selection and caret-only scenarios.

### HWP/Word Automation

- The scan path needs explicit cursor/page navigation APIs.
- The system must return to the original location before editing.
- Review-mode editing must be a first-class path, not a side effect.

### UI

- The HAW UI must show staged progress messages.
- The UI must support a final decision model: accept, retry, cancel.
- The UI should make the scan visibly intentional rather than suspicious.

### LLM Orchestration

- Prompting must include:
  - user prompt
  - resolved target text
  - nearby scanned context
  - editing constraints
- User-facing thinking should be a structured summary generated safely for display.

### Safety

- User-facing thinking must never expose hidden chain-of-thought.
- Sensitive content handling still follows `policy.toml`.
- Large or table-like blocks may need safe-mode fallback instead of full auto-edit.

## Acceptance Criteria

The journey is implemented only when all of the following are true:

1. HAW can detect whether the user has a selection or only a caret anchor.
2. HAW can scan nearby pages and visibly return to the original location.
3. HAW shows staged progress messages during scan, context understanding, and edit planning.
4. HAW performs the edit as a review-style change inside the document.
5. The user can choose `반영`, `재수정`, or `취소` after editing completes.
6. Retry preserves the target context unless the document has materially changed.
7. Cancel reliably discards the edit.

## Recommended Build Order

### Slice 1

- Detect selection vs caret anchor
- Show staged user-facing thinking in UI
- Preserve and restore anchor after scan

### Slice 2

- Review edit playback inside HWP
- Final decision UI: accept / retry / cancel

### Slice 3

- Retry loop bound to the same target
- Undo/discard path for cancel

### Slice 4

- Multi-editor support
- Word support parity if included in scope
