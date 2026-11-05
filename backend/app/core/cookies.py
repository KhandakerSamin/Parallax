"""The session cookie: httpOnly, SameSite=Lax, Secure outside development."""

from fastapi import Response

from app.core.config import get_settings
from app.services.auth import session_lifetime


def set_session_cookie(response: Response, token: str, *, remember: bool) -> None:
    settings = get_settings()
    response.set_cookie(
        key=settings.session_cookie_name,
        value=token,
        # Without remember-me this is a browser-session cookie; the server-side expiry still applies.
        max_age=int(session_lifetime(True).total_seconds()) if remember else None,
        path="/",
        httponly=True,
        secure=settings.secure_cookies,
        samesite="lax",
    )


def clear_session_cookie(response: Response) -> None:
    settings = get_settings()
    response.delete_cookie(
        key=settings.session_cookie_name,
        path="/",
        httponly=True,
        secure=settings.secure_cookies,
        samesite="lax",
    )
