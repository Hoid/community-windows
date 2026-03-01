# Community Window Stage 1

This repository contains a stage-1 prototype split into two projects:

- `window-file`: Python/FastAPI service (with `uv`) that serves the canonical `/.well-known/community-window` JSON and a local admin UI.
- `window-ui`: Separate JavaScript storefront SPA that fetches and renders a Community Window endpoint.

## Run window-file

```bash
cd window-file
uv sync
uv run python scripts/validate_schema.py
uv run uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

Then open:

- `http://127.0.0.1:8000/.well-known/community-window`
- `http://127.0.0.1:8000/admin`

## Build admin UI (compiled into window-file static assets)

```bash
cd window-file/admin-ui
npm install
npm run smoke
```

## Run storefront window-ui

```bash
cd window-ui
npm install
cp .env.example .env
npm run dev
```

The storefront defaults to `/.well-known/community-window`. Set `VITE_WINDOW_ENDPOINT` in `.env` to point at another instance.

## Tests

```bash
cd window-file
uv run pytest -q
```

Frontend smoke checks:

```bash
cd window-file/admin-ui && npm run smoke
cd window-ui && npm run smoke
```
