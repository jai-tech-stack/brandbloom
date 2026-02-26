"""Logo generation workflow: strategy -> concepts -> (optional image gen) -> critique."""
from typing import Any

from agents.logo_generator import LogoGeneratorAgent


async def run_logo_generation(brand_profile: dict[str, Any]) -> dict[str, Any]:
    agent = LogoGeneratorAgent()
    strategy = agent.analyze_strategy(brand_profile)
    concepts = agent.generate_concepts(strategy, count=5)
    return {"strategy": strategy, "concepts": concepts, "image_urls": [], "rankings": []}
