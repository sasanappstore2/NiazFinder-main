"""Extract label/value field boundaries inside listing cards."""

from __future__ import annotations

import re
from dataclasses import dataclass
from typing import Any

from bs4 import BeautifulSoup, Tag

LABEL_PATTERNS: list[tuple[str, re.Pattern[str]]] = [
    ("fileCode", re.compile(r"کد\s*فایل", re.I)),
    ("deposit", re.compile(r"مبلغ\s*رهن|رهن\s*کامل\s*[:：]", re.I)),
    ("monthlyRent", re.compile(r"مبلغ\s*اجاره|اجاره\s*[:：]", re.I)),
    ("price", re.compile(r"قیمت|مبلغ\s*کل|مبلغ\s*فروش", re.I)),
    ("pricePerMeter", re.compile(r"متری\s*[:：]", re.I)),
    ("area", re.compile(r"متراژ|\d+\s*متری\b", re.I)),
    ("floor", re.compile(r"طبقه\s*[:：]", re.I)),
    ("totalFloors", re.compile(r"تعداد\s*طبقات", re.I)),
    ("unitsCount", re.compile(r"تعداد\s*واحد", re.I)),
    ("rooms", re.compile(r"تعداد\s*خواب|اتاق|خواب", re.I)),
    ("buildingAge", re.compile(r"سن\s*بنا", re.I)),
    ("documentType", re.compile(r"نوع\s*سند", re.I)),
    ("cabinet", re.compile(r"کابینت", re.I)),
    ("flooring", re.compile(r"کفپوش", re.I)),
    ("wallCover", re.compile(r"دیوارپوش", re.I)),
    ("facade", re.compile(r"نما\s*[:：]", re.I)),
    ("orientation", re.compile(r"جهت\s*ملک", re.I)),
    ("heating", re.compile(r"گرمایش", re.I)),
    ("cooling", re.compile(r"سرمایش", re.I)),
    ("exchangeable", re.compile(r"قابلیت\s*معاوضه", re.I)),
    ("neighborhood", re.compile(r"محله", re.I)),
    ("location", re.compile(r"آدرس|منطقه", re.I)),
    ("dealType", re.compile(r"رهن\s*و\s*اجاره|رهن\s*کامل|فروش|اجاره", re.I)),
    ("propertyKind", re.compile(r"آپارتمان|ویلا|زمین|مغازه|دفتر", re.I)),
]

PATTERNS_BY_KEY = {key: pattern for key, pattern in LABEL_PATTERNS}


@dataclass
class FieldBoundary:
    key: str
    value: str
    label_text: str
    value_selector: str
    confidence: float


def _relative_selector(root: Tag, target: Tag) -> str:
    if root is target:
        return ""
    parts: list[str] = []
    node: Tag | None = target
    while node and node is not root and node.name:
        seg = node.name
        classes = [c for c in (node.get("class") or []) if c][:2]
        if classes:
            seg += "." + ".".join(classes)
        parts.insert(0, seg)
        node = node.parent if isinstance(node.parent, Tag) else None
    return " > ".join(parts)


def _field_row_selector(row: Tag) -> str:
    """Stable per-field selector inside card-body field-row lists (relative to card root)."""
    parent = row.parent if isinstance(row.parent, Tag) else None
    if not parent:
        return ""
    all_children = [c for c in parent.children if isinstance(c, Tag)]
    try:
        idx = all_children.index(row) + 1
    except ValueError:
        return ""
    return f"div.field-row:nth-child({idx}) > span.value"


def _extract_from_row(row: Tag, root: Tag) -> FieldBoundary | None:
    text = row.get_text(" ", strip=True)
    if len(text) < 3:
        return None
    for key, pattern in LABEL_PATTERNS:
        if not pattern.search(text):
            continue
        value_el = row.select_one(".value, .field-value, td:last-child, span:last-child")
        if value_el:
            value = value_el.get_text(strip=True)
            rel = _field_row_selector(row) if "field-row" in " ".join(row.get("class") or []) else _relative_selector(root, value_el)
            if rel:
                return FieldBoundary(
                    key=key,
                    value=value,
                    label_text=text[:80],
                    value_selector=rel,
                    confidence=0.88,
                )
        m = re.split(r"[:：]", text, maxsplit=1)
        if len(m) == 2 and m[1].strip():
            return FieldBoundary(
                key=key,
                value=m[1].strip(),
                label_text=m[0].strip(),
                value_selector="",
                confidence=0.7,
            )
    return None


def extract_field_boundaries(card: Tag) -> list[FieldBoundary]:
    """Find structured fields inside one listing card."""
    found: list[FieldBoundary] = []
    seen_keys: set[str] = set()

    rows = card.select(".field-row, tr, p")
    for row in rows:
        if not isinstance(row, Tag):
            continue
        boundary = _extract_from_row(row, card)
        if boundary and boundary.key not in seen_keys:
            seen_keys.add(boundary.key)
            found.append(boundary)

    badge_pairs = [
        (".deal-badge", "dealType", 0.9),
        (".kind-badge", "propertyKind", 0.9),
    ]
    for sel, key, conf in badge_pairs:
        if key in seen_keys:
            continue
        badge = card.select_one(sel)
        if not badge:
            continue
        t = badge.get_text(strip=True)
        if not t:
            continue
        rel = _relative_selector(card, badge)
        if rel:
            found.append(
                FieldBoundary(
                    key=key,
                    value=t,
                    label_text=t,
                    value_selector=rel,
                    confidence=conf,
                )
            )
            seen_keys.add(key)

    for badge in card.select(".badge, h3, h4, .title"):
        if badge.select_one(".deal-badge, .kind-badge"):
            continue
        if "dealType" in seen_keys and "propertyKind" in seen_keys:
            break
        t = badge.get_text(strip=True)
        if not t:
            continue
        for key in ("dealType", "propertyKind"):
            pattern = PATTERNS_BY_KEY[key]
            if key in seen_keys:
                continue
            if pattern.search(t):
                rel = _relative_selector(card, badge)
                if rel:
                    found.append(
                        FieldBoundary(
                            key=key,
                            value=t,
                            label_text=t,
                            value_selector=rel,
                            confidence=0.75,
                        )
                    )
                    seen_keys.add(key)

    full = card.get_text("\n", strip=True)
    if "fileCode" not in seen_keys:
        m = re.search(r"کد\s*فایل\s*[:：]?\s*(\d+)", full, re.I)
        if m:
            found.append(
                FieldBoundary(
                    key="fileCode",
                    value=m.group(1),
                    label_text="کد فایل",
                    value_selector="",
                    confidence=0.75,
                )
            )

    return found


def boundaries_to_field_map(
    boundaries: list[FieldBoundary],
    card_selector: str,
) -> dict[str, dict[str, Any]]:
    """Build crawl fieldMap specs from boundaries."""
    field_map: dict[str, dict[str, Any]] = {}
    for b in boundaries:
        spec: dict[str, Any] = {"scope": "item", "attr": "textContent"}
        if b.value_selector:
            spec["selector"] = b.value_selector
        else:
            if b.key == "fileCode":
                spec["regex"] = r"کد\s*فایل\s*[:：]?\s*(\d+)"
                spec["regexGroup"] = 1
            elif b.key == "price":
                spec["regex"] = r"(?:قیمت|مبلغ\s*کل|مبلغ\s*فروش)\s*[:：]?\s*([\d,]+)"
                spec["regexGroup"] = 1
                spec["transform"] = "toman"
            elif b.key == "pricePerMeter":
                spec["regex"] = r"متری\s*[:：]?\s*([\d,]+)"
                spec["regexGroup"] = 1
                spec["transform"] = "toman"
            elif b.key == "deposit":
                spec["regex"] = r"(?:مبلغ\s*رهن|رهن\s*کامل)\s*[:：]?\s*([\d,]+)"
                spec["regexGroup"] = 1
                spec["transform"] = "toman"
            elif b.key == "monthlyRent":
                spec["regex"] = r"مبلغ\s*اجاره\s*[:：]?\s*([\d,]+)"
                spec["regexGroup"] = 1
                spec["transform"] = "toman"
            elif b.key == "area":
                spec["regex"] = r"(\d+)\s*متری"
                spec["regexGroup"] = 1
            elif b.key == "floor":
                spec["regex"] = r"طبقه\s*[:：]?\s*(\d+)"
                spec["regexGroup"] = 1
                spec["transform"] = "digits"
            elif b.key == "dealType":
                spec["regex"] = r"(رهن و اجاره|رهن کامل|فروش|اجاره)"
                spec["regexGroup"] = 1
            elif b.key == "propertyKind":
                spec["regex"] = r"(آپارتمان|ویلا|زمین|مغازه|دفتر|تجاری)"
                spec["regexGroup"] = 1
            elif b.key in ("location", "neighborhood"):
                spec["regex"] = r"محله\s*[:：]?\s*([^\n]+)"
                spec["regexGroup"] = 1
                spec["transform"] = "trim"
        field_map[b.key] = spec
    return field_map
