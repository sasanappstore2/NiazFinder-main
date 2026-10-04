"""Shared listing row normalization for filing feed extractors."""

from __future__ import annotations

import re
from typing import Any

from app.filing_feed.listing_attribute_parser import canonicalize_deal_type, canonicalize_property_kind

PERSIAN_DIGITS = str.maketrans("۰۱۲۳۴۵۶۷۸۹", "0123456789")


def _coerce_int(value: Any) -> int | None:
    if value is None or value == "":
        return None
    if isinstance(value, bool):
        return None
    if isinstance(value, int):
        return value
    cleaned = str(value).translate(PERSIAN_DIGITS)
    m = re.search(r"-?\d+", cleaned)
    return int(m.group(0)) if m else None


def _coerce_bool(value: Any) -> bool | None:
    if isinstance(value, bool):
        return value
    if value is None:
        return None
    t = str(value).strip().lower()
    if t in ("true", "1", "yes", "دارد"):
        return True
    if t in ("false", "0", "no", "ندارد", "خیر"):
        return False
    return None


def normalize_listing(row: dict[str, Any], index: int) -> dict[str, Any] | None:
    title = str(row.get("title") or row.get("headline") or "").strip()
    if len(title) < 3:
        return None

    external = str(row.get("externalId") or row.get("fileCode") or row.get("id") or "").strip()
    if not external:
        external = f"auto-{index}"

    deal_raw = row.get("dealType")
    if not deal_raw and title:
        deal_raw = title
    deal_type = canonicalize_deal_type(str(deal_raw) if deal_raw else None)

    kind_raw = row.get("propertyKind")
    if not kind_raw and title:
        kind_raw = title
    property_kind = canonicalize_property_kind(str(kind_raw) if kind_raw else None)

    return {
        "externalId": external,
        "fileCode": row.get("fileCode"),
        "title": title,
        "description": row.get("description"),
        "dealType": deal_type or row.get("dealType"),
        "propertyKind": property_kind or row.get("propertyKind"),
        "city": row.get("city"),
        "neighborhood": row.get("neighborhood"),
        "location": row.get("location"),
        "price": row.get("price"),
        "deposit": row.get("deposit"),
        "monthlyRent": row.get("monthlyRent"),
        "area": row.get("area"),
        "rooms": _coerce_int(row.get("rooms")),
        "floor": _coerce_int(row.get("floor")),
        "pricePerMeter": row.get("pricePerMeter"),
        "postedAt": row.get("postedAt") or row.get("postedAtText"),
        "totalFloors": _coerce_int(row.get("totalFloors")),
        "unitsCount": _coerce_int(row.get("unitsCount")),
        "buildingAge": _coerce_int(row.get("buildingAge")),
        "documentType": row.get("documentType"),
        "cabinet": row.get("cabinet"),
        "flooring": row.get("flooring"),
        "wallCover": row.get("wallCover"),
        "facade": row.get("facade"),
        "orientation": row.get("orientation"),
        "heating": row.get("heating"),
        "cooling": row.get("cooling"),
        "exchangeable": _coerce_bool(row.get("exchangeable")),
        "hasParking": _coerce_bool(row.get("hasParking")),
        "hasStorage": _coerce_bool(row.get("hasStorage")),
        "hasElevator": _coerce_bool(row.get("hasElevator")),
        "hasSecurityDoor": _coerce_bool(row.get("hasSecurityDoor")),
        "hasTerrace": _coerce_bool(row.get("hasTerrace")),
        "hasBuiltInWardrobe": _coerce_bool(row.get("hasBuiltInWardrobe")),
        "detailUrl": row.get("detailUrl"),
        "sourceMeta": row.get("sourceMeta"),
    }
