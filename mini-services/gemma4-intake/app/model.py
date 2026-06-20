from __future__ import annotations

import logging
import platform
from typing import Any

from app.config import DEVICE, LLAMA_N_CTX, LLAMA_N_GPU_LAYERS, LLAMA_N_THREADS, MODEL_PATH

logger = logging.getLogger(__name__)

_llm: Any | None = None
_load_error: str | None = None


def _resolve_gpu_layers() -> int:
    if LLAMA_N_GPU_LAYERS >= 0:
        return LLAMA_N_GPU_LAYERS
    if DEVICE == "cpu":
        return 0
    if DEVICE in ("cuda", "mps", "auto"):
        return LLAMA_N_GPU_LAYERS
    return 0


def _validate_model_path() -> None:
    if not MODEL_PATH.is_file():
        raise FileNotFoundError(
            f"GGUF model file not found: {MODEL_PATH}. "
            "Place gemma-4-E2B_q4_0-it.gguf under models/GEMMA/ or set MODEL_PATH."
        )
    if MODEL_PATH.suffix.lower() != ".gguf":
        raise FileNotFoundError(f"MODEL_PATH must point to a .gguf file, got: {MODEL_PATH}")


def load_model() -> Any:
    global _llm, _load_error
    if _llm is not None:
        return _llm

    _validate_model_path()

    try:
        from llama_cpp import Llama
    except ImportError as exc:
        _load_error = (
            "llama-cpp-python is not installed. "
            "Run: pip install llama-cpp-python "
            "(on macOS: CMAKE_ARGS='-DGGML_METAL=on' pip install llama-cpp-python)"
        )
        raise RuntimeError(_load_error) from exc

    n_gpu_layers = _resolve_gpu_layers()
    logger.info(
        "Loading GGUF from %s (n_ctx=%s, n_gpu_layers=%s, n_threads=%s, device=%s, platform=%s)",
        MODEL_PATH,
        LLAMA_N_CTX,
        n_gpu_layers,
        LLAMA_N_THREADS,
        DEVICE,
        platform.system(),
    )

    try:
        _llm = Llama(
            model_path=str(MODEL_PATH),
            n_ctx=LLAMA_N_CTX,
            n_threads=LLAMA_N_THREADS,
            n_gpu_layers=n_gpu_layers,
            verbose=False,
        )
        _load_error = None
        return _llm
    except Exception as exc:  # noqa: BLE001
        _load_error = str(exc)
        logger.exception("Failed to load GGUF model")
        raise


def model_ready() -> bool:
    return _llm is not None


def model_load_error() -> str | None:
    if _llm is not None:
        return None
    if _load_error:
        return _load_error
    if not MODEL_PATH.is_file():
        return f"GGUF model file not found: {MODEL_PATH}"
    return None


def generate_from_messages(
    messages: list[dict[str, str]],
    *,
    max_new_tokens: int = 512,
    temperature: float = 0.1,
    top_p: float = 0.95,
) -> str:
    llm = load_model()

    chat_messages = [{"role": m["role"], "content": m["content"]} for m in messages]

    result = llm.create_chat_completion(
        messages=chat_messages,
        max_tokens=max_new_tokens,
        temperature=max(temperature, 0.0),
        top_p=top_p,
        stream=False,
    )

    choice = result.get("choices", [{}])[0]
    message = choice.get("message") or {}
    content = message.get("content") or choice.get("text") or ""
    return str(content).strip()
