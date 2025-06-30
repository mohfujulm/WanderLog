"""Flask routes for the WanderLog application."""

import json
import os

import folium
import pandas as pd
from flask import Blueprint, jsonify, render_template, request

from app.map_utils import update_map_with_timeline_data
from app.utils.json_processing_functions import print_unique_visits_to_csv
from . import data_cache

main = Blueprint("main", __name__)

MAPBOX_ACCESS_TOKEN = os.getenv("MAPBOX_ACCESS_TOKEN")

# Create initial Folium map object with default settings. This in-memory
# map is updated whenever new timeline data is uploaded.
m = folium.Map(
    location=[40.65997395108914, -73.71300111746832],
    zoom_start=5,
    min_zoom=3,
    tiles=f"https://api.mapbox.com/styles/v1/mapbox/outdoors-v12/tiles/{{z}}/{{x}}/{{y}}?access_token={MAPBOX_ACCESS_TOKEN}",
    attr='Mapbox'
)

@main.route('/')
def index():
    """Render the landing page."""

    return render_template("index.html")

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

        # Reverse geocode all unique locations to get addresses via Mapbox and
        # produce the CSV used for rendering markers on the map.
        csv_path = os.path.join('data', 'master_timeline_data.csv')

        # Ensure the data directory exists before attempting to write the CSV
        os.makedirs('data', exist_ok=True)
        print_unique_visits_to_csv(timeline_json, csv_path, 'google_timeline')

        # Ensure the CSV file was created successfully
        if not os.path.exists(csv_path):
            return jsonify(
              status='error',
              message=f"CSV file '{csv_path}' not found after processing."
            ), 500

        # Load the CSV into a DataFrame and update the cache
        df = pd.read_csv(csv_path)
        data_cache.timeline_df = df
        # Persist the updated timeline if required
        data_cache.save_timeline_data()

        # Update the Folium map with the new data
        update_map_with_timeline_data(m, df=df)

        #  Return success message
        return jsonify(
          status='success',
          message=f"Map updated with data from {csv_path}!"
        )

    except Exception as e:
        print(e)
        return jsonify(status='error', message=str(e)), 500

@main.route('/api/clear', methods=['POST'])
def api_clear():
    """Clear all markers and reset the map state."""

    global m
    m = folium.Map(
        location=[40.65997395108914, -73.71300111746832],
        zoom_start=5,
        min_zoom=3,
        tiles=f"https://api.mapbox.com/styles/v1/mapbox/outdoors-v12/tiles/{{z}}/{{x}}/{{y}}?access_token={MAPBOX_ACCESS_TOKEN}",
        attr='Mapbox'
    )
    m.save('map.html')
    return jsonify({'status': 'success', 'message': 'Map cleared successfully.'})
