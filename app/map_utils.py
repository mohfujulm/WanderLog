import os
import pandas as pd
import folium
from folium.plugins import MarkerCluster

from . import data_cache

def update_map_with_timeline_data(input_map, input_file=None, df=None):
    """Add markers to ``input_map`` using timeline data.

    This function now clears previously rendered markers so that only the
    provided ``df`` data is shown.  It also iterates over the DataFrame in a
    more efficient manner to better support large datasets.
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
            return

    if df.empty:
        print("Provided DataFrame is empty. Nothing to render.")
        return

    # ------------------------------------------------------------------
    # Remove any previously rendered layers so filtered results don't
    # accumulate with old data.  Keep the base tile layers intact.
    # ------------------------------------------------------------------
    keys_to_remove = [
        key for key, val in list(input_map._children.items())
        if not isinstance(val, folium.raster_layers.TileLayer)
    ]
    for key in keys_to_remove:
        del input_map._children[key]

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
    
    input_map.get_root().html.add_child(folium.Element(popup_css))

    # Cluster icon styling
    cluster_css = """
    <style>
    .marker-cluster-small {
        background-color: rgba(181, 226, 140, 0.7);
    }
    .marker-cluster-small div {
        width: 30px;
        height: 30px;
        line-height: 30px;
        border-radius: 15px;
        border: 1px solid black;
        color: black;
    }
    .marker-cluster-medium {
        background-color: rgba(241, 211, 87, 0.7);
    }
    .marker-cluster-medium div {
        width: 40px;
        height: 40px;
        line-height: 40px;
        border-radius: 20px;
        border: 1px solid black;
        color: black;
    }
    .marker-cluster-large {
        background-color: rgba(253, 156, 115, 0.7);
    }
    .marker-cluster-large div {
        width: 45px;
        height: 45px;
        line-height: 45px;
        border-radius: 22.5px;
        border: 1px solid black;
        color: black;
    }
    </style>
    """
    input_map.get_root().html.add_child(folium.Element(cluster_css))

    # JavaScript factory for creating cluster icons
    icon_create_function = """
    function(cluster) {
        var count = cluster.getChildCount();
        var size = 'small';
        if (count >= 100) {
            size = 'large';
        } else if (count >= 40) {
            size = 'medium';
        }
        return new L.DivIcon({
            html: '<div><span>' + count + '</span></div>',
            className: 'marker-cluster marker-cluster-' + size,
            iconSize: new L.Point(40, 40)
        });
    }
    """

    # Create cluster group with custom icons
    marker_cluster = MarkerCluster(
        icon_create_function=icon_create_function
    ).add_to(input_map)

    popup_template = (
        """
        {css}
        <div style="font-family: Arial, sans-serif; width: 220px; padding: 15px;"
        " background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color:"
        " white; border-radius: 15px; box-shadow: 0 8px 20px rgba(0,0,0,0.3);"
        " border: 2px solid rgba(255,255,255,0.2); position: relative;">
            <h3 style=\"margin: 0 0 10px 0; color: #fff; font-size: 16px;\">📍 Location Details</h3>
            <p style=\"margin: 5px 0; font-size: 12px;\"><strong>Place Name:</strong> {name}</p>
            <p style=\"margin: 5px 0; font-size: 12px;\"><strong>Date Visited:</strong> {date}</p>
            <p style=\"margin: 5px 0; font-size: 12px;\"><strong>Coordinates:</strong><br>Lat: {lat:.4f}<br>Lng: {lon:.4f}</p>
            <div style="position: absolute; bottom: -10px; left: 50%; transform: translateX(-50%); width: 0; height: 0; border-left: 10px solid transparent; border-right: 10px solid transparent; border-top: 10px solid #764ba2;"></div>
        </div>
        """
    )

    icon_path = 'app/static/assets/marker.png'
    custom_icon = None
    if os.path.exists(icon_path):
        custom_icon = folium.CustomIcon(
            icon_image=icon_path,
            icon_size=(40, 40),
            icon_anchor=(20, 40),
            popup_anchor=(0, -40)
        )

    for row in df.itertuples(index=False):
        rdict = row._asdict()
        name = rdict.get('Place_Name') or rdict.get('Place Name')
        date = rdict.get('Start_Date') or rdict.get('Start Date')
        popup_html = popup_template.format(
            css=popup_css,
            name=name,
            date=date,
            lat=row.Latitude,
            lon=row.Longitude,
        )

        folium.Marker(
            location=[row.Latitude, row.Longitude],
            popup=folium.Popup(popup_html, max_width=250),
            icon=custom_icon
        ).add_to(marker_cluster)

    input_map.save('map.html')
    print("Map saved successfully!")
