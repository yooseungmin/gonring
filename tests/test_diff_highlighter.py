from haw.agent.utils.diff_highlighter import compute_word_diff, count_changed_words


def test_compute_word_diff_has_insert_delete() -> None:
    tokens = compute_word_diff("a b c", "a x c")
    tags = [t[0] for t in tokens]
    assert "delete" in tags
    assert "insert" in tags
    assert count_changed_words(tokens) >= 2


def test_compute_word_diff_collapse_equal_context() -> None:
    original = " ".join(["w"] * 40)
    rewritten = original
    tokens = compute_word_diff(original, rewritten)
    assert any(tag == "context" for tag, _ in tokens)
