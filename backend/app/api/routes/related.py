"""Related prior work: earlier DIU reports close to a project idea.

  POST /related-work   {"text": "a few sentences about the idea", "limit": 10}

For discovery before writing: nothing is saved, and no reviewer sees the search.
Each person can search a limited number of times a minute, since every search
runs on the AI service.
"""

from typing import Any

from fastapi import APIRouter
from pydantic import BaseModel, Field
from starlette.concurrency import run_in_threadpool

from app.api.deps import CurrentUser
from app.core.errors import ApiError
from app.core.rate_limit import RequestLimiter
from app.schemas.auth import ErrorResponse
from app.services import analysis

router = APIRouter(prefix="/related-work", tags=["related work"])

MIN_WORDS = 8
limiter = RequestLimiter(max_attempts=20, window_seconds=60)


class RelatedWorkRequest(BaseModel):
    text: str = Field(..., min_length=1, max_length=5_000)
    limit: int = Field(10, ge=1, le=20)


@router.post(
    "",
    summary="Find earlier reports close to a project idea",
    responses={401: {"model": ErrorResponse}, 422: {"model": ErrorResponse}, 429: {"model": ErrorResponse}},
)
async def related_work(body: RelatedWorkRequest, user: CurrentUser) -> dict[str, Any]:
    text = body.text.strip()
    if len(text.split()) < MIN_WORDS:
        raise ApiError(422, f"Describe your idea in at least {MIN_WORDS} words.", field="text")
    wait = limiter.hit(user.id)
    if wait:
        raise ApiError(
            429,
            f"That's a lot of searches. Try again in {wait} seconds.",
            headers={"Retry-After": str(wait)},
        )
    try:
        return await run_in_threadpool(analysis.related_work, text, body.limit)
    except analysis.AnalysisUnavailableError as exc:
        raise ApiError(503, str(exc)) from exc
    except analysis.AnalysisRejectedError as exc:
        raise ApiError(exc.status_code, exc.message) from exc
