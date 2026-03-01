from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path

from jsonschema import ValidationError, validate
from pydantic import ValidationError as PydanticValidationError

from app.models import CommunityWindow


APP_DIR = Path(__file__).resolve().parent
ROOT_DIR = APP_DIR.parent
DATA_FILE = ROOT_DIR / "data" / "community-window.json"
BACKUP_FILE = ROOT_DIR / "data" / "community-window.backup.json"
SCHEMA_FILE = ROOT_DIR / "schema" / "community-window.schema.json"


def _load_schema() -> dict:
    with SCHEMA_FILE.open("r", encoding="utf-8") as file:
        return json.load(file)


def read_window_file() -> dict:
    with DATA_FILE.open("r", encoding="utf-8") as file:
        return json.load(file)


def validate_window_payload(payload: dict) -> CommunityWindow:
    model = CommunityWindow.model_validate(payload)
    validate(instance=model.model_dump(mode="json", exclude_none=True), schema=_load_schema())
    return model


def write_window_file(payload: dict) -> dict:
    model = validate_window_payload(payload)
    document = model.model_dump(mode="json")
    document["generatedAt"] = datetime.now(timezone.utc).isoformat()

    temp_file = DATA_FILE.with_suffix(".tmp")
    with temp_file.open("w", encoding="utf-8") as file:
        json.dump(document, file, ensure_ascii=True, indent=2)
        file.write("\n")

    if DATA_FILE.exists():
        DATA_FILE.replace(BACKUP_FILE)
    temp_file.replace(DATA_FILE)
    return document


def safe_validate(payload: dict) -> tuple[dict | None, list[dict]]:
    try:
        model = validate_window_payload(payload)
    except PydanticValidationError as error:
        return None, error.errors()
    except ValidationError as error:
        return None, [{"loc": ["jsonschema"], "msg": error.message, "type": "value_error.jsonschema"}]

    return model.model_dump(mode="json", exclude_none=True), []
