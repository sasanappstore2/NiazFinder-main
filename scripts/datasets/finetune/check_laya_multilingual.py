#!/usr/bin/env python3
"""Offline compatibility preflight for the one approved Laya checkpoint.

This verifies the cached base weights against the installed Laya API. It does
not download data, call a remote service, write a checkpoint, or train a model.
"""

from __future__ import annotations

import argparse
import gc
import hashlib
import json
import os
import sys
from pathlib import Path
from typing import Any


MODEL_ID = "convaiinnovations/laya-multilingual"
MODEL_REVISION = "e4e9ddf21a7b1903b7acffd8814ad4307bf63a67"
MODEL_WEIGHT_SHA256 = "9d628fd971b700382ac6f65920a86f149777b2e748e0c955fb3b19695aa8f204"
MODEL_PARAMETER_COUNT = 321_908_995
ENCODER_ID = "jhu-clsp/mmBERT-base"


def default_model_dir() -> Path:
    return (
        Path.home()
        / ".cache/huggingface/hub/models--convaiinnovations--laya-multilingual"
        / "snapshots"
        / MODEL_REVISION
    )


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for block in iter(lambda: stream.read(8 * 1024 * 1024), b""):
            digest.update(block)
    return digest.hexdigest()


def require_checkpoint(model_dir: Path) -> dict[str, Any]:
    model_dir = model_dir.expanduser().resolve(strict=True)
    required = (
        model_dir / "model.safetensors",
        model_dir / "rl_agent_config.json",
        model_dir / "encoder/config.json",
        model_dir / "tokenizer/tokenizer.json",
    )
    missing = [str(path) for path in required if not path.is_file()]
    if missing:
        raise RuntimeError("The local checkpoint is incomplete.")

    config = json.loads((model_dir / "rl_agent_config.json").read_text(encoding="utf-8"))
    if config.get("encoder") != ENCODER_ID:
        raise RuntimeError("The local checkpoint does not use the approved multilingual encoder.")

    actual_hash = sha256_file(model_dir / "model.safetensors")
    if actual_hash != MODEL_WEIGHT_SHA256:
        raise RuntimeError("The local weights do not match the pinned approved checkpoint revision.")
    return {"path": model_dir, "config": config, "weights_sha256": actual_hash}


def smoke_questions() -> dict[str, dict[str, Any]]:
    return {
        "property_kind": {
            "type": "choice",
            "instructions": "نوع ملکی را که در متن نیاز آمده انتخاب کن؛ اگر روشن نیست unknown.",
            "criteria": {
                "apartment": "آپارتمان یا واحد مسکونی",
                "shop": "مغازه یا واحد تجاری",
                "office": "دفتر کار یا فضای اداری",
                "unknown": "متن برای تشخیص نوع ملک کافی نیست؛ حدس نزن.",
            },
        },
        "transaction_type": {
            "type": "choice",
            "instructions": "نوع معاملهٔ درخواستی را از متن نیاز انتخاب کن؛ اگر ذکر نشده unknown.",
            "criteria": {
                "buy": "خرید یا فروش ملک برای خریدار",
                "rent": "اجارهٔ ماهانه",
                "rent_rahn": "رهن و اجاره",
                "unknown": "نوع معامله ذکر نشده یا مبهم است.",
            },
        },
    }


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--model-dir",
        type=Path,
        default=default_model_dir(),
        help="Path to the locally cached exact checkpoint snapshot (no download is attempted).",
    )
    parser.add_argument(
        "--skip-inference",
        action="store_true",
        help="Verify checkpoint compatibility only; skip the small local smoke prediction.",
    )
    args = parser.parse_args()

    if sys.version_info < (3, 10):
        raise RuntimeError("Laya requires Python 3.10 or newer.")

    os.environ["HF_HUB_OFFLINE"] = "1"
    os.environ["TRANSFORMERS_OFFLINE"] = "1"

    import torch
    from laya import load
    from laya.common import build_model
    from safetensors.torch import load_file

    checkpoint = require_checkpoint(args.model_dir)
    model_dir: Path = checkpoint["path"]
    config = dict(checkpoint["config"])
    model = build_model(config, encoder_dir=str(model_dir / "encoder"))
    state_dict = load_file(str(model_dir / "model.safetensors"), device="cpu")
    model.load_state_dict(state_dict, strict=True)
    parameter_count = sum(parameter.numel() for parameter in model.parameters())
    if parameter_count != MODEL_PARAMETER_COUNT:
        raise RuntimeError("The model parameter count does not match the pinned checkpoint.")

    result: dict[str, Any] = {
        "model": MODEL_ID,
        "revision": MODEL_REVISION,
        "weights_sha256": checkpoint["weights_sha256"],
        "strict_state_dict": True,
        "state_dict_tensors": len(state_dict),
        "parameters": parameter_count,
        "laya_version": __import__("laya").__version__,
        "torch_version": torch.__version__,
        "device": "cpu",
        "remote_access": False,
        "training_performed": False,
        "checkpoint_written": False,
    }

    del model, state_dict
    gc.collect()

    if not args.skip_inference:
        agent = load(str(model_dir), device="cpu")
        prediction = agent.predict(
            {"need_text": "یک آپارتمان حدود ۱۳۵ متر برای خرید می‌خواهم."},
            smoke_questions(),
            lang="fa",
            max_len=512,
        )
        answers = prediction.get("answers")
        if not isinstance(answers, dict) or set(answers) != {"property_kind", "transaction_type"}:
            raise RuntimeError("The local smoke prediction did not return the expected typed answers.")
        result["smoke_inference"] = "passed"
        result["answer_keys"] = sorted(answers)

    print(json.dumps(result, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
