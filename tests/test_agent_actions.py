from haw.agent.actions import write_action
from haw.policy import GuardrailPolicy, Policy


def test_write_action_includes_original_text() -> None:
    result = write_action(prompt="Refine sentence", selected_text="Original sentence")
    assert "original_text" in result
    assert "rewritten_text" in result
    assert result["original_text"] == "Original sentence"


def test_write_action_blocks_style_request() -> None:
    result = write_action(prompt="Please make font bold", selected_text="Original")
    assert result["ok"] is False
    assert result["reason"] == "style_request_blocked"


def test_write_action_respects_policy_override() -> None:
    policy = Policy(guardrail=GuardrailPolicy(block_style_requests=False))
    result = write_action(prompt="Please make font bold", selected_text="Original", policy=policy)
    assert result["ok"] is True
