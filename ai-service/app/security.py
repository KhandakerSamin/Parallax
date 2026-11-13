"""Who may use the AI service, and proof that a result really came from it.

The service runs on a public URL, so in production (AI_SHARED_SECRET set) every
analysis needs one of:

- ``X-Parallax-Key``: the shared secret itself, sent by the Parallax backend
  (server to server).
- ``X-Parallax-Ticket``: a short-lived ticket the backend signed for one
  signed-in user, sent by that user's browser when it uploads a PDF directly
  (large files cannot pass through the website's host).

Each result is signed for the ticket's user, so the backend can tell a genuine
result from one edited in the browser before it is saved as a report.

Tokens use the same format as the backend's ``app/core/signing.py``:
``base64url(json payload) "." base64url(HMAC-SHA256(secret, purpose "." body))``.
"""

from __future__ import annotations

import base64
import hashlib
import hmac
import json
import os
import time
from typing import Any

from fastapi import Header, HTTPException, status

DEV_SECRET = "dev-ai-shared-secret"
TICKET_PURPOSE = "ai-ticket"
RESULT_PURPOSE = "ai-result"
RESULT_TTL_SECONDS = 60 * 60


def shared_secret() -> str:
    return os.getenv("AI_SHARED_SECRET") or DEV_SECRET


def auth_required() -> bool:
    """Open in local development; locked once a real secret is configured."""
    return bool(os.getenv("AI_SHARED_SECRET"))


def _b64(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode()


def _unb64(text: str) -> bytes:
    return base64.urlsafe_b64decode(text + "=" * (-len(text) % 4))


def _mac(purpose: str, body: str) -> str:
    return _b64(hmac.new(shared_secret().encode(), f"{purpose}.{body}".encode(), hashlib.sha256).digest())


def read_ticket(token: str | None) -> dict | None:
    """The ticket's payload ({"sub": user id}) if it is genuine and unexpired, else None."""
    if not token or token.count(".") != 1:
        return None
    body, mac = token.split(".")
    if not hmac.compare_digest(mac, _mac(TICKET_PURPOSE, body)):
        return None
    try:
        payload = json.loads(_unb64(body))
    except ValueError:
        return None
    if not isinstance(payload, dict) or payload.get("exp", 0) < time.time():
        return None
    return payload


def _normalise(value: Any) -> Any:
    # JSON written by a browser turns 1.0 into 1, so whole floats become ints on both sides.
    if isinstance(value, float) and value.is_integer():
        return int(value)
    if isinstance(value, dict):
        return {k: _normalise(v) for k, v in value.items()}
    if isinstance(value, list):
        return [_normalise(v) for v in value]
    return value


def digest(result: dict) -> str:
    """A fingerprint of a result that survives a round trip through a browser."""
    canonical = json.dumps(_normalise(result), sort_keys=True, separators=(",", ":"), ensure_ascii=False)
    return hashlib.sha256(canonical.encode()).hexdigest()


def sign_result(result: dict, subject: str) -> str:
    """Sign a result (without its `signature` field) for one user; valid for an hour."""
    body = _b64(
        json.dumps(
            {"sub": subject, "sha": digest(result), "exp": int(time.time()) + RESULT_TTL_SECONDS},
            separators=(",", ":"),
        ).encode()
    )
    return f"{body}.{_mac(RESULT_PURPOSE, body)}"


def require_access(
    x_parallax_key: str | None = Header(default=None),
    x_parallax_ticket: str | None = Header(default=None),
) -> str:
    """FastAPI dependency: who is calling. "backend", a user id, or "dev" when open."""
    if x_parallax_key and hmac.compare_digest(x_parallax_key, shared_secret()):
        return "backend"
    ticket = read_ticket(x_parallax_ticket)
    if ticket and isinstance(ticket.get("sub"), str):
        return ticket["sub"]
    if not auth_required():
        return "dev"
    raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Sign in to Parallax to run an analysis.")
