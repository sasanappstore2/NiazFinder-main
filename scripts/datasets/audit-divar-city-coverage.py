#!/usr/bin/env python3
"""Audit raw Divar city coverage against the current NiazFinder catalogs."""

from __future__ import annotations

import argparse
import csv
import json
import sys
from collections import Counter
from pathlib import Path
from typing import TextIO

sys.path.insert(0, str(Path(__file__).resolve().parent))
from divar_laya_corpus import _source_city_map


ROOT = Path(__file__).resolve().parents[2]
DEFAULT_SOURCE = ROOT / "data/divar/real_estate_ads.csv"
DEFAULT_CITY_MAP = ROOT / "src/data/neighborhoods/divar-city-map.json"
DEFAULT_MANUAL_CITY_MAP = ROOT / "src/data/neighborhoods/divar-city-map.manual.json"
DEFAULT_CATALOG_DIR = ROOT / "src/data/neighborhoods/catalog"
DEFAULT_DIVAR_CITY_ID_MAP = ROOT / "data/divar/city-id-map.json"
DEFAULT_LOCATION_TREE = ROOT / "data/divar/divar-location-tree.json"


def summarize_city_counts(city_counts: Counter[str], city_map: dict[str, str]) -> dict[str, object]:
    nonempty = {slug: count for slug, count in city_counts.items() if slug}
    mapped = {slug: count for slug, count in nonempty.items() if slug in city_map}
    unmapped = {slug: count for slug, count in nonempty.items() if slug not in city_map}
    total_rows = sum(city_counts.values())
    mapped_rows = sum(mapped.values())
    source_city_count = len(nonempty)

    return {
        "grain": "raw Divar offer row; city coverage is based on city_slug",
        "sourceRows": total_rows,
        "rowsWithoutCitySlug": city_counts.get("", 0),
        "distinctNonemptySourceCities": source_city_count,
        "mappedSourceCities": len(mapped),
        "unmappedSourceCities": len(unmapped),
        "sourceCityIdentityCoveragePct": round(len(mapped) / source_city_count * 100, 2)
        if source_city_count
        else None,
        "mappedOfferRows": mapped_rows,
        "unmappedOfferRows": sum(unmapped.values()),
        "mappedOfferRowCoveragePct": round(mapped_rows / total_rows * 100, 2)
        if total_rows
        else None,
        "unmappedCities": [
            {"sourceCitySlug": slug, "rawRows": count}
            for slug, count in sorted(unmapped.items(), key=lambda item: (-item[1], item[0]))
        ],
    }


def audit_source_city_coverage(
    source_path: Path,
    city_map: dict[str, str],
) -> dict[str, object]:
    counts: Counter[str] = Counter()
    with source_path.open("r", encoding="utf-8-sig", newline="") as source_file:
        reader = csv.DictReader(source_file)
        if not reader.fieldnames or "city_slug" not in reader.fieldnames:
            raise ValueError("Source CSV must have a city_slug column")
        for row in reader:
            counts[(row.get("city_slug") or "").strip()] += 1
    return summarize_city_counts(counts, city_map)


def build_report(args: argparse.Namespace) -> dict[str, object]:
    city_map = _source_city_map(
        args.city_map,
        manual_path=args.manual_city_map,
        catalog_dir=args.catalog_dir,
        divar_city_id_map_path=args.divar_city_id_map,
        divar_location_tree_path=args.location_tree,
    )
    report = audit_source_city_coverage(args.source, city_map)
    report["mappingPolicy"] = (
        "Unique verified Divar slug/ID and location-tree identity; prefer an exact official catalog slug, "
        "otherwise require one globally unique exact normalized Persian city-name match. "
        "Ambiguous names and name conflicts remain unresolved; no fuzzy matching."
    )
    return report


def main(argv: list[str] | None = None, stdout: TextIO | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source", type=Path, default=DEFAULT_SOURCE)
    parser.add_argument("--city-map", type=Path, default=DEFAULT_CITY_MAP)
    parser.add_argument("--manual-city-map", type=Path, default=DEFAULT_MANUAL_CITY_MAP)
    parser.add_argument("--catalog-dir", type=Path, default=DEFAULT_CATALOG_DIR)
    parser.add_argument("--divar-city-id-map", type=Path, default=DEFAULT_DIVAR_CITY_ID_MAP)
    parser.add_argument("--location-tree", type=Path, default=DEFAULT_LOCATION_TREE)
    args = parser.parse_args(argv)
    output = stdout or sys.stdout
    json.dump(build_report(args), output, ensure_ascii=False, indent=2)
    output.write("\n")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
