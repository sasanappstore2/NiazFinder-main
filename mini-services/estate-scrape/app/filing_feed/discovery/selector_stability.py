"""Validate selector stability across multiple cards."""

from __future__ import annotations

from bs4 import BeautifulSoup, Tag

from app.filing_feed.discovery.card_cluster import select_cards
from app.filing_feed.discovery.field_boundary import extract_field_boundaries


def validate_container(soup: BeautifulSoup, container_selector: str, min_cards: int = 2) -> dict:
    cards = select_cards(soup, container_selector)
    if len(cards) < min_cards:
        return {"ok": False, "cardCount": len(cards), "reason": "too_few_cards"}

    field_hits: dict[str, int] = {}
    for card in cards[:5]:
        for b in extract_field_boundaries(card):
            field_hits[b.key] = field_hits.get(b.key, 0) + 1

    return {
        "ok": True,
        "cardCount": len(cards),
        "fieldHits": field_hits,
        "coverage": len(field_hits) / max(len(cards), 1),
    }
