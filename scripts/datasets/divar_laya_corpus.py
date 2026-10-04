#!/usr/bin/env python3
"""Prepare a local, provenance-rich Laya task corpus from real Divar offers.

Rows preserve the seller/agent offer perspective and are never labeled as
genuine seeker needs. Structured labels describe the source offer only; the
converter does not invent user budgets or preferences. Text is heuristically
redacted, and the output is not approved for redistribution or cloud transfer.
"""

from __future__ import annotations

import argparse
import csv
import hashlib
import json
import os
import re
import sqlite3
import sys
import tempfile
import unicodedata
from collections import Counter
from pathlib import Path
from typing import Any, TextIO


DATASET_ID = "divarofficial/real_estate_ads"
SOURCE_SHA256 = "e5760fe1325a195e6682c371457bfecd51d255c518756e3cbea234b8163a801f"
SCHEMA_VERSION = 2
OFFER_TASK = "divar-property-offer-facts/v2"
CROSSWALK_ARTIFACT_TYPE = "location-reference-crosswalk-not-training-data"
DEFAULT_NEIGHBORHOOD_CROSSWALK = (
    Path(__file__).resolve().parents[2]
    / "data/divar/official-neighborhood-app-crosswalk-2026-09-28-legacy-aliases.json"
)
DEFAULT_DIVAR_LOCATION_TREE = (
    Path(__file__).resolve().parents[2] / "data/divar/divar-location-tree.json"
)

CATEGORY_MAP: dict[tuple[str, str], str] = {
    ("residential-sell", "apartment-sell"): "apartment-sale",
    ("residential-rent", "apartment-rent"): "apartment-rent",
    ("residential-sell", "house-villa-sell"): "villa-sale",
    ("residential-rent", "house-villa-rent"): "villa-rent",
    ("residential-sell", "plot-old"): "land-sale",
    ("commercial-sell", "shop-sell"): "shop-sale",
    ("commercial-rent", "shop-rent"): "shop-rent",
    ("commercial-sell", "office-sell"): "office-sale",
    ("commercial-rent", "office-rent"): "office-rent",
    ("commercial-sell", "industry-agriculture-business-sell"): "industrial-sale",
    ("commercial-rent", "industry-agriculture-business-rent"): "industrial-rent",
    ("temporary-rent", "suite-apartment"): "suite-apartment-rent",
    ("temporary-rent", "villa"): "villa-short-rent",
    ("temporary-rent", "workspace"): "workspace-short-rent",
    ("real-estate-services", "presell"): "pre-sale-services",
    ("real-estate-services", "partnership"): "construction-partnership",
}

PROPERTY_KIND_BY_CATEGORY = {
    "apartment-sale": "apartment",
    "apartment-rent": "apartment",
    "villa-sale": "villa",
    "villa-rent": "villa",
    "villa-short-rent": "villa",
    "land-sale": "land",
    "shop-sale": "shop",
    "shop-rent": "shop",
    "office-sale": "office",
    "office-rent": "office",
    "industrial-sale": "industrial",
    "industrial-rent": "industrial",
    "suite-apartment-rent": "apartment",
    # workspace is not reliably equivalent to the app's office enum.
}

SALE_CATEGORIES = {
    "apartment-sale",
    "villa-sale",
    "land-sale",
    "shop-sale",
    "office-sale",
    "industrial-sale",
}
RENT_CATEGORIES = {
    "apartment-rent",
    "villa-rent",
    "shop-rent",
    "office-rent",
    "industrial-rent",
}
SHORT_RENT_CATEGORIES = {
    "suite-apartment-rent",
    "villa-short-rent",
    "workspace-short-rent",
}

APP_CITY_SLUG_OVERRIDES = {
    "tehran-city": "tehran",
    "isfahan-city": "isfahan",
    "shiraz-city": "shiraz",
    "mashhad-city": "mashhad",
    "tabriz-city": "tabriz",
    "ahvaz-city": "ahvaz",
    "qom-city": "qom",
    "kerman-city": "kerman",
    "rasht-city": "rasht",
    "yazd-city": "yazd",
    "khorasan-razavi-1": "mashhad",
    "khorasan-razavi-2": "nishapur",
    "nishabur": "nishapur",
}

_DIGITS = str.maketrans("۰۱۲۳۴۵۶۷۸۹٠١٢٣٤٥٦٧٨٩", "01234567890123456789")
_EMAIL_RE = re.compile(r"(?<![\w.+-])[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}(?!\w)", re.I)
_URL_RE = re.compile(r"(?:https?://|www\.)\S+", re.I)
_PHONE_RE = re.compile(r"(?<!\d)(?:(?:\+?98|0098)[\s().-]*)?0?9(?:[\s().-]*\d){9}(?!\d)")


def normalize_persian_text(value: str) -> str:
    text = unicodedata.normalize("NFKC", value).translate(_DIGITS)
    text = text.replace("ي", "ی").replace("ى", "ی").replace("ك", "ک")
    text = text.replace("ۀ", "ه").replace("ة", "ه").replace("\u200c", " ")
    return re.sub(r"\s+", " ", text).strip()


def redact_contact_patterns(value: str) -> tuple[str, int]:
    text = normalize_persian_text(value)
    count = 0
    for pattern in (_URL_RE, _EMAIL_RE, _PHONE_RE):
        text, replaced = pattern.subn(" [حذف اطلاعات تماس] ", text)
        count += replaced
    return re.sub(r"\s+", " ", text).strip(), count


def normalized_group_text(title: str, description: str) -> tuple[str, int]:
    clean_title, title_redactions = redact_contact_patterns(title)
    clean_description, description_redactions = redact_contact_patterns(description)
    joined = " ".join(part for part in (clean_title, clean_description) if part)
    return joined, title_redactions + description_redactions


def digest_text(text: str) -> str:
    return hashlib.sha256(text.encode("utf-8")).hexdigest()


def _exact_city_name_key(value: str) -> str:
    """Normalize only orthographic spacing/character variants, never fuzzy-match."""
    text = normalize_persian_text(value)
    return re.sub(r"\s+", "", text).casefold()


def category_slug(cat2_slug: str, cat3_slug: str) -> str | None:
    return CATEGORY_MAP.get((cat2_slug.strip(), cat3_slug.strip()))


def property_kind_for(category: str) -> str:
    return PROPERTY_KIND_BY_CATEGORY.get(category, "unknown")


def load_neighborhood_crosswalk(path: Path | None) -> dict[tuple[str, str], dict[str, str]]:
    """Load exact matches and separately-provenanced exact legacy-suffix aliases."""
    if path is None:
        return {}
    payload = json.loads(path.read_text(encoding="utf-8"))
    if payload.get("artifactType") != CROSSWALK_ARTIFACT_TYPE:
        raise ValueError("Neighborhood crosswalk is not the expected reference artifact")

    mapped: dict[tuple[str, str], dict[str, str]] = {}
    ambiguous: set[tuple[str, str]] = set()
    for entry in payload.get("entries", []):
        if not isinstance(entry, dict):
            continue
        status = entry.get("status")
        match_basis = entry.get("matchBasis")
        if status == "exact" and match_basis in {
            "unique-exact-normalized-official-name",
            "unique-literal-official-name",
        }:
            match_kind = "exact_official_crosswalk"
        elif (
            status == "legacy_alias"
            and match_basis == "unique-exact-normalized-name-after-removing-legacy-suffix"
            and entry.get("legacyNameSuffix") == "قدیمی"
            and isinstance(entry.get("divarDistrictId"), int)
        ):
            match_kind = "legacy_suffix_alias"
        else:
            continue
        source_city = entry.get("sourceCitySlug")
        source_neighborhood = entry.get("sourceNeighborhoodSlug")
        app_city = entry.get("appCitySlug")
        app_neighborhood_id = entry.get("appNeighborhoodId")
        app_neighborhood_name = entry.get("appNeighborhoodName")
        if not all(isinstance(value, str) and value.strip() for value in (
            source_city,
            source_neighborhood,
            app_city,
            app_neighborhood_id,
            app_neighborhood_name,
        )):
            continue
        key = (source_city.strip().lower(), source_neighborhood.strip().lower())
        value = {
            "appCitySlug": app_city.strip(),
            "appNeighborhoodId": app_neighborhood_id.strip(),
            "appNeighborhoodName": app_neighborhood_name.strip(),
            "matchKind": match_kind,
        }
        previous = mapped.get(key)
        if previous is not None and previous != value:
            ambiguous.add(key)
        else:
            mapped[key] = value

    for key in ambiguous:
        mapped.pop(key, None)
    return mapped


def _number(value: str) -> float | None:
    normalized = normalize_persian_text(value).replace(",", "").replace("٬", "")
    if not normalized:
        return None
    try:
        number = float(normalized)
    except ValueError:
        return None
    return number if number >= 0 else None


def transaction_type_for(
    category: str,
    *,
    rent_type: str = "",
    rent_value: str = "",
    credit_value: str = "",
) -> str:
    """Map only source evidence that supports the seek-side deal enum."""
    if category in SALE_CATEGORIES:
        return "buy"
    if category in SHORT_RENT_CATEGORIES:
        return "rent_short_term"
    if category not in RENT_CATEGORIES:
        return "unknown"

    rent = _number(rent_value)
    credit = _number(credit_value)
    if rent_type.strip() == "full_credit":
        return "rent_rahn_full"
    if rent is not None and credit is not None and rent > 0 and credit > 0:
        return "rent_rahn_ejare"
    if rent is not None and rent > 0:
        return "rent_monthly"
    if credit is not None and credit > 0:
        return "rent_rahn_full"
    return "unknown"


def _measure(value: str | None) -> int | float | None:
    number = _number(value or "")
    if number is None or number <= 0:
        return None
    return int(number) if number.is_integer() else number


def _room_count(value: str | None) -> int | str | None:
    normalized = normalize_persian_text(value or "")
    compact = normalized.replace(" ", "")
    named = {
        "بدوناتاق": 0,
        "یک": 1,
        "دو": 2,
        "سه": 3,
        "چهار": 4,
        "پنجیابیشتر": "4+",
    }
    if compact in named:
        return named[compact]
    if compact in {"5+", "+5", "پنجبهبالا", "بیشترازچهار"}:
        return "4+"
    number = _number(normalized)
    if number is None or number < 0:
        return None
    if number >= 5:
        return "4+"
    return int(number) if number.is_integer() else None


def _offer_attributes(row: dict[str, str], category: str) -> dict[str, Any]:
    """Keep structured seller-side facts separate from seeker-intent labels."""
    area_column = "land_size" if category == "land-sale" else "building_size"
    area = _measure(row.get(area_column))
    rooms = _room_count(row.get("rooms_count"))
    deed = (row.get("deed_type") or "").strip()

    facts: dict[str, Any] = {
        "version": 1,
        "perspective": "seller_or_agent_supply_offer",
    }
    if area is not None:
        facts["area"] = {"value": area, "sourceColumn": area_column}
    if rooms is not None:
        facts["rooms"] = {"value": rooms, "sourceColumn": "rooms_count"}
    if deed:
        facts["deedType"] = {"value": deed, "sourceColumn": "deed_type"}

    amenities = {}
    for key, column in (
        ("parking", "has_parking"),
        ("elevator", "has_elevator"),
        ("storage", "has_warehouse"),
    ):
        raw = (row.get(column) or "").strip().lower()
        if raw in {"true", "false"}:
            amenities[key] = {"value": raw == "true", "sourceColumn": column}
    if amenities:
        facts["amenities"] = amenities
    return facts


def split_for_group(group_hash: str) -> str:
    bucket = int(group_hash[:8], 16) % 100
    if bucket < 80:
        return "train"
    if bucket < 90:
        return "calibration"
    return "test"


def _csv_reader(path: Path):
    handle = path.open("r", encoding="utf-8-sig", newline="")
    reader = csv.DictReader(handle)
    if not reader.fieldnames:
        handle.close()
        raise ValueError("CSV has no header")
    required = {
        "title", "description", "cat2_slug", "cat3_slug", "city_slug",
        "rent_type", "rent_value", "credit_value",
    }
    missing = required - set(reader.fieldnames)
    if missing:
        handle.close()
        raise ValueError(f"CSV is missing required columns: {', '.join(sorted(missing))}")
    return handle, reader, len(reader.fieldnames)


def _source_city_map(
    path: Path,
    manual_path: Path | None = None,
    catalog_dir: Path | None = None,
    divar_city_id_map_path: Path | None = None,
    divar_location_tree_path: Path | None = None,
) -> dict[str, str]:
    payload = json.loads(path.read_text(encoding="utf-8"))
    verified_candidates: dict[str, set[str]] = {}
    for app_city_id, entry in payload.items():
        source_slug = entry.get("divarSlug") if isinstance(entry, dict) else None
        if source_slug:
            verified_candidates.setdefault(source_slug, set()).add(app_city_id)

    # The app's verified city map and Divar's city-id map provide an independent,
    # exact crosswalk when a listing's slug is an alias not present in divarSlug.
    # Accept it only when that numeric Divar ID resolves to exactly one app city.
    source_ids: dict[str, Any] = {}
    if divar_city_id_map_path and divar_city_id_map_path.exists():
        source_ids = json.loads(divar_city_id_map_path.read_text(encoding="utf-8"))
        app_ids_by_divar_id: dict[str, set[str]] = {}
        for app_city_id, entry in payload.items():
            if not isinstance(entry, dict) or entry.get("divarCityId") is None:
                continue
            app_ids_by_divar_id.setdefault(str(entry["divarCityId"]), set()).add(app_city_id)
        for source_slug, divar_id in source_ids.items():
            matching_app_ids = app_ids_by_divar_id.get(str(divar_id), set())
            if matching_app_ids:
                # Keep even ambiguous official ID matches visible so a manual
                # alias cannot accidentally hide a numeric crosswalk conflict.
                verified_candidates.setdefault(source_slug, set()).update(matching_app_ids)

    # Some Divar source slugs are deliberately excluded from the current city
    # selector (for example, ``fardis-city``), while the app still has a
    # same-city catalog under its second slug (``fardis``). Recover these only
    # when all available public metadata agrees: exact source slug→Divar ID,
    # one Divar location-tree record for that ID, official slug equality, and
    # exact Persian city-name equality. Prefer the official second_slug / legacy
    # -city catalog key. If neither exists in the app catalogs, allow a fallback
    # only when the normalized official Persian name matches exactly one catalog
    # city globally. A slug candidate whose name disagrees (e.g. Bandar Mahshahr
    # vs Mahshahr) remains unresolved; no transliteration/fuzzy match is used.
    if (
        divar_city_id_map_path
        and divar_city_id_map_path.exists()
        and divar_location_tree_path
        and divar_location_tree_path.exists()
        and catalog_dir
        and catalog_dir.exists()
    ):
        tree = json.loads(divar_location_tree_path.read_text(encoding="utf-8"))
        tree_cities = [
            city
            for province in tree.get("provinces", [])
            if isinstance(province, dict)
            for city in province.get("cities", [])
            if isinstance(city, dict)
        ]
        tree_cities.extend(
            city for city in tree.get("excludedFromUi", []) if isinstance(city, dict)
        )
        cities_by_id: dict[str, list[dict[str, Any]]] = {}
        for city in tree_cities:
            if city.get("id") is not None:
                cities_by_id.setdefault(str(city["id"]), []).append(city)

        catalog_names: dict[str, str] = {}
        for catalog_path in catalog_dir.glob("*.json"):
            try:
                catalog = json.loads(catalog_path.read_text(encoding="utf-8"))
            except (OSError, json.JSONDecodeError):
                continue
            catalog_id = catalog.get("cityId")
            city_name = catalog.get("cityName")
            if (
                catalog_id == catalog_path.stem
                and isinstance(city_name, str)
                and city_name.strip()
            ):
                catalog_names[catalog_path.stem] = city_name

        for source_slug, divar_id in source_ids.items():
            cities = cities_by_id.get(str(divar_id), [])
            if len(cities) != 1:
                continue
            city = cities[0]
            official_slug = city.get("slug")
            official_name = city.get("name")
            if (
                not isinstance(official_slug, str)
                or official_slug.strip().casefold() != source_slug.strip().casefold()
                or not isinstance(official_name, str)
            ):
                continue

            slug_catalog_candidates = {
                candidate
                for candidate in (city.get("second_slug"), official_slug.removesuffix("-city"))
                if isinstance(candidate, str) and candidate in catalog_names
            }
            catalog_candidates = {
                candidate
                for candidate in slug_catalog_candidates
                if _exact_city_name_key(catalog_names[candidate])
                == _exact_city_name_key(official_name)
            }
            # Some app catalogs use a different Latin slug for the same city.
            # Resolve those only by a globally unique, exact Persian city name;
            # a known official slug with a catalog-name conflict blocks fallback.
            if not slug_catalog_candidates:
                catalog_candidates = {
                    catalog_id
                    for catalog_id, catalog_name in catalog_names.items()
                    if _exact_city_name_key(catalog_name)
                    == _exact_city_name_key(official_name)
                }
            mapped_candidates = {
                APP_CITY_SLUG_OVERRIDES.get(candidate, candidate)
                for candidate in catalog_candidates
            }
            if len(mapped_candidates) == 1:
                verified_candidates.setdefault(source_slug, set()).update(mapped_candidates)

    manual_candidates: dict[str, set[str]] = {}
    if manual_path and manual_path.exists():
        manual = json.loads(manual_path.read_text(encoding="utf-8"))
        for app_city_id, source_slug in manual.items():
            if isinstance(source_slug, str) and source_slug:
                manual_candidates.setdefault(source_slug, set()).add(app_city_id)
    # Official Divar slug/ID evidence outranks manual aliases. A manual map may
    # contain multiple transliterations for the same city (e.g. Ganaveh), but
    # must not make an exact numeric ID mapping appear ambiguous. Conflicting
    # official evidence remains unresolved.
    candidates = {
        source_slug: set(city_ids)
        for source_slug, city_ids in verified_candidates.items()
    }
    for source_slug, city_ids in manual_candidates.items():
        if source_slug not in candidates:
            candidates[source_slug] = set(city_ids)
    # Never resolve a source city slug through a many-to-one/ambiguous map.
    result = {
        source_slug: APP_CITY_SLUG_OVERRIDES.get(next(iter(city_ids)), next(iter(city_ids)))
        for source_slug, city_ids in candidates.items()
        if len(city_ids) == 1
    }
    if catalog_dir and catalog_dir.exists():
        direct_candidates: dict[str, set[str]] = {}
        for catalog_path in catalog_dir.glob("*.json"):
            city_id = catalog_path.stem
            app_slug = APP_CITY_SLUG_OVERRIDES.get(city_id, city_id)
            direct_candidates.setdefault(city_id, set()).add(app_slug)
            if city_id.endswith("-city"):
                direct_candidates.setdefault(city_id[:-5], set()).add(app_slug)
        for source_slug, app_slugs in direct_candidates.items():
            # Catalog filenames are only a fallback for slugs absent from the
            # explicit city map; they must never override an explicit mapping.
            if source_slug not in result and len(app_slugs) == 1:
                result[source_slug] = next(iter(app_slugs))
    return result


def _init_index(connection: sqlite3.Connection) -> None:
    connection.execute(
        """CREATE TABLE groups (
            group_hash TEXT PRIMARY KEY,
            category_slug TEXT,
            city_key TEXT,
            row_count INTEGER NOT NULL,
            category_conflict INTEGER NOT NULL DEFAULT 0,
            city_conflict INTEGER NOT NULL DEFAULT 0
        )"""
    )
    connection.execute("CREATE INDEX groups_conflict_idx ON groups(category_conflict, city_conflict)")


def _index_rows(
    source: Path,
    connection: sqlite3.Connection,
    city_map: dict[str, str],
    max_rows: int | None,
) -> tuple[int, int, int, int, int, int]:
    handle, reader, column_count = _csv_reader(source)
    rows = 0
    contact_flags = 0
    source_cities: set[str] = set()
    mapped_app_cities: set[str] = set()
    neighborhood_pairs: set[tuple[str, str]] = set()
    try:
        for row in reader:
            if max_rows is not None and rows >= max_rows:
                break
            rows += 1
            text, flags = normalized_group_text(row.get("title", ""), row.get("description", ""))
            contact_flags += flags
            if not text:
                continue
            group_hash = digest_text(text)
            category = category_slug(row.get("cat2_slug", ""), row.get("cat3_slug", ""))
            source_city = row.get("city_slug", "").strip()
            if source_city:
                source_cities.add(source_city)
            app_city = city_map.get(source_city)
            if app_city:
                mapped_app_cities.add(source_city)
            source_neighborhood = row.get("neighborhood_slug", "").strip()
            if source_city and source_neighborhood:
                neighborhood_pairs.add((source_city, source_neighborhood))
            city = app_city or (f"unmapped:{source_city}" if source_city else None)
            connection.execute(
                """INSERT INTO groups(group_hash, category_slug, city_key, row_count)
                   VALUES (?, ?, ?, 1)
                   ON CONFLICT(group_hash) DO UPDATE SET
                     row_count = groups.row_count + 1,
                     category_conflict = MAX(groups.category_conflict,
                       CASE WHEN groups.category_slug IS NOT NULL
                              AND excluded.category_slug IS NOT NULL
                              AND groups.category_slug != excluded.category_slug
                            THEN 1 ELSE 0 END),
                     city_conflict = MAX(groups.city_conflict,
                       CASE WHEN groups.city_key IS NOT NULL
                              AND excluded.city_key IS NOT NULL
                              AND groups.city_key != excluded.city_key
                            THEN 1 ELSE 0 END),
                     category_slug = COALESCE(groups.category_slug, excluded.category_slug),
                     city_key = COALESCE(groups.city_key, excluded.city_key)""",
                (group_hash, category, city),
            )
            if rows % 10_000 == 0:
                connection.commit()
    finally:
        handle.close()
    connection.commit()
    return (
        rows,
        column_count,
        contact_flags,
        len(source_cities),
        len(mapped_app_cities),
        len(neighborhood_pairs),
    )


def _record(
    row: dict[str, str],
    row_ordinal: int,
    group: tuple[int, int, int],
    source_sha: str,
    city_map: dict[str, str],
    neighborhood_map: dict[tuple[str, str], dict[str, str]],
) -> dict[str, Any] | None:
    text, redaction_count = normalized_group_text(row.get("title", ""), row.get("description", ""))
    if not text:
        return None
    group_hash = digest_text(text)
    category = category_slug(row.get("cat2_slug", ""), row.get("cat3_slug", ""))
    if category is None:
        return None

    group_size, category_conflict, city_conflict = group
    if category_conflict or city_conflict:
        return None

    source_city = row.get("city_slug", "").strip()
    app_city = city_map.get(source_city)
    source_neighborhood = row.get("neighborhood_slug", "").strip()
    mapped_neighborhood = neighborhood_map.get(
        (source_city.lower(), source_neighborhood.lower())
    ) if source_city and source_neighborhood else None
    if mapped_neighborhood and mapped_neighborhood["appCitySlug"] != app_city:
        mapped_neighborhood = None
    decisions: dict[str, dict[str, str]] = {
        "offer_category": {
            "value": category,
            "source": "divar_cat2_slug+cat3_slug_mapping",
        },
        "offer_property_kind": {
            "value": property_kind_for(category),
            "source": "unambiguous_app_category_mapping",
        },
        "offer_transaction_type": {
            "value": transaction_type_for(
                category,
                rent_type=row.get("rent_type", ""),
                rent_value=row.get("rent_value", ""),
                credit_value=row.get("credit_value", ""),
            ),
            "source": "offer_category_and_explicit_rent_fields;unknown_when_ambiguous",
        },
    }
    row_id = digest_text(f"{source_sha}:{row_ordinal}:{group_hash}")
    return {
        "schemaVersion": SCHEMA_VERSION,
        "taskType": OFFER_TASK,
        "exampleId": row_id,
        "source": {
            "dataset": DATASET_ID,
            "datasetSha256": source_sha,
            "rowOrdinal": row_ordinal,
            "normalizedTextGroupSha256": group_hash,
            "sourceType": "seller_or_agent_property_offer",
        },
        "perspective": "seller_or_agent_supply_offer",
        "synthetic": False,
        "derived": True,
        "isNeedGroundTruth": False,
        "humanReviewed": False,
        "sourceUse": {
            "kind": "public_database_license",
            "licenseId": "ODbL-1.0",
            "reviewStatus": "pending_individual_content_rights_and_privacy_review",
            "cloudTransferAllowed": False,
        },
        "split": split_for_group(group_hash),
        "splitGroup": group_hash,
        "groupWeight": 1.0 / group_size,
        "state": text,
        "typedDecisions": decisions,
        # These are source-side property facts only. They are not preferences,
        # and the synthetic-need builder must explicitly mark any recasting.
        # Money fields are intentionally not copied into this structure.
        "sourceOfferAttributes": _offer_attributes(row, category),
        "offerLocation": {
            "sourceCitySlug": source_city or None,
            "appCitySlug": app_city,
            "sourceNeighborhoodSlug": source_neighborhood or None,
            "appNeighborhoodId": mapped_neighborhood["appNeighborhoodId"] if mapped_neighborhood else None,
            "appNeighborhoodName": mapped_neighborhood["appNeighborhoodName"] if mapped_neighborhood else None,
            "neighborhoodMatch": mapped_neighborhood["matchKind"] if mapped_neighborhood else (
                "unresolved" if source_neighborhood else "not_stated"
            ),
            "neighborhoodSource": (
                "official_divar_district_and_unique_exact_app_catalog_match"
                if mapped_neighborhood and mapped_neighborhood["matchKind"] == "exact_official_crosswalk"
                else "official_divar_district_and_unique_app_name_after_legacy_suffix_alias"
                if mapped_neighborhood
                else None
            ),
        },
        "excludedFromSeekerIntent": [
            "listing_price", "rent_value", "credit_value", "parking", "elevator",
            "storage", "deed_type", "building_size", "rooms_count",
        ],
        "privacy": {
            "contactPatternRedactions": redaction_count,
            "reviewStatus": "regex_only_not_comprehensive",
            "transferAllowed": False,
        },
    }


def _sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(4 * 1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def prepare_corpus(
    source: Path,
    output: Path,
    city_map_path: Path,
    *,
    manual_city_map_path: Path | None = None,
    catalog_dir: Path | None = None,
    divar_city_id_map_path: Path | None = None,
    divar_location_tree_path: Path | None = None,
    neighborhood_crosswalk_path: Path | None = None,
    expected_sha256: str | None = SOURCE_SHA256,
    max_rows: int | None = None,
) -> dict[str, Any]:
    if output.exists() or output.with_suffix(output.suffix + ".manifest.json").exists():
        raise FileExistsError("Refusing to overwrite an existing corpus or manifest")
    source_sha = _sha256_file(source)
    if expected_sha256 and source_sha != expected_sha256:
        raise ValueError(f"Source SHA-256 mismatch: got {source_sha}")

    city_map = _source_city_map(
        city_map_path,
        manual_city_map_path,
        catalog_dir,
        divar_city_id_map_path,
        divar_location_tree_path,
    )
    neighborhood_map = load_neighborhood_crosswalk(neighborhood_crosswalk_path)
    output.parent.mkdir(parents=True, exist_ok=True)
    fd, db_name = tempfile.mkstemp(prefix="divar-laya-index-", suffix=".sqlite", dir=output.parent)
    os.close(fd)
    db_path = Path(db_name)
    tmp_output: Path | None = None
    tmp_manifest: Path | None = None
    try:
        connection = sqlite3.connect(db_path)
        try:
            _init_index(connection)
            (
                rows_read,
                column_count,
                contact_pattern_redactions,
                distinct_source_cities,
                mapped_source_cities,
                distinct_source_neighborhood_pairs,
            ) = _index_rows(source, connection, city_map, max_rows)
            group_count, duplicate_groups, duplicate_rows, category_conflicts, city_conflicts = connection.execute(
                """SELECT COUNT(*),
                          SUM(CASE WHEN row_count > 1 THEN 1 ELSE 0 END),
                          SUM(CASE WHEN row_count > 1 THEN row_count - 1 ELSE 0 END),
                          SUM(category_conflict), SUM(city_conflict)
                   FROM groups"""
            ).fetchone()
            lookup = connection.cursor()
            handle, reader, second_column_count = _csv_reader(source)
            if second_column_count != column_count:
                raise ValueError("CSV schema changed between passes")
            fd_out, temp_output_name = tempfile.mkstemp(prefix=f".{output.name}.", suffix=".tmp", dir=output.parent)
            tmp_output = Path(temp_output_name)
            row_counts: Counter[str] = Counter()
            decision_counts: Counter[str] = Counter()
            city_rows_mapped = 0
            neighborhood_rows_mapped = 0
            skipped_conflicts = 0
            skipped_category = 0
            skipped_empty = 0
            rows_written = 0
            try:
                with os.fdopen(fd_out, "w", encoding="utf-8", newline="") as out:
                    for row_ordinal, row in enumerate(reader, start=1):
                        if max_rows is not None and row_ordinal > max_rows:
                            break
                        text, _ = normalized_group_text(row.get("title", ""), row.get("description", ""))
                        if not text:
                            skipped_empty += 1
                            continue
                        group_hash = digest_text(text)
                        group_row = lookup.execute(
                            "SELECT row_count, category_conflict, city_conflict FROM groups WHERE group_hash = ?",
                            (group_hash,),
                        ).fetchone()
                        if group_row is None:
                            skipped_empty += 1
                            continue
                        if group_row[1] or group_row[2]:
                            skipped_conflicts += 1
                            continue
                        category = category_slug(row.get("cat2_slug", ""), row.get("cat3_slug", ""))
                        if category is None:
                            skipped_category += 1
                            continue
                        item = _record(
                            row,
                            row_ordinal,
                            group_row,
                            source_sha,
                            city_map,
                            neighborhood_map,
                        )
                        if item is None:
                            skipped_category += 1
                            continue
                        out.write(json.dumps(item, ensure_ascii=False, separators=(",", ":")) + "\n")
                        rows_written += 1
                        row_counts[category] += 1
                        decision_counts.update(item["typedDecisions"].keys())
                        city_rows_mapped += int(bool(item["offerLocation"]["appCitySlug"]))
                        neighborhood_rows_mapped += int(
                            bool(item["offerLocation"]["appNeighborhoodId"])
                        )
            finally:
                handle.close()

            manifest = {
                "schemaVersion": SCHEMA_VERSION,
                "targetTask": OFFER_TASK,
                "sourceOfferAttributesVersion": 1,
                "containsSyntheticData": False,
                "dataset": DATASET_ID,
                "datasetSha256": source_sha,
                "sourceRowsRead": rows_read,
                "sourceColumns": column_count,
                "distinctSourceCities": distinct_source_cities,
                "sourceCitiesMappedToApp": mapped_source_cities,
                "distinctSourceCityNeighborhoodPairs": distinct_source_neighborhood_pairs,
                "contactPatternRedactions": contact_pattern_redactions,
                "cityMapFiles": [
                    str(city_map_path),
                    str(manual_city_map_path) if manual_city_map_path else None,
                    str(catalog_dir) if catalog_dir else None,
                    str(divar_city_id_map_path) if divar_city_id_map_path else None,
                    str(divar_location_tree_path) if divar_location_tree_path else None,
                ],
                "cityMappingPolicy": "exact verified Divar slug/ID mappings; additional source aliases require a unique location-tree ID, exact official slug, and exact Persian city-name match against the official catalog slug or one globally unique app catalog; ambiguous or mismatched names remain unmapped",
                "outputRows": rows_written,
                "normalizedTextGroups": group_count or 0,
                "duplicateGroups": duplicate_groups or 0,
                "duplicateRowsBeyondFirst": duplicate_rows or 0,
                "groupsWithCategoryConflict": category_conflicts or 0,
                "groupsWithCityConflict": city_conflicts or 0,
                "rowsSkippedConflict": skipped_conflicts,
                "rowsSkippedMissingText": skipped_empty,
                "rowsSkippedUnmappedCategory": skipped_category,
                "rowsWithMappedAppCity": city_rows_mapped,
                "rowsWithMappedAppNeighborhood": neighborhood_rows_mapped,
                "neighborhoodCrosswalk": str(neighborhood_crosswalk_path) if neighborhood_crosswalk_path else None,
                "categoryCounts": dict(sorted(row_counts.items())),
                "typedDecisionCounts": dict(sorted(decision_counts.items())),
                "splitPolicy": "sha256(normalized_redacted_text) mod 100; 80 train / 10 calibration / 10 test; exact text groups never cross splits",
                "duplicatePolicy": "retain non-conflicting source rows in one split and assign inverse group-size training weight",
                "targetPolicy": "real seller/agent offer category, property kind, explicit offer transaction, and exact location are source-offer labels; structured area, rooms, deed, and amenities are retained only as seller-side facts and never as seeker preferences in this task; no offer price, rent, or credit is retained",
                "provenancePolicy": "real Divar source text/metadata with deterministic category and exact location crosswalks; derived auxiliary offer task; not genuine seeker demand; no human review",
                "privacyPolicy": "contact regex redaction only; names and indirect identifiers remain a manual privacy-review gate; transferAllowed=false",
                "licenseReviewRequiredBeforeRedistribution": True,
                "cloudTransferAllowed": False,
                "pilotPrefixLimit": max_rows,
            }
            fd_manifest, temp_manifest_name = tempfile.mkstemp(
                prefix=f".{output.name}.manifest.", suffix=".tmp", dir=output.parent
            )
            tmp_manifest = Path(temp_manifest_name)
            with os.fdopen(fd_manifest, "w", encoding="utf-8") as manifest_file:
                json.dump(manifest, manifest_file, ensure_ascii=False, indent=2)
                manifest_file.write("\n")

            if output.exists() or output.with_suffix(output.suffix + ".manifest.json").exists():
                raise FileExistsError("Output appeared while corpus was being prepared; refusing to overwrite")
            os.link(tmp_output, output)
            tmp_output.unlink()
            tmp_output = None
            os.link(tmp_manifest, output.with_suffix(output.suffix + ".manifest.json"))
            tmp_manifest.unlink()
            tmp_manifest = None
            return manifest
        finally:
            connection.close()
    finally:
        if tmp_output and tmp_output.exists():
            tmp_output.unlink()
        if tmp_manifest and tmp_manifest.exists():
            tmp_manifest.unlink()
        if db_path.exists():
            db_path.unlink()


def _parse_args(argv: list[str]) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--input", type=Path, required=True, help="Verified Divar CSV snapshot")
    parser.add_argument("--output", type=Path, required=True, help="New local JSONL path; never overwritten")
    parser.add_argument(
        "--city-map",
        type=Path,
        default=Path("src/data/neighborhoods/divar-city-map.json"),
        help="Existing Divar-to-app city map",
    )
    parser.add_argument(
        "--manual-city-map",
        type=Path,
        default=Path("src/data/neighborhoods/divar-city-map.manual.json"),
        help="Existing explicit manual Divar-to-app city crosswalk",
    )
    parser.add_argument(
        "--catalog-dir",
        type=Path,
        default=Path("src/data/neighborhoods/catalog"),
        help="Existing app city catalog directory; exact unique filename matches only",
    )
    parser.add_argument(
        "--divar-city-id-map",
        type=Path,
        default=Path("data/divar/city-id-map.json"),
        help="Exact Divar slug→numeric ID map, joined only to unique app Divar IDs",
    )
    parser.add_argument(
        "--divar-location-tree",
        type=Path,
        default=DEFAULT_DIVAR_LOCATION_TREE,
        help="Pinned local Divar place metadata used only for exact source-city alias validation",
    )
    parser.add_argument(
        "--neighborhood-crosswalk",
        type=Path,
        default=DEFAULT_NEIGHBORHOOD_CROSSWALK,
        help="Public-reference crosswalk; exact unique matches only",
    )
    parser.add_argument(
        "--max-rows",
        type=int,
        default=None,
        help="Optional prefix-only pipeline smoke test; do not use as final training data",
    )
    parser.add_argument(
        "--expected-sha256",
        default=SOURCE_SHA256,
        help="Pinned source checksum; pass empty string only for a local fixture test",
    )
    return parser.parse_args(argv)


def main(argv: list[str] | None = None) -> int:
    args = _parse_args(argv if argv is not None else sys.argv[1:])
    manifest = prepare_corpus(
        args.input,
        args.output,
        args.city_map,
        manual_city_map_path=args.manual_city_map,
        catalog_dir=args.catalog_dir,
        divar_city_id_map_path=args.divar_city_id_map,
        divar_location_tree_path=args.divar_location_tree,
        neighborhood_crosswalk_path=args.neighborhood_crosswalk,
        expected_sha256=args.expected_sha256 or None,
        max_rows=args.max_rows,
    )
    print(json.dumps(manifest, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
