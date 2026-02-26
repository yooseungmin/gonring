from __future__ import annotations

import re
from pathlib import Path
from typing import Any

from loguru import logger

_PII_PATTERNS = [
    r"\d{6}-[1-4]\d{6}",  # Korean resident ID
    r"01[016789]-?\d{3,4}-?\d{4}",  # Korean mobile number
    r"[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}",  # Email
    r"\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}",  # Card number
    r"C:\\Users\\[^\\]+\\",  # Windows user path
]

_PII_REGEX = [re.compile(p) for p in _PII_PATTERNS]


def _redact_all(text: str) -> str:
    redacted = text
    for rx in _PII_REGEX:
        redacted = rx.sub("[REDACTED]", redacted)
    return redacted


def _redact_and_allow(record: dict[str, Any]) -> bool:
    record["message"] = _redact_all(str(record.get("message", "")))
    return True


def configure_logger(log_dir: Path | None = None, level: str = "INFO") -> None:
    logger.remove()
    logger.add(
        lambda msg: print(msg, end=""),
        level=level,
        backtrace=False,
        diagnose=False,
        enqueue=False,
        filter=_redact_and_allow,
    )

    if log_dir is not None:
        log_dir.mkdir(parents=True, exist_ok=True)
        logger.add(
            log_dir / "haw.log",
            level=level,
            backtrace=False,
            diagnose=False,
            enqueue=False,
            filter=_redact_and_allow,
            rotation="10 MB",
            retention=10,
            encoding="utf-8",
        )
