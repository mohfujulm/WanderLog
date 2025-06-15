import pandas as pd
import requests
import time
import os
from dotenv import load_dotenv

load_dotenv()
MAPBOX_ACCESS_TOKEN = os.getenv("MAPBOX_ACCESS_TOKEN")

# Function to reverse geocode latitude & longitude into a place name using Mapbox
def reverse_geocode(lat, lon):
    # Build URL for Mapbox reverse geocoding API
    url = (
        f"https://api.mapbox.com/geocoding/v5/mapbox.places/"
        f"{lon},{lat}.json?access_token={MAPBOX_TOKEN}&types=poi,address,place"
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

# Main function to process an input CSV and append new reverse-geocoded results to output
def process_csv(input_csv, output_csv):
    # Load the input file (should include: Place ID, Latitude, Longitude)
    input_df = pd.read_csv(input_csv)

    # If the output file already exists, load it so we can skip already-processed rows
    if os.path.exists(output_csv):
        output_df = pd.read_csv(output_csv)
    else:
        # Create an empty output DataFrame with the correct columns
        output_df = pd.DataFrame(columns=["Place ID", "Latitude", "Longitude", "Place Name"])

    # Create a set of coordinates already processed (for quick lookup)
    existing_coords = set(zip(output_df["Latitude"], output_df["Longitude"]))

    # List to collect newly processed rows
    results = []

    # Iterate through each row in the input file
    for _, row in input_df.iterrows():
        lat, lon = row["Latitude"], row["Longitude"]
        place_id = row["Place ID"]

        # Skip rows already in the output file (avoid duplicate API calls)
        if (lat, lon) in existing_coords:
            print(f"Skipping already processed: {place_id}, {lat}, {lon}")
            continue

        # Perform reverse geocoding using Mapbox
        place_name = reverse_geocode(lat, lon)
        print(f"Processed {lat}, {lon} → {place_name}")

        # Save the result in a new dictionary (will be added to DataFrame later)
        results.append({
            "Place ID": place_id,
            "Latitude": lat,
            "Longitude": lon,
            "Place Name": place_name
        })

        # Be kind to the API: small delay between requests
        time.sleep(0.2)

    # If we have new results, append them to the output file
    if results:
        new_df = pd.DataFrame(results)
        final_df = pd.concat([output_df, new_df], ignore_index=True)
        final_df.to_csv(output_csv, index=False)
        print(f"\n✅ Updated CSV written to: {output_csv}")
    else:
        print("\n✅ No new rows to process.")
