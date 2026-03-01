RUN := uv run

.PHONY: build dev serve test validate-schema

build:
	uv sync --dev
	npm --prefix ./admin-ui ci
	npm --prefix ./admin-ui run build

dev:
	$(RUN) uvicorn app.main:app --reload --host 127.0.0.1 --port 8000

serve:
	$(RUN) uvicorn app.main:app --host 127.0.0.1 --port 8000

test:
	$(RUN) pytest -q

validate-schema:
	$(RUN) python scripts/validate_schema.py
