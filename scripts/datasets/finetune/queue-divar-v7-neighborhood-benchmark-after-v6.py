#!/usr/bin/env python3
"""Wait for serialized v6 completion, then run one local neighborhood benchmark."""

from __future__ import annotations

import argparse
import datetime as dt
import fcntl
import hashlib
import json
import os
import subprocess
import sys
import time
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parents[3]
PLAN_RELATIVE = Path("data/si-experiments/divar-v7-neighborhood-benchmark-after-v6-2026-09-28.json")
POLL_SECONDS = 60
COMPLETE_STATUS = "research_evaluation_complete"
FAILURE_STATUSES = {"failed", "upstream_failed", "pilot_failed", "preflight_failed", "evaluation_failed"}


def utc_now() -> str:
    return dt.datetime.now(dt.timezone.utc).isoformat()


def read_json(path: Path) -> dict[str, Any]:
    value = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(value, dict):
        raise ValueError(f"Expected a JSON object in {path.name}.")
    return value


def atomic_json(path: Path, value: dict[str, Any]) -> None:
    temporary = path.with_name(path.name + ".tmp")
    temporary.write_text(json.dumps(value, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    os.replace(temporary, path)


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for block in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(block)
    return digest.hexdigest()


def repo_path(root: Path, relative: str) -> Path:
    candidate = (root / relative).resolve()
    try:
        candidate.relative_to(root.resolve())
    except ValueError as exc:
        raise ValueError("Queue artifacts must remain inside the repository.") from exc
    return candidate


def upstream_state(
    upstream: dict[str, Any],
) -> tuple[str, str]:
    status = upstream.get("status")
    if status in FAILURE_STATUSES:
        return "failed", f"v6 ended with status {status!r}; the neighborhood benchmark will not start."
    if status == COMPLETE_STATUS:
        return "ready", "v6 training and full held-out evaluation completed; its MPS evaluation subprocess has exited."
    return "waiting", f"v6 has not published successful full-evaluation status yet (status={status!r}); no additional MPS workload will start."


def validate_plan(plan: dict[str, Any], root: Path) -> tuple[Path, Path, Path, Path]:
    if plan.get("status") not in {"queued_waiting_for_v6", "running"}:
        raise ValueError(f"Benchmark queue is not startable (status={plan.get('status')!r}).")
    if plan.get("maxConcurrentMpsJobs") != 1 or plan.get("device") != "mps":
        raise ValueError("The queued benchmark must preserve the single-MPS-job constraint.")
    python_spec = Path(plan["python"])
    expected_python = (python_spec if python_spec.is_absolute() else root / python_spec).resolve(strict=True)
    if Path(sys.executable).resolve() != expected_python:
        raise ValueError("The queue must run in the reviewed Si virtual environment.")
    dataset = plan["dataset"]
    input_path = repo_path(root, dataset["path"])
    manifest_path = repo_path(root, dataset["manifestPath"])
    upstream_plan_path = repo_path(root, plan["upstream"]["planPath"])
    output_path = repo_path(root, plan["outputPath"])
    benchmark_path = repo_path(root, plan["benchmarkScript"])
    for path in (input_path, manifest_path, upstream_plan_path, benchmark_path):
        if not path.is_file():
            raise FileNotFoundError(f"Required benchmark artifact is missing: {path.relative_to(root)}")
    if output_path.exists():
        raise FileExistsError(f"Refusing to overwrite an existing benchmark report: {output_path.relative_to(root)}")
    if dataset["sha256"] != sha256_file(input_path):
        raise ValueError("The neighborhood corpus changed after the benchmark queue was prepared.")
    corpus = read_json(manifest_path)
    if (
        corpus.get("taskType") != plan["taskType"]
        or corpus.get("status") != "complete_shadow_only"
        or corpus.get("outputSha256") != dataset["sha256"]
        or corpus.get("outputRows") != dataset["rows"]
        or corpus.get("counts", {}).get("outputRowsBySplit", {}).get("test") != dataset["testRows"]
        or corpus.get("qualityGates", {}).get("trainingEligible") is not False
        or corpus.get("qualityGates", {}).get("realNeedGroundTruth") is not False
    ):
        raise ValueError("The weak-label location corpus no longer matches the reviewed aggregate-only contract.")
    return input_path, manifest_path, upstream_plan_path, output_path


def validate_v6_completion(plan: dict[str, Any], upstream: dict[str, Any], root: Path) -> Path:
    if upstream.get("status") != COMPLETE_STATUS:
        raise ValueError("v6 has not reached its full held-out evaluation completion gate.")
    v6 = read_json(repo_path(root, plan["upstream"]["planPath"]))
    launch_argv = v6.get("launchArgv")
    model_spec = v6.get("model", {})
    v6_dataset = v6.get("dataset", {})
    if (
        v6.get("status") != COMPLETE_STATUS
        or model_spec.get("id") != plan["modelId"]
        or model_spec.get("revision") != plan["modelRevision"]
        or model_spec.get("weightsSha256") != plan["baseWeightsSha256"]
        or v6_dataset.get("provenance", {}).get("trainingEligibleForProduction") is not False
        or not isinstance(launch_argv, list)
        or "--experiment-dir" not in launch_argv
    ):
        raise ValueError("The upstream v6 plan does not match the pinned local research model contract.")
    experiment_dir = repo_path(root, launch_argv[launch_argv.index("--experiment-dir") + 1])
    model_manifest = read_json(experiment_dir / "manifest.json")
    evaluation = read_json(experiment_dir / "evaluation-detailed.json")
    dataset = v6_dataset
    if (
        model_manifest.get("status") != "research_run_complete"
        or model_manifest.get("model") != plan["modelId"]
        or model_manifest.get("modelRevision") != plan["modelRevision"]
        or model_manifest.get("baseWeightsSha256") != plan["baseWeightsSha256"]
        or model_manifest.get("productionLoadAllowed") is not False
        or model_manifest.get("experimentOnly") is not True
        or model_manifest.get("device") != "mps"
        or model_manifest.get("syntheticTargetsAreRealNeedGroundTruth") is not False
        or model_manifest.get("siPredictionsUsedAsLabels") is not False
        or not (experiment_dir / "model.safetensors").is_file()
        or evaluation.get("status") != "research_evaluation_only"
        or evaluation.get("productionLoadAllowed") is not False
        or evaluation.get("syntheticOnly") is not True
        or evaluation.get("realUserNeedAccuracyEstablished") is not False
        or evaluation.get("device") != "mps"
        or evaluation.get("testCoverage") != "all deterministic held-out rows"
        or evaluation.get("testRows") != dataset["split"]["test"]
        or evaluation.get("dataSha256") != dataset["sha256"]
    ):
        raise ValueError("The v6 full evaluation/checkpoint did not pass the recorded research-only gate.")
    return experiment_dir


def update_plan(plan_path: Path, plan: dict[str, Any], status: str, note: str) -> None:
    plan["status"] = status
    plan["queue"] = {"updatedAt": utc_now(), "note": note}
    atomic_json(plan_path, plan)


def acquire_lock() -> int:
    lock_path = Path("/private/tmp/niazfinder-si-v7-benchmark-queue.lock")
    descriptor = os.open(lock_path, os.O_CREAT | os.O_RDWR, 0o600)
    try:
        fcntl.flock(descriptor, fcntl.LOCK_EX | fcntl.LOCK_NB)
    except BlockingIOError as exc:
        os.close(descriptor)
        raise RuntimeError("Another v7 benchmark queue already holds the lock.") from exc
    os.ftruncate(descriptor, 0)
    os.write(descriptor, f"pid={os.getpid()}\nstartedAt={utc_now()}\n".encode())
    return descriptor


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--dry-run", action="store_true", help="Read the v6 gate without waiting or launching inference.")
    args = parser.parse_args()
    plan_path = ROOT / PLAN_RELATIVE
    plan = read_json(plan_path)
    if plan.get("status") == COMPLETE_STATUS:
        print(json.dumps({"queueStatus": "complete", "output": plan.get("result", {}).get("path")}, ensure_ascii=False))
        return 0
    validate_plan(plan, ROOT)
    upstream_path = ROOT / plan["upstream"]["planPath"]
    upstream = read_json(upstream_path)
    state, message = upstream_state(upstream)
    if args.dry_run:
        print(json.dumps({"queueStatus": state, "message": message, "planStatus": plan["status"]}, ensure_ascii=False))
        return 0 if state in {"waiting", "waiting_for_queue_exit", "ready"} else 2
    lock_descriptor = acquire_lock()
    try:
        update_plan(plan_path, plan, "queued_waiting_for_v6", message)
        while state == "waiting":
            print(message, flush=True)
            time.sleep(POLL_SECONDS)
            upstream = read_json(upstream_path)
            state, message = upstream_state(upstream)
        if state != "ready":
            update_plan(plan_path, plan, "upstream_failed", message)
            print(message, file=sys.stderr, flush=True)
            return 2

        input_path, manifest_path, _, output_path = validate_plan(plan, ROOT)
        model_dir = validate_v6_completion(plan, upstream, ROOT)
        update_plan(plan_path, plan, "running", "v6 is complete; starting the local held-out neighborhood Si benchmark on MPS.")
        argv = [
            sys.executable,
            str((ROOT / plan["benchmarkScript"]).resolve()),
            "--input", str(input_path),
            "--manifest", str(manifest_path),
            "--model-dir", str(model_dir),
            "--output", str(output_path),
            "--device", plan["device"],
        ]
        result = subprocess.run(argv, cwd=ROOT, capture_output=True, text=True, check=False)
        if result.returncode != 0:
            update_plan(plan_path, plan, "failed", f"Neighborhood benchmark exited with status {result.returncode}; inspect the local worker log.")
            print("Neighborhood benchmark failed; no model fallback was attempted.", file=sys.stderr, flush=True)
            return 3
        report = read_json(output_path)
        if (
            report.get("status") != "research_evaluation_only"
            or report.get("input", {}).get("sha256") != plan["dataset"]["sha256"]
            or report.get("input", {}).get("heldOutRows") != plan["dataset"]["testRows"]
            or report.get("actualDevice") != "mps"
        ):
            update_plan(plan_path, plan, "failed", "Benchmark output failed the held-out dataset/device verification.")
            return 4
        plan["result"] = {
            "path": str(output_path.relative_to(ROOT)),
            "sha256": sha256_file(output_path),
            "heldOutRows": report["input"]["heldOutRows"],
            "metrics": report["metrics"],
            "performance": report["performance"],
        }
        update_plan(plan_path, plan, COMPLETE_STATUS, "The local benchmark completed on the full held-out split; labels remain weak seller-geotag proxies.")
        if result.stdout.strip():
            print(result.stdout.strip(), flush=True)
        return 0
    except Exception as exc:
        update_plan(plan_path, plan, "failed", f"Queue stopped safely: {type(exc).__name__}.")
        raise
    finally:
        fcntl.flock(lock_descriptor, fcntl.LOCK_UN)
        os.close(lock_descriptor)


if __name__ == "__main__":
    raise SystemExit(main())
