from __future__ import annotations

import json
import re
import sys
from pathlib import Path

from app.config import SCRAPEGRAPH_ROOT


def ensure_scrapegraph_path() -> None:
    root = str(SCRAPEGRAPH_ROOT.resolve())
    if root not in sys.path:
        sys.path.insert(0, root)


def scrapegraph_llm_config() -> dict:
    """ScrapeGraphAI → Qwen 3.5-2B via intake-mlx OpenAI-compatible API."""
    from app.config import INTAKE_MLX_URL

    return {
        "llm": {
            "model": "openai/qwen3.5-2b",
            "model_provider": "openai",
            "api_key": "mlx-local",
            "base_url": f"{INTAKE_MLX_URL.rstrip('/')}/v1",
            "temperature": 0.1,
            "model_tokens": 8192,
        },
        "verbose": False,
        "headless": True,
        "timeout": 120,
    }


def search_graph_config(max_results: int = 8) -> dict:
    cfg = scrapegraph_llm_config()
    cfg["max_results"] = max_results
    return cfg


def is_persian(text: str) -> bool:
    return bool(re.search(r"[\u0600-\u06FF]", text))


def clean_text(text: str) -> str:
    text = re.sub(r"\s+", " ", text or "").strip()
    return text
