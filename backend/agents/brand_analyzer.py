"""Brand analyzer agent: extracts brand identity (colors, fonts, logos, style) from URL — trybloom.ai-style."""
import logging
import re
from typing import Any
from urllib.parse import urljoin

import httpx
from bs4 import BeautifulSoup

from services.anthropic_client import CLAUDE_MODEL, get_anthropic_client, parse_claude_response

logger = logging.getLogger(__name__)

HEX_COLOR_RE = re.compile(r"#(?:[0-9a-fA-F]{3}){1,2}\b")
RGB_RE = re.compile(r"rgba?\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*[\d.]+\s*)?\)", re.IGNORECASE)
CSS_VAR_HEX_RE = re.compile(r"--[a-zA-Z0-9-]+\s*:\s*#(?:[0-9a-fA-F]{3}){1,2}\b")
CSS_VAR_RGB_RE = re.compile(r"--[a-zA-Z0-9-]+\s*:\s*rgba?\s*\([^)]+\)", re.IGNORECASE)
FONT_FAMILY_RE = re.compile(r"font-family\s*:\s*([^;}+]+)", re.IGNORECASE)


def _normalize_hex(c: str) -> str:
    c = c.strip()
    if len(c) == 4 and c.startswith("#"):
        return f"#{c[1]*2}{c[2]*2}{c[3]*2}"
    return c


def _resolve_url(base: str, path: str) -> str:
    if not path or path.startswith("data:"):
        return ""
    return urljoin(base, path)


def _rgb_to_hex(r: int, g: int, b: int) -> str:
    return f"#{r:02x}{g:02x}{b:02x}"


def _extract_css_colors(css_text: str) -> list[str]:
    found = set()
    for m in HEX_COLOR_RE.finditer(css_text):
        norm = _normalize_hex(m.group(0))
        if norm not in ("#ffffff", "#fff", "#000000", "#000"):
            found.add(norm)
    for m in RGB_RE.finditer(css_text):
        r, g, b = int(m.group(1)), int(m.group(2)), int(m.group(3))
        if not (r == 255 and g == 255 and b == 255) and not (r == 0 and g == 0 and b == 0):
            found.add(_rgb_to_hex(r, g, b))
    for m in CSS_VAR_HEX_RE.finditer(css_text):
        hex_m = HEX_COLOR_RE.search(m.group(0))
        if hex_m:
            found.add(_normalize_hex(hex_m.group(0)))
    for m in CSS_VAR_RGB_RE.finditer(css_text):
        rgb_m = RGB_RE.search(m.group(0))
        if rgb_m:
            r, g, b = int(rgb_m.group(1)), int(rgb_m.group(2)), int(rgb_m.group(3))
            found.add(_rgb_to_hex(r, g, b))
    if not found:
        for m in HEX_COLOR_RE.finditer(css_text):
            found.add(_normalize_hex(m.group(0)))
    return list(found)[:16]


def _extract_css_fonts(css_text: str) -> list[str]:
    found, seen = [], set()
    for m in FONT_FAMILY_RE.finditer(css_text):
        raw = m.group(1).strip().strip("'\"").split(",")[0].strip().strip("'\"")
        if not raw or raw.lower() in ("inherit", "initial", "unset", "sans-serif", "serif", "monospace", "cursive", "fantasy", "system-ui", "-apple-system", "blinkmacsystemfont"):
            continue
        if raw.lower() not in seen:
            seen.add(raw.lower())
            found.append(raw)
    return found[:15]


def _find_logo_url(soup: BeautifulSoup, base_url: str) -> str:
    for meta in soup.find_all("meta", attrs={"property": re.compile(r"og:image", re.I)}):
        content = meta.get("content", "").strip()
        if content and content.startswith(("http", "//")):
            return _resolve_url(base_url, content) if content.startswith("//") else content
    for img in soup.find_all("img", src=True):
        src = img.get("src", "")
        if not src or src.startswith("data:"):
            continue
        attrs = " ".join([str(img.get("class", [])), str(img.get("id", "")), str(img.get("alt", ""))]).lower()
        if "logo" in attrs:
            return _resolve_url(base_url, src)
    header = soup.find(["header", "nav"]) or soup.find("body")
    if header:
        for img in header.find_all("img", src=True):
            src = img.get("src", "")
            if src and not src.startswith("data:"):
                return _resolve_url(base_url, src)
    return ""


class BrandAnalyzer:
    def __init__(self) -> None:
        self.client = get_anthropic_client()

    async def analyze_website(self, url: str) -> dict[str, Any]:
        async with httpx.AsyncClient(follow_redirects=True, timeout=30.0) as client:
            resp = await client.get(url)
            resp.raise_for_status()
            html = resp.text
        soup = BeautifulSoup(html, "html.parser")
        base_url = str(resp.url) if hasattr(resp.url, "__str__") else url

        css_parts = []
        for tag in soup.find_all("style"):
            if tag.string:
                css_parts.append(tag.string)
        for link in soup.find_all("link", rel=re.compile(r"stylesheet", re.I))[:8]:
            href = link.get("href", "")
            if not href:
                continue
            try:
                css_url = _resolve_url(base_url, href)
                if not css_url or css_url.startswith("data:"):
                    continue
                r2 = await httpx.AsyncClient(follow_redirects=True, timeout=15.0).get(css_url)
                if r2.is_success and r2.text:
                    css_parts.append(r2.text[:50000])
            except Exception as e:
                logger.debug("Could not fetch CSS %s: %s", href, e)

        full_css = "\n".join(css_parts)
        extracted_colors = _extract_css_colors(full_css)
        extracted_fonts = _extract_css_fonts(full_css)
        for tag in soup.find_all(style=True):
            extracted_colors.extend(_extract_css_colors(tag.get("style", "")))
            extracted_fonts.extend(_extract_css_fonts(tag.get("style", "")))
        extracted_colors = list(dict.fromkeys(extracted_colors))[:12]
        extracted_fonts = list(dict.fromkeys(extracted_fonts))[:15]
        logo_url = _find_logo_url(soup, base_url)

        title = soup.title.string if soup.title else ""
        meta_desc = ""
        for tag in soup.find_all("meta", attrs={"name": "description"}):
            if tag.get("content"):
                meta_desc = tag["content"][:500]
                break
        body_text = soup.get_text(separator=" ", strip=True)[:3000] if soup.body else ""

        context = f"""URL: {url}
Page title: {title}
Meta description: {meta_desc}
Extracted from CSS/HTML: colors (hex) = {extracted_colors}, fonts = {extracted_fonts}, logo_url = {logo_url or 'none'}
Body excerpt: {body_text}
"""

        response = self.client.messages.create(
            model=CLAUDE_MODEL,
            max_tokens=2000,
            messages=[{
                "role": "user",
                "content": f"""Analyze this website and return JSON only:
- primary_colors: [hex from extracted list, 1-3 main]
- secondary_colors: [hex from extracted list, 1-3]
- fonts: [from extracted list or infer]
- style: short description
- mood: [adjectives]
- logo_description: one sentence

Use the extracted colors/fonts when possible. Website:
{context}
""",
            }],
        )
        result = parse_claude_response(response)
        result["url"] = url
        if logo_url:
            result["logo_url"] = logo_url
        def _ensure_hex_list(val: Any, fallback: list[str], max_len: int = 5) -> list[str]:
            if isinstance(val, list) and val:
                hexes = [str(x).strip() for x in val if isinstance(x, str) and x.startswith("#")]
                if hexes:
                    return hexes[:max_len]
            return fallback[:max_len]
        primary = _ensure_hex_list(result.get("primary_colors"), extracted_colors, 5)
        result["primary_colors"] = primary if primary else (extracted_colors[:3] or [])
        used = set(result["primary_colors"])
        result["secondary_colors"] = _ensure_hex_list(result.get("secondary_colors"), [c for c in extracted_colors if c not in used], 5) or [c for c in extracted_colors if c not in used][:3]
        fonts_raw = result.get("fonts")
        result["fonts"] = ([str(f).strip() for f in fonts_raw if f][:10] if isinstance(fonts_raw, list) and fonts_raw else extracted_fonts[:10] or [])
        logger.info("Brand analysis done for %s (logo=%s)", url, bool(logo_url))
        return result
