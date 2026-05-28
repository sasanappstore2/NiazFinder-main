from __future__ import annotations

import threading
from dataclasses import dataclass
from typing import Any

from app.config import ADAPTER_PATH, EAGER_LOAD, MODEL_ID

_lock = threading.Lock()
_state: ModelState | None = None


@dataclass
class ModelState:
    model: Any
    tokenizer: Any
    adapter_path: str | None
    load_error: str | None = None


def _load_model(adapter_path: str | None = None) -> ModelState:
    try:
        from mlx_lm import load

        path = adapter_path or str(ADAPTER_PATH) if ADAPTER_PATH.exists() else None
        kwargs: dict[str, Any] = {}
        if path and (ADAPTER_PATH / "adapters.safetensors").exists():
            kwargs["adapter_path"] = path

        model, tokenizer = load(MODEL_ID, **kwargs)
        return ModelState(
            model=model,
            tokenizer=tokenizer,
            adapter_path=kwargs.get("adapter_path"),
        )
    except Exception as e:
        return ModelState(
            model=None,
            tokenizer=None,
            adapter_path=None,
            load_error=str(e),
        )


def get_model_state(force_reload: bool = False) -> ModelState:
    global _state
    with _lock:
        if _state is None or force_reload:
            _state = _load_model()
        return _state


def reload_after_train() -> ModelState:
    global _state
    with _lock:
        _state = _load_model()
        return _state


if EAGER_LOAD:
    get_model_state()
