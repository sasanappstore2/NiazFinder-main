"""Post-login navigation: find listing pages from credentials + BFS."""

from __future__ import annotations

import re
from typing import Any
from urllib.parse import urljoin, urlparse

from app.filing_feed.site_indexer import discover_from_html, index_site_html

LIST_KEYWORDS = re.compile(
    r"لیست|فایل|آگهی|املاک|بایگانی|فروش|اجاره|رهن|ملک|properties|listings|files",
    re.I,
)


def _same_origin(a: str, b: str) -> bool:
    pa, pb = urlparse(a), urlparse(b)
    return pa.scheme == pb.scheme and pa.netloc == pb.netloc


def _score_page(html: str, url: str, index: dict[str, Any]) -> float:
    score = 0.0
    if index.get("pageKind") == "list":
        score += 50
    best = index.get("bestListRegion") or {}
    card_count = int(best.get("cardCount") or 0)
    score += min(card_count * 4, 40)
    score += float(best.get("score") or 0) * 0.2
    low = html.lower() + url.lower()
    if LIST_KEYWORDS.search(low):
        score += 8
    if index.get("loginForm"):
        score -= 15
    return score


def _collect_internal_links(page: Any, base_url: str, limit: int = 24) -> list[dict[str, str]]:
    return page.evaluate(
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
          const label = (a.innerText || a.textContent || '').trim().slice(0, 60);
          out.push({ href: u.href, label });
        } catch (e) { /* skip */ }
      }
      return out;
    }""",
        {"baseUrl": base_url, "limit": limit},
    )


def _try_login(
    page: Any,
    username: str,
    password: str,
    auth: dict[str, Any] | None = None,
) -> bool:
    auth = auth or {}
    user_sel = auth.get("usernameSelector") or 'input[name="username"], input[name="email"], #username, input[type="email"]'
    pass_sel = auth.get("passwordSelector") or 'input[type="password"], #password'
    submit_sel = auth.get("submitSelector") or 'button[type="submit"], input[type="submit"]'

    try:
        if not page.locator(pass_sel).count():
            return False
        if page.locator(user_sel).count():
            page.fill(user_sel, username, timeout=5_000)
        page.fill(pass_sel, password, timeout=5_000)
        if page.locator(submit_sel).count():
            page.click(submit_sel, timeout=8_000)
        else:
            page.keyboard.press("Enter")
        page.wait_for_timeout(1_500)
        return True
    except Exception:
        return False


def find_best_listing_page(
    page: Any,
    *,
    start_url: str,
    user_city: str = "",
    max_depth: int = 4,
    max_visits: int = 12,
) -> dict[str, Any]:
    """BFS internal pages; score by card clusters. Returns discovery payload."""
    visited: set[str] = set()
    queue: list[tuple[str, int]] = [(start_url, 0)]
    best: dict[str, Any] | None = None
    best_score = -1.0
    pages_checked = 0

    while queue and pages_checked < max_visits:
        url, depth = queue.pop(0)
        norm = urlparse(url)
        key = norm.path + ("?" + norm.query if norm.query else "")
        if key in visited:
            continue
        visited.add(key)

        try:
            if page.url != url:
                page.goto(url, wait_until="commit", timeout=30_000)
                page.wait_for_timeout(400)
        except Exception:
            continue

        pages_checked += 1
        html = page.content()
        current_url = page.url
        index = index_site_html(html, current_url)
        score = _score_page(html, current_url, index)
        discovered = discover_from_html(html, current_url, user_city)

        if score > best_score:
            best_score = score
            best = {
                "listingsUrl": current_url,
                "score": score,
                "pagesChecked": pages_checked,
                **discovered,
            }

        if score >= 55 and index.get("pageKind") == "list":
            break

        if depth >= max_depth:
            continue

        for link in _collect_internal_links(page, current_url):
            href = link.get("href") or ""
            if not href or not _same_origin(href, start_url):
                continue
            label = link.get("label") or ""
            priority = 0
            if LIST_KEYWORDS.search(label) or LIST_KEYWORDS.search(href):
                priority = -1
            queue.append((href, depth + 1))
            if priority < 0:
                queue.sort(key=lambda x: 0 if LIST_KEYWORDS.search(x[0]) else 1)

    if not best:
        html = page.content()
        best = {
            "listingsUrl": page.url,
            "score": 0,
            "pagesChecked": pages_checked,
            **discover_from_html(html, page.url, user_city),
        }
    return best


def auto_onboard(
    page: Any,
    *,
    login_url: str,
    username: str,
    password: str,
    user_city: str = "",
    auth: dict[str, Any] | None = None,
) -> dict[str, Any]:
    """Login (if needed) then navigate to best listing page."""
    report: dict[str, Any] = {"steps": [], "ok": False}

    try:
        page.goto(login_url, wait_until="commit", timeout=45_000)
        page.wait_for_timeout(500)
    except Exception as exc:
        report["error"] = f"navigate login failed: {exc}"
        return report

    html = page.content()
    index = index_site_html(html, page.url)
    logged_in = False

    if index.get("pageKind") == "login" and username and password:
        if _try_login(page, username, password, auth):
            report["steps"].append("login_submitted")
            page.wait_for_timeout(1_200)
            logged_in = True
        else:
            report["steps"].append("login_skipped_or_failed")
    elif index.get("pageKind") == "list":
        report["steps"].append("already_on_list")
    else:
        report["steps"].append("no_login_form_detected")

    start = page.url
    result = find_best_listing_page(page, start_url=start, user_city=user_city)
    result["report"] = report
    result["loggedIn"] = logged_in
    result["ok"] = bool(result.get("siteIndex", {}).get("bestListRegion"))
    return result
