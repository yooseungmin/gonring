from pathlib import Path

from haw.agent.proposal_store import (
    ProposalStage,
    ProposalStore,
    RewriteCandidate,
    RewriteProposalGroup,
    build_apply_text,
    can_accept_proposal,
    transition_proposal,
)


def test_store_save_load_clear(tmp_path: Path) -> None:
    store = ProposalStore(path=tmp_path / "pending.json")
    proposal = RewriteProposalGroup.create(
        prompt="Refine sentence",
        original_text="before",
        candidates=[
            RewriteCandidate(
                rewritten_text="after",
                thinking_summary="summary",
                tags=["tag1", "tag2"],
            )
        ],
        scan_mode="page_scan",
        scan_pages_each_side=10,
        scanned_pages=3,
        scanned_chars=1200,
        stage_events=[
            ProposalStage(state="prompt_received", message="Prompt received"),
            ProposalStage(state="awaiting_user_decision", message="Review edit is ready."),
        ],
    )
    store.save(proposal)

    loaded = store.load()
    assert loaded is not None
    assert loaded.prompt == "Refine sentence"
    assert loaded.resolved_prompt == "Refine sentence"
    assert loaded.original_text == "before"
    assert loaded.target_mode == "selection_block"
    assert loaded.candidates[0].rewritten_text == "after"
    assert loaded.candidates[0].thinking_summary == "summary"
    assert loaded.candidates[0].tags == ["tag1", "tag2"]
    assert loaded.scan_mode == "page_scan"
    assert loaded.scan_pages_each_side == 10
    assert loaded.scanned_pages == 3
    assert loaded.scanned_chars == 1200
    assert loaded.current_state == "awaiting_user_decision"
    assert [item.state for item in loaded.stage_events] == [
        "prompt_received",
        "awaiting_user_decision",
    ]
    assert loaded.applied_index == 0
    assert loaded.applied_mode == ""

    assert store.clear() is True
    assert store.load() is None


def test_can_accept_requires_matching_selection() -> None:
    proposal = RewriteProposalGroup.create(
        prompt="Refine sentence",
        original_text="before",
        candidates=[
            RewriteCandidate(
                rewritten_text="after",
                thinking_summary="",
                tags=[],
            )
        ],
    )

    ok, _ = can_accept_proposal(current_selection="before", proposal=proposal, force=False)
    assert ok

    ok, reason = can_accept_proposal(current_selection="changed", proposal=proposal, force=False)
    assert not ok
    assert "selection changed" in reason

    ok, _ = can_accept_proposal(current_selection="changed", proposal=proposal, force=True)
    assert ok


def test_store_loads_resolved_prompt_from_legacy_payload(tmp_path: Path) -> None:
    store = ProposalStore(path=tmp_path / "pending.json")
    store.path.write_text(
        (
            '{'
            '"prompt": "Prompt", '
            '"original_text": "before", '
            '"candidates": [{"rewritten_text": "after", "thinking_summary": "", "tags": []}], '
            '"created_at": "2026-03-14T00:00:00+00:00"'
            '}'
        ),
        encoding="utf-8",
    )

    loaded = store.load()
    assert loaded is not None
    assert loaded.prompt == "Prompt"
    assert loaded.resolved_prompt == "Prompt"
    assert loaded.target_mode == "selection_block"
    assert loaded.current_state == "awaiting_user_decision"
    assert loaded.stage_events == []


def test_transition_proposal_updates_state_and_metadata() -> None:
    proposal = RewriteProposalGroup.create(
        prompt="Refine sentence",
        original_text="before",
        candidates=[
            RewriteCandidate(
                rewritten_text="after",
                thinking_summary="summary",
                tags=["tag1"],
            )
        ],
    )

    updated = transition_proposal(
        proposal,
        current_state="review_edit_applied",
        message="Review edit applied",
        selected_index=0,
        applied_index=1,
        applied_mode="replace",
    )

    assert updated.current_state == "review_edit_applied"
    assert updated.applied_index == 1
    assert updated.applied_mode == "replace"
    assert updated.stage_events[-1].message == "Review edit applied"


def test_build_apply_text_modes() -> None:
    ok, text, reason = build_apply_text(
        original_text="before",
        candidate_text="after",
        apply_mode="replace",
    )
    assert ok
    assert reason == "ok"
    assert text == "after"

    ok, text, reason = build_apply_text(
        original_text="before",
        candidate_text="after",
        apply_mode="insert_below",
    )
    assert ok
    assert reason == "ok"
    assert text == "before\nafter"

    ok, text, reason = build_apply_text(
        original_text="before",
        candidate_text="",
        apply_mode="replace",
    )
    assert not ok
    assert text == ""
    assert "empty" in reason
