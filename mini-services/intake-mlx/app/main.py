from __future__ import annotations

import json

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from app.config import HOST, MODEL_ID, PORT
from app.infer import chat_completion, generate_listing_copy, generate_title, parse_text
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


class TitleContext(BaseModel):
    needType: str = ""
    intentType: str = ""
    categoryPathFa: str = ""
    city: str | None = None
    neighborhood: str | None = None
    dealTypeFa: str | None = None
    propertyKind: str | None = None
    rooms: str | None = None
    productName: str | None = None
    serviceType: str | None = None
    jobTitle: str | None = None
    budgetHint: str | None = None
    sourceSummary: str = ""


class TitleRequest(BaseModel):
    context: TitleContext
    fallbackTitle: str | None = None


class TitleResponse(BaseModel):
    title: str
    raw: str
    modelId: str


class ListingCopyRequest(BaseModel):
    systemPrompt: str | None = None
    userPrompt: str | None = None
    context: dict | None = None


class ListingCopyResponse(BaseModel):
    title: str
    description: str
    raw: str
    modelId: str


class ChatMessage(BaseModel):
    role: str
    content: str


class ChatCompletionRequest(BaseModel):
    model: str = "qwen3.5-2b"
    messages: list[ChatMessage]
    max_tokens: int = Field(default=512, ge=16, le=2048)
    temperature: float = Field(default=0.1, ge=0, le=2)


class ChatCompletionChoice(BaseModel):
    index: int = 0
    message: ChatMessage
    finish_reason: str = "stop"


class ChatCompletionResponse(BaseModel):
    id: str = "chatcmpl-local"
    object: str = "chat.completion"
    model: str
    choices: list[ChatCompletionChoice]


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
            "title": "POST /v1/title",
            "listingCopy": "POST /v1/listing-copy",
            "chatCompletions": "POST /v1/chat/completions",
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


@app.post("/v1/title", response_model=TitleResponse)
def v1_title(body: TitleRequest):
    try:
        ctx = body.context.model_dump(exclude_none=True)
        title, raw = generate_title(ctx)
        return TitleResponse(title=title, raw=raw, modelId=MODEL_ID)
    except Exception as e:
        raise HTTPException(status_code=503, detail=str(e)) from e


@app.post("/v1/listing-copy", response_model=ListingCopyResponse)
def v1_listing_copy(body: ListingCopyRequest):
    try:
        title, description, raw = generate_listing_copy(
            system_prompt=body.systemPrompt,
            user_prompt=body.userPrompt,
            context=body.context,
        )
        return ListingCopyResponse(title=title, description=description, raw=raw, modelId=MODEL_ID)
    except Exception as e:
        raise HTTPException(status_code=503, detail=str(e)) from e


@app.post("/v1/chat/completions", response_model=ChatCompletionResponse)
def v1_chat_completions(body: ChatCompletionRequest):
    """OpenAI-compatible chat for ScrapeGraphAI / estate-scrape (Qwen 3.5-2B)."""
    try:
        raw = chat_completion(
            [m.model_dump() for m in body.messages],
            max_tokens=body.max_tokens,
        )
        return ChatCompletionResponse(
            model=MODEL_ID,
            choices=[
                ChatCompletionChoice(
                    message=ChatMessage(role="assistant", content=raw),
                )
            ],
        )
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
