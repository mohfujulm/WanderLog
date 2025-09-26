from types import SimpleNamespace
from urllib.parse import parse_qs, urlparse

import pytest

import app.routes as routes
from app import create_app
from app.config import GooglePhotosSettings
from app.services.google_photos_api import GooglePhotosClient
from app.scripts import google_photos_oauth
from app.utils import google_photos


class FakeResponse:
    def __init__(self, payload, status_code=200):
        self._payload = payload
        self.status_code = status_code
        self.text = "payload"

    def json(self):
        if isinstance(self._payload, Exception):
            raise self._payload
        return self._payload


class FakeSession:
    def __init__(self, media_pages):
        self.media_pages = list(media_pages)
        self.media_call_count = 0
        self.token_call_count = 0

    def post(self, url, json=None, headers=None, data=None, timeout=None):
        if json is None:
            self.token_call_count += 1
            return FakeResponse({"access_token": "token", "expires_in": 3600})

        if self.media_call_count >= len(self.media_pages):
            pytest.fail("Unexpected extra mediaItems.search call")
        payload = self.media_pages[self.media_call_count]
        self.media_call_count += 1
        return FakeResponse(payload)


@pytest.fixture
def app_with_oauth(monkeypatch):
    monkeypatch.setenv("FLASK_SECRET_KEY", "test-secret")
    monkeypatch.setenv("GOOGLE_PHOTOS_CLIENT_ID", "client-id")
    monkeypatch.setenv("GOOGLE_PHOTOS_CLIENT_SECRET", "client-secret")

    app = create_app()
    app.config.update(TESTING=True, SERVER_NAME="localhost")
    return app


def test_google_photos_client_paginates_until_token_exhausted():
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


def test_fetch_album_images_uses_cache(monkeypatch):
    google_photos._CACHE.clear()

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

    with client.session_transaction() as flask_session:
        assert routes._OAUTH_STATE_SESSION_KEY in flask_session
        assert flask_session[routes._OAUTH_STATE_SESSION_KEY]


def test_google_photos_oauth_callback_exposes_tokens(monkeypatch, app_with_oauth):
    class TokenResponse:
        status_code = 200
        text = "{}"

        def json(self):
            return {"refresh_token": "refresh-token", "access_token": "access-token"}

    monkeypatch.setattr(routes.requests, "post", lambda url, data, timeout: TokenResponse())

    client = app_with_oauth.test_client()
    with client.session_transaction() as flask_session:
        flask_session[routes._OAUTH_STATE_SESSION_KEY] = "state-123"

    response = client.get(
        "/auth/google/callback",
        query_string={"state": "state-123", "code": "auth-code"},
    )

    assert response.status_code == 200
    assert b"Refresh token" in response.data
    assert b"refresh-token" in response.data


def test_google_photos_oauth_callback_rejects_invalid_state(app_with_oauth):
    client = app_with_oauth.test_client()

    response = client.get(
        "/auth/google/callback",
        query_string={"state": "unexpected", "code": "ignored"},
    )

    assert response.status_code == 400
