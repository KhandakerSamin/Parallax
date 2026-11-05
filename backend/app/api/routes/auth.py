from fastapi import APIRouter, Request, Response, status

from app.api.deps import DbSession, OptionalUser, session_token
from app.core.config import get_settings
from app.core.cookies import clear_session_cookie, set_session_cookie
from app.core.errors import ApiError
from app.core.rate_limit import FailedLoginLimiter
from app.schemas.auth import ErrorResponse, LoginRequest, MeResponse, RegisterRequest, UserOut, UserResponse
from app.services import auth as auth_service

router = APIRouter(prefix="/auth", tags=["auth"])

_settings = get_settings()
login_limiter = FailedLoginLimiter(_settings.login_max_attempts, _settings.login_window_minutes * 60)

DUPLICATE_MESSAGES = {
    "email": "An account with this email already exists.",
    "universityId": "This student/staff ID is already registered.",
}
INVALID_CREDENTIALS = "Incorrect email/ID or password."


def _no_store(response: Response) -> None:
    response.headers["Cache-Control"] = "no-store"


def _client(request: Request) -> tuple[str | None, str | None]:
    return request.headers.get("user-agent"), request.client.host if request.client else None


@router.post(
    "/register",
    status_code=status.HTTP_201_CREATED,
    response_model=UserResponse,
    responses={400: {"model": ErrorResponse}, 409: {"model": ErrorResponse}},
)
def register(body: RegisterRequest, request: Request, response: Response, db: DbSession) -> UserResponse:
    """Create a student or reviewer account and sign it in."""
    try:
        user = auth_service.register_user(db, body)
    except auth_service.DuplicateAccountError as exc:
        raise ApiError(409, DUPLICATE_MESSAGES[exc.field], field=exc.field) from exc

    user_agent, ip = _client(request)
    issued = auth_service.issue_session(db, user, remember=False, user_agent=user_agent, ip_address=ip)
    set_session_cookie(response, issued.token, remember=False)
    _no_store(response)
    return UserResponse(user=UserOut.model_validate(user))


@router.post(
    "/login",
    response_model=UserResponse,
    responses={401: {"model": ErrorResponse}, 429: {"model": ErrorResponse}},
)
def login(body: LoginRequest, request: Request, response: Response, db: DbSession) -> UserResponse:
    """Sign in with a university email or student/staff ID."""
    key = body.identifier.strip().lower()
    wait = login_limiter.retry_after(key)
    if wait:
        minutes = max(1, round(wait / 60))
        raise ApiError(
            429,
            f"Too many sign-in attempts. Try again in {minutes} minute{'s' if minutes != 1 else ''}.",
            headers={"Retry-After": str(wait)},
        )

    user = auth_service.authenticate(db, body.identifier, body.password)
    if user is None:
        login_limiter.record_failure(key)
        # Same message for an unknown account and a wrong password.
        raise ApiError(401, INVALID_CREDENTIALS)

    login_limiter.reset(key)
    user_agent, ip = _client(request)
    issued = auth_service.issue_session(db, user, remember=body.remember, user_agent=user_agent, ip_address=ip)
    set_session_cookie(response, issued.token, remember=body.remember)
    _no_store(response)
    return UserResponse(user=UserOut.model_validate(user))


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT, response_class=Response)
def logout(request: Request, db: DbSession) -> Response:
    """End this browser's session. Safe to call when already signed out."""
    auth_service.revoke_session(db, session_token(request))
    response = Response(status_code=status.HTTP_204_NO_CONTENT)
    clear_session_cookie(response)
    return response


@router.get("/me", response_model=MeResponse)
def me(request: Request, response: Response, user: OptionalUser) -> MeResponse:
    """The signed-in user, or {"user": null}. A stale cookie is cleared."""
    _no_store(response)
    if user is None:
        if session_token(request):
            clear_session_cookie(response)
        return MeResponse(user=None)
    return MeResponse(user=UserOut.model_validate(user))
