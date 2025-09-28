import os
from flask import Flask
from dotenv import load_dotenv

from . import data_cache, trip_store


def create_app():
    load_dotenv()

    app = Flask(__name__)

    secret_key = (
        os.getenv("FLASK_SECRET_KEY")
        or os.getenv("SECRET_KEY")
        or "wanderlog-development-secret"
    )
    app.secret_key = secret_key

    app.config.update(
        GOOGLE_PHOTOS_CLIENT_ID=os.getenv("GOOGLE_PHOTOS_CLIENT_ID", ""),
        GOOGLE_PHOTOS_CLIENT_SECRET=os.getenv("GOOGLE_PHOTOS_CLIENT_SECRET", ""),
    )

    # Load cached timeline data once during application startup
    data_cache.load_timeline_data()
    trip_store.load_trips()

    from .routes import main

    app.register_blueprint(main)

    return app
