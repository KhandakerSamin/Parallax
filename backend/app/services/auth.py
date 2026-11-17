"""Account and session logic, kept free of HTTP details so it is easy to test."""

from dataclasses import dataclass
from datetime import datetime, timedelta

from sqlalchemy import delete, or_, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.security import hash_password, hash_token, needs_rehash, new_session_token, verify_password
from app.db.base import utcnow
from app.models import AuthSession, User
from app.schemas.auth import RegisterRequest


class DuplicateAccountError(Exception):
    def __init__(self, field: str) -> None:
        super().__init__(field)
        self.field = field  # "email" or "universityId"


@dataclass(frozen=True)
class IssuedSession:
    token: str  # raw value for the cookie; never stored
    session: AuthSession


def find_user_by_identifier(db: Session, identifier: str) -> User | None:
    """Look up by email (case-insensitive) or student/staff ID."""
    value = identifier.strip()
    if "@" in value:
        return db.scalar(select(User).where(User.email == value.lower()))
    return db.scalar(select(User).where(User.university_id == value.upper()))


def register_user(db: Session, data: RegisterRequest) -> User:
    taken = db.execute(
        select(User.email, User.university_id).where(
            or_(User.email == data.email, User.university_id == data.university_id)
        )
    ).first()
    if taken:
        raise DuplicateAccountError("email" if taken.email == data.email else "universityId")

    user = User(
        name=data.name,
        email=data.email,
        university_id=data.university_id,
        role=data.role,
        department=data.department,
        password_hash=hash_password(data.password),
    )
    db.add(user)
    try:
        db.commit()
    except IntegrityError as exc:  # lost a race with a concurrent sign-up
        db.rollback()
        field = "email" if "email" in str(exc.orig).lower() else "universityId"
        raise DuplicateAccountError(field) from exc
    db.refresh(user)
    return user


def authenticate(db: Session, identifier: str, password: str) -> User | None:
    """The user for these credentials, or None. Unknown users cost the same time as wrong passwords."""
    user = find_user_by_identifier(db, identifier)
    valid = verify_password(password, user.password_hash if user else None)
    if not user or not valid or not user.is_active:
        return None
    if needs_rehash(user.password_hash):
        user.password_hash = hash_password(password)
    user.last_login_at = utcnow()
    db.commit()
    return user


def session_lifetime(remember: bool) -> timedelta:
    settings = get_settings()
    return timedelta(days=settings.remember_me_days) if remember else timedelta(hours=settings.session_ttl_hours)


def issue_session(
    db: Session,
    user: User,
    *,
    remember: bool,
    user_agent: str | None = None,
    ip_address: str | None = None,
) -> IssuedSession:
    token = new_session_token()
    session = AuthSession(
        user_id=user.id,
        token_hash=hash_token(token),
        remember=remember,
        user_agent=(user_agent or "")[:255] or None,
        ip_address=ip_address,
        expires_at=utcnow() + session_lifetime(remember),
    )
    db.add(session)
    db.commit()
    return IssuedSession(token=token, session=session)


def resolve_session(db: Session, token: str | None, *, now: datetime | None = None) -> User | None:
    """The active user behind a cookie token, or None if it is unknown, expired or disabled."""
    if not token:
        return None
    now = now or utcnow()
    session = db.scalar(select(AuthSession).where(AuthSession.token_hash == hash_token(token)))
    if session is None:
        return None
    if session.expires_at <= now or not session.user.is_active:
        db.delete(session)
        db.commit()
        return None
    # Touch at most once a minute to avoid a write on every request.
    if now - session.last_seen_at > timedelta(minutes=1):
        session.last_seen_at = now
        db.commit()
    return session.user


def revoke_session(db: Session, token: str | None) -> None:
    if token:
        db.execute(delete(AuthSession).where(AuthSession.token_hash == hash_token(token)))
        db.commit()


def revoke_other_sessions(db: Session, user: User, keep_token: str | None) -> int:
    """End every session of this user except the one holding `keep_token`. Returns how many ended."""
    query = delete(AuthSession).where(AuthSession.user_id == user.id)
    if keep_token:
        query = query.where(AuthSession.token_hash != hash_token(keep_token))
    result = db.execute(query)
    db.commit()
    return result.rowcount or 0


def list_sessions(db: Session, user: User) -> list[AuthSession]:
    """The user's live sessions, most recently used first."""
    query = (
        select(AuthSession)
        .where(AuthSession.user_id == user.id, AuthSession.expires_at > utcnow())
        .order_by(AuthSession.last_seen_at.desc())
    )
    return list(db.scalars(query))


def is_current_session(session: AuthSession, token: str | None) -> bool:
    return bool(token) and session.token_hash == hash_token(token)


def update_profile(db: Session, user: User, *, name: str | None, department: str | None) -> User:
    """Change the name and/or department. Email, ID and role are never changed here."""
    if name is not None:
        user.name = name
    if department is not None:
        user.department = department
    db.commit()
    db.refresh(user)
    return user


class NoPasswordError(Exception):
    """The account signs in with Google only, so there is no password to change."""


def change_password(db: Session, user: User, current: str, new: str, *, keep_token: str | None) -> int | None:
    """Replace the password after checking the current one, then end every other session.

    Returns how many other sessions ended, or None when the current password is wrong. The check costs the same time
    whether or not it matches (Argon2id verify either way).
    """
    if user.password_hash is None:
        verify_password(current, None)  # same cost as a real check
        raise NoPasswordError
    if not verify_password(current, user.password_hash):
        return None
    user.password_hash = hash_password(new)
    db.commit()
    return revoke_other_sessions(db, user, keep_token)


def purge_expired_sessions(db: Session) -> int:
    result = db.execute(delete(AuthSession).where(AuthSession.expires_at <= utcnow()))
    db.commit()
    return result.rowcount or 0


# ----- Google sign-in --------------------------------------------------------


def find_or_link_google_user(db: Session, *, sub: str, email: str, picture: str | None = None) -> User | None:
    """The account for this Google identity, linking it by verified email the first time.

    Returns None when no account exists yet (the person must finish signing up).
    """
    user = db.scalar(select(User).where(User.google_sub == sub))
    if user is None:
        user = db.scalar(select(User).where(User.email == email.lower()))
        if user is None:
            return None
        if user.google_sub and user.google_sub != sub:
            return None  # the email's account is already tied to a different Google account
        user.google_sub = sub
    if picture:
        user.avatar_url = picture
    user.last_login_at = utcnow()
    db.commit()
    return user


def register_google_user(
    db: Session,
    *,
    sub: str,
    email: str,
    name: str,
    university_id: str,
    role,
    department: str,
    picture: str | None = None,
) -> User:
    """Create an account from a verified Google identity plus the profile fields Google lacks."""
    taken = db.execute(
        select(User.email, User.university_id).where(
            or_(User.email == email, User.university_id == university_id, User.google_sub == sub)
        )
    ).first()
    if taken:
        raise DuplicateAccountError("universityId" if taken.university_id == university_id else "email")

    user = User(
        name=name,
        email=email,
        university_id=university_id,
        role=role,
        department=department,
        password_hash=None,
        google_sub=sub,
        avatar_url=picture,
        last_login_at=utcnow(),
    )
    db.add(user)
    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise DuplicateAccountError("universityId" if "university" in str(exc.orig).lower() else "email") from exc
    db.refresh(user)
    return user
