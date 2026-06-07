from __future__ import annotations

import json
import os
import subprocess
import sys
import threading
import time
from pathlib import Path
from typing import Literal

from app.config import (
    ADAPTER_PATH,
    DATASET_PATH,
    MODEL_ID,
    TRAIN_BATCH_SIZE,
    TRAIN_ITERS,
    TRAIN_LR,
    TRAIN_LORA_RANK,
    TRAIN_LORA_LAYERS,
    TRAIN_MAX_HOURS,
    MAX_TOKENS,
    REPO_ROOT,
)
from app.model_loader import reload_after_train

TrainStatus = Literal["idle", "running", "done", "error"]

_log: list[str] = []
_status: TrainStatus = "idle"
_error: str | None = None
_lock = threading.Lock()


def _append_log(line: str) -> None:
    msg = f"[{time.strftime('%H:%M:%S')}] {line}"
    print(msg, flush=True)
    with _lock:
        _log.append(msg)
        if len(_log) > 200:
            _log.pop(0)


def get_train_status() -> dict:
    with _lock:
        return {
            "status": _status,
            "error": _error,
            "log": list(_log[-50:]),
            "adapterPath": str(ADAPTER_PATH),
            "datasetPath": str(DATASET_PATH),
        }


def _messages_to_text(messages: list[dict]) -> str:
    parts: list[str] = []
    for m in messages:
        role = m.get("role", "user")
        content = m.get("content", "")
        parts.append(f"<|{role}|>\n{content}")
    return "\n".join(parts)


def _prepare_mlx_dataset(src: Path, dest: Path) -> None:
    """Convert chat JSONL to mlx_lm text JSONL."""
    dest.parent.mkdir(parents=True, exist_ok=True)
    lines_out: list[str] = []
    for line in src.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line:
            continue
        row = json.loads(line)
        messages = row.get("messages", [])
        text = _messages_to_text(messages)
        lines_out.append(json.dumps({"text": text}, ensure_ascii=False))
    dest.write_text("\n".join(lines_out) + "\n", encoding="utf-8")
    _append_log(f"Prepared {len(lines_out)} training rows → {dest}")

def _prepare_mlx_splits(src: Path, out_dir: Path) -> None:
    """
    mlx_lm expects `--data` as a directory with {train, valid, test}.jsonl.
    Prefer pre-built stratified splits from `npm run build:intake-dataset-10k`.
    """
    out_dir.mkdir(parents=True, exist_ok=True)
    prebuilt = REPO_ROOT / "data" / "need-intake-training" / "need-intake-mlx-splits"
    ignore_prebuilt = os.environ.get("INTAKE_MLX_IGNORE_PREBUILT", "").strip().lower() in {
        "1",
        "true",
        "yes",
    }
    if (
        not ignore_prebuilt
        and (prebuilt / "train.jsonl").is_file()
        and (prebuilt / "valid.jsonl").is_file()
    ):
        for name in ("train", "valid", "test"):
            src_split = prebuilt / f"{name}.jsonl"
            if src_split.is_file():
                dest = out_dir / f"{name}.jsonl"
                dest.write_text(src_split.read_text(encoding="utf-8"), encoding="utf-8")
                lines = len([l for l in dest.read_text(encoding="utf-8").splitlines() if l.strip()])
                _append_log(f"Using prebuilt {name} split: {lines} rows → {dest}")
        return

    rows: list[dict] = []
    for line in src.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line:
            continue
        rows.append(json.loads(line))

    n = len(rows)
    if n < 3:
        # Duplicate rows if dataset is tiny (keeps CLI happy).
        rows = rows + rows
        n = len(rows)

    # 80/10/10 split by index
    train_end = int(n * 0.8)
    valid_end = int(n * 0.9)
    train_rows = rows[:train_end]
    valid_rows = rows[train_end:valid_end]
    test_rows = rows[valid_end:]

    def write_split(name: str, split_rows: list[dict]) -> None:
        dest = out_dir / f"{name}.jsonl"
        lines_out: list[str] = []
        for row in split_rows:
            messages = row.get("messages", [])
            text = _messages_to_text(messages)
            lines_out.append(json.dumps({"text": text}, ensure_ascii=False))
        dest.write_text("\n".join(lines_out) + "\n", encoding="utf-8")
        _append_log(f"Prepared {name} rows: {len(lines_out)} → {dest}")

    write_split("train", train_rows)
    write_split("valid", valid_rows)
    write_split("test", test_rows)


def _run_train() -> None:
    global _status, _error
    try:
        if not DATASET_PATH.is_file():
            raise FileNotFoundError(
                f"Dataset not found: {DATASET_PATH}. Run: npm run export:intake-dataset"
            )

        splits_dir = REPO_ROOT / "data" / "need-intake-training" / "need-intake-mlx-splits"
        _prepare_mlx_splits(DATASET_PATH, splits_dir)

        ADAPTER_PATH.mkdir(parents=True, exist_ok=True)
        cmd = [
            sys.executable,
            "-m",
            "mlx_lm",
            "lora",
            "--model",
            MODEL_ID,
            "--train",
            "--data",
            str(splits_dir),
            "--adapter-path",
            str(ADAPTER_PATH),
            "--iters",
            str(TRAIN_ITERS),
            "--batch-size",
            str(TRAIN_BATCH_SIZE),
            "--learning-rate",
            str(TRAIN_LR),
            "--max-seq-length",
            str(MAX_TOKENS),
            "--num-layers",
            str(TRAIN_LORA_LAYERS),
            "--steps-per-report",
            "10",
            "--steps-per-eval",
            "50",
            "--grad-checkpoint",
        ]
        _append_log(f"Train budget: up to {TRAIN_MAX_HOURS}h, {TRAIN_ITERS} iters")
        _append_log("Starting: " + " ".join(cmd))
        proc = subprocess.Popen(
            cmd,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            text=True,
            cwd=str(REPO_ROOT),
        )
        assert proc.stdout is not None
        for line in proc.stdout:
            _append_log(line.rstrip())
        code = proc.wait()
        if code != 0:
            raise RuntimeError(f"mlx_lm.lora exited with code {code}")

        _append_log("Training complete. Reloading model...")
        reload_after_train()
        with _lock:
            _status = "done"
            _error = None
    except Exception as e:
        with _lock:
            _status = "error"
            _error = str(e)
        _append_log(f"ERROR: {e}")


def start_train_async() -> dict:
    global _status, _error
    with _lock:
        if _status == "running":
            return {"ok": False, "message": "Train already running", **get_train_status()}
        _status = "running"
        _error = None
        _log.clear()

    thread = threading.Thread(target=_run_train, daemon=True)
    thread.start()
    return {"ok": True, "message": "Train started", **get_train_status()}
