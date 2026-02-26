"""Brand routes: analyze website URL and return brand profile (trybloom.ai-style extraction)."""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from agents.brand_analyzer import BrandAnalyzer

router = APIRouter(prefix="/api/brands", tags=["brands"])


class AnalyzeRequest(BaseModel):
    url: str


@router.post("/analyze")
async def analyze_brand(body: AnalyzeRequest):
    """Extract brand identity (colors, fonts, logo, style) from website URL. Agentic: BrandAnalyzer uses Claude + CSS/HTML parsing."""
    url = (body.url or "").strip()
    if not url or not url.startswith("http"):
        raise HTTPException(status_code=400, detail="Valid URL required (e.g. https://example.com)")
    try:
        analyzer = BrandAnalyzer()
        profile = await analyzer.analyze_website(url)
        return profile
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
