#!/usr/bin/env python3
"""Research-only RLCD fine-tuning for city-scoped neighborhood choice/abstention."""

from __future__ import annotations

import argparse
import collections
import hashlib
import importlib.util
import json
import math
import os
import random
import shutil
import time
from pathlib import Path
from typing import Any, Iterator


HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[2]
RLCD_PATH = HERE / "train-divar-si-rlcd.py"
RLCD_SPEC = importlib.util.spec_from_file_location("divar_si_rlcd_shared", RLCD_PATH)
if RLCD_SPEC is None or RLCD_SPEC.loader is None:
    raise RuntimeError("Cannot load the reviewed local Si RLCD helpers.")
RLCD = importlib.util.module_from_spec(RLCD_SPEC)
RLCD_SPEC.loader.exec_module(RLCD)
BENCHMARK_PATH = HERE / "benchmark-divar-neighborhood-si.py"
BENCHMARK_SPEC = importlib.util.spec_from_file_location("divar_neighborhood_benchmark_shared", BENCHMARK_PATH)
if BENCHMARK_SPEC is None or BENCHMARK_SPEC.loader is None:
    raise RuntimeError("Cannot load the reviewed neighborhood benchmark metrics.")
BENCHMARK = importlib.util.module_from_spec(BENCHMARK_SPEC)
BENCHMARK_SPEC.loader.exec_module(BENCHMARK)

HELPERS = RLCD.HELPERS
TASK_TYPE = "divar-neighborhood-choice-shadow/v2"
FIELD = "neighborhood_candidate"
EXPECTED_SI_VERSION = "0.3.20"
EXPECTED_MODEL_ID = "convaiinnovations/si-multilingual"
EXPECTED_MODEL_REVISION = "e4e9ddf21a7b1903b7acffd8814ad4307bf63a67"
EXPECTED_SOURCE_DATASET_SHA256 = "e5760fe1325a195e6682c371457bfecd51d255c518756e3cbea234b8163a801f"


def read_json(path: Path) -> dict[str, Any]:
    value = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(value, dict):
        raise ValueError(f"Expected a JSON object in {path.name}.")
    return value


def iter_jsonl(path: Path) -> Iterator[dict[str, Any]]:
    with path.open(encoding="utf-8") as stream:
        for line_number, line in enumerate(stream, 1):
            if not line.strip():
                continue
            try:
                value = json.loads(line)
            except json.JSONDecodeError as exc:
                raise ValueError(f"Invalid JSONL at line {line_number}.") from exc
            if not isinstance(value, dict):
                raise ValueError(f"Expected an object at line {line_number}.")
            yield value


def validate_row(row: dict[str, Any], line_number: int) -> tuple[str, str, str, int] | None:
    if row.get("taskType") != TASK_TYPE or row.get("schemaVersion") != 2:
        raise ValueError(f"Unexpected neighborhood task schema at line {line_number}.")
    provenance = row.get("provenance")
    if (
        not isinstance(provenance, dict)
        or provenance.get("realNeedGroundTruth") is not False
        or provenance.get("trainingEligible") is not False
        or provenance.get("cloudTransferAllowed") is not False
        or provenance.get("sourceTextSynthetic") is not False
        or provenance.get("humanReviewed") is not False
    ):
        raise ValueError(f"A neighborhood row lost its research-only provenance at line {line_number}.")
    source = row.get("source")
    if (
        not isinstance(source, dict)
        or source.get("dataset") != "divarofficial/real_estate_ads"
        or source.get("datasetSha256") != EXPECTED_SOURCE_DATASET_SHA256
        or source.get("perspective") != "seller_or_agent_supply_offer"
        or source.get("offerNeighborhoodMatch") != "exact_official_crosswalk"
        or source.get("split") not in {"train", "calibration", "test"}
        or not isinstance(source.get("normalizedTextGroupSha256"), str)
        or len(source["normalizedTextGroupSha256"]) != 64
        or not isinstance(source.get("rowOrdinal"), int)
        or isinstance(source.get("rowOrdinal"), bool)
        or source["rowOrdinal"] < 0
    ):
        raise ValueError(f"Invalid city/geotag source provenance at line {line_number}.")
    state = row.get("state")
    if (
        not isinstance(state, dict)
        or not isinstance(state.get("text"), str)
        or not state["text"].strip()
        or len(state["text"]) > 20_000
    ):
        raise ValueError(f"Invalid source text at line {line_number}.")
    context = state.get("context")
    if not isinstance(context, dict) or not isinstance(context.get("city"), str) or not context["city"]:
        raise ValueError(f"Missing selected-city context at line {line_number}.")
    neighborhoods = context.get("neighborhood_candidates")
    if not isinstance(neighborhoods, list) or not 2 <= len(neighborhoods) <= 8:
        raise ValueError(f"Expected 2-8 bounded neighborhood candidates at line {line_number}.")
    candidate_ids: list[str] = []
    for candidate in neighborhoods:
        if not isinstance(candidate, dict) or not isinstance(candidate.get("slug"), str) or not isinstance(candidate.get("name"), str):
            raise ValueError(f"Invalid city-scoped candidate at line {line_number}.")
        if candidate["slug"] == "unknown" or not candidate["slug"] or not candidate["name"]:
            raise ValueError(f"Invalid or reserved city-scoped candidate at line {line_number}.")
        candidate_ids.append(candidate["slug"])
    if len(set(candidate_ids)) != len(candidate_ids):
        raise ValueError(f"Duplicate neighborhood candidates at line {line_number}.")
    questions = row.get("questions")
    if not isinstance(questions, dict) or set(questions) != {FIELD}:
        raise ValueError(f"Unexpected question fields at line {line_number}.")
    question = questions[FIELD]
    criteria = question.get("criteria") if isinstance(question, dict) else None
    if (
        not isinstance(question, dict)
        or question.get("type") != "choice"
        or not isinstance(question.get("instructions"), str)
        or not isinstance(criteria, dict)
        or set(criteria) != {*candidate_ids, "unknown"}
    ):
        raise ValueError(f"Invalid Si choice contract at line {line_number}.")
    target_map = row.get("targetDecisions")
    target = target_map.get(FIELD) if isinstance(target_map, dict) else None
    if not isinstance(target, dict) or target.get("value") not in criteria:
        raise ValueError(f"Neighborhood target is not a listed candidate or unknown at line {line_number}.")
    label_kind = provenance.get("labelKind")
    expected_kind = "weak_unknown_no_catalog_match" if target["value"] == "unknown" else "weak_positive_text_grounded"
    if label_kind != expected_kind:
        raise ValueError(f"Neighborhood weak-label provenance disagrees with target at line {line_number}.")
    if target["value"] != "unknown" and target["value"] not in candidate_ids:
        raise ValueError(f"A positive neighborhood target is not in the bounded candidate list at line {line_number}.")
    return source["split"], context["city"], target["value"], len(candidate_ids)


def validate_corpus(
    input_path: Path, manifest_path: Path, expected_sha256: str, expected_rows: int,
) -> tuple[dict[str, Any], list[dict[str, Any]]]:
    manifest = read_json(manifest_path)
    if (
        manifest.get("status") != "complete_shadow_only"
        or manifest.get("taskType") != TASK_TYPE
        or manifest.get("sourcePerspective") != "seller_or_agent_supply_offer_not_seeker_demand"
        or manifest.get("outputRows") != expected_rows
        or manifest.get("outputSha256") != expected_sha256
        or manifest.get("provenance", {}).get("realNeedGroundTruth") is not False
        or manifest.get("provenance", {}).get("humanReviewed") is not False
        or manifest.get("provenance", {}).get("trainingEligible") is not False
        or manifest.get("provenance", {}).get("siPredictionsUsedAsLabels") is not False
        or manifest.get("provenance", {}).get("cloudTransferAllowed") is not False
        or manifest.get("outputBytes") != input_path.stat().st_size
        or HELPERS.BASE.sha256_file(input_path) != expected_sha256
    ):
        raise ValueError("Neighborhood training input is not the pinned weak-label, local-only corpus.")
    rows: list[dict[str, Any]] = []
    group_splits: dict[str, str] = {}
    ids: set[str] = set()
    by_split: collections.Counter[str] = collections.Counter()
    by_city: collections.Counter[str] = collections.Counter()
    by_label: collections.Counter[str] = collections.Counter()
    for line_number, row in enumerate(iter_jsonl(input_path), 1):
        split_info = validate_row(row, line_number)
        if split_info is None:
            continue
        split, city, target, _candidate_count = split_info
        source = row["source"]
        group = source["normalizedTextGroupSha256"]
        previous = group_splits.get(group)
        if previous is not None:
            raise ValueError("A normalized source text repeats or crosses partitions.")
        group_splits[group] = split
        example_id = row.get("exampleId")
        if not isinstance(example_id, str) or example_id in ids:
            raise ValueError("Missing or duplicate neighborhood example id.")
        ids.add(example_id)
        by_split[split] += 1
        by_city[city] += 1
        by_label[target] += 1
        rows.append(row)
    if len(rows) != expected_rows or len(rows) != manifest.get("outputRows"):
        raise ValueError("Neighborhood row count does not match the pinned dataset contract.")
    if any(by_split[split] == 0 for split in ("train", "calibration", "test")):
        raise ValueError("Train, calibration and test partitions must all be non-empty.")
    split_labels: dict[str, collections.Counter[str]] = collections.defaultdict(collections.Counter)
    for row in rows:
        split_labels[row["source"]["split"]][row["targetDecisions"][FIELD]["value"]] += 1
    for split in ("train", "calibration", "test"):
        if split_labels[split]["unknown"] == 0:
            raise ValueError(f"The abstention/unknown target must be represented in the {split} partition.")
        if sum(count for label, count in split_labels[split].items() if label != "unknown") == 0:
            raise ValueError(f"The {split} partition must include text-grounded neighborhood candidates.")
    return {
        "rows": len(rows),
        "rowsBySplit": dict(by_split),
        "rowsByCity": dict(by_city),
        "rowsByTarget": dict(by_label),
        "rowsByTargetAndSplit": {split: dict(counts) for split, counts in split_labels.items()},
        "sourceGroups": len(group_splits),
    }, rows


def to_si_question(question: dict[str, Any]) -> dict[str, Any]:
    return {"t": "choice", "ins": question["instructions"], "crit": question["criteria"]}


def make_item(
    row: dict[str, Any], tokenizer: Any, qtypes: dict[str, int],
    max_len: int, head_max_len: int, *, seed: int | None = None, epoch: int = 0,
) -> dict[str, Any]:
    from si.common import build_sequence, render_options, serialize_state

    question = to_si_question(row["questions"][FIELD])
    if seed is not None:
        selected = RLCD.selected_contract({FIELD: question}, row, seed, epoch)
        question = selected[FIELD]
    choices = list(question["crit"].keys())
    target = row["targetDecisions"][FIELD]["value"]
    if target not in choices:
        raise ValueError("Option shuffle dropped the reviewed target.")
    state = row["state"]
    state_ids = tokenizer(serialize_state(state).replace(tokenizer.mask_token, " "), add_special_tokens=False)["input_ids"]
    ids, markers = build_sequence(
        tokenizer, state, question, max_len=max_len, head_max_len=head_max_len,
        state_ids=state_ids,
    )
    if len(markers) != len(render_options(question)) or not 2 <= len(markers) <= 9:
        raise ValueError("The neighborhood question does not fit the reviewed Si head budget.")
    return {
        "ids": ids,
        "markers": markers,
        "qtype": qtypes["choice"],
        "label": choices.index(target),
        "choices": choices,
        "target": target,
        "city": state["context"]["city"],
        "candidateCount": len(state["context"]["neighborhood_candidates"]),
        "exampleId": row["exampleId"],
    }


def batch_items(items: list[dict[str, Any]], batch_size: int) -> Iterator[list[dict[str, Any]]]:
    for start in range(0, len(items), batch_size):
        yield items[start:start + batch_size]


def select_pilot_rows(rows: list[dict[str, Any]], limit: int) -> list[dict[str, Any]]:
    if limit < 2:
        raise ValueError("A neighborhood pilot needs at least two rows to include positive and unknown targets.")
    positive = [row for row in rows if row["targetDecisions"][FIELD]["value"] != "unknown"]
    unknown = [row for row in rows if row["targetDecisions"][FIELD]["value"] == "unknown"]
    if not positive or not unknown:
        raise ValueError("A neighborhood pilot requires both text-grounded and unknown targets.")

    def rank(row: dict[str, Any]) -> bytes:
        value = f"{row['source']['normalizedTextGroupSha256']}:{row['exampleId']}:pilot"
        return hashlib.sha256(value.encode()).digest()

    selected = [min(positive, key=rank), min(unknown, key=rank)]
    selected_ids = {row["exampleId"] for row in selected}
    remaining = [row for row in rows if row["exampleId"] not in selected_ids]
    selected.extend(sorted(remaining, key=rank)[: limit - len(selected)])
    return selected


def infer_records(
    model: Any, rows: list[dict[str, Any]], tokenizer: Any, qtypes: dict[str, int],
    max_len: int, head_max_len: int, batch_size: int, device: Any, torch: Any,
) -> tuple[list[dict[str, Any]], dict[str, tuple[list[list[float]], list[int]]]]:
    from si.common import collate_items, temp_bucket

    records: list[dict[str, Any]] = []
    grouped_logits: dict[str, tuple[list[list[float]], list[int]]] = {}
    model.eval()
    with torch.inference_mode():
        for row_batch in batch_items(rows, batch_size):
            batch = [make_item(row, tokenizer, qtypes, max_len, head_max_len) for row in row_batch]
            packed = collate_items([[item] for item in batch], tokenizer.pad_token_id)
            logits, _ = model(
                packed["input_ids"].to(device), packed["attention_mask"].to(device),
                packed["marker_pos"].to(device), packed["marker_mask"].to(device),
                packed["qtype"].to(device),
            )
            values = logits.detach().float().cpu()
            for index, item in enumerate(batch):
                count = len(item["choices"])
                raw_logits = values[index, :count].tolist()
                bucket = temp_bucket(int(item["qtype"]), count)
                logits_list, labels = grouped_logits.setdefault(bucket, ([], []))
                logits_list.append(raw_logits)
                labels.append(int(item["label"]))
                records.append({
                    "logits": raw_logits,
                    "choices": item["choices"],
                    "target": item["target"],
                    "city": item["city"],
                    "candidateCount": item["candidateCount"],
                    "exampleId": item["exampleId"],
                    "bucket": bucket,
                })
    return records, grouped_logits


def metrics_for(
    raw_records: list[dict[str, Any]], temperatures: dict[str, float] | None = None,
) -> dict[str, Any]:
    temperatures = temperatures or {}
    scored = []
    for item in raw_records:
        logits = item["logits"]
        temperature = max(0.5, min(5.0, float(temperatures.get(item["bucket"], 1.0))))
        scaled = [value / temperature for value in logits]
        maximum = max(scaled)
        exp_values = [math.exp(value - maximum) for value in scaled]
        denominator = sum(exp_values)
        probabilities = [value / denominator for value in exp_values]
        prediction = item["choices"][max(range(len(probabilities)), key=probabilities.__getitem__)]
        scored.append({
            "target": item["target"],
            "prediction": prediction,
            "city": item["city"],
            "candidateCount": item["candidateCount"],
            "confidence": max(probabilities),
            "correct": prediction == item["target"],
        })
    summary = BENCHMARK.score_rows(scored)
    unknown_true_positives = sum(row["target"] == "unknown" and row["prediction"] == "unknown" for row in scored)
    unknown_target_count = sum(row["target"] == "unknown" for row in scored)
    unknown_prediction_count = sum(row["prediction"] == "unknown" for row in scored)
    positive_rows = [row for row in scored if row["target"] != "unknown"]
    sorted_confidence = sorted(scored, key=lambda row: row["confidence"])
    # Equal-frequency bins avoid arbitrary confidence cutoffs on this weak-label set.
    ece = 0.0
    bin_count = min(10, len(sorted_confidence))
    if bin_count:
        for bin_index in range(bin_count):
            start = bin_index * len(sorted_confidence) // bin_count
            end = (bin_index + 1) * len(sorted_confidence) // bin_count
            group = sorted_confidence[start:end]
            if group:
                mean_confidence = sum(row["confidence"] for row in group) / len(group)
                mean_accuracy = sum(row["correct"] for row in group) / len(group)
                ece += len(group) / len(sorted_confidence) * abs(mean_confidence - mean_accuracy)
    by_city: dict[str, list[dict[str, Any]]] = collections.defaultdict(list)
    by_candidates: dict[str, list[dict[str, Any]]] = collections.defaultdict(list)
    for row in scored:
        by_city[row["city"]].append(row)
        by_candidates[str(row["candidateCount"])].append(row)
    return {
        **summary,
        "unknownTargetRows": sum(row["target"] == "unknown" for row in scored),
        "unknownPredictedRows": sum(row["prediction"] == "unknown" for row in scored),
        "unknownPrecision": unknown_true_positives / unknown_prediction_count if unknown_prediction_count else None,
        "unknownRecall": unknown_true_positives / unknown_target_count if unknown_target_count else None,
        "positiveTargetRows": len(positive_rows),
        "positiveTargetAccuracy": sum(row["correct"] for row in positive_rows) / len(positive_rows) if positive_rows else None,
        "uniformChoiceChance": sum(1 / (row["candidateCount"] + 1) for row in scored) / len(scored),
        "equalFrequencyBinECE": ece,
        "byCity": {city: BENCHMARK.score_rows(values) for city, values in sorted(by_city.items())},
        "byCandidateCount": {key: BENCHMARK.score_rows(values) for key, values in sorted(by_candidates.items())},
    }


def load_checkpoint(model_dir: Path, expected_sha256: str) -> tuple[Any, Any, Any, dict[str, Any]]:
    from safetensors.torch import load_file
    from transformers import AutoTokenizer
    from si.common import build_model

    model_dir = model_dir.expanduser().resolve(strict=True)
    weights_path = model_dir / "model.safetensors"
    config_path = model_dir / "rl_agent_config.json"
    encoder_path = model_dir / "encoder"
    tokenizer_path = model_dir / "tokenizer"
    if not all(path.exists() for path in (weights_path, config_path, encoder_path, tokenizer_path)):
        raise ValueError("The parent checkpoint must contain full weights, config, encoder and tokenizer.")
    actual_sha = HELPERS.BASE.sha256_file(weights_path)
    if actual_sha != expected_sha256:
        raise ValueError("The parent Si checkpoint does not match the completed neighborhood benchmark.")
    tokenizer = AutoTokenizer.from_pretrained(str(tokenizer_path), local_files_only=True, trust_remote_code=False)
    config = json.loads(config_path.read_text(encoding="utf-8"))
    return weights_path, encoder_path, tokenizer, config


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--input", type=Path, required=True)
    parser.add_argument("--manifest", type=Path, required=True)
    parser.add_argument("--parent-model-dir", type=Path, required=True)
    parser.add_argument("--parent-weights-sha256", required=True)
    parser.add_argument("--expected-dataset-sha256", required=True)
    parser.add_argument("--expected-dataset-rows", type=int, required=True)
    parser.add_argument("--experiment-dir", type=Path, required=True)
    parser.add_argument("--allow-weak-location-experiment", action="store_true")
    parser.add_argument("--train-row-limit", type=int, default=0, help="Deterministic training sample for an MPS smoke only.")
    parser.add_argument("--epochs", type=int, default=1)
    parser.add_argument("--micro-batch-size", type=int, default=4)
    parser.add_argument("--grad-accumulation", type=int, default=8)
    parser.add_argument("--group-size", type=int, default=4)
    parser.add_argument("--encoder-learning-rate", type=float, default=1e-5)
    parser.add_argument("--head-learning-rate", type=float, default=5e-5)
    parser.add_argument("--threads", type=int, default=8)
    parser.add_argument("--device", choices=("cpu", "mps"), default="mps")
    parser.add_argument("--max-len", type=int, default=1024)
    parser.add_argument("--head-max-len", type=int, default=768)
    parser.add_argument("--checkpoint-steps", type=int, default=50)
    parser.add_argument("--seed", type=int, default=4172031)
    parser.add_argument("--validate-only", action="store_true")
    args = parser.parse_args()

    if not args.allow_weak_location_experiment:
        raise SystemExit("Refusing weak-label location fine-tuning without explicit research authorization.")
    if args.experiment_dir.exists():
        raise SystemExit("Experiment output already exists; refusing to overwrite it.")
    if args.train_row_limit == 1 or args.train_row_limit < 0 or args.epochs < 1 or args.micro_batch_size < 1 or args.grad_accumulation < 1 or args.group_size < 2:
        raise SystemExit("Training limits are invalid.")
    os.environ["HF_HUB_OFFLINE"] = "1"
    os.environ["TRANSFORMERS_OFFLINE"] = "1"
    os.environ["TOKENIZERS_PARALLELISM"] = "false"
    os.environ["USE_TF"] = "0"

    input_path = args.input.expanduser().resolve(strict=True)
    manifest_path = args.manifest.expanduser().resolve(strict=True)
    args.parent_model_dir = args.parent_model_dir.expanduser().resolve(strict=True)
    args.experiment_dir = args.experiment_dir.expanduser().resolve()
    if len(args.expected_dataset_sha256) != 64 or args.expected_dataset_rows < 1:
        raise SystemExit("Pinned neighborhood corpus identity is invalid.")
    data_summary, rows = validate_corpus(
        input_path, manifest_path, args.expected_dataset_sha256, args.expected_dataset_rows,
    )
    train_rows = [row for row in rows if row["source"]["split"] == "train"]
    calibration_rows = [row for row in rows if row["source"]["split"] == "calibration"]
    test_rows = [row for row in rows if row["source"]["split"] == "test"]
    if args.train_row_limit:
        train_rows = select_pilot_rows(train_rows, args.train_row_limit)
    expected_decisions = len(train_rows)
    total_steps = math.ceil(math.ceil(expected_decisions / args.micro_batch_size) / args.grad_accumulation) * args.epochs
    import torch
    import si
    from safetensors.torch import load_file, save_file
    from si.common import QTYPES, build_model, collate_items, proper_reward

    if getattr(si, "__version__", None) != EXPECTED_SI_VERSION:
        raise RuntimeError(f"Expected pinned si=={EXPECTED_SI_VERSION}; refusing an unreviewed runtime.")
    torch.set_num_threads(args.threads)
    torch.manual_seed(args.seed)
    random.seed(args.seed)
    device = HELPERS.resolve_device(torch, args.device)
    weights_path, encoder_path, tokenizer, config = load_checkpoint(args.parent_model_dir, args.parent_weights_sha256)
    report = {
        "status": "validated_only",
        "trainingPerformed": False,
        "taskType": TASK_TYPE,
        "trainingMethod": "official_si_rlcd_full_parameter_v1",
        "trainableScope": "encoder+typed-decision-head",
        "device": device.type,
        "inputSha256": args.expected_dataset_sha256,
        "parentWeightsSha256": args.parent_weights_sha256,
        "dataSummary": data_summary,
        "selectedRows": {"train": len(train_rows), "calibration": len(calibration_rows), "test": len(test_rows)},
        "trainingDecisions": expected_decisions,
        "microBatchSize": args.micro_batch_size,
        "gradientAccumulation": args.grad_accumulation,
        "effectiveBatchSize": args.micro_batch_size * args.grad_accumulation,
        "groupSize": args.group_size,
        "expectedOptimizerSteps": total_steps,
        "maxLen": args.max_len,
        "headMaxLen": args.head_max_len,
    }
    if args.validate_only:
        print(json.dumps(report, ensure_ascii=False, indent=2))
        return 0

    config["max_len"] = args.max_len
    config["head_max_len"] = args.head_max_len
    model = build_model(config, encoder_dir=str(encoder_path), pretrained=False)
    base_state = load_file(str(weights_path), device="cpu")
    model.load_state_dict(base_state, strict=True)
    model.to(device)
    model.encoder.gradient_checkpointing_enable(gradient_checkpointing_kwargs={"use_reentrant": False})
    model.head_checkpointing = True
    for name, parameter in model.named_parameters():
        parameter.requires_grad_(name.startswith(("encoder.", "head.", "type_emb.", "scorer.")))
    encoder_parameters = [parameter for name, parameter in model.named_parameters() if name.startswith("encoder.") and parameter.requires_grad]
    head_parameters = [parameter for name, parameter in model.named_parameters() if name.startswith(("head.", "type_emb.", "scorer.")) and parameter.requires_grad]
    if not encoder_parameters or not head_parameters:
        raise RuntimeError("The pinned Si model did not expose the full encoder and choice head.")
    if tokenizer.pad_token_id is None:
        raise RuntimeError("The pinned tokenizer has no pad token.")
    args.experiment_dir.mkdir(parents=True, exist_ok=False)
    model.encoder.config.save_pretrained(str(args.experiment_dir / "encoder"))
    tokenizer.save_pretrained(str(args.experiment_dir / "tokenizer"))
    shutil.copyfile(args.parent_model_dir / "base-rl-agent-config.json", args.experiment_dir / "base-rl-agent-config.json")
    config_path = args.experiment_dir / "rl_agent_config.json"
    config["fine_tuned"] = True
    config["model_name"] = "niazfinder-divar-neighborhood-rlcd-research"
    config["training_method"] = "official_si_rlcd_full_parameter_v1"
    config["research_only"] = True
    config["max_len"] = args.max_len
    config["head_max_len"] = args.head_max_len
    config_path.write_text(json.dumps(config, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    qtypes = QTYPES
    calibration_baseline_records, _calibration_baseline_logits = infer_records(
        model, calibration_rows, tokenizer, qtypes, args.max_len, args.head_max_len,
        args.micro_batch_size, device, torch,
    )
    baseline_test_records, _ = infer_records(
        model, test_rows, tokenizer, qtypes, args.max_len, args.head_max_len,
        args.micro_batch_size, device, torch,
    )
    parent_temperatures = config.get("temperature_by_options", {})
    if not isinstance(parent_temperatures, dict):
        parent_temperatures = {}
    baseline_calibration = metrics_for(calibration_baseline_records, parent_temperatures)
    baseline_test = metrics_for(baseline_test_records, parent_temperatures)

    optimizer = torch.optim.AdamW([
        {"params": encoder_parameters, "lr": args.encoder_learning_rate},
        {"params": head_parameters, "lr": args.head_learning_rate},
    ], weight_decay=0.01)
    scheduler = torch.optim.lr_scheduler.CosineAnnealingLR(optimizer, T_max=max(1, total_steps), eta_min=1e-6)
    trainable_parameters = sum(parameter.numel() for parameter in encoder_parameters + head_parameters)
    manifest = {
        "schemaVersion": 1,
        "status": "running",
        "taskType": TASK_TYPE,
        "experimentOnly": True,
        "productionLoadAllowed": False,
        "model": EXPECTED_MODEL_ID,
        "modelRevision": EXPECTED_MODEL_REVISION,
        "siVersionExpected": EXPECTED_SI_VERSION,
        "parentWeightsSha256": args.parent_weights_sha256,
        "dataFile": str(input_path),
        "dataSha256": args.expected_dataset_sha256,
        "dataSummary": data_summary,
        "sourcePerspective": "seller_or_agent_supply_offer_not_seeker_demand",
        "device": device.type,
        "labelSemantics": "weak geotag/text proxies; unknown examples are absence of a city-catalog match",
        "realNeedGroundTruth": False,
        "humanReviewed": False,
        "trainingEligible": False,
        "siPredictionsUsedAsLabels": False,
        "cloudTransferAllowed": False,
        "trainingMethod": "Si official RLCD: grouped noisy-logit proper-scoring rewards plus soft cross-entropy",
        "trainingFields": [FIELD],
        "trainableParameters": trainable_parameters,
        "selectedRows": {"train": len(train_rows), "calibration": len(calibration_rows), "test": len(test_rows)},
        "trainingDecisions": expected_decisions,
        "epochsRequested": args.epochs,
        "microBatchSize": args.micro_batch_size,
        "gradientAccumulation": args.grad_accumulation,
        "effectiveBatchSize": args.micro_batch_size * args.grad_accumulation,
        "groupSize": args.group_size,
        "encoderLearningRate": args.encoder_learning_rate,
        "headLearningRate": args.head_learning_rate,
        "maxLen": args.max_len,
        "headMaxLen": args.head_max_len,
        "optionOrderAugmentation": "deterministic, per-example, per-epoch shuffle",
        "confidenceCalibration": "calibration split only; temperature by choice option-count bucket",
        "evaluationScope": "source-offer weak-label generalization only; not real seeker accuracy",
        "startedAtUnix": time.time(),
    }
    HELPERS.BASE.atomic_json(args.experiment_dir / "manifest.json", manifest)
    HELPERS.BASE.atomic_json(args.experiment_dir / "training-progress.json", {
        "epoch": 0, "step": 0, "totalSteps": total_steps, "meanLoss": None,
        "checkpoint": "last-model.safetensors",
    })
    HELPERS.BASE.atomic_json(args.experiment_dir / "baseline-evaluation.json", {
        "syntheticUserNeeds": False,
        "weakLabelProxy": True,
        "calibration": baseline_calibration,
        "test": baseline_test,
    })

    best_score = baseline_calibration["accuracyIncludingAbstentions"]
    best_epoch = 0
    best_path = args.experiment_dir / "best-model.safetensors"
    total_loss = 0.0
    micro_count = 0
    step = 0
    started = time.monotonic()
    history: list[dict[str, Any]] = []
    try:
        for epoch in range(args.epochs):
            model.train()
            model.encoder.train()
            model.encoder.gradient_checkpointing_enable(gradient_checkpointing_kwargs={"use_reentrant": False})
            model.head_checkpointing = True
            epoch_rows = list(train_rows)
            random.Random(args.seed + epoch).shuffle(epoch_rows)
            optimizer.zero_grad(set_to_none=True)
            num_micro_batches = math.ceil(len(epoch_rows) / args.micro_batch_size)
            remainder = num_micro_batches % args.grad_accumulation or args.grad_accumulation
            epoch_loss = 0.0
            for micro_index, row_batch in enumerate(batch_items(epoch_rows, args.micro_batch_size)):
                batch = [make_item(row, tokenizer, qtypes, args.max_len, args.head_max_len, seed=args.seed, epoch=epoch) for row in row_batch]
                packed = collate_items([[item] for item in batch], tokenizer.pad_token_id)
                logits, _ = model(
                    packed["input_ids"].to(device), packed["attention_mask"].to(device),
                    packed["marker_pos"].to(device), packed["marker_mask"].to(device),
                    packed["qtype"].to(device),
                )
                mask = packed["marker_mask"].to(device).bool()
                labels = packed["label"].to(device)
                targets = torch.nn.functional.one_hot(labels, num_classes=logits.shape[-1]).float() * mask
                loss, reward, ce_loss = RLCD.rlcd_loss(
                    logits, targets, packed["qtype"].to(device), mask,
                    sigma=RLCD.sigma_at_step(step, total_steps), group_size=args.group_size,
                    proper_reward=proper_reward, w_sph=0.75, w_rps=1.0,
                )
                group_index = micro_index // args.grad_accumulation
                steps_per_epoch = math.ceil(num_micro_batches / args.grad_accumulation)
                group_size = remainder if group_index == steps_per_epoch - 1 else args.grad_accumulation
                (loss / group_size).backward()
                loss_value = float(loss.detach().cpu().item())
                total_loss += loss_value
                epoch_loss += loss_value
                micro_count += 1
                should_step = (micro_index + 1) % args.grad_accumulation == 0 or micro_index + 1 == num_micro_batches
                if not should_step:
                    continue
                torch.nn.utils.clip_grad_norm_(encoder_parameters + head_parameters, max_norm=1.0)
                optimizer.step()
                scheduler.step()
                optimizer.zero_grad(set_to_none=True)
                step += 1
                if step % args.checkpoint_steps == 0 or step == total_steps:
                    RLCD.save_model_weights(args.experiment_dir / "last-model.safetensors", model, torch, save_file)
                    HELPERS.BASE.atomic_json(args.experiment_dir / "training-progress.json", {
                        "epoch": epoch + 1, "step": step, "totalSteps": total_steps,
                        "meanLoss": total_loss / max(1, micro_count),
                        "meanRewardLastBatch": float(reward.detach().cpu().item()),
                        "softCrossEntropyLastBatch": float(ce_loss.detach().cpu().item()),
                        "elapsedSeconds": time.monotonic() - started,
                        "checkpoint": "last-model.safetensors",
                    })
                    print(f"epoch={epoch + 1}/{args.epochs} step={step}/{total_steps} mean_loss={total_loss / max(1, micro_count):.4f}", flush=True)

            calibration_records, _ = infer_records(
                model, calibration_rows, tokenizer, qtypes, args.max_len, args.head_max_len,
                args.micro_batch_size, device, torch,
            )
            calibration_metrics = metrics_for(calibration_records)
            score = calibration_metrics["accuracyIncludingAbstentions"]
            if score > best_score + 1e-8:
                best_score = score
                best_epoch = epoch + 1
                RLCD.save_model_weights(best_path, model, torch, save_file)
            history.append({
                "epoch": epoch + 1,
                "meanTrainingLoss": epoch_loss / max(1, num_micro_batches),
                "calibration": calibration_metrics,
            })
            HELPERS.BASE.atomic_json(args.experiment_dir / "epoch-metrics.json", {"epochs": history, "bestEpoch": best_epoch})

        if not best_path.is_file():
            shutil.copyfile(weights_path, best_path)
            selected_source = "v6_parent_no_calibration_accuracy_improvement"
        else:
            selected_source = "best_calibration_epoch"
        selected_state = load_file(str(best_path), device="cpu")
        model.load_state_dict(selected_state, strict=True)
        model.to(device)
        selected_calibration_records, calibration_logits = infer_records(
            model, calibration_rows, tokenizer, qtypes, args.max_len, args.head_max_len,
            args.micro_batch_size, device, torch,
        )
        temperatures = RLCD.fit_bucket_temperatures(calibration_logits, torch)
        selected_test_records, _ = infer_records(
            model, test_rows, tokenizer, qtypes, args.max_len, args.head_max_len,
            args.micro_batch_size, device, torch,
        )
        calibrated_calibration = metrics_for(selected_calibration_records, temperatures)
        calibrated_test = metrics_for(selected_test_records, temperatures)
        model_config = json.loads((args.experiment_dir / "rl_agent_config.json").read_text(encoding="utf-8"))
        model_config["temperature_by_options"] = temperatures
        (args.experiment_dir / "rl_agent_config.json").write_text(
            json.dumps(model_config, ensure_ascii=False, indent=2) + "\n", encoding="utf-8",
        )
        RLCD.save_model_weights(args.experiment_dir / "model.safetensors", model, torch, save_file)
        final_evaluation = {
            "schemaVersion": 1,
            "status": "research_evaluation_only",
            "syntheticUserNeeds": False,
            "weakSellerOfferLabelProxy": True,
            "realUserNeedAccuracyEstablished": False,
            "productionLoadAllowed": False,
            "datasetSha256": args.expected_dataset_sha256,
            "parentWeightsSha256": args.parent_weights_sha256,
            "device": device.type,
            "siVersion": EXPECTED_SI_VERSION,
            "baseline": {"calibration": baseline_calibration, "test": baseline_test},
            "selectedModel": {"calibration": calibrated_calibration, "test": calibrated_test},
            "fittedTemperatureByOptions": temperatures,
            "selectedBestEpoch": best_epoch,
            "selectedCheckpointSource": selected_source,
            "epochs": history,
            "elapsedSeconds": time.monotonic() - started,
        }
        HELPERS.BASE.atomic_json(args.experiment_dir / "evaluation.json", final_evaluation)
        manifest.update({
            "status": "research_run_complete",
            "productionLoadAllowed": False,
            "selectedBestEpoch": best_epoch,
            "selectedCheckpointSource": selected_source,
            "completedAtUnix": time.time(),
            "evaluationPath": "evaluation.json",
            "evaluationSha256": HELPERS.BASE.sha256_file(args.experiment_dir / "evaluation.json"),
            "modelWeightsSha256": HELPERS.BASE.sha256_file(args.experiment_dir / "model.safetensors"),
        })
        HELPERS.BASE.atomic_json(args.experiment_dir / "manifest.json", manifest)
        HELPERS.BASE.atomic_json(args.experiment_dir / "training-progress.json", {
            "epoch": args.epochs, "step": total_steps, "totalSteps": total_steps,
            "meanLoss": total_loss / max(1, micro_count), "elapsedSeconds": time.monotonic() - started,
            "checkpoint": "model.safetensors",
        })
        print(json.dumps({
            "status": "research_run_complete",
            "device": device.type,
            "trainRows": len(train_rows),
            "optimizerSteps": total_steps,
            "selectedCheckpointSource": selected_source,
            "baselineTestAccuracy": baseline_test["accuracyIncludingAbstentions"],
            "selectedTestAccuracy": calibrated_test["accuracyIncludingAbstentions"],
            "realUserNeedAccuracyEstablished": False,
        }, ensure_ascii=False, indent=2), flush=True)
        return 0
    except KeyboardInterrupt:
        RLCD.save_model_weights(args.experiment_dir / "last-model.safetensors", model, torch, save_file)
        manifest["status"] = "interrupted_weights_preserved_optimizer_not_saved"
        HELPERS.BASE.atomic_json(args.experiment_dir / "manifest.json", manifest)
        return 130


if __name__ == "__main__":
    raise SystemExit(main())
