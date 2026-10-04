#!/usr/bin/env python3
"""Head-only fine-tuning of `laya-multilingual` on the Persian buyer corpus.

The exact multilingual encoder and tokenizer are frozen; only Laya's typed
decision head, question-type embedding and scorer are trained. Labels come
from deterministic Persian templates written for NiazFinder `/post` — never
from Laya's own predictions and never claimed to be observed user ground
truth. The exported adapter is a local research artifact for controlled
evaluation against the untouched base checkpoint.

Training fields match the `/api/post/natural-analyze` question factory:
`category_candidate`, `property_kind`, `transaction_type`.
"""

from __future__ import annotations

import argparse
import collections
import hashlib
import importlib.util
import json
import math
import os
import random
import time
from pathlib import Path
from typing import Any, Iterable

HELPER_PATH = Path(__file__).with_name("train-divar-laya-head.py")
SPEC = importlib.util.spec_from_file_location("fa_buyer_laya_base", HELPER_PATH)
if SPEC is None or SPEC.loader is None:
    raise RuntimeError("Cannot load the pinned Laya head-trainer helpers.")
BASE = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(BASE)

TRAIN_FIELDS = tuple(BASE.TRAIN_FIELDS)
MODEL_ID = "convaiinnovations/laya-multilingual"
MODEL_REVISION = "e4e9ddf21a7b1903b7acffd8814ad4307bf63a67"
MODEL_WEIGHT_SHA256 = "9d628fd971b700382ac6f65920a86f149777b2e748e0c955fb3b19695aa8f204"
DATA_TASK = "niazfinder-fa-buyer-laya-proposal/v1"
DATA_VERSION = 1
DATASET_TAG = "niazfinder-fa-buyer-synthetic/v1"
SOURCE_DATASET = "niazfinder-fa-buyer-persian-templates"
LABEL_SOURCE = "deterministic_fa_template_from_catalog_label"


def read_jsonl(path: Path) -> list[dict[str, Any]]:
    return BASE.read_jsonl(path)


def validate_corpus(rows: list[dict[str, Any]], contract: dict[str, Any]) -> dict[str, Any]:
    choices: dict[str, list[str]] = {}
    for field in TRAIN_FIELDS:
        if field not in contract:
            raise ValueError(f"The question contract lacks {field}.")
        question = BASE.laya_question(contract[field])
        if question["t"] != "choice" or not isinstance(question["crit"], dict):
            raise ValueError(f"{field} must be a typed choice question.")
        choices[field] = list(question["crit"].keys())

    source_groups: set[str] = set()
    state_groups: set[str] = set()
    split_counts: collections.Counter[str] = collections.Counter()
    target_counts = {field: collections.Counter() for field in TRAIN_FIELDS}
    categories: collections.Counter[str] = collections.Counter()

    for row_number, row in enumerate(rows, 1):
        hypothesis = row.get("hypotheticalNeed")
        source = row.get("source")
        if (
            row.get("taskType") != DATA_TASK
            or row.get("schemaVersion") != DATA_VERSION
            or row.get("synthetic") is not True
            or row.get("derivedFromSupplyListing") is not False
            or row.get("realNeedGroundTruth") is not False
            or row.get("trainingEligible") is not False
            or row.get("datasetTag") != DATASET_TAG
            or not isinstance(row.get("state"), str)
            or not row["state"].strip()
            or len(row["state"]) > 1_000
            or row.get("stateTruncated") is not False
            or not isinstance(hypothesis, dict)
            or hypothesis.get("realNeedGroundTruth") is not False
            or hypothesis.get("trainingEligible") is not False
            or hypothesis.get("taskType") != DATA_TASK
            or hypothesis.get("schemaVersion") != DATA_VERSION
            or hypothesis.get("generation", {}).get("method")
            != "deterministic-counterfactual-template"
            or not isinstance(source, dict)
            or source.get("dataset") != SOURCE_DATASET
        ):
            raise ValueError(f"Row {row_number} violates the Persian corpus contract.")

        group = source.get("splitGroup") or hypothesis.get("sourceOfferGroup")
        if not isinstance(group, str) or not group:
            raise ValueError(f"Row {row_number} has no source group.")
        if group in source_groups:
            raise ValueError(f"Row {row_number} repeats a source-text group.")
        source_groups.add(group)

        split = hypothesis.get("trainingSplit")
        if split not in {"train", "calibration", "test"}:
            raise ValueError(f"Row {row_number} has an invalid split.")
        if split != BASE.training_split_for_state(row["state"]):
            raise ValueError(f"Row {row_number} has a non-deterministic split.")
        if hypothesis.get("originalSplit") != split:
            raise ValueError(f"Row {row_number} splits disagree.")
        state_group = BASE.normalized_state_group(row["state"])
        if state_group in state_groups:
            raise ValueError(f"Row {row_number} repeats a normalized model input.")
        state_groups.add(state_group)
        split_counts[split] += 1

        targets = hypothesis.get("targetDecisions")
        if not isinstance(targets, dict):
            raise ValueError(f"Row {row_number} has no target decisions.")
        for field in TRAIN_FIELDS:
            target = targets.get(field)
            if not isinstance(target, dict):
                raise ValueError(f"Row {row_number} lacks a {field} target.")
            value = target.get("value")
            if target.get("source") != LABEL_SOURCE:
                raise ValueError(f"Row {row_number} {field} label lacks template provenance.")
            if value not in choices[field]:
                raise ValueError(f"Row {row_number} {field} value {value!r} is not a choice.")
            target_counts[field][value] += 1
        categories[targets["category_candidate"]["value"]] += 1

    if not split_counts["train"] or not split_counts["calibration"] or not split_counts["test"]:
        raise ValueError("Train, calibration, and test partitions must all contain rows.")
    for field in TRAIN_FIELDS:
        if sum(target_counts[field].values()) == 0:
            raise ValueError(f"Field {field} has no supervision.")
    return {
        "rowCount": len(rows),
        "uniqueSourceGroups": len(source_groups),
        "uniqueNormalizedStateGroups": len(state_groups),
        "rowsBySplit": dict(split_counts),
        "targetsByField": {key: dict(value) for key, value in target_counts.items()},
        "categories": dict(categories),
        "choicesByField": choices,
    }


def load_manifest(path: Path, data_path: Path) -> dict[str, Any]:
    manifest = json.loads(path.read_text(encoding="utf-8"))
    if (
        manifest.get("schemaVersion") != DATA_VERSION
        or manifest.get("taskType") != DATA_TASK
        or manifest.get("datasetTag") != DATASET_TAG
        or manifest.get("model") != MODEL_ID
        or manifest.get("outputBytes") != data_path.stat().st_size
        or manifest.get("outputSha256") != BASE.sha256_file(data_path)
    ):
        raise SystemExit("The corpus file does not match its manifest hash/bytes/tag.")
    return manifest


def resolve_device(requested: str) -> str:
    import torch

    if requested == "auto":
        if torch.backends.mps.is_available():
            return "mps"
        return "cpu"
    if requested not in {"mps", "cpu"}:
        raise SystemExit("--device must be auto, mps, or cpu.")
    if requested == "mps" and not torch.backends.mps.is_available():
        raise SystemExit("MPS requested but not available on this machine.")
    return requested


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--input", type=Path, required=True)
    parser.add_argument("--manifest", type=Path, required=True)
    parser.add_argument("--questions", type=Path, required=True)
    parser.add_argument("--model-dir", type=Path, required=True)
    parser.add_argument("--experiment-dir", type=Path, required=True)
    parser.add_argument("--device", default="auto", help="auto | mps | cpu")
    parser.add_argument("--allow-synthetic-experiment", action="store_true")
    parser.add_argument("--train-row-limit", type=int, default=0)
    parser.add_argument("--eval-row-limit", type=int, default=0)
    parser.add_argument("--epochs", type=int, default=2)
    parser.add_argument("--batch-size", type=int, default=16)
    parser.add_argument("--learning-rate", type=float, default=0.0001)
    parser.add_argument("--threads", type=int, default=8)
    parser.add_argument("--seed", type=int, default=7311020)
    parser.add_argument("--validate-only", action="store_true")
    args = parser.parse_args()

    if not args.allow_synthetic_experiment:
        raise SystemExit("Refusing to train template-labeled data without --allow-synthetic-experiment.")
    if args.epochs < 1 or args.batch_size < 1 or args.learning_rate <= 0:
        raise SystemExit("epochs, batch size, and learning rate must be positive.")
    if args.experiment_dir.exists():
        raise SystemExit("Experiment output already exists; choose a fresh directory.")

    os.environ["HF_HUB_OFFLINE"] = "1"
    os.environ["TRANSFORMERS_OFFLINE"] = "1"
    os.environ["TOKENIZERS_PARALLELISM"] = "false"

    import torch
    import torch.nn.functional as F
    from safetensors.torch import load_file
    from transformers import AutoTokenizer
    from laya.common import QTYPES, build_model, collate_items, proper_reward

    torch.set_num_threads(args.threads)
    torch.manual_seed(args.seed)
    random.seed(args.seed)

    data_path = args.input.expanduser().resolve(strict=True)
    manifest_path = args.manifest.expanduser().resolve(strict=True)
    questions_path = args.questions.expanduser().resolve(strict=True)
    model_dir = args.model_dir.expanduser().resolve(strict=True)

    corpus_manifest = load_manifest(manifest_path, data_path)
    contract = json.loads(questions_path.read_text(encoding="utf-8"))
    rows = read_jsonl(data_path)
    summary = validate_corpus(rows, contract)
    if (
        summary["rowCount"] != corpus_manifest.get("outputRows")
        or summary["uniqueNormalizedStateGroups"] != corpus_manifest.get("uniqueNormalizedStateGroups")
        or summary["rowsBySplit"] != corpus_manifest.get("trainingSplitCounts")
    ):
        raise SystemExit("Corpus counts do not match the manifest.")

    train_rows = BASE.select_rows(rows, "train", args.train_row_limit)
    calibration_rows = BASE.select_rows(rows, "calibration", args.eval_row_limit)
    test_rows = BASE.select_rows(rows, "test", args.eval_row_limit)
    if len(train_rows) < 32 or len(calibration_rows) < 16 or len(test_rows) < 16:
        raise SystemExit("Selected partitions are too small.")

    weight_path = model_dir / "model.safetensors"
    config_path = model_dir / "rl_agent_config.json"
    tokenizer_path = model_dir / "tokenizer"
    encoder_path = model_dir / "encoder"
    if not all(path.exists() for path in (weight_path, config_path, tokenizer_path, encoder_path)):
        raise SystemExit("The pinned local Laya checkpoint is incomplete; no download is attempted.")
    actual_weight_hash = BASE.sha256_file(weight_path)
    if actual_weight_hash != MODEL_WEIGHT_SHA256:
        raise SystemExit("Local weights do not match the pinned multilingual checkpoint.")

    if args.validate_only:
        print(json.dumps({
            "status": "validated_only",
            "corpus": summary,
            "selectedRows": {"train": len(train_rows), "calibration": len(calibration_rows),
                             "test": len(test_rows)},
            "model": MODEL_ID,
            "modelRevision": MODEL_REVISION,
            "baseWeightsSha256": actual_weight_hash,
            "questionSchemaSha256": BASE.sha256_json(contract),
            "trainingPerformed": False,
        }, ensure_ascii=False, indent=2))
        return 0

    device_name = resolve_device(args.device)
    args.experiment_dir.mkdir(parents=True, exist_ok=False)

    config = json.loads(config_path.read_text(encoding="utf-8"))
    tokenizer = AutoTokenizer.from_pretrained(str(tokenizer_path), local_files_only=True,
                                              trust_remote_code=False)
    model = build_model(config, encoder_dir=str(encoder_path), pretrained=False)
    model.load_state_dict(load_file(str(weight_path), device="cpu"), strict=True)
    device = torch.device(device_name)
    model.to(device)
    model.eval()
    for parameter in model.parameters():
        parameter.requires_grad_(False)
    for module in (model.head, model.type_emb, model.scorer):
        if module is not None:
            for parameter in module.parameters():
                parameter.requires_grad_(True)
    trainable = [p for p in model.parameters() if p.requires_grad]
    if not trainable:
        raise SystemExit("No decision-head parameters selected for training.")

    max_len = min(512, int(config.get("max_len", 512)))
    head_max_len = int(config.get("head_max_len", 256))
    # make_items skips targets whose provenance is not in BASE.TARGET_SOURCES;
    # re-point it at this corpus's template provenance before building items.
    BASE.TARGET_SOURCES = {field: {LABEL_SOURCE} for field in TRAIN_FIELDS}
    prepared: dict[str, list[dict[str, Any]]] = {}
    for split, split_rows in (("train", train_rows), ("calibration", calibration_rows),
                              ("test", test_rows)):
        prepared[split] = BASE.make_items(split_rows, contract, tokenizer, QTYPES,
                                          max_len, head_max_len)
        for item in prepared[split]:
            item["choices"] = list(contract[item["field"]]["criteria"].keys())
    if any(not prepared[split] for split in prepared):
        raise SystemExit("A partition has no supported decision examples.")

    label_counts: dict[str, collections.Counter[str]] = {
        field: collections.Counter(item["gold"] for item in prepared["train"]
                                   if item["field"] == field)
        for field in TRAIN_FIELDS
    }
    for item in prepared["train"]:
        count = label_counts[item["field"]][item["gold"]]
        total = sum(label_counts[item["field"]].values())
        item["loss_weight"] = min(5.0, math.sqrt(total / max(1, count)))

    pad_id = tokenizer.pad_token_id
    if pad_id is None:
        raise SystemExit("The local tokenizer has no pad token.")

    baseline_calibration = BASE.evaluate(model, prepared["calibration"], pad_id,
                                         args.batch_size, device)
    baseline_test = BASE.evaluate(model, prepared["test"], pad_id, args.batch_size, device)
    BASE.atomic_json(args.experiment_dir / "baseline-metrics.json", {
        "scope": "held-out Persian template text only",
        "calibration": baseline_calibration,
        "test": baseline_test,
    })
    print(json.dumps({
        "phase": "baseline",
        "device": device_name,
        "testAccuracy": baseline_test["overall"]["accuracy"],
        "testMeanFieldMacroF1": baseline_test["overall"]["meanFieldMacroF1"],
    }, ensure_ascii=False), flush=True)

    optimizer = torch.optim.AdamW(trainable, lr=args.learning_rate, weight_decay=0.01)
    total_steps = max(1, math.ceil(len(prepared["train"]) / args.batch_size) * args.epochs)
    start = time.monotonic()
    history: list[dict[str, Any]] = []
    baseline_scores = [baseline_calibration[field]["macroF1"] for field in TRAIN_FIELDS
                       if baseline_calibration[field]["macroF1"] is not None]
    best_score = sum(baseline_scores) / len(baseline_scores)
    best_epoch = 0

    manifest: dict[str, Any] = {
        "schemaVersion": 1,
        "status": "running",
        "experimentOnly": True,
        "productionLoadAllowed": False,
        "syntheticTrainingAuthorized": True,
        "syntheticTargetsAreRealNeedGroundTruth": False,
        "layaPredictionsUsedAsLabels": False,
        "labelProvenance": LABEL_SOURCE,
        "datasetTag": DATASET_TAG,
        "sourceDataset": SOURCE_DATASET,
        "model": MODEL_ID,
        "modelRevision": MODEL_REVISION,
        "baseWeightsSha256": actual_weight_hash,
        "architecture": "frozen exact multilingual encoder; train Laya typed decision head, "
                        "type embedding and scorer only",
        "device": device_name,
        "trainableParameters": sum(p.numel() for p in trainable),
        "trainingFields": list(TRAIN_FIELDS),
        "excludedFields": {
            "city": "deterministic catalog resolver; narrowed before Laya sees options",
            "neighborhood": "deterministic resolver plus reranked choice proposal only",
            "numeric": "deterministic parser",
        },
        "dataFile": str(data_path),
        "dataSha256": BASE.sha256_file(data_path),
        "questionsFile": str(questions_path),
        "questionSchemaSha256": BASE.sha256_json(contract),
        "trainingSplitPolicy": BASE.TRAINING_SPLIT_POLICY,
        "evaluationScope": "held-out Persian template text; not observed user-need accuracy",
        "corpusSummary": summary,
        "selectedRows": {"train": len(train_rows), "calibration": len(calibration_rows),
                         "test": len(test_rows)},
        "selectedDecisionCounts": {split: len(items) for split, items in prepared.items()},
        "optimizer": "AdamW",
        "objective": "inverse-sqrt class-weighted cross-entropy plus Laya proper_reward",
        "learningRate": args.learning_rate,
        "batchSize": args.batch_size,
        "epochsRequested": args.epochs,
        "startedAtUnix": time.time(),
    }
    BASE.atomic_json(args.experiment_dir / "manifest.json", manifest)

    try:
        for epoch in range(args.epochs):
            model.train()
            model.encoder.eval()
            model.head_checkpointing = True
            losses: list[float] = []
            batches = list(BASE.batch_iter(prepared["train"], args.batch_size, shuffle=True,
                                           seed=args.seed + epoch))
            for step, batch in enumerate(batches, 1):
                optimizer.zero_grad(set_to_none=True)
                packed = collate_items([[item] for item in batch], pad_id)
                input_ids = packed["input_ids"].to(device, non_blocking=True)
                attention_mask = packed["attention_mask"].to(device, non_blocking=True)
                marker_pos = packed["marker_pos"].to(device, non_blocking=True)
                marker_mask = packed["marker_mask"].to(device, non_blocking=True)
                qtype = packed["qtype"].to(device, non_blocking=True)
                labels = packed["label"].to(device, non_blocking=True)
                logits, _ = model(input_ids, attention_mask, marker_pos, marker_mask, qtype)
                per_item = F.cross_entropy(logits.float(), labels, reduction="none")
                probabilities = torch.softmax(logits.float(), dim=-1)
                one_hot = F.one_hot(labels, num_classes=logits.shape[-1]).to(torch.float32)
                score_reward = proper_reward(probabilities, one_hot, qtype, marker_mask)
                per_item = 0.5 * per_item - 0.5 * score_reward
                weights = torch.tensor([item["loss_weight"] for item in batch],
                                       dtype=torch.float32, device=device)
                loss = (per_item * weights).sum() / weights.sum().clamp_min(1e-6)
                loss.backward()
                torch.nn.utils.clip_grad_norm_(trainable, max_norm=1.0)
                optimizer.step()
                losses.append(float(loss.detach().item()))
                global_step = epoch * len(batches) + step
                if global_step % 100 == 0 or step == len(batches):
                    BASE.save_adapter(args.experiment_dir / "last-adapter.safetensors", model)
                    BASE.atomic_json(args.experiment_dir / "training-progress.json", {
                        "epoch": epoch + 1,
                        "step": global_step,
                        "stepsInEpoch": len(batches),
                        "meanLoss": sum(losses) / len(losses),
                        "elapsedSeconds": time.monotonic() - start,
                    })
                    print(f"epoch={epoch + 1}/{args.epochs} step={global_step}/{total_steps} "
                          f"loss={losses[-1]:.4f}", flush=True)

            calibration = BASE.evaluate(model, prepared["calibration"], pad_id,
                                        args.batch_size, device)
            values = [calibration[field]["macroF1"] for field in TRAIN_FIELDS
                      if calibration[field]["macroF1"] is not None]
            score = sum(values) / len(values)
            history.append({
                "epoch": epoch + 1,
                "meanTrainingLoss": sum(losses) / max(1, len(losses)),
                "calibrationMeanFieldMacroF1": score,
                "calibration": calibration,
            })
            if score > best_score + 1e-6:
                best_score, best_epoch = score, epoch + 1
                BASE.save_adapter(args.experiment_dir / "best-adapter.safetensors", model)
            BASE.atomic_json(args.experiment_dir / "epoch-metrics.json",
                             {"epochs": history, "bestEpoch": best_epoch})
            print(f"epoch={epoch + 1} calibration_mean_macro_f1={score:.4f}", flush=True)

        model.eval()
        best_adapter = args.experiment_dir / "best-adapter.safetensors"
        if best_adapter.exists():
            model.load_state_dict(load_file(str(best_adapter), device="cpu"), strict=False)
            model.to(device)
        best_test = BASE.evaluate(model, prepared["test"], pad_id, args.batch_size, device)
        report = {
            "templateTextOnly": True,
            "notEvidenceOfRealUserNeedAccuracy": True,
            "baseline": {"calibration": baseline_calibration, "test": baseline_test},
            "bestCalibrationCheckpointTest": best_test,
            "selectedBestEpoch": best_epoch,
            "epochs": history,
            "elapsedSeconds": time.monotonic() - start,
            "device": device_name,
        }
        BASE.atomic_json(args.experiment_dir / "evaluation.json", report)
        manifest["status"] = "complete"
        manifest["selectedBestEpoch"] = best_epoch
        manifest["completedAtUnix"] = time.time()
        manifest["result"] = "local adapter artifact; evaluate before any integration"
        BASE.atomic_json(args.experiment_dir / "manifest.json", manifest)
        print(json.dumps({
            "status": "complete",
            "experimentDir": str(args.experiment_dir),
            "device": device_name,
            "trainableParameters": manifest["trainableParameters"],
            "baselineTestAccuracy": baseline_test["overall"]["accuracy"],
            "bestAdapterTestAccuracy": best_test["overall"]["accuracy"],
            "baselineTestMeanMacroF1": baseline_test["overall"]["meanFieldMacroF1"],
            "bestAdapterTestMeanMacroF1": best_test["overall"]["meanFieldMacroF1"],
            "bestEpoch": best_epoch,
            "elapsedSeconds": report["elapsedSeconds"],
        }, ensure_ascii=False), flush=True)
    except KeyboardInterrupt:
        BASE.save_adapter(args.experiment_dir / "interrupted-adapter.safetensors", model)
        manifest["status"] = "interrupted"
        BASE.atomic_json(args.experiment_dir / "manifest.json", manifest)
        print("Training interrupted; adapter checkpoint preserved.", flush=True)
        return 130
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
