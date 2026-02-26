from haw.actions import contains_style_request, decide_action, looks_like_table_text


def test_style_request_blocked() -> None:
    decision = decide_action("Please change the font", "abc")
    assert not decision.allowed
    assert decision.reason == "style_request_blocked"


def test_table_like_blocked() -> None:
    assert looks_like_table_text("a\tb\tc")
    decision = decide_action("Refine sentence", "a\tb\tc")
    assert not decision.allowed
    assert decision.reason == "table_safe_mode"


def test_plain_text_allowed() -> None:
    assert not contains_style_request("Refine this sentence")
    decision = decide_action("Refine this sentence", "plain text")
    assert decision.allowed
