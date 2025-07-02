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
    """Clear all markers and reset the map state."""

    data_cache.timeline_df = pd.DataFrame()
    data_cache.save_timeline_data()
    return jsonify({'status': 'success', 'message': 'Map cleared successfully.'})


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
    """Return marker data for the current timeline."""

    df = data_cache.timeline_df
    if df is None or df.empty:
        return jsonify([])

    if request.method == 'POST':
        data = request.get_json(silent=True) or {}
        source_types = data.get('source_types') or []
    else:
        source_types = request.args.getlist('source_types')

    if source_types:
        df = df[df.get('Source Type').isin(source_types)]

    return jsonify(dataframe_to_markers(df))
