from pathlib import Path

from haw.agent.proposal_store import ProposalStore
from haw.policy import Policy
from haw.ui.dock_panel import DockController


class _Result:
    def __init__(self, ok: bool, detail: str):
        self.ok = ok
        self.detail = detail


class FakeClient:
    def __init__(self, selected: str = "before"):
        self.selected = selected
        self.replaced: str | None = None

    def read_selection_text(self) -> _Result:
        return _Result(True, self.selected)

    def ensure_track_changes_enabled(self, force: bool = True) -> _Result:
        _ = force
        return _Result(True, "ok")

    def replace_selection_text(self, text: str) -> _Result:
        self.replaced = text
        return _Result(True, "replaced")


def test_dock_controller_propose_and_show(tmp_path: Path) -> None:
    store = ProposalStore(path=tmp_path / "proposal.json")
    controller = DockController(client=FakeClient("original"), store=store, policy=Policy())

    ok, msg = controller.propose(prompt="Refine sentence")
    assert ok
    assert "Change Preview" in msg

    ok, msg = controller.show()
    assert ok
    assert "prompt: Refine sentence" in msg


def test_dock_controller_accept_clears_store(tmp_path: Path) -> None:
    store = ProposalStore(path=tmp_path / "proposal.json")
    client = FakeClient("before")
    controller = DockController(client=client, store=store, policy=Policy())

    ok, _ = controller.propose(prompt="Refine sentence")
    assert ok

    ok, msg = controller.accept(force=False)
    assert ok
    assert "applied" in msg
    assert store.load() is None
    assert client.replaced is not None
