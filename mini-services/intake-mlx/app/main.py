from __future__ import annotations

import json

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from app.config import HOST, MODEL_ID, PORT
from app.infer import parse_text
from app.model_loader import get_model_state
from app.train_job import get_train_status, start_train_async

app = FastAPI(title="NiazFinder Intake MLX", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_methods=["*"],
    allow_headers=["*"],
)


class ParseRequest(BaseModel):
    text: str = Field(..., min_length=2, max_length=2000)


class ParseResponse(BaseModel):
    labels: dict
    raw: str
    modelId: str


@app.get("/")
def root():
    state = get_model_state()
    return {
        "service": "NiazFinder Intake MLX",
        "status": "running",
        "modelReady": state.load_error is None and state.model is not None,
        "endpoints": {
            "health": "GET /health",
            "parse": "POST /v1/parse",
            "docs": "GET /docs",
        },
        "note": "این سرویس API است؛ صفحهٔ سفید در / طبیعی بود — از /health یا /docs استفاده کنید.",
    }


@app.get("/health")
def health():
    state = get_model_state()
    return {
        "ok": state.load_error is None and state.model is not None,
        "modelId": MODEL_ID,
        "adapterPath": state.adapter_path,
        "loadError": state.load_error,
    }


@app.post("/v1/parse", response_model=ParseResponse)
def v1_parse(body: ParseRequest):
    try:
        labels, raw = parse_text(body.text)
        return ParseResponse(labels=labels, raw=raw, modelId=MODEL_ID)
    except json.JSONDecodeError as e:
        raise HTTPException(status_code=422, detail=f"Invalid JSON from model: {e}") from e
    except Exception as e:
        raise HTTPException(status_code=503, detail=str(e)) from e


@app.post("/train")
def train():
    return start_train_async()


@app.get("/train/status")
def train_status():
    return get_train_status()


def run():
    import uvicorn

    uvicorn.run("app.main:app", host=HOST, port=PORT, reload=False)


if __name__ == "__main__":
    run()
