const APP_CONFIG = window.wanderLogConfig || {};
const ASSET_CONFIG = APP_CONFIG.assets || {};
const MAPBOX_TOKEN = APP_CONFIG.mapboxToken || '';
const MENU_ICON_PATH = ASSET_CONFIG.menuIcon || '';
const CLOSE_ICON_PATH = ASSET_CONFIG.closeIcon || '';
const MAP_DEFAULT_CENTER = [40.65997395108914, -73.71300111746832];
const MAP_DEFAULT_ZOOM = 5;
const MAP_MIN_ZOOM = 2;
const MAP_WORLD_BOUNDS = [[-85, -180], [85, 180]];
const MAP_TILE_MAX_ZOOM = 18;
const TRIP_SINGLE_MARKER_ZOOM = 11;
const TRIP_BOUNDS_PADDING = [80, 80];
const TRIP_CLUSTER_OPTIONS = {
    showCoverageOnHover: false,
    disableClusteringAtZoom: TRIP_SINGLE_MARKER_ZOOM,
    chunkedLoading: true,
    spiderfyOnMaxZoom: true,
    spiderfyDistanceMultiplier: 1.2,
};
let map;
let markerCluster;
let tripMarkerLayer = null;
let tripMarkerIconInstance = null;
const tripMarkerLookup = new Map();
const mapMarkerLookup = new Map();
const mapMarkerData = new Map();
let isTripMapModeActive = false;
let previousMapView = null;
let manualPointForm;
let manualPointModalController = null;
let archivedPointsModalController = null;
let archivedPointsList = null;
let aliasForm;
let aliasModalController = null;
let aliasOriginalNameElement = null;
let aliasTargetMarkerId = null;
let aliasModalContext = { isArchived: false, triggerButton: null };
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
};

const tripDetailState = {
    initialised: false,
    selectedTripId: null,
    trip: null,
    locations: [],
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
    lastAppliedDescription: '',
    lastAppliedName: '',
    triggerElement: null,
};

const tripProfileEditState = {
    active: false,
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

const MARKER_ICON_PATHS = Object.assign(
    {
        google_timeline: '',
        manual: '',
        default: '',
    },
    APP_CONFIG.markerIcons || {},
);

const MAX_ALIAS_LENGTH = 120;
const MAX_TRIP_NAME_LENGTH = 120;

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
    const sourceLabel = getSourceTypeLabel(markerData.source_type);
    const sourceRow = sourceLabel
        ? `<div class="marker-popup-row"><span class="marker-popup-label">Source</span><span class="marker-popup-value">${escapeHtml(sourceLabel)}</span></div>`
        : '';
    const date = escapeHtml(markerData.date || 'Unknown');
    const latNumber = Number(markerData.lat);
    const lngNumber = Number(markerData.lng);
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

    const actions = hasId
        ? `<div class="marker-actions"><button type="button" class="marker-action marker-action-trip">${escapeHtml(manageTripLabel)}</button><button type="button" class="marker-action marker-action-alias">Rename</button><button type="button" class="marker-action marker-action-archive">Archive</button><button type="button" class="marker-action marker-action-delete">Delete</button></div>`
        : '';

    return [
        `<div class="marker-popup"${hasId ? ` data-marker-id="${safeId}"` : ''}>`,
        `<div class="marker-popup-row"><span class="marker-popup-label">${nameLabel}</span><span class="marker-popup-value">${displayName}</span></div>`,
        aliasRow,
        tripRow,
        sourceRow,
        `<div class="marker-popup-row"><span class="marker-popup-label">Date Visited</span><span class="marker-popup-value">${date}</span></div>`,
        `<div class="marker-popup-row"><span class="marker-popup-label">Coordinates</span><span class="marker-popup-value">${coordinates}</span></div>`,
        actions,
        `</div>`,
    ].filter(Boolean).join('');
}

function attachMarkerPopupActions(marker, markerData) {
    if (!marker || typeof marker.on !== 'function') { return; }

    marker.on('popupopen', () => {
        const popupInstance = typeof marker.getPopup === 'function' ? marker.getPopup() : null;
        const popupElement = popupInstance && typeof popupInstance.getElement === 'function'
            ? popupInstance.getElement()
            : null;
        if (!popupElement) { return; }

        const markerId = markerData && markerData.id ? markerData.id : '';
        const tripButton = popupElement.querySelector('.marker-action-trip');
        if (tripButton && markerData && markerId) {
            tripButton.onclick = (event) => {
                event.preventDefault();
                openTripAssignmentModal(markerData, { triggerButton: tripButton });
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
    });
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

function getMarkerIcon(sourceType) {
    const iconUrl = MARKER_ICON_PATHS[sourceType] || MARKER_ICON_PATHS.default;
    if (markerIconCache.has(iconUrl)) {
        return markerIconCache.get(iconUrl);
    }
    const icon = L.icon({
        className: 'marker-pin-icon',
        iconUrl,
        iconRetinaUrl: iconUrl,
        iconSize: [36, 48],
        iconAnchor: [18, 44],
        popupAnchor: [0, -40],
    });

    markerIconCache.set(iconUrl, icon);
    return icon;
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
    const element = typeof marker.getElement === 'function' ? marker.getElement() : marker._icon;
    if (element && element.classList) {
        element.classList.add('marker-selected');
    } else if (marker && typeof marker.once === 'function') {
        marker.once('add', () => {
            const el = typeof marker.getElement === 'function' ? marker.getElement() : marker._icon;
            if (el && el.classList) {
                el.classList.add('marker-selected');
            }
        });
    }
}

function removeHighlightFromMarker(marker) {
    if (!marker) { return; }
    const element = typeof marker.getElement === 'function' ? marker.getElement() : marker._icon;
    if (element && element.classList) {
        element.classList.remove('marker-selected');
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
            renderTripList();
        });
    }

    if (tripSortDirectionButton) {
        tripSortDirectionButton.addEventListener('click', () => {
            tripListState.sortDirection = tripListState.sortDirection === TRIP_SORT_DIRECTION_ASC
                ? TRIP_SORT_DIRECTION_DESC
                : TRIP_SORT_DIRECTION_ASC;
            updateTripSortDirectionButton();
            renderTripList();
        });
        updateTripSortDirectionButton();
    }

    if (tripListContainer) {
        tripListContainer.addEventListener('click', handleTripListClick);
        tripListContainer.addEventListener('keydown', handleTripListKeydown);
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

    return {
        id: identifier,
        name,
        location_count: locationCount,
        created_at: createdAt,
        updated_at: updatedAt,
        latest_location_date: latestDate,
        description,
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

function renderTripList() {
    if (!tripListState.initialised) { initTripsPanel(); }
    if (!tripListContainer) { return; }

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
    tripListContainer.scrollTop = 0;
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
        ? `Delete the trip “${displayName}”? This will remove it from all locations.`
        : 'Delete this trip? This will remove it from all locations.';

    await deleteTrip(tripId, {
        triggerButton: button || null,
        confirmMessage,
    });
}

function updateTripDescriptionSaveButtonState() {
    const hasChanges = Boolean(tripDescriptionState.isDirty || tripDescriptionState.isNameDirty);
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
    if (tripDescriptionCloseButton) {
        tripDescriptionCloseButton.disabled = Boolean(tripDescriptionState.isSaving);
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
    initTripProfilePanel();
    if (!tripDescriptionDisplayElement) { return; }

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

function applyTripProfileEditMode() {
    initTripProfilePanel();

    const isEditing = Boolean(tripProfileEditState.active);

    if (tripProfilePanelElement) {
        tripProfilePanelElement.classList.toggle('trip-profile-panel-editing', isEditing);
    }
    if (tripDescriptionForm) {
        tripDescriptionForm.hidden = !isEditing;
    }
    if (tripDescriptionDisplayElement) {
        tripDescriptionDisplayElement.hidden = isEditing;
    }
    if (tripNameInputContainer) {
        tripNameInputContainer.hidden = !isEditing;
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

    tripDescriptionState.isDirty = false;
    tripDescriptionState.isNameDirty = false;

    showTripDescriptionStatus('');
    applyTripProfileEditMode();

    const focusTarget = tripNameInputElement || tripDescriptionField || null;
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

    if (tripNameInputElement) {
        tripNameInputElement.value = tripDescriptionState.lastAppliedName || '';
    }
    if (tripDescriptionField) {
        tripDescriptionField.value = tripDescriptionState.lastAppliedDescription || '';
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

    const wasDirty = Boolean(tripDescriptionState.isDirty || tripDescriptionState.isNameDirty);
    exitTripProfileEditMode({ restoreFocus: true });

    const statusMessage = wasDirty ? 'Discarded unsaved changes.' : '';
    showTripDescriptionStatus(statusMessage);
}

function populateTripProfilePanel(trip, options = {}) {
    const { preserveDirty = true } = options || {};
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

    updateTripDescriptionDisplay(description);
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

        if (tripData && typeof tripData === 'object') {
            populateTripProfilePanel(tripData, { preserveDirty: true });
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

    if (!nameField && !descriptionField) {
        showTripDescriptionStatus('Editing controls are unavailable.', true);
        return;
    }

    const nameChanged = Boolean(tripDescriptionState.isNameDirty);
    const descriptionChanged = Boolean(tripDescriptionState.isDirty);

    if (!nameChanged && !descriptionChanged) {
        showTripDescriptionStatus('No changes to save.');
        return;
    }

    const payload = {};
    let description = '';

    if (nameChanged) {
        const rawName = nameField ? nameField.value : '';
        const trimmedName = rawName ? rawName.trim() : '';
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

    setTripDescriptionSaving(true);
    showTripDescriptionStatus('');

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
        if (updatedTrip && typeof updatedTrip === 'object') {
            populateTripProfilePanel(updatedTrip, { preserveDirty: false });
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
            tripDescriptionState.isNameDirty = false;
        }

        exitTripProfileEditMode({ restoreFocus: true });
        showTripDescriptionStatus(result && result.message ? result.message : 'Trip updated successfully.');
    } catch (error) {
        console.error('Failed to update trip description', error);
        showTripDescriptionStatus(error.message || 'Failed to save description.', true);
    } finally {
        setTripDescriptionSaving(false);
    }
}

function initTripProfilePanel() {
    if (!tripProfileOverlay) {
        tripProfileOverlay = document.getElementById('tripProfileOverlay');
    }
    if (!tripProfilePanelElement) {
        tripProfilePanelElement = document.getElementById('tripProfilePanel');
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

    tripProfilePanelInitialised = true;
    applyTripProfileEditMode();
    updateTripDescriptionDisplay();
    updateTripDescriptionSaveButtonState();
}

function openTripProfile(tripId, options = {}) {
    initTripProfilePanel();

    const cleanedTripId = typeof tripId === 'string'
        ? tripId.trim()
        : String(tripId || '').trim();
    if (!cleanedTripId) { return; }

    const { triggerElement = null } = options || {};

    tripDescriptionState.tripId = cleanedTripId;
    tripDescriptionState.isSaving = false;
    tripDescriptionState.isDirty = false;
    tripDescriptionState.isNameDirty = false;
    tripDescriptionState.lastAppliedDescription = '';
    tripDescriptionState.lastAppliedName = '';
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

    tripDescriptionState.requestId += 1;
    const trigger = tripDescriptionState.triggerElement;
    tripDescriptionState.tripId = null;
    tripDescriptionState.isSaving = false;
    tripDescriptionState.isDirty = false;
    tripDescriptionState.isNameDirty = false;
    tripDescriptionState.lastAppliedDescription = '';
    tripDescriptionState.lastAppliedName = '';
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

    const requestId = tripDetailState.requestId + 1;
    tripDetailState.requestId = requestId;
    tripDetailState.selectedTripId = tripId;
    tripDetailState.triggerElement = triggerElement || null;
    tripDetailState.searchTerm = '';
    tripDetailState.sortField = TRIP_LOCATION_SORT_FIELD_DATE;
    tripDetailState.sortDirection = TRIP_SORT_DIRECTION_ASC;
    tripDetailState.locations = [];
    tripDetailState.trip = null;
    tripDetailState.activeLocationId = null;

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

    const fallbackTrip = Array.isArray(tripListState.trips)
        ? tripListState.trips.find((entry) => entry.id === tripId)
        : null;
    if (fallbackTrip) {
        tripDetailState.trip = { ...fallbackTrip };
    }
    updateTripDetailHeader();

    showTripDetailView();
    renderTripList();
    setTripDetailLoading(true);

    const cached = tripLocationCache.get(tripId);
    if (cached && Array.isArray(cached.locations)) {
        const normalisedTrip = normaliseTrip(cached.trip) || fallbackTrip || { id: tripId, name: TRIP_NAME_FALLBACK };
        const locations = normaliseTripLocationList(cached.locations);
        tripDetailState.trip = { ...normalisedTrip, location_count: locations.length };
        tripDetailState.locations = locations;
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
    tripDetailState.searchTerm = '';
    tripDetailState.sortField = TRIP_LOCATION_SORT_FIELD_DATE;
    tripDetailState.sortDirection = TRIP_SORT_DIRECTION_ASC;
    tripDetailState.requestId += 1;
    tripDetailState.triggerElement = null;
    tripDetailState.activeLocationId = null;

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
        if (event.defaultPrevented) { return; }
        if (event.key === 'Escape') {
            event.preventDefault();
            closeTripDetail();
        }
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
    if (tripDescriptionField && !tripDescriptionState.isSaving) {
        try {
            tripDescriptionField.focus({ preventScroll: true });
        } catch (error) {
            tripDescriptionField.focus();
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
                ? `Edit trip “${displayName}”`
                : 'Edit trip';
            tripDetailEditButton.disabled = tripProfileEditState.active || isSaving;
            tripDetailEditButton.dataset.tripId = tripId;
            tripDetailEditButton.setAttribute('aria-label', editLabel);
            tripDetailEditButton.title = editLabel;
        }

        if (tripDetailDeleteButton) {
            tripDetailDeleteButton.dataset.tripId = tripId;
            const deleteLabel = displayName
                ? `Delete trip “${displayName}”`
                : 'Delete trip';
            tripDetailDeleteButton.setAttribute('aria-label', deleteLabel);
            tripDetailDeleteButton.title = deleteLabel;
            const canInteract = tripProfileEditState.active && !isSaving;
            tripDetailDeleteButton.hidden = !tripProfileEditState.active;
            tripDetailDeleteButton.disabled = !canInteract;
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

        tripLocationCache.set(tripId, { trip: tripData, locations: locationsRaw });

        const normalisedTrip = normaliseTrip(tripData) || { id: tripId, name: TRIP_NAME_FALLBACK };
        const locations = normaliseTripLocationList(locationsRaw);

        tripDetailState.trip = { ...normalisedTrip, location_count: locations.length };
        tripDetailState.locations = locations;
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
            tripLocationCache.set(cleanedTripId, { trip: updatedTrip, locations: filteredLocations });
        } else if (tripData) {
            tripLocationCache.set(cleanedTripId, { trip: { ...(cacheEntry.trip || {}), ...tripData }, locations: cacheEntry.locations });
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

function ensureTripMarkerLayer() {
    if (!tripMarkerLayer) {
        tripMarkerLayer = L.markerClusterGroup(Object.assign({}, TRIP_CLUSTER_OPTIONS));
    }
    return tripMarkerLayer;
}

function getTripHighlightIcon() {
    if (tripMarkerIconInstance) { return tripMarkerIconInstance; }
    tripMarkerIconInstance = L.divIcon({
        className: 'trip-marker-icon',
        iconSize: [36, 48],
        iconAnchor: [18, 44],
        popupAnchor: [0, -40],
    });
    return tripMarkerIconInstance;
}

function activateTripMapMode() {
    const wasActive = isTripMapModeActive;
    isTripMapModeActive = true;

    const layer = ensureTripMarkerLayer();
    layer.clearLayers();
    tripMarkerLookup.clear();

    if (!map) { return layer; }

    if (!wasActive || !previousMapView) {
        try {
            previousMapView = { center: map.getCenter(), zoom: map.getZoom() };
        } catch (error) {
            previousMapView = null;
        }
    }

    if (typeof map.closePopup === 'function') {
        map.closePopup();
    }

    if (markerCluster && map.hasLayer(markerCluster)) {
        map.removeLayer(markerCluster);
    }

    if (!map.hasLayer(layer)) {
        layer.addTo(map);
    }

    return layer;
}

function deactivateTripMapMode(options = {}) {
    const { reload = false } = options || {};
    isTripMapModeActive = false;

    if (!tripMarkerLayer) {
        previousMapView = null;
        if (reload && typeof loadMarkers === 'function') {
            loadMarkers();
        }
        return;
    }

    tripMarkerLayer.clearLayers();
    tripMarkerLookup.clear();

    if (map && map.hasLayer(tripMarkerLayer)) {
        map.removeLayer(tripMarkerLayer);
    }

    if (map && markerCluster && !map.hasLayer(markerCluster)) {
        map.addLayer(markerCluster);
    }

    if (map && previousMapView) {
        try {
            map.flyTo(previousMapView.center, previousMapView.zoom, { duration: 0.5 });
        } catch (error) {
            map.setView(previousMapView.center, previousMapView.zoom);
        }
    }
    previousMapView = null;

    if (reload && typeof loadMarkers === 'function') {
        loadMarkers();
    }
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

function showTripLocationsOnMap(locations, options = {}) {
    const { adjustView = true } = options || {};
    const layer = activateTripMapMode();
    if (!map) { return; }
    if (!layer) { return; }

    const highlightIcon = getTripHighlightIcon();
    const tooltipOptions = {
        direction: 'top',
        offset: [0, -24],
        className: 'trip-marker-tooltip',
    };

    const points = [];

    (Array.isArray(locations) ? locations : []).forEach((location) => {
        const markerData = createTripMarkerData(location);
        if (!markerData) { return; }

        const latLng = L.latLng(markerData.lat, markerData.lng);
        const title = markerData.display_name || markerData.alias || markerData.place || '';
        const marker = L.marker(latLng, {
            icon: highlightIcon,
            title: title || undefined,
            riseOnHover: true,
            keyboard: false,
        });

        if (title) {
            marker.bindTooltip(title, tooltipOptions);
        }

        const popupContent = createPopupContent(markerData);
        if (popupContent) {
            marker.bindPopup(popupContent);
            attachMarkerPopupActions(marker, markerData);
        }

        layer.addLayer(marker);

        const markerKey = (location && typeof location.key === 'string' && location.key)
            ? location.key
            : (location && typeof location.place_id === 'string' ? location.place_id : '');
        if (markerKey) {
            tripMarkerLookup.set(markerKey, marker);
        }
        points.push(latLng);
    });

    if (!points.length) {
        if (adjustView) {
            map.flyTo(MAP_DEFAULT_CENTER, MAP_DEFAULT_ZOOM, { duration: 0.5 });
        }
        return;
    }

    if (!adjustView) { return; }

    if (points.length === 1) {
        map.flyTo(points[0], TRIP_SINGLE_MARKER_ZOOM, { duration: 0.7 });
        return;
    }

    const bounds = L.latLngBounds(points);
    map.flyToBounds(bounds, {
        padding: TRIP_BOUNDS_PADDING,
        duration: 0.75,
        maxZoom: TRIP_SINGLE_MARKER_ZOOM,
    });
}

function focusMapOnTripLocation(location) {
    if (!map) { return false; }
    if (!location || typeof location !== 'object') { return false; }

    const lat = Number(location.latitude);
    const lng = Number(location.longitude);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) { return false; }

    const markerKey = (typeof location.key === 'string' && location.key)
        ? location.key
        : (typeof location.place_id === 'string' ? location.place_id : '');
    if (!isTripMapModeActive || !markerKey || !tripMarkerLookup.has(markerKey)) {
        const allLocations = Array.isArray(tripDetailState.locations) ? tripDetailState.locations : [];
        showTripLocationsOnMap(allLocations, { adjustView: false });
    }

    const targetLatLng = L.latLng(lat, lng);
    try {
        map.flyTo(targetLatLng, TRIP_SINGLE_MARKER_ZOOM, { duration: 0.7 });
    } catch (error) {
        map.setView(targetLatLng, TRIP_SINGLE_MARKER_ZOOM);
    }

    if (markerKey) {
        const marker = tripMarkerLookup.get(markerKey);
        if (marker) {
            const revealMarker = () => {
                const popupInstance = typeof marker.getPopup === 'function' ? marker.getPopup() : null;
                if (popupInstance && typeof marker.openPopup === 'function') {
                    if (typeof marker.closeTooltip === 'function') {
                        marker.closeTooltip();
                    }
                    marker.openPopup();
                } else if (typeof marker.openTooltip === 'function') {
                    marker.openTooltip();
                }
            };

            if (tripMarkerLayer && typeof tripMarkerLayer.zoomToShowLayer === 'function') {
                tripMarkerLayer.zoomToShowLayer(marker, revealMarker);
            } else {
                revealMarker();
            }
        }
    }

    return true;
}

function focusMapOnTripLocations() {
    if (!tripDetailState.selectedTripId) { return; }
    const locations = Array.isArray(tripDetailState.locations) ? tripDetailState.locations : [];
    showTripLocationsOnMap(locations);
}

function initMap() {
    // Create a Leaflet map centered on a default view
    const worldBounds = L.latLngBounds(MAP_WORLD_BOUNDS);
    map = L.map('map', {
        center: MAP_DEFAULT_CENTER,
        zoom: MAP_DEFAULT_ZOOM,
        minZoom: MAP_MIN_ZOOM,
        maxBounds: worldBounds,
        maxBoundsViscosity: 1.0,
        worldCopyJump: false,
    });
    // Add Mapbox tiles using the token passed from the backend
    L.tileLayer(`https://api.mapbox.com/styles/v1/mapbox/outdoors-v12/tiles/{z}/{x}/{y}?access_token=${MAPBOX_TOKEN}`, {
        maxZoom: MAP_TILE_MAX_ZOOM,
        minZoom: MAP_MIN_ZOOM,
        attribution: 'Mapbox',
        noWrap: true,
        bounds: worldBounds,
    }).addTo(map);
    // Cluster group keeps the map responsive when many markers are shown
    markerCluster = L.markerClusterGroup();
    map.addLayer(markerCluster);
    setupManageModeMapInteractions();
    // Load existing markers once the map is ready
    loadMarkers();

    if (isTripMapModeActive && tripDetailState.selectedTripId) {
        focusMapOnTripLocations();
    }
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

    // Remove any markers currently displayed
    markerCluster.clearLayers();
    mapMarkerLookup.clear();
    mapMarkerData.clear();

    // Collect the values of all checked source type filters
    const checked = Array.from(
        document.querySelectorAll('#sourceTypeFilters input:checked')
    ).map((cb) => cb.value);

    const payload = { source_types: checked };
    if (startDate) { payload.start_date = startDate; }
    if (endDate) { payload.end_date = endDate; }

    try {
        // Request the marker list from the server, filtering by source type
        const response = await fetch('/api/map_data', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });
        // Parse the JSON response
        const markers = await response.json();
        // Add a Leaflet marker for each item returned
        markers.forEach((m) => {
            const lat = Number(m.lat);
            const lng = Number(m.lng);
            if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
                return;
            }

            const displayNameRaw = m.display_name ?? '';
            const displayNameClean = typeof displayNameRaw === 'string'
                ? displayNameRaw.trim()
                : String(displayNameRaw || '').trim();
            const placeRaw = m.place ?? '';
            const placeClean = typeof placeRaw === 'string'
                ? placeRaw.trim()
                : String(placeRaw || '').trim();
            const markerTitle = displayNameClean || placeClean;

            const markerIdRaw = m.id ?? m.place_id ?? '';
            const markerId = typeof markerIdRaw === 'string'
                ? markerIdRaw.trim()
                : String(markerIdRaw || '').trim();

            const marker = L.marker([lat, lng], {
                icon: getMarkerIcon(m.source_type),
                title: markerTitle,
                riseOnHover: true,
            });

            const popupContent = createPopupContent(m);
            if (popupContent) {
                marker.bindPopup(popupContent);
                attachMarkerPopupActions(marker, m);
            }

            if (markerId) {
                mapMarkerLookup.set(markerId, marker);
                mapMarkerData.set(markerId, {
                    ...m,
                    id: markerId,
                    lat,
                    lng,
                });
                marker.on('add', () => {
                    if (manageModeState.selectedIds.has(markerId)) {
                        highlightMarker(marker);
                    }
                });
                marker.on('remove', () => {
                    removeHighlightFromMarker(marker);
                });
                marker.on('click', (event) => {
                    if (!isManageModeActive()) { return; }
                    if (event && event.originalEvent) {
                        if (typeof event.originalEvent.preventDefault === 'function') {
                            event.originalEvent.preventDefault();
                        }
                        if (typeof event.originalEvent.stopPropagation === 'function') {
                            event.originalEvent.stopPropagation();
                        }
                    }
                    toggleMarkerSelectionById(markerId);
                });
                marker.on('popupopen', () => {
                    if (isManageModeActive() && typeof marker.closePopup === 'function') {
                        marker.closePopup();
                    }
                });
            }

            marker.addTo(markerCluster);
        });
        // Done loading
        hideLoading();
        refreshSelectionAfterDataLoad();
    } catch (err) {
        hideLoading();
        console.error(err);
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

function ensureManualPointModal() {
    if (manualPointModalController) { return manualPointModalController; }

    manualPointForm = document.getElementById('manualPointForm');
    const controller = createModalController('manualPointModal', {
        getInitialFocus: () => {
            const form = manualPointForm || document.getElementById('manualPointForm');
            return form ? form.elements['place_name'] : null;
        },
        onClose: () => {
            const form = manualPointForm || document.getElementById('manualPointForm');
            if (form) { form.reset(); }
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
            meta.textContent = metaParts.join(' • ');
            details.appendChild(meta);

            const actionsContainer = document.createElement('div');
            actionsContainer.className = 'archived-item-actions';

            if (marker.id) {
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
        if (markerInstance && typeof markerInstance.closePopup === 'function') {
            markerInstance.closePopup();
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
        if (markerInstance && typeof markerInstance.closePopup === 'function') {
            markerInstance.closePopup();
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
    ensureManualPointModal();
    ensureAliasModal();
    ensureArchivedPointsModal();
    initManageModeControls();
    initTripsPanel();
    await loadTripsPanelData();
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

        const initiallySelected = tabs.find((tab) => tab.getAttribute('aria-selected') === 'true') || tabs[0];
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
            cb.checked = true;
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
    const clearDateButton = document.getElementById('clearDateFilters');

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
    initMap();
    const menu = document.querySelector('.menu-container');
    if (menu) { applyMenuState(menu, menu.classList.contains('open')); }
    document.addEventListener('keydown', (event) => {
        if (event.key !== 'Escape') { return; }
        const manualModalElement = document.getElementById('manualPointModal');
        if (manualModalElement && manualModalElement.classList.contains('open')) { return; }
        const aliasModalElement = document.getElementById('aliasModal');
        if (aliasModalElement && aliasModalElement.classList.contains('open')) { return; }
        const archivedModalElement = document.getElementById('archivedPointsModal');
        if (archivedModalElement && archivedModalElement.classList.contains('open')) { return; }

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
}

function applyMenuState(menu, isOpen) {
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
}
