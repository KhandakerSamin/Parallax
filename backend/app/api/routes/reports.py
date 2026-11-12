"""A user's saved similarity reports.

  POST   /reports        save a result the AI service signed (direct PDF uploads)
  GET    /reports        newest first, summaries only
  GET    /reports/{id}   one report with its full result
  DELETE /reports/{id}   the owner only
  PUT    /reports/{id}/review   a reviewer's decision: pending, cleared or follow_up

  GET    /reviews        reviewers: every user's reports, undecided first

Students see only their own reports; reviewers and admins see all of them. A
report someone may not see answers 404, so its existence is not revealed. The
similarity score never decides anything: a reviewer records the decision.
"""

from typing import Any, Literal

from fastapi import APIRouter, Response, status
from pydantic import BaseModel, Field

from app.api.deps import CurrentUser, DbSession
from app.core.errors import ApiError
from app.schemas.auth import ErrorResponse
from app.schemas.reports import ReportListResponse, ReportResponse, ReportSummary, ReviewRequest
from app.services import analysis
from app.services import reports as report_service

router = APIRouter(prefix="/reports", tags=["reports"])

NOT_FOUND = "This report does not exist or was deleted."


class SaveReportRequest(BaseModel):
    result: dict[str, Any]
    signature: str = Field(..., max_length=2000)
    source_kind: Literal["pdf", "text"] = Field("pdf", alias="sourceKind")
    source_name: str = Field("report.pdf", alias="sourceName", min_length=1, max_length=300)


@router.post(
    "",
    status_code=status.HTTP_201_CREATED,
    response_model=ReportResponse,
    responses={400: {"model": ErrorResponse}, 401: {"model": ErrorResponse}},
)
def save_report(body: SaveReportRequest, user: CurrentUser, db: DbSession) -> ReportResponse:
    """Save a result the browser got straight from the AI service, after checking its signature."""
    result = {k: v for k, v in body.result.items() if k != "signature"}
    if not analysis.verify_result(result, body.signature, user.id):
        raise ApiError(400, "This result could not be verified. Please run the analysis again.")
    report = report_service.save_report(db, user, result, source_kind=body.source_kind, source_name=body.source_name)
    return ReportResponse(report=ReportSummary.model_validate(report), result=report.result)


@router.get("", response_model=ReportListResponse, responses={401: {"model": ErrorResponse}})
def list_reports(user: CurrentUser, db: DbSession, limit: int = 50) -> ReportListResponse:
    rows = report_service.list_reports(db, user, limit=max(1, min(limit, 100)))
    return ReportListResponse(reports=[ReportSummary.model_validate(r) for r in rows])


@router.get(
    "/{report_id}",
    response_model=ReportResponse,
    responses={401: {"model": ErrorResponse}, 404: {"model": ErrorResponse}},
)
def get_report(report_id: str, user: CurrentUser, db: DbSession) -> ReportResponse:
    report = report_service.get_report(db, user, report_id)
    if report is None:
        raise ApiError(404, NOT_FOUND)
    return ReportResponse(report=ReportSummary.model_validate(report), result=report.result)


@router.delete(
    "/{report_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    responses={401: {"model": ErrorResponse}, 404: {"model": ErrorResponse}},
)
def delete_report(report_id: str, user: CurrentUser, db: DbSession) -> Response:
    report = report_service.own_report(db, user, report_id)
    if report is None:
        raise ApiError(404, NOT_FOUND)
    report_service.delete_report(db, report)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.put(
    "/{report_id}/review",
    response_model=ReportResponse,
    responses={401: {"model": ErrorResponse}, 403: {"model": ErrorResponse}, 404: {"model": ErrorResponse}},
)
def review_report(report_id: str, body: ReviewRequest, user: CurrentUser, db: DbSession) -> ReportResponse:
    if not report_service.is_reviewer(user):
        raise ApiError(403, "Only reviewers can record a review decision.")
    report = report_service.get_report(db, user, report_id)
    if report is None:
        raise ApiError(404, NOT_FOUND)
    report = report_service.record_review(db, report, user, body.status, body.note)
    return ReportResponse(report=ReportSummary.model_validate(report), result=report.result)


reviews_router = APIRouter(prefix="/reviews", tags=["reports"])


@reviews_router.get(
    "", response_model=ReportListResponse, responses={401: {"model": ErrorResponse}, 403: {"model": ErrorResponse}}
)
def list_for_review(
    user: CurrentUser,
    db: DbSession,
    status: Literal["pending", "cleared", "follow_up"] | None = None,
    level: Literal["low", "moderate", "high"] | None = None,
    limit: int = 100,
) -> ReportListResponse:
    """Reviewers: every user's reports, undecided first, then the most similar."""
    if not report_service.is_reviewer(user):
        raise ApiError(403, "Only reviewers can see the review queue.")
    rows = report_service.review_queue(db, status=status, level=level, limit=max(1, min(limit, 200)))
    return ReportListResponse(reports=[ReportSummary.model_validate(r) for r in rows])
