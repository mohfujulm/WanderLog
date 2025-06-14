### Basic data parsing/retrieval functions that will be used constantly throughout this application. ###

import json
from datetime import datetime

### Extract a list of all coordinate [latitude, longitude] objects within a specified time period. ###

### Load a json file into python
def load_json_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        data = json.load(f)
        return data

### Extract location data (start time, end time, ID, and coordinates) in a specified date range
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

### Extract location data (start time, end time, ID, and coordinates) provided a given place ID
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

### Print location data to console formatted cleanly for troubleshooting
def print_json_to_console(json_data):
    for idx, v in enumerate(json_data, 1):
        print(f"\nVisit #{idx}")
        print(f"Start Time : {v['start']}")
        print(f"End Time   : {v['end']}")
        print(f"Place ID   : {v['place_id']}")
        print(f"Coordinates: {v['coordinates']}")

### Write location data to a .json file
def print_json_to_file(json_data):
    json_object = json.dumps(json_data, indent=4)
    with open("TEST.json", "w") as outfile:
        outfile.write(json_object)



''' Testing
start_date = datetime(2016, 9, 11).date()
end_date = datetime(2016, 12, 13).date()

masterTimelineData = load_json_file("Timeline.json")
dataSnippet = extract_locations_by_date(masterTimelineData, start_date, end_date)
print_json_to_console(dataSnippet)
write_json_to_console(dataSnippet)

placeID = "ChIJg2dGhGhkwokRalGr-h6v_Uk"
dataSnippet2 = extract_location_by_placeID(masterTimelineData, placeID)
print_json_to_console(dataSnippet2)

'''





