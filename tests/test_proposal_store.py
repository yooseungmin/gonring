from pathlib import Path

from haw.agent.proposal_store import ProposalStore, RewriteProposal, can_accept_proposal


def test_store_save_load_clear(tmp_path: Path) -> None:
    store = ProposalStore(path=tmp_path / "pending.json")
    proposal = RewriteProposal.create(
        prompt="Refine sentence",
        original_text="before",
        rewritten_text="after",
    )
    store.save(proposal)

    loaded = store.load()
    assert loaded is not None
    assert loaded.prompt == "Refine sentence"
    assert loaded.original_text == "before"
    assert loaded.rewritten_text == "after"

    assert store.clear() is True
    assert store.load() is None


def test_can_accept_requires_matching_selection() -> None:
    proposal = RewriteProposal.create(
        prompt="Refine sentence",
        original_text="before",
        rewritten_text="after",
    )

    ok, _ = can_accept_proposal(current_selection="before", proposal=proposal, force=False)
    assert ok

    ok, reason = can_accept_proposal(current_selection="changed", proposal=proposal, force=False)
    assert not ok
    assert "selection changed" in reason

    ok, _ = can_accept_proposal(current_selection="changed", proposal=proposal, force=True)
    assert ok
