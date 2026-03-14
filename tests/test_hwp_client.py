import sys
import types

from haw.services import hwp_client as hc


class FakeHwp:
    def __init__(self) -> None:
        self.commands: list[str] = []
        self.TrackChange = False

    def Run(self, command_name: str) -> bool:  # noqa: N802 (COM-like name)
        self.commands.append(command_name)
        return command_name in {
            "Copy",
            "Paste",
            "TrackChange",
            "Delete",
            "RevisionRejectSelection",
            "Undo",
        }


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


def test_retry_succeeds_after_transient_failures() -> None:
    state = {"count": 0}

    def flaky() -> str:
        state["count"] += 1
        if state["count"] < 3:
            raise RuntimeError("busy")
        return "ok"

    result = hc._retry(flaky, attempts=3, delay_sec=0)
    assert result == "ok"


def test_write_unicode_clipboard_writes_text(monkeypatch) -> None:
    events: list[object] = []

    fake_clipboard = types.SimpleNamespace(
        OpenClipboard=lambda: events.append("open"),
        EmptyClipboard=lambda: events.append("empty"),
        SetClipboardData=lambda fmt, text: events.append(("set", fmt, text)),
        CloseClipboard=lambda: events.append("close"),
    )
    fake_con = types.SimpleNamespace(CF_UNICODETEXT=13)

    monkeypatch.setitem(sys.modules, "win32clipboard", fake_clipboard)
    monkeypatch.setitem(sys.modules, "win32con", fake_con)

    assert hc._write_unicode_clipboard("hello") is True
    assert events == ["open", "empty", ("set", 13, "hello"), "close"]


def test_read_selection_returns_error_code_on_empty(monkeypatch) -> None:
    hwp = FakeHwp()
    client = hc.HwpClient(hwp)
    monkeypatch.setattr(hc, "_clipboard_read_selection_text", lambda _hwp: "   ")
    result = client.read_selection_text()
    assert not result.ok
    assert result.detail.startswith("E_EMPTY_SELECTION")


def test_read_context_reports_caret_anchor_when_no_selection(monkeypatch) -> None:
    hwp = FakeHwp()
    client = hc.HwpClient(hwp)
    stages: list[str] = []

    monkeypatch.setattr(hc, "_clipboard_read_selection_text", lambda _hwp: "   ")
    monkeypatch.setattr(client, "_run_command", lambda _name: False)

    result = client.read_context(scan_pages_each_side=0, on_stage=stages.append)

    assert result.ok
    assert result.target_mode == "caret_anchor"
    assert result.anchor_restored is True
    assert stages == ["Caret detected, resolving nearby context"]


def test_read_context_resolves_caret_to_current_block(monkeypatch) -> None:
    hwp = FakeHwp()
    client = hc.HwpClient(hwp)
    stages: list[str] = []
    reads = iter(["   ", "resolved paragraph"])

    monkeypatch.setattr(hc, "_clipboard_read_selection_text", lambda _hwp: next(reads, "resolved paragraph"))
    monkeypatch.setattr(
        client,
        "_run_command",
        lambda name: name in {"MoveParaBegin", "MoveSelParaEnd"},
    )

    result = client.read_context(scan_pages_each_side=0, on_stage=stages.append)

    assert result.ok
    assert result.target_mode == "caret_resolved_block"
    assert result.selection == "resolved paragraph"
    assert result.scan_mode == "caret_resolved_block"
    assert stages == [
        "Caret detected, resolving nearby context",
        "Caret block resolved",
    ]


def test_discard_last_review_edit_prefers_reject_selected_revisions() -> None:
    hwp = FakeHwp()
    client = hc.HwpClient(hwp)

    result = client.discard_last_review_edit()

    assert result.ok
    assert hwp.commands[0] == "RevisionRejectSelection"


def test_discard_last_review_edit_falls_back_to_undo(monkeypatch) -> None:
    hwp = FakeHwp()
    client = hc.HwpClient(hwp)

    def fake_run(command_name: str) -> bool:
        hwp.commands.append(command_name)
        return command_name == "Undo"

    monkeypatch.setattr(client, "_run_command", fake_run)

    result = client.discard_last_review_edit()

    assert result.ok
    assert "Undo" in hwp.commands
