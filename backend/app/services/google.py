"""Google sign-in with the OAuth 2.0 authorization-code flow, PKCE and OpenID Connect.

The ID token is fetched by the server directly from Google's token endpoint over
TLS, so per OpenID Connect Core §3.1.3.7 its issuer can be trusted from the TLS
connection instead of a signature check. Its claims (iss, aud, exp,
email_verified) are still validated here.
"""

import base64
import hashlib
import json
import secrets
import time
from dataclasses import dataclass
from urllib.parse import urlencode

import httpx

from app.core.config import get_settings

AUTHORIZE_URL = "https://accounts.google.com/o/oauth2/v2/auth"
TOKEN_URL = "https://oauth2.googleapis.com/token"
ISSUERS = {"https://accounts.google.com", "accounts.google.com"}


class GoogleAuthError(Exception):
    """The exchange failed or the token was not acceptable."""


@dataclass(frozen=True)
class GoogleIdentity:
    sub: str
    email: str
    name: str


@dataclass(frozen=True)
class AuthorizationRequest:
    url: str
    state: str
    code_verifier: str


def _b64url(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode()


def build_authorization_request() -> AuthorizationRequest:
    settings = get_settings()
    state = secrets.token_urlsafe(24)
    code_verifier = secrets.token_urlsafe(48)
    challenge = _b64url(hashlib.sha256(code_verifier.encode()).digest())
    params = {
        "client_id": settings.google_client_id,
        "redirect_uri": settings.google_redirect_uri,
        "response_type": "code",
        "scope": "openid email profile",
        "state": state,
        "code_challenge": challenge,
        "code_challenge_method": "S256",
        "prompt": "select_account",
    }
    # With a single allowed domain, ask Google to show only accounts from it.
    if len(settings.email_domains) == 1:
        params["hd"] = settings.email_domains[0]
    return AuthorizationRequest(f"{AUTHORIZE_URL}?{urlencode(params)}", state, code_verifier)


def exchange_code(code: str, code_verifier: str) -> str:
    """Trade the authorization code for an ID token (raw JWT)."""
    settings = get_settings()
    try:
        response = httpx.post(
            TOKEN_URL,
            data={
                "code": code,
                "client_id": settings.google_client_id,
                "client_secret": settings.google_client_secret,
                "redirect_uri": settings.google_redirect_uri,
                "grant_type": "authorization_code",
                "code_verifier": code_verifier,
            },
            timeout=10,
        )
    except httpx.HTTPError as exc:
        raise GoogleAuthError("could not reach Google") from exc
    if response.status_code != 200:
        raise GoogleAuthError(f"token endpoint returned {response.status_code}")
    id_token = response.json().get("id_token")
    if not isinstance(id_token, str):
        raise GoogleAuthError("no id_token in response")
    return id_token


def parse_id_token(id_token: str, *, now: float | None = None) -> GoogleIdentity:
    """Validate the claims of an ID token received straight from Google's token endpoint."""
    try:
        payload_part = id_token.split(".")[1]
        claims = json.loads(base64.urlsafe_b64decode(payload_part + "=" * (-len(payload_part) % 4)))
    except (IndexError, ValueError) as exc:
        raise GoogleAuthError("malformed id_token") from exc

    settings = get_settings()
    now = now if now is not None else time.time()
    audience = claims.get("aud")
    audiences = audience if isinstance(audience, list) else [audience]
    if claims.get("iss") not in ISSUERS:
        raise GoogleAuthError("unexpected issuer")
    if settings.google_client_id not in audiences:
        raise GoogleAuthError("token was issued to another client")
    if not isinstance(claims.get("exp"), int | float) or claims["exp"] < now:
        raise GoogleAuthError("token expired")
    if claims.get("email_verified") is not True or not claims.get("email") or not claims.get("sub"):
        raise GoogleAuthError("email not verified")

    email = str(claims["email"]).lower()
    name = str(claims.get("name") or email.split("@")[0]).strip()[:80]
    return GoogleIdentity(sub=str(claims["sub"]), email=email, name=name)
