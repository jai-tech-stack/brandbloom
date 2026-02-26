"""Logo generator agent: strategy, concepts, critique."""
import logging
from typing import Any

from services.anthropic_client import CLAUDE_MODEL, get_anthropic_client, parse_claude_response

logger = logging.getLogger(__name__)


class LogoGeneratorAgent:
    def __init__(self) -> None:
        self.client = get_anthropic_client()

    def analyze_strategy(self, brand_profile: dict[str, Any]) -> dict[str, Any]:
        r = self.client.messages.create(
            model=CLAUDE_MODEL,
            max_tokens=1500,
            messages=[{"role": "user", "content": f"Brand profile: {brand_profile}\nReturn JSON: positioning, attributes (array), avoid (array), style_direction."}],
        )
        return parse_claude_response(r)

    def generate_concepts(self, strategy: dict[str, Any], count: int = 5) -> list[str]:
        r = self.client.messages.create(
            model=CLAUDE_MODEL,
            max_tokens=2000,
            messages=[{"role": "user", "content": f"Strategy: {strategy}\nGenerate {count} logo concept prompts for Flux. Return JSON: {{ \"concepts\": [\"...\", ...] }}"}],
        )
        out = parse_claude_response(r)
        return (out.get("concepts") or [])[:count]

    def critique_and_rank(self, image_urls: list[str], brand_profile: dict[str, Any]) -> list[dict[str, Any]]:
        r = self.client.messages.create(
            model=CLAUDE_MODEL,
            max_tokens=2000,
            messages=[{"role": "user", "content": f"Brand: {brand_profile}. {len(image_urls)} logo URLs. Return JSON: rankings (array of rank, url_index, score, reason), usage_guidelines (array)."}],
        )
        out = parse_claude_response(r)
        rankings = out.get("rankings") or []
        usage = out.get("usage_guidelines") or []
        return [{"rank": x.get("rank"), "url_index": x.get("url_index"), "score": x.get("score"), "reason": x.get("reason"), "usage_guidelines": usage} for x in rankings[:6]]
