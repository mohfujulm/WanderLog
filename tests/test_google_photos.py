from types import SimpleNamespace

import pytest

from app.config import GooglePhotosSettings
from app.services.google_photos_api import GooglePhotosClient
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
