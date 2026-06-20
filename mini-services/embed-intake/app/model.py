from __future__ import annotations

import logging
import os
from typing import Any

import httpx

from app.config import EMBED_DIMENSION, EMBED_MODEL_ID, EMBED_MODEL_PATH, LLAMA_N_THREADS, OLLAMA_URL

logger = logging.getLogger(__name__)

_llm: Any | None = None
_load_error: str | None = None
_backend: str = os.environ.get("EMBED_BACKEND", "auto").lower()


def _validate_model_path() -> None:
    if not EMBED_MODEL_PATH.is_file():
        raise FileNotFoundError(
            f"Embedding GGUF not found: {EMBED_MODEL_PATH}. "
            "Download multilingual-e5-small GGUF into models/EMBED/ or set EMBED_BACKEND=ollama."
        )


def _load_llama_cpp() -> Any:
    from llama_cpp import Llama, llama_cpp as lc

    return Llama(
        model_path=str(EMBED_MODEL_PATH.resolve()),
        embedding=True,
        pooling_type=lc.LLAMA_POOLING_TYPE_MEAN,
        n_threads=LLAMA_N_THREADS,
        verbose=False,
    )


def _probe_ollama() -> bool:
    try:
        with httpx.Client(timeout=5.0) as client:
            res = client.post(
                f"{OLLAMA_URL}/api/embed",
                json={"model": EMBED_MODEL_ID, "input": "query: ping"},
            )
            if res.status_code != 200:
                return False
            data = res.json()
            embeddings = data.get("embeddings") or []
            return bool(embeddings and len(embeddings[0]) > 0)
    except Exception:  # noqa: BLE001
        return False


def load_model() -> Any:
    global _llm, _load_error, _backend
    if _llm is not None:
        return _llm

    if _backend in ("ollama", "auto") and _probe_ollama():
        _backend = "ollama"
        _llm = "ollama"
        _load_error = None
        logger.info("Using Ollama embedding backend at %s model=%s", OLLAMA_URL, EMBED_MODEL_ID)
        return _llm

    if _backend == "ollama":
        raise RuntimeError(
            f"Ollama embedding unavailable at {OLLAMA_URL}. Run: ollama pull qllama/multilingual-e5-small"
        )

    _validate_model_path()
    try:
        _llm = _load_llama_cpp()
        _backend = "llama-cpp"
        _load_error = None
        logger.info("Embedding model loaded from %s", EMBED_MODEL_PATH)
        return _llm
    except Exception as exc:  # noqa: BLE001
        if _probe_ollama():
            _backend = "ollama"
            _llm = "ollama"
            _load_error = None
            logger.warning("GGUF load failed (%s); falling back to Ollama", exc)
            return _llm
        _load_error = str(exc)
        logger.exception("Failed to load embedding model")
        raise


def model_ready() -> bool:
    return _llm is not None


def model_load_error() -> str | None:
    return _load_error


def active_backend() -> str:
    return _backend


def _embed_via_ollama(texts: list[str]) -> list[list[float]]:
    with httpx.Client(timeout=120.0) as client:
        res = client.post(
            f"{OLLAMA_URL}/api/embed",
            json={"model": EMBED_MODEL_ID, "input": texts},
        )
        if res.status_code != 200:
            raise RuntimeError(f"Ollama embed error {res.status_code}: {res.text[:200]}")
        data = res.json()
        embeddings = data.get("embeddings") or []
        if len(embeddings) != len(texts):
            raise RuntimeError("Ollama returned invalid embedding batch")
        return [[float(x) for x in vec] for vec in embeddings]


def create_embeddings(texts: list[str]) -> list[list[float]]:
    llm = load_model()
    if _backend == "ollama":
        return _embed_via_ollama(texts)

    vectors: list[list[float]] = []
    for text in texts:
        result = llm.create_embedding(text)
        embedding = result.get("data", [{}])[0].get("embedding")
        if not embedding:
            raise RuntimeError("Empty embedding returned from model")
        if len(embedding) != EMBED_DIMENSION:
            logger.warning(
                "Embedding dimension %s != expected %s",
                len(embedding),
                EMBED_DIMENSION,
            )
        vectors.append([float(x) for x in embedding])
    return vectors
