#!/usr/bin/env python3
"""Offline unit checks for research adapter evaluation metrics and gates."""

from __future__ import annotations

import importlib.util
import hashlib
import json
from pathlib import Path
import tempfile


SCRIPT = Path(__file__).with_name("evaluate-divar-si-adapter.py")
SPEC = importlib.util.spec_from_file_location("evaluate_divar_si_adapter", SCRIPT)
assert SPEC and SPEC.loader
EVALUATOR = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(EVALUATOR)


def main() -> None:
    assert EVALUATOR.resolve_checkpoint_type(
        "auto", {"architecture": "full-parameter adaptation: exact encoder + typed decision head"}
    ) == "full-model"
    assert EVALUATOR.resolve_checkpoint_type("auto", {"architecture": "frozen encoder + head adapter"}) == "adapter"
    assert EVALUATOR.resolve_checkpoint_type("full-model", {}) == "full-model"
    try:
        EVALUATOR.resolve_checkpoint_type("other", {})
    except ValueError:
        pass
    else:
        raise AssertionError("Unsupported checkpoint formats must fail closed.")

    metrics = EVALUATOR.Metrics(bins=10)
    metrics.add("a", [0.9, 0.1], ["a", "b"], "a")
    metrics.add("b", [0.7, 0.3], ["a", "b"], "a")
    report = metrics.result()
    assert report["decisions"] == 2
    assert report["accuracy"] == 0.5
    assert report["globalTrainingMajorityAccuracy"] == 0.5
    assert abs(report["multiclassBrierPerChoice"] - 0.25) < 1e-12
    assert abs(report["topLabelECE"] - 0.4) < 1e-12
    assert abs(report["balancedAccuracySupportedGoldClasses"] - 0.5) < 1e-12
    assert report["unknownRecall"] is None
    assert report["unknownFalsePositiveRate"] == 0.0

    try:
        EVALUATOR.Metrics().add("a", [0.7, 0.7], ["a", "b"], "a")
    except ValueError as error:
        assert "sum to one" in str(error)
    else:
        raise AssertionError("Invalid categorical probabilities must be rejected.")

    unknown_metrics = EVALUATOR.Metrics()
    unknown_metrics.add("unknown", [0.85, 0.15], ["unknown", "apartment-sale"], "apartment-sale")
    unknown_metrics.add("apartment-sale", [0.8, 0.2], ["unknown", "apartment-sale"], "apartment-sale")
    unknown_report = unknown_metrics.result()
    assert unknown_report["unknownRecall"] == 1.0
    assert unknown_report["unknownFalsePositiveRate"] == 1.0
    assert unknown_report["unknownPredictionRate"] == 1.0

    assert EVALUATOR.expected_majorities({"field": {"a": 4, "b": 2}}) == {"field": "a"}
    tie_result = EVALUATOR.expected_majorities({"field": {"z": 2, "a": 2}})
    assert tie_result == {"field": "z"}
    ordered_contract = {"second": 1, "first": 2}
    expected_hash = hashlib.sha256(
        json.dumps(ordered_contract, ensure_ascii=False, separators=(",", ":"), sort_keys=False).encode()
    ).hexdigest()
    assert EVALUATOR.question_schema_sha256(ordered_contract) == expected_hash

    row = {
        "hypotheticalNeed": {
            "targetDecisions": {"category_candidate": {"value": "shop-rent"}},
            "sourceOfferLocation": {"appCitySlug": "mashhad"},
        }
    }
    grouped = __import__("collections").defaultdict(EVALUATOR.Metrics)
    EVALUATOR.add_observation(grouped, "property_kind", row, "shop", [1.0], ["shop"], "shop")
    assert grouped[("property_kind", "all", "all")].count == 1
    assert grouped[("property_kind", "category", "shop-rent")].count == 1
    assert grouped[("property_kind", "city", "mashhad")].count == 1

    with tempfile.TemporaryDirectory() as tmp:
        adapter_path = Path(tmp) / "best-adapter.safetensors"
        adapter_path.touch()
        valid_run = {
            "status": "research_run_complete",
            "productionLoadAllowed": False,
            "experimentOnly": True,
            "syntheticTrainingAuthorized": True,
            "syntheticTargetsAreRealNeedGroundTruth": False,
            "dataSha256": "data-hash",
            "baseWeightsSha256": EVALUATOR.BASE.MODEL_WEIGHT_SHA256,
            "model": EVALUATOR.BASE.MODEL_ID,
            "modelRevision": EVALUATOR.BASE.MODEL_REVISION,
        }
        EVALUATOR.require_completed_run(valid_run, {"outputSha256": "data-hash"}, adapter_path)
        full_model_path = Path(tmp) / "model.safetensors"
        full_model_path.touch()
        EVALUATOR.require_completed_run(valid_run, {"outputSha256": "data-hash"}, full_model_path)
        invalid_run = dict(valid_run, status="running")
        try:
            EVALUATOR.require_completed_run(invalid_run, {"outputSha256": "data-hash"}, adapter_path)
        except ValueError:
            pass
        else:
            raise AssertionError("An in-progress run must not be evaluated as a selected adapter.")

        running_adapter = Path(tmp) / "last-adapter.safetensors"
        running_adapter.touch()
        running_run = dict(valid_run, status="running")
        progress = {
            "epoch": 1,
            "step": 100,
            "totalSteps": 1_000,
            "meanLoss": -0.25,
            "checkpoint": "last-adapter.safetensors",
        }
        EVALUATOR.require_running_checkpoint(
            running_run, {"outputSha256": "data-hash"}, running_adapter, progress,
        )
        for invalid_progress in (
            dict(progress, step=0),
            dict(progress, step=1_000),
            dict(progress, checkpoint="best-adapter.safetensors"),
        ):
            try:
                EVALUATOR.require_running_checkpoint(
                    running_run, {"outputSha256": "data-hash"}, running_adapter, invalid_progress,
                )
            except ValueError:
                pass
            else:
                raise AssertionError("Running checkpoint evaluation must reject stale or incomplete progress metadata.")

    print("Si checkpoint evaluator: metrics, full-model/adapter routing, completed-run, and running-checkpoint gates passed")


if __name__ == "__main__":
    main()
