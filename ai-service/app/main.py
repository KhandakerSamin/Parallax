"""Parallax AI service: compares a report with the corpus and returns potential similarity."""

from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import router
from app.config import settings

app = FastAPI(
    title="Parallax AI service",
    version="0.2.0",
    description="Multi-perspective similarity analysis for Bangla-English academic reports.",
)

if settings.allowed_origins:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.allowed_origins,
        allow_methods=["GET", "POST"],
        allow_headers=["*"],
    )

app.include_router(router)
