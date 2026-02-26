from __future__ import annotations

from dataclasses import dataclass
import re

STYLE_KEYWORDS = (
    "font",
    "글꼴",
    "글자",
    "서체",
    "bold",
    "italic",
    "굵게",
    "기울임",
    "색상",
    "정렬",
    "줄간격",
    "행간",
    "머리말",
    "꼬리말",
    "이미지",
    "도형",
    "차트",
)


@dataclass(frozen=True)
class ActionDecision:
    allowed: bool
    reason: str
    message: str


def contains_style_request(prompt: str) -> bool:
    text = prompt.lower()
    return any(keyword in text for keyword in STYLE_KEYWORDS)


def looks_like_table_text(selected_text: str) -> bool:
    if "\t" in selected_text:
        return True
    lines = [line for line in selected_text.splitlines() if line.strip()]
    if not lines:
        return False
    column_like_lines = sum(1 for line in lines if re.search(r"\s{2,}", line))
    return column_like_lines >= 2


def decide_action(prompt: str, selected_text: str) -> ActionDecision:
    if contains_style_request(prompt):
        return ActionDecision(
            allowed=False,
            reason="style_request_blocked",
            message="Style request blocked by policy.",
        )
    if looks_like_table_text(selected_text):
        return ActionDecision(
            allowed=False,
            reason="table_safe_mode",
            message="Table-like selection detected. Auto-apply blocked.",
        )
    return ActionDecision(allowed=True, reason="ok", message="Auto-apply allowed.")
