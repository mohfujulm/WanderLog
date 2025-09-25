"""Helpers for retrieving preview images from Google Photos albums."""

from __future__ import annotations

import socket
from typing import Iterable, List, Sequence
from urllib.error import HTTPError, URLError
from urllib.parse import urlparse
from urllib.request import Request, urlopen

import re

USER_AGENT = (
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36"
)

# Google Photos share pages embed direct image links hosted on ``lh3.googleusercontent``.
# The following expression extracts those URLs without executing the remote scripts.
IMAGE_URL_PATTERN = re.compile(r"https://lh3\.googleusercontent\.com/[^\"'<>\\\s]+")

# Maximum number of photos to return when building a preview gallery.
DEFAULT_PHOTO_LIMIT = 30

# Default size parameters appended to generated preview URLs.
FULL_SIZE_PARAMETERS = "w2048-h1536-no"
THUMBNAIL_PARAMETERS = "w400-h400-no"


def _is_supported_google_photos_host(hostname: str) -> bool:
    """Return ``True`` if ``hostname`` looks like a Google Photos domain."""

    host = (hostname or "").lower()
    if not host:
        return False

    allowed_domains: Sequence[str] = (
        "photos.app.goo.gl",
        "photos.google.com",
        "googleusercontent.com",
        "ggpht.com",
    )

    return any(host == domain or host.endswith(f".{domain}") for domain in allowed_domains)


def _strip_size_parameters(url: str) -> str:
    """Remove size or query parameters from a Google Photos image URL."""

    if not url:
        return ""

    base = url.split("=")[0]
    base = base.split("?")[0]
    return base.strip()


def _unique(iterable: Iterable[str]) -> List[str]:
    """Return ``iterable`` without duplicates while preserving order."""

    seen = set()
    result: List[str] = []
    for item in iterable:
        if item and item not in seen:
            seen.add(item)
            result.append(item)
    return result


def fetch_google_photos_album(album_url: str, *, limit: int = DEFAULT_PHOTO_LIMIT) -> List[dict]:
    """Return a list of preview images for the shared Google Photos album.

    The function fetches the public album page and extracts any direct image URLs
    that are embedded in the HTML payload. The images are returned as dictionaries
    containing ``url`` and ``thumbnail_url`` keys that point to resized versions
    of each photo suitable for display in the WanderLog UI.
    """

    cleaned_url = (album_url or "").strip()
    if not cleaned_url:
        return []

    parsed = urlparse(cleaned_url)
    if parsed.scheme not in {"http", "https"}:
        raise ValueError("Album URL must start with http:// or https://.")

    if not _is_supported_google_photos_host(parsed.netloc):
        raise ValueError("Album URL must be a Google Photos share link.")

    request = Request(cleaned_url, headers={"User-Agent": USER_AGENT})

    try:
        with urlopen(request, timeout=10) as response:
            content_bytes = response.read()
    except (HTTPError, URLError, socket.timeout) as exc:  # pragma: no cover - network failure
        raise RuntimeError("Failed to download album contents. Please try again later.") from exc

    try:
        html = content_bytes.decode("utf-8", errors="replace")
    except Exception as exc:  # pragma: no cover - extremely unlikely decoding failure
        raise RuntimeError("Album page could not be decoded.") from exc

    matches = IMAGE_URL_PATTERN.findall(html)
    if not matches:
        raise RuntimeError("No photos were found in the shared album.")

    base_urls = _unique(_strip_size_parameters(match) for match in matches)
    if not base_urls:
        raise RuntimeError("No photos were found in the shared album.")

    photos = []
    max_items = max(int(limit or 0), 0) or DEFAULT_PHOTO_LIMIT

    for index, base_url in enumerate(base_urls[:max_items], start=1):
        full_url = f"{base_url}={FULL_SIZE_PARAMETERS}"
        thumb_url = f"{base_url}={THUMBNAIL_PARAMETERS}"
        photos.append(
            {
                "id": f"photo-{index}",
                "url": full_url,
                "thumbnail_url": thumb_url,
                "source_url": base_url,
            }
        )

    return photos

