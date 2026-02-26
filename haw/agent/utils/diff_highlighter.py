from __future__ import annotations

from difflib import SequenceMatcher
from typing import Literal

DiffTag = Literal["equal", "delete", "insert", "context"]
DiffToken = tuple[DiffTag, str]

MAX_INPUT_CHARS = 5000


def _truncate(text: str, limit: int = MAX_INPUT_CHARS) -> str:
    if len(text) <= limit:
        return text
    return text[: limit - 3] + "..."


def _collapse_equal(words: list[str], context_words: int = 3) -> list[DiffToken]:
    if len(words) <= (context_words * 2 + 6):
        return [("equal", " ".join(words))]

    head = " ".join(words[:context_words]).strip()
    tail = " ".join(words[-context_words:]).strip()
    tokens: list[DiffToken] = []
    if head:
        tokens.append(("equal", head))
    tokens.append(("context", "[...]"))
    if tail:
        tokens.append(("equal", tail))
    return tokens


def compute_word_diff(original: str, rewritten: str) -> list[DiffToken]:
    left = _truncate(original).split()
    right = _truncate(rewritten).split()

    matcher = SequenceMatcher(a=left, b=right)
    tokens: list[DiffToken] = []
    for opcode, i1, i2, j1, j2 in matcher.get_opcodes():
        if opcode == "equal":
            tokens.extend(_collapse_equal(left[i1:i2]))
        elif opcode == "delete":
            deleted = " ".join(left[i1:i2]).strip()
            if deleted:
                tokens.append(("delete", deleted))
        elif opcode == "insert":
            inserted = " ".join(right[j1:j2]).strip()
            if inserted:
                tokens.append(("insert", inserted))
        elif opcode == "replace":
            deleted = " ".join(left[i1:i2]).strip()
            inserted = " ".join(right[j1:j2]).strip()
            if deleted:
                tokens.append(("delete", deleted))
            if inserted:
                tokens.append(("insert", inserted))
    return tokens


def count_changed_words(tokens: list[DiffToken]) -> int:
    changed = 0
    for tag, text in tokens:
        if tag in {"insert", "delete"}:
            changed += len(text.split())
    return changed
