from __future__ import annotations

import os
from pathlib import Path

EMBED_MODEL_PATH = Path(
    os.environ.get(
        "EMBED_MODEL_PATH",
        "../../models/EMBED/multilingual-e5-small-q8_0.gguf",
    )
)
EMBED_MODEL_ID = os.environ.get("EMBED_MODEL_ID", "qllama/multilingual-e5-small:latest")
EMBED_DEVICE = os.environ.get("EMBED_DEVICE", "auto").lower()
LLAMA_N_THREADS = int(os.environ.get("LLAMA_N_THREADS", "4"))
PORT = int(os.environ.get("EMBED_PORT", "8101"))
EMBED_DIMENSION = int(os.environ.get("EMBED_DIMENSION", "384"))
OLLAMA_URL = os.environ.get("OLLAMA_URL", "http://127.0.0.1:11434").rstrip("/")
EMBED_BACKEND = os.environ.get("EMBED_BACKEND", "auto")

BACKEND = "embed-intake"
