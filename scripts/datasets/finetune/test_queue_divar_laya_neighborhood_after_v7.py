from __future__ import annotations

import importlib.util
from pathlib import Path
from typing import Any


SCRIPT = Path(__file__).with_name("queue-divar-laya-neighborhood-after-v7.py")
SPEC = importlib.util.spec_from_file_location("queue_divar_laya_neighborhood_after_v7", SCRIPT)
assert SPEC and SPEC.loader
QUEUE = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(QUEUE)


def test_queue_waits_for_v7_full_benchmark_and_fails_closed() -> None:
    assert QUEUE.upstream_state({"status": "queued_waiting_for_v6"})[0] == "waiting"
    assert QUEUE.upstream_state({"status": "running"})[0] == "waiting"
    assert QUEUE.upstream_state({"status": "research_evaluation_complete"})[0] == "ready"
    assert QUEUE.upstream_state({"status": "evaluation_failed"})[0] == "failed"


def test_preflight_pins_data_device_fields_and_batch_geometry() -> None:
    plan = {
        "taskType": "divar-neighborhood-choice-shadow/v2",
        "dataset": {
            "sha256": "a" * 64,
            "split": {"train": 50, "calibration": 10, "test": 12},
        },
        "training": {"microBatchSize": 4, "gradientAccumulation": 8, "groupSize": 4},
    }
    report: dict[str, Any] = {
        "status": "validated_only",
        "trainingPerformed": False,
        "taskType": plan["taskType"],
        "trainableScope": "encoder+typed-decision-head",
        "device": "mps",
        "inputSha256": plan["dataset"]["sha256"],
        "selectedRows": {"train": 16, "calibration": 10, "test": 12},
        "effectiveBatchSize": 32,
        "groupSize": 4,
    }
    QUEUE.validate_preflight(report, plan, 16)
    for bad_report in (
        {**report, "device": "cpu"},
        {**report, "trainingPerformed": True},
        {**report, "inputSha256": "b" * 64},
    ):
        try:
            QUEUE.validate_preflight(bad_report, plan, 16)
        except ValueError:
            pass
        else:
            raise AssertionError("The queue must refuse a preflight mismatch.")


def main() -> None:
    test_queue_waits_for_v7_full_benchmark_and_fails_closed()
    test_preflight_pins_data_device_fields_and_batch_geometry()
    print("Neighborhood queue CPU gates passed")


if __name__ == "__main__":
    main()
