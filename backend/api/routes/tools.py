"""Tools: upload transform, quality critique, research, resizer (trybloom.ai-style)."""
from typing import Any

from fastapi import APIRouter

router = APIRouter(prefix="/api/tools", tags=["tools"])


@router.post("/upload-transform")
async def upload_transform(body: dict[str, Any]):
    # Stub: would call UploadTransformerAgent
    return {"message": "Upload transform placeholder", "prompt": None}


@router.post("/quality/critique")
async def quality_critique(body: dict[str, Any]):
    # Stub: would call QualityControlAgent
    return {"score": 0, "feedback": []}


@router.post("/research/competitors")
async def research_competitors(body: dict[str, Any]):
    # Stub: would call ResearchAgent
    return {"competitors": [], "suggestions": []}


@router.get("/resizer/platforms")
async def resizer_platforms():
    return {"platforms": ["instagram_post", "instagram_story", "facebook", "google_ads"]}


@router.post("/resizer/suggest-crops")
async def suggest_crops(body: dict[str, Any]):
    return {"suggestions": []}
