"""MaskanYaban-aligned crawl content templates per property kind (Python mirror of TS)."""

from __future__ import annotations

from typing import Any, TypedDict


class FilingCategoryTemplate(TypedDict):
    kind: str
    label_fa: str
    specs_section_title: str
    spec_keys: list[str]
    quick_stat_keys: list[str]
    amenity_keys: list[str]
    crawl_detail_required: list[str]
    crawl_detail_optional: list[str]
    crawl_list_feature_hints: list[str]


CORE_CRAWL = ["fileCode", "dealType", "propertyKind", "area", "location"]

FILING_CATEGORY_TEMPLATES: dict[str, FilingCategoryTemplate] = {
    "apartment": {
        "kind": "apartment",
        "label_fa": "آپارتمان",
        "specs_section_title": "مشخصات آپارتمان",
        "spec_keys": [
            "floor",
            "totalFloors",
            "unitsCount",
            "rooms",
            "buildingAge",
            "documentType",
            "cabinet",
            "flooring",
            "wallCover",
            "facade",
            "orientation",
            "heating",
            "cooling",
            "exchangeable",
        ],
        "quick_stat_keys": ["floor", "rooms", "buildingAge", "orientation"],
        "amenity_keys": [
            "hasParking",
            "hasStorage",
            "hasElevator",
            "hasTerrace",
            "hasBuiltInWardrobe",
            "hasSecurityDoor",
            "exchangeable",
        ],
        "crawl_detail_required": [*CORE_CRAWL, "price", "deposit", "monthlyRent"],
        "crawl_detail_optional": [
            "floor",
            "totalFloors",
            "unitsCount",
            "rooms",
            "buildingAge",
            "documentType",
            "cabinet",
            "flooring",
            "wallCover",
            "facade",
            "orientation",
            "heating",
            "cooling",
            "pricePerMeter",
            "description",
            "image",
            "hasParking",
            "hasStorage",
            "hasElevator",
            "hasSecurityDoor",
            "hasTerrace",
            "hasBuiltInWardrobe",
        ],
        "crawl_list_feature_hints": ["طبقه", "خواب", "سال ساخت", "سند", "آسانسور", "پارکینگ"],
    },
    "villa": {
        "kind": "villa",
        "label_fa": "خانه ویلایی",
        "specs_section_title": "مشخصات ویلا",
        "spec_keys": [
            "rooms",
            "buildingAge",
            "totalFloors",
            "floor",
            "documentType",
            "facade",
            "orientation",
            "cabinet",
            "flooring",
            "wallCover",
            "heating",
            "cooling",
            "exchangeable",
        ],
        "quick_stat_keys": ["rooms", "buildingAge", "orientation", "documentType"],
        "amenity_keys": [
            "hasParking",
            "hasStorage",
            "hasTerrace",
            "hasBuiltInWardrobe",
            "hasSecurityDoor",
            "exchangeable",
        ],
        "crawl_detail_required": [*CORE_CRAWL, "price", "deposit", "monthlyRent"],
        "crawl_detail_optional": [
            "rooms",
            "buildingAge",
            "totalFloors",
            "floor",
            "documentType",
            "facade",
            "orientation",
            "cabinet",
            "flooring",
            "wallCover",
            "heating",
            "cooling",
            "pricePerMeter",
            "description",
            "image",
            "hasParking",
            "hasStorage",
            "hasTerrace",
            "hasBuiltInWardrobe",
            "hasSecurityDoor",
        ],
        "crawl_list_feature_hints": ["خواب", "سال ساخت", "سند", "پارکینگ", "تراس"],
    },
    "land": {
        "kind": "land",
        "label_fa": "زمین",
        "specs_section_title": "مشخصات زمین",
        "spec_keys": [
            "landUse",
            "documentType",
            "orientation",
            "frontage",
            "plotWidth",
            "exchangeable",
        ],
        "quick_stat_keys": ["landUse", "documentType", "orientation", "frontage"],
        "amenity_keys": ["exchangeable"],
        "crawl_detail_required": [*CORE_CRAWL, "price", "pricePerMeter"],
        "crawl_detail_optional": [
            "landUse",
            "documentType",
            "orientation",
            "frontage",
            "plotWidth",
            "deposit",
            "monthlyRent",
            "description",
            "image",
        ],
        "crawl_list_feature_hints": ["سند", "جهت", "کاربری", "متری", "بر"],
    },
    "shop": {
        "kind": "shop",
        "label_fa": "مغازه",
        "specs_section_title": "مشخصات مغازه",
        "spec_keys": [
            "floor",
            "buildingAge",
            "documentType",
            "commercialUse",
            "frontage",
            "orientation",
            "heating",
            "cooling",
            "exchangeable",
        ],
        "quick_stat_keys": ["floor", "buildingAge", "frontage", "documentType"],
        "amenity_keys": ["hasParking", "hasStorage", "hasSecurityDoor", "exchangeable"],
        "crawl_detail_required": [*CORE_CRAWL, "price", "deposit", "monthlyRent"],
        "crawl_detail_optional": [
            "floor",
            "buildingAge",
            "documentType",
            "commercialUse",
            "frontage",
            "orientation",
            "heating",
            "cooling",
            "pricePerMeter",
            "description",
            "image",
            "hasParking",
            "hasStorage",
            "hasSecurityDoor",
        ],
        "crawl_list_feature_hints": ["طبقه", "سند", "سال ساخت", "پارکینگ"],
    },
    "office": {
        "kind": "office",
        "label_fa": "دفتر کار",
        "specs_section_title": "مشخصات دفتر",
        "spec_keys": [
            "floor",
            "totalFloors",
            "rooms",
            "buildingAge",
            "documentType",
            "orientation",
            "heating",
            "cooling",
            "exchangeable",
        ],
        "quick_stat_keys": ["floor", "rooms", "buildingAge", "orientation"],
        "amenity_keys": ["hasParking", "hasStorage", "hasElevator", "hasSecurityDoor", "exchangeable"],
        "crawl_detail_required": [*CORE_CRAWL, "price", "deposit", "monthlyRent"],
        "crawl_detail_optional": [
            "floor",
            "totalFloors",
            "rooms",
            "buildingAge",
            "documentType",
            "orientation",
            "heating",
            "cooling",
            "description",
            "image",
            "hasParking",
            "hasElevator",
        ],
        "crawl_list_feature_hints": ["طبقه", "خواب", "سند", "آسانسور"],
    },
    "commercial": {
        "kind": "commercial",
        "label_fa": "تجاری",
        "specs_section_title": "مشخصات ملک تجاری",
        "spec_keys": [
            "floor",
            "buildingAge",
            "documentType",
            "commercialUse",
            "frontage",
            "orientation",
            "heating",
            "cooling",
            "exchangeable",
        ],
        "quick_stat_keys": ["floor", "buildingAge", "frontage", "commercialUse"],
        "amenity_keys": ["hasParking", "hasStorage", "hasSecurityDoor", "exchangeable"],
        "crawl_detail_required": [*CORE_CRAWL, "price", "deposit", "monthlyRent"],
        "crawl_detail_optional": [
            "floor",
            "buildingAge",
            "documentType",
            "commercialUse",
            "frontage",
            "orientation",
            "heating",
            "cooling",
            "description",
            "image",
        ],
        "crawl_list_feature_hints": ["طبقه", "سند", "پارکینگ"],
    },
}


def resolve_filing_category_template(property_kind: str | None) -> FilingCategoryTemplate:
    if property_kind and property_kind in FILING_CATEGORY_TEMPLATES:
        return FILING_CATEGORY_TEMPLATES[property_kind]
    return FILING_CATEGORY_TEMPLATES["apartment"]


def export_crawl_manifest() -> dict[str, Any]:
    return {
        kind: {
            "labelFa": tpl["label_fa"],
            "specsSectionTitle": tpl["specs_section_title"],
            "specLabels": tpl["spec_keys"],
            "crawlDetailRequired": tpl["crawl_detail_required"],
            "crawlDetailOptional": tpl["crawl_detail_optional"],
            "crawlListFeatureHints": tpl["crawl_list_feature_hints"],
        }
        for kind, tpl in FILING_CATEGORY_TEMPLATES.items()
    }
