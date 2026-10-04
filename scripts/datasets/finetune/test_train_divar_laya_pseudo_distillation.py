#!/usr/bin/env python3
from __future__ import annotations

import hashlib
import importlib.util
import json
import tempfile
import unittest
from pathlib import Path


SCRIPT = Path(__file__).with_name("train-divar-laya-pseudo-distillation.py")
SPEC = importlib.util.spec_from_file_location("divar_v10_trainer_test", SCRIPT)
assert SPEC is not None and SPEC.loader is not None
TRAINER = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(TRAINER)
BASE = TRAINER.BASE


CONTRACT = {
    "category_candidate": {"type": "choice", "instructions": "دسته", "criteria": {"apartment-rent": "آپارتمان اجاره", "unknown": "نامشخص"}},
    "property_kind": {"type": "choice", "instructions": "ملک", "criteria": {"apartment": "آپارتمان", "unknown": "نامشخص"}},
    "transaction_type": {"type": "choice", "instructions": "معامله", "criteria": {"rent_monthly": "اجاره", "unknown": "نامشخص"}},
}


def make_row(index: int) -> dict:
    state = f"نیاز نمونه {index} برای آپارتمان در مشهد"
    digest = hashlib.sha256(BASE.normalize_model_input(state).encode()).hexdigest()
    split = BASE.training_split_for_state(state)
    return {
        "schemaVersion": 1,
        "taskType": TRAINER.DATA_TASK,
        "exampleId": hashlib.sha256(f"id-{index}".encode()).hexdigest(),
        "state": state,
        "stateSha256": digest,
        "synthetic": True,
        "derivedFromSupplyListing": True,
        "realNeedGroundTruth": False,
        "trainingEligible": False,
        "targetOrigin": "laya_pseudo_labels_not_gold",
        "teacher": {"model": TRAINER.MODEL_ID},
        "source": {"dataset": "divarofficial/real_estate_ads", "splitGroup": hashlib.sha256(f"source-{index}".encode()).hexdigest()},
        "hypotheticalNeed": {
            "taskType": "divar-laya-pseudo-need/v1",
            "trainingSplit": split,
            "questionSchemaSha256": TRAINER.question_hash(CONTRACT),
            "targetDecisions": {
                "category_candidate": {"value": "apartment-rent", "source": TRAINER.PSEUDO_SOURCE, "teacher": TRAINER.MODEL_ID, "humanReviewed": False},
                "property_kind": {"value": "apartment", "source": TRAINER.PSEUDO_SOURCE, "teacher": TRAINER.MODEL_ID, "humanReviewed": False},
                "transaction_type": {"value": "rent_monthly", "source": TRAINER.PSEUDO_SOURCE, "teacher": TRAINER.MODEL_ID, "humanReviewed": False},
            },
        },
    }


class PseudoDistillationTrainerValidationTests(unittest.TestCase):
    def test_accepts_hash_matched_pseudo_only_corpus_and_reports_train_counts(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "corpus.jsonl"
            rows = []
            split_counts = {"train": 0, "calibration": 0, "test": 0}
            index = 0
            while min(split_counts.values()) < 32:
                row = make_row(index)
                split_counts[row["hypotheticalNeed"]["trainingSplit"]] += 1
                rows.append(row)
                index += 1
            content = "".join(json.dumps(row, ensure_ascii=False, separators=(",", ":")) + "\n" for row in rows)
            path.write_text(content, encoding="utf-8")
            target_counts = {field: {value: len(rows)} for field, value in (
                ("category_candidate", "apartment-rent"), ("property_kind", "apartment"),
                ("transaction_type", "rent_monthly"),
            )}
            train_target_counts = {field: {value: split_counts["train"]} for field, value in (
                ("category_candidate", "apartment-rent"), ("property_kind", "apartment"),
                ("transaction_type", "rent_monthly"),
            )}
            manifest = {
                "taskType": TRAINER.DATA_TASK,
                "model": TRAINER.MODEL_ID,
                "modelRevision": TRAINER.MODEL_REVISION,
                "teacherWeightsSha256": TRAINER.MODEL_WEIGHT_SHA256,
                "synthetic": True,
                "realNeedGroundTruth": False,
                "trainingEligible": False,
                "targetOrigin": "laya_pseudo_labels_not_gold",
                "layaPredictionsUsedAsLabels": True,
                "humanReviewed": False,
                "cloudTransferAllowed": False,
                "sourceGroupsDisjoint": True,
                "exactNormalizedStateGroupsDisjoint": True,
                "outputBytes": path.stat().st_size,
                "outputSha256": hashlib.sha256(path.read_bytes()).hexdigest(),
                "questionSchemaSha256": TRAINER.question_hash(CONTRACT),
                "outputRows": len(rows),
                "trainingSplitCounts": split_counts,
                "targetCountsByField": target_counts,
            }
            summary = TRAINER.validate_pseudo_corpus(path, manifest, CONTRACT)
            self.assertEqual(summary["rowCount"], len(rows))
            self.assertEqual(summary["rowsBySplit"], split_counts)
            self.assertEqual(summary["trainingTargetsByField"], train_target_counts)

    def test_rejects_manifest_that_claims_real_ground_truth(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "empty.jsonl"
            path.write_text("", encoding="utf-8")
            manifest = {"realNeedGroundTruth": True}
            with self.assertRaises(ValueError):
                TRAINER.validate_pseudo_corpus(path, manifest, CONTRACT)


if __name__ == "__main__":
    unittest.main()
