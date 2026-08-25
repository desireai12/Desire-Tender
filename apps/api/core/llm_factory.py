from typing import Optional, Literal
from langchain_core.language_models import BaseChatModel
from langchain_core.embeddings import Embeddings
from langchain_google_genai import ChatGoogleGenerativeAI, GoogleGenerativeAIEmbeddings
from langchain_openai import ChatOpenAI, OpenAIEmbeddings

from core.config import settings, get_active_config
from core.db import fetch_one

def _get_key_with_db_fallback(provider: str, active_key: Optional[str]) -> str:
    if active_key:
        return active_key
    db_row = fetch_one("SELECT * FROM public.app_settings WHERE id = 'default'")
    if db_row:
        if provider == "gemini":
            return db_row.get("gemini_api_key") or ""
        elif provider == "openai":
            return db_row.get("openai_api_key") or ""
    return 


class LLMFactory:
    """
    Factory to dynamically instantiate LLM and Embedding models for dual support:
    Google Gemini (Primary / Free-tier) & OpenAI GPT (Fallback / Alternative).
    Uses dynamic runtime config if set by user in UI settings.
    """

    @staticmethod
    def get_chat_model(
        provider: Optional[Literal["gemini", "openai"]] = None,
        model_name: Optional[str] = None,
        temperature: float = 0.2,
        api_key_override: Optional[str] = None,
    ) -> BaseChatModel:
        config = get_active_config()
        selected_provider = provider or config.get("provider") or settings.DEFAULT_LLM_PROVIDER

        if selected_provider == "gemini":
            target_model = model_name or config.get("gemini_model") or settings.GEMINI_MODEL
            active_key = _get_key_with_db_fallback("gemini", api_key_override or config.get("gemini_key") or settings.GEMINI_API_KEY)
            if not active_key:
                raise ValueError("GEMINI_API_KEY is not configured in settings or environment variables.")
            return ChatGoogleGenerativeAI(
                model=target_model,
                google_api_key=active_key,
                temperature=temperature,
            )
        elif selected_provider == "openai":
            target_model = model_name or config.get("openai_model") or settings.OPENAI_MODEL
            active_key = _get_key_with_db_fallback("openai", api_key_override or config.get("openai_key") or settings.OPENAI_API_KEY)
            if not active_key:
                raise ValueError("OPENAI_API_KEY is not configured in settings or environment variables.")
            return ChatOpenAI(
                model=target_model,
                api_key=active_key,
                temperature=temperature,
            )
        else:
            raise ValueError(f"Unsupported LLM provider: {selected_provider}")

    @staticmethod
    def get_embeddings(
        provider: Optional[Literal["gemini", "openai"]] = None,
        api_key_override: Optional[str] = None,
    ) -> Embeddings:
        config = get_active_config()
        selected_provider = provider or config.get("provider") or settings.DEFAULT_LLM_PROVIDER

        if selected_provider == "gemini":
            active_key = _get_key_with_db_fallback("gemini", api_key_override or config.get("gemini_key") or settings.GEMINI_API_KEY)
            if not active_key:
                raise ValueError("GEMINI_API_KEY is not configured in settings or environment variables.")
            return GoogleGenerativeAIEmbeddings(
                model=settings.GEMINI_EMBEDDING_MODEL,
                google_api_key=active_key,
            )
        elif selected_provider == "openai":
            active_key = _get_key_with_db_fallback("openai", api_key_override or config.get("openai_key") or settings.OPENAI_API_KEY)
            if not active_key:
                raise ValueError("OPENAI_API_KEY is not configured in settings or environment variables.")
            return OpenAIEmbeddings(
                model=settings.OPENAI_EMBEDDING_MODEL,
                api_key=active_key,
            )
        else:
            raise ValueError(f"Unsupported Embeddings provider: {selected_provider}")

