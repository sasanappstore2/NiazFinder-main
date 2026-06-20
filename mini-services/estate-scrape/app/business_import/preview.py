from __future__ import annotations

from typing import Any

from app.business_import.classify import classify_site, extract_for_blueprint
from app.business_import.fetch import scrape_site_pages
from app.business_import.map_suggestions import map_suggestions
from app.qwen_client import mlx_health_ok


def run_business_import_preview(
    url: str,
    *,
    hint_blueprint_id: str | None = None,
    occupation_slugs: list[str] | None = None,
) -> dict[str, Any]:
    warnings: list[str] = []

    if not mlx_health_ok():
        raise RuntimeError("intake-mlx (Qwen) not running")

    pages = scrape_site_pages(url)
    if not pages:
        raise ValueError("fetch failed — site unreachable or blocked")

    classification = classify_site(
        pages,
        hint_blueprint_id=hint_blueprint_id,
        occupation_slugs=occupation_slugs,
    )

    blueprint_id = classification["blueprintId"]
    if hint_blueprint_id in ("online_store", "company") and classification["confidence"] < 0.6:
        blueprint_id = hint_blueprint_id
        warnings.append(
            "??? ???? ?? ??????? ?? ????? ???? ??? ?? ??? ??????? ??? ??????? ??."
        )

    extracted = extract_for_blueprint(blueprint_id, pages)
    suggestions = map_suggestions(blueprint_id, extracted, url)

    if not suggestions:
        warnings.append(
            "مورد قابل پیشنهادی از سایت یافت نشد؛ می‌توانید فیلدها را دستی پر کنید."
        )

    return {
        "siteType": classification.get("siteTypeFa") or blueprint_id,
        "blueprintId": blueprint_id,
        "confidence": classification.get("confidence", 0.5),
        "pagesScraped": [p["url"] for p in pages],
        "suggestions": suggestions,
        "warnings": warnings,
    }
