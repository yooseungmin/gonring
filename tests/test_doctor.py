from pathlib import Path

from haw.config import load_settings
from haw.core.doctor import run_doctor


def test_doctor_payload_shape(tmp_path: Path) -> None:
    env = tmp_path / ".env"
    env.write_text("HAW_AUTH_MODE=local\n", encoding="utf-8")
    settings = load_settings(tmp_path)
    ok, payload = run_doctor(settings=settings, strict=False)
    assert isinstance(ok, bool)
    assert "checks" in payload
    assert payload["status"] in {"ok", "error"}
