from __future__ import annotations

from dataclasses import dataclass, field
from pathlib import Path
from typing import Any
from typing import Callable

from haw.agent.actions import write_action_variants
from haw.agent.presets import PRESETS, PRESET_BY_KEY, resolve_prompt
from haw.agent.proposal_store import (
    ProposalStage,
    ProposalStore,
    RewriteCandidate,
    RewriteProposalGroup,
    build_apply_text,
    build_proposal_stage,
    can_accept_proposal,
    select_candidate,
    transition_proposal,
)
from haw.agent.utils.diff_highlighter import compute_word_diff, count_changed_words
from haw.policy import Policy, load_policy
from haw.services.hwp_client import HwpClient


@dataclass(frozen=True)
class DockOptions:
    debug: bool = False


DEFAULT_VARIANTS = 3
APPLY_MODES = ("replace", "insert_below")


@dataclass
class DockPanelRenderer:
    lines: list[str] = field(default_factory=list)

    def append(self, text: str) -> None:
        if text:
            self.lines.append(text)

    def append_section(self, title: str, body: str) -> None:
        body = body.strip()
        if not body:
            return
        self.append(f"=== {title} ===")
        self.append(body)

    def append_tags(self, tags: list[str]) -> None:
        cleaned = [tag.strip() for tag in tags if tag.strip()]
        if not cleaned:
            return
        self.append_section("Tag Suggestions", ", ".join(cleaned))

    def append_provider(self, provider: str, provider_error: str = "") -> None:
        provider = provider.strip()
        provider_error = provider_error.strip()
        if not provider and not provider_error:
            return
        body = provider or "unknown"
        if provider_error:
            body = f"{body}\n{provider_error}"
        self.append_section("Provider", body)

    def append_target(self, target_mode: str, anchor_restored: bool) -> None:
        mode = target_mode.strip() or "unknown"
        restored = "yes" if anchor_restored else "no"
        self.append_section("Target", f"mode: {mode}\nanchor restored: {restored}")

    def append_stage_timeline(self, stage_events: list[ProposalStage], current_state: str) -> None:
        if not stage_events:
            return
        lines: list[str] = []
        for item in stage_events:
            message = item.message.strip()
            if not message:
                continue
            lines.append(f"[{item.state}] {message}")
        if not lines:
            return
        lines.append(f"current_state: {current_state.strip() or 'unknown'}")
        self.append_section("Journey", "\n".join(lines))

    def append_next_actions(self, current_state: str) -> None:
        state = current_state.strip() or "unknown"
        if state == "awaiting_user_decision":
            body = "apply review edit\nregenerate from same target\ncancel pending proposal"
        elif state == "review_edit_applied":
            body = "approve review edit\nregenerate with a follow-up prompt\ncancel review edit"
        elif state == "accepted":
            body = "review edit applied\nfinalize revisions when ready"
        elif state == "cancelled":
            body = "proposal cleared"
        else:
            body = state
        self.append_section("Next Step", body)

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
        self.append_provider(
            str(result.get("provider", "")),
            str(result.get("provider_error", "")),
        )
        self.append_section("AI Summary", str(result.get("thinking_summary", "")))
        tags = result.get("tags", [])
        if isinstance(tags, list):
            self.append_tags([str(tag) for tag in tags])
        if result.get("ok") and result.get("original_text") and rewritten:
            self._append_diff_block(
                original=str(result["original_text"]),
                rewritten=rewritten,
            )

    def append_candidate(
        self,
        *,
        index: int,
        total: int,
        original: str,
        candidate: RewriteCandidate,
    ) -> None:
        self.append(f"=== Proposal {index}/{total} ===")
        if candidate.thinking_summary:
            self.append_section("AI Summary", candidate.thinking_summary)
        self.append_tags(candidate.tags)
        self._append_diff_block(original=original, rewritten=candidate.rewritten_text)

    def append_candidate_summary(
        self,
        *,
        index: int,
        total: int,
        candidate: RewriteCandidate,
    ) -> None:
        self.append(f"=== Proposal {index}/{total} ===")
        if candidate.thinking_summary:
            self.append_section("AI Summary", candidate.thinking_summary)
        self.append_tags(candidate.tags)
        self.append("[preview hidden]")

    def update_from_action_variants_result(self, result: dict[str, Any], original: str) -> None:
        message = str(result.get("message", "")).strip()
        self.append(message)
        self.append_provider(
            str(result.get("provider", "")),
            str(result.get("provider_error", "")),
        )
        variants = result.get("variants", [])
        candidates = [item for item in variants if isinstance(item, dict)]
        total = len(candidates)
        for idx, item in enumerate(candidates, start=1):
            candidate = RewriteCandidate(
                rewritten_text=str(item.get("rewritten_text", "")),
                thinking_summary=str(item.get("thinking_summary", "")),
                tags=[str(tag) for tag in item.get("tags", []) if str(tag).strip()],
            )
            self.append_candidate(
                index=idx,
                total=total,
                original=original,
                candidate=candidate,
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

    def propose(
        self,
        prompt: str,
        scan_pages_each_side: int,
        preset_label: str = "",
        show_preview: bool = True,
        on_stage: Callable[[str], None] | None = None,
    ) -> tuple[bool, str]:
        stage_events: list[ProposalStage] = []

        def record_stage(state: str, message: str) -> None:
            event = build_proposal_stage(state, message)
            if not event.message:
                return
            stage_events.append(event)
            if on_stage is not None:
                on_stage(event.message)

        record_stage("prompt_received", "Prompt received")
        context_result = self.client.read_context(
            scan_pages_each_side=scan_pages_each_side,
            on_stage=lambda message: record_stage(
                "scanning_context" if "scan" in message.lower() else "target_resolved",
                message,
            ),
        )
        if not context_result.ok:
            return False, context_result.detail
        if context_result.target_mode == "caret_anchor" and not context_result.selection.strip():
            return False, "caret anchor detected; automatic block resolution is not implemented yet. select text first"
        record_stage("context_understood", "Context understood")

        result = write_action_variants(
            prompt=prompt,
            selected_text=context_result.selection,
            context_text=context_result.context,
            scan_mode=context_result.scan_mode,
            scan_pages_each_side=context_result.scan_pages_each_side,
            policy=self.policy,
            variants=DEFAULT_VARIANTS,
        )
        record_stage("edit_plan_ready", "Editing plan ready")
        if not result.get("ok"):
            return False, str(result.get("message", "rewrite blocked"))
        record_stage("awaiting_user_decision", "Review edit is ready. Choose apply, regenerate, or cancel.")

        variants_payload = result.get("variants", [])
        candidates = [
            RewriteCandidate(
                rewritten_text=str(item.get("rewritten_text", "")),
                thinking_summary=str(item.get("thinking_summary", "")),
                tags=[str(tag) for tag in item.get("tags", []) if str(tag).strip()],
            )
            for item in variants_payload
            if isinstance(item, dict)
        ]
        proposal = RewriteProposalGroup.create(
            prompt=prompt,
            resolved_prompt=prompt,
            original_text=context_result.selection,
            candidates=candidates,
            scan_mode=context_result.scan_mode,
            target_mode=context_result.target_mode,
            scan_pages_each_side=context_result.scan_pages_each_side,
            scanned_pages=context_result.scanned_pages,
            scanned_chars=context_result.scanned_chars,
            selected_index=0,
            preset_label=preset_label,
            current_state="awaiting_user_decision",
            stage_events=stage_events,
        )
        self.store.save(proposal)

        panel = DockPanelRenderer()
        panel.append_target(
            context_result.target_mode,
            context_result.anchor_restored,
        )
        panel.append_section(
            "Scan",
            (
                f"{context_result.scan_mode} "
                f"(pages each side: {context_result.scan_pages_each_side}, "
                f"scanned pages: {context_result.scanned_pages}, "
                f"scanned chars: {context_result.scanned_chars})"
            ),
        )
        panel.append_stage_timeline(proposal.stage_events, proposal.current_state)
        panel.append_next_actions(proposal.current_state)
        if proposal.preset_label:
            panel.append(f"preset: {proposal.preset_label}")
        total = len(proposal.candidates)
        for idx, candidate in enumerate(proposal.candidates, start=1):
            if show_preview:
                panel.append_candidate(
                    index=idx,
                    total=total,
                    original=proposal.original_text,
                    candidate=candidate,
                )
            else:
                panel.append_candidate_summary(
                    index=idx,
                    total=total,
                    candidate=candidate,
                )
        return True, panel.dump()

    def regenerate(
        self,
        scan_pages_each_side: int | None = None,
        show_preview: bool = True,
        on_stage: Callable[[str], None] | None = None,
    ) -> tuple[bool, str]:
        proposal = self.store.load()
        if proposal is None:
            return False, "no pending proposal"

        prompt = proposal.resolved_prompt.strip() or proposal.prompt.strip()
        if not prompt:
            return False, "no prompt available to regenerate"

        target_scan_pages = proposal.scan_pages_each_side if scan_pages_each_side is None else scan_pages_each_side
        return self.propose(
            prompt=prompt,
            scan_pages_each_side=max(0, int(target_scan_pages)),
            preset_label=proposal.preset_label,
            show_preview=show_preview,
            on_stage=on_stage,
        )

    def show(self, show_preview: bool = True) -> tuple[bool, str]:
        proposal = self.store.load()
        if proposal is None:
            return False, "no pending proposal"

        panel = DockPanelRenderer()
        panel.append(f"created_at: {proposal.created_at}")
        panel.append(f"prompt: {proposal.prompt}")
        panel.append_target(
            proposal.target_mode,
            True,
        )
        panel.append_section(
            "Scan",
            (
                f"{proposal.scan_mode} "
                f"(pages each side: {proposal.scan_pages_each_side}, "
                f"scanned pages: {proposal.scanned_pages}, "
                f"scanned chars: {proposal.scanned_chars})"
            ),
        )
        panel.append_stage_timeline(proposal.stage_events, proposal.current_state)
        panel.append_next_actions(proposal.current_state)
        if proposal.preset_label:
            panel.append(f"preset: {proposal.preset_label}")
        total = len(proposal.candidates)
        for idx, candidate in enumerate(proposal.candidates, start=1):
            if show_preview:
                panel.append_candidate(
                    index=idx,
                    total=total,
                    original=proposal.original_text,
                    candidate=candidate,
                )
            else:
                panel.append_candidate_summary(
                    index=idx,
                    total=total,
                    candidate=candidate,
                )
        return True, panel.dump()

    def accept(
        self,
        force: bool = False,
        index: int = 1,
        edited_text: str = "",
        apply_mode: str = "replace",
    ) -> tuple[bool, str]:
        proposal = self.store.load()
        if proposal is None:
            return False, "no pending proposal"
        if proposal.current_state == "review_edit_applied":
            return False, "review edit already applied; approve or cancel before applying again"

        track_result = self.client.ensure_track_changes_enabled(force=self.policy.hwp.force_track_changes)
        if self.policy.hwp.force_track_changes and not track_result.ok:
            return False, track_result.detail

        selection_result = self.client.read_selection_text()
        if (
            not selection_result.ok
            and proposal.target_mode == "caret_resolved_block"
            and selection_result.detail.startswith("E_EMPTY_SELECTION")
        ):
            selection_result = self.client.resolve_caret_selection()
        if not selection_result.ok:
            return False, selection_result.detail

        can_apply, reason = can_accept_proposal(
            current_selection=selection_result.detail,
            proposal=proposal,
            force=force,
        )
        if not can_apply:
            return False, reason

        ok, candidate, reason = select_candidate(proposal=proposal, index=index)
        if not ok or candidate is None:
            return False, reason

        candidate_text = edited_text.strip() or candidate.rewritten_text
        ok, apply_text, reason = build_apply_text(
            original_text=proposal.original_text,
            candidate_text=candidate_text,
            apply_mode=apply_mode,
        )
        if not ok:
            return False, reason

        replace_result = self.client.replace_selection_text(apply_text)
        if not replace_result.ok:
            return False, replace_result.detail
        updated = transition_proposal(
            proposal,
            current_state="review_edit_applied",
            message="Review edit was applied in the document. Choose approve, regenerate, or cancel.",
            selected_index=index - 1,
            applied_index=index,
            applied_mode=apply_mode,
        )
        self.store.save(updated)
        panel = DockPanelRenderer()
        panel.append(f"proposal #{index} applied with mode={apply_mode}")
        panel.append_stage_timeline(updated.stage_events, updated.current_state)
        panel.append_next_actions(updated.current_state)
        return True, panel.dump()

    def finalize(self) -> tuple[bool, str]:
        proposal = self.store.load()
        if proposal is None:
            return False, "no pending proposal"
        if proposal.current_state != "review_edit_applied":
            return False, "no applied review edit to approve"
        result = self.client.accept_selected_revisions()
        if not result.ok:
            return False, result.detail
        self.store.clear()
        return True, "review edit approved and proposal cleared"

    def status(self) -> tuple[bool, str]:
        result = self.client.check_revision_marks()
        if not result.ok:
            return False, result.detail
        if result.detail in ("True", "False"):
            return True, f"revisions present: {result.detail}"
        return True, "revisions present: unknown"

    def reject(self) -> tuple[bool, str]:
        proposal = self.store.load()
        if proposal is None:
            return False, "no pending proposal"
        if proposal.current_state == "review_edit_applied":
            result = self.client.discard_last_review_edit()
            if not result.ok:
                return False, result.detail
        self.store.clear()
        return True, "proposal cancelled and cleared"

    def cancel(self) -> tuple[bool, str]:
        return self.reject()


def _create_controller() -> DockController:
    policy = load_policy()
    client = HwpClient.connect(visible=True)
    store = ProposalStore(path=Path(".haw") / "pending_proposal.json")
    return DockController(client=client, store=store, policy=policy)


def _build_status_text(action: str, ok: bool, detail: str = "") -> str:
    label = "OK" if ok else "ERR"
    if detail:
        return f"[{label}] {action}: {detail}"
    return f"[{label}] {action}"


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
    root.geometry("880x640")
    root.minsize(760, 520)

    main = ttk.Frame(root, padding=12)
    main.pack(fill="both", expand=True)
    main.columnconfigure(0, weight=1)
    main.rowconfigure(9, weight=1)

    title = ttk.Label(main, text="HAW Rewrite Assistant")
    title.grid(row=0, column=0, sticky="w")

    shortcut_hint = ttk.Label(
        main,
        text="Ctrl+Enter Propose | Ctrl+R Regenerate | F5 Show | Ctrl+Y Apply | Ctrl+N Cancel | Esc Exit",
    )
    shortcut_hint.grid(row=1, column=0, sticky="w", pady=(2, 10))

    prompt_label = ttk.Label(main, text="Prompt")
    prompt_label.grid(row=2, column=0, sticky="w")

    prompt = tk.Text(main, wrap="word", height=4)
    prompt.grid(row=3, column=0, sticky="nsew", pady=(2, 10))

    preset_frame = ttk.Frame(main)
    preset_frame.grid(row=4, column=0, sticky="w", pady=(0, 6))

    preset_label = ttk.Label(preset_frame, text="Preset")
    preset_label.pack(side="left")

    preset_labels = [preset.label for preset in PRESETS]
    preset_lookup = {preset.label: preset.key for preset in PRESETS}
    preset_var = tk.StringVar(value=PRESET_BY_KEY["custom"].label)
    preset_entry = ttk.Combobox(
        preset_frame,
        values=preset_labels,
        textvariable=preset_var,
        state="readonly",
        width=22,
    )
    preset_entry.pack(side="left", padx=(8, 0))

    preset_help_button = ttk.Button(preset_frame, text="ⓘ")
    preset_help_button.pack(side="left", padx=(6, 0))

    quick_frame = ttk.Frame(main)
    quick_frame.grid(row=5, column=0, sticky="w", pady=(0, 6))

    quick_label = ttk.Label(quick_frame, text="Quick")
    quick_label.pack(side="left")

    quick_presets = [
        PRESET_BY_KEY["tone_formal"],
        PRESET_BY_KEY["tone_friendly"],
        PRESET_BY_KEY["shorter"],
        PRESET_BY_KEY["longer"],
        PRESET_BY_KEY["grammar"],
        PRESET_BY_KEY["summary"],
    ]
    def set_prompt_text(text: str) -> None:
        prompt.delete("1.0", "end")
        prompt.insert("1.0", text)

    def build_preset_help_text() -> str:
        lines: list[str] = []
        for preset in PRESETS:
            lines.append(f"[{preset.label}]")
            if preset.template.strip():
                lines.append(preset.template.strip())
            else:
                lines.append("자유 입력 프롬프트를 사용합니다.")
            lines.append("")
        return "\n".join(lines).strip()

    def show_preset_help() -> None:
        help_window = tk.Toplevel(root)
        help_window.title("Preset Guide")
        help_window.geometry("640x520")
        help_window.minsize(520, 420)

        container = ttk.Frame(help_window, padding=12)
        container.pack(fill="both", expand=True)
        container.columnconfigure(0, weight=1)
        container.rowconfigure(0, weight=1)

        text = tk.Text(container, wrap="word")
        text.grid(row=0, column=0, sticky="nsew")
        text.insert("1.0", build_preset_help_text())
        text.config(state="disabled")

        close = ttk.Button(container, text="Close", command=help_window.destroy)
        close.grid(row=1, column=0, sticky="e", pady=(10, 0))

    def apply_preset_key(key: str, fill_prompt: bool = True) -> None:
        preset_var.set(PRESET_BY_KEY[key].label)
        if fill_prompt:
            template = PRESET_BY_KEY[key].template.strip()
            if template:
                set_prompt_text(template)

    for preset in quick_presets:
        ttk.Button(
            quick_frame,
            text=preset.label,
            command=lambda key=preset.key: apply_preset_key(key),
        ).pack(side="left", padx=(6, 0))

    scan_frame = ttk.Frame(main)
    scan_frame.grid(row=6, column=0, sticky="w", pady=(0, 6))

    scan_label = ttk.Label(scan_frame, text="Scan pages (each side)")
    scan_label.pack(side="left")

    scan_var = tk.StringVar(value="10")
    scan_entry = ttk.Entry(scan_frame, width=6, textvariable=scan_var)
    scan_entry.pack(side="left", padx=(8, 0))

    apply_frame = ttk.Frame(main)
    apply_frame.grid(row=7, column=0, sticky="w", pady=(0, 6))

    apply_label = ttk.Label(apply_frame, text="Apply proposal #")
    apply_label.pack(side="left")

    apply_var = tk.StringVar(value="1")
    apply_entry = ttk.Entry(apply_frame, width=6, textvariable=apply_var)
    apply_entry.pack(side="left", padx=(8, 0))

    mode_label = ttk.Label(apply_frame, text="Mode")
    mode_label.pack(side="left", padx=(12, 0))

    mode_var = tk.StringVar(value="replace")
    mode_entry = ttk.Combobox(
        apply_frame,
        values=list(APPLY_MODES),
        textvariable=mode_var,
        state="readonly",
        width=14,
    )
    mode_entry.pack(side="left", padx=(8, 0))

    load_button = ttk.Button(apply_frame, text="Load")
    load_button.pack(side="left", padx=(8, 0))

    preview_var = tk.BooleanVar(value=False)
    preview_check = ttk.Checkbutton(
        apply_frame,
        text="Show preview",
        variable=preview_var,
    )
    preview_check.pack(side="left", padx=(12, 0))

    editor_label = ttk.Label(main, text="Editable proposal text")
    editor_label.grid(row=8, column=0, sticky="w", pady=(6, 2))

    body = ttk.Panedwindow(main, orient="vertical")
    body.grid(row=9, column=0, sticky="nsew")

    actions = ttk.Frame(body, padding=6)
    body.add(actions, weight=0)

    editor = tk.Text(body, wrap="word", height=10)
    body.add(editor, weight=1)

    output = tk.Text(body, wrap="word", height=20)
    body.add(output, weight=1)

    status_frame = ttk.Frame(main)
    status_frame.grid(row=10, column=0, sticky="ew", pady=(10, 0))

    status_var = tk.StringVar(value="[OK] ready")
    status_label = ttk.Label(status_frame, textvariable=status_var)
    status_label.pack(side="left")

    force_var = tk.BooleanVar(value=False)
    force_check = ttk.Checkbutton(status_frame, text="Force apply", variable=force_var)
    force_check.pack(side="right")

    if options.debug:
        status_var.set("[OK] ready (debug)")

    def set_output(text: str) -> None:
        output.delete("1.0", "end")
        output.insert("1.0", text)

    def set_editor_text(text: str) -> None:
        editor.delete("1.0", "end")
        editor.insert("1.0", text)

    def report_stage(message: str) -> None:
        status_var.set(f"[OK] thinking: {message}")
        root.update_idletasks()

    def get_prompt_text() -> str:
        return prompt.get("1.0", "end").strip()

    def get_editor_text() -> str:
        return editor.get("1.0", "end").strip()

    def on_preset_selected(_event: object) -> None:
        label = preset_var.get().strip()
        key = preset_lookup.get(label, "custom")
        if key == "custom":
            return
        apply_preset_key(key)

    def get_scan_pages() -> int:
        value = scan_var.get().strip()
        if not value:
            return 10
        return max(0, int(value))

    def get_preset_key() -> str:
        label = preset_var.get().strip()
        return preset_lookup.get(label, "custom")

    def get_apply_index() -> int:
        value = apply_var.get().strip()
        if not value:
            return 1
        return max(1, int(value))

    def get_apply_mode() -> str:
        value = mode_var.get().strip().lower()
        if value in APPLY_MODES:
            return value
        return "replace"

    def load_current_candidate() -> tuple[bool, str]:
        proposal = controller.store.load()
        if proposal is None:
            return False, "no pending proposal"
        try:
            index = get_apply_index()
        except Exception:
            return False, "proposal # must be a number"
        ok, candidate, reason = select_candidate(proposal=proposal, index=index)
        if not ok or candidate is None:
            return False, reason
        set_editor_text(candidate.rewritten_text)
        return True, f"proposal #{index} loaded into editor"

    def on_propose() -> None:
        prompt_text = get_prompt_text()
        preset_key = get_preset_key()
        resolved_prompt, preset_label_value = resolve_prompt(
            preset_key=preset_key,
            user_prompt=prompt_text,
        )
        if not resolved_prompt:
            status_var.set(_build_status_text("propose", False, "prompt is required"))
            return
        try:
            scan_pages = get_scan_pages()
        except Exception:
            status_var.set(_build_status_text("propose", False, "scan pages must be a number"))
            return
        ok, message = controller.propose(
            prompt=resolved_prompt,
            scan_pages_each_side=scan_pages,
            preset_label=preset_label_value,
            show_preview=bool(preview_var.get()),
            on_stage=report_stage,
        )
        set_output(message)
        load_current_candidate()
        status_var.set(
            _build_status_text(
                "propose",
                ok,
                f"proposal created ({preset_label_value})" if ok else message,
            )
        )

    def on_show() -> None:
        ok, message = controller.show(show_preview=bool(preview_var.get()))
        set_output(message)
        if ok:
            load_current_candidate()
        status_var.set(_build_status_text("show", ok, "proposal loaded" if ok else message))

    def on_regenerate() -> None:
        try:
            scan_pages = get_scan_pages()
        except Exception:
            status_var.set(_build_status_text("regenerate", False, "scan pages must be a number"))
            return
        ok, message = controller.regenerate(
            scan_pages_each_side=scan_pages,
            show_preview=bool(preview_var.get()),
            on_stage=report_stage,
        )
        set_output(message)
        if ok:
            load_current_candidate()
        status_var.set(_build_status_text("regenerate", ok, "proposal regenerated" if ok else message))

    def on_load_candidate() -> None:
        ok, message = load_current_candidate()
        if ok:
            status_var.set(_build_status_text("load", True, message))
            return
        status_var.set(_build_status_text("load", False, message))

    def on_accept() -> None:
        try:
            index = get_apply_index()
        except Exception:
            status_var.set(_build_status_text("accept", False, "proposal # must be a number"))
            return
        ok, message = controller.accept(
            force=bool(force_var.get()),
            index=index,
            edited_text=get_editor_text(),
            apply_mode=get_apply_mode(),
        )
        set_output(message)
        status_note = "applied" if ok else message
        status_ok, status_msg = controller.status()
        if status_ok:
            status_note = f"{status_note} | {status_msg}"
        status_var.set(_build_status_text("accept", ok, status_note))

    def on_cancel() -> None:
        ok, message = controller.cancel()
        set_output(message)
        status_var.set(_build_status_text("cancel", ok, "cleared" if ok else message))

    def on_finalize() -> None:
        ok, message = controller.finalize()
        set_output(message)
        status_note = "applied" if ok else message
        status_ok, status_msg = controller.status()
        if status_ok:
            status_note = f"{status_note} | {status_msg}"
        status_var.set(_build_status_text("finalize", ok, status_note))

    def on_status() -> None:
        ok, message = controller.status()
        set_output(message)
        status_var.set(_build_status_text("status", ok, message if ok else message))

    ttk.Button(actions, text="Propose", command=on_propose).pack(side="left", padx=(0, 8))
    ttk.Button(actions, text="Regenerate", command=on_regenerate).pack(side="left", padx=(0, 8))
    load_button.configure(command=on_load_candidate)
    ttk.Button(actions, text="Show", command=on_show).pack(side="left", padx=(0, 8))
    ttk.Button(actions, text="Apply", command=on_accept).pack(side="left", padx=(0, 8))
    ttk.Button(actions, text="Cancel", command=on_cancel).pack(side="left", padx=(0, 8))
    ttk.Button(actions, text="Approve", command=on_finalize).pack(side="left", padx=(0, 8))
    ttk.Button(actions, text="Status", command=on_status).pack(side="left")

    # Keyboard-first workflow for editor users.
    root.bind("<Control-Return>", lambda _e: on_propose())
    root.bind("<Control-r>", lambda _e: on_regenerate())
    root.bind("<F5>", lambda _e: on_show())
    root.bind("<Control-y>", lambda _e: on_accept())
    root.bind("<Control-n>", lambda _e: on_cancel())
    root.bind("<Escape>", lambda _e: root.destroy())

    preset_entry.bind("<<ComboboxSelected>>", on_preset_selected)
    preset_help_button.configure(command=show_preset_help)

    prompt.focus_set()
    root.mainloop()
    return 0
