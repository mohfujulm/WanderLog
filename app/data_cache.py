import os
import pandas as pd

# Path to the master timeline CSV
CSV_PATH = os.path.join('data', 'master_timeline_data.csv')

# Cached pandas DataFrame
timeline_df = None

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

def save_timeline_data():
    """Persist ``timeline_df`` to ``CSV_PATH`` if data is available."""
    global timeline_df

    if timeline_df is None:
        print("No timeline data to save.")
        return

    try:
        os.makedirs(os.path.dirname(CSV_PATH), exist_ok=True)
        timeline_df.to_csv(CSV_PATH, index=False)
        print(f"Saved {len(timeline_df)} rows to {CSV_PATH}")
    except Exception as exc:
        print(f"Failed to save {CSV_PATH}: {exc}")


def clear_timeline_data():
    """Remove cached timeline data and delete the CSV file if present."""
    global timeline_df

    timeline_df = None
    if os.path.exists(CSV_PATH):
        try:
            os.remove(CSV_PATH)
            print(f"Removed {CSV_PATH}")
        except Exception as exc:
            print(f"Failed to remove {CSV_PATH}: {exc}")

