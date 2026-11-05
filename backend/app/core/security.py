"""Password hashing (Argon2id) and opaque session tokens."""

import hashlib
import secrets

from argon2 import PasswordHasher
from argon2.exceptions import InvalidHashError, VerificationError

_hasher = PasswordHasher()  # Argon2id with the library's current recommended parameters

# Verified against when the account does not exist, so a miss costs as much time as a hit.
_DUMMY_HASH = _hasher.hash(secrets.token_urlsafe(16))


def hash_password(password: str) -> str:
    return _hasher.hash(password)


def verify_password(password: str, password_hash: str | None) -> bool:
    """Check a password. Pass None for an unknown user to keep timing uniform."""
    try:
        return _hasher.verify(password_hash or _DUMMY_HASH, password) and password_hash is not None
    except (VerificationError, InvalidHashError):
        return False


def needs_rehash(password_hash: str) -> bool:
    return _hasher.check_needs_rehash(password_hash)


def new_session_token() -> str:
    """256 bits of randomness, URL-safe, sent to the browser in the session cookie."""
    return secrets.token_urlsafe(32)


def hash_token(token: str) -> str:
    """What we store for a session token. A database leak does not reveal live cookies."""
    return hashlib.sha256(token.encode()).hexdigest()
