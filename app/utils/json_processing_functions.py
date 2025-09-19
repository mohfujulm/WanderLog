"""Helper functions for parsing Google Timeline JSON data.

The functions in this module are used to read Timeline JSON files, extract
visits, and enrich those visits with human readable addresses via the Mapbox
API.  A valid ``MAPBOX_ACCESS_TOKEN`` is expected to be provided in the
environment (usually loaded from a ``.env`` file).
"""

import json
import os
from datetime import datetime

import pandas as pd
import requests
from dotenv import load_dotenv
from .. import data_cache

load_dotenv()

MAPBOX_ACCESS_TOKEN = os.getenv("MAPBOX_ACCESS_TOKEN")

def reverse_geocode_api_call_helper(lat: float, lon: float) -> str:
    """Return a human readable place name for the given coordinates.

    Parameters
    ----------
    lat: float
        Latitude of the location.
    lon: float
        Longitude of the location.

    Returns
    -------
    str
        The place name resolved by the Mapbox API or an error string if the
        lookup fails.
    """

    url = (
        "https://api.mapbox.com/geocoding/v5/mapbox.places/"
        f"{lon},{lat}.json?access_token={MAPBOX_ACCESS_TOKEN}&types=poi,address,place"
    )

    response = requests.get(url)

    if response.status_code == 200:
        features = response.json().get("features", [])
        if features:
            return features[0].get("place_name", "Unknown")
        return "No result"
    return f"Error {response.status_code}"

def load_json_file(filepath: str) -> dict:
    """Load a JSON file from ``filepath`` and return the parsed data."""

    with open(filepath, "r", encoding="utf-8") as f:
        return json.load(f)

def extract_locations_by_date(json_data: dict, start_date: datetime.date, end_date: datetime.date) -> list:
    """Return visits occurring within ``start_date`` and ``end_date``."""

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
def extract_locations_by_place_id(json_data: dict, place_id: str) -> list:
    """Return all visits that match the provided ``place_id``."""

    filtered_visits = []

    for segment in json_data.get("semanticSegments", []):
        visit = segment.get("visit")
        if visit and "topCandidate" in visit:
            top = visit["topCandidate"]
            current_place_id = top.get("placeId", "")
            if current_place_id == place_id:
                filtered_visits.append({
                    "start": segment.get("startTime"),
                    "end": segment.get("endTime"),
                    "place_id": current_place_id,
                    "coordinates": top.get("placeLocation", {}).get("latLng", "Unknown")
                })

    return filtered_visits

def unique_visits_to_df(json_data: dict, source_type: str = "") -> pd.DataFrame:
    """Return a :class:`pandas.DataFrame` of unique visits."""
    existing_df = data_cache.timeline_df
    # --- Create a set of existing placeIds for fast lookups
    existing_place_ids = set(existing_df['Place ID']) if not existing_df.empty else set()
    place_id_map = {}
    counter = 0

    for segment in json_data.get("semanticSegments", []):
        visit = segment.get("visit")
        if not visit:
            continue

        candidates = []
        if "topCandidate" in visit:
            candidates.append(visit["topCandidate"])
        candidates.extend(visit.get("candidatePlaces", []))

        for candidate in candidates:
            pid = candidate.get("placeId")
            if not pid:
                #print("No place ID found")
                counter += 1
                continue
            if pid in existing_place_ids:
                #print(f"Place ID {pid} already in Timeline Database. Skipping entry.")
                counter += 1
                continue
            if pid in place_id_map:
                #print("Duplicate detected within this run. Skipping entry.")
                counter += 1
                continue

            latlng = candidate.get("placeLocation", {}).get("latLng", "")
            if not latlng:
                continue

            try:
                start_time_str = segment.get("startTime")
                if start_time_str:
                    try:
                        start_date = datetime.fromisoformat(
                            start_time_str.replace("Z", "")
                        ).date().isoformat()
                    except Exception:
                        start_date = ""
                else:
                    start_date = ""

                lat_str, lon_str = latlng.replace("°", "").split(",")
                lat = float(lat_str.strip())
                lon = float(lon_str.strip())
                place_name = reverse_geocode_api_call_helper(lat, lon)
                place_id_map[pid] = (lat, lon, start_date, place_name)
            except Exception:
                continue
    
    print('Skipped processing of ', counter, ' entries (duplicates or invalid values).')
    # (You'll want to convert place_id_map to a DataFrame before returning...)

    records = [
        {
            "Place ID": pid,
            "Latitude": vals[0],
            "Longitude": vals[1],
            "Start Date": vals[2],
            "Source Type": source_type,
            "Place Name": vals[3],
            "Archived": False,
        }
        for pid, vals in place_id_map.items()
    ]

    return pd.DataFrame(records)

def print_unique_visits_to_csv(
    json_data: dict, output_file: str | None = None, source_type: str = ""
) -> pd.DataFrame:
    """Write :func:`unique_visits_to_df` output to ``output_file``.

    Parameters
    ----------
    json_data: dict
        Parsed Google Timeline JSON data.
    output_file: str | None
        Optional path to write the CSV file to.
    source_type: str, optional
        Value used to annotate the resulting DataFrame.
    """

    df = unique_visits_to_df(json_data, source_type)
    if output_file:
        df.to_csv(output_file, index=False)
    return df

### Print location data to console formatted cleanly for troubleshooting
def print_json_to_console(json_data: list) -> None:
    """Pretty print a list of visit dictionaries to the console."""

    for idx, visit in enumerate(json_data, 1):
        print(f"\nVisit #{idx}")
        print(f"Start Time : {visit['start']}")
        print(f"End Time   : {visit['end']}")
        print(f"Place ID   : {visit['place_id']}")
        print(f"Coordinates: {visit['coordinates']}")

### Writes locations (start time, end time, place ID, and coordinates) to a .json file
def print_json_to_file(json_data: list, output_file: str) -> None:
    """Write ``json_data`` to ``output_file`` formatted as JSON."""

    json_object = json.dumps(json_data, indent=4)
    with open(output_file, "w", encoding="utf-8") as outfile:
        outfile.write(json_object)

#start_date = datetime.strptime('2015-01-01', '%Y-%m-%d').date()
#end_date   = datetime.strptime('2025-01-31', '%Y-%m-%d').date()

#testdata = load_json_file('data\Timeline - copy.json')
#print_unique_visits_to_csv(testdata, 'TEST.csv')
#extractedData = extract_locations_by_date(testdata, start_date, end_date)
#print_json_to_console(extractedData)

