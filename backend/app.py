from __future__ import annotations

import json
import os
from pathlib import Path
from typing import Any, Dict

from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from .data_processor import (
    dataset_template,
    ensure_enriched,
    parse_workbook_bytes,
)

BASE_DIR = Path(__file__).resolve().parent.parent
DATA_FILE = Path(os.getenv("DATA_FILE", BASE_DIR / "data.json"))


def load_dataset_from_disk() -> Dict[str, Any]:
    if DATA_FILE.exists():
        with DATA_FILE.open("r", encoding="utf-8") as source:
            return ensure_enriched(json.load(source))
    return dataset_template()


def persist_dataset(dataset: Dict[str, Any]) -> None:
    DATA_FILE.parent.mkdir(parents=True, exist_ok=True)
    with DATA_FILE.open("w", encoding="utf-8") as target:
        json.dump(dataset, target, indent=2)


app = FastAPI(title="Champions 11 CC API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

DATA_CACHE: Dict[str, Any] = dataset_template()


@app.on_event("startup")
def startup_event() -> None:
    global DATA_CACHE
    DATA_CACHE = load_dataset_from_disk()


@app.get("/health", tags=["system"])
def health_check() -> Dict[str, str]:
    return {"status": "ok"}


@app.get("/data", tags=["data"])
def read_dataset() -> Dict[str, Any]:
    if not DATA_CACHE:
        raise HTTPException(status_code=404, detail="Dataset not loaded.")
    return DATA_CACHE


@app.post("/upload", tags=["data"])
async def upload_workbook(file: UploadFile = File(...)) -> Dict[str, Any]:
    filename = (file.filename or "").lower()
    if not filename.endswith((".xlsx", ".xlsm", ".xltx", ".xltm")):
        raise HTTPException(status_code=400, detail="Please upload an Excel .xlsx file.")
    contents = await file.read()
    try:
        dataset = parse_workbook_bytes(contents)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    persist_dataset(dataset)
    global DATA_CACHE
    DATA_CACHE = dataset
    return {
        "message": "Dataset updated successfully.",
        "matches": len(dataset.get("matches", [])),
        "players": len(dataset.get("players", [])),
    }

# Serve the static frontend (HTML/CSS/JS) directly from the repository root
app.mount(
    "/",
    StaticFiles(directory=BASE_DIR, html=True),
    name="static",
)
