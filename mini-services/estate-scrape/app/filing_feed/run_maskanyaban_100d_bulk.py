#!/usr/bin/env python3
"""Bulk crawl MaskanYaban all/all within N days; emit JSON for TS import."""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

from app.filing_feed.maskanyaban_portal import LISTINGS_URL, crawl_maskanyaban_list


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--within-days", type=int, default=100)
    parser.add_argument("--max-items", type=int, default=500)
    parser.add_argument("--max-pages", type=int, default=100)
    parser.add_argument("--known", type=str, default="", help="Comma-separated external ids to skip")
    parser.add_argument("--out", type=str, required=True)
    args = parser.parse_args()

    known = [x.strip() for x in args.known.split(",") if x.strip()]
    result = crawl_maskanyaban_list(
        max_items=max(1, args.max_items),
        max_pages=max(1, args.max_pages),
        known_external_ids=known,
        listings_url=LISTINGS_URL,
        within_days=max(1, args.within_days),
    )
    listings = result.get("listings") or []
    out = Path(args.out)
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(listings, ensure_ascii=False), encoding="utf-8")
    print(
        json.dumps(
            {
                "ok": result.get("ok"),
                "count": len(listings),
                "pagesVisited": result.get("pagesVisited"),
                "exhausted": result.get("exhausted"),
                "error": result.get("error"),
                "out": str(out),
            },
            ensure_ascii=False,
        ),
        flush=True,
    )
    if not result.get("ok") and not listings:
        sys.exit(0 if result.get("error") and "timed out" in str(result.get("error")).lower() else 1)


if __name__ == "__main__":
    main()
