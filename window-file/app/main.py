from __future__ import annotations

import logging
from pathlib import Path

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from jsonschema import ValidationError as JsonSchemaValidationError
from pydantic import ValidationError as PydanticValidationError

from app.storage import read_window_file, safe_validate, validate_window_payload, write_window_file

APP_DIR = Path(__file__).resolve().parent
ROOT_DIR = APP_DIR.parent
ADMIN_DIR = ROOT_DIR / "static" / "admin"
ADMIN_INDEX = ADMIN_DIR / "index.html"

LOCAL_HOSTS = {"127.0.0.1", "::1", "localhost", "testclient"}
LOGGER = logging.getLogger(__name__)


app = FastAPI(title="Community Window Service", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["GET"],
    allow_headers=["*"],
)


def _raise_if_stored_document_invalid(payload: dict) -> None:
    try:
        validate_window_payload(payload)
    except PydanticValidationError:
        LOGGER.exception("Stored document failed Pydantic validation")
        raise HTTPException(
            status_code=500,
            detail={"message": "Stored document is invalid"},
        ) from None
    except JsonSchemaValidationError:
        LOGGER.exception("Stored document failed JSON schema validation")
        raise HTTPException(
            status_code=500,
            detail={"message": "Stored document is invalid"},
        ) from None


@app.middleware("http")
async def localhost_admin_guard(request: Request, call_next):
    path = request.url.path
    if path.startswith("/admin"):
        client_host = request.client.host if request.client else None
        if client_host not in LOCAL_HOSTS:
            return JSONResponse(
                status_code=403,
                content={"detail": "Admin routes are local-only in stage 1."},
            )
    return await call_next(request)


@app.get("/healthz")
def healthz() -> dict:
    return {"status": "ok"}


@app.get("/.well-known/community-window")
def get_well_known_community_window() -> JSONResponse:
    payload = read_window_file()
    _raise_if_stored_document_invalid(payload)
    return JSONResponse(content=payload, media_type="application/json")


@app.get("/admin/api/community-window")
def get_admin_community_window() -> JSONResponse:
    payload = read_window_file()
    _raise_if_stored_document_invalid(payload)
    return JSONResponse(content=payload, media_type="application/json")


@app.put("/admin/api/community-window")
def put_admin_community_window(payload: dict) -> JSONResponse:
    _, errors = safe_validate(payload)
    if errors:
        return JSONResponse(status_code=422, content={"detail": errors})
    document = write_window_file(payload)
    return JSONResponse(
        status_code=200, content=document, media_type="application/json"
    )


@app.get("/admin")
def get_admin_index() -> FileResponse:
    if not ADMIN_INDEX.exists():
        raise HTTPException(
            status_code=404, detail="Admin UI not built yet. Build admin-ui first."
        )
    return FileResponse(ADMIN_INDEX)


if ADMIN_DIR.exists():
    app.mount("/admin", StaticFiles(directory=ADMIN_DIR, html=True), name="admin")
