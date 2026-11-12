"""Tamper-proof, expiring tokens (HMAC-SHA256 over a JSON payload).

Used for small values the server hands to the browser and must trust on the
way back, such as OAuth state. They are signed, not encrypted: never put secrets inside.
"""

import base64
import hashlib
import hmac
import json
import time

from app.core.config import get_settings


def _b64(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode()


def _unb64(text: str) -> bytes:
    return base64.urlsafe_b64decode(text + "=" * (-len(text) % 4))


def _mac(purpose: str, body: str, key: str | None = None) -> str:
    secret = (key or get_settings().secret_key).encode()
    return _b64(hmac.new(secret, f"{purpose}.{body}".encode(), hashlib.sha256).digest())


def sign(payload: dict, *, purpose: str, max_age_seconds: int, key: str | None = None) -> str:
    """Sign a payload for one purpose; it stops verifying after max_age_seconds.

    `key` defaults to SECRET_KEY; tokens shared with the AI service use the shared secret.
    """
    body = _b64(json.dumps({**payload, "exp": int(time.time()) + max_age_seconds}, separators=(",", ":")).encode())
    return f"{body}.{_mac(purpose, body, key)}"


def unsign(token: str | None, *, purpose: str, key: str | None = None) -> dict | None:
    """The payload if the signature, purpose and expiry are all valid; otherwise None."""
    if not token or token.count(".") != 1:
        return None
    body, mac = token.split(".")
    if not hmac.compare_digest(mac, _mac(purpose, body, key)):
        return None
    try:
        payload = json.loads(_unb64(body))
    except ValueError:
        return None
    if not isinstance(payload, dict) or payload.get("exp", 0) < time.time():
        return None
    payload.pop("exp")
    return payload
