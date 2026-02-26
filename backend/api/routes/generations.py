"""Generation routes: logo, assets, design system (trybloom.ai-style)."""
from typing import Any

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from workflows.logo_generation import run_logo_generation
from workflows.asset_creation import run_asset_creation
from agents.design_system import DesignSystemAgent

router = APIRouter(prefix="/api/generations", tags=["generations"])


class AssetRequest(BaseModel):
    brand_profile: dict[str, Any]
    asset_type: str = "social"
    dimensions: str = "1080x1080"
    copy_text: str | None = None


@router.post("/logo")
async def generate_logo(brand_profile: dict[str, Any]):
    """Run agentic logo generation: strategy → concepts → (image gen) → critique & rank."""
    try:
        result = await run_logo_generation(brand_profile)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/asset")
async def create_asset(body: AssetRequest):
    """Generate on-brand asset prompt from profile + optional copy/dimensions."""
    try:
        result = await run_asset_creation(
            body.brand_profile,
            body.asset_type,
            body.dimensions,
            body.copy_text,
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/design-system")
async def create_design_system(brand_profile: dict[str, Any]):
    """Generate design system style guide from brand profile."""
    try:
        agent = DesignSystemAgent()
        style_guide = agent.generate_style_guide(brand_profile)
        tokens = agent.export_tokens(style_guide)
        return {"style_guide": style_guide, "tokens": tokens}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
