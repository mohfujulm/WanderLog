import os
import json
from flask import Blueprint, render_template, jsonify, request
import folium
from app.map_utils import update_map_with_timeline_data
from app.utils.json_processing_functions import print_unique_visits_to_csv

main = Blueprint('main', __name__)

MAPBOX_ACCESS_TOKEN = os.getenv("MAPBOX_ACCESS_TOKEN")

# Create initial Folium map object with default settings
m = folium.Map(
    location=[40.65997395108914, -73.71300111746832],
    zoom_start=5,
    min_zoom=3,
    tiles=f"https://api.mapbox.com/styles/v1/mapbox/outdoors-v12/tiles/{{z}}/{{x}}/{{y}}?access_token={MAPBOX_ACCESS_TOKEN}",
    attr='Mapbox'
)

@main.route('/')
def index():
    return render_template('index.html')    # Render the main index page

# Route to serve the current saved map HTML
@main.route('/map')
def serve_map():
    try:
        with open('map.html', 'r', encoding='utf-8') as f:
            return f.read()
    except FileNotFoundError:
        return render_template('map_not_found.html')    # If not found, render a fallback page    

# Route to handle map updates via POSTed JSON file
@main.route('/api/update_timeline', methods=['POST'])
def api_update_timeline():
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

        # Extract all unique locations visited into 'timeline_unique_visits_preprocssed.csv" in, data/ folder
        #csv_path_preprocessed = os.path.join('data', 'timeline_unique_visits_preprocessed.csv')     #creating the target file path
    
        # Reverse geocode all unique locations to get addresses via Mapbox API call into 'timeline_unique_visits.csv" in, data/ folder
        # This is what's actually going to be rendered into map markers
        csv_path = os.path.join('data', 'master_timeline_data.csv')  # creating the target file path

        # Ensure the data directory exists before attempting to write the CSV
        os.makedirs('data', exist_ok=True)
        print_unique_visits_to_csv(timeline_json, csv_path, 'google_timeline')

        # Ensure the CSV file was created successfully
        if not os.path.exists(csv_path):
            return jsonify(
              status='error',
              message=f"CSV file '{csv_path}' not found after processing."
            ), 500

        # Update the Folium map with data from the CSV
        update_map_with_timeline_data(m, csv_path)

        #  Return success message
        return jsonify(
          status='success',
          message=f"Map updated with data from {csv_path}!"
        )

    except Exception as e:
        print(e)
        return jsonify(status='error', message=str(e)), 500

# Route to clear all map markers and reset the map
@main.route('/api/clear', methods=['POST'])
def api_clear():
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