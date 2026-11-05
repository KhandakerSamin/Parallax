"""Import every model here so Base.metadata (and Alembic) sees all tables."""

from app.models.auth_session import AuthSession
from app.models.user import SELF_SIGNUP_ROLES, Role, User

__all__ = ["AuthSession", "Role", "SELF_SIGNUP_ROLES", "User"]
