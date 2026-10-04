from __future__ import annotations

import hashlib
import importlib.util
import json
import tempfile
from pathlib import Path
from typing import Any


SCRIPT = Path(__file__).with_name("train-divar-laya-neighborhood-rlcd.py")
SOURCE_SHA256 = "e5760fe1325a195e6682c371457bfecd51d255c518756e3cbea234b8163a801f"
SPEC = importlib.util.spec_from_file_location("train_divar_laya_neighborhood_rlcd", SCRIPT)
assert SPEC and SPEC.loader
TRAINER = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(TRAINER)


def sample_row(split: str, target: str, group: str) -> dict[str, Any]:
    return {
        "schemaVersion": 2,
        "taskType": TRAINER.TASK_TYPE,
        "exampleId": hashlib.sha256(f"{split}:{group}".encode()).hexdigest(),
        "state": {
            "text": "یک واحد در مشهد می‌خواهم",
            "context": {
                "city": "mashhad",
                "neighborhood_candidates": [
                    {"slug": "hood-a", "name": "محله الف"},
                    {"slug": "hood-b", "name": "محله ب"},
                ],
            },
        },
        "questions": {
            "neighborhood_candidate": {
                "type": "choice",
                "instructions": "از متن، محله را انتخاب کن یا unknown.",
                "criteria": {"hood-a": "محلهٔ الف", "hood-b": "محلهٔ ب", "unknown": "ذکر نشده"},
            },
        },
        "targetDecisions": {"neighborhood_candidate": {"value": target, "source": "weak_test"}},
        "source": {
            "dataset": "divarofficial/real_estate_ads",
            "datasetSha256": SOURCE_SHA256,
            "rowOrdinal": 10,
            "normalizedTextGroupSha256": group,
            "split": split,
            "perspective": "seller_or_agent_supply_offer",
            "offerNeighborhoodMatch": "exact_official_crosswalk",
        },
        "provenance": {
            "derived": True,
            "sourceTextSynthetic": False,
            "realNeedGroundTruth": False,
            "humanReviewed": False,
            "trainingEligible": False,
            "cloudTransferAllowed": False,
            "labelKind": "weak_unknown_no_catalog_match" if target == "unknown" else "weak_positive_text_grounded",
        },
    }


def write_fixture(directory: Path) -> tuple[Path, Path, str]:
    rows = [
        sample_row("train", "hood-a", "1" * 64),
        sample_row("train", "unknown", "2" * 64),
        sample_row("calibration", "unknown", "3" * 64),
        sample_row("calibration", "hood-a", "4" * 64),
        sample_row("test", "hood-b", "5" * 64),
        sample_row("test", "unknown", "6" * 64),
    ]
    data_path = directory / "neighborhood.jsonl"
    payload = "".join(json.dumps(row, ensure_ascii=False) + "\n" for row in rows).encode()
    data_path.write_bytes(payload)
    digest = hashlib.sha256(payload).hexdigest()
    manifest_path = directory / "neighborhood.jsonl.manifest.json"
    manifest_path.write_text(json.dumps({
        "status": "complete_shadow_only",
        "taskType": TRAINER.TASK_TYPE,
        "sourcePerspective": "seller_or_agent_supply_offer_not_seeker_demand",
        "outputRows": len(rows),
        "outputBytes": len(payload),
        "outputSha256": digest,
        "provenance": {
            "realNeedGroundTruth": False,
            "humanReviewed": False,
            "trainingEligible": False,
            "layaPredictionsUsedAsLabels": False,
            "cloudTransferAllowed": False,
        },
    }), encoding="utf-8")
    return data_path, manifest_path, digest


def test_row_contract_preserves_unknown_and_bounded_choice_set() -> None:
    positive = sample_row("train", "hood-a", "1" * 64)
    unknown = sample_row("calibration", "unknown", "2" * 64)
    assert TRAINER.validate_row(positive, 1) == ("train", "mashhad", "hood-a", 2)
    assert TRAINER.validate_row(unknown, 2) == ("calibration", "mashhad", "unknown", 2)
    invalid = sample_row("test", "hood-a", "3" * 64)
    invalid["questions"]["neighborhood_candidate"]["criteria"].pop("unknown")
    try:
        TRAINER.validate_row(invalid, 3)
    except ValueError as error:
        assert "choice contract" in str(error)
    else:
        raise AssertionError("The `unknown` abstention option must be mandatory.")


def test_corpus_validator_checks_splits_ids_and_unknown_coverage() -> None:
    with tempfile.TemporaryDirectory() as temporary:
        data_path, manifest_path, digest = write_fixture(Path(temporary))
        summary, rows = TRAINER.validate_corpus(data_path, manifest_path, digest, 6)
        assert summary["rowsBySplit"] == {"train": 2, "calibration": 2, "test": 2}
        assert summary["rowsByTarget"] == {"hood-a": 2, "unknown": 3, "hood-b": 1}
        assert summary["rowsByTargetAndSplit"] == {
            "train": {"hood-a": 1, "unknown": 1},
            "calibration": {"unknown": 1, "hood-a": 1},
            "test": {"hood-b": 1, "unknown": 1},
        }
        assert len(rows) == 6
        pilot = TRAINER.select_pilot_rows(
            [row for row in rows if row["source"]["split"] == "train"], 2,
        )
        assert {row["targetDecisions"]["neighborhood_candidate"]["value"] for row in pilot} == {"hood-a", "unknown"}


def test_metrics_count_unknown_predictions_as_a_real_class() -> None:
    summary = TRAINER.metrics_for([
        {
            "logits": [0.0, 0.1, 2.0],
            "choices": ["hood-a", "hood-b", "unknown"],
            "target": "unknown",
            "city": "mashhad",
            "candidateCount": 2,
            "exampleId": "unknown-row",
            "bucket": "choice:3-5",
        },
        {
            "logits": [2.0, 0.0, -1.0],
            "choices": ["hood-a", "hood-b", "unknown"],
            "target": "hood-a",
            "city": "tehran",
            "candidateCount": 2,
            "exampleId": "positive-row",
            "bucket": "choice:3-5",
        },
    ])
    assert summary["accuracyIncludingAbstentions"] == 1.0
    assert summary["unknownTargetRows"] == 1
    assert summary["unknownPredictedRows"] == 1
    assert summary["unknownPrecision"] == 1.0
    assert summary["unknownRecall"] == 1.0
    assert summary["positiveTargetAccuracy"] == 1.0
    assert set(summary["byCity"]) == {"mashhad", "tehran"}


def main() -> None:
    test_row_contract_preserves_unknown_and_bounded_choice_set()
    test_corpus_validator_checks_splits_ids_and_unknown_coverage()
    test_metrics_count_unknown_predictions_as_a_real_class()
    print("Neighborhood RLCD trainer CPU contract checks passed")


if __name__ == "__main__":
    main()
