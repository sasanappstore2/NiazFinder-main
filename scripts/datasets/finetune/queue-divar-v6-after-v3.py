#!/usr/bin/env python3
"""Run the prepared v6 Si experiment only after the v3 MPS run completes cleanly."""

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
PLAN_RELATIVE = Path(
    "data/si-experiments/"
    "divar-v6-explicit-rent-mode-mps-full-2026-09-28.launch-plan.json"
)
STALE_PROGRESS_SECONDS = 3 * 60 * 60
POLL_SECONDS = 60


def utc_now() -> str:
    return dt.datetime.now(dt.timezone.utc).isoformat()


def read_json(path: Path) -> dict[str, Any]:
    value = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(value, dict):
        raise ValueError(f"Expected a JSON object in {path.name}.")
    return value


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def update_plan(path: Path, plan: dict[str, Any], status: str, note: str) -> None:
    plan["status"] = status
    plan["queue"] = {"updatedAt": utc_now(), "note": note}
    temporary = path.with_name(path.name + ".tmp")
    temporary.write_text(json.dumps(plan, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    os.replace(temporary, path)


def arg_value(argv: list[str], flag: str) -> str | None:
    try:
        return argv[argv.index(flag) + 1]
    except (ValueError, IndexError):
        return None


def validate_plan(plan: dict[str, Any], root: Path) -> tuple[Path, Path, Path]:
    if plan.get("status") not in {"prepared_not_started", "queued_waiting_for_v3"}:
        raise ValueError(f"Launch plan is not startable (status={plan.get('status')!r}).")
    if plan.get("training", {}).get("maxConcurrentMpsJobs") != 1:
        raise ValueError("The plan must forbid concurrent MPS jobs.")
    training = plan.get("training", {})
    if (
        training.get("method") != "official_si_rlcd_full_parameter_v1"
        or training.get("device") != "mps"
        or training.get("effectiveBatchSize") != (
            training.get("microBatchSize", 0) * training.get("gradientAccumulation", 0)
        )
    ):
        raise ValueError("The next stage must use the reviewed full-parameter MPS RLCD configuration.")
    launch_argv = plan.get("launchArgv")
    if (
        not isinstance(launch_argv, list)
        or len(launch_argv) < 2
        or launch_argv[1] != "scripts/datasets/finetune/train-divar-si-rlcd.py"
        or "--micro-batch-size" not in launch_argv
        or "--grad-accumulation" not in launch_argv
        or "--device" not in launch_argv
        or launch_argv[launch_argv.index("--device") + 1] != "mps"
    ):
        raise ValueError("The v6 launch command must use the full-parameter RLCD trainer on MPS.")
    pilot_argv = plan.get("pilotArgv")
    if (
        not isinstance(pilot_argv, list)
        or len(pilot_argv) < 2
        or pilot_argv[0] != launch_argv[0]
        or pilot_argv[1] != launch_argv[1]
        or "--train-row-limit" not in pilot_argv
        or int(pilot_argv[pilot_argv.index("--train-row-limit") + 1]) < 1
        or "--device" not in pilot_argv
        or pilot_argv[pilot_argv.index("--device") + 1] != "mps"
    ):
        raise ValueError("A bounded MPS pilot using the same trainer/runtime is required before full v6.")
    for flag in ("--input", "--manifest", "--model-dir"):
        if arg_value(pilot_argv, flag) != arg_value(launch_argv, flag):
            raise ValueError(f"The pilot and full run must share the reviewed source/config ({flag}).")
    if "--allow-synthetic-experiment" not in pilot_argv or "--allow-synthetic-experiment" not in launch_argv:
        raise ValueError("Both research-only runs must explicitly authorize synthetic-source experiments.")
    expected_arguments = {
        "--micro-batch-size": str(training["microBatchSize"]),
        "--grad-accumulation": str(training["gradientAccumulation"]),
        "--group-size": str(training["groupSize"]),
        "--max-len": str(training["maxLen"]),
        "--head-max-len": str(training["headMaxLen"]),
        "--train-row-limit": "0",
        "--eval-row-limit": str(training["evaluationRowLimitPerSplit"]),
    }
    for flag, expected in expected_arguments.items():
        if arg_value(launch_argv, flag) != expected:
            raise ValueError(f"The full v6 launch arguments do not match the plan ({flag}).")
    pilot_rows = arg_value(pilot_argv, "--train-row-limit")
    if pilot_rows is None or int(pilot_rows) < 1 or int(pilot_rows) > 64:
        raise ValueError("The full-model MPS pilot must remain bounded to at most 64 source rows.")
    evaluation_argv = plan.get("evaluationArgv")
    if (
        not isinstance(evaluation_argv, list)
        or len(evaluation_argv) < 2
        or evaluation_argv[0] != plan.get("launchArgv", [None])[0]
        or not (root / evaluation_argv[1]).is_file()
        or "--test-row-limit" not in evaluation_argv
        or evaluation_argv[evaluation_argv.index("--test-row-limit") + 1] != "0"
    ):
        raise ValueError("The plan must schedule full held-out evaluation in the same pinned Python environment.")
    if plan.get("dataset", {}).get("provenance", {}).get("trainingEligibleForProduction") is not False:
        raise ValueError("The queued dataset must remain explicitly ineligible for production training.")
    dataset = plan["dataset"]
    data_path = root / dataset["path"]
    corpus_manifest_path = root / dataset["manifestPath"]
    upstream_dir = root / plan["upstreamGate"]["experimentDirectory"]
    for path in (data_path, corpus_manifest_path, upstream_dir / "manifest.json"):
        if not path.is_file():
            raise FileNotFoundError(f"Required queued-run artifact is missing: {path.relative_to(root)}")
    if not Path(plan["model"]["localDirectory"]).is_dir():
        raise FileNotFoundError("The pinned local Si checkpoint is unavailable.")
    if plan["launchArgv"][0] != sys.executable and not Path(plan["launchArgv"][0]).is_file():
        raise FileNotFoundError("The pinned Python runtime for the training command is unavailable.")
    output_dirs = []
    for command in (pilot_argv, launch_argv):
        output_dirs.append(root / command[command.index("--experiment-dir") + 1])
    if output_dirs[0] == output_dirs[1]:
        raise ValueError("The MPS pilot and full run must use separate output directories.")
    for experiment_dir in output_dirs:
        if experiment_dir.exists():
            raise FileExistsError(f"Experiment output already exists; refusing to overwrite: {experiment_dir.relative_to(root)}")
    return data_path, corpus_manifest_path, upstream_dir


def upstream_state(upstream_dir: Path, now: float | None = None) -> tuple[str, str]:
    manifest = read_json(upstream_dir / "manifest.json")
    status = manifest.get("status")
    if status == "research_run_complete":
        progress = read_json(upstream_dir / "training-progress.json")
        if not (upstream_dir / "evaluation.json").is_file():
            return "failed", "v3 says complete but its final evaluation artifact is missing."
        if progress.get("step") != progress.get("totalSteps"):
            return "failed", "v3 says complete but its final checkpoint is incomplete."
        return "ready", "v3 completed with final evaluation and checkpoint."
    if status != "running":
        return "failed", f"v3 ended without success (manifest status={status!r}); v6 will not start."

    progress_path = upstream_dir / "training-progress.json"
    if not progress_path.is_file():
        started = manifest.get("startedAtUnix")
        if not isinstance(started, (int, float)):
            return "failed", "v3 is running but has no progress file or valid start time."
        last_activity = float(started)
    else:
        last_activity = progress_path.stat().st_mtime
    current = now if now is not None else time.time()
    age = current - last_activity
    if age > STALE_PROGRESS_SECONDS:
        return "failed", f"v3 progress is stale ({int(age)} seconds); refusing to start another MPS job."
    progress = read_json(progress_path) if progress_path.is_file() else {}
    return "waiting", (
        f"v3 remains active at step {progress.get('step', 0)}/"
        f"{progress.get('totalSteps', 'unknown')}; last checkpoint {int(age)} seconds ago."
    )


def validate_dataset(plan: dict[str, Any], data_path: Path, manifest_path: Path) -> None:
    expected = plan["dataset"]
    corpus = read_json(manifest_path)
    if (
        corpus.get("status") != "complete"
        or corpus.get("taskType") != expected["taskType"]
        or corpus.get("outputRows") != expected["rows"]
        or corpus.get("outputBytes") != expected["bytes"]
        or corpus.get("outputSha256") != expected["sha256"]
        or corpus.get("synthetic") is not True
        or corpus.get("realNeedGroundTruth") is not False
        or corpus.get("trainingEligible") is not False
    ):
        raise ValueError("The v6 corpus manifest no longer matches the reviewed launch plan.")
    if data_path.stat().st_size != expected["bytes"] or sha256_file(data_path) != expected["sha256"]:
        raise ValueError("The v6 corpus file changed after the launch plan was prepared.")


def wait_for_upstream_processes_to_exit(plan: dict[str, Any]) -> None:
    expected_processes = plan["upstreamGate"].get("processesToObserve", [])
    if not expected_processes:
        raise ValueError("No exact upstream process identities are recorded; refusing overlapping launch.")
    ps = shutil.which("ps")
    if not ps:
        raise RuntimeError("Cannot verify that the v3 process exited; refusing to launch v6.")
    deadline = time.monotonic() + 10 * 60
    while True:
        alive: list[str] = []
        for item in expected_processes:
            result = subprocess.run(
                [ps, "-p", str(item["pid"]), "-o", "command="],
                capture_output=True,
                text=True,
                check=False,
            )
            if result.returncode not in {0, 1}:
                raise RuntimeError("Process identity check failed; refusing to launch v6.")
            command = result.stdout.strip()
            if not command:
                continue
            if item["commandMustContain"] not in command:
                raise RuntimeError(
                    f"Recorded PID {item['pid']} now belongs to a different process; refusing to launch v6."
                )
            alive.append(f"{item['pid']} ({item['commandMustContain']})")
        if not alive:
            return
        if time.monotonic() >= deadline:
            raise TimeoutError("v3 manifest completed but its process did not exit within 10 minutes.")
        print("Waiting for the completed v3 process to exit before starting v6: " + ", ".join(alive), flush=True)
        time.sleep(10)


def validate_preflight_report(plan: dict[str, Any], report: dict[str, Any]) -> None:
    training = plan["training"]
    dataset = plan["dataset"]
    summary = report.get("dataSummary")
    targets = report.get("selectedTrainingTargetsByField")
    if not isinstance(targets, dict):
        raise ValueError("The trainer preflight omitted its selected per-field target counts.")
    selected_decisions = sum(
        sum(counts.values())
        for field, counts in targets.items()
        if field in training["fields"] and isinstance(counts, dict)
    )
    micro_batch_size = int(training["microBatchSize"])
    accumulation = int(training["gradientAccumulation"])
    calculated_steps = (selected_decisions + micro_batch_size * accumulation - 1) // (micro_batch_size * accumulation)
    if (
        report.get("status") != "validated_only"
        or report.get("trainingPerformed") is not False
        or report.get("trainingMethod") != training["method"]
        or report.get("trainableScope") != "encoder+decision_head"
        or report.get("device") != training["device"]
        or report.get("evaluationSamplingPolicy") != training["evaluationSamplingPolicy"]
        or report.get("baseWeightsSha256") != plan["model"]["weightsSha256"]
        or summary.get("rowsBySplit", {}).get("train") != dataset["split"]["train"]
        or report.get("microBatchSize") != micro_batch_size
        or report.get("gradientAccumulation") != accumulation
        or report.get("effectiveBatchSize") != training["effectiveBatchSize"]
        or report.get("groupSize") != training["groupSize"]
        or report.get("maxLen") != training["maxLen"]
        or report.get("headMaxLen") != training["headMaxLen"]
        or selected_decisions != report.get("expectedTrainingDecisions")
        or report.get("expectedOptimizerSteps") != calculated_steps
    ):
        raise ValueError("The trainer preflight does not match the reviewed v6 launch plan.")
    selected_rows = report.get("selectedRows", {}).get("train")
    if not isinstance(selected_rows, int) or selected_rows < 1:
        raise ValueError("The trainer preflight selected no usable training rows.")
    if selected_rows == dataset["split"]["train"]:
        if (
            selected_decisions != training["expectedTrainingDecisions"]
            or calculated_steps != training["expectedOptimizerSteps"]
        ):
            raise ValueError("The full-run target count or optimizer-step estimate differs from the reviewed plan.")
    elif selected_rows >= dataset["split"]["train"]:
        raise ValueError("A bounded pilot unexpectedly selected the entire production-sized training partition.")


def validate_pilot_result(plan: dict[str, Any], experiment_dir: Path) -> None:
    manifest = read_json(experiment_dir / "manifest.json")
    progress = read_json(experiment_dir / "training-progress.json")
    if (
        manifest.get("status") != "research_run_complete"
        or manifest.get("device") != "mps"
        or manifest.get("trainingMethod") != plan["training"]["method"]
        or manifest.get("productionLoadAllowed") is not False
        or manifest.get("syntheticTargetsAreRealNeedGroundTruth") is not False
        or manifest.get("siPredictionsUsedAsLabels") is not False
        or progress.get("step") != progress.get("totalSteps")
        or not (experiment_dir / "model.safetensors").is_file()
        or not (experiment_dir / "evaluation.json").is_file()
    ):
        raise ValueError("The bounded MPS pilot did not finish under the approved research-only RLCD contract.")


def validate_evaluation_report(plan: dict[str, Any], report: dict[str, Any]) -> None:
    dataset = plan["dataset"]
    evaluation = plan["evaluation"]
    if (
        report.get("status") != "research_evaluation_only"
        or report.get("productionLoadAllowed") is not False
        or report.get("syntheticOnly") is not True
        or report.get("realUserNeedAccuracyEstablished") is not False
        or report.get("device") != evaluation["device"]
        or report.get("testRows") != dataset["split"]["test"]
        or report.get("testCoverage") != "all deterministic held-out rows"
        or report.get("dataSha256") != dataset["sha256"]
    ):
        raise ValueError("The final evaluation did not cover the full held-out split under the reviewed research-only contract.")


def acquire_lock() -> int:
    lock_path = Path("/private/tmp/niazfinder-si-v6-queue.lock")
    descriptor = os.open(lock_path, os.O_CREAT | os.O_RDWR, 0o600)
    try:
        fcntl.flock(descriptor, fcntl.LOCK_EX | fcntl.LOCK_NB)
    except BlockingIOError as exc:
        os.close(descriptor)
        raise RuntimeError("A v6 queue process already holds the launch lock.") from exc
    os.ftruncate(descriptor, 0)
    os.write(descriptor, f"pid={os.getpid()}\nstartedAt={utc_now()}\n".encode())
    return descriptor


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--dry-run", action="store_true", help="Show the gate state without waiting or launching.")
    args = parser.parse_args()

    plan_path = ROOT / PLAN_RELATIVE
    plan = read_json(plan_path)
    data_path, corpus_manifest_path, upstream_dir = validate_plan(plan, ROOT)
    state, message = upstream_state(upstream_dir)
    if args.dry_run:
        print(json.dumps({"queueStatus": state, "message": message, "planStatus": plan["status"]}, ensure_ascii=False))
        return 0 if state in {"waiting", "ready"} else 2

    lock_descriptor = acquire_lock()
    try:
        update_plan(plan_path, plan, "queued_waiting_for_v3", message)
        while state == "waiting":
            print(message, flush=True)
            time.sleep(POLL_SECONDS)
            state, message = upstream_state(upstream_dir)
            if state == "waiting":
                update_plan(plan_path, plan, "queued_waiting_for_v3", message)
        if state != "ready":
            update_plan(plan_path, plan, "upstream_failed", message)
            print(message, file=sys.stderr, flush=True)
            return 3

        wait_for_upstream_processes_to_exit(plan)
        validate_dataset(plan, data_path, corpus_manifest_path)
        argv = list(plan["launchArgv"])
        preflight_argv = [*argv, "--validate-only"]
        update_plan(plan_path, plan, "pilot_preflight", "v3 completed; validating the bounded full-model MPS pilot.")
        print("v3 complete; validating the bounded RLCD MPS pilot.", flush=True)
        pilot_argv = list(plan["pilotArgv"])
        pilot_preflight_argv = [*pilot_argv, "--validate-only"]
        preflight = subprocess.run(pilot_preflight_argv, cwd=ROOT, capture_output=True, text=True, check=False)
        if preflight.returncode != 0:
            if preflight.stdout:
                print(preflight.stdout, file=sys.stderr, flush=True)
            if preflight.stderr:
                print(preflight.stderr, file=sys.stderr, flush=True)
            raise subprocess.CalledProcessError(preflight.returncode, pilot_preflight_argv)
        try:
            preflight_report = json.loads(preflight.stdout)
        except json.JSONDecodeError as exc:
            raise ValueError("The trainer preflight did not return valid JSON; refusing to train.") from exc
        validate_preflight_report(plan, preflight_report)
        update_plan(plan_path, plan, "pilot_running", "Pilot preflight passed; checking full-parameter RLCD forward/backward on MPS.")
        print("Pilot preflight passed; starting the single MPS hardware/objective smoke.", flush=True)
        pilot_process = subprocess.run(pilot_argv, cwd=ROOT, check=False)
        if pilot_process.returncode != 0:
            raise subprocess.CalledProcessError(pilot_process.returncode, pilot_argv)
        pilot_dir = ROOT / pilot_argv[pilot_argv.index("--experiment-dir") + 1]
        validate_pilot_result(plan, pilot_dir)

        update_plan(plan_path, plan, "preflight", "MPS pilot passed; validating the full v6 dataset and training scope.")
        print("MPS pilot passed; running v6 full-data validate-only preflight.", flush=True)
        preflight = subprocess.run(preflight_argv, cwd=ROOT, capture_output=True, text=True, check=False)
        if preflight.returncode != 0:
            if preflight.stdout:
                print(preflight.stdout, file=sys.stderr, flush=True)
            if preflight.stderr:
                print(preflight.stderr, file=sys.stderr, flush=True)
            raise subprocess.CalledProcessError(preflight.returncode, preflight_argv)
        try:
            full_preflight_report = json.loads(preflight.stdout)
        except json.JSONDecodeError as exc:
            raise ValueError("The full trainer preflight did not return valid JSON; refusing to train.") from exc
        validate_preflight_report(plan, full_preflight_report)
        training = plan["training"]
        print(json.dumps({
            "preflight": "passed",
            "trainRows": full_preflight_report["selectedRows"]["train"],
            "trainingDecisions": full_preflight_report["expectedTrainingDecisions"],
            "optimizerSteps": full_preflight_report["expectedOptimizerSteps"],
            "device": training["device"],
        }), flush=True)

        update_plan(plan_path, plan, "running", "v6 MPS fine-tuning has started after v3 completion.")
        print("v6 preflight passed; launching the single MPS training job.", flush=True)
        subprocess.run(argv, cwd=ROOT, check=True)
        experiment_dir = ROOT / plan["launchArgv"][plan["launchArgv"].index("--experiment-dir") + 1]
        final_manifest = read_json(experiment_dir / "manifest.json")
        if final_manifest.get("status") != "research_run_complete":
            update_plan(plan_path, plan, "failed", "The v6 trainer exited without a completed research manifest.")
            return 4
        full_checkpoint = experiment_dir / "model.safetensors"
        if not full_checkpoint.is_file():
            update_plan(plan_path, plan, "failed", "The v6 run completed without its selected full-model checkpoint.")
            return 4

        update_plan(plan_path, plan, "evaluating", "v6 training completed; evaluating every held-out test row on MPS.")
        evaluation_argv = list(plan["evaluationArgv"])
        print("v6 training complete; running the pinned full held-out MPS evaluation.", flush=True)
        evaluation_process = subprocess.run(evaluation_argv, cwd=ROOT, check=False)
        if evaluation_process.returncode != 0:
            update_plan(plan_path, plan, "evaluation_failed", f"Full held-out evaluation exited with status {evaluation_process.returncode}.")
            return 5
        evaluation_report_path = experiment_dir / "evaluation-detailed.json"
        evaluation_report = read_json(evaluation_report_path)
        validate_evaluation_report(plan, evaluation_report)
        update_plan(plan_path, plan, "research_evaluation_complete", "v6 full held-out evaluation completed; results remain synthetic-only and research-only.")
        return 0
    except subprocess.CalledProcessError as exc:
        update_plan(plan_path, plan, "failed", f"Queued command exited with status {exc.returncode}.")
        raise
    except Exception as exc:
        update_plan(plan_path, plan, "failed", f"Queue stopped safely: {type(exc).__name__}: {exc}")
        raise
    finally:
        fcntl.flock(lock_descriptor, fcntl.LOCK_UN)
        os.close(lock_descriptor)


if __name__ == "__main__":
    raise SystemExit(main())
