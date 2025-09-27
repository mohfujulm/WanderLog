"""Persistence helpers for Google Photos OAuth tokens."""

from __future__ import annotations

import json
import os
from pathlib import Path
from threading import Lock
from time import time
from typing import Any, Dict, Optional

_TOKEN_STORE_ENV_VAR = "GOOGLE_PHOTOS_TOKEN_STORE_PATH"
_DEFAULT_FILENAME = "google_photos_tokens.json"
_LOCK = Lock()


def _resolve_store_path() -> Path:
    """Return the file path used to persist Google Photos tokens."""

    override = os.getenv(_TOKEN_STORE_ENV_VAR)
    if override:
        return Path(override).expanduser()

    # Default to the repository root's ``instance`` directory so the token file
    # lives outside the tracked source tree while remaining close to the app.
    root = Path(__file__).resolve().parents[2]
    instance_dir = root / "instance"
    return instance_dir / _DEFAULT_FILENAME


def get_token_store_path() -> Path:
    """Expose the resolved path for diagnostics and documentation."""

    return _resolve_store_path()


def load_tokens() -> Dict[str, Any]:
    """Return the persisted token payload, if present."""

    path = _resolve_store_path()
    try:
        with path.open("r", encoding="utf-8") as handle:
            data = json.load(handle)
    except FileNotFoundError:
        return {}
    except (OSError, ValueError, json.JSONDecodeError):
        # Treat unreadable or malformed payloads as missing.
        return {}

    if not isinstance(data, dict):
        return {}

    return data


def load_refresh_token() -> Optional[str]:
    """Return the stored refresh token, if available."""

    data = load_tokens()
    refresh_token = data.get("refresh_token")
    if isinstance(refresh_token, str):
        refresh_token = refresh_token.strip()
        if refresh_token:
            return refresh_token
    return None


def save_tokens(
    *,
    refresh_token: str,
    access_token: Optional[str] = None,
    expires_in: Optional[float] = None,
    token_payload: Optional[Dict[str, Any]] = None,
    clock=time,
) -> Dict[str, Any]:
    """Persist Google OAuth tokens to disk.

    The refresh token is required so the backend can request fresh access tokens
    as needed. The access token and expiry are stored for observability only.
    """

    if not refresh_token:
        raise ValueError("refresh_token is required to persist Google Photos tokens")

    expires_at: Optional[float] = None
    if expires_in is not None:
        try:
            expires_at = float(expires_in) + float(clock())
        except (TypeError, ValueError):
            expires_at = None

    payload: Dict[str, Any] = {
        "refresh_token": refresh_token,
        "access_token": access_token,
        "expires_at": expires_at,
    }
    if token_payload is not None:
        payload["token_payload"] = token_payload

    path = _resolve_store_path()
    path.parent.mkdir(parents=True, exist_ok=True)

    serialisable_payload = payload

    with _LOCK:
        with path.open("w", encoding="utf-8") as handle:
            json.dump(serialisable_payload, handle, indent=2, sort_keys=True)
            handle.write("\n")

    return payload


__all__ = [
    "get_token_store_path",
    "load_refresh_token",
    "load_tokens",
    "save_tokens",
]
