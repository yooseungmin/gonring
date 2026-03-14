from __future__ import annotations

from dataclasses import asdict, dataclass, field, replace
from datetime import datetime, timezone
import json
from pathlib import Path


@dataclass(frozen=True)
class RewriteCandidate:
    rewritten_text: str
    thinking_summary: str
    tags: list[str]


@dataclass(frozen=True)
class ProposalStage:
    state: str
    message: str


@dataclass(frozen=True)
class RewriteProposalGroup:
    prompt: str
    resolved_prompt: str
    original_text: str
    candidates: list[RewriteCandidate]
    scan_mode: str
    target_mode: str
    scan_pages_each_side: int
    scanned_pages: int
    scanned_chars: int
    created_at: str
    selected_index: int = 0
    preset_label: str = ""
    current_state: str = "awaiting_user_decision"
    stage_events: list[ProposalStage] = field(default_factory=list)
    applied_index: int = 0
    applied_mode: str = ""

    @classmethod
    def create(
        cls,
        *,
        prompt: str,
        resolved_prompt: str = "",
        original_text: str,
        candidates: list[RewriteCandidate],
        scan_mode: str = "selection_only",
        target_mode: str = "selection_block",
        scan_pages_each_side: int = 0,
        scanned_pages: int = 0,
        scanned_chars: int = 0,
        selected_index: int = 0,
        preset_label: str = "",
        current_state: str = "awaiting_user_decision",
        stage_events: list[ProposalStage] | None = None,
        applied_index: int = 0,
        applied_mode: str = "",
    ) -> "RewriteProposalGroup":
        created_at = datetime.now(timezone.utc).isoformat()
        return cls(
            prompt=prompt,
            resolved_prompt=resolved_prompt or prompt,
            original_text=original_text,
            candidates=candidates,
            scan_mode=scan_mode,
            target_mode=target_mode,
            scan_pages_each_side=scan_pages_each_side,
            scanned_pages=scanned_pages,
            scanned_chars=scanned_chars,
            created_at=created_at,
            selected_index=selected_index,
            preset_label=preset_label,
            current_state=current_state.strip() or "awaiting_user_decision",
            stage_events=list(stage_events or []),
            applied_index=max(0, int(applied_index)),
            applied_mode=applied_mode.strip(),
        )


class ProposalStore:
    """Single pending proposal store for approve/reject flow."""

    def __init__(self, path: Path | None = None):
        self.path = path or Path(".haw") / "pending_proposal.json"

    def load(self) -> RewriteProposalGroup | None:
        if not self.path.exists():
            return None
        payload = json.loads(self.path.read_text(encoding="utf-8"))
        if "candidates" in payload:
            candidates_payload = payload.get("candidates", [])
            candidates = [
                RewriteCandidate(
                    rewritten_text=str(item.get("rewritten_text", "")),
                    thinking_summary=str(item.get("thinking_summary", "")),
                    tags=[str(tag) for tag in item.get("tags", []) if str(tag).strip()],
                )
                for item in candidates_payload
                if isinstance(item, dict)
            ]
            stage_events = [
                ProposalStage(
                    state=str(item.get("state", "idle")),
                    message=str(item.get("message", "")),
                )
                for item in payload.get("stage_events", [])
                if isinstance(item, dict)
            ]
            return RewriteProposalGroup(
                prompt=str(payload["prompt"]),
                resolved_prompt=str(payload.get("resolved_prompt", payload["prompt"])),
                original_text=str(payload["original_text"]),
                candidates=candidates,
                scan_mode=str(payload.get("scan_mode", "selection_only")),
                target_mode=str(payload.get("target_mode", "selection_block")),
                scan_pages_each_side=int(payload.get("scan_pages_each_side", 0)),
                scanned_pages=int(payload.get("scanned_pages", 0)),
                scanned_chars=int(payload.get("scanned_chars", 0)),
                created_at=str(payload["created_at"]),
                selected_index=int(payload.get("selected_index", 0)),
                preset_label=str(payload.get("preset_label", "")),
                current_state=str(payload.get("current_state", "awaiting_user_decision")),
                stage_events=stage_events,
                applied_index=int(payload.get("applied_index", 0)),
                applied_mode=str(payload.get("applied_mode", "")),
            )

        candidate = RewriteCandidate(
            rewritten_text=str(payload.get("rewritten_text", "")),
            thinking_summary=str(payload.get("thinking_summary", "")),
            tags=[str(tag) for tag in payload.get("tags", []) if str(tag).strip()],
        )
        stage_events = [
            ProposalStage(
                state=str(item.get("state", "idle")),
                message=str(item.get("message", "")),
            )
            for item in payload.get("stage_events", [])
            if isinstance(item, dict)
        ]
        return RewriteProposalGroup(
            prompt=str(payload["prompt"]),
            resolved_prompt=str(payload.get("resolved_prompt", payload["prompt"])),
            original_text=str(payload["original_text"]),
            candidates=[candidate],
            scan_mode=str(payload.get("scan_mode", "selection_only")),
            target_mode=str(payload.get("target_mode", "selection_block")),
            scan_pages_each_side=int(payload.get("scan_pages_each_side", 0)),
            scanned_pages=int(payload.get("scanned_pages", 0)),
            scanned_chars=int(payload.get("scanned_chars", 0)),
            created_at=str(payload["created_at"]),
            selected_index=0,
            preset_label=str(payload.get("preset_label", "")),
            current_state=str(payload.get("current_state", "awaiting_user_decision")),
            stage_events=stage_events,
            applied_index=int(payload.get("applied_index", 0)),
            applied_mode=str(payload.get("applied_mode", "")),
        )

    def save(self, proposal: RewriteProposalGroup) -> None:
        self.path.parent.mkdir(parents=True, exist_ok=True)
        self.path.write_text(
            json.dumps(asdict(proposal), ensure_ascii=False, indent=2),
            encoding="utf-8",
        )

    def clear(self) -> bool:
        if not self.path.exists():
            return False
        self.path.unlink()
        return True


def can_accept_proposal(
    *,
    current_selection: str,
    proposal: RewriteProposalGroup,
    force: bool = False,
) -> tuple[bool, str]:
    if force:
        return True, "force enabled"
    if current_selection == proposal.original_text:
        return True, "selection matches proposal"
    return False, "selection changed since proposal was created; use --force to apply anyway"


def select_candidate(
    *,
    proposal: RewriteProposalGroup,
    index: int,
) -> tuple[bool, RewriteCandidate | None, str]:
    if not proposal.candidates:
        return False, None, "no candidates available"
    if index < 1 or index > len(proposal.candidates):
        return False, None, f"index out of range (1-{len(proposal.candidates)})"
    return True, proposal.candidates[index - 1], "ok"


def build_apply_text(
    *,
    original_text: str,
    candidate_text: str,
    apply_mode: str = "replace",
) -> tuple[bool, str, str]:
    mode = apply_mode.strip().lower() or "replace"
    rewritten = candidate_text.strip()
    if not rewritten:
        return False, "", "candidate text is empty"
    if mode == "replace":
        return True, rewritten, "ok"
    if mode == "insert_below":
        original = original_text.rstrip()
        separator = "\n" if original else ""
        return True, f"{original}{separator}{rewritten}", "ok"
    return False, "", "unsupported apply mode"


def build_proposal_stage(state: str, message: str) -> ProposalStage:
    normalized_state = state.strip() or "idle"
    normalized_message = message.strip()
    return ProposalStage(state=normalized_state, message=normalized_message)


def transition_proposal(
    proposal: RewriteProposalGroup,
    *,
    current_state: str,
    message: str,
    selected_index: int | None = None,
    applied_index: int | None = None,
    applied_mode: str | None = None,
) -> RewriteProposalGroup:
    next_events = [
        *proposal.stage_events,
        build_proposal_stage(current_state, message),
    ]
    next_selected_index = proposal.selected_index if selected_index is None else max(0, int(selected_index))
    next_applied_index = proposal.applied_index if applied_index is None else max(0, int(applied_index))
    next_applied_mode = proposal.applied_mode if applied_mode is None else applied_mode.strip()
    return replace(
        proposal,
        current_state=current_state.strip() or proposal.current_state,
        stage_events=next_events,
        selected_index=next_selected_index,
        applied_index=next_applied_index,
        applied_mode=next_applied_mode,
    )
