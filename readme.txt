v0.0 - project initialization. Upload of readme.
v0.1 - added json data parsing module, mapbox functions module, and main wanderlog module to generate a basic map, populated with markers of given Timeline data
v0.2 - added html server backend code to support interactive buttons.  Added buttons for loading google timeline data, clearing markers, and refreshing map.  Reworked file structure to be more organized.
v0.3 - added dates to map marker popup data.  Made map rendering dynamic, and faster.  Reworked how map data is processed and stored to be more efficient.
v0.4 - updated UI, added data type filtering, cleaned up code
v0.5 - added archiving/deleting of data points, backups for timeline data on clear map, warnings for clear map & deleting of data points, and date range filtering
v0.6 - added "Trips" prototype, added edit mode with multi-selection/editing of data points, updates to UI, fixed sorting, added descriptions to Trips
v0.7 - switched Google Photos ingestion to the official API. Configure GOOGLE_PHOTOS_CLIENT_ID, GOOGLE_PHOTOS_CLIENT_SECRET, GOOGLE_PHOTOS_REFRESH_TOKEN, and GOOGLE_PHOTOS_SHARED_ALBUM_ID environment variables before running the server.

## Google Photos OAuth setup

1. Create a Google Cloud project, enable the Photos Library API, and configure an OAuth client of type "Desktop" or "Web application" with the redirect URI `http://localhost:8765/oauth2callback`.
2. Install WanderLog's dependencies (``pip install -r requirements.txt``) and run the OAuth helper with ``python -m app.scripts.google_photos_oauth``.
3. When prompted, enter the client ID and secret from your Google Cloud OAuth client. Your browser will open to the Google consent screen; approve access to `https://www.googleapis.com/auth/photoslibrary.readonly`.
4. After approval, the helper prints an access token, refresh token, and the full token response in the terminal. Copy the refresh token value into the ``GOOGLE_PHOTOS_REFRESH_TOKEN`` environment variable.
5. Set ``GOOGLE_PHOTOS_CLIENT_ID``, ``GOOGLE_PHOTOS_CLIENT_SECRET``, ``GOOGLE_PHOTOS_REFRESH_TOKEN``, and ``GOOGLE_PHOTOS_SHARED_ALBUM_ID`` (if you want to pin a single album) before starting the Flask server.
