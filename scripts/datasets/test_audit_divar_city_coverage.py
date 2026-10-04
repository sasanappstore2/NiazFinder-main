from __future__ import annotations

import importlib.util
import tempfile
import unittest
from collections import Counter
from pathlib import Path


MODULE_PATH = Path(__file__).with_name("audit-divar-city-coverage.py")
SPEC = importlib.util.spec_from_file_location("audit_divar_city_coverage", MODULE_PATH)
assert SPEC and SPEC.loader
audit = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(audit)


class AuditDivarCityCoverageTests(unittest.TestCase):
    def test_summary_separates_city_identity_and_offer_row_grains(self):
        report = audit.summarize_city_counts(
            Counter({"tehran": 70, "mashhad": 20, "unmapped": 9, "": 1}),
            {"tehran": "tehran", "mashhad": "mashhad"},
        )

        self.assertEqual(report["sourceRows"], 100)
        self.assertEqual(report["rowsWithoutCitySlug"], 1)
        self.assertEqual(report["distinctNonemptySourceCities"], 3)
        self.assertEqual(report["mappedSourceCities"], 2)
        self.assertEqual(report["sourceCityIdentityCoveragePct"], 66.67)
        self.assertEqual(report["mappedOfferRows"], 90)
        self.assertEqual(report["unmappedOfferRows"], 9)
        self.assertEqual(report["mappedOfferRowCoveragePct"], 90.0)
        self.assertEqual(report["unmappedCities"], [{"sourceCitySlug": "unmapped", "rawRows": 9}])

    def test_full_scan_reads_all_rows_and_trims_city_slugs(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            source = Path(temp_dir) / "offers.csv"
            source.write_text(
                "title,city_slug\nfirst, tehran \nsecond,\nthird,unknown\n",
                encoding="utf-8",
            )
            report = audit.audit_source_city_coverage(
                source,
                {"tehran": "tehran"},
            )

        self.assertEqual(report["sourceRows"], 3)
        self.assertEqual(report["mappedOfferRows"], 1)
        self.assertEqual(report["rowsWithoutCitySlug"], 1)
        self.assertEqual(report["unmappedOfferRows"], 1)

    def test_missing_city_column_is_rejected(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            source = Path(temp_dir) / "offers.csv"
            source.write_text("title,category\nneed,apartment\n", encoding="utf-8")
            with self.assertRaisesRegex(ValueError, "city_slug"):
                audit.audit_source_city_coverage(source, {})


if __name__ == "__main__":
    unittest.main()
