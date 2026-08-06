from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import Optional, Literal

from core.config import get_active_config, update_runtime_config
from core.llm_factory import LLMFactory

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
    Returns active LLM configuration and masked status of API keys.
    """
    config = get_active_config()
    
    gemini_key = config.get("gemini_key", "")
    openai_key = config.get("openai_key", "")
    
    masked_gemini = f"••••••••{gemini_key[-4:]}" if len(gemini_key) > 4 else ("Configured" if gemini_key else "Not Configured")
    masked_openai = f"••••••••{openai_key[-4:]}" if len(openai_key) > 4 else ("Configured" if openai_key else "Not Configured")
    
    return {
        "status": "success",
        "default_llm_provider": config.get("provider", "gemini"),
        "gemini_api_key_status": masked_gemini,
        "openai_api_key_status": masked_openai,
        "has_gemini_key": bool(gemini_key),
        "has_openai_key": bool(openai_key),
        "gemini_model": config.get("gemini_model", "gemini-1.5-flash"),
        "openai_model": config.get("openai_model", "gpt-4o-mini")
    }


@router.post("/config")
async def update_settings(payload: SettingsUpdateRequest):
    """
    Update runtime API keys and provider preferences dynamically without server restart.
    """
    updated = update_runtime_config(
        provider=payload.default_llm_provider,
        gemini_key=payload.gemini_api_key if payload.gemini_api_key is not None else None,
        openai_key=payload.openai_api_key if payload.openai_api_key is not None else None,
        gemini_model=payload.gemini_model,
        openai_model=payload.openai_model,
    )
    return {
        "status": "success",
        "message": "LLM Configuration updated successfully.",
        "active_provider": updated["provider"]
    }


@router.post("/test-key")
async def test_llm_api_key(payload: TestKeyRequest):
    """
    Validates an API key by executing a quick health check ping against Google Gemini or OpenAI.
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
        
        # Test prompt invocation
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
