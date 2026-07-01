"""Heuristic parse of Persian housing listing card text (wizard live pick only).

Production crawls use compiled blueprint fieldMap selectors/regex — not this module.
"""

from __future__ import annotations

import re
from typing import Any

DEAL_PATTERNS: list[tuple[re.Pattern[str], str]] = [
    (re.compile(r"رهن\s*و\s*اجاره", re.I), "رهن و اجاره"),
    (re.compile(r"رهن\s*کامل", re.I), "رهن کامل"),
    (re.compile(r"پیش\s*فروش", re.I), "پیش فروش"),
    (re.compile(r"فروش", re.I), "فروش"),
    (re.compile(r"اجاره", re.I), "اجاره"),
]

KIND_PATTERNS: list[tuple[re.Pattern[str], str]] = [
    (re.compile(r"آپارتمان", re.I), "آپارتمان"),
    (re.compile(r"ویلا", re.I), "ویلا"),
    (re.compile(r"زمین", re.I), "زمین"),
    (re.compile(r"مغازه", re.I), "مغازه"),
    (re.compile(r"دفتر", re.I), "دفتر"),
    (re.compile(r"تجاری", re.I), "تجاری"),
]

_PERSIAN_DIGITS = "۰۱۲۳۴۵۶۷۸۹"


def _first_match(text: str, patterns: list[tuple[re.Pattern[str], str]]) -> str | None:
    for pattern, value in patterns:
        if pattern.search(text):
            return value
    return None


def _extract_digits(raw: str) -> str:
    out = []
    for ch in raw:
        if ch in _PERSIAN_DIGITS:
            out.append(str(_PERSIAN_DIGITS.index(ch)))
        elif ch.isdigit():
            out.append(ch)
    return "".join(out)


def parse_neighborhood_from_location(
    location_line: str, user_city: str
) -> dict[str, str | None]:
    line = location_line.strip()
    if not line:
        return {}

    city = user_city.strip()
    rest = line
    if city and city in line:
        rest = "".join(line.split(city)[1:]).lstrip(" \t-–—")

    dash_parts = re.split(r"\s*[-–—]\s*", rest)
    neighborhood: str | None = None
    if dash_parts and dash_parts[0].strip():
        neighborhood = dash_parts[0].split("،")[0].split(",")[0].strip()

    if not neighborhood and "-" in line:
        after_city = re.sub(re.escape(city), "", line, count=1).lstrip(" \t-–—")
        neighborhood = re.split(r"[،,\-–—]", after_city)[0].strip()

    if not neighborhood or len(neighborhood) < 2:
        neighborhood = None

    return {"neighborhood": neighborhood, "location": line}


def infer_listing_fields_from_text(text: str, user_city: str) -> dict[str, Any]:
    normalized = re.sub(r"\s+", " ", text).strip()
    if len(normalized) < 10:
        return {}

    file_code_m = re.search(r"کد\s*فایل\s*[:：]?\s*(\d+)", normalized, re.I)
    deposit_m = re.search(r"مبلغ\s*رهن\s*[:：]?\s*([\d۰-۹,]+)", normalized, re.I)
    rent_m = re.search(r"مبلغ\s*اجاره\s*[:：]?\s*([\d۰-۹,]+)", normalized, re.I)
    price_m = re.search(
        r"(?:قیمت|مبلغ\s*فروش)\s*[:：]?\s*([\d۰-۹,]+)", normalized, re.I
    )
    area_m = re.search(r"(\d+)\s*متری", normalized, re.I)
    floor_m = re.search(r"طبقه\s*[:：]?\s*(\d+)", normalized, re.I)
    rooms_m = re.search(r"(\d+)\s*خواب", normalized, re.I)

    deal_type = _first_match(normalized, DEAL_PATTERNS)
    property_kind = _first_match(normalized, KIND_PATTERNS)

    title_m = re.search(
        r"((?:رهن و اجاره|فروش|رهن کامل|اجاره).{0,40}?"
        r"(?:آپارتمان|ویلا|زمین|مغازه|دفتر|تجاری).{0,30}?\d+\s*متری)",
        normalized,
        re.I,
    )
    title = title_m.group(1).strip() if title_m else ""
    if not title:
        title = " ".join(
            p
            for p in [
                deal_type or "",
                property_kind or "",
                f"{area_m.group(1)} متری" if area_m else "",
            ]
            if p
        ).strip()

    location_line: str | None = None
    if user_city.strip():
        loc_m = re.search(
            re.escape(user_city.strip()) + r"[^\n]{5,120}",
            normalized,
            re.I,
        )
        if loc_m:
            location_line = loc_m.group(0).strip()

    neighborhood: str | None = None
    location: str | None = None
    if location_line:
        parsed = parse_neighborhood_from_location(location_line, user_city)
        neighborhood = parsed.get("neighborhood")
        location = parsed.get("location")

    out: dict[str, Any] = {}
    if title:
        out["title"] = title
    if file_code_m:
        out["fileCode"] = file_code_m.group(1)
    if deal_type:
        out["dealType"] = deal_type
    if property_kind:
        out["propertyKind"] = property_kind
    if neighborhood:
        out["neighborhood"] = neighborhood
    if location:
        out["location"] = location
    if deposit_m:
        out["deposit"] = _extract_digits(deposit_m.group(1))
    if rent_m:
        out["monthlyRent"] = _extract_digits(rent_m.group(1))
    if price_m:
        out["price"] = _extract_digits(price_m.group(1))
    if area_m:
        out["area"] = area_m.group(1)
    if floor_m:
        out["floor"] = floor_m.group(1)
    if rooms_m:
        out["rooms"] = rooms_m.group(1)
    return out
