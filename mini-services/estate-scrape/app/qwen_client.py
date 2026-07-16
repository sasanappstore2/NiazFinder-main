from __future__ import annotations

import json
import re
from typing import Any

import httpx

from app.config import EXTRACT_ARTICLE_SYSTEM, EXTRACT_FILINGS_SYSTEM, INTAKE_LLM_MODEL, INTAKE_MLX_CHAT_URL, INTAKE_MLX_URL


def mlx_health_ok() -> bool:
    try:
        r = httpx.get(f"{INTAKE_MLX_URL.rstrip('/')}/health", timeout=5.0)
        data = r.json()
        return bool(data.get("ok"))
    except Exception:
        return False


def _extract_json_blob(text: str) -> dict[str, Any]:
    text = text.strip()
    if text.startswith("```"):
        text = re.sub(r"^```(?:json)?\s*", "", text)
        text = re.sub(r"\s*```$", "", text)
    start = text.find("{")
    end = text.rfind("}")
    if start >= 0 and end > start:
        text = text[start : end + 1]
    return json.loads(text)


def chat_completion(system: str, user: str, *, max_tokens: int = 900) -> str:
    payload = {
        "model": INTAKE_LLM_MODEL,
        "messages": [
            {"role": "system", "content": system},
            {"role": "user", "content": user},
        ],
        "max_tokens": max_tokens,
        "temperature": 0.1,
    }
    r = httpx.post(INTAKE_MLX_CHAT_URL, json=payload, timeout=120.0)
    r.raise_for_status()
    data = r.json()
    return data["choices"][0]["message"]["content"]


def extract_article_from_text(url: str, page_text: str) -> dict[str, Any]:
    clipped = page_text[:12_000]
    user = f"URL: {url}\n\nمتن صفحه:\n{clipped}"
    raw = chat_completion(EXTRACT_ARTICLE_SYSTEM, user, max_tokens=1200)
    return _extract_json_blob(raw)


def extract_filings_from_html(url: str, page_text: str, *, site_key: str = "site") -> dict[str, Any]:
    clipped = page_text[:18_000]
    user = f"Site: {site_key}\nURL: {url}\n\nمتن صفحه:\n{clipped}"
    raw = chat_completion(EXTRACT_FILINGS_SYSTEM, user, max_tokens=4000)
    return _extract_json_blob(raw)
