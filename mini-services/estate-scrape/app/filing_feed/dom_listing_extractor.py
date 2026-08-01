"""DOM-based public listing extraction using crawl blueprint (no login required)."""

from __future__ import annotations

import asyncio
import re
from typing import Any
from urllib.parse import urljoin, urlparse

from bs4 import BeautifulSoup, Tag

from app.filing_feed.discovery.card_cluster import select_cards
from app.filing_feed.filing_auth import fetch_authenticated_html
from app.filing_feed.listing_normalize import normalize_listing

PERSIAN_DIGITS = str.maketrans("۰۱۲۳۴۵۶۷۸۹", "0123456789")


def _persian_digits(text: str) -> str:
    return text.translate(PERSIAN_DIGITS)


def _apply_transform(value: str, transform: str | None) -> str:
    if not value:
        return value
    if transform == "trim":
        return value.strip()
    if transform == "digits":
        return re.sub(r"\D", "", _persian_digits(value))
    if transform == "toman":
        cleaned = _persian_digits(value).replace(",", "").replace("،", "")
        m = re.search(r"(\d+)", cleaned)
        return m.group(1) if m else cleaned.strip()
    if transform == "persianDigits":
        return _persian_digits(value)
    return value.strip()


def _extract_field_from_card(card: Tag, spec: dict[str, Any]) -> str | None:
    selector = spec.get("selector")
    attr = spec.get("attr") or "textContent"
    regex = spec.get("regex")
    group = int(spec.get("regexGroup") or 1)
    transform = spec.get("transform")

    text_source = ""
    if selector:
        el = card.select_one(str(selector))
        if el:
            if attr == "href":
                text_source = el.get("href") or ""
            elif attr == "innerHTML":
                text_source = el.decode_contents()
            else:
                text_source = el.get_text(" ", strip=True)
    else:
        text_source = card.get_text(" ", strip=True)

    if regex:
        m = re.search(str(regex), text_source, re.I)
        if m:
            try:
                value = m.group(group)
            except IndexError:
                value = m.group(0)
            return _apply_transform(value, transform) or None
        return None

    value = _apply_transform(text_source, transform)
    return value if value else None


def extract_listings_from_html(
    html: str,
    page_url: str,
    site_config: dict[str, Any],
    *,
    known_external_ids: set[str] | None = None,
    max_items: int | None = None,
) -> list[dict[str, Any]]:
    """Extract listing rows from HTML using blueprint fieldMap."""
    known = known_external_ids or set()
    list_page = site_config.get("listPage") or {}
    container = list_page.get("containerSelector")
    field_map: dict[str, Any] = site_config.get("fieldMap") or {}
    if not container:
        return []

    soup = BeautifulSoup(html, "html.parser")
    cards = select_cards(soup, str(container))
    listings: list[dict[str, Any]] = []

    for idx, card in enumerate(cards):
        if max_items is not None and len(listings) >= max_items:
            break

        row: dict[str, Any] = {}
        for key, spec in field_map.items():
            if not isinstance(spec, dict):
                continue
            val = _extract_field_from_card(card, spec)
            if val:
                row[key] = val

        title_el = card.select_one("h1, h2, h3, h4, .title")
        if title_el:
            row.setdefault("title", title_el.get_text(" ", strip=True))
        if not row.get("title"):
            row["title"] = card.get_text(" ", strip=True)[:200]

        if row.get("fileCode") and not row.get("externalId"):
            row["externalId"] = row["fileCode"]

        link_sel = list_page.get("itemLinkSelector")
        if link_sel:
            link = card.select_one(str(link_sel))
            if link and link.get("href"):
                row["detailUrl"] = urljoin(page_url, link["href"])
        elif card.name == "a" and card.get("href"):
            row["detailUrl"] = urljoin(page_url, card["href"])
        else:
            link = card.select_one("a[href]")
            if link and link.get("href"):
                row["detailUrl"] = urljoin(page_url, link["href"])

        ext = str(row.get("externalId") or row.get("fileCode") or "").strip()
        if ext and ext in known:
            continue

        normalized = normalize_listing(row, idx)
        if normalized:
            listings.append(normalized)

    return listings


def _find_next_page_url(
    soup: BeautifulSoup,
    page_url: str,
    site_config: dict[str, Any],
    *,
    page_num: int = 1,
) -> str | None:
    list_page = site_config.get("listPage") or {}
    pagination = list_page.get("pagination") or {}
    mode = pagination.get("mode") or "nextButton"
    if mode == "urlTemplate":
        template = pagination.get("urlTemplate")
        if not template:
            return None
        next_page = page_num + 1
        max_pages_cfg = int(pagination.get("maxPages") or 20)
        if next_page > max_pages_cfg:
            return None
        if "{page}" not in str(template):
            return None
        built = str(template).replace("{page}", str(next_page))
        if built.startswith("http"):
            return built
        return urljoin(page_url, built)

    selector = pagination.get("selector") or "a.next, .pagination a.next"
    for sel in str(selector).split(","):
        el = soup.select_one(sel.strip())
        if el and el.get("href"):
            return urljoin(page_url, el["href"])
    return None


async def _crawl_public_async(
    listings_url: str,
    site_config: dict[str, Any],
    *,
    max_items: int = 100,
    max_pages: int = 20,
    known_external_ids: list[str] | None = None,
    headless: bool = True,
    storage_state: str | None = None,
) -> dict[str, Any]:
    from playwright.async_api import async_playwright

    known = {str(x).strip() for x in (known_external_ids or []) if str(x).strip()}
    all_listings: list[dict[str, Any]] = []
    pages_visited = 0
    current_url = listings_url
    visited_paths: set[str] = set()
    page_num = 1

    async with async_playwright() as pw:
        browser = await pw.chromium.launch(headless=headless, args=["--disable-dev-shm-usage"])
        context_kwargs: dict[str, Any] = {"locale": "fa-IR", "viewport": {"width": 1280, "height": 800}}
        if storage_state:
            context_kwargs["storage_state"] = storage_state
        context = await browser.new_context(**context_kwargs)
        page = await context.new_page()

        while pages_visited < max_pages and len(all_listings) < max_items:
            norm = urlparse(current_url).path + (
                "?" + urlparse(current_url).query if urlparse(current_url).query else ""
            )
            if norm in visited_paths:
                break
            visited_paths.add(norm)

            try:
                await page.goto(current_url, wait_until="domcontentloaded", timeout=60_000)
                await page.wait_for_timeout(600)
            except Exception as exc:
                return {
                    "ok": False,
                    "listings": all_listings,
                    "pageUrl": current_url,
                    "pagesVisited": pages_visited,
                    "extractMethod": "dom+public",
                    "error": str(exc),
                }

            pages_visited += 1
            html = await page.content()
            batch = extract_listings_from_html(
                html,
                page.url,
                site_config,
                known_external_ids=known,
                max_items=max_items - len(all_listings),
            )
            for row in batch:
                ext = str(row.get("externalId") or "").strip()
                if ext:
                    known.add(ext)
            all_listings.extend(batch)

            soup = BeautifulSoup(html, "html.parser")
            next_url = _find_next_page_url(soup, page.url, site_config, page_num=page_num)
            if not next_url or next_url == page.url:
                break
            page_num += 1
            current_url = next_url

        await browser.close()

    detail_cfg = site_config.get("detailPage") or {}
    if detail_cfg.get("enabled") and all_listings:
        from app.filing_feed.listing_detail_extractor import enrich_listing_from_detail

        storage_state = site_config.get("storageState") or storage_state
        enriched: list[dict[str, Any]] = []
        for row in all_listings[:max_items]:
            enriched.append(
                enrich_listing_from_detail(
                    row,
                    headless=headless,
                    storage_state=storage_state,
                    site_config=site_config,
                )
            )
        all_listings = enriched

    return {
        "ok": bool(all_listings),
        "listings": all_listings[:max_items],
        "pageUrl": current_url,
        "pagesVisited": pages_visited,
        "extractMethod": "dom+public",
        "error": None if all_listings else "no listings parsed",
    }


def _is_maskanyaban_ajax(site_config: dict[str, Any]) -> bool:
    portal = str(site_config.get("portalFamily") or "")
    list_page = site_config.get("listPage") or {}
    return portal == "maskanyaban" or list_page.get("fetchMode") == "ajaxHtml"


def crawl_listings_public(
    listings_url: str,
    site_config: dict[str, Any],
    *,
    max_items: int = 100,
    max_pages: int = 20,
    known_external_ids: list[str] | None = None,
    headless: bool = True,
    storage_state: str | None = None,
) -> dict[str, Any]:
    """Fetch listing pages without auth and extract via DOM blueprint."""
    list_page = site_config.get("listPage") or {}
    if _is_maskanyaban_ajax(site_config):
        from app.filing_feed.filing_auth import storage_state_for_site
        from app.filing_feed.maskanyaban_portal import crawl_maskanyaban_list

        state = storage_state or storage_state_for_site(
            str(site_config.get("siteKey") or "maskanyaban"), site_config
        )
        auth_path = (site_config.get("auth") or {}).get("storageStatePath") or state
        result = crawl_maskanyaban_list(
            max_items=max_items,
            max_pages=max_pages,
            known_external_ids=known_external_ids,
            storage_state_path=auth_path,
            listings_url=listings_url,
        )
        detail_cfg = site_config.get("detailPage") or {}
        if detail_cfg.get("enabled") and result.get("listings"):
            from app.filing_feed.listing_detail_extractor import enrich_listing_from_detail

            enriched = []
            for row in result["listings"]:
                enriched.append(
                    enrich_listing_from_detail(
                        row,
                        headless=headless,
                        storage_state=auth_path,
                        site_config=site_config,
                    )
                )
            result["listings"] = enriched
        return result

    if not list_page.get("containerSelector") or not site_config.get("fieldMap"):
        return {
            "ok": False,
            "listings": [],
            "error": "missing dom blueprint (containerSelector + fieldMap)",
            "extractMethod": "dom+public",
        }
    try:
        return asyncio.run(
            _crawl_public_async(
                listings_url,
                site_config,
                max_items=max_items,
                max_pages=max_pages,
                known_external_ids=known_external_ids,
                headless=headless,
                storage_state=storage_state,
            )
        )
    except Exception as exc:
        return {
            "ok": False,
            "listings": [],
            "error": str(exc),
            "extractMethod": "dom+public",
        }


def crawl_listings_public_html(
    html: str,
    page_url: str,
    site_config: dict[str, Any],
    *,
    max_items: int | None = None,
    known_external_ids: list[str] | None = None,
) -> dict[str, Any]:
    """Offline/single-page public extract (fixtures, tests)."""
    known = {str(x).strip() for x in (known_external_ids or []) if str(x).strip()}
    listings = extract_listings_from_html(
        html,
        page_url,
        site_config,
        known_external_ids=known,
        max_items=max_items,
    )
    return {
        "ok": bool(listings),
        "listings": listings,
        "pageUrl": page_url,
        "pagesVisited": 1,
        "extractMethod": "dom+public",
        "error": None if listings else "no listings parsed",
    }


def fetch_public_html(url: str, *, headless: bool = True) -> str:
    return fetch_authenticated_html(url, storage_state=None, headless=headless)
