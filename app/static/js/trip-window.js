(function () {
    'use strict';

    const dataElement = document.getElementById('tripData');
    if (!dataElement) { return; }

    const tripId = dataElement.dataset.tripId ? dataElement.dataset.tripId.trim() : '';
    if (!tripId) { return; }

    let initialTrip = {};
    try {
        const parsed = JSON.parse(dataElement.textContent || '{}');
        if (parsed && typeof parsed === 'object') {
            initialTrip = parsed;
        }
    } catch (error) {
        console.error('Failed to parse trip payload', error);
    }

    const titleElement = document.getElementById('tripName');
    const updatedWrapper = document.getElementById('tripUpdatedWrapper');
    const updatedTimeElement = document.getElementById('tripUpdatedTime');
    const descriptionField = document.getElementById('tripDescription');
    const formElement = document.getElementById('tripDescriptionForm');
    const statusElement = document.getElementById('tripStatus');
    const saveButton = formElement ? formElement.querySelector('button[type="submit"]') : null;

    function formatDateTimeLabel(value) {
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

    function updateDocumentTitle(name) {
        const cleanedName = name && typeof name === 'string' ? name.trim() : '';
        if (cleanedName) {
            document.title = `${cleanedName} | WanderLog Trip`;
        } else {
            document.title = 'WanderLog Trip';
        }
    }

    function renderTrip(trip) {
        if (!trip || typeof trip !== 'object') { return; }

        const name = trip.name || 'Trip';
        if (titleElement) {
            titleElement.textContent = name;
        }
        updateDocumentTitle(name);

        if (descriptionField) {
            const value = typeof trip.description === 'string' ? trip.description : '';
            descriptionField.value = value;
        }

        if (updatedWrapper && updatedTimeElement) {
            const timestamp = trip.updated_at || trip.latest_location_date || trip.created_at || '';
            const label = formatDateTimeLabel(timestamp);
            if (label) {
                updatedTimeElement.textContent = label;
                updatedTimeElement.dateTime = timestamp;
                updatedWrapper.hidden = false;
            } else {
                updatedTimeElement.textContent = '';
                updatedTimeElement.removeAttribute('dateTime');
                updatedWrapper.hidden = true;
            }
        }
    }

    function showStatus(message, isError = false) {
        if (!statusElement) { return; }
        const text = message || '';
        statusElement.textContent = text;
        statusElement.hidden = text.length === 0;
        if (isError) {
            statusElement.classList.add('trip-status-error');
        } else {
            statusElement.classList.remove('trip-status-error');
        }
    }

    function setSavingState(isSaving) {
        if (saveButton) {
            saveButton.disabled = isSaving;
        }
        if (formElement) {
            formElement.classList.toggle('is-saving', Boolean(isSaving));
        }
    }

    async function refreshTrip() {
        try {
            const response = await fetch(`/api/trips/${encodeURIComponent(tripId)}`);
            const result = await response.json().catch(() => ({}));
            if (!response.ok) {
                const message = result && result.message ? result.message : 'Failed to load trip.';
                showStatus(message, true);
                return;
            }
            if (result && result.trip) {
                renderTrip(result.trip);
            }
        } catch (error) {
            console.error('Failed to refresh trip information', error);
            showStatus('Failed to refresh trip information.', true);
        }
    }

    if (formElement) {
        formElement.addEventListener('submit', async (event) => {
            event.preventDefault();

            if (!tripId) {
                showStatus('Trip could not be determined.', true);
                return;
            }

            const description = descriptionField ? descriptionField.value : '';

            setSavingState(true);
            showStatus('');

            try {
                const response = await fetch(`/api/trips/${encodeURIComponent(tripId)}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ description }),
                });
                const result = await response.json().catch(() => ({}));

                if (!response.ok || (result && result.status === 'error')) {
                    const message = result && result.message ? result.message : 'Failed to save description.';
                    throw new Error(message);
                }

                if (result && result.trip) {
                    renderTrip(result.trip);
                }

                showStatus(result && result.message ? result.message : 'Description saved successfully.');

                if (window.opener && !window.opener.closed) {
                    try {
                        window.opener.postMessage({ type: 'trip-updated', trip: result.trip }, window.location.origin);
                    } catch (postMessageError) {
                        // Ignore cross-origin issues.
                    }
                }
            } catch (error) {
                console.error('Failed to update trip description', error);
                showStatus(error.message || 'Failed to save description.', true);
            } finally {
                setSavingState(false);
            }
        });
    }

    renderTrip(initialTrip);
    refreshTrip();
})();
