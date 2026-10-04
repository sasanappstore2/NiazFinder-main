from __future__ import annotations

import re
import sys
from typing import Any, Type, TypeVar

from pydantic import BaseModel

from app.config import SCRAPEGRAPH_ROOT

T = TypeVar("T")


def ensure_scrapegraph_path() -> None:
    root = str(SCRAPEGRAPH_ROOT.resolve())
    if root not in sys.path:
        sys.path.insert(0, root)


def scrapegraph_llm_config() -> dict:
    """ScrapeGraphAI → local MLX via intake-mlx OpenAI-compatible API."""
    from app.config import INTAKE_LLM_MODEL, INTAKE_MLX_URL

    model = INTAKE_LLM_MODEL.strip() or "qwen3.5-2b"
    if not model.startswith("openai/"):
        model = f"openai/{model}"

    return {
        "llm": {
            "model": model,
            "model_provider": "openai",
            "api_key": "mlx-local",
            "base_url": f"{INTAKE_MLX_URL.rstrip('/')}/v1",
            "temperature": 0.1,
            "model_tokens": 8192,
        },
        "verbose": False,
        "headless": True,
        "timeout": 120,
    }


def filing_graph_config(
    *,
    storage_state: str | None = None,
    reasoning: bool = False,
    reattempt: bool = True,
    depth: int | None = None,
    max_results: int | None = None,
) -> dict:
    cfg = scrapegraph_llm_config()
    if storage_state:
        cfg["storage_state"] = storage_state
    if reasoning:
        cfg["reasoning"] = True
    if reattempt:
        cfg["reattempt"] = True
    if depth is not None:
        cfg["depth"] = depth
    if max_results is not None:
        cfg["max_results"] = max_results
    cfg["loader_kwargs"] = {
        "locale": "fa-IR",
        "requires_js_support": True,
    }
    return cfg


def search_graph_config(max_results: int = 8) -> dict:
    return filing_graph_config(max_results=max_results)


def persian_listing_prompt(*, user_city: str = "", extra: str = "") -> str:
    city_hint = f" شهر مرجع: {user_city}." if user_city.strip() else ""
    extra_hint = f" {extra.strip()}" if extra.strip() else ""
    return (
        "از این صفحه وب‌سایت املاک ایران، تمام فایل‌های آگهی موجود را استخراج کن."
        f"{city_hint}"
        " برای هر فایل: عنوان، کد فایل، نوع معامله (فروش/رهن/اجاره)، نوع ملک، شهر، محله،"
        " قیمت، ودیعه، اجاره ماهانه، متراژ، تعداد اتاق، طبقه."
        " فقط داده واقعی صفحه را برگردان، نه حدس."
        f"{extra_hint}"
    )


def persian_discovery_prompt() -> str:
    return (
        "این صفحه پورتال املاک ایران است. آدرس صفحه لیست فایل‌ها (listings) را پیدا کن،"
        " selector کانتینر کارت‌های آگهی و selector لینک هر آگهی را حدس بزن،"
        " و چند عنوان نمونه از فایل‌ها را فهرست کن."
    )


def persian_link_search_prompt() -> str:
    return (
        "لینک‌های مرتبط با «لیست فایل‌ها»، «آگهی‌ها»، «فایل‌های من»،"
        " «مدیریت فایل» یا مشابه در این پورتال املاک را پیدا کن."
    )


def normalize_graph_result(result: Any) -> Any:
    if result is None:
        return None
    if isinstance(result, BaseModel):
        return result.model_dump()
    if isinstance(result, dict):
        return result
    return {"answer": str(result)}


def run_graph_sync(
    graph_cls: Type[Any],
    *,
    prompt: str,
    source: str | list[str],
    config: dict,
    schema: Type[BaseModel] | None = None,
) -> Any:
    """Run a ScrapeGraph graph synchronously (call from thread pool)."""
    ensure_scrapegraph_path()
    kwargs: dict[str, Any] = {"prompt": prompt, "config": config}
    if isinstance(source, list):
        kwargs["source"] = source
    else:
        kwargs["source"] = source
    if schema is not None:
        kwargs["schema"] = schema
    graph = graph_cls(**kwargs)
    return normalize_graph_result(graph.run())


def is_persian(text: str) -> bool:
    return bool(re.search(r"[\u0600-\u06FF]", text))


def clean_text(text: str) -> str:
    text = re.sub(r"\s+", " ", text or "").strip()
    return text
