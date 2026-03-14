from __future__ import annotations

from dataclasses import asdict, dataclass
import re
from typing import TypedDict

from haw.actions import decide_action
from haw.config import load_settings
from haw.policy import GuardrailPolicy, Policy
from haw.services.llm_client import LLMResult, rewrite_with_claude, rewrite_with_claude_variants

DEFAULT_MAX_CONTEXT_CHARS = 6000


class WriteActionResultDict(TypedDict):
    ok: bool
    reason: str
    message: str
    original_text: str
    rewritten_text: str
    thinking_summary: str
    tags: list[str]
    provider: str
    provider_error: str
    stats: dict[str, int]


class WriteActionVariantsResultDict(TypedDict):
    ok: bool
    reason: str
    message: str
    original_text: str
    variants: list[dict[str, object]]
    provider: str
    provider_error: str
    stats: dict[str, int]


@dataclass(frozen=True)
class WriteActionResult:
    ok: bool
    reason: str
    message: str
    original_text: str
    rewritten_text: str
    thinking_summary: str
    tags: list[str]
    provider: str
    provider_error: str
    stats: dict[str, int]

    def to_dict(self) -> WriteActionResultDict:
        return asdict(self)  # type: ignore[return-value]


def _count_words(text: str) -> int:
    return len(re.findall(r"\S+", text))


def _rewrite_text(prompt: str, selected_text: str) -> str:
    # Placeholder rewrite strategy for local deterministic behavior.
    # Replace this with model integration in production.
    _ = prompt
    return "\n".join(line.rstrip() for line in selected_text.splitlines())


def _rewrite_text_variants(prompt: str, selected_text: str, variants: int) -> list[str]:
    _ = prompt
    base = _rewrite_text(prompt=prompt, selected_text=selected_text).strip()
    compact_lines = " ".join(
        line.strip() for line in selected_text.splitlines() if line.strip()
    ).strip()
    normalized_space = re.sub(r"[ \t]+", " ", base).strip()
    candidates = [base, compact_lines, normalized_space]
    unique: list[str] = []
    for item in candidates:
        if item and item not in unique:
            unique.append(item)
    if not unique:
        unique = [selected_text]
    while len(unique) < variants:
        unique.append(unique[-1])
    return unique[:variants]

def _truncate_context(text: str, limit: int = DEFAULT_MAX_CONTEXT_CHARS) -> str:
    if len(text) <= limit:
        return text
    return text[: limit - 3] + "..."


def _summarize_provider_error(exc: Exception) -> str:
    message = str(exc).strip()
    return message or exc.__class__.__name__


def _rewrite_with_llm(
    *,
    prompt: str,
    selected_text: str,
    context_text: str,
    scan_mode: str,
    scan_pages_each_side: int,
) -> tuple[LLMResult | None, str]:
    settings = load_settings()
    if not settings.has_api_key:
        return None, "missing_api_key"
    try:
        return (
            rewrite_with_claude(
                prompt=prompt,
                selection=selected_text,
                context=context_text,
                scan_mode=scan_mode,
                scan_pages_each_side=scan_pages_each_side,
            ),
            "",
        )
    except Exception as exc:
        return None, _summarize_provider_error(exc)


def _rewrite_with_llm_variants(
    *,
    prompt: str,
    selected_text: str,
    context_text: str,
    scan_mode: str,
    scan_pages_each_side: int,
    variants: int,
) -> tuple[list[LLMResult] | None, str]:
    settings = load_settings()
    if not settings.has_api_key:
        return None, "missing_api_key"
    try:
        return (
            rewrite_with_claude_variants(
                prompt=prompt,
                selection=selected_text,
                context=context_text,
                scan_mode=scan_mode,
                scan_pages_each_side=scan_pages_each_side,
                variants=variants,
            ),
            "",
        )
    except Exception as exc:
        return None, _summarize_provider_error(exc)


def write_action(
    *,
    prompt: str,
    selected_text: str,
    context_text: str | None = None,
    scan_mode: str = "selection_only",
    scan_pages_each_side: int = 0,
    policy: Policy | None = None,
) -> WriteActionResultDict:
    guardrail = policy.guardrail if policy else GuardrailPolicy()
    context = _truncate_context(context_text or selected_text)

    decision = decide_action(prompt=prompt, selected_text=selected_text)
    if decision.reason == "style_request_blocked" and not guardrail.block_style_requests:
        decision = type(decision)(allowed=True, reason="ok", message="Auto-apply allowed.")
    if decision.reason == "table_safe_mode" and not guardrail.review_mode_on_table:
        decision = type(decision)(allowed=True, reason="ok", message="Auto-apply allowed.")

    if not decision.allowed:
        return WriteActionResult(
            ok=False,
            reason=decision.reason,
            message=decision.message,
            original_text=selected_text,
            rewritten_text=selected_text,
            thinking_summary=decision.message,
            tags=[],
            provider="policy_block",
            provider_error="",
            stats={
                "original_chars": len(selected_text),
                "rewritten_chars": len(selected_text),
                "word_delta": 0,
            },
        ).to_dict()

    llm_result, provider_error = _rewrite_with_llm(
        prompt=prompt,
        selected_text=selected_text,
        context_text=context,
        scan_mode=scan_mode,
        scan_pages_each_side=scan_pages_each_side,
    )
    if llm_result is None:
        rewritten_text = _rewrite_text(prompt=prompt, selected_text=selected_text)
        thinking_summary = (
            "요구사항: 사용자 요청에 맞춰 수정합니다.\n"
            "문맥 요약: 선택된 텍스트를 기준으로 맥락을 유지합니다.\n"
            "적용 규칙: 스타일 변경 요청/표 안전모드를 존중합니다.\n"
            "편집 계획: 불필요한 변형 없이 자연스럽게 다듬습니다."
        )
        tags: list[str] = []
        provider = "local_fallback"
        message = "Write action completed with local fallback."
    else:
        rewritten_text = llm_result.rewritten_text
        thinking_summary = llm_result.thinking_summary
        tags = llm_result.tags
        provider = "anthropic"
        provider_error = ""
        message = "Write action completed."

    return WriteActionResult(
        ok=True,
        reason="ok",
        message=message,
        original_text=selected_text,
        rewritten_text=rewritten_text,
        thinking_summary=thinking_summary,
        tags=tags,
        provider=provider,
        provider_error=provider_error,
        stats={
            "original_chars": len(selected_text),
            "rewritten_chars": len(rewritten_text),
            "word_delta": _count_words(rewritten_text) - _count_words(selected_text),
        },
    ).to_dict()


def write_action_variants(
    *,
    prompt: str,
    selected_text: str,
    context_text: str | None = None,
    scan_mode: str = "selection_only",
    scan_pages_each_side: int = 0,
    policy: Policy | None = None,
    variants: int = 3,
) -> WriteActionVariantsResultDict:
    guardrail = policy.guardrail if policy else GuardrailPolicy()
    context = _truncate_context(context_text or selected_text)

    decision = decide_action(prompt=prompt, selected_text=selected_text)
    if decision.reason == "style_request_blocked" and not guardrail.block_style_requests:
        decision = type(decision)(allowed=True, reason="ok", message="Auto-apply allowed.")
    if decision.reason == "table_safe_mode" and not guardrail.review_mode_on_table:
        decision = type(decision)(allowed=True, reason="ok", message="Auto-apply allowed.")

    if not decision.allowed:
        return {
            "ok": False,
            "reason": decision.reason,
            "message": decision.message,
            "original_text": selected_text,
            "variants": [],
            "provider": "policy_block",
            "provider_error": "",
            "stats": {
                "original_chars": len(selected_text),
                "variant_count": 0,
            },
        }

    llm_results, provider_error = _rewrite_with_llm_variants(
        prompt=prompt,
        selected_text=selected_text,
        context_text=context,
        scan_mode=scan_mode,
        scan_pages_each_side=scan_pages_each_side,
        variants=variants,
    )
    if not llm_results:
        rewritten_texts = _rewrite_text_variants(
            prompt=prompt, selected_text=selected_text, variants=variants
        )
        llm_results = [
            LLMResult(
                rewritten_text=text,
                thinking_summary=(
                    "요구사항: 사용자 요청에 맞춰 수정합니다.\n"
                    "문맥 요약: 선택된 텍스트를 기준으로 맥락을 유지합니다.\n"
                    "적용 규칙: 스타일 변경 요청/표 안전모드를 존중합니다.\n"
                    "편집 계획: 불필요한 변형 없이 자연스럽게 다듬습니다."
                ),
                tags=[],
            )
            for text in rewritten_texts
        ]
        provider = "local_fallback"
        message = "Write action completed with local fallback."
    else:
        provider = "anthropic"
        provider_error = ""
        message = "Write action completed."

    variants_payload: list[dict[str, object]] = []
    seen: set[str] = set()
    for result in llm_results:
        rewritten = result.rewritten_text.strip()
        if not rewritten or rewritten in seen:
            continue
        seen.add(rewritten)
        variants_payload.append(
            {
                "rewritten_text": rewritten,
                "thinking_summary": result.thinking_summary,
                "tags": result.tags,
            }
        )
        if len(variants_payload) >= max(1, variants):
            break

    if not variants_payload:
        variants_payload.append(
            {
                "rewritten_text": selected_text,
                "thinking_summary": "",
                "tags": [],
            }
        )

    return {
        "ok": True,
        "reason": "ok",
        "message": message,
        "original_text": selected_text,
        "variants": variants_payload,
        "provider": provider,
        "provider_error": provider_error,
        "stats": {
            "original_chars": len(selected_text),
            "variant_count": len(variants_payload),
        },
    }
