"""Asset creator: on-brand image prompts from profile (trybloom.ai-style)."""
import logging
from typing import Any

from services.anthropic_client import CLAUDE_MODEL, get_anthropic_client

logger = logging.getLogger(__name__)


class AssetCreatorAgent:
    def __init__(self) -> None:
        self.client = get_anthropic_client()

    def generate_prompt(self, brand_profile: dict[str, Any], asset_type: str, dimensions: str, copy: str | None = None) -> str:
        primary = brand_profile.get("primary_colors") or []
        secondary = brand_profile.get("secondary_colors") or []
        style = brand_profile.get("style") or ""
        fonts = brand_profile.get("fonts") or []
        mood = brand_profile.get("mood") or []
        primary_hex = [c for c in (primary if isinstance(primary, list) else [primary]) if isinstance(c, str) and c.startswith("#")]
        secondary_hex = [c for c in (secondary if isinstance(secondary, list) else [secondary]) if isinstance(c, str) and c.startswith("#")]
        brief = f"""Brand: Primary colors (hex): {", ".join(primary_hex) or "none"}. Secondary: {", ".join(secondary_hex) or "none"}. Style: {style}. Fonts: {", ".join(str(f) for f in (fonts[:5] if isinstance(fonts, list) else [])) or "none"}. Mood: {", ".join(str(m) for m in (mood[:5] if isinstance(mood, list) else [])) or "none"}."""
        response = self.client.messages.create(
            model=CLAUDE_MODEL,
            max_tokens=800,
            messages=[{
                "role": "user",
                "content": f"""{brief}
Asset type: {asset_type}. Dimensions: {dimensions}. Copy: {copy or "none"}.
Write one detailed image prompt for Flux/Replicate. Use the exact hex colors. Plain text only.""",
            }],
        )
        text = "".join(getattr(b, "text", "") for b in response.content)
        return text.strip()

    def suggest_formats(self, brand_profile: dict[str, Any]) -> list[dict[str, Any]]:
        from services.anthropic_client import parse_claude_response
        response = self.client.messages.create(
            model=CLAUDE_MODEL,
            max_tokens=1000,
            messages=[{"role": "user", "content": f"Brand: {brand_profile}. Return JSON: {{ \"formats\": [ {{ \"name\": \"Instagram Post\", \"width\": 1080, \"height\": 1080 }}, ... ] }}"}],
        )
        result = parse_claude_response(response)
        return result.get("formats") or []
