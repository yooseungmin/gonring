from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
import tomllib


@dataclass(frozen=True)
class GuardrailPolicy:
    pii_mode: str = "mask"
    review_mode_on_table: bool = True
    block_style_requests: bool = True
    max_preview_chars: int = 5000


@dataclass(frozen=True)
class HwpPolicy:
    force_track_changes: bool = True


@dataclass(frozen=True)
class Policy:
    guardrail: GuardrailPolicy = GuardrailPolicy()
    hwp: HwpPolicy = HwpPolicy()
    source: Path | None = None


def load_policy(path: Path | None = None) -> Policy:
    p = path or Path("policy.toml")
    if not p.exists():
        return Policy(source=None)

    with p.open("rb") as f:
        data = tomllib.load(f)

    g = data.get("guardrail", {})
    h = data.get("hwp", {})
    return Policy(
        guardrail=GuardrailPolicy(
            pii_mode=str(g.get("pii_mode", "mask")),
            review_mode_on_table=bool(g.get("review_mode_on_table", True)),
            block_style_requests=bool(g.get("block_style_requests", True)),
            max_preview_chars=int(g.get("max_preview_chars", 5000)),
        ),
        hwp=HwpPolicy(
            force_track_changes=bool(h.get("force_track_changes", True)),
        ),
        source=p,
    )
