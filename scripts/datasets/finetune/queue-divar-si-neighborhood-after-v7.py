#!/usr/bin/env python3
"""Run one guarded neighborhood RLCD experiment only after the full v7 benchmark."""

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
PLAN_RELATIVE = Path("data/si-experiments/divar-v8-neighborhood-candidate-rlcd-after-v7-2026-09-28.json")
POLL_SECONDS = 60
READY_STATUS = "research_evaluation_complete"
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


def repo_path(relative: str) -> Path:
    candidate = (ROOT / relative).resolve()
    try:
        candidate.relative_to(ROOT.resolve())
    except ValueError as exc:
        raise ValueError("Neighborhood queue artifacts must stay inside the repository.") from exc
    return candidate


def upstream_state(v7: dict[str, Any]) -> tuple[str, str]:
    status = v7.get("status")
    if status in FAILURE_STATUSES:
        return "failed", f"v7 neighborhood benchmark ended with status {status!r}; v8 will not train."
    if status == READY_STATUS:
        return "ready", "v7 full held-out MPS benchmark completed; the next single-MPS research stage may preflight."
    return "waiting", f"v7 benchmark is not complete (status={status!r}); v8 will not allocate MPS."


def validate_plan(plan: dict[str, Any]) -> tuple[Path, Path, Path, Path, Path]:
    if plan.get("status") not in {"queued_waiting_for_v7", "running"}:
        raise ValueError(f"Neighborhood training queue is not startable (status={plan.get('status')!r}).")
    if plan.get("device") != "mps" or plan.get("maxConcurrentMpsJobs") != 1:
        raise ValueError("The neighborhood training plan must enforce the single-MPS constraint.")
    if plan.get("python") != "mini-services/si-post/.venv/bin/python":
        raise ValueError("Neighborhood queue must use the exact pinned in-repository Si virtual environment.")
    python_path = (ROOT / plan["python"]).resolve(strict=True)
    if Path(sys.executable).resolve() != python_path.resolve(strict=True):
        raise ValueError("Neighborhood queue must use the pinned local Si virtual environment.")
    dataset = plan["dataset"]
    input_path = repo_path(dataset["path"])
    manifest_path = repo_path(dataset["manifestPath"])
    v6_plan_path = repo_path(plan["v6PlanPath"])
    v7_plan_path = repo_path(plan["v7PlanPath"])
    trainer_path = repo_path(plan["trainerScript"])
    for path in (input_path, manifest_path, v6_plan_path, v7_plan_path, trainer_path):
        if not path.is_file():
            raise FileNotFoundError(f"Required v8 input is missing: {path.relative_to(ROOT)}")
    corpus = read_json(manifest_path)
    if (
        corpus.get("status") != "complete_shadow_only"
        or corpus.get("taskType") != plan["taskType"]
        or corpus.get("outputRows") != dataset["rows"]
        or corpus.get("outputSha256") != dataset["sha256"]
        or corpus.get("outputBytes") != input_path.stat().st_size
        or corpus.get("provenance", {}).get("realNeedGroundTruth") is not False
        or corpus.get("provenance", {}).get("trainingEligible") is not False
        or corpus.get("provenance", {}).get("cloudTransferAllowed") is not False
        or sha256_file(input_path) != dataset["sha256"]
    ):
        raise ValueError("The weak-label corpus no longer matches the reviewed immutable v8 plan.")
    for relative in plan["experimentDirectories"].values():
        if repo_path(relative).exists():
            raise FileExistsError(f"Refusing to overwrite existing research output: {relative}")
    return input_path, manifest_path, v6_plan_path, v7_plan_path, trainer_path


def validate_upstream_artifacts(plan: dict[str, Any], v6: dict[str, Any], v7: dict[str, Any]) -> tuple[Path, str, dict[str, Any]]:
    if v6.get("status") != READY_STATUS or v7.get("status") != READY_STATUS:
        raise ValueError("Both v6 full evaluation and v7 full held-out benchmark must be complete.")
    v7_result = v7.get("result", {})
    benchmark_path = repo_path(v7_result.get("path", ""))
    if not benchmark_path.is_file() or sha256_file(benchmark_path) != v7_result.get("sha256"):
        raise ValueError("The v7 benchmark report is missing or changed after completion.")
    benchmark = read_json(benchmark_path)
    dataset = v7.get("dataset", {})
    benchmark_model = benchmark.get("model", {})
    if (
        benchmark.get("status") != "research_evaluation_only"
        or benchmark.get("actualDevice") != "mps"
        or benchmark.get("input", {}).get("sha256") != dataset.get("sha256")
        or benchmark.get("input", {}).get("heldOutRows") != dataset.get("testRows")
        or benchmark_model.get("model") != plan["model"]["id"]
        or benchmark_model.get("revision") != plan["model"]["revision"]
        or not isinstance(benchmark_model.get("weightsSha256"), str)
    ):
        raise ValueError("The v7 report does not prove a complete benchmark of the pinned Si checkpoint.")

    launch_argv = v6.get("launchArgv")
    if not isinstance(launch_argv, list) or "--experiment-dir" not in launch_argv:
        raise ValueError("The v6 plan lacks its exact completed model directory.")
    parent_dir = repo_path(launch_argv[launch_argv.index("--experiment-dir") + 1])
    v6_manifest = read_json(parent_dir / "manifest.json")
    v6_evaluation = read_json(parent_dir / "evaluation-detailed.json")
    parent_weights = parent_dir / "model.safetensors"
    parent_hash = sha256_file(parent_weights) if parent_weights.is_file() else None
    if (
        v6_manifest.get("status") != "research_run_complete"
        or v6_manifest.get("productionLoadAllowed") is not False
        or v6_manifest.get("experimentOnly") is not True
        or v6_manifest.get("device") != "mps"
        or v6_evaluation.get("status") != "research_evaluation_only"
        or v6_evaluation.get("device") != "mps"
        or parent_hash != benchmark_model.get("weightsSha256")
    ):
        raise ValueError("The v6 checkpoint does not exactly match the model evaluated by v7.")
    return parent_dir, parent_hash, benchmark


def command(plan: dict[str, Any], input_path: Path, manifest_path: Path, parent_dir: Path,
            parent_hash: str, experiment_dir: str, train_limit: int) -> list[str]:
    training = plan["training"]
    return [
        str(repo_path(plan["python"])), str(repo_path(plan["trainerScript"])),
        "--input", str(input_path), "--manifest", str(manifest_path),
        "--parent-model-dir", str(parent_dir), "--parent-weights-sha256", parent_hash,
        "--expected-dataset-sha256", plan["dataset"]["sha256"],
        "--expected-dataset-rows", str(plan["dataset"]["rows"]),
        "--experiment-dir", str(repo_path(experiment_dir)),
        "--allow-weak-location-experiment", "--train-row-limit", str(train_limit),
        "--epochs", str(training["epochs"]),
        "--micro-batch-size", str(training["microBatchSize"]),
        "--grad-accumulation", str(training["gradientAccumulation"]),
        "--group-size", str(training["groupSize"]),
        "--encoder-learning-rate", str(training["encoderLearningRate"]),
        "--head-learning-rate", str(training["headLearningRate"]),
        "--threads", str(training["threads"]), "--device", "mps",
        "--max-len", str(training["maxLen"]), "--head-max-len", str(training["headMaxLen"]),
        "--checkpoint-steps", str(training["checkpointSteps"]), "--seed", str(training["seed"]),
    ]


def validate_preflight(report: dict[str, Any], plan: dict[str, Any], expected_train_rows: int) -> None:
    training = plan["training"]
    if (
        report.get("status") != "validated_only"
        or report.get("trainingPerformed") is not False
        or report.get("taskType") != plan["taskType"]
        or report.get("trainableScope") != "encoder+typed-decision-head"
        or report.get("device") != "mps"
        or report.get("inputSha256") != plan["dataset"]["sha256"]
        or report.get("selectedRows", {}).get("train") != expected_train_rows
        or report.get("selectedRows", {}).get("calibration") != plan["dataset"]["split"]["calibration"]
        or report.get("selectedRows", {}).get("test") != plan["dataset"]["split"]["test"]
        or report.get("effectiveBatchSize") != training["microBatchSize"] * training["gradientAccumulation"]
        or report.get("groupSize") != training["groupSize"]
    ):
        raise ValueError("The neighborhood trainer preflight differs from the reviewed plan.")


def validate_run(experiment_dir: Path, plan: dict[str, Any], parent_hash: str,
                 expected_train_rows: int) -> dict[str, Any]:
    manifest_path = experiment_dir / "manifest.json"
    evaluation_path = experiment_dir / "evaluation.json"
    model_path = experiment_dir / "model.safetensors"
    if not all(path.is_file() for path in (manifest_path, evaluation_path, model_path)):
        raise ValueError("The neighborhood pilot lacks a complete manifest, evaluation or model checkpoint.")
    manifest, evaluation = read_json(manifest_path), read_json(evaluation_path)
    if (
        manifest.get("status") != "research_run_complete"
        or manifest.get("productionLoadAllowed") is not False
        or manifest.get("realNeedGroundTruth") is not False
        or manifest.get("trainingEligible") is not False
        or manifest.get("taskType") != plan["taskType"]
        or manifest.get("dataSha256") != plan["dataset"]["sha256"]
        or manifest.get("parentWeightsSha256") != parent_hash
        or manifest.get("device") != "mps"
        or manifest.get("selectedRows", {}).get("train") != expected_train_rows
        or evaluation.get("status") != "research_evaluation_only"
        or evaluation.get("productionLoadAllowed") is not False
        or evaluation.get("realUserNeedAccuracyEstablished") is not False
        or evaluation.get("datasetSha256") != plan["dataset"]["sha256"]
        or evaluation.get("device") != "mps"
        or evaluation.get("selectedModel", {}).get("test", {}).get("rows") != plan["dataset"]["split"]["test"]
    ):
        raise ValueError("Neighborhood checkpoint/evaluation failed the immutable research-only gate.")
    return {"manifest": manifest, "evaluation": evaluation}


def update_plan(plan_path: Path, plan: dict[str, Any], status: str, note: str) -> None:
    plan["status"] = status
    plan["queue"] = {"updatedAt": utc_now(), "note": note}
    atomic_json(plan_path, plan)


def acquire_lock() -> int:
    path = Path("/private/tmp/niazfinder-si-v8-neighborhood-queue.lock")
    descriptor = os.open(path, os.O_CREAT | os.O_RDWR, 0o600)
    try:
        fcntl.flock(descriptor, fcntl.LOCK_EX | fcntl.LOCK_NB)
    except BlockingIOError as exc:
        os.close(descriptor)
        raise RuntimeError("Another neighborhood v8 queue already holds the lock.") from exc
    os.ftruncate(descriptor, 0)
    os.write(descriptor, f"pid={os.getpid()}\nstartedAt={utc_now()}\n".encode())
    return descriptor


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--dry-run", action="store_true", help="Check gates only; never load Si or allocate MPS.")
    args = parser.parse_args()
    plan_path = repo_path(str(PLAN_RELATIVE))
    plan = read_json(plan_path)
    input_path, manifest_path, v6_plan_path, v7_plan_path, _trainer_path = validate_plan(plan)
    state, message = upstream_state(read_json(v7_plan_path))
    if args.dry_run:
        print(json.dumps({"queueStatus": state, "message": message, "planStatus": plan["status"]}, ensure_ascii=False))
        return 0 if state in {"waiting", "ready"} else 2

    descriptor = acquire_lock()
    try:
        update_plan(plan_path, plan, "queued_waiting_for_v7", message)
        while state == "waiting":
            print(message, flush=True)
            time.sleep(POLL_SECONDS)
            state, message = upstream_state(read_json(v7_plan_path))
            if state == "waiting":
                update_plan(plan_path, plan, "queued_waiting_for_v7", message)
        if state != "ready":
            update_plan(plan_path, plan, "upstream_failed", message)
            print(message, file=sys.stderr, flush=True)
            return 2

        v6, v7 = read_json(v6_plan_path), read_json(v7_plan_path)
        parent_dir, parent_hash, benchmark = validate_upstream_artifacts(plan, v6, v7)
        plan["upstreamResults"] = {
            "v7Benchmark": v7["result"]["path"],
            "v7BenchmarkSha256": v7["result"]["sha256"],
            "v7HeldOutRows": benchmark["input"]["heldOutRows"],
            "parentWeightsSha256": parent_hash,
        }

        pilot_relative = plan["experimentDirectories"]["pilot"]
        pilot_argv = command(plan, input_path, manifest_path, parent_dir, parent_hash, pilot_relative, plan["pilotTrainRows"])
        pilot_preflight = subprocess.run([*pilot_argv, "--validate-only"], cwd=ROOT, capture_output=True, text=True, check=False)
        if pilot_preflight.returncode != 0:
            details = (pilot_preflight.stderr or pilot_preflight.stdout)[-2000:]
            raise RuntimeError(f"Neighborhood MPS pilot preflight failed; no training was launched. {details}")
        validate_preflight(json.loads(pilot_preflight.stdout), plan, plan["pilotTrainRows"])
        update_plan(plan_path, plan, "pilot_running", "v7 completed; bounded MPS neighborhood pilot is running.")
        pilot = subprocess.run(pilot_argv, cwd=ROOT, check=False)
        if pilot.returncode != 0:
            update_plan(plan_path, plan, "pilot_failed", f"The bounded MPS pilot exited with status {pilot.returncode}.")
            return 3
        validate_run(repo_path(pilot_relative), plan, parent_hash, plan["pilotTrainRows"])

        full_relative = plan["experimentDirectories"]["full"]
        full_argv = command(plan, input_path, manifest_path, parent_dir, parent_hash, full_relative, 0)
        full_preflight = subprocess.run([*full_argv, "--validate-only"], cwd=ROOT, capture_output=True, text=True, check=False)
        if full_preflight.returncode != 0:
            details = (full_preflight.stderr or full_preflight.stdout)[-2000:]
            raise RuntimeError(f"Full neighborhood preflight failed after pilot; full training was not launched. {details}")
        validate_preflight(json.loads(full_preflight.stdout), plan, plan["dataset"]["split"]["train"])
        update_plan(plan_path, plan, "running", "Bounded MPS pilot passed; full neighborhood RLCD fine-tuning is running.")
        full_run = subprocess.run(full_argv, cwd=ROOT, capture_output=True, text=False, check=False)
        if full_run.returncode != 0:
            update_plan(plan_path, plan, "failed", f"Full neighborhood RLCD exited with status {full_run.returncode}.")
            return 4
        validated = validate_run(repo_path(full_relative), plan, parent_hash, plan["dataset"]["split"]["train"])
        plan["result"] = {
            "experimentDirectory": full_relative,
            "modelWeightsSha256": validated["manifest"]["modelWeightsSha256"],
            "baselineTest": validated["evaluation"]["baseline"]["test"],
            "selectedTest": validated["evaluation"]["selectedModel"]["test"],
            "productionLoadAllowed": False,
            "realUserNeedAccuracyEstablished": False,
        }
        update_plan(plan_path, plan, "research_run_complete", "Full held-out weak-label evaluation completed; checkpoint remains research-only.")
        return 0
    except Exception as exc:
        if plan.get("status") not in {"pilot_failed", "failed", "upstream_failed"}:
            update_plan(plan_path, plan, "failed", f"Neighborhood queue stopped safely: {type(exc).__name__}.")
        raise
    finally:
        fcntl.flock(descriptor, fcntl.LOCK_UN)
        os.close(descriptor)


if __name__ == "__main__":
    raise SystemExit(main())
