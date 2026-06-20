from __future__ import annotations

import re

import httpx

from app.business_import.url_security import is_safe_fetch_url
from app.scraper import FETCH_HEADERS, extract_links, html_to_text

MAX_PAGE_TEXT = 14_000
MAX_EXTRA_PAGES = 3

SHOP_HINTS = re.compile(
    r"/(shop|product|products|category|categories|store|cart|???????|?????)",
    re.I,
)
ABOUT_HINTS = re.compile(r"/(about|contact|??????|????)", re.I)


def fetch_page_text(url: str, *, timeout: float = 25.0) -> tuple[str, str]:
    """Returns (html, plain_text). Validates URL and final redirect target."""
    if not is_safe_fetch_url(url):
        raise ValueError("unsafe url")

    r = httpx.get(url, headers=FETCH_HEADERS, follow_redirects=True, timeout=timeout)
    r.raise_for_status()

    final_url = str(r.url)
    if not is_safe_fetch_url(final_url):
        raise ValueError("redirect to unsafe url")

    html = r.text
    text = html_to_text(html)[:MAX_PAGE_TEXT]
    return html, text


def pick_follow_urls(home_url: str, html: str) -> list[str]:
    links = extract_links(html, home_url)
    shop: list[str] = []
    about: list[str] = []
    for link in links:
        if not is_safe_fetch_url(link):
            continue
        if SHOP_HINTS.search(link):
            shop.append(link)
        elif ABOUT_HINTS.search(link):
            about.append(link)

    picked: list[str] = []
    for bucket in (shop[:2], about[:1]):
        for u in bucket:
            if u not in picked:
                picked.append(u)
        if len(picked) >= MAX_EXTRA_PAGES:
            break
    return picked[:MAX_EXTRA_PAGES]


def scrape_site_pages(seed_url: str) -> list[dict[str, str]]:
    pages: list[dict[str, str]] = []
    try:
        html, text = fetch_page_text(seed_url)
        pages.append({"url": seed_url, "text": text, "html": html})
        for extra in pick_follow_urls(seed_url, html):
            try:
                _, extra_text = fetch_page_text(extra)
                pages.append({"url": extra, "text": extra_text, "html": ""})
            except Exception:
                continue
    except Exception:
        return []
    return pages
