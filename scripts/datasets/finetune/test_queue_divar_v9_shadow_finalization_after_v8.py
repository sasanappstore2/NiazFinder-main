from __future__ import annotations

import importlib.util
import json
import tempfile
from pathlib import Path
from typing import Any


SCRIPT = Path(__file__).with_name("queue-divar-v9-shadow-finalization-after-v8.py")
SPEC = importlib.util.spec_from_file_location("queue_divar_v9_shadow_finalization_after_v8", SCRIPT)
assert SPEC and SPEC.loader
QUEUE = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(QUEUE)


def test_upstream_gate_waits_and_fails_closed() -> None:
    assert QUEUE.upstream_state({"status": "queued_waiting_for_v7"})[0] == "waiting"
    assert QUEUE.upstream_state({"status": "full_running"})[0] == "waiting"
    assert QUEUE.upstream_state({"status": QUEUE.READY_STATUS})[0] == "ready"
    assert QUEUE.upstream_state({"status": "full_failed"})[0] == "failed"


def test_finalized_manifest_requires_research_only_accounting() -> None:
    valid: dict[str, Any] = {
        "status": "complete",
        "taskType": QUEUE.SOURCE_TASK,
        "model": QUEUE.MODEL_ID,
        "sourceRowsAudited": 12,
        "keptUniqueCounterfactualRows": 7,
        "duplicateRowsCollapsed": 2,
        "conflictingRowsQuarantined": 3,
        "synthetic": True,
        "derivedFromSupplyListing": True,
        "realNeedGroundTruth": False,
        "trainingEligible": False,
        "rightsReview": "pending",
    }
    QUEUE.validate_finalized_manifest(valid, audited_rows=12)
    for bad in (
        {**valid, "trainingEligible": True},
        {**valid, "sourceRowsAudited": 11},
        {**valid, "rightsReview": "approved"},
    ):
        try:
            QUEUE.validate_finalized_manifest(bad, audited_rows=12)
        except ValueError:
            pass
        else:
            raise AssertionError("v9 must fail closed on accounting or training-eligibility drift.")


def test_v8_artifact_hash_and_provenance_are_verified() -> None:
    with tempfile.TemporaryDirectory() as temporary:
        root = Path(temporary)
        source = root / "input.jsonl"
        source.write_text("{}\n", encoding="utf-8")
        manifest_path = Path(str(source) + ".manifest.json")
        file_hash = QUEUE.sha256_file(source)
        manifest = {
            "status": "complete",
            "scriptVersion": 15,
            "taskType": QUEUE.SOURCE_TASK,
            "model": QUEUE.MODEL_ID,
            "selection": "all",
            "sourceCorpusSha256": "a" * 64,
            "sourceCorpusRows": 9,
            "rowsProcessed": 7,
            "devicesUsed": ["mps"],
            "outputBytes": source.stat().st_size,
            "layaDerivedProposalStatuses": {"source_facts_agree": 7},
            "containsSyntheticData": True,
            "trainingEligible": False,
            "realNeedGroundTruth": False,
        }
        manifest_path.write_text(json.dumps(manifest), encoding="utf-8")
        plan = {"source": {"path": source.name, "manifestPath": manifest_path.name,
                            "minimumRows": 1}}
        upstream = {"status": QUEUE.READY_STATUS, "sourceSha256": "a" * 64,
                    "source": {"rows": 9},
                    "result": {"path": source.name, "sha256": file_hash, "rows": 7,
                               "trainingEligible": False, "realNeedGroundTruth": False}}
        QUEUE.validate_upstream_artifacts(plan, upstream, root)
        upstream["result"]["sha256"] = "b" * 64
        try:
            QUEUE.validate_upstream_artifacts(plan, upstream, root)
        except ValueError:
            pass
        else:
            raise AssertionError("v9 must reject a changed v8 output hash.")


def main() -> None:
    test_upstream_gate_waits_and_fails_closed()
    test_finalized_manifest_requires_research_only_accounting()
    test_v8_artifact_hash_and_provenance_are_verified()
    print("v9 finalization queue: upstream, hash, accounting and no-training gates passed")


if __name__ == "__main__":
    main()
