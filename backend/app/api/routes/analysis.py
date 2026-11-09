"""Similarity analysis for signed-in users.

  POST /analysis/text  {"text": "...", "title": "..."}
  POST /analysis/pdf   multipart "file" (PDF)

Both return the AI service's AnalysisResult: potential similarity with evidence,
for a person to review. Never a verdict on its own.
"""

from typing import Annotated, Any

from fastapi import APIRouter, File, UploadFile
from pydantic import BaseModel, Field
from starlette.concurrency import run_in_threadpool

from app.api.deps import CurrentUser
from app.core.config import get_settings
from app.core.errors import ApiError
from app.schemas.auth import ErrorResponse
from app.services import analysis

router = APIRouter(prefix="/analysis", tags=["analysis"])

ERRORS = {
    401: {"model": ErrorResponse},
    413: {"model": ErrorResponse},
    415: {"model": ErrorResponse},
    422: {"model": ErrorResponse},
    503: {"model": ErrorResponse},
}


class TextAnalysisRequest(BaseModel):
    text: str = Field(..., min_length=1, max_length=400_000)
    title: str | None = Field(None, max_length=500)


async def _run(call, *args) -> dict[str, Any]:
    # The AI service can take tens of seconds; keep the event loop free meanwhile.
    try:
        return await run_in_threadpool(call, *args)
    except analysis.AnalysisUnavailableError as exc:
        raise ApiError(503, str(exc)) from exc
    except analysis.AnalysisRejectedError as exc:
        raise ApiError(exc.status_code, exc.message) from exc


@router.post("/text", summary="Analyze pasted text", responses=ERRORS)
async def analyze_text(body: TextAnalysisRequest, user: CurrentUser) -> dict[str, Any]:
    text = body.text.strip()
    if len(text.split()) < 20:
        raise ApiError(422, "Paste at least 20 words so there is something to compare.", field="text")
    return await _run(analysis.analyze_text, text, body.title)


@router.post("/pdf", summary="Analyze an uploaded PDF", responses=ERRORS)
async def analyze_pdf(
    user: CurrentUser, file: Annotated[UploadFile, File(description="The report, as a PDF")]
) -> dict[str, Any]:
    limit_mb = get_settings().max_upload_mb
    data = await file.read(limit_mb * 1024 * 1024 + 1)
    if len(data) > limit_mb * 1024 * 1024:
        raise ApiError(413, f"The file is over {limit_mb} MB.", field="file")
    if not data.startswith(b"%PDF"):
        raise ApiError(415, "Upload a PDF file.", field="file")
    return await _run(analysis.analyze_pdf, data, file.filename or "report.pdf")
