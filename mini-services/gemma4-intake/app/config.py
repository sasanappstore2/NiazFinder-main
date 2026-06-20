from __future__ import annotations

import os
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[3]
DEFAULT_MODEL_PATH = REPO_ROOT / "models" / "GEMMA" / "gemma-4-E2B_q4_0-it.gguf"

MODEL_PATH = Path(os.environ.get("MODEL_PATH", str(DEFAULT_MODEL_PATH))).resolve()
MODEL_ID = os.environ.get("NEED_INTAKE_LLM_MODEL", "gemma-4-e2b-q4_0-it")
HOST = os.environ.get("GEMMA4_HOST", "127.0.0.1")
PORT = int(os.environ.get("GEMMA4_PORT", "8100"))
DEVICE = os.environ.get("GEMMA4_DEVICE", "auto")
MAX_NEW_TOKENS_DEFAULT = int(os.environ.get("GEMMA4_MAX_NEW_TOKENS", "512"))

# llama-cpp-python settings
LLAMA_N_CTX = int(os.environ.get("LLAMA_N_CTX", "8192"))
LLAMA_N_THREADS = int(os.environ.get("LLAMA_N_THREADS", str(os.cpu_count() or 4)))
# -1 = offload all layers to GPU/Metal when available
LLAMA_N_GPU_LAYERS = int(os.environ.get("LLAMA_N_GPU_LAYERS", "-1"))

BACKEND = "llama-cpp"
