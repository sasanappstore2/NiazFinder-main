from __future__ import annotations

import json
import re
from typing import Any

from app.qwen_client import chat_completion

CLASSIFY_SYSTEM = (
    "تو یک طبقه‌بند سایت کسب‌وکار هستی. فقط JSON معتبر برگردان:\n"
    '{"blueprintId":"online_store"|"company","confidence":0.0-1.0,"signals":["..."],"siteTypeFa":"..."}\n'
    "online_store برای فروشگاه/فروش آنلاین. company برای شرکت/سازمان/خدمات B2B."
)

EXTRACT_STORE_SYSTEM = (
    "از متن صفحات یک فروشگاه آنلاین این JSON را استخراج کن:\n"
    '{"businessName":"...","description":"...","seoTitle":"...","seoDescription":"...",'
    '"logoUrl":"...","coverImageUrl":"...",'
    '"categories":[{"title":"..."}],'
    '"products":[{"title":"...","description":"...","price":"...","categoryTitle":"...","imageUrl":"...","sourceUrl":"..."}],'
    '"social":{"website":"","instagram":"","telegram":""}}\n'
    "حداکثر ۸ دسته و ۵ محصول. imageUrl و sourceUrl اختیاری. فقط JSON معتبر."
)

EXTRACT_COMPANY_SYSTEM = (
    "از متن صفحات یک شرکت/سازمان این JSON را استخراج کن:\n"
    '{"businessName":"...","description":"...","seoTitle":"...","seoDescription":"...",'
    '"logoUrl":"...","coverImageUrl":"...",'
    '"services":[{"title":"...","description":"..."}],'
    '"social":{"website":"","instagram":"","telegram":"","email":"","phone":""}}\n'
    "حداکثر ۵ خدمت. فقط JSON معتبر."
)


def _extract_json(text: str) -> dict[str, Any]:
    text = text.strip()
    if text.startswith("```"):
        text = re.sub(r"^```(?:json)?\s*", "", text)
        text = re.sub(r"\s*```$", "", text)
    start = text.find("{")
    end = text.rfind("}")
    if start >= 0 and end > start:
        text = text[start : end + 1]
    return json.loads(text)


def classify_site(
    pages: list[dict[str, str]],
    *,
    hint_blueprint_id: str | None = None,
    occupation_slugs: list[str] | None = None,
) -> dict[str, Any]:
    combined = "\n\n---\n\n".join(
        f"URL: {p['url']}\n{p['text'][:6000]}" for p in pages[:4]
    )
    hints = []
    if hint_blueprint_id:
        hints.append(f"hintBlueprintId={hint_blueprint_id}")
    if occupation_slugs:
        hints.append(f"occupationSlugs={','.join(occupation_slugs[:5])}")

    user = f"{' '.join(hints)}\n\n{combined}"
    try:
        raw = chat_completion(CLASSIFY_SYSTEM, user, max_tokens=400)
        data = _extract_json(raw)
    except (json.JSONDecodeError, ValueError, TypeError):
        data = {}

    blueprint = data.get("blueprintId") or hint_blueprint_id or "company"
    if blueprint not in ("online_store", "company"):
        blueprint = "company"
    return {
        "blueprintId": blueprint,
        "confidence": float(data.get("confidence") or 0.5),
        "signals": data.get("signals") or [],
        "siteTypeFa": data.get("siteTypeFa")
        or ("فروشگاه اینترنتی" if blueprint == "online_store" else "شرکت"),
    }


def extract_for_blueprint(blueprint_id: str, pages: list[dict[str, str]]) -> dict[str, Any]:
    combined = "\n\n---\n\n".join(
        f"URL: {p['url']}\n{p['text'][:8000]}" for p in pages[:4]
    )
    system = EXTRACT_STORE_SYSTEM if blueprint_id == "online_store" else EXTRACT_COMPANY_SYSTEM
    try:
        raw = chat_completion(system, combined, max_tokens=2000)
        return _extract_json(raw)
    except (json.JSONDecodeError, ValueError, TypeError):
        return {}
