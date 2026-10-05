#!/usr/bin/env python3
"""Wait for v9, prepare its pseudo-label corpus, then run one gated local MPS stage."""

from __future__ import annotations

import argparse
import datetime as dt
import fcntl
import hashlib
import json
import os
import shutil
import subprocess
import sys
import time
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parents[3]
PLAN_RELATIVE = Path("data/si-experiments/divar-v10-si-pseudo-distillation-after-v9-2026-09-29.json")
POLL_SECONDS = 60
READY_STATUS = "research_audit_complete"
FAILURE_STATUSES = {"failed", "upstream_failed", "pilot_failed", "preflight_failed", "full_failed"}
MODEL_ID = "convaiinnovations/si-multilingual"
MODEL_REVISION = "e4e9ddf21a7b1903b7acffd8814ad4307bf63a67"
MODEL_WEIGHTS_SHA256 = "9d628fd971b700382ac6f65920a86f149777b2e748e0c955fb3b19695aa8f204"
TERMINAL = {"research_pseudo_distillation_complete", "failed", "upstream_failed", "preflight_failed", "training_failed"}


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
    os.chmod(temporary, 0o600)
    os.replace(temporary, path)


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(8 * 1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def repo_path(relative: str) -> Path:
    path = (ROOT / relative).resolve()
    try:
        path.relative_to(ROOT.resolve())
    except ValueError as exc:
        raise ValueError("v10 artifacts must remain inside this repository.") from exc
    return path


def upstream_state(upstream: dict[str, Any]) -> tuple[str, str]:
    status = upstream.get("status")
    if status in FAILURE_STATUSES:
        return "failed", f"v9 ended with status {status!r}; v10 will not start."
    if status == READY_STATUS:
        return "ready", "v9 audit completed; v10 may prepare the research pseudo-label corpus."
    return "waiting", f"v9 is not complete (status={status!r}); v10 will remain idle."


def validate_plan(plan: dict[str, Any]) -> tuple[Path, Path, Path, Path, Path, Path, Path]:
    allowed = {"queued_waiting_for_v9", "building_cpu_dataset", "dataset_ready_waiting_for_mps", "waiting_for_mps_locks", "training_mps"} | TERMINAL
    if plan.get("status") not in allowed:
        raise ValueError(f"v10 queue is not startable (status={plan.get('status')!r}).")
    model = plan.get("model", {})
    if (
        plan.get("taskType") != "divar-si-pseudo-distillation/v1"
        or plan.get("upstreamRequiredStatus") != READY_STATUS
        or model.get("id") != MODEL_ID
        or model.get("revision") != MODEL_REVISION
        or model.get("weightsSha256") != MODEL_WEIGHTS_SHA256
        or plan.get("device") != "mps"
        or plan.get("maxConcurrentPlannedMpsJobs") != 1
        or plan.get("cloudTransferAllowed") is not False
    ):
        raise ValueError("v10 plan differs from the pinned local-only single-MPS contract.")
    python_lexical_path = ROOT / plan["python"]
    try:
        python_lexical_path.relative_to(ROOT)
    except ValueError as exc:
        raise ValueError("The Si Python executable must be referenced from the repository environment.") from exc
    python_path = python_lexical_path.resolve(strict=True)
    if python_path != Path(sys.executable).resolve():
        raise ValueError("Run v10 with the pinned mini-services/si-post Python environment.")
    upstream_path = repo_path(plan["upstreamPlanPath"])
    v8_plan_path = repo_path(plan["v8PlanPath"])
    builder_path = repo_path(plan["builderScript"])
    trainer_path = repo_path(plan["trainerScript"])
    upstream_contract = read_json(upstream_path)
    input_path = repo_path(upstream_contract["outputs"]["uniquePath"])
    input_manifest_path = repo_path(upstream_contract["outputs"]["manifestPath"])
    dataset = plan["dataset"]
    output_path = repo_path(dataset["path"])
    output_manifest_path = repo_path(dataset["manifestPath"])
    quarantine_path = repo_path(dataset["quarantinePath"])
    experiment_path = repo_path(plan["training"]["experimentDirectory"])
    for path in (upstream_path, v8_plan_path, builder_path, trainer_path):
        if not path.is_file():
            raise FileNotFoundError(f"Required v10 file is missing: {path.relative_to(ROOT)}")
    if Path(str(output_path) + ".manifest.json") != output_manifest_path:
        raise ValueError("v10 manifest path must be the JSONL sidecar.")
    if len({input_path, input_manifest_path, output_path, output_manifest_path, quarantine_path}) != 5:
        raise ValueError("v10 input and outputs must all be separate artifacts.")
    model_dir = Path(model["localDirectory"]).expanduser().resolve(strict=True)
    if not (model_dir / "model.safetensors").is_file():
        raise FileNotFoundError("Pinned local Si checkpoint weights are missing.")
    return upstream_path, v8_plan_path, input_path, input_manifest_path, output_path, output_manifest_path, quarantine_path


def validate_v9_result(upstream_plan: dict[str, Any], root_plan: dict[str, Any]) -> tuple[Path, Path, Path, str]:
    if upstream_plan.get("status") != READY_STATUS:
        raise ValueError("v9 has not completed its successful audit.")
    result = upstream_plan.get("result", {})
    unique_path = repo_path(result.get("uniquePath", ""))
    manifest_path = repo_path(result.get("manifestPath", ""))
    if not unique_path.is_file() or not manifest_path.is_file():
        raise FileNotFoundError("The v9 finalized corpus or sidecar is missing.")
    expected_sha = result.get("uniqueSha256")
    if not isinstance(expected_sha, str) or sha256_file(unique_path) != expected_sha:
        raise ValueError("The v9 finalized corpus changed after the queue recorded its hash.")
    manifest = read_json(manifest_path)
    if (
        result.get("manifestSha256") != sha256_file(manifest_path)
        or manifest.get("status") != "complete"
        or manifest.get("taskType") != "divar-counterfactual-post-need-si-proposal/v5"
        or manifest.get("model") != MODEL_ID
        or manifest.get("synthetic") is not True
        or manifest.get("derivedFromSupplyListing") is not True
        or manifest.get("trainingEligible") is not False
        or manifest.get("realNeedGroundTruth") is not False
        or manifest.get("rightsReview") != "pending"
        or result.get("trainingEligible") is not False
        or result.get("realNeedGroundTruth") is not False
    ):
        raise ValueError("The v9 artifact failed its synthetic-only provenance gates.")
    v8_plan = read_json(repo_path(root_plan["v8PlanPath"]))
    v8_output_path = repo_path(v8_plan["outputs"]["full"]["path"])
    v8_manifest_path = Path(str(v8_output_path) + ".manifest.json")
    if not v8_manifest_path.is_file():
        raise FileNotFoundError("The v8 typed-question manifest is missing.")
    return unique_path, manifest_path, v8_manifest_path, expected_sha


def validate_v10_dataset(path: Path, manifest_path: Path, plan: dict[str, Any]) -> dict[str, Any]:
    manifest = read_json(manifest_path)
    if (
        manifest.get("status") != "complete"
        or manifest.get("taskType") != plan.get("taskType")
        or manifest.get("model") != MODEL_ID
        or manifest.get("modelRevision") != MODEL_REVISION
        or manifest.get("teacherWeightsSha256") != MODEL_WEIGHTS_SHA256
        or manifest.get("synthetic") is not True
        or manifest.get("realNeedGroundTruth") is not False
        or manifest.get("trainingEligible") is not False
        or manifest.get("targetOrigin") != "si_pseudo_labels_not_gold"
        or manifest.get("siPredictionsUsedAsLabels") is not True
        or manifest.get("outputBytes") != path.stat().st_size
        or manifest.get("outputSha256") != sha256_file(path)
        or manifest.get("outputRows", 0) < int(plan["dataset"]["minimumRows"])
    ):
        raise ValueError("The prepared v10 dataset failed its hash, row-count, or provenance gates.")
    return manifest


def update_plan(path: Path, plan: dict[str, Any], status: str, note: str) -> None:
    plan["status"] = status
    plan["queue"] = {"updatedAt": utc_now(), "note": note}
    atomic_json(path, plan)


def acquire_lock(path: Path) -> int:
    descriptor = os.open(path, os.O_CREAT | os.O_RDWR, 0o600)
    try:
        fcntl.flock(descriptor, fcntl.LOCK_EX | fcntl.LOCK_NB)
    except BlockingIOError:
        os.close(descriptor)
        raise
    os.ftruncate(descriptor, 0)
    os.write(descriptor, f"pid={os.getpid()}\nstartedAt={utc_now()}\n".encode())
    return descriptor


def run_json(argv: list[str], *, cwd: Path, log_path: Path | None = None) -> tuple[int, str]:
    if log_path is None:
        completed = subprocess.run(argv, cwd=cwd, capture_output=True, text=True, check=False)
        return completed.returncode, completed.stdout
    log_path.parent.mkdir(parents=True, exist_ok=True)
    with log_path.open("ab") as stream:
        os.chmod(log_path, 0o600)
        completed = subprocess.run(argv, cwd=cwd, stdout=stream, stderr=subprocess.STDOUT, check=False)
    return completed.returncode, ""


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--dry-run", action="store_true", help="Check queue gates only; do not write or train.")
    args = parser.parse_args()
    plan_path = ROOT / PLAN_RELATIVE
    plan = read_json(plan_path)
    upstream_path, v8_plan_path, input_path, input_manifest_path, output_path, output_manifest_path, quarantine_path = validate_plan(plan)
    experiment_path = repo_path(plan["training"]["experimentDirectory"])
    upstream = read_json(upstream_path)
    state, message = upstream_state(upstream)
    if args.dry_run:
        print(json.dumps({
            "queueStatus": state,
            "message": message,
            "planStatus": plan["status"],
            "device": "mps",
            "willAllocateMps": False,
            "automaticTrainingAfterGates": plan["training"]["automaticAfterUpstreamAndPreflight"],
            "preparedDatasetExists": output_path.is_file() and output_manifest_path.is_file(),
            "v9ResultReady": bool(upstream.get("result")),
        }, ensure_ascii=False))
        return 0 if state in {"waiting", "ready"} else 2
    if plan["status"] in TERMINAL:
        print(json.dumps({"status": plan["status"], "result": plan.get("result", {})}, ensure_ascii=False))
        return 0 if plan["status"] == "research_pseudo_distillation_complete" else 2

    queue_lock_path = Path("/private/tmp/niazfinder-si-v10-pseudo-distillation.lock")
    try:
        queue_lock = acquire_lock(queue_lock_path)
    except BlockingIOError as exc:
        raise SystemExit("Another v10 queue already holds the stage lock.") from exc
    mps_locks: list[int] = []
    try:
        if state == "failed":
            update_plan(plan_path, plan, "upstream_failed", message)
            return 2
        while state == "waiting":
            update_plan(plan_path, plan, "queued_waiting_for_v9", message)
            print(message, flush=True)
            time.sleep(POLL_SECONDS)
            upstream = read_json(upstream_path)
            state, message = upstream_state(upstream)
        if state != "ready":
            update_plan(plan_path, plan, "upstream_failed", message)
            return 2

        unique_path, v9_manifest_path, v8_manifest_path, expected_sha = validate_v9_result(upstream, plan)
        builder = repo_path(plan["builderScript"])
        trainer = repo_path(plan["trainerScript"])
        python = str((ROOT / plan["python"]).resolve(strict=True))
        output_path.parent.mkdir(parents=True, exist_ok=True)
        log_path = ROOT / "data/si-experiments/divar-v10-si-pseudo-distillation-after-v9-2026-09-29/queue.log"
        log_path.parent.mkdir(parents=True, exist_ok=True)
        if plan["status"] == "queued_waiting_for_v9":
            if output_path.exists() or output_manifest_path.exists() or quarantine_path.exists():
                raise FileExistsError("A v10 dataset artifact already exists; refusing to overwrite it.")
            update_plan(plan_path, plan, "building_cpu_dataset", "v9 validated; preparing the filtered, deduplicated, hashed-split pseudo-label dataset on CPU.")
            builder_argv = [
                python, str(builder),
                "--input", str(unique_path), "--input-manifest", str(v9_manifest_path),
                "--questions-manifest", str(v8_manifest_path), "--expected-input-sha256", expected_sha,
                "--output", str(output_path), "--quarantine", str(quarantine_path),
                "--min-rows", str(plan["dataset"]["minimumRows"]),
            ]
            code, builder_stdout = run_json(builder_argv, cwd=ROOT)
            with log_path.open("ab") as log:
                os.chmod(log_path, 0o600)
                log.write(builder_stdout.encode("utf-8"))
                log.write(b"\n")
            if code != 0:
                raise RuntimeError("The CPU-only v10 dataset preparation failed; see the protected queue log.")
            try:
                builder_result = json.loads(builder_stdout)
            except json.JSONDecodeError as exc:
                raise RuntimeError("The v10 builder did not return its expected completion record.") from exc
            if builder_result.get("status") != "complete" or builder_result.get("trainingEligible") is not False:
                raise ValueError("The v10 builder result failed its research-only contract.")
            plan["preparedDataset"] = builder_result
            update_plan(plan_path, plan, "dataset_ready_waiting_for_mps", "CPU dataset preparation completed; validating the local trainer before waiting for the MPS lock.")
        elif plan["status"] not in {"dataset_ready_waiting_for_mps", "waiting_for_mps_locks"}:
            raise ValueError("v10 queue cannot safely resume from this intermediate status.")

        if not output_path.is_file() or not output_manifest_path.is_file():
            raise FileNotFoundError("The prepared v10 corpus is missing.")
        v10_manifest = validate_v10_dataset(output_path, output_manifest_path, plan)
        model_dir = Path(plan["model"]["localDirectory"]).expanduser().resolve(strict=True)
        experiment_dir = repo_path(plan["training"]["experimentDirectory"])
        if experiment_dir.exists():
            raise FileExistsError("The v10 experiment directory already exists; refusing to resume/overwrite an unverified run.")
        training = plan["training"]
        common = [
            python, str(trainer), "--input", str(output_path), "--manifest", str(output_manifest_path),
            "--model-dir", str(model_dir), "--experiment-dir", str(experiment_dir),
            "--allow-synthetic-experiment", "--allow-si-pseudo-label-distillation",
            "--device", "mps", "--train-row-limit", "0",
            "--eval-row-limit", str(training["evaluationRowsPerSplit"]),
            "--epochs", str(training["epochs"]), "--batch-size", str(training["batchSize"]),
            "--learning-rate", str(training["learningRate"]), "--threads", str(training["threads"]),
            "--shuffle-buffer", str(training["shuffleBuffer"]),
            "--checkpoint-steps", str(training["checkpointEverySteps"]), "--seed", str(training["seed"]),
        ]
        preflight_code, preflight_output = run_json(common + ["--validate-only"], cwd=ROOT)
        if preflight_code != 0:
            update_plan(plan_path, plan, "preflight_failed", "The dedicated pseudo-distillation trainer rejected the dataset/model contract.")
            raise RuntimeError("v10 trainer preflight failed; no MPS training was started.")
        preflight = json.loads(preflight_output)
        if (
            preflight.get("status") != "validated_only"
            or preflight.get("trainingPerformed") is not False
            or preflight.get("model") != MODEL_ID
            or preflight.get("modelRevision") != MODEL_REVISION
            or preflight.get("baseWeightsSha256") != MODEL_WEIGHTS_SHA256
            or preflight.get("dataSummary", {}).get("rowCount") != v10_manifest.get("outputRows")
        ):
            raise ValueError("v10 preflight did not attest to the pinned local pseudo-label experiment.")
        plan["preflight"] = {
            "status": preflight["status"],
            "rows": preflight["dataSummary"]["rowCount"],
            "selectedRows": preflight["selectedRows"],
            "baseWeightsSha256": preflight["baseWeightsSha256"],
            "trainingPerformed": False,
        }

        lock_paths = [Path(path) for path in plan["mpsLocks"]]
        own_mps_path = Path("/private/tmp/niazfinder-si-v10-mps.lock")
        lock_paths.append(own_mps_path)
        while True:
            busy_path: Path | None = None
            for path in lock_paths:
                try:
                    mps_locks.append(acquire_lock(path))
                except BlockingIOError:
                    busy_path = path
                    break
            if busy_path is None:
                break
            for descriptor in mps_locks:
                fcntl.flock(descriptor, fcntl.LOCK_UN)
                os.close(descriptor)
            mps_locks.clear()
            update_plan(plan_path, plan, "waiting_for_mps_locks", f"Waiting for an earlier Si MPS stage to release {busy_path.name}; no training has started.")
            print(f"Waiting for prior MPS lock: {busy_path.name}", flush=True)
            time.sleep(POLL_SECONDS)

        update_plan(plan_path, plan, "training_mps", "All tracked prior Si queue locks are free; starting one local MPS pseudo-distillation experiment.")
        command = common
        caffeinate = shutil.which("caffeinate")
        if caffeinate:
            command = [caffeinate, "-i", *common]
        with log_path.open("ab") as stream:
            os.chmod(log_path, 0o600)
            training_process = subprocess.run(command, cwd=ROOT, stdout=stream, stderr=subprocess.STDOUT, check=False)
        if training_process.returncode != 0:
            update_plan(plan_path, plan, "training_failed", "The v10 training process exited unsuccessfully; preserve checkpoints and inspect the protected queue log.")
            return training_process.returncode or 1

        result_manifest_path = experiment_dir / "manifest.json"
        evaluation_path = experiment_dir / "evaluation.json"
        result_manifest = read_json(result_manifest_path)
        evaluation = read_json(evaluation_path)
        if (
            result_manifest.get("status") != "research_pseudo_distillation_complete"
            or result_manifest.get("siPredictionsUsedAsLabels") is not True
            or result_manifest.get("productionLoadAllowed") is not False
            or evaluation.get("notRealNeedAccuracy") is not True
            or result_manifest.get("teacherWeightsSha256") != MODEL_WEIGHTS_SHA256
        ):
            raise ValueError("The completed v10 artifacts failed their research-only provenance gates.")
        plan["result"] = {
            "experimentDirectory": str(experiment_dir.relative_to(ROOT)),
            "manifestSha256": sha256_file(result_manifest_path),
            "evaluationSha256": sha256_file(evaluation_path),
            "datasetSha256": v10_manifest["outputSha256"],
            "rows": v10_manifest["outputRows"],
            "status": result_manifest["status"],
            "trainingEligibleForProduction": False,
            "realNeedAccuracyEstablished": False,
            "metricMeaning": "held-out teacher agreement only",
        }
        update_plan(plan_path, plan, "research_pseudo_distillation_complete", "The local pseudo-distillation experiment completed; its metrics are teacher agreement only and do not authorize production use.")
        print(json.dumps({"status": plan["status"], "result": plan["result"]}, ensure_ascii=False, indent=2))
        return 0
    except KeyboardInterrupt:
        update_plan(plan_path, plan, "training_failed", "Queue interrupted; any completed checkpoint remains in its experiment directory.")
        raise
    except Exception:
        if plan.get("status") not in TERMINAL:
            update_plan(plan_path, plan, "failed", "v10 stopped on a validation or runtime error; no artifact was promoted.")
        raise
    finally:
        for descriptor in mps_locks:
            fcntl.flock(descriptor, fcntl.LOCK_UN)
            os.close(descriptor)
        fcntl.flock(queue_lock, fcntl.LOCK_UN)
        os.close(queue_lock)


if __name__ == "__main__":
    raise SystemExit(main())
