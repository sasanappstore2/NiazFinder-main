import os
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[3]

MODEL_ID = os.getenv("INTAKE_MLX_MODEL_ID", "mlx-community/Qwen3.5-2B-bf16")
PORT = int(os.getenv("INTAKE_MLX_PORT", "8100"))
HOST = os.getenv("INTAKE_MLX_HOST", "127.0.0.1")

DATASET_PATH = Path(
    os.getenv(
        "INTAKE_MLX_DATASET_PATH",
        str(REPO_ROOT / "data" / "need-intake-training" / "need-intake-train.jsonl"),
    )
)
ADAPTER_PATH = Path(
    os.getenv("INTAKE_MLX_ADAPTER_PATH", str(REPO_ROOT / "models" / "estate-intake-lora-v1"))
)
TRAIN_ITERS = int(os.getenv("INTAKE_MLX_TRAIN_ITERS", "2500"))
TRAIN_BATCH_SIZE = int(os.getenv("INTAKE_MLX_TRAIN_BATCH_SIZE", "1"))
TRAIN_LORA_RANK = int(os.getenv("INTAKE_MLX_TRAIN_LORA_RANK", "16"))
TRAIN_LR = float(os.getenv("INTAKE_MLX_TRAIN_LR", "8e-6"))
TRAIN_MAX_HOURS = float(os.getenv("INTAKE_MLX_TRAIN_MAX_HOURS", "12"))
TRAIN_LORA_LAYERS = int(os.getenv("INTAKE_MLX_TRAIN_LORA_LAYERS", "16"))
MAX_TOKENS = int(os.getenv("INTAKE_MLX_MAX_TOKENS", "256"))
TITLE_MAX_TOKENS = int(os.getenv("INTAKE_MLX_TITLE_MAX_TOKENS", "80"))
LISTING_TITLE_MAX_LENGTH = int(os.getenv("INTAKE_MLX_TITLE_MAX_LENGTH", "70"))
TEMPERATURE = float(os.getenv("INTAKE_MLX_TEMPERATURE", "0.1"))

# Lazy load on first request (saves RAM when only training)
EAGER_LOAD = os.getenv("INTAKE_MLX_EAGER_LOAD", "false").lower() in ("1", "true", "yes")
