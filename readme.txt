v0.0 - project initialization. Upload of readme.
v0.1 - added json data parsing module, mapbox functions module, and main wanderlog module to generate a basic map, populated with markers of given Timeline data
v0.2 - added html server backend code to support interactive buttons.  Added buttons for loading google timeline data, clearing markers, and refreshing map.  Reworked file structure to be more organized.
v0.3 - added dates to map marker popup data.  Made map rendering dynamic, and faster.  Reworked how map data is processed and stored to be more efficient.

Font customization
------------------
1. Pick a font provider (for example Google Fonts) and add the `<link>` tag they supply inside the `<head>` of `app/templates/index.html`. The sample link in the file currently loads the Poppins family.
2. Update the `--app-font-family` CSS variable near the top of the same file so it lists your chosen font first (e.g., `--app-font-family: 'Your Font', 'Poppins', sans-serif;`).
3. Restart the Flask app (or reload your browser if it is already running) to see the change. Inputs and buttons inherit the variable automatically, so no additional tweaks are required.
