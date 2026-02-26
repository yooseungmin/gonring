from haw.services import hwp_client as hc


class FakeHwp:
    def __init__(self) -> None:
        self.commands: list[str] = []
        self.TrackChange = False

    def Run(self, command_name: str) -> bool:  # noqa: N802 (COM-like name)
        self.commands.append(command_name)
        return command_name in {"Copy", "Paste", "TrackChange", "Delete"}


def test_track_changes_enable_via_attribute() -> None:
    hwp = FakeHwp()
    client = hc.HwpClient(hwp)
    result = client.ensure_track_changes_enabled(force=True)
    assert result.ok
    assert hwp.TrackChange is True


def test_replace_selection_uses_delete_then_paste(monkeypatch) -> None:
    hwp = FakeHwp()
    client = hc.HwpClient(hwp)

    monkeypatch.setattr(hc, "_clipboard_paste_text", lambda _hwp, _text: True)
    result = client.replace_selection_text("replacement")
    assert result.ok
    assert "Delete" in hwp.commands
