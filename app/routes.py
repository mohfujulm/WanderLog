"""Flask routes for the WanderLog application."""

import json
import os

import pandas as pd
from flask import Blueprint, jsonify, render_template, request

from app.map_utils import dataframe_to_markers
from app.utils.json_processing_functions import unique_visits_to_df
from . import data_cache

main = Blueprint("main", __name__)

MAPBOX_ACCESS_TOKEN = os.getenv("MAPBOX_ACCESS_TOKEN")

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
        database_df = data_cache.timeline_df
        #combine the imported data and resulting processed dataframe with the existing database info
        combined = pd.concat([imported_df, database_df])
        combined = combined.drop_duplicates()
        #update global database memory with appended information
        data_cache.timeline_df = combined

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

    data_cache.timeline_df = pd.DataFrame()
    data_cache.save_timeline_data()
    return jsonify({'status': 'success', 'message': 'All timeline data cleared successfully.'})


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

    new_row = pd.DataFrame([
        {
            'Place ID': str(os.urandom(16).hex()),
            'Latitude': lat,
            'Longitude': lon,
            'Start Date': start_date,
            'Source Type': source_type,
            'Place Name': place_name,
        }
    ])

    if data_cache.timeline_df is None or data_cache.timeline_df.empty:
        data_cache.timeline_df = new_row
    else:
        data_cache.timeline_df = pd.concat([data_cache.timeline_df, new_row], ignore_index=True)

    data_cache.save_timeline_data()

    return jsonify(status='success', message='Data point added successfully.')


@main.route('/api/source_types', methods=['GET'])
def api_source_types():
    """Return a list of available Source Type values."""

    df = data_cache.timeline_df
    if df is None or df.empty:
        return jsonify([])

    types = sorted(df.get('Source Type').dropna().unique().tolist())
    return jsonify(types)


@main.route('/api/map_data', methods=['GET', 'POST'])
def api_map_data():
    """Return marker data for the current timeline.

    The frontend calls this endpoint to retrieve simplified marker
    dictionaries.  Optional filtering by ``Source Type`` values is
    supported via POST or query parameters.
    """

    # Grab the cached timeline DataFrame held in memory
    df = data_cache.timeline_df

    # If no data has been loaded yet return an empty array
    if df is None or df.empty:
        return jsonify([])

    if request.method == 'POST':
        # For POST requests, read JSON body and grab any source type filters
        data = request.get_json(silent=True) or {}
        source_types = data.get('source_types')
        source_types_provided = 'source_types' in data
    else:
        # GET requests provide the filters as query string values
        if 'source_types' in request.args:
            source_types = request.args.getlist('source_types')
            source_types_provided = True
        else:
            source_types = None
            source_types_provided = False

    # Apply filtering when specific source types are requested
    if source_types_provided:
        source_types = source_types or []
        df = df[df.get('Source Type').isin(source_types)]

    # Convert the filtered DataFrame into simple marker dictionaries
    return jsonify(dataframe_to_markers(df))
