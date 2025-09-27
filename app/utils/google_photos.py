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
_AlbumCacheEntry = tuple[float, List[Dict[str, object]]]
_ALBUM_CACHE: Optional[_AlbumCacheEntry] = None
_ALBUM_CACHE_TTL_SECONDS = 900


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


def fetch_album_images(
    url: str = "",
    *,
    album_id: Optional[str] = None,
    max_images: int = _DEFAULT_MAX_IMAGES,
) -> List[str]:
    """Return a list of high-resolution image URLs for a Google Photos album."""

    cleaned_url = _clean_url(url)
    cleaned_album_id = album_id.strip() if isinstance(album_id, str) else ""

    if not cleaned_url and not cleaned_album_id:
        return []

    cache_key = f"id:{cleaned_album_id}" if cleaned_album_id else cleaned_url

    now = time.time()
    cache_entry = _CACHE.get(cache_key)
    if cache_entry and now - cache_entry[0] < _CACHE_TTL_SECONDS:
        return list(cache_entry[1])

    try:
        client = get_google_photos_client()
    except RuntimeError:
        _LOGGER.info("Google Photos client is not configured; skipping fetch")
        return []

    resolved_album_id = cleaned_album_id or client.settings.shared_album_id or _extract_album_token(cleaned_url)
    if not resolved_album_id:
        _LOGGER.warning("No album identifier is configured or present in the request")
        return []

    media_items = _fetch_media_items(client, resolved_album_id)
    images = _translate_media_items(media_items, max_images=max_images)

    _CACHE[cache_key] = (now, images)
    return list(images)


def _normalise_album_entry(entry: Dict) -> Optional[Dict[str, object]]:
    if not isinstance(entry, dict):
        return None

    album_id_raw = entry.get("id")
    album_id = str(album_id_raw or "").strip()
    if not album_id:
        return None

    title_raw = entry.get("title")
    title = str(title_raw or "").strip()
    product_url_raw = entry.get("productUrl")
    product_url = str(product_url_raw or "").strip()

    share_info = entry.get("shareInfo") or {}
    shareable_url = ""
    if isinstance(share_info, dict):
        shareable_url = str(share_info.get("shareableUrl") or "").strip()

    cover_photo_base = str(entry.get("coverPhotoBaseUrl") or "").strip()
    cover_photo_url = _normalise_resolution(cover_photo_base) if cover_photo_base else ""

    media_items_raw = entry.get("mediaItemsCount")
    media_items_count = 0
    if media_items_raw is not None:
        try:
            media_items_count = int(media_items_raw)
        except (TypeError, ValueError):
            media_items_count = 0

    is_writeable = bool(entry.get("isWriteable"))

    if not product_url and shareable_url:
        product_url = shareable_url

    return {
        "id": album_id,
        "title": title or "Untitled album",
        "product_url": product_url,
        "cover_photo_url": cover_photo_url,
        "media_items_count": media_items_count,
        "is_writeable": is_writeable,
        "shareable_url": shareable_url,
    }


def list_google_photos_albums(*, force_refresh: bool = False) -> List[Dict[str, object]]:
    """Return the albums available to the configured Google Photos client."""

    global _ALBUM_CACHE

    now = time.time()
    if not force_refresh and _ALBUM_CACHE and now - _ALBUM_CACHE[0] < _ALBUM_CACHE_TTL_SECONDS:
        cached_albums = _ALBUM_CACHE[1]
        return [dict(album) for album in cached_albums]

    try:
        client = get_google_photos_client()
    except RuntimeError as exc:
        raise RuntimeError("Google Photos is not connected.") from exc

    try:
        raw_albums = client.list_albums()
    except GooglePhotosAPIError as exc:
        _LOGGER.warning("Failed to list Google Photos albums: %s", exc)
        raise

    seen: set[str] = set()
    normalised: List[Dict[str, object]] = []

    for entry in raw_albums:
        album = _normalise_album_entry(entry)
        if not album:
            continue
        identifier = str(album.get("id") or "").strip()
        if not identifier or identifier in seen:
            continue
        seen.add(identifier)
        normalised.append(album)

    normalised.sort(key=lambda album: str(album.get("title") or "").lower())
    _ALBUM_CACHE = (now, normalised)
    return [dict(album) for album in normalised]
