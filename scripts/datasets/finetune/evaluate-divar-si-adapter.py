#!/usr/bin/env python3
"""Compare a completed research-only Si checkpoint with its exact base model.

This evaluator reads the corrected Divar-derived corpus locally, uses the
calibration split only to fit per-field temperatures, and reports the untouched
test split by field, source category, and mapped source city. It never writes
text examples or authorizes production loading.
"""

from __future__ import annotations

import argparse
import collections
import hashlib
import importlib.util
import json
import math
import os
import time
from pathlib import Path
from typing import Any, Iterable


TRAINER_PATH = Path(__file__).with_name("train-divar-si-head-stream.py")
SPEC = importlib.util.spec_from_file_location("divar_si_head_stream_eval", TRAINER_PATH)
if SPEC is None or SPEC.loader is None:
    raise RuntimeError("Cannot load the pinned streaming Si trainer helpers.")
TRAINER = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(TRAINER)
BASE = TRAINER.BASE


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for block in iter(lambda: stream.read(8 * 1024 * 1024), b""):
            digest.update(block)
    return digest.hexdigest()


def question_schema_sha256(contract: dict[str, Any]) -> str:
    """Match the exact insertion-order serialization used by the trainer."""
    payload = json.dumps(contract, ensure_ascii=False, separators=(",", ":"), sort_keys=False)
    return hashlib.sha256(payload.encode()).hexdigest()


def expected_majorities(training_targets: dict[str, dict[str, int]]) -> dict[str, str]:
    return {
        field: max(counts, key=lambda label: (counts[label], label))
        for field, counts in training_targets.items()
        if counts
    }


def resolve_checkpoint_type(requested: str, experiment: dict[str, Any]) -> str:
    if requested not in {"auto", "adapter", "full-model"}:
        raise ValueError("Unsupported checkpoint type.")
    if requested != "auto":
        return requested
    return (
        "full-model"
        if str(experiment.get("architecture", "")).startswith("full-parameter")
        else "adapter"
    )


class Metrics:
    def __init__(self, bins: int = 15) -> None:
        self.bins = bins
        self.count = 0
        self.correct = 0
        self.majority_correct = 0
        self.brier_sum = 0.0
        self.gold_counts: collections.Counter[str] = collections.Counter()
        self.pred_counts: collections.Counter[str] = collections.Counter()
        self.confusion: dict[str, collections.Counter[str]] = collections.defaultdict(collections.Counter)
        self.bin_counts = [0] * bins
        self.bin_confidence = [0.0] * bins
        self.bin_accuracy = [0] * bins

    def add(self, gold: str, probabilities: list[float], choices: list[str], majority: str) -> None:
        if len(probabilities) != len(choices) or not choices:
            raise ValueError("Probability and choice dimensions do not match.")
        if gold not in choices:
            raise ValueError("A held-out target is missing from its Si question choices.")
        if (
            any(not math.isfinite(value) or value < 0 or value > 1 for value in probabilities)
            or abs(sum(probabilities) - 1.0) > 1e-4
        ):
            raise ValueError("Choice probabilities must be finite, in range, and sum to one.")
        predicted_index = max(range(len(probabilities)), key=probabilities.__getitem__)
        predicted = choices[predicted_index]
        confidence = probabilities[predicted_index]
        if not math.isfinite(confidence) or confidence < 0 or confidence > 1:
            raise ValueError("The model produced a non-finite or invalid confidence.")

        self.count += 1
        self.correct += predicted == gold
        self.majority_correct += majority == gold
        self.gold_counts[gold] += 1
        self.pred_counts[predicted] += 1
        self.confusion[gold][predicted] += 1
        gold_index = choices.index(gold)
        self.brier_sum += sum(
            (probability - (1.0 if index == gold_index else 0.0)) ** 2
            for index, probability in enumerate(probabilities)
        ) / len(choices)

        bin_index = min(self.bins - 1, int(confidence * self.bins))
        self.bin_counts[bin_index] += 1
        self.bin_confidence[bin_index] += confidence
        self.bin_accuracy[bin_index] += predicted == gold

    def result(self) -> dict[str, Any]:
        if not self.count:
            return {"decisions": 0}
        supported_labels = sorted(self.gold_counts)
        class_metrics: dict[str, Any] = {}
        f1_values: list[float] = []
        recalls: list[float] = []
        weighted_f1 = 0.0
        for label in supported_labels:
            tp = self.confusion[label][label]
            fp = sum(count for gold, predictions in self.confusion.items()
                     if gold != label for predicted, count in predictions.items() if predicted == label)
            fn = sum(count for predicted, count in self.confusion[label].items() if predicted != label)
            support = self.gold_counts[label]
            precision = tp / (tp + fp) if tp + fp else 0.0
            recall = tp / support if support else 0.0
            f1 = (2 * precision * recall / (precision + recall)) if precision + recall else 0.0
            class_metrics[label] = {
                "support": support,
                "precision": precision,
                "recall": recall,
                "f1": f1,
            }
            f1_values.append(f1)
            recalls.append(recall)
            weighted_f1 += support * f1

        unknown_support = self.gold_counts.get("unknown", 0)
        known_support = self.count - unknown_support
        unknown_recall = (
            self.confusion["unknown"].get("unknown", 0) / unknown_support
            if unknown_support else None
        )
        unknown_false_positive_rate = (
            sum(count for gold, predictions in self.confusion.items() if gold != "unknown"
                for predicted, count in predictions.items() if predicted == "unknown") / known_support
            if known_support else None
        )
        ece = sum(
            self.bin_counts[index] / self.count
            * abs(self.bin_accuracy[index] / self.bin_counts[index]
                  - self.bin_confidence[index] / self.bin_counts[index])
            for index in range(self.bins) if self.bin_counts[index]
        )
        return {
            "decisions": self.count,
            "accuracy": self.correct / self.count,
            "globalTrainingMajorityAccuracy": self.majority_correct / self.count,
            "macroF1SupportedGoldClasses": sum(f1_values) / len(f1_values),
            "balancedAccuracySupportedGoldClasses": sum(recalls) / len(recalls),
            "weightedF1": weighted_f1 / self.count,
            "multiclassBrierPerChoice": self.brier_sum / self.count,
            "topLabelECE": ece,
            "unknownRecall": unknown_recall,
            "unknownFalsePositiveRate": unknown_false_positive_rate,
            "unknownPredictionRate": self.pred_counts.get("unknown", 0) / self.count,
            "classes": class_metrics,
        }


def add_observation(
    groups: dict[tuple[str, str, str], Metrics],
    field: str,
    row: dict[str, Any],
    gold: str,
    probabilities: list[float],
    choices: list[str],
    majority: str,
) -> None:
    category = str(row["hypotheticalNeed"]["targetDecisions"]["category_candidate"]["value"])
    location = row["hypotheticalNeed"].get("sourceOfferLocation") or {}
    city = str(location.get("appCitySlug") or "unknown")
    groups[(field, "all", "all")].add(gold, probabilities, choices, majority)
    groups[(field, "category", category)].add(gold, probabilities, choices, majority)
    groups[(field, "city", city)].add(gold, probabilities, choices, majority)


def collect_calibration_logits(
    model: Any,
    rows: list[dict[str, Any]],
    contract: dict[str, Any],
    tokenizer: Any,
    qtypes: dict[str, int],
    max_len: int,
    head_max_len: int,
    pad_id: int,
    batch_size: int,
    device: Any,
    torch: Any,
) -> dict[str, tuple[list[list[float]], list[int]]]:
    from si.common import collate_items

    logits_by_field: dict[str, list[list[float]]] = collections.defaultdict(list)
    labels_by_field: dict[str, list[int]] = collections.defaultdict(list)
    items = (item for row in rows for item in TRAINER.make_row_items(
        row, contract, tokenizer, qtypes, max_len, head_max_len,
    ))
    model.eval()
    with torch.inference_mode():
        for batch in TRAINER.batch_iter(items, batch_size, shuffle=False, seed=0, shuffle_buffer=0):
            packed = collate_items([[item] for item in batch], pad_id)
            logits, _ = model(
                packed["input_ids"].to(device), packed["attention_mask"].to(device),
                packed["marker_pos"].to(device), packed["marker_mask"].to(device),
                packed["qtype"].to(device),
            )
            cpu_logits = logits.detach().float().cpu()
            for index, item in enumerate(batch):
                count = len(item["choices"])
                logits_by_field[item["field"]].append(cpu_logits[index, :count].tolist())
                labels_by_field[item["field"]].append(int(item["label"]))
    return {
        field: (logits_by_field[field], labels_by_field[field])
        for field in TRAINER.TRAIN_FIELDS
    }


def fit_temperatures(calibration: dict[str, tuple[list[list[float]], list[int]]], torch: Any) -> dict[str, float]:
    import torch.nn.functional as functional

    temperatures: dict[str, float] = {}
    for field, (rows, labels) in calibration.items():
        if not rows:
            temperatures[field] = 1.0
            continue
        logits = torch.tensor(rows, dtype=torch.float32, device="cpu")
        targets = torch.tensor(labels, dtype=torch.long, device="cpu")
        log_temperature = torch.zeros((), dtype=torch.float32, requires_grad=True)
        optimizer = torch.optim.LBFGS([log_temperature], lr=0.2, max_iter=80, line_search_fn="strong_wolfe")

        def closure() -> Any:
            optimizer.zero_grad()
            temperature = log_temperature.exp().clamp(0.05, 20.0)
            loss = functional.cross_entropy(logits / temperature, targets)
            loss.backward()
            return loss

        optimizer.step(closure)
        temperatures[field] = float(log_temperature.detach().exp().clamp(0.05, 20.0).item())
    return temperatures


def evaluate_split(
    model: Any,
    rows: list[dict[str, Any]],
    contract: dict[str, Any],
    tokenizer: Any,
    qtypes: dict[str, int],
    max_len: int,
    head_max_len: int,
    pad_id: int,
    batch_size: int,
    device: Any,
    torch: Any,
    majority_by_field: dict[str, str],
    temperatures: dict[str, float],
) -> dict[str, Any]:
    from si.common import collate_items

    raw_groups: dict[tuple[str, str, str], Metrics] = collections.defaultdict(Metrics)
    calibrated_groups: dict[tuple[str, str, str], Metrics] = collections.defaultdict(Metrics)
    items = (
        (item, row)
        for row in rows
        for item in TRAINER.make_row_items(row, contract, tokenizer, qtypes, max_len, head_max_len)
    )

    def item_batches() -> Iterable[list[tuple[dict[str, Any], dict[str, Any]]]]:
        batch: list[tuple[dict[str, Any], dict[str, Any]]] = []
        for pair in items:
            batch.append(pair)
            if len(batch) >= batch_size:
                yield batch
                batch = []
        if batch:
            yield batch

    model.eval()
    with torch.inference_mode():
        for pairs in item_batches():
            batch = [pair[0] for pair in pairs]
            batch_rows = [pair[1] for pair in pairs]
            packed = collate_items([[item] for item in batch], pad_id)
            logits, _ = model(
                packed["input_ids"].to(device), packed["attention_mask"].to(device),
                packed["marker_pos"].to(device), packed["marker_mask"].to(device),
                packed["qtype"].to(device),
            )
            cpu_logits = logits.detach().float().cpu()
            for index, item in enumerate(batch):
                count = len(item["choices"])
                valid_logits = cpu_logits[index, :count]
                raw_probs = torch.softmax(valid_logits, dim=-1).tolist()
                calibrated_probs = torch.softmax(
                    valid_logits / temperatures.get(item["field"], 1.0), dim=-1,
                ).tolist()
                majority = majority_by_field[item["field"]]
                add_observation(raw_groups, item["field"], batch_rows[index], item["gold"],
                                raw_probs, item["choices"], majority)
                add_observation(calibrated_groups, item["field"], batch_rows[index], item["gold"],
                                calibrated_probs, item["choices"], majority)

    def serialize(groups: dict[tuple[str, str, str], Metrics]) -> dict[str, Any]:
        result: dict[str, Any] = {"byField": {}, "byCategory": {}, "byCity": {}}
        for (field, dimension, value), metric in groups.items():
            if dimension == "all":
                result["byField"][field] = metric.result()
            elif dimension == "category":
                result["byCategory"].setdefault(value, {})[field] = metric.result()
            else:
                result["byCity"].setdefault(value, {})[field] = metric.result()
        return result

    return {"raw": serialize(raw_groups), "temperatureCalibrated": serialize(calibrated_groups)}


def require_completed_run(experiment: dict[str, Any], data_manifest: dict[str, Any], checkpoint_path: Path) -> None:
    if (
        experiment.get("status") != "research_run_complete"
        or experiment.get("productionLoadAllowed") is not False
        or experiment.get("experimentOnly") is not True
        or experiment.get("syntheticTrainingAuthorized") is not True
        or experiment.get("syntheticTargetsAreRealNeedGroundTruth") is not False
        or experiment.get("dataSha256") != data_manifest.get("outputSha256")
        or experiment.get("baseWeightsSha256") != BASE.MODEL_WEIGHT_SHA256
        or experiment.get("model") != BASE.MODEL_ID
        or experiment.get("modelRevision") != BASE.MODEL_REVISION
        or not checkpoint_path.is_file()
    ):
        raise ValueError("The run is incomplete or its selected checkpoint is not bound to the expected synthetic corpus/base model.")


def require_running_checkpoint(
    experiment: dict[str, Any],
    data_manifest: dict[str, Any],
    adapter_path: Path,
    progress: dict[str, Any],
) -> None:
    """Allow explicit research-only evaluation of a stable `last-adapter` checkpoint."""
    step = progress.get("step")
    total_steps = progress.get("totalSteps")
    mean_loss = progress.get("meanLoss")
    if (
        experiment.get("status") != "running"
        or experiment.get("productionLoadAllowed") is not False
        or experiment.get("experimentOnly") is not True
        or experiment.get("syntheticTrainingAuthorized") is not True
        or experiment.get("syntheticTargetsAreRealNeedGroundTruth") is not False
        or experiment.get("dataSha256") != data_manifest.get("outputSha256")
        or experiment.get("baseWeightsSha256") != BASE.MODEL_WEIGHT_SHA256
        or experiment.get("model") != BASE.MODEL_ID
        or experiment.get("modelRevision") != BASE.MODEL_REVISION
        or progress.get("checkpoint") != "last-adapter.safetensors"
        or adapter_path.name != "last-adapter.safetensors"
        or not isinstance(step, int)
        or not isinstance(total_steps, int)
        or step < 1
        or total_steps <= step
        or (mean_loss is not None and not math.isfinite(float(mean_loss)))
        or not adapter_path.is_file()
    ):
        raise ValueError("The running checkpoint is incomplete or not bound to the expected research corpus/model.")


def file_fingerprint(path: Path) -> tuple[int, int, int, int, str]:
    stat = path.stat()
    return (stat.st_dev, stat.st_ino, stat.st_size, stat.st_mtime_ns, sha256_file(path))


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--input", type=Path, required=True)
    parser.add_argument("--manifest", type=Path, required=True)
    parser.add_argument("--model-dir", type=Path, required=True)
    parser.add_argument("--experiment-dir", type=Path, required=True)
    parser.add_argument("--output", type=Path)
    parser.add_argument(
        "--allow-running-checkpoint", action="store_true",
        help="Explicitly evaluate the current legacy last-adapter checkpoint as research-only; never marks the run complete.",
    )
    parser.add_argument(
        "--checkpoint-type", choices=("auto", "adapter", "full-model"), default="auto",
        help="Use the completed run's full model or a legacy typed-head adapter.",
    )
    parser.add_argument("--device", choices=("cpu", "mps"), default="mps")
    parser.add_argument("--calibration-row-limit", type=int, default=5_000)
    parser.add_argument("--test-row-limit", type=int, default=0,
                        help="Zero evaluates every held-out test row; otherwise uses a deterministic hash-uniform sample.")
    parser.add_argument("--batch-size", type=int, default=32)
    parser.add_argument("--threads", type=int, default=8)
    parser.add_argument("--seed", type=int, default=4172026)
    args = parser.parse_args()
    if args.calibration_row_limit < 1 or args.test_row_limit < 0 or args.batch_size < 1 or args.threads < 1:
        raise SystemExit("Evaluation sample limits, batch size, and thread count are invalid.")

    os.environ["HF_HUB_OFFLINE"] = "1"
    os.environ["TRANSFORMERS_OFFLINE"] = "1"
    os.environ["TOKENIZERS_PARALLELISM"] = "false"

    import torch
    from safetensors.torch import load_file
    from transformers import AutoTokenizer
    from si.common import QTYPES, build_model

    torch.set_num_threads(args.threads)
    torch.manual_seed(args.seed)
    device = TRAINER.resolve_device(torch, args.device)
    input_path = args.input.expanduser().resolve(strict=True)
    corpus_manifest_path = args.manifest.expanduser().resolve(strict=True)
    model_dir = args.model_dir.expanduser().resolve(strict=True)
    experiment_dir = args.experiment_dir.expanduser().resolve(strict=True)
    experiment = json.loads((experiment_dir / "manifest.json").read_text(encoding="utf-8"))
    corpus_manifest = json.loads(corpus_manifest_path.read_text(encoding="utf-8"))
    checkpoint_type = resolve_checkpoint_type(args.checkpoint_type, experiment)
    progress_path = experiment_dir / "training-progress.json"
    progress_snapshot: dict[str, Any] | None = None
    if args.allow_running_checkpoint:
        if checkpoint_type != "adapter":
            raise ValueError("Only the explicitly supported legacy adapter format can be read while training is active.")
        progress_snapshot = json.loads(progress_path.read_text(encoding="utf-8"))
        checkpoint_path = experiment_dir / "last-adapter.safetensors"
        require_running_checkpoint(experiment, corpus_manifest, checkpoint_path, progress_snapshot)
    else:
        checkpoint_path = experiment_dir / (
            "model.safetensors" if checkpoint_type == "full-model" else "best-adapter.safetensors"
        )
        require_completed_run(experiment, corpus_manifest, checkpoint_path)

    if (
        corpus_manifest.get("outputSha256") != sha256_file(input_path)
        or corpus_manifest.get("outputBytes") != input_path.stat().st_size
        or corpus_manifest.get("exactNormalizedStateGroupsDisjoint") is not True
    ):
        raise ValueError("The corrected corpus no longer matches its manifest hash/size/split guarantee.")
    weights_path = model_dir / "model.safetensors"
    if sha256_file(weights_path) != BASE.MODEL_WEIGHT_SHA256:
        raise ValueError("The local base checkpoint is not the exact approved multilingual revision.")

    _, contract = BASE.question_manifest(corpus_manifest_path)
    contract_hash = question_schema_sha256(contract)
    if contract_hash != experiment.get("questionSchemaSha256"):
        raise ValueError("The question contract differs from the completed training run.")
    data_summary = TRAINER.validate_corpus(
        input_path, contract, contract_hash, corpus_manifest.get("taskType", BASE.DATA_TASK),
    )
    if data_summary.get("rowsBySplit") != corpus_manifest.get("trainingSplitCounts"):
        raise ValueError("The full corpus split counts differ from the current manifest.")

    calibration_rows = TRAINER.select_rows(
        input_path, "calibration", args.calibration_row_limit,
    )
    if args.test_row_limit:
        test_rows = TRAINER.select_rows(input_path, "test", args.test_row_limit)
    else:
        test_rows = [
            row for row in TRAINER.iter_jsonl(input_path)
            if row["hypotheticalNeed"]["trainingSplit"] == "test"
        ]
    if not calibration_rows or not test_rows:
        raise ValueError("Calibration and test partitions must both contain rows.")

    base_config_path = model_dir / "rl_agent_config.json"
    experiment_config_path = experiment_dir / "rl_agent_config.json"
    tokenizer_dir = model_dir / "tokenizer"
    encoder_dir = model_dir / "encoder"
    tokenizer = AutoTokenizer.from_pretrained(str(tokenizer_dir), local_files_only=True, trust_remote_code=False)
    config_path = experiment_config_path if checkpoint_type == "full-model" else base_config_path
    config = json.loads(config_path.read_text(encoding="utf-8"))
    model = build_model(config, encoder_dir=str(encoder_dir), pretrained=False)
    base_state = load_file(str(weights_path), device="cpu")
    model.load_state_dict(base_state, strict=True)
    checkpoint_fingerprint_before = file_fingerprint(checkpoint_path)
    checkpoint = load_file(str(checkpoint_path), device="cpu")
    if args.allow_running_checkpoint:
        checkpoint_fingerprint_after = file_fingerprint(checkpoint_path)
        progress_after = json.loads(progress_path.read_text(encoding="utf-8"))
        if checkpoint_fingerprint_after != checkpoint_fingerprint_before or progress_after != progress_snapshot:
            raise RuntimeError("The training checkpoint changed during evaluation setup; retry after the next checkpoint is written.")
    state_dict = model.state_dict()
    if checkpoint_type == "full-model":
        if set(checkpoint) != set(state_dict):
            raise ValueError("The full-model checkpoint tensor names do not exactly match the pinned Si architecture.")
        for name, tensor in checkpoint.items():
            if tensor.shape != state_dict[name].shape or not torch.isfinite(tensor).all():
                raise ValueError(f"Full-model checkpoint tensor shape or values are invalid: {name}")
    else:
        trainable_names = {
            name for name, parameter in model.named_parameters()
            if name.startswith(("head.", "type_emb.", "scorer."))
        }
        if set(checkpoint) != trainable_names:
            raise ValueError("Selected adapter tensor names do not exactly match the research head scope.")
        for name, tensor in checkpoint.items():
            if tensor.shape != state_dict[name].shape or not torch.isfinite(tensor).all():
                raise ValueError(f"Adapter tensor shape or values are invalid: {name}")

    model.to(device)
    for parameter in model.parameters():
        parameter.requires_grad_(False)
    model.eval()
    max_len = int(config.get("max_len", 512))
    head_max_len = int(config.get("head_max_len", 256))
    pad_id = tokenizer.pad_token_id
    if pad_id is None:
        raise ValueError("The exact local Si tokenizer has no pad token.")

    started = time.monotonic()
    models: dict[str, dict[str, Any]] = {}
    selected_label = "selected_full_model" if checkpoint_type == "full-model" else "selected_adapter"
    for label, state in (("base", None), (selected_label, checkpoint)):
        model.load_state_dict(base_state, strict=True)
        if state is not None:
            model.load_state_dict(state, strict=checkpoint_type == "full-model")
        calibration_logits = collect_calibration_logits(
            model, calibration_rows, contract, tokenizer, QTYPES, max_len, head_max_len,
            pad_id, args.batch_size, device, torch,
        )
        temperatures = fit_temperatures(calibration_logits, torch)
        split_metrics = evaluate_split(
            model, test_rows, contract, tokenizer, QTYPES, max_len, head_max_len,
            pad_id, args.batch_size, device, torch,
            expected_majorities(data_summary["trainingTargetsByField"]), temperatures,
        )
        models[label] = {
            "temperaturesFitOnCalibrationOnly": temperatures,
            "test": split_metrics,
        }

    result = {
        "schemaVersion": 1,
        "model": BASE.MODEL_ID,
        "modelRevision": BASE.MODEL_REVISION,
        "baseWeightsSha256": BASE.MODEL_WEIGHT_SHA256,
        "checkpointSha256": checkpoint_fingerprint_before[4],
        "checkpointFile": checkpoint_path.name,
        "checkpointType": checkpoint_type,
        "checkpointStep": progress_snapshot.get("step") if progress_snapshot else None,
        "checkpointTotalSteps": progress_snapshot.get("totalSteps") if progress_snapshot else None,
        "checkpointMeanTrainingLoss": progress_snapshot.get("meanLoss") if progress_snapshot else None,
        "dataSha256": corpus_manifest["outputSha256"],
        "questionSchemaSha256": contract_hash,
        "status": "research_evaluation_only",
        "productionLoadAllowed": False,
        "syntheticOnly": True,
        "realUserNeedAccuracyEstablished": False,
        "targetScope": "Divar supply-derived deterministic hypothetical labels only",
        "device": device.type,
        "calibrationRows": len(calibration_rows),
        "testRows": len(test_rows),
        "testCoverage": "all deterministic held-out rows" if args.test_row_limit == 0 else "bounded deterministic hash-uniform sample",
        "trainingMajorityBaseline": expected_majorities(data_summary["trainingTargetsByField"]),
        "models": models,
        "elapsedSeconds": time.monotonic() - started,
    }
    output_path = args.output or experiment_dir / "evaluation-detailed.json"
    if output_path.exists():
        raise FileExistsError(f"Refusing to overwrite an existing evaluation artifact: {output_path}")
    BASE.atomic_json(output_path, result)
    print(json.dumps({"status": result["status"], "output": str(output_path),
                      "device": device.type, "calibrationRows": len(calibration_rows),
                      "testRows": len(test_rows), "elapsedSeconds": result["elapsedSeconds"]},
                     ensure_ascii=False, indent=2))
    del model, base_state, checkpoint
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
