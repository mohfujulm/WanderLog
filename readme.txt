v0.0 - project initialization. Upload of readme.
v0.1 - added json data parsing module, mapbox functions module, and main wanderlog module to generate a basic map, populated with markers of given Timeline data
v0.2 - added html server backend code to support interactive buttons.  Added buttons for loading google timeline data, clearing markers, and refreshing map.  Reworked file structure to be more organized.
v0.3 - added dates to map marker popup data.  Made map rendering dynamic, and faster.  Reworked how map data is processed and stored to be more efficient.
v0.4 - updated UI, added data type filtering, cleaned up code
v0.5 - added archiving/deleting of data points, backups for timeline data on clear map, warnings for clear map & deleting of data points, and date range filtering
v0.6 - added "Trips" prototype, added edit mode with multi-selection/editing of data points, updates to UI, fixed sorting, added descriptions to Trips
v0.7 - switched Google Photos ingestion to the official API. Configure GOOGLE_PHOTOS_CLIENT_ID, GOOGLE_PHOTOS_CLIENT_SECRET, GOOGLE_PHOTOS_REFRESH_TOKEN, and GOOGLE_PHOTOS_SHARED_ALBUM_ID environment variables before running the server.
v0.8 - added an in-app "Sign in with Google" button that guides you through the Photos Library OAuth consent flow and surfaces the refresh token you need to persist in your environment variables.

## Google Photos OAuth setup

1. Create a Google Cloud project, enable the Photos Library API, and configure an OAuth client of type "Web application" with the redirect URI `http://localhost:5000/auth/google/callback` (for production deployments, register the appropriate HTTPS domain instead).
2. Set the ``GOOGLE_PHOTOS_CLIENT_ID`` and ``GOOGLE_PHOTOS_CLIENT_SECRET`` environment variables before starting WanderLog so the "Sign in with Google" button is enabled in the Settings menu. Launch the app (`python run.py`) and click the button to begin the consent flow.
3. After you approve access on Google's consent screen, WanderLog displays the access token, refresh token, and raw token payload. Copy the refresh token into ``GOOGLE_PHOTOS_REFRESH_TOKEN`` (and optionally configure ``GOOGLE_PHOTOS_SHARED_ALBUM_ID`` to point at a single shared album).
4. Restart WanderLog with the full set of credentials: ``GOOGLE_PHOTOS_CLIENT_ID``, ``GOOGLE_PHOTOS_CLIENT_SECRET``, ``GOOGLE_PHOTOS_REFRESH_TOKEN``, and ``GOOGLE_PHOTOS_SHARED_ALBUM_ID``.

You can still run the standalone helper script (``python -m app.scripts.google_photos_oauth``) if you prefer completing the consent flow outside the UI; both approaches are equivalent.
