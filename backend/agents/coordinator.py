"""Agentic coordinator: routes requests to the right agent (trybloom.ai-style orchestration)."""
import logging
from typing import Any

from agents.brand_analyzer import BrandAnalyzer
from workflows.logo_generation import run_logo_generation
from workflows.asset_creation import run_asset_creation

logger = logging.getLogger(__name__)

REQUEST_TYPES = ("brand_onboarding", "logo_generation", "create_asset", "design_system", "edit_asset", "resize", "upload_transform")


async def route_and_run(request_type: str, payload: dict[str, Any]) -> dict[str, Any]:
    """Agentic entry: dispatch to the appropriate agent/workflow."""
    if request_type == "brand_onboarding":
        url = (payload.get("url") or "").strip()
        if not url:
            return {"error": "url required"}
        analyzer = BrandAnalyzer()
        profile = await analyzer.analyze_website(url)
        return profile
    if request_type == "logo_generation":
        profile = payload.get("brand_profile") or payload
        return await run_logo_generation(profile)
    if request_type == "create_asset":
        return await run_asset_creation(
            payload.get("brand_profile") or payload,
            payload.get("asset_type", "social"),
            payload.get("dimensions", "1080x1080"),
            payload.get("copy_text"),
        )
    return {"error": f"Unknown request_type: {request_type}"}
