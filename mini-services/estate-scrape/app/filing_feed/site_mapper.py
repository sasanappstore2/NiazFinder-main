"""Public portal site map: BFS crawl + taxonomy (deal type, list pages) without login."""

from __future__ import annotations

import asyncio
import re
from typing import Any
from urllib.parse import urljoin, urlparse

from app.filing_feed.post_login_navigator import LIST_KEYWORDS, _score_page
from app.filing_feed.site_indexer import discover_from_html, index_site_html

DEAL_TAXONOMY: list[tuple[str, re.Pattern[str]]] = [
    ("rent_mortgage", re.compile(r"رهن\s*و\s*اجاره|رهن\s*کامل|رهن\s*\+", re.I)),
    ("rent", re.compile(r"^\s*اجاره\s*$|اجاره\s*ملک|ملک\s*اجاره", re.I)),
    ("mortgage", re.compile(r"^\s*رهن\s*$|رهن\s*کامل", re.I)),
    ("sale", re.compile(r"فروش|خرید|فایلینگ\s*فروش|فروشی", re.I)),
    ("presale", re.compile(r"پیش\s*فروش|پیش\s*خرید", re.I)),
    ("partnership", re.compile(r"مشارکت", re.I)),
    ("exchange", re.compile(r"معاوضه", re.I)),
]

PROPERTY_TAXONOMY: list[tuple[str, re.Pattern[str]]] = [
    ("apartment", re.compile(r"آپارتمان|اپارتمان", re.I)),
    ("villa", re.compile(r"ویلا|ویلایی", re.I)),
    ("land", re.compile(r"زمین|کلنگی", re.I)),
    ("commercial", re.compile(r"تجاری|مغازه|پاساژ", re.I)),
    ("office", re.compile(r"اداری|دفتر", re.I)),
    ("industrial", re.compile(r"صنعتی|کارگاه|انبار", re.I)),
]

CONTACT_HIDDEN_HINTS = re.compile(
    r"برای\s*مشاهده|ورود\s*کنید|لاگین|مخفی|hidden|blur|masked|\*{3,}|۰۹\*\*|09\*\*",
    re.I,
)
PHONE_HINT = re.compile(r"موبایل|تلفن|شماره\s*تماس|تماس\s*مالک|موبایل\s*مالک", re.I)

ALL_FIELD_KEYS = [
    "fileCode",
    "title",
    "dealType",
    "propertyKind",
    "city",
    "neighborhood",
    "location",
    "deposit",
    "monthlyRent",
    "price",
    "area",
    "rooms",
    "floor",
    "pricePerMeter",
    "ownerPhone",
    "description",
]


def _same_origin(a: str, b: str) -> bool:
    pa, pb = urlparse(a), urlparse(b)
    return pa.scheme == pb.scheme and pa.netloc == pb.netloc


def _norm_path(url: str) -> str:
    p = urlparse(url)
    return p.path + ("?" + p.query if p.query else "")


def classify_taxonomy(label: str, href: str = "") -> dict[str, str | None]:
    text = f"{label} {href}"
    deal: str | None = None
    prop: str | None = None
    for key, pat in DEAL_TAXONOMY:
        if pat.search(text):
            deal = key
            break
    for key, pat in PROPERTY_TAXONOMY:
        if pat.search(text):
            prop = key
            break
    return {"dealType": deal, "propertyKind": prop}


def _deal_label(key: str | None) -> str:
    labels = {
        "rent_mortgage": "رهن و اجاره",
        "rent": "اجاره",
        "mortgage": "رهن",
        "sale": "فروش / خرید",
        "presale": "پیش‌فروش",
        "partnership": "مشارکت",
        "exchange": "معاوضه",
    }
    return labels.get(key or "", key or "سایر")


def _property_label(key: str | None) -> str:
    labels = {
        "apartment": "آپارتمان",
        "villa": "ویلا",
        "land": "زمین",
        "commercial": "تجاری",
        "office": "اداری",
        "industrial": "صنعتی",
    }
    return labels.get(key or "", key or "")


def analyze_field_visibility(html: str, field_guesses: list[dict[str, Any]]) -> dict[str, Any]:
    seen = {str(g.get("key")) for g in field_guesses if g.get("key")}
    hidden: list[str] = []
    visible = list(seen)

    if PHONE_HINT.search(html) and "ownerPhone" not in seen:
        if CONTACT_HIDDEN_HINTS.search(html):
            hidden.append("ownerPhone")
        else:
            visible.append("ownerPhone")

    for key in ALL_FIELD_KEYS:
        if key in seen or key in hidden:
            continue
        if key == "ownerPhone" and PHONE_HINT.search(html):
            hidden.append("ownerPhone")

    never = [k for k in ALL_FIELD_KEYS if k not in visible and k not in hidden]
    return {
        "visible": sorted(set(visible)),
        "hiddenUntilLogin": sorted(set(hidden)),
        "neverSeen": never,
    }


async def _map_site_async(
    *,
    entry_url: str,
    user_city: str = "",
    max_visits: int = 18,
    max_depth: int = 4,
    headless: bool = True,
) -> dict[str, Any]:
    from playwright.async_api import async_playwright

    visited: set[str] = set()
    queue: list[tuple[str, int, str]] = [(entry_url, 0, "")]
    categories: list[dict[str, Any]] = []
    list_pages: list[dict[str, Any]] = []
    login_url: str | None = None
    pages_checked = 0
    best_list: dict[str, Any] | None = None
    best_score = -1.0

    async with async_playwright() as pw:
        browser = await pw.chromium.launch(headless=headless, args=["--disable-dev-shm-usage"])
        context = await browser.new_context(locale="fa-IR", viewport={"width": 1280, "height": 800})
        page = await context.new_page()

        while queue and pages_checked < max_visits:
            url, depth, via_label = queue.pop(0)
            key = _norm_path(url)
            if key in visited:
                continue
            visited.add(key)

            try:
                if page.url != url:
                    await page.goto(url, wait_until="domcontentloaded", timeout=45_000)
                    await page.wait_for_timeout(500)
            except Exception:
                continue

            pages_checked += 1
            current_url = page.url
            html = await page.content()
            index = index_site_html(html, current_url)
            score = _score_page(html, current_url, index)
            tax = classify_taxonomy(via_label or "", current_url)
            page_kind = str(index.get("pageKind") or "unknown")

            if page_kind == "login" and not login_url:
                login_url = current_url

            cat_entry = {
                "id": f"page-{pages_checked}",
                "label": via_label or page_kind,
                "href": current_url,
                "dealType": tax["dealType"],
                "dealTypeLabel": _deal_label(tax["dealType"]),
                "propertyKind": tax["propertyKind"],
                "propertyKindLabel": _property_label(tax["propertyKind"]),
                "pageKind": page_kind,
                "score": round(score, 1),
                "cardCount": (index.get("bestListRegion") or {}).get("cardCount"),
            }
            categories.append(cat_entry)

            if score >= 25 or page_kind == "list":
                discovered = discover_from_html(html, current_url, user_city)
                best_region = index.get("bestListRegion") or {}
                field_vis = analyze_field_visibility(html, discovered.get("fieldGuesses") or [])
                lp = {
                    "url": current_url,
                    "label": via_label or _deal_label(tax["dealType"]) or "لیست فایل",
                    "dealType": tax["dealType"],
                    "dealTypeLabel": _deal_label(tax["dealType"]),
                    "propertyKind": tax["propertyKind"],
                    "score": round(score, 1),
                    "cardCount": int(best_region.get("cardCount") or 0),
                    "containerSelector": best_region.get("containerSelector"),
                    "fieldGuesses": discovered.get("fieldGuesses") or [],
                    "sampleCards": discovered.get("sampleCards") or [],
                    "blueprint": discovered.get("blueprint") or {},
                    "fieldVisibility": field_vis,
                    "siteIndex": discovered.get("siteIndex"),
                }
                list_pages.append(lp)
                if score > best_score:
                    best_score = score
                    best_list = lp

            if depth >= max_depth:
                continue

            links = await page.evaluate(
                """({ baseUrl, limit }) => {
              const origin = new URL(baseUrl).origin;
              const out = [];
              const seen = new Set();
              for (const a of document.querySelectorAll('a[href]')) {
                if (out.length >= limit) break;
                let href = a.getAttribute('href') || '';
                if (!href || href.startsWith('#') || href.startsWith('javascript:')) continue;
                try {
                  const u = new URL(href, baseUrl);
                  if (u.origin !== origin) continue;
                  const key = u.pathname + u.search;
                  if (seen.has(key)) continue;
                  seen.add(key);
                  const label = (a.innerText || a.textContent || '').trim().slice(0, 80);
                  if (!label) continue;
                  out.push({ href: u.href, label });
                } catch (e) { /* skip */ }
              }
              return out;
            }""",
                {"baseUrl": current_url, "limit": 32},
            )

            for link in links:
                href = str(link.get("href") or "")
                label = str(link.get("label") or "")
                if not href or not _same_origin(href, entry_url):
                    continue
                tax_link = classify_taxonomy(label, href)
                priority = 1
                if LIST_KEYWORDS.search(label) or LIST_KEYWORDS.search(href):
                    priority = 0
                if tax_link["dealType"]:
                    priority = 0
                item = (href, depth + 1, label)
                if priority == 0:
                    queue.insert(0, item)
                else:
                    queue.append(item)

        await browser.close()

    list_pages.sort(key=lambda x: float(x.get("score") or 0), reverse=True)

    taxonomy_groups: dict[str, list[dict[str, Any]]] = {}
    for lp in list_pages:
        dk = str(lp.get("dealType") or "other")
        taxonomy_groups.setdefault(dk, []).append(lp)

    navigation_tree = [
        {
            "dealType": dk,
            "dealTypeLabel": _deal_label(None if dk == "other" else dk),
            "listPages": [
                {"url": p["url"], "label": p["label"], "cardCount": p.get("cardCount"), "score": p.get("score")}
                for p in pages
            ],
        }
        for dk, pages in taxonomy_groups.items()
    ]

    merged_blueprint: dict[str, Any] = {"version": 2}
    merged_site_index: dict[str, Any] | None = None
    merged_guesses: list[dict[str, Any]] = []
    merged_samples: list[str] = []
    field_visibility: dict[str, Any] = {"visible": [], "hiddenUntilLogin": [], "neverSeen": ALL_FIELD_KEYS}

    if best_list:
        merged_blueprint = dict(best_list.get("blueprint") or merged_blueprint)
        merged_site_index = best_list.get("siteIndex")
        merged_guesses = list(best_list.get("fieldGuesses") or [])
        merged_samples = list(best_list.get("sampleCards") or [])
        field_visibility = best_list.get("fieldVisibility") or field_visibility
        merged_blueprint.setdefault("portalMap", {})
        merged_blueprint["portalMap"] = {
            "entryUrl": entry_url,
            "listPages": [
                {
                    "url": p["url"],
                    "dealType": p.get("dealType"),
                    "dealTypeLabel": p.get("dealTypeLabel"),
                    "containerSelector": p.get("containerSelector"),
                }
                for p in list_pages[:12]
            ],
            "categories": categories[:40],
            "fieldVisibility": field_visibility,
        }

    login_required = bool(login_url) or bool(field_visibility.get("hiddenUntilLogin"))

    return {
        "ok": bool(list_pages or categories),
        "entryUrl": entry_url,
        "pagesVisited": pages_checked,
        "loginRequired": login_required,
        "loginUrl": login_url,
        "categories": categories,
        "listPages": list_pages,
        "bestListPage": best_list,
        "navigationTree": navigation_tree,
        "listingsUrl": (best_list or {}).get("url") or entry_url,
        "blueprint": merged_blueprint,
        "siteIndex": merged_site_index,
        "fieldGuesses": merged_guesses,
        "sampleCards": merged_samples,
        "fieldVisibility": field_visibility,
        "notes": (
            "نقشه بدون ورود ساخته شد. "
            + (
                f"فیلدهای مخفی تا لاگین: {', '.join(field_visibility.get('hiddenUntilLogin') or [])}. "
                if field_visibility.get("hiddenUntilLogin")
                else ""
            )
            + ("برای کراول کامل یوزر/پس اضافه کنید." if login_required else "")
        ),
    }


def map_site_public(
    *,
    entry_url: str,
    user_city: str = "",
    max_visits: int = 18,
    headless: bool = True,
) -> dict[str, Any]:
    entry = entry_url.strip()
    if not entry:
        return {"ok": False, "error": "entry URL required"}
    try:
        return asyncio.run(
            _map_site_async(
                entry_url=entry,
                user_city=user_city,
                max_visits=max_visits,
                headless=headless,
            )
        )
    except Exception as exc:
        return {"ok": False, "error": str(exc)}
