import json
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, Literal

from core.config import get_active_config, update_runtime_config
from core.llm_factory import LLMFactory
from core.db import fetch_one, execute_write

router = APIRouter(prefix="/settings", tags=["Settings & LLM API Key Configuration"])


class SettingsUpdateRequest(BaseModel):
    default_llm_provider: Optional[Literal["gemini", "openai"]] = None
    gemini_api_key: Optional[str] = None
    openai_api_key: Optional[str] = None
    gemini_model: Optional[str] = None
    openai_model: Optional[str] = None


class TestKeyRequest(BaseModel):
    provider: Literal["gemini", "openai"]
    api_key: str
    model_name: Optional[str] = None


@router.get("/config")
async def get_current_settings():
    """
    Returns active LLM configuration from Supabase DB (with runtime RAM fallback).
    """
    # 1. Attempt to fetch settings from Supabase app_settings table
    db_settings = fetch_one("SELECT * FROM public.app_settings WHERE id = 'default'")
    
    config = get_active_config()
    
    if db_settings:
        provider = db_settings.get("default_llm_provider") or config.get("provider", "gemini")
        gemini_key = db_settings.get("gemini_api_key") or config.get("gemini_key", "")
        openai_key = db_settings.get("openai_api_key") or config.get("openai_key", "")
        gemini_model = db_settings.get("gemini_model") or config.get("gemini_model", "gemini-3.6-flash")
        openai_model = db_settings.get("openai_model") or config.get("openai_model", "gpt-4o-mini")
        
        # Keep runtime config in sync
        update_runtime_config(
            provider=provider,
            gemini_key=gemini_key if gemini_key else None,
            openai_key=openai_key if openai_key else None,
            gemini_model=gemini_model,
            openai_model=openai_model
        )
    else:
        provider = config.get("provider", "gemini")
        gemini_key = config.get("gemini_key", "")
        openai_key = config.get("openai_key", "")
        gemini_model = config.get("gemini_model", "gemini-3.6-flash")
        openai_model = config.get("openai_model", "gpt-4o-mini")

    masked_gemini = f"••••••••{gemini_key[-4:]}" if len(gemini_key) > 4 else ("Configured" if gemini_key else "Not Configured")
    masked_openai = f"••••••••{openai_key[-4:]}" if len(openai_key) > 4 else ("Configured" if openai_key else "Not Configured")

    return {
        "status": "success",
        "default_llm_provider": provider,
        "gemini_api_key_status": masked_gemini,
        "openai_api_key_status": masked_openai,
        "has_gemini_key": bool(gemini_key),
        "has_openai_key": bool(openai_key),
        "gemini_model": gemini_model,
        "openai_model": openai_model
    }


@router.post("/config")
async def update_settings(payload: SettingsUpdateRequest):
    """
    Update API keys and provider preferences dynamically and save permanently to Supabase DB.
    """
    # 1. Update runtime RAM memory
    updated = update_runtime_config(
        provider=payload.default_llm_provider,
        gemini_key=payload.gemini_api_key if payload.gemini_api_key is not None else None,
        openai_key=payload.openai_api_key if payload.openai_api_key is not None else None,
        gemini_model=payload.gemini_model,
        openai_model=payload.openai_model,
    )

    # 2. Persist directly to Supabase app_settings table
    sql = """
    INSERT INTO public.app_settings (id, default_llm_provider, gemini_api_key, openai_api_key, gemini_model, openai_model, updated_at)
    VALUES ('default', %s, %s, %s, %s, %s, CURRENT_TIMESTAMP)
    ON CONFLICT (id) DO UPDATE SET
        default_llm_provider = COALESCE(EXCLUDED.default_llm_provider, app_settings.default_llm_provider),
        gemini_api_key = CASE WHEN EXCLUDED.gemini_api_key IS NOT NULL AND EXCLUDED.gemini_api_key != '' THEN EXCLUDED.gemini_api_key ELSE app_settings.gemini_api_key END,
        openai_api_key = CASE WHEN EXCLUDED.openai_api_key IS NOT NULL AND EXCLUDED.openai_api_key != '' THEN EXCLUDED.openai_api_key ELSE app_settings.openai_api_key END,
        gemini_model = COALESCE(EXCLUDED.gemini_model, app_settings.gemini_model),
        openai_model = COALESCE(EXCLUDED.openai_model, app_settings.openai_model),
        updated_at = CURRENT_TIMESTAMP;
    """
    
    execute_write(
        sql,
        (
            payload.default_llm_provider or updated.get("provider", "gemini"),
            payload.gemini_api_key if payload.gemini_api_key else None,
            payload.openai_api_key if payload.openai_api_key else None,
            payload.gemini_model or updated.get("gemini_model", "gemini-3.6-flash"),
            payload.openai_model or updated.get("openai_model", "gpt-4o-mini"),
        )
    )

    return {
        "status": "success",
        "message": "LLM Configuration updated and saved permanently to database.",
        "active_provider": updated["provider"]
    }


@router.post("/test-key")
async def test_llm_api_key(payload: TestKeyRequest):
    """
    Validates an API key by executing a health check ping against Google Gemini or OpenAI.
    """
    if not payload.api_key.strip():
        raise HTTPException(status_code=400, detail="API Key cannot be empty.")

    try:
        chat_model = LLMFactory.get_chat_model(
            provider=payload.provider,
            model_name=payload.model_name,
            api_key_override=payload.api_key.strip(),
            temperature=0.1
        )
        
        res = chat_model.invoke("Ping test for Tender Intelligence API key validation. Respond with 'PONG'.")
        
        return {
            "status": "success",
            "provider": payload.provider,
            "message": f"Connection test successful for {payload.provider.upper()}!",
            "response_preview": str(res.content)[:100]
        }
    except Exception as e:
        raise HTTPException(
            status_code=400,
            detail=f"Key validation failed for {payload.provider.upper()}: {str(e)}"
        )
