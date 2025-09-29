"""Helpers for authenticating with and querying the Google Photos API."""

from __future__ import annotations

import os
from dataclasses import dataclass
from typing import Any, Dict, Iterable, List, Optional

from google.auth.transport.requests import AuthorizedSession, Request
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import Flow

_SCOPES = ("https://www.googleapis.com/auth/photoslibrary.readonly",)
_TOKEN_URI = "https://oauth2.googleapis.com/token"
_AUTH_URI = "https://accounts.google.com/o/oauth2/auth"
_API_BASE = "https://photoslibrary.googleapis.com/v1"


class GooglePhotosError(RuntimeError):
    """Raised when the Google Photos API returns an error."""


@dataclass
class Album:
    """Represents a Google Photos album."""

    id: str
    title: str
    product_url: str
    cover_photo_base_url: str = ""
    media_items_count: int = 0


@dataclass
class MediaItem:
    """Represents a Google Photos media item."""

    id: str
    base_url: str
    product_url: str
    mime_type: str = ""
    filename: str = ""


def get_client_id() -> str:
    """Return the configured Google Photos OAuth client identifier."""

    return os.getenv("GOOGLE_PHOTOS_CLIENT_ID", "").strip()


def _get_client_secret() -> str:
    """Return the configured Google Photos OAuth client secret."""

    return os.getenv("GOOGLE_PHOTOS_CLIENT_SECRET", "").strip()


def _get_client_config() -> Optional[Dict[str, Dict[str, str]]]:
    client_id = get_client_id()
    client_secret = _get_client_secret()

    if not client_id or not client_secret:
        return None

    return {
        "web": {
            "client_id": client_id,
            "client_secret": client_secret,
            "auth_uri": _AUTH_URI,
            "token_uri": _TOKEN_URI,
        }
    }


def is_configured() -> bool:
    """Return ``True`` when the Google Photos client credentials are available."""

    return _get_client_config() is not None


def get_scopes() -> List[str]:
    """Return the Google Photos OAuth scopes used by the application."""

    return list(_SCOPES)


def build_flow(redirect_uri: str, *, state: Optional[str] = None) -> Flow:
    """Return an OAuth flow configured for the Google Photos scopes."""

    config = _get_client_config()
    if config is None:
        raise GooglePhotosError("Google Photos client credentials are not configured.")

    flow = Flow.from_client_config(config, scopes=_SCOPES, state=state)
    flow.redirect_uri = redirect_uri
    return flow


def credentials_from_dict(payload: Optional[Dict[str, Any]]) -> Optional[Credentials]:
    """Create :class:`Credentials` from a serialised representation."""

    if not payload:
        return None

    token = payload.get("token")
    refresh_token = payload.get("refresh_token")
    token_uri = payload.get("token_uri", _TOKEN_URI)
    client_id = payload.get("client_id") or get_client_id()
    client_secret = payload.get("client_secret") or _get_client_secret()
    scopes = payload.get("scopes") or list(_SCOPES)

    if not token and not refresh_token:
        return None

    try:
        credentials = Credentials(
            token=token,
            refresh_token=refresh_token,
            token_uri=token_uri,
            client_id=client_id,
            client_secret=client_secret,
            scopes=scopes,
        )
    except Exception as exc:  # pragma: no cover - defensive
        raise GooglePhotosError("Failed to load Google credentials") from exc

    # Preserve expiry when supplied
    expiry = payload.get("expiry")
    if expiry:
        credentials.expiry = expiry

    return credentials


def credentials_to_dict(credentials: Credentials) -> Dict[str, Any]:
    """Serialise :class:`Credentials` for storage in a session."""

    return {
        "token": credentials.token,
        "refresh_token": credentials.refresh_token,
        "token_uri": credentials.token_uri,
        "client_id": credentials.client_id,
        "client_secret": credentials.client_secret,
        "scopes": credentials.scopes,
    }


def ensure_valid_credentials(credentials: Credentials) -> Credentials:
    """Refresh ``credentials`` when they are expired."""

    if credentials.expired and credentials.refresh_token:
        credentials.refresh(Request())
    return credentials


def _authorised_session(credentials: Credentials) -> AuthorizedSession:
    valid_credentials = ensure_valid_credentials(credentials)
    return AuthorizedSession(valid_credentials)


def get_access_token(credentials: Credentials) -> str:
    """Return a fresh access token for ``credentials``.

    Raises :class:`GooglePhotosError` when a token cannot be produced.
    """

    try:
        refreshed = ensure_valid_credentials(credentials)
    except Exception as exc:  # pragma: no cover - defensive
        raise GooglePhotosError("Failed to refresh Google Photos credentials") from exc

    token = refreshed.token
    if not token:
        raise GooglePhotosError("Google Photos credentials do not include an access token.")

    return token


def list_albums(credentials: Credentials, *, page_size: int = 50) -> List[Album]:
    """Return the user's Google Photos albums."""

    session = _authorised_session(credentials)
    params = {"pageSize": page_size}
    albums: List[Album] = []
    page_token = None

    while True:
        if page_token:
            params["pageToken"] = page_token
        response = session.get(f"{_API_BASE}/albums", params=params, timeout=30)
        if not response.ok:
            raise GooglePhotosError(
                f"Failed to fetch albums: {response.status_code} {response.text}"
            )

        payload = response.json() if response.content else {}
        for entry in payload.get("albums", []):
            album_id = str(entry.get("id") or "").strip()
            if not album_id:
                continue
            title = str(entry.get("title") or "").strip()
            product_url = str(entry.get("productUrl") or "").strip()
            cover_base_url = str(entry.get("coverPhotoBaseUrl") or "").strip()
            try:
                count_value = int(entry.get("mediaItemsCount", 0))
            except (TypeError, ValueError):
                count_value = 0
            albums.append(
                Album(
                    id=album_id,
                    title=title,
                    product_url=product_url,
                    cover_photo_base_url=cover_base_url,
                    media_items_count=max(count_value, 0),
                )
            )

        page_token = payload.get("nextPageToken")
        if not page_token:
            break

    return albums


def list_media_items(
    credentials: Credentials,
    album_id: str,
    *,
    page_size: int = 100,
) -> List[MediaItem]:
    """Return the media items contained in ``album_id``."""

    cleaned_album_id = (album_id or "").strip()
    if not cleaned_album_id:
        return []

    session = _authorised_session(credentials)
    url = f"{_API_BASE}/mediaItems:search"
    payload = {"albumId": cleaned_album_id, "pageSize": page_size}
    items: List[MediaItem] = []
    page_token = None

    while True:
        if page_token:
            payload["pageToken"] = page_token
        response = session.post(url, json=payload, timeout=30)
        if not response.ok:
            raise GooglePhotosError(
                f"Failed to fetch media items: {response.status_code} {response.text}"
            )

        data = response.json() if response.content else {}
        for entry in data.get("mediaItems", []):
            media_id = str(entry.get("id") or "").strip()
            base_url = str(entry.get("baseUrl") or "").strip()
            if not media_id or not base_url:
                continue
            product_url = str(entry.get("productUrl") or "").strip()
            mime_type = str(entry.get("mimeType") or "").strip()
            filename = str(entry.get("filename") or "").strip()
            items.append(
                MediaItem(
                    id=media_id,
                    base_url=base_url,
                    product_url=product_url,
                    mime_type=mime_type,
                    filename=filename,
                )
            )

        page_token = data.get("nextPageToken")
        if not page_token:
            break

    return items


def batch_get_media_items(
    credentials: Credentials,
    media_item_ids: Iterable[str],
) -> List[MediaItem]:
    """Return media items for the provided ``media_item_ids``."""

    cleaned_ids = [str(identifier).strip() for identifier in media_item_ids or []]
    cleaned_ids = [identifier for identifier in cleaned_ids if identifier]
    if not cleaned_ids:
        return []

    session = _authorised_session(credentials)
    response = session.post(
        f"{_API_BASE}/mediaItems:batchGet",
        json={"mediaItemIds": cleaned_ids},
        timeout=30,
    )
    if not response.ok:
        raise GooglePhotosError(
            f"Failed to fetch media item details: {response.status_code} {response.text}"
        )

    data = response.json() if response.content else {}
    results: List[MediaItem] = []
    for entry in data.get("mediaItemResults", []):
        item = entry.get("mediaItem")
        if not item:
            continue
        media_id = str(item.get("id") or "").strip()
        base_url = str(item.get("baseUrl") or "").strip()
        if not media_id or not base_url:
            continue
        product_url = str(item.get("productUrl") or "").strip()
        mime_type = str(item.get("mimeType") or "").strip()
        filename = str(item.get("filename") or "").strip()
        results.append(
            MediaItem(
                id=media_id,
                base_url=base_url,
                product_url=product_url,
                mime_type=mime_type,
                filename=filename,
            )
        )

    return results
