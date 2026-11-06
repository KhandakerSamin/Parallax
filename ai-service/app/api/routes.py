"""HTTP routes: health and analysis."""

from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from pydantic import BaseModel, Field

from app.config import settings
from app.models.analysis import AnalysisResult
from app.services.engine import Engine, IndexNotReadyError, UnreadablePdfError, get_engine

router = APIRouter()


def engine() -> Engine:
    try:
        return get_engine()
    except IndexNotReadyError as exc:
        raise HTTPException(status.HTTP_503_SERVICE_UNAVAILABLE, str(exc)) from exc


EngineDep = Annotated[Engine, Depends(engine)]


@router.get("/health")
def health() -> dict:
    try:
        corpus = get_engine().status()
    except IndexNotReadyError:
        return {"status": "degraded", "service": "ai-service", "corpus": None}
    return {"status": "ok", "service": "ai-service", "corpus": corpus}


class TextRequest(BaseModel):
    text: str = Field(..., min_length=1, max_length=400_000)
    title: str | None = Field(None, max_length=500)


@router.post("/analyze/text", response_model=AnalysisResult)
def analyze_text(body: TextRequest, engine: EngineDep) -> AnalysisResult:
    return engine.analyze_text(body.text, body.title)


@router.post("/analyze", response_model=AnalysisResult)
def analyze_pdf(
    engine: EngineDep, file: Annotated[UploadFile, File(description="The report, as a PDF")]
) -> AnalysisResult:
    limit = settings.max_upload_mb * 1024 * 1024
    data = file.file.read(limit + 1)
    if len(data) > limit:
        raise HTTPException(status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, f"The file is over {settings.max_upload_mb} MB.")
    if not data.startswith(b"%PDF"):
        raise HTTPException(status.HTTP_415_UNSUPPORTED_MEDIA_TYPE, "Upload a PDF file.")
    try:
        return engine.analyze_pdf(data, file.filename or "report.pdf")
    except UnreadablePdfError as exc:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "The PDF could not be read.") from exc
