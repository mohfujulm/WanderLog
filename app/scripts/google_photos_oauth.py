"""Helper script to perform the Google Photos OAuth consent flow locally.

Run ``python -m app.scripts.google_photos_oauth`` and follow the prompts to
obtain a refresh token for the configured Google Cloud OAuth client.
"""

from __future__ import annotations

import argparse
import http.server
import logging
import socket
import threading
import urllib.parse
import webbrowser
from contextlib import closing
from dataclasses import dataclass
from typing import Optional

import requests

_AUTH_BASE_URL = "https://accounts.google.com/o/oauth2/v2/auth"
_DEFAULT_SCOPE = "https://www.googleapis.com/auth/photoslibrary.readonly"
_LOGGER = logging.getLogger(__name__)


@dataclass
class OAuthClientConfig:
    """OAuth client configuration used for the consent flow."""

    client_id: str
    client_secret: str
    redirect_port: int = 8765
    token_url: str = "https://oauth2.googleapis.com/token"

    @property
    def redirect_uri(self) -> str:
        return f"http://localhost:{self.redirect_port}/oauth2callback"


class _AuthorizationCodeReceiver(http.server.BaseHTTPRequestHandler):
    """Minimal HTTP handler that captures the ``code`` query parameter."""

    server_version = "GooglePhotosOAuth/1.0"
    _code: Optional[str] = None
    _event: threading.Event

    def __init__(self, *args, event: threading.Event, **kwargs):  # type: ignore[override]
        self._event = event
        super().__init__(*args, **kwargs)

    def do_GET(self):  # noqa: N802 - method name defined by BaseHTTPRequestHandler
        parsed = urllib.parse.urlparse(self.path)
        params = urllib.parse.parse_qs(parsed.query)
        code = params.get("code", [None])[0]
        if code:
            type(self)._code = code
            message = "Authentication complete. You can close this window."
        else:
            message = "Missing authorization code."
        self._event.set()
        self.send_response(200)
        self.send_header("Content-Type", "text/plain; charset=utf-8")
        self.end_headers()
        self.wfile.write(message.encode("utf-8"))

    def log_message(self, format: str, *args):  # noqa: A003 - keep signature from base class
        _LOGGER.debug("OAuth redirect received: " + format, *args)


def _find_free_port(preferred: int) -> int:
    with closing(socket.socket(socket.AF_INET, socket.SOCK_STREAM)) as sock:
        try:
            sock.bind(("", preferred))
        except OSError:
            sock.bind(("", 0))
        return sock.getsockname()[1]


def _build_auth_url(config: OAuthClientConfig, *, scope: str, state: Optional[str]) -> str:
    params = {
        "client_id": config.client_id,
        "redirect_uri": config.redirect_uri,
        "response_type": "code",
        "access_type": "offline",
        "prompt": "consent",
        "scope": scope,
    }
    if state:
        params["state"] = state
    query = urllib.parse.urlencode(params, doseq=True)
    return f"{_AUTH_BASE_URL}?{query}"


def _exchange_code_for_tokens(config: OAuthClientConfig, code: str) -> dict:
    payload = {
        "client_id": config.client_id,
        "client_secret": config.client_secret,
        "code": code,
        "grant_type": "authorization_code",
        "redirect_uri": config.redirect_uri,
    }
    response = requests.post(config.token_url, data=payload, timeout=15)
    if response.status_code >= 400:
        raise RuntimeError(
            f"Token exchange failed with status {response.status_code}: {response.text.strip()}"
        )
    data = response.json()
    if not isinstance(data, dict):
        raise RuntimeError("Unexpected response payload when exchanging authorization code")
    if "refresh_token" not in data:
        raise RuntimeError(
            "No refresh_token returned. Ensure you selected the correct project and scopes."
        )
    return data


def run_oauth_flow(config: OAuthClientConfig, *, scope: str = _DEFAULT_SCOPE) -> dict:
    """Run the OAuth flow and return the token payload."""

    port = _find_free_port(config.redirect_port)
    config.redirect_port = port

    ready = threading.Event()
    _AuthorizationCodeReceiver._code = None

    def handler_factory(*args, **kwargs):
        return _AuthorizationCodeReceiver(*args, event=ready, **kwargs)

    server = http.server.HTTPServer(("", port), handler_factory)

    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()

    auth_url = _build_auth_url(config, scope=scope, state=None)
    print("Opening browser for Google consent. If nothing happens, visit:")
    print(auth_url)
    webbrowser.open(auth_url, new=1, autoraise=True)

    print("Waiting for Google OAuth redirect...")
    ready.wait()
    server.shutdown()
    thread.join(timeout=5)

    code = _AuthorizationCodeReceiver._code
    if not code:
        raise RuntimeError("Authorization code not captured from redirect")

    tokens = _exchange_code_for_tokens(config, code)
    print("Access token:", tokens.get("access_token"))
    print("Refresh token:", tokens.get("refresh_token"))
    print("Token response:", tokens)
    return tokens


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Google Photos OAuth helper")
    parser.add_argument("--client-id", dest="client_id", default=None)
    parser.add_argument("--client-secret", dest="client_secret", default=None)
    parser.add_argument(
        "--scope",
        dest="scope",
        default=_DEFAULT_SCOPE,
        help="OAuth scope to request (default: photoslibrary.readonly)",
    )
    parser.add_argument(
        "--redirect-port",
        dest="redirect_port",
        type=int,
        default=8765,
        help="Local port used to capture the OAuth redirect",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    client_id = args.client_id or input("Google OAuth client ID: ").strip()
    client_secret = args.client_secret or input("Google OAuth client secret: ").strip()
    if not client_id or not client_secret:
        raise SystemExit("Client ID and secret are required to run the OAuth helper")

    config = OAuthClientConfig(
        client_id=client_id,
        client_secret=client_secret,
        redirect_port=args.redirect_port,
    )
    run_oauth_flow(config, scope=args.scope)


if __name__ == "__main__":
    main()
