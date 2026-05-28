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
        if not health.get("ok"):
            print("WARN: model not loaded yet; first parse will download/load weights")

        result = post("/v1/parse", {"text": TEXT})
        print("parse:", json.dumps(result, ensure_ascii=False, indent=2))
        slug = result.get("labels", {}).get("categorySlug", "")
        if "game" in slug or "console" in slug or "product" in str(result):
            print("OK: plausible product/game parse")
            return 0
        print("WARN: unexpected categorySlug:", slug)
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
