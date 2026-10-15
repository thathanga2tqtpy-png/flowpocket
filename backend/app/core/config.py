from typing import List
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field
import json


class Settings(BaseSettings):
    APP_ENV: str = "local"
    BACKEND_HOST: str = "127.0.0.1"
    BACKEND_PORT: int = 8001

    POSTGRES_DB: str = "flowpocket"
    POSTGRES_USER: str = "flowpocket_app"
    POSTGRES_PASSWORD: str = "flowpocket_dev_pass_2026"
    POSTGRES_HOST: str = "127.0.0.1"
    POSTGRES_PORT: int = 5432

    DATABASE_URL: str = Field(
        default="postgresql+psycopg://flowpocket_app:flowpocket_dev_pass_2026@127.0.0.1:5432/flowpocket"
    )

    APP_SECRET_KEY: str = "flowpocket_development_secret_key_32bytes_min!"
    SESSION_COOKIE_NAME: str = "flowpocket_session"
    SESSION_COOKIE_SECURE: bool = False
    SESSION_COOKIE_SAMESITE: str = "lax"
    SESSION_MAX_AGE_SECONDS: int = 604800  # 7 days

    FRONTEND_ORIGIN: str = "http://localhost:3000"
    CORS_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3001",
    ]

    model_config = SettingsConfigDict(
        env_file=(".env", "../.env"),
        env_file_encoding="utf-8",
        extra="ignore"
    )


settings = Settings()

