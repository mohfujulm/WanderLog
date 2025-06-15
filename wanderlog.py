import folium
import os
import pandas as pd
from dotenv import load_dotenv
from folium.plugins import MarkerCluster

load_dotenv()
MAPBOX_ACCESS_TOKEN = os.getenv("MAPBOX_ACCESS_TOKEN")

# Load your CSV file
df = pd.read_csv("test_output.csv")

m = folium.Map(
    location=[40.65997395108914, -73.71300111746832],  # starting point (lat, lon)
    zoom_start=4,
    tiles=f"https://api.mapbox.com/styles/v1/mapbox/outdoors-v12/tiles/{{z}}/{{x}}/{{y}}?access_token={MAPBOX_ACCESS_TOKEN}",
    attr='Mapbox'
)

# Create a MarkerCluster object
marker_cluster = MarkerCluster().add_to(m)

# Add markers to the cluster instead of directly to the map
for idx, row in df.iterrows():
    folium.Marker(
        location=[row['Latitude'], row['Longitude']],
        popup=row['Place ID']
    ).add_to(marker_cluster)

# Save to HTML
m.save('map.html')