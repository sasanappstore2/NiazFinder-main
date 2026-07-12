"""Offline self-test: taxonomy + HTML discovery on filing fixtures (no Playwright)."""

from __future__ import annotations

import json

from app.filing_feed.fixture_paths import filing_portals_dir

from app.filing_feed.dom_listing_extractor import crawl_listings_public_html
from app.filing_feed.site_indexer import discover_from_html
from app.filing_feed.site_mapper import analyze_field_visibility, classify_taxonomy

ROOT = filing_portals_dir()


def _run() -> None:
    assert classify_taxonomy("رهن و اجاره", "")["dealType"] == "rent_mortgage"
    assert classify_taxonomy("فروش", "/sale")["dealType"] == "sale"

    for site in ("showmelk", "maskanyaban"):
        html_path = ROOT / site / "list-sample.html"
        if not html_path.exists():
            continue
        html = html_path.read_text(encoding="utf-8")
        base = f"https://{site}.example.com/list"
        if site == "maskanyaban":
            blueprint = json.loads((ROOT / site / "blueprint.json").read_text(encoding="utf-8"))
            result = crawl_listings_public_html(
                html,
                "https://maskanyaban.ir/Melk/_SelectAll?page=1",
                blueprint,
                max_items=10,
            )
            listings = result.get("listings") or []
            assert len(listings) >= 2, site
            print(f"[OK] {site} cards={len(listings)} fields={len(blueprint.get('fieldMap') or {})}")
            continue

        out = discover_from_html(html, base, "مشهد")
        assert out.get("siteIndex"), site
        best = out["siteIndex"].get("bestListRegion")
        assert best and best.get("cardCount", 0) >= 2, site
        vis = analyze_field_visibility(html, out.get("fieldGuesses") or [])
        assert vis.get("visible"), site
        print(f"[OK] {site} cards={best['cardCount']} fields={len(out.get('fieldGuesses') or [])}")

    print("[OK] site-map offline self-test passed")


if __name__ == "__main__":
    _run()
