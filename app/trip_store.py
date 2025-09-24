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
from typing import Iterable, List, Optional, Tuple
from uuid import uuid4

TRIPS_PATH = os.path.join("data", "trips.json")


def _utcnow_iso() -> str:
    """Return the current UTC time in ISO 8601 format."""

    return datetime.now(timezone.utc).isoformat()


@dataclass
class Trip:
    """Dataclass representing a stored trip."""

    id: str
    name: str
    place_ids: List[str] = field(default_factory=list)
    description: str = ""
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


def create_trip(name: str, *, description: str = "") -> Trip:
    """Create a new trip with ``name`` and persist it."""

    cleaned_name = (name or "").strip()
    if not cleaned_name:
        raise ValueError("Trip name is required.")

    raw_description = str(description or "")
    cleaned_description = raw_description if raw_description.strip() else ""

    _ensure_cache()

    trip = Trip(id=uuid4().hex, name=cleaned_name, description=cleaned_description)
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

    if updated:
        trip.updated_at = _utcnow_iso()
        save_trips()

    return trip
