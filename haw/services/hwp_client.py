from __future__ import annotations

from dataclasses import dataclass, field
from typing import Iterable
from typing import Any
from typing import Callable
import time

COMMAND_RETRY_ATTEMPTS = 3
COMMAND_RETRY_DELAY_SEC = 0.03
CLIPBOARD_RETRY_ATTEMPTS = 5
CLIPBOARD_RETRY_DELAY_SEC = 0.03
DEFAULT_CHARS_PER_PAGE = 3000

PAGE_UP_ACTIONS = ("MovePageUp", "MovePrevPage", "PageUp")
PAGE_DOWN_ACTIONS = ("MovePageDown", "MoveNextPage", "PageDown")
CARET_BLOCK_COMMAND_SEQUENCES = (
    ("MoveParaBegin", "MoveSelParaEnd"),
    ("MoveLineBegin", "MoveSelLineEnd"),
    ("MoveSentenceBegin", "MoveSelSentenceEnd"),
)


@dataclass(frozen=True)
class HwpState:
    available: bool
    detail: str


@dataclass(frozen=True)
class HwpOperationResult:
    ok: bool
    detail: str


@dataclass(frozen=True)
class HwpContextResult:
    ok: bool
    detail: str
    selection: str = ""
    context: str = ""
    blocks: list[str] = field(default_factory=list)
    scan_mode: str = "selection_only"
    target_mode: str = "selection_block"
    scan_pages_each_side: int = 0
    scanned_pages: int = 0
    scanned_chars: int = 0
    anchor_restored: bool = False


@dataclass(frozen=True)
class HwpScanResult:
    text: str
    scanned_pages: int
    scanned_chars: int


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
        for attempt in range(COMMAND_RETRY_ATTEMPTS):
            try:
                if bool(self.hwp.Run(command_name)):
                    return True
            except Exception:
                pass
            if attempt < COMMAND_RETRY_ATTEMPTS - 1:
                time.sleep(COMMAND_RETRY_DELAY_SEC)
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
            detail="E_TRACK_CHANGE_UNAVAILABLE: unable to enable track changes",
        )

    def accept_all_revisions(self) -> HwpOperationResult:
        command_names = (
            "RevisionAcceptAll",
            "RevisionAcceptAllInDoc",
            "AcceptAll",
            "AcceptAllRevisions",
            "RevisionAccept",
        )
        for command_name in command_names:
            if self._run_command(command_name):
                return HwpOperationResult(ok=True, detail=f"accepted via command {command_name}")
        return HwpOperationResult(
            ok=False,
            detail="E_REVISION_ACCEPT_UNAVAILABLE: unable to accept revisions",
        )

    def accept_selected_revisions(self) -> HwpOperationResult:
        command_names = (
            "RevisionAcceptSelection",
            "RevisionAcceptSel",
            "AcceptSelection",
            "RevisionAcceptCur",
            "AcceptCur",
        )
        for command_name in command_names:
            if self._run_command(command_name):
                return HwpOperationResult(ok=True, detail=f"accepted via command {command_name}")
        return HwpOperationResult(
            ok=False,
            detail="E_REVISION_ACCEPT_SELECTION_UNAVAILABLE: unable to accept selection revisions",
        )

    def reject_selected_revisions(self) -> HwpOperationResult:
        command_names = (
            "RevisionRejectSelection",
            "RevisionRejectSel",
            "RejectSelection",
            "RevisionRejectCur",
            "RejectCur",
        )
        for command_name in command_names:
            if self._run_command(command_name):
                return HwpOperationResult(ok=True, detail=f"rejected via command {command_name}")
        return HwpOperationResult(
            ok=False,
            detail="E_REVISION_REJECT_SELECTION_UNAVAILABLE: unable to reject selection revisions",
        )

    def undo_last_action(self) -> HwpOperationResult:
        command_names = (
            "Undo",
            "UnDo",
            "Cancel",
        )
        for command_name in command_names:
            if self._run_command(command_name):
                return HwpOperationResult(ok=True, detail=f"undone via command {command_name}")
        return HwpOperationResult(
            ok=False,
            detail="E_UNDO_UNAVAILABLE: unable to undo last action",
        )

    def discard_last_review_edit(self) -> HwpOperationResult:
        reject_result = self.reject_selected_revisions()
        if reject_result.ok:
            return reject_result
        undo_result = self.undo_last_action()
        if undo_result.ok:
            return undo_result
        return HwpOperationResult(
            ok=False,
            detail=(
                "E_REVIEW_DISCARD_UNAVAILABLE: unable to discard review edit "
                f"({reject_result.detail}; {undo_result.detail})"
            ),
        )

    def check_revision_marks(self) -> HwpOperationResult:
        attr_candidates = (
            "HasRevision",
            "RevisionExist",
            "HasRevisions",
            "IsRevision",
        )
        for attr in attr_candidates:
            try:
                if hasattr(self.hwp, attr):
                    return HwpOperationResult(ok=True, detail=str(bool(getattr(self.hwp, attr))))
            except Exception:
                continue
        command_candidates = (
            "RevisionList",
            "Revision",
            "TrackChange",
        )
        for command in command_candidates:
            if self._run_command(command):
                return HwpOperationResult(ok=True, detail="unknown")
        return HwpOperationResult(
            ok=False,
            detail="E_REVISION_STATUS_UNAVAILABLE: unable to query revision status",
        )

    def read_selection_text(self) -> HwpOperationResult:
        text = _clipboard_read_selection_text(self.hwp)
        if text is None:
            return HwpOperationResult(ok=False, detail="E_CLIPBOARD_READ: failed to read selection")
        if not text.strip():
            return HwpOperationResult(ok=False, detail="E_EMPTY_SELECTION: no selected text found")
        return HwpOperationResult(ok=True, detail=text)

    def resolve_caret_selection(self) -> HwpOperationResult:
        pos = _get_pos(self.hwp)
        for command_names in CARET_BLOCK_COMMAND_SEQUENCES:
            if not _run_command_sequence(self, command_names):
                if pos is not None:
                    _set_pos(self.hwp, pos)
                continue
            selection_result = self.read_selection_text()
            if selection_result.ok:
                return HwpOperationResult(ok=True, detail=selection_result.detail)
            if pos is not None:
                _set_pos(self.hwp, pos)
        if pos is not None:
            _set_pos(self.hwp, pos)
        return HwpOperationResult(
            ok=False,
            detail="E_CARET_RESOLUTION_UNAVAILABLE: unable to resolve caret to editable block",
        )

    def read_context(
        self,
        *,
        scan_pages_each_side: int = 0,
        on_stage: Callable[[str], Any] | None = None,
    ) -> HwpContextResult:
        selection_result = self.read_selection_text()
        selection = ""
        target_mode = "selection_block"
        if selection_result.ok:
            selection = selection_result.detail
            _report_stage(on_stage, "Selection detected")
        elif selection_result.detail.startswith("E_EMPTY_SELECTION"):
            target_mode = "caret_anchor"
            _report_stage(on_stage, "Caret detected, resolving nearby context")
            caret_result = self.resolve_caret_selection()
            if caret_result.ok:
                selection = caret_result.detail
                target_mode = "caret_resolved_block"
                _report_stage(on_stage, "Caret block resolved")
        else:
            return HwpContextResult(ok=False, detail=selection_result.detail)
        if scan_pages_each_side <= 0:
            return HwpContextResult(
                ok=True,
                detail=(
                    "selection_only"
                    if target_mode == "selection_block"
                    else "caret_resolved_block"
                    if selection
                    else "caret_anchor"
                ),
                selection=selection,
                context=selection,
                blocks=[selection] if selection else [],
                scan_mode=(
                    "selection_only"
                    if target_mode == "selection_block"
                    else "caret_resolved_block"
                    if selection
                    else "caret_anchor"
                ),
                target_mode=target_mode,
                scan_pages_each_side=scan_pages_each_side,
                scanned_pages=0,
                scanned_chars=len(selection),
                anchor_restored=True,
            )

        pos = _get_pos(self.hwp)
        page_up = _first_working_action(self, PAGE_UP_ACTIONS, pos)
        page_down = _first_working_action(self, PAGE_DOWN_ACTIONS, pos)
        if not page_up or not page_down:
            return HwpContextResult(
                ok=True,
                detail="scan_unavailable",
                selection=selection,
                context=selection,
                blocks=[selection] if selection else [],
                scan_mode=(
                    "selection_only"
                    if target_mode == "selection_block"
                    else "caret_resolved_block"
                    if selection
                    else "caret_anchor"
                ),
                target_mode=target_mode,
                scan_pages_each_side=scan_pages_each_side,
                anchor_restored=True,
            )

        _report_stage(on_stage, "Scanning nearby pages")
        for _ in range(scan_pages_each_side):
            self._run_command(page_up)

        scan_result = _scan_forward(
            self.hwp,
            max_pages=scan_pages_each_side * 2,
            max_chars=DEFAULT_CHARS_PER_PAGE * max(1, scan_pages_each_side * 2),
        )
        anchor_restored = False
        if pos is not None:
            _set_pos(self.hwp, pos)
            anchor_restored = True
        _report_stage(on_stage, "Scan complete, anchor restored")

        if not scan_result.text.strip():
            return HwpContextResult(
                ok=True,
                detail="scan_empty" if selection else "caret_anchor",
                selection=selection,
                context=selection,
                blocks=[selection] if selection else [],
                scan_mode=(
                    "selection_only"
                    if target_mode == "selection_block"
                    else "caret_resolved_block"
                    if selection
                    else "caret_anchor"
                ),
                target_mode=target_mode,
                scan_pages_each_side=scan_pages_each_side,
                scanned_pages=0,
                scanned_chars=len(selection),
                anchor_restored=anchor_restored,
            )

        if target_mode == "caret_anchor":
            caret_result = self.resolve_caret_selection()
            if caret_result.ok:
                selection = caret_result.detail
                target_mode = "caret_resolved_block"
                _report_stage(on_stage, "Caret block resolved")

        return HwpContextResult(
            ok=True,
            detail="page_scan",
            selection=selection,
            context=scan_result.text,
            blocks=[scan_result.text],
            scan_mode="page_scan",
            target_mode=target_mode,
            scan_pages_each_side=scan_pages_each_side,
            scanned_pages=scan_result.scanned_pages,
            scanned_chars=scan_result.scanned_chars,
            anchor_restored=anchor_restored,
        )

    def probe_actions(self, actions: Iterable[str]) -> dict[str, bool]:
        pos = _get_pos(self.hwp)
        results: dict[str, bool] = {}
        for action in actions:
            ok = self._run_command(action)
            results[action] = ok
            if pos is not None:
                _set_pos(self.hwp, pos)
        return results

    def replace_selection_text(self, text: str) -> HwpOperationResult:
        # If there is a current selection, delete it first. Failure is non-fatal.
        self._run_command("Delete")
        ok = _clipboard_paste_text(self.hwp, text)
        if ok:
            return HwpOperationResult(ok=True, detail="selection replaced")
        return HwpOperationResult(ok=False, detail="E_CLIPBOARD_PASTE: failed to paste text")



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


def _report_stage(reporter: Callable[[str], Any] | None, message: str) -> None:
    if reporter is None:
        return
    try:
        reporter(message)
    except Exception:
        return


def _with_clipboard_backup(operation: Callable[[], Any]) -> Any:
    backup = _read_unicode_clipboard()
    result = operation()
    if backup is not None:
        _write_unicode_clipboard(backup)
    return result


def _retry(operation: Callable[[], Any], *, attempts: int, delay_sec: float) -> Any:
    last_error: Exception | None = None
    for attempt in range(attempts):
        try:
            return operation()
        except Exception as exc:
            last_error = exc
            if attempt < attempts - 1:
                time.sleep(delay_sec)
    if last_error is not None:
        raise last_error
    raise RuntimeError("retry failed without exception")


def _read_unicode_clipboard() -> str | None:
    try:
        import win32clipboard  # type: ignore
        import win32con  # type: ignore
    except Exception:
        return None

    def _read() -> str | None:
        win32clipboard.OpenClipboard()
        try:
            if not win32clipboard.IsClipboardFormatAvailable(win32con.CF_UNICODETEXT):
                return None
            return str(win32clipboard.GetClipboardData(win32con.CF_UNICODETEXT))
        finally:
            try:
                win32clipboard.CloseClipboard()
            except Exception:
                pass

    try:
        return _retry(
            _read,
            attempts=CLIPBOARD_RETRY_ATTEMPTS,
            delay_sec=CLIPBOARD_RETRY_DELAY_SEC,
        )
    except Exception:
        return None


def _write_unicode_clipboard(text: str) -> bool:
    try:
        import win32clipboard  # type: ignore
        import win32con  # type: ignore
    except Exception:
        return False

    def _write() -> bool:
        win32clipboard.OpenClipboard()
        try:
            win32clipboard.EmptyClipboard()
            win32clipboard.SetClipboardData(win32con.CF_UNICODETEXT, text)
            return True
        finally:
            try:
                win32clipboard.CloseClipboard()
            except Exception:
                pass

    try:
        return bool(
            _retry(
                _write,
                attempts=CLIPBOARD_RETRY_ATTEMPTS,
                delay_sec=CLIPBOARD_RETRY_DELAY_SEC,
            )
        )
    except Exception:
        return False


def _get_pos(hwp: Any) -> tuple[int, int, int] | None:
    try:
        pos = hwp.GetPosBySet()
        return (
            int(pos.Item("List")),
            int(pos.Item("Para")),
            int(pos.Item("Pos")),
        )
    except Exception:
        return None


def _set_pos(hwp: Any, pos: tuple[int, int, int]) -> None:
    try:
        hwp.SetPos(pos[0], pos[1], pos[2])
    except Exception:
        return None


def _get_page_number(hwp: Any) -> int | None:
    try:
        info = hwp.KeyIndicator()
        if isinstance(info, (list, tuple)) and len(info) >= 4:
            return int(info[3])
    except Exception:
        return None
    return None


def _first_working_action(client: HwpClient, actions: Iterable[str], pos: tuple[int, int, int] | None) -> str:
    for action in actions:
        if client._run_command(action):
            if pos is not None:
                _set_pos(client.hwp, pos)
            return action
        if pos is not None:
            _set_pos(client.hwp, pos)
    return ""


def _run_command_sequence(client: HwpClient, command_names: Iterable[str]) -> bool:
    for command_name in command_names:
        if not client._run_command(command_name):
            return False
    return True


def _normalize_scan_result(result: Any) -> tuple[int, str]:
    if isinstance(result, (list, tuple)) and len(result) >= 2:
        status = int(result[0]) if result[0] is not None else 0
        text = str(result[1] or "")
        return status, text
    if isinstance(result, str):
        return (1 if result else 0), result
    return 0, ""


def _scan_forward(hwp: Any, *, max_pages: int, max_chars: int) -> HwpScanResult:
    if not hasattr(hwp, "InitScan") or not hasattr(hwp, "GetText"):
        return HwpScanResult(text="", scanned_pages=0, scanned_chars=0)

    parts: list[str] = []
    start_page = _get_page_number(hwp)
    end_page = start_page + max_pages if start_page is not None else None
    last_page = start_page
    total_chars = 0
    try:
        hwp.InitScan()
        while True:
            status, text = _normalize_scan_result(hwp.GetText())
            if status == 0 or not text:
                break
            parts.append(text)
            total_chars += len(text)
            if total_chars >= max_chars:
                break
            if end_page is not None:
                current_page = _get_page_number(hwp)
                if current_page is not None and current_page > end_page:
                    last_page = current_page
                    break
                if current_page is not None:
                    last_page = current_page
    finally:
        if hasattr(hwp, "ReleaseScan"):
            try:
                hwp.ReleaseScan()
            except Exception:
                pass
    if start_page is not None and last_page is not None:
        scanned_pages = max(1, last_page - start_page + 1)
    else:
        scanned_pages = 0
    return HwpScanResult(
        text="".join(parts),
        scanned_pages=scanned_pages,
        scanned_chars=total_chars,
    )


def probe_hwp() -> HwpState:
    try:
        _ = HwpClient.connect(visible=False)
        return HwpState(available=True, detail="HWP COM is available")
    except Exception as exc:
        return HwpState(available=False, detail=str(exc))
