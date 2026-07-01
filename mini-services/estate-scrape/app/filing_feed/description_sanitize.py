"""Trim filing description text — stop before broker box, modals, site footer."""

from __future__ import annotations

import re

# Order matters: earlier cuts win.
_DESCRIPTION_CUT_PATTERNS: list[re.Pattern[str]] = [
    re.compile(r"(?:^|\n|\s)دفتر\s*کارگزاری", re.I),
    re.compile(r"\s+آدرس\s*[:：]", re.I),
    re.compile(r"(?:^|\n)\s*شماره\s*تماس\s*[:：]", re.I),
    re.compile(r"(?:^|\n)\s*تماس\s*مالک\s*[:：]", re.I),
    re.compile(r"(?:^|\n)\s*در\s*صورتی\s*که\s*مشترک", re.I),
    re.compile(r"(?:^|\n)\s*ثبت\s*(?:رایگان|ملک)", re.I),
    re.compile(r"(?:^|\n)\s*×\s*(?:\n|$)", re.I),
    re.compile(r"(?:^|\n)\s*مسکن\s*یابان\s*(?:\n|$)", re.I),
    re.compile(r"(?:^|\n)\s*برای\s*دریافت\s*اطلاع", re.I),
    re.compile(r"(?:^|\n)\s*تایید\s*قوانین\s*سایت", re.I),
]

_TRAILING_AMENITY_TOKENS = (
    "آسانسور",
    "پارکینگ",
    "انباری",
    "کمد دیواری",
    "گاز روکار",
    "تراس",
    "درب ضد سرقت",
)


def _strip_trailing_amenities(text: str) -> str:
    cleaned = text
    changed = True
    while changed:
        changed = False
        for token in _TRAILING_AMENITY_TOKENS:
            suffix = f" {token}"
            if cleaned.endswith(suffix):
                cleaned = cleaned[: -len(suffix)].rstrip()
                changed = True
    return cleaned


def sanitize_description_text(text: str | None) -> str | None:
    if not text:
        return None
    cleaned = re.sub(r"\r\n?", "\n", text.strip())
    cleaned = re.sub(r"^توضیحات\s*ملک\s*[:：]?\s*", "", cleaned, flags=re.I).strip()

    for pattern in _DESCRIPTION_CUT_PATTERNS:
        match = pattern.search(cleaned)
        if match:
            cleaned = cleaned[: match.start()].strip()

    cleaned = _strip_trailing_amenities(cleaned).strip()
    cleaned = re.sub(r"\n{3,}", "\n\n", cleaned)
    return cleaned or None


def extract_broker_meta_from_description(text: str | None) -> dict[str, str]:
    """Recover broker fields when legacy imports polluted description with broker box."""
    if not text:
        return {}
    meta: dict[str, str] = {}
    office_m = re.search(
        r"دفتر\s*کارگزاری\s*([^\n]+?)(?=\s*آدرس\s*[:：]|\n|$)",
        text,
        re.I,
    )
    if office_m:
        meta["brokerOffice"] = office_m.group(1).strip()
    addr_m = re.search(r"آدرس\s*[:：]\s*([^\n]+)", text, re.I)
    if addr_m:
        meta["brokerAddress"] = addr_m.group(1).strip()
    phone_m = re.search(r"شماره\s*تماس\s*[:：]\s*([\d\s\-]+)", text, re.I)
    if phone_m:
        meta["brokerPhone"] = re.sub(r"\D", "", phone_m.group(1))
    return meta
