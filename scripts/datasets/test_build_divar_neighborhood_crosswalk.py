import importlib.util
import json
import tempfile
import unittest
from pathlib import Path


MODULE_PATH = Path(__file__).with_name("build-divar-neighborhood-crosswalk.py")
SPEC = importlib.util.spec_from_file_location("divar_neighborhood_crosswalk", MODULE_PATH)
assert SPEC and SPEC.loader
crosswalk = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(crosswalk)


class DivarNeighborhoodCrosswalkTests(unittest.TestCase):
    def test_literal_official_name_disambiguates_normalization_collision_only_when_unique(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            catalog_dir = Path(temp_dir)
            (catalog_dir / "shiraz.json").write_text(
                json.dumps({
                    "cityId": "shiraz",
                    "neighborhoods": [
                        {"id": "کوزه-گری", "name": "کوزه گری"},
                        {"id": "کوزهگری", "name": "کوزه‌گری"},
                    ],
                }),
                encoding="utf-8",
            )
            payload = {
                "artifactType": "location-reference-crosswalk-not-training-data",
                "matchingPolicy": {"fuzzyMatching": False},
                "coverage": {
                    "exactAppCatalogMatchedPairs": 100,
                    "sourceRowsWithExactAppCatalogMatch": 1000,
                    "unresolvedPairs": 3,
                    "unresolvedReasons": {"app-neighborhood-name-not-unique": 3},
                },
                "entries": [
                    {
                        "status": "unresolved", "reason": "app-neighborhood-name-not-unique",
                        "sourceCitySlug": "shiraz", "sourceNeighborhoodSlug": "koozehgari",
                        "sourceRows": 67, "divarDistrictId": 1402, "divarDistrictName": "کوزه‌گری",
                        "appCitySlug": "shiraz", "appCatalogCityId": "shiraz", "humanReviewed": False,
                    },
                    {
                        "status": "unresolved", "reason": "app-neighborhood-name-not-unique",
                        "sourceCitySlug": "shiraz", "sourceNeighborhoodSlug": "maqar",
                        "sourceRows": 68, "divarDistrictId": 1347, "divarDistrictName": "کوزه گری",
                        "appCitySlug": "shiraz", "appCatalogCityId": "shiraz", "humanReviewed": False,
                    },
                    {
                        "status": "unresolved", "reason": "app-neighborhood-name-not-unique",
                        "sourceCitySlug": "shiraz", "sourceNeighborhoodSlug": "unknown",
                        "sourceRows": 8, "divarDistrictId": 9999, "divarDistrictName": "کوزه گری ",
                        "appCitySlug": "shiraz", "appCatalogCityId": "shiraz", "humanReviewed": False,
                    },
                ],
            }

            updated, summary = crosswalk.extend_with_literal_exact_names(payload, catalog_dir)

        self.assertEqual(summary["literalExactNameMatchedPairs"], 2)
        self.assertEqual(summary["sourceRowsWithLiteralExactName"], 135)
        self.assertEqual(updated["coverage"]["unresolvedPairs"], 1)
        self.assertEqual(updated["entries"][0]["appNeighborhoodId"], "کوزهگری")
        self.assertEqual(updated["entries"][1]["appNeighborhoodId"], "کوزه-گری")
        self.assertEqual(updated["entries"][0]["matchBasis"], "unique-literal-official-name")
        self.assertEqual(updated["entries"][2]["status"], "unresolved")

    def test_only_unique_same_city_exact_names_after_terminal_legacy_suffix_are_added(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            catalog_dir = Path(temp_dir)
            (catalog_dir / "tehran-city.json").write_text(
                json.dumps({
                    "cityId": "tehran-city",
                    "neighborhoods": [
                        {"id": "اراج", "name": "اراج"},
                        {"id": "پارک-اول", "name": "پارک"},
                        {"id": "پارک-دوم", "name": "پارک"},
                    ],
                }),
                encoding="utf-8",
            )
            payload = {
                "artifactType": "location-reference-crosswalk-not-training-data",
                "coverage": {
                    "exactAppCatalogMatchedPairs": 4,
                    "sourceRowsWithExactAppCatalogMatch": 100,
                    "unresolvedPairs": 3,
                    "unresolvedReasons": {"no-exact-app-catalog-name": 3},
                },
                "entries": [
                    {
                        "status": "unresolved",
                        "reason": "no-exact-app-catalog-name",
                        "sourceCitySlug": "tehran",
                        "sourceNeighborhoodSlug": "araj",
                        "sourceRows": 194,
                        "divarCityId": 1,
                        "divarDistrictId": 101,
                        "divarDistrictName": "اراج قدیمی",
                        "appCitySlug": "tehran",
                        "appCatalogCityId": "tehran-city",
                        "humanReviewed": False,
                    },
                    {
                        "status": "unresolved",
                        "reason": "no-exact-app-catalog-name",
                        "sourceCitySlug": "tehran",
                        "sourceNeighborhoodSlug": "park",
                        "sourceRows": 12,
                        "divarCityId": 1,
                        "divarDistrictId": 102,
                        "divarDistrictName": "پارک قدیمی",
                        "appCitySlug": "tehran",
                        "appCatalogCityId": "tehran-city",
                        "humanReviewed": False,
                    },
                    {
                        "status": "unresolved",
                        "reason": "no-exact-app-catalog-name",
                        "sourceCitySlug": "tehran",
                        "sourceNeighborhoodSlug": "no-suffix",
                        "sourceRows": 8,
                        "divarCityId": 1,
                        "divarDistrictId": 103,
                        "divarDistrictName": "نام بدون پسوند",
                        "appCitySlug": "tehran",
                        "appCatalogCityId": "tehran-city",
                        "humanReviewed": False,
                    },
                ],
            }

            updated, summary = crosswalk.extend_with_legacy_aliases(payload, catalog_dir)

        self.assertEqual(summary["legacyAliasMatchedPairs"], 1)
        self.assertEqual(summary["sourceRowsWithLegacyAlias"], 194)
        self.assertEqual(summary["resolvedPairsIncludingLegacyAliases"], 5)
        self.assertEqual(summary["unresolvedPairs"], 2)
        alias = updated["entries"][0]
        self.assertEqual(alias["status"], "legacy_alias")
        self.assertEqual(alias["matchBasis"], "unique-exact-normalized-name-after-removing-legacy-suffix")
        self.assertEqual(alias["appNeighborhoodId"], "اراج")
        self.assertEqual(alias["divarDistrictId"], 101)
        self.assertFalse(alias["humanReviewed"])
        self.assertEqual(updated["entries"][1]["status"], "unresolved")
        self.assertEqual(updated["entries"][2]["status"], "unresolved")
        self.assertEqual(updated["coverage"]["unresolvedReasons"], {"no-exact-app-catalog-name": 2})

    def test_suffix_must_be_terminal_and_separated(self):
        self.assertEqual(crosswalk.strip_terminal_legacy_suffix("پیروزی قدیمی"), "پیروزی")
        self.assertIsNone(crosswalk.strip_terminal_legacy_suffix("قدیمی پیروزی"))
        self.assertIsNone(crosswalk.strip_terminal_legacy_suffix("پیروزیقدیمی"))


if __name__ == "__main__":
    unittest.main()
