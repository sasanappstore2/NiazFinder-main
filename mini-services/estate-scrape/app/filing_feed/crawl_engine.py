"""DOM-based filing feed crawl — public DOM path or ScrapeGraph with auth."""

from __future__ import annotations

from typing import Any

from app.filing_feed.dom_listing_extractor import crawl_listings_public
from app.filing_feed.filing_auth import login_and_save_state, storage_state_for_site
from app.filing_feed.scrapegraph_engine import ai_scrape_listings


def _has_dom_blueprint(site_config: dict[str, Any]) -> bool:
    list_page = site_config.get("listPage") or {}
    return bool(list_page.get("containerSelector") and site_config.get("fieldMap"))


def _has_credentials(username: str, password: str) -> bool:
    return bool(str(username or "").strip() and str(password or "").strip())


def crawl_filing_feed(
    *,
    login_url: str,
    listings_url: str,
    username: str,
    password: str,
    site_config: dict[str, Any],
    site_key: str = "site",
    max_items: int | None = None,
    known_external_ids: list[str] | None = None,
) -> dict[str, Any]:
    """Scrape listings via public DOM blueprint or ScrapeGraph + authenticated session."""
    storage_state = storage_state_for_site(site_key, site_config) if _has_credentials(username, password) else None
    dom_result: dict[str, Any] | None = None

    if _has_dom_blueprint(site_config):
        if _has_credentials(username, password) and not storage_state:
            login = login_and_save_state(
                login_url=login_url,
                username=username,
                password=password,
                site_key=site_key,
                site_config=site_config,
            )
            if not login.get("ok"):
                return {
                    "ok": False,
                    "listings": [],
                    "error": login.get("error") or "login failed",
                    "extractMethod": "dom+public",
                }
            storage_state = str(login["storageStatePath"])
            site_config.setdefault("auth", {})
            site_config["auth"]["storageStatePath"] = storage_state

        dom_result = crawl_listings_public(
            listings_url,
            site_config,
            max_items=max_items or 100,
            known_external_ids=known_external_ids,
            storage_state=storage_state,
        )
        if dom_result.get("listings"):
            return dom_result

    if not _has_credentials(username, password):
        return dom_result or {
            "ok": False,
            "listings": [],
            "error": "missing credentials and DOM blueprint incomplete",
            "extractMethod": "dom+public",
        }

    if not storage_state:
        login = login_and_save_state(
            login_url=login_url,
            username=username,
            password=password,
            site_key=site_key,
            site_config=site_config,
        )
        if not login.get("ok"):
            return {
                "ok": False,
                "listings": [],
                "error": login.get("error") or "login failed",
                "extractMethod": "scrapegraph",
            }
        storage_state = str(login["storageStatePath"])
        site_config.setdefault("auth", {})
        site_config["auth"]["storageStatePath"] = storage_state

    llm = site_config.get("llmFallback") or {}
    custom_prompt = str(llm.get("customPrompt") or site_config.get("customPrompt") or "")

    result = ai_scrape_listings(
        listings_url=listings_url,
        storage_state=storage_state,
        site_key=site_key,
        site_config=site_config,
        max_items=max_items,
        custom_prompt=custom_prompt,
    )
    return {
        "ok": result.get("ok", False),
        "listings": result.get("listings") or [],
        "pageUrl": result.get("pageUrl", listings_url),
        "extractMethod": result.get("extractMethod", "scrapegraph"),
        "html": "",
        "error": result.get("error"),
    }
