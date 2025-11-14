# ============================================================================
# IMPORTS - All the libraries we need
# ============================================================================
import folium                    # For creating interactive maps
import os                       # For file operations and environment variables
import pandas as pd             # For reading and manipulating CSV data
from dotenv import load_dotenv  # For loading environment variables from .env file
from folium.plugins import MarkerCluster  # For grouping markers when zoomed out
from flask import Flask, render_template_string, jsonify  # Web framework

# ============================================================================
# CONFIGURATION - Set up environment and global variables
# ============================================================================
load_dotenv()  # Load environment variables from .env file
MAPBOX_ACCESS_TOKEN = os.getenv("MAPBOX_ACCESS_TOKEN")  # Get Mapbox token
MAPBOX_STYLE_ID = "mapbox/outdoors-v12"
MAPBOX_TILESET_URL = (
    "https://api.mapbox.com/styles/v1/"
    f"{MAPBOX_STYLE_ID}"
    "/tiles/{z}/{x}/{y}?access_token="
    f"{MAPBOX_ACCESS_TOKEN}"
)

# Create Flask web application instance
app = Flask(__name__)

# ============================================================================
# MAP CREATION - Initialize the base map
# ============================================================================
# Create the main map object that will be used throughout the application
m = folium.Map(
    location=[40.65997395108914, -73.71300111746832],  # Starting coordinates (lat, lon)
    zoom_start=5,        # Initial zoom level
    min_zoom=3,          # Minimum zoom allowed
    # Use Mapbox tiles for better styling
    tiles=MAPBOX_TILESET_URL,
    attr='Mapbox'        # Attribution text
)

# ============================================================================
# YOUR ORIGINAL FUNCTION - Enhanced with detailed comments
# ============================================================================
def update_map_with_timeline_data(input_map, input_file):
    """
    This is your original function with added comments.
    It reads CSV data and adds markers to the map.
    
    Args:
        input_map: The Folium map object to add markers to
        input_file: Path to the CSV file containing location data
    """
    
    # STEP 1: Load the CSV file into a pandas DataFrame
    print(f"Loading data from: {input_file}")
    df = pd.read_csv(input_file) 
    print(f"Loaded {len(df)} locations from CSV")

    # STEP 2: Define custom CSS for popup styling
    # This CSS removes the default popup styling to create custom popups
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

    # STEP 3: Add the CSS to the map
    # This injects our custom CSS into the map's HTML
    input_map.get_root().html.add_child(folium.Element(popup_css))

    # STEP 4: Create a marker cluster
    # This groups nearby markers together when zoomed out for better performance
    marker_cluster = MarkerCluster().add_to(input_map)

    # STEP 5: Loop through each row in the CSV and create markers
    for idx, row in df.iterrows():
        place_name = row.get('Place Name', '')
        if pd.isna(place_name):
            place_name = ''
        else:
            place_name = str(place_name).strip()

        alias_value = row.get('Alias', '') if 'Alias' in row else ''
        if pd.isna(alias_value):
            alias_value = ''
        else:
            alias_value = str(alias_value).strip()

        display_name = alias_value or place_name

        print(f"Processing location {idx + 1}: {display_name}")
        
        # Create custom HTML for each popup
        # This creates a beautiful styled popup with gradient background
        alias_row = ""
        if alias_value:
            alias_row = f"""
            <p style=\"margin: 5px 0; font-size: 12px;\">
                <strong>Place Name:</strong> {place_name}
            </p>
            """

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
                <strong>{'Alias' if alias_value else 'Place Name'}:</strong> {display_name}
            </p>
            {alias_row}
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

        # STEP 6: Try to create custom marker icon (if image exists)
        custom_icon = None
        if os.path.exists('assets/marker.png'):
            custom_icon = folium.CustomIcon(
                icon_image='assets/marker.png',  # Path to your custom marker image
                icon_size=(40, 40),             # Size of the icon
                icon_anchor=(20, 40),           # Where the icon anchors to the map
                popup_anchor=(0, -40),          # Where popup appears relative to icon
                shadow_image=None,              # Optional shadow
                shadow_size=None,
                shadow_anchor=None
            )
        
        # STEP 7: Create and add the marker to the cluster
        folium.Marker(
            location=[row['Latitude'], row['Longitude']],  # Marker position
            popup=folium.Popup(popup_html, max_width=250), # Custom popup
            icon=custom_icon                               # Custom icon (if available)
        ).add_to(marker_cluster)

    # STEP 8: The map is kept in memory and can be rendered directly

# ============================================================================
# FLASK ROUTES - These handle web requests (URLs that users visit)
# ============================================================================

@app.route('/')
def index():
    """
    This function handles the main page (home page) of our web application.
    When someone visits http://localhost:5000/, this function runs.
    It returns the HTML code for the full-screen map with overlay buttons.
    """
    
    # HTML template as a string - this is our entire webpage
    html = '''
    <!DOCTYPE html>
    <html>
    <head>
        <title>Wanderlog Full-Screen Map</title>
        <style>
            /* CSS STYLES - Full-screen map with overlay buttons */
            * {
                margin: 0;
                padding: 0;
                box-sizing: border-box;
            }
            
            body, html {
                height: 100%;
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                overflow: hidden;
            }
            
            /* Full-screen map container */
            #map-container {
                position: relative;
                width: 100vw;
                height: 100vh;
            }
            
            /* Map iframe takes full screen */
            #map {
                width: 100%;
                height: 100%;
                border: none;
            }
            
            /* Overlay controls container */
            .overlay-controls {
                position: absolute;
                top: 20px;
                left: 20px;
                z-index: 1000;
                display: flex;
                flex-direction: column;
                gap: 10px;
            }
            
            /* Individual overlay buttons */
            .overlay-button {
                background: rgba(255, 255, 255, 0.95);
                color: #333;
                border: none;
                padding: 12px 18px;
                font-size: 14px;
                font-weight: 600;
                border-radius: 25px;
                cursor: pointer;
                transition: all 0.3s ease;
                box-shadow: 0 4px 15px rgba(0, 0, 0, 0.15);
                backdrop-filter: blur(10px);
                border: 1px solid rgba(255, 255, 255, 0.2);
                min-width: 180px;
                text-align: center;
            }
            
            .overlay-button:hover {
                background: rgba(255, 255, 255, 1);
                transform: translateY(-2px);
                box-shadow: 0 6px 20px rgba(0, 0, 0, 0.25);
            }
            
            .overlay-button:active {
                transform: translateY(0);
                box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
            }
            
            /* Special styling for primary button */
            .overlay-button.primary {
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
            }
            
            .overlay-button.primary:hover {
                background: linear-gradient(135deg, #5a67d8 0%, #6b46c1 100%);
            }
            
            /* Status message overlay */
            #status {
                position: absolute;
                top: 20px;
                right: 20px;
                z-index: 1001;
                padding: 12px 20px;
                border-radius: 25px;
                font-weight: 600;
                font-size: 14px;
                display: none;
                box-shadow: 0 4px 15px rgba(0, 0, 0, 0.15);
                backdrop-filter: blur(10px);
                border: 1px solid rgba(255, 255, 255, 0.2);
                max-width: 300px;
            }
            
            .success { 
                background: rgba(72, 187, 120, 0.95);
                color: white;
            }
            
            .error { 
                background: rgba(245, 101, 101, 0.95);
                color: white;
            }
            
            /* Loading overlay */
            .loading-overlay {
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.3);
                display: none;
                z-index: 1002;
                justify-content: center;
                align-items: center;
            }
            
            .loading-spinner {
                background: rgba(255, 255, 255, 0.95);
                padding: 20px 30px;
                border-radius: 15px;
                box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
                text-align: center;
                backdrop-filter: blur(10px);
            }
            
            /* Spinner animation */
            .spinner {
                border: 3px solid #f3f3f3;
                border-top: 3px solid #667eea;
                border-radius: 50%;
                width: 30px;
                height: 30px;
                animation: spin 1s linear infinite;
                margin: 0 auto 10px;
            }
            
            @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }
            
            /* Responsive design for mobile */
            @media (max-width: 768px) {
                .overlay-controls {
                    top: 10px;
                    left: 10px;
                    right: 10px;
                    flex-direction: row;
                    flex-wrap: wrap;
                    justify-content: space-between;
                }
                
                .overlay-button {
                    min-width: auto;
                    flex: 1;
                    margin: 0 2px;
                    padding: 10px 12px;
                    font-size: 12px;
                }
                
                #status {
                    top: 10px;
                    right: 10px;
                    left: 10px;
                    max-width: none;
                    margin-top: 60px;
                }
            }
        </style>
    </head>
    <body>
        <!-- Full-screen map container -->
        <div id="map-container">
            <!-- Map iframe -->
            <iframe id="map" src="/map"></iframe>
            
            <!-- Overlay control buttons -->
            <div class="overlay-controls">
                <button class="overlay-button primary" onclick="updateMap()">
                    📍 Load Timeline Data
                </button>
                <button class="overlay-button" onclick="clearMap()">
                    🗑️ Clear Markers
                </button>
                <button class="overlay-button" onclick="refreshMap()">
                    🔄 Refresh Map
                </button>
            </div>
            
            <!-- Status message area -->
            <div id="status"></div>
            
            <!-- Loading overlay -->
            <div class="loading-overlay" id="loading">
                <div class="loading-spinner">
                    <div class="spinner"></div>
                    <div>Loading...</div>
                </div>
            </div>
        </div>
        
        <script>
            // ================================================================
            // JAVASCRIPT FUNCTIONS - These run in the user's browser
            // ================================================================
            
            /**
             * Show loading overlay
             */
            function showLoading() {
                document.getElementById('loading').style.display = 'flex';
            }
            
            /**
             * Hide loading overlay
             */
            function hideLoading() {
                document.getElementById('loading').style.display = 'none';
            }
            
            /**
             * Show status messages to the user
             * @param {string} message - The message to display
             * @param {boolean} isError - Whether this is an error message
             */
            function showStatus(message, isError = false) {
                const status = document.getElementById('status');
                status.textContent = message;
                status.className = isError ? 'error' : 'success';
                status.style.display = 'block';
                
                // Hide the message after 4 seconds
                setTimeout(() => {
                    status.style.display = 'none';
                }, 4000);
            }
            
            /**
             * Refresh the map iframe by reloading it
             */
            function refreshMapFrame() {
                const mapFrame = document.getElementById('map');
                // Add timestamp to URL to force refresh
                mapFrame.src = '/map?' + new Date().getTime();
            }
            
            /**
             * Update map with timeline data
             * This sends a request to our Flask server
             */
            async function updateMap() {
                showLoading();
                
                try {
                    // Send POST request to our Flask server
                    const response = await fetch('/api/update', { 
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        }
                    });
                    
                    // Parse the JSON response
                    const result = await response.json();
                    
                    hideLoading();
                    
                    // Show the result message
                    showStatus(result.message, result.status === 'error');
                    
                    // If successful, refresh the map display
                    if (result.status === 'success') {
                        setTimeout(refreshMapFrame, 1000);
                    }
                } catch (error) {
                    hideLoading();
                    showStatus('Error: ' + error.message, true);
                }
            }
            
            /**
             * Clear all markers from the map
             */
            async function clearMap() {
                showLoading();
                
                try {
                    const response = await fetch('/api/clear', { 
                        method: 'POST' 
                    });
                    const result = await response.json();
                    
                    hideLoading();
                    showStatus(result.message, result.status === 'error');
                    
                    if (result.status === 'success') {
                        setTimeout(refreshMapFrame, 500);
                    }
                } catch (error) {
                    hideLoading();
                    showStatus('Error: ' + error.message, true);
                }
            }
            
            /**
             * Refresh the map view
             */
            function refreshMap() {
                refreshMapFrame();
                showStatus('Map refreshed!');
            }
            
            // Prevent accidental page refresh
            window.addEventListener('beforeunload', function(e) {
                // Uncomment the lines below if you want to warn users before leaving
                // e.preventDefault();
                // e.returnValue = '';
            });
        </script>
    </body>
    </html>
    '''
    return html

@app.route('/map')
def serve_map():
    """
    This function serves the map HTML file.
    When the iframe requests /map, this function runs and returns the map content.
    """
    if m is None:
        return '''
        <div style="
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100vh;
            font-family: Arial, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            text-align: center;
            margin: 0;
        ">
            <div style="
                background: rgba(255, 255, 255, 0.1);
                padding: 40px;
                border-radius: 20px;
                backdrop-filter: blur(10px);
                border: 1px solid rgba(255, 255, 255, 0.2);
            ">
                <h1 style="margin-bottom: 20px; font-size: 2em;">🗺️ Map Not Found</h1>
                <p style="font-size: 1.2em; margin-bottom: 20px;">Click "Load Timeline Data" to generate your map</p>
                <div style="font-size: 3em;">📍</div>
            </div>
        </div>
        '''

    return m.get_root().render()

@app.route('/api/update', methods=['POST'])
def api_update():
    """
    This function handles the "Load Timeline Data" button click.
    It's called when JavaScript sends a POST request to /api/update.
    """
    try:
        print("=== UPDATE MAP REQUEST RECEIVED ===")
        
        # Check if CSV file exists
        csv_file = "test_output.csv"
        if not os.path.exists(csv_file):
            error_msg = f"CSV file '{csv_file}' not found. Please make sure it exists in the same directory."
            print(f"ERROR: {error_msg}")
            return jsonify({
                'status': 'error', 
                'message': error_msg
            })
        
        print(f"CSV file found: {csv_file}")
        
        # Call your original function!
        # This is where the magic happens - your function gets called
        update_map_with_timeline_data(m, csv_file)
        
        success_msg = f"Map updated successfully with data from {csv_file}!"
        print(f"SUCCESS: {success_msg}")
        
        # Return success response as JSON
        return jsonify({
            'status': 'success', 
            'message': success_msg
        })
        
    except Exception as e:
        # If anything goes wrong, return error
        error_msg = f"Error updating map: {str(e)}"
        print(f"ERROR: {error_msg}")
        return jsonify({
            'status': 'error', 
            'message': error_msg
        })

@app.route('/api/clear', methods=['POST'])
def api_clear():
    """
    This function handles the "Clear All Markers" button click.
    It creates a fresh empty map.
    """
    try:
        print("=== CLEAR MAP REQUEST RECEIVED ===")
        
        # Create a fresh map with no markers
        global m  # Access the global map variable
        m = folium.Map(
            location=[40.65997395108914, -73.71300111746832],
            zoom_start=5,
            min_zoom=3,
            tiles=MAPBOX_TILESET_URL,
            attr='Mapbox'
        )
        
        success_msg = "Map cleared successfully!"
        print(f"SUCCESS: {success_msg}")
        
        return jsonify({
            'status': 'success', 
            'message': success_msg
        })
        
    except Exception as e:
        error_msg = f"Error clearing map: {str(e)}"
        print(f"ERROR: {error_msg}")
        return jsonify({
            'status': 'error', 
            'message': error_msg
        })

# ============================================================================
# APPLICATION STARTUP - This runs when you execute the script
# ============================================================================
if __name__ == '__main__':
    print("=" * 60)
    print("🚀 STARTING WANDERLOG FULL-SCREEN MAP SERVER")
    print("=" * 60)
    
    # Create initial empty map in memory
    print("📍 Creating initial map in memory...")
    
    # Check for required files
    if os.path.exists("test_output.csv"):
        print("✅ CSV file found: test_output.csv")
    else:
        print("⚠️  WARNING: test_output.csv not found")
        print("   Make sure your CSV file is in the same directory as this script")
    
    if MAPBOX_ACCESS_TOKEN:
        print("✅ Mapbox token loaded")
    else:
        print("⚠️  WARNING: No Mapbox token found")
        print("   Create a .env file with: MAPBOX_ACCESS_TOKEN=your_token_here")
    
    print("\n🌐 Starting Flask web server...")
    print("📱 Open your browser and go to: http://localhost:5000")
    print("🔧 Press Ctrl+C to stop the server")
    print("=" * 60)
    
    # Start the Flask web server
    # debug=True means the server will restart automatically when you change the code
    # host='0.0.0.0' means other devices on your network can access it
    # port=5000 is the port number
    app.run(debug=True, host='0.0.0.0', port=5000)
