"""Resilient HTTP session for filing portals (WAF / IIS / rate-limit evasion)."""

from __future__ import annotations

import os
import random
import time
from dataclasses import dataclass
from typing import Any
from urllib.parse import urljoin

import httpx

DEFAULT_USER_AGENT = (
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
    "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"
)

RETRYABLE_STATUS = frozenset({408, 411, 425, 429, 500, 502, 503, 504})


def _http_proxy() -> str | None:
    for key in ("FILING_HTTP_PROXY", "HTTPS_PROXY", "HTTP_PROXY"):
        value = os.environ.get(key, "").strip()
        if value:
            return value
    return None


def _client_kwargs(*, timeout: httpx.Timeout, user_agent: str) -> dict[str, Any]:
    kwargs: dict[str, Any] = {
        "timeout": timeout,
        "follow_redirects": True,
        "headers": {"User-Agent": user_agent},
    }
    proxy = _http_proxy()
    if proxy:
        kwargs["proxy"] = proxy
    return kwargs


@dataclass
class AntiBotConfig:
    min_delay_ms: int = 400
    max_delay_ms: int = 1200
    max_retries: int = 4
    warmup: bool = True
    use_playwright_fallback: bool = True
    rotate_user_agent: bool = False

    @classmethod
    def from_site_config(cls, site_config: dict[str, Any]) -> AntiBotConfig:
        raw = site_config.get("antiBot") or {}
        return cls(
            min_delay_ms=int(raw.get("minDelayMs") or 400),
            max_delay_ms=int(raw.get("maxDelayMs") or 1200),
            max_retries=int(raw.get("maxRetries") or 4),
            warmup=raw.get("warmup", True) is not False,
            use_playwright_fallback=raw.get("usePlaywrightFallback", True) is not False,
            rotate_user_agent=bool(raw.get("rotateUserAgent")),
        )


def _jitter_ms(cfg: AntiBotConfig) -> int:
    lo = max(0, cfg.min_delay_ms)
    hi = max(lo, cfg.max_delay_ms)
    return random.randint(lo, hi)


def browser_headers(
    *,
    referer: str,
    origin: str | None = None,
    xhr: bool = False,
    content_type: str | None = None,
    user_agent: str = DEFAULT_USER_AGENT,
) -> dict[str, str]:
    headers = {
        "User-Agent": user_agent,
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
        "Accept-Language": "fa-IR,fa;q=0.9,en-US;q=0.8,en;q=0.7",
        "Accept-Encoding": "gzip, deflate, br",
        "Connection": "keep-alive",
        "Referer": referer,
        "Upgrade-Insecure-Requests": "1",
        "Sec-Fetch-Dest": "empty" if xhr else "document",
        "Sec-Fetch-Mode": "cors" if xhr else "navigate",
        "Sec-Fetch-Site": "same-origin",
        "sec-ch-ua": '"Chromium";v="122", "Not(A:Brand";v="24", "Google Chrome";v="122"',
        "sec-ch-ua-mobile": "?0",
        "sec-ch-ua-platform": '"macOS"',
    }
    if origin:
        headers["Origin"] = origin
    if xhr:
        headers["X-Requested-With"] = "XMLHttpRequest"
    if content_type:
        headers["Content-Type"] = content_type
    return headers


class PortalHttpSession:
    """Cookie-aware portal client with warm-up, jitter, and retries."""

    def __init__(
        self,
        *,
        base_url: str,
        referer_path: str = "/estate/all/all/",
        anti_bot: AntiBotConfig | None = None,
        timeout: float = 60.0,
    ) -> None:
        self.base_url = base_url.rstrip("/")
        self.referer = f"{self.base_url}{referer_path if referer_path.startswith('/') else '/' + referer_path}"
        self.anti_bot = anti_bot or AntiBotConfig()
        self.timeout = httpx.Timeout(timeout, connect=20.0)
        self._client: httpx.Client | None = None
        self._user_agent = DEFAULT_USER_AGENT

    def __enter__(self) -> PortalHttpSession:
        base_kwargs = _client_kwargs(timeout=self.timeout, user_agent=self._user_agent)
        try:
            self._client = httpx.Client(**base_kwargs, http2=True)
        except Exception:
            self._client = httpx.Client(**base_kwargs)
        if self.anti_bot.warmup:
            self._warmup()
        return self

    def __exit__(self, *args: object) -> None:
        if self._client:
            self._client.close()
            self._client = None

    @property
    def client(self) -> httpx.Client:
        if not self._client:
            raise RuntimeError("PortalHttpSession is not open")
        return self._client

    def cookies_snapshot(self) -> dict[str, str]:
        return dict(self.client.cookies)

    def _sleep(self) -> None:
        ms = _jitter_ms(self.anti_bot)
        if ms > 0:
            time.sleep(ms / 1000.0)

    def _warmup(self) -> None:
        headers = browser_headers(referer=self.referer, user_agent=self._user_agent)
        for attempt in range(self.anti_bot.max_retries):
            try:
                response = self.client.get(self.referer, headers=headers)
                if response.status_code < 400:
                    return
            except Exception:
                pass
            time.sleep(0.5 * (attempt + 1))

    def _request_with_retry(
        self,
        method: str,
        url: str,
        *,
        headers: dict[str, str],
        content: bytes | None = None,
    ) -> httpx.Response:
        last_exc: Exception | None = None
        for attempt in range(self.anti_bot.max_retries):
            if attempt > 0:
                self._sleep()
            try:
                if method == "POST":
                    response = self.client.post(url, content=content if content is not None else b"", headers=headers)
                else:
                    response = self.client.get(url, headers=headers)
                if response.status_code == 200:
                    return response
                if response.status_code in RETRYABLE_STATUS:
                    time.sleep(0.75 * (attempt + 1))
                    continue
                response.raise_for_status()
                return response
            except Exception as exc:
                last_exc = exc
                time.sleep(0.75 * (attempt + 1))
        if last_exc:
            raise last_exc
        raise RuntimeError(f"request failed after retries: {method} {url}")

    def post_ajax_fragment(self, url: str, *, content_type: str = "application/json") -> str:
        headers = browser_headers(
            referer=self.referer,
            origin=self.base_url,
            xhr=True,
            content_type=content_type,
            user_agent=self._user_agent,
        )
        response = self._request_with_retry("POST", url, headers=headers, content=b"")
        return response.text

    def get_html(self, url: str, *, referer: str | None = None) -> str:
        headers = browser_headers(
            referer=referer or self.referer,
            user_agent=self._user_agent,
        )
        response = self._request_with_retry("GET", url, headers=headers)
        return response.text

    def absolute_url(self, path: str) -> str:
        if path.startswith("http"):
            return path
        return urljoin(f"{self.base_url}/", path.lstrip("/"))


def fetch_maskanyaban_list_playwright(
    *,
    base_url: str,
    page_num: int,
    referer_path: str = "/estate/all/all/",
) -> str:
    """Browser fallback when raw HTTP is blocked (datacenter IP, WAF, missing cookies)."""
    import asyncio

    async def _run() -> str:
        from playwright.async_api import async_playwright

        referer = f"{base_url.rstrip('/')}{referer_path}"
        endpoint = f"/Melk/_SelectAll?page={page_num}"
        async with async_playwright() as pw:
            browser = await pw.chromium.launch(
                headless=True,
                args=[
                    "--disable-blink-features=AutomationControlled",
                    "--disable-dev-shm-usage",
                ],
            )
            context = await browser.new_context(
                locale="fa-IR",
                user_agent=DEFAULT_USER_AGENT,
                viewport={"width": 1366, "height": 900},
            )
            page = await context.new_page()
            await page.goto(referer, wait_until="domcontentloaded", timeout=60_000)
            await page.wait_for_timeout(800)
            html = await page.evaluate(
                """async ({ endpoint }) => {
                  const res = await fetch(endpoint, {
                    method: 'POST',
                    headers: {
                      'X-Requested-With': 'XMLHttpRequest',
                      'Content-Type': 'application/json',
                    },
                    body: '',
                    credentials: 'include',
                  });
                  if (!res.ok) throw new Error('status ' + res.status);
                  return await res.text();
                }""",
                {"endpoint": endpoint},
            )
            await browser.close()
            return str(html or "")

    return asyncio.run(_run())


def fetch_detail_html_resilient(
    url: str,
    *,
    referer: str,
    cookies: dict[str, str] | None = None,
    anti_bot: AntiBotConfig | None = None,
) -> str:
    cfg = anti_bot or AntiBotConfig()
    headers = browser_headers(referer=referer, user_agent=DEFAULT_USER_AGENT)
    base_kwargs = _client_kwargs(timeout=httpx.Timeout(45.0, connect=15.0), user_agent=DEFAULT_USER_AGENT)
    with httpx.Client(**base_kwargs, cookies=cookies or {}) as client:
        for attempt in range(cfg.max_retries):
            if attempt > 0:
                time.sleep(_jitter_ms(cfg) / 1000.0)
            try:
                response = client.get(url, headers=headers)
                if response.status_code == 200:
                    return response.text
                if response.status_code in RETRYABLE_STATUS:
                    continue
                response.raise_for_status()
            except Exception:
                if attempt + 1 >= cfg.max_retries:
                    break
    if cfg.use_playwright_fallback:
        from app.filing_feed.filing_auth import fetch_authenticated_html

        return fetch_authenticated_html(url, storage_state=None, headless=True)
    raise RuntimeError(f"detail fetch blocked: {url}")
