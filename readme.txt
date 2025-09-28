v0.0 - project initialization. Upload of readme.
v0.1 - added json data parsing module, mapbox functions module, and main wanderlog module to generate a basic map, populated with markers of given Timeline data
v0.2 - added html server backend code to support interactive buttons.  Added buttons for loading google timeline data, clearing markers, and refreshing map.  Reworked file structure to be more organized.
v0.3 - added dates to map marker popup data.  Made map rendering dynamic, and faster.  Reworked how map data is processed and stored to be more efficient.
v0.4 - updated UI, added data type filtering, cleaned up code
v0.5 - added archiving/deleting of data points, backups for timeline data on clear map, warnings for clear map & deleting of data points, and date range filtering
v0.6 - added "Trips" prototype, added edit mode with multi-selection/editing of data points, updates to UI, fixed sorting, added descriptions to Trips
v0.7 - documented Google Photos OAuth local development requirements, including automatic enabling of OAuthlib insecure transport when FLASK_ENV is not set to production

Google Photos OAuth Notes:
- When running the Flask server locally over HTTP, leave `FLASK_ENV` unset or set it to `development` so the app will automatically enable the OAuthlib insecure transport and relaxed token scope flags required by Google OAuth on non-HTTPS origins.
- Production deployments should explicitly export `FLASK_ENV=production` (or `prod`) so OAuthlib requires HTTPS as expected.
