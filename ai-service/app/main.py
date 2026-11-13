"""Parallax AI service: compares a report with the corpus and returns potential similarity."""

from __future__ import annotations

import logging
import os
import threading
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import router
from app.config import settings
from app.services.engine import IndexNotReadyError, get_engine

log = logging.getLogger(__name__)


def _warm_up() -> None:
    try:
        get_engine().analyzer.encoder.encode(["warm up"])
        log.info("Engine ready")
    except IndexNotReadyError:
        log.warning("No index yet: analyses will answer 503 until one is built")


@asynccontextmanager
async def lifespan(_: FastAPI):
    # Load the index and model in the background, so the first analysis isn't slow
    # and the port opens at once (hosting platforms check it). Off in tests.
    if os.getenv("AI_WARM_UP", "1") == "1":
        threading.Thread(target=_warm_up, daemon=True).start()
    yield


app = FastAPI(
    lifespan=lifespan,
    title="Parallax AI service",
    version="0.2.0",
    description="Multi-perspective similarity analysis for Bangla-English academic reports.",
)

if settings.allowed_origins:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.allowed_origins,
        allow_methods=["GET", "POST"],
        allow_headers=["Content-Type", "X-Parallax-Ticket"],
    )

app.include_router(router)
