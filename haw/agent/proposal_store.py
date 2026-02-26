from __future__ import annotations

from dataclasses import asdict, dataclass
from datetime import datetime, timezone
import json
from pathlib import Path


@dataclass(frozen=True)
class RewriteProposal:
    prompt: str
    original_text: str
    rewritten_text: str
    created_at: str

    @classmethod
    def create(cls, prompt: str, original_text: str, rewritten_text: str) -> "RewriteProposal":
        created_at = datetime.now(timezone.utc).isoformat()
        return cls(
            prompt=prompt,
            original_text=original_text,
            rewritten_text=rewritten_text,
            created_at=created_at,
        )


class ProposalStore:
    """Single pending proposal store for approve/reject flow."""

    def __init__(self, path: Path | None = None):
        self.path = path or Path(".haw") / "pending_proposal.json"

    def load(self) -> RewriteProposal | None:
        if not self.path.exists():
            return None
        payload = json.loads(self.path.read_text(encoding="utf-8"))
        return RewriteProposal(
            prompt=str(payload["prompt"]),
            original_text=str(payload["original_text"]),
            rewritten_text=str(payload["rewritten_text"]),
            created_at=str(payload["created_at"]),
        )

    def save(self, proposal: RewriteProposal) -> None:
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
    proposal: RewriteProposal,
    force: bool = False,
) -> tuple[bool, str]:
    if force:
        return True, "force enabled"
    if current_selection == proposal.original_text:
        return True, "selection matches proposal"
    return False, "selection changed since proposal was created; use --force to apply anyway"
