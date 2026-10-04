"""Detail page fetch + attribute merge for filing listings."""

from __future__ import annotations

from typing import Any

from app.filing_feed.filing_auth import fetch_authenticated_html
from app.filing_feed.listing_attribute_parser import merge_listing_rows, parse_listing_attributes


def fetch_detail_html(url: str, *, headless: bool = True, storage_state: str | None = None) -> str:
    return fetch_authenticated_html(url, storage_state=storage_state, headless=headless)


def parse_detail_page(
    html: str,
    *,
    page_url: str = "",
    deal_type_hint: str | None = None,
    property_kind_hint: str | None = None,
    site_config: dict[str, Any] | None = None,
    authenticated: bool = False,
) -> dict[str, Any]:
    portal = str((site_config or {}).get("portalFamily") or "")
    if portal == "maskanyaban":
        from app.filing_feed.maskanyaban_detail import parse_maskanyaban_detail_html

        return parse_maskanyaban_detail_html(html, authenticated=authenticated)

    from bs4 import BeautifulSoup

    soup = BeautifulSoup(html, "html.parser")
    for tag in soup(["script", "style", "noscript"]):
        tag.decompose()
    text = soup.get_text("\n", strip=True)
    return parse_listing_attributes(
        text,
        deal_type_hint=deal_type_hint,
        property_kind_hint=property_kind_hint,
    )


def enrich_listing_from_detail(
    listing: dict[str, Any],
    *,
    headless: bool = True,
    storage_state: str | None = None,
    site_config: dict[str, Any] | None = None,
) -> dict[str, Any]:
    detail_url = str(listing.get("detailUrl") or "").strip()
    if not detail_url:
        return listing
    authenticated = bool(storage_state)
    portal = str((site_config or {}).get("portalFamily") or "")
    try:
        html = fetch_detail_html(detail_url, headless=headless, storage_state=storage_state)
        if portal == "maskanyaban":
            from app.filing_feed.maskanyaban_detail import enrich_maskanyaban_listing

            return enrich_maskanyaban_listing(listing, html, authenticated=authenticated)
        parsed = parse_detail_page(
            html,
            page_url=detail_url,
            deal_type_hint=str(listing.get("dealType") or "") or None,
            property_kind_hint=str(listing.get("propertyKind") or "") or None,
            site_config=site_config,
            authenticated=authenticated,
        )
        return merge_listing_rows(listing, parsed)
    except Exception:
        return listing
