(function () {
  'use strict';

  const config = window.wanderLogConfig || {};
  const mapElement = document.getElementById('map');
  const menuContainer = document.querySelector('.menu-container');
  const menuToggle = document.getElementById('menuToggle');
  const menuControls = document.getElementById('menuControls');

  if (!mapElement) {
    console.error('WanderLog: Unable to find map container element.');
    return;
  }

  const MAX_MAP_BOUNDS = L.latLngBounds([-85, -180], [85, 180]);
  const FOCUSABLE_SELECTOR =
    'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])';

  function ensureMenuInitialState() {
    if (!menuControls) {
      return;
    }

    if (!menuControls.hasAttribute('hidden')) {
      menuControls.setAttribute('hidden', '');
    }
    menuControls.setAttribute('aria-hidden', 'true');
    menuControls.setAttribute('inert', '');
  }

  function focusFirstMenuControl() {
    if (!menuControls) {
      return;
    }

    const focusable = menuControls.querySelector(FOCUSABLE_SELECTOR);
    if (focusable && typeof focusable.focus === 'function') {
      focusable.focus({ preventScroll: true });
    }
  }

  function setMenuOpen(isOpen, { restoreFocusToToggle = true } = {}) {
    if (!menuContainer || !menuToggle || !menuControls) {
      return;
    }

    menuContainer.classList.toggle('open', isOpen);
    menuToggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    menuToggle.setAttribute('aria-label', isOpen ? 'Close menu' : 'Open menu');

    if (isOpen) {
      menuControls.removeAttribute('hidden');
      menuControls.removeAttribute('aria-hidden');
      menuControls.removeAttribute('inert');
      focusFirstMenuControl();
      return;
    }

    menuControls.setAttribute('hidden', '');
    menuControls.setAttribute('aria-hidden', 'true');
    menuControls.setAttribute('inert', '');

    if (restoreFocusToToggle) {
      menuToggle.focus({ preventScroll: true });
    }
  }

  function handleMenuToggleClick(event) {
    event.preventDefault();
    const isOpen = menuContainer.classList.contains('open');
    setMenuOpen(!isOpen, { restoreFocusToToggle: false });
  }

  function handleDocumentKeydown(event) {
    if (event.key === 'Escape' && menuContainer && menuContainer.classList.contains('open')) {
      setMenuOpen(false);
    }
  }

  function handleDocumentClick(event) {
    if (
      !menuContainer ||
      !menuContainer.classList.contains('open') ||
      menuContainer.contains(event.target)
    ) {
      return;
    }

    setMenuOpen(false, { restoreFocusToToggle: false });
  }

  ensureMenuInitialState();

  if (menuToggle) {
    menuToggle.addEventListener('click', handleMenuToggleClick);
    document.addEventListener('keydown', handleDocumentKeydown);
    document.addEventListener('click', handleDocumentClick);
  }

  const statusElement = document.getElementById('status');
  const loadingOverlay = document.getElementById('loading');
  const refreshButton = document.getElementById('refreshMapButton');

  function setStatus(message, { level = 'info' } = {}) {
    if (!statusElement) {
      return;
    }

    statusElement.textContent = message || '';
    statusElement.setAttribute('data-status-level', level);
    if (message) {
      statusElement.removeAttribute('hidden');
      statusElement.setAttribute('role', level === 'error' ? 'alert' : 'status');
    } else {
      statusElement.setAttribute('hidden', '');
      statusElement.removeAttribute('role');
    }
  }

  function setLoading(isLoading) {
    if (!loadingOverlay) {
      return;
    }

    if (isLoading) {
      loadingOverlay.removeAttribute('hidden');
      loadingOverlay.setAttribute('aria-hidden', 'false');
    } else {
      loadingOverlay.setAttribute('hidden', '');
      loadingOverlay.setAttribute('aria-hidden', 'true');
    }
  }

  function buildTileLayer(mapboxToken) {
    if (mapboxToken) {
      return L.tileLayer(
        `https://api.mapbox.com/styles/v1/mapbox/outdoors-v12/tiles/{z}/{x}/{y}?access_token=${mapboxToken}`,
        {
          attribution:
            "© <a href='https://www.mapbox.com/about/maps/'>Mapbox</a> " +
            "© <a href='http://www.openstreetmap.org/copyright'>OpenStreetMap</a>",
          tileSize: 512,
          zoomOffset: -1,
          crossOrigin: true,
          noWrap: true,
          bounds: MAX_MAP_BOUNDS,
        },
      );
    }

    setStatus(
      'Mapbox token not configured. Falling back to OpenStreetMap tiles.',
      { level: 'warning' },
    );

    return L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: "© <a href='https://www.openstreetmap.org/'>OpenStreetMap</a> contributors",
      noWrap: true,
      bounds: MAX_MAP_BOUNDS,
    });
  }

  function iconForMarker(marker) {
    const icons = config.markerIcons || {};
    const sourceType = (marker.source_type || '').toLowerCase();

    if (sourceType && icons[sourceType]) {
      return icons[sourceType];
    }

    if (sourceType.includes('manual') && icons.manual) {
      return icons.manual;
    }

    if (sourceType.includes('google') && icons.google_timeline) {
      return icons.google_timeline;
    }

    return icons.default || null;
  }

  function createPopupContent(marker) {
    const placeName = marker.display_name || marker.place || 'Unknown location';
    const description = marker.description || '';
    const visitDate = marker.date ? `<p class="marker-popup-row"><strong>Date:</strong> ${marker.date}</p>` : '';
    const descriptionRow = description
      ? `<p class="marker-popup-row"><strong>Description:</strong> ${description}</p>`
      : '';

    return `
      <div class="marker-popup">
        <h3 class="marker-popup-title">${placeName}</h3>
        ${visitDate}
        ${descriptionRow}
        <p class="marker-popup-row"><strong>Source:</strong> ${marker.source_type || 'Unknown'}</p>
      </div>
    `;
  }

  const map = L.map(mapElement, {
    preferCanvas: true,
    worldCopyJump: false,
    maxBounds: MAX_MAP_BOUNDS,
    maxBoundsViscosity: 0.85,
    minZoom: 2,
  });
  map.setView([20, 0], 2);

  buildTileLayer(config.mapboxToken).addTo(map);

  const clusterGroup = L.markerClusterGroup({
    showCoverageOnHover: false,
    spiderfyOnMaxZoom: true,
    removeOutsideVisibleBounds: true,
    chunkedLoading: true,
  });
  map.addLayer(clusterGroup);

  function addMarkers(markers) {
    clusterGroup.clearLayers();

    if (!markers || !Array.isArray(markers) || markers.length === 0) {
      setStatus('No locations available. Import data to get started.', { level: 'info' });
      map.setView([20, 0], 2);
      return;
    }

    const bounds = [];

    markers.forEach((marker) => {
      if (typeof marker.lat !== 'number' || typeof marker.lng !== 'number') {
        return;
      }

      const iconUrl = iconForMarker(marker);
      const markerOptions = {};

      if (iconUrl) {
        markerOptions.icon = L.icon({
          iconUrl,
          iconSize: [32, 40],
          iconAnchor: [16, 40],
          popupAnchor: [0, -32],
          className: 'wanderlog-marker-icon',
        });
      }

      const leafletMarker = L.marker([marker.lat, marker.lng], markerOptions);
      leafletMarker.bindPopup(createPopupContent(marker));
      clusterGroup.addLayer(leafletMarker);
      bounds.push([marker.lat, marker.lng]);
    });

    if (bounds.length > 0) {
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 12 });
      setStatus('', { level: 'info' });
    }
  }

  async function loadMarkers() {
    setLoading(true);

    try {
      const response = await fetch('/api/map_data');
      if (!response.ok) {
        throw new Error(`Unexpected response: ${response.status}`);
      }

      const markers = await response.json();
      addMarkers(markers);
    } catch (error) {
      console.error('Failed to load map data', error);
      setStatus('Unable to load map data. Please try again.', { level: 'error' });
    } finally {
      setLoading(false);
    }
  }

  if (refreshButton) {
    refreshButton.addEventListener('click', () => {
      loadMarkers();
    });
  }

  // Expose a refresh helper for debugging in the browser console.
  window.wanderLog = window.wanderLog || {};
  window.wanderLog.refreshMap = loadMarkers;

  loadMarkers();
})();
