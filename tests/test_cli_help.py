from click.testing import CliRunner

from haw.main import cli


def test_hwp_help_includes_proposal_commands() -> None:
    runner = CliRunner()
    result = runner.invoke(cli, ["hwp", "--help"])
    assert result.exit_code == 0
    assert "propose-selection" in result.output
    assert "show-proposal" in result.output
    assert "accept-proposal" in result.output
    assert "reject-proposal" in result.output
