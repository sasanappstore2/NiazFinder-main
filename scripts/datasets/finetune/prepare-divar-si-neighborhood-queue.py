#!/usr/bin/env python3
"""Create the immutable v8 queue plan from a completed local Divar shadow corpus."""

from __future__ import annotations

import hashlib
import json
import os
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parents[3]
DATASET_RELATIVE = Path("data/divar/divar-neighborhood-choice-shadow-v2-balanced-2026-09-28.jsonl")
MANIFEST_RELATIVE = Path(f"{DATASET_RELATIVE}.manifest.json")
PLAN_RELATIVE = Path("data/si-experiments/divar-v8-neighborhood-candidate-rlcd-after-v7-2026-09-28.json")
TASK_TYPE = "divar-neighborhood-choice-shadow/v2"
SOURCE_SHA256 = "e5760fe1325a195e6682c371457bfecd51d255c518756e3cbea234b8163a801f"
MODEL_ID = "convaiinnovations/si-multilingual"
MODEL_REVISION = "e4e9ddf21a7b1903b7acffd8814ad4307bf63a67"


def read_json(path: Path) -> dict[str, Any]:
    value = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(value, dict):
        raise ValueError(f"Expected a JSON object in {path.name}.")
    return value


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for block in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(block)
    return digest.hexdigest()


def build_plan(manifest: dict[str, Any], actual_sha256: str, data_bytes: int) -> dict[str, Any]:
    provenance = manifest.get("provenance")
    counts = manifest.get("counts")
    splits = counts.get("outputRowsBySplit") if isinstance(counts, dict) else None
    label_kinds = counts.get("outputRowsByLabelKind") if isinstance(counts, dict) else None
    cities = counts.get("outputRowsByCity") if isinstance(counts, dict) else None
    rows = manifest.get("outputRows")
    if (
        manifest.get("status") != "complete_shadow_only"
        or manifest.get("taskType") != TASK_TYPE
        or manifest.get("sourceSha256") != SOURCE_SHA256
        or manifest.get("sourcePerspective") != "seller_or_agent_supply_offer_not_seeker_demand"
        or manifest.get("outputSha256") != actual_sha256
        or manifest.get("outputBytes") != data_bytes
        or not isinstance(rows, int)
        or rows <= 0
        or not isinstance(splits, dict)
        or any(not isinstance(splits.get(key), int) or splits[key] <= 0 for key in ("train", "calibration", "test"))
        or sum(splits[key] for key in ("train", "calibration", "test")) != rows
        or not isinstance(label_kinds, dict)
        or label_kinds.get("weak_positive_text_grounded", 0) <= 0
        or label_kinds.get("weak_unknown_no_catalog_match", 0) <= 0
        or not isinstance(cities, dict)
        or not cities
        or not isinstance(provenance, dict)
        or any(provenance.get(key) is not False for key in (
            "sourceTextSynthetic", "realNeedGroundTruth", "humanReviewed",
            "trainingEligible", "siPredictionsUsedAsLabels", "cloudTransferAllowed",
        ))
    ):
        raise ValueError("Completed shadow corpus failed source, split, label or research-only gates.")

    return {
        "schemaVersion": 1,
        "status": "queued_waiting_for_v7",
        "taskType": TASK_TYPE,
        "purpose": "Research-only Si city-scoped neighborhood choice/abstention experiment; never production training data.",
        "model": {"id": MODEL_ID, "revision": MODEL_REVISION},
        "python": "mini-services/si-post/.venv/bin/python",
        "device": "mps",
        "maxConcurrentMpsJobs": 1,
        "trainerScript": "scripts/datasets/finetune/train-divar-si-neighborhood-rlcd.py",
        "dataset": {
            "path": DATASET_RELATIVE.as_posix(),
            "manifestPath": MANIFEST_RELATIVE.as_posix(),
            "sha256": actual_sha256,
            "bytes": data_bytes,
            "rows": rows,
            "split": {key: splits[key] for key in ("train", "calibration", "test")},
            "candidateCities": len(cities),
            "positiveRows": label_kinds["weak_positive_text_grounded"],
            "unknownRows": label_kinds["weak_unknown_no_catalog_match"],
            "sourceDatasetSha256": SOURCE_SHA256,
            "trainingEligible": False,
            "realNeedGroundTruth": False,
            "humanReviewed": False,
            "cloudTransferAllowed": False,
        },
        "v6PlanPath": "data/si-experiments/divar-v6-explicit-rent-mode-mps-full-2026-09-28.launch-plan.json",
        "v7PlanPath": "data/si-experiments/divar-v7-neighborhood-benchmark-after-v6-2026-09-28.json",
        "pilotTrainRows": min(64, splits["train"]),
        "experimentDirectories": {
            "pilot": "data/si-experiments/divar-v8-neighborhood-candidate-rlcd-pilot-2026-09-28",
            "full": "data/si-experiments/divar-v8-neighborhood-candidate-rlcd-full-2026-09-28",
        },
        "training": {
            "method": "official_si_rlcd_full_parameter_v1",
            "epochs": 1,
            "microBatchSize": 4,
            "gradientAccumulation": 8,
            "groupSize": 4,
            "encoderLearningRate": 0.00001,
            "headLearningRate": 0.00005,
            "threads": 8,
            "maxLen": 1024,
            "headMaxLen": 768,
            "checkpointSteps": 50,
            "seed": 4172028,
        },
        "limits": [
            "Targets are weak Divar supply-offer text/crosswalk proxies, not seeker-neighborhood ground truth.",
            "Unknown means no city-catalog candidate resolved from the source text; it is not human-verified absence.",
            "Only cities present in the exact-mapped source snapshot are represented; catalog coverage is incomplete.",
            "The v8 weights remain experiment-only and must not be loaded into /post or production.",
        ],
    }


def create_plan(root: Path = ROOT) -> Path:
    input_path = root / DATASET_RELATIVE
    manifest_path = root / MANIFEST_RELATIVE
    plan_path = root / PLAN_RELATIVE
    if not input_path.is_file() or not manifest_path.is_file():
        raise FileNotFoundError("The completed neighborhood shadow corpus and manifest are not both present.")
    if plan_path.exists():
        raise FileExistsError("Refusing to overwrite the existing v8 launch plan.")
    plan = build_plan(read_json(manifest_path), sha256_file(input_path), input_path.stat().st_size)
    plan_path.parent.mkdir(parents=True, exist_ok=True)
    payload = json.dumps(plan, ensure_ascii=False, indent=2) + "\n"
    with plan_path.open("x", encoding="utf-8") as stream:
        stream.write(payload)
        stream.flush()
        os.fsync(stream.fileno())
    return plan_path


def main() -> int:
    plan_path = create_plan()
    print(json.dumps({"status": "plan_created", "plan": str(plan_path.relative_to(ROOT))}, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
