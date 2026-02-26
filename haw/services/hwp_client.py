from __future__ import annotations

from dataclasses import dataclass
from typing import Callable
from typing import Any


@dataclass(frozen=True)
class HwpState:
    available: bool
    detail: str


@dataclass(frozen=True)
class HwpOperationResult:
    ok: bool
    detail: str


class HwpClient:
    """Best-effort COM wrapper for HWP automation.

    The wrapper intentionally tries multiple fallback paths because
    workstation HWP COM environments can differ by version.
    """

    def __init__(self, hwp: Any):
        self.hwp = hwp

    @classmethod
    def connect(cls, visible: bool = True) -> "HwpClient":
        win32com_client = _import_win32com()
        try:
            hwp = win32com_client.gencache.EnsureDispatch("HWPFrame.HwpObject")
        except Exception:
            hwp = win32com_client.Dispatch("HWPFrame.HwpObject")
        client = cls(hwp)
        client._set_visible(visible)
        return client

    def _set_visible(self, visible: bool) -> None:
        try:
            window = self.hwp.XHwpWindows.Item(0)
            window.Visible = bool(visible)
        except Exception:
            # Visibility handling differs by versions; ignore if unavailable.
            pass

    def _run_command(self, command_name: str) -> bool:
        try:
            return bool(self.hwp.Run(command_name))
        except Exception:
            return False

    def ensure_track_changes_enabled(self, force: bool = True) -> HwpOperationResult:
        if not force:
            return HwpOperationResult(ok=True, detail="track changes not forced by policy")

        # Try known direct flags first.
        for attr_name in ("TrackChange", "IsTrackChange", "Record"):
            try:
                if hasattr(self.hwp, attr_name):
                    setattr(self.hwp, attr_name, True)
                    return HwpOperationResult(ok=True, detail=f"enabled via attribute {attr_name}")
            except Exception:
                continue

        # Try command-based fallback names.
        for command_name in ("TrackChange", "Revision", "RevisionInsert", "TrackChanges"):
            if self._run_command(command_name):
                return HwpOperationResult(ok=True, detail=f"enabled via command {command_name}")

        return HwpOperationResult(
            ok=False,
            detail="unable to enable track changes (no compatible attribute/command found)",
        )

    def read_selection_text(self) -> HwpOperationResult:
        text = _clipboard_read_selection_text(self.hwp)
        if text is None:
            return HwpOperationResult(ok=False, detail="failed to read selection from clipboard")
        return HwpOperationResult(ok=True, detail=text)

    def replace_selection_text(self, text: str) -> HwpOperationResult:
        # If there is a current selection, delete it first. Failure is non-fatal.
        self._run_command("Delete")
        ok = _clipboard_paste_text(self.hwp, text)
        if ok:
            return HwpOperationResult(ok=True, detail="selection replaced")
        return HwpOperationResult(ok=False, detail="failed to paste text into document")


def _import_win32com() -> Any:
    try:
        import win32com.client  # type: ignore

        return win32com.client
    except Exception as exc:
        raise RuntimeError(f"win32com is unavailable: {exc}") from exc


def _clipboard_read_selection_text(hwp: Any) -> str | None:
    def _operation() -> str | None:
        try:
            hwp.Run("Copy")
        except Exception:
            return None
        return _read_unicode_clipboard()

    return _with_clipboard_backup(_operation)


def _clipboard_paste_text(hwp: Any, text: str) -> bool:
    def _operation() -> bool:
        if not _write_unicode_clipboard(text):
            return False
        try:
            return bool(hwp.Run("Paste"))
        except Exception:
            return False

    return bool(_with_clipboard_backup(_operation))


def _with_clipboard_backup(operation: Callable[[], Any]) -> Any:
    backup = _read_unicode_clipboard()
    result = operation()
    if backup is not None:
        _write_unicode_clipboard(backup)
    return result


def _read_unicode_clipboard() -> str | None:
    try:
        import win32clipboard  # type: ignore
        import win32con  # type: ignore
    except Exception:
        return None

    try:
        win32clipboard.OpenClipboard()
        if not win32clipboard.IsClipboardFormatAvailable(win32con.CF_UNICODETEXT):
            return None
        return str(win32clipboard.GetClipboardData(win32con.CF_UNICODETEXT))
    except Exception:
        return None
    finally:
        try:
            win32clipboard.CloseClipboard()
        except Exception:
            pass


def _write_unicode_clipboard(text: str) -> bool:
    try:
        import win32clipboard  # type: ignore
        import win32con  # type: ignore
    except Exception:
        return False

    try:
        win32clipboard.OpenClipboard()
        win32clipboard.EmptyClipboard()
        win32clipboard.SetClipboardData(win32con.CF_UNICODETEXT, text)
        return True
    except Exception:
        return False
    finally:
        try:
            win32clipboard.CloseClipboard()
        except Exception:
            pass


def probe_hwp() -> HwpState:
    try:
        _ = HwpClient.connect(visible=False)
        return HwpState(available=True, detail="HWP COM is available")
    except Exception as exc:
        return HwpState(available=False, detail=str(exc))
