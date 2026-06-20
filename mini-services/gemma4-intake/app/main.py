from __future__ import annotations

import logging
import time
import uuid
from typing import Any

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from app.config import BACKEND, MODEL_ID, MODEL_PATH, PORT
from app.model import generate_from_messages, load_model, model_load_error, model_ready

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="NiazFinder GEMMA4 Intake", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


class ChatMessage(BaseModel):
    role: str
    content: str


class ChatCompletionRequest(BaseModel):
    model: str = Field(default=MODEL_ID)
    messages: list[ChatMessage]
    max_tokens: int = Field(default=512, ge=1, le=2048)
    temperature: float = Field(default=0.1, ge=0, le=2)
    top_p: float = Field(default=0.95, ge=0, le=1)
    stream: bool = False


@app.on_event("startup")
def startup() -> None:
    try:
        load_model()
        logger.info("GGUF model ready at %s", MODEL_PATH)
    except Exception as exc:  # noqa: BLE001
        logger.warning("Model not loaded at startup: %s", exc)


@app.get("/health")
def health() -> dict[str, Any]:
    return {
        "ok": model_ready(),
        "backend": BACKEND,
        "modelPath": str(MODEL_PATH),
        "modelId": MODEL_ID,
        "error": model_load_error(),
    }


@app.get("/v1/models")
def list_models() -> dict[str, Any]:
    return {
        "object": "list",
        "data": [{"id": MODEL_ID, "object": "model", "owned_by": "niazfinder"}],
    }


@app.post("/v1/chat/completions")
def chat_completions(body: ChatCompletionRequest) -> dict[str, Any]:
    if body.stream:
        raise HTTPException(status_code=400, detail="stream not supported")

    try:
        started = time.time()
        content = generate_from_messages(
            [m.model_dump() for m in body.messages],
            max_new_tokens=body.max_tokens,
            temperature=body.temperature,
            top_p=body.top_p,
        )
        latency_ms = int((time.time() - started) * 1000)
        completion_id = f"chatcmpl-{uuid.uuid4().hex[:24]}"
        return {
            "id": completion_id,
            "object": "chat.completion",
            "created": int(time.time()),
            "model": body.model or MODEL_ID,
            "choices": [
                {
                    "index": 0,
                    "message": {"role": "assistant", "content": content},
                    "finish_reason": "stop",
                }
            ],
            "usage": {
                "prompt_tokens": 0,
                "completion_tokens": 0,
                "total_tokens": 0,
                "latency_ms": latency_ms,
            },
        }
    except FileNotFoundError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except Exception as exc:  # noqa: BLE001
        logger.exception("chat completion failed")
        raise HTTPException(status_code=500, detail=str(exc)) from exc


class AnalyzeRequest(BaseModel):
    text: str
    city_slug: str | None = None
    city_name: str | None = None


@app.post("/analyze")
def analyze(body: AnalyzeRequest) -> dict[str, Any]:
    """Intake analyze endpoint consumed by worker-go."""
    if not body.text.strip():
        raise HTTPException(status_code=400, detail="text required")

    system = (
        "Extract structured marketplace need fields from Persian text. "
        "Respond with useful entities and a short summary."
    )
    user = body.text.strip()
    if body.city_name or body.city_slug:
        user += f"\n[city_hint name={body.city_name or ''} slug={body.city_slug or ''}]"

    try:
        started = time.time()
        content = generate_from_messages(
            [
                {"role": "system", "content": system},
                {"role": "user", "content": user},
            ],
            max_new_tokens=512,
            temperature=0.1,
            top_p=0.95,
        )
        latency_ms = int((time.time() - started) * 1000)
        return {
            "entities": {"raw": content},
            "summary": content[:500],
            "latency_ms": latency_ms,
        }
    except FileNotFoundError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except Exception as exc:  # noqa: BLE001
        logger.exception("analyze failed")
        raise HTTPException(status_code=500, detail=str(exc)) from exc


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("app.main:app", host="127.0.0.1", port=PORT, reload=False)
