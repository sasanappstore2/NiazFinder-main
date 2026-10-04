#!/usr/bin/env python3
"""Stream-audit Divar offer facts; emit aggregate counts only, never row text or IDs."""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import re
import sqlite3
import tempfile
import unicodedata
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Iterable


ROOT = Path(__file__).resolve().parents[2]
DEFAULT_INPUT = ROOT / "data/divar/divar-property-offer-facts-v4-exact-current-city-map-2026-09-28.jsonl"
DEFAULT_MANIFEST = Path(str(DEFAULT_INPUT) + ".manifest.json")
DEFAULT_CATALOGS = ROOT / "src/data/neighborhoods/catalog"
FACTS_TASK = "divar-property-offer-facts/v2"
SOURCE_DATASET = "divarofficial/real_estate_ads"
HASH_RE = re.compile(r"^[0-9a-f]{64}$")
RECONCILED_LOCATION_FIELDS = {
    "appCitySlug",
    "appNeighborhoodId",
    "appNeighborhoodName",
    "neighborhoodMatch",
    "neighborhoodSource",
}
# Kept in sync with src/lib/search/city-slugs.ts; the ordered fallback below
# mirrors resolveCatalogCityIdCandidates in src/lib/neighborhoods/catalog.ts.
CITY_ID_OVERRIDES = {
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
CONTACT_RE = re.compile(
    r"(?:https?://|www\.)|[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}|"
    r"(?<!\d)(?:\+?98|0098)?\s*0?9(?:[\s().-]*\d){9}(?!\d)",
    re.IGNORECASE,
)


def percent(numerator: int, denominator: int) -> float | None:
    if denominator <= 0:
        return None
    return round(numerator * 100 / denominator, 2)


def read_json(path: Path) -> dict[str, Any]:
    value = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(value, dict):
        raise ValueError(f"Expected a JSON object in {path.name}.")
    return value


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def compare_location_reconciliation(
    source_row: dict[str, Any], output_row: dict[str, Any]
) -> tuple[bool, bool]:
    """Return (non_location_unchanged, changed_location_fields_are_allowed)."""
    non_location_unchanged = {key: value for key, value in source_row.items() if key != "offerLocation"} == {
        key: value for key, value in output_row.items() if key != "offerLocation"
    }
    source_location = source_row.get("offerLocation")
    output_location = output_row.get("offerLocation")
    if not isinstance(source_location, dict) or not isinstance(output_location, dict):
        return non_location_unchanged, False
    changed_fields = {
        key
        for key in set(source_location) | set(output_location)
        if source_location.get(key) != output_location.get(key)
    }
    return non_location_unchanged, changed_fields.issubset(RECONCILED_LOCATION_FIELDS)


def normalize_place_name(value: str) -> str:
    value = value.replace("ي", "ی").replace("ك", "ک")
    value = unicodedata.normalize("NFKC", value)
    return re.sub(r"[\s\u200c\u200e\u200f\u0640]+", "", value).casefold()


def resolve_catalog_city_id(city_id: str, catalogs: dict[str, dict[str, str]]) -> str | None:
    """Mirror the runtime city-ID → catalog filename candidates and ordering."""
    slug = CITY_ID_OVERRIDES.get(city_id, city_id)
    candidates = [city_id, slug]
    if not city_id.endswith("-city"):
        candidates.append(f"{slug}-city")
    for candidate in dict.fromkeys(candidates):
        if candidate in catalogs and catalogs[candidate]:
            return candidate
    return None


def load_city_catalogs(catalog_dir: Path) -> tuple[dict[str, dict[str, str]], int]:
    catalogs: dict[str, dict[str, str]] = {}
    invalid = 0
    for path in sorted(catalog_dir.glob("*.json")):
        try:
            value = read_json(path)
            neighborhoods = value.get("neighborhoods")
            city_id = value.get("cityId")
            if path.stem != city_id or not isinstance(neighborhoods, list):
                invalid += 1
                continue
            names: dict[str, str] = {}
            for neighborhood in neighborhoods:
                if (
                    not isinstance(neighborhood, dict)
                    or not isinstance(neighborhood.get("id"), str)
                    or not neighborhood["id"].strip()
                    or not isinstance(neighborhood.get("name"), str)
                ):
                    invalid += 1
                    continue
                names[neighborhood["id"]] = neighborhood["name"]
            catalogs[city_id] = names
        except (OSError, ValueError, json.JSONDecodeError):
            invalid += 1
    return catalogs, invalid


class FactsAuditor:
    """Accumulate structural and reference-data checks without retaining source text."""

    def __init__(
        self,
        catalogs: dict[str, dict[str, str]],
        allowed_categories: set[str],
        connection: sqlite3.Connection,
        invalid_catalogs: int = 0,
        expected_dataset_sha256: str | None = None,
    ) -> None:
        self.catalogs = catalogs
        self.allowed_categories = allowed_categories
        self.connection = connection
        self.invalid_catalogs = invalid_catalogs
        self.expected_dataset_sha256 = expected_dataset_sha256
        self.counts: Counter[str] = Counter()
        self.categories: Counter[str] = Counter()
        self.property_kinds: Counter[str] = Counter()
        self.transaction_types: Counter[str] = Counter()
        self.splits: Counter[str] = Counter()
        self.match_kinds: Counter[str] = Counter()
        self.source_cities: set[str] = set()
        self.app_cities: set[str] = set()
        self.app_cities_mapped: set[str] = set()
        self.app_city_rows_by_slug: Counter[str] = Counter()
        self.app_city_catalog_by_slug: dict[str, str] = {}
        self.app_cities_without_catalog_rows: Counter[str] = Counter()
        self._create_tables()

    def _create_tables(self) -> None:
        self.connection.execute("CREATE TABLE seen_ids (value TEXT PRIMARY KEY)")
        self.connection.execute("CREATE TABLE seen_ordinals (value INTEGER PRIMARY KEY)")
        self.connection.execute(
            "CREATE TABLE split_groups (value TEXT PRIMARY KEY, split TEXT, rows INTEGER, conflict INTEGER)"
        )
        self.connection.execute(
            "CREATE TABLE app_neighborhoods (city TEXT, neighborhood TEXT, PRIMARY KEY(city, neighborhood))"
        )
        self.connection.execute(
            "CREATE TABLE source_neighborhoods (city TEXT, neighborhood TEXT, PRIMARY KEY(city, neighborhood))"
        )

    def add_malformed(self) -> None:
        self.counts["malformedJsonRows"] += 1

    def add(self, row: dict[str, Any]) -> None:
        self.counts["rowsParsed"] += 1
        if row.get("schemaVersion") != 2:
            self.counts["schemaVersionMismatchRows"] += 1
        if row.get("taskType") != FACTS_TASK:
            self.counts["taskTypeMismatchRows"] += 1
        if row.get("synthetic") is not False:
            self.counts["sourceFactsMarkedSyntheticRows"] += 1
        if row.get("derived") is not True:
            self.counts["notDerivedFromSourceRows"] += 1
        if row.get("isNeedGroundTruth") is not False:
            self.counts["incorrectlyClaimedNeedGroundTruthRows"] += 1
        if row.get("humanReviewed") is not False:
            self.counts["unexpectedHumanReviewFlagRows"] += 1
        if row.get("perspective") != "seller_or_agent_supply_offer":
            self.counts["unexpectedPerspectiveRows"] += 1

        source = row.get("source") if isinstance(row.get("source"), dict) else {}
        row_dataset_hash = source.get("datasetSha256")
        if (
            source.get("dataset") != SOURCE_DATASET
            or not isinstance(row_dataset_hash, str)
            or not HASH_RE.fullmatch(row_dataset_hash)
            or (self.expected_dataset_sha256 is not None and row_dataset_hash != self.expected_dataset_sha256)
        ):
            self.counts["invalidSourceProvenanceRows"] += 1
        if source.get("sourceType") != "seller_or_agent_property_offer":
            self.counts["unexpectedSourceTypeRows"] += 1

        example_id = row.get("exampleId")
        if not isinstance(example_id, str) or not HASH_RE.fullmatch(example_id):
            self.counts["invalidExampleIdRows"] += 1
        elif self.connection.execute("INSERT OR IGNORE INTO seen_ids VALUES (?)", (example_id,)).rowcount == 0:
            self.counts["duplicateExampleIdRows"] += 1

        ordinal = source.get("rowOrdinal")
        if isinstance(ordinal, bool) or not isinstance(ordinal, int) or ordinal < 1:
            self.counts["invalidSourceOrdinalRows"] += 1
        elif self.connection.execute("INSERT OR IGNORE INTO seen_ordinals VALUES (?)", (ordinal,)).rowcount == 0:
            self.counts["duplicateSourceOrdinalRows"] += 1

        split = row.get("split")
        if split not in {"train", "calibration", "test"}:
            self.counts["invalidSplitRows"] += 1
            split = "__invalid__"
        self.splits[split] += 1

        group_hash = row.get("splitGroup")
        source_group_hash = source.get("normalizedTextGroupSha256")
        if not isinstance(group_hash, str) or not HASH_RE.fullmatch(group_hash):
            self.counts["invalidSplitGroupRows"] += 1
        if group_hash != source_group_hash:
            self.counts["splitGroupProvenanceMismatchRows"] += 1
        elif isinstance(group_hash, str) and HASH_RE.fullmatch(group_hash):
            existing = self.connection.execute(
                "SELECT split FROM split_groups WHERE value = ?", (group_hash,)
            ).fetchone()
            if existing is None:
                self.connection.execute(
                    "INSERT INTO split_groups VALUES (?, ?, 1, 0)", (group_hash, split)
                )
            else:
                conflict = int(existing[0] != split)
                self.connection.execute(
                    "UPDATE split_groups SET rows = rows + 1, conflict = MAX(conflict, ?) WHERE value = ?",
                    (conflict, group_hash),
                )

        state = row.get("state")
        if not isinstance(state, str) or not state.strip():
            self.counts["missingStateRows"] += 1
        else:
            if CONTACT_RE.search(state):
                self.counts["residualContactPatternRows"] += 1
        if not isinstance(row.get("typedDecisions"), dict):
            self.counts["missingTypedDecisionObjects"] += 1
        decisions = row.get("typedDecisions") if isinstance(row.get("typedDecisions"), dict) else {}
        required_decisions = {"offer_category", "offer_property_kind", "offer_transaction_type"}
        if set(decisions) != required_decisions:
            self.counts["decisionShapeMismatchRows"] += 1
        for name in required_decisions:
            decision = decisions.get(name)
            value = decision.get("value") if isinstance(decision, dict) else None
            if not isinstance(value, str) or not value.strip():
                self.counts[f"missingDecision:{name}"] += 1
                continue
            if name == "offer_category":
                self.categories[value] += 1
                if value not in self.allowed_categories:
                    self.counts["categoryOutsideManifestRows"] += 1
            elif name == "offer_property_kind":
                self.property_kinds[value] += 1
            else:
                self.transaction_types[value] += 1

        location = row.get("offerLocation") if isinstance(row.get("offerLocation"), dict) else {}
        source_city = location.get("sourceCitySlug")
        app_city = location.get("appCitySlug")
        if isinstance(source_city, str) and source_city:
            self.source_cities.add(source_city)
        if isinstance(app_city, str) and app_city:
            self.app_cities.add(app_city)
            self.app_city_rows_by_slug[app_city] += 1
            catalog_city_id = resolve_catalog_city_id(app_city, self.catalogs)
            if catalog_city_id:
                self.app_cities_mapped.add(catalog_city_id)
                self.app_city_catalog_by_slug[app_city] = catalog_city_id
                self.counts["mappedAppCityRows"] += 1
            else:
                self.counts["appCityMissingFromCatalogRows"] += 1
                self.app_cities_without_catalog_rows[app_city] += 1
        else:
            self.counts["missingAppCityRows"] += 1

        source_neighborhood = location.get("sourceNeighborhoodSlug")
        if isinstance(source_city, str) and source_city and isinstance(source_neighborhood, str) and source_neighborhood:
            self.connection.execute(
                "INSERT OR IGNORE INTO source_neighborhoods VALUES (?, ?)",
                (source_city, source_neighborhood),
            )

        match_kind = location.get("neighborhoodMatch")
        self.match_kinds[str(match_kind or "missing")] += 1
        app_neighborhood = location.get("appNeighborhoodId")
        app_neighborhood_name = location.get("appNeighborhoodName")
        if isinstance(app_neighborhood, str) and app_neighborhood:
            resolved_city_id = self.app_city_catalog_by_slug.get(app_city) if isinstance(app_city, str) else None
            city_catalog = self.catalogs.get(resolved_city_id) if resolved_city_id else None
            canonical_name = city_catalog.get(app_neighborhood) if city_catalog else None
            if city_catalog is None:
                self.counts["mappedNeighborhoodRowsWithoutCityCatalog"] += 1
            elif canonical_name is None:
                self.counts["mappedNeighborhoodIdsMissingFromCityCatalog"] += 1
            else:
                self.connection.execute(
                    "INSERT OR IGNORE INTO app_neighborhoods VALUES (?, ?)",
                    (resolved_city_id, app_neighborhood),
                )
                self.counts["mappedNeighborhoodRows"] += 1
                if not isinstance(app_neighborhood_name, str) or normalize_place_name(app_neighborhood_name) != normalize_place_name(canonical_name):
                    self.counts["mappedNeighborhoodNameMismatchRows"] += 1
        elif app_neighborhood_name not in (None, ""):
            self.counts["neighborhoodNameWithoutMappedIdRows"] += 1

        source_use = row.get("sourceUse") if isinstance(row.get("sourceUse"), dict) else {}
        privacy = row.get("privacy") if isinstance(row.get("privacy"), dict) else {}
        if source_use.get("cloudTransferAllowed") is not False or privacy.get("transferAllowed") is not False:
            self.counts["transferPolicyViolationRows"] += 1
        redactions = privacy.get("contactPatternRedactions")
        if isinstance(redactions, int) and not isinstance(redactions, bool) and redactions >= 0:
            self.counts["declaredContactRedactions"] += redactions
        else:
            self.counts["invalidContactRedactionCountRows"] += 1

        excluded = row.get("excludedFromSeekerIntent")
        if not isinstance(excluded, list) or not excluded:
            self.counts["missingOfferToNeedSeparationMetadataRows"] += 1

    def finish(self, expected_rows: int | None = None, malformed_rows: int = 0) -> dict[str, Any]:
        self.connection.commit()
        duplicate_text_groups = self.connection.execute(
            "SELECT COUNT(*) FROM split_groups WHERE rows > 1"
        ).fetchone()[0]
        duplicate_text_rows = self.connection.execute(
            "SELECT COALESCE(SUM(rows - 1), 0) FROM split_groups WHERE rows > 1"
        ).fetchone()[0]
        split_leak_groups = self.connection.execute(
            "SELECT COUNT(*) FROM split_groups WHERE conflict > 0"
        ).fetchone()[0]
        mapped_neighborhood_pairs = self.connection.execute(
            "SELECT COUNT(*) FROM app_neighborhoods"
        ).fetchone()[0]
        source_neighborhood_pairs = self.connection.execute(
            "SELECT COUNT(*) FROM source_neighborhoods"
        ).fetchone()[0]
        rows = self.counts["rowsParsed"] + malformed_rows
        findings = {key: value for key, value in sorted(self.counts.items()) if value}
        return {
            "schemaVersion": 1,
            "kind": "divar-offer-facts-row-quality-audit",
            "capturedAt": datetime.now(timezone.utc).isoformat(),
            "grain": "one normalized seller/agent offer fact row; not a seeker need",
            "rows": {
                "expectedRetainedFacts": expected_rows,
                "linesRead": rows,
                "rowsParsed": self.counts["rowsParsed"],
                "malformedJsonRows": malformed_rows,
                "rowCountMatchesManifest": expected_rows is None or rows == expected_rows,
                "duplicateExampleIdRows": self.counts["duplicateExampleIdRows"],
                "duplicateSourceOrdinalRows": self.counts["duplicateSourceOrdinalRows"],
                "duplicateNormalizedTextGroups": duplicate_text_groups,
                "duplicateRowsBeyondFirstTextGroup": duplicate_text_rows,
                "textGroupsAcrossSplits": split_leak_groups,
                "splitCounts": dict(sorted(self.splits.items())),
            },
            "referenceCoverage": {
                "sourceCityCount": len(self.source_cities),
                "appCitySlugCount": len(self.app_cities),
                "appCitiesMappedToCatalog": len(self.app_cities_mapped),
                "validAppCityCatalogs": len(self.catalogs),
                "shareOfAppCatalogsRepresentedPct": percent(len(self.app_cities_mapped), len(self.catalogs)),
                "rowsWithMappedAppCity": self.counts["mappedAppCityRows"],
                "shareOfParsedRowsWithMappedAppCityPct": percent(self.counts["mappedAppCityRows"], self.counts["rowsParsed"]),
                "invalidAppCityCatalogFilesOrRows": self.invalid_catalogs,
                "citySlugsWithoutNeighborhoodCatalog": dict(sorted(self.app_cities_without_catalog_rows.items())),
                "citySlugToCatalogIdFallbacks": {
                    slug: catalog_id
                    for slug, catalog_id in sorted(self.app_city_catalog_by_slug.items())
                    if slug != catalog_id
                },
                "distinctSourceCityNeighborhoodPairs": source_neighborhood_pairs,
                "distinctMappedAppCityNeighborhoodPairs": mapped_neighborhood_pairs,
                "mappedNeighborhoodRows": self.counts["mappedNeighborhoodRows"],
                "shareOfParsedRowsWithMappedNeighborhoodPct": percent(self.counts["mappedNeighborhoodRows"], self.counts["rowsParsed"]),
                "mappedNeighborhoodRowsWithoutCityCatalog": self.counts["mappedNeighborhoodRowsWithoutCityCatalog"],
                "mappedNeighborhoodIdsMissingFromCityCatalog": self.counts["mappedNeighborhoodIdsMissingFromCityCatalog"],
                "categoryCounts": dict(sorted(self.categories.items())),
                "propertyKindCounts": dict(sorted(self.property_kinds.items())),
                "transactionTypeCounts": dict(sorted(self.transaction_types.items())),
                "neighborhoodMatchKindCounts": dict(sorted(self.match_kinds.items())),
            },
            "privacyAndProvenance": {
                "declaredContactRedactions": self.counts["declaredContactRedactions"],
                "rowsWithResidualContactPatterns": self.counts["residualContactPatternRows"],
                "transferPolicyViolationRows": self.counts["transferPolicyViolationRows"],
                "sourceRowsNotMarkedAsSellerOfferFacts": self.counts["unexpectedPerspectiveRows"],
                "rowsIncorrectlyClaimedAsRealNeedGroundTruth": self.counts["incorrectlyClaimedNeedGroundTruthRows"],
                "individualRightsAndPrivacyReview": "pending; regex scan is not comprehensive",
                "trainingForRealSeekerNeedsAllowed": False,
            },
            "findings": findings,
            "qualityGates": {
                "manifestRowCountMatches": expected_rows is None or rows == expected_rows,
                "noMalformedJson": malformed_rows == 0,
                "noDuplicateExampleIds": self.counts["duplicateExampleIdRows"] == 0,
                "noDuplicateSourceOrdinals": self.counts["duplicateSourceOrdinalRows"] == 0,
                "noTextSplitLeakage": split_leak_groups == 0,
                "allNeighborhoodRowsHaveAResolvedCityCatalog": self.counts["mappedNeighborhoodRowsWithoutCityCatalog"] == 0,
                "allMappedNeighborhoodIdsBelongToCityCatalog": self.counts["mappedNeighborhoodIdsMissingFromCityCatalog"] == 0,
                "allNeighborhoodNamesMatchMappedIds": self.counts["mappedNeighborhoodNameMismatchRows"] == 0,
                "allRowsRemainExplicitlyNotRealNeedGroundTruth": self.counts["incorrectlyClaimedNeedGroundTruthRows"] == 0,
                "allRowsRemainLocalOnly": self.counts["transferPolicyViolationRows"] == 0,
                "eligibleForRealNeedFineTuning": False,
            },
            "outputPolicy": "Aggregate counts only. No seller text, titles, source IDs, phone numbers, names, or per-row predictions are included.",
        }


def audit_records(
    rows: Iterable[dict[str, Any]],
    catalogs: dict[str, dict[str, str]],
    allowed_categories: set[str],
    expected_rows: int | None = None,
    connection: sqlite3.Connection | None = None,
    expected_dataset_sha256: str | None = None,
) -> dict[str, Any]:
    owns_connection = connection is None
    db = connection or sqlite3.connect(":memory:")
    auditor = FactsAuditor(catalogs, allowed_categories, db, expected_dataset_sha256=expected_dataset_sha256)
    malformed = 0
    for value in rows:
        if not isinstance(value, dict):
            malformed += 1
            auditor.add_malformed()
            continue
        auditor.add(value)
    report = auditor.finish(expected_rows, malformed)
    if owns_connection:
        db.close()
    return report


def audit_file(input_path: Path, manifest_path: Path, catalog_dir: Path, output_path: Path) -> dict[str, Any]:
    manifest = read_json(manifest_path)
    expected_file_sha256: str | None = None
    lineage: dict[str, Any] | None = None
    lineage_input_path: Path | None = None
    expected_lineage_input_sha256: str | None = None
    expected_lineage_input_rows: int | None = None
    expected_changed_location_rows: int | None = None
    if manifest.get("targetTask") == FACTS_TASK:
        facts_manifest = manifest
        expected_rows = facts_manifest.get("outputRows")
        expected_file_sha256 = facts_manifest.get("outputSha256")
        if expected_file_sha256 is not None and (
            not isinstance(expected_file_sha256, str) or not HASH_RE.fullmatch(expected_file_sha256)
        ):
            raise ValueError("The source manifest output SHA-256 is invalid.")
    elif manifest.get("taskType") == "divar-property-offer-facts-neighborhood-reconciled/v1":
        source_input = manifest.get("input") if isinstance(manifest.get("input"), dict) else {}
        output_quality = manifest.get("qualityAndUse") if isinstance(manifest.get("qualityAndUse"), dict) else {}
        source_meta = manifest.get("source") if isinstance(manifest.get("source"), dict) else {}
        if source_input.get("taskType") != FACTS_TASK:
            raise ValueError("The reconciliation manifest does not point to the pinned Divar facts task.")
        expected_rows = output_quality.get("outputRows")
        expected_file_sha256 = output_quality.get("outputSha256")
        source_facts_path = Path(str(source_input.get("path", ""))).resolve(strict=True)
        lineage_input_path = source_facts_path
        source_facts_manifest_path = Path(str(source_facts_path) + ".manifest.json").resolve(strict=True)
        try:
            source_facts_path.relative_to(ROOT)
            source_facts_manifest_path.relative_to(ROOT)
        except ValueError as exc:
            raise ValueError("The reconciled facts lineage must remain inside the repository.") from exc
        facts_manifest = read_json(source_facts_manifest_path)
        if facts_manifest.get("targetTask") != FACTS_TASK:
            raise ValueError("The reconciliation input manifest is not a pinned Divar facts manifest.")
        source_output_sha = facts_manifest.get("outputSha256")
        if (
            source_input.get("rows") != facts_manifest.get("outputRows")
            or source_input.get("bytes") != source_facts_path.stat().st_size
            or source_meta.get("snapshotSha256") != facts_manifest.get("datasetSha256")
            or (source_output_sha is not None and source_input.get("sha256") != source_output_sha)
        ):
            raise ValueError("The reconciliation input lineage does not match its source facts manifest.")
        expected_lineage_input_sha256 = source_input.get("sha256")
        expected_lineage_input_rows = source_input.get("rows")
        expected_changed_location_rows = manifest.get("reconciliation", {}).get("newlyMappedRows")
        if (
            not isinstance(expected_lineage_input_sha256, str)
            or not HASH_RE.fullmatch(expected_lineage_input_sha256)
            or not isinstance(expected_lineage_input_rows, int)
            or expected_lineage_input_rows < 1
            or not isinstance(expected_changed_location_rows, int)
            or expected_changed_location_rows < 0
        ):
            raise ValueError("The reconciliation manifest has incomplete row-level lineage metadata.")
        if manifest.get("reconciliation", {}).get("nonLocationFieldsChanged") != 0:
            raise ValueError("The reconciliation manifest does not guarantee location-only changes.")
        lineage = {
            "kind": manifest["taskType"],
            "sourceFactsManifestPath": str(source_facts_manifest_path.relative_to(ROOT)),
            "sourceFactsManifestSha256": hashlib.sha256(source_facts_manifest_path.read_bytes()).hexdigest(),
            "sourceFactsSha256": source_input.get("sha256"),
            "reconciledRows": expected_rows,
            "newlyMappedRows": manifest.get("reconciliation", {}).get("newlyMappedRows"),
            "nonLocationFieldsChanged": 0,
        }
    else:
        raise ValueError("The source manifest does not describe a pinned Divar offer-facts artifact.")

    if not isinstance(expected_rows, int) or expected_rows < 1:
        raise ValueError("The source manifest has no valid retained row count.")
    if expected_file_sha256 is not None and (
        not isinstance(expected_file_sha256, str) or not HASH_RE.fullmatch(expected_file_sha256)
    ):
        raise ValueError("The source manifest has no valid output SHA-256.")
    allowed_categories = set((facts_manifest.get("categoryCounts") or {}).keys())
    catalogs, invalid_catalogs = load_city_catalogs(catalog_dir)
    if not catalogs:
        raise ValueError("No valid app city catalogs were loaded.")

    output_path = output_path.resolve()
    input_path = input_path.resolve(strict=True)
    manifest_path = manifest_path.resolve(strict=True)
    for source_path in (input_path, manifest_path, catalog_dir.resolve(strict=True)):
        try:
            source_path.relative_to(ROOT)
        except ValueError as exc:
            raise ValueError("Audit inputs must remain inside the repository.") from exc
    for protected in (input_path, manifest_path):
        if output_path == protected:
            raise ValueError("Audit report output must not overwrite an input artifact.")
    if output_path.exists():
        raise FileExistsError("Refusing to overwrite an existing aggregate audit report.")
    output_path.parent.mkdir(parents=True, exist_ok=True)

    file_digest = hashlib.sha256()
    source_file_digest = hashlib.sha256()
    lines_read = 0
    malformed = 0
    source_lines_read = 0
    malformed_source_rows = 0
    non_location_changed_rows = 0
    unexpected_location_changed_rows = 0
    changed_location_rows = 0
    with tempfile.TemporaryDirectory(prefix="niaz-divar-row-audit-") as temporary_dir:
        database = Path(temporary_dir) / "keys.sqlite3"
        connection = sqlite3.connect(database)
        connection.execute("PRAGMA journal_mode = OFF")
        connection.execute("PRAGMA synchronous = OFF")
        auditor = FactsAuditor(
            catalogs,
            allowed_categories,
            connection,
            invalid_catalogs,
            facts_manifest.get("datasetSha256"),
        )
        try:
            with input_path.open("rb") as stream, (
                lineage_input_path.open("rb") if lineage_input_path is not None else open(os.devnull, "rb")
            ) as source_stream:
                for lines_read, raw_line in enumerate(stream, start=1):
                    file_digest.update(raw_line)
                    source_row: dict[str, Any] | None = None
                    if lineage_input_path is not None:
                        source_raw_line = source_stream.readline()
                        if not source_raw_line:
                            malformed_source_rows += 1
                        else:
                            source_lines_read += 1
                            source_file_digest.update(source_raw_line)
                            try:
                                parsed_source_row = json.loads(source_raw_line)
                            except (UnicodeDecodeError, json.JSONDecodeError):
                                malformed_source_rows += 1
                            else:
                                if isinstance(parsed_source_row, dict):
                                    source_row = parsed_source_row
                                else:
                                    malformed_source_rows += 1
                    try:
                        row = json.loads(raw_line)
                    except (UnicodeDecodeError, json.JSONDecodeError):
                        malformed += 1
                        auditor.add_malformed()
                        continue
                    if not isinstance(row, dict):
                        malformed += 1
                        auditor.add_malformed()
                        continue
                    auditor.add(row)
                    if source_row is not None:
                        non_location_unchanged, allowed_location_change = compare_location_reconciliation(
                            source_row, row
                        )
                        if not non_location_unchanged:
                            non_location_changed_rows += 1
                        if not allowed_location_change:
                            unexpected_location_changed_rows += 1
                        if source_row.get("offerLocation") != row.get("offerLocation"):
                            changed_location_rows += 1
                    if lines_read % 100_000 == 0:
                        connection.commit()
                        print(f"processed_rows={lines_read}", flush=True)
                if lineage_input_path is not None:
                    for source_raw_line in source_stream:
                        source_lines_read += 1
                        source_file_digest.update(source_raw_line)
            report = auditor.finish(expected_rows, malformed)
        finally:
            connection.close()

    report["input"] = {
        "path": str(input_path.relative_to(ROOT)),
        "bytes": input_path.stat().st_size,
        "sha256": file_digest.hexdigest(),
        "manifestPath": str(manifest_path.relative_to(ROOT)),
        "manifestDatasetSha256": facts_manifest.get("datasetSha256"),
        "manifestOutputSha256": expected_file_sha256,
        "outputSha256MatchesManifest": (
            file_digest.hexdigest() == expected_file_sha256 if expected_file_sha256 is not None else None
        ),
        "sourceRowsInOriginalDivarSnapshot": facts_manifest.get("sourceRowsRead"),
    }
    report["qualityGates"]["inputSha256MatchesManifest"] = (
        file_digest.hexdigest() == expected_file_sha256 if expected_file_sha256 is not None else None
    )
    if lineage is not None:
        source_hash_matches = source_file_digest.hexdigest() == expected_lineage_input_sha256
        source_rows_match = source_lines_read == expected_lineage_input_rows == lines_read
        location_changes_match_manifest = changed_location_rows == expected_changed_location_rows
        report["qualityGates"].update({
            "sourceFactsHashMatchesReconciliationManifest": source_hash_matches,
            "sourceFactsRowCountMatchesReconciliationManifest": source_rows_match,
            "sourceFactsRowsAreValidJsonObjects": malformed_source_rows == 0,
            "nonLocationFieldsUnchangedFromSource": non_location_changed_rows == 0,
            "onlyAllowedLocationFieldsChanged": unexpected_location_changed_rows == 0,
            "locationChangedRowsMatchManifest": location_changes_match_manifest,
        })
        report["findings"].update({
            key: value
            for key, value in {
                "malformedSourceRows": malformed_source_rows,
                "nonLocationChangedRows": non_location_changed_rows,
                "unexpectedLocationChangedRows": unexpected_location_changed_rows,
                "locationChangedRows": changed_location_rows,
            }.items()
            if value
        })
        report["lineage"] = {**lineage, **{
            "sourceFactsSha256Observed": source_file_digest.hexdigest(),
            "sourceFactsSha256MatchesManifest": source_hash_matches,
            "sourceFactsRowsObserved": source_lines_read,
            "sourceFactsRowCountMatchesManifest": source_rows_match,
            "newlyMappedRowsObserved": changed_location_rows,
            "locationChangedRowsMatchManifest": location_changes_match_manifest,
            "nonLocationChangedRowsObserved": non_location_changed_rows,
            "unexpectedLocationChangedRowsObserved": unexpected_location_changed_rows,
            "malformedSourceRows": malformed_source_rows,
        }}
    report["status"] = (
        "complete"
        if report["qualityGates"]["manifestRowCountMatches"]
        and report["qualityGates"]["inputSha256MatchesManifest"] is not False
        and all(report["qualityGates"].get(key, True) for key in (
            "sourceFactsHashMatchesReconciliationManifest",
            "sourceFactsRowCountMatchesReconciliationManifest",
            "sourceFactsRowsAreValidJsonObjects",
            "nonLocationFieldsUnchangedFromSource",
            "onlyAllowedLocationFieldsChanged",
            "locationChangedRowsMatchManifest",
        ))
        and malformed == 0
        and malformed_source_rows == 0
        else "complete_with_findings"
    )
    temporary_output = output_path.with_name(output_path.name + ".tmp")
    temporary_output.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    temporary_output.replace(output_path)
    return report


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--input", type=Path, default=DEFAULT_INPUT)
    parser.add_argument("--manifest", type=Path, default=DEFAULT_MANIFEST)
    parser.add_argument("--catalog-dir", type=Path, default=DEFAULT_CATALOGS)
    parser.add_argument(
        "--output",
        type=Path,
        default=ROOT / "data/divar/divar-property-offer-facts-v4-row-quality-audit-2026-09-28-r2.json",
    )
    args = parser.parse_args()
    report = audit_file(args.input, args.manifest, args.catalog_dir, args.output)
    print(json.dumps({
        "status": report["status"],
        "linesRead": report["rows"]["linesRead"],
        "rowsParsed": report["rows"]["rowsParsed"],
        "manifestRowCountMatches": report["rows"]["rowCountMatchesManifest"],
        "inputSha256": report["input"]["sha256"],
        "reportPath": str(args.output),
        "findings": report["findings"],
    }, ensure_ascii=False), flush=True)
    return 0 if report["status"] == "complete" else 2


if __name__ == "__main__":
    raise SystemExit(main())
