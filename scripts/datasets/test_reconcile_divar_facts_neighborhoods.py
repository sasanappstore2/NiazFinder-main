import importlib.util
import json
import tempfile
import unittest
from pathlib import Path


MODULE_PATH = Path(__file__).with_name("reconcile-divar-facts-neighborhoods.py")
SPEC = importlib.util.spec_from_file_location("reconcile_divar_facts_neighborhoods", MODULE_PATH)
assert SPEC and SPEC.loader
reconcile = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(reconcile)


class ReconcileDivarFactsNeighborhoodTests(unittest.TestCase):
    def setUp(self):
        self.temp_dir = tempfile.TemporaryDirectory()
        self.root = Path(self.temp_dir.name)
        self.source_hash = "a" * 64
        self.input_path = self.root / "facts.jsonl"
        self.input_manifest_path = self.root / "facts.manifest.json"
        self.crosswalk_path = self.root / "crosswalk.json"
        self.output_path = self.root / "facts-reconciled.jsonl"
        self.output_manifest_path = self.root / "facts-reconciled.manifest.json"
        self.rows = [
            {
                "exampleId": "row-1",
                "state": "عنوان و شرح باید عیناً حفظ شوند.",
                "offerLocation": {
                    "sourceCitySlug": "shiraz",
                    "appCitySlug": "shiraz",
                    "sourceNeighborhoodSlug": "koozehgari",
                    "appNeighborhoodId": None,
                    "appNeighborhoodName": None,
                    "neighborhoodMatch": "not_stated",
                },
            },
            {
                "exampleId": "row-2",
                "offerLocation": {
                    "sourceCitySlug": "shiraz",
                    "appCitySlug": "shiraz",
                    "sourceNeighborhoodSlug": "koozehgari",
                    "appNeighborhoodId": "کوزهگری",
                    "appNeighborhoodName": "کوزه‌گری",
                    "neighborhoodMatch": "exact_official_crosswalk",
                },
            },
            {
                "exampleId": "row-3",
                "offerLocation": {
                    "sourceCitySlug": "shiraz",
                    "appCitySlug": "shiraz",
                    "sourceNeighborhoodSlug": "not-in-crosswalk",
                    "appNeighborhoodId": None,
                    "appNeighborhoodName": None,
                    "neighborhoodMatch": "not_stated",
                },
            },
        ]
        self.input_path.write_text(
            "".join(json.dumps(row, ensure_ascii=False, separators=(",", ":")) + "\n" for row in self.rows),
            encoding="utf-8",
        )
        self.input_manifest_path.write_text(
            json.dumps({"datasetSha256": self.source_hash, "outputRows": len(self.rows)}),
            encoding="utf-8",
        )
        self.crosswalk_path.write_text(
            json.dumps({
                "artifactType": reconcile.ARTIFACT_TYPE,
                "source": {"snapshotSha256": self.source_hash},
                "coverage": {"sourceCityNeighborhoodPairs": 1188},
                "entries": [{
                    "status": "exact",
                    "matchBasis": "unique-literal-official-name",
                    "sourceCitySlug": "shiraz",
                    "sourceNeighborhoodSlug": "koozehgari",
                    "divarDistrictId": 1402,
                    "appCitySlug": "shiraz",
                    "appNeighborhoodId": "کوزهگری",
                    "appNeighborhoodName": "کوزه‌گری",
                }],
            }, ensure_ascii=False),
            encoding="utf-8",
        )

    def tearDown(self):
        self.temp_dir.cleanup()

    def run_reconciliation(self, **kwargs):
        return reconcile.reconcile_facts(
            self.input_path,
            self.input_manifest_path,
            self.crosswalk_path,
            self.output_path,
            self.output_manifest_path,
            **kwargs,
        )

    def test_dry_run_proves_counts_without_creating_outputs(self):
        result = self.run_reconciliation(dry_run=True)
        self.assertEqual(result["qualityAndUse"]["outputRows"], 3)
        self.assertEqual(result["reconciliation"]["newlyMappedLiteralExactRows"], 1)
        self.assertEqual(result["reconciliation"]["rowCounts"]["already_mapped"], 1)
        self.assertFalse(self.output_path.exists())
        self.assertFalse(self.output_manifest_path.exists())

    def test_output_changes_only_location_and_is_fully_manifeted(self):
        self.run_reconciliation()
        result = json.loads(self.output_manifest_path.read_text(encoding="utf-8"))
        output_rows = [json.loads(line) for line in self.output_path.read_text(encoding="utf-8").splitlines()]
        self.assertEqual(result["qualityAndUse"]["outputRows"], 3)
        self.assertEqual(result["reconciliation"]["newlyMappedLiteralExactRows"], 1)
        self.assertEqual(output_rows[0]["offerLocation"]["appNeighborhoodId"], "کوزهگری")
        self.assertEqual(output_rows[0]["offerLocation"]["neighborhoodSource"], "official_divar_district_and_unique_literal_app_catalog_name_match")
        self.assertEqual(output_rows[0]["state"], self.rows[0]["state"])
        self.assertEqual(output_rows[1], self.rows[1])
        self.assertEqual(output_rows[2], self.rows[2])
        self.assertEqual(result["qualityAndUse"]["realNeedGroundTruth"], False)
        self.assertEqual(result["qualityAndUse"]["trainingEligibleForProduction"], False)

    def test_conflicting_existing_neighborhood_fails_without_publishing_output(self):
        conflict = dict(self.rows[0])
        conflict["offerLocation"] = dict(self.rows[0]["offerLocation"], appNeighborhoodId="wrong-id")
        self.input_path.write_text(json.dumps(conflict, ensure_ascii=False) + "\n", encoding="utf-8")
        self.input_manifest_path.write_text(
            json.dumps({"datasetSha256": self.source_hash, "outputRows": 1}),
            encoding="utf-8",
        )
        with self.assertRaisesRegex(ValueError, "conflicts with the existing app neighborhood"):
            self.run_reconciliation()
        self.assertFalse(self.output_path.exists())
        self.assertFalse(self.output_manifest_path.exists())

    def test_crosswalk_from_a_different_divar_snapshot_is_rejected(self):
        self.input_manifest_path.write_text(json.dumps({"datasetSha256": "b" * 64, "outputRows": 3}), encoding="utf-8")
        with self.assertRaisesRegex(ValueError, "different Divar source snapshots"):
            self.run_reconciliation(dry_run=True)


if __name__ == "__main__":
    unittest.main()
