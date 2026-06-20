from __future__ import annotations

import logging
import time
import uuid
from typing import Any

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from app.config import BACKEND, EMBED_DIMENSION, EMBED_MODEL_ID, EMBED_MODEL_PATH, PORT
from app.model import active_backend, create_embeddings, load_model, model_load_error, model_ready

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="NiazFinder Embed Intake", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


class EmbeddingRequest(BaseModel):
    model: str = Field(default=EMBED_MODEL_ID)
    input: str | list[str]
    encoding_format: str = Field(default="float")


@app.on_event("startup")
def startup() -> None:
    try:
        load_model()
        logger.info("Embedding model ready at %s", EMBED_MODEL_PATH)
    except Exception as exc:  # noqa: BLE001
        logger.warning("Embedding model not loaded at startup: %s", exc)


@app.get("/health")
def health() -> dict[str, Any]:
    return {
        "ok": model_ready(),
        "backend": active_backend() or BACKEND,
        "modelPath": str(EMBED_MODEL_PATH),
        "modelId": EMBED_MODEL_ID,
        "dimension": EMBED_DIMENSION,
        "error": model_load_error(),
    }


@app.get("/v1/models")
def list_models() -> dict[str, Any]:
    return {
        "object": "list",
        "data": [{"id": EMBED_MODEL_ID, "object": "model", "owned_by": "niazfinder"}],
    }


@app.post("/v1/embeddings")
def embeddings(body: EmbeddingRequest) -> dict[str, Any]:
    texts = [body.input] if isinstance(body.input, str) else body.input
    if not texts or not any(t.strip() for t in texts):
        raise HTTPException(status_code=400, detail="input required")

    try:
        started = time.time()
        vectors = create_embeddings(texts)
        latency_ms = int((time.time() - started) * 1000)
        data = [
            {
                "object": "embedding",
                "index": i,
                "embedding": vec,
            }
            for i, vec in enumerate(vectors)
        ]
        return {
            "object": "list",
            "model": body.model or EMBED_MODEL_ID,
            "data": data,
            "usage": {"prompt_tokens": 0, "total_tokens": 0, "latency_ms": latency_ms},
        }
    except FileNotFoundError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except Exception as exc:  # noqa: BLE001
        logger.exception("embedding failed")
        raise HTTPException(status_code=500, detail=str(exc)) from exc


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("app.main:app", host="127.0.0.1", port=PORT, reload=False)
