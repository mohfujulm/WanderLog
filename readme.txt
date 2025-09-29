v0.0 - project initialization. Upload of readme.
v0.1 - added json data parsing module, mapbox functions module, and main wanderlog module to generate a basic map, populated with markers of given Timeline data
v0.2 - added html server backend code to support interactive buttons.  Added buttons for loading google timeline data, clearing markers, and refreshing map.  Reworked file structure to be more organized.
v0.3 - added dates to map marker popup data.  Made map rendering dynamic, and faster.  Reworked how map data is processed and stored to be more efficient.
v0.4 - updated UI, added data type filtering, cleaned up code
v0.5 - added archiving/deleting of data points, backups for timeline data on clear map, warnings for clear map & deleting of data points, and date range filtering
v0.6 - added "Trips" prototype, added edit mode with multi-selection/editing of data points, updates to UI, fixed sorting, added descriptions to Trips

## Enabling Google Sign-In locally

The application ships with optional Google OAuth support. To turn it on for a local
environment:

1. Install the dependencies:

   ```bash
   pip install -r requirements.txt
   ```

2. Create an OAuth **Web application** credential in the [Google Cloud console](https://console.cloud.google.com/apis/credentials).
   - Add `http://localhost:5000/auth/google/callback` to the list of authorised redirect URIs.
   - Note the generated client ID and client secret.

3. Copy `.env.example` to `.env` and provide the required secrets:

   ```bash
   cp .env.example .env
   ```

   Then edit `.env` to set:

   ```text
   FLASK_SECRET_KEY=<any-random-string>
   GOOGLE_CLIENT_ID=<your-client-id>
   GOOGLE_CLIENT_SECRET=<your-client-secret>
   ```

   The file already contains placeholders for these values.

4. Start the development server:

   ```bash
   python run.py
   ```

With these values in place the "Sign in with Google" button in the menu overlay will redirect
through the Google consent screen and store the authenticated user in the session. To disable the
feature, remove the Google credentials from the environment (the button is hidden automatically).
