### Basic json data parsing/retrieval functions that will be used throughout this application. ###

import json
import csv
import os
import requests
from datetime import datetime
from dotenv import load_dotenv

load_dotenv()

MAPBOX_ACCESS_TOKEN = os.getenv("MAPBOX_ACCESS_TOKEN")

# Function to reverse geocode latitude & longitude into a place name using Mapbox
def reverse_geocode_api_call_helper(lat, lon):
    # Build URL for Mapbox reverse geocoding API
    url = (
        f"https://api.mapbox.com/geocoding/v5/mapbox.places/"
        f"{lon},{lat}.json?access_token={MAPBOX_ACCESS_TOKEN}&types=poi,address,place"
    )

    # Make the API request
    response = requests.get(url)

    # Parse the result if successful
    if response.status_code == 200:
        features = response.json().get("features", [])
        if features:
            return features[0].get("place_name", "Unknown")
        else:
            return "No result"
    else:
        return f"Error {response.status_code}"

### Load a json file into python
def load_json_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        data = json.load(f)
        return data

### Returns a list of locations (start time, end time, place ID, and coordinates) provided a specified range of dates
def extract_locations_by_date(json_data, start_date, end_date):
    visits_in_range = []

    for segment in json_data.get("semanticSegments", []):
        if "visit" in segment and "topCandidate" in segment["visit"]:
            visit = segment["visit"]
            top = visit["topCandidate"]
            place = top.get("placeLocation", {}).get("latLng", "Unknown")
            place_id = top.get("placeId", "Unknown")

            # Parse the start time of the visit
            start_str = segment.get("startTime")
            try:
                start_time = datetime.fromisoformat(start_str.replace("Z", ""))
            except Exception:
                continue  # Skip malformed entries

            # Convert datetime to date for comparison
            visit_date = start_time.date()

            if start_date <= visit_date <= end_date:
                visits_in_range.append({
                    "start": start_str,
                    "end": segment.get("endTime"),
                    "place_id": place_id,
                    "coordinates": place
                })
    return visits_in_range

### Returns a list of locations (start time, end time, place ID, and coordinates) provided a given place ID
def extract_location_by_placeID(json_data, placeID):
    
    filtered_visits = []

    for segment in json_data.get("semanticSegments", []):
        visit = segment.get("visit")
        if visit and "topCandidate" in visit:
            top = visit["topCandidate"]
            place_id = top.get("placeId", "")
            if place_id == placeID:
                filtered_visits.append({
                    "start": segment.get("startTime"),
                    "end": segment.get("endTime"),
                    "place_id": place_id,
                    "coordinates": top.get("placeLocation", {}).get("latLng", "Unknown")
                })

    return filtered_visits

def print_unique_visits_to_csv(json_data, output_file, source_type=''):
    """
    Writes unique visits from the Google Timeline JSON to a CSV, adding a new
    'Source Type' column filled with the provided `source_type` value.
    """
    place_id_map = {}

    for segment in json_data.get("semanticSegments", []):
        visit = segment.get("visit")
        if not visit:
            continue

        # Collect topCandidate and any fallback candidatePlaces
        candidates = []
        if "topCandidate" in visit:
            candidates.append(visit["topCandidate"])
        candidates.extend(visit.get("candidatePlaces", []))

        for candidate in candidates:
            pid = candidate.get("placeId")
            if not pid or pid in place_id_map:
                continue

            latlng = candidate.get("placeLocation", {}).get("latLng", "")
            if not latlng:
                continue

            try:
                # Parse the visit start date into ISO format
                start_time_str = segment.get("startTime")
                
                if start_time_str:
                    try:
                        start_date = datetime.fromisoformat(
                            start_time_str.replace("Z", "")
                        ).date().isoformat()
                    except Exception:
                        start_date = ""

                # Convert coordinates from "lat°, lon°" to floats
                lat_str, lon_str = latlng.replace("°", "").split(",")
                lat = float(lat_str.strip())
                lon = float(lon_str.strip())
                place_name = reverse_geocode_api_call_helper(lat, lon)
                place_id_map[pid] = (lat, lon, start_date, place_name)
            except Exception:
                # Skip entries with malformed data
                continue

    # Write out the CSV with the new Source Type column
    with open(output_file, 'w', newline='', encoding='utf-8') as csvfile:
        writer = csv.writer(csvfile)
        # Add 'Source Type' to the header
        writer.writerow(["Place ID", "Latitude", "Longitude", "Start Date", "Source Type", "Place Name"])
        # Populate every row with the provided source_type
        for pid, (lat, lon, start_date, place_name) in place_id_map.items():
            writer.writerow([pid, lat, lon, start_date, source_type, place_name])

### Print location data to console formatted cleanly for troubleshooting
def print_json_to_console(json_data):
    for idx, v in enumerate(json_data, 1):
        print(f"\nVisit #{idx}")
        print(f"Start Time : {v['start']}")
        print(f"End Time   : {v['end']}")
        print(f"Place ID   : {v['place_id']}")
        print(f"Coordinates: {v['coordinates']}")

### Writes locations (start time, end time, place ID, and coordinates) to a .json file
def print_json_to_file(json_data, output_file):
    json_object = json.dumps(json_data, indent=4)
    with open(output_file, "w") as outfile:
        outfile.write(json_object)

#start_date = datetime.strptime('2015-01-01', '%Y-%m-%d').date()
#end_date   = datetime.strptime('2025-01-31', '%Y-%m-%d').date()

#testdata = load_json_file('data\Timeline - copy.json')
#print_unique_visits_to_csv(testdata, 'TEST.csv')
#extractedData = extract_locations_by_date(testdata, start_date, end_date)
#print_json_to_console(extractedData)

