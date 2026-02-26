from __future__ import annotations

from dataclasses import asdict, dataclass
import re
from typing import TypedDict

from haw.actions import decide_action
from haw.policy import GuardrailPolicy, Policy

DEFAULT_MAX_PREVIEW_CHARS = 5000


class WriteActionResultDict(TypedDict):
    ok: bool
    reason: str
    message: str
    original_text: str
    rewritten_text: str
    stats: dict[str, int]


@dataclass(frozen=True)
class WriteActionResult:
    ok: bool
    reason: str
    message: str
    original_text: str
    rewritten_text: str
    stats: dict[str, int]

    def to_dict(self) -> WriteActionResultDict:
        return asdict(self)  # type: ignore[return-value]


def _truncate_preview(text: str, limit: int) -> str:
    if len(text) <= limit:
        return text
    return text[: limit - 3] + "..."


def _count_words(text: str) -> int:
    return len(re.findall(r"\S+", text))


def _rewrite_text(prompt: str, selected_text: str) -> str:
    # Placeholder rewrite strategy for local deterministic behavior.
    # Replace this with model integration in production.
    _ = prompt
    return "\n".join(line.rstrip() for line in selected_text.splitlines())


def write_action(prompt: str, selected_text: str, policy: Policy | None = None) -> WriteActionResultDict:
    guardrail = policy.guardrail if policy else GuardrailPolicy()
    preview_limit = guardrail.max_preview_chars or DEFAULT_MAX_PREVIEW_CHARS

    decision = decide_action(prompt=prompt, selected_text=selected_text)
    if decision.reason == "style_request_blocked" and not guardrail.block_style_requests:
        decision = type(decision)(allowed=True, reason="ok", message="Auto-apply allowed.")
    if decision.reason == "table_safe_mode" and not guardrail.review_mode_on_table:
        decision = type(decision)(allowed=True, reason="ok", message="Auto-apply allowed.")

    original_preview = _truncate_preview(selected_text, preview_limit)
    if not decision.allowed:
        return WriteActionResult(
            ok=False,
            reason=decision.reason,
            message=decision.message,
            original_text=original_preview,
            rewritten_text=original_preview,
            stats={
                "original_chars": len(selected_text),
                "rewritten_chars": len(selected_text),
                "word_delta": 0,
            },
        ).to_dict()

    rewritten_text = _rewrite_text(prompt=prompt, selected_text=selected_text)
    rewritten_preview = _truncate_preview(rewritten_text, preview_limit)
    return WriteActionResult(
        ok=True,
        reason="ok",
        message="Write action completed.",
        original_text=original_preview,
        rewritten_text=rewritten_preview,
        stats={
            "original_chars": len(selected_text),
            "rewritten_chars": len(rewritten_text),
            "word_delta": _count_words(rewritten_text) - _count_words(selected_text),
        },
    ).to_dict()
