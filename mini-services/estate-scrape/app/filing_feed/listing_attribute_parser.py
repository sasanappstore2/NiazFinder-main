"""Parse Persian filing listing attribute blocks (detail page text)."""

from __future__ import annotations

import re
from typing import Any

PERSIAN_DIGITS = str.maketrans("۰۱۲۳۴۵۶۷۸۹", "0123456789")
ARABIC_DIGITS = str.maketrans("٠١٢٣٤٥٦٧٨٩", "0123456789")

FILING_DEAL_TYPES = ("sell", "rent_rahn_ejare", "rent_rahn_full", "rent_short_term")
FILING_PROPERTY_KINDS = ("apartment", "villa", "land", "office", "shop", "commercial")

DEAL_CANONICAL = {
    "فروش": "sell",
    "sell": "sell",
    "رهن و اجاره": "rent_rahn_ejare",
    "rent_rahn_ejare": "rent_rahn_ejare",
    "رهن کامل": "rent_rahn_full",
    "rent_rahn_full": "rent_rahn_full",
    "اجاره": "rent_short_term",
    "rent_short_term": "rent_short_term",
}

KIND_CANONICAL = {
    "آپارتمان": "apartment",
    "apartment": "apartment",
    "ویلا": "villa",
    "ویلایی": "villa",
    "خانه ویلایی": "villa",
    "villa": "villa",
    "زمین": "land",
    "land": "land",
    "دفتر کار": "office",
    "دفتر": "office",
    "office": "office",
    "مغازه": "shop",
    "shop": "shop",
    "تجاری": "commercial",
    "commercial": "commercial",
}

LABEL_PATTERNS: list[tuple[str, str]] = [
    ("fileCode", r"کد\s*فایل\s*[:：]?\s*(\d+)"),
    ("price", r"(?:مبلغ\s*کل|قیمت)\s*[:：]?\s*([\d,]+)"),
    ("pricePerMeter", r"متری\s*[:：]?\s*([\d,]+)"),
    ("deposit", r"(?:مبلغ\s*رهن|رهن\s*کامل)\s*[:：]?\s*([\d,]+)"),
    ("monthlyRent", r"مبلغ\s*اجاره\s*[:：]?\s*([\d,]+)"),
    ("area", r"(\d+)\s*متری"),
    ("floor", r"طبقه\s*[:：]?\s*(\d+)"),
    ("totalFloors", r"تعداد\s*طبقات\s*[:：]?\s*(\d+)"),
    ("unitsCount", r"تعداد\s*واحد(?:ها)?\s*[:：]?\s*(\d+)"),
    ("rooms", r"تعداد\s*خواب\s*[:：]?\s*(\d+)"),
    ("buildingAge", r"سن\s*بنا\s*[:：]?\s*(\d+)"),
    ("documentType", r"نوع\s*سند\s*[:：]?\s*([^\n]+?)(?:\s+کابینت|\s+کفپوش|$)"),
    ("cabinet", r"کابینت\s*[:：]?\s*([^\n]+?)(?:\s+کفپوش|\s+دیوارپوش|$)"),
    ("flooring", r"کفپوش\s*[:：]?\s*([^\n]+?)(?:\s+دیوارپوش|\s+نما|$)"),
    ("wallCover", r"دیوارپوش\s*[:：]?\s*([^\n]+?)(?:\s+نما|\s+جهت|$)"),
    ("facade", r"نما\s*[:：]?\s*([^\n]+?)(?:\s+جهت|$)"),
    ("orientation", r"جهت\s*ملک\s*[:：]?\s*([^\n]+?)(?:\s+گرمایش|$)"),
    ("heating", r"گرمایش\s*[:：]?\s*([^\n]+?)(?:\s+سرمایش|$)"),
    ("cooling", r"سرمایش\s*[:：]?\s*([^\n]+?)(?:\s+قابلیت|$)"),
    ("exchangeable", r"قابلیت\s*معاوضه\s*[:：]?\s*([^\n]+)"),
    ("landUse", r"کاربری\s*[:：]?\s*([^\n]+?)(?:\s+نوع\s+سند|\s+جهت|$)"),
    ("plotWidth", r"عرض\s*زمین\s*[:：]?\s*([۰-۹0-9]+)"),
    ("frontage", r"طول\s*بر\s*[:：]?\s*([۰-۹0-9]+)"),
    ("commercialUse", r"نوع\s*کاربری\s*[:：]?\s*([^\n]+?)(?:\s+طول\s+بر|\s+جهت|$)"),
]

DATE_PATTERN = re.compile(
    r"(?:شنبه|یکشنبه|دوشنبه|سه\s*شنبه|چهارشنبه|پنج\s*شنبه|جمعه)\s+"
    r"(\d{1,2})\s+"
    r"(فروردین|اردیبهشت|خرداد|تیر|مرداد|شهریور|مهر|آبان|آذر|دی|بهمن|اسفند|"
    r"خرداد|تیر)\s+"
    r"(\d{4})",
    re.I,
)

LOCATION_PATTERN = re.compile(
    r"([\u0600-\u06FF\u200c\s]+?)\s*[-–،,]\s*([\u0600-\u06FF\u200c\s\d/\.]+)",
)


def _digits(text: str) -> str:
    return text.translate(PERSIAN_DIGITS).translate(ARABIC_DIGITS)


def _toman(value: str) -> str:
    cleaned = _digits(value).replace(",", "").replace("،", "")
    m = re.search(r"(\d+)", cleaned)
    return m.group(1) if m else cleaned.strip()


def _bool_fa(value: str | None) -> bool | None:
    if not value:
        return None
    t = value.strip()
    if re.search(r"ندارد|خیر|نه\b", t):
        return False
    if re.search(r"دارد|بله|آری", t):
        return True
    return None


def canonicalize_deal_type(raw: str | None) -> str | None:
    if not raw:
        return None
    t = raw.strip()
    if t in DEAL_CANONICAL:
        return DEAL_CANONICAL[t]
    if re.search(r"رهن\s*کامل", t, re.I):
        return "rent_rahn_full"
    if re.search(r"رهن\s*و\s*اجاره", t, re.I):
        return "rent_rahn_ejare"
    if re.search(r"فروش|sell", t, re.I):
        return "sell"
    if re.search(r"کوتاه", t, re.I):
        return "rent_short_term"
    return None


def canonicalize_property_kind(raw: str | None) -> str | None:
    if not raw:
        return None
    t = raw.strip()
    for key, val in KIND_CANONICAL.items():
        if key in t:
            return val
    return None


def parse_listing_attributes(
    text: str,
    *,
    deal_type_hint: str | None = None,
    property_kind_hint: str | None = None,
) -> dict[str, Any]:
    """Extract structured fields from a Persian filing detail/listing text block."""
    raw = (text or "").strip()
    if not raw:
        return {}

    out: dict[str, Any] = {}
    compact = re.sub(r"\s+", " ", raw)

    if re.search(r"رهن\s*کامل\s*[:：]", compact, re.I):
        out["dealType"] = "rent_rahn_full"
    elif deal_type_hint:
        out["dealType"] = canonicalize_deal_type(deal_type_hint)
    else:
        m = re.search(r"(رهن\s*و\s*اجاره|رهن\s*کامل|فروش|اجاره)", compact, re.I)
        if m:
            out["dealType"] = canonicalize_deal_type(m.group(1))

    if property_kind_hint:
        out["propertyKind"] = canonicalize_property_kind(property_kind_hint)
    else:
        m = re.search(r"(آپارتمان|ویلا|ویلایی|خانه\s*ویلایی|زمین|دفتر\s*کار|دفتر|مغازه|تجاری)", compact, re.I)
        if m:
            out["propertyKind"] = canonicalize_property_kind(m.group(1))

    for key, pattern in LABEL_PATTERNS:
        m = re.search(pattern, compact, re.I)
        if not m:
            continue
        val = m.group(1).strip()
        if key in ("price", "deposit", "monthlyRent", "pricePerMeter"):
            out[key] = _toman(val)
        elif key in ("floor", "totalFloors", "unitsCount", "rooms", "buildingAge", "area"):
            out[key] = int(_digits(val)) if _digits(val) else val
        elif key == "exchangeable":
            out[key] = _bool_fa(val)
        elif key in ("landUse", "plotWidth", "frontage", "commercialUse"):
            meta = out.get("sourceMeta") or {}
            meta[key] = val.strip()
            out["sourceMeta"] = meta
        elif key == "fileCode":
            out[key] = _digits(val) or val
        else:
            out[key] = val.strip()

    dm = DATE_PATTERN.search(compact)
    if dm:
        out["postedAtText"] = dm.group(0).strip()

    lm = LOCATION_PATTERN.search(compact)
    if lm:
        out["city"] = lm.group(1).strip()
        out["neighborhood"] = lm.group(2).strip()
        out["location"] = f"{out['city']} - {out['neighborhood']}"

    desc_m = re.search(r"توضیحات\s*ملک\s*[:：]?\s*", raw, re.I)
    if desc_m:
        from app.filing_feed.description_sanitize import sanitize_description_text

        tail = raw[desc_m.end() :]
        out["description"] = sanitize_description_text(tail)

    if re.search(r"\bپارکینگ\b", compact):
        out["hasParking"] = True
    if re.search(r"\bانباری\b", compact):
        out["hasStorage"] = True
    if re.search(r"آسانسور", compact):
        out["hasElevator"] = True
    if re.search(r"درب\s*ضد\s*سرقت", compact):
        out["hasSecurityDoor"] = True

    deal = out.get("dealType")
    if deal == "rent_rahn_full":
        out.pop("monthlyRent", None)
        out.pop("price", None)
    elif deal == "sell":
        out.pop("deposit", None)
        out.pop("monthlyRent", None)

    return out


def merge_listing_rows(base: dict[str, Any], extra: dict[str, Any]) -> dict[str, Any]:
    merged = dict(base)
    for key, val in extra.items():
        if key == "postedAtText":
            merged["postedAt"] = val
            continue
        if val is None or val == "":
            continue
        if key not in merged or merged[key] in (None, ""):
            merged[key] = val
    return merged
