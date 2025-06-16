### Basic json data parsing/retrieval functions that will be used throughout this application. ###

import json
import csv
from datetime import datetime

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

### Prints all unique visits from a Timeline dataset with corresponding coordinates (latitude & longitude)
def print_unique_visits_to_csv(json_data, output_file):
   
    place_id_map = {}

    for segment in json_data.get("semanticSegments", []):
        visit = segment.get("visit")
        if not visit:
            continue

        candidates = []

        if "topCandidate" in visit:
            candidates.append(visit["topCandidate"])
        candidates.extend(visit.get("candidatePlaces", []))

        for place in candidates:
            place_id = place.get("placeId")
            latlng = place.get("placeLocation", {}).get("latLng")
            if place_id and latlng and place_id not in place_id_map:
                # Parse latitude and longitude
                try:
                    lat_str, lon_str = latlng.replace("°", "").split(",")
                    lat = float(lat_str.strip())
                    lon = float(lon_str.strip())
                    place_id_map[place_id] = (lat, lon)
                except Exception:
                    continue  # Skip malformed coordinates

    with open(output_file, 'w', newline='', encoding='utf-8') as csvfile:
        writer = csv.writer(csvfile)
        writer.writerow(["Place ID", "Latitude", "Longitude"])

        for place_id, (lat, lon) in place_id_map.items():
            writer.writerow([place_id, lat, lon])


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





