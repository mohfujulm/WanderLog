"""Flask routes for the WanderLog application."""

import json
import os
import secrets
from urllib.parse import urlencode

import pandas as pd
import requests
from flask import Blueprint, abort, jsonify, redirect, render_template, request, session, url_for
from typing import Optional

from app.map_utils import dataframe_to_markers, filter_dataframe_by_date_range
from app.config import (
    GooglePhotosOAuthClientSettings,
    load_google_photos_oauth_client_settings,
    load_google_photos_settings,
)
from app.services.google_photos_api import GooglePhotosAPIError, reset_google_photos_client
from app.services.google_photos_token_store import get_token_store_path, save_tokens
from app.utils.google_photos import fetch_album_images, list_google_photos_albums
from app.utils.json_processing_functions import unique_visits_to_df
from . import data_cache, trip_store

main = Blueprint("main", __name__)

MAPBOX_ACCESS_TOKEN = os.getenv("MAPBOX_ACCESS_TOKEN")
MAX_ALIAS_LENGTH = 120
MAX_TRIP_NAME_LENGTH = 120
MAX_TRIP_DESCRIPTION_LENGTH = 2000
MAX_LOCATION_DESCRIPTION_LENGTH = 2000
MAX_TRIP_PHOTOS_URL_LENGTH = 1000
MAX_TRIP_PHOTOS_ALBUM_TITLE_LENGTH = 200
_OAUTH_STATE_SESSION_KEY = "google_photos_oauth_state"


def _load_oauth_client_settings() -> Optional[GooglePhotosOAuthClientSettings]:
    try:
        return load_google_photos_oauth_client_settings()
    except RuntimeError:
        return None


def _is_google_photos_connected() -> bool:
    try:
        load_google_photos_settings()
    except RuntimeError:
        return False
    return True


def _build_authorisation_url(settings: GooglePhotosOAuthClientSettings, redirect_uri: str, state: str) -> str:
    params = {
        "client_id": settings.client_id,
        "redirect_uri": redirect_uri,
        "response_type": "code",
        "access_type": "offline",
        "prompt": "consent",
        "scope": settings.scope,
        "state": state,
    }
    return f"{settings.auth_base_url}?{urlencode(params)}"


@main.route("/auth/google/start")
def google_photos_oauth_start():
    settings = _load_oauth_client_settings()
    if settings is None:
        abort(404)

    redirect_uri = url_for("main.google_photos_oauth_callback", _external=True)
    state = secrets.token_urlsafe(32)
    session[_OAUTH_STATE_SESSION_KEY] = state

    return redirect(_build_authorisation_url(settings, redirect_uri, state))


@main.route("/auth/google/callback")
def google_photos_oauth_callback():
    settings = _load_oauth_client_settings()
    if settings is None:
        abort(404)

    stored_state = session.pop(_OAUTH_STATE_SESSION_KEY, None)
    request_state = request.args.get("state", "")
    if not stored_state or stored_state != request_state:
        abort(400)

    error = request.args.get("error")
    if error:
        return render_template("google_photos_oauth_result.html", error=error)

    code = request.args.get("code")
    if not code:
        abort(400)

    redirect_uri = url_for("main.google_photos_oauth_callback", _external=True)
    payload = {
        "client_id": settings.client_id,
        "client_secret": settings.client_secret,
        "code": code,
        "grant_type": "authorization_code",
        "redirect_uri": redirect_uri,
    }

    try:
        response = requests.post(settings.token_url, data=payload, timeout=15)
    except requests.RequestException as exc:  # pragma: no cover - network failure path
        return render_template(
            "google_photos_oauth_result.html",
            error="Failed to exchange authorization code for tokens.",
            exception=str(exc),
        )

    if response.status_code >= 400:
        return render_template(
            "google_photos_oauth_result.html",
            error=(
                "Google OAuth returned an error while exchanging the authorization code. "
                f"Status {response.status_code}: {response.text.strip()}"
            ),
        )

    try:
        token_payload = response.json()
    except ValueError:
        return render_template(
            "google_photos_oauth_result.html",
            error="Received an unexpected response from Google OAuth; could not parse JSON.",
        )

    refresh_token = token_payload.get("refresh_token")
    access_token = token_payload.get("access_token")
    if not refresh_token:
        return render_template(
            "google_photos_oauth_result.html",
            error=(
                "Google OAuth did not return a refresh token. Ensure 'offline' access is allowed and "
                "the client is configured correctly."
            ),
            token_payload=token_payload,
            access_token=access_token,
        )

    expires_in = token_payload.get("expires_in")
    save_tokens(
        refresh_token=refresh_token,
        access_token=access_token,
        expires_in=expires_in,
        token_payload=token_payload,
    )
    reset_google_photos_client()

    return render_template(
        "google_photos_oauth_result.html",
        access_token=access_token,
        refresh_token=refresh_token,
        token_payload=token_payload,
        token_store_path=str(get_token_store_path()),
        stored=True,
    )


@main.route('/api/google_photos/albums', methods=['GET'])
def api_google_photos_albums():
    """Return the albums available to the authenticated Google Photos user."""

    try:
        albums = list_google_photos_albums()
    except RuntimeError as exc:
        return jsonify(status='error', message=str(exc)), 400
    except GooglePhotosAPIError as exc:
        return jsonify(status='error', message=str(exc)), 502

    return jsonify(albums)


def _serialise_trip(trip, *, place_date_lookup=None) -> dict:
    """Return a JSON-serialisable dictionary for ``trip``."""

    if trip is None:
        return {}

    latest_location_date = _determine_latest_location_date_for_trip(
        trip,
        place_date_lookup=place_date_lookup,
    )

    if isinstance(trip, dict):
        place_ids = trip.get('place_ids')
        if isinstance(place_ids, list):
            location_count = len(place_ids)
        else:
            location_count = 0
        return {
            'id': trip.get('id', ''),
            'name': trip.get('name', ''),
            'location_count': location_count,
            'created_at': trip.get('created_at'),
            'updated_at': trip.get('updated_at'),
            'latest_location_date': latest_location_date,
            'description': trip.get('description', ''),
            'google_photos_url': trip.get('google_photos_url', ''),
            'google_photos_album_id': trip.get('google_photos_album_id', ''),
            'google_photos_album_title': trip.get('google_photos_album_title', ''),
            'google_photos_product_url': trip.get('google_photos_product_url', ''),
            'photo_count': len(trip.get('photos', []) or []),
        }

    place_ids = getattr(trip, 'place_ids', []) or []
    location_count = len(place_ids) if isinstance(place_ids, list) else 0

    return {
        'id': getattr(trip, 'id', ''),
        'name': getattr(trip, 'name', ''),
        'location_count': location_count,
        'created_at': getattr(trip, 'created_at', None),
        'updated_at': getattr(trip, 'updated_at', None),
        'latest_location_date': latest_location_date,
        'description': getattr(trip, 'description', ''),
        'google_photos_url': getattr(trip, 'google_photos_url', ''),
        'google_photos_album_id': getattr(trip, 'google_photos_album_id', ''),
        'google_photos_album_title': getattr(trip, 'google_photos_album_title', ''),
        'google_photos_product_url': getattr(trip, 'google_photos_product_url', ''),
        'photo_count': len(getattr(trip, 'photos', []) or []),
    }


def _clean_string(value: object) -> str:
    """Return a stripped string representation of ``value``."""

    if value is None:
        return ""

    if isinstance(value, str):
        return value.strip()

    if pd.isna(value):  # type: ignore[arg-type]
        return ""

    return str(value).strip()


def _extract_trip_place_ids(trip):
    """Return the cleaned place identifiers associated with ``trip``."""

    if trip is None:
        return []

    if isinstance(trip, dict):
        raw_place_ids = trip.get('place_ids') or []
    else:
        raw_place_ids = getattr(trip, 'place_ids', []) or []

    identifiers: list[str] = []
    for raw_identifier in raw_place_ids:
        if raw_identifier is None:
            continue
        cleaned = str(raw_identifier).strip()
        if cleaned:
            identifiers.append(cleaned)

    return identifiers


def _parse_trip_date(value):
    """Parse ``value`` into a :class:`~pandas.Timestamp` if possible."""

    cleaned = _clean_string(value)
    if not cleaned:
        return None

    try:
        parsed = pd.to_datetime(cleaned, errors='coerce')
    except Exception:
        return None

    if pd.isna(parsed):
        return None

    return parsed


def _format_timestamp_for_response(timestamp) -> str:
    """Return a normalised string representation for ``timestamp``."""

    if timestamp is None:
        return ""

    try:
        date_value = timestamp.date()
    except AttributeError:
        return ""

    return date_value.isoformat()


def _build_place_date_lookup(place_ids):
    """Return a mapping of place IDs to their latest known date."""

    identifiers = { _clean_string(identifier) for identifier in place_ids }
    identifiers.discard("")
    if not identifiers:
        return {}

    data_cache.ensure_archived_column()
    df = data_cache.timeline_df

    if df is None or df.empty or 'Place ID' not in df.columns:
        return {}

    matches = df[df['Place ID'].isin(identifiers)]
    if matches.empty:
        return {}

    relevant_columns = [
        column for column in ('date', 'End Date', 'Start Date') if column in matches.columns
    ]
    if not relevant_columns:
        return {}

    lookup: dict[str, pd.Timestamp] = {}

    for _, row in matches.iterrows():
        place_id = _clean_string(row.get('Place ID'))
        if not place_id:
            continue

        latest_value = lookup.get(place_id)

        for column in relevant_columns:
            candidate = _parse_trip_date(row.get(column))
            if candidate is None:
                continue
            if latest_value is None or candidate > latest_value:
                latest_value = candidate

        if latest_value is not None:
            lookup[place_id] = latest_value

    return lookup


def _determine_latest_location_date_for_trip(trip, *, place_date_lookup=None):
    """Return the most recent location date associated with ``trip``."""

    place_ids = _extract_trip_place_ids(trip)
    if not place_ids:
        return None

    lookup = place_date_lookup or _build_place_date_lookup(place_ids)
    if not lookup:
        return None

    latest_value = None

    for place_id in place_ids:
        candidate = lookup.get(place_id)
        if candidate is None:
            continue
        if latest_value is None or candidate > latest_value:
            latest_value = candidate

    if latest_value is None:
        return None

    return _format_timestamp_for_response(latest_value)


def _serialise_trip_location(row, *, place_id: str = "", order: int = 0) -> dict:
    """Return a JSON payload describing a trip location."""

    place_identifier = _clean_string(place_id)
    if not place_identifier and row is not None:
        place_identifier = _clean_string(getattr(row, 'get', lambda *_: "")('Place ID'))

    if row is None:
        return {
            'place_id': place_identifier,
            'name': '',
            'alias': '',
            'display_name': 'Unknown location',
            'start_date': '',
            'end_date': '',
            'date': '',
            'source_type': '',
            'archived': False,
            'description': '',
            'latitude': None,
            'longitude': None,
            'order': order,
            'missing': True,
        }

    getter = getattr(row, 'get', None)
    if callable(getter):
        get_value = getter
    else:  # pragma: no cover - defensive branch
        get_value = lambda key, default=None: row[key] if key in row else default

    name = _clean_string(get_value('Place Name', ''))
    alias = _clean_string(get_value('Alias', ''))
    display_name = _clean_string(get_value('display_name', '')) or alias or name or 'Unknown location'

    description_raw = get_value('Description', '')
    if pd.isna(description_raw):  # type: ignore[arg-type]
        description = ''
    else:
        description_candidate = str(description_raw)
        description = description_candidate if description_candidate.strip() else ''

    start_date = _clean_string(get_value('Start Date', ''))
    end_date = _clean_string(get_value('End Date', ''))
    primary_date = _clean_string(get_value('date', '')) or start_date or end_date

    source_type = _clean_string(get_value('Source Type', ''))
    archived = bool(get_value('Archived', False))

    def _to_float(value):
        try:
            number = float(value)
        except (TypeError, ValueError):
            return None
        return number

    latitude = _to_float(get_value('Latitude', None))
    longitude = _to_float(get_value('Longitude', None))

    return {
        'place_id': place_identifier,
        'name': name,
        'alias': alias,
        'display_name': display_name or 'Unknown location',
        'start_date': start_date,
        'end_date': end_date,
        'date': primary_date,
        'source_type': source_type,
        'archived': archived,
        'description': description,
        'latitude': latitude,
        'longitude': longitude,
        'order': order,
        'missing': False,
    }


@main.route('/')
def index():
    """Render the landing page."""

    oauth_settings = _load_oauth_client_settings()

    return render_template(
        "index.html",
        mapbox_token=MAPBOX_ACCESS_TOKEN,
        google_photos_auth_config={
            "enabled": bool(oauth_settings),
            "start_url": url_for("main.google_photos_oauth_start") if oauth_settings else None,
        },
        google_photos_connected=_is_google_photos_connected(),
    )


@main.route('/api/update_timeline', methods=['POST'])
def api_update_timeline():
    """Process an uploaded Google Timeline JSON file and refresh the map."""

    try:
        # Check if a file was uploaded in the request
        if 'file' not in request.files:
            return jsonify(status='error', message='No file uploaded.'), 400

        # Parse the uploaded file as JSON
        timeline_file = request.files['file']
        try:
            timeline_json = json.load(timeline_file)
        except Exception:
            return jsonify(status='error', message='Failed to parse JSON.'), 400

        #Process the timeline.json file uploaded by the user into a pandas df.
        imported_df = unique_visits_to_df(timeline_json, "google_timeline")
        if not imported_df.empty and "Archived" not in imported_df.columns:
            imported_df["Archived"] = False
        database_df = data_cache.timeline_df
        #combine the imported data and resulting processed dataframe with the existing database info
        dataframes = [imported_df]
        if database_df is not None and not database_df.empty:
            dataframes.append(database_df)

        combined = pd.concat(dataframes)
        combined = combined.drop_duplicates()
        #update global database memory with appended information
        data_cache.timeline_df = combined
        data_cache.ensure_archived_column()

        # Persist the updated timeline if required
        data_cache.save_timeline_data()

        #  Return success message
        return jsonify(
          status='success',
          message=f"Timeline updated with data from {timeline_file.filename}!"
        )

    except Exception as e:
        print(e)
        return jsonify(status='error', message=str(e)), 500

@main.route('/api/clear', methods=['POST'])
def api_clear():
    """Clear all timeline data and reset the map state."""

    df = data_cache.timeline_df
    backup_path = None

    if df is not None and not df.empty:
        try:
            backup_path = data_cache.backup_timeline_data()
        except Exception as exc:
            return jsonify({
                'status': 'error',
                'message': f'Failed to create backup before clearing data: {exc}'
            }), 500

    data_cache.timeline_df = pd.DataFrame()
    data_cache.save_timeline_data()

    message = 'All timeline data cleared successfully.'
    if backup_path:
        message += f' Backup saved to {backup_path}.'

    return jsonify({'status': 'success', 'message': message})


@main.route('/api/add_point', methods=['POST'])
def api_add_point():
    """Add a single location entry provided in the request body."""

    data = request.get_json(silent=True) or {}

    try:
        lat = float(data.get('latitude'))
        lon = float(data.get('longitude'))
    except (TypeError, ValueError):
        return jsonify(status='error', message='Invalid latitude/longitude'), 400

    place_name = data.get('place_name', 'Unknown')
    start_date = data.get('start_date', '')
    source_type = data.get('source_type', 'manual')
    alias_value = data.get('alias', '')
    description_value = data.get('description', '')

    if alias_value is None:
        alias_value = ''

    alias_value = str(alias_value).strip()

    if len(alias_value) > MAX_ALIAS_LENGTH:
        return jsonify(
            status='error',
            message=f'Alias must be {MAX_ALIAS_LENGTH} characters or fewer.'
        ), 400

    if description_value is None:
        description_value = ''

    if not isinstance(description_value, str):
        description_value = str(description_value)

    if len(description_value) > MAX_LOCATION_DESCRIPTION_LENGTH:
        return jsonify(
            status='error',
            message=(
                'Description must be '
                f'{MAX_LOCATION_DESCRIPTION_LENGTH} characters or fewer.'
            )
        ), 400

    description_clean = (
        description_value if description_value.strip() else ''
    )

    new_row = pd.DataFrame([
        {
            'Place ID': str(os.urandom(16).hex()),
            'Latitude': lat,
            'Longitude': lon,
            'Start Date': start_date,
            'Source Type': source_type,
            'Place Name': place_name,
            'Archived': False,
            'Alias': alias_value,
            'Description': description_clean,
        }
    ])

    if data_cache.timeline_df is None or data_cache.timeline_df.empty:
        data_cache.timeline_df = new_row
    else:
        data_cache.timeline_df = pd.concat([data_cache.timeline_df, new_row], ignore_index=True)

    data_cache.ensure_archived_column()
    data_cache.save_timeline_data()

    return jsonify(status='success', message='Data point added successfully.')


@main.route('/api/markers/<place_id>/archive', methods=['POST'])
def api_archive_marker(place_id: str):
    """Archive (or unarchive) a marker by ``place_id``."""

    df = data_cache.timeline_df
    if df is None or df.empty or 'Place ID' not in df.columns:
        return jsonify(status='error', message='Data point not found.'), 404

    mask = df['Place ID'] == place_id
    if not mask.any():
        return jsonify(status='error', message='Data point not found.'), 404

    payload = request.get_json(silent=True) or {}
    archived_flag = payload.get('archived', True)
    archived_value = bool(archived_flag)

    df.loc[mask, 'Archived'] = archived_value
    data_cache.timeline_df = df
    data_cache.ensure_archived_column()
    data_cache.save_timeline_data()

    action = 'archived' if archived_value else 'unarchived'
    return jsonify(status='success', message=f'Data point {action} successfully.')


@main.route('/api/markers/bulk/archive', methods=['POST'])
def api_bulk_archive_markers():
    """Archive or unarchive multiple markers in a single request."""

    df = data_cache.timeline_df
    if df is None or df.empty or 'Place ID' not in df.columns:
        return jsonify(status='error', message='No matching data points found.'), 404

    payload = request.get_json(silent=True) or {}
    place_ids_raw = payload.get('place_ids')
    if not isinstance(place_ids_raw, (list, tuple, set)):
        return jsonify(status='error', message='Provide a list of place IDs.'), 400

    cleaned_ids = []
    for raw_id in place_ids_raw:
        if raw_id is None:
            continue
        if isinstance(raw_id, str):
            cleaned = raw_id.strip()
        else:
            cleaned = str(raw_id).strip()
        if cleaned:
            cleaned_ids.append(cleaned)

    if not cleaned_ids:
        return jsonify(status='error', message='No valid place IDs were provided.'), 400

    mask = df['Place ID'].isin(cleaned_ids)
    matched_count = int(mask.sum())
    if matched_count == 0:
        return jsonify(status='error', message='No matching data points found.'), 404

    archived_flag = bool(payload.get('archived', True))
    df.loc[mask, 'Archived'] = archived_flag
    data_cache.timeline_df = df
    data_cache.ensure_archived_column()
    data_cache.save_timeline_data()

    action = 'archived' if archived_flag else 'unarchived'
    return jsonify(
        status='success',
        message=f'{matched_count} data point(s) {action} successfully.',
        updated=matched_count,
        archived=archived_flag,
    )


@main.route('/api/markers/<place_id>', methods=['DELETE'])
def api_delete_marker(place_id: str):
    """Delete a marker by ``place_id``."""

    df = data_cache.timeline_df
    if df is None or df.empty or 'Place ID' not in df.columns:
        return jsonify(status='error', message='Data point not found.'), 404

    mask = df['Place ID'] == place_id
    if not mask.any():
        return jsonify(status='error', message='Data point not found.'), 404

    data_cache.timeline_df = df.loc[~mask].reset_index(drop=True)
    data_cache.save_timeline_data()

    return jsonify(status='success', message='Data point deleted successfully.')


@main.route('/api/markers/bulk/delete', methods=['POST'])
def api_bulk_delete_markers():
    """Delete multiple markers identified by their place IDs."""

    df = data_cache.timeline_df
    if df is None or df.empty or 'Place ID' not in df.columns:
        return jsonify(status='error', message='No matching data points found.'), 404

    payload = request.get_json(silent=True) or {}
    place_ids_raw = payload.get('place_ids')
    if not isinstance(place_ids_raw, (list, tuple, set)):
        return jsonify(status='error', message='Provide a list of place IDs.'), 400

    cleaned_ids = []
    for raw_id in place_ids_raw:
        if raw_id is None:
            continue
        if isinstance(raw_id, str):
            cleaned = raw_id.strip()
        else:
            cleaned = str(raw_id).strip()
        if cleaned:
            cleaned_ids.append(cleaned)

    if not cleaned_ids:
        return jsonify(status='error', message='No valid place IDs were provided.'), 400

    mask = df['Place ID'].isin(cleaned_ids)
    matched_count = int(mask.sum())
    if matched_count == 0:
        return jsonify(status='error', message='No matching data points found.'), 404

    data_cache.timeline_df = df.loc[~mask].reset_index(drop=True)
    data_cache.ensure_archived_column()
    data_cache.save_timeline_data()

    return jsonify(
        status='success',
        message=f'Deleted {matched_count} data point(s).',
        removed=matched_count,
    )


@main.route('/api/source_types', methods=['GET'])
def api_source_types():
    """Return a list of available Source Type values."""

    df = data_cache.timeline_df
    if df is None or df.empty:
        return jsonify([])

    if 'Archived' in df.columns:
        df = df[df['Archived'] != True]

    types = sorted(df.get('Source Type').dropna().unique().tolist())
    return jsonify(types)


@main.route('/api/trips', methods=['GET'])
def api_list_trips():
    """Return the list of available trips."""

    trips = trip_store.list_trips()
    place_ids = set()
    for trip in trips:
        place_ids.update(_extract_trip_place_ids(trip))

    latest_dates = _build_place_date_lookup(place_ids)

    return jsonify([
        _serialise_trip(trip, place_date_lookup=latest_dates) for trip in trips
    ])


@main.route('/api/trips/<trip_id>', methods=['GET'])
def api_get_trip(trip_id: str):
    """Return details for ``trip_id`` including its locations."""

    identifier = (trip_id or "").strip()
    trip = trip_store.get_trip(identifier)
    if trip is None:
        return jsonify(status='error', message='Trip not found.'), 404

    serialised_trip = _serialise_trip(trip)
    place_ids = getattr(trip, 'place_ids', []) or []
    cleaned_ids = []
    for raw_id in place_ids:
        if raw_id is None:
            continue
        if isinstance(raw_id, str):
            cleaned = raw_id.strip()
        else:
            cleaned = str(raw_id).strip()
        if cleaned:
            cleaned_ids.append(cleaned)

    data_cache.ensure_archived_column()
    df = data_cache.timeline_df

    rows_by_place_id = {}
    if df is not None and not df.empty and 'Place ID' in df.columns:
        matches = df[df['Place ID'].isin(cleaned_ids)]
        for _, entry in matches.iterrows():
            pid = _clean_string(entry.get('Place ID'))
            if pid and pid not in rows_by_place_id:
                rows_by_place_id[pid] = entry

    locations = [
        _serialise_trip_location(rows_by_place_id.get(place_id), place_id=place_id, order=index)
        for index, place_id in enumerate(cleaned_ids)
    ]

    album_id = serialised_trip.get('google_photos_album_id') or getattr(trip, 'google_photos_album_id', '')
    product_url = serialised_trip.get('google_photos_product_url') or getattr(trip, 'google_photos_product_url', '')
    photos_url = (
        product_url
        or serialised_trip.get('google_photos_url')
        or getattr(trip, 'google_photos_url', '')
    )
    photos: list[str] = []
    if album_id or photos_url:
        try:
            photos = fetch_album_images(photos_url, album_id=str(album_id or '').strip() or None)
        except Exception:
            photos = []

    serialised_trip['photo_count'] = len(photos)

    return jsonify({
        'trip': serialised_trip,
        'locations': locations,
        'photos': photos,
    })


@main.route('/api/trips/<trip_id>', methods=['DELETE'])
def api_delete_trip(trip_id: str):
    """Delete the trip identified by ``trip_id``."""

    identifier = (trip_id or '').strip()
    if not identifier:
        return jsonify(status='error', message='A valid trip ID is required.'), 400

    try:
        trip = trip_store.delete_trip(identifier)
    except ValueError as exc:
        return jsonify(status='error', message=str(exc)), 400
    except KeyError:
        return jsonify(status='error', message='Trip not found.'), 404

    return jsonify(
        status='success',
        message='Trip deleted successfully.',
        trip=_serialise_trip(trip),
    )


@main.route('/api/trips/<trip_id>', methods=['PATCH'])
def api_update_trip(trip_id: str):
    """Update metadata for the trip identified by ``trip_id``."""

    identifier = (trip_id or '').strip()
    if not identifier:
        return jsonify(status='error', message='A valid trip ID is required.'), 400

    payload = request.get_json(silent=True) or {}

    name_value = payload.get('name', None)
    description_value = payload.get('description', None)
    photos_url_value = payload.get('google_photos_url', None)
    album_id_value = payload.get('google_photos_album_id', None)
    album_title_value = payload.get('google_photos_album_title', None)
    album_product_url_value = payload.get('google_photos_product_url', None)

    cleaned_name = None
    if name_value is not None:
        cleaned_name = str(name_value).strip()
        if not cleaned_name:
            return jsonify(status='error', message='Trip name cannot be blank.'), 400
        if len(cleaned_name) > MAX_TRIP_NAME_LENGTH:
            return jsonify(
                status='error',
                message=(
                    f'Trip name must be {MAX_TRIP_NAME_LENGTH} characters or fewer.'
                ),
            ), 400

    cleaned_description = None
    if description_value is not None:
        if not isinstance(description_value, str):
            description_value = str(description_value)
        if len(description_value) > MAX_TRIP_DESCRIPTION_LENGTH:
            return jsonify(
                status='error',
                message=(
                    'Trip description must be '
                    f'{MAX_TRIP_DESCRIPTION_LENGTH} characters or fewer.'
                ),
            ), 400
        cleaned_description = description_value

    cleaned_photos_url = None
    if photos_url_value is not None:
        if not isinstance(photos_url_value, str):
            photos_url_value = str(photos_url_value)
        trimmed_photos = photos_url_value.strip()
        if trimmed_photos and not trimmed_photos.lower().startswith(('http://', 'https://')):
            return jsonify(status='error', message='Provide a valid Google Photos link.'), 400
        if len(trimmed_photos) > MAX_TRIP_PHOTOS_URL_LENGTH:
            return jsonify(
                status='error',
                message=(
                    'Google Photos link must be '
                    f'{MAX_TRIP_PHOTOS_URL_LENGTH} characters or fewer.'
                ),
            ), 400
        cleaned_photos_url = trimmed_photos

    cleaned_album_id = None
    if album_id_value is not None:
        cleaned_album_id = str(album_id_value or '').strip()

    cleaned_album_title = None
    if album_title_value is not None:
        album_title_candidate = str(album_title_value or '')
        trimmed_album_title = album_title_candidate.strip()
        if len(trimmed_album_title) > MAX_TRIP_PHOTOS_ALBUM_TITLE_LENGTH:
            return jsonify(
                status='error',
                message=(
                    'Album title must be '
                    f'{MAX_TRIP_PHOTOS_ALBUM_TITLE_LENGTH} characters or fewer.'
                ),
            ), 400
        cleaned_album_title = trimmed_album_title

    cleaned_album_product_url = None
    if album_product_url_value is not None:
        product_candidate = str(album_product_url_value or '')
        trimmed_product = product_candidate.strip()
        if trimmed_product and not trimmed_product.lower().startswith(('http://', 'https://')):
            return jsonify(status='error', message='Provide a valid Google Photos link.'), 400
        if len(trimmed_product) > MAX_TRIP_PHOTOS_URL_LENGTH:
            return jsonify(
                status='error',
                message=(
                    'Google Photos link must be '
                    f'{MAX_TRIP_PHOTOS_URL_LENGTH} characters or fewer.'
                ),
            ), 400
        cleaned_album_product_url = trimmed_product

    if (
        cleaned_name is None
        and cleaned_description is None
        and cleaned_photos_url is None
        and cleaned_album_id is None
        and cleaned_album_title is None
        and cleaned_album_product_url is None
    ):
        return jsonify(status='error', message='No updates were supplied.'), 400

    try:
        trip = trip_store.update_trip_metadata(
            identifier,
            name=cleaned_name,
            description=cleaned_description,
            google_photos_url=cleaned_photos_url,
            google_photos_album_id=cleaned_album_id,
            google_photos_album_title=cleaned_album_title,
            google_photos_product_url=cleaned_album_product_url,
        )
    except ValueError as exc:
        return jsonify(status='error', message=str(exc)), 400
    except KeyError:
        return jsonify(status='error', message='Trip not found.'), 404

    photos: list[str] = []
    album_id = getattr(trip, 'google_photos_album_id', '')
    product_url = getattr(trip, 'google_photos_product_url', '')
    photos_url = product_url or getattr(trip, 'google_photos_url', '')
    if album_id or photos_url:
        try:
            photos = fetch_album_images(photos_url, album_id=str(album_id or '').strip() or None)
        except Exception:
            photos = []

    serialised = _serialise_trip(trip)
    serialised['photo_count'] = len(photos)

    return jsonify(
        status='success',
        message='Trip updated successfully.',
        trip=serialised,
        photos=photos,
    )


@main.route('/api/trips', methods=['POST'])
def api_create_trip():
    """Create a new trip."""

    payload = request.get_json(silent=True) or {}
    name = payload.get('name') or payload.get('trip_name') or ''
    name = str(name).strip()

    if not name:
        return jsonify(status='error', message='Trip name is required.'), 400

    if len(name) > MAX_TRIP_NAME_LENGTH:
        return jsonify(
            status='error',
            message=f'Trip name must be {MAX_TRIP_NAME_LENGTH} characters or fewer.'
        ), 400

    photos_url_value = payload.get('google_photos_url')
    cleaned_photos_url = ''
    if photos_url_value is not None:
        if not isinstance(photos_url_value, str):
            photos_url_value = str(photos_url_value)
        cleaned_photos_url = photos_url_value.strip()
        if cleaned_photos_url and not cleaned_photos_url.lower().startswith(('http://', 'https://')):
            return jsonify(status='error', message='Provide a valid Google Photos link.'), 400
        if len(cleaned_photos_url) > MAX_TRIP_PHOTOS_URL_LENGTH:
            return jsonify(
                status='error',
                message=(
                    'Google Photos link must be '
                    f'{MAX_TRIP_PHOTOS_URL_LENGTH} characters or fewer.'
                ),
            ), 400

    album_id_value = payload.get('google_photos_album_id')
    album_title_value = payload.get('google_photos_album_title')
    album_product_url_value = payload.get('google_photos_product_url')

    cleaned_album_id = ''
    if album_id_value is not None:
        cleaned_album_id = str(album_id_value or '').strip()

    cleaned_album_title = ''
    if album_title_value is not None:
        album_title_candidate = str(album_title_value or '')
        trimmed_album_title = album_title_candidate.strip()
        if len(trimmed_album_title) > MAX_TRIP_PHOTOS_ALBUM_TITLE_LENGTH:
            return jsonify(
                status='error',
                message=(
                    'Album title must be '
                    f'{MAX_TRIP_PHOTOS_ALBUM_TITLE_LENGTH} characters or fewer.'
                ),
            ), 400
        cleaned_album_title = trimmed_album_title

    cleaned_album_product_url = ''
    if album_product_url_value is not None:
        product_candidate = str(album_product_url_value or '')
        trimmed_product = product_candidate.strip()
        if trimmed_product and not trimmed_product.lower().startswith(('http://', 'https://')):
            return jsonify(status='error', message='Provide a valid Google Photos link.'), 400
        if len(trimmed_product) > MAX_TRIP_PHOTOS_URL_LENGTH:
            return jsonify(
                status='error',
                message=(
                    'Google Photos link must be '
                    f'{MAX_TRIP_PHOTOS_URL_LENGTH} characters or fewer.'
                ),
            ), 400
        cleaned_album_product_url = trimmed_product

    try:
        trip = trip_store.create_trip(
            name,
            google_photos_url=cleaned_photos_url,
            google_photos_album_id=cleaned_album_id,
            google_photos_album_title=cleaned_album_title,
            google_photos_product_url=cleaned_album_product_url,
        )
    except ValueError as exc:
        return jsonify(status='error', message=str(exc)), 400

    photos: list[str] = []
    if cleaned_album_id or cleaned_photos_url or cleaned_album_product_url:
        try:
            photos = fetch_album_images(
                cleaned_album_product_url or cleaned_photos_url,
                album_id=cleaned_album_id or None,
            )
        except Exception:
            photos = []

    serialised = _serialise_trip(trip)
    serialised['photo_count'] = len(photos)

    return jsonify(
        status='success',
        message='Trip created successfully.',
        trip=serialised,
        photos=photos,
    ), 201


@main.route('/api/trips/assign', methods=['POST'])
def api_assign_trip():
    """Assign a timeline data point to a trip."""

    payload = request.get_json(silent=True) or {}
    place_id = str(payload.get('place_id') or '').strip()

    if not place_id:
        return jsonify(status='error', message='A valid place ID is required.'), 400

    df = data_cache.timeline_df
    if df is None or df.empty or 'Place ID' not in df.columns:
        return jsonify(status='error', message='Data point not found.'), 404

    mask = df['Place ID'] == place_id
    if not mask.any():
        return jsonify(status='error', message='Data point not found.'), 404

    trip_id = str(payload.get('trip_id') or '').strip()
    new_trip_name = payload.get('new_trip_name') or payload.get('trip_name') or ''
    new_trip_name = str(new_trip_name).strip()

    created_new = False

    if new_trip_name:
        if len(new_trip_name) > MAX_TRIP_NAME_LENGTH:
            return jsonify(
                status='error',
                message=f'Trip name must be {MAX_TRIP_NAME_LENGTH} characters or fewer.'
            ), 400
        try:
            trip = trip_store.create_trip(new_trip_name)
            created_new = True
        except ValueError as exc:
            return jsonify(status='error', message=str(exc)), 400
    else:
        if not trip_id:
            return jsonify(
                status='error',
                message='Select an existing trip or provide a new trip name.'
            ), 400

        trip = trip_store.get_trip(trip_id)
        if trip is None:
            return jsonify(status='error', message='Trip not found.'), 404

    try:
        trip_identifier = trip.id if hasattr(trip, 'id') else trip.get('id')
        trip = trip_store.add_place_to_trip(trip_identifier, place_id)
    except KeyError:
        return jsonify(status='error', message='Trip not found.'), 404
    except ValueError as exc:
        return jsonify(status='error', message=str(exc)), 400

    message = 'Trip created and location added.' if created_new else 'Location added to trip.'
    return jsonify(
        status='success',
        message=message,
        trip=_serialise_trip(trip),
        created=created_new,
    )


@main.route('/api/trips/assign_bulk', methods=['POST'])
def api_assign_trip_bulk():
    """Assign multiple data points to a trip in a single request."""

    payload = request.get_json(silent=True) or {}
    place_ids_raw = payload.get('place_ids')

    if not isinstance(place_ids_raw, (list, tuple, set)):
        return jsonify(status='error', message='Provide a list of place IDs.'), 400

    cleaned_ids = []
    for raw_id in place_ids_raw:
        if raw_id is None:
            continue
        if isinstance(raw_id, str):
            cleaned = raw_id.strip()
        else:
            cleaned = str(raw_id).strip()
        if cleaned:
            cleaned_ids.append(cleaned)

    if not cleaned_ids:
        return jsonify(status='error', message='No valid place IDs were provided.'), 400

    df = data_cache.timeline_df
    if df is None or df.empty or 'Place ID' not in df.columns:
        return jsonify(status='error', message='Data points not found.'), 404

    try:
        existing_ids_series = df['Place ID'].dropna().astype(str).str.strip()
    except Exception:
        existing_ids_series = pd.Series(dtype=str)

    valid_ids = {value for value in existing_ids_series if value}
    matched_ids: list[str] = []
    for identifier in cleaned_ids:
        if identifier in valid_ids and identifier not in matched_ids:
            matched_ids.append(identifier)

    if not matched_ids:
        return jsonify(status='error', message='Data points not found.'), 404

    trip_id = str(payload.get('trip_id') or '').strip()
    new_trip_name = payload.get('new_trip_name') or payload.get('trip_name') or ''
    new_trip_name = str(new_trip_name).strip()

    created_new = False

    try:
        if new_trip_name:
            if len(new_trip_name) > MAX_TRIP_NAME_LENGTH:
                return jsonify(
                    status='error',
                    message=f'Trip name must be {MAX_TRIP_NAME_LENGTH} characters or fewer.'
                ), 400
            trip = trip_store.create_trip(new_trip_name)
            created_new = True
        else:
            if not trip_id:
                return jsonify(
                    status='error',
                    message='Select an existing trip or provide a new trip name.'
                ), 400
            trip = trip_store.get_trip(trip_id)
            if trip is None:
                return jsonify(status='error', message='Trip not found.'), 404

        trip_identifier = trip.id if hasattr(trip, 'id') else trip.get('id')
        trip, added_count = trip_store.add_places_to_trip(trip_identifier, matched_ids)
    except KeyError:
        return jsonify(status='error', message='Trip not found.'), 404
    except ValueError as exc:
        return jsonify(status='error', message=str(exc)), 400

    selected_count = len(matched_ids)
    skipped_count = max(selected_count - added_count, 0)

    if created_new and added_count:
        message = f'Trip created and {added_count} location(s) added.'
    elif created_new:
        message = 'Trip created successfully.'
    elif added_count:
        message = f'Added {added_count} location(s) to trip.'
    else:
        message = 'Selected locations were already part of the trip.'

    return jsonify(
        status='success',
        message=message,
        trip=_serialise_trip(trip),
        created=created_new,
        added=added_count,
        skipped=skipped_count,
        selected=selected_count,
    )


@main.route('/api/trips/<trip_id>/locations/<place_id>', methods=['DELETE'])
def api_remove_trip_location(trip_id: str, place_id: str):
    """Remove ``place_id`` from the trip identified by ``trip_id``."""

    trip_identifier = (trip_id or '').strip()
    place_identifier = (place_id or '').strip()

    if not trip_identifier or not place_identifier:
        return jsonify(
            status='error',
            message='A valid trip and place ID are required.'
        ), 400

    try:
        trip = trip_store.remove_place_from_trip(trip_identifier, place_identifier)
    except KeyError:
        return jsonify(status='error', message='Trip not found.'), 404
    except ValueError as exc:
        return jsonify(status='error', message=str(exc)), 400

    return jsonify(
        status='success',
        message='Location removed from trip.',
        trip=_serialise_trip(trip),
    )


@main.route('/api/trips/clear_memberships', methods=['POST'])
def api_clear_trip_memberships():
    """Remove the selected locations from every trip."""

    payload = request.get_json(silent=True) or {}
    place_ids_raw = payload.get('place_ids')

    if not isinstance(place_ids_raw, (list, tuple, set)):
        return jsonify(status='error', message='Provide a list of place IDs.'), 400

    cleaned_ids = []
    for raw_id in place_ids_raw:
        if raw_id is None:
            continue
        if isinstance(raw_id, str):
            cleaned = raw_id.strip()
        else:
            cleaned = str(raw_id).strip()
        if cleaned:
            cleaned_ids.append(cleaned)

    if not cleaned_ids:
        return jsonify(status='error', message='No valid place IDs were provided.'), 400

    result = trip_store.remove_places_from_all_trips(cleaned_ids)
    removed = int(result.get('removed_memberships', 0))
    updated_trips = int(result.get('updated_trips', 0))

    if removed == 0:
        message = 'Selected locations were not part of any trips.'
    else:
        trip_label = 'trip' if updated_trips == 1 else 'trips'
        assignment_label = 'assignment' if removed == 1 else 'assignments'
        message = f'Removed {removed} {assignment_label} across {updated_trips} {trip_label}.'

    return jsonify(
        status='success',
        message=message,
        removed=removed,
        updated_trips=updated_trips,
        processed_ids=result.get('processed_ids', cleaned_ids),
    )


@main.route('/api/map_data', methods=['GET', 'POST'])
def api_map_data():
    """Return marker data for the current timeline.

    The frontend calls this endpoint to retrieve simplified marker
    dictionaries.  Optional filtering by ``Source Type`` values is
    supported via POST or query parameters.
    """

    # Grab the cached timeline DataFrame held in memory
    df = data_cache.timeline_df
    data_cache.ensure_archived_column()
    df = data_cache.timeline_df

    # If no data has been loaded yet return an empty array
    if df is None or df.empty:
        return jsonify([])

    if request.method == 'POST':
        # For POST requests, read JSON body and grab any filters
        data = request.get_json(silent=True) or {}
        source_types = data.get('source_types')
        source_types_provided = 'source_types' in data
        start_date = data.get('start_date') or None
        end_date = data.get('end_date') or None
    else:
        # GET requests provide the filters as query string values
        if 'source_types' in request.args:
            source_types = request.args.getlist('source_types')
            source_types_provided = True
        else:
            source_types = None
            source_types_provided = False

        start_date = request.args.get('start_date') or None
        end_date = request.args.get('end_date') or None

    # Apply filtering when specific source types are requested
    if source_types_provided:
        source_types = source_types or []
        df = df[df.get('Source Type').isin(source_types)]

    # Exclude archived entries
    if 'Archived' in df.columns:
        df = df[df['Archived'] != True]

    # Apply optional date filtering
    df = filter_dataframe_by_date_range(df, start_date=start_date, end_date=end_date)

    # Convert the filtered DataFrame into simple marker dictionaries
    markers = dataframe_to_markers(df)

    if markers:
        trips = trip_store.list_trips()
        place_memberships: dict[str, list[dict]] = {}

        for trip in trips:
            if not isinstance(trip, dict):
                continue

            trip_id = str(trip.get('id') or '').strip()
            if not trip_id:
                continue

            trip_name = str(trip.get('name') or '').strip() or 'Untitled Trip'
            place_ids = trip.get('place_ids') or []

            if not isinstance(place_ids, list):
                continue

            for raw_place_id in place_ids:
                place_identifier = str(raw_place_id or '').strip()
                if not place_identifier:
                    continue
                membership = place_memberships.setdefault(place_identifier, [])
                membership.append({'id': trip_id, 'name': trip_name})

        for marker in markers:
            place_id = str(marker.get('id') or '').strip()
            marker['trips'] = place_memberships.get(place_id, [])

    return jsonify(markers)


@main.route('/api/archived_markers', methods=['GET'])
def api_archived_markers():
    """Return archived marker data points for management."""

    df = data_cache.timeline_df
    if df is None or df.empty:
        return jsonify([])

    data_cache.ensure_archived_column()
    df = data_cache.timeline_df
    archived_series = df.get('Archived')
    if archived_series is None:
        return jsonify([])

    archived_mask = archived_series.fillna(False).astype(str).str.lower() == 'true'
    archived_df = df[archived_mask]

    if archived_df.empty:
        return jsonify([])

    return jsonify(dataframe_to_markers(archived_df, include_archived=True))


@main.route('/api/markers/<place_id>/alias', methods=['POST'])
def api_update_alias(place_id: str):
    """Create or update a custom alias for the given marker."""

    df = data_cache.timeline_df
    if df is None or df.empty or 'Place ID' not in df.columns:
        return jsonify(status='error', message='Data point not found.'), 404

    data_cache.ensure_archived_column()
    df = data_cache.timeline_df

    mask = df['Place ID'] == place_id
    if not mask.any():
        return jsonify(status='error', message='Data point not found.'), 404

    payload = request.get_json(silent=True) or {}
    alias_value = payload.get('alias', '')

    if alias_value is None:
        alias_value = ''

    alias_value = str(alias_value).strip()

    if len(alias_value) > MAX_ALIAS_LENGTH:
        return jsonify(
            status='error',
            message=f'Alias must be {MAX_ALIAS_LENGTH} characters or fewer.'
        ), 400

    df.loc[mask, 'Alias'] = alias_value
    data_cache.timeline_df = df
    data_cache.ensure_archived_column()
    data_cache.save_timeline_data()

    place_name = ''
    if 'Place Name' in df.columns:
        try:
            place_name = str(df.loc[mask, 'Place Name'].iloc[0])
        except Exception:
            place_name = ''

    display_name = alias_value or place_name

    message = 'Alias updated successfully.' if alias_value else 'Alias cleared successfully.'

    return jsonify(
        status='success',
        message=message,
        alias=alias_value,
        display_name=display_name,
    )


@main.route('/api/markers/<place_id>/description', methods=['POST'])
def api_update_marker_description(place_id: str):
    """Create or update a free-form description for the given marker."""

    df = data_cache.timeline_df
    if df is None or df.empty or 'Place ID' not in df.columns:
        return jsonify(status='error', message='Data point not found.'), 404

    data_cache.ensure_archived_column()
    df = data_cache.timeline_df

    mask = df['Place ID'] == place_id
    if not mask.any():
        return jsonify(status='error', message='Data point not found.'), 404

    payload = request.get_json(silent=True) or {}
    description_value = payload.get('description', '')

    if description_value is None:
        description_value = ''

    if not isinstance(description_value, str):
        description_value = str(description_value)

    if len(description_value) > MAX_LOCATION_DESCRIPTION_LENGTH:
        return jsonify(
            status='error',
            message=(
                'Description must be '
                f'{MAX_LOCATION_DESCRIPTION_LENGTH} characters or fewer.'
            ),
        ), 400

    final_description = description_value if description_value.strip() else ''

    df.loc[mask, 'Description'] = final_description
    data_cache.timeline_df = df
    data_cache.ensure_archived_column()
    data_cache.save_timeline_data()

    message = (
        'Description saved successfully.'
        if final_description
        else 'Description cleared successfully.'
    )

    return jsonify(
        status='success',
        message=message,
        description=final_description,
    )
