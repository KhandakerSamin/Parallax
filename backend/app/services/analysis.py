"""Client for the AI service, which does the similarity analysis.

The backend never inspects the result: it checks who is asking, forwards the
report, and returns the AI service's JSON unchanged.
"""

from __future__ import annotations

from typing import Any

import httpx

from app.core.config import get_settings


class AnalysisUnavailableError(Exception):
    """The AI service is down, too slow, or has no corpus index yet."""


class AnalysisRejectedError(Exception):
    """The AI service refused the input (too large, not a PDF, unreadable, empty)."""

    def __init__(self, status_code: int, message: str) -> None:
        super().__init__(message)
        self.status_code = status_code
        self.message = message


def _detail(response: httpx.Response) -> str:
    try:
        body = response.json()
    except ValueError:
        return response.text[:200] or "The analysis failed."
    detail = body.get("detail") if isinstance(body, dict) else None
    if isinstance(detail, str):
        return detail
    if isinstance(detail, list) and detail and isinstance(detail[0], dict):
        return str(detail[0].get("msg", "The input is not valid."))
    return "The analysis failed."


def _post(path: str, **kwargs: Any) -> dict[str, Any]:
    settings = get_settings()
    url = f"{settings.ai_service_url.rstrip('/')}{path}"
    try:
        response = httpx.post(url, timeout=settings.ai_timeout_seconds, **kwargs)
    except httpx.TimeoutException as exc:
        raise AnalysisUnavailableError("The analysis took too long. Please try again.") from exc
    except httpx.HTTPError as exc:
        raise AnalysisUnavailableError("The analysis service is not available right now.") from exc

    if response.status_code == 503:
        raise AnalysisUnavailableError("The analysis service is starting up or has no corpus yet.")
    if response.status_code >= 500:
        raise AnalysisUnavailableError("The analysis service ran into a problem. Please try again.")
    if response.status_code >= 400:
        raise AnalysisRejectedError(response.status_code, _detail(response))
    return response.json()


def analyze_text(text: str, title: str | None) -> dict[str, Any]:
    return _post("/analyze/text", json={"text": text, "title": title})


def analyze_pdf(data: bytes, filename: str) -> dict[str, Any]:
    return _post("/analyze", files={"file": (filename, data, "application/pdf")})
