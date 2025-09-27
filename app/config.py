"""Application configuration helpers."""

from __future__ import annotations

import os
from dataclasses import dataclass
from typing import Optional

from dotenv import load_dotenv

from app.services.google_photos_token_store import load_refresh_token

# Ensure values from a local .env file are available before any configuration
# helpers attempt to read from the environment. ``load_dotenv`` is a no-op when
# the file does not exist which keeps imports lightweight for other callers.
load_dotenv()


@dataclass(frozen=True)
class GooglePhotosSettings:
    """Configuration values required for the Google Photos client."""

    client_id: str
    client_secret: str
    refresh_token: str
    shared_album_id: Optional[str] = None
    api_base_url: str = "https://photoslibrary.googleapis.com"
    token_url: str = "https://oauth2.googleapis.com/token"


@dataclass(frozen=True)
class GooglePhotosOAuthClientSettings:
    """Configuration required to initiate the Google Photos OAuth flow."""

    client_id: str
    client_secret: str
    scope: str = "https://www.googleapis.com/auth/photoslibrary.readonly"
    auth_base_url: str = "https://accounts.google.com/o/oauth2/v2/auth"
    token_url: str = "https://oauth2.googleapis.com/token"


def load_google_photos_settings() -> GooglePhotosSettings:
    """Load configuration for the Google Photos API from environment variables."""

    client_id = os.getenv("GOOGLE_PHOTOS_CLIENT_ID", "").strip()
    client_secret = os.getenv("GOOGLE_PHOTOS_CLIENT_SECRET", "").strip()
    refresh_token = os.getenv("GOOGLE_PHOTOS_REFRESH_TOKEN", "").strip()
    if not refresh_token:
        stored_refresh_token = load_refresh_token()
        if stored_refresh_token:
            refresh_token = stored_refresh_token
    shared_album_id = os.getenv("GOOGLE_PHOTOS_SHARED_ALBUM_ID")
    if shared_album_id:
        shared_album_id = shared_album_id.strip()

    if not client_id or not client_secret or not refresh_token:
        raise RuntimeError(
            "Missing Google Photos OAuth configuration. Set GOOGLE_PHOTOS_CLIENT_ID and "
            "GOOGLE_PHOTOS_CLIENT_SECRET, then connect Google Photos through the in-app "
            "sign-in flow."
        )

    return GooglePhotosSettings(
        client_id=client_id,
        client_secret=client_secret,
        refresh_token=refresh_token,
        shared_album_id=shared_album_id or None,
    )


def load_google_photos_oauth_client_settings() -> GooglePhotosOAuthClientSettings:
    """Return OAuth configuration without requiring a refresh token."""

    client_id = os.getenv("GOOGLE_PHOTOS_CLIENT_ID", "").strip()
    client_secret = os.getenv("GOOGLE_PHOTOS_CLIENT_SECRET", "").strip()

    if not client_id or not client_secret:
        raise RuntimeError(
            "Missing Google Photos OAuth client configuration. Set GOOGLE_PHOTOS_CLIENT_ID "
            "and GOOGLE_PHOTOS_CLIENT_SECRET."
        )

    return GooglePhotosOAuthClientSettings(
        client_id=client_id,
        client_secret=client_secret,
    )
