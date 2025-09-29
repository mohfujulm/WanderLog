v0.0 - project initialization. Upload of readme.
v0.1 - added json data parsing module, mapbox functions module, and main wanderlog module to generate a basic map, populated with markers of given Timeline data
v0.2 - added html server backend code to support interactive buttons.  Added buttons for loading google timeline data, clearing markers, and refreshing map.  Reworked file structure to be more organized.
v0.3 - added dates to map marker popup data.  Made map rendering dynamic, and faster.  Reworked how map data is processed and stored to be more efficient.
v0.4 - updated UI, added data type filtering, cleaned up code
v0.5 - added archiving/deleting of data points, backups for timeline data on clear map, warnings for clear map & deleting of data points, and date range filtering
v0.6 - added "Trips" prototype, added edit mode with multi-selection/editing of data points, updates to UI, fixed sorting, added descriptions to Trips
v0.7 - documented Google Photos OAuth local development requirements, including automatic enabling of OAuthlib insecure transport when FLASK_ENV is not set to production
v0.8 - switched the Google Photos integration to the Google Identity Services Photos Picker API and refreshed the album management UX
v0.9 - replaced the GIS picker with a native Google Photos manager that lists albums and media via the Photos Library API

Google Photos OAuth Notes:
- When running the Flask server locally over HTTP, leave `FLASK_ENV` unset or set it to `development` so the app will automatically enable the OAuthlib insecure transport and relaxed token scope flags required by Google OAuth on non-HTTPS origins.
- Production deployments should explicitly export `FLASK_ENV=production` (or `prod`) so OAuthlib requires HTTPS as expected.
- The front-end now opens an in-app Google Photos manager. Ensure both `GOOGLE_PHOTOS_CLIENT_ID` and `GOOGLE_PHOTOS_CLIENT_SECRET` are set so the server can build OAuth flows and call the Photos Library API on behalf of the signed-in user.
- The Manage album button loads your albums through `/api/google/photos/albums` and lets you choose highlight images fetched from `/api/google/photos/albums/<album_id>/media-items`. Keep the `https://www.googleapis.com/auth/photoslibrary.readonly` scope enabled so these calls succeed.
