"""Self-test: onboard discovery on generic-portal fixture."""

from __future__ import annotations

import json
from app.filing_feed.fixture_paths import filing_portals_dir

from app.filing_feed.dom_listing_extractor import crawl_listings_public_html
from app.filing_feed.site_indexer import discover_from_html, index_site_html

FIXTURE_DIR = filing_portals_dir("generic-portal")
BASE = "https://generic-portal.test/"


def main() -> None:
    expected = json.loads((FIXTURE_DIR / "expected-onboard.json").read_text(encoding="utf-8"))
    list_html = (FIXTURE_DIR / "list-page-1.html").read_text(encoding="utf-8")
    login_html = (FIXTURE_DIR / "login.html").read_text(encoding="utf-8")

    login_index = index_site_html(login_html, f"{BASE}login.html")
    assert login_index.get("pageKind") == "login", "login page not detected"
    assert login_index.get("loginForm"), "login form selectors missing"

    discovered = discover_from_html(list_html, f"{BASE}list-page-1.html", "مشهد")
    bp = discovered.get("blueprint") or {}
    list_page = bp.get("listPage") or {}
    assert list_page.get("containerSelector"), "missing containerSelector"
    assert list_page.get("itemLinkSelector"), "missing itemLinkSelector"
    if expected.get("requirePagination"):
        assert list_page.get("pagination"), "missing pagination blueprint"

    field_map = bp.get("fieldMap") or {}
    assert len(field_map) >= 3, f"expected >=3 fieldMap keys, got {len(field_map)}"

    rows = crawl_listings_public_html(list_html, f"{BASE}list-page-1.html", bp).get("listings") or []
    assert len(rows) >= expected.get("minListings", 2), f"extract count {len(rows)}"
    for code in expected.get("sampleFileCodes") or []:
        assert any(str(r.get("fileCode") or r.get("externalId")) == code for r in rows), f"missing {code}"

    print("[OK] generic-portal onboard pipeline self-test passed")


if __name__ == "__main__":
    main()
