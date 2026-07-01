"""DOM-based onboard preview with pagination validation and optional detail enrichment."""

from __future__ import annotations

from typing import Any

from app.filing_feed.dom_listing_extractor import crawl_listings_public


def dom_onboard_preview(
    listings_url: str,
    site_config: dict[str, Any],
    *,
    site_key: str = "site",
    storage_state: str | None = None,
    user_city: str = "",
    max_items: int = 5,
    max_pages: int = 2,
) -> dict[str, Any]:
    """Run short DOM crawl to validate blueprint; fallback to ScrapeGraph if empty."""
    cfg = dict(site_config)
    cfg.setdefault("detailPage", {"enabled": True, "linkFromList": True, "maxConcurrent": 3})
    if storage_state:
        cfg.setdefault("auth", {})
        cfg["auth"]["storageStatePath"] = storage_state

    result = crawl_listings_public(
        listings_url,
        cfg,
        max_items=max_items,
        max_pages=max_pages,
        headless=True,
        storage_state=storage_state,
    )

    pages_visited = int(result.get("pagesVisited") or 0)
    pagination = (cfg.get("listPage") or {}).get("pagination") or {}
    pagination_validated = pages_visited >= 2
    if not pagination_validated and pagination.get("mode") == "nextButton" and pagination.get("selector"):
        pagination_validated = False
    elif pagination.get("mode") == "urlTemplate" and pages_visited >= 2:
        pagination_validated = True

    listings = result.get("listings") or []
    extract_method = str(result.get("extractMethod") or "dom+public+onboard")

    if not listings and storage_state:
        from app.filing_feed.scrapegraph_engine import ai_scrape_listings

        fallback = ai_scrape_listings(
            listings_url=listings_url,
            storage_state=storage_state,
            site_key=site_key,
            site_config=cfg,
            user_city=user_city,
            max_items=max_items,
        )
        listings = fallback.get("listings") or []
        extract_method = str(fallback.get("extractMethod") or "scrapegraph+fallback")
        result = {**result, **fallback}

    return {
        "ok": bool(listings),
        "listings": listings[:max_items],
        "pageUrl": result.get("pageUrl") or listings_url,
        "pagesVisited": pages_visited,
        "paginationValidated": pagination_validated,
        "extractMethod": extract_method,
        "error": None if listings else result.get("error") or "no listings parsed",
    }
