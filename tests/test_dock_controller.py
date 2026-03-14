from pathlib import Path

from haw.agent.proposal_store import ProposalStore, RewriteCandidate, RewriteProposalGroup
from haw.policy import Policy
from haw.ui.dock_panel import DockController, DockPanelRenderer, _build_status_text
from haw.services.hwp_client import HwpContextResult


class _Result:
    def __init__(self, ok: bool, detail: str):
        self.ok = ok
        self.detail = detail


class FakeClient:
    def __init__(self, selected: str = "before"):
        self.selected = selected
        self.replaced: str | None = None
        self.accepted_revisions = False
        self.discarded_revisions = False
        self.resolved_caret = False

    def read_selection_text(self) -> _Result:
        if not self.selected.strip():
            return _Result(False, "E_EMPTY_SELECTION: no selected text found")
        return _Result(True, self.selected)

    def resolve_caret_selection(self) -> _Result:
        self.resolved_caret = True
        self.selected = "before"
        return _Result(True, self.selected)

    def read_context(self, *, scan_pages_each_side: int = 0, on_stage=None) -> HwpContextResult:
        if on_stage is not None:
            on_stage("Selection detected")
        return HwpContextResult(
            ok=True,
            detail="selection_only",
            selection=self.selected,
            context=self.selected,
            blocks=[self.selected],
            scan_mode="selection_only",
            target_mode="selection_block",
            scan_pages_each_side=scan_pages_each_side,
            scanned_pages=0,
            scanned_chars=len(self.selected),
            anchor_restored=True,
        )

    def ensure_track_changes_enabled(self, force: bool = True) -> _Result:
        _ = force
        return _Result(True, "ok")

    def replace_selection_text(self, text: str) -> _Result:
        self.replaced = text
        return _Result(True, "replaced")

    def accept_selected_revisions(self) -> _Result:
        self.accepted_revisions = True
        return _Result(True, "accepted")

    def discard_last_review_edit(self) -> _Result:
        self.discarded_revisions = True
        return _Result(True, "discarded")


def test_dock_controller_propose_and_show(tmp_path: Path) -> None:
    store = ProposalStore(path=tmp_path / "proposal.json")
    controller = DockController(client=FakeClient("original"), store=store, policy=Policy())

    ok, msg = controller.propose(prompt="Refine sentence", scan_pages_each_side=10)
    assert ok
    assert "=== Target ===" in msg
    assert "=== Journey ===" in msg
    assert "current_state: awaiting_user_decision" in msg
    assert "Change Preview" in msg

    ok, msg = controller.show()
    assert ok
    assert "prompt: Refine sentence" in msg


def test_dock_controller_accept_moves_to_review_edit_applied(tmp_path: Path) -> None:
    store = ProposalStore(path=tmp_path / "proposal.json")
    client = FakeClient("before")
    controller = DockController(client=client, store=store, policy=Policy())

    ok, _ = controller.propose(prompt="Refine sentence", scan_pages_each_side=10)
    assert ok

    ok, msg = controller.accept(force=False)
    assert ok
    assert "mode=replace" in msg
    assert "current_state: review_edit_applied" in msg
    proposal = store.load()
    assert proposal is not None
    assert proposal.current_state == "review_edit_applied"
    assert proposal.applied_index == 1
    assert proposal.applied_mode == "replace"
    assert client.replaced is not None


def test_dock_controller_finalize_clears_store_after_review_edit(tmp_path: Path) -> None:
    store = ProposalStore(path=tmp_path / "proposal.json")
    client = FakeClient("before")
    controller = DockController(client=client, store=store, policy=Policy())

    ok, _ = controller.propose(prompt="Refine sentence", scan_pages_each_side=10)
    assert ok
    ok, _ = controller.accept(force=False)
    assert ok

    ok, msg = controller.finalize()
    assert ok
    assert "approved and proposal cleared" in msg
    assert store.load() is None
    assert client.accepted_revisions is True


def test_dock_controller_regenerate_reuses_saved_prompt(tmp_path: Path) -> None:
    store = ProposalStore(path=tmp_path / "proposal.json")
    controller = DockController(client=FakeClient("before"), store=store, policy=Policy())

    ok, _ = controller.propose(prompt="Refine sentence", scan_pages_each_side=4)
    assert ok

    proposal = store.load()
    assert proposal is not None
    assert proposal.resolved_prompt == "Refine sentence"

    ok, msg = controller.regenerate(scan_pages_each_side=2)
    assert ok
    assert "Proposal 1/" in msg

    regenerated = store.load()
    assert regenerated is not None
    assert regenerated.resolved_prompt == "Refine sentence"
    assert regenerated.scan_pages_each_side == 2


def test_dock_controller_accept_supports_edited_insert_below(tmp_path: Path) -> None:
    store = ProposalStore(path=tmp_path / "proposal.json")
    client = FakeClient("before")
    controller = DockController(client=client, store=store, policy=Policy())

    ok, _ = controller.propose(prompt="Refine sentence", scan_pages_each_side=1)
    assert ok

    ok, msg = controller.accept(
        force=False,
        index=1,
        edited_text="edited after",
        apply_mode="insert_below",
    )
    assert ok
    assert "mode=insert_below" in msg
    assert client.replaced == "before\nedited after"


def test_dock_controller_cancel_discards_review_edit(tmp_path: Path) -> None:
    store = ProposalStore(path=tmp_path / "proposal.json")
    client = FakeClient("before")
    controller = DockController(client=client, store=store, policy=Policy())

    ok, _ = controller.propose(prompt="Refine sentence", scan_pages_each_side=1)
    assert ok
    ok, _ = controller.accept(force=False)
    assert ok

    ok, msg = controller.cancel()
    assert ok
    assert "cancelled and cleared" in msg
    assert store.load() is None
    assert client.discarded_revisions is True


def test_dock_controller_accept_re_resolves_caret_selection(tmp_path: Path) -> None:
    store = ProposalStore(path=tmp_path / "proposal.json")
    client = FakeClient("")
    controller = DockController(client=client, store=store, policy=Policy())
    store.save(
        RewriteProposalGroup.create(
            prompt="Refine sentence",
            original_text="before",
            candidates=[
                RewriteCandidate(
                    rewritten_text="after",
                    thinking_summary="summary",
                    tags=[],
                )
            ],
            target_mode="caret_resolved_block",
        )
    )

    ok, msg = controller.accept(force=False)
    assert ok
    assert "review_edit_applied" in msg
    assert client.resolved_caret is True


def test_build_status_text() -> None:
    assert _build_status_text("propose", True, "created") == "[OK] propose: created"
    assert _build_status_text("accept", False, "failed") == "[ERR] accept: failed"


def test_renderer_shows_provider_error_for_variant_results() -> None:
    panel = DockPanelRenderer()
    panel.update_from_action_variants_result(
        {
            "ok": True,
            "message": "Write action completed with local fallback.",
            "provider": "local_fallback",
            "provider_error": "provider unavailable",
            "variants": [
                {
                    "rewritten_text": "after",
                    "thinking_summary": "summary",
                    "tags": ["tag1"],
                }
            ],
        },
        "before",
    )

    rendered = panel.dump()
    assert "=== Provider ===" in rendered
    assert "provider unavailable" in rendered


def test_renderer_append_target() -> None:
    panel = DockPanelRenderer()
    panel.append_target("caret_anchor", True)
    rendered = panel.dump()
    assert "mode: caret_anchor" in rendered
    assert "anchor restored: yes" in rendered


def test_renderer_append_stage_timeline_and_next_actions() -> None:
    from haw.agent.proposal_store import ProposalStage

    panel = DockPanelRenderer()
    panel.append_stage_timeline(
        [
            ProposalStage(state="prompt_received", message="Prompt received"),
            ProposalStage(state="awaiting_user_decision", message="Choose apply"),
        ],
        "awaiting_user_decision",
    )
    panel.append_next_actions("awaiting_user_decision")
    rendered = panel.dump()
    assert "=== Journey ===" in rendered
    assert "[prompt_received] Prompt received" in rendered
    assert "=== Next Step ===" in rendered
    assert "cancel pending proposal" in rendered
