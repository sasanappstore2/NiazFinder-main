"""MaskanYaban.ir list crawl via POST /Melk/_SelectAll (AJAX HTML fragments)."""

from __future__ import annotations

import re
from typing import Any
from urllib.parse import urljoin

import httpx
from bs4 import BeautifulSoup, Tag

from app.filing_feed.listing_attribute_parser import canonicalize_deal_type, canonicalize_property_kind
from app.filing_feed.maskanyaban_dates import (
    cutoff_datetime,
    page_entirely_before_cutoff,
    row_within_days,
)
from app.filing_feed.listing_normalize import normalize_listing

BASE_URL = "https://maskanyaban.ir"
LISTINGS_URL = f"{BASE_URL}/estate/all/all/"
SELECT_ALL_PATH = "/Melk/_SelectAll"

PERSIAN_DIGITS = str.maketrans("۰۱۲۳۴۵۶۷۸۹", "0123456789")


def _digits(text: str) -> str:
    return re.sub(r"\D", "", text.translate(PERSIAN_DIGITS))


def _price_from_item(item: Tag, title_hint: str) -> str | None:
    title_el = item.select_one(".title")
    if not title_el:
        return None
    title = title_el.get_text(" ", strip=True)
    if title_hint not in title:
        return None
    num = item.select_one(".PriceKama")
    if not num:
        return None
    val = _digits(num.get_text())
    return val or None


def _parse_location(h2_text: str) -> tuple[str | None, str | None, str | None]:
    text = re.sub(r"\s+", " ", h2_text).strip()
    if not text:
        return None, None, None
    if " - " in text:
        city, neighborhood = text.split(" - ", 1)
        return city.strip(), neighborhood.strip(), text
    if "-" in text:
        parts = [p.strip() for p in text.split("-", 1)]
        if len(parts) == 2:
            return parts[0], parts[1], text
    return text, None, text


def _parse_deal_and_kind(badge: str) -> tuple[str | None, str | None]:
    text = re.sub(r"\s+", " ", badge).strip()
    deal = canonicalize_deal_type(text)
    kind = canonicalize_property_kind(text)
    return deal, kind


def _parse_card_images(card: Tag, page_url: str) -> dict[str, Any]:
    urls: list[str] = []
    for img in card.select("img"):
        src = img.get("src") or img.get("data-src") or img.get("data-original")
        if not src or str(src).startswith("data:"):
            continue
        abs_url = urljoin(page_url, str(src))
        if abs_url not in urls:
            urls.append(abs_url)
    if not urls:
        return {}
    return {"image": urls[0], "images": urls}


def _parse_feature_items(card: Tag) -> dict[str, Any]:
    out: dict[str, Any] = {}
    for item in card.select(".features .item span"):
        span_text = item.get_text(" ", strip=True)
        if not span_text:
            continue
        floor_m = re.search(r"طبقه\s*(\d+)", span_text, re.I)
        if floor_m:
            out["floor"] = int(floor_m.group(1))
        rooms_m = re.search(r"(\d+)\s*خواب", span_text, re.I)
        if rooms_m:
            out["rooms"] = int(rooms_m.group(1))
        age_m = re.search(r"(\d+)\s*سال\s*ساخت", span_text, re.I)
        if age_m:
            out["buildingAge"] = int(age_m.group(1))
        if "سند" in span_text:
            out["documentType"] = span_text.strip()
    return out


def parse_list_card(anchor: Tag, page_url: str) -> dict[str, Any] | None:
    """Parse one #MelkList card anchor into a raw listing row."""
    href = anchor.get("href") or ""
    if not href or "/home/" not in href:
        return None

    card = anchor.select_one(".box.box-list.file, .box-list.file, .box.file")
    if not card:
        card = anchor

    file_code_el = card.select_one(".file-code span")
    file_code = _digits(file_code_el.get_text()) if file_code_el else anchor.get("id") or ""
    if not file_code:
        file_code = _digits(str(anchor.get("id") or ""))
    if not file_code:
        return None

    size_el = card.select_one(".size, .sizeWithImg")
    deal_badge = ""
    area = None
    if size_el:
        smalls = size_el.select(".small")
        if smalls:
            deal_badge = smalls[0].get_text(" ", strip=True)
        large = size_el.select_one(".large")
        if large:
            area = _digits(large.get_text()) or None

    deal_type, property_kind = _parse_deal_and_kind(deal_badge)
    if not deal_type and deal_badge:
        deal_type = canonicalize_deal_type(deal_badge)

    h2 = card.select_one("h2")
    city, neighborhood, location = _parse_location(h2.get_text(" ", strip=True) if h2 else "")

    pricing = card.select_one(".pricing, .pricingWithImg")
    price = deposit = monthly_rent = price_per_meter = None
    if pricing:
        for item in pricing.select(".item"):
            title_el = item.select_one(".title")
            title = title_el.get_text(" ", strip=True) if title_el else ""
            if "مبلغ کل" in title or "قیمت" in title:
                price = _price_from_item(item, "مبلغ") or price
            elif "رهن" in title and "اجاره" not in title:
                deposit = _price_from_item(item, "رهن") or deposit
            elif "اجاره" in title:
                monthly_rent = _price_from_item(item, "اجاره") or monthly_rent
            elif "متری" in title:
                price_per_meter = _price_from_item(item, "متری") or price_per_meter

    date_el = card.select_one(".FDate")
    posted_at = date_el.get_text(" ", strip=True) if date_el else None

    features = _parse_feature_items(card)
    detail_url = urljoin(page_url, href)

    title_parts = [deal_badge or deal_type or "", f"{area} متری" if area else ""]
    title = " ".join(p for p in title_parts if p).strip() or f"فایل {file_code}"

    row: dict[str, Any] = {
        "externalId": file_code,
        "fileCode": file_code,
        "title": title,
        "dealType": deal_type,
        "propertyKind": property_kind,
        "city": city,
        "neighborhood": neighborhood,
        "location": location,
        "price": price,
        "deposit": deposit,
        "monthlyRent": monthly_rent,
        "pricePerMeter": price_per_meter,
        "area": area,
        "postedAt": posted_at,
        "detailUrl": detail_url,
        **features,
        **_parse_card_images(card, page_url),
    }
    return row


def parse_list_html(html: str, page_url: str, *, max_items: int | None = None) -> list[dict[str, Any]]:
    soup = BeautifulSoup(html, "html.parser")
    melk_list = soup.select_one("#MelkList") or soup
    anchors = melk_list.select('a[id][href*="/home/"]')
    if not anchors:
        anchors = melk_list.select('a[href*="/home/"]')

    listings: list[dict[str, Any]] = []
    seen: set[str] = set()
    for anchor in anchors:
        if max_items is not None and len(listings) >= max_items:
            break
        raw = parse_list_card(anchor, page_url)
        if not raw:
            continue
        ext = str(raw.get("externalId") or "")
        if ext in seen:
            continue
        seen.add(ext)
        normalized = normalize_listing(raw, len(listings))
        if normalized:
            listings.append(normalized)
    return listings


def _build_client(storage_cookies: dict[str, str] | None = None) -> httpx.Client:
    headers = {
        "User-Agent": (
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
            "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"
        ),
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "fa-IR,fa;q=0.9,en;q=0.8",
        "X-Requested-With": "XMLHttpRequest",
    }
    client = httpx.Client(headers=headers, follow_redirects=True, timeout=120.0)
    if storage_cookies:
        for name, value in storage_cookies.items():
            client.cookies.set(name, value, domain="maskanyaban.ir")
    return client


def _cookies_from_playwright_state(storage_state_path: str | None) -> dict[str, str]:
    if not storage_state_path:
        return {}
    try:
        import json
        from pathlib import Path

        data = json.loads(Path(storage_state_path).read_text(encoding="utf-8"))
        out: dict[str, str] = {}
        for c in data.get("cookies") or []:
            if c.get("domain", "").endswith("maskanyaban.ir"):
                out[str(c["name"])] = str(c["value"])
        return out
    except Exception:
        return {}


def fetch_select_all_page(
    client: httpx.Client,
    page_num: int,
    *,
    noe_melk: str | None = None,
    noe_vagozari: str | None = None,
    referer: str | None = None,
) -> str:
    url = f"{BASE_URL}{SELECT_ALL_PATH}?page={page_num}"
    if noe_melk not in (None, "", "4"):
        url += f"&NoeMelk={noe_melk}"
    if noe_vagozari not in (None, "", "5"):
        url += f"&NoeVagozari={noe_vagozari}"
    res = client.post(
        url,
        content=b"",
        headers={
            "Content-Type": "application/json",
            "Content-Length": "0",
            "Referer": referer or LISTINGS_URL,
        },
    )
    res.raise_for_status()
    return res.text


def crawl_maskanyaban_cell(
    *,
    noe_melk: str,
    noe_vagozari: str,
    referer: str,
    max_items: int = 50,
    max_pages: int = 30,
    within_days: int | None = None,
    known_external_ids: list[str] | None = None,
    storage_state_path: str | None = None,
    enrich_details: bool = True,
) -> dict[str, Any]:
    """Crawl one deal×kind filter cell with optional date window and detail enrichment."""
    known = {str(x).strip() for x in (known_external_ids or []) if str(x).strip()}
    cookies = _cookies_from_playwright_state(storage_state_path)
    all_listings: list[dict[str, Any]] = []
    cutoff = cutoff_datetime(within_days) if within_days else None

    with _build_client(cookies) as client:
        client.get(referer)
        page_num = 1
        while page_num <= max_pages and len(all_listings) < max_items:
            try:
                html = fetch_select_all_page(
                    client,
                    page_num,
                    noe_melk=noe_melk,
                    noe_vagozari=noe_vagozari,
                    referer=referer,
                )
            except Exception as exc:
                return {
                    "ok": bool(all_listings),
                    "listings": all_listings,
                    "pagesVisited": page_num - 1,
                    "extractMethod": "maskanyaban+ajax+cell",
                    "error": str(exc) if not all_listings else None,
                    "withinDays": within_days,
                    "noeMelk": noe_melk,
                    "noeVagozari": noe_vagozari,
                }

            batch = parse_list_html(html, referer, max_items=None)
            if not batch:
                break

            if cutoff and page_entirely_before_cutoff(batch, cutoff):
                break

            for row in batch:
                ext = str(row.get("externalId") or "")
                if ext and ext in known:
                    continue
                if not row_within_days(row, cutoff):
                    continue
                if ext:
                    known.add(ext)
                all_listings.append(row)
                if len(all_listings) >= max_items:
                    break

            if len(all_listings) >= max_items:
                break
            page_num += 1

    if enrich_details and all_listings:
        import time

        from app.filing_feed.maskanyaban_detail import parse_maskanyaban_detail_html

        enriched: list[dict[str, Any]] = []
        with _build_client(cookies) as detail_client:
            for row in all_listings:
                detail_url = str(row.get("detailUrl") or "").strip()
                if detail_url:
                    try:
                        res = detail_client.get(detail_url, headers={"Referer": referer})
                        if res.status_code == 200:
                            parsed = parse_maskanyaban_detail_html(res.text, authenticated=False)
                            row = {**row, **{k: v for k, v in parsed.items() if v not in (None, "")}}
                    except Exception:
                        pass
                    time.sleep(0.35)
                enriched.append(row)
        all_listings = enriched

    return {
        "ok": True,
        "listings": all_listings[:max_items],
        "pagesVisited": max(page_num - 1, 0),
        "pageUrl": referer,
        "extractMethod": "maskanyaban+ajax+cell",
        "error": None,
        "withinDays": within_days,
        "noeMelk": noe_melk,
        "noeVagozari": noe_vagozari,
        "exhausted": len(all_listings) == 0,
    }


def crawl_maskanyaban_list(
    *,
    max_items: int = 50,
    max_pages: int = 10,
    known_external_ids: list[str] | None = None,
    storage_state_path: str | None = None,
    listings_url: str = LISTINGS_URL,
    within_days: int | None = None,
) -> dict[str, Any]:
    known = {str(x).strip() for x in (known_external_ids or []) if str(x).strip()}
    cookies = _cookies_from_playwright_state(storage_state_path)
    all_listings: list[dict[str, Any]] = []
    cutoff = cutoff_datetime(within_days) if within_days else None

    with _build_client(cookies) as client:
        client.get(listings_url)
        page_num = 1
        while page_num <= max_pages and len(all_listings) < max_items:
            try:
                html = fetch_select_all_page(client, page_num)
            except Exception as exc:
                return {
                    "ok": bool(all_listings),
                    "listings": all_listings,
                    "pagesVisited": page_num - 1,
                    "extractMethod": "maskanyaban+ajax",
                    "error": str(exc) if not all_listings else None,
                    "withinDays": within_days,
                }

            batch = parse_list_html(
                html,
                listings_url,
                max_items=None,
            )
            if not batch:
                break

            if cutoff and page_entirely_before_cutoff(batch, cutoff):
                break

            for row in batch:
                ext = str(row.get("externalId") or "")
                if ext and ext in known:
                    continue
                if not row_within_days(row, cutoff):
                    continue
                if ext:
                    known.add(ext)
                all_listings.append(row)
                if len(all_listings) >= max_items:
                    break

            if len(all_listings) >= max_items:
                break
            page_num += 1

    visited_pages = max(page_num - 1, 0)
    return {
        "ok": True,
        "listings": all_listings[:max_items],
        "pagesVisited": visited_pages,
        "pageUrl": listings_url,
        "extractMethod": "maskanyaban+ajax",
        "error": None,
        "withinDays": within_days,
        "exhausted": len(all_listings) == 0,
    }


def is_maskanyaban_ajax_portal(site_config: dict[str, Any]) -> bool:
    portal = str(site_config.get("portalFamily") or "")
    list_page = site_config.get("listPage") or {}
    return portal == "maskanyaban" or list_page.get("fetchMode") == "ajaxHtml"


def crawl_maskanyaban_ajax(
    listings_url: str,
    site_config: dict[str, Any],
    *,
    max_items: int = 100,
    known_external_ids: list[str] | None = None,
    within_days: int | None = None,
) -> dict[str, Any]:
    from app.filing_feed.filing_auth import storage_state_for_site
    from app.filing_feed.listing_detail_extractor import enrich_listing_from_detail

    auth = site_config.get("auth") or {}
    state = auth.get("storageStatePath") or storage_state_for_site(
        str(site_config.get("siteKey") or "maskanyaban"), site_config
    )
    pagination = (site_config.get("listPage") or {}).get("pagination") or {}
    max_pages = int(pagination.get("maxPages") or 10)
    if within_days:
        max_pages = max(max_pages, 100)

    result = crawl_maskanyaban_list(
        max_items=max_items,
        max_pages=max_pages,
        known_external_ids=known_external_ids,
        storage_state_path=str(state) if state else None,
        listings_url=listings_url,
        within_days=within_days,
    )

    detail_cfg = site_config.get("detailPage") or {}
    if detail_cfg.get("enabled") and result.get("listings"):
        import time

        enriched: list[dict[str, Any]] = []
        delay_ms = int(detail_cfg.get("delayMs") or 800)
        for i, row in enumerate(result["listings"]):
            if i > 0 and delay_ms > 0:
                time.sleep(delay_ms / 1000.0)
            enriched.append(
                enrich_listing_from_detail(
                    row,
                    storage_state=str(state) if state else None,
                    site_config=site_config,
                )
            )
        result["listings"] = enriched
    return result
