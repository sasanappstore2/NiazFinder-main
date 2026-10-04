#!/usr/bin/env python3
"""Memory-bounded, research-only Laya typed-head training on Divar-derived text.

The multilingual encoder stays frozen; only Laya's typed-decision head,
question-type embedding and scorer are trained. Exact normalized model inputs
must be unique and deterministically assigned to one split. This is not real-user
need ground truth and the adapter is never authorized for production loading.
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
from typing import Any, Iterable, Iterator


BASE_PATH = Path(__file__).with_name("train-divar-laya-head.py")
SPEC = importlib.util.spec_from_file_location("divar_laya_head_base", BASE_PATH)
if SPEC is None or SPEC.loader is None:
    raise RuntimeError("Cannot load the pinned Laya trainer helpers.")
BASE = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(BASE)

TRAIN_FIELDS = tuple(BASE.TRAIN_FIELDS)
TARGET_SOURCES = BASE.TARGET_SOURCES
TRAINING_SPLIT_POLICY = BASE.TRAINING_SPLIT_POLICY
normalize_model_input = BASE.normalize_model_input
normalized_state_group = BASE.normalized_state_group
training_split_for_state = BASE.training_split_for_state


def iter_jsonl(path: Path) -> Iterator[dict[str, Any]]:
    with path.open(encoding="utf-8") as stream:
        for line_number, line in enumerate(stream, 1):
            if not line.strip():
                continue
            try:
                row = json.loads(line)
            except json.JSONDecodeError as exc:
                raise ValueError(f"Invalid JSON on line {line_number}.") from exc
            if not isinstance(row, dict):
                raise ValueError(f"Expected an object on line {line_number}.")
            yield row


def source_group(row: dict[str, Any]) -> str:
    source = row.get("source") or {}
    group = source.get("splitGroup") or row.get("hypotheticalNeed", {}).get("sourceOfferGroup")
    if not isinstance(group, str) or not group:
        raise ValueError("A synthetic training row lacks its source-text group.")
    return group


def validate_corpus(path: Path, question_contract: dict[str, Any], question_hash: str,
                    data_task: str = BASE.DATA_TASK) -> dict[str, Any]:
    version_by_task = {task: version for version, task in BASE.DATA_TASKS.items()}
    version = version_by_task.get(data_task)
    if version is None:
        raise ValueError("The corpus task version is not supported by this trainer.")
    missing = [field for field in TRAIN_FIELDS if field not in question_contract]
    if missing:
        raise ValueError(f"The pinned question contract lacks fields: {missing}.")
    choices: dict[str, list[str]] = {}
    for field in TRAIN_FIELDS:
        question = BASE.laya_question(question_contract[field])
        if question["t"] != "choice" or not isinstance(question["crit"], dict):
            raise ValueError(f"{field} must be a typed choice question.")
        choices[field] = list(question["crit"].keys())

    group_splits: dict[str, str] = {}
    state_splits: dict[str, str] = {}
    row_counts: collections.Counter[str] = collections.Counter()
    source_split_counts: collections.Counter[str] = collections.Counter()
    targets_by_field = {field: collections.Counter() for field in TRAIN_FIELDS}
    train_targets_by_field = {field: collections.Counter() for field in TRAIN_FIELDS}
    categories: collections.Counter[str] = collections.Counter()
    eligible_rows = 0
    for row_number, row in enumerate(iter_jsonl(path), 1):
        hypothetical = row.get("hypotheticalNeed")
        source = row.get("source")
        if (
            row.get("taskType") != data_task
            or row.get("synthetic") is not True
            or row.get("derivedFromSupplyListing") is not True
            or row.get("realNeedGroundTruth") is not False
            or row.get("trainingEligible") is not False
            or not isinstance(row.get("state"), str)
            or not row["state"].strip()
            or len(row["state"]) > 1_000
            or row.get("stateTruncated") is not False
            or not isinstance(hypothetical, dict)
            or hypothetical.get("realNeedGroundTruth") is not False
            or hypothetical.get("trainingEligible") is not False
            or hypothetical.get("questionSchemaSha256") != question_hash
            or hypothetical.get("generation", {}).get("method") != "deterministic-counterfactual-template"
            or row.get("schemaVersion") != version
            or hypothetical.get("schemaVersion") != version
            or hypothetical.get("generation", {}).get("version") != version
            or not isinstance(source, dict)
            or source.get("dataset") != "divarofficial/real_estate_ads"
        ):
            raise ValueError(f"Row {row_number} does not satisfy the pinned synthetic-only corpus contract.")
        source_split = hypothetical.get("originalSplit")
        split = hypothetical.get("trainingSplit")
        group = source_group(row)
        if source_split not in {"train", "calibration", "test"}:
            raise ValueError(f"Row {row_number} has an invalid source-group split.")
        if split not in {"train", "calibration", "test"}:
            raise ValueError(f"Row {row_number} has no corrected model-input split.")
        prior_source_split = group_splits.get(group)
        if prior_source_split is not None:
            if prior_source_split != source_split:
                raise ValueError("A normalized source-text group crosses source partitions.")
            raise ValueError("The finalized corpus repeats a normalized source-text group.")
        group_splits[group] = source_split
        normalized_group = normalized_state_group(row["state"])
        expected_split = training_split_for_state(row["state"])
        if split != expected_split:
            raise ValueError("A generated model-input row has a non-deterministic training split.")
        if normalized_group in state_splits:
            raise ValueError("The finalized corpus repeats a normalized generated model-input state.")
        state_splits[normalized_group] = split
        row_counts[split] += 1
        source_split_counts[source_split] += 1

        targets = hypothetical.get("targetDecisions")
        if not isinstance(targets, dict):
            raise ValueError(f"Row {row_number} has no target decisions.")
        has_target = False
        for field in TRAIN_FIELDS:
            target = targets.get(field)
            if not isinstance(target, dict):
                continue
            value, provenance = target.get("value"), target.get("source")
            if value is None or provenance not in TARGET_SOURCES[field]:
                continue
            if value not in choices[field]:
                raise ValueError(f"Unsupported target for {field} on row {row_number}.")
            targets_by_field[field][value] += 1
            if split == "train":
                train_targets_by_field[field][value] += 1
            has_target = True
        category = targets.get("category_candidate", {}).get("value")
        if isinstance(category, str):
            categories[category] += 1
        eligible_rows += int(has_target)

    for split in ("train", "calibration", "test"):
        if not row_counts[split]:
            raise ValueError(f"The {split} partition is empty.")
    for field in TRAIN_FIELDS:
        if not targets_by_field[field]:
            raise ValueError(f"No source-derived labels are available for {field}.")
    return {
        "rowCount": sum(row_counts[split] for split in ("train", "calibration", "test")),
        "eligibleRows": eligible_rows,
        "uniqueSourceGroups": len(group_splits),
        "uniqueNormalizedStateGroups": len(state_splits),
        "rowsBySplit": {split: row_counts[split] for split in ("train", "calibration", "test")},
        "sourceRowsByOriginalSplit": {split: source_split_counts[split] for split in ("train", "calibration", "test")},
        "targetsByField": {field: dict(values) for field, values in targets_by_field.items()},
        "trainingTargetsByField": {field: dict(values) for field, values in train_targets_by_field.items()},
        "categories": dict(categories),
        "choicesByField": choices,
    }


def select_rows(path: Path, split: str, limit: int) -> list[dict[str, Any]]:
    """Select a deterministic, approximately uniform sample from one split."""
    import heapq

    if limit < 1:
        raise ValueError("Evaluation sampling limit must be positive.")
    heap: list[tuple[int, int, dict[str, Any]]] = []
    serial = 0
    for row in iter_jsonl(path):
        hypothetical = row["hypotheticalNeed"]
        if hypothetical["trainingSplit"] != split:
            continue
        group = source_group(row)
        score = int(hashlib.sha256(f"{group}:{row['exampleId']}".encode()).hexdigest(), 16)
        entry = (-score, serial, row)
        serial += 1
        if len(heap) < limit:
            heapq.heappush(heap, entry)
        elif score < -heap[0][0]:
            heapq.heapreplace(heap, entry)
    selected = [entry[2] for entry in heap]
    selected.sort(key=lambda row: hashlib.sha256(
        f"{source_group(row)}:{row['exampleId']}".encode()
    ).digest())
    return selected


def selected_ids(rows: list[dict[str, Any]]) -> set[str]:
    return {str(row["exampleId"]) for row in rows}


def resolve_device(torch_module: Any, requested: str) -> Any:
    """Prefer Apple MPS when requested/available; never silently fake a GPU run."""
    if requested not in {"auto", "cpu", "mps"}:
        raise ValueError("Device must be auto, cpu, or mps.")
    mps_available = bool(
        torch_module.backends.mps.is_built()
        and torch_module.backends.mps.is_available()
    )
    if requested == "mps" and not mps_available:
        raise RuntimeError("MPS was requested but is unavailable in this Python runtime.")
    selected = "mps" if requested == "mps" or (requested == "auto" and mps_available) else "cpu"
    return torch_module.device(selected)


def make_row_items(row: dict[str, Any], contract: dict[str, Any], tokenizer: Any,
                   qtypes: dict[str, int], max_len: int, head_max_len: int) -> list[dict[str, Any]]:
    # Reuse the already-audited Laya serialization and typed-choice builder.
    items = BASE.make_items([row], contract, tokenizer, qtypes, max_len, head_max_len)
    for item in items:
        item["choices"] = list(contract[item["field"]]["criteria"].keys())
    return items


def decision_stream(path: Path, split: str, contract: dict[str, Any], tokenizer: Any,
                    qtypes: dict[str, int], max_len: int, head_max_len: int,
                    allow_ids: set[str] | None = None,
                    loss_counts: dict[str, collections.Counter[str]] | None = None) -> Iterator[dict[str, Any]]:
    totals = {field: sum((loss_counts or {}).get(field, {}).values()) for field in TRAIN_FIELDS}
    for row in iter_jsonl(path):
        if row["hypotheticalNeed"]["trainingSplit"] != split:
            continue
        if allow_ids is not None and str(row["exampleId"]) not in allow_ids:
            continue
        for item in make_row_items(row, contract, tokenizer, qtypes, max_len, head_max_len):
            field = item["field"]
            count = (loss_counts or {}).get(field, {}).get(item["gold"], 1)
            item["loss_weight"] = min(5.0, math.sqrt(totals[field] / max(1, count))) if totals[field] else 1.0
            yield item


def batch_iter(items: Iterable[dict[str, Any]], batch_size: int, shuffle: bool,
               seed: int, shuffle_buffer: int) -> Iterator[list[dict[str, Any]]]:
    rng = random.Random(seed)
    buffer: list[dict[str, Any]] = []
    batch: list[dict[str, Any]] = []
    for item in items:
        if shuffle and len(buffer) < shuffle_buffer:
            buffer.append(item)
            continue
        if shuffle:
            index = rng.randrange(len(buffer))
            chosen, buffer[index] = buffer[index], item
        else:
            chosen = item
        batch.append(chosen)
        if len(batch) == batch_size:
            yield batch
            batch = []
    if shuffle:
        rng.shuffle(buffer)
        for item in buffer:
            batch.append(item)
            if len(batch) == batch_size:
                yield batch
                batch = []
    if batch:
        yield batch


def summarize_confusions(confusions: dict[str, dict[str, collections.Counter[str]]]) -> dict[str, Any]:
    report: dict[str, Any] = {}
    all_correct = all_count = 0
    macro_values: list[float] = []
    for field in TRAIN_FIELDS:
        matrix = confusions.get(field, {})
        count = sum(sum(row.values()) for row in matrix.values())
        if count == 0:
            report[field] = {"count": 0, "accuracy": None, "macroF1": None}
            continue
        labels = sorted(set(matrix) | {pred for row in matrix.values() for pred in row})
        classes: dict[str, Any] = {}
        f1_values: list[float] = []
        correct = sum(matrix.get(label, {}).get(label, 0) for label in labels)
        unknown_support = sum(matrix.get("unknown", {}).values())
        unknown_false_positive = sum(
            value for gold, row in matrix.items() if gold == "unknown"
            for predicted, value in row.items() if predicted != "unknown"
        )
        unknown_abstentions = sum(
            value for gold, row in matrix.items() if gold != "unknown"
            for predicted, value in row.items() if predicted == "unknown"
        )
        non_unknown_support = sum(sum(row.values()) for gold, row in matrix.items() if gold != "unknown")
        for label in labels:
            tp = matrix.get(label, {}).get(label, 0)
            fp = sum(row.get(label, 0) for gold, row in matrix.items() if gold != label)
            fn = sum(value for predicted, value in matrix.get(label, {}).items() if predicted != label)
            f1 = (2 * tp / (2 * tp + fp + fn)) if 2 * tp + fp + fn else 0.0
            f1_values.append(f1)
            classes[label] = {
                "support": sum(matrix.get(label, {}).values()),
                "precision": tp / (tp + fp) if tp + fp else 0.0,
                "recall": tp / (tp + fn) if tp + fn else 0.0,
                "f1": f1,
            }
        macro = sum(f1_values) / len(f1_values) if f1_values else 0.0
        accuracy = correct / count
        report[field] = {
            "count": count,
            "accuracy": accuracy,
            "macroF1": macro,
            "unknownRecall": matrix.get("unknown", {}).get("unknown", 0) / unknown_support if unknown_support else None,
            "unknownFalsePositiveRate": unknown_false_positive / unknown_support if unknown_support else None,
            "unknownAbstentionRate": unknown_abstentions / non_unknown_support if non_unknown_support else None,
            "classes": classes,
        }
        all_correct += correct
        all_count += count
        macro_values.append(macro)
    report["overall"] = {
        "decisions": all_count,
        "accuracy": all_correct / all_count if all_count else None,
        "meanFieldMacroF1": sum(macro_values) / len(macro_values) if macro_values else None,
    }
    return report


def ensure_best_adapter(adapter_path: Path, model: Any, base_state: dict[str, Any]) -> bool:
    """Persist the exact base decision head when no epoch beats calibration baseline."""
    if adapter_path.exists():
        return False
    model.load_state_dict(base_state, strict=False)
    BASE.save_adapter(adapter_path, model)
    return True


def evaluate(model: Any, items: Iterable[dict[str, Any]], pad_id: int, batch_size: int,
             device: Any) -> dict[str, Any]:
    import torch
    from laya.common import collate_items

    confusions: dict[str, dict[str, collections.Counter[str]]] = collections.defaultdict(
        lambda: collections.defaultdict(collections.Counter)
    )
    model.eval()
    with torch.inference_mode():
        for batch in batch_iter(items, batch_size, shuffle=False, seed=0, shuffle_buffer=0):
            packed = collate_items([[item] for item in batch], pad_id)
            logits, _ = model(
                packed["input_ids"].to(device), packed["attention_mask"].to(device),
                packed["marker_pos"].to(device), packed["marker_mask"].to(device), packed["qtype"].to(device),
            )
            probabilities = torch.softmax(logits.float(), dim=-1).cpu()
            for index, item in enumerate(batch):
                option_count = len(item["choices"])
                predicted_index = int(probabilities[index, :option_count].argmax().item())
                predicted = item["choices"][predicted_index]
                confusions[item["field"]][item["gold"]][predicted] += 1
    return summarize_confusions(confusions)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--input", type=Path, required=True)
    parser.add_argument("--manifest", type=Path, required=True)
    parser.add_argument("--model-dir", type=Path, required=True)
    parser.add_argument("--experiment-dir", type=Path, required=True)
    parser.add_argument("--allow-synthetic-experiment", action="store_true")
    parser.add_argument("--train-row-limit", type=int, default=0,
                        help="Optional deterministic hash-uniform research cap; default trains on every clean row.")
    parser.add_argument("--eval-row-limit", type=int, default=5_000,
                        help="Bounded deterministic hash-uniform rows per calibration/test split.")
    parser.add_argument("--epochs", type=int, default=1)
    parser.add_argument("--batch-size", type=int, default=8)
    parser.add_argument("--learning-rate", type=float, default=0.00005)
    parser.add_argument("--threads", type=int, default=8)
    parser.add_argument("--device", choices=("auto", "cpu", "mps"), default="auto",
                        help="Prefer Apple MPS on supported hosts; auto falls back to CPU only.")
    parser.add_argument("--shuffle-buffer", type=int, default=8_192)
    parser.add_argument("--checkpoint-steps", type=int, default=1_000)
    parser.add_argument("--seed", type=int, default=4172026)
    parser.add_argument("--validate-only", action="store_true")
    args = parser.parse_args()
    if not args.allow_synthetic_experiment:
        raise SystemExit("Refusing synthetic-only training without --allow-synthetic-experiment.")
    if min(args.epochs, args.batch_size, args.threads, args.eval_row_limit,
           args.shuffle_buffer, args.checkpoint_steps) < 1 or args.learning_rate <= 0 or args.train_row_limit < 0:
        raise SystemExit("Training limits and learning rate must be positive (train-row-limit may be zero).")
    if args.experiment_dir.exists():
        raise SystemExit("Experiment output already exists; choose a fresh directory to preserve artifacts.")

    os.environ["HF_HUB_OFFLINE"] = "1"
    os.environ["TRANSFORMERS_OFFLINE"] = "1"
    os.environ["TOKENIZERS_PARALLELISM"] = "false"
    import torch
    import torch.nn.functional as F
    from safetensors.torch import load_file
    from transformers import AutoTokenizer
    from laya.common import QTYPES, build_model, proper_reward

    torch.set_num_threads(args.threads)
    device = resolve_device(torch, args.device)
    torch.manual_seed(args.seed)
    random.seed(args.seed)
    data_path = args.input.expanduser().resolve(strict=True)
    manifest_path = args.manifest.expanduser().resolve(strict=True)
    model_dir = args.model_dir.expanduser().resolve(strict=True)
    data_manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    if (
        data_manifest.get("schemaVersion") != 2
        or data_manifest.get("status") != "complete"
        or data_manifest.get("taskType") not in BASE.DATA_TASKS.values()
        or data_manifest.get("model") != BASE.MODEL_ID
        or data_manifest.get("synthetic") is not True
        or data_manifest.get("realNeedGroundTruth") is not False
        or data_manifest.get("trainingEligible") is not False
        or data_manifest.get("layaPredictionsUsedAsLabels") is not False
        or data_manifest.get("targetOrigin") != "deterministic_source_facts_not_laya_output"
        or data_manifest.get("trainingSplitPolicy") != TRAINING_SPLIT_POLICY
        or data_manifest.get("exactNormalizedStateGroupsDisjoint") is not True
        or data_manifest.get("outputBytes") != data_path.stat().st_size
        or data_manifest.get("outputSha256") != BASE.sha256_file(data_path)
    ):
        raise SystemExit("The source manifest does not attest to this complete, hash-matched synthetic corpus.")
    questions_manifest, contract = BASE.question_manifest(manifest_path)
    question_hash = hashlib.sha256(json.dumps(
        contract, ensure_ascii=False, separators=(",", ":"), sort_keys=False,
    ).encode()).hexdigest()
    if question_hash != data_manifest.get("questionFactory", {}).get("hypotheticalNeedQuestionSchemaSha256"):
        raise SystemExit("The data manifest's Laya question schema hash is inconsistent.")
    data_summary = validate_corpus(data_path, contract, question_hash, data_manifest["taskType"])
    if (
        data_summary["rowCount"] != data_manifest.get("outputRows")
        or data_summary["uniqueNormalizedStateGroups"] != data_manifest.get("uniqueNormalizedStateGroups")
        or data_manifest.get("uniqueNormalizedStateGroups") != data_manifest.get("outputRows")
        or data_summary["rowsBySplit"] != data_manifest.get("trainingSplitCounts")
    ):
        raise SystemExit("The row, exact-text-group, or training-split counts do not match the corpus manifest.")

    weight_path = model_dir / "model.safetensors"
    config_path = model_dir / "rl_agent_config.json"
    tokenizer_path = model_dir / "tokenizer"
    encoder_path = model_dir / "encoder"
    if not all(path.exists() for path in (weight_path, config_path, tokenizer_path, encoder_path)):
        raise SystemExit("The exact local Laya checkpoint is incomplete; this script never downloads another model.")
    actual_weight_hash = BASE.sha256_file(weight_path)
    if actual_weight_hash != BASE.MODEL_WEIGHT_SHA256:
        raise SystemExit("Local Laya weights differ from the pinned convaiinnovations/laya-multilingual checkpoint.")

    calibration_rows = select_rows(data_path, "calibration", args.eval_row_limit)
    test_rows = select_rows(data_path, "test", args.eval_row_limit)
    if len(calibration_rows) < 16 or len(test_rows) < 16:
        raise SystemExit("The bounded calibration/test sample is too small.")
    train_rows_sample = (
        select_rows(data_path, "train", args.train_row_limit)
        if args.train_row_limit else None
    )
    train_ids = selected_ids(train_rows_sample) if train_rows_sample is not None else None
    selected_train_rows = len(train_rows_sample) if train_rows_sample is not None else data_summary["rowsBySplit"]["train"]
    if selected_train_rows < 32:
        raise SystemExit("The selected training partition is too small.")

    if args.validate_only:
        print(json.dumps({
            "status": "validated_only",
            "dataSummary": data_summary,
            "selectedRows": {"train": selected_train_rows, "calibration": len(calibration_rows), "test": len(test_rows)},
            "model": BASE.MODEL_ID,
            "modelRevision": BASE.MODEL_REVISION,
            "device": device.type,
            "baseWeightsSha256": actual_weight_hash,
            "questionSchemaSha256": question_hash,
            "trainingPerformed": False,
        }, ensure_ascii=False, indent=2))
        return 0

    args.experiment_dir.mkdir(parents=True, exist_ok=False)
    config = json.loads(config_path.read_text(encoding="utf-8"))
    tokenizer = AutoTokenizer.from_pretrained(str(tokenizer_path), local_files_only=True, trust_remote_code=False)
    model = build_model(config, encoder_dir=str(encoder_path), pretrained=False)
    model.load_state_dict(load_file(str(weight_path), device="cpu"), strict=True)
    model.to(device)
    model.eval()
    for parameter in model.parameters():
        parameter.requires_grad_(False)
    for module in (model.head, model.type_emb, model.scorer):
        if module is not None:
            for parameter in module.parameters():
                parameter.requires_grad_(True)
    trainable = [parameter for parameter in model.parameters() if parameter.requires_grad]
    if not trainable:
        raise SystemExit("No Laya typed-decision parameters were selected for training.")

    max_len = min(512, int(config.get("max_len", 512)))
    head_max_len = int(config.get("head_max_len", 256))
    pad_id = tokenizer.pad_token_id
    if pad_id is None:
        raise SystemExit("The local Laya tokenizer has no pad token.")
    make_eval_items = lambda rows: (
        item for row in rows
        for item in make_row_items(row, contract, tokenizer, QTYPES, max_len, head_max_len)
    )
    baseline_calibration = evaluate(model, make_eval_items(calibration_rows), pad_id, args.batch_size, device)
    baseline_test = evaluate(model, make_eval_items(test_rows), pad_id, args.batch_size, device)
    BASE.atomic_json(args.experiment_dir / "baseline-metrics.json", {
        "dataScope": "deterministic hash-uniform bounded sample from held-out exact normalized generated-text groups; synthetic counterfactual targets only",
        "calibration": baseline_calibration,
        "test": baseline_test,
    })

    loss_counts: dict[str, collections.Counter[str]] = {
        field: collections.Counter(data_summary["trainingTargetsByField"][field]) for field in TRAIN_FIELDS
    }
    selected_decisions = sum(sum(values.values()) for values in loss_counts.values())
    if train_rows_sample is not None:
        loss_counts = {field: collections.Counter() for field in TRAIN_FIELDS}
        for row in train_rows_sample:
            for field, target in row["hypotheticalNeed"]["targetDecisions"].items():
                if field in TRAIN_FIELDS and target.get("source") in TARGET_SOURCES[field]:
                    loss_counts[field][target["value"]] += 1
        selected_decisions = sum(sum(values.values()) for values in loss_counts.values())
    total_steps = math.ceil(selected_decisions / args.batch_size) * args.epochs
    optimizer = torch.optim.AdamW(trainable, lr=args.learning_rate, weight_decay=0.01)
    base_state = {name: parameter.detach().clone() for name, parameter in model.named_parameters() if parameter.requires_grad}
    manifest = {
        "schemaVersion": 1,
        "status": "running",
        "experimentOnly": True,
        "productionLoadAllowed": False,
        "syntheticTrainingAuthorized": True,
        "syntheticTargetsAreRealNeedGroundTruth": False,
        "layaPredictionsUsedAsLabels": False,
        "sourceRightsReview": "pending; local research artifact only; no redistribution",
        "privacyReview": "derived text only; source audit is not comprehensive content/privacy clearance",
        "model": BASE.MODEL_ID,
        "modelRevision": BASE.MODEL_REVISION,
        "baseWeightsSha256": actual_weight_hash,
        "requestedDevice": args.device,
        "device": device.type,
        "architecture": "frozen exact multilingual encoder; train typed decision head, question-type embedding, and scorer only",
        "threads": args.threads,
        "trainableParameters": sum(parameter.numel() for parameter in trainable),
        "trainingFields": list(TRAIN_FIELDS),
        "excludedFields": {
            "city_and_neighborhood": "high-cardinality exact local catalog resolver; Laya choice over hundreds/thousands is less reliable and is not trained",
            "usage": "seller offers do not establish the seeker's intended business use",
            "numeric_and_amenity_preferences": "source offer attributes are not user preferences; not trained as seeker labels",
        },
        "dataFile": str(data_path),
        "dataSha256": BASE.sha256_file(data_path),
        "inputCorpusManifest": str(manifest_path),
        "inputCorpusRows": data_summary["rowCount"],
        "sourceDataset": questions_manifest.get("sourceDataset"),
        "sourceDatasetSha256": questions_manifest.get("sourceDatasetSha256"),
        "questionSchemaSha256": question_hash,
        "sourceGroupSplit": "normalized source-text duplicates collapsed and source conflicts quarantined",
        "trainingSplitPolicy": TRAINING_SPLIT_POLICY,
        "evaluationScope": "deterministic hash-uniform bounded sample from held-out exact normalized generated-text groups; synthetic template-text generalization only, not accuracy on real user needs",
            "dataSummary": data_summary,
            "selectedRows": {"train": selected_train_rows, "calibration": len(calibration_rows), "test": len(test_rows)},
            "evaluationSamplingPolicy": "deterministic_hash_uniform_within_split_v1",
        "selectedDecisionCount": selected_decisions,
        "optimizer": "AdamW",
        "objective": "weighted categorical cross-entropy plus Laya proper_reward on source-grounded counterfactual targets",
        "learningRate": args.learning_rate,
        "batchSize": args.batch_size,
        "epochsRequested": args.epochs,
        "shuffleBufferDecisions": args.shuffle_buffer,
        "baseMetricsFiles": ["baseline-metrics.json"],
        "startedAtUnix": time.time(),
    }
    BASE.atomic_json(args.experiment_dir / "manifest.json", manifest)
    BASE.atomic_json(args.experiment_dir / "training-progress.json", {"epoch": 0, "step": 0, "loss": None})

    start = time.monotonic()
    history: list[dict[str, Any]] = []
    baseline_values = [baseline_calibration[field]["macroF1"] for field in TRAIN_FIELDS if baseline_calibration[field]["macroF1"] is not None]
    best_score = sum(baseline_values) / max(1, len(baseline_values))
    best_epoch = 0
    global_step = 0
    try:
        for epoch in range(args.epochs):
            model.train()
            model.encoder.eval()
            model.head_checkpointing = True
            loss_sum = torch.zeros((), dtype=torch.float32, device=device)
            batch_count = 0
            items = decision_stream(
                data_path, "train", contract, tokenizer, QTYPES, max_len, head_max_len,
                allow_ids=train_ids, loss_counts=loss_counts,
            )
            for batch in batch_iter(items, args.batch_size, shuffle=True,
                                    seed=args.seed + epoch, shuffle_buffer=args.shuffle_buffer):
                optimizer.zero_grad(set_to_none=True)
                packed = __import__("laya.common", fromlist=["collate_items"]).collate_items(
                    [[item] for item in batch], pad_id,
                )
                logits, _ = model(
                    packed["input_ids"].to(device), packed["attention_mask"].to(device),
                    packed["marker_pos"].to(device), packed["marker_mask"].to(device),
                    packed["qtype"].to(device),
                )
                labels = packed["label"].to(device)
                per_item = F.cross_entropy(logits.float(), labels, reduction="none")
                probabilities = torch.softmax(logits.float(), dim=-1)
                one_hot = F.one_hot(labels, num_classes=logits.shape[-1]).to(dtype=torch.float32)
                score_reward = proper_reward(
                    probabilities, one_hot, packed["qtype"].to(device), packed["marker_mask"].to(device),
                )
                per_item = 0.5 * per_item - 0.5 * score_reward
                sample_weights = torch.tensor(
                    [item["loss_weight"] for item in batch], dtype=torch.float32, device=device,
                )
                loss = (per_item * sample_weights).sum() / sample_weights.sum().clamp_min(1e-6)
                loss.backward()
                torch.nn.utils.clip_grad_norm_(trainable, max_norm=1.0)
                optimizer.step()
                loss_sum.add_(loss.detach())
                batch_count += 1
                global_step += 1
                if global_step % args.checkpoint_steps == 0 or global_step == total_steps:
                    BASE.save_adapter(args.experiment_dir / "last-adapter.safetensors", model)
                    mean_loss = float((loss_sum / max(1, batch_count)).cpu().item())
                    BASE.atomic_json(args.experiment_dir / "training-progress.json", {
                        "epoch": epoch + 1,
                        "step": global_step,
                        "totalSteps": total_steps,
                        "meanLoss": mean_loss,
                        "elapsedSeconds": time.monotonic() - start,
                        "checkpoint": "last-adapter.safetensors",
                    })
                    print(f"epoch={epoch + 1}/{args.epochs} step={global_step}/{total_steps} mean_loss={mean_loss:.4f}", flush=True)

            calibration = evaluate(model, make_eval_items(calibration_rows), pad_id, args.batch_size, device)
            score_values = [calibration[field]["macroF1"] for field in TRAIN_FIELDS if calibration[field]["macroF1"] is not None]
            score = sum(score_values) / max(1, len(score_values))
            history.append({
                "epoch": epoch + 1,
                "meanTrainingLoss": float((loss_sum / max(1, batch_count)).cpu().item()),
                "calibrationMeanFieldMacroF1": score,
                "calibration": calibration,
            })
            if score > best_score + 1e-6:
                best_score, best_epoch = score, epoch + 1
                BASE.save_adapter(args.experiment_dir / "best-adapter.safetensors", model)
            BASE.atomic_json(args.experiment_dir / "epoch-metrics.json", {"epochs": history, "bestEpoch": best_epoch})
            print(f"epoch={epoch + 1} calibration_mean_macro_f1={score:.4f}", flush=True)

        model.eval()
        final_test = evaluate(model, make_eval_items(test_rows), pad_id, args.batch_size, device)
        best_adapter = args.experiment_dir / "best-adapter.safetensors"
        baseline_fallback = ensure_best_adapter(best_adapter, model, base_state)
        model.load_state_dict(load_file(str(best_adapter), device="cpu"), strict=False)
        best_test = evaluate(model, make_eval_items(test_rows), pad_id, args.batch_size, device)
        report = {
            "syntheticOnly": True,
            "notEvidenceOfRealUserNeedAccuracy": True,
            "baseline": {"calibration": baseline_calibration, "test": baseline_test},
            "afterLastEpochTest": final_test,
            "bestCalibrationCheckpointTest": best_test,
            "selectedBestEpoch": best_epoch,
            "selectedCheckpointSource": "pinned_base_no_calibration_improvement" if baseline_fallback else "best_calibration_epoch",
            "epochs": history,
            "elapsedSeconds": time.monotonic() - start,
        }
        BASE.atomic_json(args.experiment_dir / "evaluation.json", report)
        manifest["status"] = "research_run_complete"
        manifest["selectedBestEpoch"] = best_epoch
        manifest["selectedCheckpointSource"] = "pinned_base_no_calibration_improvement" if baseline_fallback else "best_calibration_epoch"
        manifest["completedAtUnix"] = time.time()
        manifest["result"] = "research-only adapter; not loadable or authorized for production"
        BASE.atomic_json(args.experiment_dir / "manifest.json", manifest)
        print(json.dumps({
            "status": manifest["status"],
            "experimentDir": str(args.experiment_dir),
            "trainingRows": selected_train_rows,
            "trainingDecisions": selected_decisions,
            "baselineTestAccuracy": baseline_test["overall"]["accuracy"],
            "bestAdapterTestAccuracy": best_test["overall"]["accuracy"],
            "bestEpoch": best_epoch,
            "elapsedSeconds": report["elapsedSeconds"],
        }, ensure_ascii=False), flush=True)
    except KeyboardInterrupt:
        BASE.save_adapter(args.experiment_dir / "interrupted-adapter.safetensors", model)
        manifest["status"] = "interrupted"
        manifest["interruptedAtUnix"] = time.time()
        BASE.atomic_json(args.experiment_dir / "manifest.json", manifest)
        print("Training interrupted; research adapter checkpoint preserved.", flush=True)
        return 130
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
