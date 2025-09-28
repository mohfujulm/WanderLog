import os
from flask import Flask
from dotenv import load_dotenv

from . import data_cache, trip_store

def create_app():
    load_dotenv()

    if os.getenv("FLASK_ENV") != "production":
        os.environ.setdefault("OAUTHLIB_INSECURE_TRANSPORT", "1")
        os.environ.setdefault("OAUTHLIB_RELAX_TOKEN_SCOPE", "1")

    app = Flask(__name__)

    # Load cached timeline data once during application startup
    data_cache.load_timeline_data()
    trip_store.load_trips()

    from .routes import main
    app.register_blueprint(main)

    return app
