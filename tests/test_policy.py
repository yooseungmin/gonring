from pathlib import Path

from haw.policy import load_policy


def test_load_policy_defaults_when_missing(tmp_path: Path) -> None:
    policy = load_policy(tmp_path / "missing.toml")
    assert policy.guardrail.max_preview_chars == 5000
    assert policy.hwp.force_track_changes is True


def test_load_policy_from_file(tmp_path: Path) -> None:
    p = tmp_path / "policy.toml"
    p.write_text(
        "[guardrail]\n"
        "max_preview_chars=1234\n"
        "review_mode_on_table=false\n"
        "[hwp]\n"
        "force_track_changes=false\n",
        encoding="utf-8",
    )
    policy = load_policy(p)
    assert policy.guardrail.max_preview_chars == 1234
    assert policy.guardrail.review_mode_on_table is False
    assert policy.hwp.force_track_changes is False
