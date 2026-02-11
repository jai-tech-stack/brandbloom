"""
BrandBloom Backend - Image Generation Service
Uses emergentintegrations for Gemini Nano Banana image generation
"""

import os
import asyncio
import base64
from typing import Optional
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv

load_dotenv()

app = FastAPI(title="BrandBloom Image Generator")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class GenerateRequest(BaseModel):
    prompt: str
    session_id: Optional[str] = None

class GenerateResponse(BaseModel):
    success: bool
    image_url: Optional[str] = None
    error: Optional[str] = None

@app.get("/health")
def health_check():
    return {"status": "ok", "service": "brandbloom-image-generator"}

@app.post("/api/generate-image", response_model=GenerateResponse)
async def generate_image(request: GenerateRequest):
    """Generate an image using Gemini Nano Banana"""
    from emergentintegrations.llm.chat import LlmChat, UserMessage
    
    api_key = os.getenv("EMERGENT_LLM_KEY")
    if not api_key:
        return GenerateResponse(success=False, error="EMERGENT_LLM_KEY not configured")
    
    try:
        session_id = request.session_id or f"brandbloom-{os.urandom(8).hex()}"
        
        chat = LlmChat(
            api_key=api_key,
            session_id=session_id,
            system_message="You are an expert brand designer. Create stunning, professional brand imagery."
        )
        chat.with_model("gemini", "gemini-3-pro-image-preview").with_params(modalities=["image", "text"])
        
        msg = UserMessage(text=request.prompt)
        text, images = await chat.send_message_multimodal_response(msg)
        
        if images and len(images) > 0:
            img = images[0]
            mime_type = img.get("mime_type", "image/png")
            data = img.get("data", "")
            
            if data:
                # Return as data URL
                image_url = f"data:{mime_type};base64,{data}"
                return GenerateResponse(success=True, image_url=image_url)
        
        return GenerateResponse(success=False, error="No image generated")
        
    except Exception as e:
        print(f"Image generation error: {e}")
        return GenerateResponse(success=False, error=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
