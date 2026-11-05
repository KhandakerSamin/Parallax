"""Request/response bodies for /auth. JSON uses camelCase to match the frontend."""

import re
from typing import Annotated

from pydantic import AfterValidator, BaseModel, ConfigDict, EmailStr, Field, field_validator
from pydantic.alias_generators import to_camel

from app.core.config import get_settings
from app.models.user import SELF_SIGNUP_ROLES, Role

# Keep in sync with frontend/lib/auth/config.ts and validation.ts.
DEPARTMENTS = (
    "Software Engineering",
    "Computer Science and Engineering",
    "Electrical and Electronic Engineering",
    "Information and Communication Engineering",
    "Multimedia and Creative Technology",
    "Other",
)
UNIVERSITY_ID_PATTERN = re.compile(r"^[A-Za-z0-9-]{4,20}$")
PASSWORD_RULES = (
    (lambda p: len(p) >= 8, "at least 8 characters"),
    (lambda p: re.search(r"[a-z]", p), "a lowercase letter"),
    (lambda p: re.search(r"[A-Z]", p), "an uppercase letter"),
    (lambda p: re.search(r"\d", p), "a number"),
    (lambda p: re.search(r"[^A-Za-z0-9]", p), "a symbol"),
)


def is_allowed_email(email: str, domains: list[str] | None = None) -> bool:
    """True when the email's domain is an allowed university domain (subdomains count)."""
    domain = email.rsplit("@", 1)[-1].lower()
    allowed = domains if domains is not None else get_settings().email_domains
    return any(domain == d or domain.endswith(f".{d}") for d in allowed)


def check_password_rules(password: str) -> str:
    missing = [label for test, label in PASSWORD_RULES if not test(password)]
    if missing:
        raise ValueError(f"Password needs {', '.join(missing)}.")
    if len(password) > 128:
        raise ValueError("Password is too long (128 characters max).")
    return password


def normalise_university_id(value: str) -> str:
    value = value.strip()
    if not UNIVERSITY_ID_PATTERN.fullmatch(value):
        raise ValueError("Use 4–20 letters, numbers or dashes, e.g. 221-35-123.")
    return value.upper()


Password = Annotated[str, AfterValidator(check_password_rules)]
UniversityId = Annotated[str, AfterValidator(normalise_university_id)]


class CamelModel(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True, str_strip_whitespace=True)


class RegisterRequest(CamelModel):
    name: str = Field(min_length=2, max_length=80)
    email: EmailStr
    university_id: UniversityId
    role: Role
    department: str
    password: Password = Field(json_schema_extra={"format": "password"})

    @field_validator("email")
    @classmethod
    def _university_email(cls, value: str) -> str:
        value = value.lower()
        if not is_allowed_email(value):
            domains = " or ".join(f"@{d}" for d in get_settings().email_domains)
            raise ValueError(f"Use your university email ({domains}).")
        return value

    @field_validator("role")
    @classmethod
    def _self_signup_role(cls, value: Role) -> Role:
        if value not in SELF_SIGNUP_ROLES:
            raise ValueError("You can register as a student or a reviewer.")
        return value

    @field_validator("department")
    @classmethod
    def _known_department(cls, value: str) -> str:
        if value not in DEPARTMENTS:
            raise ValueError("Choose your department.")
        return value


class LoginRequest(CamelModel):
    # University email, or student/staff ID.
    identifier: str = Field(min_length=1, max_length=254)
    password: str = Field(min_length=1, max_length=128)
    remember: bool = False


class UserOut(CamelModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    name: str
    email: str
    university_id: str
    role: Role
    department: str


class UserResponse(CamelModel):
    user: UserOut


class MeResponse(CamelModel):
    user: UserOut | None


class ErrorResponse(BaseModel):
    message: str
    field: str | None = None
