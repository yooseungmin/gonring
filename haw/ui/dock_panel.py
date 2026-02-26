from __future__ import annotations

from dataclasses import dataclass, field

from haw.agent.utils.diff_highlighter import compute_word_diff, count_changed_words


@dataclass(frozen=True)
class DockOptions:
    debug: bool = False


@dataclass
class DockPanelRenderer:
    # Mirrors text-tag semantics used in Tk-based rendering.
    tags: dict[str, dict[str, str | bool]] = field(
        default_factory=lambda: {
            "diff_del": {"fg": "#b91c1c", "overstrike": True},
            "diff_ins": {"fg": "#166534", "underline": True},
            "diff_eq": {"fg": "#6b7280"},
            "diff_ctx": {"fg": "#9ca3af"},
        }
    )
    lines: list[str] = field(default_factory=list)

    def append(self, text: str) -> None:
        if text:
            self.lines.append(text)

    def _append_diff_block(self, original: str, rewritten: str) -> None:
        self.append("=== Change Preview ===")
        tokens = compute_word_diff(original=original, rewritten=rewritten)
        rendered_parts: list[str] = []
        for tag, text in tokens:
            if not text:
                continue
            if tag == "delete":
                rendered_parts.append(f"[-{text}-]")
            elif tag == "insert":
                rendered_parts.append(f"[+{text}+]")
            else:
                rendered_parts.append(text)
        self.append(" ".join(rendered_parts).strip())
        self.append(f"[OK] {count_changed_words(tokens)} words changed")

    def append_diff_preview(self, original: str, rewritten: str) -> None:
        self._append_diff_block(original=original, rewritten=rewritten)

    def update_from_action_result(self, result: dict) -> None:
        rewritten = str(result.get("rewritten_text", "")).strip()
        message = str(result.get("message", "")).strip()
        self.append(message)
        if result.get("ok") and result.get("original_text") and rewritten:
            self._append_diff_block(
                original=str(result["original_text"]),
                rewritten=rewritten,
            )

    def dump(self) -> str:
        return "\n".join(self.lines)


def run_dock(options: DockOptions) -> int:
    renderer = DockPanelRenderer()
    renderer.append("[HAW] dock mode started")
    if options.debug:
        renderer.append("[HAW] debug mode enabled")
    print(renderer.dump())
    return 0
