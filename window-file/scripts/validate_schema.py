from __future__ import annotations

import json
import sys
from pathlib import Path

from jsonschema import validate

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from app.models import CommunityWindow

DATA_FILE = ROOT / "data" / "community-window.json"
SCHEMA_FILE = ROOT / "schema" / "community-window.schema.json"


def main() -> None:
    with DATA_FILE.open("r", encoding="utf-8") as data_handle:
        payload = json.load(data_handle)
    with SCHEMA_FILE.open("r", encoding="utf-8") as schema_handle:
        schema = json.load(schema_handle)

    model = CommunityWindow.model_validate(payload)
    validate(instance=model.model_dump(mode="json", exclude_none=True), schema=schema)
    print("Schema validation passed.")


if __name__ == "__main__":
    main()
