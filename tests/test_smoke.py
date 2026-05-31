from __future__ import annotations

import importlib
import sys
from pathlib import Path


def _load_app(monkeypatch):
    monkeypatch.setenv("FLASK_SECRET_KEY", "test-flask-secret-key")
    monkeypatch.setenv("JWT_SECRET", "test-jwt-secret-key")
    monkeypatch.setenv("DATABASE_URL", "sqlite:///test.db")

    root_dir = Path(__file__).resolve().parents[1]
    api_dir = root_dir / "api"
    for path in (str(api_dir), str(root_dir)):
        if path not in sys.path:
            sys.path.insert(0, path)

    module = importlib.import_module("api.index")
    return module.app


def test_health_endpoint(monkeypatch):
    app = _load_app(monkeypatch)
    client = app.test_client()

    response = client.get("/api/data")

    assert response.status_code == 200
    payload = response.get_json()
    assert payload["status"] == "ok"


def test_root_endpoint(monkeypatch):
    app = _load_app(monkeypatch)
    client = app.test_client()

    response = client.get("/")

    assert response.status_code == 200
    assert response.mimetype == "text/html"
    assert b"EduGuard MDM" in response.data


def test_static_asset_served(monkeypatch):
    app = _load_app(monkeypatch)
    client = app.test_client()

    response = client.get("/assets/css/shared.css")

    assert response.status_code == 200
    assert response.mimetype == "text/css"
    assert b":root" in response.data


def test_sample_data_endpoint(monkeypatch):
    app = _load_app(monkeypatch)
    client = app.test_client()

    response = client.get("/api/sample-data")

    assert response.status_code == 200
    payload = response.get_json()
    assert payload["total"] == 3
    assert payload["timestamp"] == "2024-01-01T00:00:00Z"
    assert len(payload["data"]) == 3
    assert payload["data"][0]["name"] == "Sample Item 1"


def test_preflight_response(monkeypatch):
    app = _load_app(monkeypatch)
    client = app.test_client()

    response = client.options(
        "/api/data",
        headers={
            "Origin": "http://localhost:5173",
            "Access-Control-Request-Method": "GET",
        },
    )

    assert response.status_code in {200, 204}
    assert response.headers["Access-Control-Allow-Origin"] == "http://localhost:5173"


def test_boots_without_backend_env_vars(monkeypatch):
    monkeypatch.delenv("FLASK_SECRET_KEY", raising=False)
    monkeypatch.delenv("JWT_SECRET", raising=False)
    monkeypatch.delenv("DATABASE_URL", raising=False)

    app = _load_app(monkeypatch)
    client = app.test_client()

    response = client.get("/")

    assert response.status_code == 200
    assert response.mimetype == "text/html"