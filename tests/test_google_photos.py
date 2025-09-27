import json
import os
import time
from pathlib import Path
from types import SimpleNamespace
from urllib.parse import parse_qs, urlparse

import pytest

import app.routes as routes
from app import create_app
from app.config import DEFAULT_GOOGLE_PHOTOS_OAUTH_SCOPE, GooglePhotosSettings
from app.services.google_photos_api import GooglePhotosClient
from app.services import google_photos_token_store as token_store
from app.scripts import google_photos_oauth
from app.utils import google_photos


class FakeResponse:
    def __init__(self, payload, status_code=200, text=None):
        self._payload = payload
        self.status_code = status_code
        self.text = "payload" if text is None else text

    def json(self):
        if isinstance(self._payload, Exception):
            raise self._payload
        return self._payload


class FakeSession:
    def __init__(self, media_pages, album_pages=None):
        self.media_pages = list(media_pages)
        self.album_pages = list(album_pages or [])
        self.media_call_count = 0
        self.album_call_count = 0
        self.token_call_count = 0
        self.media_requests = []
        self.album_requests = []

    def post(self, url, json=None, headers=None, data=None, timeout=None):
        if json is None:
            self.token_call_count += 1
            return FakeResponse({"access_token": "token", "expires_in": 3600})

        self.media_requests.append(dict(json) if json is not None else {})
        if self.media_call_count >= len(self.media_pages):
            pytest.fail("Unexpected extra mediaItems.search call")
        payload = self.media_pages[self.media_call_count]
        self.media_call_count += 1
        if isinstance(payload, FakeResponse):
            return payload
        return FakeResponse(payload)

    def get(self, url, params=None, headers=None, timeout=None):
        self.album_requests.append(dict(params) if params is not None else {})
        if self.album_call_count >= len(self.album_pages):
            pytest.fail("Unexpected extra list call")
        payload = self.album_pages[self.album_call_count]
        self.album_call_count += 1
        if isinstance(payload, FakeResponse):
            return payload
        return FakeResponse(payload)


@pytest.fixture
def token_store_path(tmp_path, monkeypatch):
    path = tmp_path / "tokens.json"
    monkeypatch.setenv("GOOGLE_PHOTOS_TOKEN_STORE_PATH", str(path))
    return path


@pytest.fixture
def app_with_oauth(monkeypatch, token_store_path):
    monkeypatch.setenv("FLASK_SECRET_KEY", "test-secret")
    monkeypatch.setenv("GOOGLE_PHOTOS_CLIENT_ID", "client-id")
    monkeypatch.setenv("GOOGLE_PHOTOS_CLIENT_SECRET", "client-secret")

    app = create_app()
    app.config.update(TESTING=True, SERVER_NAME="localhost")
    return app


def test_google_photos_client_paginates_until_token_exhausted(token_store_path):
    pages = [
        {"mediaItems": [{"id": "1"}], "nextPageToken": "next"},
        {"mediaItems": [{"id": "2"}, {"id": "3"}]},
    ]
    session = FakeSession(pages)
    settings = GooglePhotosSettings(
        client_id="id", client_secret="secret", refresh_token="refresh", shared_album_id="album"
    )
    client = GooglePhotosClient(settings, session=session, clock=lambda: 0)

    items = client.list_media_items("album")

    assert [item["id"] for item in items] == ["1", "2", "3"]
    assert session.media_call_count == 2
    assert session.token_call_count == 1


def test_google_photos_client_retries_without_page_size_on_400(token_store_path):
    error_payload = {"error": {"message": "Page size must be less than or equal to 50."}}
    pages = [
        FakeResponse(error_payload, status_code=400, text=json.dumps(error_payload)),
        {"mediaItems": [{"id": "1"}]},
    ]
    session = FakeSession(pages)
    settings = GooglePhotosSettings(
        client_id="id", client_secret="secret", refresh_token="refresh", shared_album_id="album"
    )
    client = GooglePhotosClient(settings, session=session, clock=lambda: 0)

    items = client.list_media_items("album")

    assert [item["id"] for item in items] == ["1"]
    assert session.media_call_count == 2
    assert session.media_requests[0].get("pageSize") == 50
    assert "pageSize" not in session.media_requests[1]


def test_fetch_album_images_uses_cache(monkeypatch):
    google_photos._CACHE.clear()
    google_photos._ALBUM_CACHE = None

    calls = {"count": 0}

    def list_media_items(_album_id):
        calls["count"] += 1
        return [
            {"mimeType": "image/jpeg", "baseUrl": "https://example.com/photo"},
        ]

    client = SimpleNamespace(
        settings=SimpleNamespace(shared_album_id="album"),
        list_media_items=list_media_items,
    )

    monkeypatch.setattr(google_photos, "get_google_photos_client", lambda: client)

    first = google_photos.fetch_album_images("https://photos.app.goo.gl/demo")
    second = google_photos.fetch_album_images("https://photos.app.goo.gl/demo")

    assert first == ["https://example.com/photo=w2048"]
    assert second == first
    assert calls["count"] == 1


def test_fetch_album_images_filters_avatars(monkeypatch):
    google_photos._CACHE.clear()
    google_photos._ALBUM_CACHE = None

    items = [
        {"mimeType": "image/jpeg", "baseUrl": "https://example.com/avatar", "filename": "avatar.jpg"},
        {"mimeType": "image/png", "baseUrl": "https://example.com/keep", "filename": "holiday.png"},
        {"mimeType": "video/mp4", "baseUrl": "https://example.com/video"},
    ]

    client = SimpleNamespace(
        settings=SimpleNamespace(shared_album_id="album"),
        list_media_items=lambda _album_id: items,
    )
    monkeypatch.setattr(google_photos, "get_google_photos_client", lambda: client)

    results = google_photos.fetch_album_images("https://photos.app.goo.gl/demo")

    assert results == ["https://example.com/keep=w2048"]


def test_fetch_album_images_by_album_id(monkeypatch):
    google_photos._CACHE.clear()
    google_photos._ALBUM_CACHE = None

    client = SimpleNamespace(
        settings=SimpleNamespace(shared_album_id="album"),
        list_media_items=lambda album_id: [
            {"mimeType": "image/jpeg", "baseUrl": "https://example.com/album"},
        ],
    )
    monkeypatch.setattr(google_photos, "get_google_photos_client", lambda: client)

    results = google_photos.fetch_album_images(album_id="custom-id")

    assert results == ["https://example.com/album=w2048"]
    assert "id:custom-id" in google_photos._CACHE


def test_list_google_photos_albums_sorts_and_deduplicates(monkeypatch):
    google_photos._ALBUM_CACHE = None

    albums = [
        {
            "id": "2",
            "title": "Weekend Road Trip",
            "mediaItemsCount": "5",
            "productUrl": "https://photos.example/albums/2",
        },
        {
            "id": "1",
            "title": "Beach Day",
            "coverPhotoBaseUrl": "https://photos.example/cover",
            "productUrl": "https://photos.example/albums/1",
        },
        {
            "id": "1",
            "title": "Duplicate",
            "productUrl": "https://photos.example/albums/1b",
        },
    ]

    client = SimpleNamespace(list_albums=lambda: albums)
    monkeypatch.setattr(google_photos, "get_google_photos_client", lambda: client)

    result = google_photos.list_google_photos_albums(force_refresh=True)

    assert [album["id"] for album in result] == ["1", "2"]
    assert result[0]["title"] == "Beach Day"
    assert result[0]["cover_photo_url"] == "https://photos.example/cover=w2048"


def test_google_photos_client_album_listing_retries_without_page_size(token_store_path):
    error_payload = {"error": {"message": "Page size must be less than or equal to 50."}}
    album_pages = [
        FakeResponse(error_payload, status_code=400, text=json.dumps(error_payload)),
        {"albums": [{"id": "1", "title": "Album"}]},
        {"sharedAlbums": []},
    ]
    session = FakeSession([], album_pages=album_pages)
    settings = GooglePhotosSettings(
        client_id="id", client_secret="secret", refresh_token="refresh", shared_album_id="album"
    )
    client = GooglePhotosClient(settings, session=session, clock=lambda: 0)

    albums = client.list_albums()

    assert [album.get("id") for album in albums] == ["1"]
    assert session.album_call_count == 3
    assert session.album_requests[0].get("pageSize") == 50
    assert "pageSize" not in session.album_requests[1]


def test_oauth_helper_builds_expected_authorization_url():
    config = google_photos_oauth.OAuthClientConfig(
        client_id="client",
        client_secret="secret",
        redirect_port=9999,
    )

    url = google_photos_oauth._build_auth_url(config, scope="scope", state="state123")
    parsed = urlparse(url)
    params = parse_qs(parsed.query)

    assert params["client_id"] == ["client"]
    assert params["redirect_uri"] == [config.redirect_uri]
    assert params["scope"] == ["scope"]
    assert params["state"] == ["state123"]


def test_oauth_helper_finds_free_port():
    port = google_photos_oauth._find_free_port(9876)
    assert isinstance(port, int)
    assert 0 < port < 65536


def test_google_photos_oauth_start_sets_state_and_redirects(app_with_oauth):
    client = app_with_oauth.test_client()

    response = client.get("/auth/google/start")

    assert response.status_code == 302
    assert "accounts.google.com" in response.headers["Location"]

    parsed = urlparse(response.headers["Location"])
    params = parse_qs(parsed.query)
    assert params["response_type"] == ["code"]
    assert params["scope"] == [DEFAULT_GOOGLE_PHOTOS_OAUTH_SCOPE]

    with client.session_transaction() as flask_session:
        assert routes._OAUTH_STATE_SESSION_KEY in flask_session
        assert flask_session[routes._OAUTH_STATE_SESSION_KEY]


def test_google_photos_oauth_callback_persists_tokens(monkeypatch, app_with_oauth, token_store_path):
    class TokenResponse:
        status_code = 200
        text = "{}"

        def json(self):
            return {"refresh_token": "refresh-token", "access_token": "access-token"}

    monkeypatch.setattr(routes.requests, "post", lambda url, data, timeout: TokenResponse())
    resets = {"count": 0}

    def fake_reset():
        resets["count"] += 1

    monkeypatch.setattr(routes, "reset_google_photos_client", fake_reset)

    client = app_with_oauth.test_client()
    with client.session_transaction() as flask_session:
        flask_session[routes._OAUTH_STATE_SESSION_KEY] = "state-123"

    response = client.get(
        "/auth/google/callback",
        query_string={"state": "state-123", "code": "auth-code"},
    )

    assert response.status_code == 200
    assert b"WanderLog saved your Google Photos credentials" in response.data
    assert str(token_store_path).encode("utf-8") in response.data
    stored = json.loads(token_store_path.read_text())
    assert stored["refresh_token"] == "refresh-token"
    assert stored["access_token"] == "access-token"
    assert resets["count"] == 1


def test_google_photos_oauth_callback_rejects_invalid_state(app_with_oauth):
    client = app_with_oauth.test_client()

    response = client.get(
        "/auth/google/callback",
        query_string={"state": "unexpected", "code": "ignored"},
    )

    assert response.status_code == 400


def test_google_photos_logout_clears_token_store_and_env(monkeypatch, app_with_oauth, token_store_path):
    token_store.save_tokens(refresh_token="stored-refresh", access_token="stored-access", expires_in=3600)
    monkeypatch.setenv("GOOGLE_PHOTOS_REFRESH_TOKEN", "env-refresh")

    client = app_with_oauth.test_client()
    response = client.post("/auth/google/logout")

    assert response.status_code == 200
    payload = response.get_json()
    assert payload["status"] == "success"
    assert payload["tokens_removed"] is True
    assert not token_store_path.exists()
    assert "GOOGLE_PHOTOS_REFRESH_TOKEN" not in os.environ


def test_google_photos_token_status_reports_validity(app_with_oauth, token_store_path):
    now = time.time()
    token_store.save_tokens(
        refresh_token="stored-refresh",
        access_token="stored-access",
        expires_in=3600,
        clock=lambda: now,
    )

    client = app_with_oauth.test_client()
    response = client.get("/api/google_photos/token_status")

    assert response.status_code == 200
    payload = response.get_json()
    assert payload["status"] == "ok"
    assert payload["connected"] is True
    assert payload["refresh_token_present"] is True
    assert payload["access_token_present"] is True
    assert payload["access_token_valid"] is True
    assert payload["access_token_expires_at"] >= now


def test_token_store_persists_refresh_token(token_store_path):
    payload = token_store.save_tokens(
        refresh_token="stored-refresh",
        access_token="stored-access",
        expires_in=3600,
        clock=lambda: 1000,
    )

    assert payload["refresh_token"] == "stored-refresh"
    on_disk = json.loads(token_store_path.read_text())
    assert on_disk["refresh_token"] == "stored-refresh"
    assert on_disk["access_token"] == "stored-access"
    assert on_disk["expires_at"] == 4600


def test_token_store_falls_back_to_writable_directory(monkeypatch, tmp_path):
    locked = tmp_path / "locked"
    fallback = tmp_path / "fallback"

    monkeypatch.delenv("GOOGLE_PHOTOS_TOKEN_STORE_PATH", raising=False)
    monkeypatch.setattr(token_store, "_candidate_directories", lambda: [locked, fallback])

    original_access = token_store.os.access

    def fake_access(path, mode):
        candidate = Path(path)
        if candidate == locked:
            return False
        if candidate == fallback:
            return True
        return original_access(path, mode)

    monkeypatch.setattr(token_store.os, "access", fake_access)

    payload = token_store.save_tokens(refresh_token="fallback-token")

    assert payload["refresh_token"] == "fallback-token"
    stored_path = fallback / "google_photos_tokens.json"
    assert stored_path.exists()


def test_token_store_raises_helpful_error_for_unwritable_override(monkeypatch, tmp_path):
    override = tmp_path / "tokens.json"
    monkeypatch.setenv("GOOGLE_PHOTOS_TOKEN_STORE_PATH", str(override))

    original_open = token_store.Path.open

    def fake_open(self, *args, **kwargs):
        if self == override:
            raise PermissionError("denied")
        return original_open(self, *args, **kwargs)

    monkeypatch.setattr(token_store.Path, "open", fake_open)

    with pytest.raises(RuntimeError) as exc:
        token_store.save_tokens(refresh_token="value")

    assert "GOOGLE_PHOTOS_TOKEN_STORE_PATH" in str(exc.value)


def test_load_google_photos_settings_uses_saved_refresh_token(monkeypatch, token_store_path):
    token_store.save_tokens(refresh_token="persisted", access_token="ignored")
    monkeypatch.setenv("GOOGLE_PHOTOS_CLIENT_ID", "client-id")
    monkeypatch.setenv("GOOGLE_PHOTOS_CLIENT_SECRET", "client-secret")
    monkeypatch.delenv("GOOGLE_PHOTOS_REFRESH_TOKEN", raising=False)

    settings = routes.load_google_photos_settings()

    assert settings.refresh_token == "persisted"
