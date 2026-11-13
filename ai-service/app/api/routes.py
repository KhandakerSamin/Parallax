"""HTTP routes: health and analysis.

GET  /health
POST /analyze/text   analyse pasted text (quick, answered directly)
POST /analyze        analyse a PDF and wait for the result
"""

from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from pydantic import BaseModel, Field

from app.config import settings
from app.models.analysis import AnalysisResult
from app.security import require_access, sign_result
from app.services.engine import Engine, IndexNotReadyError, UnreadablePdfError, get_engine

router = APIRouter()


def engine() -> Engine:
    try:
        return get_engine()
    except IndexNotReadyError as exc:
        raise HTTPException(status.HTTP_503_SERVICE_UNAVAILABLE, str(exc)) from exc


EngineDep = Annotated[Engine, Depends(engine)]
CallerDep = Annotated[str, Depends(require_access)]


def _signed(result: AnalysisResult, caller: str) -> AnalysisResult:
    """Attach a signature for the caller, so the backend can trust the result when it is saved."""
    result.signature = sign_result(result.model_dump(exclude={"signature"}), caller)
    return result


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
def analyze_text(body: TextRequest, engine: EngineDep, caller: CallerDep) -> AnalysisResult:
    return _signed(engine.analyze_text(body.text, body.title), caller)


PdfUpload = Annotated[UploadFile, File(description="The report, as a PDF")]


def _read_pdf(file: UploadFile) -> bytes:
    limit = settings.max_upload_mb * 1024 * 1024
    data = file.file.read(limit + 1)
    if len(data) > limit:
        raise HTTPException(status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, f"The file is over {settings.max_upload_mb} MB.")
    if not data.startswith(b"%PDF"):
        raise HTTPException(status.HTTP_415_UNSUPPORTED_MEDIA_TYPE, "Upload a PDF file.")
    return data


@router.post("/analyze", response_model=AnalysisResult)
def analyze_pdf(engine: EngineDep, caller: CallerDep, file: PdfUpload) -> AnalysisResult:
    data = _read_pdf(file)
    try:
        return _signed(engine.analyze_pdf(data, file.filename or "report.pdf"), caller)
    except UnreadablePdfError as exc:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "The PDF could not be read.") from exc
