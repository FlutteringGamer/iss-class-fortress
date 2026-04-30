"""
backend/config.py — load all env vars, expose typed settings object.
"""
import logging
import os
from pydantic_settings import BaseSettings
from functools import lru_cache

logger = logging.getLogger(__name__)


class Settings(BaseSettings):
    # Core
    mock_mode: bool = True
    db_url: str = "sqlite+aiosqlite:///./fortress.db"
    secret_key: str = "class-fortress-dev-secret"

    # CORS
    cors_origins: str = "http://localhost:5173,http://127.0.0.1:5173"

    # Hardware (real mode only)
    pi_host: str = "192.168.1.100"
    pi_port: int = 8001
    xiaomi_rtsp: str = "rtsp://192.168.1.101:554/stream"

    @property
    def cors_origins_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",")]

    class Config:
        env_file = "../.env"
        env_file_encoding = "utf-8"
        case_sensitive = False


@lru_cache()
def get_settings() -> Settings:
    return Settings()


settings = get_settings()


def log_startup_banner():
    if settings.mock_mode:
        logger.warning(
            "\n"
            "╔══════════════════════════════════════════════════════════════╗\n"
            "║  ⚠  CLASS FORTRESS RUNNING IN MOCK MODE                     ║\n"
            "║     No real hardware connected. All events are simulated.   ║\n"
            "╚══════════════════════════════════════════════════════════════╝"
        )
    else:
        logger.info(
            "\n"
            "╔══════════════════════════════════════════════════════════════╗\n"
            "║  🏰 CLASS FORTRESS — LIVE HARDWARE MODE                     ║\n"
            f"║     Pi: {settings.pi_host}:{settings.pi_port}              \n"
            f"║     RTSP: {settings.xiaomi_rtsp[:40]}...                   \n"
            "╚══════════════════════════════════════════════════════════════╝"
        )
