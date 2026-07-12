#!/usr/bin/env python3
"""Self-test: MaskanYaban AJAX portal adapter (offline fixture + optional live smoke)."""

from __future__ import annotations

import json
import sys
from app.filing_feed.fixture_paths import filing_portals_dir

from app.filing_feed.dom_listing_extractor import crawl_listings_public_html
from app.filing_feed.maskanyaban_portal import crawl_maskanyaban_ajax, is_maskanyaban_ajax_portal

FIXTURE_DIR = filing_portals_dir("maskanyaban")


def _load_blueprint() -> dict:
    bp_path = FIXTURE_DIR / "blueprint.json"
    if bp_path.exists():
        return json.loads(bp_path.read_text(encoding="utf-8"))
    raise FileNotFoundError(f"missing blueprint: {bp_path}")


def test_offline_fixture() -> None:
    blueprint = _load_blueprint()
    html = (FIXTURE_DIR / "list-sample.html").read_text(encoding="utf-8")
    result = crawl_listings_public_html(
        html,
        "https://maskanyaban.ir/Melk/_SelectAll?page=1",
        blueprint,
        max_items=10,
    )
    listings = result.get("listings") or []
    assert result.get("ok"), result.get("error") or "offline extract failed"
    assert len(listings) >= 3, f"expected >=3 listings, got {len(listings)}"
    codes = {str(r.get("fileCode") or r.get("externalId")) for r in listings}
    for code in ("525837", "212537", "525836"):
        assert code in codes, f"missing fixture fileCode {code}"
    print(f"[OK] offline fixture: {len(listings)} listings")


def test_ajax_detection() -> None:
    blueprint = _load_blueprint()
    assert is_maskanyaban_ajax_portal(blueprint)
    print("[OK] ajax portal detection")


def test_live_smoke() -> None:
    if "--live" not in sys.argv:
        print("[SKIP] live smoke (pass --live to enable)")
        return
    blueprint = _load_blueprint()
    result = crawl_maskanyaban_ajax(
        "https://maskanyaban.ir/estate/all/all/",
        blueprint,
        max_items=5,
    )
    assert result.get("ok"), result.get("error") or "live crawl failed"
    listings = result.get("listings") or []
    assert len(listings) >= 5, f"expected 5 listings, got {len(listings)}"
    assert all(r.get("fileCode") for r in listings), "missing file codes"
    print(f"[OK] live smoke: {len(listings)} listings via {result.get('extractMethod')}")


def test_filter_referers() -> None:
    from app.filing_feed.maskanyaban_filters import (
        maskanyaban_deal_wide_filters,
        maskanyaban_filter_matrix,
    )

    wide = {c.deal_type: c for c in maskanyaban_deal_wide_filters()}
    assert wide["rent_rahn_full"].referer == "https://maskanyaban.ir/estate/all/mortgage/"
    assert wide["rent_rahn_ejare"].referer == "https://maskanyaban.ir/estate/all/rent/"
    assert wide["sell"].referer == "https://maskanyaban.ir/estate/all/sale/"
    assert wide["rent_rahn_full"].noe_vagozari == "2"
    assert wide["rent_rahn_full"].noe_melk == "4"

    matrix = maskanyaban_filter_matrix()
    apt_mortgage = next(c for c in matrix if c.cell_key == "rent_rahn_full:apartment")
    assert apt_mortgage.referer == "https://maskanyaban.ir/estate/apartment/mortgage/"
    print("[OK] filter referer URLs")


def main() -> None:
    test_ajax_detection()
    test_filter_referers()
    test_offline_fixture()
    test_live_smoke()
    print("maskanyaban portal self-test passed")


if __name__ == "__main__":
    main()
