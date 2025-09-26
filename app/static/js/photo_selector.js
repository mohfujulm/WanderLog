/* global window, document, fetch */

(function () {
    'use strict';

    const config = window.tripPhotoSelectorConfig || {};
    const tripIdRaw = config && config.tripId !== undefined ? config.tripId : '';
    const tripId = typeof tripIdRaw === 'string' ? tripIdRaw.trim() : String(tripIdRaw || '').trim();

    const availableInitial = Array.isArray(config.availablePhotos) ? config.availablePhotos : [];
    let availablePhotos = normalisePhotoList(availableInitial);
    let selectedPhotos = normalisePhotoList(Array.isArray(config.selectedPhotos) ? config.selectedPhotos : []);
    let lastInteractedIndex = null;

    const statusElement = document.getElementById('photoSelectorStatus');
    const gridElement = document.getElementById('photoSelectorGrid');
    const selectAllButton = document.getElementById('photoSelectorSelectAll');
    const clearAllButton = document.getElementById('photoSelectorClearAll');
    const saveButton = document.getElementById('photoSelectorSave');
    const closeButton = document.getElementById('photoSelectorClose');
    const selectedCountElement = document.getElementById('photoSelectorSelectedCount');

    function normalisePhotoList(values) {
        if (!Array.isArray(values)) { return []; }
        const seen = new Set();
        const cleaned = [];
        values.forEach((entry) => {
            if (entry === null || entry === undefined) { return; }
            const value = typeof entry === 'string' ? entry.trim() : String(entry || '').trim();
            if (!value || seen.has(value)) { return; }
            seen.add(value);
            cleaned.push(value);
        });
        return cleaned;
    }

    function getDisplayPhotos() {
        const fallback = normalisePhotoList(Array.isArray(config.availablePhotos) ? config.availablePhotos : []);
        const combined = [...availablePhotos, ...fallback, ...selectedPhotos];
        return normalisePhotoList(combined);
    }

    function showStatus(message, isError = false) {
        if (!statusElement) { return; }
        statusElement.textContent = message || '';
        statusElement.classList.toggle('photo-selector-status-error', Boolean(isError));
    }

    function updateSelectedCount() {
        if (!selectedCountElement) { return; }
        selectedCountElement.textContent = String(selectedPhotos.length);
    }

    function renderPhotos() {
        if (!gridElement) { return; }
        const photos = getDisplayPhotos();
        gridElement.innerHTML = '';
        lastInteractedIndex = null;

        if (!Array.isArray(photos) || photos.length === 0) {
            const emptyMessage = document.createElement('p');
            emptyMessage.className = 'photo-selector-empty';
            emptyMessage.textContent = 'No photos are available for this album.';
            gridElement.appendChild(emptyMessage);
            return;
        }

        const selectedSet = new Set(selectedPhotos);

        photos.forEach((photoUrl, index) => {
            const cleaned = typeof photoUrl === 'string' ? photoUrl.trim() : String(photoUrl || '').trim();
            if (!cleaned) { return; }

            const figure = document.createElement('figure');
            figure.className = 'photo-selector-item';
            figure.setAttribute('role', 'listitem');

            const image = document.createElement('img');
            image.src = cleaned;
            image.alt = `Photo ${index + 1}`;
            image.loading = 'lazy';
            image.decoding = 'async';
            figure.appendChild(image);

            const label = document.createElement('label');
            label.className = 'photo-selector-toggle';

            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.value = cleaned;
            checkbox.dataset.index = String(index);
            checkbox.checked = selectedSet.has(cleaned);
            label.appendChild(checkbox);

            const caption = document.createElement('span');
            caption.textContent = checkbox.checked ? 'Selected' : 'Select photo';
            caption.className = 'photo-selector-toggle-label';
            label.appendChild(caption);

            figure.appendChild(label);
            gridElement.appendChild(figure);
        });

        updateSelectedCount();
    }

    function setSavingState(isSaving) {
        const disabled = Boolean(isSaving);
        if (saveButton) { saveButton.disabled = disabled; }
        if (closeButton) { closeButton.disabled = disabled; }
        if (selectAllButton) { selectAllButton.disabled = disabled; }
        if (clearAllButton) { clearAllButton.disabled = disabled; }
        if (gridElement) {
            const inputs = gridElement.querySelectorAll('input[type="checkbox"]');
            inputs.forEach((input) => { input.disabled = disabled; });
        }
    }

    function togglePhotoSelection(url, selected) {
        const cleaned = typeof url === 'string' ? url.trim() : '';
        if (!cleaned) { return; }
        const current = normalisePhotoList(selectedPhotos);
        const index = current.indexOf(cleaned);
        if (selected) {
            if (index === -1) {
                current.push(cleaned);
            }
        } else if (index !== -1) {
            current.splice(index, 1);
        }
        selectedPhotos = current;
        updateSelectedCount();
    }

    async function saveSelection() {
        if (!tripId) {
            showStatus('This trip could not be identified.', true);
            return;
        }

        setSavingState(true);
        showStatus('Saving selection...');

        const payload = { selected_photos: selectedPhotos };

        try {
            const response = await fetch(`/api/trips/${encodeURIComponent(tripId)}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const result = await response.json().catch(() => ({}));

            if (!response.ok || (result && result.status === 'error')) {
                const message = (result && result.message) ? result.message : 'Failed to save selection.';
                throw new Error(message);
            }

            availablePhotos = normalisePhotoList(
                Array.isArray(result.available_photos) ? result.available_photos : availablePhotos
            );
            selectedPhotos = normalisePhotoList(
                Array.isArray(result.selected_photos) ? result.selected_photos : selectedPhotos
            );

            renderPhotos();
            showStatus(result.message || 'Trip photos updated successfully.');

            if (window.opener && !window.opener.closed) {
                const message = {
                    type: 'trip-photos-updated',
                    tripId,
                    selected_photos: selectedPhotos,
                    available_photos: availablePhotos
                };
                try {
                    window.opener.postMessage(message, window.location.origin);
                } catch (error) {
                    console.error('Failed to notify opener window about photo update.', error);
                }
            }
        } catch (error) {
            console.error('Failed to save photo selection', error);
            showStatus(error.message || 'Failed to save selection.', true);
            return;
        } finally {
            setSavingState(false);
        }
    }

    function bindEvents() {
        if (gridElement) {
            gridElement.addEventListener('change', (event) => {
                const target = event.target instanceof HTMLInputElement ? event.target : null;
                if (!target || target.type !== 'checkbox') { return; }
                togglePhotoSelection(target.value, target.checked);
                if (target.nextElementSibling) {
                    target.nextElementSibling.textContent = target.checked ? 'Selected' : 'Select photo';
                }
                const indexValue = target.dataset && target.dataset.index !== undefined ? Number(target.dataset.index) : NaN;
                lastInteractedIndex = Number.isNaN(indexValue) ? lastInteractedIndex : indexValue;
            });

            gridElement.addEventListener('click', (event) => {
                const rawTarget = event.target;
                if (!(rawTarget instanceof Element)) { return; }

                const label = rawTarget.closest('.photo-selector-toggle');
                let checkbox = null;
                if (rawTarget instanceof HTMLInputElement && rawTarget.type === 'checkbox') {
                    checkbox = rawTarget;
                } else if (label) {
                    checkbox = label.querySelector('input[type="checkbox"]');
                }

                if (!(checkbox instanceof HTMLInputElement) || checkbox.type !== 'checkbox') {
                    return;
                }

                const indexValue = checkbox.dataset && checkbox.dataset.index !== undefined ? Number(checkbox.dataset.index) : NaN;
                if (!event.shiftKey || lastInteractedIndex === null || Number.isNaN(indexValue)) {
                    lastInteractedIndex = Number.isNaN(indexValue) ? lastInteractedIndex : indexValue;
                    return;
                }

                const checkboxes = Array.from(gridElement.querySelectorAll('input[type="checkbox"]'));
                const start = Math.min(lastInteractedIndex, indexValue);
                const end = Math.max(lastInteractedIndex, indexValue);
                const shouldSelect = checkbox.checked;

                for (let i = start; i <= end; i += 1) {
                    const current = checkboxes[i];
                    if (!current) { continue; }
                    current.checked = shouldSelect;
                    const labelElement = current.nextElementSibling;
                    if (labelElement) {
                        labelElement.textContent = shouldSelect ? 'Selected' : 'Select photo';
                    }
                }

                selectedPhotos = normalisePhotoList(
                    checkboxes
                        .filter((input) => input.checked)
                        .map((input) => input.value)
                );
                updateSelectedCount();
                lastInteractedIndex = indexValue;
            });
        }

        if (selectAllButton) {
            selectAllButton.addEventListener('click', () => {
                const all = getDisplayPhotos();
                selectedPhotos = [...all];
                renderPhotos();
                showStatus('All photos selected.');
            });
        }

        if (clearAllButton) {
            clearAllButton.addEventListener('click', () => {
                selectedPhotos = [];
                renderPhotos();
                showStatus('Selection cleared.');
            });
        }

        if (saveButton) {
            saveButton.addEventListener('click', () => {
                saveSelection();
            });
        }

        if (closeButton) {
            closeButton.addEventListener('click', () => {
                window.close();
            });
        }

        window.addEventListener('beforeunload', () => {
            if (window.opener && !window.opener.closed) {
                window.opener.postMessage({ type: 'trip-photo-configurator-closed', tripId }, window.location.origin);
            }
        });
    }

    renderPhotos();
    bindEvents();
})();
