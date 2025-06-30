import os
import pandas as pd

# Path to the master timeline CSV
CSV_PATH = os.path.join('data', 'master_timeline_db.csv')

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

