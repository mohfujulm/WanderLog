"""Utilities for extracting images from shared Google Photos albums."""

from __future__ import annotations

import logging
import time
from typing import Dict, Iterable, List, Optional

from app.services.google_photos_api import (
    GooglePhotosAPIError,
    GooglePhotosClient,
    get_google_photos_client,
)

_LOGGER = logging.getLogger(__name__)
_CACHE_TTL_SECONDS = 3600
_DEFAULT_MAX_IMAGES = 50
_PREFERRED_WIDTH = 2048
_AVATAR_KEYWORDS = ("avatar", "profile", "userphoto", "contacts")

_CacheEntry = tuple[float, List[str]]
_CACHE: Dict[str, _CacheEntry] = {}


def _clean_url(url: str) -> str:
    if not isinstance(url, str):
        return ""
    return url.strip()


def _extract_album_token(url: str) -> Optional[str]:
    if not url:
        return None
    cleaned = url.rstrip("/")
    token = cleaned.split("/")[-1]
    return token or None


def _normalise_resolution(base_url: str) -> str:
    if not base_url:
        return ""
    if base_url.endswith("="):
        base_url = base_url[:-1]
    if "=" in base_url:
        # Replace any existing size directives to request the preferred width.
        prefix, _ = base_url.split("=", 1)
        return f"{prefix}=w{_PREFERRED_WIDTH}"
    return f"{base_url}=w{_PREFERRED_WIDTH}"


def _is_avatar(item: Dict, url: str) -> bool:
    filename = str(item.get("filename", "")).lower()
    description = str(item.get("description", "")).lower()
    metadata = item.get("mediaMetadata", {}) or {}
    photo_meta = metadata.get("photo", {}) or {}
    camera_model = str(photo_meta.get("cameraModel", "")).lower()

    searchable_values: Iterable[str] = (filename, description, camera_model, url.lower())
    return any(keyword in value for value in searchable_values for keyword in _AVATAR_KEYWORDS)


def _is_supported_image(item: Dict) -> bool:
    mime_type = str(item.get("mimeType", "")).lower()
    return mime_type.startswith("image/")


def _translate_media_items(items: Iterable[Dict], *, max_images: int) -> List[str]:
    images: List[str] = []
    for item in items:
        if not isinstance(item, dict):
            continue
        if not _is_supported_image(item):
            continue

        base_url = str(item.get("baseUrl", ""))
        if not base_url:
            continue

        full_url = _normalise_resolution(base_url)
        if not full_url or _is_avatar(item, full_url):
            continue

        images.append(full_url)
        if len(images) >= max_images:
            break

    return images


def _fetch_media_items(client: GooglePhotosClient, album_id: str) -> List[Dict]:
    try:
        return client.list_media_items(album_id)
    except GooglePhotosAPIError as exc:
        _LOGGER.warning("Failed to load Google Photos album: %s", exc)
        return []


def fetch_album_images(url: str, *, max_images: int = _DEFAULT_MAX_IMAGES) -> List[str]:
    """Return a list of high-resolution image URLs for a shared album."""

    cleaned_url = _clean_url(url)
    if not cleaned_url:
        return []

    now = time.time()
    cache_entry = _CACHE.get(cleaned_url)
    if cache_entry and now - cache_entry[0] < _CACHE_TTL_SECONDS:
        return list(cache_entry[1])

    try:
        client = get_google_photos_client()
    except RuntimeError:
        _LOGGER.info("Google Photos client is not configured; skipping fetch")
        return []

    album_id = client.settings.shared_album_id or _extract_album_token(cleaned_url)
    if not album_id:
        _LOGGER.warning("No shared album identifier is configured or present in the URL")
        return []

    media_items = _fetch_media_items(client, album_id)
    images = _translate_media_items(media_items, max_images=max_images)

    _CACHE[cleaned_url] = (now, images)
    return list(images)
