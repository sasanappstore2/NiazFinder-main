import importlib.util
import csv
import json
import tempfile
import unittest
from pathlib import Path


MODULE_PATH = Path(__file__).with_name("divar_laya_corpus.py")
SPEC = importlib.util.spec_from_file_location("divar_laya_corpus", MODULE_PATH)
assert SPEC and SPEC.loader
divar = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(divar)


class DivarLayaCorpusTests(unittest.TestCase):
    def test_persian_normalization_and_contact_redaction(self):
        normalized = divar.normalize_persian_text("ي ك ۱۲٣٤ ٠١٢٣\u200cمتری")
        self.assertEqual(normalized, "ی ک 1234 0123 متری")
        text, count = divar.redact_contact_patterns(
            "تماس ۰۹۱۲۱۲۳۴۵۶۷ و test@example.com https://example.test/a"
        )
        self.assertEqual(count, 3)
        self.assertNotIn("09121234567", text)
        self.assertNotIn("test@example.com", text)
        self.assertNotIn("https://", text)

    def test_category_crosswalk_is_parent_scoped(self):
        self.assertEqual(divar.category_slug("temporary-rent", "villa"), "villa-short-rent")
        self.assertIsNone(divar.category_slug("residential-sell", "villa"))
        self.assertEqual(
            divar.category_slug("commercial-rent", "shop-rent"),
            "shop-rent",
        )

    def test_property_kind_unknown_is_not_guessed(self):
        self.assertEqual(divar.property_kind_for("workspace-short-rent"), "unknown")
        self.assertEqual(divar.property_kind_for("office-rent"), "office")

    def test_structured_offer_attributes_keep_offer_perspective_and_parse_rooms(self):
        self.assertEqual(divar._room_count("بدون اتاق"), 0)
        self.assertEqual(divar._room_count("یک"), 1)
        self.assertEqual(divar._room_count("دو"), 2)
        self.assertEqual(divar._room_count("پنج یا بیشتر"), "4+")
        self.assertIsNone(divar._room_count("نامشخص"))
        attributes = divar._offer_attributes(
            {
                "building_size": "۱۲۵",
                "land_size": "۲۰۰",
                "rooms_count": "سه",
                "has_parking": "true",
                "has_elevator": "false",
                "price_value": "7000000000",
                "rent_value": "45000000",
                "credit_value": "600000000",
            },
            "apartment-rent",
        )
        self.assertEqual(attributes["version"], 1)
        self.assertEqual(attributes["perspective"], "seller_or_agent_supply_offer")
        self.assertEqual(attributes["area"]["value"], 125)
        self.assertEqual(attributes["rooms"]["value"], 3)
        self.assertEqual(attributes["amenities"]["parking"]["value"], True)
        self.assertEqual(attributes["amenities"]["elevator"]["value"], False)
        self.assertNotIn("price_value", attributes)
        self.assertNotIn("rent_value", attributes)
        self.assertNotIn("credit_value", attributes)

    def test_transaction_mapping_uses_explicit_offer_mode_only(self):
        self.assertEqual(divar.transaction_type_for("apartment-sale"), "buy")
        self.assertEqual(divar.transaction_type_for("villa-short-rent"), "rent_short_term")
        self.assertEqual(
            divar.transaction_type_for(
                "apartment-rent", rent_value="50000000", credit_value="800000000"
            ),
            "rent_rahn_ejare",
        )
        self.assertEqual(
            divar.transaction_type_for("apartment-rent", rent_type="full_credit"),
            "rent_rahn_full",
        )
        self.assertEqual(divar.transaction_type_for("apartment-rent"), "unknown")
        self.assertEqual(divar.transaction_type_for("construction-partnership"), "unknown")

    def test_split_is_deterministic_for_duplicate_group(self):
        group_hash = divar.digest_text("متن یکسان")
        self.assertEqual(divar.split_for_group(group_hash), divar.split_for_group(group_hash))
        self.assertIn(divar.split_for_group(group_hash), {"train", "calibration", "test"})

    def test_city_slug_mapping_rejects_ambiguous_source_alias(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            path = Path(temp_dir) / "city-map.json"
            path.write_text(
                json.dumps(
                    {
                        "tehran-city": {"divarSlug": "tehran"},
                        "some-other-city": {"divarSlug": "tehran"},
                        "mashhad": {"divarSlug": "mashhad"},
                    }
                ),
                encoding="utf-8",
            )
            manual_path = Path(temp_dir) / "manual-city-map.json"
            manual_path.write_text(
                json.dumps({"tehran-city": "tehran", "mashhad": "mashhad"}),
                encoding="utf-8",
            )
            mapping = divar._source_city_map(path, manual_path)
        self.assertNotIn("tehran", mapping)
        self.assertEqual(mapping["mashhad"], "mashhad")

    def test_catalog_filename_is_only_a_fallback_and_must_be_unique(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            path = root / "city-map.json"
            path.write_text(
                json.dumps({"explicit-tehran": {"divarSlug": "tehran"}}),
                encoding="utf-8",
            )
            catalog_dir = root / "catalog"
            catalog_dir.mkdir()
            (catalog_dir / "mashhad.json").touch()
            (catalog_dir / "other-city.json").touch()
            mapping = divar._source_city_map(path, catalog_dir=catalog_dir)
        self.assertEqual(mapping["tehran"], "explicit-tehran")
        self.assertEqual(mapping["mashhad"], "mashhad")

    def test_numeric_divar_city_id_resolves_an_exact_slug_alias(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            city_map = root / "city-map.json"
            city_map.write_text(
                json.dumps({"ganaveh": {"divarSlug": "genaveh", "divarCityId": 812}}),
                encoding="utf-8",
            )
            source_id_map = root / "divar-city-id-map.json"
            source_id_map.write_text(
                json.dumps({"bandar-ganaveh": 812}),
                encoding="utf-8",
            )
            mapping = divar._source_city_map(
                city_map,
                divar_city_id_map_path=source_id_map,
            )
        self.assertEqual(mapping["bandar-ganaveh"], "ganaveh")

    def test_location_tree_alias_requires_exact_slug_id_and_catalog_name(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            city_map = root / "city-map.json"
            city_map.write_text(
                json.dumps({"pakdasht": {"divarSlug": "pakdasht", "divarCityId": 99}}),
                encoding="utf-8",
            )
            source_id_map = root / "divar-city-id-map.json"
            source_id_map.write_text(json.dumps({"pakdasht-city": 842}), encoding="utf-8")
            location_tree = root / "divar-location-tree.json"
            location_tree.write_text(
                json.dumps(
                    {
                        "provinces": [
                            {
                                "cities": [
                                    {
                                        "id": 842,
                                        "slug": "pakdasht-city",
                                        "second_slug": "pakdasht",
                                        "name": "پاکدشت",
                                    }
                                ]
                            }
                        ],
                        "excludedFromUi": [],
                    }
                ),
                encoding="utf-8",
            )
            catalog_dir = root / "catalog"
            catalog_dir.mkdir()
            (catalog_dir / "pakdasht.json").write_text(
                json.dumps({"cityId": "pakdasht", "cityName": "پاکدشت"}),
                encoding="utf-8",
            )

            mapping = divar._source_city_map(
                city_map,
                catalog_dir=catalog_dir,
                divar_city_id_map_path=source_id_map,
                divar_location_tree_path=location_tree,
            )

        self.assertEqual(mapping["pakdasht-city"], "pakdasht")

    def test_location_tree_alias_uses_globally_unique_exact_city_name_if_slugs_differ(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            city_map = root / "city-map.json"
            city_map.write_text("{}", encoding="utf-8")
            source_id_map = root / "divar-city-id-map.json"
            source_id_map.write_text(json.dumps({"shahrud": 707}), encoding="utf-8")
            location_tree = root / "divar-location-tree.json"
            location_tree.write_text(
                json.dumps(
                    {
                        "provinces": [{"cities": [{
                            "id": 707,
                            "slug": "shahrud",
                            "second_slug": "shahroud",
                            "name": "شاهرود",
                        }]}],
                        "excludedFromUi": [],
                    }
                ),
                encoding="utf-8",
            )
            catalog_dir = root / "catalog"
            catalog_dir.mkdir()
            (catalog_dir / "shahrood.json").write_text(
                json.dumps({"cityId": "shahrood", "cityName": "شاهرود"}),
                encoding="utf-8",
            )

            mapping = divar._source_city_map(
                city_map,
                catalog_dir=catalog_dir,
                divar_city_id_map_path=source_id_map,
                divar_location_tree_path=location_tree,
            )

        self.assertEqual(mapping["shahrud"], "shahrood")

    def test_location_tree_alias_rejects_ambiguous_exact_city_name_fallback(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            city_map = root / "city-map.json"
            city_map.write_text("{}", encoding="utf-8")
            source_id_map = root / "divar-city-id-map.json"
            source_id_map.write_text(json.dumps({"saman-city": 1833}), encoding="utf-8")
            location_tree = root / "divar-location-tree.json"
            location_tree.write_text(
                json.dumps(
                    {
                        "provinces": [{"cities": [{
                            "id": 1833,
                            "slug": "saman-city",
                            "second_slug": "saman",
                            "name": "سامان",
                        }]}],
                        "excludedFromUi": [],
                    }
                ),
                encoding="utf-8",
            )
            catalog_dir = root / "catalog"
            catalog_dir.mkdir()
            for city_id in ("samman-one", "samman-two"):
                (catalog_dir / f"{city_id}.json").write_text(
                    json.dumps({"cityId": city_id, "cityName": "سامان"}),
                    encoding="utf-8",
                )

            mapping = divar._source_city_map(
                city_map,
                catalog_dir=catalog_dir,
                divar_city_id_map_path=source_id_map,
                divar_location_tree_path=location_tree,
            )

        self.assertNotIn("saman-city", mapping)

    def test_location_tree_alias_rejects_city_name_mismatch(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            city_map = root / "city-map.json"
            city_map.write_text(
                json.dumps({"mahshahr": {"divarSlug": "mahshahr", "divarCityId": 99}}),
                encoding="utf-8",
            )
            source_id_map = root / "divar-city-id-map.json"
            source_id_map.write_text(
                json.dumps({"bandar-mahshahr-city": 843}), encoding="utf-8"
            )
            location_tree = root / "divar-location-tree.json"
            location_tree.write_text(
                json.dumps(
                    {
                        "provinces": [
                            {
                                "cities": [
                                    {
                                        "id": 843,
                                        "slug": "bandar-mahshahr-city",
                                        "second_slug": "mahshahr",
                                        "name": "بندر ماهشهر",
                                    }
                                ]
                            }
                        ],
                        "excludedFromUi": [],
                    }
                ),
                encoding="utf-8",
            )
            catalog_dir = root / "catalog"
            catalog_dir.mkdir()
            (catalog_dir / "mahshahr.json").write_text(
                json.dumps({"cityId": "mahshahr", "cityName": "ماهشهر"}),
                encoding="utf-8",
            )

            mapping = divar._source_city_map(
                city_map,
                catalog_dir=catalog_dir,
                divar_city_id_map_path=source_id_map,
                divar_location_tree_path=location_tree,
            )

        self.assertNotIn("bandar-mahshahr-city", mapping)

    def test_location_tree_alias_rejects_duplicate_tree_identity(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            city_map = root / "city-map.json"
            city_map.write_text(
                json.dumps({"pakdasht": {"divarSlug": "pakdasht", "divarCityId": 99}}),
                encoding="utf-8",
            )
            source_id_map = root / "divar-city-id-map.json"
            source_id_map.write_text(json.dumps({"pakdasht-city": 842}), encoding="utf-8")
            location_tree = root / "divar-location-tree.json"
            city = {
                "id": 842,
                "slug": "pakdasht-city",
                "second_slug": "pakdasht",
                "name": "پاکدشت",
            }
            location_tree.write_text(
                json.dumps(
                    {
                        "provinces": [{"cities": [city]}],
                        "excludedFromUi": [city],
                    }
                ),
                encoding="utf-8",
            )
            catalog_dir = root / "catalog"
            catalog_dir.mkdir()
            (catalog_dir / "pakdasht.json").write_text(
                json.dumps({"cityId": "pakdasht", "cityName": "پاکدشت"}),
                encoding="utf-8",
            )

            mapping = divar._source_city_map(
                city_map,
                catalog_dir=catalog_dir,
                divar_city_id_map_path=source_id_map,
                divar_location_tree_path=location_tree,
            )

        self.assertNotIn("pakdasht-city", mapping)

    def test_numeric_divar_city_id_refuses_ambiguous_app_city_targets(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            city_map = root / "city-map.json"
            city_map.write_text(
                json.dumps(
                    {
                        "city-one": {"divarSlug": "city-one", "divarCityId": 812},
                        "city-two": {"divarSlug": "city-two", "divarCityId": 812},
                    }
                ),
                encoding="utf-8",
            )
            source_id_map = root / "divar-city-id-map.json"
            source_id_map.write_text(
                json.dumps({"unknown-alias": 812}),
                encoding="utf-8",
            )
            manual_path = root / "manual-city-map.json"
            manual_path.write_text(
                json.dumps({"city-one": "unknown-alias"}),
                encoding="utf-8",
            )
            mapping = divar._source_city_map(
                city_map,
                manual_path=manual_path,
                divar_city_id_map_path=source_id_map,
            )
        self.assertNotIn("unknown-alias", mapping)

    def test_official_numeric_city_match_outranks_ambiguous_manual_alias(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            city_map = root / "city-map.json"
            city_map.write_text(
                json.dumps(
                    {"ganaveh": {"divarSlug": "bandar-ganaveh", "divarCityId": 780}}
                ),
                encoding="utf-8",
            )
            manual_path = root / "manual-city-map.json"
            manual_path.write_text(
                json.dumps(
                    {
                        "ganaveh": "bandar-ganaveh",
                        "genaveh": "bandar-ganaveh",
                    }
                ),
                encoding="utf-8",
            )
            source_id_map = root / "divar-city-id-map.json"
            source_id_map.write_text(
                json.dumps({"bandar-ganaveh": 780}),
                encoding="utf-8",
            )
            mapping = divar._source_city_map(
                city_map,
                manual_path=manual_path,
                divar_city_id_map_path=source_id_map,
            )
        self.assertEqual(mapping["bandar-ganaveh"], "ganaveh")

    def test_neighborhood_crosswalk_accepts_only_exact_unique_catalog_matches(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            path = Path(temp_dir) / "crosswalk.json"
            path.write_text(
                json.dumps(
                    {
                        "artifactType": divar.CROSSWALK_ARTIFACT_TYPE,
                        "entries": [
                            {
                                "status": "exact",
                                "matchBasis": "unique-exact-normalized-official-name",
                                "sourceCitySlug": "mashhad",
                                "sourceNeighborhoodSlug": "faramarzabbasi",
                                "appCitySlug": "mashhad",
                                "appNeighborhoodId": "فرامرزعباسی",
                                "appNeighborhoodName": "فرامرزعباسی",
                            },
                            {
                                "status": "exact",
                                "matchBasis": "unique-literal-official-name",
                                "sourceCitySlug": "shiraz",
                                "sourceNeighborhoodSlug": "koozehgari",
                                "appCitySlug": "shiraz",
                                "appNeighborhoodId": "کوزهگری",
                                "appNeighborhoodName": "کوزه‌گری",
                            },
                            {
                                "status": "ambiguous",
                                "matchBasis": "ambiguous-normalized-name",
                                "sourceCitySlug": "mashhad",
                                "sourceNeighborhoodSlug": "ambiguous",
                                "appCitySlug": "mashhad",
                                "appNeighborhoodId": "نزدیک",
                                "appNeighborhoodName": "نزدیک",
                            },
                            {
                                "status": "legacy_alias",
                                "matchBasis": "unique-exact-normalized-name-after-removing-legacy-suffix",
                                "legacyNameSuffix": "قدیمی",
                                "divarDistrictId": 123,
                                "sourceCitySlug": "tehran",
                                "sourceNeighborhoodSlug": "ferdowsi-old",
                                "appCitySlug": "tehran",
                                "appNeighborhoodId": "فردوسی",
                                "appNeighborhoodName": "فردوسی",
                            },
                        ],
                    }
                ),
                encoding="utf-8",
            )
            mapping = divar.load_neighborhood_crosswalk(path)
        self.assertEqual(
            mapping[("mashhad", "faramarzabbasi")]["appNeighborhoodId"],
            "فرامرزعباسی",
        )
        self.assertEqual(
            mapping[("mashhad", "faramarzabbasi")]["matchKind"],
            "exact_official_crosswalk",
        )
        self.assertEqual(
            mapping[("shiraz", "koozehgari")]["appNeighborhoodId"],
            "کوزهگری",
        )
        self.assertEqual(
            mapping[("tehran", "ferdowsi-old")]["appNeighborhoodId"],
            "فردوسی",
        )
        self.assertEqual(
            mapping[("tehran", "ferdowsi-old")]["matchKind"],
            "legacy_suffix_alias",
        )
        self.assertNotIn(("mashhad", "ambiguous"), mapping)

    def test_record_preserves_legacy_neighborhood_alias_provenance(self):
        row = {
            "title": "مغازه اجاره‌ای در فردوسی",
            "description": "",
            "cat2_slug": "commercial-rent",
            "cat3_slug": "shop-rent",
            "city_slug": "tehran",
            "neighborhood_slug": "ferdowsi-old",
            "rent_type": "",
            "rent_value": "",
            "credit_value": "",
        }
        mapped = divar._record(
            row,
            1,
            (1, False, False),
            "a" * 64,
            {"tehran": "tehran"},
            {
                ("tehran", "ferdowsi-old"): {
                    "appCitySlug": "tehran",
                    "appNeighborhoodId": "فردوسی",
                    "appNeighborhoodName": "فردوسی",
                    "matchKind": "legacy_suffix_alias",
                }
            },
        )
        self.assertIsNotNone(mapped)
        self.assertEqual(mapped["offerLocation"]["appNeighborhoodId"], "فردوسی")
        self.assertEqual(mapped["offerLocation"]["neighborhoodMatch"], "legacy_suffix_alias")
        self.assertEqual(
            mapped["offerLocation"]["neighborhoodSource"],
            "official_divar_district_and_unique_app_name_after_legacy_suffix_alias",
        )

    def test_corpus_writer_groups_conflicts_and_never_promotes_offer_facts(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            source = root / "offers.csv"
            output = root / "pilot.jsonl"
            city_map = root / "city-map.json"
            columns = [
                "title", "description", "cat2_slug", "cat3_slug", "city_slug", "neighborhood_slug",
                "rent_type", "rent_value", "credit_value", "building_size", "land_size",
                "rooms_count", "deed_type", "price_value", "has_parking", "has_elevator", "has_warehouse",
            ]
            rows = [
                {
                    "title": "واحد ۱۲۰ متری در ونک",
                    "description": "تماس ۰۹۱۲۱۲۳۴۵۶۷",
                    "cat2_slug": "residential-sell",
                    "cat3_slug": "apartment-sell",
                    "city_slug": "tehran",
                    "neighborhood_slug": "vanak",
                    "building_size": "120",
                    "price_value": "9000000000",
                    "has_parking": "true",
                },
                {
                    "title": "واحد ۱۲۰ متری در ونک",
                    "description": "تماس ۰۹۱۲۱۲۳۴۵۶۷",
                    "cat2_slug": "residential-sell",
                    "cat3_slug": "apartment-sell",
                    "city_slug": "tehran",
                    "neighborhood_slug": "vanak",
                    "building_size": "120",
                    "price_value": "9500000000",
                    "has_parking": "false",
                },
                {
                    "title": "واحد ۱۲۰ متری در ونک",
                    "description": "تماس ۰۹۱۲۱۲۳۴۵۶۷",
                    "cat2_slug": "residential-rent",
                    "cat3_slug": "apartment-rent",
                    "city_slug": "tehran",
                    "neighborhood_slug": "vanak",
                },
                {
                    "title": "مغازه در فرامرزعباسی",
                    "description": "رهن و اجاره توافقی",
                    "cat2_slug": "commercial-rent",
                    "cat3_slug": "shop-rent",
                    "city_slug": "mashhad",
                    "neighborhood_slug": "faramarzabbasi",
                    "building_size": "87",
                    "rooms_count": "دو",
                    "deed_type": "single_page",
                    "has_parking": "true",
                    "has_elevator": "false",
                    "has_warehouse": "true",
                    "price_value": "12000000000",
                    "rent_value": "50000000",
                    "credit_value": "800000000",
                },
            ]
            with source.open("w", encoding="utf-8", newline="") as handle:
                writer = csv.DictWriter(handle, fieldnames=columns)
                writer.writeheader()
                writer.writerows(rows)
            city_map.write_text(
                json.dumps(
                    {
                        "tehran-city": {"divarSlug": "tehran"},
                        "mashhad": {"divarSlug": "mashhad"},
                    }
                ),
                encoding="utf-8",
            )
            neighborhood_crosswalk = root / "neighborhood-crosswalk.json"
            neighborhood_crosswalk.write_text(
                json.dumps(
                    {
                        "artifactType": divar.CROSSWALK_ARTIFACT_TYPE,
                        "entries": [
                            {
                                "status": "exact",
                                "matchBasis": "unique-exact-normalized-official-name",
                                "sourceCitySlug": "mashhad",
                                "sourceNeighborhoodSlug": "faramarzabbasi",
                                "appCitySlug": "mashhad",
                                "appNeighborhoodId": "فرامرزعباسی",
                                "appNeighborhoodName": "فرامرزعباسی",
                            }
                        ],
                    }
                ),
                encoding="utf-8",
            )

            manifest = divar.prepare_corpus(
                source,
                output,
                city_map,
                neighborhood_crosswalk_path=neighborhood_crosswalk,
                expected_sha256=None,
            )
            prepared = [json.loads(line) for line in output.read_text(encoding="utf-8").splitlines()]

        self.assertEqual(manifest["sourceRowsRead"], 4)
        self.assertEqual(manifest["rowsSkippedConflict"], 3)
        self.assertEqual(len(prepared), 1)
        example = prepared[0]
        self.assertEqual(example["schemaVersion"], 2)
        self.assertEqual(example["taskType"], divar.OFFER_TASK)
        self.assertEqual(manifest["targetTask"], divar.OFFER_TASK)
        self.assertEqual(manifest["sourceOfferAttributesVersion"], 1)
        self.assertFalse(manifest["containsSyntheticData"])
        self.assertEqual(example["perspective"], "seller_or_agent_supply_offer")
        self.assertFalse(example["synthetic"])
        self.assertTrue(example["derived"])
        self.assertFalse(example["isNeedGroundTruth"])
        self.assertFalse(example["humanReviewed"])
        self.assertEqual(example["sourceUse"]["licenseId"], "ODbL-1.0")
        self.assertEqual(example["offerLocation"]["appCitySlug"], "mashhad")
        self.assertEqual(example["offerLocation"]["appNeighborhoodId"], "فرامرزعباسی")
        self.assertEqual(example["offerLocation"]["neighborhoodMatch"], "exact_official_crosswalk")
        self.assertEqual(example["typedDecisions"]["offer_category"]["value"], "shop-rent")
        self.assertEqual(example["typedDecisions"]["offer_property_kind"]["value"], "shop")
        self.assertEqual(example["typedDecisions"]["offer_transaction_type"]["value"], "rent_rahn_ejare")
        self.assertEqual(example["sourceOfferAttributes"]["area"], {"value": 87, "sourceColumn": "building_size"})
        self.assertEqual(example["sourceOfferAttributes"]["rooms"], {"value": 2, "sourceColumn": "rooms_count"})
        self.assertEqual(example["sourceOfferAttributes"]["deedType"]["value"], "single_page")
        self.assertEqual(example["sourceOfferAttributes"]["amenities"]["parking"]["value"], True)
        self.assertEqual(example["sourceOfferAttributes"]["amenities"]["elevator"]["value"], False)
        self.assertEqual(example["sourceOfferAttributes"]["amenities"]["storage"]["value"], True)
        self.assertEqual(example["sourceOfferAttributes"]["perspective"], "seller_or_agent_supply_offer")
        self.assertEqual(example["sourceOfferAttributes"]["version"], 1)
        self.assertNotIn("price_value", example["sourceOfferAttributes"])
        self.assertNotIn("rent_value", example["sourceOfferAttributes"])
        self.assertNotIn("credit_value", example["sourceOfferAttributes"])
        self.assertNotIn("price_value", example)
        self.assertNotIn("building_size", example)
        self.assertNotIn("parking", example["typedDecisions"])
        self.assertNotIn("09121234567", example["state"])


if __name__ == "__main__":
    unittest.main()
