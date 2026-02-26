"""Asset creation workflow: prompt + suggested formats from brand profile."""
from typing import Any

from agents.asset_creator import AssetCreatorAgent


async def run_asset_creation(
    brand_profile: dict[str, Any],
    asset_type: str,
    dimensions: str,
    copy_text: str | None,
) -> dict[str, Any]:
    agent = AssetCreatorAgent()
    prompt = agent.generate_prompt(brand_profile, asset_type, dimensions, copy_text)
    formats = agent.suggest_formats(brand_profile)
    return {"prompt": prompt, "suggested_formats": formats}
