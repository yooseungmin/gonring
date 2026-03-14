from click.testing import CliRunner

from haw.main import cli


def test_hwp_help_includes_proposal_commands() -> None:
    runner = CliRunner()
    result = runner.invoke(cli, ["hwp", "--help"])
    assert result.exit_code == 0
    assert "propose-selection" in result.output
    assert "regenerate-proposal" in result.output
    assert "show-proposal" in result.output
    assert "accept-proposal" in result.output
    assert "finalize-proposal" in result.output
    assert "reject-proposal" in result.output
    assert "cancel-proposal" in result.output


def test_agent_help_includes_preview_variants() -> None:
    runner = CliRunner()
    result = runner.invoke(cli, ["agent", "--help"])
    assert result.exit_code == 0
    assert "preview-variants" in result.output
