#!/usr/bin/env python3
"""Crawl diverse random MaskanYaban samples across deal × property-kind matrix."""

from __future__ import annotations

import argparse
import json
import random
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import httpx

from app.filing_feed.maskanyaban_detail import parse_maskanyaban_detail_html
from app.filing_feed.maskanyaban_filters import maskanyaban_filter_matrix
from app.filing_feed.maskanyaban_portal import (
    LISTINGS_URL,
    _build_client,
    fetch_select_all_page,
    parse_list_html,
)

from app.filing_feed.fixture_paths import filing_portals_dir

FIXTURE_ROOT = filing_portals_dir("maskanyaban", "diverse-samples")


def _pick_random_listings(
    listings: list[dict[str, Any]],
    *,
    per_cell: int,
    seen: set[str],
) -> list[dict[str, Any]]:
    pool = [
        row
        for row in listings
        if str(row.get("fileCode") or row.get("externalId") or "") not in seen
    ]
    random.shuffle(pool)
    picked: list[dict[str, Any]] = []
    for row in pool:
        code = str(row.get("fileCode") or row.get("externalId") or "")
        if not code or code in seen:
            continue
        seen.add(code)
        picked.append(row)
        if len(picked) >= per_cell:
            break
    return picked


def _fetch_cell_batch(client: httpx.Client, cell, *, page: int) -> list[dict[str, Any]]:
    html = fetch_select_all_page(
        client,
        page,
        noe_melk=cell.noe_melk,
        noe_vagozari=cell.noe_vagozari,
        referer=cell.referer,
    )
    return parse_list_html(html, cell.referer, max_items=None)


def _enrich_sample_row(
    client: httpx.Client,
    row: dict[str, Any],
    cell,
    *,
    detail_delay_ms: int,
) -> dict[str, Any]:
    detail_url = str(row.get("detailUrl") or "").strip()
    detail_html: str | None = None
    if detail_url:
        try:
            res = client.get(detail_url, headers={"Referer": cell.referer})
            if res.status_code == 200:
                detail_html = res.text
        except Exception:
            detail_html = None

    enriched = row
    if detail_html:
        parsed = parse_maskanyaban_detail_html(detail_html, authenticated=False)
        enriched = {**row, **{k: v for k, v in parsed.items() if v not in (None, "")}}
        time.sleep(max(detail_delay_ms, 0) / 1000.0)

    return {
        "cellKey": cell.cell_key,
        "filter": {
            "dealType": cell.deal_type,
            "propertyKind": cell.property_kind,
            "noeMelk": cell.noe_melk,
            "noeVagozari": cell.noe_vagozari,
            "referer": cell.referer,
        },
        "listing": enriched,
        "detailHtmlSaved": bool(detail_html),
        "detailHtml": detail_html,
    }


def _pick_for_cell(
    client: httpx.Client,
    cell,
    *,
    per_cell: int,
    max_page: int,
    seen_codes: set[str],
) -> tuple[list[dict[str, Any]], int, int]:
    """Try page 1 first, then random pages, until we have per_cell picks or exhaust."""
    pages_tried: list[int] = [1]
    if max_page > 1:
        extra = [random.randint(2, max_page) for _ in range(3)]
        pages_tried.extend(p for p in extra if p not in pages_tried)

    combined: list[dict[str, Any]] = []
    last_page = 1
    for page in pages_tried:
        last_page = page
        batch = _fetch_cell_batch(client, cell, page=page)
        combined.extend(batch)
        picked = _pick_random_listings(combined, per_cell=per_cell, seen=seen_codes)
        if len(picked) >= per_cell:
            return picked, last_page, len(combined)
    return _pick_random_listings(combined, per_cell=per_cell, seen=seen_codes), last_page, len(combined)


def crawl_diverse_samples(
    *,
    per_cell: int = 2,
    max_page: int = 20,
    detail_delay_ms: int = 600,
    seed: int | None = None,
) -> dict[str, Any]:
    if seed is not None:
        random.seed(seed)

    matrix = maskanyaban_filter_matrix()
    seen_codes: set[str] = set()
    samples: list[dict[str, Any]] = []
    cell_stats: dict[str, dict[str, Any]] = {}

    with _build_client() as client:
        client.get(LISTINGS_URL)

        for cell in matrix:
            picked, page, list_count = _pick_for_cell(
                client,
                cell,
                per_cell=per_cell,
                max_page=max(1, max_page),
                seen_codes=seen_codes,
            )

            cell_stats[cell.cell_key] = {
                "dealType": cell.deal_type,
                "propertyKind": cell.property_kind,
                "page": page,
                "listCount": list_count,
                "picked": len(picked),
                "fileCodes": [str(r.get("fileCode")) for r in picked],
            }

            for row in picked:
                samples.append(
                    _enrich_sample_row(client, row, cell, detail_delay_ms=detail_delay_ms)
                )

    filled_cells = sum(1 for s in cell_stats.values() if s["picked"] > 0)
    return {
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "perCell": per_cell,
        "maxPage": max_page,
        "matrixSize": len(matrix),
        "filledCells": filled_cells,
        "sampleCount": len(samples),
        "cellStats": cell_stats,
        "samples": samples,
    }


def write_fixture_bundle(report: dict[str, Any], out_dir: Path) -> None:
    out_dir.mkdir(parents=True, exist_ok=True)
    detail_dir = out_dir / "detail-html"
    detail_dir.mkdir(exist_ok=True)

    manifest_samples: list[dict[str, Any]] = []
    for entry in report.get("samples") or []:
        listing = entry.get("listing") or {}
        file_code = str(listing.get("fileCode") or listing.get("externalId") or "unknown")
        cell_key = str(entry.get("cellKey") or "cell")
        safe_name = f"{cell_key.replace(':', '-')}-{file_code}"

        detail_html = entry.get("detailHtml")
        detail_file: str | None = None
        if isinstance(detail_html, str) and detail_html.strip():
            detail_path = detail_dir / f"{safe_name}.html"
            detail_path.write_text(detail_html, encoding="utf-8")
            detail_file = str(detail_path.relative_to(out_dir))

        manifest_samples.append(
            {
                "cellKey": cell_key,
                "filter": entry.get("filter"),
                "fileCode": file_code,
                "dealType": listing.get("dealType"),
                "propertyKind": listing.get("propertyKind"),
                "detailHtmlFile": detail_file,
                "listing": {k: v for k, v in listing.items() if k != "detailHtml"},
            }
        )

    manifest = {
        "generatedAt": report.get("generatedAt"),
        "perCell": report.get("perCell"),
        "maxPage": report.get("maxPage"),
        "matrixSize": report.get("matrixSize"),
        "filledCells": report.get("filledCells"),
        "sampleCount": report.get("sampleCount"),
        "cellStats": report.get("cellStats"),
        "samples": manifest_samples,
    }
    (out_dir / "manifest.json").write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )


def main() -> None:
    parser = argparse.ArgumentParser(description="MaskanYaban diverse matrix crawl")
    parser.add_argument("--per-cell", type=int, default=2, help="Samples per deal×kind cell")
    parser.add_argument("--max-page", type=int, default=20, help="Random page upper bound")
    parser.add_argument("--delay-ms", type=int, default=600, help="Delay between detail fetches")
    parser.add_argument("--seed", type=int, default=None, help="RNG seed for reproducibility")
    parser.add_argument(
        "--out",
        type=str,
        default=str(FIXTURE_ROOT),
        help="Output directory for manifest + detail HTML",
    )
    args = parser.parse_args()

    report = crawl_diverse_samples(
        per_cell=max(1, args.per_cell),
        max_page=max(1, args.max_page),
        detail_delay_ms=max(0, args.delay_ms),
        seed=args.seed,
    )
    out_dir = Path(args.out)
    write_fixture_bundle(report, out_dir)

    print(
        f"[OK] diverse crawl: {report['sampleCount']} samples, "
        f"{report['filledCells']}/{report['matrixSize']} cells filled"
    )
    print(f"[OK] manifest: {out_dir / 'manifest.json'}")

    empty = [k for k, v in report["cellStats"].items() if v["picked"] == 0]
    if empty:
        print(f"[WARN] empty cells: {', '.join(empty)}")


if __name__ == "__main__":
    main()
