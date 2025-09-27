"""Google Photos API client used to read shared album media."""

from __future__ import annotations

import logging
import time
from dataclasses import dataclass
from typing import Dict, List, Optional

import requests
from requests import Response

from app.config import GooglePhotosSettings, load_google_photos_settings

_LOGGER = logging.getLogger(__name__)
_DEFAULT_PAGE_SIZE = 50
_TOKEN_EXPIRY_SAFETY_WINDOW = 60  # seconds


class GooglePhotosAPIError(RuntimeError):
    """Raised when the Google Photos API returns an error response."""


@dataclass
class _TokenCache:
    access_token: str
    expires_at: float

    def is_valid(self, now: float) -> bool:
        return bool(self.access_token) and now + _TOKEN_EXPIRY_SAFETY_WINDOW < self.expires_at


class GooglePhotosClient:
    """Client capable of fetching media items and albums from Google Photos."""

    def __init__(
        self,
        settings: GooglePhotosSettings,
        *,
        session: Optional[requests.Session] = None,
        clock=time.time,
    ) -> None:
        self._settings = settings
        self._session = session or requests.Session()
        self._clock = clock
        self._token_cache: Optional[_TokenCache] = None

    @classmethod
    def from_environment(cls) -> "GooglePhotosClient":
        return cls(load_google_photos_settings())

    @property
    def settings(self) -> GooglePhotosSettings:
        return self._settings

    def list_media_items(self, album_id: str) -> List[Dict]:
        """Return all media items for the specified album."""

        if not album_id:
            raise GooglePhotosAPIError("An album id is required to call mediaItems.search")

        media_items: List[Dict] = []
        page_token: Optional[str] = None

        while True:
            payload: Dict[str, object] = {"albumId": album_id, "pageSize": _DEFAULT_PAGE_SIZE}
            if page_token:
                payload["pageToken"] = page_token

            response = self._authenticated_post("/v1/mediaItems:search", json=payload)
            data = self._extract_json(response)

            items = data.get("mediaItems", []) or []
            if not isinstance(items, list):
                raise GooglePhotosAPIError("Unexpected mediaItems payload from Google Photos API")
            media_items.extend(item for item in items if isinstance(item, dict))

            page_token = data.get("nextPageToken")
            if not page_token:
                break

        return media_items

    def list_albums(self) -> List[Dict]:
        """Return the albums available to the authenticated user."""

        personal_albums = self._list_collection("/v1/albums", "albums")
        shared_albums = self._list_collection("/v1/sharedAlbums", "sharedAlbums")

        combined: List[Dict] = []
        seen: set[str] = set()

        for album in personal_albums + shared_albums:
            if not isinstance(album, dict):
                continue
            album_id = album.get("id")
            if album_id is None:
                continue
            identifier = str(album_id).strip()
            if not identifier or identifier in seen:
                continue
            seen.add(identifier)
            combined.append(album)

        return combined

    # ------------------------------------------------------------------
    def _authenticated_post(self, path: str, *, json: Dict[str, object]) -> Response:
        token = self._get_access_token()
        url = f"{self._settings.api_base_url}{path}"
        headers = {"Authorization": f"Bearer {token}"}

        try:
            response = self._session.post(url, json=json, headers=headers, timeout=15)
        except requests.RequestException as exc:  # pragma: no cover - network failure path
            raise GooglePhotosAPIError("Error calling Google Photos API") from exc

        if response.status_code >= 400:
            raise GooglePhotosAPIError(
                f"Google Photos API returned {response.status_code}: {response.text.strip()}"
            )
        return response

    def _authenticated_get(self, path: str, *, params: Optional[Dict[str, object]] = None) -> Response:
        token = self._get_access_token()
        url = f"{self._settings.api_base_url}{path}"
        headers = {"Authorization": f"Bearer {token}"}

        try:
            response = self._session.get(url, params=params, headers=headers, timeout=15)
        except requests.RequestException as exc:  # pragma: no cover - network failure path
            raise GooglePhotosAPIError("Error calling Google Photos API") from exc

        if response.status_code >= 400:
            raise GooglePhotosAPIError(
                f"Google Photos API returned {response.status_code}: {response.text.strip()}"
            )
        return response

    def _list_collection(self, path: str, key: str) -> List[Dict]:
        items: List[Dict] = []
        page_token: Optional[str] = None

        while True:
            params: Dict[str, object] = {"pageSize": _DEFAULT_PAGE_SIZE}
            if page_token:
                params["pageToken"] = page_token

            response = self._authenticated_get(path, params=params)
            data = self._extract_json(response)

            collection = data.get(key, []) or []
            if not isinstance(collection, list):
                raise GooglePhotosAPIError(
                    f"Unexpected {key} payload from Google Photos API"
                )
            items.extend(item for item in collection if isinstance(item, dict))

            page_token = data.get("nextPageToken")
            if not page_token:
                break

        return items

    def _get_access_token(self) -> str:
        now = self._clock()
        if self._token_cache and self._token_cache.is_valid(now):
            return self._token_cache.access_token

        payload = {
            "client_id": self._settings.client_id,
            "client_secret": self._settings.client_secret,
            "refresh_token": self._settings.refresh_token,
            "grant_type": "refresh_token",
        }

        try:
            response = self._session.post(self._settings.token_url, data=payload, timeout=15)
        except requests.RequestException as exc:  # pragma: no cover - network failure path
            raise GooglePhotosAPIError("Unable to refresh Google Photos access token") from exc

        if response.status_code >= 400:
            raise GooglePhotosAPIError(
                f"Google Photos token endpoint returned {response.status_code}: {response.text.strip()}"
            )

        data = self._extract_json(response)
        access_token = data.get("access_token")
        expires_in = data.get("expires_in")
        if not access_token or not expires_in:
            raise GooglePhotosAPIError("Invalid token response from Google OAuth endpoint")

        try:
            expires_at = now + float(expires_in)
        except (TypeError, ValueError) as exc:
            raise GooglePhotosAPIError("Invalid expires_in value in token response") from exc

        self._token_cache = _TokenCache(access_token=access_token, expires_at=expires_at)
        return access_token

    def _extract_json(self, response: Response) -> Dict:
        try:
            payload = response.json()
        except ValueError as exc:  # pragma: no cover - handled as an error case
            raise GooglePhotosAPIError("Failed to decode Google Photos response as JSON") from exc

        if not isinstance(payload, dict):
            raise GooglePhotosAPIError("Unexpected payload returned by Google Photos API")
        return payload


_client_instance: Optional[GooglePhotosClient] = None


def get_google_photos_client() -> GooglePhotosClient:
    """Return a cached GooglePhotosClient instance."""

    global _client_instance
    if _client_instance is None:
        try:
            _client_instance = GooglePhotosClient.from_environment()
        except RuntimeError as exc:
            _LOGGER.warning("Google Photos client is not configured: %s", exc)
            raise
    return _client_instance


def reset_google_photos_client() -> None:
    """Clear the cached GooglePhotosClient instance."""

    global _client_instance
    _client_instance = None
