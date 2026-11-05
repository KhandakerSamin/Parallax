from typing import Annotated

from fastapi import Depends, Request
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.errors import ApiError
from app.db.session import get_db
from app.models import User
from app.services.auth import resolve_session

DbSession = Annotated[Session, Depends(get_db)]


def session_token(request: Request) -> str | None:
    return request.cookies.get(get_settings().session_cookie_name)


def optional_user(request: Request, db: DbSession) -> User | None:
    return resolve_session(db, session_token(request))


def current_user(user: Annotated[User | None, Depends(optional_user)]) -> User:
    """Require a signed-in user; use on any protected route."""
    if user is None:
        raise ApiError(401, "Please sign in to continue.")
    return user


CurrentUser = Annotated[User, Depends(current_user)]
OptionalUser = Annotated[User | None, Depends(optional_user)]
