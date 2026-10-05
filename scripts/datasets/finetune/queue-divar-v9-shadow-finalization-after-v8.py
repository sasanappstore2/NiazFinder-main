#!/usr/bin/env python3
"""Wait for v8, then run the existing CPU-only counterfactual corpus finalizer."""

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
PLAN_RELATIVE = Path("data/si-experiments/divar-v9-shadow-finalization-after-v8-2026-09-29.json")
POLL_SECONDS = 60
READY_STATUS = "research_shadow_complete"
FAILURE_STATUSES = {"failed", "upstream_failed", "pilot_failed", "preflight_failed", "full_failed"}
SOURCE_TASK = "divar-counterfactual-post-need-si-proposal/v5"
MODEL_ID = "convaiinnovations/si-multilingual"


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
        for block in iter(lambda: stream.read(8 * 1024 * 1024), b""):
            digest.update(block)
    return digest.hexdigest()


def repo_path(root: Path, relative: str) -> Path:
    candidate = (root / relative).resolve()
    try:
        candidate.relative_to(root.resolve())
    except ValueError as exc:
        raise ValueError("Audit artifacts must remain inside the repository.") from exc
    return candidate


def upstream_state(upstream: dict[str, Any]) -> tuple[str, str]:
    status = upstream.get("status")
    if status in FAILURE_STATUSES:
        return "failed", f"v8 ended with status {status!r}; finalization will not start."
    if status == READY_STATUS:
        return "ready", "v8 completed; the next stage is a CPU-only structural/quality finalization."
    return "waiting", f"v8 is not complete (status={status!r}); no audit or MPS work will start."


def validate_plan(plan: dict[str, Any], root: Path) -> tuple[Path, Path, Path, Path, Path, Path]:
    allowed = {"queued_waiting_for_v8", "running_cpu_finalize", "research_audit_complete"}
    if plan.get("status") not in allowed:
        raise ValueError(f"v9 plan is not startable (status={plan.get('status')!r}).")
    execution = plan.get("execution", {})
    source = plan.get("source", {})
    outputs = plan.get("outputs", {})
    if (
        plan.get("taskType") != SOURCE_TASK
        or plan.get("upstreamRequiredStatus") != READY_STATUS
        or source.get("expectedTaskType") != SOURCE_TASK
        or source.get("expectedModel") != MODEL_ID
        or execution.get("device") != "cpu"
        or execution.get("mpsJobs") != 0
        or execution.get("automaticTraining") is not False
        or execution.get("localOnly") is not True
    ):
        raise ValueError("v9 must remain a local CPU audit with no automatic training.")

    upstream_path = repo_path(root, str(plan["upstreamPlanPath"]))
    source_path = repo_path(root, str(source["path"]))
    source_manifest_path = repo_path(root, str(source["manifestPath"]))
    finalizer_path = repo_path(root, str(plan["finalizerScript"]))
    unique_path = repo_path(root, str(outputs["uniquePath"]))
    quarantine_path = repo_path(root, str(outputs["quarantinePath"]))
    output_manifest_path = repo_path(root, str(outputs["manifestPath"]))
    if not upstream_path.is_file() or not finalizer_path.is_file():
        raise FileNotFoundError("The v8 upstream plan or existing finalizer is missing.")
    if shutil.which("bun") is None:
        raise FileNotFoundError("Bun is required to run the repository's existing finalizer.")
    expected_manifest = Path(str(source_path) + ".manifest.json")
    if source_manifest_path != expected_manifest:
        raise ValueError("The pinned source manifest must be the JSONL sidecar.")
    if len({source_path, source_manifest_path, unique_path, quarantine_path, output_manifest_path}) != 5:
        raise ValueError("v9 input and output artifacts must be distinct.")
    if unique_path.parent != source_path.parent or quarantine_path.parent != source_path.parent:
        raise ValueError("Final outputs must stay beside the source, as required by the finalizer.")
    if output_manifest_path != Path(str(unique_path) + ".manifest.json"):
        raise ValueError("The finalized manifest path does not match the finalizer contract.")
    if len({unique_path, quarantine_path, output_manifest_path}) != 3:
        raise ValueError("v9 output paths must be distinct.")
    return upstream_path, source_path, source_manifest_path, finalizer_path, unique_path, quarantine_path


def validate_upstream_artifacts(
    plan: dict[str, Any], upstream: dict[str, Any], root: Path, *, verify_hash: bool = True
) -> tuple[Path, Path, dict[str, Any]]:
    if upstream.get("status") != READY_STATUS:
        raise ValueError("The v8 shadow run has not completed successfully.")
    result = upstream.get("result", {})
    source = plan["source"]
    source_path = repo_path(root, source["path"])
    manifest_path = repo_path(root, source["manifestPath"])
    if not source_path.is_file() or not manifest_path.is_file():
        raise FileNotFoundError("The completed v8 corpus or its manifest is missing.")
    expected_hash = result.get("sha256")
    expected_rows = result.get("rows")
    if (
        result.get("path") != source["path"]
        or not isinstance(expected_hash, str)
        or len(expected_hash) != 64
        or not isinstance(expected_rows, int)
        or expected_rows < int(source["minimumRows"])
        or result.get("trainingEligible") is not False
        or result.get("realNeedGroundTruth") is not False
    ):
        raise ValueError("The v8 result is not the pinned full synthetic corpus or is missing provenance gates.")
    manifest = read_json(manifest_path)
    if (
        manifest.get("status") != "complete"
        or manifest.get("scriptVersion") != 15
        or manifest.get("taskType") != SOURCE_TASK
        or manifest.get("model") != MODEL_ID
        or manifest.get("selection") != "all"
        or manifest.get("sourceCorpusSha256") != upstream.get("sourceSha256")
        or manifest.get("sourceCorpusRows") != upstream.get("source", {}).get("rows")
        or manifest.get("rowsProcessed") != expected_rows
        or manifest.get("devicesUsed") != ["mps"]
        or manifest.get("outputBytes") != source_path.stat().st_size
        or not isinstance(manifest.get("siDerivedProposalStatuses"), dict)
    ):
        raise ValueError("The v8 sidecar failed task/model/device/provenance/row integrity checks.")
    if verify_hash and sha256_file(source_path) != expected_hash:
        raise ValueError("The v8 source corpus hash differs from its completion record.")
    return source_path, manifest_path, manifest


def validate_finalized_manifest(
    manifest: dict[str, Any], *, audited_rows: int, model: str = MODEL_ID
) -> None:
    kept = manifest.get("keptUniqueCounterfactualRows")
    duplicates = manifest.get("duplicateRowsCollapsed")
    quarantined = manifest.get("conflictingRowsQuarantined")
    if (
        manifest.get("status") != "complete"
        or manifest.get("taskType") != SOURCE_TASK
        or manifest.get("model") != model
        or manifest.get("sourceRowsAudited") != audited_rows
        or not all(isinstance(value, int) and value >= 0 for value in (kept, duplicates, quarantined))
        or kept + duplicates + quarantined != audited_rows
        or manifest.get("synthetic") is not True
        or manifest.get("derivedFromSupplyListing") is not True
        or manifest.get("realNeedGroundTruth") is not False
        or manifest.get("trainingEligible") is not False
        or manifest.get("rightsReview") != "pending"
    ):
        raise ValueError("The finalizer result failed accounting or must-not-train invariants.")


def ensure_disk_space(plan: dict[str, Any], source_path: Path, root: Path) -> int:
    execution = plan["execution"]
    required = int(
        source_path.stat().st_size * float(execution["minimumFreeDiskMultiplier"])
        + int(execution["minimumFreeDiskReserveBytes"])
    )
    free = shutil.disk_usage(root).free
    if free < required:
        raise OSError(f"Insufficient free disk for atomic finalization ({free} bytes available; {required} required).")
    return free


def update_plan(path: Path, plan: dict[str, Any], status: str, note: str) -> None:
    plan["status"] = status
    plan["queue"] = {"updatedAt": utc_now(), "note": note}
    atomic_json(path, plan)


def acquire_lock() -> int:
    lock_path = Path("/private/tmp/niazfinder-si-v9-finalization.lock")
    descriptor = os.open(lock_path, os.O_CREAT | os.O_RDWR, 0o600)
    try:
        fcntl.flock(descriptor, fcntl.LOCK_EX | fcntl.LOCK_NB)
    except BlockingIOError as exc:
        os.close(descriptor)
        raise RuntimeError("Another v9 finalization queue already holds the lock.") from exc
    os.ftruncate(descriptor, 0)
    os.write(descriptor, f"pid={os.getpid()}\n".encode())
    return descriptor


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--dry-run", action="store_true", help="Check stage gates only; do not write or finalize.")
    args = parser.parse_args()
    plan_path = ROOT / PLAN_RELATIVE
    plan = read_json(plan_path)
    upstream_path, source_path, source_manifest_path, finalizer_path, unique_path, quarantine_path = validate_plan(plan, ROOT)
    output_manifest_path = repo_path(ROOT, plan["outputs"]["manifestPath"])
    upstream = read_json(upstream_path)
    state, message = upstream_state(upstream)
    if args.dry_run:
        print(json.dumps({"queueStatus": state, "message": message, "planStatus": plan["status"],
                          "device": "cpu", "willAllocateMps": False, "automaticTraining": False,
                          "sourceReady": source_path.is_file() and source_manifest_path.is_file()}, ensure_ascii=False))
        return 0 if state in {"waiting", "ready"} else 2
    if plan["status"] == "research_audit_complete":
        print(json.dumps({"status": "research_audit_complete", "result": plan.get("result", {})}, ensure_ascii=False))
        return 0

    lock = acquire_lock()
    try:
        update_plan(plan_path, plan, "queued_waiting_for_v8", message)
        while state == "waiting":
            print(message, flush=True)
            time.sleep(POLL_SECONDS)
            upstream = read_json(upstream_path)
            state, message = upstream_state(upstream)
            if state == "waiting":
                update_plan(plan_path, plan, "queued_waiting_for_v8", message)
        if state != "ready":
            update_plan(plan_path, plan, "upstream_failed", message)
            print(message, file=sys.stderr, flush=True)
            return 2

        _source, _source_manifest, source_run = validate_upstream_artifacts(plan, upstream, ROOT)
        free_bytes = ensure_disk_space(plan, source_path, ROOT)
        if any(path.exists() for path in (unique_path, quarantine_path, output_manifest_path)):
            raise FileExistsError("A v9 output already exists; refusing to overwrite it.")
        update_plan(plan_path, plan, "running_cpu_finalize",
                    "v8 validated; running existing deduplication/conflict/PII-pattern finalizer on CPU only.")
        argv = [
            shutil.which("bun") or "bun", str(finalizer_path),
            "--input", str(source_path), "--manifest", str(source_manifest_path),
            "--output", str(unique_path), "--quarantine", str(quarantine_path),
        ]
        completed = subprocess.run(argv, cwd=ROOT, capture_output=True, text=True, check=False)
        if completed.returncode != 0:
            raise RuntimeError(f"Existing corpus finalizer failed with exit status {completed.returncode}.")
        summary = json.loads(completed.stdout)
        finalized = read_json(output_manifest_path)
        validate_finalized_manifest(finalized, audited_rows=int(source_run["rowsProcessed"]))
        if summary.get("status") != "complete" or summary.get("eligibleForTraining") is not False:
            raise ValueError("Finalizer summary did not preserve research-only training eligibility.")
        plan["result"] = {
            "sourceRowsAudited": finalized["sourceRowsAudited"],
            "keptUniqueCounterfactualRows": finalized["keptUniqueCounterfactualRows"],
            "duplicateRowsCollapsed": finalized["duplicateRowsCollapsed"],
            "conflictingRowsQuarantined": finalized["conflictingRowsQuarantined"],
            "uniquePath": plan["outputs"]["uniquePath"],
            "uniqueSha256": sha256_file(unique_path),
            "quarantinePath": plan["outputs"]["quarantinePath"],
            "quarantineSha256": sha256_file(quarantine_path),
            "manifestPath": plan["outputs"]["manifestPath"],
            "manifestSha256": sha256_file(output_manifest_path),
            "trainingEligible": False,
            "realNeedGroundTruth": False,
            "automaticTraining": False,
            "freeDiskBytesBeforeAudit": free_bytes,
        }
        update_plan(plan_path, plan, "research_audit_complete",
                    "CPU-only finalization passed structural/accounting gates; output remains synthetic and training-ineligible.")
        print(json.dumps({"status": "research_audit_complete", "result": plan["result"]}, ensure_ascii=False), flush=True)
        return 0
    except Exception as exc:
        if plan.get("status") not in {"upstream_failed", "research_audit_complete"}:
            status = "preflight_failed" if plan.get("status") == "queued_waiting_for_v8" else "audit_failed"
            update_plan(plan_path, plan, status, f"Stopped safely: {type(exc).__name__}; inspect local aggregate logs.")
        raise
    finally:
        fcntl.flock(lock, fcntl.LOCK_UN)
        os.close(lock)


if __name__ == "__main__":
    raise SystemExit(main())
