import sys
import types

from haw import main_assistant


def test_run_defaults_to_dock_mode(monkeypatch) -> None:
    captured: list[str] = []

    def fake_cli() -> int:
        captured.extend(sys.argv)
        return 0

    monkeypatch.setitem(sys.modules, "haw.main", types.SimpleNamespace(cli=fake_cli))
    monkeypatch.setattr(sys, "argv", ["haw_assistant.exe"])

    assert main_assistant._run() == 0
    assert captured == ["haw_assistant.exe", "agent", "start", "--dock"]


def test_run_preserves_explicit_args(monkeypatch) -> None:
    captured: list[str] = []

    def fake_cli() -> int:
        captured.extend(sys.argv)
        return 0

    monkeypatch.setitem(sys.modules, "haw.main", types.SimpleNamespace(cli=fake_cli))
    monkeypatch.setattr(sys, "argv", ["haw_assistant.exe", "doctor", "--strict"])

    assert main_assistant._run() == 0
    assert captured == ["haw_assistant.exe", "doctor", "--strict"]
