#!/usr/bin/env python3
"""After v7 exits, locally convert the pinned Divar property corpus with Laya.

This queue does not allocate MPS while v7 is pending. It starts one loopback-only
Laya worker, validates a small pilot, then runs/resumes the full shadow conversion.
All generated needs remain hypothetical and explicitly ineligible for training.
"""

from __future__ import annotations

import argparse
import datetime as dt
import fcntl
import hashlib
import json
import os
import shutil
import signal
import socket
import subprocess
import sys
import time
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parents[3]
PLAN_RELATIVE = Path("data/laya-experiments/divar-v8-laya-shadow-after-v7-2026-09-28.json")
POLL_SECONDS = 60
READY_STATUS = "research_evaluation_complete"
FAILURE_STATUSES = {"failed", "upstream_failed", "pilot_failed", "evaluation_failed"}
MODEL_ID = "convaiinnovations/laya-multilingual"
MODEL_REVISION = "e4e9ddf21a7b1903b7acffd8814ad4307bf63a67"
MODEL_SHA256 = "9d628fd971b700382ac6f65920a86f149777b2e748e0c955fb3b19695aa8f204"
SOURCE_DATASET_SHA256 = "e5760fe1325a195e6682c371457bfecd51d255c518756e3cbea234b8163a801f"
OUTPUT_TASK = "divar-counterfactual-post-need-laya-proposal/v5"
MIN_FULL_ROWS = 950_000


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
        for block in iter(lambda: stream.read(8 * 1024 * 1024), b""):
            digest.update(block)
    return digest.hexdigest()


def repo_path(relative: str) -> Path:
    candidate = (ROOT / relative).resolve()
    try:
        candidate.relative_to(ROOT.resolve())
    except ValueError as exc:
        raise ValueError("Laya shadow artifacts must stay inside the repository.") from exc
    return candidate


def upstream_state(v7: dict[str, Any]) -> tuple[str, str]:
    status = v7.get("status")
    if status in FAILURE_STATUSES:
        return "failed", f"v7 neighborhood benchmark ended with status {status!r}; no Laya shadow run will start."
    if status == READY_STATUS:
        return "ready", "v7 benchmark completed; one local Laya MPS shadow stage may start."
    return "waiting", f"v7 benchmark is not complete (status={status!r}); no MPS workload will start."


def validate_plan(plan: dict[str, Any]) -> tuple[Path, Path, Path, Path, Path]:
    allowed = {
        "queued_waiting_for_v7", "pilot_running", "pilot_complete", "full_running",
        "research_shadow_complete", "running",
    }
    if plan.get("status") not in allowed:
        raise ValueError(f"Laya shadow queue is not startable (status={plan.get('status')!r}).")
    if (
        plan.get("taskType") != OUTPUT_TASK
        or plan.get("model", {}).get("id") != MODEL_ID
        or plan.get("model", {}).get("revision") != MODEL_REVISION
        or plan.get("model", {}).get("weightsSha256") != MODEL_SHA256
        or plan.get("device") != "mps"
        or plan.get("maxConcurrentMpsJobs") != 1
        or plan.get("cloudInferenceAllowed") is not False
    ):
        raise ValueError("The Laya shadow plan differs from the approved local-only single-MPS contract.")
    python_lexical_path = ROOT / plan["python"]
    try:
        python_lexical_path.relative_to(ROOT)
    except ValueError as exc:
        raise ValueError("The Laya Python executable must be referenced from the repository environment.") from exc
    python_path = python_lexical_path.resolve(strict=True)
    if Path(sys.executable).resolve() != python_path:
        raise ValueError("Run the queue with the pinned mini-services/laya-post Python environment.")
    source = plan["source"]
    input_path = repo_path(source["path"])
    input_manifest_path = repo_path(source["manifestPath"])
    v7_plan_path = repo_path(plan["upstreamPlanPath"])
    runner_path = repo_path(plan["runnerScript"])
    for path in (input_path, input_manifest_path, v7_plan_path, runner_path):
        if not path.is_file():
            raise FileNotFoundError(f"Required Laya shadow input is missing: {path.relative_to(ROOT)}")
    manifest = read_json(input_manifest_path)
    if (
        manifest.get("targetTask") != "divar-property-offer-facts/v2"
        or manifest.get("sourceOfferAttributesVersion") != 1
        or manifest.get("dataset") != "divarofficial/real_estate_ads"
        or manifest.get("datasetSha256") != SOURCE_DATASET_SHA256
        or manifest.get("outputRows") != source["rows"]
        or manifest.get("normalizedTextGroups") != source["uniqueTextGroups"]
        or manifest.get("cloudTransferAllowed") is not False
        or manifest.get("containsSyntheticData") is not False
        or manifest.get("privacyPolicy") != source["privacyPolicy"]
    ):
        raise ValueError("The pinned Divar facts manifest does not match this local-only plan.")
    if plan.get("sourceManifestSha256") != sha256_file(input_manifest_path):
        raise ValueError("The source manifest changed after the Laya shadow plan was pinned.")
    if plan.get("sourceSha256") != source["sha256"] or source["sha256"] != sha256_file(input_path):
        raise ValueError("The source corpus changed after the Laya shadow plan was pinned.")
    if shutil.which("bun") is None:
        raise FileNotFoundError("Bun is required to run the repository's Laya shadow pipeline.")
    model_dir = Path(plan["model"]["localDirectory"]).expanduser().resolve(strict=True)
    if not (model_dir / "model.safetensors").is_file():
        raise FileNotFoundError("The pinned local Laya checkpoint weights are missing.")
    for output in plan["outputs"].values():
        output_path = repo_path(output["path"])
        if output_path == input_path:
            raise ValueError("A Laya output path cannot overwrite the source corpus.")
    return input_path, input_manifest_path, v7_plan_path, runner_path, model_dir


def validate_v7_result(plan: dict[str, Any], v7: dict[str, Any]) -> dict[str, Any]:
    if v7.get("status") != READY_STATUS:
        raise ValueError("The complete v7 held-out evaluation is not ready.")
    result = v7.get("result", {})
    report_path = repo_path(result.get("path", ""))
    if not report_path.is_file() or sha256_file(report_path) != result.get("sha256"):
        raise ValueError("The v7 report is missing or changed after completion.")
    report = read_json(report_path)
    dataset = v7.get("dataset", {})
    model = report.get("model", {})
    if (
        v7.get("taskType") != plan["upstreamTaskType"]
        or v7.get("modelId") != plan["model"]["id"]
        or v7.get("modelRevision") != plan["model"]["revision"]
        or v7.get("baseWeightsSha256") != plan["model"]["weightsSha256"]
        or dataset.get("sha256") != plan["upstreamDatasetSha256"]
        or dataset.get("testRows") != plan["upstreamTestRows"]
        or report.get("status") != "research_evaluation_only"
        or report.get("actualDevice") != "mps"
        or report.get("input", {}).get("sha256") != dataset.get("sha256")
        or report.get("input", {}).get("heldOutRows") != dataset.get("testRows")
        or model.get("model") != plan["model"]["id"]
        or model.get("revision") != plan["model"]["revision"]
        or model.get("weightsSha256") != plan["model"]["weightsSha256"]
    ):
        raise ValueError("The completed v7 report does not prove the pinned Laya MPS evaluation.")
    return {**report, "_resultPath": result["path"], "_resultSha256": result["sha256"]}


def validate_health(health: dict[str, Any], expected_device: str = "mps") -> None:
    device = str(health.get("device", "")).lower()
    if (
        health.get("model_loaded") is not True
        or health.get("model_name") != MODEL_ID
        or health.get("adapter_mode") != "base"
        or health.get("requested_device") != expected_device
        or not device.startswith(expected_device)
    ):
        raise ValueError("Local Laya health check failed the exact-checkpoint/base/MPS contract.")


def validate_shadow_row(row: dict[str, Any]) -> None:
    proposal = row.get("layaDerivedHypotheticalNeed")
    if (
        row.get("taskType") != OUTPUT_TASK
        or row.get("synthetic") is not True
        or row.get("derivedFromSupplyListing") is not True
        or row.get("realNeedGroundTruth") is not False
        or row.get("trainingEligible") is not False
        or row.get("shadowOnly") is not True
        or row.get("laya", {}).get("model") != MODEL_ID
        or row.get("laya", {}).get("device") != "mps"
        or row.get("review", {}).get("trainingUse") != "not_approved"
        or not isinstance(row.get("hypotheticalNeed"), dict)
        or not isinstance(proposal, dict)
        or proposal.get("model") != MODEL_ID
        or proposal.get("synthetic") is not True
        or proposal.get("realNeedGroundTruth") is not False
        or proposal.get("trainingEligible") is not False
        or proposal.get("accepted") is not False
    ):
        raise ValueError("A shadow row violates the synthetic-only, non-training contract.")


def validate_shadow_output(path: Path, sidecar: Path, plan: dict[str, Any], *, minimum_rows: int) -> dict[str, Any]:
    manifest = read_json(sidecar)
    if (
        manifest.get("status") != "complete"
        or manifest.get("scriptVersion") != 15
        or manifest.get("taskType") != OUTPUT_TASK
        or manifest.get("sourceCorpusSha256") != plan["sourceSha256"]
        or manifest.get("sourceCorpusRows") != plan["source"]["rows"]
        or manifest.get("model") != MODEL_ID
        or manifest.get("selection") != "all"
        or manifest.get("devicesUsed") != ["mps"]
        or manifest.get("rowsProcessed", 0) < minimum_rows
        or manifest.get("outputBytes") != path.stat().st_size
    ):
        raise ValueError("The complete shadow manifest failed its source/model/device/coverage gates.")
    rows = 0
    with path.open(encoding="utf-8") as stream:
        for line_number, line in enumerate(stream, 1):
            if not line.strip():
                continue
            try:
                row = json.loads(line)
            except json.JSONDecodeError as exc:
                raise ValueError(f"Malformed shadow JSONL at line {line_number}.") from exc
            validate_shadow_row(row)
            rows += 1
    if rows != manifest["rowsProcessed"] or sha256_file(path) == plan["sourceSha256"]:
        raise ValueError("The shadow output row count/hash failed integrity validation.")
    return {"manifest": manifest, "rows": rows, "sha256": sha256_file(path)}


def update_plan(plan_path: Path, plan: dict[str, Any], status: str, note: str) -> None:
    plan["status"] = status
    plan["queue"] = {"updatedAt": utc_now(), "note": note}
    atomic_json(plan_path, plan)


def acquire_lock() -> int:
    path = Path("/private/tmp/niazfinder-laya-divar-shadow-after-v7.lock")
    descriptor = os.open(path, os.O_CREAT | os.O_RDWR, 0o600)
    try:
        fcntl.flock(descriptor, fcntl.LOCK_EX | fcntl.LOCK_NB)
    except BlockingIOError as exc:
        os.close(descriptor)
        raise RuntimeError("Another Laya Divar shadow queue already holds the lock.") from exc
    os.ftruncate(descriptor, 0)
    os.write(descriptor, f"pid={os.getpid()}\nstartedAt={utc_now()}\n".encode())
    return descriptor


def assert_port_free(host: str, port: int) -> None:
    with socket.socket() as probe:
        probe.settimeout(1)
        if probe.connect_ex((host, port)) == 0:
            raise RuntimeError(f"Refusing to use occupied local Laya port {port}; no foreign worker will be reused or stopped.")


def start_worker(plan: dict[str, Any], model_dir: Path, log_path: Path) -> subprocess.Popen[bytes]:
    if sha256_file(model_dir / "model.safetensors") != plan["model"]["weightsSha256"]:
        raise ValueError("The local Laya checkpoint checksum does not match the pinned model.")
    assert_port_free("127.0.0.1", 8101)
    service_dir = repo_path(plan["workerDirectory"])
    env = os.environ.copy()
    for key in ("LAYA_ADAPTER_PATH", "LAYA_ADAPTER_MANIFEST", "LAYA_ALLOW_RESEARCH_ADAPTER"):
        env.pop(key, None)
    env.update({
        "LAYA_MODEL_NAME": MODEL_ID,
        "LAYA_MODEL_PATH": str(model_dir),
        "LAYA_DEVICE": "mps",
        "HF_HUB_OFFLINE": "1",
        "TRANSFORMERS_OFFLINE": "1",
        "HF_HUB_DISABLE_TELEMETRY": "1",
        "TOKENIZERS_PARALLELISM": "false",
        "OMP_NUM_THREADS": str(plan["runtime"]["threads"]),
        "PYTORCH_ENABLE_MPS_FALLBACK": "0",
    })
    log_path.parent.mkdir(parents=True, exist_ok=True)
    with log_path.open("ab") as log:
        os.chmod(log_path, 0o600)
        return subprocess.Popen(
            [sys.executable, "-m", "uvicorn", "app:app", "--host", "127.0.0.1", "--port", "8101", "--no-access-log"],
            cwd=service_dir,
            env=env,
            stdin=subprocess.DEVNULL,
            stdout=log,
            stderr=subprocess.STDOUT,
            start_new_session=True,
        )


def wait_for_worker(process: subprocess.Popen[bytes], timeout_seconds: int) -> dict[str, Any]:
    import urllib.error
    import urllib.request

    deadline = time.monotonic() + timeout_seconds
    while time.monotonic() < deadline:
        if process.poll() is not None:
            raise RuntimeError("The local Laya worker exited before becoming ready; no inference was started.")
        try:
            with urllib.request.urlopen("http://127.0.0.1:8101/health", timeout=3) as response:
                health = json.loads(response.read().decode("utf-8"))
            if health.get("error") is not None:
                raise RuntimeError("The local Laya worker failed to load the pinned checkpoint.")
            if health.get("model_loaded") is True:
                validate_health(health)
                return health
        except (OSError, urllib.error.URLError, json.JSONDecodeError):
            pass
        time.sleep(2)
    raise TimeoutError("The local Laya worker did not become ready before the configured timeout.")


def stop_worker(process: subprocess.Popen[bytes] | None) -> None:
    if process is None or process.poll() is not None:
        return
    try:
        os.killpg(process.pid, signal.SIGTERM)
        process.wait(timeout=20)
    except (ProcessLookupError, subprocess.TimeoutExpired):
        try:
            os.killpg(process.pid, signal.SIGKILL)
        except ProcessLookupError:
            pass
        process.wait(timeout=5)


def runner_manifest_path(output: Path) -> Path:
    return Path(str(output) + ".manifest.json")


def validate_pilot_output(path: Path, sidecar: Path, plan: dict[str, Any]) -> dict[str, Any]:
    manifest = read_json(sidecar)
    if (
        manifest.get("status") != "complete"
        or manifest.get("scriptVersion") != 15
        or manifest.get("taskType") != OUTPUT_TASK
        or manifest.get("sourceCorpusSha256") != plan["sourceSha256"]
        or manifest.get("selection") != "limit"
        or manifest.get("selectionLimit") != plan["pilot"]["rows"]
        or manifest.get("model") != MODEL_ID
        or manifest.get("devicesUsed") != ["mps"]
        or manifest.get("rowsProcessed", 0) < plan["pilot"]["minimumRows"]
        or manifest.get("outputBytes") != path.stat().st_size
    ):
        raise ValueError("The Laya shadow pilot failed its pinned MPS/source/output contract.")
    rows = 0
    with path.open(encoding="utf-8") as stream:
        for line_number, line in enumerate(stream, 1):
            if not line.strip():
                continue
            try:
                validate_shadow_row(json.loads(line))
            except json.JSONDecodeError as exc:
                raise ValueError(f"Malformed pilot JSONL at line {line_number}.") from exc
            rows += 1
    if rows != manifest["rowsProcessed"]:
        raise ValueError("The Laya pilot output row count does not match its manifest.")
    return {"manifest": manifest, "rows": rows, "sha256": sha256_file(path)}


def run_shadow(plan: dict[str, Any], input_path: Path, runner_path: Path, output_spec: dict[str, Any],
               mode: str, log_path: Path) -> dict[str, Any]:
    output_path = repo_path(output_spec["path"])
    sidecar = runner_manifest_path(output_path)
    if output_path.exists() != sidecar.exists():
        raise ValueError("Runner output and its resume manifest must either both exist or both be absent.")
    if output_path.exists():
        prior = read_json(sidecar)
        if prior.get("status") == "complete":
            if mode == "all":
                return validate_shadow_output(output_path, sidecar, plan, minimum_rows=MIN_FULL_ROWS)
            return validate_pilot_output(output_path, sidecar, plan)

    bun_path = shutil.which("bun")
    if not bun_path:
        raise FileNotFoundError("Bun disappeared from PATH before shadow inference.")
    argv = [
        bun_path, str(runner_path), "--input", str(input_path), "--output", str(output_path),
        "--hypothetical-needs", "--batch-size", str(plan["runtime"]["batchSize"]),
        "--laya-url", "http://127.0.0.1:8101",
    ]
    argv += ["--all"] if mode == "all" else ["--limit", str(plan["pilot"]["rows"])]
    if output_path.exists():
        argv.append("--resume")
    output_path.parent.mkdir(parents=True, exist_ok=True)
    log_path.parent.mkdir(parents=True, exist_ok=True)
    with log_path.open("ab") as log:
        os.chmod(log_path, 0o600)
        process = subprocess.Popen(argv, cwd=ROOT, stdin=subprocess.DEVNULL,
                                   stdout=log, stderr=subprocess.STDOUT)
        last_reported = -1
        while process.poll() is None:
            time.sleep(30)
            if sidecar.is_file():
                try:
                    progress = read_json(sidecar)
                    processed = int(progress.get("rowsProcessed", 0))
                    if processed != last_reported:
                        print(f"shadow_mode={mode} status={progress.get('status')} processed={processed} source_cursor={progress.get('lastSourceRowOrdinal', 0)}", flush=True)
                        last_reported = processed
                except (OSError, ValueError, json.JSONDecodeError):
                    pass
        if process.returncode != 0:
            status = "pilot_failed" if mode != "all" else "full_failed"
            raise RuntimeError(f"The local Laya {mode} shadow runner exited with status {process.returncode} ({status}).")
    if mode == "all":
        return validate_shadow_output(output_path, sidecar, plan, minimum_rows=MIN_FULL_ROWS)
    return validate_pilot_output(output_path, sidecar, plan)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--dry-run", action="store_true", help="Check source and stage gates only; no model or MPS allocation.")
    args = parser.parse_args()
    plan_path = repo_path(str(PLAN_RELATIVE))
    plan = read_json(plan_path)
    input_path, _input_manifest, v7_plan_path, runner_path, model_dir = validate_plan(plan)
    state, message = upstream_state(read_json(v7_plan_path))
    if args.dry_run:
        print(json.dumps({"queueStatus": state, "message": message, "planStatus": plan["status"],
                          "sourceRows": plan["source"]["rows"], "model": MODEL_ID,
                          "device": "mps", "willAllocateMps": False}, ensure_ascii=False))
        return 0 if state in {"waiting", "ready"} else 2

    lock = acquire_lock()
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

        report = validate_v7_result(plan, read_json(v7_plan_path))
        plan["upstreamResult"] = {"path": report["_resultPath"], "sha256": report["_resultSha256"],
                                  "actualDevice": report["actualDevice"]}
        if sha256_file(model_dir / "model.safetensors") != MODEL_SHA256:
            raise ValueError("The local base checkpoint differs from the pinned Laya model.")

        queue_log = repo_path(plan["queueLogPath"])
        worker_log = repo_path(plan["workerLogPath"])
        worker: subprocess.Popen[bytes] | None = None
        try:
            worker = start_worker(plan, model_dir, worker_log)
            health = wait_for_worker(worker, int(plan["runtime"]["workerReadyTimeoutSeconds"]))
            plan["workerHealth"] = {"model": MODEL_ID, "device": health["device"],
                                    "adapterMode": health["adapter_mode"], "requestedDevice": health["requested_device"]}
            update_plan(plan_path, plan, "pilot_running", "v7 finished; pinned base Laya is local, offline, and on MPS; validating the bounded pilot.")
            try:
                pilot = run_shadow(plan, input_path, runner_path, plan["outputs"]["pilot"], "pilot", queue_log)
            except Exception:
                update_plan(plan_path, plan, "pilot_failed", "The bounded pilot failed; the full shadow run was not started.")
                raise
            plan["pilotResult"] = {"path": plan["outputs"]["pilot"]["path"], "rows": pilot["rows"], "sha256": pilot["sha256"]}
            update_plan(plan_path, plan, "pilot_complete", "Bounded Laya MPS pilot passed structural checks; no accuracy claim is inferred.")
            update_plan(plan_path, plan, "full_running", "Starting the full local-only Divar conversion; outputs remain hypothetical and training-ineligible.")
            full = run_shadow(plan, input_path, runner_path, plan["outputs"]["full"], "all", queue_log)
            plan["result"] = {"path": plan["outputs"]["full"]["path"], "rows": full["rows"],
                              "sha256": full["sha256"], "layaProposalStatuses": full["manifest"].get("layaDerivedProposalStatuses", {}),
                              "devicesUsed": full["manifest"].get("devicesUsed", []),
                              "trainingEligible": False, "realNeedGroundTruth": False}
            update_plan(plan_path, plan, "research_shadow_complete", "Full local Laya conversion completed. Synthetic proposals are not gold labels and remain blocked from production training.")
            print(json.dumps({"status": "research_shadow_complete", "rows": full["rows"],
                              "sha256": full["sha256"], "trainingEligible": False,
                              "realNeedGroundTruth": False}, ensure_ascii=False), flush=True)
            return 0
        finally:
            stop_worker(worker)
    except Exception as exc:
        if plan.get("status") not in {"upstream_failed", "pilot_failed", "full_failed"}:
            failure_status = "preflight_failed" if plan.get("status") == "queued_waiting_for_v7" else "pilot_failed" if plan.get("status") == "pilot_running" else "full_failed"
            update_plan(plan_path, plan, failure_status,
                        f"Queue stopped safely: {type(exc).__name__}; inspect only redacted local logs.")
        raise
    finally:
        fcntl.flock(lock, fcntl.LOCK_UN)
        os.close(lock)


if __name__ == "__main__":
    raise SystemExit(main())
