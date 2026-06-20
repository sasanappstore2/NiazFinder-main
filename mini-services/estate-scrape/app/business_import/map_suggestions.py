from __future__ import annotations

import uuid
from typing import Any


def _sid() -> str:
    return str(uuid.uuid4())


def map_suggestions(
    blueprint_id: str,
    extracted: dict[str, Any],
    source_url: str,
) -> list[dict[str, Any]]:
    suggestions: list[dict[str, Any]] = []

    name = str(extracted.get("businessName") or "").strip()
    description = str(extracted.get("description") or "").strip()
    seo_title = str(extracted.get("seoTitle") or "").strip()
    seo_desc = str(extracted.get("seoDescription") or "").strip()
    social = extracted.get("social") if isinstance(extracted.get("social"), dict) else {}

    logo_url = str(extracted.get("logoUrl") or "").strip()
    cover_url = str(extracted.get("coverImageUrl") or "").strip()
    if logo_url:
        suggestions.append(
            {
                "id": _sid(),
                "group": "brand",
                "labelFa": "???? ????????",
                "preview": {"logo": logo_url},
                "apply": {"type": "patch_profile", "payload": {"logo": logo_url}},
                "sourceUrl": source_url,
            }
        )
    if cover_url:
        suggestions.append(
            {
                "id": _sid(),
                "group": "brand",
                "labelFa": "????? ???? ????????",
                "preview": {"coverImage": cover_url},
                "apply": {"type": "patch_profile", "payload": {"coverImage": cover_url}},
                "sourceUrl": source_url,
            }
        )

    if name:
        suggestions.append(
            {
                "id": _sid(),
                "group": "brand",
                "labelFa": f"??? ????????: {name[:60]}",
                "preview": {"name": name},
                "apply": {"type": "patch_profile", "payload": {"name": name}},
                "sourceUrl": source_url,
            }
        )

    if description:
        suggestions.append(
            {
                "id": _sid(),
                "group": "brand",
                "labelFa": "??????? ?????? ????????",
                "preview": {"description": description[:500]},
                "apply": {"type": "patch_profile", "payload": {"description": description[:2000]}},
                "sourceUrl": source_url,
            }
        )

    if seo_title or seo_desc:
        payload: dict[str, str] = {}
        if seo_title:
            payload["seoTitle"] = seo_title[:120]
        if seo_desc:
            payload["seoDescription"] = seo_desc[:320]
        suggestions.append(
            {
                "id": _sid(),
                "group": "seo",
                "labelFa": "????? ? ????? SEO",
                "preview": payload,
                "apply": {"type": "patch_profile", "payload": payload},
                "sourceUrl": source_url,
            }
        )

    web_patch: dict[str, str] = {}
    for key in ("instagram", "telegram", "bale", "rubika", "eitaa", "website"):
        val = str(social.get(key) or "").strip()
        if val:
            web_patch[key] = val
    if web_patch:
        suggestions.append(
            {
                "id": _sid(),
                "group": "social",
                "labelFa": "???????? ??????? ? ???????",
                "preview": web_patch,
                "apply": {"type": "patch_web_presence", "payload": web_patch},
                "sourceUrl": source_url,
            }
        )

    phone = str(social.get("phone") or "").strip()
    email = str(social.get("email") or "").strip()
    contact_patch: dict[str, str] = {}
    if phone:
        contact_patch["phone"] = phone
    if email:
        contact_patch["email"] = email
    if contact_patch:
        suggestions.append(
            {
                "id": _sid(),
                "group": "brand",
                "labelFa": "??????? ????",
                "preview": contact_patch,
                "apply": {"type": "patch_profile", "payload": contact_patch},
                "sourceUrl": source_url,
            }
        )

    if blueprint_id == "online_store":
        categories = extracted.get("categories") or []
        if isinstance(categories, list) and categories:
            titles = [
                str(c.get("title") if isinstance(c, dict) else c).strip()
                for c in categories[:8]
            ]
            titles = [t for t in titles if t]
            if titles:
                suggestions.append(
                    {
                        "id": _sid(),
                        "group": "storefront_categories",
                        "labelFa": f"????????? ??????? ({len(titles)} ????)",
                        "preview": {"categories": titles},
                        "apply": {
                            "type": "add_categories",
                            "payload": {"titles": titles},
                        },
                        "sourceUrl": source_url,
                    }
                )

        products = extracted.get("products") or []
        if isinstance(products, list):
            items = []
            for p in products[:5]:
                if not isinstance(p, dict):
                    continue
                title = str(p.get("title") or "").strip()
                if not title:
                    continue
                cat_title = str(p.get("categoryTitle") or "").strip()
                items.append(
                    {
                        "title": title,
                        "description": str(p.get("description") or title)[:2000],
                        "priceRange": str(p.get("price") or "").strip() or None,
                        "imageUrl": str(p.get("imageUrl") or "").strip() or None,
                        "categoryTitle": cat_title or None,
                        "sourceUrl": str(p.get("sourceUrl") or source_url).strip(),
                    }
                )
            if items:
                suggestions.append(
                    {
                        "id": _sid(),
                        "group": "products",
                        "labelFa": f"??????? ???????? ({len(items)} ????)",
                        "preview": {"products": items},
                        "apply": {"type": "add_offers", "payload": {"offers": items}},
                        "sourceUrl": source_url,
                    }
                )
    else:
        services = extracted.get("services") or []
        if isinstance(services, list):
            items = []
            for s in services[:5]:
                if not isinstance(s, dict):
                    continue
                title = str(s.get("title") or "").strip()
                if not title:
                    continue
                items.append(
                    {
                        "title": title,
                        "description": str(s.get("description") or title)[:2000],
                        "ctaType": "chat",
                    }
                )
            if items:
                suggestions.append(
                    {
                        "id": _sid(),
                        "group": "products",
                        "labelFa": f"????? ({len(items)} ????)",
                        "preview": {"services": items},
                        "apply": {"type": "add_offers", "payload": {"offers": items}},
                        "sourceUrl": source_url,
                    }
                )

    return suggestions
