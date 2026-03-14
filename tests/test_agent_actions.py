from pathlib import Path

from haw.agent.actions import LLMResult, write_action, write_action_variants
from haw.config import Settings
from haw.policy import GuardrailPolicy, Policy


def test_write_action_includes_original_text(monkeypatch) -> None:
    monkeypatch.setenv("HAW_ANTHROPIC_API_KEY", "")
    result = write_action(prompt="Refine sentence", selected_text="Original sentence")
    assert "original_text" in result
    assert "rewritten_text" in result
    assert "thinking_summary" in result
    assert result["provider"] == "local_fallback"
    assert result["provider_error"] == "missing_api_key"
    assert result["original_text"] == "Original sentence"


def test_write_action_blocks_style_request(monkeypatch) -> None:
    monkeypatch.setenv("HAW_ANTHROPIC_API_KEY", "")
    result = write_action(prompt="Please make font bold", selected_text="Original")
    assert result["ok"] is False
    assert result["reason"] == "style_request_blocked"


def test_write_action_respects_policy_override(monkeypatch) -> None:
    monkeypatch.setenv("HAW_ANTHROPIC_API_KEY", "")
    policy = Policy(guardrail=GuardrailPolicy(block_style_requests=False))
    result = write_action(prompt="Please make font bold", selected_text="Original", policy=policy)
    assert result["ok"] is True


def test_write_action_uses_llm_when_api_key_is_configured(monkeypatch) -> None:
    monkeypatch.setattr(
        "haw.agent.actions.load_settings",
        lambda: Settings(
            anthropic_api_key="test-key",
            auth_mode="local",
            env_path=Path(".env"),
        ),
    )
    monkeypatch.setattr(
        "haw.agent.actions.rewrite_with_claude",
        lambda **_: LLMResult(
            rewritten_text="LLM rewritten",
            thinking_summary="요구사항: test\n문맥 요약: test\n적용 규칙: test\n편집 계획: test",
            tags=["formal"],
        ),
    )

    result = write_action(
        prompt="Refine sentence",
        selected_text="Original sentence",
        context_text="Context sentence",
    )

    assert result["ok"] is True
    assert result["rewritten_text"] == "LLM rewritten"
    assert result["tags"] == ["formal"]
    assert result["provider"] == "anthropic"
    assert result["provider_error"] == ""


def test_write_action_variants_uses_llm_candidates_when_api_key_is_configured(monkeypatch) -> None:
    monkeypatch.setattr(
        "haw.agent.actions.load_settings",
        lambda: Settings(
            anthropic_api_key="test-key",
            auth_mode="local",
            env_path=Path(".env"),
        ),
    )
    monkeypatch.setattr(
        "haw.agent.actions.rewrite_with_claude_variants",
        lambda **_: [
            LLMResult(
                rewritten_text="Variant A",
                thinking_summary="요구사항: a\n문맥 요약: a\n적용 규칙: a\n편집 계획: a",
                tags=["formal"],
            ),
            LLMResult(
                rewritten_text="Variant B",
                thinking_summary="요구사항: b\n문맥 요약: b\n적용 규칙: b\n편집 계획: b",
                tags=["shorter"],
            ),
            LLMResult(
                rewritten_text="Variant A",
                thinking_summary="요구사항: dup\n문맥 요약: dup\n적용 규칙: dup\n편집 계획: dup",
                tags=["duplicate"],
            ),
        ],
    )

    result = write_action_variants(
        prompt="Refine sentence",
        selected_text="Original sentence",
        context_text="Context sentence",
        variants=3,
    )

    assert result["ok"] is True
    assert [item["rewritten_text"] for item in result["variants"]] == ["Variant A", "Variant B"]
    assert result["stats"]["variant_count"] == 2
    assert result["provider"] == "anthropic"
    assert result["provider_error"] == ""


def test_write_action_surfaces_provider_error_when_llm_fails(monkeypatch) -> None:
    monkeypatch.setattr(
        "haw.agent.actions.load_settings",
        lambda: Settings(
            anthropic_api_key="test-key",
            auth_mode="local",
            env_path=Path(".env"),
        ),
    )
    monkeypatch.setattr(
        "haw.agent.actions.rewrite_with_claude",
        lambda **_: (_ for _ in ()).throw(RuntimeError("provider unavailable")),
    )

    result = write_action(
        prompt="Refine sentence",
        selected_text="Original sentence",
        context_text="Context sentence",
    )

    assert result["ok"] is True
    assert result["provider"] == "local_fallback"
    assert result["provider_error"] == "provider unavailable"
