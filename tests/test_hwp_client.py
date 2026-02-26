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


def test_connect_falls_back_to_dispatch(monkeypatch) -> None:
    class FakeComClient:
        class gencache:
            @staticmethod
            def EnsureDispatch(_prog_id: str):  # noqa: N802
                raise RuntimeError("ensure dispatch failed")

        @staticmethod
        def Dispatch(_prog_id: str):  # noqa: N802
            return FakeHwp()

    monkeypatch.setattr(hc, "_import_win32com", lambda: FakeComClient)
    client = hc.HwpClient.connect(visible=False)
    assert isinstance(client.hwp, FakeHwp)


def test_clipboard_paste_restores_previous_content(monkeypatch) -> None:
    hwp = FakeHwp()
    writes: list[str] = []

    monkeypatch.setattr(hc, "_read_unicode_clipboard", lambda: "backup")
    monkeypatch.setattr(hc, "_write_unicode_clipboard", lambda text: writes.append(text) or True)

    ok = hc._clipboard_paste_text(hwp, "new text")
    assert ok
    assert writes == ["new text", "backup"]


def test_clipboard_read_restores_previous_content(monkeypatch) -> None:
    hwp = FakeHwp()
    reads = iter(["backup", "selected"])
    writes: list[str] = []

    monkeypatch.setattr(hc, "_read_unicode_clipboard", lambda: next(reads, None))
    monkeypatch.setattr(hc, "_write_unicode_clipboard", lambda text: writes.append(text) or True)

    text = hc._clipboard_read_selection_text(hwp)
    assert text == "selected"
    assert writes == ["backup"]
