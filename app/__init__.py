import os
from datetime import timedelta
from typing import Optional
from flask import Flask
from dotenv import load_dotenv

from . import data_cache, trip_store

def create_app():
    load_dotenv()

    def _as_bool(value: Optional[str]) -> bool:
        if value is None:
            return False
        return value.strip().lower() in {"1", "true", "t", "yes", "on"}

    app = Flask(__name__)

    secret_key = os.getenv("FLASK_SECRET_KEY") or os.getenv("SECRET_KEY")
    if not secret_key:
        secret_key = os.urandom(32)
    app.secret_key = secret_key

    insecure_transport = os.getenv("OAUTHLIB_INSECURE_TRANSPORT")
    is_insecure_transport_enabled = _as_bool(insecure_transport)
    if is_insecure_transport_enabled:
        os.environ["OAUTHLIB_INSECURE_TRANSPORT"] = "1"
    elif insecure_transport is not None:
        os.environ["OAUTHLIB_INSECURE_TRANSPORT"] = "0"
    app.config["OAUTHLIB_INSECURE_TRANSPORT"] = is_insecure_transport_enabled

    session_lifetime_days = os.getenv("SESSION_LIFETIME_DAYS")
    try:
        lifetime_days = int(session_lifetime_days) if session_lifetime_days is not None else 30
        if lifetime_days <= 0:
            lifetime_days = 30
    except (TypeError, ValueError):
        lifetime_days = 30
    app.permanent_session_lifetime = timedelta(days=lifetime_days)

    app.config["GOOGLE_CLIENT_ID"] = os.getenv("GOOGLE_CLIENT_ID", "")
    app.config["GOOGLE_CLIENT_SECRET"] = os.getenv("GOOGLE_CLIENT_SECRET", "")
    app.config["GOOGLE_PHOTOS_PICKER_API_KEY"] = os.getenv("GOOGLE_PHOTOS_PICKER_API_KEY", "")

    # Load cached timeline data once during application startup
    data_cache.load_timeline_data()
    trip_store.load_trips()

    from .routes import main
    app.register_blueprint(main)

    return app

