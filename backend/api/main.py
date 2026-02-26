"""Brand BLOOM+ API: brand extraction, logo generation, assets."""
import os
from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

load_dotenv(Path(__file__).resolve().parents[2] / ".env")
load_dotenv(Path(__file__).resolve().parents[1] / ".env")

app = FastAPI(title="Brand BLOOM+ API", version="0.1.0")
app.add_middleware(CORSMiddleware, allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"], allow_credentials=True, allow_methods=["*"], allow_headers=["*"])

from api.routes import agentic, brands, generations, health, tools
app.include_router(health.router)
app.include_router(brands.router)
app.include_router(generations.router)
app.include_router(tools.router)
app.include_router(agentic.router)

@app.get("/")
def root():
    return {"service": "Brand BLOOM+ API", "docs": "/docs"}
