#!/usr/bin/env python3
"""Offline batch extract: discover + DOM crawl on filing portal fixtures (no login)."""

from __future__ import annotations

import json
import re
import sys
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "mini-services/estate-scrape"))

from app.filing_feed.dom_listing_extractor import extract_listings_from_html  # noqa: E402
from app.filing_feed.site_indexer import discover_from_html  # noqa: E402

FIXTURES = ROOT / "fixtures/filing-portals"
PER_CITY_TARGET = 20


def city_from_row(row: dict) -> str:
    loc = str(row.get("neighborhood") or row.get("location") or "")
    m = re.match(r"^([\u0600-\u06FF\u200c\s]+?)\s*[-–،,]", loc)
    if m:
        return m.group(1).strip()
    return str(row.get("city") or "نامشخص")


def run_site(site_key: str, html_path: Path, base_url: str) -> dict:
    html = html_path.read_text(encoding="utf-8")
    discovered = discover_from_html(html, base_url, "مشهد")
    bp = discovered["blueprint"]
    rows = extract_listings_from_html(html, base_url, bp)
    by_city: dict[str, list] = defaultdict(list)
    for row in rows:
        city = city_from_row(row)
        if len(by_city[city]) < PER_CITY_TARGET:
            by_city[city].append(row)
    return {
        "site": site_key,
        "container": bp.get("listPage", {}).get("containerSelector"),
        "fieldCount": len(bp.get("fieldMap") or {}),
        "totalExtracted": len(rows),
        "cities": {c: len(v) for c, v in sorted(by_city.items())},
        "sample": rows[:3],
    }


def main() -> None:
    reports = []
    sites = [
        ("showmelk", FIXTURES / "showmelk/list-sample.html", "https://showmelk.test/"),
        ("maskanyaban", FIXTURES / "maskanyaban/list-sample.html", "https://maskanyaban.test/"),
    ]
    batch = FIXTURES / "iran-batch/list-50cities-x20.html"
    if not batch.exists():
        import subprocess

        subprocess.run([sys.executable, str(ROOT / "scripts/filing-portal/generate-iran-city-fixture.py")], check=True)
    sites.append(("iran-batch", batch, "https://iran-batch.test/"))

    for site_key, path, url in sites:
        if not path.exists():
            print(f"[SKIP] missing {path}")
            continue
        report = run_site(site_key, path, url)
        reports.append(report)
        cities_ok = sum(1 for n in report["cities"].values() if n >= min(PER_CITY_TARGET, 1))
        print(
            f"[OK] {site_key}: extracted={report['totalExtracted']} cities={len(report['cities'])} "
            f"cities_with_data={cities_ok} container={report['container']}"
        )

    out = ROOT / "tmp/filing-batch-report.json"
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(reports, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"Report: {out}")

    # Gate: iran-batch must hit 50 cities with 20 each
    batch_report = next((r for r in reports if r["site"] == "iran-batch"), None)
    if batch_report:
        short = [c for c, n in batch_report["cities"].items() if n < PER_CITY_TARGET]
        if short:
            print(f"[WARN] cities below {PER_CITY_TARGET}: {len(short)}")
            sys.exit(1)
        print(f"[PASS] iran-batch: {len(batch_report['cities'])} cities × {PER_CITY_TARGET} listings")
    print("BATCH EXTRACT COMPLETE")


if __name__ == "__main__":
    main()
