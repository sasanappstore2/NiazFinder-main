from __future__ import annotations

import importlib.util
from pathlib import Path
from typing import Any


SCRIPT = Path(__file__).with_name("prepare-divar-si-neighborhood-queue.py")
SPEC = importlib.util.spec_from_file_location("prepare_divar_si_neighborhood_queue", SCRIPT)
assert SPEC and SPEC.loader
PREPARE = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(PREPARE)


def sample_manifest() -> dict[str, Any]:
    return {
        "status": "complete_shadow_only",
        "taskType": PREPARE.TASK_TYPE,
        "sourceSha256": PREPARE.SOURCE_SHA256,
        "sourcePerspective": "seller_or_agent_supply_offer_not_seeker_demand",
        "outputSha256": "a" * 64,
        "outputBytes": 1234,
        "outputRows": 120,
        "provenance": {
            "sourceTextSynthetic": False,
            "realNeedGroundTruth": False,
            "humanReviewed": False,
            "trainingEligible": False,
            "siPredictionsUsedAsLabels": False,
            "cloudTransferAllowed": False,
        },
        "counts": {
            "outputRowsBySplit": {"train": 80, "calibration": 20, "test": 20},
            "outputRowsByLabelKind": {
                "weak_positive_text_grounded": 60,
                "weak_unknown_no_catalog_match": 60,
            },
            "outputRowsByCity": {"mashhad": {"total": 80}, "tehran": {"total": 40}},
        },
    }


def test_plan_locks_split_counts_model_and_research_only_labels() -> None:
    plan = PREPARE.build_plan(sample_manifest(), "a" * 64, 1234)
    assert plan["dataset"]["split"] == {"train": 80, "calibration": 20, "test": 20}
    assert plan["dataset"]["candidateCities"] == 2
    assert plan["dataset"]["positiveRows"] == 60
    assert plan["dataset"]["unknownRows"] == 60
    assert plan["model"]["id"] == "convaiinnovations/si-multilingual"
    assert plan["device"] == "mps"
    assert plan["maxConcurrentMpsJobs"] == 1
    assert plan["pilotTrainRows"] == 64
    assert plan["dataset"]["trainingEligible"] is False


def test_plan_refuses_wrong_hash_source_or_missing_unknown_class() -> None:
    cases = []
    wrong_hash = sample_manifest()
    wrong_hash["sourceSha256"] = "b" * 64
    cases.append(wrong_hash)
    no_unknown = sample_manifest()
    no_unknown["counts"]["outputRowsByLabelKind"]["weak_unknown_no_catalog_match"] = 0
    cases.append(no_unknown)
    bad_split = sample_manifest()
    bad_split["counts"]["outputRowsBySplit"]["test"] = 19
    cases.append(bad_split)
    for manifest in cases:
        try:
            PREPARE.build_plan(manifest, "a" * 64, 1234)
        except ValueError:
            pass
        else:
            raise AssertionError("Invalid weak-label source/split should not produce an MPS launch plan.")


def main() -> None:
    test_plan_locks_split_counts_model_and_research_only_labels()
    test_plan_refuses_wrong_hash_source_or_missing_unknown_class()
    print("Neighborhood queue plan preparation gates passed")


if __name__ == "__main__":
    main()
