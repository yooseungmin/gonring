from __future__ import annotations

from dataclasses import dataclass
import json
import os
from typing import Any
import urllib.error
import urllib.request


DEFAULT_BASE_URL = "https://api.anthropic.com/v1/messages"
DEFAULT_MODEL = "claude-sonnet-4-6"
DEFAULT_TIMEOUT_SEC = 30
DEFAULT_MAX_TOKENS = 1200


@dataclass(frozen=True)
class LLMResult:
    rewritten_text: str
    thinking_summary: str
    tags: list[str]


def rewrite_with_claude(
    *,
    prompt: str,
    selection: str,
    context: str,
    scan_mode: str = "selection_only",
    scan_pages_each_side: int = 0,
    box_context: str = "",
    tag_hints: list[str] | None = None,
) -> LLMResult:
    api_key = os.getenv("HAW_ANTHROPIC_API_KEY", "").strip()
    if not api_key:
        raise RuntimeError("missing HAW_ANTHROPIC_API_KEY")

    model = os.getenv("HAW_ANTHROPIC_MODEL", DEFAULT_MODEL)
    base_url = os.getenv("HAW_ANTHROPIC_BASE_URL", DEFAULT_BASE_URL)
    timeout = float(os.getenv("HAW_ANTHROPIC_TIMEOUT_SEC", str(DEFAULT_TIMEOUT_SEC)))
    max_tokens = int(os.getenv("HAW_ANTHROPIC_MAX_TOKENS", str(DEFAULT_MAX_TOKENS)))

    system = (
        "You are a document rewrite assistant for HWP. "
        "Return a single JSON object with keys: "
        "rewritten_text (string), thinking_summary (string), tags (array of strings). "
        "The thinking_summary must be user-facing and MUST follow this exact format:\n"
        "요구사항: ...\n"
        "문맥 요약: ...\n"
        "적용 규칙: ...\n"
        "편집 계획: ...\n"
        "Do not include step-by-step reasoning or hidden chain-of-thought."
    )

    user_payload = {
        "instruction": prompt,
        "selection": selection,
        "context": context,
        "scan_mode": scan_mode,
        "scan_pages_each_side": scan_pages_each_side,
        "box_context": box_context,
        "tag_hints": tag_hints or [],
    }

    request_body = json.dumps(
        {
            "model": model,
            "max_tokens": max_tokens,
            "temperature": 0.2,
            "system": system,
            "messages": [
                {
                    "role": "user",
                    "content": json.dumps(user_payload, ensure_ascii=False),
                }
            ],
        },
        ensure_ascii=False,
    ).encode("utf-8")

    req = urllib.request.Request(
        base_url,
        data=request_body,
        headers={
            "content-type": "application/json",
            "x-api-key": api_key,
            "anthropic-version": "2023-06-01",
        },
        method="POST",
    )

    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            raw = resp.read().decode("utf-8")
    except urllib.error.HTTPError as exc:
        detail = exc.read().decode("utf-8") if exc.fp else str(exc)
        raise RuntimeError(f"anthropic http error: {detail}") from exc
    except Exception as exc:
        raise RuntimeError(f"anthropic request failed: {exc}") from exc

    payload = json.loads(raw)
    text = _extract_text(payload)
    data = _extract_json(text)

    rewritten_text = str(data.get("rewritten_text", "")).strip()
    thinking_summary = str(data.get("thinking_summary", "")).strip()
    tags = data.get("tags", [])
    if not isinstance(tags, list):
        tags = []
    tags = [str(tag).strip() for tag in tags if str(tag).strip()]

    if not rewritten_text:
        rewritten_text = selection
    return LLMResult(
        rewritten_text=rewritten_text,
        thinking_summary=thinking_summary,
        tags=tags,
    )


def rewrite_with_claude_variants(
    *,
    prompt: str,
    selection: str,
    context: str,
    scan_mode: str = "selection_only",
    scan_pages_each_side: int = 0,
    box_context: str = "",
    tag_hints: list[str] | None = None,
    variants: int = 3,
) -> list[LLMResult]:
    api_key = os.getenv("HAW_ANTHROPIC_API_KEY", "").strip()
    if not api_key:
        raise RuntimeError("missing HAW_ANTHROPIC_API_KEY")

    model = os.getenv("HAW_ANTHROPIC_MODEL", DEFAULT_MODEL)
    base_url = os.getenv("HAW_ANTHROPIC_BASE_URL", DEFAULT_BASE_URL)
    timeout = float(os.getenv("HAW_ANTHROPIC_TIMEOUT_SEC", str(DEFAULT_TIMEOUT_SEC)))
    max_tokens = int(os.getenv("HAW_ANTHROPIC_MAX_TOKENS", str(DEFAULT_MAX_TOKENS)))

    system = (
        "You are a document rewrite assistant for HWP. "
        "Return a single JSON object with key candidates, which is an array of "
        f"{variants} objects. Each object must contain keys: "
        "rewritten_text (string), thinking_summary (string), tags (array of strings). "
        "The thinking_summary must be user-facing and MUST follow this exact format:\n"
        "요구사항: ...\n"
        "문맥 요약: ...\n"
        "적용 규칙: ...\n"
        "편집 계획: ...\n"
        "Do not include step-by-step reasoning or hidden chain-of-thought."
    )

    user_payload = {
        "instruction": prompt,
        "selection": selection,
        "context": context,
        "scan_mode": scan_mode,
        "scan_pages_each_side": scan_pages_each_side,
        "box_context": box_context,
        "tag_hints": tag_hints or [],
        "variant_count": variants,
    }

    request_body = json.dumps(
        {
            "model": model,
            "max_tokens": max_tokens,
            "temperature": 0.4,
            "system": system,
            "messages": [
                {
                    "role": "user",
                    "content": json.dumps(user_payload, ensure_ascii=False),
                }
            ],
        },
        ensure_ascii=False,
    ).encode("utf-8")

    req = urllib.request.Request(
        base_url,
        data=request_body,
        headers={
            "content-type": "application/json",
            "x-api-key": api_key,
            "anthropic-version": "2023-06-01",
        },
        method="POST",
    )

    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            raw = resp.read().decode("utf-8")
    except urllib.error.HTTPError as exc:
        detail = exc.read().decode("utf-8") if exc.fp else str(exc)
        raise RuntimeError(f"anthropic http error: {detail}") from exc
    except Exception as exc:
        raise RuntimeError(f"anthropic request failed: {exc}") from exc

    payload = json.loads(raw)
    text = _extract_text(payload)
    data = _extract_json(text)

    candidates = data.get("candidates") or data.get("variants") or []
    results: list[LLMResult] = []
    if isinstance(candidates, list) and candidates:
        for item in candidates:
            if not isinstance(item, dict):
                continue
            rewritten_text = str(item.get("rewritten_text", "")).strip() or selection
            thinking_summary = str(item.get("thinking_summary", "")).strip()
            tags = item.get("tags", [])
            if not isinstance(tags, list):
                tags = []
            tags = [str(tag).strip() for tag in tags if str(tag).strip()]
            results.append(
                LLMResult(
                    rewritten_text=rewritten_text,
                    thinking_summary=thinking_summary,
                    tags=tags,
                )
            )
    else:
        rewritten_text = str(data.get("rewritten_text", "")).strip() or selection
        thinking_summary = str(data.get("thinking_summary", "")).strip()
        tags = data.get("tags", [])
        if not isinstance(tags, list):
            tags = []
        tags = [str(tag).strip() for tag in tags if str(tag).strip()]
        results.append(
            LLMResult(
                rewritten_text=rewritten_text,
                thinking_summary=thinking_summary,
                tags=tags,
            )
        )

    return results


def _extract_text(payload: dict[str, Any]) -> str:
    parts = payload.get("content", [])
    if not isinstance(parts, list):
        return ""
    text_parts: list[str] = []
    for part in parts:
        if not isinstance(part, dict):
            continue
        if part.get("type") == "text":
            text_parts.append(str(part.get("text", "")))
    return "".join(text_parts).strip()


def _extract_json(text: str) -> dict[str, Any]:
    start = text.find("{")
    end = text.rfind("}")
    if start == -1 or end == -1 or end <= start:
        raise ValueError("no json object found in LLM response")
    return json.loads(text[start : end + 1])
