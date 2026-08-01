"""Authenticated portal discovery via post-login BFS."""

from __future__ import annotations

from typing import Any

from app.filing_feed.filing_auth import login_and_save_state
from app.filing_feed.post_login_navigator import auto_onboard


def authenticated_discover(
    *,
    login_url: str,
    listings_url: str | None,
    username: str,
    password: str,
    site_key: str,
    site_config: dict[str, Any],
    user_city: str = "",
) -> dict[str, Any]:
    """Login, BFS to best listing page, merge optional ScrapeGraph selector hints."""
    login = login_and_save_state(
        login_url=login_url,
        username=username,
        password=password,
        site_key=site_key,
        site_config=site_config,
    )
    if not login.get("ok"):
        return {"ok": False, "error": login.get("error") or "login failed"}

    storage_state = str(login["storageStatePath"])
    auth = dict(site_config.get("auth") or {})
    auth["storageStatePath"] = storage_state

    from playwright.sync_api import sync_playwright

    nav_result: dict[str, Any] = {"ok": False}
    with sync_playwright() as pw:
        browser = pw.chromium.launch(headless=True, args=["--disable-dev-shm-usage"])
        context = browser.new_context(
            storage_state=storage_state,
            locale="fa-IR",
            viewport={"width": 1280, "height": 800},
        )
        page = context.new_page()
        nav_result = auto_onboard(
            page,
            login_url=login_url,
            username=username,
            password=password,
            user_city=user_city,
            auth=auth,
        )
        browser.close()

    if not nav_result.get("ok"):
        from app.filing_feed.scrapegraph_engine import ai_discover_portal

        sg_only = ai_discover_portal(
            login_url=login_url,
            listings_url=listings_url,
            storage_state=storage_state,
            user_city=user_city,
        )
        sg_only["storageStatePath"] = storage_state
        sg_only["loginUrl"] = login_url
        return sg_only

    resolved_listings = str(nav_result.get("listingsUrl") or listings_url or login_url)
    from app.filing_feed.scrapegraph_engine import ai_discover_portal

    sg_merge = ai_discover_portal(
        login_url=login_url,
        listings_url=resolved_listings,
        storage_state=storage_state,
        user_city=user_city,
    )

    blueprint = dict(nav_result.get("blueprint") or sg_merge.get("blueprint") or {})
    blueprint.setdefault("auth", {})
    blueprint["auth"].update(auth)
    blueprint.setdefault("detailPage", {"enabled": True, "linkFromList": True, "maxConcurrent": 3})

    portal_map = blueprint.get("portalMap") or {}
    if not portal_map.get("listPages"):
        portal_map = {
            "listPages": [
                {
                    "url": resolved_listings,
                    "dealType": None,
                    "propertyKind": None,
                    "containerSelector": (blueprint.get("listPage") or {}).get("containerSelector"),
                }
            ]
        }
        blueprint["portalMap"] = portal_map

    return {
        "ok": True,
        "loginUrl": login_url,
        "listingsUrl": resolved_listings,
        "blueprint": blueprint,
        "siteIndex": nav_result.get("siteIndex") or sg_merge.get("siteIndex"),
        "fieldGuesses": nav_result.get("fieldGuesses") or sg_merge.get("fieldGuesses") or [],
        "sampleCards": nav_result.get("sampleCards") or sg_merge.get("sampleCards") or [],
        "confidenceMap": nav_result.get("confidenceMap") or sg_merge.get("confidenceMap") or {},
        "storageStatePath": storage_state,
        "navigationSteps": nav_result.get("report"),
    }
