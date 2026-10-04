#!/usr/bin/env python3
"""Offline checks for the fail-closed v6 queue preflight contract."""

from __future__ import annotations

import importlib.util
import json
from pathlib import Path


ROOT = Path(__file__).resolve().parents[3]
SCRIPT = Path(__file__).with_name("queue-divar-v6-after-v3.py")
SPEC = importlib.util.spec_from_file_location("queue_divar_v6_after_v3", SCRIPT)
assert SPEC and SPEC.loader
QUEUE = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(QUEUE)


def main() -> None:
    plan_path = ROOT / QUEUE.PLAN_RELATIVE
    plan = json.loads(plan_path.read_text(encoding="utf-8"))
    training = plan["training"]
    report = {
        "status": "validated_only",
        "trainingPerformed": False,
        "trainingMethod": training["method"],
        "trainableScope": "encoder+decision_head",
        "device": training["device"],
        "baseWeightsSha256": plan["model"]["weightsSha256"],
        "evaluationSamplingPolicy": training["evaluationSamplingPolicy"],
        "selectedRows": {"train": plan["dataset"]["split"]["train"]},
        "expectedTrainingDecisions": training["expectedTrainingDecisions"],
        "microBatchSize": training["microBatchSize"],
        "gradientAccumulation": training["gradientAccumulation"],
        "effectiveBatchSize": training["effectiveBatchSize"],
        "groupSize": training["groupSize"],
        "maxLen": training["maxLen"],
        "headMaxLen": training["headMaxLen"],
        "expectedOptimizerSteps": training["expectedOptimizerSteps"],
        "dataSummary": {
            "rowsBySplit": {"train": plan["dataset"]["split"]["train"]},
        },
    }
    expected_decisions = training["expectedTrainingDecisions"]
    per_field = expected_decisions // len(training["fields"])
    remainder = expected_decisions % len(training["fields"])
    report["selectedTrainingTargetsByField"] = {}
    for index, field in enumerate(training["fields"]):
        report["selectedTrainingTargetsByField"][field] = {
            "test-label": per_field + int(index < remainder),
        }

    QUEUE.validate_preflight_report(plan, report)
    try:
        QUEUE.validate_preflight_report(
            plan, {**report, "evaluationSamplingPolicy": "category-stratified-v0"},
        )
    except ValueError as error:
        assert "reviewed v6 launch plan" in str(error)
    else:
        raise AssertionError("A preflight using the wrong evaluation sampling policy must fail closed.")
    try:
        QUEUE.validate_preflight_report(plan, {**report, "trainableScope": "head-only"})
    except ValueError as error:
        assert "reviewed v6 launch plan" in str(error)
    else:
        raise AssertionError("The next stage must reject the old head-only trainer scope.")

    evaluation = {
        "status": "research_evaluation_only",
        "productionLoadAllowed": False,
        "syntheticOnly": True,
        "realUserNeedAccuracyEstablished": False,
        "device": plan["evaluation"]["device"],
        "testRows": plan["dataset"]["split"]["test"],
        "testCoverage": "all deterministic held-out rows",
        "dataSha256": plan["dataset"]["sha256"],
    }
    QUEUE.validate_evaluation_report(plan, evaluation)
    try:
        QUEUE.validate_evaluation_report(plan, {**evaluation, "testRows": evaluation["testRows"] - 1})
    except ValueError as error:
        assert "full held-out split" in str(error)
    else:
        raise AssertionError("A partial final test evaluation must fail closed.")

    print("v6 queue: RLCD preflight, full-parameter scope, sampling policy and full-test evaluation gates passed")


if __name__ == "__main__":
    main()
