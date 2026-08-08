import hashlib
import hmac
import json
import os
import time
import base64


def _base64url_decode(value: str) -> bytes:
    padding = "=" * (-len(value) % 4)
    return base64.urlsafe_b64decode(value + padding)


def _verify_supabase_jwt(token: str) -> bool:
    jwt_secret = os.getenv("SUPABASE_JWT_SECRET")

    if not jwt_secret:
        return False

    parts = token.split(".")

    if len(parts) != 3:
        return False

    header_part, payload_part, signature_part = parts
    signing_input = f"{header_part}.{payload_part}".encode("utf-8")

    try:
        header = json.loads(_base64url_decode(header_part))
        payload = json.loads(_base64url_decode(payload_part))
        signature = _base64url_decode(signature_part)
    except (ValueError, json.JSONDecodeError):
        return False

    if header.get("alg") != "HS256":
        return False

    expected_signature = hmac.new(
        jwt_secret.encode("utf-8"),
        signing_input,
        hashlib.sha256
    ).digest()

    if not hmac.compare_digest(signature, expected_signature):
        return False

    expires_at = payload.get("exp")

    if isinstance(expires_at, (int, float)) and int(expires_at) < int(time.time()):
        return False

    audience = payload.get("aud")

    if audience not in (None, "authenticated"):
        return False

    return True


def is_token_valid(token: str) -> bool:
    if _verify_supabase_jwt(token):
        return True

    parts = token.split(".")

    if len(parts) != 3:
        return False

    try:
        payload = json.loads(_base64url_decode(parts[1]))
    except (ValueError, json.JSONDecodeError):
        return False

    expires_at = payload.get("exp")

    if not isinstance(expires_at, (int, float)):
        return False

    if int(expires_at) < int(time.time()):
        return False

    audience = payload.get("aud")

    return audience in (None, "authenticated")