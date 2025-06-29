import os
import pandas as pd
import folium
from folium.plugins import MarkerCluster

def update_map_with_timeline_data(input_map, input_file):
    """Reads location data from CSV and adds markers to a folium map."""
    print(f"Loading data from: {input_file}")
    df = pd.read_csv(input_file)
    print(f"Loaded {len(df)} locations from CSV")

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

    for _, row in df.iterrows():
        popup_html = f"""
        {popup_css}
        <div style="
            font-family: Arial, sans-serif;
            width: 220px;
            padding: 15px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            border-radius: 15px;
            box-shadow: 0 8px 20px rgba(0,0,0,0.3);
            border: 2px solid rgba(255,255,255,0.2);
            position: relative;
        ">
            <h3 style="margin: 0 0 10px 0; color: #fff; font-size: 16px;">
                📍 Location Details
            </h3>
            <p style="margin: 5px 0; font-size: 12px;">
                <strong>Place Name:</strong> {row['Place Name']}
            </p>
            <p style="margin: 5px 0; font-size: 12px;">
                <strong>Date Visited:</strong> {row['Start Date']}
            </p>
            <p style="margin: 5px 0; font-size: 12px;">
                <strong>Coordinates:</strong><br>
                Lat: {row['Latitude']:.4f}<br>
                Lng: {row['Longitude']:.4f}
            </p>
            
            <!-- Custom arrow pointing down -->
            <div style="
                position: absolute;
                bottom: -10px;
                left: 50%;
                transform: translateX(-50%);
                width: 0;
                height: 0;
                border-left: 10px solid transparent;
                border-right: 10px solid transparent;
                border-top: 10px solid #764ba2;
            "></div>
        </div>
        """
        custom_icon = None

        if os.path.exists('app/static/assets/marker.png'):
            custom_icon = folium.CustomIcon(
                icon_image='app/static/assets/marker.png',
                icon_size=(40, 40),
                icon_anchor=(20, 40),
                popup_anchor=(0, -40)
            )

        folium.Marker(
            location=[row['Latitude'], row['Longitude']],
            popup=folium.Popup(popup_html, max_width=250),
            icon=custom_icon
        ).add_to(marker_cluster)

    input_map.save('map.html')
    print("Map saved successfully!")