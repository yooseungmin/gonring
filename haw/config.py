from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
import os

from dotenv import load_dotenv


@dataclass(frozen=True)
class Settings:
    anthropic_api_key: str
    auth_mode: str
    env_path: Path

    @property
    def has_api_key(self) -> bool:
        return bool(self.anthropic_api_key.strip())


def load_settings(cwd: Path | None = None) -> Settings:
    base = cwd or Path.cwd()
    env_path = base / ".env"
    if env_path.exists():
        load_dotenv(env_path, override=False)

    return Settings(
        anthropic_api_key=os.getenv("HAW_ANTHROPIC_API_KEY", ""),
        auth_mode=os.getenv("HAW_AUTH_MODE", "local"),
        env_path=env_path,
    )
