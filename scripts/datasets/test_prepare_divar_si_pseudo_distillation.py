#!/usr/bin/env python3
from __future__ import annotations

import importlib.util
import hashlib
import json
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path


SCRIPT = Path(__file__).with_name("prepare-divar-si-pseudo-distillation.py")
SPEC = importlib.util.spec_from_file_location("divar_v10_builder_test", SCRIPT)
assert SPEC is not None and SPEC.loader is not None
BUILDER = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(BUILDER)


QUESTIONS = {
    "category_candidate": {"type": "choice", "criteria": {"apartment-rent": "آپارتمان اجاره", "unknown": "نامشخص"}},
    "property_kind": {"type": "choice", "criteria": {"apartment": "آپارتمان", "unknown": "نامشخص"}},
    "transaction_type": {"type": "choice", "criteria": {"rent_monthly": "اجاره", "unknown": "نامشخص"}},
}


def source_row() -> dict:
    question_hash = BUILDER.sha256_json(QUESTIONS)
    decision = lambda value: {
        "value": value,
        "source": "si_offer_inspection",
        "confidence": 0.01,
        "accepted": False,
    }
    return {
        "taskType": "divar-counterfactual-post-need-si-proposal/v5",
        "synthetic": True,
        "derivedFromSupplyListing": True,
        "realNeedGroundTruth": False,
        "trainingEligible": False,
        "state": "RAW SOURCE OFFER TEXT MUST NOT LEAK INTO THE TRAINING CORPUS",
        "exampleId": "listing-private-id",
        "source": {
            "dataset": "divarofficial/real_estate_ads",
            "normalizedTextGroupSha256": "a" * 64,
        },
        "si": {"model": BUILDER.MODEL_ID},
        "review": {"trainingUse": "not_approved"},
        "rights": {"redistributionAllowed": False},
        "hypotheticalNeed": {"questionSchemaSha256": question_hash},
        "sourceOfferLocation": {"appCitySlug": "mashhad", "appNeighborhoodSlug": "ferdowsi"},
        "siDerivedHypotheticalNeed": {
            "taskType": "divar-si-derived-hypothetical-need/v1",
            "model": BUILDER.MODEL_ID,
            "synthetic": True,
            "conversionStatus": "rendered_from_compatible_si_choices",
            "accepted": False,
            "realNeedGroundTruth": False,
            "trainingEligible": False,
            "state": "یک آپارتمان برای اجاره در مشهد می‌خواهم",
            "decisionAgreementWithSource": {
                "transactionCategoryCompatible": True,
                "propertyKindCategoryCompatible": True,
                "categoryMatchesSource": True,
                "propertyKindMatchesSource": True,
                "transactionMatchesSource": True,
            },
            "decisions": {
                "category_candidate": decision("apartment-rent"),
                "property_kind": decision("apartment"),
                "transaction_type": decision("rent_monthly"),
            },
        },
    }


class PseudoDistillationBuilderTests(unittest.TestCase):
    def test_persian_normalization_is_stable_and_digit_aware(self) -> None:
        self.assertEqual(BUILDER.normalized_text("ي ك ۱۲۳، متری"), "ی ک 123 متری")
        digest = hashlib.sha256(BUILDER.normalized_text("ی ک 123 متری").encode()).hexdigest()
        bucket = int(digest[:8], 16) % 100
        expected = "train" if bucket < 80 else "calibration" if bucket < 90 else "test"
        self.assertEqual(BUILDER.split_for_state_digest(digest), expected)

    def test_converts_only_si_proposal_and_marks_it_pseudo(self) -> None:
        row, reason = BUILDER.row_to_training_record(source_row(), QUESTIONS, BUILDER.sha256_json(QUESTIONS))
        self.assertEqual(reason, "eligible")
        assert row is not None
        self.assertEqual(row["targetOrigin"], "si_pseudo_labels_not_gold")
        self.assertIs(row["realNeedGroundTruth"], False)
        self.assertIs(row["trainingEligible"], False)
        self.assertEqual(row["hypotheticalNeed"]["targetDecisions"]["property_kind"]["value"], "apartment")
        self.assertEqual(row["hypotheticalNeed"]["targetDecisions"]["property_kind"]["teacherConfidenceUncalibrated"], 0.01)
        self.assertNotIn("RAW SOURCE OFFER TEXT", str(row))
        self.assertNotIn("listing-private-id", str(row))

    def test_incompatible_si_result_is_not_training_eligible(self) -> None:
        raw = source_row()
        raw["siDerivedHypotheticalNeed"]["decisionAgreementWithSource"]["categoryMatchesSource"] = False
        row, reason = BUILDER.row_to_training_record(raw, QUESTIONS, BUILDER.sha256_json(QUESTIONS))
        self.assertIsNone(row)
        self.assertEqual(reason, "decision_compatibility_gate_failed")

    def test_question_schema_mismatch_is_rejected(self) -> None:
        raw = source_row()
        raw["hypotheticalNeed"]["questionSchemaSha256"] = "0" * 64
        row, reason = BUILDER.row_to_training_record(raw, QUESTIONS, BUILDER.sha256_json(QUESTIONS))
        self.assertIsNone(row)
        self.assertEqual(reason, "question_schema_mismatch")

    def test_full_cpu_builder_writes_hash_matched_pseudo_only_dataset(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            input_path = root / "v9.jsonl"
            input_manifest = root / "v9.manifest.json"
            questions_manifest = root / "v8.manifest.json"
            output = root / "v10.jsonl"
            quarantine = root / "v10-quarantine.jsonl"
            question_hash = BUILDER.sha256_json(QUESTIONS)
            rows = []
            for index in range(500):
                row = source_row()
                row["source"]["normalizedTextGroupSha256"] = hashlib.sha256(f"source-{index}".encode()).hexdigest()
                row["exampleId"] = f"source-id-{index}"
                row["hypotheticalNeed"]["questionSchemaSha256"] = question_hash
                row["siDerivedHypotheticalNeed"]["state"] = f"یک آپارتمان شماره {index} برای اجاره در مشهد می‌خواهم"
                rows.append(row)
            input_path.write_text("".join(json.dumps(row, ensure_ascii=False) + "\n" for row in rows), encoding="utf-8")
            input_manifest.write_text(json.dumps({
                "status": "complete",
                "taskType": "divar-counterfactual-post-need-si-proposal/v5",
                "model": BUILDER.MODEL_ID,
                "synthetic": True,
                "derivedFromSupplyListing": True,
                "realNeedGroundTruth": False,
                "trainingEligible": False,
                "rightsReview": "pending",
                "sourceRowsAudited": len(rows),
                "keptUniqueCounterfactualRows": len(rows),
                "duplicateRowsCollapsed": 0,
                "conflictingRowsQuarantined": 0,
            }), encoding="utf-8")
            questions_manifest.write_text(json.dumps({
                "questionFactory": {
                    "hypotheticalNeedQuestions": QUESTIONS,
                    "hypotheticalNeedQuestionSchemaSha256": question_hash,
                },
            }, ensure_ascii=False), encoding="utf-8")
            completed = subprocess.run([
                sys.executable, "-B", str(SCRIPT),
                "--input", str(input_path),
                "--input-manifest", str(input_manifest),
                "--questions-manifest", str(questions_manifest),
                "--expected-input-sha256", BUILDER.sha256_file(input_path),
                "--output", str(output),
                "--quarantine", str(quarantine),
                "--min-rows", "100",
            ], capture_output=True, text=True, check=False)
            self.assertEqual(completed.returncode, 0, completed.stderr or completed.stdout)
            manifest = json.loads(Path(f"{output}.manifest.json").read_text(encoding="utf-8"))
            self.assertGreaterEqual(manifest["outputRows"], 100)
            self.assertEqual(manifest["targetOrigin"], "si_pseudo_labels_not_gold")
            self.assertIs(manifest["siPredictionsUsedAsLabels"], True)
            self.assertIs(manifest["realNeedGroundTruth"], False)
            self.assertEqual(manifest["outputSha256"], BUILDER.sha256_file(output))
            self.assertEqual(manifest["outputBytes"], output.stat().st_size)
            self.assertEqual(quarantine.read_text(encoding="utf-8"), "")
            with output.open(encoding="utf-8") as output_stream:
                first = json.loads(output_stream.readline())
            self.assertNotIn("RAW SOURCE OFFER TEXT", json.dumps(first, ensure_ascii=False))
            self.assertNotIn("source-id-0", json.dumps(first, ensure_ascii=False))


if __name__ == "__main__":
    unittest.main()
