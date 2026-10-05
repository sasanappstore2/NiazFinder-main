#!/usr/bin/env python3
"""Reconcile exact Divar→app neighborhood rows before/after corpus eligibility.

Only aggregate counts are printed. Listing text is normalized in memory to
recreate the corpus dedup/conflict keys; it is never emitted or persisted by
this audit. The temporary SQLite index is deleted on exit.
"""

from __future__ import annotations

import argparse
import csv
import importlib.util
import json
import sqlite3
import tempfile
from collections import Counter
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parents[2]
BUILDER_PATH = ROOT / "scripts/datasets/divar_si_corpus.py"
SPEC = importlib.util.spec_from_file_location("divar_si_corpus_audit", BUILDER_PATH)
if SPEC is None or SPEC.loader is None:
    raise RuntimeError("Could not load the pinned Divar corpus rules.")
CORPUS = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(CORPUS)


def reconcile(args: argparse.Namespace) -> dict[str, Any]:
    source_hash = CORPUS._sha256_file(args.input)
    if args.expected_sha256 and source_hash != args.expected_sha256:
        raise ValueError("Input CSV checksum does not match the pinned source snapshot.")

    city_map = CORPUS._source_city_map(
        args.city_map,
        args.manual_city_map,
        args.catalog_dir,
        args.divar_city_id_map,
    )
    neighborhood_map = CORPUS.load_neighborhood_crosswalk(args.neighborhood_crosswalk)
    totals: Counter[str] = Counter()

    with tempfile.TemporaryDirectory(prefix="divar-neighborhood-delta-") as temporary:
        connection = sqlite3.connect(Path(temporary) / "groups.sqlite")
        try:
            CORPUS._init_index(connection)
            indexed = CORPUS._index_rows(args.input, connection, city_map, None)
            lookup = connection.cursor()
            with args.input.open("r", encoding="utf-8-sig", newline="") as stream:
                reader = csv.DictReader(stream)
                required = {"title", "description", "city_slug", "neighborhood_slug", "cat2_slug", "cat3_slug"}
                if not required.issubset(reader.fieldnames or []):
                    raise ValueError("Input CSV lacks columns required by the pinned corpus builder.")

                for row in reader:
                    source_city = (row.get("city_slug") or "").strip()
                    source_neighborhood = (row.get("neighborhood_slug") or "").strip()
                    app_city = city_map.get(source_city)
                    crosswalk = neighborhood_map.get(
                        (source_city.lower(), source_neighborhood.lower())
                    ) if source_city and source_neighborhood else None
                    if not crosswalk:
                        continue
                    if crosswalk["appCitySlug"] != app_city:
                        totals["exactCrosswalkCityMismatchRows"] += 1
                        continue

                    totals["exactCrosswalkRows"] += 1
                    text, _ = CORPUS.normalized_group_text(
                        row.get("title", ""), row.get("description", "")
                    )
                    if not text:
                        totals["exactRowsMissingText"] += 1
                        continue
                    group = lookup.execute(
                        "SELECT row_count, category_conflict, city_conflict FROM groups WHERE group_hash = ?",
                        (CORPUS.digest_text(text),),
                    ).fetchone()
                    if group is None:
                        totals["exactRowsMissingGroup"] += 1
                        continue

                    if group[1] or group[2]:
                        totals["exactRowsConflictSkipped"] += 1
                        totals["exactRowsWithCategoryConflict"] += int(bool(group[1]))
                        totals["exactRowsWithCityConflict"] += int(bool(group[2]))
                        totals["exactRowsWithBothConflicts"] += int(bool(group[1] and group[2]))
                    elif CORPUS.category_slug(row.get("cat2_slug", ""), row.get("cat3_slug", "")) is None:
                        totals["exactRowsUnmappedCategorySkipped"] += 1
                    else:
                        totals["exactRowsRetained"] += 1
        finally:
            connection.close()

    result = {
        "sourceSha256": source_hash,
        "sourceRowsIndexed": indexed[0],
        "crosswalkExactPairs": sum(
            1 for value in neighborhood_map.values() if value.get("appNeighborhoodId")
        ),
        **dict(sorted(totals.items())),
    }
    for key in (
        "exactCrosswalkCityMismatchRows",
        "exactCrosswalkRows",
        "exactRowsConflictSkipped",
        "exactRowsRetained",
        "exactRowsUnmappedCategorySkipped",
        "exactRowsWithBothConflicts",
        "exactRowsWithCategoryConflict",
        "exactRowsWithCityConflict",
        "exactRowsMissingText",
        "exactRowsMissingGroup",
    ):
        result.setdefault(key, 0)
    result["exactRowsExcluded"] = (
        result.get("exactRowsConflictSkipped", 0)
        + result.get("exactRowsUnmappedCategorySkipped", 0)
        + result.get("exactRowsMissingText", 0)
        + result.get("exactRowsMissingGroup", 0)
    )
    result["reconciles"] = (
        result.get("exactCrosswalkRows", 0)
        == result.get("exactRowsRetained", 0) + result["exactRowsExcluded"]
        and result.get("exactCrosswalkCityMismatchRows", 0) == 0
    )
    return result


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--input", type=Path, default=ROOT / "data/divar/real_estate_ads.csv")
    parser.add_argument("--city-map", type=Path, default=ROOT / "src/data/neighborhoods/divar-city-map.json")
    parser.add_argument("--manual-city-map", type=Path, default=ROOT / "src/data/neighborhoods/divar-city-map.manual.json")
    parser.add_argument("--catalog-dir", type=Path, default=ROOT / "src/data/neighborhoods/catalog")
    parser.add_argument("--divar-city-id-map", type=Path, default=ROOT / "data/divar/city-id-map.json")
    parser.add_argument(
        "--neighborhood-crosswalk",
        type=Path,
        default=ROOT / "data/divar/official-neighborhood-app-crosswalk-2026-09-25.json",
    )
    parser.add_argument("--expected-sha256", default=CORPUS.SOURCE_SHA256)
    args = parser.parse_args()
    result = reconcile(args)
    print(json.dumps(result, ensure_ascii=False, indent=2))
    return 0 if result["reconciles"] else 1


if __name__ == "__main__":
    raise SystemExit(main())
