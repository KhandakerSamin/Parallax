"""Administration: people, roles and an overview of the system.

  GET   /admin/stats        counts of users, reports and review decisions
  GET   /admin/users        everyone, newest first; ?q= searches name, email and ID; ?role= filters
  PATCH /admin/users/{id}   change a role or (de)activate an account

Admins and super admins only. Admins can grant student, reviewer and researcher;
only a super admin can grant or remove admin rights. Nobody can change their own
role or deactivate themselves, so an admin can't lock everyone out by accident.
A deactivated account is signed out on its next request.
"""

from datetime import datetime
from typing import Annotated

from fastapi import APIRouter, Depends
from pydantic import ConfigDict
from sqlalchemy import func, or_, select

from app.api.deps import CurrentUser, DbSession
from app.core.errors import ApiError
from app.models import AuthSession, Report, Role, User
from app.schemas.auth import CamelModel, ErrorResponse

ADMIN_ROLES = (Role.admin, Role.super_admin)
ELEVATED = (Role.admin, Role.super_admin)


def require_admin(user: CurrentUser) -> User:
    if user.role not in ADMIN_ROLES:
        raise ApiError(403, "Only admins can do this.")
    return user


Admin = Annotated[User, Depends(require_admin)]
ERRORS = {401: {"model": ErrorResponse}, 403: {"model": ErrorResponse}}

router = APIRouter(prefix="/admin", tags=["admin"])


class AdminUser(CamelModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    name: str
    email: str
    university_id: str
    role: Role
    department: str
    is_active: bool
    google_linked: bool
    created_at: datetime
    last_login_at: datetime | None
    report_count: int = 0


class AdminUserList(CamelModel):
    users: list[AdminUser]
    total: int


class UserUpdate(CamelModel):
    role: Role | None = None
    is_active: bool | None = None


class Stats(CamelModel):
    users: int
    active_users: int
    users_by_role: dict[str, int]
    reports: int
    reports_by_level: dict[str, int]
    reviews_by_status: dict[str, int]


@router.get("/stats", response_model=Stats, responses=ERRORS)
def stats(_: Admin, db: DbSession) -> Stats:
    by_role = dict(db.execute(select(User.role, func.count()).group_by(User.role)).all())
    by_level = dict(db.execute(select(Report.level, func.count()).group_by(Report.level)).all())
    by_status = dict(db.execute(select(Report.review_status, func.count()).group_by(Report.review_status)).all())
    return Stats(
        users=sum(by_role.values()),
        active_users=db.scalar(select(func.count()).select_from(User).where(User.is_active)) or 0,
        users_by_role={role.value: by_role.get(role, 0) for role in Role},
        reports=sum(by_level.values()),
        reports_by_level={level: by_level.get(level, 0) for level in ("low", "moderate", "high")},
        reviews_by_status={s: by_status.get(s, 0) for s in ("pending", "cleared", "follow_up")},
    )


def _with_counts(db: DbSession, users: list[User]) -> list[AdminUser]:
    ids = [u.id for u in users]
    counts = dict(
        db.execute(select(Report.user_id, func.count()).where(Report.user_id.in_(ids)).group_by(Report.user_id)).all()
    )
    return [AdminUser.model_validate(u).model_copy(update={"report_count": counts.get(u.id, 0)}) for u in users]


@router.get("/users", response_model=AdminUserList, responses=ERRORS)
def list_users(
    _: Admin, db: DbSession, q: str | None = None, role: Role | None = None, limit: int = 100
) -> AdminUserList:
    query = select(User)
    if q and q.strip():
        like = f"%{q.strip().lower()}%"
        query = query.where(
            or_(func.lower(User.name).like(like), User.email.like(like), func.lower(User.university_id).like(like))
        )
    if role:
        query = query.where(User.role == role)
    total = db.scalar(select(func.count()).select_from(query.subquery())) or 0
    users = list(db.scalars(query.order_by(User.created_at.desc()).limit(max(1, min(limit, 500)))))
    return AdminUserList(users=_with_counts(db, users), total=total)


@router.patch(
    "/users/{user_id}",
    response_model=AdminUser,
    responses={**ERRORS, 400: {"model": ErrorResponse}, 404: {"model": ErrorResponse}},
)
def update_user(user_id: str, body: UserUpdate, admin: Admin, db: DbSession) -> AdminUser:
    user = db.get(User, user_id)
    if user is None:
        raise ApiError(404, "This user does not exist.")
    if user.id == admin.id:
        raise ApiError(400, "You can't change your own role or status.")
    touches_admin = body.role in ELEVATED or user.role in ELEVATED
    if (body.role is not None or body.is_active is not None) and touches_admin and admin.role != Role.super_admin:
        raise ApiError(403, "Only a super admin can manage admin accounts.")

    if body.role is not None:
        user.role = body.role
    if body.is_active is not None:
        user.is_active = body.is_active
        if not body.is_active:  # sign them out everywhere now, not just on their next request
            db.query(AuthSession).filter(AuthSession.user_id == user.id).delete()
    db.commit()
    db.refresh(user)
    return _with_counts(db, [user])[0]
