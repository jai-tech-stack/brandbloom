"""Anthropic client and JSON parsing for Claude."""
import json
import logging
import os
import re
from typing import Any

from anthropic import Anthropic

logger = logging.getLogger(__name__)
CLAUDE_MODEL = os.getenv("ANTHROPIC_MODEL", "claude-sonnet-4-20250514")

def get_anthropic_client() -> Anthropic:
    key = os.getenv("ANTHROPIC_API_KEY")
    if not key:
        raise ValueError("ANTHROPIC_API_KEY is not set")
    return Anthropic(api_key=key)

def _camel_to_snake(name: str) -> str:
    return re.sub(r"(?<!^)(?=[A-Z])", "_", name).lower().replace(" ", "_")

def _normalize_keys(obj: Any) -> Any:
    if isinstance(obj, dict):
        return {_camel_to_snake(k): _normalize_keys(v) for k, v in obj.items()}
    if isinstance(obj, list):
        return [_normalize_keys(i) for i in obj]
    return obj

def parse_claude_response(response: Any) -> dict[str, Any]:
    if not response.content:
        return {}
    text = "".join(getattr(b, "text", "") for b in response.content)
    if not text.strip():
        return {}
    m = re.search(r"```(?:json)?\s*(\{[\s\S]*?\})\s*```", text)
    raw = m.group(1).strip() if m else text.strip()
    brace = re.search(r"\{[\s\S]*\}", raw)
    if brace:
        raw = brace.group(0)
    raw = re.sub(r",\s*([}\]])", r"\1", raw)
    try:
        out = json.loads(raw)
        return _normalize_keys(out) if isinstance(out, dict) else {}
    except json.JSONDecodeError as e:
        logger.warning("Claude JSON parse failed: %s", e)
        return {}
