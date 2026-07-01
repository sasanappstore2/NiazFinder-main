"""Discover per-card detail link selector inside listing cards."""

from __future__ import annotations

import re
from collections import Counter

from bs4 import Tag

DETAIL_HINTS = re.compile(
    r"detail|view|file|listing|melk|property|show|item|card-link|more",
    re.I,
)
PAGINATION_HINTS = re.compile(r"next|page|بعدی|صفحه|prev|قبلی", re.I)
SKIP_HREF = re.compile(r"^(#|javascript:|mailto:|tel:)", re.I)


def _link_selector(card: Tag, anchor: Tag) -> str:
    """Build a stable selector relative to card root."""
    if anchor.get("class"):
        cls = anchor["class"][0]
        if cls:
            return f"a.{cls}"
    href = anchor.get("href") or ""
    if href and not SKIP_HREF.search(href):
        safe = href.split("?")[0].split("#")[0]
        if safe and len(safe) < 120:
            return f'a[href="{safe}"]'
    return "a[href]"


def discover_item_link_selector(cards: list[Tag]) -> tuple[str, float]:
    """Score anchor patterns across sample cards; return CSS selector + confidence."""
    if not cards:
        return "a.detail-link, a[href]", 0.4

    selector_scores: Counter[str] = Counter()
    for card in cards[:6]:
        for anchor in card.select("a[href]"):
            href = str(anchor.get("href") or "").strip()
            if not href or SKIP_HREF.search(href):
                continue
            text = anchor.get_text(" ", strip=True)
            cls = " ".join(anchor.get("class") or [])
            blob = f"{href} {cls} {text}"
            if PAGINATION_HINTS.search(blob):
                continue
            score = 1.0
            if DETAIL_HINTS.search(blob):
                score += 4.0
            if len(href) > 12:
                score += 1.5
            if anchor.select_one("img"):
                score += 0.5
            selector_scores[_link_selector(card, anchor)] += score

    if not selector_scores:
        return "a.detail-link, a[href]", 0.45

    best_sel, best_score = selector_scores.most_common(1)[0]
    confidence = min(0.95, 0.55 + best_score * 0.04)
    return best_sel, confidence
