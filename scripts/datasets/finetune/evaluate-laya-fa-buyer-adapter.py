#!/usr/bin/env python3
"""Evaluate the fa-buyer Laya head adapter on a hand-authored Persian benchmark.

Loads the pinned base checkpoint, records its predictions, then overlays the
exported ``best-adapter.safetensors`` head weights and records the second
prediction pass over the same cases. Reports per-field accuracy and macro-F1
for both models plus every case where they disagree.

Labels are hand-authored Persian expectations (category_candidate,
property_kind, transaction_type); city/neighborhood fields are out of scope
here because the production route resolves them deterministically.
"""

from __future__ import annotations

import argparse
import importlib.util
import json
import os
import sys
from pathlib import Path
from typing import Any

TRAINER_PATH = Path(__file__).with_name("train-laya-fa-buyer-head.py")
_SPEC = importlib.util.spec_from_file_location("fa_buyer_trainer", TRAINER_PATH)
if _SPEC is None or _SPEC.loader is None:
    raise RuntimeError("Cannot load the fa-buyer trainer for shared helpers.")
T = importlib.util.module_from_spec(_SPEC)
_SPEC.loader.exec_module(T)
BASE = T.BASE
TRAIN_FIELDS = T.TRAIN_FIELDS
MODEL_WEIGHT_SHA256 = T.MODEL_WEIGHT_SHA256


def read_benchmark(path: Path) -> list[dict[str, Any]]:
    raw = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(raw, list) or not raw:
        raise ValueError("The benchmark must be a non-empty JSON array.")
    rows: list[dict[str, Any]] = []
    seen: set[str] = set()
    for index, row in enumerate(raw, 1):
        if (
            not isinstance(row, dict)
            or not isinstance(row.get("id"), str)
            or not row["id"].strip()
            or not isinstance(row.get("text"), str)
            or not row["text"].strip()
            or not isinstance(row.get("expected"), dict)
        ):
            raise ValueError(f"Benchmark row {index} is malformed.")
        if row["id"] in seen:
            raise ValueError(f"Duplicate benchmark id {row['id']}.")
        seen.add(row["id"])
        rows.append(row)
    return rows


def validate_expectations(rows: list[dict[str, Any]], contract: dict[str, Any]) -> dict[str, list[str]]:
    choices: dict[str, list[str]] = {}
    for field in TRAIN_FIELDS:
        question = contract.get(field)
        if not isinstance(question, dict) or question.get("type") != "choice":
            raise ValueError(f"Question contract lacks choice field {field}.")
        choices[field] = list(question["criteria"].keys())
    for row in rows:
        for field in TRAIN_FIELDS:
            value = row["expected"].get(field)
            if value is None:
                raise ValueError(f"Benchmark row {row['id']} lacks expected {field}.")
            if value not in choices[field]:
                raise ValueError(
                    f"Benchmark row {row['id']} expected {field}={value} "
                    f"is not among contract choices."
                )
    return choices


def build_items(rows: list[dict[str, Any]], contract: dict[str, Any], tokenizer: Any,
                qtypes: dict[str, int], max_len: int, head_max_len: int) -> list[dict[str, Any]]:
    from laya.common import build_sequence, render_options

    items: list[dict[str, Any]] = []
    for row in rows:
        state = row["text"]
        state_ids = tokenizer(state.replace(tokenizer.mask_token, " "),
                              add_special_tokens=False)["input_ids"]
        for field in TRAIN_FIELDS:
            q = BASE.laya_question(contract[field])
            choices = list(q["crit"].keys())
            sequence, markers = build_sequence(
                tokenizer, state, q, max_len=max_len, head_max_len=head_max_len,
                state_ids=state_ids,
            )
            if len(markers) != len(render_options(q)):
                raise ValueError(f"Choice options exceed Laya head budget for {field}.")
            items.append({
                "ids": sequence,
                "markers": markers,
                "qtype": qtypes[q["t"]],
                "label": choices.index(row["expected"][field]),
                "field": field,
                "gold": row["expected"][field],
                "choices": choices,
                "id": row["id"],
            })
    return items


def predict(model: Any, items: list[dict[str, Any]], pad_id: int, batch_size: int,
            device: Any) -> tuple[dict[tuple[str, str], tuple[str, float]],
                                   dict[str, list[tuple[str, str, float]]]]:
    import torch
    from laya.common import collate_items

    predictions: dict[tuple[str, str], tuple[str, float]] = {}
    observations: dict[str, list[tuple[str, str, float]]] = {}
    model.eval()
    with torch.inference_mode():
        for batch in BASE.batch_iter(items, batch_size, shuffle=False, seed=0):
            packed = collate_items([[item] for item in batch], pad_id)
            input_ids = packed["input_ids"].to(device)
            attention_mask = packed["attention_mask"].to(device)
            marker_pos = packed["marker_pos"].to(device)
            marker_mask = packed["marker_mask"].to(device)
            qtype = packed["qtype"].to(device)
            logits, _ = model(input_ids, attention_mask, marker_pos, marker_mask, qtype)
            probabilities = torch.softmax(logits.float(), dim=-1).cpu()
            for index, item in enumerate(batch):
                option_count = len(item["markers"])
                predicted_index = int(probabilities[index, :option_count].argmax().item())
                predicted = item["choices"][predicted_index]
                confidence = float(probabilities[index, predicted_index].item())
                predictions[(item["id"], item["field"])] = (predicted, confidence)
                observations.setdefault(item["field"], []).append(
                    (item["gold"], predicted, confidence)
                )
    return predictions, observations


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--benchmark", type=Path, required=True)
    parser.add_argument("--questions", type=Path, required=True)
    parser.add_argument("--model-dir", type=Path, required=True)
    parser.add_argument("--adapter", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--device", default="auto", help="auto | mps | cpu")
    parser.add_argument("--batch-size", type=int, default=16)
    args = parser.parse_args()

    os.environ["HF_HUB_OFFLINE"] = "1"
    os.environ["TRANSFORMERS_OFFLINE"] = "1"
    os.environ["TOKENIZERS_PARALLELISM"] = "false"

    import torch
    from safetensors.torch import load_file
    from transformers import AutoTokenizer
    from laya.common import QTYPES, build_model

    benchmark_path = args.benchmark.expanduser().resolve(strict=True)
    questions_path = args.questions.expanduser().resolve(strict=True)
    model_dir = args.model_dir.expanduser().resolve(strict=True)
    adapter_path = args.adapter.expanduser().resolve(strict=True)
    if not args.output.name.endswith(".json"):
        raise SystemExit("--output must be a .json path.")

    rows = read_benchmark(benchmark_path)
    contract = json.loads(questions_path.read_text(encoding="utf-8"))
    validate_expectations(rows, contract)

    weight_path = model_dir / "model.safetensors"
    config_path = model_dir / "rl_agent_config.json"
    if BASE.sha256_file(weight_path) != MODEL_WEIGHT_SHA256:
        raise SystemExit("Local weights do not match the pinned multilingual checkpoint.")

    device_name = T.resolve_device(args.device)
    device = torch.device(device_name)

    config = json.loads(config_path.read_text(encoding="utf-8"))
    tokenizer = AutoTokenizer.from_pretrained(str(model_dir / "tokenizer"),
                                              local_files_only=True,
                                              trust_remote_code=False)
    model = build_model(config, encoder_dir=str(model_dir / "encoder"), pretrained=False)
    model.load_state_dict(load_file(str(weight_path), device="cpu"), strict=True)
    model.to(device)
    model.eval()

    max_len = min(512, int(config.get("max_len", 512)))
    head_max_len = int(config.get("head_max_len", 256))
    items = build_items(rows, contract, tokenizer, QTYPES, max_len, head_max_len)
    pad_id = tokenizer.pad_token_id if tokenizer.pad_token_id is not None else 0

    base_predictions, base_observations = predict(model, items, pad_id, args.batch_size, device)
    adapter_state = load_file(str(adapter_path), device="cpu")
    missing = model.load_state_dict(adapter_state, strict=False)
    unexpected = list(getattr(missing, "unexpected_keys", []))
    if unexpected:
        raise SystemExit(f"Adapter contains unexpected tensors: {unexpected}")
    adapter_predictions, adapter_observations = predict(
        model, items, pad_id, args.batch_size, device
    )

    base_report = BASE.field_metrics(base_observations)
    adapter_report = BASE.field_metrics(adapter_observations)

    disagreements: list[dict[str, Any]] = []
    adapter_wins = base_wins = 0
    for row in rows:
        for field in TRAIN_FIELDS:
            base_pred, base_conf = base_predictions[(row["id"], field)]
            adapter_pred, adapter_conf = adapter_predictions[(row["id"], field)]
            if base_pred == adapter_pred:
                continue
            gold = row["expected"][field]
            entry = {
                "id": row["id"],
                "field": field,
                "text": row["text"],
                "gold": gold,
                "base": {"prediction": base_pred, "confidence": round(base_conf, 4)},
                "adapter": {"prediction": adapter_pred, "confidence": round(adapter_conf, 4)},
            }
            if adapter_pred == gold and base_pred != gold:
                entry["verdict"] = "adapter_fixed"
                adapter_wins += 1
            elif base_pred == gold and adapter_pred != gold:
                entry["verdict"] = "adapter_broke"
                base_wins += 1
            else:
                entry["verdict"] = "both_wrong"
            disagreements.append(entry)

    report = {
        "benchmark": {
            "path": str(benchmark_path),
            "cases": len(rows),
            "decisionsPerModel": len(items),
            "questionSchemaSha256": BASE.sha256_json(contract),
        },
        "model": {
            "id": T.MODEL_ID,
            "revision": T.MODEL_REVISION,
            "baseWeightsSha256": MODEL_WEIGHT_SHA256,
            "adapter": str(adapter_path),
        },
        "device": device_name,
        "base": base_report,
        "adapter": adapter_report,
        "delta": {
            **{
                field: {
                    "accuracy": round((adapter_report[field]["accuracy"] or 0)
                                      - (base_report[field]["accuracy"] or 0), 4),
                    "macroF1": round((adapter_report[field]["macroF1"] or 0)
                                     - (base_report[field]["macroF1"] or 0), 4),
                }
                for field in TRAIN_FIELDS
            },
            "overall": {
                "accuracy": round((adapter_report["overall"]["accuracy"] or 0)
                                  - (base_report["overall"]["accuracy"] or 0), 4),
                "meanFieldMacroF1": round(
                    (adapter_report["overall"]["meanFieldMacroF1"] or 0)
                    - (base_report["overall"]["meanFieldMacroF1"] or 0), 4),
            },
        },
        "disagreements": {
            "total": len(disagreements),
            "adapterFixed": adapter_wins,
            "adapterBroke": base_wins,
            "bothWrong": sum(1 for d in disagreements if d["verdict"] == "both_wrong"),
            "cases": disagreements,
        },
    }
    BASE.atomic_json(args.output, report)

    summary = {
        "status": "complete",
        "cases": len(rows),
        "baseOverallAccuracy": base_report["overall"]["accuracy"],
        "adapterOverallAccuracy": adapter_report["overall"]["accuracy"],
        "baseMeanMacroF1": base_report["overall"]["meanFieldMacroF1"],
        "adapterMeanMacroF1": adapter_report["overall"]["meanFieldMacroF1"],
        "adapterFixed": adapter_wins,
        "adapterBroke": base_wins,
        "output": str(args.output),
    }
    print(json.dumps(summary, ensure_ascii=False, indent=2), flush=True)
    return 0


if __name__ == "__main__":
    sys.exit(main())
