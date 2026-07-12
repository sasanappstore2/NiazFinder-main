"""AUTO-GENERATED from fixtures/filing-portals/schema/attribute-schema.json — do not edit."""

from __future__ import annotations

FILING_DEAL_TYPES = ("sell", "rent_rahn_ejare", "rent_rahn_full", "rent_short_term")
FILING_PROPERTY_KINDS = ("apartment", "villa", "land", "office", "shop", "commercial")

EXTENDED_ATTRIBUTE_KEYS = ("postedAt", "totalFloors", "unitsCount", "buildingAge", "documentType", "cabinet", "flooring", "wallCover", "facade", "orientation", "heating", "cooling", "exchangeable", "hasParking", "hasStorage", "hasElevator", "hasSecurityDoor", "hasTerrace", "hasBuiltInWardrobe", "detailUrl", "image", "images")

CORE_FIELD_KEYS = ("title", "fileCode", "dealType", "propertyKind", "city", "neighborhood", "location", "deposit", "monthlyRent", "price", "area", "rooms", "floor", "pricePerMeter", "description")

ALL_FIELD_KEYS = ("title", "fileCode", "dealType", "propertyKind", "city", "neighborhood", "location", "deposit", "monthlyRent", "price", "area", "rooms", "floor", "pricePerMeter", "description", "postedAt", "totalFloors", "unitsCount", "buildingAge", "documentType", "cabinet", "flooring", "wallCover", "facade", "orientation", "heating", "cooling", "exchangeable", "hasParking", "hasStorage", "hasElevator", "hasSecurityDoor", "hasTerrace", "hasBuiltInWardrobe", "detailUrl", "image", "images")

KIND_BASE_SLUG = {
    "apartment": "apartment",
    "villa": "villa",
    "land": "land",
    "office": "office",
    "shop": "shop",
    "commercial": "commercial",
}

DEAL_SLUG_SUFFIX = {
    "sell": "sale",
    "rent_rahn_ejare": "rent-rahn-ejare",
    "rent_rahn_full": "rent-rahn-full",
    "rent_short_term": "rent-short-term",
}


def resolve_category_slug(deal_type: str | None, property_kind: str | None) -> str | None:
    if not property_kind or property_kind not in FILING_PROPERTY_KINDS:
        return None
    base = KIND_BASE_SLUG[property_kind]
    if not deal_type or deal_type not in FILING_DEAL_TYPES:
        return f"{base}-sale"
    return f"{base}-{DEAL_SLUG_SUFFIX[deal_type]}"
