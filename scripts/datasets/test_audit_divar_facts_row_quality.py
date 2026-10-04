#!/usr/bin/env python3
"""Fast in-memory regression checks for the aggregate-only Divar row audit."""

from __future__ import annotations

import json
import hashlib
import tempfile
import unittest
from pathlib import Path

from audit_divar_facts_row_quality import ROOT, audit_file, audit_records, resolve_catalog_city_id


DATASET_SHA = "f" * 64
GROUP_SHA = "c" * 64


def make_row(
    example_id: str,
    ordinal: int,
    split: str,
    neighborhood_id: str = "hood-1",
    category: str = "apartment-rent",
    state: str = "PRIVATE_TEXT_SENTINEL_should_never_leave_memory",
) -> dict:
    return {
        "schemaVersion": 2,
        "taskType": "divar-property-offer-facts/v2",
        "exampleId": example_id,
        "source": {
            "dataset": "divarofficial/real_estate_ads",
            "datasetSha256": DATASET_SHA,
            "rowOrdinal": ordinal,
            "normalizedTextGroupSha256": GROUP_SHA,
            "sourceType": "seller_or_agent_property_offer",
        },
        "perspective": "seller_or_agent_supply_offer",
        "synthetic": False,
        "derived": True,
        "isNeedGroundTruth": False,
        "humanReviewed": False,
        "sourceUse": {"cloudTransferAllowed": False},
        "split": split,
        "splitGroup": GROUP_SHA,
        "groupWeight": 0.5,
        "state": state,
        "typedDecisions": {
            "offer_category": {"value": category, "source": "source"},
            "offer_property_kind": {"value": "apartment", "source": "source"},
            "offer_transaction_type": {"value": "rent_monthly", "source": "source"},
        },
        "sourceOfferAttributes": {"area": 80, "rooms": 2},
        "offerLocation": {
            "sourceCitySlug": "city-a",
            "appCitySlug": "city-a",
            "sourceNeighborhoodSlug": "source-hood",
            "appNeighborhoodId": neighborhood_id,
            "appNeighborhoodName": "محله الف",
            "neighborhoodMatch": "exact_official_crosswalk",
        },
        "excludedFromSeekerIntent": ["listing_price", "listing_rent", "listing_credit"],
        "privacy": {
            "contactPatternRedactions": 0,
            "reviewStatus": "regex_only_not_comprehensive",
            "transferAllowed": False,
        },
    }


class DivarFactsAuditTests(unittest.TestCase):
    def test_detects_duplicates_leakage_and_orphans_without_returning_text(self) -> None:
        rows = [
            make_row("a" * 64, 1, "train"),
            make_row("b" * 64, 2, "train", neighborhood_id="missing-hood", category="unknown-leaf"),
            make_row("a" * 64, 1, "test"),
            None,
        ]
        report = audit_records(
            rows,
            {"city-a": {"hood-1": "محله الف"}},
            {"apartment-rent"},
            expected_rows=4,
            expected_dataset_sha256=DATASET_SHA,
        )

        self.assertEqual(report["rows"]["linesRead"], 4)
        self.assertEqual(report["rows"]["rowsParsed"], 3)
        self.assertEqual(report["rows"]["malformedJsonRows"], 1)
        self.assertEqual(report["rows"]["duplicateExampleIdRows"], 1)
        self.assertEqual(report["rows"]["duplicateSourceOrdinalRows"], 1)
        self.assertEqual(report["rows"]["duplicateNormalizedTextGroups"], 1)
        self.assertEqual(report["rows"]["duplicateRowsBeyondFirstTextGroup"], 2)
        self.assertEqual(report["rows"]["textGroupsAcrossSplits"], 1)
        self.assertEqual(report["findings"]["categoryOutsideManifestRows"], 1)
        self.assertEqual(report["findings"]["mappedNeighborhoodIdsMissingFromCityCatalog"], 1)
        encoded = json.dumps(report, ensure_ascii=False)
        self.assertNotIn("PRIVATE_TEXT_SENTINEL", encoded)
        self.assertNotIn("محله الف", encoded)
        self.assertFalse(report["qualityGates"]["eligibleForRealNeedFineTuning"])

    def test_persian_catalog_name_normalization_is_stable(self) -> None:
        row = make_row("d" * 64, 4, "train")
        row["offerLocation"]["appNeighborhoodName"] = "محله‌ الف"
        report = audit_records(
            [row],
            {"city-a": {"hood-1": "محله الف"}},
            {"apartment-rent"},
            expected_rows=1,
            expected_dataset_sha256=DATASET_SHA,
        )
        self.assertEqual(report["findings"].get("mappedNeighborhoodNameMismatchRows", 0), 0)
        self.assertEqual(report["referenceCoverage"]["mappedNeighborhoodRows"], 1)

    def test_city_slug_join_mirrors_runtime_catalog_fallbacks(self) -> None:
        self.assertEqual(resolve_catalog_city_id("tehran-city", {"tehran": {"v": "تهران"}}), "tehran")
        self.assertEqual(resolve_catalog_city_id("tehran", {"tehran-city": {"v": "تهران"}}), "tehran-city")
        self.assertEqual(resolve_catalog_city_id("khorasan-razavi-1", {"mashhad": {"v": "مشهد"}}), "mashhad")
        self.assertIsNone(resolve_catalog_city_id("unknown-city", {}))

    def test_streaming_file_audit_hashes_source_and_writes_aggregate_only(self) -> None:
        with tempfile.TemporaryDirectory(prefix=".test-divar-row-audit-", dir=ROOT) as temporary:
            root = Path(temporary)
            facts = root / "facts.jsonl"
            manifest = root / "facts.manifest.json"
            catalogs = root / "catalog"
            catalogs.mkdir()
            (catalogs / "city-a.json").write_text(
                json.dumps({
                    "cityId": "city-a",
                    "neighborhoods": [{"id": "hood-1", "name": "محله الف"}],
                }),
                encoding="utf-8",
            )
            facts.write_bytes(
                (json.dumps(make_row("e" * 64, 9, "train"), ensure_ascii=False) + "\nnot-json\n").encode("utf-8")
            )
            manifest.write_text(json.dumps({
                "targetTask": "divar-property-offer-facts/v2",
                "outputRows": 2,
                "datasetSha256": DATASET_SHA,
                "categoryCounts": {"apartment-rent": 1},
                "sourceRowsRead": 3,
                "outputSha256": hashlib.sha256(facts.read_bytes()).hexdigest(),
            }), encoding="utf-8")
            output = root / "audit.json"

            report = audit_file(facts, manifest, catalogs, output)
            encoded = output.read_text(encoding="utf-8")

            self.assertEqual(report["rows"]["linesRead"], 2)
            self.assertEqual(report["rows"]["rowsParsed"], 1)
            self.assertEqual(report["rows"]["malformedJsonRows"], 1)
            self.assertEqual(len(report["input"]["sha256"]), 64)
            self.assertEqual(report["status"], "complete_with_findings")
            self.assertNotIn("PRIVATE_TEXT_SENTINEL", encoded)
            self.assertNotIn("e" * 64, encoded)

    def test_audits_location_reconciliation_derivative_and_checks_lineage_hashes(self):
        with tempfile.TemporaryDirectory(prefix=".test-divar-reconciled-audit-", dir=ROOT) as temporary:
            root = Path(temporary)
            catalogs = root / "catalog"
            catalogs.mkdir()
            (catalogs / "city-a.json").write_text(json.dumps({
                "cityId": "city-a",
                "neighborhoods": [{"id": "hood-1", "name": "محله الف"}],
            }), encoding="utf-8")
            source_facts = root / "source-facts.jsonl"
            source_bytes = (json.dumps(make_row("f" * 64, 1, "train"), ensure_ascii=False) + "\n").encode("utf-8")
            source_facts.write_bytes(source_bytes)
            source_manifest_path = Path(str(source_facts) + ".manifest.json")
            source_manifest_path.write_text(json.dumps({
                "targetTask": "divar-property-offer-facts/v2",
                "outputRows": 1,
                "outputSha256": hashlib.sha256(source_bytes).hexdigest(),
                "datasetSha256": DATASET_SHA,
                "categoryCounts": {"apartment-rent": 1},
                "sourceRowsRead": 1,
            }), encoding="utf-8")

            derivative = root / "facts-v5.jsonl"
            derivative_bytes = source_bytes
            derivative.write_bytes(derivative_bytes)
            derivative_manifest = root / "facts-v5.manifest.json"
            derivative_manifest.write_text(json.dumps({
                "taskType": "divar-property-offer-facts-neighborhood-reconciled/v1",
                "input": {
                    "path": str(source_facts),
                    "rows": 1,
                    "bytes": len(source_bytes),
                    "sha256": hashlib.sha256(source_bytes).hexdigest(),
                    "taskType": "divar-property-offer-facts/v2",
                },
                "source": {"snapshotSha256": DATASET_SHA},
                "reconciliation": {"newlyMappedRows": 0, "nonLocationFieldsChanged": 0},
                "qualityAndUse": {
                    "outputRows": 1,
                    "outputSha256": hashlib.sha256(derivative_bytes).hexdigest(),
                },
            }), encoding="utf-8")

            report = audit_file(
                derivative,
                derivative_manifest,
                catalogs,
                root / "audit.json",
            )

            self.assertEqual(report["status"], "complete")
            self.assertTrue(report["qualityGates"]["inputSha256MatchesManifest"])
            self.assertTrue(report["qualityGates"]["sourceFactsHashMatchesReconciliationManifest"])
            self.assertTrue(report["qualityGates"]["nonLocationFieldsUnchangedFromSource"])
            self.assertEqual(report["lineage"]["newlyMappedRows"], 0)
            self.assertEqual(report["lineage"]["newlyMappedRowsObserved"], 0)
            self.assertEqual(report["lineage"]["nonLocationFieldsChanged"], 0)

    def test_detects_non_location_mutation_even_when_derivative_hash_is_updated(self):
        with tempfile.TemporaryDirectory(prefix=".test-divar-reconciled-tamper-", dir=ROOT) as temporary:
            root = Path(temporary)
            catalogs = root / "catalog"
            catalogs.mkdir()
            (catalogs / "city-a.json").write_text(json.dumps({
                "cityId": "city-a",
                "neighborhoods": [{"id": "hood-1", "name": "محله الف"}],
            }), encoding="utf-8")
            source_facts = root / "source.jsonl"
            source_bytes = (json.dumps(make_row("1" * 64, 1, "train"), ensure_ascii=False) + "\n").encode("utf-8")
            source_facts.write_bytes(source_bytes)
            Path(str(source_facts) + ".manifest.json").write_text(json.dumps({
                "targetTask": "divar-property-offer-facts/v2",
                "outputRows": 1,
                "outputSha256": hashlib.sha256(source_bytes).hexdigest(),
                "datasetSha256": DATASET_SHA,
                "categoryCounts": {"apartment-rent": 1},
            }), encoding="utf-8")

            altered = make_row("1" * 64, 1, "train", state="ALTERED_SOURCE_TEXT_SENTINEL")
            output_bytes = (json.dumps(altered, ensure_ascii=False) + "\n").encode("utf-8")
            derivative = root / "reconciled.jsonl"
            derivative.write_bytes(output_bytes)
            derivative_manifest = root / "reconciled.manifest.json"
            derivative_manifest.write_text(json.dumps({
                "taskType": "divar-property-offer-facts-neighborhood-reconciled/v1",
                "input": {
                    "path": str(source_facts), "rows": 1, "bytes": len(source_bytes),
                    "sha256": hashlib.sha256(source_bytes).hexdigest(),
                    "taskType": "divar-property-offer-facts/v2",
                },
                "source": {"snapshotSha256": DATASET_SHA},
                "reconciliation": {"newlyMappedRows": 0, "nonLocationFieldsChanged": 0},
                "qualityAndUse": {
                    "outputRows": 1,
                    "outputSha256": hashlib.sha256(output_bytes).hexdigest(),
                },
            }), encoding="utf-8")

            report = audit_file(derivative, derivative_manifest, catalogs, root / "audit.json")
            encoded = json.dumps(report, ensure_ascii=False)

            self.assertEqual(report["status"], "complete_with_findings")
            self.assertFalse(report["qualityGates"]["nonLocationFieldsUnchangedFromSource"])
            self.assertEqual(report["lineage"]["nonLocationChangedRowsObserved"], 1)
            self.assertNotIn("ALTERED_SOURCE_TEXT_SENTINEL", encoded)

    def test_rejects_reconciliation_with_changed_source_bytes(self):
        with tempfile.TemporaryDirectory(prefix=".test-divar-reconciled-lineage-", dir=ROOT) as temporary:
            root = Path(temporary)
            source_facts = root / "source.jsonl"
            source_facts.write_text("{}\n", encoding="utf-8")
            Path(str(source_facts) + ".manifest.json").write_text(json.dumps({
                "targetTask": "divar-property-offer-facts/v2",
                "outputRows": 1,
                "outputSha256": "a" * 64,
                "datasetSha256": DATASET_SHA,
                "categoryCounts": {"apartment-rent": 1},
            }), encoding="utf-8")
            manifest = root / "reconciled.manifest.json"
            manifest.write_text(json.dumps({
                "taskType": "divar-property-offer-facts-neighborhood-reconciled/v1",
                "input": {
                    "path": str(source_facts), "rows": 1, "bytes": source_facts.stat().st_size,
                    "sha256": "b" * 64, "taskType": "divar-property-offer-facts/v2",
                },
                "source": {"snapshotSha256": DATASET_SHA},
                "reconciliation": {"nonLocationFieldsChanged": 0},
                "qualityAndUse": {"outputRows": 1, "outputSha256": "c" * 64},
            }), encoding="utf-8")
            with self.assertRaisesRegex(ValueError, "input lineage does not match"):
                audit_file(root / "unused.jsonl", manifest, root, root / "audit.json")


if __name__ == "__main__":
    unittest.main(verbosity=2)
