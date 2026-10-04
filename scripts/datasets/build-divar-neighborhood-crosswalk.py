#!/usr/bin/env python3
"""Build a public-metadata-only, exact Divar→app neighborhood crosswalk.

This reads only city_slug/neighborhood_slug from the pinned Divar snapshot.
It never reads listing titles/descriptions and never creates training examples.
Ambiguous city or neighborhood matches remain unresolved.
"""

from __future__ import annotations

import argparse
import csv
import hashlib
import json
import re
import sys
import time
import unicodedata
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen


ROOT = Path(__file__).resolve().parents[2]
EXPECTED_SOURCE_SHA256 = "e5760fe1325a195e6682c371457bfecd51d255c518756e3cbea234b8163a801f"
DEFAULT_INPUT = Path("/private/tmp/niaz-divar-clean.z4cEFG/real_estate_ads.csv")
DEFAULT_OUTPUT = Path("data/divar/official-neighborhood-app-crosswalk-2026-09-25.json")
DIVAR_CITIES_URL = "https://api.divar.ir/v1/places/cities"
DIVAR_DISTRICTS_URL = "https://api.divar.ir/v1/places/cities/{city_id}/districts"


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for block in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(block)
    return digest.hexdigest()


def normalize_name(value: str) -> str:
    text = unicodedata.normalize("NFKC", value)
    text = text.translate(str.maketrans({"ي": "ی", "ى": "ی", "ك": "ک", "ۀ": "ه", "ة": "ه"}))
    text = re.sub(r"[\u064b-\u065f\u0670\u0640]", "", text)
    text = text.replace("\u200c", "").replace("\u200f", "").replace("\u200e", "")
    return re.sub(r"\s+", "", text).strip().casefold()


def strip_terminal_legacy_suffix(value: str) -> str | None:
    """Remove only Divar's explicit final ``قدیمی`` token, never fuzzy-match."""
    text = unicodedata.normalize("NFKC", value).replace("\u200e", "").replace("\u200f", "")
    stripped = re.sub(r"[\s\u200c]+قدیمی\s*$", "", text)
    return stripped.strip() if stripped != text else None


def extend_with_literal_exact_names(payload: dict, catalog_dir: Path) -> tuple[dict, dict]:
    """Resolve ambiguous normalized names only when the official display name matches literally.

    This keeps meaningful Persian spacing/half-space distinctions: if the
    official Divar district label is byte-for-byte equal to exactly one app
    catalog display name/ID in the same city, the broader normalized collision
    does not make the identity ambiguous. No edit distance or alias generation
    is used here.
    """
    entries = [dict(entry) if isinstance(entry, dict) else entry for entry in payload.get("entries", [])]
    updated = dict(payload)
    updated["entries"] = entries
    literal_pairs = 0
    literal_rows = 0
    catalog_cache: dict[str, dict] = {}

    for entry in entries:
        if (
            not isinstance(entry, dict)
            or entry.get("status") != "unresolved"
            or entry.get("reason") != "app-neighborhood-name-not-unique"
            or not isinstance(entry.get("divarDistrictId"), int)
        ):
            continue
        city_id = entry.get("appCatalogCityId")
        official_name = entry.get("divarDistrictName")
        if not isinstance(city_id, str) or not isinstance(official_name, str) or not official_name:
            continue
        catalog_path = catalog_dir / f"{city_id}.json"
        if not catalog_path.is_file():
            continue
        if city_id not in catalog_cache:
            catalog_cache[city_id] = json.loads(catalog_path.read_text(encoding="utf-8"))
        candidates_by_id = {
            str(neighborhood.get("id")): neighborhood
            for neighborhood in catalog_cache[city_id].get("neighborhoods", [])
            if isinstance(neighborhood, dict)
            and isinstance(neighborhood.get("id"), str)
            and official_name in {
                neighborhood.get("name"),
                neighborhood.get("id"),
                neighborhood.get("nameEn"),
            }
        }
        if len(candidates_by_id) != 1:
            continue
        candidate = next(iter(candidates_by_id.values()))
        if not isinstance(candidate.get("name"), str) or not candidate["name"]:
            continue
        entry.update({
            "status": "exact",
            "matchBasis": "unique-literal-official-name",
            "appNeighborhoodId": candidate["id"],
            "appNeighborhoodName": candidate["name"],
            "humanReviewed": False,
        })
        entry.pop("reason", None)
        literal_pairs += 1
        literal_rows += int(entry.get("sourceRows") or 0)

    old_coverage = payload.get("coverage", {})
    coverage = dict(old_coverage)
    coverage["exactAppCatalogMatchedPairs"] = int(old_coverage.get("exactAppCatalogMatchedPairs", 0)) + literal_pairs
    coverage["sourceRowsWithExactAppCatalogMatch"] = int(old_coverage.get("sourceRowsWithExactAppCatalogMatch", 0)) + literal_rows
    coverage["literalExactNameMatchedPairs"] = literal_pairs
    coverage["sourceRowsWithLiteralExactName"] = literal_rows
    coverage["unresolvedPairs"] = max(0, int(old_coverage.get("unresolvedPairs", 0)) - literal_pairs)
    if "legacyAliasMatchedPairs" in old_coverage:
        coverage["resolvedPairsIncludingLegacyAliases"] = coverage["exactAppCatalogMatchedPairs"] + int(old_coverage.get("legacyAliasMatchedPairs", 0))
        coverage["sourceRowsWithExactOrLegacyAlias"] = coverage["sourceRowsWithExactAppCatalogMatch"] + int(old_coverage.get("sourceRowsWithLegacyAlias", 0))
    remaining_reasons = Counter(
        str(entry.get("reason"))
        for entry in entries
        if isinstance(entry, dict) and entry.get("status") == "unresolved" and entry.get("reason")
    )
    coverage["unresolvedReasons"] = dict(sorted(remaining_reasons.items()))
    updated["coverage"] = coverage
    policy = dict(payload.get("matchingPolicy", {}))
    policy["literalExactName"] = (
        "When normalized names collide, accept only byte-for-byte equality between the official Divar district display name and exactly one app catalog name/ID in the same city; no fuzzy matching."
    )
    updated["matchingPolicy"] = policy
    return updated, {
        "literalExactNameMatchedPairs": literal_pairs,
        "sourceRowsWithLiteralExactName": literal_rows,
        "exactAppCatalogMatchedPairs": coverage["exactAppCatalogMatchedPairs"],
        "unresolvedPairs": coverage["unresolvedPairs"],
    }


def extend_with_legacy_aliases(payload: dict, catalog_dir: Path) -> tuple[dict, dict]:
    """Resolve exact, unique app names for official Divar districts labeled ``قدیمی``.

    The result remains explicitly ``legacy_alias`` rather than being presented
    as an exact current-name match. Only the terminal suffix is removed, and
    the remaining normalized name must match exactly one neighborhood in the
    same app-city catalog.
    """
    entries = [dict(entry) if isinstance(entry, dict) else entry for entry in payload.get("entries", [])]
    updated = dict(payload)
    updated["entries"] = entries
    alias_pairs = 0
    alias_rows = 0
    catalog_cache: dict[str, dict] = {}

    for entry in entries:
        if not isinstance(entry, dict) or entry.get("status") != "unresolved":
            continue
        if entry.get("reason") != "no-exact-app-catalog-name":
            continue
        if not isinstance(entry.get("divarDistrictId"), int):
            continue
        city_id = entry.get("appCatalogCityId")
        district_name = entry.get("divarDistrictName")
        if not isinstance(city_id, str) or not isinstance(district_name, str):
            continue
        alias_name = strip_terminal_legacy_suffix(district_name)
        if not alias_name:
            continue
        catalog_path = catalog_dir / f"{city_id}.json"
        if not catalog_path.is_file():
            continue
        if city_id not in catalog_cache:
            catalog_cache[city_id] = json.loads(catalog_path.read_text(encoding="utf-8"))
        catalog = catalog_cache[city_id]
        alias_key = normalize_name(alias_name)
        candidates = [
            neighborhood
            for neighborhood in catalog.get("neighborhoods", [])
            if isinstance(neighborhood, dict)
            and alias_key
            and alias_key in {
                normalize_name(str(neighborhood.get("name", ""))),
                normalize_name(str(neighborhood.get("id", ""))),
                normalize_name(str(neighborhood.get("nameEn", ""))),
            }
        ]
        if len(candidates) != 1:
            continue

        candidate = candidates[0]
        entry.update({
            "status": "legacy_alias",
            "matchBasis": "unique-exact-normalized-name-after-removing-legacy-suffix",
            "legacyNameSuffix": "قدیمی",
            "appNeighborhoodId": candidate.get("id"),
            "appNeighborhoodName": candidate.get("name"),
            "humanReviewed": False,
        })
        entry.pop("reason", None)
        alias_pairs += 1
        alias_rows += int(entry.get("sourceRows") or 0)

    old_coverage = payload.get("coverage", {})
    exact_pairs = int(old_coverage.get("exactAppCatalogMatchedPairs", 0))
    exact_rows = int(old_coverage.get("sourceRowsWithExactAppCatalogMatch", 0))
    old_unresolved = int(old_coverage.get("unresolvedPairs", 0))
    coverage = dict(old_coverage)
    coverage.update({
        "legacyAliasMatchedPairs": alias_pairs,
        "sourceRowsWithLegacyAlias": alias_rows,
        "resolvedPairsIncludingLegacyAliases": exact_pairs + alias_pairs,
        "sourceRowsWithExactOrLegacyAlias": exact_rows + alias_rows,
        "unresolvedPairs": old_unresolved - alias_pairs,
    })
    remaining_reasons = Counter(
        str(entry.get("reason"))
        for entry in entries
        if isinstance(entry, dict) and entry.get("status") == "unresolved" and entry.get("reason")
    )
    coverage["unresolvedReasons"] = dict(sorted(remaining_reasons.items()))
    updated["coverage"] = coverage
    policy = dict(payload.get("matchingPolicy", {}))
    policy["legacySuffixAlias"] = (
        "Only the terminal Persian token 'قدیمی' may be removed; the remaining NFKC/Persian-normalized name must match exactly one neighborhood in the same app-city catalog. Such rows remain labeled legacy_alias, not exact."
    )
    updated["matchingPolicy"] = policy
    return updated, {
        "legacyAliasMatchedPairs": alias_pairs,
        "sourceRowsWithLegacyAlias": alias_rows,
        "exactAppCatalogMatchedPairs": exact_pairs,
        "resolvedPairsIncludingLegacyAliases": exact_pairs + alias_pairs,
        "unresolvedPairs": old_unresolved - alias_pairs,
    }


def extend_existing_crosswalk(input_path: Path, output_path: Path, catalog_dir: Path) -> dict:
    if not input_path.is_file():
        raise SystemExit(f"Missing existing crosswalk: {input_path}")
    if output_path.exists():
        raise SystemExit(f"Refusing to overwrite existing output: {output_path}")
    payload = json.loads(input_path.read_text(encoding="utf-8"))
    if payload.get("artifactType") != "location-reference-crosswalk-not-training-data":
        raise SystemExit("Input is not a Divar/app location reference crosswalk")
    payload, literal_summary = extend_with_literal_exact_names(payload, catalog_dir)
    updated, summary = extend_with_legacy_aliases(payload, catalog_dir)
    updated["schemaVersion"] = 2
    updated["derivedFromCrosswalk"] = {
        "artifact": input_path.name,
        "sha256": hashlib.sha256(input_path.read_bytes()).hexdigest(),
    }
    updated["derivedAt"] = datetime.now(timezone.utc).isoformat()
    output_path.parent.mkdir(parents=True, exist_ok=True)
    with output_path.open("x", encoding="utf-8") as stream:
        json.dump(updated, stream, ensure_ascii=False, separators=(",", ":"))
        stream.write("\n")
    return {**literal_summary, **summary}


def fetch_json(url: str) -> dict:
    request = Request(url, headers={"User-Agent": "NiazFinder-location-crosswalk-audit/1.0"})
    last_error: Exception | None = None
    for attempt in range(3):
        try:
            with urlopen(request, timeout=25) as response:
                if response.status != 200:
                    raise RuntimeError(f"Divar API returned HTTP {response.status}")
                payload = json.load(response)
                if not isinstance(payload, dict):
                    raise RuntimeError("Divar API returned a non-object response")
                return payload
        except (HTTPError, URLError, TimeoutError, json.JSONDecodeError, RuntimeError) as error:
            last_error = error
            if attempt < 2:
                time.sleep(0.5 * (attempt + 1))
    raise RuntimeError(f"Unable to fetch Divar public location metadata: {last_error}")


def app_city_for_source(
    source_slug: str,
    divar_city_id: int,
    divar_map: dict,
    catalog_dir: Path,
) -> tuple[str | None, str | None, str | None]:
    candidates: list[tuple[str, str]] = []
    for app_catalog_id, record in divar_map.items():
        if not isinstance(record, dict) or record.get("divarCityId") != divar_city_id:
            continue
        route_slug = app_catalog_id[:-5] if app_catalog_id.endswith("-city") else app_catalog_id
        catalog_ids = [app_catalog_id, route_slug, f"{route_slug}-city"]
        catalog_id = next(
            (candidate for candidate in dict.fromkeys(catalog_ids)
             if (catalog_dir / f"{candidate}.json").is_file()),
            None,
        )
        if catalog_id:
            candidates.append((route_slug, catalog_id))

    candidates = list(dict.fromkeys(candidates))
    exact = [candidate for candidate in candidates if candidate[0] == source_slug]
    if len(exact) == 1:
        return exact[0][0], exact[0][1], "exact-source-slug"
    if len(exact) > 1:
        return None, None, "ambiguous-app-city"
    if len(candidates) == 1:
        return candidates[0][0], candidates[0][1], "unique-divar-city-id"
    if not candidates:
        return None, None, "no-app-city-catalog"
    return None, None, "ambiguous-app-city"


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--input", type=Path, default=DEFAULT_INPUT)
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT)
    parser.add_argument(
        "--extend-existing-crosswalk",
        type=Path,
        help="Create a new crosswalk version with literal exact-name disambiguation and exact unique terminal-'قدیمی' aliases; does not fetch or overwrite source data",
    )
    parser.add_argument("--allow-source-hash-mismatch", action="store_true")
    args = parser.parse_args()
    output_path = (ROOT / args.output).resolve() if not args.output.is_absolute() else args.output.resolve()
    catalog_dir = ROOT / "src/data/neighborhoods/catalog"
    if args.extend_existing_crosswalk:
        input_crosswalk = args.extend_existing_crosswalk.expanduser().resolve()
        summary = extend_existing_crosswalk(input_crosswalk, output_path, catalog_dir)
        print(json.dumps(summary, ensure_ascii=False, sort_keys=True))
        print(f"Wrote versioned exact/legacy neighborhood crosswalk: {output_path}")
        return 0

    source_path = args.input.expanduser().resolve()

    if not source_path.is_file():
        raise SystemExit(f"Missing Divar CSV snapshot: {source_path}")
    if output_path.exists():
        raise SystemExit(f"Refusing to overwrite existing output: {output_path}")

    source_hash = sha256_file(source_path)
    if source_hash != EXPECTED_SOURCE_SHA256 and not args.allow_source_hash_mismatch:
        raise SystemExit("Source snapshot SHA-256 does not match the pinned Divar dataset snapshot")

    divar_map_path = ROOT / "src/data/neighborhoods/divar-city-map.json"
    divar_map = json.loads(divar_map_path.read_text(encoding="utf-8"))

    pair_rows: Counter[tuple[str, str]] = Counter()
    with source_path.open("r", encoding="utf-8-sig", newline="") as stream:
        reader = csv.DictReader(stream)
        required = {"city_slug", "neighborhood_slug"}
        if not required.issubset(reader.fieldnames or []):
            raise SystemExit("Input CSV is missing city_slug/neighborhood_slug columns")
        for row in reader:
            city_slug = (row.get("city_slug") or "").strip()
            neighborhood_slug = (row.get("neighborhood_slug") or "").strip()
            if city_slug and neighborhood_slug:
                pair_rows[(city_slug, neighborhood_slug)] += 1

    source_city_slugs = sorted({city for city, _ in pair_rows})
    official_city_payload = fetch_json(DIVAR_CITIES_URL)
    official_cities = official_city_payload.get("cities")
    if not isinstance(official_cities, list):
        raise SystemExit("Divar cities response has no cities array")
    official_by_slug: dict[str, list[dict]] = {}
    for city in official_cities:
        if isinstance(city, dict) and isinstance(city.get("slug"), str):
            official_by_slug.setdefault(city["slug"].strip().lower(), []).append(city)

    resolved_city: dict[str, dict] = {}
    for index, source_slug in enumerate(source_city_slugs):
        official_matches = official_by_slug.get(source_slug.lower(), [])
        if len(official_matches) == 1 and isinstance(official_matches[0].get("id"), int):
            official = official_matches[0]
            app_slug, app_catalog_id, app_method = app_city_for_source(
                source_slug, official["id"], divar_map, catalog_dir
            )
            resolved_city[source_slug] = {
                "official": official,
                "appCitySlug": app_slug,
                "appCatalogCityId": app_catalog_id,
                "appCityMatchMethod": app_method,
            }
        else:
            resolved_city[source_slug] = {
                "official": None,
                "appCitySlug": None,
                "appCatalogCityId": None,
                "appCityMatchMethod": "source-city-not-unique-in-divar-api",
            }
        if index < len(source_city_slugs) - 1:
            time.sleep(0.3)

    district_cache: dict[int, dict[str, list[dict]]] = {}
    city_ids = sorted({
        item["official"]["id"]
        for item in resolved_city.values()
        if item.get("official") and item.get("appCitySlug")
    })
    for index, city_id in enumerate(city_ids):
        payload = fetch_json(DIVAR_DISTRICTS_URL.format(city_id=city_id))
        districts = payload.get("districts")
        if not isinstance(districts, list):
            raise SystemExit(f"Divar districts response is invalid for city id {city_id}")
        by_slug: dict[str, list[dict]] = {}
        for district in districts:
            if isinstance(district, dict) and isinstance(district.get("slug"), str):
                by_slug.setdefault(district["slug"].strip().lower(), []).append(district)
        district_cache[city_id] = by_slug
        if index < len(city_ids) - 1:
            time.sleep(0.3)

    entries: list[dict] = []
    mapped_pairs = 0
    mapped_rows = 0
    official_slug_pairs = 0
    unresolved_reasons: Counter[str] = Counter()
    for (source_city, source_neighborhood), source_rows in sorted(pair_rows.items()):
        city = resolved_city[source_city]
        official_city = city.get("official")
        reason: str | None = None
        district: dict | None = None
        app_neighborhood: dict | None = None

        if official_city is None:
            reason = "source-city-not-unique-in-divar-api"
        elif not city.get("appCitySlug"):
            reason = city.get("appCityMatchMethod") or "no-app-city-catalog"
        else:
            official_matches = district_cache[official_city["id"]].get(source_neighborhood.lower(), [])
            if len(official_matches) != 1:
                reason = "district-slug-not-unique-in-current-divar-api" if official_matches else "district-slug-not-in-current-divar-api"
            else:
                district = official_matches[0]
                official_slug_pairs += 1
                catalog = json.loads((catalog_dir / f"{city['appCatalogCityId']}.json").read_text(encoding="utf-8"))
                neighborhoods = catalog.get("neighborhoods", [])
                district_key = normalize_name(str(district.get("name", "")))
                app_matches = [
                    neighborhood
                    for neighborhood in neighborhoods
                    if isinstance(neighborhood, dict)
                    and district_key
                    and district_key in {
                        normalize_name(str(neighborhood.get("name", ""))),
                        normalize_name(str(neighborhood.get("id", ""))),
                        normalize_name(str(neighborhood.get("nameEn", ""))),
                    }
                ]
                if len(app_matches) == 1:
                    app_neighborhood = app_matches[0]
                elif not app_matches:
                    reason = "no-exact-app-catalog-name"
                else:
                    reason = "app-neighborhood-name-not-unique"

        if app_neighborhood is not None and district is not None:
            mapped_pairs += 1
            mapped_rows += source_rows
            entries.append({
                "status": "exact",
                "sourceCitySlug": source_city,
                "sourceNeighborhoodSlug": source_neighborhood,
                "sourceRows": source_rows,
                "divarCityId": official_city["id"],
                "divarDistrictId": district.get("id"),
                "divarDistrictSlug": district.get("slug"),
                "divarDistrictName": district.get("name"),
                "appCitySlug": city["appCitySlug"],
                "appCatalogCityId": city["appCatalogCityId"],
                "appNeighborhoodId": app_neighborhood.get("id"),
                "appNeighborhoodName": app_neighborhood.get("name"),
                "matchBasis": "unique-exact-normalized-official-name",
                "humanReviewed": False,
            })
        else:
            unresolved_reasons[reason or "unresolved"] += 1
            entries.append({
                "status": "unresolved",
                "sourceCitySlug": source_city,
                "sourceNeighborhoodSlug": source_neighborhood,
                "sourceRows": source_rows,
                "divarCityId": official_city.get("id") if official_city else None,
                "divarDistrictId": district.get("id") if district else None,
                "divarDistrictSlug": district.get("slug") if district else None,
                "divarDistrictName": district.get("name") if district else None,
                "appCitySlug": city.get("appCitySlug"),
                "appCatalogCityId": city.get("appCatalogCityId"),
                "reason": reason or "unresolved",
                "humanReviewed": False,
            })

    payload = {
        "schemaVersion": 1,
        "artifactType": "location-reference-crosswalk-not-training-data",
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "source": {
            "dataset": "divarofficial/real_estate_ads",
            "snapshotSha256": source_hash,
            "fieldsRead": ["city_slug", "neighborhood_slug"],
            "listingTextRead": False,
        },
        "officialReference": "https://api.divar.ir/v1/places/cities/{city_id}/districts",
        "matchingPolicy": {
            "city": "unique official Divar city slug/ID, then unique existing app catalog mapping",
        "neighborhood": "exact official district slug and unique NFKC/Persian-normalized name/ID match in the city catalog; literal official-name equality resolves normalization collisions",
            "fuzzyMatching": False,
            "ambiguousMatches": "unresolved",
        },
        "coverage": {
            "sourceCitiesWithNeighborhoods": len(source_city_slugs),
            "sourceCityNeighborhoodPairs": len(pair_rows),
            "sourceRowsWithNeighborhoodSlug": sum(pair_rows.values()),
            "officialDistrictSlugMatchedPairs": official_slug_pairs,
            "exactAppCatalogMatchedPairs": mapped_pairs,
            "sourceRowsWithExactAppCatalogMatch": mapped_rows,
            "unresolvedPairs": len(pair_rows) - mapped_pairs,
            "unresolvedReasons": dict(sorted(unresolved_reasons.items())),
        },
        "entries": entries,
    }

    payload, literal_summary = extend_with_literal_exact_names(payload, catalog_dir)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    with output_path.open("x", encoding="utf-8") as stream:
        json.dump(payload, stream, ensure_ascii=False, separators=(",", ":"))
        stream.write("\n")
    print(json.dumps({"coverage": payload["coverage"], **literal_summary}, ensure_ascii=False, sort_keys=True))
    print(f"Wrote public-metadata-only crosswalk: {output_path}")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except KeyboardInterrupt:
        print("Interrupted; no listing text is used by this script", file=sys.stderr)
        raise SystemExit(130)
