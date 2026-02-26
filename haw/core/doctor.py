from __future__ import annotations

from dataclasses import dataclass, asdict
import importlib
import json
import platform
import sys

from haw.config import Settings
from haw.policy import load_policy


@dataclass
class CheckResult:
    name: str
    ok: bool
    detail: str


def _check_module(module_name: str) -> CheckResult:
    try:
        importlib.import_module(module_name)
        return CheckResult(name=f"import:{module_name}", ok=True, detail="ok")
    except Exception as exc:
        return CheckResult(name=f"import:{module_name}", ok=False, detail=str(exc))


def run_doctor(settings: Settings, strict: bool = False) -> tuple[bool, dict]:
    checks: list[CheckResult] = []
    checks.append(CheckResult("python_version", sys.version_info >= (3, 11), platform.python_version()))
    checks.append(CheckResult("env_file", settings.env_path.exists(), str(settings.env_path)))
    checks.append(CheckResult("api_key", settings.has_api_key, "configured" if settings.has_api_key else "missing"))
    checks.append(_check_module("click"))
    checks.append(_check_module("loguru"))
    try:
        policy = load_policy()
        checks.append(
            CheckResult(
                name="policy",
                ok=True,
                detail=str(policy.source) if policy.source else "default",
            )
        )
    except Exception as exc:
        checks.append(CheckResult(name="policy", ok=False, detail=str(exc)))

    ok = all(c.ok for c in checks)
    if strict and not settings.has_api_key:
        ok = False

    payload = {
        "ok": ok,
        "status": "ok" if ok else "error",
        "strict": strict,
        "checks": [asdict(c) for c in checks],
    }
    return ok, payload


def run_doctor_json(settings: Settings, strict: bool = False) -> str:
    _, payload = run_doctor(settings=settings, strict=strict)
    return json.dumps(payload, ensure_ascii=False, indent=2)
