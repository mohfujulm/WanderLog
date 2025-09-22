import os
from flask import Flask
from dotenv import load_dotenv

from . import data_cache, trip_store

def create_app():
    load_dotenv()

    app = Flask(__name__)

    # Load cached timeline data once during application startup
    data_cache.load_timeline_data()
    trip_store.load_trips()

    from .routes import main
    app.register_blueprint(main)

    return app
