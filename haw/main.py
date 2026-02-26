from __future__ import annotations

from pathlib import Path

import click

from haw.config import load_settings
from haw.agent.actions import write_action
from haw.agent.proposal_store import ProposalStore, RewriteProposal, can_accept_proposal
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
@click.option("-p", "--prompt", required=True, help="Instruction prompt for rewrite.")
def hwp_rewrite_selection(prompt: str) -> None:
    policy = load_policy()
    client = HwpClient.connect(visible=True)
    track_result = client.ensure_track_changes_enabled(force=policy.hwp.force_track_changes)
    if policy.hwp.force_track_changes and not track_result.ok:
        raise click.ClickException(track_result.detail)

    selection_result = client.read_selection_text()
    if not selection_result.ok:
        raise click.ClickException(selection_result.detail)

    result = write_action(prompt=prompt, selected_text=selection_result.detail, policy=policy)
    if not result.get("ok"):
        raise click.ClickException(str(result.get("message", "rewrite blocked")))

    replace_result = client.replace_selection_text(str(result["rewritten_text"]))
    if not replace_result.ok:
        raise click.ClickException(replace_result.detail)
    click.echo("selection rewritten")


@hwp.command("propose-selection")
@click.option("-p", "--prompt", required=True, help="Instruction prompt for rewrite proposal.")
def hwp_propose_selection(prompt: str) -> None:
    policy = load_policy()
    client = HwpClient.connect(visible=True)

    selection_result = client.read_selection_text()
    if not selection_result.ok:
        raise click.ClickException(selection_result.detail)

    result = write_action(prompt=prompt, selected_text=selection_result.detail, policy=policy)
    if not result.get("ok"):
        raise click.ClickException(str(result.get("message", "rewrite blocked")))

    proposal = RewriteProposal.create(
        prompt=prompt,
        original_text=selection_result.detail,
        rewritten_text=str(result["rewritten_text"]),
    )
    ProposalStore().save(proposal)

    panel = DockPanelRenderer()
    panel.update_from_action_result(result)
    click.echo("proposal saved: .haw/pending_proposal.json")
    click.echo(panel.dump())


@hwp.command("show-proposal")
def hwp_show_proposal() -> None:
    proposal = ProposalStore().load()
    if proposal is None:
        raise click.ClickException("no pending proposal")

    panel = DockPanelRenderer()
    panel.append_diff_preview(original=proposal.original_text, rewritten=proposal.rewritten_text)
    click.echo(f"created_at: {proposal.created_at}")
    click.echo(f"prompt: {proposal.prompt}")
    click.echo(panel.dump())


@hwp.command("accept-proposal")
@click.option("--force", is_flag=True, help="Apply proposal even if selection text changed.")
def hwp_accept_proposal(force: bool) -> None:
    policy = load_policy()
    proposal = ProposalStore().load()
    if proposal is None:
        raise click.ClickException("no pending proposal")

    client = HwpClient.connect(visible=True)
    track_result = client.ensure_track_changes_enabled(force=policy.hwp.force_track_changes)
    if policy.hwp.force_track_changes and not track_result.ok:
        raise click.ClickException(track_result.detail)

    selection_result = client.read_selection_text()
    if not selection_result.ok:
        raise click.ClickException(selection_result.detail)

    can_apply, reason = can_accept_proposal(
        current_selection=selection_result.detail,
        proposal=proposal,
        force=force,
    )
    if not can_apply:
        raise click.ClickException(reason)

    replace_result = client.replace_selection_text(proposal.rewritten_text)
    if not replace_result.ok:
        raise click.ClickException(replace_result.detail)

    ProposalStore().clear()
    click.echo("proposal accepted and applied")


@hwp.command("reject-proposal")
def hwp_reject_proposal() -> None:
    deleted = ProposalStore().clear()
    if not deleted:
        raise click.ClickException("no pending proposal")
    click.echo("proposal rejected and cleared")


if __name__ == "__main__":
    cli()
