"""Offline self-test for ScrapeGraph filing engine (no live browser)."""

from __future__ import annotations

import json
from app.filing_feed.fixture_paths import filing_portals_dir

from app.filing_feed.filing_auth import guess_listings_url
from app.filing_feed.site_indexer import discover_from_html
from app.scrapegraph_bridge import persian_listing_prompt, filing_graph_config


def _fixture_html(site_key: str) -> tuple[str, str]:
    root = filing_portals_dir(site_key)
    html = (root / "list-sample.html").read_text("utf-8")
    base = f"https://{site_key}.test/list"
    return html, base


def test_persian_prompt() -> None:
    p = persian_listing_prompt(user_city="مشهد")
    assert "مشهد" in p
    assert "فایل" in p


def test_filing_graph_config() -> None:
    cfg = filing_graph_config(storage_state="/tmp/x.json", reasoning=True)
    assert cfg["storage_state"] == "/tmp/x.json"
    assert cfg["reasoning"] is True
    assert "llm" in cfg


def test_discover_showmelk() -> None:
    html, base = _fixture_html("showmelk")
    out = discover_from_html(html, base, "مشهد")
    assert out.get("ok") is True
    bp = out.get("blueprint") or {}
    assert bp.get("listPage", {}).get("containerSelector")
    assert len(out.get("fieldGuesses") or []) > 0


def test_discover_maskanyaban() -> None:
    html, base = _fixture_html("maskanyaban")
    out = discover_from_html(html, base, "مشهد")
    assert out.get("ok") is True
    bp = out.get("blueprint") or {}
    assert bp.get("listPage", {}).get("containerSelector")


def test_guess_listings_url() -> None:
    html = """
    <html><body>
    <a href="/files">لیست فایل‌ها</a>
    <a href="/about">درباره</a>
    </body></html>
    """
    url = guess_listings_url(html, "https://portal.test/")
    assert url and "files" in url


def main() -> None:
    test_persian_prompt()
    test_filing_graph_config()
    test_discover_showmelk()
    test_discover_maskanyaban()
    test_guess_listings_url()
    print(json.dumps({"ok": True, "tests": 5}))


if __name__ == "__main__":
    main()
