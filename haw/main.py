from __future__ import annotations

from pathlib import Path

import click

from haw.config import load_settings
from haw.agent.actions import write_action, write_action_variants
from haw.agent.presets import PRESET_BY_KEY, resolve_prompt
from haw.agent.proposal_store import (
    ProposalStore,
    RewriteCandidate,
    RewriteProposalGroup,
    build_apply_text,
    build_proposal_stage,
    can_accept_proposal,
    select_candidate,
    transition_proposal,
)
from haw.core.doctor import run_doctor_json
from haw.core.logger import configure_logger
from haw.policy import load_policy
from haw.services.hwp_client import HwpClient, probe_hwp
from haw.services.writer import write_text
from haw.ui.dock_panel import DockOptions, DockPanelRenderer, run_dock


@click.group()
def cli() -> None:
    configure_logger(log_dir=Path("logs"))


@cli.command()
@click.option("--strict", is_flag=True, help="Fail if required runtime config is missing.")
def doctor(strict: bool) -> None:
    settings = load_settings()
    click.echo(run_doctor_json(settings=settings, strict=strict))


@cli.group()
def agent() -> None:
    """Agent related commands."""


@agent.command("start")
@click.option("--dock", is_flag=True, help="Start dock panel mode.")
@click.option("--debug", is_flag=True, help="Verbose startup.")
def agent_start(dock: bool, debug: bool) -> None:
    if dock:
        raise SystemExit(run_dock(DockOptions(debug=debug)))
    click.echo("[HAW] agent started (headless)")


@agent.command("preview")
@click.option("-p", "--prompt", required=True, help="Instruction prompt.")
@click.option("-s", "--selected-text", default="", help="Selected source text.")
def agent_preview(prompt: str, selected_text: str) -> None:
    policy = load_policy()
    result = write_action(prompt=prompt, selected_text=selected_text, policy=policy)
    panel = DockPanelRenderer()
    panel.update_from_action_result(result)
    click.echo(panel.dump())


@agent.command("preview-variants")
@click.option("-p", "--prompt", required=True, help="Instruction prompt.")
@click.option("-s", "--selected-text", default="", help="Selected source text.")
@click.option("-n", "--variants", default=3, show_default=True, help="Number of variants to request.")
def agent_preview_variants(prompt: str, selected_text: str, variants: int) -> None:
    policy = load_policy()
    result = write_action_variants(
        prompt=prompt,
        selected_text=selected_text,
        policy=policy,
        variants=max(1, int(variants)),
    )
    panel = DockPanelRenderer()
    panel.update_from_action_variants_result(result, selected_text)
    click.echo(panel.dump())


@cli.command()
@click.option("-p", "--prompt", required=True, help="Instruction prompt.")
@click.option("-s", "--selected-text", default="", help="Selected source text.")
@click.option("-o", "--output", type=click.Path(path_type=Path), required=True, help="Output text file.")
def write(prompt: str, selected_text: str, output: Path) -> None:
    policy = load_policy()
    ok, message = write_text(prompt=prompt, selected_text=selected_text, output=output, policy=policy)
    if not ok:
        raise click.ClickException(message)
    click.echo(message)


@cli.group()
def hwp() -> None:
    """HWP COM commands for interactive document operations."""


@hwp.command("status")
def hwp_status() -> None:
    state = probe_hwp()
    if not state.available:
        raise click.ClickException(state.detail)
    click.echo(state.detail)


@hwp.command("probe-actions")
@click.option(
    "--actions",
    default="MovePageUp,MovePageDown,MovePrevPage,MoveNextPage,PageUp,PageDown,MovePrevPara,MoveNextPara",
    show_default=True,
    help="Comma-separated action names to probe via Hwp.Run.",
)
def hwp_probe_actions(actions: str) -> None:
    client = HwpClient.connect(visible=True)
    names = [name.strip() for name in actions.split(",") if name.strip()]
    results = client.probe_actions(names)
    for name in names:
        ok = results.get(name, False)
        click.echo(f"{name}: {'OK' if ok else 'FAIL'}")


@hwp.command("read-selection")
def hwp_read_selection() -> None:
    client = HwpClient.connect(visible=True)
    result = client.read_selection_text()
    if not result.ok:
        raise click.ClickException(result.detail)
    click.echo(result.detail)


@hwp.command("replace-selection")
@click.option("--text", required=True, help="Replacement text to apply to current selection.")
def hwp_replace_selection(text: str) -> None:
    policy = load_policy()
    client = HwpClient.connect(visible=True)
    track_result = client.ensure_track_changes_enabled(force=policy.hwp.force_track_changes)
    if policy.hwp.force_track_changes and not track_result.ok:
        raise click.ClickException(track_result.detail)
    replace_result = client.replace_selection_text(text)
    if not replace_result.ok:
        raise click.ClickException(replace_result.detail)
    click.echo(replace_result.detail)


@hwp.command("rewrite-selection")
@click.option("-p", "--prompt", required=False, default="", help="Instruction prompt for rewrite.")
@click.option(
    "--preset",
    type=click.Choice(list(PRESET_BY_KEY.keys())),
    default="custom",
    show_default=True,
    help="Preset rewrite action.",
)
@click.option("--scan-pages", default=10, show_default=True, help="Pages to scan on each side of cursor/selection.")
def hwp_rewrite_selection(prompt: str, preset: str, scan_pages: int) -> None:
    policy = load_policy()
    client = HwpClient.connect(visible=True)
    track_result = client.ensure_track_changes_enabled(force=policy.hwp.force_track_changes)
    if policy.hwp.force_track_changes and not track_result.ok:
        raise click.ClickException(track_result.detail)

    context_result = client.read_context(scan_pages_each_side=max(0, int(scan_pages)))
    if not context_result.ok:
        raise click.ClickException(context_result.detail)
    if context_result.target_mode == "caret_anchor" and not context_result.selection.strip():
        raise click.ClickException(
            "caret anchor detected; automatic block resolution is not implemented yet. select text first"
        )

    resolved_prompt, preset_label = resolve_prompt(preset_key=preset, user_prompt=prompt)
    if not resolved_prompt:
        raise click.ClickException("prompt is required for custom preset")

    result = write_action(
        prompt=resolved_prompt,
        selected_text=context_result.selection,
        context_text=context_result.context,
        scan_mode=context_result.scan_mode,
        scan_pages_each_side=context_result.scan_pages_each_side,
        policy=policy,
    )
    if not result.get("ok"):
        raise click.ClickException(str(result.get("message", "rewrite blocked")))

    replace_result = client.replace_selection_text(str(result["rewritten_text"]))
    if not replace_result.ok:
        raise click.ClickException(replace_result.detail)
    click.echo("selection rewritten")


@hwp.command("propose-selection")
@click.option("-p", "--prompt", required=False, default="", help="Instruction prompt for rewrite proposal.")
@click.option(
    "--preset",
    type=click.Choice(list(PRESET_BY_KEY.keys())),
    default="custom",
    show_default=True,
    help="Preset rewrite action.",
)
@click.option("--scan-pages", default=10, show_default=True, help="Pages to scan on each side of cursor/selection.")
def hwp_propose_selection(prompt: str, preset: str, scan_pages: int) -> None:
    policy = load_policy()
    client = HwpClient.connect(visible=True)
    stage_events = [build_proposal_stage("prompt_received", "Prompt received")]

    context_result = client.read_context(scan_pages_each_side=max(0, int(scan_pages)))
    if not context_result.ok:
        raise click.ClickException(context_result.detail)
    if context_result.detail:
        stage_events.append(
            build_proposal_stage(
                "scanning_context" if context_result.scanned_pages else "target_resolved",
                "Scanning nearby pages"
                if context_result.scanned_pages
                else "Caret block resolved"
                if context_result.target_mode == "caret_resolved_block"
                else "Selection detected",
            )
        )
        if context_result.anchor_restored and context_result.scanned_pages:
            stage_events.append(build_proposal_stage("target_resolved", "Scan complete, anchor restored"))
        if context_result.target_mode == "caret_resolved_block" and context_result.scanned_pages:
            stage_events.append(build_proposal_stage("target_resolved", "Caret block resolved"))
    if context_result.target_mode == "caret_anchor" and not context_result.selection.strip():
        raise click.ClickException(
            "caret anchor detected; automatic block resolution is not implemented yet. select text first"
        )

    resolved_prompt, preset_label = resolve_prompt(preset_key=preset, user_prompt=prompt)
    if not resolved_prompt:
        raise click.ClickException("prompt is required for custom preset")

    result = write_action_variants(
        prompt=resolved_prompt,
        selected_text=context_result.selection,
        context_text=context_result.context,
        scan_mode=context_result.scan_mode,
        scan_pages_each_side=context_result.scan_pages_each_side,
        policy=policy,
        variants=3,
    )
    if not result.get("ok"):
        raise click.ClickException(str(result.get("message", "rewrite blocked")))
    stage_events.append(build_proposal_stage("context_understood", "Context understood"))
    stage_events.append(build_proposal_stage("edit_plan_ready", "Editing plan ready"))
    stage_events.append(
        build_proposal_stage(
            "awaiting_user_decision",
            "Review edit is ready. Choose apply, regenerate, or cancel.",
        )
    )

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
        resolved_prompt=resolved_prompt,
        original_text=context_result.selection,
        candidates=candidates,
        scan_mode=context_result.scan_mode,
        target_mode=context_result.target_mode,
        scan_pages_each_side=context_result.scan_pages_each_side,
        scanned_pages=context_result.scanned_pages,
        scanned_chars=context_result.scanned_chars,
        preset_label=preset_label,
        current_state="awaiting_user_decision",
        stage_events=stage_events,
    )
    ProposalStore().save(proposal)

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
    total = len(proposal.candidates)
    for idx, candidate in enumerate(proposal.candidates, start=1):
        panel.append_candidate(
            index=idx,
            total=total,
            original=proposal.original_text,
            candidate=candidate,
        )
    click.echo("proposal saved: .haw/pending_proposal.json")
    click.echo(panel.dump())


@hwp.command("show-proposal")
def hwp_show_proposal() -> None:
    proposal = ProposalStore().load()
    if proposal is None:
        raise click.ClickException("no pending proposal")

    panel = DockPanelRenderer()
    panel.append_target(
        proposal.target_mode,
        True,
    )
    total = len(proposal.candidates)
    for idx, candidate in enumerate(proposal.candidates, start=1):
        panel.append_candidate(
            index=idx,
            total=total,
            original=proposal.original_text,
            candidate=candidate,
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
    click.echo(f"created_at: {proposal.created_at}")
    click.echo(f"prompt: {proposal.prompt}")
    if proposal.preset_label:
        click.echo(f"preset: {proposal.preset_label}")
    click.echo(panel.dump())


@hwp.command("regenerate-proposal")
@click.option("--scan-pages", default=None, type=int, help="Override scan pages on each side for regeneration.")
def hwp_regenerate_proposal(scan_pages: int | None) -> None:
    proposal = ProposalStore().load()
    if proposal is None:
        raise click.ClickException("no pending proposal")

    policy = load_policy()
    client = HwpClient.connect(visible=True)
    scan_pages_each_side = proposal.scan_pages_each_side if scan_pages is None else max(0, int(scan_pages))
    stage_events = [build_proposal_stage("prompt_received", "Prompt received")]
    context_result = client.read_context(scan_pages_each_side=scan_pages_each_side)
    if not context_result.ok:
        raise click.ClickException(context_result.detail)
    if context_result.scanned_pages:
        stage_events.append(build_proposal_stage("scanning_context", "Scanning nearby pages"))
    stage_events.append(
        build_proposal_stage(
            "target_resolved",
            "Scan complete, anchor restored"
            if context_result.anchor_restored and context_result.scanned_pages
            else "Caret block resolved"
            if context_result.target_mode == "caret_resolved_block"
            else "Selection detected",
        )
    )
    if context_result.target_mode == "caret_resolved_block" and context_result.scanned_pages:
        stage_events.append(build_proposal_stage("target_resolved", "Caret block resolved"))
    if context_result.target_mode == "caret_anchor" and not context_result.selection.strip():
        raise click.ClickException(
            "caret anchor detected; automatic block resolution is not implemented yet. select text first"
        )

    resolved_prompt = proposal.resolved_prompt.strip() or proposal.prompt.strip()
    if not resolved_prompt:
        raise click.ClickException("no prompt available to regenerate")

    result = write_action_variants(
        prompt=resolved_prompt,
        selected_text=context_result.selection,
        context_text=context_result.context,
        scan_mode=context_result.scan_mode,
        scan_pages_each_side=context_result.scan_pages_each_side,
        policy=policy,
        variants=3,
    )
    if not result.get("ok"):
        raise click.ClickException(str(result.get("message", "rewrite blocked")))
    stage_events.append(build_proposal_stage("context_understood", "Context understood"))
    stage_events.append(build_proposal_stage("edit_plan_ready", "Editing plan ready"))
    stage_events.append(
        build_proposal_stage(
            "awaiting_user_decision",
            "Review edit is ready. Choose apply, regenerate, or cancel.",
        )
    )

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
    regenerated = RewriteProposalGroup.create(
        prompt=proposal.prompt,
        resolved_prompt=resolved_prompt,
        original_text=context_result.selection,
        candidates=candidates,
        scan_mode=context_result.scan_mode,
        target_mode=context_result.target_mode,
        scan_pages_each_side=context_result.scan_pages_each_side,
        scanned_pages=context_result.scanned_pages,
        scanned_chars=context_result.scanned_chars,
        preset_label=proposal.preset_label,
        current_state="awaiting_user_decision",
        stage_events=stage_events,
    )
    ProposalStore().save(regenerated)

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
    panel.append_stage_timeline(regenerated.stage_events, regenerated.current_state)
    panel.append_next_actions(regenerated.current_state)
    total = len(regenerated.candidates)
    for idx, candidate in enumerate(regenerated.candidates, start=1):
        panel.append_candidate(
            index=idx,
            total=total,
            original=regenerated.original_text,
            candidate=candidate,
        )
    click.echo("proposal regenerated: .haw/pending_proposal.json")
    click.echo(panel.dump())


@hwp.command("accept-proposal")
@click.option("--force", is_flag=True, help="Apply proposal even if selection text changed.")
@click.option("--index", default=1, show_default=True, help="Proposal index to apply (1-based).")
@click.option(
    "--mode",
    "apply_mode",
    type=click.Choice(["replace", "insert_below"]),
    default="replace",
    show_default=True,
    help="How to apply the proposal.",
)
@click.option("--text", default="", help="Override proposal text with edited content.")
def hwp_accept_proposal(force: bool, index: int, apply_mode: str, text: str) -> None:
    policy = load_policy()
    proposal = ProposalStore().load()
    if proposal is None:
        raise click.ClickException("no pending proposal")
    if proposal.current_state == "review_edit_applied":
        raise click.ClickException("review edit already applied; approve or cancel before applying again")

    client = HwpClient.connect(visible=True)
    track_result = client.ensure_track_changes_enabled(force=policy.hwp.force_track_changes)
    if policy.hwp.force_track_changes and not track_result.ok:
        raise click.ClickException(track_result.detail)

    selection_result = client.read_selection_text()
    if (
        not selection_result.ok
        and proposal.target_mode == "caret_resolved_block"
        and selection_result.detail.startswith("E_EMPTY_SELECTION")
    ):
        selection_result = client.resolve_caret_selection()
    if not selection_result.ok:
        raise click.ClickException(selection_result.detail)

    can_apply, reason = can_accept_proposal(
        current_selection=selection_result.detail,
        proposal=proposal,
        force=force,
    )
    if not can_apply:
        raise click.ClickException(reason)

    ok, candidate, reason = select_candidate(proposal=proposal, index=int(index))
    if not ok or candidate is None:
        raise click.ClickException(reason)

    candidate_text = text if text.strip() else candidate.rewritten_text
    ok, apply_text, reason = build_apply_text(
        original_text=proposal.original_text,
        candidate_text=candidate_text,
        apply_mode=apply_mode,
    )
    if not ok:
        raise click.ClickException(reason)

    replace_result = client.replace_selection_text(apply_text)
    if not replace_result.ok:
        raise click.ClickException(replace_result.detail)
    updated = transition_proposal(
        proposal,
        current_state="review_edit_applied",
        message="Review edit was applied in the document. Choose approve, regenerate, or cancel.",
        selected_index=int(index) - 1,
        applied_index=int(index),
        applied_mode=apply_mode,
    )
    ProposalStore().save(updated)
    panel = DockPanelRenderer()
    panel.append(f"proposal #{index} applied with mode={apply_mode}")
    panel.append_stage_timeline(updated.stage_events, updated.current_state)
    panel.append_next_actions(updated.current_state)
    click.echo(panel.dump())


@hwp.command("reject-proposal")
def hwp_reject_proposal() -> None:
    proposal = ProposalStore().load()
    if proposal is None:
        raise click.ClickException("no pending proposal")
    client = HwpClient.connect(visible=True)
    if proposal.current_state == "review_edit_applied":
        result = client.discard_last_review_edit()
        if not result.ok:
            raise click.ClickException(result.detail)
    ProposalStore().clear()
    click.echo("proposal cancelled and cleared")


@hwp.command("cancel-proposal")
def hwp_cancel_proposal() -> None:
    proposal = ProposalStore().load()
    if proposal is None:
        raise click.ClickException("no pending proposal")
    client = HwpClient.connect(visible=True)
    if proposal.current_state == "review_edit_applied":
        result = client.discard_last_review_edit()
        if not result.ok:
            raise click.ClickException(result.detail)
    ProposalStore().clear()
    click.echo("proposal cancelled and cleared")


@hwp.command("finalize-proposal")
def hwp_finalize_proposal() -> None:
    proposal = ProposalStore().load()
    if proposal is None:
        raise click.ClickException("no pending proposal")
    if proposal.current_state != "review_edit_applied":
        raise click.ClickException("no applied review edit to approve")
    client = HwpClient.connect(visible=True)
    result = client.accept_selected_revisions()
    if not result.ok:
        raise click.ClickException(result.detail)
    ProposalStore().clear()
    click.echo("review edit approved and proposal cleared")


@hwp.command("accept-revisions")
@click.option(
    "--scope",
    type=click.Choice(["selection", "all"]),
    default="all",
    show_default=True,
    help="Scope to accept revisions.",
)
def hwp_accept_revisions(scope: str) -> None:
    client = HwpClient.connect(visible=True)
    if scope == "selection":
        result = client.accept_selected_revisions()
    else:
        result = client.accept_all_revisions()
    if not result.ok:
        raise click.ClickException(result.detail)
    click.echo(result.detail)


@hwp.command("revision-status")
def hwp_revision_status() -> None:
    client = HwpClient.connect(visible=True)
    result = client.check_revision_marks()
    if not result.ok:
        raise click.ClickException(result.detail)
    click.echo(result.detail)


if __name__ == "__main__":
    cli()
