from __future__ import annotations

from typing import Any

from app.filing_feed.crawl_engine import crawl_filing_feed
from app.filing_feed.dom_listing_extractor import crawl_listings_public
from app.filing_feed.maskanyaban_portal import crawl_maskanyaban_ajax, is_maskanyaban_ajax_portal
from app.filing_feed.filing_auth import login_and_save_state, storage_state_for_site
from app.filing_feed.listing_normalize import normalize_listing
from app.filing_feed.scrapegraph_engine import ai_scrape_listings
from app.qwen_client import extract_filings_from_html, mlx_health_ok
from app.scraper import html_to_text, scrape_url_with_scrapegraph

DEFAULT_USERNAME_SELECTOR = 'input[name="username"], input[name="email"], input[type="email"], #username, #email'
DEFAULT_PASSWORD_SELECTOR = 'input[name="password"], input[type="password"], #password'
DEFAULT_SUBMIT_SELECTOR = 'button[type="submit"], input[type="submit"], button:has-text("ورود")'


def _site_config_value(site_config: dict[str, Any], key: str, default: Any = None) -> Any:
    if key in site_config and site_config[key] is not None:
        return site_config[key]
    auth = site_config.get("auth") or {}
    return auth.get(key, default)


def _has_credentials(username: str, password: str) -> bool:
    return bool(username.strip() and password.strip())


def _llm_extract(
    page_url: str,
    html: str,
    site_key: str,
    site_config: dict[str, Any],
) -> tuple[list[dict[str, Any]], str]:
    if not mlx_health_ok():
        return [], "scrapegraph"

    llm = site_config.get("llmFallback") or {}
    custom_prompt = str(llm.get("customPrompt") or site_config.get("customPrompt") or "").strip()
    extract_method = "scrapegraph+qwen"

    if custom_prompt:
        try:
            from app.scrapegraph_bridge import ensure_scrapegraph_path, filing_graph_config, run_graph_sync

            ensure_scrapegraph_path()
            from scrapegraphai.graphs import SmartScraperGraph

            state = storage_state_for_site(site_key, site_config)
            cfg = filing_graph_config(storage_state=state, reattempt=True)
            sg_result = run_graph_sync(
                SmartScraperGraph,
                prompt=custom_prompt,
                source=page_url,
                config=cfg,
            )
            if isinstance(sg_result, dict):
                raw_list = sg_result.get("listings") or sg_result.get("answer")
                if isinstance(raw_list, list):
                    listings = [
                        x
                        for x in (normalize_listing(i, idx) for idx, i in enumerate(raw_list))
                        if x
                    ]
                    if listings:
                        return listings, "scrapegraph"
        except Exception:
            pass

    text = html_to_text(html)
    if len(text) < 80:
        sg_text = scrape_url_with_scrapegraph(page_url)
        if sg_text:
            text = sg_text
            extract_method = "scrapegraph+qwen"

    try:
        extracted = extract_filings_from_html(page_url, text, site_key=site_key)
        raw_rows = extracted.get("listings") if isinstance(extracted, dict) else []
        if isinstance(raw_rows, list):
            listings = [
                x for x in (normalize_listing(i, idx) for idx, i in enumerate(raw_rows)) if x
            ]
            return listings, extract_method
    except Exception:
        pass

    return [], extract_method


def _has_dom_blueprint(site_config: dict[str, Any]) -> bool:
    list_page = site_config.get("listPage") or {}
    return bool(list_page.get("containerSelector") and site_config.get("fieldMap"))


def _crawl_public_or_ajax(
    listings_url: str,
    site_config: dict[str, Any],
    *,
    max_items: int,
    known_external_ids: list[str] | None,
    within_days: int | None = None,
) -> dict[str, Any]:
    if is_maskanyaban_ajax_portal(site_config):
        return crawl_maskanyaban_ajax(
            listings_url,
            site_config,
            max_items=max_items,
            known_external_ids=known_external_ids,
            within_days=within_days,
        )
    return crawl_listings_public(
        listings_url,
        site_config,
        max_items=max_items,
        known_external_ids=known_external_ids,
    )


def _llm_fallback_enabled(site_config: dict[str, Any]) -> bool:
    llm = site_config.get("llmFallback") or {}
    if "enabled" in llm:
        return bool(llm.get("enabled"))
    return bool(site_config.get("customPrompt") or llm.get("customPrompt"))


def _try_llm_after_dom_miss(
    page_url: str,
    html: str,
    site_key: str,
    site_config: dict[str, Any],
) -> tuple[list[dict[str, Any]], str]:
    if not html or not _llm_fallback_enabled(site_config):
        return [], "scrapegraph+dom"
    listings, method = _llm_extract(page_url, html, site_key, site_config)
    if listings:
        return listings, method
    return [], "scrapegraph+dom"


def _ensure_auth(
    *,
    login_url: str,
    username: str,
    password: str,
    site_key: str,
    site_config: dict[str, Any],
) -> str | None:
    state = storage_state_for_site(site_key, site_config)
    if state:
        return state
    login = login_and_save_state(
        login_url=login_url,
        username=username,
        password=password,
        site_key=site_key,
        site_config=site_config,
    )
    if not login.get("ok"):
        return None
    path = str(login["storageStatePath"])
    site_config.setdefault("auth", {})
    site_config["auth"]["storageStatePath"] = path
    return path


def scrape_filing_feed(payload: dict[str, Any]) -> dict[str, Any]:
    site_key = str(payload.get("siteKey") or "site")
    login_url = str(payload.get("loginUrl") or "").strip()
    listings_url = str(payload.get("listingsUrl") or "").strip()
    username = str(payload.get("username") or "").strip()
    password = str(payload.get("password") or "").strip()
    site_config = payload.get("siteConfig") or {}
    known_external_ids = payload.get("knownExternalIds") or []
    max_items = payload.get("maxItems")
    within_days = payload.get("withinDays")

    if not listings_url:
        return {"ok": False, "listings": [], "error": "missing listingsUrl"}

    has_creds = _has_credentials(username, password)
    has_dom = _has_dom_blueprint(site_config)

    if not has_creds and has_dom:
        result = _crawl_public_or_ajax(
            listings_url,
            site_config,
            max_items=int(max_items) if max_items else 100,
            known_external_ids=known_external_ids,
            within_days=int(within_days) if within_days else None,
        )
        return {
            "ok": result.get("ok", False),
            "listings": result.get("listings") or [],
            "pageUrl": result.get("pageUrl", listings_url),
            "extractMethod": result.get("extractMethod", "dom+public"),
            "siteKey": site_key,
            "error": result.get("error"),
        }

    if not has_creds:
        return {
            "ok": False,
            "listings": [],
            "error": "missing credentials or dom blueprint (containerSelector + fieldMap)",
        }

    if not login_url:
        return {"ok": False, "listings": [], "error": "missing loginUrl"}

    try:
        storage_state = _ensure_auth(
            login_url=login_url,
            username=username,
            password=password,
            site_key=site_key,
            site_config=site_config,
        )
        if not storage_state:
            return {"ok": False, "listings": [], "error": "login failed"}

        if has_dom:
            result = crawl_filing_feed(
                login_url=login_url,
                listings_url=listings_url,
                username=username,
                password=password,
                site_config=site_config,
                site_key=site_key,
                max_items=int(max_items) if max_items else None,
                known_external_ids=known_external_ids,
            )
            if result.get("listings"):
                return {
                    "ok": True,
                    "listings": result["listings"],
                    "pageUrl": result.get("pageUrl", listings_url),
                    "extractMethod": result.get("extractMethod", "scrapegraph"),
                    "siteKey": site_key,
                }

            page_url = str(result.get("pageUrl") or listings_url)
            html = str(result.get("html") or "")
            listings, extract_method = _try_llm_after_dom_miss(
                page_url, html, site_key, site_config
            )
            if listings:
                return {
                    "ok": True,
                    "listings": listings,
                    "pageUrl": page_url,
                    "extractMethod": extract_method,
                    "siteKey": site_key,
                }

        result = ai_scrape_listings(
            listings_url=listings_url,
            storage_state=storage_state,
            site_key=site_key,
            site_config=site_config,
            max_items=int(max_items) if max_items else None,
        )
        if not result.get("listings"):
            return {
                "ok": False,
                "listings": [],
                "error": result.get("error") or "no listings parsed",
                "pageUrl": result.get("pageUrl", listings_url),
            }

        return {
            "ok": True,
            "listings": result["listings"],
            "pageUrl": result.get("pageUrl", listings_url),
            "extractMethod": result.get("extractMethod", "scrapegraph"),
            "siteKey": site_key,
        }
    except Exception as exc:
        return {"ok": False, "listings": [], "error": f"scrape failed: {exc}"}


def preview_filing_feed(payload: dict[str, Any]) -> dict[str, Any]:
    site_key = str(payload.get("siteKey") or "site")
    listings_url = str(payload.get("listingsUrl") or "").strip()
    site_config = payload.get("siteConfig") or {}
    max_items = int(payload.get("maxItems") or 5)
    known_external_ids = payload.get("knownExternalIds") or []

    if not listings_url:
        return {"ok": False, "listings": [], "error": "missing listingsUrl"}

    try:
        full = scrape_filing_feed({**payload, "maxItems": max_items, "knownExternalIds": known_external_ids})
        if not full.get("ok") and not full.get("listings"):
            return full
        listings = (full.get("listings") or [])[:max_items]
        return {
            "ok": bool(listings),
            "listings": listings,
            "pageUrl": full.get("pageUrl"),
            "extractMethod": full.get("extractMethod"),
            "siteKey": site_key,
            "error": None if listings else (full.get("error") or "no listings parsed"),
        }
    except Exception as exc:
        return {"ok": False, "listings": [], "error": f"preview failed: {exc}"}
