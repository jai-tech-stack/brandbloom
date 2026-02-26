"""Agentic API: single entry that routes to the right agent (trybloom.ai-style)."""
from typing import Any

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from agents.coordinator import route_and_run

router = APIRouter(prefix="/api/agentic", tags=["agentic"])


class AgenticRequest(BaseModel):
    request_type: str
    payload: dict[str, Any]


@router.post("/run")
async def run_agentic(body: AgenticRequest):
    """Run an agentic task: brand_onboarding | logo_generation | create_asset."""
    try:
        result = await route_and_run(body.request_type, body.payload or {})
        if isinstance(result, dict) and result.get("error"):
            raise HTTPException(status_code=400, detail=result["error"])
        return result
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
