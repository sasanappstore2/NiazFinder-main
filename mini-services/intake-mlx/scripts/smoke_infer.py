#!/usr/bin/env python3
"""Smoke test: health + parse one Persian sentence. Requires server on :8100."""
from __future__ import annotations

import json
import sys
import urllib.error
import urllib.request

BASE = "http://127.0.0.1:8100"
TEXT = "میخوام یک دسته پلی استیشن بخر"


def get(path: str) -> dict:
    with urllib.request.urlopen(f"{BASE}{path}", timeout=120) as r:
        return json.loads(r.read().decode())


def post(path: str, body: dict) -> dict:
    data = json.dumps(body).encode()
    req = urllib.request.Request(
        f"{BASE}{path}",
        data=data,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=300) as r:
        return json.loads(r.read().decode())


def main() -> int:
    try:
        health = get("/health")
        print("health:", json.dumps(health, ensure_ascii=False, indent=2))
        adapter = health.get("adapterPath")
        load_error = health.get("loadError")
        if adapter:
            print("adapterPath:", adapter)
        if load_error:
            print("FAIL: model load error:", load_error, file=sys.stderr)
            return 1
        if not health.get("ok"):
            print("WARN: model not loaded yet; first parse will download/load weights")
        elif adapter and "estate-intake-lora" not in str(adapter):
            print("WARN: expected estate-intake-lora adapter in dev; got:", adapter)

        result = post("/v1/parse", {"text": TEXT})
        print("parse:", json.dumps(result, ensure_ascii=False, indent=2))
        slug = result.get("labels", {}).get("categorySlug", "")
        if "game" in slug or "console" in slug or "product" in str(result):
            print("OK: plausible product/game parse")
        else:
            print("WARN: unexpected categorySlug:", slug)

        title_result = post(
            "/v1/title",
            {
                "context": {
                    "needType": "product_search",
                    "intentType": "product_search",
                    "categoryPathFa": "بازی و سرگرمی › کنسول بازی",
                    "city": "تهران",
                    "productName": "پلی‌استیشن",
                    "sourceSummary": TEXT,
                }
            },
        )
        print("title:", json.dumps(title_result, ensure_ascii=False, indent=2))
        title = title_result.get("title", "")
        if title and len(title) <= 70:
            print("OK: title generated")
            return 0
        print("WARN: title missing or too long:", title)
        return 0
    except urllib.error.URLError as e:
        print("FAIL: is intake-mlx running? npm run dev:intake-mlx", file=sys.stderr)
        print(e, file=sys.stderr)
        return 1
    except Exception as e:
        print("FAIL:", e, file=sys.stderr)
        return 1


if __name__ == "__main__":
    sys.exit(main())
