import json
import os
import shutil
from datetime import datetime, timezone
from uuid import uuid4

import pandas as pd

# Path to the master timeline CSV
CSV_PATH = os.path.join('data', 'master_timeline_data.csv')
BACKUP_TEMPLATE = os.path.join('data', 'master_timeline_data_backup_{timestamp}.csv')
HISTORY_DIR = os.path.join('data', 'master_timeline_history')
HISTORY_INDEX_PATH = os.path.join(HISTORY_DIR, 'history_index.json')
MAX_HISTORY_ENTRIES = 250

# Cached pandas DataFrame
timeline_df = None


def _now_utc_iso() -> str:
    return datetime.now(timezone.utc).isoformat().replace('+00:00', 'Z')


def _history_filename(timestamp: str, version_id: str) -> str:
    safe_timestamp = timestamp.replace(':', '').replace('-', '')
    return f'master_timeline_{safe_timestamp}_{version_id}.csv'


def _ensure_history_storage() -> None:
    os.makedirs(HISTORY_DIR, exist_ok=True)


def _load_history_index() -> list[dict]:
    if not os.path.exists(HISTORY_INDEX_PATH):
        return []
    try:
        with open(HISTORY_INDEX_PATH, 'r', encoding='utf-8') as handle:
            payload = json.load(handle)
    except (OSError, ValueError, TypeError):
        return []
    return payload if isinstance(payload, list) else []


def _write_history_index(entries: list[dict]) -> None:
    _ensure_history_storage()
    with open(HISTORY_INDEX_PATH, 'w', encoding='utf-8') as handle:
        json.dump(entries, handle, indent=2)


def _prune_history(entries: list[dict]) -> list[dict]:
    if len(entries) <= MAX_HISTORY_ENTRIES:
        return entries

    kept_entries = entries[:MAX_HISTORY_ENTRIES]
    removed_entries = entries[MAX_HISTORY_ENTRIES:]
    for entry in removed_entries:
        snapshot_path = entry.get('snapshot_path')
        if snapshot_path and os.path.exists(snapshot_path):
            try:
                os.remove(snapshot_path)
            except OSError:
                pass
    return kept_entries


def create_version_snapshot(reason: str = 'Automatic save', *, metadata: dict | None = None) -> dict | None:
    """Persist the current on-disk CSV as a restorable version entry."""

    if not os.path.exists(CSV_PATH):
        return None

    _ensure_history_storage()
    timestamp = _now_utc_iso()
    version_id = uuid4().hex
    filename = _history_filename(timestamp, version_id)
    snapshot_path = os.path.join(HISTORY_DIR, filename)

    shutil.copy2(CSV_PATH, snapshot_path)

    entry = {
        'id': version_id,
        'created_at': timestamp,
        'reason': reason or 'Automatic save',
        'snapshot_path': snapshot_path,
        'snapshot_filename': filename,
        'source_path': CSV_PATH,
        'size_bytes': os.path.getsize(snapshot_path),
        'metadata': metadata or {},
    }

    entries = _load_history_index()
    entries.insert(0, entry)
    entries = _prune_history(entries)
    _write_history_index(entries)
    return entry


def list_timeline_history(limit: int = 50) -> list[dict]:
    """Return recent timeline history entries, newest first."""

    entries = _load_history_index()
    return entries[:max(1, int(limit or 50))]


def restore_timeline_version(version_id: str) -> dict:
    """Restore ``CSV_PATH`` from the selected version entry."""

    entries = _load_history_index()
    selected = next((entry for entry in entries if entry.get('id') == version_id), None)
    if not selected:
        raise KeyError('Version not found.')

    snapshot_path = selected.get('snapshot_path') or ''
    if not snapshot_path or not os.path.exists(snapshot_path):
        raise FileNotFoundError('Snapshot file is missing.')

    restore_point = create_version_snapshot(
        'Restore safety snapshot',
        metadata={'restored_from_version_id': version_id},
    )

    os.makedirs(os.path.dirname(CSV_PATH), exist_ok=True)
    shutil.copy2(snapshot_path, CSV_PATH)
    load_timeline_data()

    return {
        'restored_entry': selected,
        'restore_point': restore_point,
    }


def _prepare_dataframe_for_diff(dataframe: pd.DataFrame | None) -> pd.DataFrame:
    if dataframe is None:
        return pd.DataFrame()

    prepared = dataframe.copy()

    if 'Archived' in prepared.columns:
        prepared['Archived'] = prepared['Archived'].fillna(False)
    if 'Alias' in prepared.columns:
        prepared['Alias'] = prepared['Alias'].apply(lambda value: '' if pd.isna(value) else str(value))
    if 'Description' in prepared.columns:
        prepared['Description'] = prepared['Description'].apply(lambda value: '' if pd.isna(value) else str(value))

    return prepared


def _load_timeline_dataframe_from_path(path: str) -> pd.DataFrame:
    if not path or not os.path.exists(path):
        return pd.DataFrame()
    try:
        dataframe = pd.read_csv(path)
    except Exception:
        return pd.DataFrame()
    return _prepare_dataframe_for_diff(dataframe)


def _normalise_diff_value(value) -> str:
    if pd.isna(value):
        return ''
    if isinstance(value, bool):
        return 'true' if value else 'false'
    if isinstance(value, float):
        if value.is_integer():
            return str(int(value))
        return str(value)
    return str(value)


def _diff_row_label(row: dict, row_id: str) -> str:
    alias = _normalise_diff_value(row.get('Alias', '')) if isinstance(row, dict) else ''
    place_name = _normalise_diff_value(row.get('Place Name', '')) if isinstance(row, dict) else ''
    return alias or place_name or row_id


def get_timeline_version_diff(version_id: str, *, row_limit: int = 40, cell_limit: int = 200) -> dict:
    """Return a summary of changes between a snapshot version and the current CSV."""

    entries = _load_history_index()
    selected = next((entry for entry in entries if entry.get('id') == version_id), None)
    if not selected:
        raise KeyError('Version not found.')

    snapshot_path = selected.get('snapshot_path') or ''
    if not snapshot_path or not os.path.exists(snapshot_path):
        raise FileNotFoundError('Snapshot file is missing.')

    before_df = _load_timeline_dataframe_from_path(snapshot_path)
    after_df = _load_timeline_dataframe_from_path(CSV_PATH)

    before_columns = list(before_df.columns)
    after_columns = list(after_df.columns)
    ordered_columns = before_columns + [column for column in after_columns if column not in before_columns]

    if 'Place ID' in before_df.columns and before_df['Place ID'].is_unique:
        before_df = before_df.set_index('Place ID', drop=False)
    else:
        before_df = before_df.copy()
        before_df['_row_key'] = [f'before:{index}' for index in range(len(before_df))]
        before_df = before_df.set_index('_row_key', drop=False)

    if 'Place ID' in after_df.columns and after_df['Place ID'].is_unique:
        after_df = after_df.set_index('Place ID', drop=False)
    else:
        after_df = after_df.copy()
        after_df['_row_key'] = [f'after:{index}' for index in range(len(after_df))]
        after_df = after_df.set_index('_row_key', drop=False)

    before_ids = list(before_df.index)
    after_ids = list(after_df.index)
    before_id_set = set(before_ids)
    after_id_set = set(after_ids)

    added_ids = [row_id for row_id in after_ids if row_id not in before_id_set]
    removed_ids = [row_id for row_id in before_ids if row_id not in after_id_set]
    shared_ids = [row_id for row_id in after_ids if row_id in before_id_set]

    changed_rows = []
    changed_row_count = 0
    changed_cell_count = 0

    for row_id in shared_ids:
        before_row = before_df.loc[row_id].to_dict()
        after_row = after_df.loc[row_id].to_dict()
        row_changes = []

        for column in ordered_columns:
            before_value = _normalise_diff_value(before_row.get(column, ''))
            after_value = _normalise_diff_value(after_row.get(column, ''))
            if before_value == after_value:
                continue
            changed_cell_count += 1
            if len(row_changes) < cell_limit:
                row_changes.append({
                    'column': column,
                    'before': before_value,
                    'after': after_value,
                })

        if row_changes:
            changed_row_count += 1
            if len(changed_rows) < row_limit:
                changed_rows.append({
                    'id': str(row_id),
                    'label': _diff_row_label(after_row, str(row_id)),
                    'changes': row_changes[:cell_limit],
                })

    added_rows = []
    for row_id in added_ids[:row_limit]:
        row = after_df.loc[row_id].to_dict()
        added_rows.append({
            'id': str(row_id),
            'label': _diff_row_label(row, str(row_id)),
        })

    removed_rows = []
    for row_id in removed_ids[:row_limit]:
        row = before_df.loc[row_id].to_dict()
        removed_rows.append({
            'id': str(row_id),
            'label': _diff_row_label(row, str(row_id)),
        })

    return {
        'version': {
            'id': selected.get('id', ''),
            'created_at': selected.get('created_at'),
            'reason': selected.get('reason', 'Automatic save'),
        },
        'summary': {
            'added_rows': len(added_ids),
            'removed_rows': len(removed_ids),
            'changed_rows': changed_row_count,
            'changed_cells': changed_cell_count,
        },
        'preview': {
            'changed_rows': changed_rows,
            'added_rows': added_rows,
            'removed_rows': removed_rows,
            'row_limit': row_limit,
            'cell_limit': cell_limit,
        },
    }


def ensure_archived_column():
    """Ensure the cached dataframe has the required maintenance columns.

    The timeline data historically did not include management columns such as
    ``Archived`` or the newly added ``Alias`` field.  This helper normalises
    the dataframe so the rest of the codebase can rely on those columns being
    present with sensible default values.
    """

    global timeline_df

    if timeline_df is None:
        return

    if "Archived" not in timeline_df.columns:
        timeline_df["Archived"] = False
    else:
        timeline_df["Archived"] = timeline_df["Archived"].fillna(False)

    if "Alias" not in timeline_df.columns:
        timeline_df["Alias"] = ""
    else:
        timeline_df["Alias"] = timeline_df["Alias"].apply(
            lambda value: "" if pd.isna(value) else str(value)
        )

    if "Description" not in timeline_df.columns:
        timeline_df["Description"] = ""
    else:
        def _clean_description(value):
            if pd.isna(value):
                return ""
            text = str(value)
            return text if text.strip() else ""

        timeline_df["Description"] = timeline_df["Description"].apply(
            _clean_description
        )


def load_timeline_data():
    """Load the timeline CSV into ``timeline_df`` if present."""
    global timeline_df

    if os.path.exists(CSV_PATH):
        try:
            timeline_df = pd.read_csv(CSV_PATH)
            print(f"Loaded {len(timeline_df)} rows from {CSV_PATH}")
        except Exception as exc:
            print(f"Failed to load {CSV_PATH}: {exc}")
            timeline_df = None
    else:
        print(f"CSV file {CSV_PATH} not found. Continuing without cached data.")
        timeline_df = None

    ensure_archived_column()


def save_timeline_data(reason: str = 'Automatic save', *, metadata: dict | None = None, create_version: bool = True):
    """Persist ``timeline_df`` to ``CSV_PATH`` if data is available."""
    global timeline_df

    if timeline_df is None:
        print("No timeline data to save.")
        return None

    snapshot_entry = None
    try:
        os.makedirs(os.path.dirname(CSV_PATH), exist_ok=True)
        ensure_archived_column()
        if create_version and os.path.exists(CSV_PATH):
            snapshot_entry = create_version_snapshot(reason, metadata=metadata)
        timeline_df.to_csv(CSV_PATH, index=False)
        print(f"Saved {len(timeline_df)} rows to {CSV_PATH}")
    except Exception as exc:
        print(f"Failed to save {CSV_PATH}: {exc}")
        raise

    return snapshot_entry


def backup_timeline_data():
    """Create a timestamped backup of the current ``timeline_df``.

    Returns the path to the backup file if a backup was created.
    """

    global timeline_df

    if timeline_df is None or timeline_df.empty:
        print("No timeline data to backup.")
        return None

    ensure_archived_column()

    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    backup_path = BACKUP_TEMPLATE.format(timestamp=timestamp)

    os.makedirs(os.path.dirname(backup_path), exist_ok=True)

    timeline_df.to_csv(backup_path, index=False)
    print(f"Created backup with {len(timeline_df)} rows at {backup_path}")
    return backup_path
