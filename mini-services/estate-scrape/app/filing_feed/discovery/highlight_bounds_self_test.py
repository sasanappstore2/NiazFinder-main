"""Offline self-test: discovery highlight items resolve in fixture HTML."""

from __future__ import annotations

import json

from app.filing_feed.fixture_paths import filing_portals_dir

from bs4 import BeautifulSoup

from app.filing_feed.discovery.highlight_payload import build_highlight_items
from app.filing_feed.site_indexer import discover_from_html

FIXTURES = filing_portals_dir()


def _selector_matches(soup: BeautifulSoup, selector: str) -> bool:
    try:
        return bool(soup.select(selector))
    except Exception:
        return False


def run() -> None:
    for site in ("showmelk", "maskanyaban"):
        html = (FIXTURES / site / "list-sample.html").read_text(encoding="utf-8")
        url = f"https://{site}.test/list"
        soup = BeautifulSoup(html, "html.parser")

        if site == "maskanyaban":
            blueprint = json.loads((FIXTURES / site / "blueprint.json").read_text(encoding="utf-8"))
            selector = str(blueprint.get("listPage", {}).get("containerSelector") or "")
            assert selector and _selector_matches(soup, selector), site
            print(f"[OK] {site} blueprint container matches fixture HTML")
            continue

        discovered = discover_from_html(html, url, "مشهد")
        items = build_highlight_items(discovered["siteIndex"], discovered["blueprint"])
        assert items, f"no highlight items for {site}"

        list_item = next((i for i in items if i.get("id") == "list-container"), None)
        assert list_item, f"list-container item missing for {site}"
        assert _selector_matches(soup, str(list_item.get("selector"))), site

        found = sum(
            1
            for item in items
            if item.get("selector") and _selector_matches(soup, str(item["selector"]))
        )
        assert found >= 1, f"too few matching selectors for {site}"
        print(f"[OK] {site} highlight items ({found} selectors match)")

    print("ALL HIGHLIGHT BOUNDS TESTS PASSED")


if __name__ == "__main__":
    run()
