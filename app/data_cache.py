import os
from datetime import datetime

import pandas as pd

# Path to the master timeline CSV
CSV_PATH = os.path.join('data', 'master_timeline_data.csv')
BACKUP_TEMPLATE = os.path.join('data', 'master_timeline_data_backup_{timestamp}.csv')

# Cached pandas DataFrame
timeline_df = None


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

def load_timeline_data():
    """Load the timeline CSV into ``timeline_df`` if present."""
    global timeline_df

    if os.path.exists(CSV_PATH):
        try:
            timeline_df = pd.read_csv(CSV_PATH)
            print(f"Loaded {len(timeline_df)} rows from {CSV_PATH}")
            #print(timeline_df)
        except Exception as exc:
            print(f"Failed to load {CSV_PATH}: {exc}")
            timeline_df = None
    else:
        print(f"CSV file {CSV_PATH} not found. Continuing without cached data.")
        timeline_df = None

    ensure_archived_column()

def save_timeline_data():
    """Persist ``timeline_df`` to ``CSV_PATH`` if data is available."""
    global timeline_df

    if timeline_df is None:
        print("No timeline data to save.")
        return

    try:
        os.makedirs(os.path.dirname(CSV_PATH), exist_ok=True)
        ensure_archived_column()
        timeline_df.to_csv(CSV_PATH, index=False)
        print(f"Saved {len(timeline_df)} rows to {CSV_PATH}")
    except Exception as exc:
        print(f"Failed to save {CSV_PATH}: {exc}")


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

