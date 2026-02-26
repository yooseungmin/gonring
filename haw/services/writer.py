from __future__ import annotations

from pathlib import Path

from haw.agent.actions import write_action
from haw.policy import Policy


def write_text(prompt: str, selected_text: str, output: Path, policy: Policy | None = None) -> tuple[bool, str]:
    result = write_action(prompt=prompt, selected_text=selected_text, policy=policy)
    if not result.get("ok"):
        return False, str(result.get("message", "write failed"))

    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(str(result.get("rewritten_text", selected_text)), encoding="utf-8")
    return True, f"saved: {output}"
