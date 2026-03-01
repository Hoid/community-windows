from __future__ import annotations

import json
import sys
from pathlib import Path

from fastapi.testclient import TestClient

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from app.main import app
from app import storage


def _write_json(path: Path, payload: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8") as handle:
        json.dump(payload, handle, ensure_ascii=True, indent=2)
        handle.write("\n")


def _sample_payload() -> dict:
    return {
        "specVersion": "0.1.0",
        "generatedAt": "2026-02-26T18:00:00Z",
        "description": "Test description",
        "contentWarnings": ["Politics"],
        "topicTags": ["tech"],
        "pinnedContent": [{"title": "Welcome", "url": "https://example.social/post/1"}],
        "membershipSizeRange": "small",
        "linkPolicy": "Federate broadly, defederate for abuse.",
        "memberFitSignals": {
            "lookingFor": ["Respectful users"],
            "notLookingFor": ["Harassment"],
        },
        "llmScrapingPolicy": {"mode": "discourage", "llmsTxtUrl": "https://example.social/llms.txt"},
    }


def _schema_payload() -> dict:
    return {
        "$schema": "https://json-schema.org/draft/2020-12/schema",
        "type": "object",
        "required": [
            "specVersion",
            "generatedAt",
            "description",
            "contentWarnings",
            "topicTags",
            "pinnedContent",
            "membershipSizeRange",
            "linkPolicy",
            "memberFitSignals",
            "llmScrapingPolicy",
        ],
        "properties": {
            "specVersion": {"type": "string", "pattern": "^0\\.1\\.0$"},
            "generatedAt": {"type": "string"},
            "description": {"type": "string", "minLength": 1},
            "contentWarnings": {"type": "array", "items": {"type": "string"}},
            "topicTags": {"type": "array", "items": {"type": "string"}},
            "pinnedContent": {"type": "array"},
            "membershipSizeRange": {"type": "string"},
            "linkPolicy": {"type": "string", "minLength": 1},
            "memberFitSignals": {"type": "object"},
            "llmScrapingPolicy": {"type": "object"},
        },
    }


def configure_tmp_storage(tmp_path: Path) -> None:
    storage.DATA_FILE = tmp_path / "data" / "community-window.json"
    storage.BACKUP_FILE = tmp_path / "data" / "community-window.backup.json"
    storage.SCHEMA_FILE = tmp_path / "schema" / "community-window.schema.json"
    _write_json(storage.SCHEMA_FILE, _schema_payload())
    _write_json(storage.DATA_FILE, _sample_payload())


def test_well_known_endpoint_content_type_and_shape(tmp_path: Path) -> None:
    configure_tmp_storage(tmp_path)
    client = TestClient(app)

    response = client.get("/.well-known/community-window")
    assert response.status_code == 200
    assert response.headers["content-type"].startswith("application/json")
    body = response.json()
    assert body["specVersion"] == "0.1.0"
    assert "description" in body


def test_valid_update_is_accepted(tmp_path: Path) -> None:
    configure_tmp_storage(tmp_path)
    client = TestClient(app)
    payload = _sample_payload()
    payload["description"] = "Updated description"

    response = client.put("/admin/api/community-window", json=payload)
    assert response.status_code == 200
    assert response.json()["description"] == "Updated description"

    with storage.DATA_FILE.open("r", encoding="utf-8") as handle:
        saved = json.load(handle)
    assert saved["description"] == "Updated description"


def test_invalid_update_is_rejected(tmp_path: Path) -> None:
    configure_tmp_storage(tmp_path)
    client = TestClient(app)
    payload = _sample_payload()
    payload["description"] = ""

    response = client.put("/admin/api/community-window", json=payload)
    assert response.status_code == 422
    detail = response.json()["detail"]
    assert isinstance(detail, list)


def test_atomic_write_creates_backup(tmp_path: Path) -> None:
    configure_tmp_storage(tmp_path)
    previous = _sample_payload()
    previous["description"] = "Before save"
    _write_json(storage.DATA_FILE, previous)
    client = TestClient(app)

    payload = _sample_payload()
    payload["description"] = "After save"
    response = client.put("/admin/api/community-window", json=payload)
    assert response.status_code == 200
    assert storage.BACKUP_FILE.exists()

    with storage.BACKUP_FILE.open("r", encoding="utf-8") as handle:
        backup = json.load(handle)
    assert backup["description"] == "Before save"
