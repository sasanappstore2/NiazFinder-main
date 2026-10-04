"""Portal login via Playwright async API (ScrapeGraph-compatible storage_state)."""

from __future__ import annotations

import asyncio
import re
import time
from pathlib import Path
from typing import Any
from urllib.parse import urljoin, urlparse

from bs4 import BeautifulSoup

DEFAULT_USERNAME_SELECTOR = (
    'input[name="username"], input[name="email"], input[type="email"], #username, #email'
)
DEFAULT_PASSWORD_SELECTOR = 'input[name="password"], input[type="password"], #password'
DEFAULT_SUBMIT_SELECTOR = 'button[type="submit"], input[type="submit"], button:has-text("ورود")'

AUTH_DIR = Path("/tmp/filing-auth")
LISTING_HINTS = re.compile(
    r"لیست|فایل|آگهی|املاک|مدیریت|properties|listings|files",
    re.I,
)


def _auth_path(site_key: str) -> Path:
    safe = re.sub(r"[^\w\-]", "_", site_key or "site")
    AUTH_DIR.mkdir(parents=True, exist_ok=True)
    return AUTH_DIR / f"{safe}.json"


def _pick_selectors(site_config: dict[str, Any]) -> tuple[str, str, str, int]:
    auth = site_config.get("auth") or {}
    username_sel = str(
        auth.get("usernameSelector")
        or site_config.get("usernameSelector")
        or DEFAULT_USERNAME_SELECTOR
    )
    password_sel = str(
        auth.get("passwordSelector")
        or site_config.get("passwordSelector")
        or DEFAULT_PASSWORD_SELECTOR
    )
    submit_sel = str(
        auth.get("submitSelector")
        or site_config.get("submitSelector")
        or DEFAULT_SUBMIT_SELECTOR
    )
    wait_ms = int(auth.get("waitAfterLoginMs") or site_config.get("waitAfterLoginMs") or 2500)
    return username_sel, password_sel, submit_sel, wait_ms


async def _login_async(
    *,
    login_url: str,
    username: str,
    password: str,
    site_key: str,
    site_config: dict[str, Any],
    headless: bool = True,
) -> dict[str, Any]:
    from playwright.async_api import async_playwright

    username_sel, password_sel, submit_sel, wait_ms = _pick_selectors(site_config)
    state_path = _auth_path(site_key)

    async with async_playwright() as pw:
        browser = await pw.chromium.launch(
            headless=headless,
            args=["--disable-dev-shm-usage"],
        )
        context = await browser.new_context(locale="fa-IR", viewport={"width": 1280, "height": 800})
        page = await context.new_page()
        await page.goto(login_url, wait_until="domcontentloaded", timeout=60_000)
        await page.fill(username_sel, username)
        await page.fill(password_sel, password)
        await page.click(submit_sel)
        await page.wait_for_timeout(wait_ms)
        current_url = page.url
        html = await page.content()
        await context.storage_state(path=str(state_path))
        await browser.close()

    return {
        "ok": True,
        "storageStatePath": str(state_path),
        "pageUrl": current_url,
        "html": html,
    }


def login_and_save_state(
    *,
    login_url: str,
    username: str,
    password: str,
    site_key: str,
    site_config: dict[str, Any] | None = None,
    headless: bool = True,
) -> dict[str, Any]:
    try:
        return asyncio.run(
            _login_async(
                login_url=login_url,
                username=username,
                password=password,
                site_key=site_key,
                site_config=site_config or {},
                headless=headless,
            )
        )
    except Exception as exc:
        return {"ok": False, "error": str(exc)}


async def _fetch_html_async(url: str, storage_state: str | None, headless: bool = True) -> str:
    ensure_loader = True
    if ensure_loader:
        from playwright.async_api import async_playwright

    async with async_playwright() as pw:
        browser = await pw.chromium.launch(headless=headless, args=["--disable-dev-shm-usage"])
        context = await browser.new_context(
            locale="fa-IR",
            storage_state=storage_state if storage_state and Path(storage_state).exists() else None,
        )
        page = await context.new_page()
        await page.goto(url, wait_until="domcontentloaded", timeout=60_000)
        await page.wait_for_timeout(1200)
        html = await page.content()
        await browser.close()
        return html


def fetch_authenticated_html(
    url: str,
    *,
    storage_state: str | None = None,
    headless: bool = True,
) -> str:
    return asyncio.run(_fetch_html_async(url, storage_state, headless=headless))


def guess_listings_url(html: str, base_url: str) -> str | None:
    soup = BeautifulSoup(html, "html.parser")
    best: tuple[int, str] | None = None
    for a in soup.select("a[href]"):
        label = a.get_text(" ", strip=True)
        href = a.get("href") or ""
        if not label or not href:
            continue
        if not LISTING_HINTS.search(label) and not LISTING_HINTS.search(href):
            continue
        full = urljoin(base_url, href)
        if urlparse(full).netloc != urlparse(base_url).netloc:
            continue
        score = len(label)
        if "لیست" in label or "فایل" in label:
            score += 20
        if best is None or score > best[0]:
            best = (score, full)
    return best[1] if best else None


def storage_state_for_site(site_key: str, site_config: dict[str, Any]) -> str | None:
    auth = site_config.get("auth") or {}
    path = auth.get("storageStatePath") or site_config.get("storageStatePath")
    if path and Path(str(path)).exists():
        return str(path)
    default = _auth_path(site_key)
    return str(default) if default.exists() else None
