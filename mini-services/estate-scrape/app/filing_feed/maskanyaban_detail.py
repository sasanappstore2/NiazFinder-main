"""MaskanYaban.ir detail page parser (#ShowMelk structured DOM)."""

from __future__ import annotations

import re
from typing import Any
from urllib.parse import urljoin

from bs4 import BeautifulSoup, Tag

from app.filing_feed.description_sanitize import sanitize_description_text
from app.filing_feed.listing_attribute_parser import (
    canonicalize_deal_type,
    canonicalize_property_kind,
    merge_listing_rows,
)

PERSIAN_DIGITS = str.maketrans("۰۱۲۳۴۵۶۷۸۹", "0123456789")
ARABIC_DIGITS = str.maketrans("٠١٢٣٤٥٦٧٨٩", "0123456789")

SPEC_LABEL_MAP: dict[str, str] = {
    "طبقه": "floor",
    "تعداد طبقات": "totalFloors",
    "تعداد واحدها": "unitsCount",
    "تعداد واحد ها": "unitsCount",
    "تعداد خواب": "rooms",
    "سن بنا": "buildingAge",
    "نوع سند": "documentType",
    "کابینت": "cabinet",
    "کفپوش": "flooring",
    "دیوارپوش": "wallCover",
    "نما": "facade",
    "جهت ملک": "orientation",
    "گرمایش": "heating",
    "سرمایش": "cooling",
    "قابلیت معاوضه": "exchangeable",
    "کاربری": "landUse",
    "نوع کاربری": "commercialUse",
    "عرض زمین": "plotWidth",
    "عرض": "plotWidth",
    "طول بر": "frontage",
    "بر": "frontage",
}


def _digits(text: str) -> str:
    return re.sub(r"\D", "", text.translate(PERSIAN_DIGITS).translate(ARABIC_DIGITS))


def _toman_from_item(item: Tag) -> str | None:
    num = item.select_one(".PriceKama, .number")
    if num:
        val = _digits(num.get_text())
        return val or None
    return None


def _parse_price_items(root: Tag) -> dict[str, Any]:
    out: dict[str, Any] = {}
    pricing = root.select_one(".pricing.pricing-one-home, .pricing")
    if not pricing:
        return out
    for item in pricing.select(".item"):
        title_el = item.select_one(".title")
        title = title_el.get_text(" ", strip=True) if title_el else ""
        val = _toman_from_item(item)
        if not val:
            continue
        if "مبلغ کل" in title or ("قیمت" in title and "متری" not in title):
            out["price"] = val
        elif "رهن" in title and "اجاره" not in title:
            out["deposit"] = val
        elif "اجاره" in title:
            out["monthlyRent"] = val
        elif "متری" in title:
            out["pricePerMeter"] = val
    return out


def _parse_spec_list(ul: Tag) -> dict[str, Any]:
    out: dict[str, Any] = {}
    text = ul.get_text("\n", strip=True)
    for line in text.split("\n"):
        line = line.strip()
        if not line:
            continue
        m = re.match(r"^(.+?)[:：]\s*(.+)$", line)
        if not m:
            continue
        label = m.group(1).strip()
        value = m.group(2).strip()
        key = SPEC_LABEL_MAP.get(label)
        if not key:
            continue
        if key in ("floor", "totalFloors", "unitsCount", "rooms", "buildingAge"):
            num = _digits(value)
            out[key] = int(num) if num else value
        elif key == "exchangeable":
            out[key] = not re.search(r"ندارد|خیر", value)
        elif key in ("plotWidth", "landUse", "frontage", "commercialUse"):
            meta = out.get("sourceMeta") or {}
            meta[key] = value
            out["sourceMeta"] = meta
        else:
            out[key] = value
    return out


def _parse_images(root: Tag, page_url: str = "https://maskanyaban.ir") -> dict[str, Any]:
    urls: list[str] = []
    for img in root.select(
        ".gallery img, .swiper img, .sizeWithImg img, .AddressWithImg img, img"
    ):
        src = img.get("src") or img.get("data-src") or img.get("data-original")
        if not src or str(src).startswith("data:"):
            continue
        lower = str(src).lower()
        if "logo" in lower or "icon" in lower:
            continue
        abs_url = urljoin(page_url, str(src))
        if abs_url not in urls:
            urls.append(abs_url)
    if not urls:
        return {}
    return {"image": urls[0], "images": urls}


def _parse_features(root: Tag) -> dict[str, Any]:
    out: dict[str, Any] = {}
    features_el = root.select_one(".total-features")
    if not features_el:
        return out
    raw = features_el.get_text(" ", strip=True)
    out["sourceMeta"] = {"rawFeatures": raw}
    if "آسانسور" in raw:
        out["hasElevator"] = True
    if "پارکینگ" in raw:
        out["hasParking"] = True
    if "انباری" in raw:
        out["hasStorage"] = True
    if "تراس" in raw:
        out["hasTerrace"] = True
    if "کمد" in raw:
        out["hasBuiltInWardrobe"] = True
    if "درب" in raw and "ضد" in raw:
        out["hasSecurityDoor"] = True
    return out


def _parse_broker_box(root: Tag, *, authenticated: bool = False) -> dict[str, Any]:
    box = root.select_one(".box-Data-ForMoshaverin")
    if not box:
        return {}
    text = box.get_text("\n", strip=True)
    meta: dict[str, Any] = {"authenticated": authenticated}

    office_m = re.search(r"دفتر\s*کارگزاری\s*(.+?)(?:\n|آدرس|شماره)", text, re.S)
    if office_m:
        meta["brokerOffice"] = office_m.group(1).strip()

    phone_m = re.search(r"شماره\s*تماس\s*[:：]?\s*(\d[\d\s\-]+)", text)
    if phone_m:
        meta["brokerPhone"] = _digits(phone_m.group(1))

    addr_m = re.search(r"آدرس\s*[:：]?\s*(.+?)(?:\n|شماره|در صورت)", text, re.S)
    if addr_m:
        addr = addr_m.group(1).strip()
        if authenticated and addr and "دفتر" not in addr[:20]:
            meta["ownerAddress"] = addr
        else:
            meta["brokerAddress"] = addr

    owner_phone_m = re.search(r"تماس\s*مالک\s*[:：]?\s*(\d[\d\s\-]+)", text)
    if owner_phone_m and authenticated:
        meta["ownerPhone"] = _digits(owner_phone_m.group(1))

    return {"sourceMeta": meta}


def _parse_size_block(root: Tag) -> dict[str, Any]:
    out: dict[str, Any] = {}
    size = root.select_one(".top .size, .size")
    if not size:
        return out
    smalls = size.select(".small")
    badge = smalls[0].get_text(" ", strip=True) if smalls else size.get_text(" ", strip=True)
    out["dealType"] = canonicalize_deal_type(badge)
    out["propertyKind"] = canonicalize_property_kind(badge)
    large = size.select_one(".large")
    if large:
        area = _digits(large.get_text())
        if area:
            out["area"] = area
    return out


def _parse_location(root: Tag) -> dict[str, Any]:
    h2 = root.select_one("h2, .AddressWithImg")
    if not h2:
        return {}
    text = h2.get_text(" ", strip=True)
    if " - " in text:
        city, neighborhood = text.split(" - ", 1)
        return {
            "city": city.strip(),
            "neighborhood": neighborhood.strip(),
            "location": text,
        }
    return {"location": text}


def _parse_description(root: Tag) -> str | None:
    for ul in root.select(".details ul"):
        classes = ul.get("class") or []
        if "mt-md-5" in classes:
            continue
        text = ul.get_text("\n", strip=True)
        if "توضیحات" not in text:
            continue
        # Prefer first li only — avoids pulling broker/footer siblings.
        first_li = ul.select_one("li")
        if first_li:
            text = first_li.get_text("\n", strip=True)
        desc = re.sub(r"^توضیحات\s*ملک\s*[:：]?\s*", "", text, flags=re.I).strip()
        return sanitize_description_text(desc)
    return None


def _parse_file_code(root: Tag) -> str | None:
    el = root.select_one(".file-code span")
    if el:
        val = _digits(el.get_text())
        return val or None
    m = re.search(r"کد\s*فایل\s*[:：]?\s*(\d+)", root.get_text(" ", strip=True))
    return m.group(1) if m else None


def _parse_posted_at(root: Tag) -> str | None:
    el = root.select_one(".FDate, .Box_Date .FDate")
    return el.get_text(" ", strip=True) if el else None


def parse_maskanyaban_detail_html(
    html: str,
    *,
    authenticated: bool = False,
) -> dict[str, Any]:
    """Parse ShowMelk detail page into listing fields."""
    soup = BeautifulSoup(html, "html.parser")
    root = soup.select_one("#ShowMelk") or soup.select_one("main .container-fluid") or soup

    out: dict[str, Any] = {}
    out.update(_parse_size_block(root))
    out.update(_parse_location(root))
    out.update(_parse_price_items(root))

    file_code = _parse_file_code(root)
    if file_code:
        out["fileCode"] = file_code
        out["externalId"] = file_code

    posted = _parse_posted_at(root)
    if posted:
        out["postedAt"] = posted

    spec_ul = root.select_one(".details ul.mt-md-5")
    if spec_ul:
        out.update(_parse_spec_list(spec_ul))

    desc = _parse_description(root)
    if desc:
        out["description"] = desc

    out.update(_parse_features(root))
    out.update(_parse_images(root))
    broker = _parse_broker_box(root, authenticated=authenticated)
    if broker.get("sourceMeta"):
        existing = out.get("sourceMeta") or {}
        out["sourceMeta"] = {**existing, **broker["sourceMeta"]}

    deal = out.get("dealType")
    if deal == "rent_rahn_full":
        out.pop("monthlyRent", None)
        out.pop("price", None)
    elif deal == "sell":
        out.pop("deposit", None)
        out.pop("monthlyRent", None)

    return out


def enrich_maskanyaban_listing(
    listing: dict[str, Any],
    html: str,
    *,
    authenticated: bool = False,
) -> dict[str, Any]:
    parsed = parse_maskanyaban_detail_html(html, authenticated=authenticated)
    merged = merge_listing_rows(listing, parsed)
    if parsed.get("sourceMeta") or listing.get("sourceMeta"):
        merged["sourceMeta"] = {
            **(listing.get("sourceMeta") or {}),
            **(parsed.get("sourceMeta") or {}),
        }
    return merged
