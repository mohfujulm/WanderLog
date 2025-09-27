"""Persistence helpers for Google Photos OAuth tokens."""

from __future__ import annotations

import json
import os
import tempfile
from dataclasses import dataclass
from pathlib import Path
from threading import Lock
from time import time
from typing import Any, Dict, Optional

_TOKEN_STORE_ENV_VAR = "GOOGLE_PHOTOS_TOKEN_STORE_PATH"
_DEFAULT_FILENAME = "google_photos_tokens.json"
_LOCK = Lock()


@dataclass(frozen=True)
class AccessTokenStatus:
    """Description of the currently stored Google Photos access token."""

    refresh_token_present: bool
    access_token_present: bool
    access_token_valid: bool
    access_token_expires_at: Optional[float]


def _candidate_directories():
    """Yield directories that may contain the token store."""

    root = Path(__file__).resolve().parents[2]
    yield root / "instance"

    home = Path.home()
    if home:
        yield home / ".config" / "wanderlog"
        yield home / ".wanderlog"

    xdg_state_home = os.getenv("XDG_STATE_HOME")
    if xdg_state_home:
        yield Path(xdg_state_home) / "wanderlog"

    xdg_data_home = os.getenv("XDG_DATA_HOME")
    if xdg_data_home:
        yield Path(xdg_data_home) / "wanderlog"

    yield Path.cwd()


def _resolve_store_path() -> Path:
    """Return the file path used to persist Google Photos tokens."""

    override = os.getenv(_TOKEN_STORE_ENV_VAR)
    if override:
        return Path(override).expanduser()

    for directory in _candidate_directories():
        try:
            directory.mkdir(parents=True, exist_ok=True)
        except OSError:
            continue

        if os.access(directory, os.W_OK):
            return directory / _DEFAULT_FILENAME

    temp_directory = _resolve_temp_directory()
    if temp_directory is not None:
        return temp_directory / _DEFAULT_FILENAME

    raise RuntimeError(
        "Unable to locate a writable directory for the Google Photos token store. "
        "Set GOOGLE_PHOTOS_TOKEN_STORE_PATH to a writable location and retry."
    )


def _resolve_temp_directory() -> Optional[Path]:
    """Return a writable temporary directory for the token store if available."""

    temp_root = Path(tempfile.gettempdir())
    candidate = temp_root / "wanderlog"

    try:
        candidate.mkdir(parents=True, exist_ok=True)
    except OSError:
        return None

    if os.access(candidate, os.W_OK):
        return candidate

    return None


def get_token_store_path() -> Path:
    """Expose the resolved path for diagnostics and documentation."""

    return _resolve_store_path()


def load_tokens() -> Dict[str, Any]:
    """Return the persisted token payload, if present."""

    try:
        path = _resolve_store_path()
    except RuntimeError:
        return {}
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

    try:
        path.parent.mkdir(parents=True, exist_ok=True)
    except OSError as exc:
        raise RuntimeError(
            "Unable to create the Google Photos token directory. Set "
            "GOOGLE_PHOTOS_TOKEN_STORE_PATH to a writable location and retry."
        ) from exc

    serialisable_payload = payload

    try:
        with _LOCK:
            with path.open("w", encoding="utf-8") as handle:
                json.dump(serialisable_payload, handle, indent=2, sort_keys=True)
                handle.write("\n")
    except OSError as exc:
        raise RuntimeError(
            "Unable to write the Google Photos token file at "
            f"{path}. Set GOOGLE_PHOTOS_TOKEN_STORE_PATH to a writable "
            "location and retry."
        ) from exc

    return payload


def clear_tokens() -> bool:
    """Remove the persisted token payload, if present."""

    path = _resolve_store_path()

    with _LOCK:
        try:
            path.unlink()
        except FileNotFoundError:
            return False
        except OSError as exc:
            raise RuntimeError(
                "Unable to delete the Google Photos token file at "
                f"{path}. Set GOOGLE_PHOTOS_TOKEN_STORE_PATH to a writable "
                "location and retry."
            ) from exc

    return True


def get_access_token_status(*, clock=time) -> AccessTokenStatus:
    """Return information about the stored access token and its expiry."""

    data = load_tokens()

    refresh_token = data.get("refresh_token")
    refresh_token_present = isinstance(refresh_token, str) and bool(refresh_token.strip())

    access_token = data.get("access_token")
    access_token_present = isinstance(access_token, str) and bool(access_token.strip())

    expires_at_raw = data.get("expires_at")
    expires_at: Optional[float] = None
    if expires_at_raw is not None:
        try:
            expires_at = float(expires_at_raw)
        except (TypeError, ValueError):
            expires_at = None

    now: Optional[float]
    try:
        now = float(clock())
    except (TypeError, ValueError):
        now = None

    access_token_valid = False
    if access_token_present and expires_at is not None and now is not None:
        access_token_valid = now < expires_at

    return AccessTokenStatus(
        refresh_token_present=refresh_token_present,
        access_token_present=access_token_present,
        access_token_valid=access_token_valid,
        access_token_expires_at=expires_at,
    )


__all__ = [
    "AccessTokenStatus",
    "clear_tokens",
    "get_access_token_status",
    "get_token_store_path",
    "load_refresh_token",
    "load_tokens",
    "save_tokens",
]
