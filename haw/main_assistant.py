"""haw_assistant.exe entry point - tray + dock UI launcher."""

from __future__ import annotations

import sys


def _run() -> int:
    # Reuse existing CLI flow in dock mode so packaging can point here.
    from haw.main import cli

    if len(sys.argv) <= 1:
        sys.argv = [sys.argv[0], "agent", "start", "--dock"]
    return int(cli() or 0)


def main() -> int:
    # COM must be initialized on the main thread before any COM objects are used.
    pythoncom = None
    try:
        import pythoncom  # type: ignore

        pythoncom.CoInitialize()
    except Exception:
        pythoncom = None

    try:
        return _run()
    finally:
        if pythoncom is not None:
            try:
                pythoncom.CoUninitialize()
            except Exception:
                pass


if __name__ == "__main__":
    raise SystemExit(main())
