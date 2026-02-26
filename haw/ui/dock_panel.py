from __future__ import annotations

from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

from haw.agent.actions import write_action
from haw.agent.proposal_store import ProposalStore, RewriteProposal, can_accept_proposal
from haw.agent.utils.diff_highlighter import compute_word_diff, count_changed_words
from haw.policy import Policy, load_policy
from haw.services.hwp_client import HwpClient


@dataclass(frozen=True)
class DockOptions:
    debug: bool = False


@dataclass
class DockPanelRenderer:
    # Mirrors text-tag semantics used in Tk-based rendering.
    tags: dict[str, dict[str, str | bool]] = field(
        default_factory=lambda: {
            "diff_del": {"fg": "#b91c1c", "overstrike": True},
            "diff_ins": {"fg": "#166534", "underline": True},
            "diff_eq": {"fg": "#6b7280"},
            "diff_ctx": {"fg": "#9ca3af"},
        }
    )
    lines: list[str] = field(default_factory=list)

    def append(self, text: str) -> None:
        if text:
            self.lines.append(text)

    def _append_diff_block(self, original: str, rewritten: str) -> None:
        self.append("=== Change Preview ===")
        tokens = compute_word_diff(original=original, rewritten=rewritten)
        rendered_parts: list[str] = []
        for tag, text in tokens:
            if not text:
                continue
            if tag == "delete":
                rendered_parts.append(f"[-{text}-]")
            elif tag == "insert":
                rendered_parts.append(f"[+{text}+]")
            else:
                rendered_parts.append(text)
        self.append(" ".join(rendered_parts).strip())
        self.append(f"[OK] {count_changed_words(tokens)} words changed")

    def append_diff_preview(self, original: str, rewritten: str) -> None:
        self._append_diff_block(original=original, rewritten=rewritten)

    def update_from_action_result(self, result: dict[str, Any]) -> None:
        rewritten = str(result.get("rewritten_text", "")).strip()
        message = str(result.get("message", "")).strip()
        self.append(message)
        if result.get("ok") and result.get("original_text") and rewritten:
            self._append_diff_block(
                original=str(result["original_text"]),
                rewritten=rewritten,
            )

    def dump(self) -> str:
        return "\n".join(self.lines)


class DockController:
    def __init__(
        self,
        *,
        client: HwpClient,
        store: ProposalStore,
        policy: Policy,
    ):
        self.client = client
        self.store = store
        self.policy = policy

    def propose(self, prompt: str) -> tuple[bool, str]:
        selection_result = self.client.read_selection_text()
        if not selection_result.ok:
            return False, selection_result.detail

        result = write_action(prompt=prompt, selected_text=selection_result.detail, policy=self.policy)
        if not result.get("ok"):
            return False, str(result.get("message", "rewrite blocked"))

        proposal = RewriteProposal.create(
            prompt=prompt,
            original_text=selection_result.detail,
            rewritten_text=str(result["rewritten_text"]),
        )
        self.store.save(proposal)

        panel = DockPanelRenderer()
        panel.update_from_action_result(result)
        return True, panel.dump()

    def show(self) -> tuple[bool, str]:
        proposal = self.store.load()
        if proposal is None:
            return False, "no pending proposal"

        panel = DockPanelRenderer()
        panel.append(f"created_at: {proposal.created_at}")
        panel.append(f"prompt: {proposal.prompt}")
        panel.append_diff_preview(original=proposal.original_text, rewritten=proposal.rewritten_text)
        return True, panel.dump()

    def accept(self, force: bool = False) -> tuple[bool, str]:
        proposal = self.store.load()
        if proposal is None:
            return False, "no pending proposal"

        track_result = self.client.ensure_track_changes_enabled(force=self.policy.hwp.force_track_changes)
        if self.policy.hwp.force_track_changes and not track_result.ok:
            return False, track_result.detail

        selection_result = self.client.read_selection_text()
        if not selection_result.ok:
            return False, selection_result.detail

        can_apply, reason = can_accept_proposal(
            current_selection=selection_result.detail,
            proposal=proposal,
            force=force,
        )
        if not can_apply:
            return False, reason

        replace_result = self.client.replace_selection_text(proposal.rewritten_text)
        if not replace_result.ok:
            return False, replace_result.detail

        self.store.clear()
        return True, "proposal accepted and applied"

    def reject(self) -> tuple[bool, str]:
        if not self.store.clear():
            return False, "no pending proposal"
        return True, "proposal rejected and cleared"


def _create_controller() -> DockController:
    policy = load_policy()
    client = HwpClient.connect(visible=True)
    store = ProposalStore(path=Path(".haw") / "pending_proposal.json")
    return DockController(client=client, store=store, policy=policy)


def run_dock(options: DockOptions) -> int:
    try:
        import tkinter as tk
        from tkinter import ttk
    except Exception:
        renderer = DockPanelRenderer()
        renderer.append("[HAW] dock mode unavailable (tkinter missing)")
        print(renderer.dump())
        return 1

    try:
        controller = _create_controller()
    except Exception as exc:
        print(f"[HAW] failed to start dock: {exc}")
        return 1

    root = tk.Tk()
    root.title("HAW Assistant")
    root.geometry("720x560")

    main = ttk.Frame(root, padding=12)
    main.pack(fill="both", expand=True)

    title = ttk.Label(main, text="HAW Rewrite Assistant")
    title.pack(anchor="w")

    prompt_label = ttk.Label(main, text="Prompt")
    prompt_label.pack(anchor="w", pady=(10, 2))

    prompt_var = tk.StringVar()
    prompt_entry = ttk.Entry(main, textvariable=prompt_var)
    prompt_entry.pack(fill="x")

    actions = ttk.Frame(main)
    actions.pack(fill="x", pady=10)

    output = tk.Text(main, wrap="word", height=20)
    output.pack(fill="both", expand=True)

    status_var = tk.StringVar(value="Ready")
    status_label = ttk.Label(main, textvariable=status_var)
    status_label.pack(anchor="w", pady=(8, 0))

    if options.debug:
        status_var.set("Ready (debug)")

    def set_output(text: str) -> None:
        output.delete("1.0", "end")
        output.insert("1.0", text)

    def on_propose() -> None:
        prompt = prompt_var.get().strip()
        if not prompt:
            status_var.set("Prompt is required")
            return
        ok, message = controller.propose(prompt=prompt)
        set_output(message)
        status_var.set("Proposal created" if ok else f"Error: {message}")

    def on_show() -> None:
        ok, message = controller.show()
        set_output(message)
        status_var.set("Proposal loaded" if ok else f"Error: {message}")

    def on_accept() -> None:
        ok, message = controller.accept(force=False)
        set_output(message)
        status_var.set("Applied" if ok else f"Error: {message}")

    def on_reject() -> None:
        ok, message = controller.reject()
        set_output(message)
        status_var.set("Rejected" if ok else f"Error: {message}")

    ttk.Button(actions, text="Propose", command=on_propose).pack(side="left", padx=(0, 8))
    ttk.Button(actions, text="Show", command=on_show).pack(side="left", padx=(0, 8))
    ttk.Button(actions, text="Accept", command=on_accept).pack(side="left", padx=(0, 8))
    ttk.Button(actions, text="Reject", command=on_reject).pack(side="left")

    root.mainloop()
    return 0
