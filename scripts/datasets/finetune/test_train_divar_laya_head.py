#!/usr/bin/env python3
"""Contract tests for the isolated synthetic Laya trainer (no model load)."""

from __future__ import annotations

import importlib.util
import json
from pathlib import Path
import tempfile


SCRIPT = Path(__file__).with_name("train-divar-laya-head.py")
SPEC = importlib.util.spec_from_file_location("train_divar_laya_head", SCRIPT)
assert SPEC and SPEC.loader
TRAINER = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(TRAINER)


def state_for_split(split: str) -> str:
    for index in range(10_000):
        text = f"نیاز ساختگی {split} شماره {index} برای آزمون جداسازی متن."
        if TRAINER.training_split_for_state(text) == split:
            return text
    raise AssertionError(f"Could not find a test state for {split}.")


def row(split: str, group: str, example_id: str, state: str | None = None) -> dict:
    state = state or state_for_split(split)
    sources = {
        "category_candidate": "source_offer_category_counterfactual",
        "property_kind": "source_offer_category_counterfactual",
        "transaction_type": "counterfactual_from_requested_category",
    }
    return {
        "schemaVersion": 5,
        "taskType": TRAINER.DATA_TASK,
        "exampleId": example_id,
        "synthetic": True,
        "derivedFromSupplyListing": True,
        "realNeedGroundTruth": False,
        "trainingEligible": False,
        "state": state,
        "stateTruncated": False,
        "source": {"dataset": "divarofficial/real_estate_ads", "splitGroup": group},
        "hypotheticalNeed": {
            "schemaVersion": 5,
            "realNeedGroundTruth": False,
            "trainingEligible": False,
            "generation": {"method": "deterministic-counterfactual-template", "version": 5},
            "originalSplit": split,
            "trainingSplit": TRAINER.training_split_for_state(state),
            "targetDecisions": {
                field: {"value": "unknown" if field not in {"category_candidate", "property_kind", "transaction_type"} else {
                    "category_candidate": "apartment-sale", "property_kind": "apartment", "transaction_type": "buy"}[field],
                    "source": sources[field]}
                for field in TRAINER.TRAIN_FIELDS
            },
        },
    }


def contract() -> dict:
    option_values = {
        "category_candidate": ["apartment-sale", "unknown"],
        "property_kind": ["apartment", "unknown"],
        "transaction_type": ["buy", "unknown"],
    }
    return {
        key: {"type": "choice", "instructions": f"تشخیص {key}",
              "criteria": {value: value for value in values}}
        for key, values in option_values.items()
    }


def main() -> None:
    valid = [row("train", "group-1", "example-1"),
             row("calibration", "group-2", "example-2"),
             row("test", "group-3", "example-3")]
    report = TRAINER.validate_corpus(valid, contract())
    assert report["rowCount"] == 3
    assert report["uniqueSourceGroups"] == 3
    assert report["uniqueNormalizedStateGroups"] == 3
    assert report["rowsBySplit"] == {"train": 1, "calibration": 1, "test": 1}
    assert set(report["targetsByField"]) == {"category_candidate", "property_kind", "transaction_type"}

    leaked = [row("train", "shared-group", "example-a"),
              row("calibration", "group-2", "example-b"),
              row("test", "shared-group", "example-c")]
    try:
        TRAINER.validate_corpus(leaked, contract())
    except ValueError as error:
        assert "source group crosses" in str(error)
    else:
        raise AssertionError("source-group overlap across partitions must fail closed")

    duplicate_state = [row("train", "group-a", "example-a", "آپارتمان ۱۲۳ متر، ونک."),
                       row("calibration", "group-b", "example-b", "آپارتمان 123 متر ونک"),
                       row("test", "group-c", "example-c")]
    try:
        TRAINER.validate_corpus(duplicate_state, contract())
    except ValueError as error:
        assert "repeats a normalized generated model-input" in str(error)
    else:
        raise AssertionError("normalized model-input duplicates must fail closed")

    invalid = [row("train", "group-1", "example-1"),
               row("calibration", "group-2", "example-2"),
               row("test", "group-3", "example-3")]
    invalid[0]["trainingEligible"] = True
    try:
        TRAINER.validate_corpus(invalid, contract())
    except ValueError as error:
        assert "synthetic-only data contract" in str(error)
    else:
        raise AssertionError("synthetic training candidates must never become production eligible")

    with tempfile.TemporaryDirectory() as temporary:
        legacy_manifest = Path(temporary) / "legacy.json"
        legacy_manifest.write_text(json.dumps({
            "schemaVersion": 1,
            "taskType": TRAINER.DATA_TASK,
            "model": TRAINER.MODEL_ID,
            "questionFactory": {"hypotheticalNeedQuestions": contract()},
        }), encoding="utf-8")
        try:
            TRAINER.question_manifest(legacy_manifest)
        except ValueError as error:
            assert "corrected, text-grouped" in str(error)
        else:
            raise AssertionError("legacy split-leaking corpus manifests must not enter training")

        v6_manifest = Path(temporary) / "v6.json"
        v6_manifest.write_text(json.dumps({
            "schemaVersion": 2,
            "taskType": TRAINER.DATA_TASKS[6],
            "model": TRAINER.MODEL_ID,
            "trainingSplitPolicy": TRAINER.TRAINING_SPLIT_POLICY,
            "exactNormalizedStateGroupsDisjoint": True,
            "questionFactory": {
                "hypotheticalNeedQuestions": contract(),
                "hypotheticalTask": TRAINER.HYPOTHETICAL_TASKS[6],
                "hypotheticalTemplateVersion": 6,
                "outputSemanticsVersion": 6,
            },
        }), encoding="utf-8")
        _, v6_contract = TRAINER.question_manifest(v6_manifest)
        v6_rows = [row("train", "v6-group-1", "v6-example-1"),
                   row("calibration", "v6-group-2", "v6-example-2"),
                   row("test", "v6-group-3", "v6-example-3")]
        for item in v6_rows:
            item["schemaVersion"] = 6
            item["taskType"] = TRAINER.DATA_TASKS[6]
            item["hypotheticalNeed"]["schemaVersion"] = 6
            item["hypotheticalNeed"]["generation"]["version"] = 6
        assert TRAINER.validate_corpus(v6_rows, v6_contract, TRAINER.DATA_TASKS[6])["rowCount"] == 3

    print("synthetic Laya trainer contract: 4 checks passed")


if __name__ == "__main__":
    main()
