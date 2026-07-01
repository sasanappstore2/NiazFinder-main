"""Index filing portal HTML: login form, list regions, pagination, nav."""

from __future__ import annotations

import re
from typing import Any
from urllib.parse import urljoin

from bs4 import BeautifulSoup

from app.filing_feed.discovery.card_cluster import find_card_clusters
from app.filing_feed.discovery.field_boundary import boundaries_to_field_map, extract_field_boundaries
from app.filing_feed.discovery.selector_stability import validate_container

PERSIAN_NEXT = re.compile(r"بعدی|صفحه\s*بعد", re.I)


def _detect_portal_family(html: str, base_url: str) -> str:
    low = html.lower() + base_url.lower()
    if "maskanyaban" in low:
        return "maskanyaban"
    if "box-list file" in low or "melk/_selectall" in low:
        return "maskanyaban"
    if "showmelk" in low or ("box file clearfix" in low and "box-list" not in low):
        return "showmelk"
    if "listing-item" in low or "property-card" in low:
        return "maskanyaban"
    if "div.box.file" in low:
        return "showmelk"
    return "generic_iran_filing"


def _detect_page_kind(soup: BeautifulSoup, html: str) -> str:
    if soup.select_one('input[type="password"]'):
        return "login"
    clusters = find_card_clusters(soup, min_cards=2)
    if clusters and clusters[0].card_count >= 2:
        return "list"
    if soup.select_one("form"):
        return "login"
    return "home" if soup.title and "لیست" not in (soup.title.string or "") else "unknown"


def _guess_login_form(soup: BeautifulSoup) -> dict[str, Any] | None:
    pwd = soup.select_one('input[type="password"]')
    if not pwd:
        return None

    form = pwd.find_parent("form")
    username = None
    if form:
        username = form.select_one(
            'input[type="text"], input[type="email"], input[name="username"], '
            'input[name="mobile"], input[name="email"], input:not([type="password"])'
        )
    submit = None
    if form:
        submit = form.select_one('button[type="submit"], input[type="submit"], button')

    def _sel(el) -> str | None:
        if el is None:
            return None
        if el.get("id"):
            return f"#{el['id']}"
        if el.get("name"):
            return f'input[name="{el["name"]}"]' if el.name == "input" else f'button[type="submit"]'
        return el.name

    u_sel = _sel(username)
    p_sel = _sel(pwd) or 'input[type="password"]'
    s_sel = _sel(submit) or 'button[type="submit"]'

    conf = 0.9 if u_sel and p_sel else 0.6
    return {
        "usernameSelector": u_sel or 'input[type="text"]',
        "passwordSelector": p_sel,
        "submitSelector": s_sel,
        "confidence": conf,
    }


def _guess_pagination(soup: BeautifulSoup, base_url: str = "") -> dict[str, Any] | None:
    for a in soup.select("a"):
        t = a.get_text(strip=True)
        if PERSIAN_NEXT.search(t):
            sel = "a.page-next" if "page-next" in " ".join(a.get("class") or []) else "a:has-text('بعدی')"
            if a.get("class"):
                cls = a["class"][0]
                sel = f"a.{cls}"
            return {"mode": "nextButton", "selector": sel, "confidence": 0.8}
    nxt = soup.select_one(".pagination a.next, .pagination .next, a.next")
    if nxt:
        return {"mode": "nextButton", "selector": "a.next", "confidence": 0.75}

    import re
    from urllib.parse import urljoin

    page_links: list[tuple[str, str]] = []
    for a in soup.select("a[href]"):
        href = str(a.get("href") or "")
        if re.search(r"[?&]page=(\d+)", href):
            m = re.search(r"([?&])page=\d+", href)
            if m:
                template = re.sub(r"([?&])page=\d+", r"\1page={page}", href, count=1)
                page_links.append((template, href))
        elif re.search(r"/page/(\d+)", href):
            template = re.sub(r"/page/\d+", "/page/{page}", href, count=1)
            page_links.append((template, href))
    if page_links:
        template, sample = page_links[0]
        full = urljoin(base_url, template) if base_url and not template.startswith("http") else template
        return {"mode": "urlTemplate", "urlTemplate": full, "confidence": 0.72}
    return None


def _guess_nav_links(soup: BeautifulSoup, base_url: str) -> list[dict[str, str]]:
    links: list[dict[str, str]] = []
    for a in soup.select("nav a, .main-nav a, a")[:30]:
        href = a.get("href") or ""
        label = a.get_text(strip=True)
        if not label or len(label) > 40:
            continue
        if any(k in label for k in ("لیست", "ورود", "ثبت", "فایل", "املاک")):
            links.append(
                {
                    "label": label,
                    "href": urljoin(base_url, href),
                    "selector": f'a[href="{href}"]' if href else "a",
                }
            )
    return links[:8]


def index_site_html(html: str, base_url: str = "https://example.com/") -> dict[str, Any]:
    """Build SiteIndex-like dict from static HTML."""
    soup = BeautifulSoup(html, "html.parser")
    portal = _detect_portal_family(html, base_url)
    page_kind = _detect_page_kind(soup, html)

    clusters = find_card_clusters(soup)
    list_regions = [
        {
            "containerSelector": c.container_selector,
            "cardCount": c.card_count,
            "score": c.score,
            "sampleText": c.sample_text,
        }
        for c in clusters
    ]
    best = list_regions[0] if list_regions else None

    result: dict[str, Any] = {
        "portalFamily": portal,
        "baseUrl": base_url,
        "pageKind": page_kind,
        "listRegions": list_regions,
        "bestListRegion": best,
        "navLinks": _guess_nav_links(soup, base_url),
    }

    login = _guess_login_form(soup)
    if login:
        result["loginForm"] = login

    pagination = _guess_pagination(soup, base_url)
    if pagination:
        result["pagination"] = pagination

    if best:
        validation = validate_container(soup, best["containerSelector"])
        result["listValidation"] = validation

    return result


def discover_from_html(
    html: str,
    base_url: str = "https://example.com/",
    user_city: str = "مشهد",
) -> dict[str, Any]:
    """Full discovery: site index + field map from best list cluster."""
    site_index = index_site_html(html, base_url)
    soup = BeautifulSoup(html, "html.parser")

    field_guesses: list[dict[str, Any]] = []
    sample_cards: list[str] = []
    field_map: dict[str, Any] = {}
    confidence_map: dict[str, float] = {}

    best = site_index.get("bestListRegion")
    item_link_sel = "a.detail-link, a[href]"
    cards: list = []
    if best:
        from app.filing_feed.discovery.card_cluster import select_cards

        cards = select_cards(soup, best["containerSelector"])
        for card in cards[:3]:
            sample_cards.append(card.get_text(" ", strip=True)[:500])
        if cards:
            from app.filing_feed.discovery.item_link import discover_item_link_selector

            item_link_sel, item_link_conf = discover_item_link_selector(cards)
            boundaries = extract_field_boundaries(cards[0])
            field_map = boundaries_to_field_map(boundaries, best["containerSelector"])
            for b in boundaries:
                field_guesses.append(
                    {
                        "key": b.key,
                        "value": b.value,
                        "confidence": b.confidence,
                        "level": "high" if b.confidence >= 0.75 else "medium" if b.confidence >= 0.5 else "low",
                        "evidence": b.label_text,
                        "extractor": field_map.get(b.key),
                    }
                )
                confidence_map[b.key] = b.confidence

    blueprint: dict[str, Any] = {
        "version": 2,
        "listPage": {
            "containerSelector": best["containerSelector"] if best else None,
            "itemLinkSelector": item_link_sel if cards else "a.detail-link, a[href]",
            "dedupField": "fileCode",
        },
        "fieldMap": field_map,
        "detailPage": {"enabled": True, "linkFromList": True, "maxConcurrent": 3},
        "neighborhoodParse": {"splitOn": "-", "cityIndex": 0, "neighborhoodIndex": 1},
        "titleTemplate": "{dealType} {propertyKind} {area} متری",
    }

    if site_index.get("loginForm"):
        lf = site_index["loginForm"]
        blueprint["auth"] = {
            "usernameSelector": lf.get("usernameSelector"),
            "passwordSelector": lf.get("passwordSelector"),
            "submitSelector": lf.get("submitSelector"),
        }

    if site_index.get("pagination"):
        pg = site_index["pagination"]
        blueprint["listPage"]["pagination"] = {
            "mode": pg.get("mode", "nextButton"),
            "selector": pg.get("selector"),
            "urlTemplate": pg.get("urlTemplate"),
            "maxPages": 20,
        }

    return {
        "ok": True,
        "siteIndex": site_index,
        "fieldGuesses": field_guesses,
        "sampleCards": sample_cards,
        "blueprint": blueprint,
        "confidenceMap": confidence_map,
    }
