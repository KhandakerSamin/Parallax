"""Similarity analysis for signed-in users.

  POST /analysis/text    {"text": "...", "title": "..."}
  POST /analysis/pdf     multipart "file" (PDF), for files small enough to pass through the host
  POST /analysis/ticket  a short-lived pass for uploading a PDF straight to the AI service;
                         the browser then saves the signed result with POST /reports

Both return the AI service's AnalysisResult, potential similarity with evidence
for a person to review (never a verdict on its own), and save it as a report.
The result carries `report_id` so the client can link to /reports/{id}.
"""

from typing import Annotated, Any

from fastapi import APIRouter, File, UploadFile
from pydantic import BaseModel, Field
from starlette.concurrency import run_in_threadpool

from app.api.deps import CurrentUser, DbSession
from app.core.config import get_settings
from app.core.errors import ApiError
from app.models import User
from app.schemas.auth import ErrorResponse
from app.services import analysis
from app.services import reports as report_service

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


async def _save(db, user: User, result: dict[str, Any], source_kind: str, source_name: str) -> dict[str, Any]:
    result = {k: v for k, v in result.items() if k != "signature"}
    report = await run_in_threadpool(
        report_service.save_report, db, user, result, source_kind=source_kind, source_name=source_name
    )
    return {**result, "report_id": report.id}


class TicketResponse(BaseModel):
    ai_url: str = Field(serialization_alias="aiUrl")
    ticket: str
    max_upload_mb: int = Field(serialization_alias="maxUploadMb")


@router.post("/ticket", summary="Get a pass to upload a PDF to the AI service", responses={401: ERRORS[401]})
def upload_ticket(user: CurrentUser) -> TicketResponse:
    return TicketResponse(
        ai_url=analysis.public_url(),
        ticket=analysis.issue_ticket(user.id),
        max_upload_mb=get_settings().max_upload_mb,
    )


@router.post("/text", summary="Analyze pasted text", responses=ERRORS)
async def analyze_text(body: TextAnalysisRequest, user: CurrentUser, db: DbSession) -> dict[str, Any]:
    text = body.text.strip()
    if len(text.split()) < 20:
        raise ApiError(422, "Paste at least 20 words so there is something to compare.", field="text")
    result = await _run(analysis.analyze_text, text, body.title)
    return await _save(db, user, result, "text", body.title or "Pasted text")


@router.post("/pdf", summary="Analyze an uploaded PDF", responses=ERRORS)
async def analyze_pdf(
    user: CurrentUser, db: DbSession, file: Annotated[UploadFile, File(description="The report, as a PDF")]
) -> dict[str, Any]:
    limit_mb = get_settings().max_upload_mb
    data = await file.read(limit_mb * 1024 * 1024 + 1)
    if len(data) > limit_mb * 1024 * 1024:
        raise ApiError(413, f"The file is over {limit_mb} MB.", field="file")
    if not data.startswith(b"%PDF"):
        raise ApiError(415, "Upload a PDF file.", field="file")
    filename = file.filename or "report.pdf"
    result = await _run(analysis.analyze_pdf, data, filename)
    return await _save(db, user, result, "pdf", filename)
