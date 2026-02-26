"""Design system agent: style guide from brand profile."""
from typing import Any

from services.anthropic_client import CLAUDE_MODEL, get_anthropic_client, parse_claude_response


class DesignSystemAgent:
    def __init__(self) -> None:
        self.client = get_anthropic_client()

    def generate_style_guide(self, brand_profile: dict[str, Any]) -> dict[str, Any]:
        response = self.client.messages.create(
            model=CLAUDE_MODEL,
            max_tokens=2000,
            messages=[{
                "role": "user",
                "content": f"""Brand profile: {brand_profile}
Return JSON style guide: colors (primary, secondary), typography (headings, body), spacing, logo_usage (clear_space, min_size, donots).""",
            }],
        )
        return parse_claude_response(response)

    def export_tokens(self, style_guide: dict[str, Any]) -> dict[str, Any]:
        return {"colors": style_guide.get("colors"), "typography": style_guide.get("typography")}
