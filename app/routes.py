"""Flask routes for the WanderLog application."""

import json
import os

import pandas as pd
from flask import Blueprint, jsonify, render_template, request

from app.map_utils import dataframe_to_markers, filter_dataframe_by_date_range
from app.utils.json_processing_functions import unique_visits_to_df
from . import data_cache, trip_store

main = Blueprint("main", __name__)

MAPBOX_ACCESS_TOKEN = os.getenv("MAPBOX_ACCESS_TOKEN")
MAX_ALIAS_LENGTH = 120
MAX_TRIP_NAME_LENGTH = 120


def _serialise_trip(trip) -> dict:
    """Return a JSON-serialisable dictionary for ``trip``."""

    if trip is None:
        return {}

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
        }

    place_ids = getattr(trip, 'place_ids', []) or []
    location_count = len(place_ids) if isinstance(place_ids, list) else 0

    return {
        'id': getattr(trip, 'id', ''),
        'name': getattr(trip, 'name', ''),
        'location_count': location_count,
        'created_at': getattr(trip, 'created_at', None),
        'updated_at': getattr(trip, 'updated_at', None),
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
        'latitude': latitude,
        'longitude': longitude,
        'order': order,
        'missing': False,
    }


@main.route('/')
def index():
    """Render the landing page."""

    return render_template("index.html", mapbox_token=MAPBOX_ACCESS_TOKEN)

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

    if alias_value is None:
        alias_value = ''

    alias_value = str(alias_value).strip()

    if len(alias_value) > MAX_ALIAS_LENGTH:
        return jsonify(
            status='error',
            message=f'Alias must be {MAX_ALIAS_LENGTH} characters or fewer.'
        ), 400

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
    return jsonify([_serialise_trip(trip) for trip in trips])


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

    return jsonify({
        'trip': serialised_trip,
        'locations': locations,
    })


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

    try:
        trip = trip_store.create_trip(name)
    except ValueError as exc:
        return jsonify(status='error', message=str(exc)), 400

    return jsonify(
        status='success',
        message='Trip created successfully.',
        trip=_serialise_trip(trip),
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
    return jsonify(dataframe_to_markers(df))


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
