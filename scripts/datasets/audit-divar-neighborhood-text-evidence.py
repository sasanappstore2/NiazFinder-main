#!/usr/bin/env python3
"""Audit when Divar's mapped neighborhood label is actually stated in its text.

This emits aggregate-only evidence. It does not create training data and does
not reinterpret seller/agent offers as seeker intent.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import re
import unicodedata
from collections import Counter
from pathlib import Path
from typing import Any, Iterator


ROOT = Path(__file__).resolve().parents[2]
DEFAULT_INPUT = ROOT / "data/divar/divar-property-offer-facts-v3-exact-city-aliases-2026-09-28.jsonl"
DEFAULT_MANIFEST = ROOT / "data/divar/divar-property-offer-facts-v3-exact-city-aliases-2026-09-28.jsonl.manifest.json"

_DIGITS = str.maketrans(
    "۰۱۲۳۴۵۶۷۸۹٠١٢٣٤٥٦٧٨٩", "01234567890123456789"
)
_LETTERS = str.maketrans({"ي": "ی", "ى": "ی", "ك": "ک", "ۀ": "ه", "ة": "ه"})
_TATWEEL = "ـ"


def normalize_location_text(value: str) -> str:
    """Normalize Persian orthography while retaining token boundaries."""
    text = unicodedata.normalize("NFKC", value).translate(_DIGITS).translate(_LETTERS)
    text = text.replace("\u200c", " ").replace("\u200d", " ").replace(_TATWEEL, "")
    text = "".join(char for char in text if unicodedata.category(char) != "Mn")
    return re.sub(r"\s+", " ", text).strip().casefold()


def neighborhood_pattern(name: str) -> re.Pattern[str] | None:
    normalized = normalize_location_text(name)
    compact = re.sub(r"[^\w]", "", normalized, flags=re.UNICODE)
    if len(compact) < 3:
        return None

    flexible_compact = r"(?:[\s-]*)".join(re.escape(char) for char in compact)
    alternatives = f"{re.escape(normalized)}|{flexible_compact}"
    return re.compile(rf"(?<!\w)(?:{alternatives})(?!\w)", re.UNICODE)


def iter_jsonl(path: Path) -> Iterator[dict[str, Any]]:
    with path.open(encoding="utf-8") as stream:
        for line_number, line in enumerate(stream, 1):
            if not line.strip():
                continue
            try:
                value = json.loads(line)
            except json.JSONDecodeError as exc:
                raise ValueError(f"Invalid JSON on line {line_number}.") from exc
            if not isinstance(value, dict):
                raise ValueError(f"Expected an object on line {line_number}.")
            yield value


def audit_rows(rows: Iterator[dict[str, Any]], input_sha256: str | None = None) -> dict[str, Any]:
    match_kinds = ("exact_official_crosswalk", "legacy_suffix_alias")
    totals: Counter[str] = Counter()
    by_city: dict[str, Counter[str]] = {}
    group_labels: dict[str, tuple[str, str, str]] = {}
    group_splits: dict[str, str] = {}
    group_match_kinds: dict[str, set[str]] = {}
    conflicting_groups: set[str] = set()
    cross_split_groups: set[str] = set()

    for row in rows:
        totals["rowsRead"] += 1
        location = row.get("offerLocation")
        if not isinstance(location, dict):
            continue
        match_kind = location.get("neighborhoodMatch")
        if match_kind not in match_kinds:
            continue
        city = location.get("appCitySlug")
        neighborhood_id = location.get("appNeighborhoodId")
        neighborhood_name = location.get("appNeighborhoodName")
        state = row.get("state")
        if not all(isinstance(value, str) and value.strip() for value in (city, neighborhood_id, neighborhood_name, state)):
            continue

        totals["mappedRows"] += 1
        totals[f"mapped:{match_kind}"] += 1
        city_counts = by_city.setdefault(city, Counter())
        city_counts["mappedRows"] += 1
        city_counts[f"mapped:{match_kind}"] += 1

        pattern = neighborhood_pattern(neighborhood_name)
        if pattern is None or pattern.search(normalize_location_text(state)) is None:
            continue

        totals["rowsWithCatalogLabelMention"] += 1
        totals[f"mentions:{match_kind}"] += 1
        city_counts["rowsWithCatalogLabelMention"] += 1
        city_counts[f"mentions:{match_kind}"] += 1
        if isinstance(row.get("typedDecisions"), dict):
            category = row["typedDecisions"].get("offer_category", {}).get("value")
            if isinstance(category, str):
                totals[f"category:{match_kind}:{category}"] += 1

        source = row.get("source") if isinstance(row.get("source"), dict) else {}
        group = source.get("normalizedTextGroupSha256")
        split = row.get("split")
        if not isinstance(group, str) or not group:
            group = str(row.get("exampleId") or "")
        if not group:
            continue

        if isinstance(split, str):
            prior_split = group_splits.get(group)
            if prior_split is not None and prior_split != split:
                cross_split_groups.add(group)
            else:
                group_splits[group] = split

        label = (city, neighborhood_id, neighborhood_name)
        prior = group_labels.get(group)
        if prior is not None and prior != label:
            conflicting_groups.add(group)
            continue
        group_labels[group] = label
        group_match_kinds.setdefault(group, set()).add(match_kind)

    unique_groups = len(group_labels)
    city_summary = {
        city: {
            "mappedRows": counts["mappedRows"],
            "mappedRowsByMatchKind": {
                match_kind: counts[f"mapped:{match_kind}"] for match_kind in match_kinds
            },
            "rowsWithExactGeoLabelMention": counts["mentions:exact_official_crosswalk"],
            "rowsWithLegacyAliasLabelMention": counts["mentions:legacy_suffix_alias"],
            "rowsWithCatalogLabelMention": counts["rowsWithCatalogLabelMention"],
            "mentionRatePctByMatchKind": {
                match_kind: round(
                    100 * counts[f"mentions:{match_kind}"] / counts[f"mapped:{match_kind}"], 2
                ) if counts[f"mapped:{match_kind}"] else None
                for match_kind in match_kinds
            },
        }
        for city, counts in sorted(by_city.items())
    }
    exact_category_counts = {
        key.removeprefix("category:exact_official_crosswalk:"): value
        for key, value in sorted(totals.items())
        if key.startswith("category:exact_official_crosswalk:")
    }
    mention_counts_by_kind = {
        match_kind: {
            "mappedRows": totals[f"mapped:{match_kind}"],
            "rowsWithCatalogLabelMention": totals[f"mentions:{match_kind}"],
            "mentionRatePct": round(
                100 * totals[f"mentions:{match_kind}"] / totals[f"mapped:{match_kind}"], 2
            ) if totals[f"mapped:{match_kind}"] else None,
            "uniqueMentionedTextGroups": sum(
                match_kind in kinds for kinds in group_match_kinds.values()
            ),
        }
        for match_kind in match_kinds
    }
    return {
        "schemaVersion": 2,
        "artifactType": "divar-neighborhood-text-evidence-audit-aggregate-only",
        "sourcePerspective": "seller_or_agent_supply_offer",
        "isSeekerNeedGroundTruth": False,
        "trainingEligible": False,
        "rowsRead": totals["rowsRead"],
        "inputSha256": input_sha256,
        "mappedRows": totals["mappedRows"],
        "mappedRowsByMatchKind": {
            match_kind: totals[f"mapped:{match_kind}"] for match_kind in match_kinds
        },
        "rowsWithExactGeoLabelMention": totals["mentions:exact_official_crosswalk"],
        "exactMentionRatePct": mention_counts_by_kind["exact_official_crosswalk"]["mentionRatePct"],
        "legacyAliasMappedRows": totals["mapped:legacy_suffix_alias"],
        "rowsWithLegacyAliasLabelMention": totals["mentions:legacy_suffix_alias"],
        "legacyAliasMentionRatePct": mention_counts_by_kind["legacy_suffix_alias"]["mentionRatePct"],
        "rowsWithCatalogLabelMention": totals["rowsWithCatalogLabelMention"],
        "catalogLabelMentionRatePct": round(
            100 * totals["rowsWithCatalogLabelMention"] / totals["mappedRows"], 2
        ) if totals["mappedRows"] else None,
        "mentionEvidenceByMatchKind": mention_counts_by_kind,
        "uniqueMentionedTextGroups": unique_groups,
        "conflictingMentionedTextGroups": len(conflicting_groups),
        "crossSplitMentionedTextGroups": len(cross_split_groups),
        "rowsWithExactGeoLabelMentionByCategory": exact_category_counts,
        "byCity": city_summary,
        "method": {
            "match": "city-scoped official app neighborhood name, Persian-normalized exact phrase with token boundaries; compact spelling is also accepted",
            "inference": "none",
            "falseMatchReview": "not human reviewed; mention is evidence of text presence, not proof that the listing's geotag is correct",
            "matchKindPolicy": "exact_official_crosswalk and legacy_suffix_alias are counted separately; a legacy alias is not upgraded to an exact current-name match",
            "excluded": "unmapped neighborhoods, names shorter than 3 normalized characters, and any claims about seeker intent",
        },
    }


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--input", type=Path, default=DEFAULT_INPUT)
    parser.add_argument("--manifest", type=Path, default=DEFAULT_MANIFEST)
    parser.add_argument("--output", type=Path)
    args = parser.parse_args()

    source_manifest = json.loads(args.manifest.read_text(encoding="utf-8"))
    if (
        source_manifest.get("targetTask") != "divar-property-offer-facts/v2"
        or source_manifest.get("dataset") != "divarofficial/real_estate_ads"
        or not isinstance(source_manifest.get("outputRows"), int)
        or not isinstance(source_manifest.get("datasetSha256"), str)
    ):
        raise SystemExit("The source manifest is not the expected Divar facts artifact.")

    digest = hashlib.sha256()
    with args.input.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(chunk)
    actual_sha = digest.hexdigest()

    result = audit_rows(iter_jsonl(args.input), actual_sha)
    if (
        result["rowsRead"] != source_manifest.get("outputRows")
        or result["mappedRows"] != source_manifest.get("rowsWithMappedAppNeighborhood")
    ):
        raise SystemExit("Audited row or mapped-neighborhood count differs from the source manifest.")
    serialized = json.dumps(result, ensure_ascii=False, indent=2) + "\n"
    if args.output:
        args.output.parent.mkdir(parents=True, exist_ok=True)
        temporary = args.output.with_suffix(args.output.suffix + ".tmp")
        temporary.write_text(serialized, encoding="utf-8")
        temporary.replace(args.output)
    print(serialized, end="")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
