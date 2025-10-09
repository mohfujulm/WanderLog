"""Utilities for persisting and retrieving trip information.

The application stores trips separately from the main timeline data so that
users can group locations into itineraries. Trips are persisted to a JSON
file on disk and cached in memory for quick access during a single process
lifetime. Each trip keeps track of the place identifiers that belong to it
so that the frontend can associate timeline markers with the selected trip.
"""

from __future__ import annotations

import json
import os
from dataclasses import dataclass, field, asdict
from datetime import datetime, timezone
from typing import Any, Dict, Iterable, List, Optional, Tuple
from uuid import uuid4

TRIPS_PATH = os.path.join("data", "trips.json")


def _utcnow_iso() -> str:
    """Return the current UTC time in ISO 8601 format."""

    return datetime.now(timezone.utc).isoformat()


def _clean_string(value: Any) -> str:
    """Return ``value`` coerced to a stripped string."""

    if value is None:
        return ""
    if isinstance(value, str):
        return value.strip()
    try:
        result = str(value).strip()
    except Exception:  # pragma: no cover - defensive fallback
        return ""
    return result


def _normalise_trip_photo_entry(raw: Any) -> Optional[Dict[str, Any]]:
    """Return a standardised photo entry extracted from ``raw``."""

    if raw is None:
        return None

    if isinstance(raw, str):
        base_url = _clean_string(raw)
        if not base_url:
            return None
        return {
            "id": "",
            "base_url": base_url,
            "product_url": "",
            "filename": "",
            "mime_type": "",
        }

    if not isinstance(raw, dict):
        return None

    media_item = raw.get("mediaItem")
    if not isinstance(media_item, dict):
        media_item = None

    google_media_item = None
    if media_item:
        google_media_item = media_item.get("googleMediaItem")
        if not isinstance(google_media_item, dict):
            google_media_item = None

    google_media = raw.get("googleMediaItem")
    if not isinstance(google_media, dict):
        google_media = None

    media_file = raw.get("mediaFile")
    if not isinstance(media_file, dict):
        media_file = None

    base_url_sources = [
        raw.get("base_url"),
        raw.get("baseUrl"),
        raw.get("url"),
        media_item.get("baseUrl") if media_item else None,
        media_item.get("mediaItemUri") if media_item else None,
        media_item.get("url") if media_item else None,
        media_item.get("downloadUrl") if media_item else None,
        google_media_item.get("baseUrl") if google_media_item else None,
        google_media_item.get("mediaItemUri") if google_media_item else None,
        google_media_item.get("downloadUrl") if google_media_item else None,
        google_media_item.get("thumbnailUrl") if google_media_item else None,
        google_media_item.get("directMediaItemUri") if google_media_item else None,
        google_media.get("baseUrl") if google_media else None,
        google_media.get("mediaItemUri") if google_media else None,
        google_media.get("downloadUrl") if google_media else None,
        google_media.get("thumbnailUrl") if google_media else None,
        google_media.get("directMediaItemUri") if google_media else None,
        media_file.get("baseUrl") if media_file else None,
        media_file.get("downloadUrl") if media_file else None,
        media_file.get("signedUrl") if media_file else None,
        raw.get("contentUrl"),
    ]
    base_url = ""
    for candidate in base_url_sources:
        candidate_clean = _clean_string(candidate)
        if candidate_clean:
            base_url = candidate_clean
            break

    allowed_prefixes = ("http://", "https://", "data:")
    if not base_url or not base_url.lower().startswith(allowed_prefixes):
        return None

    def _extract_media_metadata(key: str) -> str:
        if google_media_item and isinstance(google_media_item.get("mediaMetadata"), dict):
            return _clean_string(google_media_item["mediaMetadata"].get(key))
        if media_item and isinstance(media_item.get("mediaMetadata"), dict):
            return _clean_string(media_item["mediaMetadata"].get(key))
        return ""

    photo_id_sources = [
        raw.get("id"),
        media_item.get("id") if media_item else None,
        google_media_item.get("id") if google_media_item else None,
        google_media_item.get("mediaId") if google_media_item else None,
        google_media_item.get("mediaItemId") if google_media_item else None,
        google_media_item.get("resourceName") if google_media_item else None,
        google_media.get("id") if google_media else None,
        google_media.get("mediaId") if google_media else None,
        google_media.get("mediaItemId") if google_media else None,
        google_media.get("resourceName") if google_media else None,
    ]
    photo_id = ""
    for candidate in photo_id_sources:
        candidate_clean = _clean_string(candidate)
        if candidate_clean:
            photo_id = candidate_clean
            break

    product_url_sources = [
        raw.get("product_url"),
        raw.get("productUrl"),
        media_item.get("productUrl") if media_item else None,
        google_media_item.get("productUrl") if google_media_item else None,
        google_media.get("productUrl") if google_media else None,
        _extract_media_metadata("productUrl"),
    ]
    product_url = ""
    for candidate in product_url_sources:
        candidate_clean = _clean_string(candidate)
        if candidate_clean:
            product_url = candidate_clean
            break

    filename_sources = [
        raw.get("filename"),
        media_file.get("filename") if media_file else None,
        raw.get("mediaItemFilename"),
        media_item.get("filename") if media_item else None,
        google_media_item.get("filename") if google_media_item else None,
        google_media.get("filename") if google_media else None,
    ]
    filename = ""
    for candidate in filename_sources:
        candidate_clean = _clean_string(candidate)
        if candidate_clean:
            filename = candidate_clean
            break

    mime_type_sources = [
        raw.get("mime_type"),
        raw.get("mimeType"),
        media_file.get("mimeType") if media_file else None,
        media_item.get("mimeType") if media_item else None,
        google_media_item.get("mimeType") if google_media_item else None,
        google_media.get("mimeType") if google_media else None,
    ]
    mime_type = ""
    for candidate in mime_type_sources:
        candidate_clean = _clean_string(candidate)
        if candidate_clean:
            mime_type = candidate_clean
            break

    width = _extract_media_metadata("width")
    height = _extract_media_metadata("height")
    if not width and media_item:
        width = _clean_string(media_item.get("width"))
    if not height and media_item:
        height = _clean_string(media_item.get("height"))
    if not width and google_media_item:
        width = _clean_string(google_media_item.get("width"))
    if not height and google_media_item:
        height = _clean_string(google_media_item.get("height"))
    if not width and google_media:
        width = _clean_string(google_media.get("width"))
    if not height and google_media:
        height = _clean_string(google_media.get("height"))

    download_url_sources = [
        raw.get("download_url"),
        raw.get("downloadUrl"),
        media_item.get("downloadUrl") if media_item else None,
        google_media_item.get("downloadUrl") if google_media_item else None,
        google_media.get("downloadUrl") if google_media else None,
    ]
    download_url = ""
    for candidate in download_url_sources:
        candidate_clean = _clean_string(candidate)
        if candidate_clean:
            download_url = candidate_clean
            break

    entry: Dict[str, Any] = {
        "id": photo_id,
        "base_url": base_url,
        "product_url": product_url,
        "filename": filename,
        "mime_type": mime_type,
        "download_url": download_url,
    }

    if width:
        entry["width"] = width
    if height:
        entry["height"] = height

    return entry


def _normalise_trip_photos(raw_photos: Any) -> List[Dict[str, Any]]:
    """Return a list of normalised photo entries extracted from ``raw_photos``."""

    if not isinstance(raw_photos, list):
        return []

    normalised: List[Dict[str, Any]] = []
    seen_keys: set[str] = set()

    for raw in raw_photos:
        entry = _normalise_trip_photo_entry(raw)
        if entry is None:
            continue
        dedupe_key = entry.get("id") or entry.get("base_url")
        if dedupe_key and dedupe_key in seen_keys:
            continue
        if dedupe_key:
            seen_keys.add(dedupe_key)
        normalised.append(entry)

    return normalised


@dataclass
class Trip:
    """Dataclass representing a stored trip."""

    id: str
    name: str
    place_ids: List[str] = field(default_factory=list)
    description: str = ""
    google_photos_url: str = ""
    photos: List[Dict[str, Any]] = field(default_factory=list)
    created_at: str = field(default_factory=_utcnow_iso)
    updated_at: str = field(default_factory=_utcnow_iso)


_trips_cache: Optional[List[Trip]] = None


def _ensure_cache() -> None:
    """Ensure the in-memory cache has been initialised."""

    global _trips_cache

    if _trips_cache is None:
        load_trips()


def _normalise_trip_data(raw: dict) -> Optional[Trip]:
    """Return a :class:`Trip` instance created from ``raw`` data."""

    if not isinstance(raw, dict):
        return None

    trip_id = str(raw.get("id") or raw.get("trip_id") or "").strip()
    if not trip_id:
        trip_id = uuid4().hex

    name = str(raw.get("name") or "").strip() or "Untitled Trip"

    place_ids_raw = raw.get("place_ids") or []
    if isinstance(place_ids_raw, list):
        place_ids = [str(pid).strip() for pid in place_ids_raw if str(pid).strip()]
    else:
        place_ids = []

    description_raw = raw.get("description")
    if description_raw is None:
        description = ""
    else:
        description_candidate = str(description_raw)
        description = description_candidate if description_candidate.strip() else ""

    google_photos_url_raw = raw.get("google_photos_url") or raw.get("photos_url") or ""
    google_photos_url = _clean_string(google_photos_url_raw)

    raw_photos = raw.get("photos") or []
    photos = _normalise_trip_photos(raw_photos)

    created_at = str(raw.get("created_at") or raw.get("created") or "").strip()
    if not created_at:
        created_at = _utcnow_iso()

    updated_at = str(raw.get("updated_at") or raw.get("updated") or "").strip()
    if not updated_at:
        updated_at = created_at

    return Trip(
        id=trip_id,
        name=name,
        place_ids=place_ids,
        created_at=created_at,
        updated_at=updated_at,
        description=description,
        google_photos_url=google_photos_url,
        photos=photos,
    )


def load_trips() -> None:
    """Populate the in-memory cache from :data:`TRIPS_PATH`."""

    global _trips_cache

    if not os.path.exists(TRIPS_PATH):
        _trips_cache = []
        return

    try:
        with open(TRIPS_PATH, "r", encoding="utf-8") as handle:
            data = json.load(handle)
    except Exception as exc:  # pragma: no cover - best effort logging
        print(f"Failed to load trips from {TRIPS_PATH}: {exc}")
        _trips_cache = []
        return

    if isinstance(data, dict):
        trips_raw = data.get("trips", [])
    elif isinstance(data, list):
        trips_raw = data
    else:
        trips_raw = []

    trips: List[Trip] = []
    for entry in trips_raw:
        trip = _normalise_trip_data(entry)
        if trip is not None:
            trips.append(trip)

    _trips_cache = trips


def save_trips() -> None:
    """Persist the cached trips to :data:`TRIPS_PATH`."""

    _ensure_cache()

    os.makedirs(os.path.dirname(TRIPS_PATH), exist_ok=True)
    payload = {"trips": [asdict(trip) for trip in _trips_cache or []]}

    with open(TRIPS_PATH, "w", encoding="utf-8") as handle:
        json.dump(payload, handle, indent=2)


def list_trips() -> List[dict]:
    """Return the cached trips as dictionaries."""

    _ensure_cache()
    return [asdict(trip) for trip in _trips_cache or []]


def get_trip(trip_id: str) -> Optional[Trip]:
    """Return the trip matching ``trip_id`` if available."""

    _ensure_cache()

    if not trip_id:
        return None

    for trip in _trips_cache or []:
        if trip.id == trip_id:
            return trip
    return None


def create_trip(
    name: str,
    *,
    description: str = "",
) -> Trip:
    """Create a new trip with ``name`` and persist it."""

    cleaned_name = (name or "").strip()
    if not cleaned_name:
        raise ValueError("Trip name is required.")

    raw_description = str(description or "")
    cleaned_description = raw_description if raw_description.strip() else ""

    _ensure_cache()

    trip = Trip(
        id=uuid4().hex,
        name=cleaned_name,
        description=cleaned_description,
        google_photos_url="",
        photos=[],
    )
    _trips_cache.append(trip)
    save_trips()
    return trip


def add_places_to_trip(trip_id: str, place_ids: Iterable[str]) -> Tuple[Trip, int]:
    """Associate each ID in ``place_ids`` with the trip ``trip_id``.

    Returns a tuple containing the updated :class:`Trip` instance and the
    number of new locations that were appended to the trip.
    """

    _ensure_cache()

    trip = get_trip((trip_id or "").strip())
    if trip is None:
        raise KeyError("Trip not found.")

    added = 0

    if place_ids is None:
        place_ids_iterable: Iterable[str] = []
    else:
        place_ids_iterable = place_ids

    for raw_place_id in place_ids_iterable:
        place_id_clean = (raw_place_id or "").strip()
        if not place_id_clean:
            continue
        if place_id_clean not in trip.place_ids:
            trip.place_ids.append(place_id_clean)
            added += 1

    if added:
        trip.updated_at = _utcnow_iso()
        save_trips()

    return trip, added


def add_place_to_trip(trip_id: str, place_id: str) -> Trip:
    """Associate ``place_id`` with the trip identified by ``trip_id``."""

    trip, _ = add_places_to_trip(trip_id, [place_id])
    return trip


def remove_place_from_trip(trip_id: str, place_id: str) -> Trip:
    """Remove ``place_id`` from the trip identified by ``trip_id``."""

    _ensure_cache()

    trip = get_trip((trip_id or "").strip())
    if trip is None:
        raise KeyError("Trip not found.")

    place_id_clean = (place_id or "").strip()
    if not place_id_clean:
        raise ValueError("A valid place ID is required.")

    original_length = len(trip.place_ids)
    if original_length == 0:
        raise ValueError("This trip does not contain the specified location.")

    filtered = [pid for pid in trip.place_ids if pid != place_id_clean]
    if len(filtered) == original_length:
        raise ValueError("This trip does not contain the specified location.")

    trip.place_ids = filtered
    trip.updated_at = _utcnow_iso()
    save_trips()

    return trip


def delete_trip(trip_id: str) -> Trip:
    """Remove the trip identified by ``trip_id`` from storage."""

    _ensure_cache()

    identifier = (trip_id or "").strip()
    if not identifier:
        raise ValueError("A valid trip ID is required.")

    if not _trips_cache:
        raise KeyError("Trip not found.")

    for index, trip in enumerate(_trips_cache):
        if trip.id == identifier:
            removed_trip = _trips_cache.pop(index)
            save_trips()
            return removed_trip

    raise KeyError("Trip not found.")


def remove_places_from_all_trips(place_ids: Iterable[str]) -> dict:
    """Remove every ``place_id`` in ``place_ids`` from all trips.

    Returns a dictionary summarising how many memberships were removed and
    how many trips were updated.
    """

    _ensure_cache()

    if place_ids is None:
        cleaned_ids: list[str] = []
    else:
        cleaned_ids = [
            (str(place_id).strip() if place_id is not None else "")
            for place_id in place_ids
        ]

    cleaned_ids = [identifier for identifier in cleaned_ids if identifier]
    if not cleaned_ids:
        return {
            "removed_memberships": 0,
            "updated_trips": 0,
            "processed_ids": [],
        }

    cleaned_set = set(cleaned_ids)
    removed_memberships = 0
    updated_trips = 0
    save_required = False

    for trip in _trips_cache or []:
        if not trip.place_ids:
            continue

        original_length = len(trip.place_ids)
        filtered = [pid for pid in trip.place_ids if pid not in cleaned_set]

        if len(filtered) != original_length:
            removed_count = original_length - len(filtered)
            trip.place_ids = filtered
            trip.updated_at = _utcnow_iso()
            removed_memberships += removed_count
            updated_trips += 1
            save_required = True

    if save_required:
        save_trips()

    return {
        "removed_memberships": removed_memberships,
        "updated_trips": updated_trips,
        "processed_ids": cleaned_ids,
    }


def update_trip_metadata(
    trip_id: str,
    *,
    name: Optional[str] = None,
    description: Optional[str] = None,
    google_photos_url: Optional[str] = None,
) -> Trip:
    """Update metadata for the trip identified by ``trip_id``."""

    _ensure_cache()

    trip = get_trip((trip_id or "").strip())
    if trip is None:
        raise KeyError("Trip not found.")

    updated = False

    if name is not None:
        cleaned = name.strip()
        if cleaned and cleaned != trip.name:
            trip.name = cleaned
            updated = True

    if description is not None:
        raw_description = str(description or "")
        final_description = raw_description if raw_description.strip() else ""
        if final_description != trip.description:
            trip.description = final_description
            updated = True

    if google_photos_url is not None:
        cleaned_url = _clean_string(google_photos_url)
        if cleaned_url != trip.google_photos_url:
            trip.google_photos_url = cleaned_url
            updated = True

    if updated:
        trip.updated_at = _utcnow_iso()
        save_trips()

    return trip


def update_trip_photos(trip_id: str, photos: Any) -> Trip:
    """Replace the stored photos for ``trip_id`` with ``photos``."""

    _ensure_cache()

    trip = get_trip((trip_id or "").strip())
    if trip is None:
        raise KeyError("Trip not found.")

    normalised_photos = _normalise_trip_photos(photos)
    provided_count = len(photos) if isinstance(photos, list) else 0
    if provided_count > 0 and not normalised_photos:
        try:
            import json

            sample = photos[0] if isinstance(photos, list) and photos else None
            snippet = json.dumps(sample, ensure_ascii=False)[:1000] if sample else ""
            print(f"[trip_store.update_trip_photos] Failed to normalise picker items; first sample={snippet}")
        except Exception:
            pass
        raise ValueError("Unable to import the selected Google Photos items.")
    trip.photos = normalised_photos
    trip.updated_at = _utcnow_iso()
    save_trips()

    return trip


def remove_trip_photo(trip_id: str, photo_index: int) -> Trip:
    """Remove the photo at ``photo_index`` from the trip identified by ``trip_id``."""

    _ensure_cache()

    identifier = (trip_id or "").strip()
    if not identifier:
        raise ValueError("A valid trip ID is required.")

    if not isinstance(photo_index, int):
        raise ValueError("A valid photo index is required.")

    trip = get_trip(identifier)
    if trip is None:
        raise KeyError("Trip not found.")

    photos = getattr(trip, "photos", [])
    if not isinstance(photos, list) or not photos:
        raise IndexError("Photo not found.")

    if photo_index < 0 or photo_index >= len(photos):
        raise IndexError("Photo not found.")

    photos.pop(photo_index)
    trip.photos = photos
    trip.updated_at = _utcnow_iso()
    save_trips()

    return trip
