import os
import pandas as pd
import folium
from folium.plugins import FastMarkerCluster

from . import data_cache


def create_base_map():
    """Return a new empty Folium map."""
    mapbox_token = os.getenv("MAPBOX_ACCESS_TOKEN")
    return folium.Map(
        location=[40.65997395108914, -73.71300111746832],
        zoom_start=5,
        min_zoom=3,
        tiles=(
            f"https://api.mapbox.com/styles/v1/mapbox/outdoors-v12/tiles/{{z}}/{{x}}/{{y}}?access_token={mapbox_token}"
        ),
        attr="Mapbox",
    )


def update_map_with_timeline_data(input_file=None, df=None, source_type=None):
    """Create and save a map with markers from timeline data.

    The map is recreated on each call to avoid stacking old markers and uses
    ``FastMarkerCluster`` for faster client side rendering.
    """
    if df is None:
        if data_cache.timeline_df is not None:
            df = data_cache.timeline_df
            print(f"Using cached timeline data ({len(df)} rows)")
        elif input_file and os.path.exists(input_file):
            print(f"Loading data from: {input_file}")
            df = pd.read_csv(input_file)
        else:
            print("No timeline data available to render on map")
            m = create_base_map()
            m.save("map.html")
            return m

    if source_type:
        before = len(df)
        df = df[df.get("Source Type") == source_type]
        print(
            f"Filtered timeline data from {before} to {len(df)} rows by source '{source_type}'"
        )

    m = create_base_map()

    if df.empty:
        m.save("map.html")
        print("Map saved successfully (no points).")
        return m

    popup_css = """
        <style>
        .leaflet-popup-content-wrapper {
            background: transparent !important;
            box-shadow: none !important;
            border-radius: 0 !important;
            padding: 0 !important;
        }
        .leaflet-popup-content {
            margin: 0 !important;
            padding: 0 !important;
            background: transparent !important;
        }
        .leaflet-popup-tip {
            background: transparent !important;
            border: none !important;
            box-shadow: none !important;
        }
        </style>
    """
    m.get_root().html.add_child(folium.Element(popup_css))

    icon_path = os.path.join("app", "static", "assets", "marker.png")
    custom_icon_exists = os.path.exists(icon_path)
    icon_def = ""
    if custom_icon_exists:
        icon_def = (
            "var customIcon = L.icon({"\
            "iconUrl: '/static/assets/marker.png',"\
            "iconSize: [40,40],"\
            "iconAnchor: [20,40],"\
            "popupAnchor: [0,-40]"\
            "});"
        )

    callback = f"""
    function (row) {{
        {icon_def}
        var marker = L.marker(new L.LatLng(row[0], row[1]){', {icon: customIcon}' if custom_icon_exists else ''});
        var popup = `<div style="font-family: Arial, sans-serif; width: 220px; padding: 15px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border-radius: 15px; box-shadow: 0 8px 20px rgba(0,0,0,0.3); border: 2px solid rgba(255,255,255,0.2); position: relative;">
            <h3 style="margin: 0 0 10px 0; color: #fff; font-size: 16px;">📍 Location Details</h3>
            <p style="margin: 5px 0; font-size: 12px;"><strong>Place Name:</strong> ` + row[2] + `</p>
            <p style="margin: 5px 0; font-size: 12px;"><strong>Date Visited:</strong> ` + row[3] + `</p>
            <div style="position: absolute; bottom: -10px; left: 50%; transform: translateX(-50%); width: 0; height: 0; border-left: 10px solid transparent; border-right: 10px solid transparent; border-top: 10px solid #764ba2;"></div>
        </div>`;
        marker.bindPopup(popup);
        return marker;
    }}
    """

    points = df[["Latitude", "Longitude", "Place Name", "Start Date"]].values.tolist()
    FastMarkerCluster(points, callback=callback).add_to(m)

    m.save("map.html")
    print("Map saved successfully!")
    return m
