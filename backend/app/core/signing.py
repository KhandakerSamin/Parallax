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


def _mac(purpose: str, body: str) -> str:
    key = get_settings().secret_key.encode()
    return _b64(hmac.new(key, f"{purpose}.{body}".encode(), hashlib.sha256).digest())


def sign(payload: dict, *, purpose: str, max_age_seconds: int) -> str:
    """Sign a payload for one purpose; it stops verifying after max_age_seconds."""
    body = _b64(json.dumps({**payload, "exp": int(time.time()) + max_age_seconds}, separators=(",", ":")).encode())
    return f"{body}.{_mac(purpose, body)}"


def unsign(token: str | None, *, purpose: str) -> dict | None:
    """The payload if the signature, purpose and expiry are all valid; otherwise None."""
    if not token or token.count(".") != 1:
        return None
    body, mac = token.split(".")
    if not hmac.compare_digest(mac, _mac(purpose, body)):
        return None
    try:
        payload = json.loads(_unb64(body))
    except ValueError:
        return None
    if not isinstance(payload, dict) or payload.get("exp", 0) < time.time():
        return None
    payload.pop("exp")
    return payload
