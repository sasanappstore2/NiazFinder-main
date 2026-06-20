#!/usr/bin/env python3
"""
Applies ONLY explicit manual curation decisions documented in
reports/smart-marketplace-curation-log.md — not automated cleaning.
"""
from __future__ import annotations

import json
import re
from collections import Counter
from datetime import UTC, datetime
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / "reports/smart-marketplace-clean.jsonl"
OUT = ROOT / "reports/smart-marketplace-curated.jsonl"
MANIFEST = ROOT / "reports/smart-marketplace-curated-manifest.json"

REMOVE_EXACT = {
    "\u0647\u0648\u0627\u06cc \u0634\u06cc\u062e\u0647 \u0686\u0637\u0648\u0631\u0647\u061f",
    "\u0622\u062f\u0631\u0633 \u06a9\u0648\u06cc \u062f\u06a9\u062a\u0631 \u0635\u062f\u0631 \u0631\u0648 \u0645\u06cc\u0634\u0646\u0627\u0633\u0645.",
    "\u0622\u062f\u0631\u0633 \u0648\u0634\u0627\u0631\u0647 \u0631\u0648 \u0645\u06cc\u0634\u0646\u0627\u0633\u0645.",
    "\u0627\u0644\u0627\u0646 \u062a\u0648 \u0686\u06af\u0627\u0631\u0645\u0627\u0646 \u063a\u0644\u0627\u0645\u062d\u0633\u06cc\u0646 \u0647\u0633\u062a\u0645.",
    "\u0628\u0647 \u062d\u0644\u0627\u0641 2 \u0631\u0633\u06cc\u062f\u0645.",
    "\u06af\u0641\u062a\u0646 \u062a\u0648 \u0627\u0628\u0648\u0645\u062d\u0644\u0647 \u06cc\u0647 \u062c\u0627 \u0647\u0633\u062a.",
    "\u062a\u0648 \u06a9\u0627\u0631\u062e\u0627\u0646\u0647 \u0633\u0627\u06cc\u067e\u0627 \u06a9\u0627\u0634\u0627\u0646 \u062c\u0627\u06cc \u067e\u0627\u0631\u06a9 \u0647\u0633\u062a\u061f",
    "\u0627\u0632 \u0686\u067e\u06a9 \u0646\u0627\u0638\u0645\u06cc \u0645\u062d\u0644\u0647 \u062a\u0627 \u0645\u0631\u06a9\u0632 \u0634\u0647\u0631 \u0686\u0642\u062f\u0631\u0647\u061f",
    "\u062f\u0646\u0628\u0627\u0644 \u06cc\u0647 \u062c\u0627 \u062a\u0648 \u0645\u06cc\u062e\u06a9 \u0645\u06cc\u06af\u0631\u062f\u0645.",
    "\u062a\u0648 \u0641\u0627\u0631\u0633\u0628\u0627\u0646 \u06a9\u0633\u06cc \u0631\u0648 \u0645\u06cc\u0634\u0646\u0627\u0633\u0645.",
    "\u0686\u0637\u0648\u0631\u06cc \u0627\u0632 \u0648\u0627\u0645\u06a9\u0648\u0647 \u062a\u0627 \u0645\u0631\u06a9\u0632 \u0634\u0647\u0631 \u0686\u0642\u062f\u0631\u0647\u061f",
    "\u0633\u0644\u0627\u0645\u060c \u062a\u0648 \u062f\u06cc\u0686\u0627\u0646 \u0686\u0647\u06a9\u0627\u0631 \u0645\u06cc\u0634\u0647 \u06a9\u0631\u062f\u061f",
    "\u0627\u0632 \u0632\u0644\u06cc\u062e\u0627\u0645\u0631\u062f\u0647 \u062a\u0627 \u0645\u0631\u06a9\u0632 \u0634\u0647\u0631 \u0686\u0642\u062f\u0631\u0647\u061f\u061f\u061f",
    "\u062e\u0648\u0646\u0647 \u062f\u0648\u0633\u062a\u0645 \u062a\u0648 \u0648\u0631\u0648\u062f\u06cc 21 \u0647\u0633\u062a.",
    "\u0645\u0646 \u0631\u0633\u06cc\u062f\u0645 \u062a\u0648 \u062e\u06cc\u0627\u0628\u0648\u0646 \u062f\u0648\u06cc\u0644\u0627\u062a.",
    "\u0645\u062d\u0644\u0647 \u0646\u0647\u0627\u0631 \u0631\u0648 \u067e\u06cc\u062f\u0627 \u06a9\u0631\u062f\u0645.",
    "\u06af\u0641\u062a\u0646 \u062a\u0648 \u0645\u06cc\u062f\u0627\u0646 \u0634\u0627\u0647\u0686\u0631\u0627\u063a\u06cc \u06cc\u0647 \u062c\u0627 \u0647\u0633\u062a.",
    "\u062a\u0648 \u0628\u0627\u0628\u0627 \u0634\u06cc\u062e \u0639\u0644\u06cc \u062c\u0627\u06cc \u067e\u0627\u0631\u06a9 \u0647\u0633\u062a\u061f",
    "\u0627\u0632 \u06a9\u0627\u0631\u062f\u06af\u0631 \u0645\u062d\u0644\u0647 \u062a\u0627 \u0645\u0631\u06a9\u0632 \u0634\u0647\u0631 \u0686\u0642\u062f\u0631\u0647\u061f",
    "\u0627\u0632 \u062f\u0631\u0632\u0622\u0628 \u062a\u0627 \u0645\u0631\u06a9\u0632 \u0634\u0647\u0631 \u0686\u0642\u062f\u0631\u0647\u061f",
    "\u0642\u0631\u0627\u0631\u0647 \u062a\u0648 \u0631\u0648\u062f\u06a9 \u06cc\u0647 \u0642\u0631\u0627\u0631 \u0628\u062f\u06cc\u0645.",
    "\u0633\u0644\u0627\u0645 \u0642\u0631\u0627\u0631\u0647 \u062a\u0648 \u0645\u06cc\u0627\u0646 \u0631\u0632 \u06cc\u0647 \u0642\u0631\u0627\u0631 \u0628\u062f\u06cc\u0645.",
    "\u062a\u0648 \u062a\u0627\u0632\u06cc \u0622\u0628\u0627\u062f \u0639\u0632\u06cc\u0632\u06cc \u06a9\u0633\u06cc \u0631\u0648 \u0645\u06cc\u0634\u0646\u0627\u0633\u0645.",
    "\u0642\u0631\u0627\u0631\u0647 \u062a\u0648 \u0686\u0647\u0627\u0631\u0631\u0627\u0647 \u062e\u0631\u0648\u0627 \u06cc\u0647 \u0642\u0631\u0627\u0631 \u0628\u062f\u06cc\u0645.",
    "\u0686\u0637\u0648\u0631\u06cc \u062a\u0648 \u062e\u0648\u0627\u062c\u0647 \u0648\u0644\u06cc \u0633\u0641\u0644\u06cc \u06a9\u0633\u06cc \u0631\u0648 \u0645\u06cc\u0634\u0646\u0627\u0633\u0645.",
    "\u06cc\u0647 \u0633\u0648\u0627\u0644\u06cc \u062f\u0631\u0628\u0627\u0631\u0647 \u06af\u0644\u0632\u0627\u0631\u0645\u062d\u0645\u062f \u062f\u0627\u0634\u062a\u0645...",
    "\u0645\u06cc\u062e\u0648\u0627\u0645 \u0628\u0631\u0645 \u0634\u0647\u0631\u06a9 \u0635\u0646\u0639\u062a\u06cc \u0633\u0645\u0646\u0627\u0646.",
    "\u062a\u0648 \u0645\u062d\u0644\u0647 \u06a9\u0627\u063a\u0630\u06a9\u0646\u0627\u0646 \u06a9\u06cc \u0647\u0633\u062a\u061f",
}

REMOVE_PATTERNS = [
    re.compile(r"^\u0647\u0648\u0627\u06cc\s+.+\s+\u0686\u0637\u0648\u0631"),
    re.compile(r"\u062a\u0627 \u0645\u0631\u06a9\u0632 \u0634\u0647\u0631 \u0686\u0642\u062f\u0631\u0647"),
    re.compile(r"\u062c\u0627\u06cc \u067e\u0627\u0631\u06a9 \u0647\u0633\u062a"),
    re.compile(r"\u06a9\u0633\u06cc \u0631\u0648 \u0645\u06cc\u0634\u0646\u0627\u0633\u0645"),
    re.compile(r"\u0642\u0631\u0627\u0631 \u0628\u062f\u06cc\u0645"),
    re.compile(r"^\u0645\u0646 \u0631\u0633\u06cc\u062f\u0645 \u062a\u0648"),
    re.compile(r"^\u0627\u0644\u0627\u0646 \u062a\u0648 .+ \u0647\u0633\u062a\u0645"),
    re.compile(r"\u0631\u0648 \u067e\u06cc\u062f\u0627 \u06a9\u0631\u062f\u0645"),
    re.compile(r"^\u0645\u06cc\u062e\u0648\u0627\u0645 \u0628\u0631\u0645 "),
    re.compile(r"\u0633\u0648\u0627\u0644\u06cc \u062f\u0631\u0628\u0627\u0631\u0647"),
    re.compile(r"^\u0622\u062f\u0631\u0633 .+ \u0631\u0648 \u0645\u06cc\u0634\u0646\u0627\u0633\u0645"),
    re.compile(r"^\u06af\u0641\u062a\u0646 \u062a\u0648 .+ \u06cc\u0647 \u062c\u0627 \u0647\u0633\u062a"),
]

BOILER = {
    "slug": "water-heater-boiler-repair",
    "pathFa": "\u062e\u062f\u0645\u0627\u062a \u203a \u062a\u0639\u0645\u06cc\u0631\u0627\u062a \u203a \u0622\u0628\u06af\u0631\u0645\u200c\u06a9\u0646\u060c \u067e\u06a9\u06cc\u0698 \u0648 \u0634\u0648\u0641\u0627\u0698",
    "nameFa": "\u0622\u0628\u06af\u0631\u0645\u200c\u06a9\u0646\u060c \u067e\u06a9\u06cc\u0698 \u0648 \u0634\u0648\u0641\u0627\u0698",
    "nameEn": "Water Heater & Boiler",
}
MOTORCYCLE = {
    "slug": "motorcycle-repair",
    "pathFa": "\u062e\u062f\u0645\u0627\u062a \u203a \u062a\u0639\u0645\u06cc\u0631\u0627\u062a \u203a \u0645\u0648\u062a\u0648\u0631\u0633\u06cc\u06a9\u0644\u062a",
    "nameFa": "\u0645\u0648\u062a\u0648\u0631\u0633\u06cc\u06a9\u0644\u062a",
    "nameEn": "Motorcycle Repair",
}
AC = {
    "slug": "ac-repair",
    "pathFa": "\u062e\u062f\u0645\u0627\u062a \u203a \u062a\u0639\u0645\u06cc\u0631\u0627\u062a \u203a \u06a9\u0648\u0644\u0631 \u06af\u0627\u0632\u06cc \u0648 \u0627\u0633\u067e\u0644\u06cc\u062a",
    "nameFa": "\u06a9\u0648\u0644\u0631 \u06af\u0627\u0632\u06cc \u0648 \u0627\u0633\u067e\u0644\u06cc\u062a",
    "nameEn": "AC Repair",
}
CLEANING = {
    "slug": "cleaning",
    "pathFa": "\u062e\u062f\u0645\u0627\u062a \u203a \u0646\u0638\u0627\u0641\u062a",
    "nameFa": "\u0646\u0638\u0627\u0641\u062a",
    "nameEn": "Cleaning",
}
WATCH = {
    "slug": "watch-jewelry-repair",
    "pathFa": "\u062e\u062f\u0645\u0627\u062a \u203a \u062a\u0639\u0645\u06cc\u0631\u0627\u062a \u203a \u0633\u0627\u0639\u062a \u0648 \u062c\u0648\u0627\u0647\u0631\u0627\u062a",
    "nameFa": "\u0633\u0627\u0639\u062a \u0648 \u062c\u0648\u0627\u0647\u0631\u0627\u062a",
    "nameEn": "Watch & Jewelry",
}
PUMP = {
    "slug": "water-pump-repair",
    "pathFa": "\u062e\u062f\u0645\u0627\u062a \u203a \u062a\u0639\u0645\u06cc\u0631\u0627\u062a \u203a \u067e\u0645\u067e \u0622\u0628 \u0648 \u0645\u0648\u062a\u0648\u0631\u0622\u0644\u0627\u062a",
    "nameFa": "\u067e\u0645\u067e \u0622\u0628 \u0648 \u0645\u0648\u062a\u0648\u0631\u0622\u0644\u0627\u062a",
    "nameEn": "Water Pump",
}

ASSISTANT_OVERRIDES: dict[str, dict] = {
    "\u0628\u0627\u0637\u0631\u06cc \u0633\u0627\u0639\u062a \u062a\u0648 \u0634\u0642\u0627\u0642\u06cc \u0686\u0648\u0631\u0632\u0642 \u0639\u0648\u0636 \u06a9\u0646\u0646.": {
        "location": {
            "province": "\u0632\u0646\u062c\u0627\u0646",
            "city": "\u0686\u0648\u0631\u0632\u0642",
            "neighborhood": "\u0634\u0642\u0627\u0642\u06cc \u0686\u0648\u0631\u0632\u0642",
            "cityId": "churzegh",
            "neighborhoodId": "\u0634\u0642\u0627\u0642\u06cc-\u0686\u0648\u0631\u0632\u0642",
        },
        "categories": [WATCH],
        "categorySlugs": ["watch-jewelry-repair"],
        "status": "resolved",
        "options": [],
    },
    "\u0645\u0648\u062a\u0648\u0631 \u0622\u0628 \u062a\u0648 \u0647\u0631\u06cc\u0633 \u0633\u0648\u062e\u062a\u0647\u060c \u062a\u06a9\u0646\u0633\u06cc\u0646.": {
        "location": {
            "province": "\u0622\u0630\u0631\u0628\u0627\u06cc\u062c\u0627\u0646 \u0634\u0631\u0642\u06cc",
            "city": "\u0647\u0631\u06cc\u0633",
            "neighborhood": "\u0647\u0631\u06cc\u0633",
            "cityId": "harris",
            "neighborhoodId": "\u0647\u0631\u06cc\u0633",
        },
        "categories": [PUMP],
        "categorySlugs": ["water-pump-repair"],
        "status": "resolved",
        "options": [],
    },
    "\u0628\u0627\u0637\u0631\u06cc \u0633\u0627\u0639\u062a \u062a\u0648 \u0645\u0646\u0637\u0642\u0647 \u0661\u0669 \u0634\u0647\u0631 \u062a\u0647\u0631\u0627\u0646 \u0639\u0648\u0636 \u06a9\u0646\u0646.": {
        "location": {
            "province": "\u062a\u0647\u0631\u0627\u0646",
            "city": "\u062a\u0647\u0631\u0627\u0646",
            "neighborhood": "\u0645\u0646\u0637\u0642\u0647 \u0661\u0669 \u0634\u0647\u0631 \u062a\u0647\u0631\u0627\u0646",
            "cityId": "tehran-city",
            "neighborhoodId": "\u0645\u0646\u0637\u0642\u0647-\u0661\u0669-\u0634\u0647\u0631-\u062a\u0647\u0631\u0627\u0646",
        },
        "categories": [WATCH],
        "categorySlugs": ["watch-jewelry-repair"],
        "status": "resolved",
        "options": [],
    },
    "\u0646\u0638\u0627\u0641\u062a \u0645\u0633\u06a9\u0646 \u0645\u0647\u0631 \u0633\u0631\u062f\u0634\u062a\u060c \u067e\u0627\u06cc\u0627\u0646 \u06a9\u0627\u0631.": {
        "location": {
            "province": "\u0622\u0630\u0631\u0628\u0627\u06cc\u062c\u0627\u0646 \u063a\u0631\u0628\u06cc",
            "city": "\u0633\u0631\u062f\u0634\u062a",
            "neighborhood": "\u0645\u0633\u06a9\u0646 \u0645\u0647\u0631 \u0633\u0631\u062f\u0634\u062a",
            "cityId": "sardasht",
            "neighborhoodId": "\u0645\u0633\u06a9\u0646-\u0645\u0647\u0631-\u0633\u0631\u062f\u0634\u062a",
        },
        "categories": [CLEANING],
        "categorySlugs": ["cleaning"],
        "status": "resolved",
        "options": [],
    },
}


def should_remove(user: str) -> str | None:
    if user in REMOVE_EXACT:
        return "manual_remove_exact"
    for pat in REMOVE_PATTERNS:
        if pat.search(user):
            return "manual_remove_pattern"
    return None


def apply_judgment(user: str, payload: dict) -> tuple[dict, list[str]]:
    notes: list[str] = []
    if user in ASSISTANT_OVERRIDES:
        notes.append("manual_override")
        return ASSISTANT_OVERRIDES[user], notes

    cats = payload.get("categorySlugs") or []
    payload = dict(payload)

    if "\u06af\u0631\u06cc \u06af\u0627\u0632" in user and cats == ["ac-repair"]:
        payload["categories"] = [BOILER]
        payload["categorySlugs"] = ["water-heater-boiler-repair"]
        notes.append("gas_error_not_ac")

    if "\u0634\u0648\u0641\u0627\u0698" in user and cats == ["plumbing"] and "\u0644\u0648\u0644\u0647 \u0634\u0648\u0641\u0627\u0698" in user:
        payload["categories"] = [BOILER]
        payload["categorySlugs"] = ["water-heater-boiler-repair"]
        notes.append("shofaj_not_plumbing")

    if user.startswith("\u0622\u067e\u0631\u06cc\u0644\u06cc\u0627") and cats == ["water-pump-repair"]:
        payload["categories"] = [MOTORCYCLE]
        payload["categorySlugs"] = ["motorcycle-repair"]
        notes.append("aprilia_motorcycle")

    if "\u0627\u06cc\u0646\u0648\u0631\u062a\u0631" in user and "\u06cc\u062e \u0632\u062f\u0647" in user and cats == ["refrigerator-repair"]:
        payload["categories"] = [AC]
        payload["categorySlugs"] = ["ac-repair"]
        notes.append("inverter_split_not_fridge")

    return payload, notes


def main() -> int:
    stats: Counter = Counter()
    kept = removed = edited = 0

    with SRC.open(encoding="utf-8") as fin, OUT.open("w", encoding="utf-8") as fout:
        for line_no, line in enumerate(fin, 1):
            rec = json.loads(line)
            user = rec["messages"][1]["content"]
            reason = should_remove(user)
            if reason:
                removed += 1
                stats[reason] += 1
                continue

            payload = json.loads(rec["messages"][2]["content"])
            payload, notes = apply_judgment(user, payload)
            if notes:
                edited += 1
                for n in notes:
                    stats[f"edit:{n}"] += 1
                rec = {
                    "messages": [
                        rec["messages"][0],
                        rec["messages"][1],
                        {
                            "role": "assistant",
                            "content": json.dumps(payload, ensure_ascii=False, separators=(",", ":")),
                        },
                    ]
                }

            fout.write(json.dumps(rec, ensure_ascii=False) + "\n")
            kept += 1
            if line_no % 100000 == 0:
                print(f"  processed {line_no:,}...", flush=True)

    manifest = {
        "generatedAt": datetime.now(UTC).isoformat().replace("+00:00", "Z"),
        "source": str(SRC),
        "output": str(OUT),
        "method": "manual-ai-curation-v1",
        "summary": {"sourceLines": kept + removed, "kept": kept, "removed": removed, "edited": edited},
        "stats": dict(stats),
    }
    MANIFEST.write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"Kept: {kept:,} | Removed: {removed:,} | Edited: {edited:,}")
    print(f"Output -> {OUT}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
