#!/usr/bin/env python3
from __future__ import annotations

import importlib.util
import json
import tempfile
from pathlib import Path


SCRIPT = Path(__file__).with_name("queue-divar-v10-pseudo-distillation-after-v9.py")
SPEC = importlib.util.spec_from_file_location("queue_divar_v10_pseudo_distillation", SCRIPT)
assert SPEC and SPEC.loader
QUEUE = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(QUEUE)


def test_upstream_gate_waits_until_research_audit_is_complete() -> None:
    assert QUEUE.upstream_state({"status": "queued_waiting_for_v8"})[0] == "waiting"
    assert QUEUE.upstream_state({"status": "running"})[0] == "waiting"
    assert QUEUE.upstream_state({"status": QUEUE.READY_STATUS})[0] == "ready"
    assert QUEUE.upstream_state({"status": "full_failed"})[0] == "failed"


def test_dataset_requires_exact_hash_and_explicit_pseudo_label_provenance() -> None:
    with tempfile.TemporaryDirectory() as temporary:
        root = Path(temporary)
        dataset = root / "pseudo.jsonl"
        manifest_path = root / "pseudo.jsonl.manifest.json"
        payload = b'{"taskType":"divar-laya-pseudo-distillation/v1"}\n'
        dataset.write_bytes(payload)
        manifest = {
            "status": "complete",
            "taskType": "divar-laya-pseudo-distillation/v1",
            "model": QUEUE.MODEL_ID,
            "modelRevision": QUEUE.MODEL_REVISION,
            "teacherWeightsSha256": QUEUE.MODEL_WEIGHTS_SHA256,
            "synthetic": True,
            "realNeedGroundTruth": False,
            "trainingEligible": False,
            "targetOrigin": "laya_pseudo_labels_not_gold",
            "layaPredictionsUsedAsLabels": True,
            "outputBytes": len(payload),
            "outputSha256": QUEUE.sha256_file(dataset),
            "outputRows": 100,
        }
        manifest_path.write_text(json.dumps(manifest), encoding="utf-8")
        plan = {
            "taskType": "divar-laya-pseudo-distillation/v1",
            "dataset": {"minimumRows": 100},
        }

        result = QUEUE.validate_v10_dataset(dataset, manifest_path, plan)
        assert result["outputRows"] == 100

        for changed in (
            {**manifest, "trainingEligible": True},
            {**manifest, "realNeedGroundTruth": True},
            {**manifest, "layaPredictionsUsedAsLabels": False},
            {**manifest, "outputSha256": "0" * 64},
            {**manifest, "outputRows": 99},
        ):
            manifest_path.write_text(json.dumps(changed), encoding="utf-8")
            try:
                QUEUE.validate_v10_dataset(dataset, manifest_path, plan)
            except ValueError:
                pass
            else:
                raise AssertionError("v10 must fail closed on pseudo-label, count, or hash drift.")


def main() -> None:
    test_upstream_gate_waits_until_research_audit_is_complete()
    test_dataset_requires_exact_hash_and_explicit_pseudo_label_provenance()
    print("v10 queue: v9 completion, local model, dataset hash and non-ground-truth gates passed")


if __name__ == "__main__":
    main()
