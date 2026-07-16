#!/usr/bin/env python3
"""Harvest MaskanYaban listings across all deal × property-kind cells within a date window."""

from __future__ import annotations

import argparse
import json
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from app.filing_feed.fixture_paths import filing_portals_dir
from app.filing_feed.listing_attribute_schema import ALL_FIELD_KEYS
from app.filing_feed.maskanyaban_filters import maskanyaban_harvest_cells
from app.filing_feed.maskanyaban_portal import LISTINGS_URL, _build_client, crawl_maskanyaban_cell

FIXTURE_ROOT = filing_portals_dir("maskanyaban", "100d-harvest")
META_TRACK_KEYS = ("plotWidth", "landUse", "frontage", "commercialUse")


def _present(value: Any) -> bool:
    if value is None:
        return False
    if isinstance(value, str):
        return bool(value.strip())
    if isinstance(value, (list, tuple, dict)):
        return len(value) > 0
    if isinstance(value, bool):
        return True
    if isinstance(value, (int, float)):
        return True
    return bool(value)


def listing_field_presence(listing: dict[str, Any]) -> dict[str, bool]:
    out: dict[str, bool] = {}
    for key in ALL_FIELD_KEYS:
        out[key] = _present(listing.get(key))
    meta = listing.get("sourceMeta") or {}
    if isinstance(meta, dict):
        for key in META_TRACK_KEYS:
            out[f"sourceMeta.{key}"] = _present(meta.get(key))
    return out


def aggregate_field_rates(rows: list[dict[str, bool]]) -> dict[str, float]:
    if not rows:
        return {}
    keys = rows[0].keys()
    rates: dict[str, float] = {}
    total = len(rows)
    for key in keys:
        filled = sum(1 for row in rows if row.get(key))
        rates[key] = round(filled / total, 4)
    return rates


def harvest_matrix(
    *,
    within_days: int = 100,
    max_per_cell: int = 40,
    max_per_deal_wide: int | None = None,
    max_pages: int = 50,
    detail_delay_ms: int = 350,
    enrich_details: bool = True,
    per_kind: bool = True,
) -> dict[str, Any]:
    deal_wide_cap = max_per_deal_wide if max_per_deal_wide is not None else max(max_per_cell * 3, 120)
    matrix = maskanyaban_harvest_cells(per_kind=per_kind)
    seen_codes: set[str] = set()
    cell_reports: list[dict[str, Any]] = []
    all_listings: list[dict[str, Any]] = []
    presence_rows: list[dict[str, bool]] = []

    with _build_client() as client:
        client.get(LISTINGS_URL)

        for index, cell in enumerate(matrix, start=1):
            cap = deal_wide_cap if cell.property_kind == "all" else max_per_cell
            print(
                f"[harvest] cell {index}/{len(matrix)} {cell.cell_key} "
                f"→ {cell.referer} (within {within_days}d, max {cap})",
                flush=True,
            )
            result = crawl_maskanyaban_cell(
                noe_melk=cell.noe_melk,
                noe_vagozari=cell.noe_vagozari,
                referer=cell.referer,
                max_items=cap,
                max_pages=max_pages,
                within_days=within_days,
                known_external_ids=sorted(seen_codes),
                enrich_details=enrich_details,
            )
            listings = result.get("listings") or []
            cell_presence: list[dict[str, bool]] = []
            for row in listings:
                code = str(row.get("fileCode") or row.get("externalId") or "")
                if code:
                    seen_codes.add(code)
                presence = listing_field_presence(row)
                presence_rows.append(presence)
                cell_presence.append(presence)
                all_listings.append(
                    {
                        "cellKey": cell.cell_key,
                        "dealType": cell.deal_type,
                        "propertyKind": cell.property_kind,
                        "listing": row,
                    }
                )

            cell_reports.append(
                {
                    "cellKey": cell.cell_key,
                    "dealType": cell.deal_type,
                    "propertyKind": cell.property_kind,
                    "noeMelk": cell.noe_melk,
                    "noeVagozari": cell.noe_vagozari,
                    "referer": cell.referer,
                    "harvested": len(listings),
                    "pagesVisited": result.get("pagesVisited"),
                    "fieldRates": aggregate_field_rates(cell_presence),
                    "fileCodes": [
                        str(r.get("fileCode") or r.get("externalId") or "")
                        for r in listings
                    ],
                    "error": result.get("error"),
                }
            )
            time.sleep(max(detail_delay_ms, 0) / 1000.0)

    filled_cells = sum(1 for c in cell_reports if c["harvested"] > 0)
    return {
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "withinDays": within_days,
        "maxPerCell": max_per_cell,
        "maxPages": max_pages,
        "matrixSize": len(matrix),
        "filledCells": filled_cells,
        "uniqueListings": len(seen_codes),
        "listingCount": len(all_listings),
        "globalFieldRates": aggregate_field_rates(presence_rows),
        "cells": cell_reports,
        "listings": all_listings,
    }


def write_fixture_bundle(report: dict[str, Any], out_dir: Path) -> None:
    out_dir.mkdir(parents=True, exist_ok=True)
    listings_dir = out_dir / "listings"
    listings_dir.mkdir(exist_ok=True)

    manifest_listings: list[dict[str, Any]] = []
    for entry in report.get("listings") or []:
        listing = entry.get("listing") or {}
        file_code = str(listing.get("fileCode") or listing.get("externalId") or "unknown")
        cell_key = str(entry.get("cellKey") or "cell")
        safe_name = f"{cell_key.replace(':', '-')}-{file_code}"
        listing_path = listings_dir / f"{safe_name}.json"
        listing_path.write_text(
            json.dumps(listing, ensure_ascii=False, indent=2),
            encoding="utf-8",
        )
        manifest_listings.append(
            {
                "cellKey": cell_key,
                "dealType": entry.get("dealType"),
                "propertyKind": entry.get("propertyKind"),
                "fileCode": file_code,
                "listingFile": str(listing_path.relative_to(out_dir)),
            }
        )

    manifest = {
        "generatedAt": report.get("generatedAt"),
        "withinDays": report.get("withinDays"),
        "maxPerCell": report.get("maxPerCell"),
        "matrixSize": report.get("matrixSize"),
        "filledCells": report.get("filledCells"),
        "uniqueListings": report.get("uniqueListings"),
        "listingCount": report.get("listingCount"),
        "globalFieldRates": report.get("globalFieldRates"),
        "cells": report.get("cells"),
        "listings": manifest_listings,
    }
    (out_dir / "manifest.json").write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )


def main() -> None:
    parser = argparse.ArgumentParser(description="MaskanYaban matrix harvest (deal × kind)")
    parser.add_argument("--within-days", type=int, default=100, help="Only listings posted within N days")
    parser.add_argument("--max-per-cell", type=int, default=40, help="Max listings per kind-specific cell")
    parser.add_argument("--max-per-deal-wide", type=int, default=None, help="Max listings per deal-wide URL (default 3× per-cell)")
    parser.add_argument("--max-pages", type=int, default=50, help="Max AJAX pages per cell")
    parser.add_argument("--delay-ms", type=int, default=350, help="Pause between cells")
    parser.add_argument("--no-details", action="store_true", help="Skip detail-page enrichment")
    parser.add_argument("--deal-wide-only", action="store_true", help="Only crawl /estate/all/{sale|rent|mortgage}/")
    parser.add_argument("--out", type=str, default=str(FIXTURE_ROOT), help="Output fixture directory")
    args = parser.parse_args()

    report = harvest_matrix(
        within_days=max(1, args.within_days),
        max_per_cell=max(1, args.max_per_cell),
        max_per_deal_wide=args.max_per_deal_wide,
        max_pages=max(1, args.max_pages),
        detail_delay_ms=max(0, args.delay_ms),
        enrich_details=not args.no_details,
        per_kind=not args.deal_wide_only,
    )
    out_dir = Path(args.out)
    write_fixture_bundle(report, out_dir)
    print(
        f"[harvest] done — {report['listingCount']} listings, "
        f"{report['filledCells']}/{report['matrixSize']} cells → {out_dir / 'manifest.json'}",
        flush=True,
    )


if __name__ == "__main__":
    main()
