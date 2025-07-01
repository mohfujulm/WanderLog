"""Flask routes for the WanderLog application."""

import json
import os

import pandas as pd
from flask import Blueprint, jsonify, render_template, request
from app.utils.json_processing_functions import unique_visits_to_df
from . import data_cache

main = Blueprint("main", __name__)

MAPBOX_ACCESS_TOKEN = os.getenv("MAPBOX_ACCESS_TOKEN")

@main.route('/')
def index():
    """Render the landing page."""

    return render_template("index.html", mapbox_access_token=MAPBOX_ACCESS_TOKEN)

# Route to serve the current saved map HTML
@main.route('/map')
def serve_map():
    """Return the saved ``map.html`` file or a fallback page."""
    try:
        with open('map.html', 'r', encoding='utf-8') as f:
            return f.read()
    except FileNotFoundError:
        # If the map hasn't been created yet show a simple message.
        return render_template('map_not_found.html')

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
        # combine the imported data with the existing database info
        if database_df is not None:
            combined = pd.concat([imported_df, database_df])
        else:
            combined = imported_df
        combined = combined.drop_duplicates()
        #update global database memory with appended information
        data_cache.timeline_df = combined

        # Persist the updated timeline if required
        data_cache.save_timeline_data()

        #  Return success message
        return jsonify(
          status='success',
          message=f"Map updated with data from {timeline_file}!"
        )

    except Exception as e:
        print(e)
        return jsonify(status='error', message=str(e)), 500

@main.route('/api/clear', methods=['POST'])
def api_clear():
    """Clear all markers and reset the stored timeline data."""

    data_cache.clear_timeline_data()
    return jsonify({'status': 'success', 'message': 'Map cleared successfully.'})


@main.route('/api/source_types', methods=['GET'])
def api_source_types():
    """Return a list of available Source Type values."""

    df = data_cache.timeline_df
    if df is None or df.empty:
        return jsonify([])

    types = sorted(df.get('Source Type').dropna().unique().tolist())
    return jsonify(types)

@main.route('/api/render_map', methods=['POST'])
def api_render_map():
    """Endpoint maintained for backwards compatibility."""

    if data_cache.timeline_df is None or data_cache.timeline_df.empty:
        return jsonify(status='error', message='No timeline data loaded.'), 400

    return jsonify({'status': 'success', 'message': 'Map refreshed.'})


@main.route('/api/markers', methods=['GET'])
def api_markers():
    """Return marker data optionally filtered by ``source_types`` query args."""

    df = data_cache.timeline_df
    if df is None or df.empty:
        return jsonify([])

    source_types = request.args.getlist('source_types')
    if source_types:
        df = df[df.get('Source Type').isin(source_types)]

    markers = df[['Latitude', 'Longitude', 'Place Name', 'Start Date']].to_dict(orient='records')
    return jsonify(markers)
