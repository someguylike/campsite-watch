from __future__ import annotations

import argparse
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
import json
import os
from pathlib import Path
from secrets import compare_digest
from urllib.parse import urlparse


class ApiHandler(BaseHTTPRequestHandler):
    results_path = Path("./data/latest-results.json")
    allowed_origin = "*"
    api_token = ""

    def do_OPTIONS(self) -> None:
        if not self._origin_allowed():
            self._send_json(403, {"error": "origin_not_allowed"})
            return
        self._send_headers(204)

    def do_GET(self) -> None:
        if not self._origin_allowed():
            self._send_json(403, {"error": "origin_not_allowed"})
            return

        path = urlparse(self.path).path
        if path == "/healthz":
            self._send_json(200, {"ok": True})
            return

        if path != "/api/search":
            self._send_json(404, {"error": "not_found"})
            return

        if not self._authorized():
            self._send_json(401, {"error": "unauthorized"})
            return

        if not self.results_path.exists():
            self._send_json(503, {"error": "no_results", "detail": "latest results file does not exist"})
            return

        try:
            payload = json.loads(self.results_path.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError) as error:
            self._send_json(503, {"error": "bad_results", "detail": str(error)})
            return

        if not isinstance(payload, dict) or not isinstance(payload.get("results"), list):
            self._send_json(503, {"error": "bad_results", "detail": "expected object with results array"})
            return

        payload.setdefault("source", "fallback")
        self._send_json(200, payload)

    def log_message(self, format: str, *args: object) -> None:
        return

    def _send_json(self, status: int, payload: dict[str, object]) -> None:
        body = json.dumps(payload, separators=(",", ":")).encode("utf-8")
        self._send_headers(status, content_length=len(body), content_type="application/json")
        if status != 204:
            self.wfile.write(body)

    def _send_headers(
        self,
        status: int,
        *,
        content_length: int = 0,
        content_type: str = "text/plain",
    ) -> None:
        cors_origin = self._cors_origin()
        self.send_response(status)
        if cors_origin:
            self.send_header("Access-Control-Allow-Origin", cors_origin)
            self.send_header("Vary", "Origin")
        self.send_header("Access-Control-Allow-Methods", "GET, OPTIONS")
        self.send_header(
            "Access-Control-Allow-Headers",
            "Content-Type, Accept, Authorization, X-Campsite-Watch-Password, X-Campsite-Watch-Token",
        )
        self.send_header("Cache-Control", "no-store")
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(content_length))
        self.end_headers()

    def _authorized(self) -> bool:
        if not self.api_token:
            return True

        auth = self.headers.get("Authorization", "")
        prefix = "Bearer "
        bearer = auth[len(prefix) :] if auth.startswith(prefix) else ""
        header_token = self.headers.get("X-Campsite-Watch-Token", "")
        header_password = self.headers.get("X-Campsite-Watch-Password", "")
        return (
            compare_digest(bearer, self.api_token)
            or compare_digest(header_password, self.api_token)
            or compare_digest(header_token, self.api_token)
        )

    def _origin_allowed(self) -> bool:
        origin = self.headers.get("Origin")
        return not origin or self.allowed_origin == "*" or origin == self.allowed_origin

    def _cors_origin(self) -> str:
        origin = self.headers.get("Origin")
        if self.allowed_origin == "*":
            return origin if self.api_token and origin else "*"
        return origin if origin == self.allowed_origin else ""


def serve_api(host: str, port: int, results_path: Path, allowed_origin: str, api_token: str = "") -> None:
    handler = type(
        "ConfiguredApiHandler",
        (ApiHandler,),
        {"results_path": results_path, "allowed_origin": allowed_origin, "api_token": api_token},
    )
    server = ThreadingHTTPServer((host, port), handler)
    print(f"Serving campsite API on http://{host}:{port} using {results_path}")
    server.serve_forever()


def main() -> None:
    parser = argparse.ArgumentParser(description="Serve Campsite Watch API results.")
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--port", default=8787, type=int)
    parser.add_argument("--results", default="./data/latest-results.json", type=Path)
    parser.add_argument("--allowed-origin", default="*")
    parser.add_argument(
        "--api-password",
        default=os.environ.get("CAMPSITE_WATCH_API_PASSWORD", os.environ.get("CAMPSITE_WATCH_API_TOKEN", "")),
    )
    parser.add_argument("--api-token", default="")
    args = parser.parse_args()
    serve_api(args.host, args.port, args.results, args.allowed_origin, args.api_password or args.api_token)


if __name__ == "__main__":
    main()
