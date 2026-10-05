#!/usr/bin/env python3
"""Run an isolated, synthetic-only Si decision-head fine-tuning experiment.

This deliberately does not train on Si's own predictions. Labels come from the
audited counterfactual target fields; exact normalized generated inputs are
deduplicated and assigned to one deterministic train/calibration/test partition.
The original source split remains audit metadata. The multilingual encoder is
frozen to fit the MacBook's unified-memory budget. Output is an adapter, never a
replacement model.
"""

from __future__ import annotations

import argparse
import collections
import hashlib
import json
import math
import os
import random
import time
import unicodedata
from pathlib import Path
from typing import Any, Iterable


MODEL_ID = "convaiinnovations/si-multilingual"
MODEL_REVISION = "e4e9ddf21a7b1903b7acffd8814ad4307bf63a67"
MODEL_WEIGHT_SHA256 = "9d628fd971b700382ac6f65920a86f149777b2e748e0c955fb3b19695aa8f204"
DATA_TASK = "divar-counterfactual-post-need-si-proposal/v5"
DATA_TASKS = {
    5: DATA_TASK,
    6: "divar-counterfactual-post-need-si-proposal/v6",
}
HYPOTHETICAL_TASKS = {
    5: "divar-counterfactual-post-need-proposal/v5",
    6: "divar-counterfactual-post-need-proposal/v6",
}
TRAIN_FIELDS = (
    "category_candidate",
    "property_kind",
    "transaction_type",
)
TARGET_SOURCES = {
    "category_candidate": {"source_offer_category_counterfactual"},
    "property_kind": {"source_offer_category_counterfactual"},
    "transaction_type": {
        "counterfactual_from_requested_category",
        "explicit_structured_offer_rent_mode_recast_as_hypothetical_need",
    },
}

TRAINING_SPLIT_POLICY = "sha256(normalized_state) first32bits % 100; 0-79=train, 80-89=calibration, 90-99=test"


def normalize_model_input(text: str) -> str:
    value = unicodedata.normalize("NFKC", text)
    value = value.translate(str.maketrans({
        "ي": "ی", "ى": "ی", "ك": "ک",
        **{chr(code): str(code - 0x06F0) for code in range(0x06F0, 0x06FA)},
        **{chr(code): str(code - 0x0660) for code in range(0x0660, 0x066A)},
    }))
    normalized: list[str] = []
    for character in value:
        if character in {"\u200c", "\u200e", "\u200f"}:
            continue
        if character.isspace() or unicodedata.category(character)[0] in {"P", "S"}:
            normalized.append(" ")
        else:
            normalized.append(character)
    return " ".join("".join(normalized).lower().split())


def normalized_state_group(text: str) -> str:
    normalized = normalize_model_input(text)
    if not normalized:
        raise ValueError("A generated row has no normalized model-input text.")
    return hashlib.sha256(normalized.encode("utf-8")).hexdigest()


def training_split_for_state(text: str) -> str:
    bucket = int(normalized_state_group(text)[:8], 16) % 100
    return "train" if bucket < 80 else "calibration" if bucket < 90 else "test"


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def sha256_json(value: Any) -> str:
    return hashlib.sha256(json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":")).encode()).hexdigest()


def read_jsonl(path: Path) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    with path.open(encoding="utf-8") as stream:
        for line_number, line in enumerate(stream, 1):
            if not line.strip():
                continue
            try:
                value = json.loads(line)
            except json.JSONDecodeError as exc:
                raise ValueError(f"Invalid JSON on line {line_number}.") from exc
            if not isinstance(value, dict):
                raise ValueError(f"Expected an object on line {line_number}.")
            rows.append(value)
    return rows


def si_question(question: dict[str, Any]) -> dict[str, Any]:
    kind = question.get("type")
    instructions = question.get("instructions")
    criteria = question.get("criteria")
    if kind not in {"choice", "noul", "score"} or not isinstance(instructions, str):
        raise ValueError("The stored Si question contract is invalid.")
    if kind == "choice" and isinstance(criteria, dict) and len(criteria) < 2:
        raise ValueError("Choice question must expose at least two choices.")
    result = {"t": kind, "ins": instructions, "crit": criteria}
    if "labels" in question:
        result["labels"] = question["labels"]
    return result


def validate_corpus(rows: list[dict[str, Any]], question_contract: dict[str, Any],
                    data_task: str = DATA_TASK) -> dict[str, Any]:
    versions = {task: version for version, task in DATA_TASKS.items()}
    version = versions.get(data_task)
    if version is None:
        raise ValueError("The corpus task version is not supported by this trainer.")
    if not isinstance(question_contract, dict):
        raise ValueError("Question contract must be an object.")
    missing = [field for field in TRAIN_FIELDS if field not in question_contract]
    if missing:
        raise ValueError(f"The question contract is missing required decisions: {missing}.")
    choices: dict[str, list[str]] = {}
    for field in TRAIN_FIELDS:
        q = si_question(question_contract[field])
        if q["t"] != "choice" or not isinstance(q["crit"], dict):
            raise ValueError(f"{field} must be a typed choice question.")
        choices[field] = list(q["crit"].keys())

    split_groups: dict[str, str] = {}
    state_groups: set[str] = set()
    split_counts: collections.Counter[str] = collections.Counter()
    target_counts = {field: collections.Counter() for field in TRAIN_FIELDS}
    eligible_rows = 0
    for row_number, row in enumerate(rows, 1):
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
            or row.get("stateTruncated") is True
            or not isinstance(hypothetical, dict)
            or hypothetical.get("realNeedGroundTruth") is not False
            or hypothetical.get("trainingEligible") is not False
            or hypothetical.get("generation", {}).get("method") != "deterministic-counterfactual-template"
            or row.get("schemaVersion") != version
            or hypothetical.get("schemaVersion") != version
            or hypothetical.get("generation", {}).get("version") != version
            or not isinstance(source, dict)
            or source.get("dataset") != "divarofficial/real_estate_ads"
        ):
            raise ValueError(f"Row {row_number} does not satisfy the synthetic-only data contract.")
        source_split = hypothetical.get("originalSplit")
        split = hypothetical.get("trainingSplit")
        group = source.get("splitGroup") or hypothetical.get("sourceOfferGroup")
        if source_split not in {"train", "calibration", "test"} or split not in {"train", "calibration", "test"} or not isinstance(group, str) or not group:
            raise ValueError(f"Row {row_number} lacks an approved source or model-input split.")
        prior = split_groups.get(group)
        if prior is not None:
            if prior != source_split:
                raise ValueError("A source group crosses source partitions.")
            raise ValueError("The finalized corpus repeats a normalized source-text group.")
        split_groups[group] = source_split
        state_group = normalized_state_group(row["state"])
        if split != training_split_for_state(row["state"]):
            raise ValueError("A generated model-input row has a non-deterministic training split.")
        if state_group in state_groups:
            raise ValueError("The finalized corpus repeats a normalized generated model-input state.")
        state_groups.add(state_group)
        split_counts[split] += 1

        targets = hypothetical.get("targetDecisions")
        if not isinstance(targets, dict):
            raise ValueError(f"Row {row_number} has no target decisions.")
        row_has_target = False
        for field in TRAIN_FIELDS:
            target = targets.get(field)
            if not isinstance(target, dict):
                continue
            value = target.get("value")
            provenance = target.get("source")
            if value is None or provenance not in TARGET_SOURCES[field]:
                continue
            if value not in choices[field]:
                raise ValueError(f"Unsupported target value for {field} on row {row_number}.")
            target_counts[field][value] += 1
            row_has_target = True
        eligible_rows += int(row_has_target)

    if not split_counts["train"] or not split_counts["calibration"] or not split_counts["test"]:
        raise ValueError("Train, calibration, and test partitions must all contain rows.")
    if any(sum(target_counts[field].values()) == 0 for field in TRAIN_FIELDS):
        raise ValueError("At least one selected decision has no source-derived supervision.")
    return {
        "rowCount": len(rows),
        "eligibleRows": eligible_rows,
        "uniqueSourceGroups": len(split_groups),
        "uniqueNormalizedStateGroups": len(state_groups),
        "rowsBySplit": dict(split_counts),
        "targetsByField": {key: dict(value) for key, value in target_counts.items()},
        "choicesByField": choices,
    }


def question_manifest(path: Path) -> tuple[dict[str, Any], dict[str, Any]]:
    manifest = json.loads(path.read_text(encoding="utf-8"))
    version_by_task = {task: version for version, task in DATA_TASKS.items()}
    version = version_by_task.get(manifest.get("taskType"))
    if (
        manifest.get("schemaVersion") != 2
        or version is None
        or manifest.get("model") != MODEL_ID
        or manifest.get("trainingSplitPolicy") != TRAINING_SPLIT_POLICY
        or manifest.get("exactNormalizedStateGroupsDisjoint") is not True
    ):
        raise ValueError("Input manifest is not the corrected, text-grouped Divar/Si corpus version.")
    contract = manifest.get("questionFactory", {}).get("hypotheticalNeedQuestions")
    if not isinstance(contract, dict):
        raise ValueError("The input manifest has no pinned hypothetical-need questions.")
    question_factory = manifest.get("questionFactory", {})
    if (
        question_factory.get("hypotheticalTask") != HYPOTHETICAL_TASKS[version]
        or question_factory.get("hypotheticalTemplateVersion") != version
        or question_factory.get("outputSemanticsVersion") != version
    ):
        raise ValueError("The input manifest has inconsistent task and counterfactual semantics versions.")
    return manifest, contract


def select_rows(rows: list[dict[str, Any]], split: str, limit: int) -> list[dict[str, Any]]:
    selected = [r for r in rows if r["hypotheticalNeed"]["trainingSplit"] == split]
    selected.sort(key=lambda row: hashlib.sha256(
        (row["source"]["splitGroup"] + ":" + row["exampleId"]).encode()
    ).digest())
    return selected[:limit] if limit > 0 else selected


def make_items(rows: list[dict[str, Any]], contract: dict[str, Any], tokenizer: Any,
               qtypes: dict[str, int], max_len: int, head_max_len: int) -> list[dict[str, Any]]:
    from si.common import build_sequence, render_options

    items: list[dict[str, Any]] = []
    for row in rows:
        state = row["state"]
        state_ids = tokenizer(state.replace(tokenizer.mask_token, " "), add_special_tokens=False)["input_ids"]
        targets = row["hypotheticalNeed"]["targetDecisions"]
        for field in TRAIN_FIELDS:
            target = targets.get(field)
            if not isinstance(target, dict) or target.get("source") not in TARGET_SOURCES[field]:
                continue
            q = si_question(contract[field])
            choices = list(q["crit"].keys())
            value = target.get("value")
            if value not in choices:
                continue
            sequence, markers = build_sequence(
                tokenizer, state, q, max_len=max_len, head_max_len=head_max_len,
                state_ids=state_ids,
            )
            if len(markers) != len(render_options(q)):
                raise ValueError(f"Choice options exceed Si head budget for {field}.")
            items.append({
                "ids": sequence,
                "markers": markers,
                "qtype": qtypes[q["t"]],
                "label": choices.index(value),
                "field": field,
                "gold": value,
            })
    return items


def field_metrics(observations: dict[str, list[tuple[str, str, float]]]) -> dict[str, Any]:
    report: dict[str, Any] = {}
    all_correct = all_count = 0
    for field in TRAIN_FIELDS:
        values = observations.get(field, [])
        if not values:
            report[field] = {"count": 0, "accuracy": None, "macroF1": None, "unknownFalsePositiveRate": None}
            continue
        labels = sorted({gold for gold, _, _ in values} | {pred for _, pred, _ in values})
        per_class = {}
        f1s = []
        for label in labels:
            tp = sum(g == label and p == label for g, p, _ in values)
            fp = sum(g != label and p == label for g, p, _ in values)
            fn = sum(g == label and p != label for g, p, _ in values)
            denom = 2 * tp + fp + fn
            f1 = (2 * tp / denom) if denom else 0.0
            f1s.append(f1)
            per_class[label] = {
                "support": sum(g == label for g, _, _ in values),
                "precision": tp / (tp + fp) if tp + fp else 0.0,
                "recall": tp / (tp + fn) if tp + fn else 0.0,
                "f1": f1,
            }
        correct = sum(g == p for g, p, _ in values)
        unknown_gold = [x for x in values if x[0] == "unknown"]
        unknown_fp = [x for x in values if x[0] != "unknown" and x[1] == "unknown"]
        report[field] = {
            "count": len(values),
            "accuracy": correct / len(values),
            "macroF1": sum(f1s) / len(f1s) if f1s else 0.0,
            "unknownRecall": (sum(g == p for g, p, _ in unknown_gold) / len(unknown_gold)) if unknown_gold else None,
            "unknownFalsePositiveRate": len(unknown_fp) / sum(g != "unknown" for g, _, _ in values)
            if any(g != "unknown" for g, _, _ in values) else None,
            "classes": per_class,
        }
        all_correct += correct
        all_count += len(values)
    report["overall"] = {
        "decisions": all_count,
        "accuracy": all_correct / all_count if all_count else None,
        "meanFieldMacroF1": sum(
            item["macroF1"] for key, item in report.items()
            if key in TRAIN_FIELDS and item["macroF1"] is not None
        ) / sum(1 for key, item in report.items() if key in TRAIN_FIELDS and item["macroF1"] is not None)
        if any(item["macroF1"] is not None for key, item in report.items() if key in TRAIN_FIELDS) else None,
    }
    return report


def atomic_json(path: Path, value: dict[str, Any]) -> None:
    temp = path.with_suffix(path.suffix + ".tmp")
    temp.write_text(json.dumps(value, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    temp.replace(path)


def save_adapter(path: Path, model: Any) -> None:
    from safetensors.torch import save_file

    state = {
        name: parameter.detach().to(device="cpu", dtype=__import__("torch").float32).contiguous()
        for name, parameter in model.named_parameters()
        if parameter.requires_grad
    }
    temp = path.with_suffix(path.suffix + ".tmp")
    save_file(state, str(temp))
    temp.replace(path)


def batch_iter(items: list[dict[str, Any]], batch_size: int, shuffle: bool, seed: int) -> Iterable[list[dict[str, Any]]]:
    indices = list(range(len(items)))
    if shuffle:
        random.Random(seed).shuffle(indices)
    for start in range(0, len(indices), batch_size):
        yield [items[i] for i in indices[start:start + batch_size]]


def evaluate(model: Any, items: list[dict[str, Any]], pad_id: int, batch_size: int,
             device: Any) -> dict[str, Any]:
    import torch
    from si.common import collate_items

    observations: dict[str, list[tuple[str, str, float]]] = collections.defaultdict(list)
    model.eval()
    with torch.inference_mode():
        for batch in batch_iter(items, batch_size, shuffle=False, seed=0):
            packed = collate_items([[it] for it in batch], pad_id)
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
                # Choice keys are stored alongside each generated item as ``choices``.
                predicted = item["choices"][predicted_index]
                confidence = float(probabilities[index, predicted_index].item())
                observations[item["field"]].append((item["gold"], predicted, confidence))
    return field_metrics(observations)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--input", type=Path, required=True)
    parser.add_argument("--manifest", type=Path, required=True)
    parser.add_argument("--model-dir", type=Path, required=True)
    parser.add_argument("--experiment-dir", type=Path, required=True)
    parser.add_argument("--allow-synthetic-experiment", action="store_true",
                        help="Explicitly acknowledges that targets are hypothetical, not real user ground truth.")
    parser.add_argument("--train-row-limit", type=int, default=0,
                        help="Deterministic hash-sample cap; 0 uses all rows in the train partition.")
    parser.add_argument("--eval-row-limit", type=int, default=0,
                        help="Deterministic hash-sample cap per calibration/test partition; 0 uses all rows.")
    parser.add_argument("--epochs", type=int, default=1)
    parser.add_argument("--batch-size", type=int, default=8)
    parser.add_argument("--learning-rate", type=float, default=0.00005)
    parser.add_argument("--threads", type=int, default=8)
    parser.add_argument("--seed", type=int, default=4172026)
    parser.add_argument("--validate-only", action="store_true",
                        help="Validate source, splits, targets, and checkpoint hashes without loading or training the model.")
    args = parser.parse_args()
    if not args.allow_synthetic_experiment:
        raise SystemExit("Refusing to train synthetic data without --allow-synthetic-experiment.")
    if args.epochs < 1 or args.batch_size < 1 or args.threads < 1 or args.learning_rate <= 0:
        raise SystemExit("epochs, batch size, threads, and learning rate must be positive.")
    if args.experiment_dir.exists():
        raise SystemExit("Experiment output already exists; choose a fresh directory to preserve artifacts.")

    os.environ["HF_HUB_OFFLINE"] = "1"
    os.environ["TRANSFORMERS_OFFLINE"] = "1"
    os.environ["TOKENIZERS_PARALLELISM"] = "false"

    import torch
    import torch.nn.functional as F
    from safetensors.torch import load_file
    from transformers import AutoTokenizer
    from si.common import QTYPES, build_model, proper_reward

    torch.set_num_threads(args.threads)
    torch.manual_seed(args.seed)
    random.seed(args.seed)

    data_path = args.input.expanduser().resolve(strict=True)
    manifest_path = args.manifest.expanduser().resolve(strict=True)
    model_dir = args.model_dir.expanduser().resolve(strict=True)
    questions_manifest, contract = question_manifest(manifest_path)
    if (
        questions_manifest.get("outputBytes") != data_path.stat().st_size
        or questions_manifest.get("outputSha256") != sha256_file(data_path)
    ):
        raise SystemExit("The corrected corpus file does not match its manifest hash and byte count.")
    rows = read_jsonl(data_path)
    data_summary = validate_corpus(rows, contract, questions_manifest.get("taskType", DATA_TASK))
    if (
        data_summary["rowCount"] != questions_manifest.get("outputRows")
        or data_summary["uniqueNormalizedStateGroups"] != questions_manifest.get("uniqueNormalizedStateGroups")
        or questions_manifest.get("uniqueNormalizedStateGroups") != questions_manifest.get("outputRows")
        or data_summary["rowsBySplit"] != questions_manifest.get("trainingSplitCounts")
    ):
        raise SystemExit("The corrected corpus row, exact-text-group, or split counts do not match its manifest.")
    train_rows = select_rows(rows, "train", args.train_row_limit)
    calibration_rows = select_rows(rows, "calibration", args.eval_row_limit)
    test_rows = select_rows(rows, "test", args.eval_row_limit)
    if len(train_rows) < 32 or len(calibration_rows) < 16 or len(test_rows) < 16:
        raise SystemExit("The selected partitions are too small for even a controlled pilot.")

    weight_path = model_dir / "model.safetensors"
    config_path = model_dir / "rl_agent_config.json"
    tokenizer_path = model_dir / "tokenizer"
    encoder_path = model_dir / "encoder"
    if not all(path.exists() for path in (weight_path, config_path, tokenizer_path, encoder_path)):
        raise SystemExit("The pinned local Si checkpoint is incomplete; no download is attempted.")
    actual_weight_hash = sha256_file(weight_path)
    if actual_weight_hash != MODEL_WEIGHT_SHA256:
        raise SystemExit("The local weights do not match the approved pinned multilingual checkpoint.")

    if args.validate_only:
        print(json.dumps({
            "status": "validated_only",
            "dataSummary": data_summary,
            "selectedRows": {"train": len(train_rows), "calibration": len(calibration_rows), "test": len(test_rows)},
            "model": MODEL_ID,
            "modelRevision": MODEL_REVISION,
            "baseWeightsSha256": actual_weight_hash,
            "questionSchemaSha256": sha256_json(contract),
            "trainingPerformed": False,
        }, ensure_ascii=False, indent=2))
        return 0

    args.experiment_dir.mkdir(parents=True, exist_ok=False)
    config = json.loads(config_path.read_text(encoding="utf-8"))
    tokenizer = AutoTokenizer.from_pretrained(str(tokenizer_path), local_files_only=True, trust_remote_code=False)
    model = build_model(config, encoder_dir=str(encoder_path), pretrained=False)
    model.load_state_dict(load_file(str(weight_path), device="cpu"), strict=True)
    model.to(torch.device("cpu"))
    model.eval()
    for parameter in model.parameters():
        parameter.requires_grad_(False)
    for module in (model.head, model.type_emb, model.scorer):
        if module is not None:
            for parameter in module.parameters():
                parameter.requires_grad_(True)
    if not any(p.requires_grad for p in model.parameters()):
        raise SystemExit("No decision-head parameters were selected for training.")

    max_len = min(512, int(config.get("max_len", 512)))
    head_max_len = int(config.get("head_max_len", 256))
    prepared: dict[str, list[dict[str, Any]]] = {}
    for split, split_rows in (("train", train_rows), ("calibration", calibration_rows), ("test", test_rows)):
        prepared[split] = make_items(split_rows, contract, tokenizer, QTYPES, max_len, head_max_len)
        for item in prepared[split]:
            field = item["field"]
            item["choices"] = list(contract[field]["criteria"].keys())
    if any(not prepared[split] for split in prepared):
        raise SystemExit("A selected partition has no supported decision examples.")

    # Mild inverse-square-root balancing; no class is weighted by more than 5x.
    label_counts: dict[str, collections.Counter[str]] = {
        field: collections.Counter(item["gold"] for item in prepared["train"] if item["field"] == field)
        for field in TRAIN_FIELDS
    }
    for item in prepared["train"]:
        count = label_counts[item["field"]][item["gold"]]
        total = sum(label_counts[item["field"]].values())
        item["loss_weight"] = min(5.0, math.sqrt(total / max(1, count)))

    pad_id = tokenizer.pad_token_id
    if pad_id is None:
        raise SystemExit("The local tokenizer has no pad token.")
    device = torch.device("cpu")
    baseline_calibration = evaluate(model, prepared["calibration"], pad_id, args.batch_size, device)
    baseline_test = evaluate(model, prepared["test"], pad_id, args.batch_size, device)
    atomic_json(args.experiment_dir / "baseline-metrics.json", {
        "dataScope": "partial, source-order prefix; synthetic held-out text only",
        "calibration": baseline_calibration,
        "test": baseline_test,
    })

    trainable = [p for p in model.parameters() if p.requires_grad]
    base_head_state = {
        name: parameter.detach().clone()
        for name, parameter in model.named_parameters()
        if parameter.requires_grad
    }
    optimizer = torch.optim.AdamW(trainable, lr=args.learning_rate, weight_decay=0.01)
    total_steps = max(1, math.ceil(len(prepared["train"]) / args.batch_size) * args.epochs)
    warmup_steps = max(1, int(total_steps * 0.05))
    start = time.monotonic()
    history: list[dict[str, Any]] = []
    baseline_scores = [baseline_calibration[field]["macroF1"] for field in TRAIN_FIELDS
                       if baseline_calibration[field]["macroF1"] is not None]
    best_score = sum(baseline_scores) / len(baseline_scores)
    best_epoch = 0
    manifest = {
        "schemaVersion": 1,
        "status": "running",
        "experimentOnly": True,
        "productionLoadAllowed": False,
        "syntheticTrainingAuthorized": True,
        "syntheticTargetsAreRealNeedGroundTruth": False,
        "siPredictionsUsedAsLabels": False,
        "sourceRightsReview": "pending; local research artifact only; no redistribution",
        "privacyReview": "synthetic text only; source data audit is not a comprehensive privacy review",
        "model": MODEL_ID,
        "modelRevision": MODEL_REVISION,
        "baseWeightsSha256": actual_weight_hash,
        "architecture": "frozen exact multilingual encoder; train Si typed decision head, type embedding, and scorer only",
        "device": "cpu",
        "threads": args.threads,
        "trainableParameters": sum(p.numel() for p in trainable),
        "trainingFields": list(TRAIN_FIELDS),
        "excludedFields": {"usage": "the source contains no independently grounded seeker-use target", "numericAndLocation": "deterministic parser/database resolver; not Si training targets"},
        "dataFile": str(data_path),
        "dataSha256": sha256_file(data_path),
        "inputRunManifest": str(manifest_path),
        "sourceDataset": questions_manifest.get("sourceDataset"),
        "sourceDatasetSha256": questions_manifest.get("sourceDatasetSha256"),
        "questionSchemaSha256": sha256_json(contract),
        "sourceGroupSplit": "normalized source-text duplicates collapsed and source conflicts quarantined",
        "trainingSplitPolicy": TRAINING_SPLIT_POLICY,
        "evaluationScope": "synthetic template-text generalization only; not accuracy on real user needs",
        "dataSummary": data_summary,
        "selectedRows": {"train": len(train_rows), "calibration": len(calibration_rows), "test": len(test_rows)},
        "selectedDecisionCounts": {split: len(items) for split, items in prepared.items()},
        "optimizer": "AdamW",
        "objective": "weighted mean of categorical cross-entropy and Si proper_reward on one-hot counterfactual targets",
        "learningRate": args.learning_rate,
        "batchSize": args.batch_size,
        "epochsRequested": args.epochs,
        "baseMetricsFiles": ["baseline-metrics.json"],
        "startedAtUnix": time.time(),
    }
    atomic_json(args.experiment_dir / "manifest.json", manifest)
    atomic_json(args.experiment_dir / "training-progress.json", {"epoch": 0, "step": 0, "loss": None})

    try:
        for epoch in range(args.epochs):
            model.train()
            model.encoder.eval()
            model.head_checkpointing = True
            losses: list[float] = []
            batches = list(batch_iter(prepared["train"], args.batch_size, shuffle=True, seed=args.seed + epoch))
            for step, batch in enumerate(batches, 1):
                optimizer.zero_grad(set_to_none=True)
                packed = __import__("si.common", fromlist=["collate_items"]).collate_items(
                    [[item] for item in batch], pad_id
                )
                logits, _ = model(
                    packed["input_ids"], packed["attention_mask"], packed["marker_pos"],
                    packed["marker_mask"], packed["qtype"],
                )
                labels = packed["label"]
                per_item = F.cross_entropy(logits.float(), labels, reduction="none")
                probabilities = torch.softmax(logits.float(), dim=-1)
                one_hot = F.one_hot(labels, num_classes=logits.shape[-1]).to(dtype=torch.float32)
                score_reward = proper_reward(probabilities, one_hot, packed["qtype"], packed["marker_mask"])
                per_item = 0.5 * per_item - 0.5 * score_reward
                sample_weights = torch.tensor([item["loss_weight"] for item in batch], dtype=torch.float32)
                loss = (per_item * sample_weights).sum() / sample_weights.sum().clamp_min(1e-6)
                loss.backward()
                torch.nn.utils.clip_grad_norm_(trainable, max_norm=1.0)
                optimizer.step()
                losses.append(float(loss.detach().item()))
                global_step = epoch * len(batches) + step
                if global_step % 50 == 0 or step == len(batches):
                    save_adapter(args.experiment_dir / "last-adapter.safetensors", model)
                    atomic_json(args.experiment_dir / "training-progress.json", {
                        "epoch": epoch + 1,
                        "step": global_step,
                        "stepsInEpoch": len(batches),
                        "meanLoss": sum(losses) / len(losses),
                        "elapsedSeconds": time.monotonic() - start,
                        "checkpoint": "last-adapter.safetensors",
                    })
                    print(f"epoch={epoch + 1}/{args.epochs} step={global_step}/{total_steps} loss={losses[-1]:.4f}", flush=True)
            calibration = evaluate(model, prepared["calibration"], pad_id, args.batch_size, device)
            score_values = [calibration[field]["macroF1"] for field in TRAIN_FIELDS if calibration[field]["macroF1"] is not None]
            score = sum(score_values) / len(score_values)
            epoch_result = {"epoch": epoch + 1, "meanTrainingLoss": sum(losses) / max(1, len(losses)),
                            "calibrationMeanFieldMacroF1": score, "calibration": calibration}
            history.append(epoch_result)
            if score > best_score + 1e-6:
                best_score, best_epoch = score, epoch + 1
                save_adapter(args.experiment_dir / "best-adapter.safetensors", model)
            atomic_json(args.experiment_dir / "epoch-metrics.json", {"epochs": history, "bestEpoch": best_epoch})
            print(f"epoch={epoch + 1} calibration_mean_macro_f1={score:.4f}", flush=True)

        model.eval()
        final_test = evaluate(model, prepared["test"], pad_id, args.batch_size, device)
        best_adapter = args.experiment_dir / "best-adapter.safetensors"
        if best_adapter.exists():
            best_state = load_file(str(best_adapter), device="cpu")
            model.load_state_dict(best_state, strict=False)
        else:
            # A candidate that does not beat base calibration must not be presented
            # as the selected model merely because it is the only trained epoch.
            model.load_state_dict(base_head_state, strict=False)
        best_test = evaluate(model, prepared["test"], pad_id, args.batch_size, device)
        final_report = {
            "syntheticOnly": True,
            "notEvidenceOfRealUserNeedAccuracy": True,
            "baseline": {"calibration": baseline_calibration, "test": baseline_test},
            "afterLastEpochTest": final_test,
            "bestCalibrationCheckpointTest": best_test,
            "selectedBestEpoch": best_epoch,
            "epochs": history,
            "elapsedSeconds": time.monotonic() - start,
        }
        atomic_json(args.experiment_dir / "evaluation.json", final_report)
        manifest["status"] = "pilot_complete"
        manifest["selectedBestEpoch"] = best_epoch
        manifest["completedAtUnix"] = time.time()
        manifest["result"] = "research-only adapter; not loadable or authorized for production"
        atomic_json(args.experiment_dir / "manifest.json", manifest)
        print(json.dumps({
            "status": manifest["status"],
            "experimentDir": str(args.experiment_dir),
            "trainableParameters": manifest["trainableParameters"],
            "baselineTestAccuracy": baseline_test["overall"]["accuracy"],
            "bestAdapterTestAccuracy": best_test["overall"]["accuracy"],
            "bestEpoch": best_epoch,
            "elapsedSeconds": final_report["elapsedSeconds"],
        }, ensure_ascii=False), flush=True)
    except KeyboardInterrupt:
        save_adapter(args.experiment_dir / "interrupted-adapter.safetensors", model)
        manifest["status"] = "interrupted"
        manifest["interruptedAtUnix"] = time.time()
        atomic_json(args.experiment_dir / "manifest.json", manifest)
        print("Training interrupted; adapter checkpoint preserved.", flush=True)
        return 130
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
