"""Discover repeated listing card clusters in filing portal HTML."""

from __future__ import annotations

import re
from collections import Counter
from dataclasses import dataclass
from typing import Any

from bs4 import BeautifulSoup, Tag

LISTING_SIGNALS = re.compile(
    r"کد\s*فایل|متری|مبلغ\s*رهن|مبلغ\s*اجاره|قیمت|رهن\s*و\s*اجاره|فروش",
    re.I,
)


@dataclass
class CardCluster:
    container_selector: str
    card_selector: str
    card_count: int
    score: float
    sample_text: str


def _class_combo_selector(tag: Tag) -> str:
    name = tag.name
    classes = [c for c in (tag.get("class") or []) if c and not c.startswith("ng-")]
    if len(classes) >= 2:
        return name + "." + ".".join(classes[:4])
    if len(classes) == 1:
        return f"{name}.{classes[0]}"
    if tag.get("id"):
        return f"#{tag['id']}"
    return name


def _listing_score(text: str) -> float:
    text = (text or "").strip()
    if len(text) < 40:
        return 0.0
    score = 0.0
    if LISTING_SIGNALS.search(text):
        score += 0.5
    if "کد" in text and re.search(r"\d{4,}", text):
        score += 0.25
    if "متری" in text:
        score += 0.15
    if len(text) > 80:
        score += 0.1
    return min(score, 1.0)


def find_card_clusters(soup: BeautifulSoup, *, min_cards: int = 2) -> list[CardCluster]:
    """Find groups of similar sibling elements that look like listing cards."""
    candidates: list[CardCluster] = []

    for parent in soup.find_all(True):
        if parent.name in ("html", "body", "head", "script", "style"):
            continue
        children = [c for c in parent.children if isinstance(c, Tag)]
        if len(children) < min_cards:
            continue

        sig_counter: Counter[str] = Counter()
        scored_children: list[tuple[Tag, float, str]] = []
        for child in children:
            text = child.get_text(" ", strip=True)
            sig = f"{child.name}|{'|'.join(child.get('class') or [])}"
            sig_counter[sig] += 1
            sc = _listing_score(text)
            if sc > 0.3:
                scored_children.append((child, sc, text))

        if len(scored_children) < min_cards:
            continue

        best_sig, count = sig_counter.most_common(1)[0]
        if count < min_cards:
            continue

        tag_name, _, class_part = best_sig.partition("|")
        matching = [
            c for c in children if c.name == tag_name and "|".join(c.get("class") or []) == class_part
        ]
        if len(matching) < min_cards:
            matching = scored_children[:count]
            if len(matching) < min_cards:
                continue

        sample_tag = matching[0]
        card_sel = _class_combo_selector(sample_tag)
        parent_sel = _class_combo_selector(parent)
        container_sel = f"{parent_sel} > {card_sel}" if parent_sel != card_sel else card_sel

        avg_score = sum(_listing_score(c.get_text(" ", strip=True)) for c in matching) / len(matching)
        cluster_score = avg_score * 0.7 + min(len(matching) / 10.0, 0.3)

        candidates.append(
            CardCluster(
                container_selector=container_sel,
                card_selector=card_sel,
                card_count=len(matching),
                score=round(cluster_score, 3),
                sample_text=sample_tag.get_text(" ", strip=True)[:400],
            )
        )

    # Deduplicate by card_selector, keep highest score
    by_sel: dict[str, CardCluster] = {}
    for c in sorted(candidates, key=lambda x: -x.score):
        key = c.card_selector
        if key not in by_sel or c.score > by_sel[key].score:
            by_sel[key] = c

    return sorted(by_sel.values(), key=lambda x: -x.score)


def best_cluster(soup: BeautifulSoup) -> CardCluster | None:
    clusters = find_card_clusters(soup)
    return clusters[0] if clusters else None


def select_cards(soup: BeautifulSoup, container_selector: str) -> list[Tag]:
    """Return card elements for a container selector (card combo or parent > card)."""
    if " > " in container_selector:
        parent_sel, card_sel = container_selector.split(" > ", 1)
        parent = soup.select_one(parent_sel)
        if not parent:
            return []
        return parent.select(card_sel)
    return soup.select(container_selector)
