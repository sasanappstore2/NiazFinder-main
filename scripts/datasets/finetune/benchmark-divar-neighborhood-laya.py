#!/usr/bin/env python3
"""Evaluate one local Laya checkpoint on the held-out Divar neighborhood shadow set.

This is an aggregate-only research benchmark. The targets are seller-side
geotags, not seeker intent or human-reviewed labels. It never trains or writes
per-example predictions.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import math
import os
import resource
import statistics
import sys
import time
from collections import defaultdict
from pathlib import Path
from typing import Any, Iterable


ROOT = Path(__file__).resolve().parents[3]
DEFAULT_INPUT = ROOT / "data/divar/divar-neighborhood-candidate-shadow-v1-exact-city-2026-09-28-r3.jsonl"
MODEL_ID = "convaiinnovations/laya-multilingual"
MODEL_REVISION = "e4e9ddf21a7b1903b7acffd8814ad4307bf63a67"
BASE_WEIGHTS_SHA256 = "9d628fd971b700382ac6f65920a86f149777b2e748e0c955fb3b19695aa8f204"
EXPECTED_LAYA_VERSION = "0.3.20"
TASK_TYPE = "divar-neighborhood-candidate-shadow/v1"


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for block in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(block)
    return digest.hexdigest()


def read_json(path: Path) -> dict[str, Any]:
    value = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(value, dict):
        raise ValueError(f"Expected a JSON object in {path.name}.")
    return value


def validate_model_directory(model_dir: Path) -> dict[str, Any]:
    model_dir = model_dir.expanduser().resolve(strict=True)
    weights = model_dir / "model.safetensors"
    if not model_dir.is_dir() or not weights.is_file():
        raise ValueError("The model must be a complete local Laya checkpoint directory.")
    checkpoint_hash = sha256_file(weights)
    manifest_path = model_dir / "manifest.json"
    if manifest_path.is_file():
        manifest = read_json(manifest_path)
        if (
            manifest.get("model") != MODEL_ID
            or manifest.get("modelRevision") != MODEL_REVISION
            or manifest.get("baseWeightsSha256") != BASE_WEIGHTS_SHA256
            or manifest.get("status") != "research_run_complete"
            or manifest.get("productionLoadAllowed") is not False
            or manifest.get("experimentOnly") is not True
        ):
            raise ValueError("The research checkpoint is not derived from the pinned Laya Multilingual base.")
        return {
            "kind": "local_research_checkpoint",
            "model": MODEL_ID,
            "revision": MODEL_REVISION,
            "weightsSha256": checkpoint_hash,
            "trainingManifestStatus": manifest.get("status"),
            "productionLoadAllowed": False,
        }
    if checkpoint_hash != BASE_WEIGHTS_SHA256:
        raise ValueError("An unmanifested local checkpoint does not match the pinned base weights.")
    return {
        "kind": "pinned_base_checkpoint",
        "model": MODEL_ID,
        "revision": MODEL_REVISION,
        "weightsSha256": checkpoint_hash,
        "trainingManifestStatus": None,
        "productionLoadAllowed": False,
    }


def validate_row(row: dict[str, Any], line_number: int) -> tuple[str, dict[str, Any], str, str, int] | None:
    if row.get("taskType") != TASK_TYPE:
        raise ValueError(f"Unexpected task type at line {line_number}.")
    source = row.get("source")
    if not isinstance(source, dict) or source.get("dataset") != "divarofficial/real_estate_ads":
        raise ValueError(f"Unexpected source provenance at line {line_number}.")
    if source.get("perspective") != "seller_or_agent_supply_offer":
        raise ValueError(f"Missing seller-side provenance at line {line_number}.")
    if source.get("split") != "test":
        return None
    state = row.get("state")
    questions = row.get("questions")
    targets = row.get("targetDecisions")
    if not isinstance(state, dict) or not isinstance(state.get("text"), str):
        raise ValueError(f"Invalid test state at line {line_number}.")
    if not isinstance(questions, dict) or set(questions) != {"neighborhood_candidate"}:
        raise ValueError(f"Unexpected questions at line {line_number}.")
    question = questions["neighborhood_candidate"]
    if not isinstance(question, dict):
        raise ValueError(f"Invalid candidate-choice question at line {line_number}.")
    criteria = question.get("criteria")
    if question.get("type") != "choice" or not isinstance(criteria, dict) or "unknown" not in criteria:
        raise ValueError(f"Invalid candidate-choice question at line {line_number}.")
    candidates = set(criteria) - {"unknown"}
    if not 2 <= len(candidates) <= 8:
        raise ValueError(f"Candidate count is outside the reviewed 2–8 range at line {line_number}.")
    target = targets.get("neighborhood_candidate") if isinstance(targets, dict) else None
    label = target.get("value") if isinstance(target, dict) else None
    if not isinstance(label, str) or label not in candidates:
        raise ValueError(f"Weak target is missing from the offered candidates at line {line_number}.")
    context = state.get("context")
    city = context.get("city") if isinstance(context, dict) else None
    if not isinstance(city, str) or not city:
        raise ValueError(f"Missing city context at line {line_number}.")
    return row["exampleId"], questions, label, city, len(candidates)


def score_rows(records: Iterable[dict[str, Any]]) -> dict[str, Any]:
    rows = list(records)
    total = len(rows)
    if total == 0:
        raise ValueError("The held-out test split contains no candidate rows.")
    correct = sum(item["prediction"] == item["target"] for item in rows)
    known = [item for item in rows if item["prediction"] != "unknown"]
    known_correct = sum(item["prediction"] == item["target"] for item in known)
    labels = {item["target"] for item in rows} | {item["prediction"] for item in rows if item["prediction"] != "unknown"}
    f1_values: list[float] = []
    for label in labels:
        tp = sum(item["target"] == label and item["prediction"] == label for item in rows)
        fp = sum(item["target"] != label and item["prediction"] == label for item in rows)
        fn = sum(item["target"] == label and item["prediction"] != label for item in rows)
        denominator = 2 * tp + fp + fn
        f1_values.append((2 * tp / denominator) if denominator else 0.0)
    return {
        "rows": total,
        "correct": correct,
        "accuracyIncludingAbstentions": correct / total,
        "predictionCoverage": len(known) / total,
        "unknownAbstentionRate": sum(item["prediction"] == "unknown" for item in rows) / total,
        "selectiveAccuracy": known_correct / len(known) if known else None,
        "wrongNonAbstainingRate": (len(known) - known_correct) / total,
        "macroF1IncludingMissedTargets": statistics.fmean(f1_values) if f1_values else 0.0,
        "targetClassCount": len({item["target"] for item in rows}),
        "predictedClassCount": len({item["prediction"] for item in known}),
    }


def peak_memory_mib() -> float:
    raw = resource.getrusage(resource.RUSAGE_SELF).ru_maxrss
    return raw / (1024 * 1024) if sys.platform == "darwin" else raw / 1024


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--input", type=Path, default=DEFAULT_INPUT)
    parser.add_argument("--manifest", type=Path)
    parser.add_argument("--model-dir", type=Path, required=True,
                        help="Local snapshot or completed, research-only Laya full-model checkpoint.")
    parser.add_argument("--output", type=Path, required=True,
                        help="New aggregate JSON path; existing files are never overwritten.")
    parser.add_argument("--device", choices=("mps", "cpu"), default="mps")
    args = parser.parse_args()

    input_path = args.input.expanduser().resolve(strict=True)
    manifest_path = (args.manifest or Path(f"{input_path}.manifest.json")).expanduser().resolve(strict=True)
    output_path = args.output.expanduser().resolve()
    if output_path.exists() or output_path in {input_path, manifest_path}:
        raise ValueError("Output must be a new path distinct from both inputs.")
    manifest = read_json(manifest_path)
    if (
        manifest.get("status") != "complete_shadow_only"
        or manifest.get("taskType") != TASK_TYPE
        or manifest.get("qualityGates", {}).get("realNeedGroundTruth") is not False
        or manifest.get("qualityGates", {}).get("trainingEligible") is not False
        or manifest.get("privacy", {}).get("cloudTransferAllowed") is not False
    ):
        raise ValueError("The input is not the reviewed local-only neighborhood shadow artifact.")
    input_hash = sha256_file(input_path)
    if input_hash != manifest.get("outputSha256") or input_path.stat().st_size != manifest.get("outputBytes"):
        raise ValueError("Neighborhood shadow input no longer matches its pinned manifest.")

    import laya

    if getattr(laya, "__version__", None) != EXPECTED_LAYA_VERSION:
        raise RuntimeError(f"Expected pinned laya=={EXPECTED_LAYA_VERSION}; refusing an unreviewed runtime.")
    checkpoint = validate_model_directory(args.model_dir)
    load_started = time.perf_counter()
    agent = laya.load(str(args.model_dir.expanduser().resolve(strict=True)), device=args.device)
    load_seconds = time.perf_counter() - load_started

    all_rows = 0
    test_rows = 0
    measurements: list[dict[str, Any]] = []
    latencies_ms: list[float] = []
    inference_started = time.perf_counter()
    with input_path.open("r", encoding="utf-8") as stream:
        for line_number, line in enumerate(stream, 1):
            if not line.strip():
                continue
            all_rows += 1
            try:
                row = json.loads(line)
            except json.JSONDecodeError as exc:
                raise ValueError(f"Invalid JSONL at line {line_number}.") from exc
            validated = validate_row(row, line_number)
            if validated is None:
                continue
            _example_id, questions, target, city, candidate_count = validated
            started = time.perf_counter()
            try:
                answer = agent.predict(
                    row["state"], questions, lang="fa", max_len=1024, head_max_len=768,
                )
            except Exception as exc:
                raise RuntimeError(
                    f"Laya inference failed at held-out line {line_number} ({type(exc).__name__})."
                ) from None
            elapsed_ms = (time.perf_counter() - started) * 1000
            choices = answer.get("answers", {}).get("neighborhood_candidate", {})
            prediction = choices.get("choice") if isinstance(choices, dict) else None
            offered = questions["neighborhood_candidate"]["criteria"]
            if not isinstance(prediction, str) or prediction not in offered:
                raise RuntimeError("Laya returned an invalid candidate; refusing a partial benchmark.")
            latencies_ms.append(elapsed_ms)
            measurements.append({
                "target": target,
                "prediction": prediction,
                "city": city,
                "candidateCount": candidate_count,
            })
            test_rows += 1

    expected_rows = manifest.get("counts", {}).get("outputRowsBySplit", {}).get("test")
    if all_rows != manifest.get("outputRows"):
        raise ValueError(f"Input row-count mismatch: read {all_rows}, expected {manifest.get('outputRows')}.")
    if test_rows != expected_rows:
        raise ValueError(f"Held-out test row mismatch: evaluated {test_rows}, expected {expected_rows}.")
    city_groups: dict[str, list[dict[str, Any]]] = defaultdict(list)
    candidate_groups: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for item in measurements:
        city_groups[item["city"]].append(item)
        candidate_groups[str(item["candidateCount"])].append(item)
    inference_seconds = time.perf_counter() - inference_started
    sorted_latency = sorted(latencies_ms)
    report = {
        "schemaVersion": 1,
        "status": "research_evaluation_only",
        "taskType": TASK_TYPE,
        "model": checkpoint,
        "layaVersion": laya.__version__,
        "requestedDevice": args.device,
        "actualDevice": str(getattr(agent, "device", "unknown")),
        "input": {
            "dataset": "divarofficial/real_estate_ads",
            "perspective": "seller_or_agent_supply_offer",
            "sha256": input_hash,
            "rows": all_rows,
            "heldOutRows": test_rows,
            "split": "test",
        },
        "metrics": score_rows(measurements),
        "metricsByCity": {key: score_rows(value) for key, value in sorted(city_groups.items())},
        "metricsByCandidateCount": {key: score_rows(value) for key, value in sorted(candidate_groups.items())},
        "deterministicResolverBaseline": {
            "policy": "abstain on every 2–8-candidate ambiguous row; the builder excludes unique rule matches",
            "rows": test_rows,
            "predictionCoverage": 0.0,
            "unknownAbstentionRate": 1.0,
            "accuracyIncludingAbstentions": 0.0,
            "note": "Unique deterministic matches are deliberately outside this candidate-choice test split.",
        },
        "uniformCandidateBaseline": {
            "policy": "choose uniformly from the offered named candidates; never select unknown",
            "expectedAccuracy": round(statistics.fmean(1 / item["candidateCount"] for item in measurements), 6),
            "predictionCoverage": 1.0,
        },
        "performance": {
            "loadSeconds": round(load_seconds, 3),
            "inferenceSeconds": round(inference_seconds, 3),
            "latencyP50Ms": round(statistics.median(latencies_ms), 2),
            "latencyP95Ms": round(sorted_latency[min(len(sorted_latency) - 1, math.ceil(0.95 * len(sorted_latency)) - 1)], 2),
            "peakProcessMemoryMiB": round(peak_memory_mib(), 1),
        },
        "limits": [
            "Targets are weak Divar offer geotags, not seeker-neighborhood ground truth.",
            "Only explicit, ambiguous candidate mentions in 9 source cities enter this benchmark.",
            "This measures Laya against the deterministic resolver's abstention on ambiguous cases; it does not establish real-user accuracy.",
            "No row-level text, identifiers, or predictions are written to the report.",
            "The checkpoint is research-only and must not be loaded into production from this report.",
        ],
    }
    output_path.parent.mkdir(parents=True, exist_ok=True)
    temporary = output_path.with_name(output_path.name + ".tmp")
    temporary.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    os.replace(temporary, output_path)
    print(json.dumps({
        "status": report["status"],
        "heldOutRows": test_rows,
        "metrics": report["metrics"],
        "performance": report["performance"],
        "output": str(output_path),
    }, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
