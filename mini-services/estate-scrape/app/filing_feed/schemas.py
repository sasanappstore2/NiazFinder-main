"""Pydantic schemas for ScrapeGraph filing extraction."""

from __future__ import annotations

from typing import Any

from pydantic import BaseModel, Field


class FilingListing(BaseModel):
    externalId: str | None = Field(default=None, description="شناسه یکتا فایل")
    fileCode: str | None = Field(default=None, description="کد فایل")
    title: str = Field(description="عنوان آگهی")
    description: str | None = Field(default=None, description="توضیحات")
    dealType: str | None = Field(default=None, description="نوع معامله: فروش، رهن، اجاره")
    propertyKind: str | None = Field(default=None, description="نوع ملک: آپارتمان، ویلا، ...")
    city: str | None = Field(default=None, description="شهر")
    neighborhood: str | None = Field(default=None, description="محله")
    location: str | None = Field(default=None, description="موقعیت یا آدرس")
    price: str | None = Field(default=None, description="قیمت فروش")
    deposit: str | None = Field(default=None, description="ودیعه")
    monthlyRent: str | None = Field(default=None, description="اجاره ماهانه")
    area: str | None = Field(default=None, description="متراژ")
    rooms: str | None = Field(default=None, description="تعداد اتاق")
    floor: str | None = Field(default=None, description="طبقه")
    pricePerMeter: str | None = Field(default=None, description="قیمت هر متر")


class FilingListingsPage(BaseModel):
    listings: list[FilingListing] = Field(
        default_factory=list,
        description="لیست فایل‌های املاک در صفحه",
    )
    nextPageUrl: str | None = Field(default=None, description="لینک صفحه بعد در صورت وجود")


class PortalLinkCandidate(BaseModel):
    url: str = Field(description="آدرس لینک")
    label: str | None = Field(default=None, description="متن لینک")
    score: float | None = Field(default=None, description="امتیاز مرتبط بودن با لیست فایل")


class PortalDiscoveryResult(BaseModel):
    listingsUrl: str | None = Field(default=None, description="آدرس صفحه لیست فایل‌ها")
    containerSelector: str | None = Field(default=None, description="CSS selector کانتینر کارت‌ها")
    itemLinkSelector: str | None = Field(default=None, description="CSS selector لینک هر فایل")
    sampleTitles: list[str] = Field(default_factory=list, description="نمونه عنوان‌های استخراج‌شده")
    linkCandidates: list[PortalLinkCandidate] = Field(default_factory=list)
    notes: str | None = Field(default=None, description="یادداشت‌های کشف")


class PortalListPageMap(BaseModel):
    url: str
    label: str | None = None
    dealType: str | None = None
    dealTypeLabel: str | None = None
    cardCount: int | None = None
    score: float | None = None
    containerSelector: str | None = None


class PortalSiteMapResult(BaseModel):
    entryUrl: str
    pagesVisited: int = 0
    loginRequired: bool = False
    loginUrl: str | None = None
    listingsUrl: str | None = None
    listPages: list[PortalListPageMap] = Field(default_factory=list)
    notes: str | None = None


def listing_to_dict(row: FilingListing | dict[str, Any], index: int) -> dict[str, Any] | None:
    if isinstance(row, dict):
        data = row
    else:
        data = row.model_dump()
    title = str(data.get("title") or "").strip()
    if len(title) < 3:
        return None
    external = str(data.get("externalId") or data.get("fileCode") or "").strip()
    if not external:
        external = f"auto-{index}"
    return {
        "externalId": external,
        "fileCode": data.get("fileCode"),
        "title": title,
        "description": data.get("description"),
        "dealType": data.get("dealType"),
        "propertyKind": data.get("propertyKind"),
        "city": data.get("city"),
        "neighborhood": data.get("neighborhood"),
        "location": data.get("location"),
        "price": data.get("price"),
        "deposit": data.get("deposit"),
        "monthlyRent": data.get("monthlyRent"),
        "area": data.get("area"),
        "rooms": data.get("rooms"),
        "floor": data.get("floor"),
        "pricePerMeter": data.get("pricePerMeter"),
    }
