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
from typing import List, Optional
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


def create_trip(name: str) -> Trip:
    """Create a new trip with ``name`` and persist it."""

    cleaned_name = (name or "").strip()
    if not cleaned_name:
        raise ValueError("Trip name is required.")

    _ensure_cache()

    trip = Trip(id=uuid4().hex, name=cleaned_name)
    _trips_cache.append(trip)
    save_trips()
    return trip


def add_place_to_trip(trip_id: str, place_id: str) -> Trip:
    """Associate ``place_id`` with the trip identified by ``trip_id``."""

    _ensure_cache()

    trip = get_trip((trip_id or "").strip())
    if trip is None:
        raise KeyError("Trip not found.")

    place_id_clean = (place_id or "").strip()
    if not place_id_clean:
        raise ValueError("A valid place ID is required.")

    if place_id_clean not in trip.place_ids:
        trip.place_ids.append(place_id_clean)
        trip.updated_at = _utcnow_iso()
        save_trips()

    return trip


def update_trip_metadata(trip_id: str, *, name: Optional[str] = None) -> Trip:
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

    if updated:
        trip.updated_at = _utcnow_iso()
        save_trips()

    return trip
