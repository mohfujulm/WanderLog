const APP_CONFIG = window.wanderLogConfig || {};
const ASSET_CONFIG = APP_CONFIG.assets || {};
const MAPBOX_TOKEN = APP_CONFIG.mapboxToken || '';
const MAPBOX_STYLE_ID = 'mohfujulm/cmhmdzk0z001z01rvf9hh91th';
const MAPBOX_STYLE_URL = `mapbox://styles/${MAPBOX_STYLE_ID}?fresh=true`;
const MAP_STYLES_CONFIG = APP_CONFIG.mapStyles || {};
const MAPBOX_DAY_STYLE_URL = MAP_STYLES_CONFIG.day || MAPBOX_STYLE_URL;
const MAPBOX_NIGHT_STYLE_URL = MAP_STYLES_CONFIG.night || 'mapbox://styles/mohfujulm/cmhz2n9b1005l01s01juv7lry?fresh=true';
const MAPBOX_TERRAIN_SOURCE_ID = 'wanderlog-mapbox-terrain';
const MAPBOX_TERRAIN_SOURCE_URL = 'mapbox://mapbox.mapbox-terrain-dem-v1';
const MAPBOX_DEFAULT_PITCH = 0;
const MAPBOX_DEFAULT_BEARING = 0;
const MAPBOX_TERRAIN_EXAGGERATION = 1.3;
const MAPBOX_FOG_CONFIG = {
    range: [0.8, 8],
    color: '#d6d8e2',
    'high-color': '#efeff4',
    'space-color': '#1e2833',
    'horizon-blend': 0.1,
};
const MAPBOX_POPUP_CLASS = 'wanderlog-mapbox-popup';
const MAPBOX_MARKER_SOURCE_ID = 'wanderlog-marker-source';
const MAPBOX_CLUSTER_LAYER_ID = 'wanderlog-marker-clusters';
const MAPBOX_CLUSTER_COUNT_LAYER_ID = 'wanderlog-marker-cluster-count';
const MAPBOX_CLUSTER_SYMBOL_LAYER_ID = 'wanderlog-marker-symbols';
const MAPBOX_UNCLUSTERED_SOURCE_ID = 'wanderlog-marker-points';
const MAPBOX_UNCLUSTERED_LAYER_ID = 'wanderlog-marker-points-layer';
const MAPBOX_TRIP_SOURCE_ID = 'wanderlog-trip-source';
const MAPBOX_TRIP_LAYER_ID = 'wanderlog-trip-layer';
const MAPBOX_CLUSTER_RADIUS = 70;
const MAP_STYLE_MODE_DAY = 'day';
const MAP_STYLE_MODE_NIGHT = 'night';
const MAP_STYLE_STORAGE_KEY = 'wanderlog.map.style';
const SOURCE_TYPE_COLORS = {
    google_timeline: '#b91c1c',
    manual: '#dc2626',
    default: '#b91c1c',
};
const MAPBOX_MIGRATION_ENABLE_MANAGE_MODE = true;
const MAPBOX_MIGRATION_ENABLE_TRIP_FEATURES = true;
const AUTH_CONFIG = APP_CONFIG.auth || {};
const GOOGLE_AUTH_CONFIG = AUTH_CONFIG.google || null;
const MENU_ICON_PATH = ASSET_CONFIG.menuIcon || '';
const CLOSE_ICON_PATH = ASSET_CONFIG.closeIcon || '';
const GOOGLE_MAPS_LOGO_PATH = ASSET_CONFIG.googleMapsLogo
    || ASSET_CONFIG.googleLogo
    || '/static/assets/google-maps-logo.svg';
const MAP_DEFAULT_CENTER = [40.65997395108914, -73.71300111746832];
const MAP_DEFAULT_ZOOM = 5;
const MAP_MIN_ZOOM = 2;
const MAP_WORLD_BOUNDS = [[-85, -180], [85, 180]];
const MAP_TILE_MAX_ZOOM = 22;
const TRIP_SINGLE_MARKER_ZOOM = 11;
const TRIP_BOUNDS_PADDING = [80, 80];
let map;
let mapStyleMode = MAP_STYLE_MODE_DAY;
let mapStyleLoadCount = 0;
const tripMarkerLookup = new Map();
const mapMarkerLookup = new Map();
const mapMarkerData = new Map();
let markerSourceFeaturesAll = [];
const markerFeatureIdLookup = new Map();
const mapboxIconPromises = new Map();
let markerFeatureIdCounter = 1;
let pendingClusterToggleState = true;
let isClusteringEnabled = true;
let activePopup = null;
let loadMarkersAbortController = null;
let loadMarkersRequestToken = 0;
let googleAuthRefreshHandler = null;
let googleAuthRequestToken = 0;
let googlePhotosPickerButton = null;
let isTripMapModeActive = false;
let previousMapView = null;
let manualPointForm;
let manualPointModalController = null;
let manualDescriptionCharacterCountElement = null;
let archivedPointsModalController = null;
let archivedPointsList = null;
let aliasForm;
let aliasModalController = null;
let aliasOriginalNameElement = null;
let aliasTargetMarkerId = null;
let aliasModalContext = { isArchived: false, triggerButton: null };
let descriptionForm;
let descriptionModalController = null;
let descriptionTargetMarkerId = null;
let descriptionCharacterCountElement = null;
let descriptionModalContext = { isArchived: false, triggerButton: null };
let tripAssignmentModalController = null;
let tripAssignmentForm = null;
let tripAssignmentTargetIds = [];
let tripAssignmentTitleElement = null;
let tripSelectElement = null;
let newTripNameInput = null;
let tripSelectHelper = null;
let tripAssignmentMembershipList = null;
let tripAssignmentMembershipEmpty = null;
let tripAssignmentMemberships = [];
let tripProfileOverlay = null;
let tripProfilePanelElement = null;
let tripProfileEscapeListener = null;
let tripProfilePanelInitialised = false;
let tripDescriptionForm = null;
let tripDescriptionField = null;
let tripDescriptionStatusElement = null;
let tripDescriptionTitleElement = null;
let tripDescriptionUpdatedElement = null;
let tripDescriptionUpdatedTimeElement = null;
let tripDescriptionUpdatedReadOnlyElement = null;
let tripDescriptionUpdatedReadOnlyTimeElement = null;
let tripDescriptionSaveButton = null;
let tripDescriptionCancelButton = null;
let tripDescriptionCloseButton = null;
let tripMembershipGroupElement = null;
let tripModalContext = { triggerButton: null, mode: 'single', count: 0 };
let manageModeToggleButtons = [];
let selectionToolbarElement = null;
let selectionCountElement = null;
let selectionClearButton = null;
let selectionExitButton = null;
let selectionAddToTripButton = null;
let selectionRemoveTripsButton = null;
let selectionArchiveButton = null;
let selectionDeleteButton = null;
let tripListContainer = null;
let tripListLoadingElement = null;
let tripListErrorElement = null;
let tripListEmptyElement = null;
let tripSearchInput = null;
let tripSortFieldSelect = null;
let tripSortDirectionButton = null;
let tripListView = null;
let mapThemeToggle = null;
let tripDetailContainer = null;
let tripDetailBackButton = null;
let tripDetailTitleElement = null;
let tripDetailSubtitleElement = null;
let tripDetailCountElement = null;
let tripDetailUpdatedElement = null;
let tripDetailActionsElement = null;
let tripDetailEditButton = null;
let tripDetailDeleteButton = null;
let tripNameInputContainer = null;
let tripNameInputElement = null;
let tripDescriptionDisplayElement = null;
let tripPhotosSectionElement = null;
let tripPhotosGalleryElement = null;
let tripPhotosEmptyElement = null;
let tripPhotosLinkElement = null;
let tripPhotosInputElement = null;
let tripPhotoModalController = null;
let tripPhotoModalImageElement = null;
let tripPhotoModalCaptionElement = null;
let tripPhotoActiveIndex = null;
let tripPhotoPrevButton = null;
let tripPhotoNextButton = null;
let tripPhotoDeleteButton = null;
let tripPhotoSelectToggleButton = null;
let tripPhotoDeleteSelectedButton = null;
let tripPhotoCancelSelectionButton = null;
let tripPhotoModalKeydownHandler = null;
let tripPhotoDeleteInProgress = false;
let tripLocationSearchInput = null;
let tripLocationSortFieldSelect = null;
let tripLocationSortDirectionButton = null;
let tripLocationListContainer = null;
let tripLocationLoadingElement = null;
let tripLocationErrorElement = null;
let tripLocationEmptyElement = null;

const TRIP_SORT_FIELD_NAME = 'name';
const TRIP_SORT_FIELD_DATE = 'latest_location_date';
const TRIP_SORT_DIRECTION_ASC = 'asc';
const TRIP_SORT_DIRECTION_DESC = 'desc';
const TRIP_NAME_FALLBACK = 'Untitled Trip';

const TRIP_LOCATION_SORT_FIELD_DATE = 'date';
const TRIP_LOCATION_SORT_FIELD_NAME = 'name';

const tripListState = {
    trips: [],
    searchTerm: '',
    sortField: TRIP_SORT_FIELD_DATE,
    sortDirection: TRIP_SORT_DIRECTION_DESC,
    initialised: false,
    scrollTop: 0,
    preserveScroll: false,
};

const tripDetailState = {
    initialised: false,
    selectedTripId: null,
    trip: null,
    locations: [],
    photos: [],
    photoItems: [],
    searchTerm: '',
    sortField: TRIP_LOCATION_SORT_FIELD_DATE,
    sortDirection: TRIP_SORT_DIRECTION_ASC,
    triggerElement: null,
    requestId: 0,
    activeLocationId: null,
};

const tripLocationCache = new Map();

const tripDescriptionState = {
    tripId: null,
    requestId: 0,
    isSaving: false,
    isDirty: false,
    isNameDirty: false,
    isPhotosUrlDirty: false,
    lastAppliedDescription: '',
    lastAppliedName: '',
    lastAppliedPhotosUrl: '',
    triggerElement: null,
};

const tripProfileEditState = {
    active: false,
};

const tripPhotoSelectionState = {
    active: false,
    selectedKeys: new Set(),
    anchorIndex: null,
    focusIndex: null,
};

const manageModeState = {
    active: false,
    selectedIds: new Set(),
    isDragging: false,
    isMiddlePanning: false,
    dragStartLatLng: null,
    dragStartPoint: null,
    dragCurrentLatLng: null,
    dragCurrentPoint: null,
    dragMode: 'add',
    selectionRectangle: null,
    middlePanLastPoint: null,
    mapHandlersAttached: false,
    keyHandlerAttached: false,
    interactionState: {
        dragging: true,
        doubleClickZoom: true,
        boxZoom: true,
    },
};

const MANAGE_MODE_DRAG_THRESHOLD = 5;

const tripDateFormatter = (() => {
    try {
        return new Intl.DateTimeFormat(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
    } catch (error) {
        return null;
    }
})();

const SOURCE_TYPE_LABELS = {
    google_timeline: 'Google Timeline',
    manual: 'Manual Entry',
};

const MAP_STATE_STORAGE_KEY = 'wanderlog.mapState';
const MAP_STATE_STORAGE_VERSION = 1;
let menuStateAutoKeyCounter = 0;

const mapStateStorage = (() => {
    if (typeof window === 'undefined') { return null; }
    try {
        const storage = window.localStorage;
        if (!storage) { return null; }
        const testKey = '__wanderlog_map_state_test__';
        storage.setItem(testKey, testKey);
        storage.removeItem(testKey);
        return storage;
    } catch (error) {
        return null;
    }
})();

function loadStoredMapState() {
    if (!mapStateStorage) { return null; }
    try {
        const raw = mapStateStorage.getItem(MAP_STATE_STORAGE_KEY);
        if (!raw) { return null; }
        const parsed = JSON.parse(raw);
        if (!parsed || typeof parsed !== 'object') { return null; }
        if (parsed.version && parsed.version !== MAP_STATE_STORAGE_VERSION) {
            return null;
        }
        return parsed;
    } catch (error) {
        return null;
    }
}

function mergeMapState(baseState, partialState) {
    const result = Object.assign({}, baseState || {});

    if (partialState && typeof partialState.view === 'object') {
        const nextView = Object.assign({}, baseState && baseState.view ? baseState.view : {});
        if (partialState.view.lat !== undefined) { nextView.lat = partialState.view.lat; }
        if (partialState.view.lng !== undefined) { nextView.lng = partialState.view.lng; }
        if (partialState.view.zoom !== undefined) { nextView.zoom = partialState.view.zoom; }
        result.view = nextView;
    }

    if (partialState && typeof partialState.filters === 'object') {
        const baseFilters = (baseState && typeof baseState.filters === 'object') ? baseState.filters : {};
        const nextFilters = Object.assign({}, baseFilters);

        if ('startDate' in partialState.filters) {
            nextFilters.startDate = partialState.filters.startDate || '';
        }
        if ('endDate' in partialState.filters) {
            nextFilters.endDate = partialState.filters.endDate || '';
        }
        if ('sourceTypes' in partialState.filters) {
            nextFilters.sourceTypes = Array.isArray(partialState.filters.sourceTypes)
                ? Array.from(new Set(partialState.filters.sourceTypes))
                : [];
        }
        if ('allSourceTypesSelected' in partialState.filters) {
            nextFilters.allSourceTypesSelected = Boolean(partialState.filters.allSourceTypesSelected);
        }

        result.filters = nextFilters;
    }

    if (partialState && typeof partialState.menus === 'object') {
        const baseMenus = (baseState && typeof baseState.menus === 'object') ? baseState.menus : {};
        const nextMenus = Object.assign({}, baseMenus);

        Object.keys(partialState.menus).forEach((menuKey) => {
            const partialMenuState = partialState.menus[menuKey];

            if (partialMenuState === null) {
                delete nextMenus[menuKey];
                return;
            }

            if (!partialMenuState || typeof partialMenuState !== 'object') {
                return;
            }

            const baseMenuState = (nextMenus[menuKey] && typeof nextMenus[menuKey] === 'object')
                ? nextMenus[menuKey]
                : {};
            const mergedMenuState = Object.assign({}, baseMenuState);

            if ('open' in partialMenuState) {
                mergedMenuState.open = Boolean(partialMenuState.open);
            }

            if ('activePanelId' in partialMenuState) {
                const activePanelId = partialMenuState.activePanelId;
                mergedMenuState.activePanelId = typeof activePanelId === 'string' ? activePanelId : '';
            }

            nextMenus[menuKey] = mergedMenuState;
        });

        result.menus = nextMenus;
    }

    return result;
}

function saveStoredMapState(partialState) {
    if (!mapStateStorage || !partialState) { return; }
    try {
        const current = loadStoredMapState() || {};
        const merged = mergeMapState(current, partialState);
        const payload = Object.assign({}, merged, { version: MAP_STATE_STORAGE_VERSION });
        mapStateStorage.setItem(MAP_STATE_STORAGE_KEY, JSON.stringify(payload));
    } catch (error) {
        // Ignore persistence errors to avoid breaking the map experience.
    }
}

function getInitialMapViewFromStorage() {
    const storedState = loadStoredMapState();
    if (!storedState || typeof storedState.view !== 'object') { return null; }

    const { lat, lng, zoom } = storedState.view;
    const latNumber = Number(lat);
    const lngNumber = Number(lng);
    const zoomNumber = Number(zoom);

    const isLatValid = Number.isFinite(latNumber) && latNumber >= -85 && latNumber <= 85;
    const isLngValid = Number.isFinite(lngNumber) && lngNumber >= -180 && lngNumber <= 180;
    const isZoomValid = Number.isFinite(zoomNumber);

    const clampedZoom = isZoomValid
        ? Math.max(MAP_MIN_ZOOM, Math.min(MAP_TILE_MAX_ZOOM, zoomNumber))
        : null;

    if (isLatValid && isLngValid) {
        return {
            center: [latNumber, lngNumber],
            zoom: clampedZoom !== null ? clampedZoom : MAP_DEFAULT_ZOOM,
        };
    }

    if (clampedZoom !== null) {
        return { center: null, zoom: clampedZoom };
    }

    return null;
}

function persistMapViewState() {
    if (!map) { return; }
    try {
        const center = map.getCenter();
        const zoom = map.getZoom();
        const lat = center ? Number(center.lat) : null;
        const lng = center ? Number(center.lng) : null;
        const zoomNumber = Number(zoom);
        if (!Number.isFinite(lat) || !Number.isFinite(lng) || !Number.isFinite(zoomNumber)) {
            return;
        }
        const clampedZoom = Math.max(MAP_MIN_ZOOM, Math.min(MAP_TILE_MAX_ZOOM, zoomNumber));
        saveStoredMapState({
            view: {
                lat: Math.max(-85, Math.min(85, lat)),
                lng: Math.max(-180, Math.min(180, lng)),
                zoom: clampedZoom,
            },
        });
    } catch (error) {
        // Ignore persistence errors.
    }
}

function persistFilterState(startDate, endDate, sourceTypes) {
    const selectedTypes = Array.isArray(sourceTypes) ? sourceTypes.filter((value) => typeof value === 'string' && value) : [];
    const totalTypeInputs = document.querySelectorAll('#sourceTypeFilters input').length;
    const allSelected = totalTypeInputs > 0 && selectedTypes.length === totalTypeInputs;

    saveStoredMapState({
        filters: {
            startDate: startDate || '',
            endDate: endDate || '',
            sourceTypes: selectedTypes,
            allSourceTypesSelected: allSelected,
        },
    });
}

function getMenuStateStorageKey(menu) {
    if (!menu) { return null; }

    const existing = menu.dataset ? menu.dataset.menuStorageKey : null;
    if (existing) { return existing; }

    const explicitAttribute = menu.getAttribute('data-menu-storage-key');
    if (explicitAttribute) {
        if (menu.dataset) { menu.dataset.menuStorageKey = explicitAttribute; }
        return explicitAttribute;
    }

    const id = menu.getAttribute('id');
    if (id) {
        if (menu.dataset) { menu.dataset.menuStorageKey = id; }
        return id;
    }

    const controls = menu.querySelector('.overlay-controls');
    if (controls && controls.id) {
        const derived = `controls:${controls.id}`;
        if (menu.dataset) { menu.dataset.menuStorageKey = derived; }
        return derived;
    }

    const toggle = menu.querySelector('.menu-toggle');
    if (toggle && toggle.id) {
        const derived = `toggle:${toggle.id}`;
        if (menu.dataset) { menu.dataset.menuStorageKey = derived; }
        return derived;
    }

    const generated = `menu-${menuStateAutoKeyCounter++}`;
    if (menu.dataset) { menu.dataset.menuStorageKey = generated; }
    return generated;
}

function saveMenuState(menu, partialMenuState) {
    if (!menu) { return; }
    const key = getMenuStateStorageKey(menu);
    if (!key) { return; }

    const payload = {};
    if (partialMenuState && typeof partialMenuState === 'object') {
        if ('open' in partialMenuState) {
            payload.open = Boolean(partialMenuState.open);
        }
        if ('activePanelId' in partialMenuState) {
            const id = partialMenuState.activePanelId;
            payload.activePanelId = typeof id === 'string' ? id : '';
        }
    }

    saveStoredMapState({
        menus: {
            [key]: payload,
        },
    });
}

function setElementHidden(element, hidden) {
    if (!element) { return; }
    if (hidden) { element.hidden = true; }
    else { element.hidden = false; }
}

// Convert the payload returned by ``/api/auth/status`` into a predictable
// structure that the UI can work with.  This mirrors the server-side
// ``_normalise_google_user`` helper.
function normaliseGoogleAuthUser(user) {
    if (!user || typeof user !== 'object') { return null; }

    const id = typeof user.id === 'string' ? user.id : '';
    const email = typeof user.email === 'string' ? user.email : '';
    const name = typeof user.name === 'string' ? user.name : '';
    const picture = typeof user.picture === 'string' ? user.picture : '';

    if (!id && !email && !name && !picture) { return null; }

    return { id, email, name, picture };
}

// Build an initial (for the avatar badge) based on the user's display name or
// email address returned from Google.
function deriveGoogleUserInitial(user) {
    if (!user) { return ''; }
    const source = (user.name || user.email || '').trim();
    if (!source) { return ''; }
    return source.charAt(0).toUpperCase();
}

// Persist the current Google user in the global config object so other modules
// can query authentication state without touching the DOM directly.
function updateGoogleAuthConfig(user) {
    if (!GOOGLE_AUTH_CONFIG) { return; }
    if (user) {
        GOOGLE_AUTH_CONFIG.user = { ...user };
    } else {
        GOOGLE_AUTH_CONFIG.user = null;
    }
}

function getGooglePhotosPickerRawConfig() {
    if (!GOOGLE_AUTH_CONFIG || !GOOGLE_AUTH_CONFIG.photosPicker) { return null; }
    return GOOGLE_AUTH_CONFIG.photosPicker;
}

function getGooglePhotosPickerSettings() {
    const config = getGooglePhotosPickerRawConfig();
    if (!config || !config.enabled) { return null; }

    const apiKey = typeof config.apiKey === 'string' ? config.apiKey.trim() : '';
    if (!apiKey) { return null; }

    const clientId = typeof config.clientId === 'string' ? config.clientId.trim() : '';
    const maxItemCount = Number.isFinite(config.maxItemCount)
        ? Number(config.maxItemCount)
        : null;

    return {
        apiKey,
        clientId,
        maxItemCount,
    };
}

function updateGooglePhotosPickerButtonState(isAuthenticated) {
    if (!googlePhotosPickerButton) {
        googlePhotosPickerButton = document.querySelector('[data-google-photos-picker-button]');
    }
    if (!googlePhotosPickerButton) { return; }

    const settings = getGooglePhotosPickerSettings();
    const shouldEnable = Boolean(isAuthenticated && settings);

    setElementHidden(googlePhotosPickerButton, !shouldEnable);
    googlePhotosPickerButton.disabled = !shouldEnable;
    googlePhotosPickerButton.setAttribute('aria-hidden', shouldEnable ? 'false' : 'true');
    if (!shouldEnable) {
        googlePhotosPickerButton.removeAttribute('aria-busy');
    }

    try {
        console.debug('Google Photos Picker button state updated', {
            isAuthenticated,
            shouldEnable,
        });
    } catch (error) {
        // Ignore logging errors in restricted environments.
    }
}

function waitForMilliseconds(duration) {
    const value = Number(duration);
    if (!Number.isFinite(value) || value <= 0) { return Promise.resolve(); }
    return new Promise((resolve) => { setTimeout(resolve, value); });
}

async function createGooglePhotosPickerSession(options) {
    let response;
    try {
        response = await fetch('/api/google/photos/picker/sessions', {
            method: 'POST',
            credentials: 'include',
            cache: 'no-store',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(options || {}),
        });
    } catch (error) {
        throw new Error('Network error while creating Google Photos Picker session.');
    }

    let payload = null;
    try {
        payload = await response.json();
    } catch (error) {
        payload = null;
    }

    if (!response.ok) {
        const message = payload && payload.error
            ? payload.error
            : 'Failed to create Google Photos Picker session.';
        throw new Error(message);
    }

    const session = payload && payload.session && typeof payload.session === 'object'
        ? payload.session
        : null;
    if (!session || !session.session_id || !session.picker_uri) {
        throw new Error('Google Photos Picker session response was incomplete.');
    }

    try {
        console.info('Google Photos Picker session created', session);
    } catch (error) {
        // Ignore logging errors in restricted environments.
    }

    return session;
}

async function fetchGooglePhotosPickerSession(sessionId) {
    let response;
    try {
        response = await fetch(`/api/google/photos/picker/sessions/${encodeURIComponent(sessionId)}`, {
            method: 'GET',
            credentials: 'include',
            cache: 'no-store',
        });
    } catch (error) {
        throw new Error('Network error while checking Google Photos Picker session status.');
    }

    let payload = null;
    try {
        payload = await response.json();
    } catch (error) {
        payload = null;
    }

    if (!response.ok) {
        const message = payload && payload.error
            ? payload.error
            : 'Failed to fetch Google Photos Picker session status.';
        throw new Error(message);
    }

    const session = payload && payload.session && typeof payload.session === 'object'
        ? payload.session
        : null;
    if (!session || !session.session_id) {
        throw new Error('Google Photos Picker session status was incomplete.');
    }

    try {
        console.debug('Google Photos Picker session status', session);
    } catch (error) {
        // Ignore logging errors in restricted environments.
    }

    return session;
}

async function listGooglePhotosPickerMediaItems(sessionId) {
    let response;
    try {
        const url = new URL('/api/google/photos/picker/media-items', window.location.origin);
        url.searchParams.set('session_id', sessionId);
        response = await fetch(url.toString(), {
            method: 'GET',
            credentials: 'include',
            cache: 'no-store',
        });
    } catch (error) {
        throw new Error('Network error while retrieving Google Photos selections.');
    }

    let payload = null;
    try {
        payload = await response.json();
    } catch (error) {
        payload = null;
    }

    if (!response.ok) {
        const message = payload && payload.error
            ? payload.error
            : 'Failed to retrieve Google Photos selections.';
        throw new Error(message);
    }

    const mediaItems = payload && Array.isArray(payload.mediaItems)
        ? payload.mediaItems
        : [];

    try {
        console.info('Google Photos Picker media items retrieved', {
            sessionId,
            count: mediaItems.length,
            mediaItems,
        });
    } catch (error) {
        // Ignore logging errors in restricted environments.
    }

    return { mediaItems, nextPageToken: payload ? payload.nextPageToken : null };
}

async function deleteGooglePhotosPickerSession(sessionId) {
    try {
        await fetch(`/api/google/photos/picker/sessions/${encodeURIComponent(sessionId)}`, {
            method: 'DELETE',
            credentials: 'include',
            cache: 'no-store',
        });
    } catch (error) {
        // Cleanup failures are not fatal for the user experience.
    }
}

function describeGooglePhotosPickerSelection(mediaItems) {
    if (!Array.isArray(mediaItems) || !mediaItems.length) { return 'No media items were returned.'; }

    const names = mediaItems
        .map((item) => {
            if (!item || typeof item !== 'object') { return ''; }
            if (item.mediaFile && typeof item.mediaFile === 'object') {
                const fileName = item.mediaFile.filename || '';
                if (fileName) { return fileName; }
            }
            return item.id || '';
        })
        .filter((value) => value)
        .slice(0, 3);

    const noun = mediaItems.length === 1 ? 'item' : 'items';
    const preview = names.length
        ? ` (${names.join(', ')}${mediaItems.length > names.length ? ', ...' : ''})`
        : '';

    return `Selected ${mediaItems.length} ${noun} from Google Photos${preview}.`;
}

async function saveTripPhotosFromPicker(tripId, mediaItems) {
    const cleanedTripId = typeof tripId === 'string' ? tripId.trim() : String(tripId || '').trim();
    if (!cleanedTripId) {
        throw new Error('Trip could not be determined.');
    }
    if (!Array.isArray(mediaItems)) {
        throw new Error('No media items were provided.');
    }

    let response;
    try {
        response = await fetch(`/api/trips/${encodeURIComponent(cleanedTripId)}/photos`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ mediaItems }),
        });
    } catch (error) {
        throw new Error('Network error while saving selected photos.');
    }

    let payload = {};
    try {
        payload = await response.json();
    } catch (error) {
        payload = {};
    }

    if (!response.ok || (payload && payload.status === 'error')) {
        const message = payload && payload.message ? payload.message : 'Failed to store selected photos.';
        throw new Error(message);
    }

    const photos = Array.isArray(payload.photos) ? payload.photos : [];
    const photoItems = Array.isArray(payload.photo_items) ? payload.photo_items : [];
    const importedCount = typeof payload.imported === 'number'
        ? payload.imported
        : (photoItems.length || photos.length);
    const updatedTrip = payload && payload.trip && typeof payload.trip === 'object'
        ? payload.trip
        : null;

    if (updatedTrip) {
        populateTripProfilePanel(updatedTrip, {
            preserveDirty: true,
            photos,
            photoItems,
        });
        upsertTripInList(updatedTrip, { reloadDetail: false });
        if (tripDetailState.trip && tripDetailState.trip.id === cleanedTripId) {
            tripDetailState.trip = { ...tripDetailState.trip, ...updatedTrip };
            updateTripDetailHeader();
        }
    } else {
        updateTripPhotosSection({
            photos,
            photoItems,
        });
    }

    const message = payload && payload.message ? payload.message : null;

    return {
        trip: updatedTrip,
        photos,
        photoItems,
        imported: importedCount,
        message,
    };
}

async function openGooglePhotosPicker(button) {
    const settings = getGooglePhotosPickerSettings();
    if (!settings) {
        throw new Error('Google Photos Picker is not configured.');
    }

    try {
        console.info('Google Photos Picker button clicked');
    } catch (error) {
        // Ignore logging errors in restricted environments.
    }

    let popup = window.open('', '_blank', 'noopener,noreferrer');
    if (!popup) {
        popup = window.open('', '_blank');
        if (popup) {
            try { popup.opener = null; } catch (error) { /* Ignore */ }
        }
    }
    if (!popup) {
        throw new Error('Please allow pop-ups to open the Google Photos Picker.');
    }
    popup.document.write('<p style="font-family: sans-serif;">Opening Google Photos Picker...</p>');

    const sessionOptions = {};
    if (Number.isFinite(settings.maxItemCount) && settings.maxItemCount > 0) {
        sessionOptions.maxItemCount = settings.maxItemCount;
    }

    const session = await createGooglePhotosPickerSession(sessionOptions);
    popup.location.href = `${session.picker_uri.replace(/\/$/, '')}/autoclose`;
    showStatus('Opened Google Photos Picker. Complete your selection in the new window.');

    const pollInterval = session.polling && Number.isFinite(session.polling.poll_interval_ms)
        ? session.polling.poll_interval_ms
        : 2000;
    const pollTimeout = session.polling && Number.isFinite(session.polling.timeout_ms)
        ? session.polling.timeout_ms
        : 600000;
    const startedAt = Date.now();
    let latestSession = session;

    while (true) {
        await waitForMilliseconds(pollInterval);
        if (pollTimeout && Date.now() - startedAt > pollTimeout) {
            throw new Error('Timed out waiting for Google Photos Picker to finish.');
        }

        latestSession = await fetchGooglePhotosPickerSession(session.session_id);
        if (latestSession.media_items_set) {
            break;
        }
    }

    const { mediaItems } = await listGooglePhotosPickerMediaItems(session.session_id);
    await deleteGooglePhotosPickerSession(session.session_id);

    const summary = describeGooglePhotosPickerSelection(mediaItems);
    showStatus(summary);

    try {
        console.info('Google Photos Picker flow completed', {
            session: latestSession,
            summary,
        });
    } catch (error) {
        // Ignore logging errors in restricted environments.
    }

    return { session: latestSession, mediaItems, summary };
}

async function handleGooglePhotosPickerButtonClick(event) {
    event.preventDefault();

    const button = event.currentTarget;
    if (!button || button.disabled) { return; }

    const tripId = tripDescriptionState.tripId
        ? String(tripDescriptionState.tripId).trim()
        : (tripDetailState.selectedTripId ? String(tripDetailState.selectedTripId).trim() : '');

    if (!tripId) {
        showTripDescriptionStatus('Open a trip before importing photos.', true);
        return;
    }

    button.disabled = true;
    button.setAttribute('aria-busy', 'true');

    try {
        const { mediaItems, summary } = await openGooglePhotosPicker(button);

        if (!Array.isArray(mediaItems) || mediaItems.length === 0) {
            const message = summary || 'No photos were selected.';
            showTripDescriptionStatus(message);
            return;
        }

        const result = await saveTripPhotosFromPicker(tripId, mediaItems);
        const importedCount = typeof result.imported === 'number'
            ? result.imported
            : mediaItems.length;
        const successMessage = result.message
            || (importedCount
                ? `Imported ${importedCount} photo${importedCount === 1 ? '' : 's'} into this trip.`
                : 'Trip photos cleared.');
        showTripDescriptionStatus(successMessage);
    } catch (error) {
        const message = error && error.message ? error.message : 'Failed to import Google Photos.';
        showTripDescriptionStatus(message, true);
        try {
            console.error('Google Photos Picker error', error);
        } catch (consoleError) {
            // Ignore logging failures.
        }
    } finally {
        button.removeAttribute('aria-busy');
        updateGooglePhotosPickerButtonState(Boolean(GOOGLE_AUTH_CONFIG && GOOGLE_AUTH_CONFIG.user));
    }
}

function setupGooglePhotosPickerTestButton() {
    const button = document.querySelector('[data-google-photos-picker-button]');
    if (!button) { return; }
    if (button.dataset.googlePhotosPickerInitialised === 'true') {
        googlePhotosPickerButton = button;
        return;
    }

    googlePhotosPickerButton = button;
    googlePhotosPickerButton.addEventListener('click', handleGooglePhotosPickerButtonClick);
    googlePhotosPickerButton.dataset.googlePhotosPickerInitialised = 'true';
    updateGooglePhotosPickerButtonState(Boolean(GOOGLE_AUTH_CONFIG && GOOGLE_AUTH_CONFIG.user));

    try {
        console.info('Google Photos Picker button initialised');
    } catch (error) {
        // Ignore logging errors in restricted environments.
    }
}

// Update the Google authentication card UI to reflect the latest state.  This
// controls the sign-in button label and the avatar based on whether the user is
// authenticated.
function applyGoogleAuthState(state) {
    const card = document.querySelector('[data-google-auth-card]');
    if (!card) { return; }

    const button = card.querySelector('[data-auth-button]');
    if (!button) { return; }

    const labelElement = button.querySelector('[data-auth-button-label]');
    const iconElement = button.querySelector('[data-auth-button-icon]');
    const statusElement = card.querySelector('[data-auth-status]');
    const statusTitleElement = card.querySelector('[data-auth-status-title]');
    const statusSubtitleElement = card.querySelector('[data-auth-status-subtitle]');
    const avatarElement = card.querySelector('[data-auth-avatar]');
    const avatarImageElement = avatarElement ? avatarElement.querySelector('[data-auth-avatar-image]') : null;
    const avatarInitialElement = avatarElement ? avatarElement.querySelector('[data-auth-avatar-initial]') : null;

    const normalisedUser = state && state.authenticated ? normaliseGoogleAuthUser(state.user) : null;
    const isAuthenticated = Boolean(normalisedUser);

    updateGoogleAuthConfig(normalisedUser);

    const loginLabel = button.dataset.authLoginLabel || 'Sign in with Google';
    const logoutLabel = button.dataset.authLogoutLabel || 'Sign Out';
    const loginUrl = button.dataset.authLoginUrl || '#';
    const logoutUrl = button.dataset.authLogoutUrl || '#';
    const loginClasses = (button.dataset.authLoginClass || '').split(/\s+/).filter(Boolean);
    const logoutClasses = (button.dataset.authLogoutClass || '').split(/\s+/).filter(Boolean);

    button.classList.remove(...loginClasses, ...logoutClasses);
    if (isAuthenticated) {
        if (logoutClasses.length) { button.classList.add(...logoutClasses); }
        button.setAttribute('href', logoutUrl || '#');
        if (labelElement) { labelElement.textContent = logoutLabel; }
        if (iconElement) { setElementHidden(iconElement, true); }
        card.dataset.authState = 'authenticated';
    } else {
        if (loginClasses.length) { button.classList.add(...loginClasses); }
        button.setAttribute('href', loginUrl || '#');
        if (labelElement) { labelElement.textContent = loginLabel; }
        if (iconElement) { setElementHidden(iconElement, false); }
        card.dataset.authState = 'anonymous';
    }

    if (statusElement) {
        setElementHidden(statusElement, !isAuthenticated);
        if (isAuthenticated) {
            if (statusTitleElement) { statusTitleElement.textContent = 'Signed in'; }
            if (statusSubtitleElement) { statusSubtitleElement.textContent = normalisedUser.name || normalisedUser.email || ''; }
        } else {
            if (statusTitleElement) { statusTitleElement.textContent = ''; }
            if (statusSubtitleElement) { statusSubtitleElement.textContent = ''; }
        }
    }

    if (avatarElement) {
        setElementHidden(avatarElement, !isAuthenticated);
        const userInitial = isAuthenticated ? deriveGoogleUserInitial(normalisedUser) : '';
        if (avatarImageElement) {
            if (isAuthenticated && normalisedUser.picture) {
                avatarImageElement.src = normalisedUser.picture;
                setElementHidden(avatarImageElement, false);
            } else {
                avatarImageElement.removeAttribute('src');
                setElementHidden(avatarImageElement, true);
            }
        }
        if (avatarInitialElement) {
            if (isAuthenticated && !normalisedUser.picture && userInitial) {
                avatarInitialElement.textContent = userInitial;
                setElementHidden(avatarInitialElement, false);
            } else {
                avatarInitialElement.textContent = '';
                setElementHidden(avatarInitialElement, true);
            }
        }
    }

    updateGooglePhotosPickerButtonState(isAuthenticated);
}

// Ask the backend whether the current session is authenticated with Google.
// The endpoint both validates stored credentials and returns a minimal user
// profile so the UI can react accordingly.
async function requestGoogleAuthStatus() {
    if (!GOOGLE_AUTH_CONFIG || !GOOGLE_AUTH_CONFIG.enabled) { return; }
    if (!document.querySelector('[data-google-auth-card]')) { return; }

    const requestId = ++googleAuthRequestToken;
    try {
        const response = await fetch('/api/auth/status', {
            credentials: 'include',
            cache: 'no-store',
        });
        if (!response.ok) { return; }

        const payload = await response.json();
        if (requestId !== googleAuthRequestToken) { return; }

        const authenticated = Boolean(payload && payload.authenticated);
        const user = authenticated && payload && payload.user ? payload.user : null;
        applyGoogleAuthState({ authenticated, user });
    } catch (error) {
        // Ignore network errors so the UI remains responsive.
    }
}

// Bind the Google authentication card to live data by applying the initial
// state from ``GOOGLE_AUTH_CONFIG`` and triggering a status refresh.
function setupGoogleAuthCard() {
    if (!GOOGLE_AUTH_CONFIG || !GOOGLE_AUTH_CONFIG.enabled) { return; }
    if (!document.querySelector('[data-google-auth-card]')) { return; }

    applyGoogleAuthState({
        authenticated: Boolean(GOOGLE_AUTH_CONFIG.user),
        user: GOOGLE_AUTH_CONFIG.user || null,
    });

    googleAuthRefreshHandler = () => { requestGoogleAuthStatus(); };
    requestGoogleAuthStatus();
}

const MAX_ALIAS_LENGTH = 120;
const MAX_TRIP_NAME_LENGTH = 120;
const MAX_LOCATION_DESCRIPTION_LENGTH = 2000;
const MAX_TRIP_PHOTOS_URL_LENGTH = 1000;

const markerIconCache = new Map();

const HTML_ESCAPE_LOOKUP = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
};
const HTML_ESCAPE_REGEX = /[&<>"']/g;

function escapeHtml(value) {
    if (value === null || value === undefined) { return ''; }
    return String(value).replace(HTML_ESCAPE_REGEX, (match) => HTML_ESCAPE_LOOKUP[match] || match);
}

function escapeHtmlAttribute(value) {
    return escapeHtml(value).replace(/`/g, '&#96;');
}

function debounce(fn, wait = 0) {
    let timeoutId = null;
    return function debounced(...args) {
        if (timeoutId !== null) {
            clearTimeout(timeoutId);
        }
        timeoutId = setTimeout(() => {
            timeoutId = null;
            fn.apply(this, args);
        }, wait);
    };
}

function loadStoredMapStyleMode() {
    if (typeof window === 'undefined' || !window.localStorage) { return null; }
    try {
        const stored = window.localStorage.getItem(MAP_STYLE_STORAGE_KEY);
        if (stored === MAP_STYLE_MODE_NIGHT) { return MAP_STYLE_MODE_NIGHT; }
        if (stored === MAP_STYLE_MODE_DAY) { return MAP_STYLE_MODE_DAY; }
    } catch (error) {
        console.warn('Unable to read stored map style preference', error);
    }
    return null;
}

function persistMapStyleMode(mode) {
    if (typeof window === 'undefined' || !window.localStorage) { return; }
    try {
        window.localStorage.setItem(MAP_STYLE_STORAGE_KEY, mode);
    } catch (error) {
        console.warn('Unable to store map style preference', error);
    }
}

function getMapStyleUrl(mode) {
    return mode === MAP_STYLE_MODE_NIGHT ? MAPBOX_NIGHT_STYLE_URL : MAPBOX_DAY_STYLE_URL;
}

function syncMapThemeToggleControl(mode = mapStyleMode) {
    if (!mapThemeToggle) { return; }
    mapThemeToggle.checked = mode === MAP_STYLE_MODE_NIGHT;
}

function setMapStyleMode(mode) {
    const nextMode = mode === MAP_STYLE_MODE_NIGHT ? MAP_STYLE_MODE_NIGHT : MAP_STYLE_MODE_DAY;
    if (mapStyleMode === nextMode) {
        syncMapThemeToggleControl(nextMode);
        return;
    }
    mapStyleMode = nextMode;
    persistMapStyleMode(mapStyleMode);
    syncMapThemeToggleControl(mapStyleMode);
    if (!map) { return; }
    const styleUrl = getMapStyleUrl(mapStyleMode);
    try {
        map.setStyle(styleUrl);
    } catch (error) {
        console.error('Failed to switch map style', error);
    }
}

function createValidatedDateParts(year, month, day) {
    const y = Number(year);
    const m = Number(month);
    const d = Number(day);

    if (!Number.isInteger(y) || !Number.isInteger(m) || !Number.isInteger(d)) { return null; }
    if (m < 1 || m > 12) { return null; }
    if (d < 1 || d > 31) { return null; }

    const date = new Date(Date.UTC(y, m - 1, d));
    if (date.getUTCFullYear() !== y || date.getUTCMonth() !== m - 1 || date.getUTCDate() !== d) { return null; }

    return { year: y, month: m, day: d };
}

function convertTwoDigitYear(value) {
    const yearNumber = Number(value);
    if (!Number.isFinite(yearNumber)) { return yearNumber; }
    if (!Number.isInteger(yearNumber) || yearNumber < 0 || yearNumber > 99) { return yearNumber; }

    const currentYear = (new Date()).getFullYear();
    const century = Math.floor(currentYear / 100) * 100;
    let candidate = century + yearNumber;

    if (candidate > currentYear + 50) {
        candidate -= 100;
    } else if (candidate < currentYear - 50) {
        candidate += 100;
    }

    return candidate;
}

function parseFlexibleDateParts(value) {
    const trimmed = typeof value === 'string' ? value.trim() : '';
    if (!trimmed) { return null; }

    const isoMatch = trimmed.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
    if (isoMatch) {
        return createValidatedDateParts(isoMatch[1], isoMatch[2], isoMatch[3]);
    }

    const digitsOnly = trimmed.replace(/\D/g, '');
    if (digitsOnly.length === 8 && digitsOnly.length === trimmed.length && /^\d{8}$/.test(digitsOnly)) {
        return createValidatedDateParts(
            digitsOnly.slice(0, 4),
            digitsOnly.slice(4, 6),
            digitsOnly.slice(6, 8),
        );
    }

    const separated = trimmed.split(/[-./\\,\s]+/).filter(Boolean);
    if (separated.length === 3) {
        const [firstRaw, secondRaw, thirdRaw] = separated;
        const first = Number(firstRaw);
        const second = Number(secondRaw);
        const third = Number(thirdRaw);

        if ([first, second, third].some((part) => Number.isNaN(part))) { return null; }

        if (firstRaw.length === 4) {
            return createValidatedDateParts(first, second, third);
        }

        if (thirdRaw.length === 4) {
            let month = first;
            let day = second;

            if (month > 12 && day <= 12) {
                [day, month] = [month, day];
            }

            return createValidatedDateParts(third, month, day);
        }

        if (thirdRaw.length === 2) {
            const year = convertTwoDigitYear(third);
            let month = first;
            let day = second;

            if (month > 12 && day <= 12) {
                [day, month] = [month, day];
            }

            return createValidatedDateParts(year, month, day);
        }
    }

    const parsed = new Date(trimmed);
    if (!Number.isNaN(parsed.getTime())) {
        return createValidatedDateParts(
            parsed.getFullYear(),
            parsed.getMonth() + 1,
            parsed.getDate(),
        );
    }

    return null;
}

function normaliseDateInputValue(value) {
    if (value === null || value === undefined) { return ''; }
    const stringValue = typeof value === 'string' ? value : String(value);
    const trimmed = stringValue.trim();
    if (!trimmed) { return ''; }

    const parts = parseFlexibleDateParts(trimmed);
    if (!parts) { return null; }

    const year = String(parts.year).padStart(4, '0');
    const month = String(parts.month).padStart(2, '0');
    const day = String(parts.day).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function updateDateInputValue(input) {
    if (!input) { return ''; }
    const normalised = normaliseDateInputValue(input.value);
    if (normalised === null) { return null; }

    if (normalised !== input.value) {
        input.value = normalised;
    }

    return normalised;
}

function createPopupContent(markerData) {
    if (!markerData) { return ''; }

    const markerId = markerData.id || '';
    const safeId = escapeHtmlAttribute(markerId);
    const placeRaw = markerData.place ?? '';
    const placeClean = typeof placeRaw === 'string'
        ? placeRaw.trim()
        : String(placeRaw || '').trim();
    const aliasRaw = markerData.alias ?? '';
    const aliasClean = typeof aliasRaw === 'string'
        ? aliasRaw.trim()
        : String(aliasRaw || '').trim();
    const displayRaw = markerData.display_name ?? '';
    let displayClean = typeof displayRaw === 'string'
        ? displayRaw.trim()
        : String(displayRaw || '').trim();

    if (!displayClean) {
        displayClean = aliasClean || placeClean;
    }

    const hasAlias = aliasClean.length > 0;
    const nameLabel = hasAlias ? 'Alias' : 'Place Name';

    const place = escapeHtml(placeClean || 'Unknown');
    const displayName = escapeHtml(displayClean || 'Unknown');
    let descriptionText = '';
    const descriptionRaw = markerData.description ?? '';
    if (typeof descriptionRaw === 'string') {
        descriptionText = descriptionRaw;
    } else if (descriptionRaw !== null && descriptionRaw !== undefined) {
        descriptionText = String(descriptionRaw);
    }
    const descriptionHasContent = descriptionText.trim().length > 0;
    const descriptionRow = descriptionHasContent
        ? `<div class="marker-popup-row marker-popup-description"><span class="marker-popup-label">Description</span><span class="marker-popup-value marker-popup-value-multiline">${escapeHtml(descriptionText).replace(/\r?\n/g, '<br>')}</span></div>`
        : '';
    const sourceLabel = getSourceTypeLabel(markerData.source_type);
    const sourceRow = sourceLabel
        ? `<div class="marker-popup-row"><span class="marker-popup-label">Source</span><span class="marker-popup-value">${escapeHtml(sourceLabel)}</span></div>`
        : '';
    const date = escapeHtml(markerData.date || 'Unknown');
    const latNumber = Number(markerData.lat);
    const lngNumber = Number(markerData.lng);
    const coordinatesQuery = Number.isFinite(latNumber) && Number.isFinite(lngNumber)
        ? `${latNumber},${lngNumber}`
        : '';
    const latText = Number.isFinite(latNumber) ? latNumber.toFixed(4) : String(markerData.lat ?? '');
    const lngText = Number.isFinite(lngNumber) ? lngNumber.toFixed(4) : String(markerData.lng ?? '');
    const coordinates = `${escapeHtml(latText)}, ${escapeHtml(lngText)}`;
    const hasId = Boolean(markerId);
    const aliasRow = hasAlias
        ? `<div class="marker-popup-row"><span class="marker-popup-label">Place Name</span><span class="marker-popup-value">${place}</span></div>`
        : '';
    const membershipsRaw = Array.isArray(markerData.trips) ? markerData.trips : [];
    const membershipEntries = membershipsRaw
        .map((entry) => normaliseTripMembership(entry))
        .filter(Boolean);
    const membershipBadges = membershipEntries.length
        ? membershipEntries.map((trip) => `<span class="marker-popup-trip-pill">${escapeHtml(trip.name)}</span>`).join('')
        : '';
    const tripRow = membershipBadges
        ? `<div class="marker-popup-row"><span class="marker-popup-label">Trips</span><span class="marker-popup-value marker-popup-trips">${membershipBadges}</span></div>`
        : '';
    const manageTripLabel = membershipEntries.length ? 'Manage Trips' : 'Add to Trip';
    const descriptionButtonLabel = descriptionHasContent ? 'Edit Description' : 'Add Description';
    const locationQuery = displayClean || aliasClean || placeClean;
    const googleMapsQuery = coordinatesQuery || locationQuery;
    const googleMapsUrl = googleMapsQuery
        ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(googleMapsQuery)}`
        : '';
    const googleMapsLink = googleMapsUrl
        ? `<button type="button" class="marker-popup-google-link" data-maps-url="${escapeHtmlAttribute(googleMapsUrl)}" title="Open in Google Maps" aria-label="Open in Google Maps"><img src="${escapeHtmlAttribute(GOOGLE_MAPS_LOGO_PATH)}" alt="" aria-hidden="true"></button>`
        : '';

    const headerRow = `<div class="marker-popup-header"><div class="marker-popup-header-text"><span class="marker-popup-label">${nameLabel}</span><span class="marker-popup-value">${displayName}</span></div>${googleMapsLink || ''}</div>`;

    const actions = hasId
        ? `<div class="marker-actions"><button type="button" class="marker-action marker-action-trip">${escapeHtml(manageTripLabel)}</button><button type="button" class="marker-action marker-action-description">${escapeHtml(descriptionButtonLabel)}</button><button type="button" class="marker-action marker-action-alias">Rename</button><button type="button" class="marker-action marker-action-archive">Archive</button><button type="button" class="marker-action marker-action-delete">Delete</button></div>`
        : '';

    return [
        `<div class="marker-popup"${hasId ? ` data-marker-id="${safeId}"` : ''}>`,
        headerRow,
        aliasRow,
        descriptionRow,
        tripRow,
        sourceRow,
        `<div class="marker-popup-row"><span class="marker-popup-label">Date Visited</span><span class="marker-popup-value">${date}</span></div>`,
        `<div class="marker-popup-row"><span class="marker-popup-label">Coordinates</span><span class="marker-popup-value">${coordinates}</span></div>`,
        actions,
        `</div>`,
    ].filter(Boolean).join('');
}

function attachMarkerPopupActions(popup, markerData, marker) {
    if (!popup || typeof popup.getElement !== 'function') { return; }
    const popupElement = popup.getElement();
    if (!popupElement) { return; }

    const markerId = markerData && markerData.id ? markerData.id : '';
    const tripButton = popupElement.querySelector('.marker-action-trip');
    if (tripButton && markerData && markerId) {
        tripButton.onclick = (event) => {
            event.preventDefault();
            openTripAssignmentModal(markerData, { triggerButton: tripButton });
        };
    }

    const descriptionButton = popupElement.querySelector('.marker-action-description');
    if (descriptionButton && markerData && markerId) {
        descriptionButton.onclick = (event) => {
            event.preventDefault();
            openDescriptionModal(markerData, {
                triggerButton: descriptionButton,
                isArchived: Boolean(markerData.archived),
            });
        };
    }

    const archiveButton = popupElement.querySelector('.marker-action-archive');
    if (archiveButton && markerId) {
        archiveButton.onclick = (event) => {
            event.preventDefault();
            archiveMarker(markerId, marker, archiveButton);
        };
    }

    const renameButton = popupElement.querySelector('.marker-action-alias');
    if (renameButton && markerData && markerId) {
        renameButton.onclick = (event) => {
            event.preventDefault();
            openAliasModal(markerData, {
                triggerButton: renameButton,
                isArchived: Boolean(markerData.archived),
            });
        };
    }

    const deleteButton = popupElement.querySelector('.marker-action-delete');
    if (deleteButton && markerId) {
        deleteButton.onclick = (event) => {
            event.preventDefault();
            deleteMarker(markerId, marker, deleteButton);
        };
    }

    const googleMapsButton = popupElement.querySelector('.marker-popup-google-link');
    if (googleMapsButton) {
        const mapsUrl = googleMapsButton.dataset ? googleMapsButton.dataset.mapsUrl : '';
        googleMapsButton.onclick = (event) => {
            event.preventDefault();
            if (!mapsUrl) { return; }
            try {
                window.open(mapsUrl, '_blank', 'noopener');
            } catch (error) {
                window.open(mapsUrl, '_blank');
            }
        };
    }
}

function getSourceTypeLabel(type) {
    if (!type) { return ''; }
    if (Object.prototype.hasOwnProperty.call(SOURCE_TYPE_LABELS, type)) {
        return SOURCE_TYPE_LABELS[type];
    }
    return type
        .replace(/_/g, ' ')
        .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function getMarkerImageId(sourceType) {
    const normalised = sourceType ? String(sourceType).toLowerCase() : 'default';
    return `wanderlog-marker-${normalised}`;
}

function getMarkerColor(sourceType) {
    const key = sourceType ? String(sourceType).toLowerCase() : 'default';
    if (Object.prototype.hasOwnProperty.call(SOURCE_TYPE_COLORS, key)) {
        return SOURCE_TYPE_COLORS[key];
    }
    return SOURCE_TYPE_COLORS.default;
}

function drawMarkerPin(canvas, color) {
    const ctx = canvas.getContext('2d');
    if (!ctx) { return; }
    const size = canvas.width;
    ctx.clearRect(0, 0, size, size);

    const centerX = size / 2;
    const centerY = size * 0.38;
    const radius = size * 0.2;

    // Drop shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.18)';
    ctx.beginPath();
    ctx.ellipse(centerX, size * 0.82, radius * 1.35, radius * 0.6, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(centerX, size * 0.78);
    ctx.quadraticCurveTo(centerX + radius * 1.3, size * 0.55, centerX + radius * 0.55, centerY + radius * 0.35);
    ctx.quadraticCurveTo(centerX, centerY + radius * 1.4, centerX - radius * 0.55, centerY + radius * 0.35);
    ctx.quadraticCurveTo(centerX - radius * 1.3, size * 0.55, centerX, size * 0.78);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius * 0.55, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.beginPath();
    ctx.arc(centerX - radius * 0.25, centerY - radius * 0.25, radius * 0.2, 0, Math.PI * 2);
    ctx.fill();
}

function getMarkerSource() {
    if (!map) { return null; }
    return map.getSource(MAPBOX_MARKER_SOURCE_ID);
}

function getUnclusteredSource() {
    if (!map) { return null; }
    return map.getSource(MAPBOX_UNCLUSTERED_SOURCE_ID);
}

function getTripSource() {
    if (!map) { return null; }
    return map.getSource(MAPBOX_TRIP_SOURCE_ID);
}

function ensureMapboxIconRegistered(sourceType) {
    if (!map) { return Promise.resolve(getMarkerImageId(sourceType)); }
    const imageId = getMarkerImageId(sourceType);
    if (typeof map.hasImage === 'function' && map.hasImage(imageId)) {
        return Promise.resolve(imageId);
    }

    if (mapboxIconPromises.has(imageId)) {
        return mapboxIconPromises.get(imageId);
    }

    const promise = new Promise((resolve, reject) => {
        const canvas = document.createElement('canvas');
        canvas.width = 64;
        canvas.height = 64;
        drawMarkerPin(canvas, getMarkerColor(sourceType));
        const ctx = canvas.getContext('2d');
        if (!ctx) {
            reject(new Error('Canvas context unavailable for marker icon'));
            return;
        }
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const payload = {
            width: imageData.width,
            height: imageData.height,
            data: imageData.data,
        };
        if (!map.hasImage(imageId)) {
            map.addImage(imageId, payload, { pixelRatio: 2 });
        }
        resolve(imageId);
    }).finally(() => {
        mapboxIconPromises.delete(imageId);
    });

    mapboxIconPromises.set(imageId, promise);
    return promise;
}

async function ensureMarkerIconsFor(markerRecords) {
    const types = new Set(['default']);
    markerRecords.forEach((record) => {
        if (record && record.source_type) {
            types.add(String(record.source_type).toLowerCase());
        }
    });
    await Promise.all([...types].map((type) => ensureMapboxIconRegistered(type)));
}

async function ensureExistingMarkerIcons() {
    if (!mapMarkerData || mapMarkerData.size === 0) { return; }
    try {
        await ensureMarkerIconsFor(Array.from(mapMarkerData.values()));
    } catch (error) {
        console.warn('Failed to ensure marker icons for existing markers', error);
    }
}

function initialiseMapboxMarkerLayers() {
    if (!map) { return; }
    if (getMarkerSource()) { return; }

    map.addSource(MAPBOX_MARKER_SOURCE_ID, {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
        cluster: true,
        clusterMaxZoom: 16,
        clusterRadius: MAPBOX_CLUSTER_RADIUS,
        promoteId: 'featureId',
    });

    map.addLayer({
        id: MAPBOX_CLUSTER_LAYER_ID,
        type: 'circle',
        source: MAPBOX_MARKER_SOURCE_ID,
        filter: ['has', 'point_count'],
        paint: {
            'circle-color': [
                'step',
                ['get', 'point_count'],
                '#14532d',
                25,
                '#166534',
                50,
                '#1f6f43',
                200,
                '#254e2c',
            ],
            'circle-radius': [
                'step',
                ['get', 'point_count'],
                16,
                25,
                22,
                50,
                28,
                200,
                34,
            ],
            'circle-opacity': 0.85,
            'circle-radius-transition': {
                duration: 380,
                delay: 0,
            },
            'circle-opacity-transition': {
                duration: 320,
                delay: 0,
            },
        },
    });

    map.addLayer({
        id: MAPBOX_CLUSTER_COUNT_LAYER_ID,
        type: 'symbol',
        source: MAPBOX_MARKER_SOURCE_ID,
        filter: ['has', 'point_count'],
        layout: {
            'text-field': ['format', ['get', 'point_count_abbreviated'], {}],
            'text-font': ['Open Sans Semibold', 'Arial Unicode MS Bold'],
            'text-size': 14,
        },
        paint: {
            'text-color': '#fff',
            'text-opacity-transition': {
                duration: 320,
                delay: 0,
            },
        },
    });

    map.addLayer({
        id: MAPBOX_CLUSTER_SYMBOL_LAYER_ID,
        type: 'symbol',
        source: MAPBOX_MARKER_SOURCE_ID,
        filter: ['!', ['has', 'point_count']],
        layout: {
            'icon-image': ['coalesce', ['get', 'iconImage'], getMarkerImageId('default')],
            'icon-anchor': 'bottom',
            'icon-allow-overlap': true,
            'icon-ignore-placement': true,
            'icon-size': 1.5,
        },
        paint: {
            'icon-opacity': 1,
            'icon-halo-color': [
                'case',
                ['boolean', ['feature-state', 'selected'], false],
                'rgba(220, 38, 38, 0.75)',
                'rgba(0, 0, 0, 0)',
            ],
            'icon-halo-width': [
                'case',
                ['boolean', ['feature-state', 'selected'], false],
                2.2,
                0,
            ],
            'icon-halo-blur': 0.6,
            'icon-opacity-transition': {
                duration: 380,
                delay: 0,
            },
            'icon-halo-width-transition': {
                duration: 380,
                delay: 0,
            },
        },
    });

    map.addSource(MAPBOX_UNCLUSTERED_SOURCE_ID, {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
        promoteId: 'featureId',
    });

    map.addLayer({
        id: MAPBOX_UNCLUSTERED_LAYER_ID,
        type: 'symbol',
        source: MAPBOX_UNCLUSTERED_SOURCE_ID,
        layout: {
            'icon-image': ['coalesce', ['get', 'iconImage'], getMarkerImageId('default')],
            'icon-anchor': 'bottom',
            'icon-allow-overlap': true,
            'icon-ignore-placement': true,
            'icon-size': 1.5,
            'visibility': 'none',
        },
        paint: {
            'icon-opacity': 1,
            'icon-halo-color': [
                'case',
                ['boolean', ['feature-state', 'selected'], false],
                'rgba(220, 38, 38, 0.75)',
                'rgba(0, 0, 0, 0)',
            ],
            'icon-halo-width': [
                'case',
                ['boolean', ['feature-state', 'selected'], false],
                2.2,
                0,
            ],
            'icon-halo-blur': 0.6,
        },
    });

    map.addSource(MAPBOX_TRIP_SOURCE_ID, {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
        promoteId: 'featureId',
    });

    map.addLayer({
        id: MAPBOX_TRIP_LAYER_ID,
        type: 'symbol',
        source: MAPBOX_TRIP_SOURCE_ID,
        layout: {
            'icon-image': ['coalesce', ['get', 'iconImage'], getMarkerImageId('default')],
            'icon-anchor': 'bottom',
            'icon-allow-overlap': true,
            'icon-ignore-placement': true,
            'icon-size': 1.5,
            'visibility': 'none',
        },
        paint: {
            'icon-opacity': 1,
            'icon-halo-color': 'rgba(245, 158, 11, 0.85)',
            'icon-halo-width': 2.4,
            'icon-halo-blur': 0.6,
        },
    });

    map.on('mouseenter', MAPBOX_CLUSTER_LAYER_ID, () => {
        map.getCanvas().style.cursor = 'pointer';
    });
    map.on('mouseleave', MAPBOX_CLUSTER_LAYER_ID, () => {
        map.getCanvas().style.cursor = '';
    });

    registerMarkerLayerInteractions();
    registerTripLayerInteractions();

    map.on('click', MAPBOX_CLUSTER_LAYER_ID, (event) => {
        if (!isClusteringEnabled) { return; }
        const feature = event.features && event.features[0];
        if (!feature) { return; }
        const clusterId = feature.properties && feature.properties.cluster_id;
        const pointCount = feature.properties && feature.properties.point_count;
        const source = getMarkerSource();
        if (!source || typeof source.getClusterExpansionZoom !== 'function') { return; }
        fetchAllClusterLeaves(source, clusterId, pointCount)
            .then((leaves) => {
                const fitted = fitBoundsToClusterLeaves(leaves, { duration: 900 });
                if (!fitted) {
                    throw new Error('Unable to calculate cluster bounds.');
                }
            })
            .catch((boundsError) => {
                console.warn('Failed to derive cluster bounds; falling back to expansion zoom.', boundsError);
                source.getClusterExpansionZoom(clusterId, (error, zoom) => {
                    if (error || typeof zoom !== 'number') {
                        console.warn('Failed to expand cluster', error);
                        return;
                    }
                    map.easeTo({
                        center: feature.geometry.coordinates,
                        zoom,
                        duration: 600,
                    });
                });
            });
    });

}

function buildMarkerFeatures(markerRecords) {
    const features = [];
    markerFeatureIdLookup.clear();
    markerFeatureIdCounter = 1;
    markerRecords.forEach((record) => {
        const lat = Number(record.lat);
        const lng = Number(record.lng);
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
            return;
        }
        const markerIdRaw = record.id ?? record.place_id ?? '';
        const markerId = typeof markerIdRaw === 'string'
            ? markerIdRaw.trim()
            : String(markerIdRaw || '').trim();
        if (!markerId) {
            return;
        }

        const featureId = markerFeatureIdCounter++;
        const sourceType = record.source_type || 'default';
        const imageId = getMarkerImageId(sourceType);

        markerFeatureIdLookup.set(markerId, featureId);
        mapMarkerLookup.set(markerId, {
            markerId,
            featureId,
            coordinates: [lng, lat],
        });
        const displayNameRaw = record.display_name ?? record.alias ?? record.place ?? '';
        const displayName = typeof displayNameRaw === 'string'
            ? displayNameRaw.trim()
            : String(displayNameRaw || '').trim();
        const markerRecord = Object.assign({}, record, {
            id: markerId,
            lat,
            lng,
            display_name: displayName,
        });
        mapMarkerData.set(markerId, markerRecord);

        features.push({
            type: 'Feature',
            id: featureId,
            geometry: {
                type: 'Point',
                coordinates: [lng, lat],
            },
            properties: {
                markerId,
                sourceType,
                iconImage: imageId,
            },
        });
    });
    return features;
}

function setMarkerSourceData(features) {
    const clusterSource = getMarkerSource();
    const unclusteredSource = getUnclusteredSource();
    if (!clusterSource && !unclusteredSource) {
        console.warn('Marker sources are not ready; skipping data update.');
        return;
    }
    if (clusterSource) {
        clusterSource.setData({
            type: 'FeatureCollection',
            features,
        });
    }
    if (unclusteredSource) {
        const unclusteredFeatures = features
            .map((feature) => {
                const coords = feature.geometry && Array.isArray(feature.geometry.coordinates)
                    ? feature.geometry.coordinates.slice()
                    : null;
                if (!coords) { return null; }
                return {
                    type: 'Feature',
                    id: feature.id,
                    geometry: {
                        type: 'Point',
                        coordinates: coords,
                    },
                    properties: Object.assign({}, feature.properties),
                };
            })
            .filter(Boolean);
        unclusteredSource.setData({
            type: 'FeatureCollection',
            features: unclusteredFeatures,
        });
    }
}

function getActiveTripMarkerIds() {
    const selectedTripId = tripDetailState && tripDetailState.selectedTripId
        ? String(tripDetailState.selectedTripId).trim()
        : '';
    if (!selectedTripId) { return null; }
    const ids = new Set();

    mapMarkerData.forEach((record, markerId) => {
        const memberships = Array.isArray(record && record.trips) ? record.trips : [];
        const hasTrip = memberships.some((entry) => {
            const membership = normaliseTripMembership(entry);
            return membership && membership.id === selectedTripId;
        });
        if (hasTrip && markerId) {
            ids.add(markerId);
        }
    });

    const locations = Array.isArray(tripDetailState && tripDetailState.locations)
        ? tripDetailState.locations
        : [];
    locations.forEach((location) => {
        if (!location || typeof location !== 'object') { return; }
        const rawId = location.place_id ?? location.id ?? location.key ?? '';
        const value = typeof rawId === 'string' ? rawId.trim() : String(rawId || '').trim();
        if (value) { ids.add(value); }
    });

    return ids;
}

function applyActiveMarkerFilter() {
    const baseFeatures = Array.isArray(markerSourceFeaturesAll) ? markerSourceFeaturesAll : [];
    const selectedTripId = tripDetailState && tripDetailState.selectedTripId
        ? String(tripDetailState.selectedTripId).trim()
        : '';

    if (!selectedTripId) {
        setMarkerSourceData(baseFeatures);
        return;
    }

    const markerIds = getActiveTripMarkerIds();
    if (!markerIds || markerIds.size === 0) {
        setMarkerSourceData([]);
        return;
    }

    const filteredFeatures = baseFeatures.filter((feature) => {
        const markerId = feature && feature.properties ? feature.properties.markerId : '';
        return markerId && markerIds.has(markerId);
    });
    setMarkerSourceData(filteredFeatures);
}

function fetchAllClusterLeaves(source, clusterId, pointCount) {
    const leaves = [];
    const pageSize = 100;
    const total = Number.isFinite(pointCount) && pointCount > 0 ? pointCount : 1000;
    return new Promise((resolve, reject) => {
        const fetchPage = (offset) => {
            source.getClusterLeaves(clusterId, pageSize, offset, (error, features = []) => {
                if (error) {
                    reject(error);
                    return;
                }
                leaves.push(...features);
                if (leaves.length >= total || features.length < pageSize) {
                    resolve(leaves);
                } else {
                    fetchPage(leaves.length);
                }
            });
        };
        fetchPage(0);
    });
}

function fitBoundsToClusterLeaves(leaves, options = {}) {
    if (!map || !Array.isArray(leaves) || leaves.length === 0) {
        return false;
    }
    if (leaves.length === 1 && leaves[0] && leaves[0].geometry) {
        map.easeTo({
            center: leaves[0].geometry.coordinates,
            zoom: Math.min(map.getZoom() + 2, MAP_TILE_MAX_ZOOM),
            duration: options.duration ?? 600,
        });
        return true;
    }
    const bounds = leaves.reduce((acc, feature) => {
        if (feature && feature.geometry && Array.isArray(feature.geometry.coordinates)) {
            acc.extend(feature.geometry.coordinates);
        }
        return acc;
    }, new mapboxgl.LngLatBounds());
    if (bounds.isEmpty()) {
        return false;
    }
    map.fitBounds(bounds, {
        padding: 80,
        duration: options.duration ?? 600,
        maxZoom: MAP_TILE_MAX_ZOOM,
    });
    return true;
}

function updateMarkerFeatureHighlight(markerId, highlighted) {
    if (!map) { return; }
    const featureId = markerFeatureIdLookup.get(markerId);
    if (featureId === undefined || featureId === null) { return; }
    try {
        map.setFeatureState(
            { source: MAPBOX_MARKER_SOURCE_ID, id: featureId },
            { selected: highlighted },
        );
    } catch (error) {
        console.debug('Unable to update marker highlight state', error);
    }
    try {
        map.setFeatureState(
            { source: MAPBOX_UNCLUSTERED_SOURCE_ID, id: featureId },
            { selected: highlighted },
        );
    } catch (error) {
        // Ignore missing unclustered feature state errors
    }
}

function clearAllMarkerFeatureStates() {
    if (!map) { return; }
    markerFeatureIdLookup.forEach((featureId) => {
        try {
            map.removeFeatureState({ source: MAPBOX_MARKER_SOURCE_ID, id: featureId });
        } catch (error) {
            // Ignore errors while clearing stale feature states
        }
        try {
            map.removeFeatureState({ source: MAPBOX_UNCLUSTERED_SOURCE_ID, id: featureId });
        } catch (error) {
            // Ignore errors for the unclustered source as well
        }
    });
}

function setLayerVisibility(layerId, visible) {
    if (!map || !map.getLayer(layerId)) { return; }
    const desired = visible ? 'visible' : 'none';
    const current = map.getLayoutProperty(layerId, 'visibility');
    if (current !== desired) {
        map.setLayoutProperty(layerId, 'visibility', desired);
    }
}

function applyClusterLayerVisibility() {
    if (!map) { return; }
    const showClusters = isClusteringEnabled && !isTripMapModeActive;
    const showUnclustered = !isClusteringEnabled || isTripMapModeActive;
    setLayerVisibility(MAPBOX_CLUSTER_LAYER_ID, showClusters);
    setLayerVisibility(MAPBOX_CLUSTER_COUNT_LAYER_ID, showClusters);
    setLayerVisibility(MAPBOX_CLUSTER_SYMBOL_LAYER_ID, showClusters);
    setLayerVisibility(MAPBOX_UNCLUSTERED_LAYER_ID, showUnclustered);
}

function setClusteringEnabled(enabled) {
    pendingClusterToggleState = enabled;
    isClusteringEnabled = enabled;
    if (!map) { return; }
    applyClusterLayerVisibility();
}

function registerMarkerLayerInteractions() {
    if (!map) { return; }
    const interactionLayers = [MAPBOX_CLUSTER_SYMBOL_LAYER_ID, MAPBOX_UNCLUSTERED_LAYER_ID];
    interactionLayers.forEach((layerId) => {
        map.on('mouseenter', layerId, () => {
            map.getCanvas().style.cursor = 'pointer';
        });
        map.on('mouseleave', layerId, () => {
            map.getCanvas().style.cursor = '';
        });
        map.on('click', layerId, (event) => handleMarkerLayerClick(event, layerId));
    });
}

function handleMarkerLayerClick(event, layerId) {
    const features = map.queryRenderedFeatures(event.point, { layers: [layerId] });
    if (!features || !features.length) { return; }

    const feature = features[0];
    const markerId = feature.properties ? feature.properties.markerId : '';
    const markerData = markerId ? mapMarkerData.get(markerId) : null;
    if (!markerData) { return; }

    openMarkerPopupAt(markerData, feature.geometry.coordinates);
}

function openMarkerPopupAt(markerData, coordinates) {
    if (!map || !markerData || !Array.isArray(coordinates)) { return; }
    const popupHtml = createPopupContent(markerData);
    if (!popupHtml) { return; }

    closeActivePopup();
    activePopup = new mapboxgl.Popup({
        closeButton: true,
        offset: 28,
        className: MAPBOX_POPUP_CLASS,
        maxWidth: '320px',
    }).setLngLat(coordinates)
        .setHTML(popupHtml)
        .addTo(map);

    attachMarkerPopupActions(activePopup, markerData, null);
}

function registerTripLayerInteractions() {
    if (!map) { return; }
    map.on('mouseenter', MAPBOX_TRIP_LAYER_ID, () => {
        map.getCanvas().style.cursor = 'pointer';
    });
    map.on('mouseleave', MAPBOX_TRIP_LAYER_ID, () => {
        map.getCanvas().style.cursor = '';
    });
    map.on('click', MAPBOX_TRIP_LAYER_ID, (event) => {
        const features = map.queryRenderedFeatures(event.point, { layers: [MAPBOX_TRIP_LAYER_ID] });
        if (!features || !features.length) { return; }

        const feature = features[0];
        const markerKey = feature.properties ? feature.properties.tripMarkerKey : '';
        const entry = markerKey ? tripMarkerLookup.get(markerKey) : null;
        if (!entry || !entry.markerData) { return; }
        openMarkerPopupAt(entry.markerData, feature.geometry.coordinates);
    });
}

function closeMarkerPopup(marker) {
    if (marker && typeof marker.getPopup === 'function') {
        const popup = marker.getPopup();
        if (popup && typeof popup.remove === 'function') {
            popup.remove();
            return;
        }
    }
    closeActivePopup();
}

function closeActivePopup() {
    if (activePopup && typeof activePopup.remove === 'function') {
        activePopup.remove();
    }
    activePopup = null;
}

function isManageModeActive() {
    return Boolean(manageModeState && manageModeState.active);
}

function initManageModeControls() {
    manageModeToggleButtons = Array.from(document.querySelectorAll('[data-manage-mode-toggle]'));
    selectionToolbarElement = document.getElementById('selectionToolbar');
    selectionCountElement = document.getElementById('selectionCount');
    selectionClearButton = document.getElementById('selectionClearButton');
    selectionExitButton = document.getElementById('selectionExitButton');
    selectionAddToTripButton = document.getElementById('selectionAddToTripButton');
    selectionRemoveTripsButton = document.getElementById('selectionRemoveTripsButton');
    selectionArchiveButton = document.getElementById('selectionArchiveButton');
    selectionDeleteButton = document.getElementById('selectionDeleteButton');

    if (manageModeToggleButtons.length > 0) {
        manageModeToggleButtons.forEach((button) => {
            if (!button.dataset.manageModeLabelDefault) {
                button.dataset.manageModeLabelDefault = button.textContent.trim();
            }

            button.addEventListener('click', (event) => {
                event.preventDefault();
                if (!MAPBOX_MIGRATION_ENABLE_MANAGE_MODE) {
                    showStatus('Manage mode will return once the Mapbox upgrade is complete.', true);
                    return;
                }
                toggleManageMode();
            });
            button.setAttribute('aria-pressed', 'false');
            setManageModeButtonLabel(button, false);
        });
    }

    if (selectionClearButton) {
        selectionClearButton.addEventListener('click', (event) => {
            event.preventDefault();
            clearSelectedMarkers();
        });
    }

    if (selectionExitButton) {
        selectionExitButton.addEventListener('click', (event) => {
            event.preventDefault();
            exitManageMode();
        });
    }

    if (selectionAddToTripButton) {
        selectionAddToTripButton.addEventListener('click', (event) => {
            event.preventDefault();
            handleSelectionAddToTrip();
        });
    }

    if (selectionRemoveTripsButton) {
        selectionRemoveTripsButton.addEventListener('click', (event) => {
            event.preventDefault();
            handleSelectionRemoveFromTrips();
        });
    }

    if (selectionArchiveButton) {
        selectionArchiveButton.addEventListener('click', (event) => {
            event.preventDefault();
            handleSelectionArchive();
        });
    }

    if (selectionDeleteButton) {
        selectionDeleteButton.addEventListener('click', (event) => {
            event.preventDefault();
            handleSelectionDelete();
        });
    }

    if (selectionToolbarElement) {
        ['mousedown', 'touchstart', 'click'].forEach((eventName) => {
            selectionToolbarElement.addEventListener(eventName, (event) => {
                event.stopPropagation();
            });
        });
    }

    if (!manageModeState.keyHandlerAttached) {
        document.addEventListener('keydown', handleManageModeKeyDown);
        manageModeState.keyHandlerAttached = true;
    }

    updateManageModeToggleState();
    updateSelectionSummary();
}

function setManageModeButtonLabel(button, active) {
    if (!button) { return; }
    const defaultLabel = button.dataset.manageModeLabelDefault;
    const activeLabel = button.dataset.manageModeLabelActive;
    const label = active ? (activeLabel || defaultLabel) : (defaultLabel || activeLabel);
    if (label && button.textContent !== label) {
        button.textContent = label;
    }
}

function updateManageModeToggleState() {
    if (!Array.isArray(manageModeToggleButtons) || manageModeToggleButtons.length === 0) { return; }
    const active = isManageModeActive();
    manageModeToggleButtons.forEach((button) => {
        const activeClass = button.dataset.manageModeActiveClass || 'overlay-button-active';
        button.classList.toggle(activeClass, active);
        button.setAttribute('aria-pressed', active ? 'true' : 'false');
        setManageModeButtonLabel(button, active);
    });
}

function setupManageModeMapInteractions() {
    if (!MAPBOX_MIGRATION_ENABLE_MANAGE_MODE) { return; }
    if (!map || manageModeState.mapHandlersAttached) { return; }

    map.on('mousedown', handleManageModeMouseDown);
    map.on('mousemove', handleManageModeMouseMove);
    map.on('mouseup', handleManageModeMouseUp);

    const container = map.getContainer();
    if (container) {
        container.addEventListener('mouseleave', handleManageModeMouseLeave);
    }

    manageModeState.mapHandlersAttached = true;
}

function handleManageModeKeyDown(event) {
    if (!event || !isManageModeActive()) { return; }

    const key = typeof event.key === 'string' ? event.key : (typeof event.code === 'string' ? event.code : '');
    if (key !== 'Escape' && key !== 'Esc') { return; }
    if (event.defaultPrevented) { return; }

    const openModal = document.querySelector('.modal-overlay.open');
    if (openModal) { return; }

    exitManageMode();
    if (typeof event.stopImmediatePropagation === 'function') {
        event.stopImmediatePropagation();
    }
    event.stopPropagation();
    event.preventDefault();
}

function enterManageMode() {
    if (!MAPBOX_MIGRATION_ENABLE_MANAGE_MODE) {
        showStatus('Manage mode features are temporarily unavailable during the Mapbox upgrade.', true);
        return;
    }
    if (!map) {
        showStatus('Map is still loading. Please try again.', true);
        return;
    }

    if (isManageModeActive()) { return; }

    setupManageModeMapInteractions();

    manageModeState.active = true;
    manageModeState.dragCurrentLatLng = null;
    manageModeState.dragCurrentPoint = null;
    manageModeState.isMiddlePanning = false;
    manageModeState.middlePanLastPoint = null;
    if (map.dragging && typeof map.dragging.enabled === 'function') {
        manageModeState.interactionState.dragging = map.dragging.enabled();
        map.dragging.disable();
    }
    if (map.boxZoom && typeof map.boxZoom.enabled === 'function') {
        manageModeState.interactionState.boxZoom = map.boxZoom.enabled();
        map.boxZoom.disable();
    }
    if (map.doubleClickZoom && typeof map.doubleClickZoom.enabled === 'function') {
        manageModeState.interactionState.doubleClickZoom = map.doubleClickZoom.enabled();
        map.doubleClickZoom.disable();
    }

    const container = map.getContainer();
    if (container) {
        container.classList.add('manage-mode-active');
    }

    if (selectionToolbarElement) {
        selectionToolbarElement.hidden = false;
        selectionToolbarElement.classList.add('open');
    }

    updateManageModeToggleState();
    updateSelectionSummary();
}

function exitManageMode() {
    if (!isManageModeActive()) { return; }

    manageModeState.active = false;
    manageModeState.isDragging = false;
    manageModeState.isMiddlePanning = false;
    manageModeState.dragCurrentLatLng = null;
    manageModeState.dragCurrentPoint = null;
    manageModeState.middlePanLastPoint = null;

    if (map) {
        if (map.dragging && typeof map.dragging.enable === 'function') {
            if (manageModeState.interactionState.dragging) {
                map.dragging.enable();
            } else {
                map.dragging.disable();
            }
        }
        if (map.boxZoom && typeof map.boxZoom.enable === 'function') {
            if (manageModeState.interactionState.boxZoom) {
                map.boxZoom.enable();
            } else {
                map.boxZoom.disable();
            }
        }
        if (map.doubleClickZoom && typeof map.doubleClickZoom.enable === 'function') {
            if (manageModeState.interactionState.doubleClickZoom) {
                map.doubleClickZoom.enable();
            } else {
                map.doubleClickZoom.disable();
            }
        }

        if (manageModeState.selectionRectangle) {
            map.removeLayer(manageModeState.selectionRectangle);
            manageModeState.selectionRectangle = null;
        }

        const container = map.getContainer();
        if (container) {
            container.classList.remove('manage-mode-active');
        }
    }

    if (selectionToolbarElement) {
        selectionToolbarElement.classList.remove('open');
        selectionToolbarElement.hidden = true;
    }

    clearSelectedMarkers();
    updateManageModeToggleState();
}

function toggleManageMode() {
    if (!MAPBOX_MIGRATION_ENABLE_MANAGE_MODE) {
        showStatus('Manage mode features are temporarily unavailable during the Mapbox upgrade.', true);
        return;
    }
    if (isManageModeActive()) {
        exitManageMode();
    } else {
        enterManageMode();
    }
}

function getSelectedMarkerIds() {
    return Array.from(manageModeState.selectedIds || []);
}

function clearSelectedMarkers() {
    if (!manageModeState.selectedIds) { return; }
    manageModeState.selectedIds.forEach((id) => {
        const marker = mapMarkerLookup.get(id);
        if (marker) { removeHighlightFromMarker(marker); }
    });
    manageModeState.selectedIds.clear();
    updateSelectionSummary();
}

function updateSelectionSummary() {
    const count = manageModeState.selectedIds ? manageModeState.selectedIds.size : 0;
    if (selectionCountElement) {
        selectionCountElement.textContent = String(count);
    }

    const hasSelection = count > 0;
    if (selectionAddToTripButton) { selectionAddToTripButton.disabled = !hasSelection; }
    if (selectionRemoveTripsButton) { selectionRemoveTripsButton.disabled = !hasSelection; }
    if (selectionArchiveButton) { selectionArchiveButton.disabled = !hasSelection; }
    if (selectionDeleteButton) { selectionDeleteButton.disabled = !hasSelection; }
}

function setSelectionActionsDisabled(disabled) {
    const hasSelection = manageModeState.selectedIds.size > 0;
    [
        selectionAddToTripButton,
        selectionRemoveTripsButton,
        selectionArchiveButton,
        selectionDeleteButton,
    ].forEach((button) => {
        if (!button) { return; }
        if (disabled) {
            button.disabled = true;
        } else {
            button.disabled = !hasSelection;
        }
    });
}

function selectMarkerById(markerId) {
    const id = typeof markerId === 'string' ? markerId.trim() : String(markerId || '').trim();
    if (!id || manageModeState.selectedIds.has(id)) { return; }
    manageModeState.selectedIds.add(id);
    const marker = mapMarkerLookup.get(id);
    if (marker) { highlightMarker(marker); }
}

function deselectMarkerById(markerId) {
    const id = typeof markerId === 'string' ? markerId.trim() : String(markerId || '').trim();
    if (!id || !manageModeState.selectedIds.has(id)) { return; }
    manageModeState.selectedIds.delete(id);
    const marker = mapMarkerLookup.get(id);
    if (marker) { removeHighlightFromMarker(marker); }
}

function toggleMarkerSelectionById(markerId) {
    if (!isManageModeActive()) { return; }
    const id = typeof markerId === 'string' ? markerId.trim() : String(markerId || '').trim();
    if (!id) { return; }
    if (manageModeState.selectedIds.has(id)) {
        deselectMarkerById(id);
    } else {
        selectMarkerById(id);
    }
    updateSelectionSummary();
}

function highlightMarker(marker) {
    if (!marker) { return; }
    if (marker.markerId) {
        updateMarkerFeatureHighlight(marker.markerId, true);
    }
}

function removeHighlightFromMarker(marker) {
    if (!marker) { return; }
    if (marker.markerId) {
        updateMarkerFeatureHighlight(marker.markerId, false);
    }
}

function refreshSelectionAfterDataLoad() {
    if (!manageModeState.selectedIds || manageModeState.selectedIds.size === 0) {
        updateSelectionSummary();
        return;
    }

    const validIds = new Set(mapMarkerData.keys());
    const idsToRemove = [];

    manageModeState.selectedIds.forEach((id) => {
        if (!validIds.has(id)) {
            idsToRemove.push(id);
            return;
        }
        const marker = mapMarkerLookup.get(id);
        if (marker) { highlightMarker(marker); }
    });

    idsToRemove.forEach((id) => manageModeState.selectedIds.delete(id));
    updateSelectionSummary();
}

function applySelectionBounds(bounds, mode = 'add') {
    if (!bounds || typeof bounds.contains !== 'function') { return; }

    const ids = [];
    mapMarkerData.forEach((data, id) => {
        if (!id) { return; }
        const latitude = Number(data.lat ?? data.latitude);
        const longitude = Number(data.lng ?? data.longitude);
        if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) { return; }
        const latLng = L.latLng(latitude, longitude);
        if (bounds.contains(latLng)) {
            ids.push(id);
        }
    });

    if (!ids.length) { return; }

    if (mode === 'remove') {
        ids.forEach((id) => deselectMarkerById(id));
    } else {
        ids.forEach((id) => selectMarkerById(id));
    }

    updateSelectionSummary();
}

function finalizeManageModeDrag(endLatLng, endPoint) {
    const startLatLng = manageModeState.dragStartLatLng;
    const startPoint = manageModeState.dragStartPoint;

    manageModeState.isDragging = false;
    manageModeState.dragStartLatLng = null;
    manageModeState.dragStartPoint = null;
    manageModeState.dragCurrentLatLng = null;
    manageModeState.dragCurrentPoint = null;

    if (map && manageModeState.selectionRectangle) {
        map.removeLayer(manageModeState.selectionRectangle);
        manageModeState.selectionRectangle = null;
    }

    if (!startLatLng || !endLatLng) { return; }

    if (startPoint && endPoint) {
        const dx = Math.abs(endPoint.x - startPoint.x);
        const dy = Math.abs(endPoint.y - startPoint.y);
        if (dx < MANAGE_MODE_DRAG_THRESHOLD && dy < MANAGE_MODE_DRAG_THRESHOLD) {
            return;
        }
    }

    const bounds = L.latLngBounds(startLatLng, endLatLng);
    if (!bounds.isValid()) { return; }

    applySelectionBounds(bounds, manageModeState.dragMode);
}

function startManageModeMiddlePan(event) {
    if (!map || manageModeState.isMiddlePanning) { return; }

    manageModeState.isMiddlePanning = true;
    manageModeState.middlePanLastPoint = event && event.containerPoint
        ? { x: event.containerPoint.x, y: event.containerPoint.y }
        : null;

    if (event && event.originalEvent) {
        if (typeof event.originalEvent.preventDefault === 'function') {
            event.originalEvent.preventDefault();
        }
        if (typeof event.originalEvent.stopPropagation === 'function') {
            event.originalEvent.stopPropagation();
        }
    }
}

function handleManageModeMiddlePanMove(event) {
    if (!map || !manageModeState.isMiddlePanning || !event) { return; }

    const currentPoint = event.containerPoint
        ? { x: event.containerPoint.x, y: event.containerPoint.y }
        : null;
    if (!currentPoint) {
        manageModeState.middlePanLastPoint = null;
        return;
    }

    const previousPoint = manageModeState.middlePanLastPoint;
    manageModeState.middlePanLastPoint = currentPoint;

    if (!previousPoint) { return; }

    const dx = previousPoint.x - currentPoint.x;
    const dy = previousPoint.y - currentPoint.y;
    if (dx === 0 && dy === 0) { return; }

    map.panBy([dx, dy], { animate: false });

    if (event.originalEvent && typeof event.originalEvent.preventDefault === 'function') {
        event.originalEvent.preventDefault();
    }
}

function endManageModeMiddlePan() {
    if (!manageModeState.isMiddlePanning) { return; }
    manageModeState.isMiddlePanning = false;
    manageModeState.middlePanLastPoint = null;
}

function handleManageModeMouseDown(event) {
    if (!isManageModeActive() || !event || !event.originalEvent) { return; }

    if (event.originalEvent.button === 1) {
        startManageModeMiddlePan(event);
        return;
    }

    if (event.originalEvent.button !== 0) { return; }

    manageModeState.isDragging = true;
    manageModeState.dragStartLatLng = event.latlng || null;
    manageModeState.dragStartPoint = event.containerPoint
        ? { x: event.containerPoint.x, y: event.containerPoint.y }
        : null;
    manageModeState.dragMode = event.originalEvent.altKey ? 'remove' : 'add';
    manageModeState.dragCurrentLatLng = manageModeState.dragStartLatLng;
    manageModeState.dragCurrentPoint = manageModeState.dragStartPoint
        ? { ...manageModeState.dragStartPoint }
        : null;

    if (manageModeState.selectionRectangle && map) {
        map.removeLayer(manageModeState.selectionRectangle);
        manageModeState.selectionRectangle = null;
    }

    if (event.originalEvent.preventDefault) {
        event.originalEvent.preventDefault();
    }
}

function handleManageModeMouseMove(event) {
    if (!isManageModeActive() || !map) { return; }

    if (manageModeState.isMiddlePanning) {
        handleManageModeMiddlePanMove(event);
        return;
    }

    if (!manageModeState.isDragging || !manageModeState.dragStartLatLng || !event || !event.latlng) {
        return;
    }

    manageModeState.dragCurrentLatLng = event.latlng;
    manageModeState.dragCurrentPoint = event.containerPoint
        ? { x: event.containerPoint.x, y: event.containerPoint.y }
        : manageModeState.dragCurrentPoint;

    const bounds = L.latLngBounds(manageModeState.dragStartLatLng, event.latlng);
    if (!manageModeState.selectionRectangle) {
        manageModeState.selectionRectangle = L.rectangle(bounds, {
            color: '#2563eb',
            weight: 1.2,
            dashArray: '6',
            fillOpacity: 0.08,
            fillColor: '#60a5fa',
            interactive: false,
        }).addTo(map);
    } else {
        manageModeState.selectionRectangle.setBounds(bounds);
    }
}

function handleManageModeMouseUp(event) {
    if (manageModeState.isMiddlePanning) {
        endManageModeMiddlePan();
        if (event && event.originalEvent && typeof event.originalEvent.preventDefault === 'function') {
            event.originalEvent.preventDefault();
        }
        return;
    }

    if (!manageModeState.isDragging) { return; }

    let endLatLng = event && event.latlng ? event.latlng : null;
    if (!endLatLng && map && event && event.originalEvent) {
        try {
            endLatLng = map.mouseEventToLatLng(event.originalEvent);
        } catch (error) {
            endLatLng = null;
        }
    }
    if (!endLatLng) {
        endLatLng = manageModeState.dragCurrentLatLng || null;
    }

    let endPoint = event && event.containerPoint
        ? { x: event.containerPoint.x, y: event.containerPoint.y }
        : null;
    if (!endPoint && manageModeState.dragCurrentPoint) {
        endPoint = { ...manageModeState.dragCurrentPoint };
    }

    finalizeManageModeDrag(endLatLng, endPoint);
}

function handleManageModeMouseLeave() {
    if (manageModeState.isMiddlePanning) {
        endManageModeMiddlePan();
    }

    if (!manageModeState.isDragging) { return; }
    const fallbackLatLng = manageModeState.dragCurrentLatLng || manageModeState.dragStartLatLng;
    const fallbackPoint = manageModeState.dragCurrentPoint
        ? { ...manageModeState.dragCurrentPoint }
        : (manageModeState.dragStartPoint ? { ...manageModeState.dragStartPoint } : null);

    finalizeManageModeDrag(fallbackLatLng, fallbackPoint);
}

function handleSelectionAddToTrip() {
    if (!isManageModeActive()) { return; }
    const ids = getSelectedMarkerIds();
    if (!ids.length) {
        showStatus('Select at least one location first.', true);
        return;
    }

    const markers = ids
        .map((id) => mapMarkerData.get(id))
        .filter((entry) => entry && typeof entry === 'object');

    if (!markers.length) {
        showStatus('Selected locations are no longer available.', true);
        clearSelectedMarkers();
        return;
    }

    const triggerButton = selectionAddToTripButton || null;
    openTripAssignmentModal(markers.length === 1 ? markers[0] : markers, { triggerButton });
}

async function handleSelectionRemoveFromTrips() {
    if (!isManageModeActive()) { return; }
    const ids = getSelectedMarkerIds();
    if (!ids.length) {
        showStatus('Select at least one location first.', true);
        return;
    }

    const confirmationMessage = ids.length === 1
        ? 'Remove this location from all trips?'
        : `Remove ${ids.length} locations from all trips?`;

    if (!window.confirm(confirmationMessage)) { return; }

    setSelectionActionsDisabled(true);
    showLoading();

    try {
        const response = await fetch('/api/trips/clear_memberships', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ place_ids: ids }),
        });
        const result = await response.json().catch(() => ({}));

        if (!response.ok || result.status === 'error') {
            const message = (result && result.message) ? result.message : 'Failed to update trips.';
            throw new Error(message);
        }

        showStatus(result.message || 'Removed selection from trips.');
        await loadTripsPanelData();
        await loadMarkers();
    } catch (error) {
        console.error('Failed to clear trip memberships', error);
        showStatus(error.message || 'Failed to update trips.', true);
    } finally {
        hideLoading();
        setSelectionActionsDisabled(false);
    }
}

async function handleSelectionArchive() {
    if (!isManageModeActive()) { return; }
    const ids = getSelectedMarkerIds();
    if (!ids.length) {
        showStatus('Select at least one location first.', true);
        return;
    }

    const confirmMessage = ids.length === 1
        ? 'Archive this data point?'
        : `Archive ${ids.length} data points?`;

    if (!window.confirm(confirmMessage)) { return; }

    setSelectionActionsDisabled(true);
    showLoading();

    try {
        const response = await fetch('/api/markers/bulk/archive', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ place_ids: ids, archived: true }),
        });
        const result = await response.json().catch(() => ({}));

        if (!response.ok || result.status === 'error') {
            const message = (result && result.message) ? result.message : 'Failed to archive data points.';
            throw new Error(message);
        }

        showStatus(result.message || 'Data points archived successfully.');
        await loadMarkers();

        const archivedModalElement = document.getElementById('archivedPointsModal');
        if (archivedModalElement && archivedModalElement.classList.contains('open')) {
            await loadArchivedPointsList();
        }
    } catch (error) {
        console.error('Failed to archive data points', error);
        showStatus(error.message || 'Failed to archive data points.', true);
    } finally {
        hideLoading();
        setSelectionActionsDisabled(false);
    }
}

async function handleSelectionDelete() {
    if (!isManageModeActive()) { return; }
    const ids = getSelectedMarkerIds();
    if (!ids.length) {
        showStatus('Select at least one location first.', true);
        return;
    }

    const confirmMessage = ids.length === 1
        ? 'Deleting this data point is irreversible. Continue?'
        : `Deleting ${ids.length} data points is irreversible. Continue?`;

    if (!window.confirm(confirmMessage)) { return; }

    setSelectionActionsDisabled(true);
    showLoading();

    try {
        const response = await fetch('/api/markers/bulk/delete', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ place_ids: ids }),
        });
        const result = await response.json().catch(() => ({}));

        if (!response.ok || result.status === 'error') {
            const message = (result && result.message) ? result.message : 'Failed to delete data points.';
            throw new Error(message);
        }

        showStatus(result.message || 'Data points deleted successfully.');
        clearSelectedMarkers();
        await loadMarkers();
    } catch (error) {
        console.error('Failed to delete data points', error);
        showStatus(error.message || 'Failed to delete data points.', true);
    } finally {
        hideLoading();
        setSelectionActionsDisabled(false);
    }
}

function initTripsPanel() {
    if (tripListState.initialised) { return; }

    tripListContainer = document.getElementById('tripList');
    if (tripListContainer && !tripListContainer.hasAttribute('tabindex')) {
        tripListContainer.tabIndex = -1;
    }
    tripListLoadingElement = document.getElementById('tripListLoading');
    tripListErrorElement = document.getElementById('tripListError');
    tripListEmptyElement = document.getElementById('tripListEmpty');
    tripSearchInput = document.getElementById('tripSearchInput');
    tripSortFieldSelect = document.getElementById('tripSortField');
    tripSortDirectionButton = document.getElementById('tripSortDirection');
    tripListView = document.getElementById('tripListView');

    if (tripSearchInput) {
        tripSearchInput.addEventListener('input', () => {
            tripListState.searchTerm = tripSearchInput.value.trim().toLowerCase();
            resetTripListScrollPosition();
            renderTripList();
        });
    }

    if (tripSortFieldSelect) {
        tripSortFieldSelect.value = tripListState.sortField;
        tripSortFieldSelect.addEventListener('change', () => {
            const value = tripSortFieldSelect.value === TRIP_SORT_FIELD_DATE
                ? TRIP_SORT_FIELD_DATE
                : TRIP_SORT_FIELD_NAME;
            tripListState.sortField = value;
            resetTripListScrollPosition();
            renderTripList();
        });
    }

    if (tripSortDirectionButton) {
        tripSortDirectionButton.addEventListener('click', () => {
            tripListState.sortDirection = tripListState.sortDirection === TRIP_SORT_DIRECTION_ASC
                ? TRIP_SORT_DIRECTION_DESC
                : TRIP_SORT_DIRECTION_ASC;
            updateTripSortDirectionButton();
            resetTripListScrollPosition();
            renderTripList();
        });
        updateTripSortDirectionButton();
    }

    if (tripListContainer) {
        tripListContainer.addEventListener('click', handleTripListClick);
        tripListContainer.addEventListener('keydown', handleTripListKeydown);
        tripListContainer.addEventListener('scroll', () => {
            tripListState.scrollTop = tripListContainer.scrollTop;
            tripListState.preserveScroll = true;
        });
        tripListState.scrollTop = tripListContainer.scrollTop || 0;
    }

    tripListState.initialised = true;
    initTripDetailPanel();
}

function updateTripSortDirectionButton() {
    if (!tripSortDirectionButton) { return; }
    const isAscending = tripListState.sortDirection !== TRIP_SORT_DIRECTION_DESC;
    tripSortDirectionButton.textContent = isAscending ? 'Ascending' : 'Descending';
    tripSortDirectionButton.setAttribute('aria-label', isAscending ? 'Sort descending' : 'Sort ascending');
    tripSortDirectionButton.title = isAscending ? 'Switch to descending order' : 'Switch to ascending order';
}

function setTripListLoading(isLoading) {
    if (!tripListState.initialised) { initTripsPanel(); }
    if (tripListLoadingElement) {
        tripListLoadingElement.hidden = !isLoading;
    }
    if (!isLoading) { return; }
    if (tripListContainer) { tripListContainer.hidden = true; }
    if (tripListEmptyElement) { tripListEmptyElement.hidden = true; }
    if (tripListErrorElement) { tripListErrorElement.hidden = true; }
}

function clearTripListMessages() {
    if (tripListEmptyElement) { tripListEmptyElement.hidden = true; }
    if (tripListErrorElement) { tripListErrorElement.hidden = true; tripListErrorElement.textContent = ''; }
}

function hideTripListError() {
    if (tripListErrorElement) {
        tripListErrorElement.hidden = true;
        tripListErrorElement.textContent = '';
    }
}

function showTripListError(message) {
    if (!tripListState.initialised) { initTripsPanel(); }
    if (tripListLoadingElement) { tripListLoadingElement.hidden = true; }
    if (tripListErrorElement) {
        tripListErrorElement.textContent = message || 'Failed to load trips.';
        tripListErrorElement.hidden = false;
    }
    if (tripListContainer) { tripListContainer.hidden = true; }
    if (tripListEmptyElement) { tripListEmptyElement.hidden = true; }
}

function showTripListEmpty(message) {
    if (!tripListState.initialised) { initTripsPanel(); }
    if (tripListLoadingElement) { tripListLoadingElement.hidden = true; }
    if (tripListEmptyElement) {
        if (message) { tripListEmptyElement.textContent = message; }
        tripListEmptyElement.hidden = false;
    }
    if (tripListContainer) { tripListContainer.hidden = true; }
}

function computeTripPhotoKey(details, index) {
    if (details && typeof details === 'object') {
        const identifier = typeof details.id === 'string' ? details.id.trim() : '';
        if (identifier) { return `id:${identifier}`; }
        const downloadPrimary = typeof details.downloadUrl === 'string' ? details.downloadUrl.trim() : '';
        if (downloadPrimary) { return `download:${downloadPrimary}`; }
        const downloadAlt = typeof details.download_url === 'string' ? details.download_url.trim() : '';
        if (downloadAlt) { return `download:${downloadAlt}`; }
        const proxyCandidate = typeof details.proxyUrl === 'string' ? details.proxyUrl.trim() : '';
        if (proxyCandidate) { return `proxy:${proxyCandidate}`; }
        const baseCandidate = typeof details.baseUrl === 'string' ? details.baseUrl.trim() : '';
        if (baseCandidate) { return `base:${baseCandidate}`; }
        const baseAlt = typeof details.base_url === 'string' ? details.base_url.trim() : '';
        if (baseAlt) { return `base:${baseAlt}`; }
        const urlCandidate = typeof details.url === 'string' ? details.url.trim() : '';
        if (urlCandidate) { return `url:${urlCandidate}`; }
    }
    return `index:${index}`;
}

function normaliseTripPhotoItems(photoItems, fallbackUrls) {
    const items = Array.isArray(photoItems) ? photoItems : [];
    const fallbacks = Array.isArray(fallbackUrls) ? fallbackUrls : [];
    const seen = new Set();
    const result = [];

    const parseDimension = (value) => {
        if (value === null || value === undefined) { return null; }
        const numberValue = Number(value);
        if (Number.isFinite(numberValue) && numberValue > 0) {
            return Math.round(numberValue);
        }
        const integerValue = Number.parseInt(String(value), 10);
        return Number.isFinite(integerValue) && integerValue > 0 ? integerValue : null;
    };

    const addItem = (candidate) => {
        if (!candidate && candidate !== '') { return; }

        let url = '';
        let baseUrl = '';
        let proxyUrl = '';
        let downloadUrl = '';
        let productUrl = '';
        let filename = '';
        let mimeType = '';
        let width = null;
        let height = null;
        let id = '';

        if (typeof candidate === 'string') {
            url = candidate.trim();
            baseUrl = url;
        } else if (candidate && typeof candidate === 'object') {
            const raw = candidate;
            if (typeof raw.proxy_url === 'string') { proxyUrl = raw.proxy_url.trim(); }
            if (typeof raw.proxyUrl === 'string') { proxyUrl = raw.proxyUrl.trim() || proxyUrl; }
            if (typeof raw.url === 'string') { url = raw.url.trim(); }
            if (typeof raw.base_url === 'string') { baseUrl = raw.base_url.trim(); }
            if (!baseUrl && typeof raw.baseUrl === 'string') { baseUrl = raw.baseUrl.trim(); }
            if (typeof raw.download_url === 'string') { downloadUrl = raw.download_url.trim(); }
            if (!downloadUrl && typeof raw.downloadUrl === 'string') { downloadUrl = raw.downloadUrl.trim(); }
            if (!url && proxyUrl) { url = proxyUrl; }
            if (!url && downloadUrl) { url = downloadUrl; }
            if (!url && baseUrl) { url = baseUrl; }
            if (!url && raw.mediaItem && typeof raw.mediaItem === 'object') {
                const mediaItem = raw.mediaItem;
                if (typeof mediaItem.url === 'string') { url = mediaItem.url.trim(); }
                if (!url && typeof mediaItem.baseUrl === 'string') { url = mediaItem.baseUrl.trim(); }
                if (!baseUrl && typeof mediaItem.baseUrl === 'string') { baseUrl = mediaItem.baseUrl.trim(); }
            }
            if (typeof raw.product_url === 'string') { productUrl = raw.product_url.trim(); }
            if (!productUrl && typeof raw.productUrl === 'string') { productUrl = raw.productUrl.trim(); }
            if (typeof raw.filename === 'string') { filename = raw.filename.trim(); }
            if (!filename && typeof raw.mediaItemFilename === 'string') { filename = raw.mediaItemFilename.trim(); }
            if (typeof raw.mime_type === 'string') { mimeType = raw.mime_type.trim(); }
            if (!mimeType && typeof raw.mimeType === 'string') { mimeType = raw.mimeType.trim(); }
            width = parseDimension(
                raw.width !== undefined ? raw.width
                    : (raw.mediaItem && typeof raw.mediaItem === 'object' ? raw.mediaItem.width : undefined),
            );
            height = parseDimension(
                raw.height !== undefined ? raw.height
                    : (raw.mediaItem && typeof raw.mediaItem === 'object' ? raw.mediaItem.height : undefined),
            );
            if (typeof raw.id === 'string') { id = raw.id.trim(); }
        } else {
            return;
        }

        if (!url) { return; }
        const dedupeKey = id || url || baseUrl;
        if (dedupeKey && seen.has(dedupeKey)) { return; }
        if (dedupeKey) { seen.add(dedupeKey); }

        const normalised = {
            id: id || null,
            url,
            proxyUrl,
            downloadUrl,
            baseUrl: baseUrl || url,
            productUrl: productUrl || '',
            filename: filename || '',
            mimeType: mimeType || '',
            width,
            height,
        };
        normalised.key = computeTripPhotoKey(normalised, result.length);
        result.push(normalised);
    };

    items.forEach(addItem);
    fallbacks.forEach(addItem);

    return result;
}

function getCurrentTripPhotoItems() {
    return Array.isArray(tripDetailState.photoItems) ? tripDetailState.photoItems : [];
}

function clearTripPhotoSelection() {
    tripPhotoSelectionState.selectedKeys.clear();
    tripPhotoSelectionState.anchorIndex = null;
    tripPhotoSelectionState.focusIndex = null;
}

function syncTripPhotoSelectionWithItems(items) {
    if (!Array.isArray(items)) { items = []; }
    const available = new Set();
    items.forEach((details, index) => {
        if (!details || typeof details !== 'object') { return; }
        const key = typeof details.key === 'string' && details.key
            ? details.key
            : computeTripPhotoKey(details, index);
        details.key = key;
        available.add(key);
    });

    let removed = false;
    for (const key of Array.from(tripPhotoSelectionState.selectedKeys)) {
        if (!available.has(key)) {
            tripPhotoSelectionState.selectedKeys.delete(key);
            removed = true;
        }
    }

    if (tripPhotoSelectionState.active && tripPhotoSelectionState.selectedKeys.size === 0 && items.length === 0) {
        tripPhotoSelectionState.active = false;
    }

    let fallbackSelectedIndex = null;

    if (tripPhotoSelectionState.anchorIndex !== null) {
        const anchor = tripPhotoSelectionState.anchorIndex;
        const hasValidAnchor = Number.isInteger(anchor) && anchor >= 0 && anchor < items.length;
        if (!hasValidAnchor) {
            if (fallbackSelectedIndex === null) {
                fallbackSelectedIndex = findFirstSelectedTripPhotoIndex(items);
            }
            tripPhotoSelectionState.anchorIndex = fallbackSelectedIndex;
        }
    }

    if (tripPhotoSelectionState.focusIndex !== null) {
        const focus = tripPhotoSelectionState.focusIndex;
        const hasValidFocus = Number.isInteger(focus) && focus >= 0 && focus < items.length;
        if (!hasValidFocus) {
            if (fallbackSelectedIndex === null) {
                fallbackSelectedIndex = findFirstSelectedTripPhotoIndex(items);
            }
            if (fallbackSelectedIndex !== null) {
                tripPhotoSelectionState.focusIndex = fallbackSelectedIndex;
            } else if (Number.isInteger(tripPhotoSelectionState.anchorIndex)) {
                tripPhotoSelectionState.focusIndex = tripPhotoSelectionState.anchorIndex;
            } else {
                tripPhotoSelectionState.focusIndex = null;
            }
        }
    }

    if (tripPhotoSelectionState.selectedKeys.size === 0) {
        tripPhotoSelectionState.anchorIndex = null;
        tripPhotoSelectionState.focusIndex = null;
    }

    if (removed) {
        updateTripPhotoSelectionUI();
    }
}

function updateTripPhotoSelectionUI() {
    const items = getCurrentTripPhotoItems();
    const hasItems = items.length > 0;
    const selectedCount = tripPhotoSelectionState.selectedKeys.size;

    if (tripPhotoSelectToggleButton) {
        tripPhotoSelectToggleButton.hidden = !hasItems || tripPhotoSelectionState.active;
        tripPhotoSelectToggleButton.disabled = !hasItems;
    }

    if (tripPhotoCancelSelectionButton) {
        tripPhotoCancelSelectionButton.hidden = !tripPhotoSelectionState.active;
    }

    if (tripPhotoDeleteSelectedButton) {
        tripPhotoDeleteSelectedButton.hidden = !tripPhotoSelectionState.active;
        tripPhotoDeleteSelectedButton.disabled = !tripPhotoSelectionState.active || selectedCount === 0 || tripPhotoDeleteInProgress;
        if (tripPhotoDeleteInProgress) {
            tripPhotoDeleteSelectedButton.setAttribute('aria-busy', 'true');
        } else {
            tripPhotoDeleteSelectedButton.removeAttribute('aria-busy');
        }
        if (selectedCount > 0) {
            tripPhotoDeleteSelectedButton.textContent = `Remove selected (${selectedCount})`;
        } else {
            tripPhotoDeleteSelectedButton.textContent = 'Remove selected';
        }
    }

    if (tripPhotosGalleryElement) {
        const buttons = tripPhotosGalleryElement.querySelectorAll('.trip-profile-photo-button');
        buttons.forEach((button) => {
            const key = button.dataset.tripPhotoKey || '';
            const isSelected = tripPhotoSelectionState.selectedKeys.has(key);
            const caption = button.dataset.tripPhotoCaption || 'photo';
            button.classList.toggle('trip-profile-photo-button-selection', tripPhotoSelectionState.active);
            button.classList.toggle('trip-profile-photo-button-selected', tripPhotoSelectionState.active && isSelected);
            if (tripPhotoSelectionState.active) {
                button.setAttribute('aria-pressed', String(isSelected));
                button.setAttribute('aria-label', isSelected ? 'Deselect photo' : 'Select photo');
            } else {
                button.removeAttribute('aria-pressed');
                button.setAttribute('aria-label', `Open photo preview: ${caption}`);
            }
        });
    }
}

function enterTripPhotoSelectionMode() {
    if (tripPhotoSelectionState.active) { return; }
    tripPhotoSelectionState.active = true;
    clearTripPhotoSelection();
    if (tripPhotoModalController) {
        tripPhotoModalController.close();
    }
    updateTripPhotoSelectionUI();
}

function exitTripPhotoSelectionMode(options = {}) {
    const { preserveSelection = false, silent = false } = options || {};
    if (!preserveSelection) {
        clearTripPhotoSelection();
    }
    if (!tripPhotoSelectionState.active && tripPhotoSelectionState.selectedKeys.size === 0) {
        if (!silent) {
            updateTripPhotoSelectionUI();
        }
        return;
    }
    tripPhotoSelectionState.active = false;
    tripPhotoSelectionState.anchorIndex = null;
    tripPhotoSelectionState.focusIndex = null;
    updateTripPhotoSelectionUI();
}

function toggleTripPhotoSelection(photoKey, options = {}) {
    if (!tripPhotoSelectionState.active || !photoKey) { return; }

    const { index = null } = options || {};
    if (tripPhotoSelectionState.selectedKeys.has(photoKey)) {
        tripPhotoSelectionState.selectedKeys.delete(photoKey);
    } else {
        tripPhotoSelectionState.selectedKeys.add(photoKey);
    }

    if (Number.isInteger(index)) {
        tripPhotoSelectionState.anchorIndex = index;
        tripPhotoSelectionState.focusIndex = index;
    } else if (tripPhotoSelectionState.selectedKeys.size === 0) {
        tripPhotoSelectionState.anchorIndex = null;
        tripPhotoSelectionState.focusIndex = null;
    }

    updateTripPhotoSelectionUI();
}

function applyTripPhotoRangeSelection(startIndex, endIndex, options = {}) {
    if (!tripPhotoSelectionState.active) { return; }

    const items = getCurrentTripPhotoItems();
    if (!Array.isArray(items) || items.length === 0) { return; }

    const startNumeric = Number.isFinite(startIndex) ? Math.trunc(startIndex) : null;
    const endNumeric = Number.isFinite(endIndex) ? Math.trunc(endIndex) : null;
    if (startNumeric === null || endNumeric === null) { return; }

    const clampedStart = Math.max(0, Math.min(items.length - 1, startNumeric));
    const clampedEnd = Math.max(0, Math.min(items.length - 1, endNumeric));
    const lower = Math.min(clampedStart, clampedEnd);
    const upper = Math.max(clampedStart, clampedEnd);

    const { additive = false } = options || {};
    if (!additive) {
        tripPhotoSelectionState.selectedKeys.clear();
    }

    for (let index = lower; index <= upper; index += 1) {
        const item = items[index];
        if (!item || typeof item !== 'object') { continue; }
        let key = item.key;
        if (typeof key !== 'string' || !key) {
            key = computeTripPhotoKey(item, index);
            item.key = key;
        }
        if (key) {
            tripPhotoSelectionState.selectedKeys.add(key);
        }
    }

    if (!Number.isInteger(tripPhotoSelectionState.anchorIndex)) {
        tripPhotoSelectionState.anchorIndex = clampedStart;
    }
    tripPhotoSelectionState.focusIndex = clampedEnd;
    updateTripPhotoSelectionUI();
}

function findFirstSelectedTripPhotoIndex(items) {
    if (!Array.isArray(items) || items.length === 0) { return null; }
    for (let index = 0; index < items.length; index += 1) {
        const item = items[index];
        if (!item || typeof item !== 'object') { continue; }
        let key = item.key;
        if (typeof key !== 'string' || !key) {
            key = computeTripPhotoKey(item, index);
            item.key = key;
        }
        if (key && tripPhotoSelectionState.selectedKeys.has(key)) {
            return index;
        }
    }
    return null;
}

async function handleTripPhotoDeleteSelectedClick(event) {
    if (event) { event.preventDefault(); }
    if (!tripPhotoSelectionState.active || tripPhotoDeleteInProgress) { return; }

    const selectedKeys = Array.from(tripPhotoSelectionState.selectedKeys);
    if (selectedKeys.length === 0) {
        showTripDescriptionStatus('Select at least one photo to remove.', true);
        return;
    }

    if (!window.confirm(`Remove ${selectedKeys.length} selected photo${selectedKeys.length === 1 ? '' : 's'} from this trip?`)) {
        return;
    }

    const tripId = tripDescriptionState.tripId ? String(tripDescriptionState.tripId).trim() : '';
    if (!tripId) {
        showTripDescriptionStatus('Trip could not be determined.', true);
        return;
    }

    const items = getCurrentTripPhotoItems();
    const indexLookup = new Map();
    const idLookup = new Map();
    items.forEach((item, index) => {
        if (!item || typeof item !== 'object') { return; }
        const key = typeof item.key === 'string' ? item.key : computeTripPhotoKey(item, index);
        item.key = key;
        indexLookup.set(key, index);
        if (item.id) {
            idLookup.set(key, String(item.id).trim());
        }
    });

    const payload = {};
    const indices = [];
    const photoIds = [];

    selectedKeys.forEach((key) => {
        if (idLookup.has(key)) {
            photoIds.push(idLookup.get(key));
        } else if (indexLookup.has(key)) {
            indices.push(indexLookup.get(key));
        }
    });

    if (!photoIds.length && !indices.length) {
        showTripDescriptionStatus('Selected photos could not be matched.', true);
        return;
    }

    if (photoIds.length) {
        payload.photo_ids = photoIds;
    }
    if (indices.length) {
        payload.indices = indices;
    }

    tripPhotoDeleteInProgress = true;
    updateTripPhotoSelectionUI();

    try {
        const response = await fetch(`/api/trips/${encodeURIComponent(tripId)}/photos/bulk-delete`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify(payload),
        });

        const result = await response.json().catch(() => ({}));

        if (!response.ok || (result && result.status === 'error')) {
            const message = result && result.message ? result.message : 'Failed to remove selected photos.';
            throw new Error(message);
        }

        const updatedTrip = result && result.trip ? result.trip : null;
        const responsePhotos = Array.isArray(result && result.photos) ? result.photos : [];
        const responsePhotoItems = Array.isArray(result && result.photo_items) ? result.photo_items : [];

        if (updatedTrip && typeof updatedTrip === 'object') {
            populateTripProfilePanel(updatedTrip, {
                preserveDirty: true,
                photos: responsePhotos,
                photoItems: responsePhotoItems,
            });
        } else {
            updateTripPhotosSection({
                photos: responsePhotos,
                photoItems: responsePhotoItems,
                url: tripDescriptionState.lastAppliedPhotosUrl,
            });
        }

        clearTripPhotoSelection();
        if (!responsePhotoItems.length) {
            tripPhotoSelectionState.active = false;
        }

        const message = result && result.message ? result.message : 'Selected photos removed.';
        showTripDescriptionStatus(message);
    } catch (error) {
        console.error('Failed to remove selected trip photos', error);
        const message = error && error.message ? error.message : 'Failed to remove selected photos.';
        showTripDescriptionStatus(message, true);
    } finally {
        tripPhotoDeleteInProgress = false;
        syncTripPhotoSelectionWithItems(getCurrentTripPhotoItems());
        updateTripPhotoSelectionUI();
    }
}
function normaliseTripList(trips) {
    if (!Array.isArray(trips)) { return []; }
    return trips.map((trip) => normaliseTrip(trip)).filter(Boolean);
}

function normaliseTrip(trip) {
    if (!trip || typeof trip !== 'object') { return null; }

    const identifierRaw = trip.id ?? trip.trip_id ?? '';
    const identifier = typeof identifierRaw === 'string'
        ? identifierRaw.trim()
        : String(identifierRaw || '').trim();
    if (!identifier) { return null; }

    const nameRaw = trip.name ?? '';
    const name = typeof nameRaw === 'string'
        ? (nameRaw.trim() || TRIP_NAME_FALLBACK)
        : (String(nameRaw || '').trim() || TRIP_NAME_FALLBACK);

    const locationRaw = trip.location_count ?? (Array.isArray(trip.place_ids) ? trip.place_ids.length : 0);
    const locationNumber = Number(locationRaw);
    const locationCount = Number.isFinite(locationNumber) && locationNumber >= 0
        ? locationNumber
        : 0;

    const createdAtRaw = trip.created_at ?? '';
    const createdAt = typeof createdAtRaw === 'string'
        ? createdAtRaw
        : (createdAtRaw ? String(createdAtRaw) : '');

    const updatedAtRaw = trip.updated_at ?? '';
    const updatedAt = typeof updatedAtRaw === 'string'
        ? updatedAtRaw
        : (updatedAtRaw ? String(updatedAtRaw) : '');

    const latestDateRaw = trip.latest_location_date ?? trip.latest_date ?? '';
    const latestDate = typeof latestDateRaw === 'string'
        ? latestDateRaw
        : (latestDateRaw ? String(latestDateRaw) : '');

    let description = '';
    if (typeof trip.description === 'string') {
        description = trip.description;
    } else if (trip.description !== null && trip.description !== undefined) {
        try {
            description = String(trip.description);
        } catch (error) {
            description = '';
        }
    }

    const photosUrlRaw = trip.google_photos_url ?? '';
    const googlePhotosUrl = typeof photosUrlRaw === 'string'
        ? photosUrlRaw.trim()
        : (photosUrlRaw ? String(photosUrlRaw).trim() : '');

    const photoItemsRaw = Array.isArray(trip.photo_items) ? trip.photo_items : null;
    const photoCountRaw = trip.photo_count ?? (
        photoItemsRaw ? photoItemsRaw.length : (Array.isArray(trip.photos) ? trip.photos.length : 0)
    );
    const parsedPhotoCount = Number(photoCountRaw);
    const photoCount = Number.isFinite(parsedPhotoCount) && parsedPhotoCount >= 0
        ? parsedPhotoCount
        : 0;

    return {
        id: identifier,
        name,
        location_count: locationCount,
        created_at: createdAt,
        updated_at: updatedAt,
        latest_location_date: latestDate,
        description,
        google_photos_url: googlePhotosUrl,
        photo_count: photoCount,
    };
}

function getTripFromState(tripId) {
    const cleanedTripId = typeof tripId === 'string'
        ? tripId.trim()
        : String(tripId || '').trim();
    if (!cleanedTripId) { return null; }

    if (tripDetailState.trip && tripDetailState.trip.id === cleanedTripId) {
        return { ...tripDetailState.trip };
    }

    const existingTrips = Array.isArray(tripListState.trips) ? tripListState.trips : [];
    const match = existingTrips.find((entry) => entry && entry.id === cleanedTripId);
    if (match) {
        return { ...match };
    }

    return null;
}

function updateTripsPanel(trips) {
    if (!tripListState.initialised) { initTripsPanel(); }
    const normalisedTrips = normaliseTripList(trips);
    tripListState.trips = normalisedTrips;
    hideTripListError();

    const selectedId = tripDetailState.selectedTripId;
    if (selectedId) {
        const selectedTrip = normalisedTrips.find((entry) => entry.id === selectedId);
        if (!selectedTrip) {
            tripLocationCache.delete(selectedId);
            closeTripDetail({ restoreFocus: false, skipRender: true });
        } else if (tripDetailState.trip) {
            tripDetailState.trip = { ...tripDetailState.trip, ...selectedTrip };
            updateTripDetailHeader();
        }
    }

    renderTripList();
}

function requestTripListScrollPreservation() {
    if (!tripListState.initialised) { initTripsPanel(); }
    if (!tripListContainer) { return; }
    tripListState.scrollTop = typeof tripListContainer.scrollTop === 'number'
        ? tripListContainer.scrollTop
        : 0;
    tripListState.preserveScroll = true;
}

function resetTripListScrollPosition() {
    if (!tripListState.initialised) { initTripsPanel(); }
    if (tripListContainer) {
        tripListContainer.scrollTop = 0;
    }
    tripListState.scrollTop = 0;
    tripListState.preserveScroll = false;
}

function renderTripList(options = {}) {
    if (!tripListState.initialised) { initTripsPanel(); }
    if (!tripListContainer) { return; }

    const shouldPreserveScroll = Boolean(options.preserveScroll || tripListState.preserveScroll);
    const previousScrollTop = shouldPreserveScroll
        ? (typeof tripListState.scrollTop === 'number' ? tripListState.scrollTop : tripListContainer.scrollTop)
        : 0;

    const trips = Array.isArray(tripListState.trips) ? tripListState.trips : [];
    const hasTrips = trips.length > 0;
    const searchTerm = tripListState.searchTerm;

    let filteredTrips = trips;
    if (searchTerm) {
        filteredTrips = trips.filter((trip) => createTripSearchText(trip).includes(searchTerm));
    }

    tripListContainer.innerHTML = '';

    if (!hasTrips) {
        showTripListEmpty('No trips yet. Assign a location to begin your first journey.');
        return;
    }

    if (!filteredTrips.length) {
        showTripListEmpty('No trips match your search.');
        return;
    }

    clearTripListMessages();
    if (tripListLoadingElement) { tripListLoadingElement.hidden = true; }

    const sortedTrips = filteredTrips.slice().sort((a, b) => compareTrips(a, b));
    const fragment = document.createDocumentFragment();
    sortedTrips.forEach((trip) => {
        const item = createTripListItem(trip);
        if (item) { fragment.appendChild(item); }
    });

    tripListContainer.appendChild(fragment);
    tripListContainer.hidden = false;
    if (shouldPreserveScroll) {
        const maxScrollTop = Math.max(0, tripListContainer.scrollHeight - tripListContainer.clientHeight);
        const nextScrollTop = Math.min(previousScrollTop, maxScrollTop);
        tripListContainer.scrollTop = nextScrollTop;
        tripListState.scrollTop = nextScrollTop;
    } else {
        tripListContainer.scrollTop = 0;
        tripListState.scrollTop = 0;
    }
}

function compareTrips(a, b) {
    const direction = tripListState.sortDirection === TRIP_SORT_DIRECTION_DESC ? -1 : 1;
    const field = tripListState.sortField === TRIP_SORT_FIELD_DATE
        ? TRIP_SORT_FIELD_DATE
        : TRIP_SORT_FIELD_NAME;

    if (field === TRIP_SORT_FIELD_NAME) {
        const nameA = (a && typeof a.name === 'string') ? a.name : '';
        const nameB = (b && typeof b.name === 'string') ? b.name : '';
        const comparison = nameA.localeCompare(nameB, undefined, { sensitivity: 'base' });
        if (comparison !== 0) { return comparison * direction; }
        const dateDifference = getTripDateValue(a) - getTripDateValue(b);
        if (dateDifference !== 0) { return dateDifference * direction; }
        return 0;
    }

    const dateDifference = getTripDateValue(a) - getTripDateValue(b);
    if (dateDifference !== 0) { return dateDifference * direction; }

    const nameA = (a && typeof a.name === 'string') ? a.name : '';
    const nameB = (b && typeof b.name === 'string') ? b.name : '';
    return nameA.localeCompare(nameB, undefined, { sensitivity: 'base' }) * direction;
}

function getTripDateValue(trip) {
    if (!trip || typeof trip !== 'object') { return 0; }
    const raw = trip.latest_location_date || trip.updated_at || trip.created_at || '';
    if (!raw) { return 0; }
    const timestamp = Date.parse(raw);
    return Number.isNaN(timestamp) ? 0 : timestamp;
}

function calculateTripLatestLocationDate(locations) {
    if (!Array.isArray(locations) || !locations.length) { return ''; }

    let latestTimestamp = Number.NEGATIVE_INFINITY;
    let hasTimestamp = false;

    locations.forEach((location) => {
        if (!location || typeof location !== 'object') { return; }

        const numericValue = Number(location.date_value);
        if (Number.isFinite(numericValue)) {
            if (!hasTimestamp || numericValue > latestTimestamp) {
                latestTimestamp = numericValue;
                hasTimestamp = true;
            }
            return;
        }

        const primary = location.date || location.start_date || location.end_date || '';
        if (!primary) { return; }
        const parsed = Date.parse(primary);
        if (Number.isNaN(parsed)) { return; }
        if (!hasTimestamp || parsed > latestTimestamp) {
            latestTimestamp = parsed;
            hasTimestamp = true;
        }
    });

    if (!hasTimestamp) { return ''; }

    try {
        return new Date(latestTimestamp).toISOString().split('T')[0];
    } catch (error) {
        return '';
    }
}

function formatTripLocationCount(value) {
    const count = Number(value);
    if (!Number.isFinite(count) || count < 0) { return '0 locations'; }
    return count === 1 ? '1 location' : `${count} locations`;
}

function formatTripDate(value) {
    if (!value) { return ''; }
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) { return ''; }
    if (tripDateFormatter) { return tripDateFormatter.format(date); }
    return date.toISOString().split('T')[0];
}

function formatTripUpdatedTimestamp(value) {
    if (!value) { return ''; }
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) { return ''; }
    try {
        return date.toLocaleString(undefined, {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
        });
    } catch (error) {
        return date.toISOString();
    }
}

function createTripListItem(trip) {
    if (!trip || typeof trip !== 'object') { return null; }

    const item = document.createElement('article');
    item.className = 'trip-item';
    item.setAttribute('role', 'listitem');
    item.dataset.tripId = trip.id;
    item.tabIndex = 0;

    const isSelected = tripDetailState.selectedTripId === trip.id;
    item.setAttribute('aria-selected', isSelected ? 'true' : 'false');
    if (isSelected) {
        item.classList.add('trip-item-active');
        item.setAttribute('aria-current', 'true');
    } else {
        item.setAttribute('aria-current', 'false');
    }

    const title = document.createElement('div');
    title.className = 'trip-item-name';
    title.textContent = trip.name || TRIP_NAME_FALLBACK;
    item.appendChild(title);

    const meta = document.createElement('div');
    meta.className = 'trip-item-meta';

    const dateValue = trip.latest_location_date || trip.updated_at || trip.created_at || '';
    const dateLabel = formatTripDate(dateValue);
    if (dateLabel) {
        const dateSpan = document.createElement('span');
        dateSpan.className = 'trip-item-meta-entry';
        //dateSpan.append('Date ');
        const timeElement = document.createElement('time');
        timeElement.dateTime = dateValue;
        timeElement.textContent = dateLabel;
        try {
            const dateObj = new Date(dateValue);
            if (!Number.isNaN(dateObj.getTime())) {
                timeElement.title = dateObj.toLocaleString();
            }
        } catch (error) {
            // Ignore formatting errors
        }
        dateSpan.appendChild(timeElement);
        meta.appendChild(dateSpan);
    }

    const countSpan = document.createElement('span');
    countSpan.className = 'trip-item-meta-entry';
    countSpan.textContent = formatTripLocationCount(trip.location_count);
    meta.appendChild(countSpan);

    item.appendChild(meta);

    return item;
}

function createTripSearchText(trip) {
    if (!trip || typeof trip !== 'object') { return ''; }
    const parts = [];
    if (trip.name) { parts.push(String(trip.name)); }
    if (Number.isFinite(Number(trip.location_count))) { parts.push(String(trip.location_count)); }
    if (trip.latest_location_date) { parts.push(String(trip.latest_location_date)); }
    if (trip.updated_at) { parts.push(String(trip.updated_at)); }
    if (trip.created_at) { parts.push(String(trip.created_at)); }
    const formatted = formatTripDate(trip.latest_location_date || trip.updated_at || trip.created_at || '');
    if (formatted) { parts.push(formatted); }
    return parts.join(' ').toLowerCase();
}

function initTripDetailPanel() {
    if (!tripProfileOverlay) {
        tripProfileOverlay = document.getElementById('tripProfileOverlay');
    }
    if (!tripProfilePanelElement) {
        tripProfilePanelElement = document.getElementById('tripProfilePanel');
        if (tripProfilePanelElement && !tripProfilePanelElement.hasAttribute('tabindex')) {
            tripProfilePanelElement.setAttribute('tabindex', '-1');
        }
    }

    if (tripDetailState.initialised) { return; }

    tripDetailContainer = document.getElementById('tripDetailView');
    tripDetailBackButton = document.getElementById('tripDetailBack');
    tripDetailTitleElement = document.getElementById('tripDetailTitle');
    tripDetailSubtitleElement = document.getElementById('tripDetailSubtitle');
    tripDetailCountElement = document.getElementById('tripDetailCount');
    tripDetailUpdatedElement = document.getElementById('tripDetailUpdated');
    tripDetailActionsElement = document.getElementById('tripDetailActions');
    tripDetailEditButton = document.getElementById('tripDetailEdit');
    tripDetailDeleteButton = document.getElementById('tripDetailDelete');
    tripLocationSearchInput = document.getElementById('tripLocationSearchInput');
    tripLocationSortFieldSelect = document.getElementById('tripLocationSortField');
    tripLocationSortDirectionButton = document.getElementById('tripLocationSortDirection');
    tripLocationListContainer = document.getElementById('tripLocationList');
    tripLocationLoadingElement = document.getElementById('tripLocationLoading');
    tripLocationErrorElement = document.getElementById('tripLocationError');
    tripLocationEmptyElement = document.getElementById('tripLocationEmpty');

    if (tripDetailTitleElement && !tripDetailTitleElement.dataset.defaultText) {
        tripDetailTitleElement.dataset.defaultText = tripDetailTitleElement.textContent || '';
    }
    if (tripDetailSubtitleElement && !tripDetailSubtitleElement.dataset.defaultText) {
        tripDetailSubtitleElement.dataset.defaultText = tripDetailSubtitleElement.textContent || '';
    }

    if (tripDetailBackButton) {
        tripDetailBackButton.addEventListener('click', (event) => {
            if (event) { event.preventDefault(); }
            closeTripDetail();
        });
        tripDescriptionCloseButton = tripDetailBackButton;
    }

    if (tripDetailEditButton && !tripDetailEditButton.dataset.initialised) {
        tripDetailEditButton.addEventListener('click', handleTripDetailEditClick);
        tripDetailEditButton.disabled = true;
        tripDetailEditButton.dataset.initialised = 'true';
        tripDetailEditButton.setAttribute('aria-pressed', 'false');
    }

    if (tripDetailDeleteButton) {
        tripDetailDeleteButton.addEventListener('click', handleTripDetailDeleteClick);
        tripDetailDeleteButton.disabled = true;
        tripDetailDeleteButton.hidden = true;
    }

    if (tripDetailActionsElement) {
        tripDetailActionsElement.hidden = true;
    }

    if (tripLocationSearchInput) {
        tripLocationSearchInput.addEventListener('input', () => {
            tripDetailState.searchTerm = tripLocationSearchInput.value.trim().toLowerCase();
            renderTripLocationList();
        });
    }

    if (tripLocationSortFieldSelect) {
        tripLocationSortFieldSelect.value = tripDetailState.sortField;
        tripLocationSortFieldSelect.addEventListener('change', () => {
            const value = tripLocationSortFieldSelect.value === TRIP_LOCATION_SORT_FIELD_NAME
                ? TRIP_LOCATION_SORT_FIELD_NAME
                : TRIP_LOCATION_SORT_FIELD_DATE;
            tripDetailState.sortField = value;
            renderTripLocationList();
        });
    }

    if (tripLocationSortDirectionButton) {
        tripLocationSortDirectionButton.addEventListener('click', () => {
            tripDetailState.sortDirection = tripDetailState.sortDirection === TRIP_SORT_DIRECTION_ASC
                ? TRIP_SORT_DIRECTION_DESC
                : TRIP_SORT_DIRECTION_ASC;
            updateTripLocationSortDirectionButton();
            renderTripLocationList();
        });
        updateTripLocationSortDirectionButton();
    }

    if (tripLocationListContainer) {
        tripLocationListContainer.addEventListener('click', handleTripLocationListClick);
        tripLocationListContainer.addEventListener('keydown', handleTripLocationListKeydown);
    }

    tripDetailState.initialised = true;
}

function handleTripListClick(event) {
    if (!tripListContainer) { return; }
    const target = event.target ? event.target.closest('.trip-item') : null;
    if (!target || !tripListContainer.contains(target)) { return; }
    const tripId = target.dataset.tripId || '';
    if (!tripId) { return; }
    event.preventDefault();
    openTripProfile(tripId, { triggerElement: target });
    openTripDetail(tripId, target);
}

function handleTripListKeydown(event) {
    if (!tripListContainer) { return; }
    if (event.defaultPrevented) { return; }
    const key = event.key;
    if (key !== 'Enter' && key !== ' ') { return; }
    const target = event.target ? (event.target.classList && event.target.classList.contains('trip-item')
        ? event.target
        : event.target.closest('.trip-item')) : null;
    if (!target || !tripListContainer.contains(target)) { return; }
    const tripId = target.dataset.tripId || '';
    if (!tripId) { return; }
    event.preventDefault();
    openTripProfile(tripId, { triggerElement: target });
    openTripDetail(tripId, target);
}

function handleTripLocationListClick(event) {
    if (!tripLocationListContainer) { return; }
    const target = event.target ? event.target.closest('.trip-location-item') : null;
    if (!target || !tripLocationListContainer.contains(target)) { return; }
    const locationId = target.dataset.locationId || '';
    if (!locationId) { return; }
    event.preventDefault();
    focusTripLocationById(locationId, target);
}

function handleTripLocationListKeydown(event) {
    if (!tripLocationListContainer) { return; }
    if (event.defaultPrevented) { return; }
    const key = event.key;
    if (key !== 'Enter' && key !== ' ') { return; }
    const target = event.target
        ? (event.target.classList && event.target.classList.contains('trip-location-item')
            ? event.target
            : event.target.closest('.trip-location-item'))
        : null;
    if (!target || !tripLocationListContainer.contains(target)) { return; }
    const locationId = target.dataset.locationId || '';
    if (!locationId) { return; }
    event.preventDefault();
    focusTripLocationById(locationId, target);
}

async function handleTripDetailDeleteClick(event) {
    if (event) { event.preventDefault(); }

    const button = event ? (event.currentTarget || event.target) : null;

    let tripId = '';
    let tripName = TRIP_NAME_FALLBACK;

    if (tripDetailState.trip && tripDetailState.trip.id) {
        tripId = tripDetailState.trip.id;
        if (tripDetailState.trip.name) { tripName = tripDetailState.trip.name; }
    } else if (tripDetailState.selectedTripId) {
        tripId = tripDetailState.selectedTripId;
        const fallbackTrip = Array.isArray(tripListState.trips)
            ? tripListState.trips.find((entry) => entry && entry.id === tripId)
            : null;
        if (fallbackTrip && fallbackTrip.name) {
            tripName = fallbackTrip.name;
        }
    }

    if (!tripId) {
        showStatus('Trip could not be determined.', true);
        return;
    }

    const displayName = tripName || TRIP_NAME_FALLBACK;
    const confirmMessage = displayName
        ? `Delete the trip "${displayName}"? This will remove it from all locations.`
        : 'Delete this trip? This will remove it from all locations.';

    await deleteTrip(tripId, {
        triggerButton: button || null,
        confirmMessage,
    });
}

function updateTripDescriptionSaveButtonState() {
    const hasChanges = Boolean(
        tripDescriptionState.isDirty
        || tripDescriptionState.isNameDirty
        || tripDescriptionState.isPhotosUrlDirty
    );
    const disableSave = !tripProfileEditState.active
        || !tripDescriptionState.tripId
        || tripDescriptionState.isSaving
        || !hasChanges;
    if (tripDescriptionSaveButton) {
        tripDescriptionSaveButton.disabled = disableSave;
    }
    if (tripDescriptionCancelButton) {
        tripDescriptionCancelButton.disabled = !tripProfileEditState.active
            || Boolean(tripDescriptionState.isSaving);
    }
}

function showTripDescriptionStatus(message, isError = false) {
    if (!tripDescriptionStatusElement) { return; }

    const text = message ? String(message) : '';
    tripDescriptionStatusElement.textContent = text;
    tripDescriptionStatusElement.hidden = text.length === 0;

    if (isError) {
        tripDescriptionStatusElement.classList.add('trip-description-status-error');
    } else {
        tripDescriptionStatusElement.classList.remove('trip-description-status-error');
    }
}

function updateTripDescriptionDisplay(description) {
    if (!tripProfilePanelInitialised || !tripDescriptionDisplayElement) { return; }

    const value = typeof description === 'string'
        ? description
        : tripDescriptionState.lastAppliedDescription || '';
    const trimmed = value.trim();

    if (trimmed) {
        tripDescriptionDisplayElement.textContent = value;
        tripDescriptionDisplayElement.classList.remove('trip-profile-description-empty');
    } else {
        tripDescriptionDisplayElement.textContent = 'No description has been added yet.';
        tripDescriptionDisplayElement.classList.add('trip-profile-description-empty');
    }
}

function updateTripPhotosLink(url) {
    if (!tripPhotosLinkElement) { return; }
    const cleaned = typeof url === 'string' ? url.trim() : '';
    if (cleaned) {
        tripPhotosLinkElement.href = cleaned;
        tripPhotosLinkElement.hidden = false;
    } else {
        tripPhotosLinkElement.removeAttribute('href');
        tripPhotosLinkElement.hidden = true;
    }
}

function renderTripPhotosGallery(photoItems) {
    if (!tripPhotosGalleryElement) { return; }
    tripPhotosGalleryElement.innerHTML = '';

    if (!Array.isArray(photoItems) || photoItems.length === 0) {
        tripPhotosGalleryElement.hidden = true;
        return;
    }

    const pickString = (value) => (typeof value === 'string' ? value.trim() : '');
    const selectionActive = Boolean(tripPhotoSelectionState.active);

    photoItems.forEach((details, index) => {
        if (!details || typeof details !== 'object') { return; }

        const photoKey = typeof details.key === 'string' && details.key
            ? details.key
            : computeTripPhotoKey(details, index);
        details.key = photoKey;
        const isSelected = selectionActive && tripPhotoSelectionState.selectedKeys.has(photoKey);

        const proxyUrl = pickString(details.proxy_url || details.proxyUrl);
        const downloadUrl = pickString(details.download_url || details.downloadUrl);
        const directUrl = pickString(details.url);
        const baseUrl = pickString(details.base_url || details.baseUrl);
        const imageUrl = proxyUrl || downloadUrl || directUrl || baseUrl;
        if (!imageUrl) { return; }

        const productUrl = pickString(details.product_url || details.productUrl);
        const filename = pickString(details.filename || details.mediaItemFilename);
        const captionText = filename || `Trip photo ${index + 1}`;

        const figure = document.createElement('figure');
        figure.className = 'trip-profile-photo-item';

        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'trip-profile-photo-button';
        button.dataset.tripPhotoIndex = String(index);
        button.dataset.tripPhotoActive = 'false';
        button.dataset.tripPhotoCaption = captionText;
        button.dataset.tripPhotoKey = photoKey;
        if (selectionActive) {
            button.setAttribute('aria-pressed', String(isSelected));
            button.setAttribute('aria-label', isSelected ? 'Deselect photo' : 'Select photo');
        } else {
            button.removeAttribute('aria-pressed');
            button.setAttribute('aria-label', `Open photo preview: ${captionText}`);
        }
        figure.appendChild(button);

        const image = document.createElement('img');
        image.src = imageUrl;
        image.referrerPolicy = 'no-referrer';
        image.alt = `Trip photo preview: ${captionText}`;
        image.loading = 'lazy';
        image.decoding = 'async';
        button.appendChild(image);

        let indicator = document.createElement('span');
        indicator.className = 'trip-photo-selection-indicator';
        indicator.setAttribute('aria-hidden', 'true');
        button.appendChild(indicator);

        button.classList.toggle('trip-profile-photo-button-selection', selectionActive);
        button.classList.toggle('trip-profile-photo-button-selected', selectionActive && isSelected);

        const metadata = {
            imageUrl,
            proxyUrl,
            downloadUrl,
            productUrl,
            filename: captionText,
            mimeType: pickString(details.mime_type || details.mimeType),
        };
        button.dataset.tripPhotoMeta = JSON.stringify(metadata);

        tripPhotosGalleryElement.appendChild(figure);
    });

    tripPhotosGalleryElement.hidden = tripPhotosGalleryElement.childElementCount === 0;
}

function updateTripPhotoActiveButton(photoIndex) {
    if (!tripPhotosGalleryElement) { return; }
    if (tripPhotoSelectionState.active) {
        tripPhotosGalleryElement
            .querySelectorAll('.trip-profile-photo-button')
            .forEach((button) => {
                button.dataset.tripPhotoActive = 'false';
            });
        return;
    }
    const buttons = tripPhotosGalleryElement.querySelectorAll('.trip-profile-photo-button');
    buttons.forEach((button) => {
        if (!button) { return; }
        const candidate = Number(button.dataset.tripPhotoIndex);
        const isActive = Number.isFinite(candidate) && photoIndex !== null && candidate === photoIndex;
        button.dataset.tripPhotoActive = isActive ? 'true' : 'false';
    });
    updateTripPhotoModalControls();
}

function resolveTripPhotoUrl(photo, keys) {
    if (!photo || typeof photo !== 'object') { return ''; }
    for (const key of keys) {
        const value = photo[key];
        if (typeof value === 'string' && value.trim()) {
            return value.trim();
        }
    }
    return '';
}

function buildTripPhotoCaption(photo, index) {
    const name = resolveTripPhotoUrl(photo, ['filename', 'mediaItemFilename']);
    return name || `Trip photo ${index + 1}`;
}

function updateTripPhotoModalControls() {
    if (tripPhotoSelectionState.active) {
        if (tripPhotoPrevButton) {
            tripPhotoPrevButton.hidden = true;
            tripPhotoPrevButton.disabled = true;
            tripPhotoPrevButton.setAttribute('aria-hidden', 'true');
        }
        if (tripPhotoNextButton) {
            tripPhotoNextButton.hidden = true;
            tripPhotoNextButton.disabled = true;
            tripPhotoNextButton.setAttribute('aria-hidden', 'true');
        }
        if (tripPhotoDeleteButton) {
            tripPhotoDeleteButton.hidden = true;
            tripPhotoDeleteButton.disabled = true;
            tripPhotoDeleteButton.setAttribute('aria-hidden', 'true');
        }
        return;
    }

    const items = Array.isArray(tripDetailState.photoItems) ? tripDetailState.photoItems : [];
    const count = items.length;
    const hasPrev = count > 1 && tripPhotoActiveIndex !== null && tripPhotoActiveIndex > 0;
    const hasNext = count > 1 && tripPhotoActiveIndex !== null && tripPhotoActiveIndex < count - 1;

    if (tripPhotoPrevButton) {
        tripPhotoPrevButton.disabled = !hasPrev;
        tripPhotoPrevButton.hidden = count <= 1;
        tripPhotoPrevButton.setAttribute('aria-hidden', count <= 1 ? 'true' : 'false');
    }

    if (tripPhotoNextButton) {
        tripPhotoNextButton.disabled = !hasNext;
        tripPhotoNextButton.hidden = count <= 1;
        tripPhotoNextButton.setAttribute('aria-hidden', count <= 1 ? 'true' : 'false');
    }

    if (tripPhotoDeleteButton) {
        const disabled = tripPhotoActiveIndex === null || count === 0 || tripPhotoDeleteInProgress;
        tripPhotoDeleteButton.disabled = disabled;
        tripPhotoDeleteButton.hidden = count === 0;
        tripPhotoDeleteButton.setAttribute('aria-hidden', count === 0 ? 'true' : 'false');
    }
}

function attachTripPhotoModalKeyHandler() {
    if (tripPhotoModalKeydownHandler) { return; }
    tripPhotoModalKeydownHandler = (event) => {
        const modalElement = document.getElementById('tripPhotoModal');
        if (!modalElement || !modalElement.classList.contains('open')) { return; }
        if (tripPhotoSelectionState.active) { return; }
        if (event.key === 'ArrowLeft') {
            event.preventDefault();
            goToTripPhoto(-1);
            return;
        }
        if (event.key === 'ArrowRight') {
            event.preventDefault();
            goToTripPhoto(1);
            return;
        }
        if ((event.key === 'Delete' || event.key === 'Backspace') && !tripPhotoDeleteInProgress) {
            event.preventDefault();
            handleTripPhotoDeleteClick();
        }
    };
    document.addEventListener('keydown', tripPhotoModalKeydownHandler);
}

function detachTripPhotoModalKeyHandler() {
    if (!tripPhotoModalKeydownHandler) { return; }
    document.removeEventListener('keydown', tripPhotoModalKeydownHandler);
    tripPhotoModalKeydownHandler = null;
}

function handleTripPhotoModalImageClick(event) {
    if (tripPhotoSelectionState.active) { return; }
    if (!event || tripPhotoActiveIndex === null) { return; }
    const items = Array.isArray(tripDetailState.photoItems) ? tripDetailState.photoItems : [];
    if (items.length <= 1) { return; }
    const rect = event.currentTarget.getBoundingClientRect();
    const relativeX = event.clientX - rect.left;
    if (relativeX < rect.width / 2) {
        goToTripPhoto(-1);
    } else {
        goToTripPhoto(1);
    }
}

function goToTripPhoto(offset) {
    if (tripPhotoSelectionState.active) { return; }
    const items = Array.isArray(tripDetailState.photoItems) ? tripDetailState.photoItems : [];
    if (!items.length) { return; }
    const current = Number.isFinite(tripPhotoActiveIndex) ? tripPhotoActiveIndex : 0;
    let nextIndex = current + offset;
    nextIndex = Math.max(0, Math.min(items.length - 1, nextIndex));
    if (nextIndex === tripPhotoActiveIndex) { return; }
    openTripPhotoModal(nextIndex);
}

function handleTripPhotoDeleteClick(event) {
    if (event) { event.preventDefault(); }
    if (tripPhotoDeleteInProgress) { return; }
    if (tripPhotoActiveIndex === null) {
        showTripDescriptionStatus('No photo selected to remove.', true);
        return;
    }

    if (!window.confirm('Remove this photo from the trip?')) {
        return;
    }

    tripPhotoDeleteInProgress = true;
    if (tripPhotoDeleteButton) {
        tripPhotoDeleteButton.disabled = true;
        tripPhotoDeleteButton.setAttribute('aria-busy', 'true');
    }
    showTripDescriptionStatus('Removing photo…');

    deleteTripPhoto(tripPhotoActiveIndex)
        .catch((error) => {
            console.error('Failed to remove trip photo', error);
        })
        .finally(() => {
            tripPhotoDeleteInProgress = false;
            if (tripPhotoDeleteButton) {
                tripPhotoDeleteButton.removeAttribute('aria-busy');
            }
            updateTripPhotoModalControls();
        });
}

async function deleteTripPhoto(photoIndex) {
    const tripIdRaw = tripDescriptionState.tripId ? String(tripDescriptionState.tripId).trim() : '';
    if (!tripIdRaw) {
        showTripDescriptionStatus('Trip could not be determined.', true);
        throw new Error('Trip ID unavailable');
    }

    let response;
    try {
        response = await fetch(`/api/trips/${encodeURIComponent(tripIdRaw)}/photos/${photoIndex}`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
        });
    } catch (error) {
        showTripDescriptionStatus('Network error while removing photo.', true);
        throw error;
    }

    let payload = {};
    try {
        payload = await response.json();
    } catch (error) {
        payload = {};
    }

    if (!response.ok || (payload && payload.status === 'error')) {
        const message = payload && payload.message ? payload.message : 'Failed to remove photo from trip.';
        showTripDescriptionStatus(message, true);
        throw new Error(message);
    }

    const updatedTrip = payload && payload.trip ? payload.trip : null;
    const photos = Array.isArray(payload && payload.photos) ? payload.photos : [];
    const photoItems = Array.isArray(payload && payload.photo_items) ? payload.photo_items : [];

    if (updatedTrip && typeof updatedTrip === 'object') {
        const updatedTripId = String(updatedTrip.id || updatedTrip.trip_id || '').trim();
        const selectedTripId = tripDetailState.selectedTripId ? String(tripDetailState.selectedTripId).trim() : '';

        if (updatedTripId && tripDetailState.trip && String(tripDetailState.trip.id || '').trim() === updatedTripId) {
            tripDetailState.trip = { ...tripDetailState.trip, ...updatedTrip };
            updateTripDetailHeader();
        } else if (updatedTripId && selectedTripId === updatedTripId) {
            // When the detail view is pointing at this trip but ``tripDetailState.trip``
            // has not been populated yet, hydrate it with the payload from the server.
            tripDetailState.trip = { ...updatedTrip };
            updateTripDetailHeader();
        }

        upsertTripInList(updatedTrip, { reloadDetail: false });
    }

    const cacheEntry = tripLocationCache.get(tripIdRaw);
    if (cacheEntry) {
        cacheEntry.photos = photos;
        cacheEntry.photo_items = photoItems;
        if (updatedTrip && typeof updatedTrip === 'object') {
            cacheEntry.trip = { ...(cacheEntry.trip || {}), ...updatedTrip };
        }
        tripLocationCache.set(tripIdRaw, cacheEntry);
    }

    updateTripPhotosSection({
        photos,
        photoItems,
        url: (updatedTrip && Object.prototype.hasOwnProperty.call(updatedTrip, 'google_photos_url'))
            ? updatedTrip.google_photos_url
            : undefined,
    });

    if (updatedTrip && typeof updatedTrip === 'object') {
        populateTripProfilePanel(updatedTrip, {
            preserveDirty: true,
            photos,
            photoItems,
        });
    }

    const message = payload && payload.message ? payload.message : 'Photo removed from trip.';
    showTripDescriptionStatus(message);

    const remaining = photoItems.length;

    syncTripPhotoSelectionWithItems(getCurrentTripPhotoItems());
    updateTripPhotoSelectionUI();

    if (remaining === 0) {
        if (tripPhotoModalController) {
            tripPhotoModalController.close();
        }
        return;
    }

    const nextIndex = Math.min(photoIndex, remaining - 1);
    openTripPhotoModal(nextIndex);
}
function openTripPhotoModal(photoIndex) {
    if (!tripPhotoModalController) { return; }
    if (tripPhotoSelectionState.active) { return; }
    const items = Array.isArray(tripDetailState.photoItems) ? tripDetailState.photoItems : [];
    if (!items.length || photoIndex < 0 || photoIndex >= items.length) { return; }

    const photo = items[photoIndex];
    const previewUrl = resolveTripPhotoUrl(photo, ['proxy_url', 'proxyUrl', 'imageUrl']);
    const downloadUrl = resolveTripPhotoUrl(photo, ['download_url', 'downloadUrl']);
    const fallbackUrl = resolveTripPhotoUrl(photo, ['url', 'base_url', 'baseUrl']);
    const displayUrl = previewUrl || downloadUrl || fallbackUrl;

    if (!displayUrl) {
        showTripDescriptionStatus('Unable to display the selected photo.', true);
        return;
    }

    const productUrl = resolveTripPhotoUrl(photo, ['product_url', 'productUrl']);
    const filename = buildTripPhotoCaption(photo, photoIndex);
    const mimeType = resolveTripPhotoUrl(photo, ['mime_type', 'mimeType']);

    if (tripPhotoModalImageElement) {
        tripPhotoModalImageElement.src = displayUrl;
        tripPhotoModalImageElement.alt = filename;
        tripPhotoModalImageElement.referrerPolicy = 'no-referrer';
        tripPhotoModalImageElement.dataset.photoIndex = String(photoIndex);
        if (mimeType) {
            tripPhotoModalImageElement.dataset.mimeType = mimeType;
        } else {
            delete tripPhotoModalImageElement.dataset.mimeType;
        }
    }

    if (tripPhotoModalCaptionElement) {
        tripPhotoModalCaptionElement.textContent = '';
        const label = document.createElement('span');
        label.textContent = filename;
        tripPhotoModalCaptionElement.appendChild(label);
        const linkTarget = productUrl || downloadUrl || fallbackUrl;
        if (linkTarget) {
            const link = document.createElement('a');
            link.href = linkTarget;
            link.target = '_blank';
            link.rel = 'noreferrer noopener';
            link.className = 'trip-photo-modal-link';
            link.textContent = 'Open original';
            tripPhotoModalCaptionElement.appendChild(document.createTextNode(' '));
            tripPhotoModalCaptionElement.appendChild(link);
        }
    }

    tripPhotoActiveIndex = photoIndex;
    updateTripPhotoActiveButton(photoIndex);
    const triggerButton = tripPhotosGalleryElement
        ? tripPhotosGalleryElement.querySelector(`[data-trip-photo-index="${photoIndex}"]`)
        : null;
    if (triggerButton) {
        triggerButton.dataset.tripPhotoActive = 'true';
    }

    tripPhotoModalController.open();
    attachTripPhotoModalKeyHandler();
    updateTripPhotoModalControls();
}

function handleTripPhotoButtonClick(event) {
    if (event) { event.preventDefault(); }
    const button = event ? event.currentTarget : null;
    if (!button || button.disabled) { return; }
    const key = button.dataset.tripPhotoKey || '';
    const indexValue = Number(button.dataset.tripPhotoIndex);
    const hasIndex = Number.isFinite(indexValue);

    if (tripPhotoSelectionState.active) {
        if (event && event.shiftKey && hasIndex) {
            const additive = Boolean(event.ctrlKey || event.metaKey);
            const anchor = Number.isInteger(tripPhotoSelectionState.anchorIndex)
                ? tripPhotoSelectionState.anchorIndex
                : indexValue;
            applyTripPhotoRangeSelection(anchor, indexValue, { additive });
            return;
        }

        const fallbackKey = key || (hasIndex ? `index:${indexValue}` : '');
        if (fallbackKey) {
            toggleTripPhotoSelection(fallbackKey, { index: hasIndex ? indexValue : null });
        }
        return;
    }

    if (!Number.isFinite(indexValue) || indexValue < 0) { return; }
    openTripPhotoModal(indexValue);
}

function updateTripPhotosSection(options = {}) {
    if (!tripProfilePanelInitialised) { return; }

    const { photos = null, photoItems = null, url = undefined } = options || {};

    let normalisedItems = null;
    if (Array.isArray(photoItems) || Array.isArray(photos)) {
        normalisedItems = normaliseTripPhotoItems(
            Array.isArray(photoItems) ? photoItems : null,
            Array.isArray(photos) ? photos : null,
        );
        tripDetailState.photoItems = normalisedItems;
        tripDetailState.photos = normalisedItems.map((item) => item.url);
        tripDetailState.photoItems.forEach((entry, index) => {
            if (entry && typeof entry === 'object') {
                entry.index = index;
            }
        });
    }

    if (!normalisedItems && !Array.isArray(tripDetailState.photoItems)) {
        tripDetailState.photoItems = [];
        tripDetailState.photos = [];
    }

    if (url !== undefined) {
        const finalUrl = typeof url === 'string' ? url.trim() : '';
        tripDescriptionState.lastAppliedPhotosUrl = finalUrl;
        if (tripPhotosInputElement && (!tripProfileEditState.active || !tripDescriptionState.isPhotosUrlDirty)) {
            tripPhotosInputElement.value = finalUrl;
            if (!tripProfileEditState.active) {
                tripDescriptionState.isPhotosUrlDirty = false;
            }
        }
    }

    const resolvedUrl = tripDescriptionState.lastAppliedPhotosUrl || '';
    const photoList = Array.isArray(tripDetailState.photoItems) ? tripDetailState.photoItems : [];
    if (!photoList.length) {
        tripPhotoActiveIndex = null;
    }

    if (tripPhotosSectionElement) {
        tripPhotosSectionElement.hidden = false;
        tripPhotosSectionElement.setAttribute('aria-hidden', 'false');
    }

    renderTripPhotosGallery(photoList);
    updateTripPhotosLink(resolvedUrl);
    syncTripPhotoSelectionWithItems(photoList);
    updateTripPhotoSelectionUI();

    if (tripPhotosGalleryElement) {
        const buttons = Array.from(tripPhotosGalleryElement.querySelectorAll('.trip-profile-photo-button'));
        buttons.forEach((button) => {
            button.removeEventListener('click', handleTripPhotoButtonClick);
            button.addEventListener('click', handleTripPhotoButtonClick);
        });
        if (tripPhotoActiveIndex !== null) {
            updateTripPhotoActiveButton(tripPhotoActiveIndex);
        }
    }

    if (tripPhotosEmptyElement) {
        if (photoList.length > 0) {
            tripPhotosEmptyElement.hidden = true;
        } else {
            const message = resolvedUrl
                ? 'Additional photos are available via the Google Photos link for this trip.'
                : 'No photos yet. Use the Google Photos import button to add images to this trip.';
            tripPhotosEmptyElement.textContent = message;
            tripPhotosEmptyElement.hidden = false;
        }
    }

    updateTripPhotoModalControls();
}

function applyTripProfileEditMode() {
    if (!tripProfilePanelInitialised) { return; }

    const isEditing = Boolean(tripProfileEditState.active);

    if (tripProfilePanelElement) {
        tripProfilePanelElement.classList.toggle('trip-profile-panel-editing', isEditing);
    }
    if (tripDescriptionForm) {
        tripDescriptionForm.hidden = !isEditing;
        tripDescriptionForm.setAttribute('aria-hidden', isEditing ? 'false' : 'true');
    }
    if (tripDescriptionDisplayElement) {
        tripDescriptionDisplayElement.hidden = isEditing;
        tripDescriptionDisplayElement.setAttribute('aria-hidden', isEditing ? 'true' : 'false');
    }
    if (tripNameInputContainer) {
        tripNameInputContainer.hidden = !isEditing;
    }
    if (tripDescriptionSaveButton) {
        tripDescriptionSaveButton.hidden = !isEditing;
    }
    if (tripDescriptionCancelButton) {
        tripDescriptionCancelButton.hidden = !isEditing;
    }
    if (tripDetailEditButton) {
        tripDetailEditButton.disabled = isEditing || Boolean(tripDescriptionState.isSaving);
        tripDetailEditButton.setAttribute('aria-pressed', isEditing ? 'true' : 'false');
    }
    if (tripNameInputElement) {
        tripNameInputElement.disabled = Boolean(tripDescriptionState.isSaving);
    }
    if (tripDescriptionField) {
        tripDescriptionField.disabled = Boolean(tripDescriptionState.isSaving);
    }

    updateTripDetailActions();
    updateTripDescriptionSaveButtonState();
}

function enterTripProfileEditMode() {
    initTripProfilePanel();
    if (tripProfileEditState.active) { return; }

    tripProfileEditState.active = true;

    const nameValue = tripDescriptionState.lastAppliedName || '';
    if (tripNameInputElement) {
        tripNameInputElement.value = nameValue;
    }

    const descriptionValue = tripDescriptionState.lastAppliedDescription || '';
    if (tripDescriptionField) {
        tripDescriptionField.value = descriptionValue;
    }

    const photosUrlValue = tripDescriptionState.lastAppliedPhotosUrl || '';
    if (tripPhotosInputElement) {
        tripPhotosInputElement.value = photosUrlValue;
    }

    tripDescriptionState.isDirty = false;
    tripDescriptionState.isNameDirty = false;
    tripDescriptionState.isPhotosUrlDirty = false;

    showTripDescriptionStatus('');
    applyTripProfileEditMode();

    const focusTarget = tripNameInputElement || tripDescriptionField || tripPhotosInputElement || null;
    if (focusTarget && typeof focusTarget.focus === 'function') {
        try {
            focusTarget.focus({ preventScroll: true });
        } catch (error) {
            focusTarget.focus();
        }
    }
}

function exitTripProfileEditMode(options = {}) {
    initTripProfilePanel();

    const { restoreFocus = false, focusTarget = null } = options || {};

    if (!tripProfileEditState.active && !options.force) {
        return;
    }

    tripProfileEditState.active = false;
    tripDescriptionState.isDirty = false;
    tripDescriptionState.isNameDirty = false;
    tripDescriptionState.isPhotosUrlDirty = false;

    if (tripNameInputElement) {
        tripNameInputElement.value = tripDescriptionState.lastAppliedName || '';
    }
    if (tripDescriptionField) {
        tripDescriptionField.value = tripDescriptionState.lastAppliedDescription || '';
    }
    if (tripPhotosInputElement) {
        tripPhotosInputElement.value = tripDescriptionState.lastAppliedPhotosUrl || '';
    }

    applyTripProfileEditMode();
    updateTripDescriptionDisplay();

    const target = focusTarget || (restoreFocus ? tripDetailEditButton : null);
    if (target && typeof target.focus === 'function') {
        try {
            target.focus({ preventScroll: true });
        } catch (error) {
            target.focus();
        }
    }
}

function setTripDescriptionSaving(isSaving) {
    const saving = Boolean(isSaving);
    tripDescriptionState.isSaving = saving;
    if (tripDescriptionForm) {
        tripDescriptionForm.classList.toggle('is-saving', saving);
    }
    if (tripNameInputElement) {
        tripNameInputElement.disabled = saving;
    }
    if (tripDescriptionField) {
        tripDescriptionField.disabled = saving;
    }
    if (tripPhotosInputElement) {
        tripPhotosInputElement.disabled = saving;
    }
    if (tripDetailEditButton) {
        tripDetailEditButton.disabled = saving || tripProfileEditState.active;
    }
    if (tripDetailDeleteButton) {
        tripDetailDeleteButton.disabled = saving || !tripProfileEditState.active;
    }
    updateTripDescriptionSaveButtonState();
}

function handleTripDetailEditClick(event) {
    if (event) { event.preventDefault(); }
    if (tripDescriptionState.isSaving) { return; }
    if (!tripDetailState.trip || !tripDetailState.trip.id) { return; }
    enterTripProfileEditMode();
}

function handleTripDescriptionCancel(event) {
    if (event) { event.preventDefault(); }
    initTripProfilePanel();

    const wasDirty = Boolean(
        tripDescriptionState.isDirty
        || tripDescriptionState.isNameDirty
        || tripDescriptionState.isPhotosUrlDirty
    );
    exitTripProfileEditMode({ restoreFocus: true });

    const statusMessage = wasDirty ? 'Discarded unsaved changes.' : '';
    showTripDescriptionStatus(statusMessage);
}

function populateTripProfilePanel(trip, options = {}) {
    const { preserveDirty = true, photos = undefined, photoItems = undefined } = options || {};
    const name = trip && trip.name ? String(trip.name) : TRIP_NAME_FALLBACK;

    if (tripDescriptionTitleElement) {
        tripDescriptionTitleElement.textContent = name;
    }

    tripDescriptionState.lastAppliedName = name;
    if (tripNameInputElement) {
        const shouldUpdateNameField = !preserveDirty || !tripDescriptionState.isNameDirty;
        if (shouldUpdateNameField) {
            tripNameInputElement.value = name;
            tripDescriptionState.isNameDirty = false;
        }
    }

    const description = trip && typeof trip.description === 'string'
        ? trip.description
        : '';
    const timestamp = trip
        ? (trip.updated_at || trip.latest_location_date || trip.created_at || '')
        : '';

    const label = formatTripUpdatedTimestamp(timestamp);
    if (tripDescriptionUpdatedElement && tripDescriptionUpdatedTimeElement) {
        if (label) {
            tripDescriptionUpdatedElement.hidden = false;
            tripDescriptionUpdatedTimeElement.textContent = label;
            tripDescriptionUpdatedTimeElement.dateTime = timestamp;
        } else {
            tripDescriptionUpdatedElement.hidden = true;
            tripDescriptionUpdatedTimeElement.textContent = '';
            tripDescriptionUpdatedTimeElement.removeAttribute('dateTime');
        }
    }
    if (tripDescriptionUpdatedReadOnlyElement && tripDescriptionUpdatedReadOnlyTimeElement) {
        if (label) {
            tripDescriptionUpdatedReadOnlyElement.hidden = false;
            tripDescriptionUpdatedReadOnlyTimeElement.textContent = label;
            tripDescriptionUpdatedReadOnlyTimeElement.dateTime = timestamp;
        } else {
            tripDescriptionUpdatedReadOnlyElement.hidden = true;
            tripDescriptionUpdatedReadOnlyTimeElement.textContent = '';
            tripDescriptionUpdatedReadOnlyTimeElement.removeAttribute('dateTime');
        }
    }

    const currentValue = tripDescriptionField ? tripDescriptionField.value : '';
    tripDescriptionState.lastAppliedDescription = description;

    const shouldUpdateField = !preserveDirty || !tripDescriptionState.isDirty;
    if (tripDescriptionField && shouldUpdateField) {
        tripDescriptionField.value = description;
        tripDescriptionState.isDirty = false;
    } else if (tripDescriptionField && currentValue === description) {
        tripDescriptionState.isDirty = false;
    }

    const photosUrlRaw = trip && trip.google_photos_url !== undefined
        ? trip.google_photos_url
        : '';
    const photosUrl = typeof photosUrlRaw === 'string'
        ? photosUrlRaw.trim()
        : (photosUrlRaw ? String(photosUrlRaw).trim() : '');
    tripDescriptionState.lastAppliedPhotosUrl = photosUrl;

    if (tripPhotosInputElement) {
        const shouldUpdatePhotosField = !preserveDirty || !tripDescriptionState.isPhotosUrlDirty;
        if (shouldUpdatePhotosField) {
            tripPhotosInputElement.value = photosUrl;
            tripDescriptionState.isPhotosUrlDirty = false;
        }
    }

    const photoItemsFromOptions = Array.isArray(photoItems)
        ? photoItems
        : (trip && Array.isArray(trip.photo_items) ? trip.photo_items : null);
    const photosFromOptions = Array.isArray(photos)
        ? photos
        : (Array.isArray(trip && trip.photos) ? trip.photos : null);

    updateTripDescriptionDisplay(description);
    updateTripPhotosSection({
        photoItems: Array.isArray(photoItemsFromOptions) ? photoItemsFromOptions : undefined,
        photos: Array.isArray(photosFromOptions) ? photosFromOptions : undefined,
        url: photosUrl,
    });
    updateTripDescriptionSaveButtonState();
    updateTripDetailActions();
}

async function refreshTripDescription(tripId, requestId) {
    const cleanedTripId = typeof tripId === 'string'
        ? tripId.trim()
        : String(tripId || '').trim();
    if (!cleanedTripId) { return; }

    const activeRequestId = typeof requestId === 'number'
        ? requestId
        : tripDescriptionState.requestId + 1;
    tripDescriptionState.requestId = activeRequestId;

    try {
        const response = await fetch(`/api/trips/${encodeURIComponent(cleanedTripId)}`);
        const data = await response.json().catch(() => ({}));

        if (tripDescriptionState.tripId !== cleanedTripId || tripDescriptionState.requestId !== activeRequestId) {
            return;
        }

        if (!response.ok || (data && data.status === 'error')) {
            const message = data && data.message ? data.message : 'Failed to load trip.';
            showTripDescriptionStatus(message, true);
            return;
        }

        const tripData = data && typeof data === 'object' && !Array.isArray(data)
            ? (data.trip ?? data)
            : {};
        const photosRaw = data && typeof data === 'object' && Array.isArray(data.photos)
            ? data.photos
            : undefined;
        const photoItemsRaw = data && typeof data === 'object' && Array.isArray(data.photo_items)
            ? data.photo_items
            : undefined;

        if (tripData && typeof tripData === 'object') {
            populateTripProfilePanel(tripData, {
                preserveDirty: true,
                photos: Array.isArray(photosRaw) ? photosRaw : undefined,
                photoItems: Array.isArray(photoItemsRaw) ? photoItemsRaw : undefined,
            });
            upsertTripInList(tripData, { reloadDetail: false });
        }
    } catch (error) {
        if (tripDescriptionState.tripId !== cleanedTripId || tripDescriptionState.requestId !== activeRequestId) {
            return;
        }
        console.error('Failed to refresh trip information', error);
        showTripDescriptionStatus('Failed to refresh trip information.', true);
    }
}

async function handleTripDescriptionSubmit(event) {
    if (event) { event.preventDefault(); }

    const tripId = tripDescriptionState.tripId ? String(tripDescriptionState.tripId).trim() : '';
    if (!tripId) {
        showTripDescriptionStatus('Trip could not be determined.', true);
        return;
    }

    if (!tripProfileEditState.active) {
        showTripDescriptionStatus('Press Edit to make changes.', true);
        return;
    }

    const nameField = tripNameInputElement || null;
    const descriptionField = tripDescriptionField || null;
    const photosField = tripPhotosInputElement || null;

    if (!nameField && !descriptionField && !photosField) {
        showTripDescriptionStatus('Editing controls are unavailable.', true);
        return;
    }

    const nameChanged = Boolean(tripDescriptionState.isNameDirty);
    const descriptionChanged = Boolean(tripDescriptionState.isDirty);
    const photosUrlChanged = Boolean(tripDescriptionState.isPhotosUrlDirty);

    if (!nameChanged && !descriptionChanged && !photosUrlChanged) {
        showTripDescriptionStatus('No changes to save.');
        return;
    }

    const payload = {};
    let description = '';
    let trimmedName = '';
    let cleanedPhotosUrl = '';

    if (nameChanged) {
        const rawName = nameField ? nameField.value : '';
        trimmedName = rawName ? rawName.trim() : '';
        if (!trimmedName) {
            showTripDescriptionStatus('Trip name cannot be blank.', true);
            if (nameField && typeof nameField.focus === 'function') {
                try {
                    nameField.focus({ preventScroll: true });
                } catch (error) {
                    nameField.focus();
                }
            }
            return;
        }
        if (trimmedName.length > MAX_TRIP_NAME_LENGTH) {
            showTripDescriptionStatus(`Trip name must be ${MAX_TRIP_NAME_LENGTH} characters or fewer.`, true);
            if (nameField && typeof nameField.focus === 'function') {
                try {
                    nameField.focus({ preventScroll: true });
                } catch (error) {
                    nameField.focus();
                }
            }
            return;
        }
        payload.name = trimmedName;
    }

    if (descriptionChanged) {
        if (!descriptionField) {
            showTripDescriptionStatus('Description field is unavailable.', true);
            return;
        }
        description = descriptionField.value || '';
        payload.description = description;
    }

    if (photosUrlChanged) {
        if (!photosField) {
            showTripDescriptionStatus('Photos field is unavailable.', true);
            return;
        }
        const rawPhotosUrl = photosField.value || '';
        const trimmedPhotosUrl = rawPhotosUrl.trim();
        if (trimmedPhotosUrl && !/^https?:\/\//i.test(trimmedPhotosUrl)) {
            showTripDescriptionStatus('Provide a valid Google Photos link.', true);
            if (typeof photosField.focus === 'function') {
                try {
                    photosField.focus({ preventScroll: true });
                } catch (error) {
                    photosField.focus();
                }
            }
            return;
        }
        if (trimmedPhotosUrl.length > MAX_TRIP_PHOTOS_URL_LENGTH) {
            showTripDescriptionStatus(
                `Google Photos link must be ${MAX_TRIP_PHOTOS_URL_LENGTH} characters or fewer.`,
                true,
            );
            if (typeof photosField.focus === 'function') {
                try {
                    photosField.focus({ preventScroll: true });
                } catch (error) {
                    photosField.focus();
                }
            }
            return;
        }
        cleanedPhotosUrl = trimmedPhotosUrl;
        payload.google_photos_url = cleanedPhotosUrl;
    }

    const previousState = {
        lastAppliedName: tripDescriptionState.lastAppliedName,
        lastAppliedDescription: tripDescriptionState.lastAppliedDescription,
        lastAppliedPhotosUrl: tripDescriptionState.lastAppliedPhotosUrl,
        photos: Array.isArray(tripDetailState.photos) ? [...tripDetailState.photos] : [],
        photoItems: Array.isArray(tripDetailState.photoItems)
            ? tripDetailState.photoItems.map((item) => (item && typeof item === 'object' ? { ...item } : item))
            : [],
        trip: (tripDetailState.trip && String(tripDetailState.trip.id) === tripId)
            ? { ...tripDetailState.trip }
            : null,
    };

    const draftValues = {
        name: nameChanged ? trimmedName : null,
        description: descriptionChanged ? description : null,
        photosUrl: photosUrlChanged ? cleanedPhotosUrl : null,
    };

    if (nameChanged) {
        tripDescriptionState.lastAppliedName = trimmedName;
        if (tripDescriptionTitleElement) {
            tripDescriptionTitleElement.textContent = trimmedName || TRIP_NAME_FALLBACK;
        }
    }
    if (descriptionChanged) {
        tripDescriptionState.lastAppliedDescription = description;
    }
    if (photosUrlChanged) {
        tripDescriptionState.lastAppliedPhotosUrl = cleanedPhotosUrl;
    }

    if (tripDetailState.trip && String(tripDetailState.trip.id) === tripId) {
        const updatedDetail = { ...tripDetailState.trip };
        if (nameChanged) {
            updatedDetail.name = trimmedName;
        }
        if (descriptionChanged) {
            updatedDetail.description = description;
        }
        if (photosUrlChanged) {
            updatedDetail.google_photos_url = cleanedPhotosUrl;
            updatedDetail.photo_count = 0;
        }
        tripDetailState.trip = updatedDetail;
        updateTripDetailHeader();
    }

    if (photosUrlChanged) {
        tripDetailState.photoItems = [];
        tripDetailState.photos = [];
    }

    updateTripDescriptionDisplay(descriptionChanged ? description : undefined);
    if (photosUrlChanged) {
        updateTripPhotosSection({
            url: cleanedPhotosUrl,
            photoItems: [],
            photos: [],
        });
    }

    exitTripProfileEditMode({ restoreFocus: false });
    setTripDescriptionSaving(true);
    showTripDescriptionStatus('Saving changes...');

    let shouldRestoreFocusToEdit = true;

    try {
        const response = await fetch(`/api/trips/${encodeURIComponent(tripId)}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });
        const result = await response.json().catch(() => ({}));

        if (!response.ok || (result && result.status === 'error')) {
            const message = result && result.message ? result.message : 'Failed to save description.';
            throw new Error(message);
        }

        const updatedTrip = result && result.trip ? result.trip : null;
        const responsePhotos = Array.isArray(result && result.photos) ? result.photos : undefined;
        const responsePhotoItems = Array.isArray(result && result.photo_items) ? result.photo_items : undefined;
        if (updatedTrip && typeof updatedTrip === 'object') {
            populateTripProfilePanel(updatedTrip, {
                preserveDirty: false,
                photos: responsePhotos,
                photoItems: responsePhotoItems,
            });
            upsertTripInList(updatedTrip, { reloadDetail: false });
        } else {
            if (typeof payload.name === 'string') {
                tripDescriptionState.lastAppliedName = payload.name;
            }
            if (payload.description !== undefined) {
                tripDescriptionState.lastAppliedDescription = payload.description;
                if (tripDescriptionField && tripDescriptionField.value === payload.description) {
                    tripDescriptionState.isDirty = false;
                }
            }
            if (payload.google_photos_url !== undefined) {
                tripDescriptionState.lastAppliedPhotosUrl = payload.google_photos_url;
                tripDescriptionState.isPhotosUrlDirty = false;
                tripDetailState.photoItems = [];
                tripDetailState.photos = [];
                updateTripPhotosSection({
                    url: payload.google_photos_url,
                    photoItems: [],
                    photos: [],
                });
            }
            tripDescriptionState.isNameDirty = false;
        }

        showTripDescriptionStatus(result && result.message ? result.message : 'Trip updated successfully.');
    } catch (error) {
        shouldRestoreFocusToEdit = false;
        console.error('Failed to update trip description', error);
        tripDescriptionState.lastAppliedName = previousState.lastAppliedName;
        tripDescriptionState.lastAppliedDescription = previousState.lastAppliedDescription;
        tripDescriptionState.lastAppliedPhotosUrl = previousState.lastAppliedPhotosUrl || '';
        if (tripDescriptionTitleElement) {
            const previousName = previousState.lastAppliedName || '';
            const displayName = previousName.trim().length > 0
                ? previousName
                : TRIP_NAME_FALLBACK;
            tripDescriptionTitleElement.textContent = displayName;
        }
        if (previousState.trip) {
            tripDetailState.trip = previousState.trip;
            updateTripDetailHeader();
        }
        tripDetailState.photoItems = Array.isArray(previousState.photoItems)
            ? previousState.photoItems.map((item) => (item && typeof item === 'object' ? { ...item } : item))
            : [];
        tripDetailState.photos = Array.isArray(previousState.photos) ? previousState.photos : [];
        updateTripDescriptionDisplay();
        updateTripPhotosSection({
            url: previousState.lastAppliedPhotosUrl || '',
            photoItems: Array.isArray(previousState.photoItems) ? previousState.photoItems : undefined,
            photos: Array.isArray(previousState.photos) ? previousState.photos : undefined,
        });

        enterTripProfileEditMode();

        if (tripNameInputElement && draftValues.name !== null) {
            tripNameInputElement.value = draftValues.name;
            tripDescriptionState.isNameDirty = true;
        }
        if (tripDescriptionField && draftValues.description !== null) {
            tripDescriptionField.value = draftValues.description;
            tripDescriptionState.isDirty = true;
        }
        if (tripPhotosInputElement && draftValues.photosUrl !== null) {
            tripPhotosInputElement.value = draftValues.photosUrl;
            tripDescriptionState.isPhotosUrlDirty = true;
        }

        updateTripDescriptionSaveButtonState();
        showTripDescriptionStatus(error.message || 'Failed to save description.', true);
    } finally {
        setTripDescriptionSaving(false);
        if (shouldRestoreFocusToEdit && tripDetailEditButton) {
            try {
                tripDetailEditButton.focus({ preventScroll: true });
            } catch (focusError) {
                tripDetailEditButton.focus();
            }
        }
    }
}

function initTripProfilePanel() {
    if (!tripProfileOverlay) {
        tripProfileOverlay = document.getElementById('tripProfileOverlay');
    }
    if (!tripProfilePanelElement) {
        tripProfilePanelElement = document.getElementById('tripProfilePanel');
        if (tripProfilePanelElement && !tripProfilePanelElement.hasAttribute('tabindex')) {
            tripProfilePanelElement.setAttribute('tabindex', '-1');
        }
    }

    tripDescriptionForm = document.getElementById('tripDescriptionForm');
    tripDescriptionField = document.getElementById('tripDescriptionInput');
    tripDescriptionDisplayElement = document.getElementById('tripDescriptionDisplay');
    tripDescriptionStatusElement = document.getElementById('tripDescriptionStatus');
    tripDescriptionUpdatedElement = document.getElementById('tripDescriptionUpdated');
    tripDescriptionUpdatedTimeElement = document.getElementById('tripDescriptionUpdatedTime');
    tripDescriptionUpdatedReadOnlyElement = document.getElementById('tripDescriptionUpdatedReadOnly');
    tripDescriptionUpdatedReadOnlyTimeElement = document.getElementById('tripDescriptionUpdatedReadOnlyTime');
    tripDescriptionSaveButton = document.getElementById('tripDescriptionSave');
    tripDescriptionCancelButton = document.getElementById('tripDescriptionCancel');
    tripDescriptionCloseButton = document.getElementById('tripDetailBack');
    tripNameInputContainer = document.getElementById('tripNameField');
    tripNameInputElement = document.getElementById('tripNameInput');
    tripPhotosSectionElement = document.getElementById('tripPhotosSection');
    tripPhotosGalleryElement = document.getElementById('tripPhotosGallery');
    tripPhotosEmptyElement = document.getElementById('tripPhotosEmpty');
    tripPhotosLinkElement = document.getElementById('tripPhotosLink');
    tripPhotosInputElement = document.getElementById('tripPhotosInput');
    if (!tripPhotoModalController) {
        tripPhotoModalImageElement = document.getElementById('tripPhotoModalImage');
        tripPhotoModalCaptionElement = document.getElementById('tripPhotoModalCaption');
        tripPhotoModalController = createModalController('tripPhotoModal', {
            getInitialFocus: () => tripPhotoModalImageElement,
            onClose: () => {
                updateTripPhotoActiveButton(null);
                tripPhotoActiveIndex = null;
                if (tripPhotoModalImageElement) {
                    tripPhotoModalImageElement.removeAttribute('src');
                    tripPhotoModalImageElement.alt = '';
                    delete tripPhotoModalImageElement.dataset.photoIndex;
                    delete tripPhotoModalImageElement.dataset.mimeType;
                }
                if (tripPhotoModalCaptionElement) {
                    tripPhotoModalCaptionElement.textContent = '';
                }
                detachTripPhotoModalKeyHandler();
                updateTripPhotoModalControls();
            },
        });
        const modalCloseButton = document.querySelector('[data-trip-photo-modal-close]');
        if (modalCloseButton) {
            modalCloseButton.addEventListener('click', () => {
                if (tripPhotoModalController) {
                    tripPhotoModalController.close();
                }
            });
        }
        tripPhotoPrevButton = document.querySelector('[data-trip-photo-prev]');
        if (tripPhotoPrevButton && !tripPhotoPrevButton.dataset.initialised) {
            tripPhotoPrevButton.addEventListener('click', (event) => {
                if (event) { event.preventDefault(); }
                goToTripPhoto(-1);
            });
            tripPhotoPrevButton.dataset.initialised = 'true';
        }
        tripPhotoNextButton = document.querySelector('[data-trip-photo-next]');
        if (tripPhotoNextButton && !tripPhotoNextButton.dataset.initialised) {
            tripPhotoNextButton.addEventListener('click', (event) => {
                if (event) { event.preventDefault(); }
                goToTripPhoto(1);
            });
            tripPhotoNextButton.dataset.initialised = 'true';
        }
        tripPhotoDeleteButton = document.querySelector('[data-trip-photo-delete]');
        if (tripPhotoDeleteButton && !tripPhotoDeleteButton.dataset.initialised) {
            tripPhotoDeleteButton.addEventListener('click', handleTripPhotoDeleteClick);
            tripPhotoDeleteButton.dataset.initialised = 'true';
        }
        if (tripPhotoModalImageElement && !tripPhotoModalImageElement.dataset.initialised) {
            tripPhotoModalImageElement.addEventListener('click', handleTripPhotoModalImageClick);
            tripPhotoModalImageElement.dataset.initialised = 'true';
        }
    }

    tripPhotoSelectToggleButton = document.querySelector('[data-trip-photo-select-toggle]');
    if (tripPhotoSelectToggleButton && !tripPhotoSelectToggleButton.dataset.initialised) {
        tripPhotoSelectToggleButton.addEventListener('click', () => {
            enterTripPhotoSelectionMode();
            updateTripPhotoSelectionUI();
        });
        tripPhotoSelectToggleButton.dataset.initialised = 'true';
    }

    tripPhotoDeleteSelectedButton = document.querySelector('[data-trip-photo-delete-selected]');
    if (tripPhotoDeleteSelectedButton && !tripPhotoDeleteSelectedButton.dataset.initialised) {
        tripPhotoDeleteSelectedButton.addEventListener('click', handleTripPhotoDeleteSelectedClick);
        tripPhotoDeleteSelectedButton.dataset.initialised = 'true';
    }

    tripPhotoCancelSelectionButton = document.querySelector('[data-trip-photo-cancel-selection]');
    if (tripPhotoCancelSelectionButton && !tripPhotoCancelSelectionButton.dataset.initialised) {
        tripPhotoCancelSelectionButton.addEventListener('click', () => {
            exitTripPhotoSelectionMode();
            updateTripPhotoSelectionUI();
            showTripDescriptionStatus('');
        });
        tripPhotoCancelSelectionButton.dataset.initialised = 'true';
    }

    if (!tripDescriptionTitleElement) {
        if (!tripDetailState.initialised) { initTripDetailPanel(); }
        tripDescriptionTitleElement = tripDetailTitleElement || document.getElementById('tripDetailTitle');
    }

    if (tripProfilePanelInitialised) {
        applyTripProfileEditMode();
        updateTripDescriptionDisplay();
        updateTripDescriptionSaveButtonState();
        return;
    }

    if (tripDescriptionCancelButton) {
        tripDescriptionCancelButton.addEventListener('click', handleTripDescriptionCancel);
    }

    if (tripDescriptionForm) {
        tripDescriptionForm.addEventListener('submit', handleTripDescriptionSubmit);
    }

    if (tripDescriptionField) {
        tripDescriptionField.addEventListener('input', () => {
            const currentValue = tripDescriptionField.value || '';
            const lastValue = tripDescriptionState.lastAppliedDescription || '';
            tripDescriptionState.isDirty = tripProfileEditState.active
                && currentValue !== lastValue;
            updateTripDescriptionSaveButtonState();
            if (tripDescriptionStatusElement && !tripDescriptionStatusElement.hidden) {
                showTripDescriptionStatus('');
            }
        });
    }

    if (tripNameInputElement) {
        tripNameInputElement.addEventListener('input', () => {
            const currentValue = tripNameInputElement.value ? tripNameInputElement.value.trim() : '';
            const lastValue = tripDescriptionState.lastAppliedName ? tripDescriptionState.lastAppliedName.trim() : '';
            tripDescriptionState.isNameDirty = tripProfileEditState.active
                && currentValue !== lastValue;
            updateTripDescriptionSaveButtonState();
            if (tripDescriptionStatusElement && !tripDescriptionStatusElement.hidden) {
                showTripDescriptionStatus('');
            }
        });
    }

    if (tripPhotosInputElement && !tripPhotosInputElement.dataset.initialised) {
        tripPhotosInputElement.addEventListener('input', () => {
            const currentValue = tripPhotosInputElement.value ? tripPhotosInputElement.value.trim() : '';
            const lastValue = tripDescriptionState.lastAppliedPhotosUrl
                ? tripDescriptionState.lastAppliedPhotosUrl.trim()
                : '';
            tripDescriptionState.isPhotosUrlDirty = tripProfileEditState.active
                && currentValue !== lastValue;
            updateTripDescriptionSaveButtonState();
            if (tripDescriptionStatusElement && !tripDescriptionStatusElement.hidden) {
                showTripDescriptionStatus('');
            }
        });
        tripPhotosInputElement.dataset.initialised = 'true';
    }

    tripProfilePanelInitialised = true;
    applyTripProfileEditMode();
    updateTripDescriptionDisplay();
    updateTripDescriptionSaveButtonState();
    updateTripPhotosSection();
}

function openTripProfile(tripId, options = {}) {
    initTripProfilePanel();
    exitTripPhotoSelectionMode({ preserveSelection: false, silent: true });

    const cleanedTripId = typeof tripId === 'string'
        ? tripId.trim()
        : String(tripId || '').trim();
    if (!cleanedTripId) { return; }

    const { triggerElement = null } = options || {};

    tripDescriptionState.tripId = cleanedTripId;
    tripDescriptionState.isSaving = false;
    tripDescriptionState.isDirty = false;
    tripDescriptionState.isNameDirty = false;
    tripDescriptionState.isPhotosUrlDirty = false;
    tripDescriptionState.lastAppliedDescription = '';
    tripDescriptionState.lastAppliedName = '';
    tripDescriptionState.lastAppliedPhotosUrl = '';
    tripDescriptionState.triggerElement = triggerElement || null;

    exitTripProfileEditMode({ force: true });

    if (tripDescriptionForm) {
        tripDescriptionForm.classList.remove('is-saving');
        tripDescriptionForm.reset();
    }

    if (tripDescriptionField) {
        tripDescriptionField.disabled = false;
    }

    if (tripDescriptionDisplayElement) {
        updateTripDescriptionDisplay('');
    }
    updateTripPhotosSection({ photos: [], url: '' });
    if (tripDescriptionUpdatedReadOnlyElement) {
        tripDescriptionUpdatedReadOnlyElement.hidden = true;
    }
    if (tripDescriptionUpdatedReadOnlyTimeElement) {
        tripDescriptionUpdatedReadOnlyTimeElement.textContent = '';
        tripDescriptionUpdatedReadOnlyTimeElement.removeAttribute('dateTime');
    }

    if (tripProfilePanelElement) {
        tripProfilePanelElement.scrollTop = 0;
    }

    showTripDescriptionStatus('');

    const fallbackTrip = getTripFromState(cleanedTripId) || { id: cleanedTripId, name: TRIP_NAME_FALLBACK, description: '' };
    populateTripProfilePanel(fallbackTrip, { preserveDirty: false });

    updateTripDescriptionSaveButtonState();

    const requestId = tripDescriptionState.requestId + 1;
    refreshTripDescription(cleanedTripId, requestId);
}

function closeTripProfileOverlay(options = {}) {
    const { restoreFocus = true } = options || {};
    initTripProfilePanel();
    exitTripPhotoSelectionMode({ preserveSelection: false, silent: true });

    tripDescriptionState.requestId += 1;
    const trigger = tripDescriptionState.triggerElement;
    tripDescriptionState.tripId = null;
    tripDescriptionState.isSaving = false;
    tripDescriptionState.isDirty = false;
    tripDescriptionState.isNameDirty = false;
    tripDescriptionState.isPhotosUrlDirty = false;
    tripDescriptionState.lastAppliedDescription = '';
    tripDescriptionState.lastAppliedName = '';
    tripDescriptionState.lastAppliedPhotosUrl = '';
    tripDescriptionState.triggerElement = null;

    exitTripProfileEditMode({ force: true, restoreFocus: false });

    if (tripDescriptionForm) {
        tripDescriptionForm.classList.remove('is-saving');
        tripDescriptionForm.reset();
    }

    if (tripDescriptionField) {
        tripDescriptionField.disabled = false;
        tripDescriptionField.value = '';
    }

    if (tripDescriptionUpdatedElement) {
        tripDescriptionUpdatedElement.hidden = true;
    }
    if (tripDescriptionUpdatedTimeElement) {
        tripDescriptionUpdatedTimeElement.textContent = '';
        tripDescriptionUpdatedTimeElement.removeAttribute('dateTime');
    }

    if (tripDescriptionUpdatedReadOnlyElement) {
        tripDescriptionUpdatedReadOnlyElement.hidden = true;
    }
    if (tripDescriptionUpdatedReadOnlyTimeElement) {
        tripDescriptionUpdatedReadOnlyTimeElement.textContent = '';
        tripDescriptionUpdatedReadOnlyTimeElement.removeAttribute('dateTime');
    }

    if (tripDescriptionDisplayElement) {
        updateTripDescriptionDisplay('');
    }

    tripDetailState.photoItems = [];
    tripDetailState.photos = [];
    updateTripPhotosSection({ photos: [], photoItems: [], url: '' });

    showTripDescriptionStatus('');
    updateTripDescriptionSaveButtonState();

    if (restoreFocus && trigger && typeof trigger.focus === 'function') {
        try {
            trigger.focus({ preventScroll: true });
        } catch (error) {
            trigger.focus();
        }
    }
}

function openTripDetail(tripId, triggerElement) {
    if (!tripId) { return; }
    if (!tripListState.initialised) { initTripsPanel(); }
    initTripDetailPanel();
    exitTripPhotoSelectionMode({ preserveSelection: false, silent: true });

    const requestId = tripDetailState.requestId + 1;
    tripDetailState.requestId = requestId;
    tripDetailState.selectedTripId = tripId;
    tripDetailState.triggerElement = triggerElement || null;
    tripDetailState.searchTerm = '';
    tripDetailState.sortField = TRIP_LOCATION_SORT_FIELD_DATE;
    tripDetailState.sortDirection = TRIP_SORT_DIRECTION_ASC;
    tripDetailState.locations = [];
    tripDetailState.trip = null;
    tripDetailState.photoItems = [];
    tripDetailState.photos = [];
    tripDetailState.activeLocationId = null;
    applyActiveMarkerFilter();

    activateTripMapMode();

    if (tripLocationSearchInput) { tripLocationSearchInput.value = ''; }
    if (tripLocationSortFieldSelect) { tripLocationSortFieldSelect.value = TRIP_LOCATION_SORT_FIELD_DATE; }
    updateTripLocationSortDirectionButton();
    clearTripLocationMessages();
    if (tripLocationListContainer) {
        tripLocationListContainer.innerHTML = '';
        tripLocationListContainer.hidden = true;
    }
    hideTripLocationError();
    updateTripPhotosSection({ photos: [], url: tripDescriptionState.lastAppliedPhotosUrl || '' });

    const fallbackTrip = Array.isArray(tripListState.trips)
        ? tripListState.trips.find((entry) => entry.id === tripId)
        : null;
    if (fallbackTrip) {
        tripDetailState.trip = { ...fallbackTrip };
    }
    updateTripDetailHeader();

    requestTripListScrollPreservation();
    showTripDetailView();
    renderTripList({ preserveScroll: true });
    setTripDetailLoading(true);

    const cached = tripLocationCache.get(tripId);
    if (cached && Array.isArray(cached.locations)) {
        const normalisedTrip = normaliseTrip(cached.trip) || fallbackTrip || { id: tripId, name: TRIP_NAME_FALLBACK };
        const locations = normaliseTripLocationList(cached.locations);
        const photos = Array.isArray(cached.photos) ? cached.photos : [];
        const photoItems = Array.isArray(cached.photo_items) ? cached.photo_items : [];
        tripDetailState.trip = { ...normalisedTrip, location_count: locations.length };
        tripDetailState.locations = locations;
        applyActiveMarkerFilter();
        updateTripPhotosSection({
            photoItems,
            photos,
            url: normalisedTrip && normalisedTrip.google_photos_url
                ? normalisedTrip.google_photos_url
                : tripDescriptionState.lastAppliedPhotosUrl,
        });
        populateTripProfilePanel(normalisedTrip, {
            preserveDirty: tripProfileEditState.active,
            photos,
            photoItems,
        });
        updateTripDetailHeader();
        renderTripLocationList();
        focusMapOnTripLocations();
        setTripDetailLoading(false);
    } else {
        loadTripDetailData(tripId, requestId);
    }

}

function closeTripDetail(options = {}) {
    initTripDetailPanel();
    const { restoreFocus = true, skipRender = false } = options || {};
    const previousTripId = tripDetailState.selectedTripId;
    const triggerElement = tripDetailState.triggerElement;

    closeTripProfileOverlay({ restoreFocus: false });

    tripDetailState.selectedTripId = null;
    tripDetailState.trip = null;
    tripDetailState.locations = [];
    tripDetailState.photoItems = [];
    tripDetailState.photos = [];
    tripDetailState.searchTerm = '';
    tripDetailState.sortField = TRIP_LOCATION_SORT_FIELD_DATE;
    tripDetailState.sortDirection = TRIP_SORT_DIRECTION_ASC;
    tripDetailState.requestId += 1;
    tripDetailState.triggerElement = null;
    tripDetailState.activeLocationId = null;
    applyActiveMarkerFilter();

    if (tripLocationSearchInput) { tripLocationSearchInput.value = ''; }
    if (tripLocationSortFieldSelect) { tripLocationSortFieldSelect.value = TRIP_LOCATION_SORT_FIELD_DATE; }
    updateTripLocationSortDirectionButton();
    clearTripLocationMessages();
    hideTripLocationError();
    if (tripLocationListContainer) {
        tripLocationListContainer.innerHTML = '';
        tripLocationListContainer.hidden = true;
    }
    setTripDetailLoading(false);
    hideTripDetailView();

    if (tripDetailTitleElement) {
        const defaultTitle = tripDetailTitleElement.dataset.defaultText || 'Trip details';
        tripDetailTitleElement.textContent = defaultTitle;
    }
    if (tripDetailSubtitleElement) {
        const defaultSubtitle = tripDetailSubtitleElement.dataset.defaultText || 'Review the places assigned to this journey.';
        tripDetailSubtitleElement.textContent = defaultSubtitle;
    }
    if (tripDetailCountElement) { tripDetailCountElement.textContent = ''; }
    if (tripDetailUpdatedElement) {
        tripDetailUpdatedElement.hidden = true;
        tripDetailUpdatedElement.textContent = '';
    }

    deactivateTripMapMode();

    if (!skipRender) {
        renderTripList();
    }

    if (restoreFocus) {
        let focusTarget = null;
        if (triggerElement && document.body.contains(triggerElement)) {
            focusTarget = triggerElement;
        } else if (tripListContainer) {
            const items = Array.from(tripListContainer.querySelectorAll('.trip-item'));
            if (previousTripId) {
                focusTarget = items.find((element) => element.dataset.tripId === previousTripId) || null;
            }
            if (!focusTarget) {
                focusTarget = items[0] || tripListContainer;
            }
        }

        if (focusTarget && typeof focusTarget.focus === 'function') {
            try {
                focusTarget.focus({ preventScroll: true });
            } catch (error) {
                focusTarget.focus();
            }
        }
    }
}

function attachTripProfileEscapeListener() {
    if (tripProfileEscapeListener) { return; }
    tripProfileEscapeListener = (event) => {
        if (event.defaultPrevented || event.key !== 'Escape') { return; }

        const stopEvent = () => {
            if (typeof event.stopImmediatePropagation === 'function') {
                event.stopImmediatePropagation();
            }
            if (typeof event.stopPropagation === 'function') {
                event.stopPropagation();
            }
        };

        if (tripProfileEditState.active) {
            event.preventDefault();
            stopEvent();
            handleTripDescriptionCancel();
            return;
        }

        event.preventDefault();
        stopEvent();
        closeTripDetail();
    };
    document.addEventListener('keydown', tripProfileEscapeListener);
}

function detachTripProfileEscapeListener() {
    if (!tripProfileEscapeListener) { return; }
    document.removeEventListener('keydown', tripProfileEscapeListener);
    tripProfileEscapeListener = null;
}

function showTripDetailView() {
    initTripDetailPanel();
    initTripProfilePanel();
    if (tripDetailContainer) {
        tripDetailContainer.hidden = false;
        tripDetailContainer.setAttribute('aria-hidden', 'false');
    }
    if (tripProfileOverlay) {
        tripProfileOverlay.hidden = false;
        tripProfileOverlay.setAttribute('aria-hidden', 'false');
        tripProfileOverlay.classList.add('open');
    }
    if (tripProfilePanelElement) {
        tripProfilePanelElement.scrollTop = 0;
    }
    const preferredFocusTarget = (() => {
        if (tripDetailBackButton && typeof tripDetailBackButton.focus === 'function') {
            return tripDetailBackButton;
        }
        if (tripProfilePanelElement && typeof tripProfilePanelElement.focus === 'function') {
            return tripProfilePanelElement;
        }
        return null;
    })();

    if (preferredFocusTarget) {
        try {
            preferredFocusTarget.focus({ preventScroll: true });
        } catch (error) {
            preferredFocusTarget.focus();
        }
    }
    attachTripProfileEscapeListener();
}

function hideTripDetailView() {
    initTripDetailPanel();
    initTripProfilePanel();
    if (tripDetailContainer) {
        tripDetailContainer.hidden = true;
        tripDetailContainer.setAttribute('aria-hidden', 'true');
    }
    if (tripProfileOverlay) {
        tripProfileOverlay.classList.remove('open');
        tripProfileOverlay.setAttribute('aria-hidden', 'true');
        tripProfileOverlay.hidden = true;
    }
    detachTripProfileEscapeListener();
}

function updateTripDetailHeader() {
    initTripDetailPanel();
    const trip = tripDetailState.trip;
    if (tripDetailTitleElement) {
        const defaultTitle = tripDetailTitleElement.dataset.defaultText || 'Trip details';
        const name = trip && trip.name ? trip.name : defaultTitle;
        tripDetailTitleElement.textContent = name;
    }
    if (tripDetailSubtitleElement) {
        const defaultSubtitle = tripDetailSubtitleElement.dataset.defaultText || 'Review the places assigned to this journey.';
        tripDetailSubtitleElement.textContent = defaultSubtitle;
    }
    if (tripDetailCountElement) {
        const count = Array.isArray(tripDetailState.locations) ? tripDetailState.locations.length : 0;
        tripDetailCountElement.textContent = formatTripLocationCount(count);
    }
    if (tripDetailUpdatedElement) {
        const updatedValue = trip && (
            trip.latest_location_date || trip.updated_at || trip.created_at || ''
        );
        const formatted = formatTripDate(updatedValue);
        if (formatted) {
            tripDetailUpdatedElement.hidden = false;
            tripDetailUpdatedElement.textContent = '';
            tripDetailUpdatedElement.append('Updated ');
            const timeElement = document.createElement('time');
            timeElement.dateTime = updatedValue;
            timeElement.textContent = formatted;
            try {
                const dateObj = new Date(updatedValue);
                if (!Number.isNaN(dateObj.getTime())) {
                    timeElement.title = dateObj.toLocaleString();
                }
            } catch (error) {
                // Ignore formatting issues
            }
            tripDetailUpdatedElement.appendChild(timeElement);
        } else {
            tripDetailUpdatedElement.hidden = true;
            tripDetailUpdatedElement.textContent = '';
        }
    }

    updateTripDetailActions();
}

function updateTripDetailActions() {
    initTripDetailPanel();
    if (!tripDetailActionsElement) { return; }

    const trip = tripDetailState.trip;
    const hasTrip = trip && trip.id;

    if (hasTrip) {
        const tripId = typeof trip.id === 'string' ? trip.id : String(trip.id || '');
        const name = trip.name ? String(trip.name) : TRIP_NAME_FALLBACK;
        const displayName = name || TRIP_NAME_FALLBACK;
        tripDetailActionsElement.hidden = false;
        const isSaving = Boolean(tripDescriptionState.isSaving);

        if (tripDetailEditButton) {
            const editLabel = displayName
                ? `Edit trip "${displayName}"`
                : 'Edit trip';
            tripDetailEditButton.disabled = tripProfileEditState.active || isSaving;
            tripDetailEditButton.dataset.tripId = tripId;
            tripDetailEditButton.setAttribute('aria-label', editLabel);
            tripDetailEditButton.title = editLabel;
        }

        if (tripDetailDeleteButton) {
            tripDetailDeleteButton.dataset.tripId = tripId;
            const deleteLabel = displayName
                ? `Delete trip "${displayName}"`
                : 'Delete trip';
            tripDetailDeleteButton.setAttribute('aria-label', deleteLabel);
            tripDetailDeleteButton.title = deleteLabel;
            const canInteract = tripProfileEditState.active && !isSaving;
            tripDetailDeleteButton.hidden = !tripProfileEditState.active;
            tripDetailDeleteButton.disabled = !canInteract;
        }
        if (tripDescriptionCancelButton) {
            tripDescriptionCancelButton.hidden = !tripProfileEditState.active;
        }
    } else {
        tripDetailActionsElement.hidden = true;
        if (tripDetailEditButton) {
            tripDetailEditButton.disabled = true;
            delete tripDetailEditButton.dataset.tripId;
            tripDetailEditButton.removeAttribute('aria-label');
            tripDetailEditButton.removeAttribute('title');
        }
        if (tripDetailDeleteButton) {
            tripDetailDeleteButton.hidden = true;
            tripDetailDeleteButton.disabled = true;
            delete tripDetailDeleteButton.dataset.tripId;
            tripDetailDeleteButton.removeAttribute('aria-label');
            tripDetailDeleteButton.removeAttribute('title');
        }
        if (tripDescriptionCancelButton) {
            tripDescriptionCancelButton.hidden = true;
        }
    }
}

function updateTripLocationSortDirectionButton() {
    if (!tripLocationSortDirectionButton) { return; }
    const isAscending = tripDetailState.sortDirection !== TRIP_SORT_DIRECTION_DESC;
    tripLocationSortDirectionButton.textContent = isAscending ? 'Ascending' : 'Descending';
    tripLocationSortDirectionButton.setAttribute('aria-label', isAscending ? 'Sort descending' : 'Sort ascending');
    tripLocationSortDirectionButton.title = isAscending ? 'Switch to descending order' : 'Switch to ascending order';
}

function setTripDetailLoading(isLoading) {
    if (!tripDetailState.initialised) { initTripDetailPanel(); }
    if (tripLocationLoadingElement) {
        tripLocationLoadingElement.hidden = !isLoading;
    }
    if (!isLoading) { return; }
    if (tripLocationListContainer) { tripLocationListContainer.hidden = true; }
    if (tripLocationEmptyElement) { tripLocationEmptyElement.hidden = true; }
    if (tripLocationErrorElement) {
        tripLocationErrorElement.hidden = true;
        tripLocationErrorElement.textContent = '';
    }
}

function clearTripLocationMessages() {
    if (tripLocationEmptyElement) { tripLocationEmptyElement.hidden = true; }
    if (tripLocationErrorElement) {
        tripLocationErrorElement.hidden = true;
        tripLocationErrorElement.textContent = '';
    }
}

function hideTripLocationError() {
    if (tripLocationErrorElement) {
        tripLocationErrorElement.hidden = true;
        tripLocationErrorElement.textContent = '';
    }
}

function showTripLocationError(message) {
    if (!tripDetailState.initialised) { initTripDetailPanel(); }
    if (tripLocationLoadingElement) { tripLocationLoadingElement.hidden = true; }
    if (tripLocationErrorElement) {
        tripLocationErrorElement.textContent = message || 'Failed to load locations.';
        tripLocationErrorElement.hidden = false;
    }
    if (tripLocationListContainer) { tripLocationListContainer.hidden = true; }
    if (tripLocationEmptyElement) { tripLocationEmptyElement.hidden = true; }
}

function showTripLocationEmpty(message) {
    if (!tripDetailState.initialised) { initTripDetailPanel(); }
    if (tripLocationLoadingElement) { tripLocationLoadingElement.hidden = true; }
    if (tripLocationEmptyElement) {
        if (message) { tripLocationEmptyElement.textContent = message; }
        tripLocationEmptyElement.hidden = false;
    }
    if (tripLocationListContainer) { tripLocationListContainer.hidden = true; }
    if (tripLocationErrorElement) {
        tripLocationErrorElement.hidden = true;
        tripLocationErrorElement.textContent = '';
    }
}

function renderTripLocationList() {
    if (!tripDetailState.initialised) { initTripDetailPanel(); }
    if (!tripLocationListContainer) { return; }

    const locations = Array.isArray(tripDetailState.locations) ? tripDetailState.locations : [];
    const hasLocations = locations.length > 0;
    const searchTerm = tripDetailState.searchTerm;

    if (tripDetailState.activeLocationId) {
        const activeExists = locations.some((entry) => entry && entry.key === tripDetailState.activeLocationId);
        if (!activeExists) {
            tripDetailState.activeLocationId = null;
        }
    }

    let filtered = locations;
    if (searchTerm) {
        filtered = locations.filter((location) => createTripLocationSearchText(location).includes(searchTerm));
    }

    tripLocationListContainer.innerHTML = '';

    if (!hasLocations) {
        showTripLocationEmpty('No locations assigned to this trip yet.');
        return;
    }

    if (!filtered.length) {
        showTripLocationEmpty('No locations match your search.');
        return;
    }

    clearTripLocationMessages();
    if (tripLocationLoadingElement) { tripLocationLoadingElement.hidden = true; }

    const sorted = filtered.slice().sort((a, b) => compareTripLocations(a, b));
    const fragment = document.createDocumentFragment();
    sorted.forEach((location) => {
        const element = createTripLocationListItem(location);
        if (element) { fragment.appendChild(element); }
    });

    tripLocationListContainer.appendChild(fragment);
    tripLocationListContainer.hidden = false;
    tripLocationListContainer.scrollTop = 0;
    updateActiveTripLocationHighlight();
}

function compareTripLocations(a, b) {
    const direction = tripDetailState.sortDirection === TRIP_SORT_DIRECTION_DESC ? -1 : 1;
    const field = tripDetailState.sortField === TRIP_LOCATION_SORT_FIELD_NAME
        ? TRIP_LOCATION_SORT_FIELD_NAME
        : TRIP_LOCATION_SORT_FIELD_DATE;

    if (field === TRIP_LOCATION_SORT_FIELD_NAME) {
        const nameA = (a && typeof a.display_name === 'string') ? a.display_name : '';
        const nameB = (b && typeof b.display_name === 'string') ? b.display_name : '';
        const comparison = nameA.localeCompare(nameB, undefined, { sensitivity: 'base' });
        if (comparison !== 0) { return comparison * direction; }
    } else {
        const valueA = (a && typeof a.date_value === 'number' && Number.isFinite(a.date_value))
            ? a.date_value
            : (direction === 1 ? Number.MAX_SAFE_INTEGER : Number.MIN_SAFE_INTEGER);
        const valueB = (b && typeof b.date_value === 'number' && Number.isFinite(b.date_value))
            ? b.date_value
            : (direction === 1 ? Number.MAX_SAFE_INTEGER : Number.MIN_SAFE_INTEGER);
        if (valueA !== valueB) {
            return (valueA - valueB) * direction;
        }
    }

    const secondaryA = (a && typeof a.display_name === 'string') ? a.display_name : '';
    const secondaryB = (b && typeof b.display_name === 'string') ? b.display_name : '';
    const secondaryComparison = secondaryA.localeCompare(secondaryB, undefined, { sensitivity: 'base' });
    if (secondaryComparison !== 0) { return secondaryComparison * direction; }

    const orderA = (a && typeof a.order === 'number' && Number.isFinite(a.order)) ? a.order : 0;
    const orderB = (b && typeof b.order === 'number' && Number.isFinite(b.order)) ? b.order : 0;
    return (orderA - orderB) * direction;
}

function normaliseTripLocationList(locations) {
    if (!Array.isArray(locations)) { return []; }
    return locations.map((location, index) => normaliseTripLocation(location, index)).filter(Boolean);
}

function normaliseTripLocation(location, index) {
    if (!location || typeof location !== 'object') { return null; }

    const rawId = location.place_id ?? location.id ?? '';
    const placeId = typeof rawId === 'string' ? rawId.trim() : String(rawId || '').trim();

    const nameRaw = location.name ?? '';
    const name = typeof nameRaw === 'string' ? nameRaw.trim() : String(nameRaw || '').trim();

    const aliasRaw = location.alias ?? '';
    const alias = typeof aliasRaw === 'string' ? aliasRaw.trim() : String(aliasRaw || '').trim();

    const displayRaw = location.display_name ?? '';
    let displayName = typeof displayRaw === 'string' ? displayRaw.trim() : String(displayRaw || '').trim();
    if (!displayName) {
        displayName = alias || name || 'Unknown location';
    }

    const descriptionRaw = location.description ?? '';
    let descriptionText = '';
    if (typeof descriptionRaw === 'string') {
        descriptionText = descriptionRaw;
    } else if (descriptionRaw !== null && descriptionRaw !== undefined) {
        descriptionText = String(descriptionRaw);
    }
    const description = descriptionText && descriptionText.trim() ? descriptionText : '';

    const startDateRaw = location.start_date ?? '';
    const startDate = typeof startDateRaw === 'string' ? startDateRaw.trim() : String(startDateRaw || '').trim();

    const endDateRaw = location.end_date ?? '';
    const endDate = typeof endDateRaw === 'string' ? endDateRaw.trim() : String(endDateRaw || '').trim();

    const dateRaw = location.date ?? '';
    const dateValue = typeof dateRaw === 'string' ? dateRaw.trim() : String(dateRaw || '').trim();
    const primaryDate = dateValue || startDate || endDate;

    let timestamp = null;
    if (primaryDate) {
        const parsed = Date.parse(primaryDate);
        if (!Number.isNaN(parsed)) {
            timestamp = parsed;
        }
    }

    const sourceTypeRaw = location.source_type ?? '';
    const sourceType = typeof sourceTypeRaw === 'string' ? sourceTypeRaw.trim() : String(sourceTypeRaw || '').trim();

    const archived = Boolean(location.archived);
    const missing = Boolean(location.missing);
    const orderValue = Number(location.order);
    const order = Number.isFinite(orderValue) ? orderValue : index;

    const latitudeNumber = Number(location.latitude);
    const longitudeNumber = Number(location.longitude);
    const latitude = Number.isFinite(latitudeNumber) ? latitudeNumber : null;
    const longitude = Number.isFinite(longitudeNumber) ? longitudeNumber : null;

    const key = placeId || `trip-location-${index}`;

    return {
        key,
        place_id: placeId,
        name,
        alias,
        display_name: displayName,
        description,
        start_date: startDate,
        end_date: endDate,
        date: primaryDate,
        date_value: timestamp,
        source_type: sourceType,
        archived,
        missing,
        order,
        latitude,
        longitude,
    };
}

function createTripLocationSearchText(location) {
    if (!location || typeof location !== 'object') { return ''; }
    const parts = [];
    if (location.display_name) { parts.push(String(location.display_name)); }
    if (location.alias) { parts.push(String(location.alias)); }
    if (location.name) { parts.push(String(location.name)); }
    if (location.description) { parts.push(String(location.description)); }
    if (location.place_id) { parts.push(String(location.place_id)); }
    if (location.source_type) { parts.push(getSourceTypeLabel(location.source_type)); }
    if (location.date) { parts.push(String(location.date)); }
    if (location.start_date) { parts.push(String(location.start_date)); }
    if (location.end_date) { parts.push(String(location.end_date)); }
    const formatted = formatTripDate(location.date || location.start_date || location.end_date || '');
    if (formatted) { parts.push(formatted); }
    return parts.join(' ').toLowerCase();
}

function createTripLocationListItem(location) {
    if (!location || typeof location !== 'object') { return null; }

    const item = document.createElement('article');
    item.className = 'trip-location-item';
    item.setAttribute('role', 'listitem');
    item.tabIndex = 0;
    if (location.key) { item.dataset.locationId = location.key; }
    if (location.missing) {
        item.classList.add('trip-location-item-missing');
    }

    if (tripDetailState.activeLocationId && location.key === tripDetailState.activeLocationId) {
        item.classList.add('trip-location-item-active');
    }

    const hasCoordinates = typeof location.latitude === 'number'
        && Number.isFinite(location.latitude)
        && typeof location.longitude === 'number'
        && Number.isFinite(location.longitude);
    const accessibleName = location.display_name || location.alias || location.name || 'Unknown location';
    if (location.missing || !hasCoordinates) {
        item.setAttribute('aria-label', `${accessibleName}. Location details are unavailable on the map.`);
    } else {
        item.setAttribute('aria-label', `Focus map on ${accessibleName}`);
    }

    const title = document.createElement('div');
    title.className = 'trip-location-name';
    title.textContent = location.display_name || 'Unknown location';
    item.appendChild(title);

    const meta = document.createElement('div');
    meta.className = 'trip-location-meta';

    if (location.missing) {
        const missingNote = document.createElement('div');
        missingNote.className = 'trip-location-missing-note';
        missingNote.textContent = 'Details for this location are unavailable in the current timeline.';
        meta.appendChild(missingNote);
    } else {
        if (location.alias && location.name && location.alias !== location.name) {
            const originalRow = document.createElement('div');
            originalRow.className = 'trip-location-meta-entry';
            //originalRow.append('Place: ');
            const originalName = document.createElement('span');
            originalName.textContent = location.name;
            originalRow.appendChild(originalName);
            meta.appendChild(originalRow);
        } else if (location.name && (!location.display_name || location.display_name !== location.name)) {
            const nameRow = document.createElement('div');
            nameRow.className = 'trip-location-meta-entry';
            //nameRow.append('Place: ');
            const nameValue = document.createElement('span');
            nameValue.textContent = location.name;
            nameRow.appendChild(nameValue);
            meta.appendChild(nameRow);
        }

        const metaRow = document.createElement('div');
        metaRow.className = 'trip-location-meta-row';

        const dateLabel = location.date || location.start_date || location.end_date || '';
        const formattedDate = formatTripDate(dateLabel);
        if (formattedDate) {
            const dateEntry = document.createElement('span');
            dateEntry.className = 'trip-location-meta-entry';
            dateEntry.append('Visited ');
            const timeElement = document.createElement('time');
            timeElement.dateTime = dateLabel;
            timeElement.textContent = formattedDate;
            try {
                const dateObj = new Date(dateLabel);
                if (!Number.isNaN(dateObj.getTime())) {
                    timeElement.title = dateObj.toLocaleString();
                }
            } catch (error) {
                // Ignore formatting errors
            }
            dateEntry.appendChild(timeElement);
            metaRow.appendChild(dateEntry);
        }

        if (location.source_type) {
            const sourceEntry = document.createElement('span');
            sourceEntry.className = 'trip-location-meta-entry';
            const label = document.createElement('span');
            label.className = 'trip-location-meta-label';
            label.textContent = 'Source';
            const value = document.createElement('span');
            value.textContent = getSourceTypeLabel(location.source_type);
            sourceEntry.appendChild(label);
            sourceEntry.appendChild(value);
            metaRow.appendChild(sourceEntry);
        }

        if (location.archived) {
            const archivedTag = document.createElement('span');
            archivedTag.className = 'trip-location-tag';
            archivedTag.textContent = 'Archived';
            metaRow.appendChild(archivedTag);
        }

        if (metaRow.children.length) {
            meta.appendChild(metaRow);
        }
    }

    if (location.description) {
        const description = document.createElement('div');
        description.className = 'trip-location-description';
        description.textContent = location.description;
        meta.appendChild(description);
    }

    item.appendChild(meta);

    if (tripDetailState.selectedTripId && location.place_id) {
        const actions = document.createElement('div');
        actions.className = 'trip-location-actions';

        const removeButton = document.createElement('button');
        removeButton.type = 'button';
        removeButton.className = 'trip-location-remove';
        removeButton.textContent = 'Remove from Trip';
        removeButton.addEventListener('click', (event) => {
            event.preventDefault();
            event.stopPropagation();
            const tripId = tripDetailState.selectedTripId;
            const placeId = location.place_id;
            const locationLabel = location.display_name || location.alias || location.name || 'this location';
            removeLocationFromTrip(tripId, placeId, {
                triggerButton: removeButton,
                confirmMessage: `Remove "${locationLabel}" from this trip?`,
            });
        });

        actions.appendChild(removeButton);
        item.appendChild(actions);
    }

    return item;
}

function findTripLocationById(placeId) {
    if (!placeId) { return null; }
    const locations = Array.isArray(tripDetailState.locations) ? tripDetailState.locations : [];
    return locations.find((entry) => entry && entry.key === placeId) || null;
}

function updateActiveTripLocationHighlight() {
    if (!tripLocationListContainer) { return; }
    const activeId = tripDetailState.activeLocationId;
    const items = tripLocationListContainer.querySelectorAll('.trip-location-item');
    items.forEach((element) => {
        if (activeId && element.dataset.locationId === activeId) {
            element.classList.add('trip-location-item-active');
        } else {
            element.classList.remove('trip-location-item-active');
        }
    });
}

function focusTripLocationById(locationId, sourceElement) {
    const location = findTripLocationById(locationId);
    if (!location) {
        showStatus('Details for this location are unavailable.', true);
        return;
    }

    const hasCoordinates = typeof location.latitude === 'number'
        && Number.isFinite(location.latitude)
        && typeof location.longitude === 'number'
        && Number.isFinite(location.longitude);

    if (!hasCoordinates || location.missing) {
        showStatus('Map location is unavailable for this place.', true);
        return;
    }

    const moved = focusMapOnTripLocation(location);
    if (!moved) {
        showStatus('Map location is unavailable for this place.', true);
        return;
    }

    tripDetailState.activeLocationId = location.key;
    updateActiveTripLocationHighlight();

    if (sourceElement && typeof sourceElement.focus === 'function') {
        try {
            sourceElement.focus({ preventScroll: true });
        } catch (error) {
            sourceElement.focus();
        }
    }
}

async function loadTripDetailData(tripId, requestId) {
    if (!tripId) { return; }
    initTripDetailPanel();

    const activeRequestId = typeof requestId === 'number' ? requestId : tripDetailState.requestId + 1;
    if (typeof requestId !== 'number') {
        tripDetailState.requestId = activeRequestId;
    }

    try {
        const response = await fetch(`/api/trips/${encodeURIComponent(tripId)}`);
        if (!response.ok) {
            throw new Error('Failed to load trip.');
        }
        const data = await response.json();
        if (tripDetailState.requestId !== activeRequestId || tripDetailState.selectedTripId !== tripId) { return; }

        const tripData = data && typeof data === 'object' && !Array.isArray(data)
            ? (data.trip ?? data)
            : {};
        const locationsRaw = data && typeof data === 'object' && Array.isArray(data.locations)
            ? data.locations
            : [];
        const photosRaw = data && typeof data === 'object' && Array.isArray(data.photos)
            ? data.photos
            : [];
        const photoItemsRaw = data && typeof data === 'object' && Array.isArray(data.photo_items)
            ? data.photo_items
            : [];

        tripLocationCache.set(tripId, {
            trip: tripData,
            locations: locationsRaw,
            photos: photosRaw,
            photo_items: photoItemsRaw,
        });

        const normalisedTrip = normaliseTrip(tripData) || { id: tripId, name: TRIP_NAME_FALLBACK };
        const locations = normaliseTripLocationList(locationsRaw);

        tripDetailState.trip = { ...normalisedTrip, location_count: locations.length };
        tripDetailState.locations = locations;
        applyActiveMarkerFilter();
        updateTripPhotosSection({
            photoItems: Array.isArray(photoItemsRaw) ? photoItemsRaw : undefined,
            photos: Array.isArray(photosRaw) ? photosRaw : undefined,
            url: normalisedTrip && normalisedTrip.google_photos_url
                ? normalisedTrip.google_photos_url
                : tripDescriptionState.lastAppliedPhotosUrl,
        });
        populateTripProfilePanel(normalisedTrip, {
            preserveDirty: tripProfileEditState.active,
            photos: Array.isArray(photosRaw) ? photosRaw : undefined,
            photoItems: Array.isArray(photoItemsRaw) ? photoItemsRaw : undefined,
        });
        updateTripDetailHeader();
        renderTripLocationList();
        focusMapOnTripLocations();
    } catch (error) {
        if (tripDetailState.requestId !== activeRequestId || tripDetailState.selectedTripId !== tripId) { return; }
        console.error('Failed to load trip details', error);
        showTripLocationError(error.message || 'Failed to load trip.');
        showTripLocationsOnMap([]);
    } finally {
        if (tripDetailState.requestId === activeRequestId && tripDetailState.selectedTripId === tripId) {
            setTripDetailLoading(false);
        }
    }
}

async function loadTripsPanelData() {
    if (!tripListState.initialised) { initTripsPanel(); }
    setTripListLoading(true);
    hideTripListError();
    try {
        const response = await fetch('/api/trips');
        if (!response.ok) {
            throw new Error('Failed to load trips.');
        }
        const data = await response.json();
        updateTripsPanel(Array.isArray(data) ? data : []);
    } catch (error) {
        console.error('Failed to load trips', error);
        showTripListError(error.message || 'Failed to load trips.');
    } finally {
        setTripListLoading(false);
    }
}

function normaliseTripMembership(entry) {
    if (!entry || typeof entry !== 'object') { return null; }

    const rawId = entry.id ?? entry.trip_id ?? '';
    const id = typeof rawId === 'string' ? rawId.trim() : String(rawId || '').trim();
    if (!id) { return null; }

    const rawName = entry.name ?? entry.trip_name ?? '';
    const name = typeof rawName === 'string' ? rawName.trim() : String(rawName || '').trim();

    return { id, name: name || TRIP_NAME_FALLBACK };
}

function renderTripAssignmentMemberships() {
    tripAssignmentMembershipList = tripAssignmentMembershipList || document.getElementById('tripMembershipList');
    tripAssignmentMembershipEmpty = tripAssignmentMembershipEmpty || document.getElementById('tripMembershipEmpty');

    if (!tripAssignmentMembershipList) { return; }

    tripAssignmentMembershipList.innerHTML = '';

    if (!Array.isArray(tripAssignmentMemberships) || tripAssignmentMemberships.length === 0) {
        tripAssignmentMembershipList.hidden = true;
        if (tripAssignmentMembershipEmpty) { tripAssignmentMembershipEmpty.hidden = false; }
        if (tripAssignmentModalController && typeof tripAssignmentModalController.refreshFocusableElements === 'function') {
            tripAssignmentModalController.refreshFocusableElements();
        }
        return;
    }

    const fragment = document.createDocumentFragment();
    tripAssignmentMemberships.forEach((trip) => {
        if (!trip || !trip.id) { return; }
        const item = document.createElement('div');
        item.className = 'trip-membership-item';
        item.setAttribute('role', 'listitem');

        const nameElement = document.createElement('span');
        nameElement.className = 'trip-membership-name';
        nameElement.textContent = trip.name || TRIP_NAME_FALLBACK;
        item.appendChild(nameElement);

        const removeButton = document.createElement('button');
        removeButton.type = 'button';
        removeButton.className = 'trip-membership-remove';
        removeButton.textContent = 'Remove';
        removeButton.dataset.tripId = trip.id;
        removeButton.dataset.tripName = trip.name || TRIP_NAME_FALLBACK;
        item.appendChild(removeButton);

        fragment.appendChild(item);
    });

    tripAssignmentMembershipList.appendChild(fragment);
    tripAssignmentMembershipList.hidden = false;
    if (tripAssignmentMembershipEmpty) { tripAssignmentMembershipEmpty.hidden = true; }

    if (tripAssignmentModalController && typeof tripAssignmentModalController.refreshFocusableElements === 'function') {
        tripAssignmentModalController.refreshFocusableElements();
    }
}

function setTripAssignmentMemberships(memberships) {
    if (!Array.isArray(memberships)) {
        tripAssignmentMemberships = [];
    } else {
        tripAssignmentMemberships = memberships
            .map((entry) => normaliseTripMembership(entry))
            .filter(Boolean);
    }

    renderTripAssignmentMemberships();
}

function handleTripMembershipListClick(event) {
    if (!tripAssignmentMembershipList) { return; }
    const button = event.target ? event.target.closest('.trip-membership-remove') : null;
    if (!button || !tripAssignmentMembershipList.contains(button)) { return; }

    event.preventDefault();

    const tripId = button.dataset.tripId ? button.dataset.tripId.trim() : '';
    if (!tripId) { return; }

    if (!Array.isArray(tripAssignmentTargetIds) || tripAssignmentTargetIds.length !== 1) {
        showStatus('Trip memberships can only be updated for a single location.', true);
        return;
    }

    const targetPlaceId = tripAssignmentTargetIds[0];
    if (!targetPlaceId) {
        showStatus('This data point cannot be updated.', true);
        return;
    }

    const tripName = button.dataset.tripName || '';
    removeLocationFromTrip(tripId, targetPlaceId, {
        triggerButton: button,
        confirmMessage: tripName
            ? `Remove this location from "${tripName}"?`
            : 'Remove this location from the trip?',
    });
}

function upsertTripInList(trip, options = {}) {
    const normalised = normaliseTrip(trip);
    if (!normalised) { return; }

    const { reloadDetail = true } = options || {};

    const existing = Array.isArray(tripListState.trips) ? [...tripListState.trips] : [];
    const index = existing.findIndex((entry) => entry.id === normalised.id);

    if (index === -1) {
        existing.push(normalised);
    } else {
        existing[index] = { ...existing[index], ...normalised };
    }

    tripListState.trips = existing;
    tripLocationCache.delete(normalised.id);
    if (tripDetailState.selectedTripId === normalised.id) {
        if (reloadDetail) {
            tripDetailState.trip = { ...normalised };
            updateTripDetailHeader();
            const requestId = tripDetailState.requestId + 1;
            tripDetailState.requestId = requestId;
            setTripDetailLoading(true);
            loadTripDetailData(normalised.id, requestId);
        } else {
            tripDetailState.trip = { ...(tripDetailState.trip || {}), ...normalised };
            updateTripDetailHeader();
        }
    }
    renderTripList();
}

function removeTripFromList(tripId, options = {}) {
    const cleanedTripId = typeof tripId === 'string' ? tripId.trim() : String(tripId || '').trim();
    if (!cleanedTripId) { return false; }

    const { skipRender = false } = options || {};

    const existingTrips = Array.isArray(tripListState.trips) ? tripListState.trips : [];
    const filteredTrips = existingTrips.filter((entry) => entry && entry.id !== cleanedTripId);

    if (filteredTrips.length === existingTrips.length) { return false; }

    tripListState.trips = filteredTrips;
    tripLocationCache.delete(cleanedTripId);

    if (tripDetailState.selectedTripId === cleanedTripId) {
        closeTripDetail({ restoreFocus: true, skipRender: true });
    } else {
        updateTripDetailActions();
    }

    if (Array.isArray(tripAssignmentMemberships) && tripAssignmentMemberships.length > 0) {
        const updatedMemberships = tripAssignmentMemberships.filter((entry) => entry && entry.id !== cleanedTripId);
        if (updatedMemberships.length !== tripAssignmentMemberships.length) {
            tripAssignmentMemberships = updatedMemberships;
            renderTripAssignmentMemberships();
        }
    }

    tripSelectElement = tripSelectElement || document.getElementById('tripSelect');
    tripSelectHelper = tripSelectHelper || document.getElementById('tripSelectHelper');

    if (tripSelectElement) {
        let selectedRemoved = false;
        let optionRemoved = false;

        Array.from(tripSelectElement.options || []).forEach((option) => {
            if (option.value === cleanedTripId) {
                if (option.selected) { selectedRemoved = true; }
                option.remove();
                optionRemoved = true;
            }
        });

        if (optionRemoved) {
            const allOptions = Array.from(tripSelectElement.options || []);
            const tripOptions = allOptions.filter((option) => option.value);

            if (tripOptions.length === 0) {
                tripSelectElement.innerHTML = '';
                const emptyOption = document.createElement('option');
                emptyOption.value = '';
                emptyOption.textContent = 'No trips available';
                emptyOption.disabled = true;
                emptyOption.selected = true;
                tripSelectElement.appendChild(emptyOption);
                tripSelectElement.disabled = true;
                tripSelectElement.dataset.hasTrips = 'false';
                if (tripSelectHelper) {
                    tripSelectHelper.textContent = 'No trips yet. Enter a name below to create your first trip.';
                }
            } else {
                tripSelectElement.disabled = false;
                tripSelectElement.dataset.hasTrips = 'true';
                if (selectedRemoved) {
                    const placeholderOption = allOptions.find((option) => option.value === '');
                    if (placeholderOption) {
                        placeholderOption.selected = true;
                    } else {
                        const firstEnabled = tripOptions.find((option) => !option.disabled) || tripOptions[0];
                        if (firstEnabled) { firstEnabled.selected = true; }
                    }
                }
            }
        }
    }

    if (!skipRender) {
        renderTripList();
    }

    return true;
}

function applyTripLocationRemoval(tripId, placeId, options = {}) {
    const cleanedTripId = tripId ? String(tripId).trim() : '';
    const cleanedPlaceId = placeId ? String(placeId).trim() : '';

    if (!cleanedTripId || !cleanedPlaceId) { return; }

    const { tripData = null } = options || {};

    const cacheEntry = tripLocationCache.get(cleanedTripId);
    if (cacheEntry && Array.isArray(cacheEntry.locations)) {
        const filteredLocations = cacheEntry.locations.filter((location) => {
            if (!location || typeof location !== 'object') { return true; }
            const rawId = location.place_id ?? location.id ?? location.key ?? '';
            const value = typeof rawId === 'string' ? rawId : String(rawId || '');
            return value.trim() !== cleanedPlaceId;
        });

        if (filteredLocations.length !== cacheEntry.locations.length) {
            const updatedTrip = tripData ? { ...(cacheEntry.trip || {}), ...tripData } : cacheEntry.trip;
            tripLocationCache.set(cleanedTripId, {
                trip: updatedTrip,
                locations: filteredLocations,
                photos: cacheEntry.photos || [],
                photo_items: cacheEntry.photo_items || [],
            });
        } else if (tripData) {
            tripLocationCache.set(cleanedTripId, {
                trip: { ...(cacheEntry.trip || {}), ...tripData },
                locations: cacheEntry.locations,
                photos: cacheEntry.photos || [],
                photo_items: cacheEntry.photo_items || [],
            });
        }
    }

    if (tripDetailState.selectedTripId === cleanedTripId) {
        const currentLocations = Array.isArray(tripDetailState.locations) ? tripDetailState.locations : [];
        const filtered = currentLocations.filter((location) => {
            if (!location || typeof location !== 'object') { return true; }
            const rawId = location.place_id ?? location.id ?? location.key ?? '';
            const value = typeof rawId === 'string' ? rawId.trim() : String(rawId || '').trim();
            return value !== cleanedPlaceId;
        });

        if (filtered.length !== currentLocations.length) {
            tripDetailState.locations = filtered;
            applyActiveMarkerFilter();
            const detailTrip = tripDetailState.trip ? { ...tripDetailState.trip } : null;
            if (detailTrip) {
                detailTrip.location_count = filtered.length;
                const latestDateFromResponse = tripData && (tripData.latest_location_date || tripData.updated_at || '');
                if (latestDateFromResponse) {
                    detailTrip.latest_location_date = latestDateFromResponse;
                } else {
                    detailTrip.latest_location_date = calculateTripLatestLocationDate(filtered) || '';
                }
                if (tripData && tripData.updated_at) {
                    detailTrip.updated_at = tripData.updated_at;
                } else {
                    detailTrip.updated_at = new Date().toISOString();
                }
                tripDetailState.trip = detailTrip;
            }
            if (tripDetailState.activeLocationId) {
                const stillActive = filtered.some((location) => location && location.key === tripDetailState.activeLocationId);
                if (!stillActive) {
                    tripDetailState.activeLocationId = null;
                }
            }
            updateTripDetailHeader();
            renderTripLocationList();
            focusMapOnTripLocations();
        } else if (tripData && tripDetailState.trip) {
            tripDetailState.trip = { ...tripDetailState.trip, ...tripData };
            updateTripDetailHeader();
        }
    }
}

async function deleteTrip(tripId, options = {}) {
    const cleanedTripId = typeof tripId === 'string' ? tripId.trim() : String(tripId || '').trim();
    if (!cleanedTripId) {
        showStatus('Trip could not be determined.', true);
        return;
    }

    const {
        triggerButton = null,
        confirmMessage = 'Delete this trip? This will remove it from all locations.',
        skipConfirm = false,
        onSuccess = null,
    } = options || {};

    if (!skipConfirm) {
        if (!window.confirm(confirmMessage)) { return; }
    }

    if (triggerButton) { triggerButton.disabled = true; }
    showLoading();

    try {
        const response = await fetch(`/api/trips/${encodeURIComponent(cleanedTripId)}`, {
            method: 'DELETE',
        });
        const result = await response.json().catch(() => ({}));

        if (!response.ok || result.status === 'error') {
            const message = (result && result.message) ? result.message : 'Failed to delete trip.';
            throw new Error(message);
        }

        removeTripFromList(cleanedTripId);
        showStatus(result.message || 'Trip deleted successfully.');

        if (typeof onSuccess === 'function') {
            try {
                onSuccess(result);
            } catch (callbackError) {
                console.error('Trip deletion success handler failed', callbackError);
            }
        }

        try {
            await loadMarkers();
        } catch (markerError) {
            console.error('Failed to refresh markers after trip deletion', markerError);
        }
    } catch (error) {
        console.error('Failed to delete trip', error);
        showStatus(error.message || 'Failed to delete trip.', true);
    } finally {
        hideLoading();
        if (triggerButton) { triggerButton.disabled = false; }
    }
}

async function removeLocationFromTrip(tripId, placeId, options = {}) {
    const cleanedTripId = typeof tripId === 'string' ? tripId.trim() : String(tripId || '').trim();
    const cleanedPlaceId = typeof placeId === 'string' ? placeId.trim() : String(placeId || '').trim();

    if (!cleanedTripId || !cleanedPlaceId) {
        showStatus('Trip or location could not be determined.', true);
        return;
    }

    const {
        triggerButton = null,
        skipConfirm = false,
        confirmMessage = 'Remove this location from the trip?',
        onSuccess = null,
    } = options || {};

    if (!skipConfirm) {
        if (!window.confirm(confirmMessage)) { return; }
    }

    if (triggerButton) { triggerButton.disabled = true; }
    showLoading();

    try {
        const response = await fetch(`/api/trips/${encodeURIComponent(cleanedTripId)}/locations/${encodeURIComponent(cleanedPlaceId)}`, {
            method: 'DELETE',
        });
        const result = await response.json().catch(() => ({}));

        if (!response.ok || result.status === 'error') {
            const message = (result && result.message) ? result.message : 'Failed to remove location from trip.';
            throw new Error(message);
        }

        const tripData = result && typeof result === 'object' ? result.trip : null;

        showStatus(result.message || 'Location removed from trip.');

        if (tripData) {
            upsertTripInList(tripData, { reloadDetail: false });
        } else {
            await loadTripsPanelData();
        }

        applyTripLocationRemoval(cleanedTripId, cleanedPlaceId, { tripData });

        if (Array.isArray(tripAssignmentTargetIds) && tripAssignmentTargetIds.includes(cleanedPlaceId)) {
            tripAssignmentMemberships = tripAssignmentMemberships.filter((entry) => entry && entry.id !== cleanedTripId);
            renderTripAssignmentMemberships();
        }

        if (typeof onSuccess === 'function') {
            try {
                onSuccess(result);
            } catch (callbackError) {
                console.error('Trip removal success handler failed', callbackError);
            }
        }

        await loadMarkers();
    } catch (error) {
        console.error('Failed to remove location from trip', error);
        showStatus(error.message || 'Failed to remove location from trip.', true);
    } finally {
        hideLoading();
        if (triggerButton) { triggerButton.disabled = false; }
    }
}

function showLoading() { document.getElementById('loading').style.display = 'flex'; }
function hideLoading() { document.getElementById('loading').style.display = 'none'; }
function showStatus(message, isError=false) {
    const status = document.getElementById('status');
    status.textContent = message;
    status.className = isError ? 'error' : 'success';
    status.style.display = 'block';
    setTimeout(() => status.style.display = 'none', 4000);
}

function activateTripMapMode() {
    if (!MAPBOX_MIGRATION_ENABLE_TRIP_FEATURES) {
        showStatus('Trip map mode is temporarily unavailable during the Mapbox migration.', true);
        return false;
    }
    if (!map) {
        showStatus('Map is still loading. Please try again.', true);
        return false;
    }

    const wasActive = isTripMapModeActive;
    isTripMapModeActive = true;

    if (!wasActive || !previousMapView) {
        try {
            previousMapView = { center: map.getCenter(), zoom: map.getZoom() };
        } catch (error) {
            previousMapView = null;
        }
    }

    closeActivePopup();
    tripMarkerLookup.clear();

    setLayerVisibility(MAPBOX_TRIP_LAYER_ID, true);
    applyClusterLayerVisibility();

    return true;
}

function deactivateTripMapMode(options = {}) {
    if (!MAPBOX_MIGRATION_ENABLE_TRIP_FEATURES) {
        return;
    }
    const { reload = false } = options || {};
    isTripMapModeActive = false;

    const tripSource = getTripSource();
    if (tripSource) {
        tripSource.setData({ type: 'FeatureCollection', features: [] });
    }
    tripMarkerLookup.clear();
    setLayerVisibility(MAPBOX_TRIP_LAYER_ID, false);
    applyClusterLayerVisibility();

    if (map && previousMapView) {
        try {
            map.easeTo({
                center: previousMapView.center,
                zoom: previousMapView.zoom,
                duration: 500,
            });
        } catch (error) {
            // Ignore easing errors
        }
    }
    previousMapView = null;

    if (reload && typeof loadMarkers === 'function') {
        loadMarkers();
    }
}

function createTripMarkerFeatures(locations) {
    const features = [];
    tripMarkerLookup.clear();

    (Array.isArray(locations) ? locations : []).forEach((location, index) => {
        const markerData = createTripMarkerData(location);
        if (!markerData) { return; }

        const coordinates = [markerData.lng, markerData.lat];
        const markerKey = (location && typeof location.key === 'string' && location.key)
            ? location.key
            : (location && typeof location.place_id === 'string' ? location.place_id : '');
        const featureKey = markerData.id || markerKey || `trip-marker-${index}-${Date.now()}`;
        const sourceType = markerData.source_type || 'default';
        const iconImage = getMarkerImageId(sourceType);

        features.push({
            type: 'Feature',
            id: featureKey,
            geometry: {
                type: 'Point',
                coordinates,
            },
            properties: {
                markerId: markerData.id || featureKey,
                tripMarkerKey: markerKey || featureKey,
                iconImage,
            },
        });

        tripMarkerLookup.set(markerKey || featureKey, {
            coordinates,
            markerData,
        });
    });

    return features;
}

function showTripLocationsOnMap(locations, options = {}) {
    if (!MAPBOX_MIGRATION_ENABLE_TRIP_FEATURES) {
        showStatus('Trip visualisations are temporarily unavailable during the Mapbox migration.', true);
        return;
    }
    if (!map) { return; }

    const { adjustView = true } = options || {};
    const features = createTripMarkerFeatures(locations);

    const tripSource = getTripSource();
    if (!tripSource) {
        showStatus('Trip map layer is not available.', true);
        return;
    }

    activateTripMapMode();
    tripSource.setData({
        type: 'FeatureCollection',
        features,
    });

    if (!features.length) {
        showStatus('This trip does not have any locations to display yet.', true);
        return;
    }

    if (!adjustView) { return; }

    if (features.length === 1) {
        map.easeTo({
            center: features[0].geometry.coordinates,
            zoom: TRIP_SINGLE_MARKER_ZOOM,
            duration: 700,
        });
        return;
    }

    const bounds = features.reduce((acc, feature) => {
        if (feature.geometry && Array.isArray(feature.geometry.coordinates)) {
            acc.extend(feature.geometry.coordinates);
        }
        return acc;
    }, new mapboxgl.LngLatBounds());

    if (!bounds.isEmpty()) {
        const padding = Array.isArray(TRIP_BOUNDS_PADDING)
            ? Math.max(TRIP_BOUNDS_PADDING[0] || 0, TRIP_BOUNDS_PADDING[1] || 0, 60)
            : (TRIP_BOUNDS_PADDING || 80);
        map.fitBounds(bounds, {
            padding,
            duration: 800,
            maxZoom: TRIP_SINGLE_MARKER_ZOOM,
        });
    }
}

function focusMapOnTripLocation(location) {
    if (!MAPBOX_MIGRATION_ENABLE_TRIP_FEATURES) {
        showStatus('Trip visualisations are temporarily unavailable during the Mapbox migration.', true);
        return false;
    }
    if (!map) { return false; }
    if (!location || typeof location !== 'object') { return false; }

    const lat = Number(location.latitude);
    const lng = Number(location.longitude);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) { return false; }

    const markerKey = (typeof location.key === 'string' && location.key)
        ? location.key
        : (typeof location.place_id === 'string' ? location.place_id : '');

    if (!isTripMapModeActive) {
        const allLocations = Array.isArray(tripDetailState.locations) ? tripDetailState.locations : [];
        showTripLocationsOnMap(allLocations, { adjustView: false });
    }

    const lookupEntry = markerKey ? tripMarkerLookup.get(markerKey) : null;
    const coordinates = lookupEntry && lookupEntry.coordinates
        ? lookupEntry.coordinates
        : [lng, lat];

    map.easeTo({
        center: coordinates,
        zoom: TRIP_SINGLE_MARKER_ZOOM,
        duration: 700,
    });

    if (lookupEntry && lookupEntry.markerData) {
        openMarkerPopupAt(lookupEntry.markerData, coordinates);
    }

    return true;
}

function focusMapOnTripLocations() {
    if (!MAPBOX_MIGRATION_ENABLE_TRIP_FEATURES) {
        showStatus('Trip visualisations are temporarily unavailable during the Mapbox migration.', true);
        return;
    }
    if (!tripDetailState.selectedTripId) { return; }
    const locations = Array.isArray(tripDetailState.locations) ? tripDetailState.locations : [];
    showTripLocationsOnMap(locations);
}

function createTripMarkerData(location) {
    if (!location || typeof location !== 'object') { return null; }

    const latitudeNumber = Number(location.latitude);
    const longitudeNumber = Number(location.longitude);
    if (!Number.isFinite(latitudeNumber) || !Number.isFinite(longitudeNumber)) { return null; }

    const idRaw = location.place_id ?? '';
    const id = typeof idRaw === 'string' ? idRaw.trim() : String(idRaw || '').trim();

    const nameRaw = location.name ?? '';
    const name = typeof nameRaw === 'string' ? nameRaw.trim() : String(nameRaw || '').trim();

    const aliasRaw = location.alias ?? '';
    const alias = typeof aliasRaw === 'string' ? aliasRaw.trim() : String(aliasRaw || '').trim();

    const displayRaw = location.display_name ?? '';
    let displayName = typeof displayRaw === 'string' ? displayRaw.trim() : String(displayRaw || '').trim();
    if (!displayName) {
        displayName = alias || name || 'Unknown location';
    }

    const dateRaw = location.date ?? location.start_date ?? location.end_date ?? '';
    const date = typeof dateRaw === 'string' ? dateRaw.trim() : String(dateRaw || '').trim();

    const sourceTypeRaw = location.source_type ?? '';
    const sourceType = typeof sourceTypeRaw === 'string' ? sourceTypeRaw.trim() : String(sourceTypeRaw || '').trim();

    return {
        id,
        lat: latitudeNumber,
        lng: longitudeNumber,
        place: name || displayName,
        alias,
        display_name: displayName,
        date,
        source_type: sourceType,
        archived: Boolean(location.archived),
    };
}


async function initMap() {
    if (!MAPBOX_TOKEN) {
        showStatus('Mapbox access token is missing. Update your configuration and reload the page.', true);
        return;
    }

    const storedView = getInitialMapViewFromStorage();
    const initialCenter = storedView && Array.isArray(storedView.center)
        ? storedView.center
        : MAP_DEFAULT_CENTER;
    const initialZoom = storedView && Number.isFinite(storedView.zoom)
        ? storedView.zoom
        : MAP_DEFAULT_ZOOM;

    const initialLongitude = Number(initialCenter[1]);
    const initialLatitude = Number(initialCenter[0]);
    const lngLat = [
        Number.isFinite(initialLongitude) ? initialLongitude : MAP_DEFAULT_CENTER[1],
        Number.isFinite(initialLatitude) ? initialLatitude : MAP_DEFAULT_CENTER[0],
    ];

    mapboxgl.accessToken = MAPBOX_TOKEN;
    map = new mapboxgl.Map({
        container: 'map',
        style: getMapStyleUrl(mapStyleMode),
        center: lngLat,
        zoom: initialZoom,
        minZoom: MAP_MIN_ZOOM,
        maxZoom: MAP_TILE_MAX_ZOOM,
        pitch: MAPBOX_DEFAULT_PITCH,
        bearing: MAPBOX_DEFAULT_BEARING,
        attributionControl: false,
    });

    map.addControl(new mapboxgl.NavigationControl({ showCompass: true, showZoom: true, visualizePitch: true }), 'top-left');
    map.addControl(new mapboxgl.FullscreenControl(), 'top-left');

    map.on('style.load', async () => {
        const isStyleReload = mapStyleLoadCount > 0;
        mapStyleLoadCount += 1;
        try {
            if (!map.getSource(MAPBOX_TERRAIN_SOURCE_ID)) {
                map.addSource(MAPBOX_TERRAIN_SOURCE_ID, {
                    type: 'raster-dem',
                    url: MAPBOX_TERRAIN_SOURCE_URL,
                    tileSize: 512,
                    maxzoom: 14,
                });
            }
            if (typeof map.setTerrain === 'function') {
                map.setTerrain({ source: MAPBOX_TERRAIN_SOURCE_ID, exaggeration: MAPBOX_TERRAIN_EXAGGERATION });
            }
            if (typeof map.setFog === 'function') {
                map.setFog(MAPBOX_FOG_CONFIG);
            }
        } catch (terrainError) {
            console.warn('Unable to configure Mapbox terrain.', terrainError);
        }

        try {
            await ensureMapboxIconRegistered('default');
            await ensureExistingMarkerIcons();
        } catch (iconError) {
            console.warn('Failed to register marker icons', iconError);
        }
        initialiseMapboxMarkerLayers();
        setClusteringEnabled(pendingClusterToggleState);
        if (isStyleReload) {
            applyActiveMarkerFilter();
        } else {
            persistMapViewState();
            loadMarkers();
        }
    });

    map.on('moveend', persistMapViewState);
    map.on('zoomend', persistMapViewState);
}

async function loadMarkers() {
    // Show a loading overlay while fetching marker data
    showLoading();
    const startDateInput = document.getElementById('filterStartDate');
    const endDateInput = document.getElementById('filterEndDate');
    const startDateResult = startDateInput ? updateDateInputValue(startDateInput) : '';
    const endDateResult = endDateInput ? updateDateInputValue(endDateInput) : '';

    if (startDateResult === null || endDateResult === null) {
        hideLoading();
        return;
    }

    const startDate = startDateResult;
    const endDate = endDateResult;

    if (startDate && endDate && startDate > endDate) {
        hideLoading();
        showStatus('Start date must be on or before end date.', true);
        return;
    }

    const requestToken = ++loadMarkersRequestToken;

    if (loadMarkersAbortController) {
        try {
            loadMarkersAbortController.abort();
        } catch (abortError) {
            console.error('Failed to abort previous marker request', abortError);
        }
    }

    const abortController = new AbortController();
    loadMarkersAbortController = abortController;

    // Collect the values of all checked source type filters
    const checked = Array.from(
        document.querySelectorAll('#sourceTypeFilters input:checked')
    ).map((cb) => cb.value);

    const payload = { source_types: checked };
    if (startDate) { payload.start_date = startDate; }
    if (endDate) { payload.end_date = endDate; }

    persistFilterState(startDate, endDate, checked);

    try {
        const response = await fetch('/api/map_data', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
            signal: abortController.signal,
        });

        if (!response.ok) {
            throw new Error(`Failed to load map data. (${response.status})`);
        }

        const markers = await response.json();
        if (requestToken !== loadMarkersRequestToken) {
            return;
        }

        const markerSource = getMarkerSource();
        if (!markerSource) {
            console.warn('Marker source is not ready; skipping marker update.');
            return;
        }

        const markerList = Array.isArray(markers) ? markers : [];
        try {
            await ensureMarkerIconsFor(markerList);
        } catch (iconLoadError) {
            console.warn('Unable to load one or more marker icons', iconLoadError);
        }
        closeActivePopup();
        clearAllMarkerFeatureStates();
        mapMarkerData.clear();
        mapMarkerLookup.clear();

        const features = buildMarkerFeatures(markerList);
        markerSourceFeaturesAll = Array.isArray(features) ? features : [];
        applyActiveMarkerFilter();
        refreshSelectionAfterDataLoad();
    } catch (err) {
        if (err && err.name === 'AbortError') {
            return;
        }
        console.error(err);
        showStatus(err.message || 'Failed to load markers.', true);
    } finally {
        if (requestToken === loadMarkersRequestToken) {
            hideLoading();
            if (loadMarkersAbortController === abortController) {
                loadMarkersAbortController = null;
            }
        }
    }
}

async function updateMap() {
    const fileInput = document.getElementById('timelineFile');
    if (!fileInput.files.length) { showStatus('No file selected!', true); return; }
    showLoading();
    const formData = new FormData();
    formData.append('file', fileInput.files[0]);
    try {
        const response = await fetch('/api/update_timeline', { method: 'POST', body: formData });
        const result = await response.json();
        hideLoading();
        showStatus(result.message, result.status === 'error');
        if (result.status === 'success') { loadMarkers(); }
    } catch(err) {
        hideLoading();
        showStatus('Error: ' + err.message, true);
    }
}

async function clearMap() {
    const confirmClear = window.confirm(
        'Clearing the map will remove all data permanently. This action cannot be undone. Do you want to continue?'
    );
    if (!confirmClear) { return; }

    showLoading();
    try {
        const response = await fetch('/api/clear', { method: 'POST' });
        const result = await response.json();
        hideLoading();
        showStatus(result.message, result.status === 'error');
        if (result.status === 'success') { loadMarkers(); }
    } catch(error) {
        hideLoading();
        showStatus('Error: ' + error.message, true);
    }
}

function createModalController(modalId, { getInitialFocus, onClose } = {}) {
    const modal = document.getElementById(modalId);
    if (!modal) { return null; }
    const modalContent = modal.querySelector('.modal-content');
    let focusableElements = [];
    let previouslyFocused = null;

    function setFocusableElements() {
        focusableElements = Array.from(
            modal.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])')
        ).filter((el) => !el.disabled && modal.contains(el));
    }

    function focusInitialElement() {
        const target = typeof getInitialFocus === 'function' ? getInitialFocus() : null;
        if (target && typeof target.focus === 'function') {
            target.focus();
            return;
        }

        if (focusableElements.length > 0) {
            focusableElements[0].focus();
            return;
        }

        if (modalContent && typeof modalContent.focus === 'function') {
            modalContent.focus();
        }
    }

    function handleKeydown(event) {
        if (!modal.classList.contains('open')) { return; }

        if (event.key === 'Escape') {
            event.preventDefault();
            close();
            return;
        }

        if (event.key !== 'Tab') { return; }

        setFocusableElements();
        if (focusableElements.length === 0) {
            event.preventDefault();
            if (modalContent && typeof modalContent.focus === 'function') {
                modalContent.focus();
            }
            return;
        }

        const first = focusableElements[0];
        const last = focusableElements[focusableElements.length - 1];
        const active = document.activeElement;

        if (event.shiftKey) {
            if (active === first || !modal.contains(active)) {
                event.preventDefault();
                last.focus();
            }
        } else if (active === last) {
            event.preventDefault();
            first.focus();
        }
    }

    function open() {
        previouslyFocused = document.activeElement;
        modal.classList.add('open');
        modal.removeAttribute('hidden');
        modal.setAttribute('aria-hidden', 'false');
        setFocusableElements();
        focusInitialElement();
        document.addEventListener('keydown', handleKeydown);
    }

    function close() {
        modal.classList.remove('open');
        modal.setAttribute('aria-hidden', 'true');
        modal.setAttribute('hidden', '');
        document.removeEventListener('keydown', handleKeydown);
        focusableElements = [];
        if (typeof onClose === 'function') {
            onClose();
        }
        if (previouslyFocused && typeof previouslyFocused.focus === 'function') {
            previouslyFocused.focus();
        }
        previouslyFocused = null;
    }

    modal.addEventListener('click', (event) => {
        if (event.target === modal) {
            close();
        }
    });

    return {
        open,
        close,
        refreshFocusableElements: setFocusableElements,
    };
}

function updateManualDescriptionCharacterCount(value) {
    if (!manualDescriptionCharacterCountElement) {
        manualDescriptionCharacterCountElement = document.getElementById('manualDescriptionCharacterCount');
    }
    if (!manualDescriptionCharacterCountElement) { return; }
    const length = value ? value.length : 0;
    manualDescriptionCharacterCountElement.textContent = `${length} / ${MAX_LOCATION_DESCRIPTION_LENGTH} characters`;
}

function ensureManualPointModal() {
    if (manualPointModalController) { return manualPointModalController; }

    manualPointForm = document.getElementById('manualPointForm');
    manualDescriptionCharacterCountElement = document.getElementById('manualDescriptionCharacterCount');
    const controller = createModalController('manualPointModal', {
        getInitialFocus: () => {
            const form = manualPointForm || document.getElementById('manualPointForm');
            return form ? form.elements['place_name'] : null;
        },
        onClose: () => {
            const form = manualPointForm || document.getElementById('manualPointForm');
            if (form) { form.reset(); }
            updateManualDescriptionCharacterCount('');
        },
    });

    if (!controller) { return null; }
    manualPointModalController = controller;

    const cancelButton = document.getElementById('manualPointCancel');
    if (cancelButton) {
        cancelButton.addEventListener('click', (event) => {
            event.preventDefault();
            manualPointModalController.close();
        });
    }

    if (manualPointForm) {
        manualPointForm.addEventListener('submit', handleManualPointSubmit);
        const descriptionField = manualPointForm.elements['description'];
        if (descriptionField) {
            descriptionField.addEventListener('input', () => {
                updateManualDescriptionCharacterCount(descriptionField.value);
            });
            updateManualDescriptionCharacterCount(descriptionField.value);
        }
    }

    return manualPointModalController;
}

function ensureAliasModal() {
    if (aliasModalController) { return aliasModalController; }

    aliasForm = document.getElementById('aliasForm');
    aliasOriginalNameElement = document.getElementById('aliasOriginalName');

    const controller = createModalController('aliasModal', {
        getInitialFocus: () => {
            const form = aliasForm || document.getElementById('aliasForm');
            return form ? form.elements['alias'] : null;
        },
        onClose: () => {
            aliasTargetMarkerId = null;
            aliasModalContext = { isArchived: false, triggerButton: null };
            const form = aliasForm || document.getElementById('aliasForm');
            if (form) { form.reset(); }
            if (aliasOriginalNameElement) { aliasOriginalNameElement.textContent = ''; }
        },
    });

    if (!controller) { return null; }
    aliasModalController = controller;

    const cancelButton = document.getElementById('aliasCancel');
    if (cancelButton) {
        cancelButton.addEventListener('click', (event) => {
            event.preventDefault();
            aliasModalController.close();
        });
    }

    if (aliasForm) {
        aliasForm.addEventListener('submit', handleAliasSubmit);
    }

    return aliasModalController;
}

function updateLocationDescriptionCharacterCount(value) {
    if (!descriptionCharacterCountElement) {
        descriptionCharacterCountElement = document.getElementById('descriptionCharacterCount');
    }
    if (!descriptionCharacterCountElement) { return; }
    const length = value ? value.length : 0;
    descriptionCharacterCountElement.textContent = `${length} / ${MAX_LOCATION_DESCRIPTION_LENGTH} characters`;
}

function ensureDescriptionModal() {
    if (descriptionModalController) { return descriptionModalController; }

    descriptionForm = document.getElementById('descriptionForm');
    descriptionCharacterCountElement = document.getElementById('descriptionCharacterCount');

    const controller = createModalController('descriptionModal', {
        getInitialFocus: () => {
            const form = descriptionForm || document.getElementById('descriptionForm');
            return form ? form.elements['description'] : null;
        },
        onClose: () => {
            descriptionTargetMarkerId = null;
            descriptionModalContext = { isArchived: false, triggerButton: null };
            const form = descriptionForm || document.getElementById('descriptionForm');
            if (form) { form.reset(); }
            updateLocationDescriptionCharacterCount('');
        },
    });

    if (!controller) { return null; }
    descriptionModalController = controller;

    const cancelButton = document.getElementById('descriptionCancel');
    if (cancelButton) {
        cancelButton.addEventListener('click', (event) => {
            event.preventDefault();
            descriptionModalController.close();
        });
    }

    if (descriptionForm) {
        descriptionForm.addEventListener('submit', handleDescriptionSubmit);
        const descriptionField = descriptionForm.elements['description'];
        if (descriptionField) {
            descriptionField.addEventListener('input', () => {
                updateLocationDescriptionCharacterCount(descriptionField.value);
            });
            updateLocationDescriptionCharacterCount(descriptionField.value);
        }
    }

    return descriptionModalController;
}

function openAliasModal(markerData, options = {}) {
    if (!markerData || !markerData.id) {
        showStatus('This data point cannot be renamed.', true);
        return;
    }

    const controller = ensureAliasModal();
    if (!controller) { return; }

    aliasTargetMarkerId = markerData.id;
    const triggerButton = options.triggerButton || null;
    const isArchived = Boolean(options.isArchived);
    aliasModalContext = { triggerButton, isArchived };

    aliasForm = aliasForm || document.getElementById('aliasForm');
    if (aliasForm) {
        const aliasField = aliasForm.elements['alias'];
        const aliasValueRaw = markerData.alias ?? '';
        const aliasValue = typeof aliasValueRaw === 'string'
            ? aliasValueRaw.trim()
            : String(aliasValueRaw || '').trim();
        if (aliasField) {
            aliasField.value = aliasValue;
        }
    }

    aliasOriginalNameElement = aliasOriginalNameElement || document.getElementById('aliasOriginalName');
    if (aliasOriginalNameElement) {
        const placeRaw = markerData.place ?? '';
        const placeValue = typeof placeRaw === 'string'
            ? placeRaw.trim()
            : String(placeRaw || '').trim();
        aliasOriginalNameElement.textContent = placeValue || 'Unknown';
    }

    controller.open();
    if (controller.refreshFocusableElements) {
        controller.refreshFocusableElements();
    }
}

function openDescriptionModal(markerData, options = {}) {
    if (!markerData || !markerData.id) { return; }

    const controller = ensureDescriptionModal();
    if (!controller) { return; }

    descriptionTargetMarkerId = markerData.id;
    const triggerButton = options.triggerButton || null;
    const isArchived = Boolean(options.isArchived);
    descriptionModalContext = { triggerButton, isArchived };

    descriptionForm = descriptionForm || document.getElementById('descriptionForm');
    if (descriptionForm) {
        const descriptionField = descriptionForm.elements['description'];
        if (descriptionField) {
            let value = '';
            const raw = markerData.description ?? '';
            if (typeof raw === 'string') {
                value = raw;
            } else if (raw !== null && raw !== undefined) {
                value = String(raw);
            }
            descriptionField.value = value;
            updateLocationDescriptionCharacterCount(value);
        }
    }

    controller.open();
    if (controller.refreshFocusableElements) {
        controller.refreshFocusableElements();
    }
}

async function handleAliasSubmit(event) {
    event.preventDefault();

    aliasForm = aliasForm || document.getElementById('aliasForm');
    if (!aliasForm) { return; }

    if (!aliasTargetMarkerId) {
        showStatus('This data point cannot be renamed.', true);
        return;
    }

    const aliasField = aliasForm.elements['alias'];
    const aliasValue = aliasField ? aliasField.value.trim() : '';

    if (aliasValue.length > MAX_ALIAS_LENGTH) {
        showStatus(`Alias must be ${MAX_ALIAS_LENGTH} characters or fewer.`, true);
        if (aliasField) { aliasField.focus(); }
        return;
    }

    const submitButton = aliasForm.querySelector('button[type="submit"]');
    const cancelButton = document.getElementById('aliasCancel');
    const triggerButton = aliasModalContext.triggerButton || null;
    const isArchived = Boolean(aliasModalContext.isArchived);

    if (submitButton) { submitButton.disabled = true; }
    if (cancelButton) { cancelButton.disabled = true; }
    if (triggerButton) { triggerButton.disabled = true; }

    showLoading();

    try {
        const response = await fetch(`/api/markers/${encodeURIComponent(aliasTargetMarkerId)}/alias`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ alias: aliasValue }),
        });
        const result = await response.json().catch(() => ({}));

        if (!response.ok || result.status === 'error') {
            const message = (result && result.message) ? result.message : 'Failed to update alias.';
            throw new Error(message);
        }

        showStatus(result.message || 'Alias updated successfully.');
        if (aliasModalController) {
            aliasModalController.close();
        }
        await loadMarkers();
        if (isArchived) {
            await loadArchivedPointsList();
        }
    } catch (error) {
        showStatus(error.message || 'Failed to update alias.', true);
    } finally {
        hideLoading();
        if (submitButton) { submitButton.disabled = false; }
        if (cancelButton) { cancelButton.disabled = false; }
        if (triggerButton) { triggerButton.disabled = false; }
    }
}

async function handleDescriptionSubmit(event) {
    event.preventDefault();

    descriptionForm = descriptionForm || document.getElementById('descriptionForm');
    if (!descriptionForm) { return; }

    if (!descriptionTargetMarkerId) {
        showStatus('This data point cannot be updated.', true);
        return;
    }

    const descriptionField = descriptionForm.elements['description'];
    const descriptionValue = descriptionField ? descriptionField.value : '';

    if (descriptionValue.length > MAX_LOCATION_DESCRIPTION_LENGTH) {
        showStatus(`Description must be ${MAX_LOCATION_DESCRIPTION_LENGTH} characters or fewer.`, true);
        if (descriptionField) { descriptionField.focus(); }
        return;
    }

    const submitButton = descriptionForm.querySelector('button[type="submit"]');
    const cancelButton = document.getElementById('descriptionCancel');
    const triggerButton = descriptionModalContext.triggerButton || null;
    const isArchived = Boolean(descriptionModalContext.isArchived);

    if (submitButton) { submitButton.disabled = true; }
    if (cancelButton) { cancelButton.disabled = true; }
    if (triggerButton) { triggerButton.disabled = true; }

    showLoading();

    try {
        const response = await fetch(`/api/markers/${encodeURIComponent(descriptionTargetMarkerId)}/description`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ description: descriptionValue }),
        });
        const result = await response.json().catch(() => ({}));

        if (!response.ok || result.status === 'error') {
            const message = (result && result.message) ? result.message : 'Failed to save description.';
            throw new Error(message);
        }

        showStatus(result.message || 'Description saved successfully.');
        if (descriptionModalController) {
            descriptionModalController.close();
        }
        await loadMarkers();
        if (isArchived) {
            await loadArchivedPointsList();
        }
    } catch (error) {
        showStatus(error.message || 'Failed to save description.', true);
    } finally {
        hideLoading();
        if (submitButton) { submitButton.disabled = false; }
        if (cancelButton) { cancelButton.disabled = false; }
        if (triggerButton) { triggerButton.disabled = false; }
    }
}

function ensureTripAssignmentModal() {
    if (tripAssignmentModalController) { return tripAssignmentModalController; }

    tripAssignmentForm = document.getElementById('tripAssignmentForm');
    tripSelectElement = document.getElementById('tripSelect');
    newTripNameInput = document.getElementById('newTripName');
    tripSelectHelper = document.getElementById('tripSelectHelper');
    tripAssignmentMembershipList = document.getElementById('tripMembershipList');
    tripAssignmentMembershipEmpty = document.getElementById('tripMembershipEmpty');
    tripMembershipGroupElement = document.getElementById('tripMembershipGroup');

    const controller = createModalController('tripAssignmentModal', {
        getInitialFocus: () => {
            tripSelectElement = tripSelectElement || document.getElementById('tripSelect');
            if (tripSelectElement && !tripSelectElement.disabled && tripSelectElement.options.length > 1) {
                return tripSelectElement;
            }
            newTripNameInput = newTripNameInput || document.getElementById('newTripName');
            return newTripNameInput || null;
        },
        onClose: () => {
            tripAssignmentTargetIds = [];
            tripModalContext = { triggerButton: null, mode: 'single', count: 0 };
            const form = tripAssignmentForm || document.getElementById('tripAssignmentForm');
            if (form) { form.reset(); }
            tripAssignmentMemberships = [];
            if (tripMembershipGroupElement) { tripMembershipGroupElement.hidden = false; }
            if (tripAssignmentMembershipEmpty) {
                tripAssignmentMembershipEmpty.textContent = 'This location is not part of any trips yet.';
            }
            renderTripAssignmentMemberships();
        },
    });

    if (!controller) { return null; }
    tripAssignmentModalController = controller;

    const cancelButton = document.getElementById('tripAssignmentCancel');
    if (cancelButton) {
        cancelButton.addEventListener('click', (event) => {
            event.preventDefault();
            tripAssignmentModalController.close();
        });
    }

    if (tripAssignmentForm) {
        tripAssignmentForm.addEventListener('submit', handleTripAssignmentSubmit);
    }

    if (tripAssignmentMembershipList) {
        tripAssignmentMembershipList.addEventListener('click', handleTripMembershipListClick);
    }

    return tripAssignmentModalController;
}

async function populateTripSelect() {
    tripSelectElement = tripSelectElement || document.getElementById('tripSelect');
    tripSelectHelper = tripSelectHelper || document.getElementById('tripSelectHelper');

    if (!tripSelectElement) { return []; }

    tripSelectElement.innerHTML = '';
    const loadingOption = document.createElement('option');
    loadingOption.value = '';
    loadingOption.textContent = 'Loading trips...';
    loadingOption.disabled = true;
    loadingOption.selected = true;
    tripSelectElement.appendChild(loadingOption);
    tripSelectElement.disabled = true;
    tripSelectElement.dataset.hasTrips = 'false';

    try {
        const response = await fetch('/api/trips');
        if (!response.ok) {
            throw new Error('Failed to load trips.');
        }

        const trips = await response.json();
        const tripList = Array.isArray(trips) ? trips : [];
        updateTripsPanel(tripList);

        tripSelectElement.innerHTML = '';

        if (tripList.length === 0) {
            const emptyOption = document.createElement('option');
            emptyOption.value = '';
            emptyOption.textContent = 'No trips available';
            emptyOption.disabled = true;
            emptyOption.selected = true;
            tripSelectElement.appendChild(emptyOption);
            tripSelectElement.disabled = true;
            tripSelectElement.dataset.hasTrips = 'false';
            if (tripSelectHelper) {
                tripSelectHelper.textContent = 'No trips yet. Enter a name below to create your first trip.';
            }
            return tripList;
        }

        const placeholder = document.createElement('option');
        placeholder.value = '';
        placeholder.textContent = 'Select a trip';
        placeholder.disabled = true;
        placeholder.selected = true;
        tripSelectElement.appendChild(placeholder);

        tripList.forEach((trip) => {
            const option = document.createElement('option');
            option.value = trip.id || '';
            if (!option.value) { return; }

            const count = Number(trip.location_count);
            let label = trip.name || 'Untitled Trip';
            if (Number.isFinite(count) && count > 0) {
                label += ` (${count})`;
            }
            option.textContent = label;
            tripSelectElement.appendChild(option);
        });

        tripSelectElement.disabled = false;
        tripSelectElement.dataset.hasTrips = 'true';
        if (tripSelectHelper) {
            tripSelectHelper.textContent = 'Select an existing trip or enter a name to create a new one.';
        }

        return tripList;
    } catch (error) {
        tripSelectElement.innerHTML = '';
        const errorOption = document.createElement('option');
        errorOption.value = '';
        errorOption.textContent = 'Failed to load trips';
        errorOption.disabled = true;
        errorOption.selected = true;
        tripSelectElement.appendChild(errorOption);
        tripSelectElement.disabled = true;
        tripSelectElement.dataset.hasTrips = 'false';
        if (tripSelectHelper) {
            tripSelectHelper.textContent = 'We could not load trips. Please try again.';
        }
        showTripListError(error.message || 'Failed to load trips.');
        throw error;
    }
}

async function openTripAssignmentModal(markerData, options = {}) {
    const controller = ensureTripAssignmentModal();
    if (!controller) { return; }

    const triggerButton = options.triggerButton || null;
    const markers = Array.isArray(markerData) ? markerData : [markerData];

    const targetIds = markers
        .map((entry) => {
            if (!entry || typeof entry !== 'object') { return ''; }
            const rawId = entry.id ?? entry.place_id ?? entry.key ?? '';
            return typeof rawId === 'string' ? rawId.trim() : String(rawId || '').trim();
        })
        .filter((id, index, array) => id && array.indexOf(id) === index);

    if (!targetIds.length) {
        showStatus('Selected locations could not be determined.', true);
        return;
    }

    const mode = targetIds.length === 1 ? 'single' : 'bulk';
    tripModalContext = { triggerButton, mode, count: targetIds.length };
    tripAssignmentTargetIds = targetIds;

    tripAssignmentForm = tripAssignmentForm || document.getElementById('tripAssignmentForm');
    if (tripAssignmentForm) {
        tripAssignmentForm.reset();
    }

    tripAssignmentTitleElement = tripAssignmentTitleElement || document.getElementById('tripAssignmentTitle');
    if (tripAssignmentTitleElement) {
        tripAssignmentTitleElement.textContent = mode === 'single'
            ? 'Add to Trip'
            : `Add ${targetIds.length} Locations to Trip`;
    }

    tripMembershipGroupElement = tripMembershipGroupElement || document.getElementById('tripMembershipGroup');
    if (tripMembershipGroupElement) {
        if (mode === 'single') {
            tripMembershipGroupElement.hidden = false;
        } else {
            tripMembershipGroupElement.hidden = true;
        }
    }

    tripAssignmentMembershipEmpty = tripAssignmentMembershipEmpty || document.getElementById('tripMembershipEmpty');
    if (tripAssignmentMembershipEmpty) {
        tripAssignmentMembershipEmpty.textContent = mode === 'single'
            ? 'This location is not part of any trips yet.'
            : 'Multiple locations selected. Trip memberships are not shown.';
    }

    if (mode === 'single') {
        const primaryMarker = markers[0];
        const memberships = Array.isArray(primaryMarker && primaryMarker.trips)
            ? primaryMarker.trips
            : [];
        setTripAssignmentMemberships(memberships);
    } else {
        setTripAssignmentMemberships([]);
    }

    if (triggerButton) { triggerButton.disabled = true; }
    showLoading();

    try {
        await populateTripSelect();
        controller.open();
        if (controller.refreshFocusableElements) {
            controller.refreshFocusableElements();
        }
    } catch (error) {
        console.error('Failed to open trip assignment modal', error);
        tripAssignmentTargetIds = [];
        tripModalContext = { triggerButton: null, mode: 'single', count: 0 };
        showStatus(error.message || 'Failed to load trips.', true);
    } finally {
        hideLoading();
        if (triggerButton) { triggerButton.disabled = false; }
    }
}

async function handleTripAssignmentSubmit(event) {
    event.preventDefault();

    tripAssignmentForm = tripAssignmentForm || document.getElementById('tripAssignmentForm');
    if (!tripAssignmentForm) { return; }

    const targetIds = Array.isArray(tripAssignmentTargetIds)
        ? tripAssignmentTargetIds.filter((value) => {
            if (typeof value === 'string') { return Boolean(value.trim()); }
            return Boolean(String(value || '').trim());
        })
        : [];

    if (!targetIds.length) {
        showStatus('Selected locations cannot be added to a trip.', true);
        return;
    }

    tripSelectElement = tripSelectElement || document.getElementById('tripSelect');
    newTripNameInput = newTripNameInput || document.getElementById('newTripName');

    const selectedTripId = tripSelectElement && !tripSelectElement.disabled
        ? (tripSelectElement.value || '').trim()
        : '';
    const newTripNameValue = newTripNameInput
        ? newTripNameInput.value.trim()
        : '';

    if (!selectedTripId && !newTripNameValue) {
        showStatus('Select a trip or enter a new trip name.', true);
        if (tripSelectElement && !tripSelectElement.disabled) {
            tripSelectElement.focus();
        } else if (newTripNameInput) {
            newTripNameInput.focus();
        }
        return;
    }

    if (newTripNameValue && newTripNameValue.length > MAX_TRIP_NAME_LENGTH) {
        showStatus(`Trip name must be ${MAX_TRIP_NAME_LENGTH} characters or fewer.`, true);
        if (newTripNameInput) { newTripNameInput.focus(); }
        return;
    }

    const submitButton = tripAssignmentForm.querySelector('button[type="submit"]');
    const cancelButton = document.getElementById('tripAssignmentCancel');
    const triggerButton = tripModalContext.triggerButton || null;

    const previousSelectDisabled = tripSelectElement ? tripSelectElement.disabled : false;
    const previousInputDisabled = newTripNameInput ? newTripNameInput.disabled : false;

    if (submitButton) { submitButton.disabled = true; }
    if (cancelButton) { cancelButton.disabled = true; }
    if (tripSelectElement) { tripSelectElement.disabled = true; }
    if (newTripNameInput) { newTripNameInput.disabled = true; }
    if (triggerButton) { triggerButton.disabled = true; }

    showLoading();

    let encounteredError = false;

    try {
        const isBulk = targetIds.length > 1;
        const payload = isBulk ? { place_ids: targetIds } : { place_id: targetIds[0] };

        if (newTripNameValue) {
            payload.new_trip_name = newTripNameValue;
        } else {
            payload.trip_id = selectedTripId;
        }

        const endpoint = isBulk ? '/api/trips/assign_bulk' : '/api/trips/assign';

        const response = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });
        const result = await response.json().catch(() => ({}));

        if (!response.ok || result.status === 'error') {
            const message = (result && result.message)
                ? result.message
                : 'Failed to add to trip.';
            throw new Error(message);
        }

        const successMessage = result && result.message
            ? result.message
            : (isBulk ? 'Locations added to trip.' : 'Location added to trip.');
        showStatus(successMessage);
        if (result && result.trip) {
            upsertTripInList(result.trip);
        } else {
            await loadTripsPanelData();
        }
        if (tripAssignmentModalController) {
            tripAssignmentModalController.close();
        }
        await loadMarkers();
    } catch (error) {
        encounteredError = true;
        console.error('Failed to add location to trip', error);
        showStatus(error.message || 'Failed to add to trip.', true);
    } finally {
        hideLoading();
        if (submitButton) { submitButton.disabled = false; }
        if (cancelButton) { cancelButton.disabled = false; }
        if (tripSelectElement) { tripSelectElement.disabled = previousSelectDisabled; }
        if (newTripNameInput) { newTripNameInput.disabled = previousInputDisabled; }
        if (triggerButton) { triggerButton.disabled = false; }
    }

    if (encounteredError) {
        if (newTripNameValue && newTripNameInput) {
            newTripNameInput.focus();
        } else if (tripSelectElement && !tripSelectElement.disabled) {
            tripSelectElement.focus();
        }
    }
}

function ensureArchivedPointsModal() {
    if (archivedPointsModalController) { return archivedPointsModalController; }

    archivedPointsList = document.getElementById('archivedPointsList');
    const controller = createModalController('archivedPointsModal', {
        getInitialFocus: () => document.getElementById('archivedPointsClose'),
    });

    if (!controller) { return null; }
    archivedPointsModalController = controller;

    const closeButton = document.getElementById('archivedPointsClose');
    if (closeButton) {
        closeButton.addEventListener('click', (event) => {
            event.preventDefault();
            archivedPointsModalController.close();
        });
    }

    return archivedPointsModalController;
}

async function handleManualPointSubmit(event) {
    event.preventDefault();
    manualPointForm = manualPointForm || document.getElementById('manualPointForm');
    if (!manualPointForm) { return; }

    const place = manualPointForm.elements['place_name'].value.trim();
    const aliasInput = manualPointForm.elements['alias'];
    const aliasValue = aliasInput ? aliasInput.value.trim() : '';
    const descriptionInput = manualPointForm.elements['description'];
    const descriptionValue = descriptionInput ? descriptionInput.value : '';
    const date = manualPointForm.elements['start_date'].value;
    const latValue = manualPointForm.elements['latitude'].value.trim();
    const lonValue = manualPointForm.elements['longitude'].value.trim();

    if (!place) {
        showStatus('Place name is required.', true);
        manualPointForm.elements['place_name'].focus();
        return;
    }

    if (aliasValue.length > MAX_ALIAS_LENGTH) {
        showStatus(`Alias must be ${MAX_ALIAS_LENGTH} characters or fewer.`, true);
        if (aliasInput) { aliasInput.focus(); }
        return;
    }

    if (descriptionValue.length > MAX_LOCATION_DESCRIPTION_LENGTH) {
        showStatus(`Description must be ${MAX_LOCATION_DESCRIPTION_LENGTH} characters or fewer.`, true);
        if (descriptionInput) { descriptionInput.focus(); }
        return;
    }

    if (!date) {
        showStatus('Date is required.', true);
        manualPointForm.elements['start_date'].focus();
        return;
    }

    if (!latValue) {
        showStatus('Latitude is required.', true);
        manualPointForm.elements['latitude'].focus();
        return;
    }

    const lat = Number(latValue);
    if (!Number.isFinite(lat) || lat < -90 || lat > 90) {
        showStatus('Latitude must be a valid number between -90 and 90.', true);
        manualPointForm.elements['latitude'].focus();
        return;
    }

    if (!lonValue) {
        showStatus('Longitude is required.', true);
        manualPointForm.elements['longitude'].focus();
        return;
    }

    const lon = Number(lonValue);
    if (!Number.isFinite(lon) || lon < -180 || lon > 180) {
        showStatus('Longitude must be a valid number between -180 and 180.', true);
        manualPointForm.elements['longitude'].focus();
        return;
    }

    showLoading();
    try {
        const response = await fetch('/api/add_point', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                place_name: place,
                start_date: date,
                latitude: lat,
                longitude: lon,
                source_type: 'manual',
                alias: aliasValue,
                description: descriptionValue,
            })
        });
        const result = await response.json();
        hideLoading();
        showStatus(result.message, result.status === 'error');
        if (result.status === 'success') {
            if (manualPointModalController) {
                manualPointModalController.close();
            }
            loadMarkers();
        }
    } catch(err) {
        hideLoading();
        showStatus('Error: ' + err.message, true);
    }
}

function addManualPoint() {
    const controller = ensureManualPointModal();
    if (controller) {
        controller.open();
    }
}

function viewArchivedPoints() {
    const controller = ensureArchivedPointsModal();
    if (!controller) { return; }
    controller.open();
    loadArchivedPointsList();
}

async function loadArchivedPointsList() {
    archivedPointsList = archivedPointsList || document.getElementById('archivedPointsList');
    if (!archivedPointsList) { return; }

    archivedPointsList.innerHTML = '<p class="archived-empty">Loading archived data points...</p>';

    try {
        const response = await fetch('/api/archived_markers');
        if (!response.ok) {
            throw new Error('Failed to load archived data points.');
        }
        const markers = await response.json();

        if (!Array.isArray(markers) || markers.length === 0) {
            archivedPointsList.innerHTML = '<p class="archived-empty">No archived data points.</p>';
            return;
        }

        const fragment = document.createDocumentFragment();
        markers.forEach((marker) => {
            const item = document.createElement('div');
            item.className = 'archived-item';
            if (marker.id) {
                item.dataset.markerId = marker.id;
            }
            item.setAttribute('role', 'listitem');

            const details = document.createElement('div');
            details.className = 'archived-item-details';

            const title = document.createElement('div');
            title.className = 'archived-item-place';
            const displayNameRaw = marker.display_name ?? '';
            const displayName = typeof displayNameRaw === 'string'
                ? displayNameRaw.trim()
                : String(displayNameRaw || '').trim();
            const placeRaw = marker.place ?? '';
            const placeText = typeof placeRaw === 'string'
                ? placeRaw.trim()
                : String(placeRaw || '').trim();
            const aliasRaw = marker.alias ?? '';
            const aliasText = typeof aliasRaw === 'string'
                ? aliasRaw.trim()
                : String(aliasRaw || '').trim();
            title.textContent = displayName || placeText || 'Unknown';
            details.appendChild(title);

            if (aliasText && placeText && aliasText !== placeText) {
                const original = document.createElement('div');
                original.className = 'archived-item-place-original';
                original.textContent = placeText;
                details.appendChild(original);
            }

            const meta = document.createElement('div');
            meta.className = 'archived-item-meta';
            const metaParts = [];
            if (marker.date) {
                metaParts.push(marker.date);
            }
            const latNumber = Number(marker.lat);
            const lngNumber = Number(marker.lng);
            if (Number.isFinite(latNumber) && Number.isFinite(lngNumber)) {
                metaParts.push(`${latNumber.toFixed(4)}, ${lngNumber.toFixed(4)}`);
            }
            meta.textContent = metaParts.join(' - ');
            details.appendChild(meta);

            const descriptionRaw = marker.description ?? '';
            let descriptionText = '';
            if (typeof descriptionRaw === 'string') {
                descriptionText = descriptionRaw;
            } else if (descriptionRaw !== null && descriptionRaw !== undefined) {
                descriptionText = String(descriptionRaw);
            }
            if (descriptionText && descriptionText.trim()) {
                const descriptionElement = document.createElement('div');
                descriptionElement.className = 'archived-item-description';
                descriptionElement.textContent = descriptionText;
                details.appendChild(descriptionElement);
            }

            const actionsContainer = document.createElement('div');
            actionsContainer.className = 'archived-item-actions';

            if (marker.id) {
                const descriptionButton = document.createElement('button');
                descriptionButton.type = 'button';
                descriptionButton.className = 'modal-button secondary archived-item-action';
                const hasDescription = Boolean(descriptionText && descriptionText.trim());
                descriptionButton.textContent = hasDescription ? 'Edit description' : 'Add description';
                descriptionButton.addEventListener('click', (event) => {
                    event.preventDefault();
                    openDescriptionModal(marker, { triggerButton: descriptionButton, isArchived: true });
                });
                actionsContainer.appendChild(descriptionButton);

                const renameButton = document.createElement('button');
                renameButton.type = 'button';
                renameButton.className = 'modal-button secondary archived-item-action';
                renameButton.textContent = 'Rename';
                renameButton.addEventListener('click', (event) => {
                    event.preventDefault();
                    openAliasModal(marker, { triggerButton: renameButton, isArchived: true });
                });
                actionsContainer.appendChild(renameButton);
            }

            const unarchiveButton = document.createElement('button');
            unarchiveButton.type = 'button';
            unarchiveButton.className = 'modal-button primary archived-item-action';
            unarchiveButton.textContent = 'Unarchive';
            unarchiveButton.addEventListener('click', (event) => {
                event.preventDefault();
                unarchiveMarker(marker.id, unarchiveButton);
            });
            actionsContainer.appendChild(unarchiveButton);

            item.appendChild(details);
            item.appendChild(actionsContainer);
            fragment.appendChild(item);
        });

        archivedPointsList.innerHTML = '';
        archivedPointsList.appendChild(fragment);
    } catch (error) {
        console.error('Failed to load archived data points', error);
        archivedPointsList.innerHTML = '<p class="archived-empty">Failed to load archived data points.</p>';
    } finally {
        if (archivedPointsModalController) {
            archivedPointsModalController.refreshFocusableElements();
        }
    }
}

function refreshMap() { loadMarkers(); }

async function archiveMarker(markerId, markerInstance, triggerButton) {
    if (!markerId) {
        showStatus('This data point cannot be archived.', true);
        return;
    }

    if (triggerButton) { triggerButton.disabled = true; }
    showLoading();

    try {
        const response = await fetch(`/api/markers/${encodeURIComponent(markerId)}/archive`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ archived: true }),
        });
        const result = await response.json().catch(() => ({}));

        if (!response.ok || result.status === 'error') {
            const message = (result && result.message) ? result.message : 'Failed to archive data point.';
            throw new Error(message);
        }

        showStatus(result.message || 'Data point archived successfully.');
        if (markerInstance) {
            closeMarkerPopup(markerInstance);
        }
        await loadMarkers();
        const archivedModal = document.getElementById('archivedPointsModal');
        if (archivedModal && archivedModal.classList.contains('open')) {
            await loadArchivedPointsList();
        }
    } catch (error) {
        showStatus(error.message || 'Failed to archive data point.', true);
    } finally {
        hideLoading();
        if (triggerButton) { triggerButton.disabled = false; }
    }
}

async function unarchiveMarker(markerId, triggerButton) {
    if (!markerId) {
        showStatus('This data point cannot be unarchived.', true);
        return;
    }

    if (triggerButton) { triggerButton.disabled = true; }
    showLoading();

    try {
        const response = await fetch(`/api/markers/${encodeURIComponent(markerId)}/archive`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ archived: false }),
        });
        const result = await response.json().catch(() => ({}));

        if (!response.ok || result.status === 'error') {
            const message = (result && result.message) ? result.message : 'Failed to unarchive data point.';
            throw new Error(message);
        }

        showStatus(result.message || 'Data point unarchived successfully.');
        await loadMarkers();
        await loadArchivedPointsList();
    } catch (error) {
        showStatus(error.message || 'Failed to unarchive data point.', true);
    } finally {
        hideLoading();
        if (triggerButton) { triggerButton.disabled = false; }
    }
}

async function deleteMarker(markerId, markerInstance, triggerButton) {
    if (!markerId) {
        showStatus('This data point cannot be deleted.', true);
        return;
    }

    const confirmDelete = window.confirm(
        'Deleting this data point is irreversible. Do you want to continue?'
    );
    if (!confirmDelete) { return; }

    if (triggerButton) { triggerButton.disabled = true; }
    showLoading();

    try {
        const response = await fetch(`/api/markers/${encodeURIComponent(markerId)}`, { method: 'DELETE' });
        const result = await response.json().catch(() => ({}));

        if (!response.ok || result.status === 'error') {
            const message = (result && result.message) ? result.message : 'Failed to delete data point.';
            throw new Error(message);
        }

        showStatus(result.message || 'Data point deleted successfully.');
        if (markerInstance) {
            closeMarkerPopup(markerInstance);
        }
        await loadMarkers();
    } catch (error) {
        showStatus(error.message || 'Failed to delete data point.', true);
    } finally {
        hideLoading();
        if (triggerButton) { triggerButton.disabled = false; }
    }
}

document.addEventListener('DOMContentLoaded', async () => {
    const storedStyleMode = loadStoredMapStyleMode();
    if (storedStyleMode) {
        mapStyleMode = storedStyleMode;
    }
    setupGoogleAuthCard();
    setupGooglePhotosPickerTestButton();
    ensureManualPointModal();
    ensureAliasModal();
    ensureArchivedPointsModal();
    initManageModeControls();
    initTripsPanel();
    await loadTripsPanelData();
    const storedMapState = loadStoredMapState();
    const storedFilterState = (storedMapState && typeof storedMapState.filters === 'object')
        ? storedMapState.filters
        : null;
    const storedSourceTypes = storedFilterState && Array.isArray(storedFilterState.sourceTypes)
        ? storedFilterState.sourceTypes.filter((value) => typeof value === 'string' && value)
        : null;
    const storedSourceTypeSet = storedSourceTypes ? new Set(storedSourceTypes) : null;
    const storedAllSourceTypesSelected = storedFilterState
        ? Boolean(storedFilterState.allSourceTypesSelected)
        : false;
    const storedMenuStates = (storedMapState && typeof storedMapState.menus === 'object')
        ? storedMapState.menus
        : null;
    const menuElement = document.querySelector('.menu-container');
    const menuStorageKey = menuElement ? getMenuStateStorageKey(menuElement) : null;
    const storedMenuState = (menuStorageKey && storedMenuStates && typeof storedMenuStates[menuStorageKey] === 'object')
        ? storedMenuStates[menuStorageKey]
        : null;
    const storedMenuActivePanelId = (storedMenuState && typeof storedMenuState.activePanelId === 'string'
        && storedMenuState.activePanelId)
        ? storedMenuState.activePanelId
        : null;
    const menuToggleButton = document.getElementById('menuToggle');
    if (menuToggleButton) {
        menuToggleButton.addEventListener('click', (event) => {
            event.preventDefault();
            toggleMenu();
        });
    }
    const timelineFileInput = document.getElementById('timelineFile');
    const importTimelineButton = document.getElementById('importTimelineButton');
    if (importTimelineButton && timelineFileInput) {
        importTimelineButton.addEventListener('click', (event) => {
            event.preventDefault();
            timelineFileInput.click();
        });
    }
    if (timelineFileInput) {
        timelineFileInput.addEventListener('change', updateMap);
    }
    const addManualPointButton = document.getElementById('addManualPointButton');
    if (addManualPointButton) {
        addManualPointButton.addEventListener('click', (event) => {
            event.preventDefault();
            addManualPoint();
        });
    }
    const clearMapButton = document.getElementById('clearMapButton');
    if (clearMapButton) {
        clearMapButton.addEventListener('click', (event) => {
            event.preventDefault();
            clearMap();
        });
    }
    const refreshMapButton = document.getElementById('refreshMapButton');
    if (refreshMapButton) {
        refreshMapButton.addEventListener('click', (event) => {
            event.preventDefault();
            refreshMap();
        });
    }
    const viewArchivedPointsButton = document.getElementById('viewArchivedPointsButton');
    if (viewArchivedPointsButton) {
        viewArchivedPointsButton.addEventListener('click', (event) => {
            event.preventDefault();
            viewArchivedPoints();
        });
    }
    const menuControls = document.getElementById('menuControls');
    if (menuControls) {
        const tabs = Array.from(menuControls.querySelectorAll('[role="tab"]'));
        const panels = Array.from(menuControls.querySelectorAll('[role="tabpanel"]'));

        const findPanelForTab = (tab) => {
            if (!tab) { return null; }
            const controlsId = tab.getAttribute('aria-controls');
            if (!controlsId) { return null; }
            return panels.find((panel) => panel.id === controlsId) || null;
        };

        const activateTab = (nextTab) => {
            if (!nextTab) { return; }
            const activePanel = findPanelForTab(nextTab);
            tabs.forEach((tab) => {
                const isActive = tab === nextTab;
                tab.setAttribute('aria-selected', String(isActive));
                tab.setAttribute('tabindex', isActive ? '0' : '-1');
                const panel = findPanelForTab(tab);
                if (panel) {
                    panel.hidden = !isActive;
                }
            });
            if (activePanel) {
                menuControls.dataset.activePanel = activePanel.id;
            } else {
                delete menuControls.dataset.activePanel;
            }

            if (menuElement) {
                const activePanelId = activePanel ? activePanel.id : '';
                saveMenuState(menuElement, { activePanelId });
            }
        };

        const focusTab = (tab) => {
            if (!tab) { return; }
            activateTab(tab);
            tab.focus();
        };

        const focusTabByOffset = (currentIndex, offset) => {
            if (!tabs.length) { return; }
            const nextIndex = (currentIndex + offset + tabs.length) % tabs.length;
            const nextTab = tabs[nextIndex];
            focusTab(nextTab);
        };

        tabs.forEach((tab, index) => {
            tab.addEventListener('click', () => {
                if (tab.getAttribute('aria-selected') === 'true') { return; }
                activateTab(tab);
            });
            tab.addEventListener('keydown', (event) => {
                if (event.key === 'ArrowRight') {
                    event.preventDefault();
                    focusTabByOffset(index, 1);
                } else if (event.key === 'ArrowLeft') {
                    event.preventDefault();
                    focusTabByOffset(index, -1);
                } else if (event.key === 'Home') {
                    event.preventDefault();
                    focusTab(tabs[0]);
                } else if (event.key === 'End') {
                    event.preventDefault();
                    focusTab(tabs[tabs.length - 1]);
                }
            });
        });

        let initiallySelected = tabs.find((tab) => tab.getAttribute('aria-selected') === 'true') || tabs[0];
        if (storedMenuActivePanelId) {
            const storedPanel = panels.find((panel) => panel.id === storedMenuActivePanelId) || null;
            if (storedPanel) {
                const storedTab = tabs.find((tab) => tab.getAttribute('aria-controls') === storedPanel.id) || null;
                if (storedTab) {
                    initiallySelected = storedTab;
                }
            }
        }
        activateTab(initiallySelected);
    }
    try {
        const response = await fetch('/api/source_types');
        const types = await response.json();
        const container = document.getElementById('sourceTypeFilters');
        types.forEach(type => {
            const label = document.createElement('label');
            const cb = document.createElement('input');
            cb.type = 'checkbox';
            cb.value = type;
            cb.checked = storedAllSourceTypesSelected
                || (storedSourceTypeSet ? storedSourceTypeSet.has(type) : true);
            cb.addEventListener('change', loadMarkers);
            const text = document.createElement('span');
            text.textContent = getSourceTypeLabel(type);
            label.appendChild(text);
            label.appendChild(cb);
            container.appendChild(label);
        });
    } catch(err) {
        console.error('Failed to load source types', err);
    }
    const startDateInput = document.getElementById('filterStartDate');
    const endDateInput = document.getElementById('filterEndDate');
    const clusterToggleInput = document.getElementById('clusterToggle');
    if (clusterToggleInput) {
        pendingClusterToggleState = clusterToggleInput.checked;
        clusterToggleInput.addEventListener('change', (event) => {
            const enabled = Boolean(event.currentTarget.checked);
            setClusteringEnabled(enabled);
        });
    }
    mapThemeToggle = document.getElementById('mapThemeToggle');
    syncMapThemeToggleControl();
    if (mapThemeToggle) {
        mapThemeToggle.addEventListener('change', (event) => {
            const nextMode = event.currentTarget.checked ? MAP_STYLE_MODE_NIGHT : MAP_STYLE_MODE_DAY;
            setMapStyleMode(nextMode);
        });
    }
    const clearDateButton = document.getElementById('clearDateFilters');

    if (startDateInput && storedFilterState) {
        const normalisedStart = normaliseDateInputValue(storedFilterState.startDate);
        if (normalisedStart !== null) {
            startDateInput.value = normalisedStart;
        }
    }
    if (endDateInput && storedFilterState) {
        const normalisedEnd = normaliseDateInputValue(storedFilterState.endDate);
        if (normalisedEnd !== null) {
            endDateInput.value = normalisedEnd;
        }
    }

    const applyDateFilters = () => {
        const startValue = startDateInput ? updateDateInputValue(startDateInput) : '';
        const endValue = endDateInput ? updateDateInputValue(endDateInput) : '';

        if (startValue === null || endValue === null) { return; }

        loadMarkers();
    };

    const debouncedApplyDateFilters = debounce(applyDateFilters, 400);

    const handleDateInputEvent = (event) => {
        const target = event && (event.currentTarget || event.target);
        if (!target || typeof target.value === 'undefined') { return; }

        const result = updateDateInputValue(target);
        if (result === null) { return; }

        debouncedApplyDateFilters();
    };

    if (startDateInput) {
        startDateInput.addEventListener('input', handleDateInputEvent);
        startDateInput.addEventListener('change', applyDateFilters);
    }
    if (endDateInput) {
        endDateInput.addEventListener('input', handleDateInputEvent);
        endDateInput.addEventListener('change', applyDateFilters);
    }
    if (clearDateButton) {
        clearDateButton.addEventListener('click', () => {
            if (startDateInput) { startDateInput.value = ''; }
            if (endDateInput) { endDateInput.value = ''; }
            applyDateFilters();
        });
    }
    await initMap();
    if (menuElement) {
        if (storedMenuState && typeof storedMenuState.open === 'boolean') {
            if (storedMenuState.open) { menuElement.classList.add('open'); }
            else { menuElement.classList.remove('open'); }
        }
        applyMenuState(menuElement, menuElement.classList.contains('open'), { skipPersistence: true });
    }
    document.addEventListener('keydown', (event) => {
        if (event.key !== 'Escape') { return; }
        const manualModalElement = document.getElementById('manualPointModal');
        if (manualModalElement && manualModalElement.classList.contains('open')) { return; }
        const aliasModalElement = document.getElementById('aliasModal');
        if (aliasModalElement && aliasModalElement.classList.contains('open')) { return; }
        const archivedModalElement = document.getElementById('archivedPointsModal');
        if (archivedModalElement && archivedModalElement.classList.contains('open')) { return; }

        if (tripPhotoSelectionState && tripPhotoSelectionState.active) {
            event.preventDefault();
            exitTripPhotoSelectionMode();
            showTripDescriptionStatus('');
            if (typeof event.stopImmediatePropagation === 'function') {
                event.stopImmediatePropagation();
            }
            if (typeof event.stopPropagation === 'function') {
                event.stopPropagation();
            }
            return;
        }

        if (tripDetailState && tripDetailState.selectedTripId !== null) {
            event.preventDefault();
            closeTripDetail();
            if (typeof event.stopImmediatePropagation === 'function') {
                event.stopImmediatePropagation();
            }
            if (typeof event.stopPropagation === 'function') {
                event.stopPropagation();
            }
            return;
        }

        const menu = document.querySelector('.menu-container');
        if (menu && menu.classList.contains('open')) {
            event.preventDefault();
            toggleMenu();
            const trigger = menu.querySelector('.menu-toggle');
            if (trigger) { trigger.focus(); }
        }
    });
});

function toggleMenu() {
    const menu = document.querySelector('.menu-container');
    if (!menu) { return; }
    const isOpen = menu.classList.toggle('open');
    applyMenuState(menu, isOpen);
    if (isOpen && typeof googleAuthRefreshHandler === 'function') {
        googleAuthRefreshHandler();
    }
}

function applyMenuState(menu, isOpen, options = {}) {
    const skipPersistence = options && options.skipPersistence;
    const trigger = menu.querySelector('.menu-toggle');
    const icon = trigger ? trigger.querySelector('.menu-toggle-icon img') : null;
    const label = trigger ? trigger.querySelector('.menu-toggle-text') : null;
    const controls = menu.querySelector('.overlay-controls');

    if (trigger) {
        trigger.setAttribute('aria-expanded', String(isOpen));
        trigger.setAttribute('aria-label', isOpen ? 'Close menu' : 'Open menu');
    }
    if (icon) { icon.setAttribute('src', isOpen ? CLOSE_ICON_PATH : MENU_ICON_PATH); }
    if (label) { label.textContent = isOpen ? 'Close' : 'Menu'; }
    if (controls) {
        controls.setAttribute('aria-hidden', String(!isOpen));
        if (isOpen) { controls.removeAttribute('inert'); }
        else { controls.setAttribute('inert', ''); }
        const focusableSelectors = 'button, [href], input, select, textarea, [tabindex]';
        const focusableElements = controls.querySelectorAll(focusableSelectors);
        focusableElements.forEach((element) => {
            if (isOpen) {
                if (element.dataset.menuPrevTabindex !== undefined) {
                    const previous = element.dataset.menuPrevTabindex;
                    if (previous === '') {
                        element.removeAttribute('tabindex');
                    } else {
                        element.setAttribute('tabindex', previous);
                    }
                    delete element.dataset.menuPrevTabindex;
                } else if (element.getAttribute('tabindex') === '-1') {
                    element.removeAttribute('tabindex');
                }
            } else {
                if (element.dataset.menuPrevTabindex === undefined) {
                    element.dataset.menuPrevTabindex = element.hasAttribute('tabindex') ? element.getAttribute('tabindex') || '' : '';
                }
                element.setAttribute('tabindex', '-1');
            }
        });
    }

    if (!skipPersistence) {
        saveMenuState(menu, { open: isOpen });
    }
}
