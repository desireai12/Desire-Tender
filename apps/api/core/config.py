import os
from typing import Literal, Optional
from pydantic_settings import BaseSettings
from dotenv import load_dotenv

load_dotenv()


class Settings(BaseSettings):
    PROJECT_NAME: str = "Desire Tender Intelligence Platform API"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"

    # LLM Settings
    DEFAULT_LLM_PROVIDER: Literal["gemini", "openai"] = os.getenv("DEFAULT_LLM_PROVIDER", "gemini")
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")
    OPENAI_API_KEY: str = os.getenv("OPENAI_API_KEY", "")

    # Default Models
    GEMINI_MODEL: str = "gemini-3.6-flash"
    GEMINI_EMBEDDING_MODEL: str = "models/text-embedding-004"
    OPENAI_MODEL: str = "gpt-4o-mini"
    OPENAI_EMBEDDING_MODEL: str = "text-embedding-3-small"

    # Supabase / Postgres Vector DB Settings
    SUPABASE_URL: str = os.getenv("SUPABASE_URL", "")
    SUPABASE_SERVICE_ROLE_KEY: str = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL",
        "postgresql://postgres:postgres@localhost:5432/postgres"
    )

    class Config:
        case_sensitive = True


settings = Settings()

# Dynamic Runtime Configuration Store
_runtime_config = {
    "provider": settings.DEFAULT_LLM_PROVIDER,
    "gemini_key": settings.GEMINI_API_KEY,
    "openai_key": settings.OPENAI_API_KEY,
    "gemini_model": settings.GEMINI_MODEL,
    "openai_model": settings.OPENAI_MODEL,
}


def get_active_config():
    return _runtime_config


def update_runtime_config(
    provider: Optional[str] = None,
    gemini_key: Optional[str] = None,
    openai_key: Optional[str] = None,
    gemini_model: Optional[str] = None,
    openai_model: Optional[str] = None,
):
    if provider in ["gemini", "openai"]:
        _runtime_config["provider"] = provider
    if gemini_key is not None:
        _runtime_config["gemini_key"] = gemini_key
    if openai_key is not None:
        _runtime_config["openai_key"] = openai_key
    if gemini_model is not None:
        _runtime_config["gemini_model"] = gemini_model
    if openai_model is not None:
        _runtime_config["openai_model"] = openai_model
    return _runtime_config

