from __future__ import annotations

import re
from html import unescape
from urllib.parse import urljoin, urlparse

import httpx
from bs4 import BeautifulSoup

from app.qwen_client import extract_article_from_text

FETCH_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
        "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    ),
    "Accept-Language": "fa-IR,fa;q=0.9",
    "Accept": "text/html,application/xhtml+xml",
}

NOISE_RE = re.compile(
    r"بروزرسانی|دانلود نسخه|cookie|login|sign.?in|404|not found",
    re.I,
)


def fetch_html(url: str, *, timeout: float = 30.0) -> str:
    r = httpx.get(url, headers=FETCH_HEADERS, follow_redirects=True, timeout=timeout)
    r.raise_for_status()
    return r.text


def html_to_text(html: str) -> str:
    soup = BeautifulSoup(html, "html.parser")
    for tag in soup(["script", "style", "nav", "footer", "header", "noscript", "iframe"]):
        tag.decompose()
    text = soup.get_text("\n", strip=True)
    text = unescape(re.sub(r"\n{3,}", "\n\n", text))
    return text.strip()


def extract_links(html: str, base_url: str) -> list[str]:
    soup = BeautifulSoup(html, "html.parser")
    out: list[str] = []
    seen: set[str] = set()
    base_host = urlparse(base_url).netloc

    for a in soup.find_all("a", href=True):
        href = a["href"].strip()
        if not href or href.startswith("#") or href.startswith("javascript:"):
            continue
        full = urljoin(base_url, href)
        parsed = urlparse(full)
        if parsed.scheme not in ("http", "https"):
            continue
        if parsed.netloc and parsed.netloc != base_host:
            continue
        if full in seen:
            continue
        seen.add(full)
        out.append(full)
    return out


def discover_article_urls(seed_url: str, *, limit: int = 40) -> list[str]:
    """Discover in-site article links from a seed page."""
    try:
        html = fetch_html(seed_url)
    except Exception:
        return [seed_url]

    links = extract_links(html, seed_url)
    scored: list[tuple[int, str]] = []
    for link in links:
        score = 0
        lower = link.lower()
        if any(k in lower for k in ("mag", "blog", "article", "news", "tag", "topic", "service")):
            score += 2
        if re.search(r"[\u0600-\u06FF]", link):
            score += 1
        if re.search(r"/\d{4}/|/\d{5,}", link):
            score += 1
        scored.append((score, link))

    scored.sort(key=lambda x: -x[0])
    urls = [seed_url]
    for _, link in scored:
        if link not in urls:
            urls.append(link)
        if len(urls) >= limit:
            break
    return urls


def scrape_url_with_scrapegraph(url: str) -> str | None:
    """Use ScrapeGraphAI SmartScraperGraph when available."""
    try:
        from app.scrapegraph_bridge import ensure_scrapegraph_path, scrapegraph_llm_config

        ensure_scrapegraph_path()
        from scrapegraphai.graphs import SmartScraperGraph

        prompt = (
            "متن اصلی مقاله یا محتوای آموزشی املاک فارسی این صفحه را استخراج کن. "
            "فقط متن مفید فارسی بدون منو و تبلیغات."
        )
        graph = SmartScraperGraph(
            prompt=prompt,
            source=url,
            config=scrapegraph_llm_config(),
        )
        result = graph.run()
        if isinstance(result, dict):
            return str(result.get("answer") or result)
        return str(result)
    except Exception:
        return None


def scrape_article(url: str, *, use_scrapegraph: bool = True) -> dict | None:
    text = None
    if use_scrapegraph:
        text = scrape_url_with_scrapegraph(url)

    if not text or len(text) < 80:
        try:
            html = fetch_html(url)
            if NOISE_RE.search(html[:2000]):
                return None
            text = html_to_text(html)
        except Exception:
            return None

    if not text or len(text) < 120:
        return None
    if not re.search(r"[\u0600-\u06FF]", text):
        return None

    try:
        data = extract_article_from_text(url, text)
        data["source_url"] = url
        data["extract_chars"] = len(text)
        return data
    except Exception:
        return None


def search_urls_via_scrapegraph(query: str, *, max_results: int = 6) -> list[str]:
    try:
        from app.scrapegraph_bridge import ensure_scrapegraph_path, search_graph_config

        ensure_scrapegraph_path()
        from scrapegraphai.graphs import SearchGraph

        graph = SearchGraph(prompt=query, config=search_graph_config(max_results))
        result = graph.run()
        urls: list[str] = []
        if isinstance(result, dict):
            for key in ("urls", "links", "results", "answer"):
                val = result.get(key)
                if isinstance(val, list):
                    urls.extend(str(x) for x in val)
                elif isinstance(val, str):
                    urls.extend(re.findall(r"https?://[^\s\]\)\"']+", val))
        elif isinstance(result, list):
            urls.extend(str(x) for x in result)
        elif isinstance(result, str):
            urls.extend(re.findall(r"https?://[^\s\]\)\"']+", result))
        return list(dict.fromkeys(urls))[:max_results]
    except Exception:
        return []
