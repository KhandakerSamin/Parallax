"""Google sign-in.

Browser flow, all on the frontend origin (Next.js proxies /api/v1 here):
  1. GET  /auth/google?next=/dashboard  -> 302 to Google, with a signed state cookie
  2. GET  /auth/google/callback         -> sign in and 302 to `next`, or, for a new
                                           person, 302 to /sign-up/google
  3. GET  /auth/google/pending          -> {email, name} to prefill that page
  4. POST /auth/google/complete         -> create the account and sign in
Failures go back to /sign-in?error=<code>.
"""

import logging
from urllib.parse import urlencode

from fastapi import APIRouter, Request, Response, status
from fastapi.responses import RedirectResponse

from app.api.deps import DbSession
from app.core.config import get_settings
from app.core.cookies import set_session_cookie
from app.core.errors import ApiError
from app.core.signing import sign, unsign
from app.schemas.auth import (
    ErrorResponse,
    GoogleCompleteRequest,
    GooglePendingResponse,
    UserOut,
    UserResponse,
    is_allowed_email,
)
from app.services import auth as auth_service
from app.services import google

log = logging.getLogger(__name__)
router = APIRouter(prefix="/auth/google", tags=["auth"])

STATE_COOKIE = "parallax_oauth_state"
SIGNUP_COOKIE = "parallax_google_signup"
STATE_TTL = 10 * 60
SIGNUP_TTL = 15 * 60


def _cookie_path() -> str:
    return f"{get_settings().api_prefix}/auth/google"


def _set_temp_cookie(response: Response, name: str, value: str, max_age: int) -> None:
    response.set_cookie(
        name,
        value,
        max_age=max_age,
        path=_cookie_path(),
        httponly=True,
        secure=get_settings().secure_cookies,
        samesite="lax",  # sent on the top-level redirect back from Google
    )


def _clear_temp_cookie(response: Response, name: str) -> None:
    response.delete_cookie(name, path=_cookie_path(), httponly=True, secure=get_settings().secure_cookies, samesite="lax")


def _safe_next(value: str | None) -> str:
    if value and value.startswith("/") and not value.startswith(("//", "/\\")):
        return value
    return "/dashboard"


def _frontend(path: str, **query: str) -> str:
    url = f"{get_settings().public_url.rstrip('/')}{path}"
    return f"{url}?{urlencode(query)}" if query else url


def _fail(code: str) -> RedirectResponse:
    response = RedirectResponse(_frontend("/sign-in", error=code), status_code=status.HTTP_302_FOUND)
    _clear_temp_cookie(response, STATE_COOKIE)
    return response


@router.get("", summary="Start Google sign-in", response_class=RedirectResponse, status_code=302)
def start(next: str | None = None) -> RedirectResponse:
    if not get_settings().google_enabled:
        return _fail("google_unavailable")
    auth_request = google.build_authorization_request()
    response = RedirectResponse(auth_request.url, status_code=status.HTTP_302_FOUND)
    state = sign(
        {"state": auth_request.state, "verifier": auth_request.code_verifier, "next": _safe_next(next)},
        purpose="google-state",
        max_age_seconds=STATE_TTL,
    )
    _set_temp_cookie(response, STATE_COOKIE, state, STATE_TTL)
    return response


@router.get("/callback", summary="Google redirects here", response_class=RedirectResponse, status_code=302)
def callback(
    request: Request,
    db: DbSession,
    code: str | None = None,
    state: str | None = None,
    error: str | None = None,
) -> RedirectResponse:
    if error:
        return _fail("google_cancelled" if error == "access_denied" else "google_failed")

    saved = unsign(request.cookies.get(STATE_COOKIE), purpose="google-state")
    if not saved or not code or state != saved.get("state"):
        return _fail("google_failed")  # expired, replayed or forged

    try:
        identity = google.parse_id_token(google.exchange_code(code, saved["verifier"]))
    except google.GoogleAuthError as exc:
        log.warning("Google sign-in failed: %s", exc)
        return _fail("google_failed")

    if not is_allowed_email(identity.email):
        return _fail("google_domain")

    user = auth_service.find_or_link_google_user(db, sub=identity.sub, email=identity.email)
    if user is None:
        if auth_service.find_user_by_identifier(db, identity.email):
            return _fail("google_conflict")  # that email's account is linked to another Google account
        response = RedirectResponse(_frontend("/sign-up/google"), status_code=status.HTTP_302_FOUND)
        _clear_temp_cookie(response, STATE_COOKIE)
        pending = sign(
            {"sub": identity.sub, "email": identity.email, "name": identity.name, "next": saved["next"]},
            purpose="google-signup",
            max_age_seconds=SIGNUP_TTL,
        )
        _set_temp_cookie(response, SIGNUP_COOKIE, pending, SIGNUP_TTL)
        return response

    if not user.is_active:
        return _fail("google_disabled")

    issued = auth_service.issue_session(
        db,
        user,
        remember=False,
        user_agent=request.headers.get("user-agent"),
        ip_address=request.client.host if request.client else None,
    )
    response = RedirectResponse(_frontend(saved["next"]), status_code=status.HTTP_302_FOUND)
    _clear_temp_cookie(response, STATE_COOKIE)
    set_session_cookie(response, issued.token, remember=False)
    return response


def _pending(request: Request) -> dict:
    pending = unsign(request.cookies.get(SIGNUP_COOKIE), purpose="google-signup")
    if pending is None:
        raise ApiError(401, "Your Google sign-up has expired. Please continue with Google again.")
    return pending


@router.get("/pending", response_model=GooglePendingResponse, responses={401: {"model": ErrorResponse}})
def pending(request: Request, response: Response) -> GooglePendingResponse:
    """The verified Google name and email waiting to finish sign-up."""
    response.headers["Cache-Control"] = "no-store"
    data = _pending(request)
    return GooglePendingResponse(email=data["email"], name=data["name"])


@router.post(
    "/complete",
    status_code=status.HTTP_201_CREATED,
    response_model=UserResponse,
    responses={400: {"model": ErrorResponse}, 401: {"model": ErrorResponse}, 409: {"model": ErrorResponse}},
)
def complete(body: GoogleCompleteRequest, request: Request, response: Response, db: DbSession) -> UserResponse:
    """Create the account from the pending Google identity plus ID, role and department."""
    data = _pending(request)
    try:
        user = auth_service.register_google_user(
            db,
            sub=data["sub"],
            email=data["email"],
            name=data["name"],
            university_id=body.university_id,
            role=body.role,
            department=body.department,
        )
    except auth_service.DuplicateAccountError as exc:
        message = (
            "This student/staff ID is already registered."
            if exc.field == "universityId"
            else "An account with this email already exists. Sign in instead."
        )
        raise ApiError(409, message, field=exc.field) from exc

    issued = auth_service.issue_session(
        db,
        user,
        remember=False,
        user_agent=request.headers.get("user-agent"),
        ip_address=request.client.host if request.client else None,
    )
    set_session_cookie(response, issued.token, remember=False)
    _clear_temp_cookie(response, SIGNUP_COOKIE)
    response.headers["Cache-Control"] = "no-store"
    return UserResponse(user=UserOut.model_validate(user))
